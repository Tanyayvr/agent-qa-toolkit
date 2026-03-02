# Vendor Bridge Fixtures

Sample payloads for bridge conversion demos:

- `promptfoo-baseline.json`
- `promptfoo-candidate.json`
- `deepeval-sample.json`
- `giskard-sample.json`

## Quick conversion

```bash
npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-baseline.json --out /tmp/promptfoo-baseline.bridge.json --runId promptfoo_base
npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-candidate.json --out /tmp/promptfoo-candidate.bridge.json --runId promptfoo_candidate
npm run bridge -- diff --baseline /tmp/promptfoo-baseline.bridge.json --candidate /tmp/promptfoo-candidate.bridge.json --out /tmp/promptfoo.diff.json --runId promptfoo_base_vs_candidate
```
