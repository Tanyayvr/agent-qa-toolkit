# Chronology of Capability Gains

This file is a due-diligence timeline for technical buyers.
Each row links a real commit to a measurable outcome and a reproducible command.

## Measurement Rules

- Use immutable commit SHAs.
- Prefer metrics that can be recomputed from code or release artifacts.
- Keep "before/after" values tied to the same metric definition.
- If a metric was not tracked at that date, mark as `n/a` and do not estimate.
- Use `npm run metrics:dd` to generate a machine-readable metrics snapshot (tests/coverage/LOC).

## Timeline

| Date | Commit | Capability change | Metric before | Metric after | Measurement command | Evidence artifact |
|---|---|---|---:|---:|---|---|
| 2026-02-25 | `a5b84ba` | Baseline checkpoint before production-readiness wave | n/a | checkpoint created | `git show --name-only a5b84ba` | Git history |
| 2026-03-02 | `792fa5a` | Production-readiness integration (runner/evaluator decomposition, adapters, gates, docs) | n/a | integrated baseline | `git show --name-only 792fa5a` | Git history |
| 2026-03-03 | working tree after `792fa5a` | Branch coverage lifted above 80% | 70.68% (audit baseline) | 80.29% | `npm run test:coverage` | `coverage` summary in CI log |
| 2026-03-03 | working tree after `792fa5a` | Test surface expansion | 16 test/spec files at `a5b84ba` | 58 test/spec files | `git ls-tree -r --name-only a5b84ba \| rg '(test\|spec)\\.(ts\|tsx\|js\|mjs)$' \| wc -l` and `rg --files \| rg '(test\|spec)\\.(ts\|tsx\|js\|mjs)$' \| wc -l` | Git tree + working tree |
| 2026-03-03 | working tree after `792fa5a` | Runner orchestration size reduction | `runner.ts` 1263 LOC at `a5b84ba` | `runner.ts` 841 LOC | `git show a5b84ba:apps/runner/src/runner.ts \| wc -l` and `wc -l apps/runner/src/runner.ts` | Source tree |
| 2026-03-03 | working tree after `792fa5a` | Evaluator entrypoint simplification | `evaluator.ts` 1384 LOC at `a5b84ba` | `evaluator.ts` 10 LOC (pipeline moved) | `git show a5b84ba:apps/evaluator/src/evaluator.ts \| wc -l` and `wc -l apps/evaluator/src/evaluator.ts` | Source tree |
| 2026-03-03 | working tree after `792fa5a` | HTML report renderer decomposition | `htmlReport.ts` 1194 LOC at `a5b84ba` | `htmlReport.ts` 424 LOC | `git show a5b84ba:apps/evaluator/src/htmlReport.ts \| wc -l` and `wc -l apps/evaluator/src/htmlReport.ts` | Source tree |
| 2026-03-03 | working tree after `792fa5a` | Security gate hardening | high/critical unknown | 0 high/critical vulnerabilities | `npm audit --audit-level=high` | Audit command output |

## Notes for Buyers

- A commit row is useful only with the corresponding run/report artifact.
- For runtime claims, always pair this timeline with:
  - `apps/evaluator/reports/<report_id>/compare-report.json`
  - `apps/evaluator/reports/<report_id>/report.html`
  - `apps/evaluator/reports/<report_id>/trend.html`
- For deterministic replication steps, see `docs/VERIFY.md`.
