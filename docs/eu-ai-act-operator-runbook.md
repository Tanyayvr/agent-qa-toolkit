# EU AI Act Operator Runbook

This runbook explains how to generate, verify, and hand off the EU AI Act evidence bundle from one product-grade command.
If you only need the core evidence pack without EU-specific exports, use [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md).

## Goal

Produce one report directory that contains:

- standard evaluator artifacts
- EU AI Act compliance exports
- release governance outputs
- post-market monitoring output

## Prerequisites

- completed intake files (`system-scope.json`, `quality-contract.json`) if this is the first serious onboarding cycle
- working `cases.json`
- baseline run directory
- new run directory
- EU AI Act compliance profile
- trend ingestion enabled if you want `post-market-monitoring.json` to include current history

Default profile:

- `docs/compliance-profile-eu-ai-act.json`

Recommended upstream intake flow for first-time onboarding:

```bash
npm run intake:init -- --profile support --euDossierRequired 1
npm run intake:validate -- --profile support
npm run intake:scaffold:cases -- --profile support
npm run intake:check:cases -- --profile support --cases cases/support.completed.json
npm run intake:check:adapter -- --profile support --cases cases/support.completed.json --baseUrl http://127.0.0.1:8788
npm run intake:check:runs -- --profile support --cases cases/support.completed.json --baselineDir apps/runner/runs/baseline/r1 --newDir apps/runner/runs/new/r1
```

This does not replace human review.
It structures the non-automated inputs before the EU dossier path begins, verifies that the adapter can satisfy the required telemetry depth on a reviewed canary, and checks that baseline/new run inputs are structurally comparable before dossier packaging.
`intake:check:cases` also writes `ops/intake/<profile>/cases-coverage.json` so the reviewed coverage summary survives into later review and handoff.
`intake:check:adapter` also writes `ops/intake/<profile>/adapter-capability.json` so the proven adapter evidence depth survives into later review and handoff.
`intake:check:runs` also writes `ops/intake/<profile>/run-fingerprint.json` so the comparable baseline/new pair keeps a durable environment fingerprint before EU packaging.
`review:check` also writes `ops/intake/<profile>/corrective-action-register.json` so repeated residual gaps stay linked across recurring governance cycles.

## Recommended Command

```bash
npm run compliance:eu-ai-act -- \
  --cases cases/agents/autonomous-cli-agent-quality.json \
  --baselineDir apps/runner/runs/baseline/r1 \
  --newDir apps/runner/runs/new/r1 \
  --outDir apps/evaluator/reports/eu-ai-act-demo \
  --reportId eu-ai-act-demo \
  --trend-db .agent-qa/trend.sqlite
```

What this does:

- injects `docs/compliance-profile-eu-ai-act.json` by default
- snapshots `cases.json`, baseline run, and new run into `_source_inputs/` inside the report directory
- runs the evaluator
- verifies the resulting bundle with the EU AI Act verify gate
- exits non-zero if packaging or verification fails

Important:

- do not pass `--no-trend` if you want post-market monitoring to include the current run
- use a stable `--trend-db` path across recurring runs
- keep `environment.agent_id` and `environment.model` populated so monitoring scope is not ambiguous
- use `--no-verify` only for debugging or fixture generation, not for handoff
- use `--verify-strict` only when you also want strict PVIP checks

## Verification-Only Command

If the bundle already exists and you want to re-check it before handoff:

```bash
npm run compliance:eu-ai-act:verify -- --reportDir apps/evaluator/reports/eu-ai-act-demo
```

For strict mode:

```bash
npm run compliance:eu-ai-act:verify:strict -- --reportDir apps/evaluator/reports/eu-ai-act-demo
```

## Structured Review Handoff

After packaging, scaffold the human-owned review layer inside the same EU bundle:

```bash
npm run review:init -- --reportDir apps/evaluator/reports/eu-ai-act-demo --profile support
```

That creates:

- `review/review-decision.json`
- `review/handoff-note.md`
- `review/intake/system-scope.json` and `review/intake/quality-contract.json` when an intake profile is supplied
- optional `review/intake/corrective-action-register.json` when continuity exists or is created on successful check

Then complete the review record and validate it:

```bash
npm run review:check -- --reportDir apps/evaluator/reports/eu-ai-act-demo --profile support
```

This check fails if:

- the decision is still `pending`
- `TODO` placeholders remain in the JSON record or handoff note
- machine-derived residual gaps are still `open`
- block-severity machine gaps are accepted without explicit override
- legal review is requested but no legal-review reason is filled
- the Article 13, Article 17, or Article 72 owner-completion sections are still `pending`
- any required input inside those owner-completion sections is still `pending`
- scaffold residual gaps were not explicitly acknowledged by a named owner

On a successful check with an attached intake profile, the toolkit also syncs the recurring corrective-action register back into `ops/intake/<profile>/`.

## Deterministic Demo And Surface Gate

For a buyer-facing or site demo that includes seeded monitoring history:

```bash
npm run demo:eu-ai-act
```

For the release-grade EU vertical gate:

```bash
npm run release:gate:eu-ai-act
```

Those commands use committed fixtures and freeze the monitoring/dossier path that sales and CI rely on.

## Expected Outputs

Minimum review package:

- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`
- `review/review-decision.json`
- `review/handoff-note.md`
- `ops/intake/<profile>/corrective-action-register.json` when review continuity is tracked
- `compliance/eu-ai-act-coverage.json`
- `compliance/eu-ai-act-annex-iv.json`
- `compliance/eu-ai-act-report.html`
- `compliance/evidence-index.json`
- `compliance/article-13-instructions.json`
- `compliance/article-9-risk-register.json`
- `compliance/article-17-qms-lite.json`
- `compliance/article-72-monitoring-plan.json`
- `compliance/human-oversight-summary.json`
- `compliance/release-review.json`
- `compliance/post-market-monitoring.json`

## What Each Compliance File Is For

- `eu-ai-act-coverage.json`: clause-by-clause coverage and residual gaps
- `eu-ai-act-annex-iv.json`: dossier-style structured export
- `eu-ai-act-report.html`: human-readable compliance view
- `evidence-index.json`: selector-to-artifact map
- `article-13-instructions.json`: technical scaffold for instructions-for-use and operator notes
- `article-9-risk-register.json`: machine-derived risk register entries for review and completion
- `article-17-qms-lite.json`: technical scaffold for change control, release governance, monitoring, and document-control procedures
- `article-72-monitoring-plan.json`: technical scaffold for cadence, escalation, and monitoring ownership
- `human-oversight-summary.json`: approval/block review queue
- `release-review.json`: release sign-off view
- `post-market-monitoring.json`: longitudinal monitoring and drift evidence

## Operator Checks Before Handoff

Check these fields first:

- `compare-report.json.summary.execution_quality.status`
- `compare-report.json.summary.cases_requiring_approval`
- `compare-report.json.summary.cases_block_recommended`
- `compare-report.json.quality_flags.self_contained`
- `compare-report.json.quality_flags.portable_paths`
- `compliance/release-review.json.release_decision.status`
- `compliance/post-market-monitoring.json.summary.monitoring_status`

If any of these are bad, the bundle is still useful, but the handoff note must say so explicitly.

## Recommended Operating Pattern

For one-off release evidence:

1. run `npm run compliance:eu-ai-act -- ...`
2. confirm the command exits with `Status: OK`
3. review `article-13-instructions.json`, `article-9-risk-register.json`, `article-17-qms-lite.json`, `article-72-monitoring-plan.json`, `release-review.json`, and `human-oversight-summary.json`
4. hand off the package with scope boundaries stated

For recurring monitoring:

1. reuse the same trend DB path
2. run `npm run compliance:eu-ai-act -- ...` on each release candidate or recurring monitoring cadence
3. attach `post-market-monitoring.json`, `article-17-qms-lite.json`, and `article-72-monitoring-plan.json` to governance review
4. compare drift against the previous release before promotion

## Suggested Cadence

For active agents:

- release candidate: every meaningful change to prompt, tools, model, or workflow
- post-release monitoring: weekly or per governance checkpoint
- incident or drift review: immediately after regressions, new approval queues, or new blocking cases

## Grouped Review Package

If multiple agent runs belong to one incident or one governance review, generate a group bundle after the runs complete:

```bash
npm run bundle:group -- \
  --groupId eu-ai-act-review-2026-03-14 \
  --outDir apps/evaluator/reports/groups/eu-ai-act-review-2026-03-14 \
  --report primary=apps/evaluator/reports/eu-ai-act-demo \
  --report canary=apps/evaluator/reports/eu-ai-act-canary
```

That is useful for:

- multi-agent workflow review
- canary vs primary release review
- quarterly governance package assembly

## Scope Warning

This bundle is technical evidence.
It is not a substitute for:

- legal classification
- deployer instructions authored outside the evaluator
- formal declaration workflows

Use it as input to those workflows, not as a replacement for them.

## Related Docs

- [EU AI Act Buyer Guide](eu-ai-act-buyer-guide.md)
- [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md)
- [EU AI Act Review Handoff Checklist](eu-ai-act-review-handoff-checklist.md)
- [EU AI Act Self-Hosted Guidance](eu-ai-act-self-hosted-guidance.md)
