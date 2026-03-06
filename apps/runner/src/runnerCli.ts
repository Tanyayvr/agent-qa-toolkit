import path from "node:path";
import type { HandoffEnvelope, ReplRuntimePolicy, RunMeta, RuntimePolicy, PlanningGatePolicy } from "shared-types";
import {
  CliUsageError,
  normalizeRunMeta,
  validateAndNormalizeHandoffEnvelope,
} from "cli-utils";
import { parseOnlyCaseIdsRaw } from "./runnerCore";
import type { CaseFileItem } from "./runnerTypes";

export const RUNNER_HELP_TEXT = `
Usage:
  runner [--repoRoot <path>] [--baseUrl <url>] [--cases <path>] [--outDir <dir>] [--runId <id>] [--incidentId <id>] [--agentId <id>] [--only <ids>] [--dryRun]
         [--timeoutMs <ms>] [--retries <n>] [--backoffBaseMs <ms>] [--concurrency <n>]
         [--timeoutProfile <off|auto>] [--timeoutAutoCapMs <ms>] [--timeoutAutoLookbackRuns <n>]
         [--inactivityTimeoutMs <ms>] [--heartbeatIntervalMs <ms>]
         [--preflightMode <off|warn|strict>] [--preflightTimeoutMs <ms>]
         [--failFastTransportStreak <n>]
         [--bodySnippetBytes <n>] [--maxBodyBytes <n>] [--noSaveFullBodyOnError]
         [--runs <n>]

Options:
  --repoRoot                Repo root (default: INIT_CWD or cwd)
  --baseUrl                 Agent base URL (default: http://localhost:8787)
  --cases                   Path to cases JSON (default: cases/cases.json)
  --outDir                  Output directory (default: apps/runner/runs)
  --runId                   Run id (default: random UUID)
  --incidentId              Incident/group id propagated via run_meta.incident_id (default: runId)
  --agentId                 Agent id propagated via run_meta.agent_id (optional)
  --only                    Comma-separated case ids (e.g. tool_001,fmt_002)
  --dryRun                  Do not call the agent, only print selected cases

Reliability (benchmark mode; defaults are conservative):
  --timeoutMs               Per-request timeout in ms (default: 15000)
  --timeoutProfile          Timeout strategy: off | auto (default: off)
  --timeoutAutoCapMs        Max timeout when --timeoutProfile=auto (default: 3600000)
  --timeoutAutoLookbackRuns Number of previous run dirs to sample in auto profile (default: 12)
  --retries                 Retries per request (default: 2)
  --backoffBaseMs           Base backoff in ms (default: 250)
  --concurrency             Max concurrent cases (default: 1)
  --inactivityTimeoutMs     Case-level inactivity watchdog in ms
                            (default: auto = max(timeoutMs + 30000, 120000))
  --heartbeatIntervalMs     Heartbeat log interval in ms while case is in-flight (default: 30000)
  --preflightMode           Adapter preflight behavior: off | warn | strict (default: off)
  --preflightTimeoutMs      Timeout per preflight request in ms (default: min(timeoutMs, 10000))
  --failFastTransportStreak Stop early after N consecutive transport-failed cases (default: 0 = disabled)

Flakiness / multi-run analysis (Scenario 2):
  --runs                    Run each case N times and compute pass_rate per case (default: 1)
                            When N > 1, each run result is written as <case_id>.run<k>.json;
                            a flakiness summary is written to flakiness.json in the run dir.

Artifacts / memory limits:
  --bodySnippetBytes        Error body snippet size in bytes (default: 4000)
  --maxBodyBytes            Max bytes to write/read for a response body (default: 2000000)
  --noSaveFullBodyOnError   Do not write full error bodies to disk (default: save enabled)
  --redactionPreset         none | internal_only | transferable | transferable_extended (default: none)
  --keepRaw                 Keep raw (unsanitized) responses in _raw/ when redaction is enabled
  --retentionDays           Delete run directories older than N days (default: 0 = disabled)

  --help, -h                Show this help

Exit codes:
  0  success
  1  runtime error
  2  bad arguments / usage

Examples:
  ts-node src/index.ts --cases cases/cases.json --outDir apps/runner/runs --runId latest --only tool_001,fmt_002
  ts-node src/index.ts --baseUrl http://localhost:8787 --cases cases/cases.json --runId latest
`.trim();

export function parseOnlyCaseIds(rawOnlyArg: string | null): string[] | null {
  return parseOnlyCaseIdsRaw(rawOnlyArg);
}

export function normalizeOptionalId(raw: string | null, flagName: string): string | undefined {
  if (raw === null) return undefined;
  const v = raw.trim();
  if (!v) {
    throw new CliUsageError(`Invalid ${flagName}: expected non-empty string.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (/[\r\n]/.test(v)) {
    throw new CliUsageError(`Invalid ${flagName}: must be single-line.\n\n${RUNNER_HELP_TEXT}`);
  }
  if (v.length > 256) {
    throw new CliUsageError(`Invalid ${flagName}: too long (max 256).\n\n${RUNNER_HELP_TEXT}`);
  }
  return v;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function extractCaseRunMeta(metadata: unknown): RunMeta | undefined {
  if (!isRecord(metadata)) return undefined;
  const candidate = metadata.run_meta ?? metadata.runMeta;
  const normalized = normalizeRunMeta(candidate);
  if (!normalized) return undefined;
  return normalized;
}

export function extractCaseHandoff(caseId: string, metadata: unknown): HandoffEnvelope | undefined {
  if (!isRecord(metadata)) return undefined;
  const candidate = metadata.handoff;
  if (candidate === undefined) return undefined;
  try {
    return validateAndNormalizeHandoffEnvelope(candidate);
  } catch (err) {
    throw new CliUsageError(
      `Invalid handoff in case "${caseId}": ${err instanceof Error ? err.message : String(err)}.\n\n${RUNNER_HELP_TEXT}`
    );
  }
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
  if (out.length === 0) return undefined;
  return Array.from(new Set(out));
}

function normalizePlanningGatePolicy(candidate: unknown): PlanningGatePolicy | undefined {
  if (!isRecord(candidate)) return undefined;
  const policy: PlanningGatePolicy = {};

  if (candidate.required_for_mutations !== undefined) {
    policy.required_for_mutations = Boolean(candidate.required_for_mutations);
  }
  if (candidate.require_declared_end_state !== undefined) {
    policy.require_declared_end_state = Boolean(candidate.require_declared_end_state);
  }

  const mutationTools = normalizeStringArray(candidate.mutation_tools);
  if (mutationTools) policy.mutation_tools = mutationTools;

  const highRiskTools = normalizeStringArray(candidate.high_risk_tools);
  if (highRiskTools) policy.high_risk_tools = highRiskTools;

  if (
    policy.required_for_mutations === undefined &&
    policy.require_declared_end_state === undefined &&
    !policy.mutation_tools &&
    !policy.high_risk_tools
  ) {
    return undefined;
  }
  return policy;
}

function normalizeReplRuntimePolicy(candidate: unknown): ReplRuntimePolicy | undefined {
  if (!isRecord(candidate)) return undefined;
  const policy: ReplRuntimePolicy = {};

  const allowlist = normalizeStringArray(candidate.tool_allowlist);
  if (allowlist) policy.tool_allowlist = allowlist;

  const denied = normalizeStringArray(candidate.denied_command_patterns);
  if (denied) policy.denied_command_patterns = denied;

  if (candidate.max_command_length !== undefined) {
    const num = Number(candidate.max_command_length);
    if (!Number.isFinite(num) || num < 1) {
      throw new Error("repl_policy.max_command_length must be a positive number");
    }
    policy.max_command_length = Math.floor(num);
  }

  if (!policy.tool_allowlist && !policy.denied_command_patterns && policy.max_command_length === undefined) {
    return undefined;
  }
  return policy;
}

export function extractCasePolicy(caseId: string, metadata: unknown): RuntimePolicy | undefined {
  if (!isRecord(metadata)) return undefined;
  const candidate = metadata.policy ?? metadata.runtime_policy;
  if (!isRecord(candidate)) return undefined;

  try {
    const planning = normalizePlanningGatePolicy(candidate.planning_gate);
    const repl = normalizeReplRuntimePolicy(candidate.repl_policy);
    if (!planning && !repl) return undefined;
    return {
      ...(planning ? { planning_gate: planning } : {}),
      ...(repl ? { repl_policy: repl } : {}),
    };
  } catch (err) {
    throw new CliUsageError(
      `Invalid policy in case "${caseId}": ${err instanceof Error ? err.message : String(err)}.\n\n${RUNNER_HELP_TEXT}`
    );
  }
}

export function resolveFromRoot(repoRoot: string, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(repoRoot, p);
}

export function parsePreflightMode(raw: string | null): "off" | "warn" | "strict" {
  const mode = (raw ?? "off").trim().toLowerCase();
  if (mode === "off" || mode === "warn" || mode === "strict") return mode;
  throw new CliUsageError(`Invalid --preflightMode value: ${raw}. Must be "off", "warn", or "strict".\n\n${RUNNER_HELP_TEXT}`);
}

export function parseTimeoutProfile(raw: string | null): "off" | "auto" {
  const mode = (raw ?? "off").trim().toLowerCase();
  if (mode === "off" || mode === "auto") return mode;
  throw new CliUsageError(`Invalid --timeoutProfile value: ${raw}. Must be "off" or "auto".\n\n${RUNNER_HELP_TEXT}`);
}

export function parseCasesJson(raw: string): CaseFileItem[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("cases.json must be an array");

  return parsed.map((x) => {
    if (!isRecord(x)) throw new Error("cases.json element must be an object");

    if (!("id" in x)) throw new Error("cases.json element missing id");
    const id = String(x.id ?? "").trim();
    if (!id) throw new Error("cases.json element has empty id");
    const title = String(x.title ?? "");
    const inputObj = isRecord(x.input) ? x.input : {};
    const user = String(inputObj.user ?? "");
    const context = inputObj.context;

    return { id, title, input: { user, context }, expected: x.expected, metadata: x.metadata };
  });
}
