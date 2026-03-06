# vendor-bridge

Vendor-agnostic import bridge for external eval tools.

Current connectors:

- Promptfoo -> bridge run
- DeepEval -> bridge run
- Giskard -> bridge run

The bridge normalizes vendor payloads into a deterministic contract that can be compared and gated.

## Usage

```ts
import {
  parsePromptfooRun,
  parseDeepEvalRun,
  parseGiskardRun,
  compareBridgeRuns,
} from "vendor-bridge";

const baseline = parsePromptfooRun(promptfooBaselineJson, { runId: "pf-base" });
const candidate = parsePromptfooRun(promptfooCandidateJson, { runId: "pf-new" });

const diff = compareBridgeRuns({ baseline, candidate, runId: "pf-base-vs-new" });
```

Gate semantics are conservative:

- failing case -> `block`
- passing case with high risk or weak assertions -> `require_approval`
- passing case with strong assertions -> `none`

## Reliability

- Deterministic normalization: all supported vendor payloads are mapped into one canonical run schema before diffing.
- Case-level gate behavior is deterministic (`block` / `require_approval` / `none`) from normalized risk metadata.
- Diff output is stable for the same baseline/candidate inputs and run metadata.

## Security

- Bridge only parses and compares JSON payloads; it does not execute external tools or network calls.
- Upstream scanner/policy gates remain authoritative for runtime/tool security decisions.

## Limitations

- Only documented connector shapes are supported (`Promptfoo`, `DeepEval`, `Giskard`); custom exports may need pre-normalization.
- This bridge provides evaluation import/diff logic, not live runtime telemetry capture.
