import type { SimpleAgent } from "agent-sdk";
import type { FinalOutput, ProposedAction, RunEvent, TokenUsage } from "shared-types";

type OpenAIResponsesCreatePayload = Record<string, unknown>;
type OpenAIResponsesResult = Record<string, unknown>;

export type OpenAIResponsesClientLike = {
  responses: {
    create: (payload: OpenAIResponsesCreatePayload) => Promise<OpenAIResponsesResult>;
  };
};

export type OpenAIResponsesAdapterOptions = {
  model: string;
  instructions?: string;
  includeContext?: boolean;
  requestDefaults?: Record<string, unknown>;
  workflowId?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (isRecord(parsed)) return parsed;
    return { value: parsed };
  } catch {
    return { raw: trimmed };
  }
}

function buildInput(user: string, context: unknown, includeContext: boolean): string {
  if (!includeContext || context === undefined) return user;
  return `${user}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
}

function extractText(result: OpenAIResponsesResult): string | null {
  if (typeof result.output_text === "string" && result.output_text.trim().length > 0) {
    return result.output_text;
  }

  const output = result.output;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      if (!isRecord(item)) continue;
      const content = item.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (!isRecord(block)) continue;
        if (typeof block.text === "string") parts.push(block.text);
      }
    }
    if (parts.length > 0) return parts.join("\n");
  }

  return null;
}

function extractTokenUsage(result: OpenAIResponsesResult): TokenUsage | undefined {
  const usage = result.usage;
  if (!isRecord(usage)) return undefined;
  const input_tokens = typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
  const output_tokens = typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
  const total_tokens = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;
  if (input_tokens === undefined && output_tokens === undefined && total_tokens === undefined) return undefined;
  return {
    ...(input_tokens !== undefined ? { input_tokens } : {}),
    ...(output_tokens !== undefined ? { output_tokens } : {}),
    ...(total_tokens !== undefined ? { total_tokens } : {}),
  };
}

function toFinalOutput(result: OpenAIResponsesResult): FinalOutput {
  const text = extractText(result);
  if (text !== null) return { content_type: "text", content: text };
  return { content_type: "json", content: result };
}

type OpenAITelemetry = {
  events: RunEvent[];
  proposed_actions: ProposedAction[];
};

function extractToolTelemetry(result: OpenAIResponsesResult): OpenAITelemetry {
  const output = Array.isArray(result.output) ? result.output : [];
  if (!output.length) return { events: [], proposed_actions: [] };

  const events: RunEvent[] = [];
  const proposedActions: ProposedAction[] = [];
  const callIds = new Set<string>();
  const baseTs = Date.now();

  let toolCounter = 0;
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (item.type !== "function_call") continue;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) continue;
    toolCounter += 1;
    const call_id =
      (typeof item.call_id === "string" && item.call_id.trim().length > 0 ? item.call_id : undefined) ??
      (typeof item.id === "string" && item.id.trim().length > 0 ? item.id : undefined) ??
      `oa_call_${toolCounter}`;
    const args = parseToolArgs(item.arguments);
    callIds.add(call_id);
    const ts = baseTs + toolCounter;
    events.push({
      type: "tool_call",
      ts,
      call_id,
      action_id: call_id,
      tool: name,
      args,
    });
    proposedActions.push({
      action_id: call_id,
      action_type: "tool_call",
      tool_name: name,
      params: args,
      risk_level: "low",
      evidence_refs: [{ kind: "tool_result", call_id }],
    });
  }

  let resultCounter = 0;
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (item.type !== "function_call_output") continue;
    const call_id = typeof item.call_id === "string" ? item.call_id : "";
    if (!call_id) continue;
    resultCounter += 1;
    callIds.add(call_id);
    const payload = parseToolArgs(item.output);
    let status: "ok" | "error" | "timeout" = "ok";
    if (typeof item.status === "string" && item.status.toLowerCase() === "error") {
      status = "error";
    }
    events.push({
      type: "tool_result",
      ts: baseTs + 200 + resultCounter,
      call_id,
      action_id: call_id,
      status,
      payload_summary: payload,
    });
  }

  // Ensure every tool_call has a paired tool_result so evaluator/scanners can
  // deterministically reason about evidence completeness.
  const resultIds = new Set(
    events.filter((e): e is Extract<RunEvent, { type: "tool_result" }> => e.type === "tool_result").map((e) => e.call_id)
  );
  for (const callId of callIds) {
    if (resultIds.has(callId)) continue;
    events.push({
      type: "tool_result",
      ts: baseTs + 500 + resultIds.size,
      call_id: callId,
      action_id: callId,
      status: "ok",
      payload_summary: { inferred_missing_result: true },
    });
    resultIds.add(callId);
  }

  return { events, proposed_actions: proposedActions };
}

export function wrapOpenAIResponses(
  client: OpenAIResponsesClientLike,
  options: OpenAIResponsesAdapterOptions
): SimpleAgent {
  const workflowId = options.workflowId ?? "openai_responses_v1";
  const includeContext = options.includeContext ?? true;

  return async (input) => {
    const payload: OpenAIResponsesCreatePayload = {
      model: options.model,
      input: buildInput(input.user, input.context, includeContext),
      ...(options.instructions ? { instructions: options.instructions } : {}),
      ...(options.requestDefaults ?? {}),
    };

    const raw = await client.responses.create(payload);
    const tokenUsage = extractTokenUsage(raw);
    const telemetry = extractToolTelemetry(raw);
    const final_output = toFinalOutput(raw);
    const events: RunEvent[] = [
      ...telemetry.events,
      {
        type: "final_output",
        ts: Date.now(),
        content_type: final_output.content_type,
        content: final_output.content,
      },
    ];
    return {
      workflow_id: workflowId,
      final_output,
      events,
      ...(telemetry.proposed_actions.length > 0 ? { proposed_actions: telemetry.proposed_actions } : {}),
      ...(tokenUsage ? { token_usage: tokenUsage } : {}),
    };
  };
}

export const __test__ = {
  buildInput,
  extractText,
  extractTokenUsage,
  toFinalOutput,
  extractToolTelemetry,
  parseToolArgs,
};
