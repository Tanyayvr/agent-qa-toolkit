<!-- /RELEASE_NOTES.md -->
# Release Notes (v5 Production Pipeline Readiness)

## Summary

This release focuses on production pipeline readiness for report contract v5:
redaction in runner, strict validation gates in evaluator, and expanded test
coverage for network/data edge cases.

## Highlights

- Runner redaction with `--redactionPreset` and machine-proven metadata in `run.json`
- Optional raw retention using `--keepRaw` (explicit opt-in, warned)
- Evaluator strict gates: `--strictPortability`, `--strictRedaction`
- Demo-agent matrix cases for transport/data/size/structure testing
- Loadtest improvements: `--allowFail` classification and redaction header passthrough
- Contract types unified in `packages/shared-types`

## Verification (production pipeline)

```bash
npm -w runner run dev -- --baseUrl http://localhost:8788 --cases cases/cases.json \
  --outDir apps/runner/runs --runId redaction_test --redactionPreset transferable

npm -w evaluator run dev -- --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/redaction_test \
  --newDir apps/runner/runs/new/redaction_test \
  --outDir apps/evaluator/reports/redaction_test \
  --reportId redaction_test \
  --transferClass internal_only \
  --strictPortability --strictRedaction
```

Expected outcomes:
- `compare-report.json` includes `redaction_status: applied` and `redaction_preset_id`
- `artifacts/redaction-summary.json` exists
- Strict gates do not fail

## Notes

- `--keepRaw` stores unsanitized responses under `_raw/` and should be avoided for transferable packs.
- `--strictPortability` and `--strictRedaction` are opt-in gates for CI.
