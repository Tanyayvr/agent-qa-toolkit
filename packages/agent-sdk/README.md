# Agent SDK (TypeScript)

Minimal adapter to expose `/run-case`.

## Quick start

```bash
npx ts-node ../../scripts/agent-sdk-ts-example.ts
```

> Note: this package uses ESM. Run via `ts-node` or `tsx` (not `node -e require(...)`).

## Usage

```ts
import { createRunCaseServer, wrapSimpleAgent } from "agent-sdk";

const agent = async ({ user }: { user: string }) => ({
  final_output: { content_type: "text", content: `Echo: ${user}` },
  events: [],
});

createRunCaseServer({ port: 8787, handler: wrapSimpleAgent(agent) });
```

## LangChain adapter

LangChain adapter is distributed as a **paid plugin** in `plugins/langchain-adapter`.
See: `docs/integrations/langchain.md`.
