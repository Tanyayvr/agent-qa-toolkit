import type { AgentResponse, RunEvent, ToolCallEvent, ToolResultEvent, Version } from "shared-types";
import type { Expected } from "./core";
import { finalOutputEvents, resolveToolTelemetryRequirement, toolCalls, toolResults } from "./core";

export type ToolTelemetryIssueCode =
  | "no_events"
  | "missing_final_output_event"
  | "tool_call_without_result"
  | "tool_result_without_call"
  | "tool_result_missing_output_evidence"
  | "tool_result_missing_error_evidence";

export type ToolTelemetryIssue = {
  code: ToolTelemetryIssueCode;
  message: string;
  call_id?: string;
};

export type NormalizedToolResultArtifact = {
  schema_version: 1;
  artifact_type: "tool_result_record";
  case_id: string;
  version: Version;
  call_id: string;
  action_id?: string;
  tool?: string;
  status: "ok" | "error" | "timeout";
  latency_ms?: number;
  payload_summary?: Record<string, unknown> | string;
  result_ref?: string;
  error_code?: string;
  error_message?: string;
  issues: ToolTelemetryIssue[];
};

export type NormalizedToolResultSummary = NormalizedToolResultArtifact & {
  normalized_result_artifact_href?: string;
  normalized_result_artifact_key?: string;
};

export type NormalizedToolCallSummary = {
  call_id: string;
  action_id?: string;
  tool: string;
  args: Record<string, unknown>;
  telemetry_source: "native" | "wrapper" | "inferred";
};

export type NormalizedToolTelemetryArtifact = {
  schema_version: 1;
  artifact_type: "tool_telemetry";
  case_id: string;
  version: Version;
  telemetry_mode: "native" | "inferred" | "wrapper_only" | null;
  contract_required: boolean;
  contract_reasons: string[];
  event_count: number;
  tool_call_count: number;
  tool_result_count: number;
  final_output_event_present: boolean;
  status: "ok" | "partial" | "missing" | "broken";
  issues: ToolTelemetryIssue[];
  tool_calls: NormalizedToolCallSummary[];
  tool_results: NormalizedToolResultSummary[];
};

function asEvents(events: RunEvent[] | undefined | null): RunEvent[] {
  return Array.isArray(events) ? events : [];
}

function normalizeTelemetrySource(args: Record<string, unknown>): "native" | "wrapper" | "inferred" {
  const raw = args._telemetry_source;
  if (raw === "wrapper" || raw === "inferred") return raw;
  return "native";
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function pushIssue(target: ToolTelemetryIssue[], issue: ToolTelemetryIssue): void {
  target.push(issue);
}

function resultIssues(result: ToolResultEvent): ToolTelemetryIssue[] {
  const issues: ToolTelemetryIssue[] = [];
  const hasOutputEvidence = result.payload_summary !== undefined || nonEmptyString(result.result_ref);
  const hasErrorEvidence = nonEmptyString(result.error_code) || nonEmptyString(result.error_message);
  if (result.status === "ok" && !hasOutputEvidence) {
    pushIssue(issues, {
      code: "tool_result_missing_output_evidence",
      message: "tool_result with status=ok must include payload_summary or result_ref",
      call_id: result.call_id,
    });
  }
  if ((result.status === "error" || result.status === "timeout") && !hasErrorEvidence) {
    pushIssue(issues, {
      code: "tool_result_missing_error_evidence",
      message: "tool_result with status=error|timeout must include error_code or error_message",
      call_id: result.call_id,
    });
  }
  return issues;
}

export function buildNormalizedToolTelemetryArtifact(params: {
  caseId: string;
  version: Version;
  expected: Expected;
  response: AgentResponse;
}): NormalizedToolTelemetryArtifact {
  const events = asEvents(params.response.events);
  const calls = toolCalls(events);
  const results = toolResults(events);
  const finalOutputPresent = finalOutputEvents(events).length > 0;
  const requirement = resolveToolTelemetryRequirement(params.expected);
  const issues: ToolTelemetryIssue[] = [];
  const callsById = new Map<string, ToolCallEvent>();
  const resultIds = new Set<string>();

  for (const call of calls) callsById.set(call.call_id, call);
  for (const result of results) resultIds.add(result.call_id);

  if (events.length === 0) {
    pushIssue(issues, {
      code: "no_events",
      message: "response emitted no events",
    });
  }
  if (!finalOutputPresent) {
    pushIssue(issues, {
      code: "missing_final_output_event",
      message: "response telemetry is missing final_output event",
    });
  }

  for (const call of calls) {
    if (!resultIds.has(call.call_id)) {
      pushIssue(issues, {
        code: "tool_call_without_result",
        message: "tool_call has no matching tool_result",
        call_id: call.call_id,
      });
    }
  }
  for (const result of results) {
    if (!callsById.has(result.call_id)) {
      pushIssue(issues, {
        code: "tool_result_without_call",
        message: "tool_result has no matching tool_call",
        call_id: result.call_id,
      });
    }
    for (const issue of resultIssues(result)) pushIssue(issues, issue);
  }

  const normalizedResults: NormalizedToolResultSummary[] = results.map((result) => {
    const call = callsById.get(result.call_id);
    return {
      schema_version: 1,
      artifact_type: "tool_result_record",
      case_id: params.caseId,
      version: params.version,
      call_id: result.call_id,
      ...(result.action_id ? { action_id: result.action_id } : {}),
      ...(call?.tool ? { tool: call.tool } : {}),
      status: result.status,
      ...(typeof result.latency_ms === "number" ? { latency_ms: result.latency_ms } : {}),
      ...(result.payload_summary !== undefined ? { payload_summary: result.payload_summary } : {}),
      ...(nonEmptyString(result.result_ref) ? { result_ref: result.result_ref } : {}),
      ...(nonEmptyString(result.error_code) ? { error_code: result.error_code } : {}),
      ...(nonEmptyString(result.error_message) ? { error_message: result.error_message } : {}),
      issues: resultIssues(result),
    };
  });

  const normalizedCalls: NormalizedToolCallSummary[] = calls.map((call) => ({
    call_id: call.call_id,
    ...(call.action_id ? { action_id: call.action_id } : {}),
    tool: call.tool,
    args: call.args,
    telemetry_source: normalizeTelemetrySource(call.args),
  }));

  const status: NormalizedToolTelemetryArtifact["status"] = (() => {
    if (events.length === 0) return "missing";
    if (issues.some((issue) => issue.code === "tool_result_without_call")) return "broken";
    if (issues.length > 0) return "partial";
    return "ok";
  })();

  return {
    schema_version: 1,
    artifact_type: "tool_telemetry",
    case_id: params.caseId,
    version: params.version,
    telemetry_mode: params.response.telemetry_mode ?? null,
    contract_required: requirement.required,
    contract_reasons: requirement.reasons,
    event_count: events.length,
    tool_call_count: calls.length,
    tool_result_count: results.length,
    final_output_event_present: finalOutputPresent,
    status,
    issues,
    tool_calls: normalizedCalls,
    tool_results: normalizedResults,
  };
}
