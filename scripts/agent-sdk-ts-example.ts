// scripts/agent-sdk-ts-example.ts
import { createRunCaseServer, wrapSimpleAgent } from "../packages/agent-sdk/src";
import type { FinalOutput } from "shared-types";

const agent = async ({ user }: { user: string }) => {
  const final_output: FinalOutput = { content_type: "text", content: `ok: ${user}` };
  return {
    workflow_id: "example_agent_v1",
    final_output,
    events: [],
  };
};

createRunCaseServer({
  port: 8787,
  handler: wrapSimpleAgent(agent),
});

console.log("agent-sdk example listening on http://localhost:8787");
