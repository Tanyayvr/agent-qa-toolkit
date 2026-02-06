//tool/scripts/demo.mjs
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const BASE_URL = "http://localhost:8787";
const HEALTH_URL = `${BASE_URL}/health`;

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
  await run("npm", ["run", "lint"], "lint");
  await run("npm", ["run", "typecheck"], "typecheck");
  await run("npm", ["run", "audit"], "audit");

  let agent = null;

  const alreadyUp = await isHealthy();

  if (!alreadyUp) {
    agent = spawn("npm", ["-w", "demo-agent", "run", "dev"], {
      stdio: "inherit",
      cwd: ROOT,
      env: process.env
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
        BASE_URL,
        "--cases",
        "cases/cases.json",
        "--only",
        "tool_001,fmt_002,data_001,fail_001,tool_003,fetch_http_500_001,fetch_invalid_json_001,fetch_timeout_001,fetch_network_drop_001",
        "--outDir",
        "apps/runner/runs",
        "--runId",
        "latest"
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
        "cases/cases.json",
        "--baselineDir",
        "apps/runner/runs/baseline/latest",
        "--newDir",
        "apps/runner/runs/new/latest",
        "--outDir",
        "apps/evaluator/reports/latest",
        "--reportId",
        "latest"
      ],
      "evaluator"
    );

    console.log("Demo finished: apps/evaluator/reports/latest/report.html");
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
