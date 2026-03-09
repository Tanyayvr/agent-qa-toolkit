import type { SimpleAgent } from "agent-sdk";
import type { AssumptionState, FinalOutput, ProposedAction, RunEvent } from "shared-types";

export type LangChainRunnable<TInput = unknown, TOutput = unknown, TConfig = unknown> = {
  invoke: (input: TInput, config?: TConfig) => Promise<TOutput> | TOutput;
};

export type LangChainAdapterOptions<TInput = unknown, TOutput = unknown, TConfig = unknown> = {
  inputKey?: string;
  invokeConfig?: TConfig;
  workflowId?: string;
  outputMode?: "auto" | "text" | "json";
  mapInput?: (input: { user: string; context?: unknown }) => TInput;
  mapOutput?: (output: TOutput) => FinalOutput;
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

function textFromOutput(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const parts = raw
      .map((item) => (typeof item === "string" ? item : isRecord(item) && typeof item.text === "string" ? item.text : ""))
      .filter((x) => x.length > 0);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (!isRecord(raw)) return null;

  if (typeof raw.content === "string") return raw.content;
  if (typeof raw.text === "string") return raw.text;
  if (typeof raw.output === "string") return raw.output;

  if (Array.isArray(raw.content)) {
    const chunks = raw.content
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        if (!isRecord(chunk)) return "";
        if (typeof chunk.text === "string") return chunk.text;
        if (typeof chunk.content === "string") return chunk.content;
        return "";
      })
      .filter((x) => x.length > 0);
    if (chunks.length > 0) return chunks.join("\n");
  }

  return null;
}

function toFinalOutput(raw: unknown, mode: "auto" | "text" | "json"): FinalOutput {
  if (mode === "json") return { content_type: "json", content: raw };

  const text = textFromOutput(raw);
  if (mode === "text") {
    return { content_type: "text", content: text ?? JSON.stringify(raw) };
  }

  if (text !== null) return { content_type: "text", content: text };
  return { content_type: "json", content: raw };
}

type ToolTrace = {
  tool: string;
  call_id: string;
  args: Record<string, unknown>;
  status: "ok" | "error" | "timeout";
  payload_summary?: Record<string, unknown> | string;
};

function countToolHintsFromRecord(raw: Record<string, unknown>): number {
  let count = 0;
  const directToolCalls = Array.isArray(raw.tool_calls)
    ? raw.tool_calls
    : Array.isArray(raw.toolCalls)
      ? raw.toolCalls
      : [];
  count += directToolCalls.length;

  const directSteps = Array.isArray(raw.intermediate_steps)
    ? raw.intermediate_steps
    : Array.isArray(raw.intermediateSteps)
      ? raw.intermediateSteps
      : [];
  count += directSteps.length;

  const additionalKwargs = isRecord(raw.additional_kwargs)
    ? raw.additional_kwargs
    : isRecord(raw.additionalKwargs)
      ? raw.additionalKwargs
      : null;
  if (additionalKwargs) {
    const hinted = Array.isArray(additionalKwargs.tool_calls)
      ? additionalKwargs.tool_calls
      : Array.isArray(additionalKwargs.toolCalls)
        ? additionalKwargs.toolCalls
        : [];
    count += hinted.length;
  }

  return count;
}

function collectToolHintCount(raw: unknown): number {
  if (!isRecord(raw)) return 0;
  let count = countToolHintsFromRecord(raw);
  const messages = Array.isArray(raw.messages) ? raw.messages : [];
  for (const msg of messages) {
    if (!isRecord(msg)) continue;
    count += countToolHintsFromRecord(msg);
  }
  return count;
}

function extractLangChainToolTraces(raw: unknown): ToolTrace[] {
  if (!isRecord(raw)) return [];
  const out: ToolTrace[] = [];

  const toolCallsRaw = Array.isArray(raw.tool_calls)
    ? raw.tool_calls
    : Array.isArray(raw.toolCalls)
      ? raw.toolCalls
      : [];
  for (let i = 0; i < toolCallsRaw.length; i += 1) {
    const item = toolCallsRaw[i];
    if (!isRecord(item)) continue;
    const rawName =
      (typeof item.name === "string" && item.name) ||
      (typeof item.tool === "string" && item.tool) ||
      (typeof item.tool_name === "string" && item.tool_name) ||
      "";
    const tool = rawName.trim();
    if (!tool) continue;
    const call_id =
      (typeof item.id === "string" && item.id.trim().length > 0 ? item.id : undefined) ??
      (typeof item.call_id === "string" && item.call_id.trim().length > 0 ? item.call_id : undefined) ??
      `lc_call_${i + 1}`;
    out.push({
      tool,
      call_id,
      args: parseToolArgs(item.args ?? item.arguments ?? item.input ?? {}),
      status: "ok",
    });
  }

  const stepsRaw = Array.isArray(raw.intermediate_steps)
    ? raw.intermediate_steps
    : Array.isArray(raw.intermediateSteps)
      ? raw.intermediateSteps
      : [];
  for (let i = 0; i < stepsRaw.length; i += 1) {
    const step = stepsRaw[i];
    const stepObj = isRecord(step) ? step : null;
    const action = isRecord(stepObj?.action) ? (stepObj.action as Record<string, unknown>) : stepObj;
    if (!action) continue;
    const rawTool =
      (typeof action.tool === "string" && action.tool) ||
      (typeof action.name === "string" && action.name) ||
      "";
    const tool = rawTool.trim();
    if (!tool) continue;
    const call_id =
      (typeof action.log_id === "string" && action.log_id.trim().length > 0 ? action.log_id : undefined) ??
      (typeof action.id === "string" && action.id.trim().length > 0 ? action.id : undefined) ??
      `lc_step_${i + 1}`;
    const observation =
      stepObj && "observation" in stepObj ? (stepObj.observation as unknown) : undefined;
    out.push({
      tool,
      call_id,
      args: parseToolArgs(action.toolInput ?? action.tool_input ?? action.input ?? {}),
      status: "ok",
      ...(observation !== undefined ? { payload_summary: parseToolArgs(observation) } : {}),
    });
  }

  return out;
}

function buildTelemetry(raw: unknown): {
  events: RunEvent[];
  proposed_actions: ProposedAction[];
  telemetry_mode: "native" | "wrapper_only";
  assumption_state: AssumptionState;
} {
  const traces = extractLangChainToolTraces(raw);
  if (traces.length === 0) {
    const hintedToolRecords = collectToolHintCount(raw);
    if (hintedToolRecords > 0) {
      throw new Error(
        `invalid_telemetry: detected ${hintedToolRecords} tool trace candidate(s) but extracted 0 tool events`
      );
    }
    return {
      events: [],
      proposed_actions: [],
      telemetry_mode: "wrapper_only",
      assumption_state: { selected: [], rejected: [] },
    };
  }
  const baseTs = Date.now();
  const events: RunEvent[] = [];
  const proposedActions: ProposedAction[] = [];

  for (let i = 0; i < traces.length; i += 1) {
    const t = traces[i];
    if (!t) continue;
    const ts = baseTs + i;
    events.push({
      type: "tool_call",
      ts,
      call_id: t.call_id,
      action_id: t.call_id,
      tool: t.tool,
      args: t.args,
    });
    events.push({
      type: "tool_result",
      ts: ts + 1,
      call_id: t.call_id,
      action_id: t.call_id,
      status: t.status,
      ...(t.payload_summary !== undefined ? { payload_summary: t.payload_summary } : {}),
    });
    proposedActions.push({
      action_id: t.call_id,
      action_type: "tool_call",
      tool_name: t.tool,
      params: t.args,
      risk_level: "low",
      evidence_refs: [{ kind: "tool_result", call_id: t.call_id }],
    });
  }

  const assumptionState: AssumptionState = {
    selected: traces.map((t) => ({
      kind: "tool",
      candidate_id: t.call_id,
      decision: "selected",
      reason_code: "selected_by_agent",
      tool_name: t.tool,
      details: { args: t.args },
    })),
    rejected: [],
  };

  return {
    events,
    proposed_actions: proposedActions,
    telemetry_mode: "native",
    assumption_state: assumptionState,
  };
}

export function wrapLangChainRunnable<TInput = unknown, TOutput = unknown, TConfig = unknown>(
  runnable: LangChainRunnable<TInput, TOutput, TConfig>,
  options: LangChainAdapterOptions<TInput, TOutput, TConfig> = {}
): SimpleAgent {
  const inputKey = options.inputKey ?? "input";
  const outputMode = options.outputMode ?? "auto";
  const workflowId = options.workflowId ?? "langchain_runnable_v1";

  return async (input) => {
    const runnableInput =
      options.mapInput?.(input) ??
      ({
        [inputKey]: input.user,
        ...(input.context !== undefined ? { context: input.context } : {}),
      } as unknown as TInput);

    const rawOutput = await runnable.invoke(runnableInput, options.invokeConfig);
    const final_output = options.mapOutput?.(rawOutput) ?? toFinalOutput(rawOutput, outputMode);
    const telemetry = buildTelemetry(rawOutput);
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
      final_output,
      events,
      ...(telemetry.proposed_actions.length > 0 ? { proposed_actions: telemetry.proposed_actions } : {}),
      telemetry_mode: telemetry.telemetry_mode,
      assumption_state: telemetry.assumption_state,
      workflow_id: workflowId,
    };
  };
}

export const __test__ = {
  textFromOutput,
  toFinalOutput,
  parseToolArgs,
  collectToolHintCount,
  extractLangChainToolTraces,
  buildTelemetry,
};
