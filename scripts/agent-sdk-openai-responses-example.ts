// scripts/agent-sdk-openai-responses-example.ts
import OpenAI from "openai";
import { createRunCaseServer, wrapSimpleAgent } from "../packages/agent-sdk/src/index";
import { wrapOpenAIResponses } from "../plugins/openai-responses/src/index";

const apiKey = process.env.OPENAI_API_KEY;

const client = apiKey
  ? new OpenAI({ apiKey })
  : ({
      responses: {
        create: async (payload: Record<string, unknown>) => {
          const input = payload.input as string | undefined;
          return { output_text: `Echo (no API key): ${input ?? ""}` };
        },
      },
    } as unknown as OpenAI);

const agent = wrapOpenAIResponses(client, { model: "gpt-4.1-mini" });
createRunCaseServer({ port: Number(process.env.PORT ?? "8787"), handler: wrapSimpleAgent(agent) });

console.log(`openai-responses adapter listening on http://localhost:${process.env.PORT ?? "8787"}`);
