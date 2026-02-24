<!-- /docs/redaction.md -->
# Redaction (Runner Truth)

This document clarifies where redaction is applied and how it is verified.

## Source of Truth

- **Production truth** is the runner.
- The runner applies redaction **before** writing artifacts.
- The evaluator **derives** redaction status from `run.json` and does not infer it from CLI flags.

## Required Runner Metadata

`run.json` must include:

- `redaction_applied: boolean`
- `redaction_preset_id?: string` (required when `redaction_applied=true`)

## Evaluator Output

When `redaction_applied=true`, the evaluator sets:

- `summary.quality.redaction_status = "applied"`
- `summary.quality.redaction_preset_id` (if present in `run.json`)
- `artifacts/redaction-summary.json` is emitted

If `redaction_applied=false`, the evaluator sets:

- `summary.quality.redaction_status = "none"`

## Strict Redaction Gate

`--strictRedaction` is a **safety gate**, not a source of truth.

- It scans the contents of **all files referenced by** `artifacts/manifest.json`
- It fails the run if residual sensitive markers are found

## Notes

- The agent does **not** need to implement or honor `x-redaction-preset`.
- The demo agent uses that header only for validation/testing.
