import type { SimpleAgent } from "agent-sdk";
import type { FinalOutput, TokenUsage } from "shared-types";

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
    return {
      workflow_id: workflowId,
      final_output: toFinalOutput(raw),
      ...(tokenUsage ? { token_usage: tokenUsage } : {}),
    };
  };
}

export const __test__ = {
  buildInput,
  extractText,
  extractTokenUsage,
  toFinalOutput,
};
