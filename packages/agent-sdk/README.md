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

## Plugin adapters in this repo

- `plugins/langchain-adapter`
- `plugins/openai-responses-adapter`
- `plugins/otel-anchor-adapter`
- `plugins/vendor-bridge` (Promptfoo / DeepEval / Giskard converters)

Use the runnable examples:

```bash
npx ts-node ../../scripts/agent-sdk-langchain-example.ts
npx ts-node ../../scripts/agent-sdk-openai-responses-example.ts
```
