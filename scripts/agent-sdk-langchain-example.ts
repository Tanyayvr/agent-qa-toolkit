// scripts/agent-sdk-langchain-example.ts
import { createRunCaseServer, wrapSimpleAgent } from "../packages/agent-sdk/src/index";
import {
  wrapLangChainRunnable,
  type LangChainRunnable,
} from "../plugins/langchain-adapter/src/index";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const prompt = ChatPromptTemplate.fromTemplate("You are helpful. User: {input}");
const apiKey = process.env.OPENAI_API_KEY;

const chain: LangChainRunnable<any, any, any> = apiKey
  ? (prompt.pipe(new ChatOpenAI({ model: "gpt-4.1-mini", apiKey })) as unknown as LangChainRunnable<any, any, any>)
  : ({
      invoke: async (input: any) =>
        `Echo (no API key): ${input?.input ?? ""}`,
    } as LangChainRunnable<any, any, any>);

const agent = wrapLangChainRunnable(chain, { inputKey: "input" });
const port = Number(process.env.PORT ?? "8787");
createRunCaseServer({ port, handler: wrapSimpleAgent(agent) });

console.log(`langchain adapter listening on http://localhost:${port}`);
