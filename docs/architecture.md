<!-- /docs/architecture.md -->
# Architecture (Public Overview)

## Core pipeline

1) **Runner** executes cases against `/run-case` and writes artifacts to `apps/runner/runs/*`.
2) **Evaluator** compares baseline vs new, produces HTML + JSON report under `apps/evaluator/reports/*`.
3) **Evidence pack** is the report directory (manifest + assets + report.html + compare-report.json).

## Drift / flakiness scenarios

- **Token usage tracking**: agents may return `token_usage` (input/output/total tokens, tool call count, loop flag).
- **Loop detection**: runner computes similarity‑breaker + output‑hash signals and reports `token_usage.loop_details`.
  Runner persists this per run and aggregates per‑case in `flakiness.json` when `--runs > 1`.
- **Flakiness detection (`--runs N`)**: runner executes each case N times and writes `flakiness.json`
  with `baseline_pass_rate` / `new_pass_rate` and optional token usage aggregates.
- **Prompt version tracing**: runner captures Git context (`git_commit`, `git_branch`, `git_dirty`)
  and writes it into `run.json` / `flakiness.json`.
- **Overnight drift CI**: `.github/workflows/agent-drift-detection.yml` runs nightly or on‑demand
  and gates on `cases_block_recommended` / `cases_requiring_approval`.
