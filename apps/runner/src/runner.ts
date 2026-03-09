// apps/runner/src/runner.ts
import { readFile, appendFile, rm, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  TokenUsage,
  Version,
} from "shared-types";
import {
  CliUsageError,
  InterruptedRunError,
  emitStructuredLog,
  makeArgvHelpers,
  makeCliUsageGuards,
  writeJsonAtomic,
  ensureDir,
} from "cli-utils";
import { sanitizeValue, type RedactionPreset } from "./sanitize";
import type {
  RunnerConfig,
  TimeoutAutoResolution,
} from "./runnerTypes";
import {
  aggregateTokenUsage,
  captureGitContext,
  enrichResponseWithLoopAnalysis,
  estimateWorstCaseRuntimeMs,
  formatDuration,
  normalizeBaseUrl,
} from "./runnerCore";
import {
  RUNNER_HELP_TEXT,
  normalizeOptionalId,
  parseCasesJson,
  parseOnlyCaseIds,
  parsePreflightMode,
  parseTimeoutProfile,
  resolveFromRoot,
} from "./runnerCli";
import {
  resolveTimeoutProfileAuto,
  runPreflight,
} from "./runnerReliability";
import {
  createCaseWatchdog,
  linkAbortSignals,
  mkWatchdogFailureResponse,
} from "./runnerWatchdog";
import { runOneCaseWithReliability } from "./runnerRequest";
import { runWithConcurrency } from "./runnerConcurrency";

export { parseTraceparent, extractTraceAnchorFromHeaders, attachTraceAnchorIfMissing } from "cli-utils";
export { shouldPreferNodeHttpTransport, shouldUseNodeHttpFallback } from "./httpTransport";
export { percentile, summarizeHistoryCandidate } from "./historyTimeout";
export { inferNetErrorKind } from "./runnerReliability";
export {
  aggregateTokenUsage,
  captureGitContext,
  enrichResponseWithLoopAnalysis,
  estimateWorstCaseRuntimeMs,
  formatDuration,
  normalizeBaseUrl,
  parseOnlyCaseIdsRaw,
} from "./runnerCore";

const { hasFlag, getFlag, getArg, assertNoUnknownOptions, assertHasValue, parseIntFlag } = makeArgvHelpers(process.argv);
const { assertNoUnknownOptionsOrThrow, assertHasValueOrThrow, parseIntFlagOrThrow } = makeCliUsageGuards(
  RUNNER_HELP_TEXT,
  { assertNoUnknownOptions, assertHasValue, parseIntFlag }
);
const AUDIT_LOG_ENV = process.env.AUDIT_LOG_PATH;

async function appendAuditLog(entry: Record<string, unknown>): Promise<void> {
  if (!AUDIT_LOG_ENV) return;
  const line = JSON.stringify({ ts: Date.now(), ...entry }) + "\n";
  try {
    await appendFile(AUDIT_LOG_ENV, line, "utf-8");
  } catch {
    // audit logging must not fail the run
  }
}

export async function runRunner(): Promise<void> {
  const repoRoot = getArg("--repoRoot") ?? process.env.INIT_CWD ?? process.cwd();
  const rel = (p: string) => path.relative(repoRoot, p).split(path.sep).join("/");
  const fmtRel = (p: string) => {
    const r = rel(p);
    return r.length ? r : ".";
  };
  let interruptedBy: { signal: "SIGINT" | "SIGTERM"; at: number } | null = null;
  const interruptController = new AbortController();
  const onSigInt = () => {
    if (interruptedBy) return;
    interruptedBy = { signal: "SIGINT", at: Date.now() };
    interruptController.abort();
    console.warn("Runner: SIGINT received, preparing graceful stop...");
    emitStructuredLog("runner", "warn", "signal", { signal: "SIGINT" });
  };
  const onSigTerm = () => {
    if (interruptedBy) return;
    interruptedBy = { signal: "SIGTERM", at: Date.now() };
    interruptController.abort();
    console.warn("Runner: SIGTERM received, preparing graceful stop...");
    emitStructuredLog("runner", "warn", "signal", { signal: "SIGTERM" });
  };
  process.once("SIGINT", onSigInt);
  process.once("SIGTERM", onSigTerm);
  const getInterruptSignalName = () => interruptedBy?.signal ?? "SIGINT";

  if (hasFlag("--help", "-h")) {
    console.log(RUNNER_HELP_TEXT);
    process.removeListener("SIGINT", onSigInt);
    process.removeListener("SIGTERM", onSigTerm);
    return;
  }

  try {
  assertNoUnknownOptionsOrThrow(
    new Set([
      "--repoRoot",
      "--baseUrl",
      "--cases",
      "--outDir",
      "--runId",
      "--incidentId",
      "--agentId",
      "--only",
      "--dryRun",
      "--timeoutMs",
      "--timeoutProfile",
      "--timeoutAutoCapMs",
      "--timeoutAutoLookbackRuns",
      "--timeoutAutoMinSuccessSamples",
      "--timeoutAutoMaxIncreaseFactor",
      "--retries",
      "--backoffBaseMs",
      "--concurrency",
      "--inactivityTimeoutMs",
      "--heartbeatIntervalMs",
      "--preflightMode",
      "--preflightTimeoutMs",
      "--failFastTransportStreak",
      "--bodySnippetBytes",
      "--maxBodyBytes",
      "--noSaveFullBodyOnError",
      "--redactionPreset",
      "--keepRaw",
      "--retentionDays",
      "--runs",
      "--help",
      "-h"
    ])
  );

  assertHasValueOrThrow("--repoRoot");
  assertHasValueOrThrow("--baseUrl");
  assertHasValueOrThrow("--cases");
  assertHasValueOrThrow("--outDir");
  assertHasValueOrThrow("--runId");
  assertHasValueOrThrow("--incidentId");
  assertHasValueOrThrow("--agentId");
  assertHasValueOrThrow("--only");
  assertHasValueOrThrow("--timeoutMs");
  assertHasValueOrThrow("--timeoutProfile");
  assertHasValueOrThrow("--timeoutAutoCapMs");
  assertHasValueOrThrow("--timeoutAutoLookbackRuns");
  assertHasValueOrThrow("--timeoutAutoMinSuccessSamples");
  assertHasValueOrThrow("--timeoutAutoMaxIncreaseFactor");
  assertHasValueOrThrow("--retries");
  assertHasValueOrThrow("--backoffBaseMs");
  assertHasValueOrThrow("--concurrency");
  assertHasValueOrThrow("--inactivityTimeoutMs");
  assertHasValueOrThrow("--heartbeatIntervalMs");
  assertHasValueOrThrow("--preflightMode");
  assertHasValueOrThrow("--preflightTimeoutMs");
  assertHasValueOrThrow("--failFastTransportStreak");
  assertHasValueOrThrow("--bodySnippetBytes");
  assertHasValueOrThrow("--maxBodyBytes");
  assertHasValueOrThrow("--redactionPreset");
  assertHasValueOrThrow("--retentionDays");

  const keepRaw = getFlag("--keepRaw");

  const redactionPresetRaw = getArg("--redactionPreset");
  if (redactionPresetRaw && redactionPresetRaw !== "none" && redactionPresetRaw !== "internal_only" && redactionPresetRaw !== "transferable" && redactionPresetRaw !== "transferable_extended") {
    throw new CliUsageError(`Invalid --redactionPreset value: ${redactionPresetRaw}. Must be "none", "internal_only", "transferable", or "transferable_extended".\n\n${RUNNER_HELP_TEXT}`);
  }
  const redactionPreset: RedactionPreset = (redactionPresetRaw ?? "none") as RedactionPreset;
  const preflightMode = parsePreflightMode(getArg("--preflightMode"));
  const timeoutProfile = parseTimeoutProfile(getArg("--timeoutProfile"));
  const timeoutAutoCapMs = parseIntFlagOrThrow("--timeoutAutoCapMs", 3_600_000);
  const timeoutAutoLookbackRuns = parseIntFlagOrThrow("--timeoutAutoLookbackRuns", 12);
  const timeoutAutoMinSuccessSamples = parseIntFlagOrThrow("--timeoutAutoMinSuccessSamples", 3);
  const timeoutAutoMaxIncreaseFactor = parseIntFlagOrThrow("--timeoutAutoMaxIncreaseFactor", 3);
  const inactivityExplicit = getArg("--inactivityTimeoutMs") !== null;
  const preflightExplicit = getArg("--preflightTimeoutMs") !== null;

  const parsedTimeoutMs = parseIntFlagOrThrow("--timeoutMs", 15000);
  const parsedInactivityTimeoutMs = parseIntFlagOrThrow("--inactivityTimeoutMs", 0);
  const parsedHeartbeatIntervalMs = parseIntFlagOrThrow("--heartbeatIntervalMs", 30000);
  const parsedPreflightTimeoutMs = parseIntFlagOrThrow("--preflightTimeoutMs", Math.min(parsedTimeoutMs, 10_000));
  const parsedFailFastTransportStreak = parseIntFlagOrThrow("--failFastTransportStreak", 0);
  const parsedRunId = getArg("--runId") ?? randomUUID();
  const parsedIncidentId = normalizeOptionalId(getArg("--incidentId"), "--incidentId") ?? parsedRunId;
  const parsedAgentId = normalizeOptionalId(getArg("--agentId"), "--agentId");

  const cfg: RunnerConfig = {
    repoRoot,
    baseUrl: normalizeBaseUrl(getArg("--baseUrl") ?? "http://localhost:8787"),
    casesPath: resolveFromRoot(repoRoot, getArg("--cases") ?? "cases/cases.json"),
    outDir: resolveFromRoot(repoRoot, getArg("--outDir") ?? "apps/runner/runs"),
    runId: parsedRunId,
    incidentId: parsedIncidentId,
    ...(parsedAgentId ? { agentId: parsedAgentId } : {}),
    onlyCaseIds: parseOnlyCaseIds(getArg("--only")),
    dryRun: getFlag("--dryRun"),
    redactionPreset,
    keepRaw,

    timeoutMs: parsedTimeoutMs,
    timeoutProfile,
    timeoutAutoCapMs,
    timeoutAutoLookbackRuns,
    timeoutAutoMinSuccessSamples,
    timeoutAutoMaxIncreaseFactor,
    retries: parseIntFlagOrThrow("--retries", 2),
    backoffBaseMs: parseIntFlagOrThrow("--backoffBaseMs", 250),
    concurrency: parseIntFlagOrThrow("--concurrency", 1),
    inactivityTimeoutMs:
      parsedInactivityTimeoutMs > 0
        ? parsedInactivityTimeoutMs
        : Math.max(parsedTimeoutMs + 30_000, 120_000),
    heartbeatIntervalMs: parsedHeartbeatIntervalMs,
    preflightMode,
    preflightTimeoutMs: parsedPreflightTimeoutMs,
    failFastTransportStreak: parsedFailFastTransportStreak,

    bodySnippetBytes: parseIntFlagOrThrow("--bodySnippetBytes", 4000),
    maxBodyBytes: parseIntFlagOrThrow("--maxBodyBytes", 2000000),
    saveFullBodyOnError: !getFlag("--noSaveFullBodyOnError"),
    retentionDays: Math.max(0, parseIntFlagOrThrow("--retentionDays", 0)),
    runs: Math.max(1, parseIntFlagOrThrow("--runs", 1)),
  };

  if (cfg.timeoutMs <= 0) {
    throw new CliUsageError(`Invalid --timeoutMs value: ${cfg.timeoutMs}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.timeoutAutoCapMs <= 0) {
    throw new CliUsageError(`Invalid --timeoutAutoCapMs value: ${cfg.timeoutAutoCapMs}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.timeoutAutoLookbackRuns <= 0) {
    throw new CliUsageError(`Invalid --timeoutAutoLookbackRuns value: ${cfg.timeoutAutoLookbackRuns}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.timeoutAutoMinSuccessSamples <= 0) {
    throw new CliUsageError(
      `Invalid --timeoutAutoMinSuccessSamples value: ${cfg.timeoutAutoMinSuccessSamples}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`
    );
  }
  if (cfg.timeoutAutoMaxIncreaseFactor <= 0) {
    throw new CliUsageError(
      `Invalid --timeoutAutoMaxIncreaseFactor value: ${cfg.timeoutAutoMaxIncreaseFactor}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`
    );
  }
  if (cfg.retries < 0) {
    throw new CliUsageError(`Invalid --retries value: ${cfg.retries}. Must be >= 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.backoffBaseMs < 0) {
    throw new CliUsageError(`Invalid --backoffBaseMs value: ${cfg.backoffBaseMs}. Must be >= 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.concurrency <= 0) {
    throw new CliUsageError(`Invalid --concurrency value: ${cfg.concurrency}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.preflightTimeoutMs <= 0) {
    throw new CliUsageError(`Invalid --preflightTimeoutMs value: ${cfg.preflightTimeoutMs}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.failFastTransportStreak < 0) {
    throw new CliUsageError(`Invalid --failFastTransportStreak value: ${cfg.failFastTransportStreak}. Must be >= 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.inactivityTimeoutMs <= 0) {
    throw new CliUsageError(`Invalid --inactivityTimeoutMs value: ${cfg.inactivityTimeoutMs}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.heartbeatIntervalMs <= 0) {
    throw new CliUsageError(`Invalid --heartbeatIntervalMs value: ${cfg.heartbeatIntervalMs}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.heartbeatIntervalMs >= cfg.inactivityTimeoutMs) {
    throw new CliUsageError(
      `Invalid watchdog config: --heartbeatIntervalMs (${cfg.heartbeatIntervalMs}) must be < --inactivityTimeoutMs (${cfg.inactivityTimeoutMs}).\n\n${RUNNER_HELP_TEXT}`
    );
  }
  if (cfg.bodySnippetBytes < 0) {
    throw new CliUsageError(`Invalid --bodySnippetBytes value: ${cfg.bodySnippetBytes}. Must be >= 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.maxBodyBytes <= 0) {
    throw new CliUsageError(`Invalid --maxBodyBytes value: ${cfg.maxBodyBytes}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (cfg.runs <= 0) {
    throw new CliUsageError(`Invalid --runs value: ${cfg.runs}. Must be > 0.\n\n${RUNNER_HELP_TEXT}`);
  }


  const raw = await readFile(cfg.casesPath, "utf-8");
  const cases = parseCasesJson(raw);

  const selectedCases = cfg.onlyCaseIds ? cases.filter((c) => cfg.onlyCaseIds!.includes(c.id)) : cases;
  if (selectedCases.length === 0) throw new Error("No cases selected. Check --only or cases.json content.");

  let timeoutAutoResolution: TimeoutAutoResolution = {
    profile: "off",
    base_timeout_ms: cfg.timeoutMs,
    selected_case_count: selectedCases.length,
    history_sample_count: 0,
    timeout_cap_ms: cfg.timeoutAutoCapMs,
    final_timeout_ms: cfg.timeoutMs,
    clamped_by_cap: false,
  };
  if (cfg.timeoutProfile === "auto") {
    timeoutAutoResolution = await resolveTimeoutProfileAuto({
      cfg,
      selectedCaseIds: selectedCases.map((c) => c.id),
      inactivityExplicit,
      preflightExplicit,
      signal: interruptController.signal,
    });
  }

  const baselineDir = path.join(cfg.outDir, "baseline", cfg.runId);
  const newDir = path.join(cfg.outDir, "new", cfg.runId);
  const rawDir = path.join(cfg.outDir, "_raw");
  const baselineRawDir = path.join(rawDir, "baseline", cfg.runId);
  const newRawDir = path.join(rawDir, "new", cfg.runId);

  await ensureDir(baselineDir);
  await ensureDir(newDir);
  await assertRunDirectoriesAreFresh(baselineDir, newDir, cfg.runId);
  const useRaw = cfg.redactionPreset !== "none" && cfg.keepRaw;
  if (useRaw) {
    await ensureDir(baselineRawDir);
    await ensureDir(newRawDir);
  }

  // Scenario 3: capture git context (commit, branch, dirty) — fails silently if not a git repo
  const gitContext = await captureGitContext(repoRoot);

  const preflight = await runPreflight(cfg, interruptController.signal);
  const runMeta = {
    run_id: cfg.runId,
    incident_id: cfg.incidentId,
    ...(cfg.agentId ? { agent_id: cfg.agentId } : {}),
    base_url: cfg.baseUrl,
    cases_path: rel(cfg.casesPath),
    selected_case_ids: selectedCases.map((c) => c.id),
    started_at: Date.now(),
    versions: ["baseline", "new"] as const,
    redaction_applied: cfg.redactionPreset !== "none",
    redaction_preset: cfg.redactionPreset,
    redaction_keep_raw: useRaw,
    // Scenario 3: git context for prompt version tracing
    ...gitContext,
    runner: {
      timeout_ms: cfg.timeoutMs,
      timeout_profile: cfg.timeoutProfile,
      timeout_auto: timeoutAutoResolution,
      timeout_auto_min_success_samples: cfg.timeoutAutoMinSuccessSamples,
      timeout_auto_max_increase_factor: cfg.timeoutAutoMaxIncreaseFactor,
      retries: cfg.retries,
      backoff_base_ms: cfg.backoffBaseMs,
      concurrency: cfg.concurrency,
      inactivity_timeout_ms: cfg.inactivityTimeoutMs,
      heartbeat_interval_ms: cfg.heartbeatIntervalMs,
      preflight_mode: cfg.preflightMode,
      preflight_timeout_ms: cfg.preflightTimeoutMs,
      fail_fast_transport_streak: cfg.failFastTransportStreak,
      body_snippet_bytes: cfg.bodySnippetBytes,
      max_body_bytes: cfg.maxBodyBytes,
      save_full_body_on_error: cfg.saveFullBodyOnError,
      redaction_preset: cfg.redactionPreset,
      keep_raw: useRaw,
      retention_days: cfg.retentionDays,
      runs: cfg.runs,
    },
    preflight,
  };

  console.log("Runner started");
  await appendAuditLog({
    component: "runner",
    event: "start",
    run_id: cfg.runId,
    base_url: cfg.baseUrl,
    cases_path: rel(cfg.casesPath),
    out_dir: rel(cfg.outDir),
    selected_case_ids: selectedCases.map((c) => c.id),
    redaction_preset: cfg.redactionPreset,
    keep_raw: cfg.keepRaw,
    retention_days: cfg.retentionDays,
    timeout_profile: cfg.timeoutProfile,
    timeout_auto: timeoutAutoResolution,
    preflight_status: preflight.status,
    preflight_mode: cfg.preflightMode,
  });
  emitStructuredLog("runner", "info", "start", {
    run_id: cfg.runId,
    incident_id: cfg.incidentId,
    ...(cfg.agentId ? { agent_id: cfg.agentId } : {}),
    base_url: cfg.baseUrl,
    cases_path: rel(cfg.casesPath),
    selected_cases: selectedCases.length,
    out_dir: rel(cfg.outDir),
    timeout_ms: cfg.timeoutMs,
    timeout_profile: cfg.timeoutProfile,
    timeout_auto: timeoutAutoResolution,
    retries: cfg.retries,
    concurrency: cfg.concurrency,
    inactivity_timeout_ms: cfg.inactivityTimeoutMs,
    heartbeat_interval_ms: cfg.heartbeatIntervalMs,
    preflight_mode: cfg.preflightMode,
    preflight_timeout_ms: cfg.preflightTimeoutMs,
    fail_fast_transport_streak: cfg.failFastTransportStreak,
    runs: cfg.runs,
    redaction_preset: cfg.redactionPreset,
    preflight_status: preflight.status,
  });
  console.log("repoRoot:", fmtRel(cfg.repoRoot));
  console.log("baseUrl:", cfg.baseUrl);
  console.log("cases:", selectedCases.length);
  console.log("runId:", cfg.runId);
  console.log("incidentId:", cfg.incidentId);
  if (cfg.agentId) console.log("agentId:", cfg.agentId);
  console.log("outDir:", fmtRel(cfg.outDir));
  if (cfg.onlyCaseIds) console.log("only:", cfg.onlyCaseIds.join(", "));
  if (cfg.dryRun) console.log("dryRun:", true);
  console.log("timeoutMs:", cfg.timeoutMs);
  console.log("timeoutProfile:", cfg.timeoutProfile);
  if (cfg.timeoutProfile === "auto") {
    console.log("timeoutProfileAuto:", JSON.stringify(timeoutAutoResolution));
    if (timeoutAutoResolution.history_candidate_ignored_reason === "failure_only_history") {
      console.warn(
        "WARNING: auto timeout ignored failure-only history (no successful samples); using base timeout and server safety bounds."
      );
    }
    if (timeoutAutoResolution.history_candidate_ignored_reason === "insufficient_success_samples") {
      console.warn(
        `WARNING: auto timeout ignored history candidate due to insufficient successful samples ` +
        `(success=${timeoutAutoResolution.history_success_sample_count ?? 0}, required=${cfg.timeoutAutoMinSuccessSamples}).`
      );
    }
    if (timeoutAutoResolution.clamped_by_growth) {
      console.warn(
        `WARNING: auto timeout history candidate was capped by growth guard (factor=${cfg.timeoutAutoMaxIncreaseFactor}x, ` +
        `cap=${timeoutAutoResolution.history_candidate_growth_cap_ms}ms).`
      );
    }
    if (timeoutAutoResolution.clamped_by_cap) {
      console.warn(
        `WARNING: auto timeout recommendation was clamped by --timeoutAutoCapMs (${cfg.timeoutAutoCapMs}ms).`
      );
    }
    if (timeoutAutoResolution.clamped_by_server_timeout) {
      console.warn(
        `WARNING: auto timeout recommendation was constrained by adapter server request timeout ` +
        `(server=${timeoutAutoResolution.server_request_timeout_ms}ms, safety=${timeoutAutoResolution.server_timeout_safety_margin_ms}ms, final=${timeoutAutoResolution.final_timeout_ms}ms).`
      );
    }
    if (
      timeoutAutoResolution.history_sample_count === 0 &&
      timeoutAutoResolution.adapter_timeout_ms === undefined
    ) {
      console.warn(
        "WARNING: timeoutProfile=auto has no historical samples and no adapter timeout hint; falling back to --timeoutMs baseline."
      );
    }
    if (
      timeoutAutoResolution.server_request_timeout_ms === undefined &&
      timeoutAutoResolution.final_timeout_ms > 300_000
    ) {
      console.warn(
        "WARNING: timeoutProfile=auto did not receive server_request_timeout_ms from adapter /health while timeout is >300000ms; " +
        "long requests may be cut by upstream server timeout."
      );
    }
  }
  console.log("retries:", cfg.retries);
  console.log("concurrency:", cfg.concurrency);
  console.log("inactivityTimeoutMs:", cfg.inactivityTimeoutMs);
  console.log("heartbeatIntervalMs:", cfg.heartbeatIntervalMs);
  console.log("preflightMode:", cfg.preflightMode);
  console.log("preflightTimeoutMs:", cfg.preflightTimeoutMs);
  console.log("failFastTransportStreak:", cfg.failFastTransportStreak);
  if (preflight.status === "failed") {
    console.warn(`Preflight failed: ${preflight.warnings.join(" | ")}`);
  } else if (preflight.status === "passed") {
    console.log("preflight:", "passed");
  }
  const worstCaseRuntimeMs = estimateWorstCaseRuntimeMs(cfg, selectedCases.length);
  console.log("estimatedWorstCaseRuntime:", formatDuration(worstCaseRuntimeMs), "(upper bound)");
  if (worstCaseRuntimeMs >= 30 * 60 * 1000) {
    console.warn(
      `WARNING: long-run profile detected (~${formatDuration(worstCaseRuntimeMs)} upper bound). ` +
      "For local/slow agents, prefer lower retries and tune timeout intentionally."
    );
  }
  if (cfg.retries > 0 && cfg.timeoutMs >= 60_000) {
    console.warn(
      "WARNING: retries x timeout compounds quickly. " +
      "A single case executes baseline+new and can take a long time before finishing."
    );
  }
  if (cfg.inactivityTimeoutMs <= cfg.timeoutMs) {
    console.warn(
      "WARNING: inactivityTimeoutMs <= timeoutMs. Watchdog may fire before request timeout and mark case as transport timeout."
    );
  }
  console.log("maxBodyBytes:", cfg.maxBodyBytes);
  console.log("redactionPreset:", cfg.redactionPreset);
  console.log("keepRaw:", cfg.keepRaw);
  console.log("retentionDays:", cfg.retentionDays);
  if (cfg.keepRaw) {
    console.warn("WARNING: --keepRaw enabled. Raw responses will be stored under _raw/ and are NOT sanitized.");
  }
  if (preflight.status === "failed" && cfg.preflightMode === "strict") {
    const finished = {
      ...runMeta,
      ended_at: Date.now(),
      completed_cases: 0,
      interrupted: false,
      preflight_blocked: true,
    };
    await writeJsonAtomic(path.join(baselineDir, "run.json"), finished);
    await writeJsonAtomic(path.join(newDir, "run.json"), finished);
    throw new Error(`Runner preflight failed in strict mode: ${preflight.warnings.join(" | ")}`);
  }

  if (cfg.dryRun) {
    for (const c of selectedCases) console.log("Case:", c.id);
    const finished = { ...runMeta, ended_at: Date.now() };
    await writeJsonAtomic(path.join(baselineDir, "run.json"), finished);
    await writeJsonAtomic(path.join(newDir, "run.json"), finished);
    console.log("Runner finished");
    console.log("baseline:", fmtRel(baselineDir));
    console.log("new:", fmtRel(newDir));
    await appendAuditLog({
      component: "runner",
      event: "finish",
      run_id: cfg.runId,
      baseline_dir: rel(baselineDir),
      new_dir: rel(newDir),
      cases_count: selectedCases.length,
      dry_run: true,
    });
    emitStructuredLog("runner", "info", "finish", {
      run_id: cfg.runId,
      baseline_dir: rel(baselineDir),
      new_dir: rel(newDir),
      cases_count: selectedCases.length,
      dry_run: true,
    });
    if (cfg.retentionDays > 0) {
      await cleanupOldRuns(cfg.outDir, cfg.retentionDays, "runner");
    }
    return;
  }

  // Scenario 2: Flakiness tracking — accumulate per-case results across --runs N executions
  type FlakinessEntry = {
    case_id: string;
    runs: number;
    baseline_pass_count: number;
    new_pass_count: number;
    baseline_pass_rate: number;
    new_pass_rate: number;
    baseline_token_usage?: TokenUsage;
    new_token_usage?: TokenUsage;
  };
  const flakinessEntries: FlakinessEntry[] = [];
  let completedCases = 0;
  let interruptedError: InterruptedRunError | null = null;
  let consecutiveTransportFailureStreak = 0;
  let maxTransportFailureStreak = 0;
  let stopDueToFailFast = false;
  let failFastTriggered:
    | {
      at_case_id: string;
      threshold: number;
      streak: number;
      triggered_at: number;
    }
    | null = null;
  try {
    await runWithConcurrency(
      selectedCases,
      cfg.concurrency,
      async (c) => {
        console.log("Case:", c.id);
        const caseStartedAt = Date.now();
        emitStructuredLog("runner", "info", "case_start", {
          run_id: cfg.runId,
          case_id: c.id,
          runs: cfg.runs,
        });

        const baselineTokenUsages: (TokenUsage | undefined)[] = [];
        const newTokenUsages: (TokenUsage | undefined)[] = [];
        let baselinePassCount = 0;
        let newPassCount = 0;
        const watchdog = createCaseWatchdog({
          runId: cfg.runId,
          caseId: c.id,
          inactivityTimeoutMs: cfg.inactivityTimeoutMs,
          heartbeatIntervalMs: cfg.heartbeatIntervalMs,
        });
        watchdog.heartbeat("case_start", { runs: cfg.runs });
        try {
          for (let run = 1; run <= cfg.runs; run++) {
            if (interruptController.signal.aborted) {
              throw new InterruptedRunError("Runner", getInterruptSignalName());
            }
            const suffix = cfg.runs > 1 ? `.run${run}` : "";

            const runOneVersion = async (version: Version): Promise<unknown> => {
              if (watchdog.isTimedOut()) {
                return mkWatchdogFailureResponse(cfg, c, version, 1, watchdog.snapshot());
              }
              watchdog.heartbeat(`${version}_request_start`, { run });
              const linked = linkAbortSignals([interruptController.signal, watchdog.signal]);
              try {
                const resp = await runOneCaseWithReliability(
                  cfg,
                  c,
                  version,
                  linked.signal,
                  getInterruptSignalName
                );
                watchdog.heartbeat(`${version}_request_finish`, { run });
                return resp;
              } catch (err) {
                if (
                  err instanceof InterruptedRunError &&
                  watchdog.isTimedOut() &&
                  !interruptController.signal.aborted
                ) {
                  return mkWatchdogFailureResponse(cfg, c, version, 1, watchdog.snapshot());
                }
                throw err;
              } finally {
                linked.dispose();
              }
            };

            const baselineResp = await runOneVersion("baseline");
            enrichResponseWithLoopAnalysis(baselineResp);
            const baselineSanitized = sanitizeValue(baselineResp, cfg.redactionPreset);
            const baselineFilename = `${c.id}${suffix}.json`;
            await writeJsonAtomic(path.join(baselineDir, baselineFilename), baselineSanitized);
            if (useRaw) {
              await writeJsonAtomic(path.join(baselineRawDir, baselineFilename), baselineResp);
            }
            const bResp = baselineResp as { token_usage?: TokenUsage; runner_failure?: unknown };
            baselineTokenUsages.push(bResp.token_usage);
            if (!bResp.runner_failure) baselinePassCount++;

            const newResp = await runOneVersion("new");
            enrichResponseWithLoopAnalysis(newResp);
            const newSanitized = sanitizeValue(newResp, cfg.redactionPreset);
            const newFilename = `${c.id}${suffix}.json`;
            await writeJsonAtomic(path.join(newDir, newFilename), newSanitized);
            if (useRaw) {
              await writeJsonAtomic(path.join(newRawDir, newFilename), newResp);
            }
            const nResp = newResp as { token_usage?: TokenUsage; runner_failure?: unknown };
            newTokenUsages.push(nResp.token_usage);
            if (!nResp.runner_failure) newPassCount++;
          }
        } finally {
          watchdog.stop();
        }

        if (cfg.runs > 1) {
          const entry: FlakinessEntry = {
            case_id: c.id,
            runs: cfg.runs,
            baseline_pass_count: baselinePassCount,
            new_pass_count: newPassCount,
            baseline_pass_rate: baselinePassCount / cfg.runs,
            new_pass_rate: newPassCount / cfg.runs,
          };
          const aggBaseline = aggregateTokenUsage(baselineTokenUsages);
          const aggNew = aggregateTokenUsage(newTokenUsages);
          if (aggBaseline) entry.baseline_token_usage = aggBaseline;
          if (aggNew) entry.new_token_usage = aggNew;
          flakinessEntries.push(entry);
        }

        const caseTransportFailed = baselinePassCount === 0 && newPassCount === 0;
        if (caseTransportFailed) {
          consecutiveTransportFailureStreak += 1;
          maxTransportFailureStreak = Math.max(maxTransportFailureStreak, consecutiveTransportFailureStreak);
        } else {
          consecutiveTransportFailureStreak = 0;
        }

        if (
          cfg.failFastTransportStreak > 0 &&
          caseTransportFailed &&
          consecutiveTransportFailureStreak >= cfg.failFastTransportStreak &&
          !failFastTriggered
        ) {
          failFastTriggered = {
            at_case_id: c.id,
            threshold: cfg.failFastTransportStreak,
            streak: consecutiveTransportFailureStreak,
            triggered_at: Date.now(),
          };
          stopDueToFailFast = true;
          console.warn(
            `Fail-fast triggered after ${consecutiveTransportFailureStreak} consecutive transport-failed cases (threshold=${cfg.failFastTransportStreak}) at case=${c.id}`
          );
          emitStructuredLog("runner", "warn", "fail_fast_transport_streak", {
            run_id: cfg.runId,
            case_id: c.id,
            threshold: cfg.failFastTransportStreak,
            streak: consecutiveTransportFailureStreak,
          });
        }

        const caseWatchdogSnapshot = watchdog.snapshot();
        if (caseWatchdogSnapshot.timed_out) {
          console.warn(
            `Case ${c.id}: inactivity watchdog triggered (idle=${caseWatchdogSnapshot.idle_ms}ms, threshold=${caseWatchdogSnapshot.timeout_ms}ms, stage=${caseWatchdogSnapshot.stage})`
          );
        }
        emitStructuredLog("runner", "info", "case_finish", {
          run_id: cfg.runId,
          case_id: c.id,
          duration_ms: Date.now() - caseStartedAt,
          baseline_pass_count: baselinePassCount,
          new_pass_count: newPassCount,
          runs: cfg.runs,
          watchdog_timed_out: caseWatchdogSnapshot.timed_out,
          watchdog_stage: caseWatchdogSnapshot.stage,
          watchdog_idle_ms: caseWatchdogSnapshot.idle_ms,
          transport_failed_case: caseTransportFailed,
          consecutive_transport_failure_streak: consecutiveTransportFailureStreak,
        });
        completedCases += 1;
        return true;
      },
      () => interruptController.signal.aborted
        || stopDueToFailFast
    );
  } catch (err) {
    if (err instanceof InterruptedRunError) {
      interruptedError = err;
    } else {
      throw err;
    }
  }

  // Write flakiness summary when --runs > 1
  if (cfg.runs > 1 && flakinessEntries.length > 0) {
    const flakinessSummary = {
      run_id: cfg.runId,
      runs_per_case: cfg.runs,
      ...gitContext,
      cases: flakinessEntries,
    };
    await writeJsonAtomic(path.join(baselineDir, "flakiness.json"), flakinessSummary);
    await writeJsonAtomic(path.join(newDir, "flakiness.json"), flakinessSummary);
    console.log("Flakiness summary written: flakiness.json");
    const flaky = flakinessEntries.filter((e) => e.new_pass_rate < 0.8);
    if (flaky.length > 0) {
      console.warn(`WARNING: ${flaky.length} case(s) have new_pass_rate < 0.80 (potential flakiness):`);
      for (const f of flaky) console.warn(`  ${f.case_id}: pass_rate=${f.new_pass_rate.toFixed(2)} (${f.new_pass_count}/${f.runs})`);
    }
  }

  const interruption = interruptedBy as { signal: "SIGINT" | "SIGTERM"; at: number } | null;
  const finished = {
    ...runMeta,
    ended_at: Date.now(),
    completed_cases: completedCases,
    interrupted: Boolean(interruption),
    fail_fast: {
      enabled_threshold: cfg.failFastTransportStreak,
      triggered: Boolean(failFastTriggered),
      max_transport_failure_streak: maxTransportFailureStreak,
      ...(failFastTriggered ?? {}),
    },
    ...(interruption
      ? {
        interrupt_signal: interruption.signal,
        interrupted_at: interruption.at,
      }
      : {}),
  };
  await writeJsonAtomic(path.join(baselineDir, "run.json"), finished);
  await writeJsonAtomic(path.join(newDir, "run.json"), finished);

  console.log("Runner finished");
  console.log("baseline:", fmtRel(baselineDir));
  console.log("new:", fmtRel(newDir));
  if (interruption) {
    await appendAuditLog({
      component: "runner",
      event: "finish_interrupted",
      run_id: cfg.runId,
      baseline_dir: rel(baselineDir),
      new_dir: rel(newDir),
      cases_count: selectedCases.length,
      completed_cases: completedCases,
      signal: interruption.signal,
      interrupted_at: interruption.at,
      dry_run: false,
      fail_fast_triggered: Boolean(failFastTriggered),
    });
    emitStructuredLog("runner", "warn", "finish_interrupted", {
      run_id: cfg.runId,
      signal: interruption.signal,
      completed_cases: completedCases,
      cases_count: selectedCases.length,
      fail_fast_triggered: Boolean(failFastTriggered),
    });
  } else {
    await appendAuditLog({
      component: "runner",
      event: "finish",
      run_id: cfg.runId,
      baseline_dir: rel(baselineDir),
      new_dir: rel(newDir),
      cases_count: selectedCases.length,
      completed_cases: completedCases,
      dry_run: false,
      fail_fast_triggered: Boolean(failFastTriggered),
    });
    emitStructuredLog("runner", "info", "finish", {
      run_id: cfg.runId,
      completed_cases: completedCases,
      cases_count: selectedCases.length,
      baseline_dir: rel(baselineDir),
      new_dir: rel(newDir),
      dry_run: false,
      fail_fast_triggered: Boolean(failFastTriggered),
    });
  }
  if (cfg.retentionDays > 0) {
    await cleanupOldRuns(cfg.outDir, cfg.retentionDays, "runner");
  }
  if (interruptedError) {
    throw interruptedError;
  }
  } finally {
    process.removeListener("SIGINT", onSigInt);
    process.removeListener("SIGTERM", onSigTerm);
  }
}

async function cleanupOldRuns(baseDir: string, retentionDays: number, component: "runner" | "evaluator"): Promise<void> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const sub of ["baseline", "new", "_raw"]) {
    const dir = path.join(baseDir, sub);
    let names: string[] = [];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const p = path.join(dir, name);
      try {
        const st = await stat(p);
        if (st.isDirectory() && st.mtimeMs < cutoff) {
          await rm(p, { recursive: true, force: true });
          await appendAuditLog({ component, event: "retention_delete", path: p });
        }
      } catch {
        // ignore
      }
    }
  }
}

async function assertRunDirectoriesAreFresh(
  baselineDir: string,
  newDir: string,
  runId: string
): Promise<void> {
  const checkDir = async (dir: string): Promise<string[]> => {
    let names: string[] = [];
    try {
      names = await readdir(dir);
    } catch {
      return [];
    }
    return names.filter((name) => name.endsWith(".json"));
  };

  const baselineJson = await checkDir(baselineDir);
  const newJson = await checkDir(newDir);
  if (baselineJson.length === 0 && newJson.length === 0) return;

  const details = [
    baselineJson.length > 0 ? `baseline=${baselineJson.length}` : "",
    newJson.length > 0 ? `new=${newJson.length}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  throw new CliUsageError(
    `Run output directories already contain JSON artifacts for runId=${runId} (${details}). ` +
      `Use a new --runId to avoid mixing artifacts from different executions.`
  );
}
