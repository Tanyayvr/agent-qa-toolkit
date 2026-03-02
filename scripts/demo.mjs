//tool/scripts/demo.mjs
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const HELP = `Usage: node scripts/demo.mjs [options]

Options:
  --baseUrl <url>         Agent base URL (default: http://localhost:8787)
  --cases <path>          Cases file (default: cases/cases-quality.json for --suite correctness, cases/matrix.json for robustness, otherwise cases/cases.json)
  --suite <name>          Optional suite label (e.g. robustness)
  --reportId <id>         Output report id (default: latest or <suite>_latest)
  --only <ids>            Comma-separated case ids
  --skipLint              Skip lint step
  --skipTypecheck         Skip typecheck step
  --skipAudit             Skip npm audit step
  --strictAudit           Fail on npm audit network errors (default: soft-fail on network issues)
  --help, -h              Show this help
`;

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const suite = getArg("--suite");
const casesFile = getArg("--cases")
  || (suite === "robustness"
    ? "cases/matrix.json"
    : suite === "correctness"
      ? "cases/cases-quality.json"
      : "cases/cases.json");
const baseUrl = getArg("--baseUrl") || "http://localhost:8787";
const reportId = getArg("--reportId") || (suite ? `${suite}_latest` : "latest");
const onlyList = getArg("--only");
const skipAudit = hasFlag("--skipAudit") || process.env.SKIP_AUDIT === "1";
const skipLint = hasFlag("--skipLint") || process.env.SKIP_LINT === "1";
const skipTypecheck = hasFlag("--skipTypecheck") || process.env.SKIP_TYPECHECK === "1";
const strictAudit = hasFlag("--strictAudit") || process.env.AQ_DEMO_AUDIT_STRICT === "1";

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(HELP);
  process.exit(0);
}

const HEALTH_URL = `${baseUrl}/health`;
const baseUrlObj = new URL(baseUrl);
const basePort = baseUrlObj.port ? Number(baseUrlObj.port) : (baseUrlObj.protocol === "https:" ? 443 : 80);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isHealthy() {
  try {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.ok === true);
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy()) return;
    await sleep(250);
  }
  throw new Error(`demo-agent did not become healthy within ${timeoutMs}ms`);
}

class CommandError extends Error {
  constructor(label, code, output = "") {
    super(`${label} exited with code ${code}`);
    this.name = "CommandError";
    this.label = label;
    this.code = code;
    this.output = output;
  }
}

function run(cmd, args, label, options = {}) {
  const { captureOutput = false } = options;
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      cwd: ROOT,
      env: process.env
    });
    let out = "";
    let err = "";
    if (captureOutput) {
      p.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        out += text;
        process.stdout.write(text);
      });
      p.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        err += text;
        process.stderr.write(text);
      });
    }
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new CommandError(label, code, `${out}\n${err}`));
    });
  });
}

function isAuditNetworkFailure(err) {
  if (!(err instanceof Error)) return false;
  const output = String(err.output ?? err.message).toLowerCase();
  return (
    output.includes("enotfound registry.npmjs.org") ||
    output.includes("eai_again") ||
    output.includes("etimedout") ||
    output.includes("network request failed") ||
    output.includes("audit request") && output.includes("failed")
  );
}

async function main() {
  if (!skipLint) await run("npm", ["run", "lint"], "lint");
  if (!skipTypecheck) await run("npm", ["run", "typecheck"], "typecheck");
  if (!skipAudit) {
    try {
      await run("npm", ["run", "audit"], "audit", { captureOutput: true });
    } catch (err) {
      if (!strictAudit && isAuditNetworkFailure(err)) {
        console.warn(
          "WARNING: npm audit failed due to network/registry availability; continuing demo run. " +
          "Use --strictAudit (or AQ_DEMO_AUDIT_STRICT=1) to fail hard."
        );
      } else {
        throw err;
      }
    }
  }

  if (suite === "correctness") {
    await run(
      "node",
      [
        "scripts/validate-cases-quality.mjs",
        "--cases",
        casesFile,
        "--profile",
        "quality",
        "--maxWeakExpectedRate",
        "0.2",
      ],
      "validate-cases-quality"
    );
  }

  let agent = null;

  const alreadyUp = await isHealthy();

  if (!alreadyUp) {
    agent = spawn("npm", ["-w", "demo-agent", "run", "dev"], {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, PORT: String(basePort) }
    });
    await waitForHealth();
  }

  try {
    await run(
      "npm",
      [
        "-w",
        "runner",
        "run",
        "dev",
        "--",
        "--repoRoot",
        ROOT,
        "--baseUrl",
        baseUrl,
        "--cases",
        casesFile,
        ...(onlyList ? ["--only", onlyList] : []),
        "--outDir",
        "apps/runner/runs",
        "--runId",
        reportId
      ],
      "runner"
    );

    await run(
      "npm",
      [
        "-w",
        "evaluator",
        "run",
        "dev",
        "--",
        "--cases",
        casesFile,
        "--baselineDir",
        `apps/runner/runs/baseline/${reportId}`,
        "--newDir",
        `apps/runner/runs/new/${reportId}`,
        "--outDir",
        `apps/evaluator/reports/${reportId}`,
        "--reportId",
        reportId
      ],
      "evaluator"
    );

    console.log(`Demo finished: apps/evaluator/reports/${reportId}/report.html`);
  } finally {
    if (agent) {
      agent.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
