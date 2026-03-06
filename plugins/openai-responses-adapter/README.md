# openai-responses-adapter

Wraps OpenAI Responses API client into `agent-sdk` `SimpleAgent`.

## Usage

```ts
import { wrapOpenAIResponses } from "openai-responses-adapter";

const agent = wrapOpenAIResponses(client, {
  model: "gpt-4.1-mini",
  instructions: "Be concise",
});
```

## Reliability

- Extracts text from `output_text` and common `output[].content[].text` blocks.
- Falls back to JSON output when text is unavailable.
- Propagates token usage when present (`input_tokens`, `output_tokens`, `total_tokens`).
- Maps `function_call` / `function_call_output` to deterministic `tool_call` / `tool_result` events.
- Ensures every tool call has paired tool result evidence (synthetic fallback when provider omits output).

## Security

- Adapter does not bypass runner/evaluator policy checks; it emits contract telemetry for policy and scanner layers.
- Secrets/API key handling remains at caller/client layer; adapter does not store credentials.

## Limitations

- This package assumes Responses-like payload shapes; non-standard provider forks may require wrapper-level normalization.
- Retry/timeout transport policy is not in this adapter; configure in runner/adapter runtime path.
