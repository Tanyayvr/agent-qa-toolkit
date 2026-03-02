// scripts/agent-sdk-openai-responses-example.ts
import { createRunCaseServer, wrapSimpleAgent } from "../packages/agent-sdk/src/index";
import { wrapOpenAIResponses, type OpenAIResponsesClientLike } from "../plugins/openai-responses-adapter/src/index";

async function loadClient(apiKey: string | undefined): Promise<OpenAIResponsesClientLike> {
  if (!apiKey) {
    return {
      responses: {
        create: async (payload: Record<string, unknown>) => {
          const input = payload.input as string | undefined;
          return { output_text: `Echo (no API key): ${input ?? ""}` };
        },
      },
    };
  }

  try {
    const mod = await import("openai");
    const OpenAI = mod.default;
    return new OpenAI({ apiKey }) as unknown as OpenAIResponsesClientLike;
  } catch {
    throw new Error(
      "OPENAI_API_KEY is set but npm package 'openai' is not installed. Install it to run the real OpenAI Responses example."
    );
  }
}

async function main(): Promise<void> {
  const client = await loadClient(process.env.OPENAI_API_KEY);
  const agent = wrapOpenAIResponses(client, { model: "gpt-4.1-mini" });
  const port = Number(process.env.PORT ?? "8787");
  createRunCaseServer({ port, handler: wrapSimpleAgent(agent) });
  console.log(`openai-responses adapter listening on http://localhost:${port}`);
}

void main();
