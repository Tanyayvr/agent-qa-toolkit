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

## Behavior

- Extracts text from `output_text` and common `output[].content[].text` blocks.
- Falls back to JSON output when text is unavailable.
- Propagates token usage when present (`input_tokens`, `output_tokens`, `total_tokens`).
