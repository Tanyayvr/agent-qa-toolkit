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
