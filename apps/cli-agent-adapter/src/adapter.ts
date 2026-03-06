import express, { type Express, type Request, type Response } from "express";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, constants as fsConstants, readFileSync } from "node:fs";
import { appendFile, mkdir, rename, writeFile } from "node:fs/promises";
import { stableStringify, normalizeRunMeta, validateAndNormalizeHandoffEnvelope } from "cli-utils";
import { dirname, isAbsolute, resolve } from "node:path";
import type {
  HandoffEnvelope,
  HandoffReceipt,
  ProposedAction,
  RunEvent,
  RunMeta,
  RuntimePolicy,
  RuntimePolicyViolation,
} from "shared-types";
import { resolveServerTimeoutConfig } from "./serverConfig";

type CliFailureReason = "timeout" | "spawn_error" | "non_zero_exit" | "aborted" | "invalid_config" | "busy" | "policy_violation";

type CliRunSuccess = {
  stdout: string;
  stderr: string;
  code: number;
  signal: NodeJS.Signals | null;
};

type CliErrorPayload = {
  code: CliFailureReason;
  message: string;
  exit_code?: number | null;
  exit_signal?: NodeJS.Signals | null;
  stderr_snippet?: string;
  retry_after_ms?: number;
};

type StoredHandoff = {
  envelope: HandoffEnvelope;
  accepted_at: number;
};

type HandoffUpsertResult = {
  status: "accepted" | "duplicate";
  receipt: HandoffReceipt;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_CAP_MS = 120_000;
const DEFAULT_KILL_GRACE_MS = 1_000;
const DEFAULT_STDERR_SNIPPET_CHARS = 1_200;
const DEFAULT_MAX_CONCURRENCY = 1;
const DEFAULT_BUSY_RETRY_AFTER_MS = 1_000;
const DEFAULT_HANDOFF_CONTEXT_MAX_CHARS = 8_000;
const DEFAULT_HANDOFF_MAX_ITEMS = 20;
const DEFAULT_HANDOFF_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const DEFAULT_HANDOFF_MAX_ITEMS_TOTAL = 2_000;
const DEFAULT_AUTH_HEADER = "authorization";
const DEFAULT_EXEC_TOOL_NAME = "cli_agent_exec";
const DEFAULT_INFERRED_TOOL_CALLS_MAX = 32;
const DEFAULT_POLICY_AUDIT_LOG = ".agent-qa/policy-violations.ndjson";
const DEFAULT_MUTATION_TOOLS = ["write_file", "delete_file", "move_file", "run_shell", "exec", "commit_changes", "deploy"];
const DEFAULT_REPL_TOOLS = ["run_shell", "bash", "terminal", "exec", "python_repl"];

type AdapterAuthConfig = {
  enabled: boolean;
  token: string | null;
  header: string;
};

type HandoffPersistenceConfig = {
  mode: "memory" | "file";
  filePath: string | null;
  ttlMs: number;
  maxItemsTotal: number;
};

export class CliAgentError extends Error {
  readonly reason: CliFailureReason;
  readonly exitCode?: number | null;
  readonly exitSignal?: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(params: {
    reason: CliFailureReason;
    message: string;
    exitCode?: number | null;
    exitSignal?: NodeJS.Signals | null;
    stdout?: string;
    stderr?: string;
  }) {
    super(params.message);
    this.name = "CliAgentError";
    this.reason = params.reason;
    if (params.exitCode !== undefined) this.exitCode = params.exitCode;
    if (params.exitSignal !== undefined) this.exitSignal = params.exitSignal;
    this.stdout = params.stdout ?? "";
    this.stderr = params.stderr ?? "";
  }
}

export function parseArgs(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ignore malformed JSON and fallback to shell-like splitting
  }
  return raw.split(" ").map((s) => s.trim()).filter(Boolean);
}

function boolEnv(env: NodeJS.ProcessEnv, name: string, def = false): boolean {
  const v = env[name];
  if (v === undefined) return def;
  return v === "1" || v.toLowerCase() === "true";
}

function intEnv(env: NodeJS.ProcessEnv, name: string, def: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim().length === 0) return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new CliAgentError({
      reason: "invalid_config",
      message: `Invalid env ${name}: ${raw}. Must be a positive number.`,
    });
  }
  return Math.floor(n);
}

function resolveAuthConfig(env: NodeJS.ProcessEnv): AdapterAuthConfig {
  const tokenRaw = env.CLI_AGENT_AUTH_TOKEN;
  const token = tokenRaw && tokenRaw.trim().length > 0 ? tokenRaw.trim() : null;
  const headerRaw = env.CLI_AGENT_AUTH_HEADER?.trim().toLowerCase();
  const header = headerRaw && headerRaw.length > 0 ? headerRaw : DEFAULT_AUTH_HEADER;
  return {
    enabled: token !== null,
    token,
    header,
  };
}

function extractAuthValue(req: Request, header: string): string | null {
  const raw = req.header(header);
  if (!raw || raw.trim().length === 0) return null;
  const value = raw.trim();
  if (header === "authorization") {
    const m = /^bearer\s+(.+)$/i.exec(value);
    if (m && m[1]) return m[1].trim();
  }
  return value;
}

function isAuthorized(req: Request, auth: AdapterAuthConfig): boolean {
  if (!auth.enabled || !auth.token) return true;
  const value = extractAuthValue(req, auth.header);
  return value === auth.token;
}

function resolveHandoffPersistenceConfig(env: NodeJS.ProcessEnv): HandoffPersistenceConfig {
  const configuredPath = env.CLI_AGENT_HANDOFF_STORE_PATH?.trim();
  const ttlMs = intEnv(env, "CLI_AGENT_HANDOFF_TTL_MS", DEFAULT_HANDOFF_TTL_MS);
  const maxItemsTotal = intEnv(env, "CLI_AGENT_HANDOFF_MAX_ITEMS_TOTAL", DEFAULT_HANDOFF_MAX_ITEMS_TOTAL);
  if (!configuredPath) {
    return {
      mode: "memory",
      filePath: null,
      ttlMs,
      maxItemsTotal,
    };
  }
  return {
    mode: "file",
    filePath: configuredPath,
    ttlMs,
    maxItemsTotal,
  };
}

type TimeoutResolution = {
  requestedMs: number;
  capMs: number;
  effectiveMs: number;
  clamped: boolean;
};

function resolveTimeoutMs(env: NodeJS.ProcessEnv): TimeoutResolution {
  const requestedMs = intEnv(env, "CLI_AGENT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const capMs = intEnv(env, "CLI_AGENT_TIMEOUT_CAP_MS", DEFAULT_TIMEOUT_CAP_MS);
  const effectiveMs = Math.min(requestedMs, capMs);
  return {
    requestedMs,
    capMs,
    effectiveMs,
    clamped: requestedMs > capMs,
  };
}

function getRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v || v.trim().length === 0) {
    throw new CliAgentError({
      reason: "invalid_config",
      message: `Missing required env: ${name}`,
    });
  }
  return v;
}

export function normalizeStderrSnippet(stderr: string, maxChars = DEFAULT_STDERR_SNIPPET_CHARS): string {
  const noAnsi = stderr.replace(/\u001b\[[0-9;]*m/g, "");
  const singleLine = noAnsi.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxChars) return singleLine;
  return `${singleLine.slice(0, maxChars)}...`;
}

export function buildPrompt(input: { user?: string; context?: unknown } | undefined): string {
  const user = input?.user ?? "";
  const ctx = input?.context;
  if (ctx === undefined) return user;
  return `${user}\n\nContext:\n${JSON.stringify(ctx, null, 2)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseObjectJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    const trimmed = value.trim();
    if (trimmed.length === 0) return {};
    return { raw: trimmed };
  }
}

function normalizeToolName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("__")) {
    const parts = trimmed.split("__");
    const last = parts[parts.length - 1];
    if (last && last.trim().length > 0) return last.trim();
  }
  return trimmed;
}

type InferredToolCall = {
  tool: string;
  args: Record<string, unknown>;
  sourceLineNo: number;
  sourceLineHash: string;
};

function hashLine(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function extractInferredToolCalls(output: string, maxCalls = DEFAULT_INFERRED_TOOL_CALLS_MAX): InferredToolCall[] {
  if (!output || output.trim().length === 0) return [];
  const out: InferredToolCall[] = [];
  const lines = output.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const rawLine = lines[idx] ?? "";
    if (out.length >= maxCalls) break;
    const line = rawLine.trim();
    if (line.length === 0) continue;

    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const parsed = JSON.parse(line);
        const obj = asRecord(parsed);
        const rawName = typeof obj?.name === "string" ? obj.name : null;
        if (rawName && rawName.trim().length > 0) {
          out.push({
            tool: normalizeToolName(rawName),
            args: parseObjectJson(obj?.arguments),
            sourceLineNo: idx + 1,
            sourceLineHash: hashLine(rawLine),
          });
          continue;
        }
      } catch {
        // best-effort extraction; ignore malformed line
      }
    }

    const bulletMatch = /^▸\s+([^\s]+)(?:\s+(.+))?$/u.exec(line);
    if (bulletMatch && bulletMatch[1]) {
      out.push({
        tool: normalizeToolName(bulletMatch[1]),
        args: bulletMatch[2] ? { raw: bulletMatch[2].trim() } : {},
        sourceLineNo: idx + 1,
        sourceLineHash: hashLine(rawLine),
      });
    }
  }
  return out;
}

type ExecutionTelemetryParams = {
  caseId: string;
  prompt: string;
  finalOutputContent: unknown;
  outputContentType: "text" | "json";
  startedAtMs: number;
  finishedAtMs: number;
  status: "ok" | "error" | "timeout";
  execToolName: string;
  cmd: string;
  args: string[];
  useStdin: boolean;
  cwd?: string;
  statusMessage?: string;
};

function buildExecutionTelemetry(params: ExecutionTelemetryParams): {
  events: RunEvent[];
  proposedActions: ProposedAction[];
  telemetryMode: "wrapper_only" | "inferred";
} {
  const baseTs = Number.isFinite(params.startedAtMs) ? Math.max(0, Math.floor(params.startedAtMs)) : Date.now();
  const endTs = Number.isFinite(params.finishedAtMs) ? Math.max(baseTs, Math.floor(params.finishedAtMs)) : baseTs;
  const latencyMs = Math.max(0, endTs - baseTs);
  const caseKey = params.caseId && params.caseId.trim().length > 0 ? params.caseId.trim() : "case";
  const execCallId = `cli_exec_${caseKey}_${baseTs}`;

  const events: RunEvent[] = [];
  const proposedActions: ProposedAction[] = [];

  const execArgs: Record<string, unknown> = {
    _telemetry_source: "wrapper",
    prompt_chars: params.prompt.length,
    prompt_hash_hint: params.prompt.slice(0, 32),
    cmd: params.cmd,
    argv: params.args,
    use_stdin: params.useStdin,
    ...(params.cwd ? { cwd: params.cwd } : {}),
  };

  events.push({
    type: "tool_call",
    ts: baseTs,
    call_id: execCallId,
    action_id: execCallId,
    tool: params.execToolName,
    args: execArgs,
  });
  events.push({
    type: "tool_result",
    ts: endTs,
    call_id: execCallId,
    action_id: execCallId,
    status: params.status,
    latency_ms: latencyMs,
    payload_summary: {
      ...(params.statusMessage ? { message: params.statusMessage } : {}),
      output_preview: String(params.finalOutputContent ?? "").slice(0, 240),
    },
  });
  proposedActions.push({
    action_id: execCallId,
    action_type: "tool_call",
    tool_name: params.execToolName,
    params: execArgs,
    risk_level: "low",
    evidence_refs: [{ kind: "tool_result", call_id: execCallId }],
  });

  const inferred = extractInferredToolCalls(String(params.finalOutputContent ?? ""));
  const inferredStatus: "ok" | "error" | "timeout" = params.status === "ok" ? "ok" : "error";
  for (let idx = 0; idx < inferred.length; idx += 1) {
    const ts = Math.min(endTs, baseTs + idx + 1);
    const callId = `${execCallId}_tool_${idx + 1}`;
    const item = inferred[idx];
    if (!item) continue;
    events.push({
      type: "tool_call",
      ts,
      call_id: callId,
      action_id: callId,
      tool: item.tool,
      args: {
        _telemetry_source: "inferred",
        _inferred_source_line_no: item.sourceLineNo,
        _inferred_source_line_hash: item.sourceLineHash,
        ...item.args,
      },
    });
    events.push({
      type: "tool_result",
      ts: Math.min(endTs, ts + 1),
      call_id: callId,
      action_id: callId,
      status: inferredStatus,
      payload_summary: {
        inferred_from_output: true,
      },
    });
    proposedActions.push({
      action_id: callId,
      action_type: "tool_call",
      tool_name: item.tool,
      params: item.args,
      risk_level: "low",
      evidence_refs: [{ kind: "tool_result", call_id: callId }],
    });
  }

  events.push({
    type: "final_output",
    ts: Math.max(endTs, baseTs + inferred.length + 1),
    content_type: params.outputContentType,
    content: params.finalOutputContent,
  });

  const telemetryMode: "wrapper_only" | "inferred" = inferred.length > 0 ? "inferred" : "wrapper_only";
  return { events, proposedActions, telemetryMode };
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
}

function normalizeRuntimePolicy(raw: unknown): RuntimePolicy | undefined {
  const obj = asRecord(raw);
  if (!obj) return undefined;
  const out: RuntimePolicy = {};

  const planningRaw = asRecord(obj.planning_gate);
  if (planningRaw) {
    const mutationTools = asStringList(planningRaw.mutation_tools);
    const highRiskTools = asStringList(planningRaw.high_risk_tools);
    out.planning_gate = {
      ...(planningRaw.required_for_mutations !== undefined
        ? { required_for_mutations: Boolean(planningRaw.required_for_mutations) }
        : {}),
      ...(planningRaw.require_declared_end_state !== undefined
        ? { require_declared_end_state: Boolean(planningRaw.require_declared_end_state) }
        : {}),
      ...(mutationTools.length > 0 ? { mutation_tools: mutationTools } : {}),
      ...(highRiskTools.length > 0 ? { high_risk_tools: highRiskTools } : {}),
    };
  }

  const replRaw = asRecord(obj.repl_policy);
  if (replRaw) {
    const allowlist = asStringList(replRaw.tool_allowlist);
    const deniedPatterns = asStringList(replRaw.denied_command_patterns);
    const deniedPathPatterns = asStringList(replRaw.denied_path_patterns);
    const allowedPathPrefixes = asStringList(replRaw.allowed_path_prefixes);
    for (const pattern of deniedPatterns) {
      try {
        // Validate regex upfront to fail fast as invalid_config instead of runtime policy violation.
        // Regex flags are fixed to "i" in evaluation, so syntax-only validation is enough here.
        new RegExp(pattern);
      } catch {
        throw new CliAgentError({
          reason: "invalid_config",
          message: `policy.repl_policy.denied_command_patterns contains invalid regex: ${pattern}`,
        });
      }
    }
    for (const pattern of deniedPathPatterns) {
      try {
        new RegExp(pattern);
      } catch {
        throw new CliAgentError({
          reason: "invalid_config",
          message: `policy.repl_policy.denied_path_patterns contains invalid regex: ${pattern}`,
        });
      }
    }
    const replPolicy: NonNullable<RuntimePolicy["repl_policy"]> = {
      ...(allowlist.length > 0 ? { tool_allowlist: allowlist } : {}),
      ...(deniedPatterns.length > 0 ? { denied_command_patterns: deniedPatterns } : {}),
      ...(deniedPathPatterns.length > 0 ? { denied_path_patterns: deniedPathPatterns } : {}),
      ...(allowedPathPrefixes.length > 0 ? { allowed_path_prefixes: allowedPathPrefixes } : {}),
    };
    if (replRaw.max_command_length !== undefined) {
      const max = Number(replRaw.max_command_length);
      if (!Number.isFinite(max) || max < 1) {
        throw new CliAgentError({
          reason: "invalid_config",
          message: "policy.repl_policy.max_command_length must be a positive number",
        });
      }
      replPolicy.max_command_length = Math.floor(max);
    }
    if (replRaw.max_tool_calls !== undefined) {
      const max = Number(replRaw.max_tool_calls);
      if (!Number.isFinite(max) || max < 1) {
        throw new CliAgentError({
          reason: "invalid_config",
          message: "policy.repl_policy.max_tool_calls must be a positive number",
        });
      }
      replPolicy.max_tool_calls = Math.floor(max);
    }
    out.repl_policy = replPolicy;
  }

  if (!out.planning_gate && !out.repl_policy) return undefined;
  return out;
}

function parsePlanEnvelopeFromOutput(output: string): Record<string, unknown> | null {
  const trimmed = output.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const root = asRecord(parsed);
    if (!root) return null;
    const plan = asRecord(root.plan_envelope ?? root.plan);
    return plan ?? null;
  } catch {
    return null;
  }
}

function extractCommandText(args: Record<string, unknown>): string {
  const cmd = typeof args.command === "string" ? args.command : undefined;
  if (cmd) return cmd;
  const rawCmd = typeof args.cmd === "string" ? args.cmd : undefined;
  if (rawCmd) return rawCmd;
  const script = typeof args.script === "string" ? args.script : undefined;
  if (script) return script;
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

function extractCommandPaths(commandText: string): string[] {
  if (!commandText || commandText.trim().length === 0) return [];
  const quoted = commandText.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g) ?? [];
  const unquoted = commandText.split(/\s+/);
  const tokens = [...quoted, ...unquoted]
    .map((t) => t.replace(/^['"]|['"]$/g, "").trim())
    .filter((t) => t.length > 0);
  const candidates = tokens.filter((t) => t.startsWith("/") || t.startsWith("./") || t.startsWith("../") || t.startsWith("~"));
  return Array.from(new Set(candidates));
}

function evaluateRuntimePolicy(
  policy: RuntimePolicy | undefined,
  events: RunEvent[],
  finalOutputText: string,
  telemetryMode: "wrapper_only" | "inferred"
): RuntimePolicyViolation[] {
  if (!policy) return [];
  const violations: RuntimePolicyViolation[] = [];
  const toolCalls = events.filter((e): e is Extract<RunEvent, { type: "tool_call" }> => e.type === "tool_call");

  if (telemetryMode === "wrapper_only") {
    const scopes: Array<"planning_gate" | "repl_policy"> = [];
    if (policy.planning_gate) scopes.push("planning_gate");
    if (policy.repl_policy) scopes.push("repl_policy");
    for (const scope of scopes) {
      violations.push({
        scope,
        severity: "require_approval",
        code: "telemetry_untrusted",
        message: "Only wrapper telemetry is available; runtime policy cannot be reliably verified",
        details: { telemetry_mode: telemetryMode },
      });
    }
  }

  if (policy.planning_gate) {
    const mutationTools = new Set((policy.planning_gate.mutation_tools ?? DEFAULT_MUTATION_TOOLS).map((x) => String(x)));
    const highRiskTools = new Set((policy.planning_gate.high_risk_tools ?? []).map((x) => String(x)));
    const mutationCalls = toolCalls.filter((c) => mutationTools.has(c.tool));
    const hasMutations = mutationCalls.length > 0;
    const plan = parsePlanEnvelopeFromOutput(finalOutputText);
    const allowedTools = asStringList(plan?.allowed_tools);
    const hasDeclaredEndState = Boolean(plan && plan.declared_end_state !== undefined && plan.declared_end_state !== null);

    if (policy.planning_gate.required_for_mutations === true && hasMutations && !plan) {
      violations.push({
        scope: "planning_gate",
        severity: mutationCalls.some((c) => highRiskTools.has(c.tool)) ? "block" : "require_approval",
        code: "missing_plan_envelope",
        message: "Mutating tool call executed without plan_envelope",
        details: { tools: mutationCalls.map((c) => c.tool) },
      });
    }

    if (policy.planning_gate.require_declared_end_state === true && hasMutations && !hasDeclaredEndState) {
      violations.push({
        scope: "planning_gate",
        severity: "block",
        code: "declared_end_state_missing",
        message: "Plan envelope missing declared_end_state for mutating operation",
      });
    }

    if (hasMutations && allowedTools.length > 0) {
      const allowedSet = new Set(allowedTools);
      const mismatched = mutationCalls.filter((c) => !allowedSet.has(c.tool)).map((c) => c.tool);
      if (mismatched.length > 0) {
        violations.push({
          scope: "planning_gate",
          severity: mismatched.some((tool) => highRiskTools.has(tool)) ? "block" : "require_approval",
          code: "tool_outside_plan",
          message: "Mutating tool call is not declared in plan_envelope.allowed_tools",
          details: { tools: Array.from(new Set(mismatched)), allowed_tools: allowedTools },
        });
      }
    }
  }

  if (policy.repl_policy) {
    const replToolSet = new Set((policy.repl_policy.tool_allowlist ?? DEFAULT_REPL_TOOLS).map((x) => String(x)));
    const replCalls = toolCalls.filter((c) => DEFAULT_REPL_TOOLS.includes(c.tool) || replToolSet.has(c.tool));
    if (typeof policy.repl_policy.max_tool_calls === "number" && policy.repl_policy.max_tool_calls > 0) {
      if (replCalls.length > policy.repl_policy.max_tool_calls) {
        violations.push({
          scope: "repl_policy",
          severity: "require_approval",
          code: "too_many_repl_calls",
          message: `REPL call count ${replCalls.length} exceeds max_tool_calls=${policy.repl_policy.max_tool_calls}`,
          details: { count: replCalls.length, max: policy.repl_policy.max_tool_calls },
        });
      }
    }
    if (policy.repl_policy.tool_allowlist && policy.repl_policy.tool_allowlist.length > 0) {
      const allowSet = new Set(policy.repl_policy.tool_allowlist.map((x) => String(x)));
      const disallowed = replCalls.filter((c) => !allowSet.has(c.tool)).map((c) => c.tool);
      if (disallowed.length > 0) {
        violations.push({
          scope: "repl_policy",
          severity: "block",
          code: "tool_not_allowlisted",
          message: "REPL tool call is outside tool_allowlist",
          details: { tools: Array.from(new Set(disallowed)) },
        });
      }
    }

    if (policy.repl_policy.denied_command_patterns && policy.repl_policy.denied_command_patterns.length > 0) {
      for (const pattern of policy.repl_policy.denied_command_patterns) {
        let re: RegExp;
        try {
          re = new RegExp(pattern, "i");
        } catch {
          violations.push({
            scope: "repl_policy",
            severity: "block",
            code: "invalid_denied_pattern",
            message: `Invalid denied command regex: ${pattern}`,
          });
          continue;
        }
        for (const call of replCalls) {
          const text = extractCommandText(call.args);
          if (re.test(text)) {
            violations.push({
              scope: "repl_policy",
              severity: "block",
              code: "denied_command_pattern",
              message: `REPL command matches denied pattern: ${pattern}`,
              details: { tool: call.tool },
            });
          }
        }
      }
    }

    if (typeof policy.repl_policy.max_command_length === "number" && policy.repl_policy.max_command_length > 0) {
      const maxLen = policy.repl_policy.max_command_length;
      for (const call of replCalls) {
        const text = extractCommandText(call.args);
        if (text.length > maxLen) {
          violations.push({
            scope: "repl_policy",
            severity: "require_approval",
            code: "command_too_long",
            message: `REPL command length ${text.length} exceeds max_command_length=${maxLen}`,
            details: { tool: call.tool, length: text.length, max: maxLen },
          });
        }
      }
    }

    if (policy.repl_policy.denied_path_patterns && policy.repl_policy.denied_path_patterns.length > 0) {
      const patterns = policy.repl_policy.denied_path_patterns.flatMap((pattern) => {
        try {
          return [new RegExp(pattern, "i")];
        } catch {
          return [];
        }
      });
      for (const call of replCalls) {
        const text = extractCommandText(call.args);
        const paths = extractCommandPaths(text);
        for (const p of paths) {
          for (const re of patterns) {
            if (re.test(p)) {
              violations.push({
                scope: "repl_policy",
                severity: "block",
                code: "denied_path_pattern",
                message: `REPL path matches denied pattern: ${re.source}`,
                details: { tool: call.tool, path: p },
              });
            }
          }
        }
      }
    }

    if (policy.repl_policy.allowed_path_prefixes && policy.repl_policy.allowed_path_prefixes.length > 0) {
      const prefixes = policy.repl_policy.allowed_path_prefixes;
      for (const call of replCalls) {
        const text = extractCommandText(call.args);
        const paths = extractCommandPaths(text);
        const disallowedPaths = paths.filter((p) => !prefixes.some((prefix) => p.startsWith(prefix)));
        if (disallowedPaths.length > 0) {
          violations.push({
            scope: "repl_policy",
            severity: "block",
            code: "path_outside_allowlist",
            message: "REPL command references paths outside allowed_path_prefixes",
            details: { tool: call.tool, disallowed_paths: disallowedPaths, allowed_path_prefixes: prefixes },
          });
        }
      }
    }
  }

  return violations;
}

function formatPolicyViolationMessage(violations: RuntimePolicyViolation[]): string {
  if (violations.length === 0) return "Runtime policy violation";
  const parts = violations.map((v) => `${v.scope}.${v.code}`);
  return `Runtime policy violation: ${Array.from(new Set(parts)).join(", ")}`;
}

function resolvePolicyAuditPath(env: NodeJS.ProcessEnv): string {
  const raw = env.CLI_AGENT_POLICY_AUDIT_PATH?.trim();
  if (!raw || raw.length === 0) return DEFAULT_POLICY_AUDIT_LOG;
  return raw;
}

async function appendPolicyAuditEntry(
  auditPath: string,
  entry: {
    ts: number;
    case_id: string;
    version: string;
    telemetry_mode: "wrapper_only" | "inferred";
    violation_count: number;
    violations: RuntimePolicyViolation[];
    run_meta?: RunMeta;
  }
): Promise<void> {
  const absPath = isAbsolute(auditPath) ? auditPath : resolve(process.cwd(), auditPath);
  await mkdir(dirname(absPath), { recursive: true });
  const line = `${stableStringify(entry)}\n`;
  await appendFile(absPath, line, "utf8");
}

function formatHandoffContext(
  runMeta: RunMeta | undefined,
  handoffs: StoredHandoff[],
  maxChars: number
): string | null {
  if (!runMeta?.incident_id || !runMeta.agent_id || handoffs.length === 0) return null;
  const payload = {
    incident_id: runMeta.incident_id,
    agent_id: runMeta.agent_id,
    handoffs: handoffs.map((h) => ({
      handoff_id: h.envelope.handoff_id,
      from_agent_id: h.envelope.from_agent_id,
      to_agent_id: h.envelope.to_agent_id,
      objective: h.envelope.objective,
      constraints: h.envelope.constraints,
      decision_thresholds: h.envelope.decision_thresholds,
      state_delta: h.envelope.state_delta,
      tool_result_refs: h.envelope.tool_result_refs,
      retrieval_refs: h.envelope.retrieval_refs,
      trace_anchor: h.envelope.trace_anchor,
      parent_handoff_id: h.envelope.parent_handoff_id,
      schema_version: h.envelope.schema_version,
      created_at: h.envelope.created_at,
      checksum: h.envelope.checksum,
    })),
  };

  const json = stableStringify(payload);
  const bounded = json.length > maxChars ? `${json.slice(0, maxChars)}...[truncated]` : json;
  return `[runtime_handoff_context]\n${bounded}\n\n`;
}

function buildRunCasePrompt(
  basePrompt: string,
  runMeta: RunMeta | undefined,
  handoffs: StoredHandoff[],
  includeHandoffContext: boolean,
  maxChars: number
): string {
  if (!includeHandoffContext) return basePrompt;
  const handoffBlock = formatHandoffContext(runMeta, handoffs, maxChars);
  if (!handoffBlock) return basePrompt;
  return `${handoffBlock}[user_request]\n${basePrompt}`;
}

function killProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  const pid = child.pid;
  if (typeof pid === "number" && pid > 0 && process.platform !== "win32") {
    try {
      process.kill(-pid, signal);
    } catch {
      // ignore; fallback to direct child kill below
    }
  }
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
}

function createCliErrorPayload(err: unknown, stderrSnippetChars: number): CliErrorPayload {
  if (err instanceof CliAgentError) {
    const payload: CliErrorPayload = {
      code: err.reason,
      message: err.message,
    };
    if (err.exitCode !== undefined) payload.exit_code = err.exitCode;
    if (err.exitSignal !== undefined) payload.exit_signal = err.exitSignal;
    const snippet = normalizeStderrSnippet(err.stderr, stderrSnippetChars);
    if (snippet) payload.stderr_snippet = snippet;
    return payload;
  }
  return {
    code: "spawn_error",
    message: err instanceof Error ? err.message : String(err),
  };
}

function upsertHandoff(
  store: Map<string, Map<string, StoredHandoff>>,
  envelope: HandoffEnvelope
): HandoffUpsertResult {
  const now = Date.now();
  const incidentMap = store.get(envelope.incident_id) ?? new Map<string, StoredHandoff>();
  const existing = incidentMap.get(envelope.handoff_id);
  if (existing) {
    if (existing.envelope.checksum !== envelope.checksum) {
      throw new CliAgentError({
        reason: "invalid_config",
        message: `handoff conflict for incident=${envelope.incident_id} handoff_id=${envelope.handoff_id}: checksum mismatch`,
      });
    }
    const receipt: HandoffReceipt = {
      incident_id: existing.envelope.incident_id,
      handoff_id: existing.envelope.handoff_id,
      from_agent_id: existing.envelope.from_agent_id,
      to_agent_id: existing.envelope.to_agent_id,
      checksum: existing.envelope.checksum,
      accepted_at: existing.accepted_at,
      status: "duplicate",
    };
    if (!store.has(envelope.incident_id)) {
      store.set(envelope.incident_id, incidentMap);
    }
    return { status: "duplicate", receipt };
  }

  const stored: StoredHandoff = {
    envelope,
    accepted_at: now,
  };
  incidentMap.set(envelope.handoff_id, stored);
  store.set(envelope.incident_id, incidentMap);

  return {
    status: "accepted",
    receipt: {
      incident_id: envelope.incident_id,
      handoff_id: envelope.handoff_id,
      from_agent_id: envelope.from_agent_id,
      to_agent_id: envelope.to_agent_id,
      checksum: envelope.checksum,
      accepted_at: now,
      status: "accepted",
    },
  };
}

type PersistedHandoffStore = {
  version: 1;
  saved_at: number;
  items: Array<{
    envelope: HandoffEnvelope;
    accepted_at: number;
  }>;
};

function flattenHandoffStore(store: Map<string, Map<string, StoredHandoff>>): StoredHandoff[] {
  const out: StoredHandoff[] = [];
  for (const incident of store.values()) {
    for (const item of incident.values()) out.push(item);
  }
  return out;
}

function pruneHandoffStore(
  store: Map<string, Map<string, StoredHandoff>>,
  ttlMs: number,
  maxItemsTotal: number,
  now = Date.now()
): boolean {
  const beforeKeys = new Set(
    flattenHandoffStore(store).map((x) => `${x.envelope.incident_id}::${x.envelope.handoff_id}::${x.accepted_at}`)
  );
  const keepAfter = now - ttlMs;
  const all = flattenHandoffStore(store)
    .filter((x) => x.accepted_at >= keepAfter)
    .sort((a, b) => b.accepted_at - a.accepted_at);
  const limited = all.slice(0, maxItemsTotal);

  const rebuilt = new Map<string, Map<string, StoredHandoff>>();
  for (const item of limited) {
    const incidentMap = rebuilt.get(item.envelope.incident_id) ?? new Map<string, StoredHandoff>();
    incidentMap.set(item.envelope.handoff_id, item);
    rebuilt.set(item.envelope.incident_id, incidentMap);
  }

  const afterKeys = new Set(
    limited.map((x) => `${x.envelope.incident_id}::${x.envelope.handoff_id}::${x.accepted_at}`)
  );
  const changed =
    beforeKeys.size !== afterKeys.size ||
    Array.from(beforeKeys).some((k) => !afterKeys.has(k));

  if (changed) {
    store.clear();
    for (const [k, v] of rebuilt.entries()) {
      store.set(k, v);
    }
  }

  return changed;
}

function loadHandoffStoreFromFile(filePath: string): Map<string, Map<string, StoredHandoff>> {
  const store = new Map<string, Map<string, StoredHandoff>>();
  let raw = "";
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return store;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedHandoffStore | unknown;
    if (!parsed || typeof parsed !== "object") return store;
    const items = (parsed as PersistedHandoffStore).items;
    if (!Array.isArray(items)) return store;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const acceptedAt = typeof item.accepted_at === "number" && Number.isFinite(item.accepted_at)
        ? Math.floor(item.accepted_at)
        : Date.now();
      try {
        const envelope = validateAndNormalizeHandoffEnvelope((item as { envelope?: unknown }).envelope);
        const incidentMap = store.get(envelope.incident_id) ?? new Map<string, StoredHandoff>();
        incidentMap.set(envelope.handoff_id, {
          envelope,
          accepted_at: acceptedAt,
        });
        store.set(envelope.incident_id, incidentMap);
      } catch {
        // Skip corrupted or invalid envelopes in persisted file.
      }
    }
  } catch {
    return store;
  }
  return store;
}

async function persistHandoffStoreToFile(
  filePath: string,
  store: Map<string, Map<string, StoredHandoff>>
): Promise<void> {
  const items = flattenHandoffStore(store)
    .sort((a, b) => a.accepted_at - b.accepted_at)
    .map((x) => ({
      envelope: x.envelope,
      accepted_at: x.accepted_at,
    }));

  const payload: PersistedHandoffStore = {
    version: 1,
    saved_at: Date.now(),
    items,
  };

  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), "utf-8");
  await rename(tmp, filePath);
}

function getIncidentHandoffs(
  store: Map<string, Map<string, StoredHandoff>>,
  runMeta: RunMeta | undefined,
  maxItems: number
): StoredHandoff[] {
  if (!runMeta?.incident_id || !runMeta.agent_id) return [];
  const incident = store.get(runMeta.incident_id);
  if (!incident) return [];
  const all = Array.from(incident.values())
    .filter((x) => x.envelope.to_agent_id === runMeta.agent_id)
    .sort((a, b) => a.envelope.created_at - b.envelope.created_at);
  if (all.length <= maxItems) return all;
  return all.slice(all.length - maxItems);
}

function getExecutable(env: NodeJS.ProcessEnv): { cmd: string; args: string[]; useStdin: boolean; cwd?: string } {
  const cmd = getRequiredEnv(env, "CLI_AGENT_CMD");
  const args = parseArgs(env.CLI_AGENT_ARGS);
  const useStdin = boolEnv(env, "CLI_AGENT_USE_STDIN", false);
  const cwd = env.CLI_AGENT_WORKDIR;

  const resolvedCmd =
    cwd && !isAbsolute(cmd) && (cmd.includes("/") || cmd.includes("\\"))
      ? resolve(cwd, cmd)
      : cmd;

  if (/[\r\n]/.test(resolvedCmd)) {
    throw new CliAgentError({
      reason: "invalid_config",
      message:
        "Invalid env CLI_AGENT_CMD: contains a newline. Use a single-line path or executable name.",
    });
  }

  if (isAbsolute(resolvedCmd)) {
    try {
      accessSync(resolvedCmd, fsConstants.X_OK);
    } catch {
      throw new CliAgentError({
        reason: "invalid_config",
        message: `Invalid env CLI_AGENT_CMD: executable not found or not executable: ${resolvedCmd}`,
      });
    }
  }

  if (cwd && cwd.trim().length > 0) {
    return { cmd: resolvedCmd, args, useStdin, cwd };
  }
  return { cmd: resolvedCmd, args, useStdin };
}

async function runCliAgent(
  prompt: string,
  env: NodeJS.ProcessEnv,
  signal?: AbortSignal
): Promise<CliRunSuccess> {
  const timeout = resolveTimeoutMs(env);
  const timeoutMs = timeout.effectiveMs;
  const killGraceMs = intEnv(env, "CLI_AGENT_KILL_GRACE_MS", DEFAULT_KILL_GRACE_MS);
  const { cmd, args, useStdin, cwd } = getExecutable(env);

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, useStdin ? args : [...args, prompt], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let forceKillTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
        forceKillTimer = null;
      }
      if (signal) signal.removeEventListener("abort", onAbort);
    };

    const settleOnce = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const requestTermination = () => {
      killProcessGroup(child, "SIGTERM");
      if (!forceKillTimer) {
        forceKillTimer = setTimeout(() => killProcessGroup(child, "SIGKILL"), killGraceMs);
        const timerLike = forceKillTimer as unknown as { unref?: () => void };
        if (typeof timerLike.unref === "function") timerLike.unref();
      }
    };

    const timeoutTimer = setTimeout(() => {
      requestTermination();
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "timeout",
            message: `CLI agent timed out after ${timeoutMs}ms${timeout.clamped ? ` (requested=${timeout.requestedMs}ms capped=${timeout.capMs}ms)` : ""}`,
            stdout,
            stderr,
          })
        )
      );
    }, timeoutMs);

    const onAbort = () => {
      requestTermination();
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "aborted",
            message: "CLI agent request aborted by caller",
            stdout,
            stderr,
          })
        )
      );
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "spawn_error",
            message: err.message,
            stdout,
            stderr,
          })
        )
      );
    });

    child.on("close", (code, exitSignal) => {
      if (code === 0) {
        settleOnce(() =>
          resolvePromise({
            stdout,
            stderr,
            code: 0,
            signal: exitSignal,
          })
        );
        return;
      }
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "non_zero_exit",
            message: `CLI agent exited with code=${String(code)} signal=${String(exitSignal)}`,
            exitCode: code,
            exitSignal,
            stdout,
            stderr,
          })
        )
      );
    });

    if (useStdin) {
      child.stdin.write(prompt);
      child.stdin.end();
    }
  });
}

export function createCliAgentAdapterApp(env: NodeJS.ProcessEnv = process.env): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  let activeCliProcesses = 0;
  const authConfig = resolveAuthConfig(env);
  const handoffPersistence = resolveHandoffPersistenceConfig(env);
  const handoffStore =
    handoffPersistence.mode === "file" && handoffPersistence.filePath
      ? loadHandoffStoreFromFile(handoffPersistence.filePath)
      : new Map<string, Map<string, StoredHandoff>>();
  let persistWriteChain: Promise<void> = Promise.resolve();

  const persistHandoffStoreIfEnabled = async (): Promise<void> => {
    if (handoffPersistence.mode !== "file" || !handoffPersistence.filePath) return;
    await persistHandoffStoreToFile(handoffPersistence.filePath, handoffStore);
  };

  const queuePersistHandoffStoreIfEnabled = async (): Promise<void> => {
    if (handoffPersistence.mode !== "file" || !handoffPersistence.filePath) return;
    // Serialize writes to avoid out-of-order snapshots under concurrent requests.
    persistWriteChain = persistWriteChain
      .catch(() => {
        // Keep queue alive after a failed write; current call will attempt a fresh snapshot.
      })
      .then(async () => {
        await persistHandoffStoreToFile(handoffPersistence.filePath as string, handoffStore);
      });
    await persistWriteChain;
  };

  const persistHandoffStoreAfterMutation = async (): Promise<void> => {
    pruneHandoffStore(
      handoffStore,
      handoffPersistence.ttlMs,
      handoffPersistence.maxItemsTotal
    );
    await queuePersistHandoffStoreIfEnabled();
  };

  const pruneAndPersistHandoffStore = async (): Promise<void> => {
    const changed = pruneHandoffStore(
      handoffStore,
      handoffPersistence.ttlMs,
      handoffPersistence.maxItemsTotal
    );
    if (changed) await persistHandoffStoreIfEnabled();
  };

  const stderrSnippetChars = intEnv(env, "CLI_AGENT_STDERR_SNIPPET_CHARS", DEFAULT_STDERR_SNIPPET_CHARS);
  const timeout = resolveTimeoutMs(env);
  const killGraceMs = intEnv(env, "CLI_AGENT_KILL_GRACE_MS", DEFAULT_KILL_GRACE_MS);
  const useStdin = boolEnv(env, "CLI_AGENT_USE_STDIN", false);
  const maxConcurrency = intEnv(env, "CLI_AGENT_MAX_CONCURRENCY", DEFAULT_MAX_CONCURRENCY);
  const busyRetryAfterMs = intEnv(env, "CLI_AGENT_BUSY_RETRY_AFTER_MS", DEFAULT_BUSY_RETRY_AFTER_MS);
  const execToolName = env.CLI_AGENT_EXEC_TOOL_NAME?.trim() || DEFAULT_EXEC_TOOL_NAME;
  const policyAuditPath = resolvePolicyAuditPath(env);
  const includeHandoffContext = boolEnv(env, "CLI_AGENT_INCLUDE_HANDOFF_CONTEXT", true);
  const handoffContextMaxChars = intEnv(env, "CLI_AGENT_HANDOFF_CONTEXT_MAX_CHARS", DEFAULT_HANDOFF_CONTEXT_MAX_CHARS);
  const handoffMaxItems = intEnv(env, "CLI_AGENT_HANDOFF_MAX_ITEMS", DEFAULT_HANDOFF_MAX_ITEMS);
  const serverTimeouts = resolveServerTimeoutConfig(env);

  app.use((req: Request, res: Response, next) => {
    if (!(req.path === "/run-case" || req.path === "/handoff")) {
      next();
      return;
    }
    if (isAuthorized(req, authConfig)) {
      next();
      return;
    }
    res.status(401).json({
      ok: false,
      error: "unauthorized",
      message: `Missing or invalid auth token (${authConfig.header})`,
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    pruneHandoffStore(
      handoffStore,
      handoffPersistence.ttlMs,
      handoffPersistence.maxItemsTotal
    );
    let totalHandoffs = 0;
    for (const incident of handoffStore.values()) totalHandoffs += incident.size;
    res.json({
      ok: true,
      active_cli_processes: activeCliProcesses,
      max_cli_processes: maxConcurrency,
      handoff_incidents: handoffStore.size,
      handoff_items_total: totalHandoffs,
      runtime: {
        timeout_ms: timeout.effectiveMs,
        timeout_requested_ms: timeout.requestedMs,
        timeout_cap_ms: timeout.capMs,
        timeout_clamped: timeout.clamped,
        kill_grace_ms: killGraceMs,
        stderr_snippet_chars: stderrSnippetChars,
        use_stdin: useStdin,
        exec_tool_name: execToolName,
        busy_retry_after_ms: busyRetryAfterMs,
        include_handoff_context: includeHandoffContext,
        handoff_context_max_chars: handoffContextMaxChars,
        handoff_max_items: handoffMaxItems,
        handoff_store_mode: handoffPersistence.mode,
        handoff_store_path: handoffPersistence.filePath,
        handoff_ttl_ms: handoffPersistence.ttlMs,
        handoff_max_items_total: handoffPersistence.maxItemsTotal,
        auth_enabled: authConfig.enabled,
        auth_header: authConfig.header,
        server_request_timeout_ms: serverTimeouts.requestTimeoutMs,
        server_headers_timeout_ms: serverTimeouts.headersTimeoutMs,
        server_keep_alive_timeout_ms: serverTimeouts.keepAliveTimeoutMs,
      },
    });
  });

  app.post("/handoff", async (req: Request, res: Response) => {
    try {
      const normalized = validateAndNormalizeHandoffEnvelope(req.body);
      const upsert = upsertHandoff(handoffStore, normalized);
      await persistHandoffStoreAfterMutation();
      res.status(upsert.status === "duplicate" ? 200 : 201).json({
        ok: true,
        receipt: upsert.receipt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = msg.includes("checksum mismatch") ? 409 : 400;
      res.status(code).json({
        ok: false,
        error: "invalid_handoff",
        message: msg,
      });
    }
  });

  app.post("/run-case", async (req: Request, res: Response) => {
    const caseId = typeof req.body?.case_id === "string" ? req.body.case_id : "";
    const version = req.body?.version === "baseline" || req.body?.version === "new" ? req.body.version : "baseline";
    const basePrompt = buildPrompt(req.body?.input);
    const runMeta = normalizeRunMeta(req.body?.run_meta);
    let runtimePolicy: RuntimePolicy | undefined;
    try {
      runtimePolicy = normalizeRuntimePolicy(req.body?.policy);
    } catch (err) {
      const adapterError = createCliErrorPayload(err, stderrSnippetChars);
      res.status(400).json({
        case_id: caseId || "__policy__",
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: [],
        final_output: {
          content_type: "text",
          content: `[adapter:${adapterError.code}] ${adapterError.message}`,
        },
        events: [],
        adapter_error: adapterError,
      });
      return;
    }
    const preflightHeader = req.header("x-aq-preflight");
    const isPreflightProbe = caseId === "__preflight__" || preflightHeader === "1";

    // Keep runner preflight deterministic and cheap: validate adapter config/transport
    // without invoking a long-running external CLI process.
    if (isPreflightProbe) {
      try {
        getExecutable(env);
        res.json({
          case_id: caseId || "__preflight__",
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: [],
          final_output: {
            content_type: "text",
            content: "[adapter:preflight] ok",
          },
          events: [],
          preflight: { ok: true },
        });
      } catch (err) {
        const adapterError = createCliErrorPayload(err, stderrSnippetChars);
        res.status(500).json({
          case_id: caseId || "__preflight__",
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: [],
          final_output: {
            content_type: "text",
            content: `[adapter:${adapterError.code}] ${adapterError.message}`,
          },
          events: [],
          adapter_error: adapterError,
          preflight: { ok: false },
        });
      }
      return;
    }

    let inlineHandoffReceipt: HandoffReceipt | undefined;
    if (req.body?.handoff !== undefined) {
      try {
        const normalized = validateAndNormalizeHandoffEnvelope(req.body.handoff);
        inlineHandoffReceipt = upsertHandoff(handoffStore, normalized).receipt;
        await persistHandoffStoreAfterMutation();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({
          case_id: caseId,
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: [],
          final_output: {
            content_type: "text",
            content: `[adapter:invalid_handoff] ${msg}`,
          },
          events: [],
          adapter_error: {
            code: "invalid_config",
            message: msg,
          },
        });
        return;
      }
    }
    await pruneAndPersistHandoffStore();
    const availableHandoffs = getIncidentHandoffs(handoffStore, runMeta, handoffMaxItems);
    const prompt = buildRunCasePrompt(
      basePrompt,
      runMeta,
      availableHandoffs,
      includeHandoffContext,
      handoffContextMaxChars
    );
    const handoffReceipts: HandoffReceipt[] = [
      ...(inlineHandoffReceipt ? [inlineHandoffReceipt] : []),
      ...availableHandoffs.map((h) => ({
        incident_id: h.envelope.incident_id,
        handoff_id: h.envelope.handoff_id,
        from_agent_id: h.envelope.from_agent_id,
        to_agent_id: h.envelope.to_agent_id,
        checksum: h.envelope.checksum,
        accepted_at: h.accepted_at,
        status: "available" as const,
      })),
    ];
    const requestAbort = new AbortController();
    req.on("aborted", () => {
      requestAbort.abort();
    });
    res.on("close", () => {
      if (!res.writableEnded) requestAbort.abort();
    });

    if (activeCliProcesses >= maxConcurrency) {
      const adapterError: CliErrorPayload = {
        code: "busy",
        message: `CLI adapter busy: active=${activeCliProcesses}, max=${maxConcurrency}`,
        retry_after_ms: busyRetryAfterMs,
      };
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(busyRetryAfterMs / 1000))));
      res.status(429).json({
        case_id: caseId,
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: [],
        final_output: {
          content_type: "text",
          content: `[adapter:busy] ${adapterError.message}`,
        },
        events: [],
        adapter_error: adapterError,
      });
      return;
    }

    activeCliProcesses += 1;
    const startedAtMs = Date.now();
    try {
      const result = await runCliAgent(prompt, env, requestAbort.signal);
      const finishedAtMs = Date.now();
      const output = (result.stdout || result.stderr || "").trim();
      const executable = getExecutable(env);
      const telemetry = buildExecutionTelemetry({
        caseId,
        prompt,
        finalOutputContent: output,
        outputContentType: "text",
        startedAtMs,
        finishedAtMs,
        status: "ok",
        execToolName,
        cmd: executable.cmd,
        args: executable.args,
        useStdin: executable.useStdin,
        ...(executable.cwd ? { cwd: executable.cwd } : {}),
      });
      const policyViolations = evaluateRuntimePolicy(runtimePolicy, telemetry.events, output, telemetry.telemetryMode);
      if (policyViolations.length > 0) {
        const message = formatPolicyViolationMessage(policyViolations);
        const adapterError: CliErrorPayload = {
          code: "policy_violation",
          message,
        };
        await appendPolicyAuditEntry(policyAuditPath, {
          ts: Date.now(),
          case_id: caseId,
          version,
          telemetry_mode: telemetry.telemetryMode,
          violation_count: policyViolations.length,
          violations: policyViolations,
          ...(runMeta ? { run_meta: runMeta } : {}),
        });
        res.json({
          case_id: caseId,
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: telemetry.proposedActions,
          final_output: { content_type: "text", content: `[adapter:policy_violation] ${message}` },
          events: telemetry.events,
          telemetry_mode: telemetry.telemetryMode,
          policy_violations: policyViolations,
          ...(runMeta ? { run_meta: runMeta } : {}),
          ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
          adapter_error: adapterError,
        });
        return;
      }

      res.json({
        case_id: caseId,
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: telemetry.proposedActions,
        final_output: { content_type: "text", content: output },
        events: telemetry.events,
        telemetry_mode: telemetry.telemetryMode,
        ...(runMeta ? { run_meta: runMeta } : {}),
        ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
      });
    } catch (err) {
      if (requestAbort.signal.aborted) return;
      const finishedAtMs = Date.now();
      const adapterError = createCliErrorPayload(err, stderrSnippetChars);
      const output = `[adapter:${adapterError.code}] ${adapterError.message}${adapterError.stderr_snippet ? ` | stderr: ${adapterError.stderr_snippet}` : ""}`;
      let executable: { cmd: string; args: string[]; useStdin: boolean; cwd?: string };
      try {
        executable = getExecutable(env);
      } catch {
        executable = {
          cmd: env.CLI_AGENT_CMD ?? "unknown",
          args: parseArgs(env.CLI_AGENT_ARGS),
          useStdin,
          ...(env.CLI_AGENT_WORKDIR ? { cwd: env.CLI_AGENT_WORKDIR } : {}),
        };
      }
      const errorStatus: "error" | "timeout" = adapterError.code === "timeout" ? "timeout" : "error";
      const telemetry = buildExecutionTelemetry({
        caseId,
        prompt,
        finalOutputContent: output,
        outputContentType: "text",
        startedAtMs,
        finishedAtMs,
        status: errorStatus,
        execToolName,
        cmd: executable.cmd,
        args: executable.args,
        useStdin: executable.useStdin,
        ...(executable.cwd ? { cwd: executable.cwd } : {}),
        statusMessage: adapterError.message,
      });
      res.status(500).json({
        case_id: caseId,
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: telemetry.proposedActions,
        final_output: { content_type: "text", content: output },
        events: telemetry.events,
        telemetry_mode: telemetry.telemetryMode,
        ...(runMeta ? { run_meta: runMeta } : {}),
        ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
        adapter_error: adapterError,
      });
    } finally {
      activeCliProcesses = Math.max(0, activeCliProcesses - 1);
    }
  });

  return app;
}

export const __test__ = {
  createCliErrorPayload,
  intEnv,
  resolveAuthConfig,
  isAuthorized,
  resolveHandoffPersistenceConfig,
  resolveTimeoutMs,
  getExecutable,
  formatHandoffContext,
  buildRunCasePrompt,
  upsertHandoff,
  pruneHandoffStore,
  loadHandoffStoreFromFile,
  persistHandoffStoreToFile,
  getIncidentHandoffs,
  extractInferredToolCalls,
  buildExecutionTelemetry,
};
