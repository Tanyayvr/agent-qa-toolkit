//tool/scripts/demo.mjs
import { spawn } from "node:child_process";

const ROOT = process.cwd();

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
const casesFile = getArg("--cases") || (suite === "robustness" ? "cases/matrix.json" : "cases/cases.json");
const baseUrl = getArg("--baseUrl") || "http://localhost:8787";
const reportId = getArg("--reportId") || (suite ? `${suite}_latest` : "latest");
const onlyList = getArg("--only");
const skipAudit = hasFlag("--skipAudit") || process.env.SKIP_AUDIT === "1";
const skipLint = hasFlag("--skipLint") || process.env.SKIP_LINT === "1";
const skipTypecheck = hasFlag("--skipTypecheck") || process.env.SKIP_TYPECHECK === "1";

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

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", cwd: ROOT, env: process.env });
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!skipLint) await run("npm", ["run", "lint"], "lint");
  if (!skipTypecheck) await run("npm", ["run", "typecheck"], "typecheck");
  if (!skipAudit) {
    await run("npm", ["run", "audit"], "audit");
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
