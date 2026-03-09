#!/usr/bin/env node
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
    cases: "",
    lookbackRuns: 12,
    minSuccessSamples: 3,
    maxCases: 0,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--outDir") out.outDir = String(argv[++i] ?? out.outDir);
    else if (a === "--cases") out.cases = String(argv[++i] ?? "");
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
    "  node scripts/timeout-history-summary.mjs --cases <path> [--outDir apps/runner/runs] [--lookbackRuns 12] [--minSuccessSamples 3] [--maxCases 0]",
  ].join("\n");
}

function loadCaseIds(casesPath, maxCases = 0) {
  const abs = path.resolve(process.cwd(), casesPath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(raw)) throw new Error("cases file must be a JSON array");
  const ids = raw.map((item) => String(item?.id ?? "")).filter(Boolean);
  if (maxCases > 0) return ids.slice(0, maxCases);
  return ids;
}

function listRecentRunDirs(root, limit) {
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesCaseFile(fileName, caseId) {
  return new RegExp(`^${escapeRegExp(caseId)}(?:\\.run\\d+)?\\.json$`).test(fileName);
}

export function summarizeTimeoutHistory(params) {
  const caseIds = loadCaseIds(params.cases, params.maxCases ?? 0);
  const selected = new Set(caseIds);
  const successLatenciesMs = [];
  const failureLatenciesMs = [];
  const runRoots = [
    path.join(path.resolve(process.cwd(), params.outDir), "baseline"),
    path.join(path.resolve(process.cwd(), params.outDir), "new"),
  ];

  for (const root of runRoots) {
    const recentRunDirs = listRecentRunDirs(root, params.lookbackRuns);
    for (const runDir of recentRunDirs) {
      let files = [];
      try {
        files = fs.readdirSync(runDir);
      } catch {
        continue;
      }

      for (const caseId of selected) {
        const matched = files.filter((name) => matchesCaseFile(name, caseId));
        for (const fileName of matched) {
          let parsed;
          try {
            parsed = JSON.parse(fs.readFileSync(path.join(runDir, fileName), "utf8"));
          } catch {
            continue;
          }
          if (!isRecord(parsed)) continue;

          const runnerFailure = parsed.runner_failure;
          if (
            isRecord(runnerFailure) &&
            typeof runnerFailure.latency_ms === "number" &&
            Number.isFinite(runnerFailure.latency_ms)
          ) {
            failureLatenciesMs.push(Math.max(1, Math.floor(runnerFailure.latency_ms)));
            continue;
          }

          const runnerTransport = parsed.runner_transport;
          if (
            isRecord(runnerTransport) &&
            typeof runnerTransport.latency_ms === "number" &&
            Number.isFinite(runnerTransport.latency_ms)
          ) {
            successLatenciesMs.push(Math.max(1, Math.floor(runnerTransport.latency_ms)));
          }
        }
      }
    }
  }

  const p95SuccessMs = percentile(successLatenciesMs, 0.95);
  const p99SuccessMs = percentile(successLatenciesMs, 0.99);
  const maxSuccessMs = successLatenciesMs.length > 0 ? Math.max(...successLatenciesMs) : undefined;
  const recommendedTimeoutMs = summarizeHistoryCandidate(
    successLatenciesMs,
    params.minSuccessSamples ?? 3
  );

  return {
    cases_path: path.resolve(process.cwd(), params.cases),
    out_dir: path.resolve(process.cwd(), params.outDir),
    selected_case_count: caseIds.length,
    history_sample_count: successLatenciesMs.length + failureLatenciesMs.length,
    success_sample_count: successLatenciesMs.length,
    failure_sample_count: failureLatenciesMs.length,
    p95_success_ms: p95SuccessMs ?? null,
    p99_success_ms: p99SuccessMs ?? null,
    max_success_ms: maxSuccessMs ?? null,
    recommended_timeout_ms: recommendedTimeoutMs ?? null,
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
