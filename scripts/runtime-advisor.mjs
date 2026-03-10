#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { summarizeTimeoutHistory } from "./timeout-history-summary.mjs";
import { classifyStageFailureFromPath } from "./staged-campaign-utils.mjs";

const BACKOFF_BASE_MS = 250;
const DEFAULT_DIAGNOSTIC_THRESHOLD_MS = 90 * 60 * 1000;
const ABSOLUTE_RECOMMEND_CAP_MS = 24 * 60 * 60 * 1000;

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseNonNegativeInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function loadCases(casesPath, maxCases = 0) {
  const abs = path.resolve(process.cwd(), casesPath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(raw)) throw new Error("cases file must be a JSON array");
  const selected = maxCases > 0 ? raw.slice(0, maxCases) : raw;
  return {
    totalCaseCount: raw.length,
    selectedCaseCount: selected.length,
  };
}

function estimateWorstCaseRuntimeMs({ timeoutMs, retries, concurrency, sampleCount, caseCount }) {
  const attemptsPerRequest = Math.max(1, retries + 1);
  const requestsTotal = caseCount * 2 * Math.max(1, sampleCount);
  let backoffPerRequestMs = 0;
  for (let attempt = 1; attempt <= Math.max(0, retries); attempt += 1) {
    const exp = Math.min(6, Math.max(0, attempt - 1));
    backoffPerRequestMs += BACKOFF_BASE_MS * Math.pow(2, exp);
  }
  const perRequestMs = attemptsPerRequest * timeoutMs + backoffPerRequestMs;
  return Math.ceil((requestsTotal * perRequestMs) / Math.max(1, concurrency));
}

function chooseConfidence(successSamples, minSuccessSamples) {
  if (successSamples >= Math.max(5, minSuccessSamples * 2)) return "high";
  if (successSamples >= minSuccessSamples) return "medium";
  if (successSamples > 0) return "low";
  return "low";
}

function recommendedModeForRuntime({ mode, runtimeClass, estimatedRuntimeUpperBoundMs, diagnosticThresholdMs }) {
  if (mode === "quick") return "quick";
  if (mode === "diagnostic") return "diagnostic";
  if (estimatedRuntimeUpperBoundMs >= diagnosticThresholdMs) return "diagnostic";
  if (mode === "full-lite") return "full-lite";
  if (runtimeClass === "slow_local_cli" && estimatedRuntimeUpperBoundMs >= 60 * 60 * 1000) {
    return "diagnostic";
  }
  return "full";
}

export function estimateRuntimePlan(params) {
  if (!params.cases) throw new Error("--cases is required");
  const caseInfo = loadCases(params.cases, params.maxCases ?? 0);
  const history = summarizeTimeoutHistory({
    outDir: params.outDir,
    cases: params.cases,
    lookbackRuns: params.timeoutAutoLookbackRuns,
    minSuccessSamples: params.timeoutAutoMinSuccessSamples,
    maxCases: params.maxCases ?? 0,
  });

  const growthCapMs = Math.max(
    params.timeoutMs,
    Math.floor(params.timeoutMs * Math.max(1, params.timeoutAutoMaxIncreaseFactor))
  );

  let effectiveTimeoutMs = params.timeoutMs;
  let estimateSource = "base_timeout";
  let clampedByGrowth = false;
  let clampedByCap = false;
  const notes = [];

  if (params.timeoutProfile === "auto") {
    if (typeof history.recommended_timeout_ms === "number" && Number.isFinite(history.recommended_timeout_ms)) {
      let candidate = history.recommended_timeout_ms;
      estimateSource = "history_candidate";
      if (candidate > growthCapMs) {
        candidate = growthCapMs;
        clampedByGrowth = true;
        estimateSource = "history_candidate_growth_capped";
        notes.push(`history candidate exceeded growth guard and was capped at ${growthCapMs}ms`);
      }
      if (candidate > params.timeoutAutoCapMs) {
        candidate = params.timeoutAutoCapMs;
        clampedByCap = true;
        estimateSource = `${estimateSource}_cap_capped`;
        notes.push(`history candidate exceeded cap and was capped at ${params.timeoutAutoCapMs}ms`);
      }
      effectiveTimeoutMs = Math.max(params.timeoutMs, candidate);
    } else {
      estimateSource =
        history.success_sample_count > 0 ? "base_timeout_insufficient_history" : "base_timeout_no_history";
      notes.push("history is not strong enough to tune timeout automatically");
    }
  }

  const estimatedRuntimeUpperBoundMs = estimateWorstCaseRuntimeMs({
    timeoutMs: effectiveTimeoutMs,
    retries: params.retries,
    concurrency: params.concurrency,
    sampleCount: params.sampleCount,
    caseCount: caseInfo.selectedCaseCount,
  });
  const confidence = chooseConfidence(history.success_sample_count, params.timeoutAutoMinSuccessSamples);
  const recommendedMode = recommendedModeForRuntime({
    mode: params.mode,
    runtimeClass: params.runtimeClass,
    estimatedRuntimeUpperBoundMs,
    diagnosticThresholdMs: params.diagnosticThresholdMs,
  });

  if (recommendedMode === "diagnostic" && params.mode !== "diagnostic") {
    notes.push("predicted runtime is high enough that diagnostic mode is recommended");
  }
  if (params.runtimeClass === "heavy_mcp_agent" && recommendedMode !== "quick") {
    notes.push("heavy_mcp_agent runs are usually better on nightly or dedicated hosts than on the default local loop");
  }
  if (params.runtimeClass === "slow_local_cli" && recommendedMode === "diagnostic") {
    notes.push("slow_local_cli agent is likely better on a nightly or dedicated path for long validation runs");
  }
  if (confidence === "low") {
    notes.push("estimate confidence is low; treat this as envelope planning, not a precise forecast");
  }

  return {
    purpose: "plan",
    mode: params.mode,
    runtime_class: params.runtimeClass,
    cases_path: path.resolve(process.cwd(), params.cases),
    selected_case_count: caseInfo.selectedCaseCount,
    total_case_count: caseInfo.totalCaseCount,
    sample_count: params.sampleCount,
    retries: params.retries,
    concurrency: params.concurrency,
    timeout_profile: params.timeoutProfile,
    base_timeout_ms: params.timeoutMs,
    timeout_auto_cap_ms: params.timeoutAutoCapMs,
    timeout_auto_min_success_samples: params.timeoutAutoMinSuccessSamples,
    timeout_auto_max_increase_factor: params.timeoutAutoMaxIncreaseFactor,
    history_sample_count: history.history_sample_count,
    history_success_sample_count: history.success_sample_count,
    history_failure_sample_count: history.failure_sample_count,
    history_p95_success_ms: history.p95_success_ms,
    history_p99_success_ms: history.p99_success_ms,
    history_max_success_ms: history.max_success_ms,
    history_candidate_timeout_ms: history.recommended_timeout_ms,
    growth_cap_ms: growthCapMs,
    estimated_request_timeout_ms: effectiveTimeoutMs,
    estimated_stage_runtime_upper_bound_ms: estimatedRuntimeUpperBoundMs,
    estimate_source: estimateSource,
    clamped_by_growth: clampedByGrowth,
    clamped_by_cap: clampedByCap,
    confidence,
    recommended_mode: recommendedMode,
    notes,
  };
}

function loadCompare(comparePath) {
  const abs = path.resolve(process.cwd(), comparePath);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function collectBudgetTimeoutCases(compare) {
  const caseIds = [];
  for (const item of compare?.items || []) {
    const baseline = item?.failure_summary?.baseline;
    const newer = item?.failure_summary?.new;
    if (baseline?.timeout_cause === "timeout_budget_too_small" || newer?.timeout_cause === "timeout_budget_too_small") {
      caseIds.push(String(item?.case_id ?? "unknown"));
    }
  }
  return caseIds;
}

function nextActionForRecommendation(reason, suggestedMode) {
  if (reason === "timeout_budget") {
    return suggestedMode === "diagnostic"
      ? "rerun_diagnostic_with_recommended_envelope"
      : "rerun_with_recommended_timeout_envelope";
  }
  if (reason === "transport") return "check_adapter_health_then_retry";
  if (reason === "agent_stuck_or_loop") return "inspect_loop_trace_before_retry";
  if (reason === "waiting_for_input") return "switch_to_noninteractive_mode_or_provide_input";
  return "inspect_compare_report_and_stage_result";
}

export function recommendRuntimeEnvelope(params) {
  if (!params.compare) throw new Error("--compare is required");
  const compare = loadCompare(params.compare);
  const classification = classifyStageFailureFromPath(params.compare, "unknown");
  const currentPlan = estimateRuntimePlan(params);

  const result = {
    purpose: "recommendation",
    stage: params.stage,
    reason: classification.reason,
    source: classification.source,
    timeout_cause: classification.timeout_cause ?? null,
    timed_out_case_ids: collectBudgetTimeoutCases(compare),
    current_plan: currentPlan,
    next_action: nextActionForRecommendation(classification.reason, currentPlan.recommended_mode),
    suggested_envelope: null,
    notes: [],
  };

  if (classification.reason !== "timeout_budget") {
    result.notes.push("recommendation is based on non-timeout-budget failure; review evidence before changing envelope");
    return result;
  }

  const effectiveTimeoutMs = currentPlan.estimated_request_timeout_ms;
  let suggestedBaseTimeoutMs = Math.max(params.timeoutMs, Math.ceil(effectiveTimeoutMs * 2));
  let suggestedMaxIncreaseFactor = params.timeoutAutoMaxIncreaseFactor;

  if (params.timeoutProfile === "auto" && currentPlan.clamped_by_growth) {
    suggestedMaxIncreaseFactor = Math.max(params.timeoutAutoMaxIncreaseFactor, 6);
    result.notes.push("growth guard limited the current auto-timeout; recommendation raises the growth factor");
  }

  if (params.timeoutProfile === "auto" && typeof currentPlan.history_candidate_timeout_ms === "number") {
    suggestedBaseTimeoutMs = Math.max(
      suggestedBaseTimeoutMs,
      Math.ceil(currentPlan.history_candidate_timeout_ms * 1.5)
    );
  }

  let suggestedCapMs = params.timeoutAutoCapMs;
  const neededCapMs = Math.ceil(suggestedBaseTimeoutMs * Math.max(1, suggestedMaxIncreaseFactor));
  if (neededCapMs > suggestedCapMs) {
    suggestedCapMs = Math.min(ABSOLUTE_RECOMMEND_CAP_MS, neededCapMs);
    result.notes.push("current cap is too small for the recommended retry envelope");
  }

  const suggestedPlan = estimateRuntimePlan({
    ...params,
    timeoutMs: suggestedBaseTimeoutMs,
    timeoutAutoCapMs: suggestedCapMs,
    timeoutAutoMaxIncreaseFactor: suggestedMaxIncreaseFactor,
    mode: params.mode === "quick" ? "quick" : params.mode,
  });

  const suggestedMode = recommendedModeForRuntime({
    mode: params.mode === "quick" ? "quick" : params.mode,
    runtimeClass: params.runtimeClass,
    estimatedRuntimeUpperBoundMs: suggestedPlan.estimated_stage_runtime_upper_bound_ms,
    diagnosticThresholdMs: params.diagnosticThresholdMs,
  });

  result.next_action = nextActionForRecommendation(classification.reason, suggestedMode);
  result.suggested_envelope = {
    mode: suggestedMode,
    timeout_ms: suggestedBaseTimeoutMs,
    timeout_profile: params.timeoutProfile,
    timeout_auto_cap_ms: suggestedCapMs,
    timeout_auto_max_increase_factor: suggestedMaxIncreaseFactor,
    estimated_request_timeout_ms: suggestedPlan.estimated_request_timeout_ms,
    estimated_stage_runtime_upper_bound_ms: suggestedPlan.estimated_stage_runtime_upper_bound_ms,
    confidence: suggestedPlan.confidence,
  };
  if (suggestedMode === "diagnostic") {
    result.notes.push("recommended envelope is now in diagnostic range; operator should use diagnostic mode");
  }
  return result;
}

function parseArgs(argv) {
  const out = {
    command: "",
    mode: "quick",
    stage: "full",
    compare: "",
    cases: "",
    outDir: "apps/runner/runs",
    timeoutProfile: "off",
    timeoutMs: 120000,
    timeoutAutoCapMs: 3600000,
    timeoutAutoLookbackRuns: 12,
    timeoutAutoMinSuccessSamples: 3,
    timeoutAutoMaxIncreaseFactor: 3,
    sampleCount: 1,
    retries: 0,
    concurrency: 1,
    runtimeClass: "generic",
    diagnosticThresholdMs: DEFAULT_DIAGNOSTIC_THRESHOLD_MS,
    maxCases: 0,
    out: "",
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!out.command && !arg.startsWith("--")) {
      out.command = arg;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--mode") out.mode = String(argv[++i] ?? out.mode);
    else if (arg === "--stage") out.stage = String(argv[++i] ?? out.stage);
    else if (arg === "--compare") out.compare = String(argv[++i] ?? "");
    else if (arg === "--cases") out.cases = String(argv[++i] ?? "");
    else if (arg === "--outDir") out.outDir = String(argv[++i] ?? out.outDir);
    else if (arg === "--timeoutProfile") out.timeoutProfile = String(argv[++i] ?? out.timeoutProfile);
    else if (arg === "--timeoutMs") out.timeoutMs = parsePositiveInt(argv[++i], out.timeoutMs);
    else if (arg === "--timeoutAutoCapMs") out.timeoutAutoCapMs = parsePositiveInt(argv[++i], out.timeoutAutoCapMs);
    else if (arg === "--timeoutAutoLookbackRuns") out.timeoutAutoLookbackRuns = parsePositiveInt(argv[++i], out.timeoutAutoLookbackRuns);
    else if (arg === "--timeoutAutoMinSuccessSamples") {
      out.timeoutAutoMinSuccessSamples = parsePositiveInt(argv[++i], out.timeoutAutoMinSuccessSamples);
    } else if (arg === "--timeoutAutoMaxIncreaseFactor") {
      out.timeoutAutoMaxIncreaseFactor = parsePositiveInt(argv[++i], out.timeoutAutoMaxIncreaseFactor);
    } else if (arg === "--sampleCount") out.sampleCount = parsePositiveInt(argv[++i], out.sampleCount);
    else if (arg === "--retries") out.retries = parseNonNegativeInt(argv[++i], out.retries);
    else if (arg === "--concurrency") out.concurrency = parsePositiveInt(argv[++i], out.concurrency);
    else if (arg === "--runtimeClass") out.runtimeClass = String(argv[++i] ?? out.runtimeClass);
    else if (arg === "--diagnosticThresholdMs") {
      out.diagnosticThresholdMs = parsePositiveInt(argv[++i], out.diagnosticThresholdMs);
    } else if (arg === "--maxCases") out.maxCases = parsePositiveInt(argv[++i], out.maxCases);
    else if (arg === "--out") out.out = String(argv[++i] ?? "");
    else throw new Error(`Unknown option: ${arg}`);
  }

  return out;
}

function renderHelp() {
  return [
    "Usage:",
    "  node scripts/runtime-advisor.mjs plan --mode <quick|full-lite|full|diagnostic> --cases <path> [options]",
    "  node scripts/runtime-advisor.mjs recommend --stage <smoke|full-lite|full> --compare <compare-report.json> --cases <path> [options]",
    "",
    "Common options:",
    "  --outDir <dir> --timeoutProfile <off|auto> --timeoutMs <ms> --timeoutAutoCapMs <ms>",
    "  --timeoutAutoLookbackRuns <n> --timeoutAutoMinSuccessSamples <n> --timeoutAutoMaxIncreaseFactor <n>",
    "  --sampleCount <n> --retries <n> --concurrency <n> --runtimeClass <generic|slow_local_cli>",
    "  --maxCases <n> --diagnosticThresholdMs <ms> [--out <path>]",
  ].join("\n");
}

export function cliMain(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.command) {
    console.log(renderHelp());
    return args.help ? 0 : 2;
  }

  let result;
  if (args.command === "plan") {
    result = estimateRuntimePlan(args);
  } else if (args.command === "recommend") {
    result = recommendRuntimeEnvelope(args);
  } else {
    throw new Error(`Unknown command: ${args.command}`);
  }

  const payload = JSON.stringify(result, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), args.out)), { recursive: true });
    fs.writeFileSync(path.resolve(process.cwd(), args.out), payload, "utf8");
  }
  console.log(payload);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = cliMain(process.argv);
  } catch (error) {
    console.error(`runtime-advisor: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
