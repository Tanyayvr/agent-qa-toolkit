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

## Notes

- No direct runtime dependency on LangChain packages.
- Works with any object that implements `invoke(input, config?)`.
