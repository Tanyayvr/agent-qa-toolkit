#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();

function getArg(name, def = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return def;
  return val;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      env: opts.env || process.env,
      stdio: opts.stdio || "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if ((code ?? 0) === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${String(code)}`));
    });
  });
}

async function waitForHealth(baseUrl, retries = 50, sleepMs = 200) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`);
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j && j.ok === true) return;
      }
    } catch {
      // keep retrying
    }
    await new Promise((r) => setTimeout(r, sleepMs));
  }
  throw new Error(`health check failed for ${baseUrl}`);
}

async function buildSubsetCases(srcCasesPath, outPath, maxCases) {
  const raw = await readFile(srcCasesPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`invalid cases file: ${srcCasesPath}`);
  }
  const subset = parsed.slice(0, Math.max(1, maxCases));
  await writeFile(outPath, JSON.stringify(subset, null, 2), "utf-8");
  return subset.length;
}

function verifyCompareReport(reportDir) {
  const comparePath = path.join(reportDir, "compare-report.json");
  assert(existsSync(comparePath), `missing compare report: ${comparePath}`);
  const report = JSON.parse(readFileSync(comparePath, "utf-8"));
  const eq = report?.summary?.execution_quality;
  assert(eq, `missing summary.execution_quality in ${comparePath}`);
  assert(eq.status === "healthy", `execution quality must be healthy, got ${String(eq.status)} in ${comparePath}`);
  assert(Array.isArray(report.items) && report.items.length > 0, `empty report.items in ${comparePath}`);
  for (const item of report.items) {
    const href = item?.artifacts?.replay_diff_href;
    assert(typeof href === "string" && href.length > 0, `missing replay_diff_href for case ${String(item?.case_id)}`);
    const abs = path.join(reportDir, href);
    assert(existsSync(abs), `missing replay diff file ${abs}`);
  }
}

async function main() {
  const ciMode = hasFlag("--ci");
  const startDemo = getArg("--startDemo", ciMode ? "1" : "1") !== "0";
  const port = Number(getArg("--port", ciMode ? "8795" : "8795"));
  const baseUrl = getArg("--baseUrl", `http://127.0.0.1:${port}`);
  const loadConcurrency = Number(getArg("--loadConcurrency", ciMode ? "4" : "3"));
  const loadIterations = Number(getArg("--loadIterations", ciMode ? "4" : "3"));
  const soakCycles = Number(getArg("--soakCycles", ciMode ? "2" : "1"));
  const caseCount = Number(getArg("--caseCount", ciMode ? "6" : "4"));
  const timeoutMs = Number(getArg("--timeoutMs", ciMode ? "12000" : "15000"));

  const tmpRoot = await mkdtemp(path.join(tmpdir(), "aq-soak-load-e2e-"));
  let demoProc = null;
  let shuttingDownDemo = false;
  try {
    const subsetCasesPath = path.join(tmpRoot, "cases-subset.json");
    const totalCases = await buildSubsetCases(path.join(ROOT, "cases/cases-quality.json"), subsetCasesPath, caseCount);
    await mkdir(path.join(tmpRoot, "load"), { recursive: true });

    if (startDemo) {
      demoProc = spawn("npm", ["--workspace", "demo-agent", "run", "dev"], {
        cwd: ROOT,
        env: { ...process.env, PORT: String(port) },
        stdio: "inherit",
      });
      demoProc.on("exit", (code, signal) => {
        if (!shuttingDownDemo && code !== 0) {
          console.error(
            `demo-agent exited unexpectedly with code=${String(code)} signal=${String(signal)}`
          );
        }
      });
    }

    await waitForHealth(baseUrl);

    await run("npm", [
      "run",
      "loadtest",
      "--",
      "--baseUrl",
      baseUrl,
      "--cases",
      subsetCasesPath,
      "--concurrency",
      String(loadConcurrency),
      "--iterations",
      String(loadIterations),
      "--timeoutMs",
      String(timeoutMs),
      "--outJson",
      path.join(tmpRoot, "load", "summary.json"),
    ]);

    for (let cycle = 1; cycle <= soakCycles; cycle += 1) {
      const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      const runPrefix = `e2e_soak_${ts}_${cycle}`;
      const reportPrefix = `e2e-soak-${ts}-${cycle}`;
      await run("bash", ["./scripts/run-local-campaign.sh"], {
        env: {
          ...process.env,
          BASE_URL: baseUrl,
          CASES: subsetCasesPath,
          AGENT_SUITE: "cli",
          CAMPAIGN_PROFILE: "quality",
          RUN_PREFIX: runPrefix,
          REPORT_PREFIX: reportPrefix,
          TIMEOUT_PROFILE: "off",
          TIMEOUT_MS: String(timeoutMs),
          RETRIES: "1",
          CONCURRENCY: String(loadConcurrency),
          PREFLIGHT_MODE: "off",
          FAIL_FAST_TRANSPORT_STREAK: "3",
          ENFORCE_CASE_QUALITY: "1",
          CASE_QUALITY_REQUIRE_TOOL_EVIDENCE: "1",
          EVAL_FAIL_ON_EXECUTION_DEGRADED: "1",
          LIBRARY_INGEST: "0",
          ALLOW_EXISTING_RUN_PREFIX: "0",
        },
      });

      const baseReportDir = path.join(ROOT, "apps/evaluator/reports", reportPrefix);
      const r2ReportDir = path.join(ROOT, "apps/evaluator/reports", `${reportPrefix}-2`);
      const r3ReportDir = path.join(ROOT, "apps/evaluator/reports", `${reportPrefix}-3`);

      verifyCompareReport(baseReportDir);
      verifyCompareReport(r2ReportDir);
      verifyCompareReport(r3ReportDir);
      assert(existsSync(path.join(baseReportDir, "trend.html")), `missing trend.html in ${baseReportDir}`);
    }

    console.log(`e2e-soak-load: PASS (cases=${totalCases}, loadConcurrency=${loadConcurrency}, soakCycles=${soakCycles})`);
  } finally {
    if (demoProc && !demoProc.killed) {
      shuttingDownDemo = true;
      demoProc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
      if (!demoProc.killed) {
        try {
          demoProc.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
    }
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
