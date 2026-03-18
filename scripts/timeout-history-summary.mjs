#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function isRecord(v) {
  return typeof v === "object" && v !== null;
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function percentile(values, q) {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1));
  return sorted[pos];
}

export function computeCasesSignature(caseIds) {
  const stableIds = [...caseIds].map(String).filter(Boolean).sort();
  return crypto.createHash("sha1").update(stableIds.join("\n")).digest("hex").slice(0, 16);
}

function summarizeHistoryCandidate(successLatencies, minSuccessSamples) {
  const minSamples = Math.max(1, Math.floor(minSuccessSamples));
  const p95Success = percentile(successLatencies, 0.95);
  if (typeof p95Success === "number" && successLatencies.length >= minSamples) {
    return Math.ceil(p95Success * 1.4 + 30_000);
  }
  return undefined;
}

function parseCliArgs(argv) {
  const out = {
    outDir: "apps/runner/runs",
    reportsDir: "apps/evaluator/reports",
    cases: "",
    profileName: "",
    mode: "",
    runtimeClass: "",
    lookbackRuns: 12,
    minSuccessSamples: 3,
    maxCases: 0,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--outDir") out.outDir = String(argv[++i] ?? out.outDir);
    else if (a === "--reportsDir") out.reportsDir = String(argv[++i] ?? out.reportsDir);
    else if (a === "--cases") out.cases = String(argv[++i] ?? "");
    else if (a === "--profileName") out.profileName = String(argv[++i] ?? "");
    else if (a === "--mode") out.mode = String(argv[++i] ?? "");
    else if (a === "--runtimeClass") out.runtimeClass = String(argv[++i] ?? "");
    else if (a === "--lookbackRuns") out.lookbackRuns = parsePositiveInt(argv[++i], out.lookbackRuns);
    else if (a === "--minSuccessSamples") out.minSuccessSamples = parsePositiveInt(argv[++i], out.minSuccessSamples);
    else if (a === "--maxCases") out.maxCases = parsePositiveInt(argv[++i], out.maxCases);
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`Unknown option: ${a}`);
  }

  return out;
}

function renderHelp() {
  return [
    "Usage:",
    "  node scripts/timeout-history-summary.mjs --cases <path> [--reportsDir apps/evaluator/reports] [--profileName <name>] [--mode <quick|full-lite|full|diagnostic>] [--runtimeClass <name>] [--lookbackRuns 12] [--minSuccessSamples 3] [--maxCases 0]",
  ].join("\n");
}

function loadCaseIds(casesPath, maxCases = 0) {
  const abs = path.resolve(process.cwd(), casesPath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(raw)) throw new Error("cases file must be a JSON array");
  const ids = raw.map((item) => String(item?.id ?? "")).filter(Boolean);
  const selectedIds = maxCases > 0 ? ids.slice(0, maxCases) : ids;
  return {
    selectedIds,
    signature: computeCasesSignature(selectedIds),
  };
}

function listRecentReportDirs(root, limit) {
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const abs = path.join(root, entry.name);
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(abs).mtimeMs;
      } catch {
        mtimeMs = 0;
      }
      return { abs, mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, Math.max(0, limit))
    .map((x) => x.abs);
}

function readJsonIfExists(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

function reportCaseIds(reportDir) {
  const compare = readJsonIfExists(path.join(reportDir, "compare-report.json"));
  if (isRecord(compare) && Array.isArray(compare.items)) {
    const ids = compare.items.map((item) => String(item?.case_id ?? "")).filter(Boolean);
    if (ids.length > 0) return ids;
  }

  const caseRoot = path.join(reportDir, "assets", "raw", "case_responses");
  try {
    return fs
      .readdirSync(caseRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectLatenciesFromCaseResponse(absPath, sink) {
  const parsed = readJsonIfExists(absPath);
  if (!isRecord(parsed)) return;

  const runnerFailure = parsed.runner_failure;
  if (
    isRecord(runnerFailure) &&
    typeof runnerFailure.latency_ms === "number" &&
    Number.isFinite(runnerFailure.latency_ms)
  ) {
    sink.failure.push(Math.max(1, Math.floor(runnerFailure.latency_ms)));
    return;
  }

  const runnerTransport = parsed.runner_transport;
  if (
    isRecord(runnerTransport) &&
    typeof runnerTransport.latency_ms === "number" &&
    Number.isFinite(runnerTransport.latency_ms)
  ) {
    sink.success.push(Math.max(1, Math.floor(runnerTransport.latency_ms)));
  }
}

function collectReportLatencies(reportDir, selectedCaseIds) {
  const sink = { success: [], failure: [] };
  for (const caseId of selectedCaseIds) {
    for (const side of ["baseline", "new"]) {
      const absPath = path.join(reportDir, "assets", "raw", "case_responses", caseId, `${side}.json`);
      collectLatenciesFromCaseResponse(absPath, sink);
    }
  }
  return sink;
}

function isPassedStage(reportDir) {
  const stageResult = readJsonIfExists(path.join(reportDir, "stage-result.json"));
  return isRecord(stageResult) && stageResult.status === "passed";
}

function pickHistoryScope(reportDir, envelope, params, currentCasesSignature) {
  const runMode = String(envelope?.run_mode ?? envelope?.runMode ?? "");
  const runtimeClass = String(envelope?.runtime_class ?? envelope?.runtimeClass ?? "");
  const profileName = String(envelope?.profile_name ?? envelope?.profileName ?? "");
  const reportSignature = computeCasesSignature(reportCaseIds(reportDir));

  const scopedProfileModeMatch =
    profileName.length > 0 &&
    params.profileName.length > 0 &&
    profileName === params.profileName &&
    runMode.length > 0 &&
    params.mode.length > 0 &&
    runMode === params.mode &&
    reportSignature === currentCasesSignature;

  const classModeMatch =
    runtimeClass.length > 0 &&
    params.runtimeClass.length > 0 &&
    runtimeClass === params.runtimeClass &&
    runMode.length > 0 &&
    params.mode.length > 0 &&
    runMode === params.mode;

  return {
    scopedProfileModeMatch,
    classModeMatch,
    reportSignature,
    runMode,
    runtimeClass,
    profileName,
  };
}

export function summarizeTimeoutHistory(params) {
  const { selectedIds: caseIds, signature: casesSignature } = loadCaseIds(params.cases, params.maxCases ?? 0);
  const reportsRoot = path.resolve(process.cwd(), params.reportsDir ?? "apps/evaluator/reports");
  const recentReportDirs = listRecentReportDirs(reportsRoot, params.lookbackRuns);

  const scopedSuccessLatenciesMs = [];
  const scopedFailureLatenciesMs = [];
  const classSuccessLatenciesMs = [];
  const classFailureLatenciesMs = [];
  let matchingReportCount = 0;
  let matchingPassedReportCount = 0;
  let classReportCount = 0;
  let classPassedReportCount = 0;

  for (const reportDir of recentReportDirs) {
    const envelope = readJsonIfExists(path.join(reportDir, "devops-envelope.json"));
    if (!isRecord(envelope)) continue;
    const scope = pickHistoryScope(reportDir, envelope, params, casesSignature);
    const passed = isPassedStage(reportDir);
    const latencies = collectReportLatencies(reportDir, caseIds);

    if (scope.scopedProfileModeMatch) {
      matchingReportCount += 1;
      if (passed) matchingPassedReportCount += 1;
      scopedSuccessLatenciesMs.push(...latencies.success);
      scopedFailureLatenciesMs.push(...latencies.failure);
    }

    if (scope.classModeMatch) {
      classReportCount += 1;
      if (passed) classPassedReportCount += 1;
      classSuccessLatenciesMs.push(...latencies.success);
      classFailureLatenciesMs.push(...latencies.failure);
    }
  }

  const scopedRecommendedTimeoutMs = summarizeHistoryCandidate(
    scopedSuccessLatenciesMs,
    params.minSuccessSamples ?? 3
  );
  const classRecommendedTimeoutMs = summarizeHistoryCandidate(
    classSuccessLatenciesMs,
    params.minSuccessSamples ?? 3
  );

  return {
    cases_path: path.resolve(process.cwd(), params.cases),
    reports_dir: reportsRoot,
    selected_case_count: caseIds.length,
    cases_signature: casesSignature,
    first_run: matchingPassedReportCount === 0,
    history_scope: {
      profile_name: params.profileName || null,
      mode: params.mode || null,
      runtime_class: params.runtimeClass || null,
      cases_signature: casesSignature,
    },
    matching_report_count: matchingReportCount,
    matching_passed_report_count: matchingPassedReportCount,
    history_sample_count: scopedSuccessLatenciesMs.length + scopedFailureLatenciesMs.length,
    success_sample_count: scopedSuccessLatenciesMs.length,
    failure_sample_count: scopedFailureLatenciesMs.length,
    p95_success_ms: percentile(scopedSuccessLatenciesMs, 0.95) ?? null,
    p99_success_ms: percentile(scopedSuccessLatenciesMs, 0.99) ?? null,
    max_success_ms: scopedSuccessLatenciesMs.length > 0 ? Math.max(...scopedSuccessLatenciesMs) : null,
    recommended_timeout_ms: scopedRecommendedTimeoutMs ?? null,
    class_report_count: classReportCount,
    class_passed_report_count: classPassedReportCount,
    class_history_sample_count: classSuccessLatenciesMs.length + classFailureLatenciesMs.length,
    class_success_sample_count: classSuccessLatenciesMs.length,
    class_failure_sample_count: classFailureLatenciesMs.length,
    class_p95_success_ms: percentile(classSuccessLatenciesMs, 0.95) ?? null,
    class_p99_success_ms: percentile(classSuccessLatenciesMs, 0.99) ?? null,
    class_max_success_ms: classSuccessLatenciesMs.length > 0 ? Math.max(...classSuccessLatenciesMs) : null,
    class_recommended_timeout_ms: classRecommendedTimeoutMs ?? null,
  };
}

export function cliMain(argv) {
  const args = parseCliArgs(argv);
  if (args.help || !args.cases) {
    console.log(renderHelp());
    return args.help ? 0 : 2;
  }
  console.log(JSON.stringify(summarizeTimeoutHistory(args)));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = cliMain(process.argv);
  } catch (err) {
    console.error(`timeout-history-summary: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}
