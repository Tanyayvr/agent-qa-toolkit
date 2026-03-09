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

function toFixedNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return value;
  return Number(value.toFixed(digits));
}

function parsePositiveNumber(name, value, opts = {}) {
  const num = Number(value);
  const min = opts.min ?? 0;
  if (!Number.isFinite(num) || num <= min) {
    throw new Error(`invalid ${name}: ${String(value)} (must be > ${min})`);
  }
  return num;
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
  assert(eq.baseline_runner_failures === 0, `baseline runner failures must be 0 in ${comparePath}`);
  assert(eq.new_runner_failures === 0, `new runner failures must be 0 in ${comparePath}`);
  assert(
    Number(eq.baseline_transport_success_rate ?? 0) >= Number(eq.thresholds?.min_transport_success_rate ?? 0.95),
    `baseline transport success below threshold in ${comparePath}`
  );
  assert(
    Number(eq.new_transport_success_rate ?? 0) >= Number(eq.thresholds?.min_transport_success_rate ?? 0.95),
    `new transport success below threshold in ${comparePath}`
  );
  assert(Array.isArray(report.items) && report.items.length > 0, `empty report.items in ${comparePath}`);
  const caseSignature = [];
  for (const item of report.items) {
    const href = item?.artifacts?.replay_diff_href;
    assert(typeof href === "string" && href.length > 0, `missing replay_diff_href for case ${String(item?.case_id)}`);
    const abs = path.join(reportDir, href);
    assert(existsSync(abs), `missing replay diff file ${abs}`);
    caseSignature.push(
      `${String(item?.case_id ?? "unknown")}|b:${String(item?.failure_summary?.baseline?.class ?? "ok")}|n:${String(item?.failure_summary?.new?.class ?? "ok")}|gate:${String(item?.gate_recommendation ?? "none")}`
    );
  }
  caseSignature.sort();
  return {
    comparePath,
    eq: {
      status: String(eq.status),
      baselineTransportSuccessRate: toFixedNumber(Number(eq.baseline_transport_success_rate ?? 0), 4),
      newTransportSuccessRate: toFixedNumber(Number(eq.new_transport_success_rate ?? 0), 4),
      baselineRunnerFailures: Number(eq.baseline_runner_failures ?? 0),
      newRunnerFailures: Number(eq.new_runner_failures ?? 0),
      weakExpectedRate: toFixedNumber(Number(eq.weak_expected_rate ?? 0), 4),
    },
    signature: caseSignature.join("||"),
    caseCount: report.items.length,
  };
}

function verifyLoadSummary(summaryPath, expectedRequests, timeoutMs, maxRuntimeP95Ms, maxRuntimeP99Ms) {
  assert(existsSync(summaryPath), `missing load summary: ${summaryPath}`);
  const parsed = JSON.parse(readFileSync(summaryPath, "utf-8"));
  const summary = parsed?.summary ?? parsed;
  const stats = summary?.stats;
  assert(stats?.all, `load summary missing stats.all: ${summaryPath}`);
  const all = stats.all;
  const baseline = stats.baseline ?? {};
  const newer = stats.new ?? {};
  assert(Number(all.real_fail ?? 0) === 0, `load real_fail must be 0, got ${String(all.real_fail)}`);
  assert(Number(baseline.real_fail ?? 0) === 0, `load baseline.real_fail must be 0, got ${String(baseline.real_fail)}`);
  assert(Number(newer.real_fail ?? 0) === 0, `load new.real_fail must be 0, got ${String(newer.real_fail)}`);
  assert(
    Number(all.ok ?? 0) >= expectedRequests,
    `load ok count too low: ${String(all.ok)} < expected ${String(expectedRequests)}`
  );
  assert(
    Number(all.p95Ms ?? Number.POSITIVE_INFINITY) <= maxRuntimeP95Ms,
    `load p95 exceeds threshold: ${String(all.p95Ms)}ms > ${String(maxRuntimeP95Ms)}ms`
  );
  assert(
    Number(all.p99Ms ?? Number.POSITIVE_INFINITY) <= maxRuntimeP99Ms,
    `load p99 exceeds threshold: ${String(all.p99Ms)}ms > ${String(maxRuntimeP99Ms)}ms`
  );
  assert(
    Number(all.p99Ms ?? Number.POSITIVE_INFINITY) <= timeoutMs,
    `load p99 exceeds request timeout: ${String(all.p99Ms)}ms > ${String(timeoutMs)}ms`
  );
  return {
    ok: Number(all.ok ?? 0),
    p95Ms: Number(all.p95Ms ?? 0),
    p99Ms: Number(all.p99Ms ?? 0),
  };
}

function ensureDeterministicGateOutcomes(cycleGateSignatures) {
  if (cycleGateSignatures.length <= 1) return;
  const first = cycleGateSignatures[0];
  for (let i = 1; i < cycleGateSignatures.length; i += 1) {
    assert(
      cycleGateSignatures[i] === first,
      `non-deterministic gate outcomes across soak cycles (cycle 1 != cycle ${String(i + 1)})`
    );
  }
}

function ensureRuntimeVariance(campaignDurationsMs, maxRuntimeVariance) {
  if (campaignDurationsMs.length <= 1) return;
  const minMs = Math.min(...campaignDurationsMs);
  const maxMs = Math.max(...campaignDurationsMs);
  const ratio = maxMs / Math.max(1, minMs);
  assert(
    ratio <= maxRuntimeVariance,
    `runtime variance too high: ${String(maxMs)}ms/${String(minMs)}ms=${ratio.toFixed(3)} > ${String(maxRuntimeVariance)}`
  );
}

async function stopProcess(proc, timeoutMs = 2000) {
  if (!proc || proc.killed) return;
  proc.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve();
    }, timeoutMs);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  const ciMode = hasFlag("--ci");
  const startDemo = getArg("--startDemo", ciMode ? "1" : "1") !== "0";
  const port = parsePositiveNumber("--port", getArg("--port", ciMode ? "8795" : "8795"));
  const baseUrl = getArg("--baseUrl", `http://127.0.0.1:${port}`);
  const loadConcurrency = parsePositiveNumber("--loadConcurrency", getArg("--loadConcurrency", ciMode ? "4" : "3"));
  const loadIterations = parsePositiveNumber("--loadIterations", getArg("--loadIterations", ciMode ? "4" : "3"));
  const soakCycles = parsePositiveNumber("--soakCycles", getArg("--soakCycles", ciMode ? "2" : "1"));
  const caseCount = parsePositiveNumber("--caseCount", getArg("--caseCount", ciMode ? "6" : "4"));
  const timeoutMs = parsePositiveNumber("--timeoutMs", getArg("--timeoutMs", ciMode ? "12000" : "15000"));
  const maxRuntimeP95Ms = parsePositiveNumber(
    "--maxRuntimeP95Ms",
    getArg("--maxRuntimeP95Ms", ciMode ? "2000" : String(Math.max(2000, Math.floor(timeoutMs * 0.8))))
  );
  const maxRuntimeP99Ms = parsePositiveNumber(
    "--maxRuntimeP99Ms",
    getArg("--maxRuntimeP99Ms", ciMode ? "4000" : String(Math.max(4000, Math.floor(timeoutMs * 0.9))))
  );
  const maxRuntimeVariance = parsePositiveNumber(
    "--maxRuntimeVariance",
    getArg("--maxRuntimeVariance", ciMode ? "2.5" : "3.0")
  );

  const tmpRoot = await mkdtemp(path.join(tmpdir(), "aq-soak-load-e2e-"));
  const loadSummaryPath = path.join(tmpRoot, "load", "summary.json");
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
      loadSummaryPath,
    ]);

    const expectedRequests = totalCases * loadIterations * 2;
    const loadSummary = verifyLoadSummary(
      loadSummaryPath,
      expectedRequests,
      timeoutMs,
      maxRuntimeP95Ms,
      maxRuntimeP99Ms
    );

    const campaignDurationsMs = [];
    const cycleGateSignatures = [];

    for (let cycle = 1; cycle <= soakCycles; cycle += 1) {
      const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      const runPrefix = `e2e_soak_${ts}_${cycle}`;
      const reportPrefix = `e2e-soak-${ts}-${cycle}`;
      const campaignStart = Date.now();
      await run("bash", ["./scripts/run-local-campaign.sh"], {
        env: {
          ...process.env,
          BASE_URL: baseUrl,
          CASES: subsetCasesPath,
          AGENT_SUITE: "cli",
          CAMPAIGN_PROFILE: "quality",
          STAGED_MODE: "0",
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
          // demo-agent suites are used only for stability qualification; strong telemetry belongs to external-agent quality suites
          CASE_QUALITY_REQUIRE_STRONG_TELEMETRY: "0",
          EVAL_FAIL_ON_EXECUTION_DEGRADED: "1",
          LIBRARY_INGEST: "0",
          ALLOW_EXISTING_RUN_PREFIX: "0",
        },
      });
      const campaignDurationMs = Date.now() - campaignStart;
      campaignDurationsMs.push(campaignDurationMs);

      const baseReportDir = path.join(ROOT, "apps/evaluator/reports", reportPrefix);
      const r2ReportDir = path.join(ROOT, "apps/evaluator/reports", `${reportPrefix}-2`);
      const r3ReportDir = path.join(ROOT, "apps/evaluator/reports", `${reportPrefix}-3`);

      const r1 = verifyCompareReport(baseReportDir);
      const r2 = verifyCompareReport(r2ReportDir);
      const r3 = verifyCompareReport(r3ReportDir);
      cycleGateSignatures.push(JSON.stringify([r1.signature, r2.signature, r3.signature]));
      assert(existsSync(path.join(baseReportDir, "trend.html")), `missing trend.html in ${baseReportDir}`);
    }

    ensureDeterministicGateOutcomes(cycleGateSignatures);
    ensureRuntimeVariance(campaignDurationsMs, maxRuntimeVariance);

    console.log(
      `e2e-soak-load: PASS (cases=${totalCases}, loadConcurrency=${loadConcurrency}, loadIterations=${loadIterations}, soakCycles=${soakCycles}, loadP95=${loadSummary.p95Ms}ms, loadP99=${loadSummary.p99Ms}ms)`
    );
  } finally {
    if (demoProc && !demoProc.killed) {
      shuttingDownDemo = true;
      await stopProcess(demoProc, 2000);
    }
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
