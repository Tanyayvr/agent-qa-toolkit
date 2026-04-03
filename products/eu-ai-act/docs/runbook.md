# EU Operator Runbook

This runbook explains the self-serve minimum path for the EU product surface.

## Goal

Produce one report directory that contains:

- the core evaluator artifacts
- the minimum EU AI Act outputs
- provider-side technical files that can support a high-risk AI system package

## Prerequisites

Before you run the package command, you need:

- `npm install` completed in `products/eu-ai-act/`
- a working `cases.json`
- one baseline run directory
- one new run directory
- Node.js 20 or newer

## Main Command

Run this from `products/eu-ai-act/`:

```bash
npm run package -- --cases <cases.json> --baselineDir <baseline-run-dir> --newDir <new-run-dir> --outDir <report-dir> --reportId <id>
```

What this does:

- applies the EU AI Act profile
- snapshots the source inputs into the report directory
- runs the evaluator
- builds the minimum EU package
- verifies the package before exit

## Verify An Existing Package

Use an explicit report directory:

```bash
npm run verify -- --reportDir <report-dir>
```

## Expected Outputs

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

## Suggested Operating Pattern

1. build the provider-side draft in Builder
2. run the EU starter on a working adapter if you want a lightweight first check
3. produce baseline and new runs for the real system
4. run `npm run package -- ...`
5. review the generated minimum package inside the report directory

## Related Docs

- [Get started](get-started.md)
- [EU starter](starter.md)
- [Self-hosted](self-hosted.md)
- [Verification checklist](verification.md)
