# Integration Template

## Adapters (in-repo plugins)
Reference adapters live in this repo under:

- `plugins/langchain-adapter`
- `plugins/openai-responses-adapter`
- `plugins/otel-anchor-adapter`
- `plugins/vendor-bridge` (Promptfoo / DeepEval / Giskard)

## Stack
- Framework / SDK:
- Agent runtime:
- Tools / APIs:

## Endpoint
- `POST /run-case`:
- Auth headers (if any):

## Vendor Bridge
- Convert vendor results into canonical bridge runs:
  - `npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-baseline.json --out /tmp/promptfoo-baseline.bridge.json`
  - `npm run bridge -- convert --vendor deepeval --in examples/vendor-bridge/deepeval-sample.json --out /tmp/deepeval.bridge.json`
  - `npm run bridge -- convert --vendor giskard --in examples/vendor-bridge/giskard-sample.json --out /tmp/giskard.bridge.json`
- Compare baseline vs candidate bridge runs:
  - `npm run bridge -- diff --baseline /tmp/promptfoo-baseline.bridge.json --candidate /tmp/promptfoo-candidate.bridge.json --out /tmp/promptfoo.diff.json`

## Environment
- Required env vars:

## One-command run
```bash
npm run demo
```
