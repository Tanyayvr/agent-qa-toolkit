#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const HELP = `Usage: node scripts/proof-otel-anchors.mjs [options]

Options:
  --reportDir <path>      Evaluator report directory (default: apps/evaluator/reports/latest; auto-falls back to latest anchor-enabled report when omitted)
  --minCases <n>          Minimum anchored cases required on BOTH sides (default: 1)
  --json                  Print machine-readable JSON
  --help, -h              Show help
`;

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function fail(message, jsonMode) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
  } else {
    console.error(`ERROR: ${message}`);
  }
  process.exit(1);
}

function asInt(raw, fallback) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function asRate(raw) {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  return raw;
}

function computeRate(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return undefined;
  return value / total;
}

function readCompareReport(reportDir) {
  const comparePath = path.join(reportDir, "compare-report.json");
  if (!fs.existsSync(comparePath)) return null;
  try {
    const compare = JSON.parse(fs.readFileSync(comparePath, "utf8"));
    return { comparePath, compare };
  } catch (err) {
    return { comparePath, parseError: err };
  }
}

function discoverCandidateReportDirs(defaultDir) {
  const candidates = [defaultDir, "apps/evaluator/reports/correctness_latest"];
  const reportsRoot = "apps/evaluator/reports";
  if (fs.existsSync(reportsRoot)) {
    const dirs = fs
      .readdirSync(reportsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(reportsRoot, entry.name))
      .filter((dir) => fs.existsSync(path.join(dir, "compare-report.json")))
      .sort((a, b) => {
        const aMtime = fs.statSync(path.join(a, "compare-report.json")).mtimeMs;
        const bMtime = fs.statSync(path.join(b, "compare-report.json")).mtimeMs;
        return bMtime - aMtime;
      });
    candidates.push(...dirs);
  }
  return [...new Set(candidates)];
}

if (hasFlag("--help") || hasFlag("-h")) {
  process.stdout.write(`${HELP}\n`);
  process.exit(0);
}

const jsonMode = hasFlag("--json");
const reportDirArg = getArg("--reportDir");
const reportDir = reportDirArg || "apps/evaluator/reports/latest";
const minCases = asInt(getArg("--minCases"), 1);
const explicitReportDir = Boolean(reportDirArg);

const candidates = explicitReportDir ? [reportDir] : discoverCandidateReportDirs(reportDir);

let selected = null;
let firstError = null;
for (const candidateDir of candidates) {
  const loaded = readCompareReport(candidateDir);
  if (!loaded) continue;
  if (loaded.parseError) {
    if (!firstError) {
      firstError = `invalid JSON in ${loaded.comparePath}: ${
        loaded.parseError instanceof Error ? loaded.parseError.message : String(loaded.parseError)
      }`;
    }
    continue;
  }
  const coverage = loaded.compare?.summary?.trace_anchor_coverage;
  if (!coverage || typeof coverage !== "object") {
    if (!firstError) firstError = `summary.trace_anchor_coverage is missing in ${loaded.comparePath}`;
    continue;
  }
  const baseline = Number(coverage.cases_with_anchor_baseline ?? 0);
  const newer = Number(coverage.cases_with_anchor_new ?? 0);
  const ok = baseline >= minCases && newer >= minCases;
  if (!selected) {
    selected = { ...loaded, coverage, baseline, newer, ok };
  }
  if (ok) {
    selected = { ...loaded, coverage, baseline, newer, ok };
    break;
  }
}

if (!selected) {
  const hint =
    "Run `npm run demo:correctness` first, then rerun proof (or pass --reportDir with an anchor-enabled report).";
  fail(
    firstError
      ? `${firstError}. ${hint}`
      : `compare-report.json not found under candidates starting from ${reportDir}. ${hint}`,
    jsonMode
  );
}

const comparePath = selected.comparePath;
const compare = selected.compare;
const coverage = selected.coverage;
const baseline = selected.baseline;
const newer = selected.newer;
const dataCoverageTotal = Number(compare?.summary?.data_coverage?.total_cases ?? 0);
const eqTotal = Number(compare?.summary?.execution_quality?.total_executed_cases ?? 0);
const inferredTotal = dataCoverageTotal > 0 ? dataCoverageTotal : eqTotal;
const baselineRate = asRate(coverage.baseline_rate) ?? computeRate(baseline, inferredTotal) ?? 0;
const newRate = asRate(coverage.new_rate) ?? computeRate(newer, inferredTotal) ?? 0;
const ok = selected.ok;

const payload = {
  ok,
  report_dir: path.dirname(comparePath),
  compare_report: comparePath,
  min_cases_required_each_side: minCases,
  cases_with_anchor_baseline: baseline,
  cases_with_anchor_new: newer,
  baseline_rate: baselineRate,
  new_rate: newRate,
  ...(path.dirname(comparePath) !== reportDir ? { requested_report_dir: reportDir } : {}),
  ...(path.dirname(comparePath) !== reportDir && !explicitReportDir
    ? { note: "requested report had no anchors; used most recent anchor-enabled report automatically" }
    : {})
};

if (!ok) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    console.error(`OTel anchor proof: FAILED`);
    console.error(`- report: ${comparePath}`);
    console.error(`- required anchored cases per side: ${minCases}`);
    console.error(`- baseline anchored cases: ${baseline}`);
    console.error(`- new anchored cases: ${newer}`);
  }
  process.exit(1);
}

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
} else {
  console.log("OTel anchor proof: OK");
  console.log(`- report: ${comparePath}`);
  console.log(`- baseline anchored cases: ${baseline} (${baselineRate})`);
  console.log(`- new anchored cases: ${newer} (${newRate})`);
}
