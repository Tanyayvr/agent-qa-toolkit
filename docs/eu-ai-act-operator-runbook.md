# EU AI Act Operator Runbook

This runbook explains the public self-serve minimum path for the EU AI Act layer.

If you only need the generic evidence package without EU-specific outputs, use [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md).

## Goal

Produce one report directory that contains:

- the core evaluator artifacts
- the minimum EU AI Act outputs
- provider-side technical files that can support a high-risk AI system package

## Prerequisites

Before you run the package command, you need:

- a working `cases.json`
- one baseline run directory
- one new run directory
- Node.js 20 or newer

The default EU profile is:

- `docs/compliance-profile-eu-ai-act.json`

## Main Command

```bash
npm run compliance:eu-ai-act -- \
  --cases cases/agents/autonomous-cli-agent-quality.json \
  --baselineDir apps/runner/runs/baseline/r1 \
  --newDir apps/runner/runs/new/r1 \
  --outDir apps/evaluator/reports/eu-ai-act-demo \
  --reportId eu-ai-act-demo
```

What this does:

- applies the EU AI Act profile
- snapshots the source inputs into the report directory
- runs the evaluator
- builds the minimum EU package
- verifies the package before exit

## Verify An Existing Package

If the package already exists and you want to verify it again:

```bash
npm run compliance:eu-ai-act:verify -- --reportDir apps/evaluator/reports/eu-ai-act-demo
```

For strict mode:

```bash
npm run compliance:eu-ai-act:verify:strict -- --reportDir apps/evaluator/reports/eu-ai-act-demo
```

## Expected Outputs

The minimum EU path produces a report directory with the core evidence files plus the EU minimum layer.

Core outputs:

- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`
- `archive/retention-controls.json`

EU minimum outputs:

- `compliance/eu-ai-act-coverage.json`
- `compliance/eu-ai-act-annex-iv.json`
- `compliance/eu-ai-act-report.html`
- `compliance/article-9-risk-register.json`
- `compliance/article-10-data-governance.json`
- `compliance/article-13-instructions.json`
- `compliance/human-oversight-summary.json`
- `compliance/article-17-qms-lite.json`
- `compliance/article-43-conformity-assessment.json`
- `compliance/article-47-declaration-of-conformity.json`
- `compliance/annex-v-declaration-content.json`
- `compliance/article-16-provider-obligations.json`
- `compliance/article-72-monitoring-plan.json`
- `compliance/post-market-monitoring.json`

## What This Runbook Does Not Cover

This public runbook does not cover:

- customer-specific onboarding
- private implementation playbooks
- external authority-response handling
- internal commercial delivery steps

Those workflows are intentionally outside the open repository boundary.

## Suggested Operating Pattern

For the public minimum path:

1. build the provider-side draft in Builder
2. run the EU starter on a working adapter if you want a lightweight first check
3. produce baseline and new runs for the real system
4. run `npm run compliance:eu-ai-act -- ...`
5. review the generated minimum package inside the report directory

## Related Docs

- [EU AI Act Starter](eu-ai-act-starter.md)
- [EU AI Act Self-Hosted Guidance](eu-ai-act-self-hosted-guidance.md)
- [EU AI Act Evidence Engine](eu-ai-act-evidence-engine.md)
