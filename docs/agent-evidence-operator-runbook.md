# Agent Evidence Operator Runbook

This runbook explains how to package and verify the core Agent Evidence bundle without any EU-specific compliance layer.

## Goal

Produce one report directory that contains:

- structured intake artifacts for scope and quality contract
- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`
- `archive/retention-controls.json`
- replay diffs and raw evidence assets
- packaged `_source_inputs/` for portable handoff

## Upstream Intake First

Before packaging the first serious bundle for an agent, initialize and validate the intake:

```bash
npm run intake:init -- --profile support --euDossierRequired 0
npm run intake:validate -- --profile support
npm run intake:scaffold:cases -- --profile support
npm run intake:check:cases -- --profile support --cases cases/support.completed.json
npm run intake:check:adapter -- --profile support --cases cases/support.completed.json --baseUrl http://127.0.0.1:8788
npm run intake:check:runs -- --profile support --cases cases/support.completed.json --baselineDir apps/runner/runs/baseline/r1 --newDir apps/runner/runs/new/r1
```

Use that scaffold as a draft only.
It must still be reviewed and completed by the evaluation owner before it becomes the real `cases.json`.
`intake:check:cases` is the contract-coverage gate and writes `ops/intake/<profile>/cases-coverage.json`.
`intake:check:adapter` is the live `/run-case` onboarding gate before you move on to the quality validator and evidence packaging, and it writes `ops/intake/<profile>/adapter-capability.json`.
`intake:check:runs` is the structural comparability gate before you package baseline/new evidence, and it writes `ops/intake/<profile>/run-fingerprint.json`.
`review:check` writes `ops/intake/<profile>/corrective-action-register.json` when a profile is attached, so repeated residual gaps are tracked across review cycles.

## Recommended Command

```bash
npm run evidence:agent:package -- \
  --cases cases/agents/autonomous-cli-agent-quality.json \
  --baselineDir apps/runner/runs/baseline/r1 \
  --newDir apps/runner/runs/new/r1 \
  --outDir apps/evaluator/reports/agent-evidence-demo \
  --reportId agent-evidence-demo
```

What this does:

- snapshots `cases.json`, baseline run, and new run into `_source_inputs/`
- runs the evaluator
- writes `archive/retention-controls.json` from observed runner and evaluator retention settings
- verifies the resulting evidence bundle
- exits non-zero if packaging or verification fails

## Structured Review Handoff

After packaging, scaffold the human review layer inside the same bundle:

```bash
npm run review:init -- --reportDir apps/evaluator/reports/agent-evidence-demo --profile support
```

That creates:

- `review/review-decision.json`
- `review/handoff-note.md`
- optional `review/intake/` snapshot when an intake profile is supplied
- optional `review/intake/corrective-action-register.json` snapshot when continuity exists or is created on successful check

Then complete the human-owned fields and validate the handoff:

```bash
npm run review:check -- --reportDir apps/evaluator/reports/agent-evidence-demo --profile support
```

This check fails if:

- the decision is still `pending`
- `TODO` placeholders remain
- machine-derived residual gaps are still `open`
- block-severity machine gaps are accepted without explicit override
- the handoff note is missing

On a successful check with an attached intake profile, the toolkit also syncs the recurring corrective-action register back into `ops/intake/<profile>/`.

## Verification-Only Command

```bash
npm run evidence:agent:verify -- --reportDir apps/evaluator/reports/agent-evidence-demo
```

For strict mode:

```bash
npm run evidence:agent:verify:strict -- --reportDir apps/evaluator/reports/agent-evidence-demo
```

## Deterministic Demo And Surface Gate

For a buyer-facing or product handoff demo:

```bash
npm run demo:agent-evidence
```

For the release-grade surface gate:

```bash
npm run release:gate:agent-evidence
```

Those commands use committed fixtures, so the output is stable across machines and CI runs.

## Expected Outputs

- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`
- `review/review-decision.json`
- `review/handoff-note.md`
- `ops/intake/<profile>/corrective-action-register.json` when review continuity is tracked
- `_source_inputs/cases.json`
- `_source_inputs/baseline/`
- `_source_inputs/new/`

## Operator Checks Before Handoff

Check these fields first:

- `compare-report.json.summary.execution_quality.status`
- `compare-report.json.summary.cases_requiring_approval`
- `compare-report.json.summary.cases_block_recommended`
- `compare-report.json.quality_flags.self_contained`
- `compare-report.json.quality_flags.portable_paths`

If any of these are bad, the bundle is still useful, but the handoff note must say so explicitly.

## When To Use The EU Package Instead

Use this core runbook when you need:

- release evidence
- operator review
- security or engineering handoff
- portable agent evidence without regulatory dossier outputs

Use the EU runbook when you need:

- compliance clause coverage
- Annex IV dossier export
- EU-facing review artifacts and compliance handoff outputs

## Related Docs

- [Architecture](architecture.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
