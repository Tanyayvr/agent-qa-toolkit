// scripts/agent-sdk-langchain-example.ts
import { createRunCaseServer, wrapSimpleAgent } from "../packages/agent-sdk/src/index";
import {
  wrapLangChainRunnable,
  type LangChainRunnable,
} from "../plugins/langchain-adapter/src/index";

async function loadChain(apiKey: string | undefined): Promise<LangChainRunnable<unknown, unknown, unknown>> {
  if (!apiKey) {
    return {
      invoke: async (input: unknown) =>
        `Echo (no API key): ${typeof input === "object" && input !== null && "input" in input ? String((input as Record<string, unknown>).input ?? "") : ""}`,
    };
  }

  try {
    const { ChatPromptTemplate } = await import("@langchain/core/prompts");
    const { ChatOpenAI } = await import("@langchain/openai");
    const prompt = ChatPromptTemplate.fromTemplate("You are helpful. User: {input}");
    return prompt.pipe(new ChatOpenAI({ model: "gpt-4.1-mini", apiKey })) as unknown as LangChainRunnable<
      unknown,
      unknown,
      unknown
    >;
  } catch {
    throw new Error(
      "OPENAI_API_KEY is set but LangChain packages are not installed. Install '@langchain/core' and '@langchain/openai'."
    );
  }
}

async function main(): Promise<void> {
  const chain = await loadChain(process.env.OPENAI_API_KEY);
  const agent = wrapLangChainRunnable(chain, { inputKey: "input" });
  const port = Number(process.env.PORT ?? "8787");
  createRunCaseServer({ port, handler: wrapSimpleAgent(agent) });
  console.log(`langchain adapter listening on http://localhost:${port}`);
}

void main();
