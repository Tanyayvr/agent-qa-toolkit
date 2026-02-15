// tool/scripts/demo-e2e.mjs
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

const baseUrl = getArg("--baseUrl") || "http://localhost:8787";
const skipAudit = hasFlag("--skipAudit") || process.env.SKIP_AUDIT === "1";
const skipLint = hasFlag("--skipLint") || process.env.SKIP_LINT === "1";
const skipTypecheck = hasFlag("--skipTypecheck") || process.env.SKIP_TYPECHECK === "1";

function run(cmd, args, label, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", cwd: ROOT, env: { ...process.env, ...extraEnv } });
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!skipLint) await run("npm", ["run", "lint"], "lint");
  if (!skipTypecheck) await run("npm", ["run", "typecheck"], "typecheck");
  if (!skipAudit) await run("npm", ["run", "audit"], "audit");

  const common = ["scripts/demo.mjs", "--baseUrl", baseUrl, "--skipAudit", "--skipLint", "--skipTypecheck"];
  await run("node", [...common, "--suite", "correctness", "--reportId", "correctness_latest"], "demo:correctness");
  await run("node", [...common, "--suite", "robustness", "--reportId", "robustness_latest"], "demo:robustness");
  await run("node", [...common, "--cases", "cases/all.json", "--reportId", "latest"], "demo:latest");
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
