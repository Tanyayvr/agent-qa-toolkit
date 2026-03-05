# 22. Goose Synthetic Validation (Mar 04, 2026)

## Scope

This note captures two validation tracks used before outreach:

1. **Agent compatibility run** on Goose (`goose + ollama`) using quality cases.
2. **Synthetic stress run** using deterministic failure injection (`cases/matrix.json`) to validate toolkit failure taxonomy and CI gate behavior.

Purpose: prove toolkit execution reliability and produce reproducible evidence before requesting partner data access.

## Environment

- Date: 2026-03-04
- Repo: `https://github.com/Tanyayvr/agent-qa-toolkit`
- Local stack:
  - Runner + Evaluator + Trend (this repo)
  - Goose CLI with local Ollama backend (`qwen2.5:7b`) for compatibility pass
  - Demo agent on `:8791` for deterministic matrix injection pass

## Track A: Goose Compatibility Run (Local Model)

- Report IDs:
  - `goose-ollama-20260304_154542`
  - `goose-ollama-20260304_154542-2`
  - `goose-ollama-20260304_154542-3`

### Results

- `execution_quality.status`: `healthy` (all 3 reports)
- `baseline_transport_success_rate`: `1.0`
- `new_transport_success_rate`: `1.0`
- `baseline_runner_failures`: `0`
- `new_runner_failures`: `0`
- `regressions`: `0`
- `baseline_pass/new_pass`: `4/4` across each comparison

Interpretation:
- The toolkit pipeline worked end-to-end against Goose runtime.
- This validates integration and baseline operability.
- This is not yet a proof for Goose production quality stack (their target hosted model/config may differ).

## Track B: Synthetic Matrix Stress Run (Deterministic Failures)

- Report IDs:
  - `matrix-demo-20260304_165654`
  - `matrix-demo-20260304_165654-2`
  - `matrix-demo-20260304_165654-3`
- Case set: `6` matrix cases:
  - `matrix_net_http_500_small`
  - `matrix_net_timeout`
  - `matrix_net_drop`
  - `matrix_data_invalid_json`
  - `matrix_data_missing_fields`
  - `matrix_data_large_json_5mb`

### Results

- `execution_quality.status`: `degraded` (all 3 reports, expected)
- `baseline_transport_success_rate`: `0.167`
- `new_transport_success_rate`: `0.167`
- `baseline_runner_failures`: `5`
- `new_runner_failures`: `5`
- Failure classes detected consistently:
  - `http_error`: `1`
  - `timeout`: `1`
  - `network_error`: `1`
  - `invalid_json`: `2`

Interpretation:
- Degraded gate was correctly triggered.
- Failure taxonomy and conservative pass semantics behaved as designed.
- This provides strong deterministic evidence that the toolkit catches infra/data breakage classes.

## Library Ingest

All above reports are ingested into private library:

- `.agent-qa/library/runs/20260304_233806__goose-ollama-20260304_154542`
- `.agent-qa/library/runs/20260304_233809__goose-ollama-20260304_154542-2`
- `.agent-qa/library/runs/20260304_233812__goose-ollama-20260304_154542-3`
- `.agent-qa/library/runs/20260304_235818__matrix-demo-20260304_165654`
- `.agent-qa/library/runs/20260304_235820__matrix-demo-20260304_165654-2`
- `.agent-qa/library/runs/20260304_235823__matrix-demo-20260304_165654-3`

## Outreach Positioning (What We Can Offer)

What is proven now:
- Fast integration and stable run/eval artifacts.
- Deterministic classification for key failure modes.
- Report package suitable for CI gate and engineering review.

What still needs partner collaboration:
- Run on partner's production model/provider/config.
- Compare against partner's real run artifacts/logs for release-grade conclusions.

## Suggested Attachments for Outreach

1. `apps/evaluator/reports/goose-ollama-20260304_154542/report.html`
2. `apps/evaluator/reports/goose-ollama-20260304_154542/compare-report.json`
3. `apps/evaluator/reports/matrix-demo-20260304_165654/report.html`
4. `apps/evaluator/reports/matrix-demo-20260304_165654/compare-report.json`
5. Public repo: `https://github.com/Tanyayvr/agent-qa-toolkit`
