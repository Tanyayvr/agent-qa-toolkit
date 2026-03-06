# langchain-adapter

Wraps a LangChain-style runnable (`invoke`) into `agent-sdk` `SimpleAgent`.

## Usage

```ts
import { wrapLangChainRunnable } from "langchain-adapter";

const agent = wrapLangChainRunnable(runnable, {
  inputKey: "input",
  outputMode: "auto",
});
```

## Reliability

- Adapter itself is deterministic and stateless; runtime timeout/retry behavior is controlled by runner/adapter layer.
- Tool telemetry is extracted from common LangChain tool-call shapes (`tool_calls`, `intermediate_steps`) and emitted as contract events.
- If no tool-call telemetry is present in runnable output, only `final_output` event is emitted.

## Security

- No direct runtime dependency on LangChain packages; no hidden network calls inside wrapper.
- Security/redaction enforcement remains in runner/evaluator pipeline (scanner/policy gates), this adapter only maps payloads to contract.

## Limitations

- This adapter does not execute tools itself; it only maps runnable output to `SimpleAgent` contract.
- If your runnable returns non-standard tool metadata, extraction may be partial; use `mapOutput` for custom shaping when needed.

## Notes

- Works with any object that implements `invoke(input, config?)`.
