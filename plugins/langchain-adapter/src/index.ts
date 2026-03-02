import type { SimpleAgent } from "agent-sdk";
import type { FinalOutput } from "shared-types";

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

    return {
      final_output,
      workflow_id: workflowId,
    };
  };
}

export const __test__ = {
  textFromOutput,
  toFinalOutput,
};
