#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      env: opts.env || process.env,
      stdio: opts.stdio || "pipe",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function writeJson(absPath, value) {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, JSON.stringify(value, null, 2), "utf-8");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const root = await mkdtemp(path.join(tmpdir(), "aq-policy-gate-e2e-"));
  try {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r1");
    const newDir = path.join(root, "runs", "new", "r1");
    const degradedOut = path.join(root, "reports", "degraded");
    const healthyOut = path.join(root, "reports", "healthy");

    await writeJson(casesPath, [
      { id: "c1", title: "policy gate degraded", input: { user: "hello" }, expected: {} },
    ]);
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
    };
    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const degraded = await run("npm", [
      "--workspace",
      "evaluator",
      "run",
      "dev",
      "--",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      degradedOut,
      "--reportId",
      "policy-gate-degraded",
      "--failOnExecutionDegraded",
      "--no-trend",
    ]);
    assert(degraded.code !== 0, "expected failOnExecutionDegraded to fail on degraded quality");

    await writeJson(casesPath, [
      { id: "c1", title: "policy gate healthy", input: { user: "hello" }, expected: { must_include: ["ok"] } },
    ]);
    const healthy = await run("npm", [
      "--workspace",
      "evaluator",
      "run",
      "dev",
      "--",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      healthyOut,
      "--reportId",
      "policy-gate-healthy",
      "--failOnExecutionDegraded",
      "--no-trend",
    ]);
    assert(healthy.code === 0, `expected healthy policy gate to pass, got code=${healthy.code}`);

    const report = JSON.parse(await readFile(path.join(healthyOut, "compare-report.json"), "utf-8"));
    assert(report?.summary?.execution_quality?.status === "healthy", "healthy gate run must produce execution_quality=healthy");

    const kpiGateOut = path.join(root, "reports", "kpi-gate");
    const kpiDegraded = await run("npm", [
      "--workspace",
      "evaluator",
      "run",
      "dev",
      "--",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      kpiGateOut,
      "--reportId",
      "policy-gate-kpi",
      "--failOnExecutionDegraded",
      "--no-trend",
    ], {
      env: {
        ...process.env,
        AQ_MIN_PRE_ACTION_ENTROPY_REMOVED: "0.1",
      },
    });
    assert(kpiDegraded.code !== 0, "expected KPI threshold gate to fail when pre-action entropy removed is below threshold");

    console.log("e2e-policy-gate: PASS");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
