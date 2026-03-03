# VERIFY: Reproducible Technical Due Diligence

This guide is for independent technical verification.
It maps one release state to reproducible commands and expected artifact locations.

## 1) Environment

```bash
node -v
npm -v
```

Recommended:
- Node `>=20`
- clean working tree for strict reproducibility

## 2) Install

```bash
npm install
```

## 3) Quality Gate

```bash
npm run quality:gate
```

Expected:
- lint passes
- typecheck passes
- tests pass
- coverage is generated and branch coverage is above configured threshold
- docs links pass
- docker compose config is valid
- `npm audit --audit-level=high` returns no high/critical issues

## 4) Coverage Snapshot

```bash
npm run test:coverage
npm run metrics:dd
```

Read key lines from the summary:
- `All files | % Branch`
- file-level branch coverage for:
  - `apps/runner/src/runner.ts`
  - `apps/evaluator/src/evaluatorPipeline.ts`
  - `apps/evaluator/src/htmlReport.ts`
- and structured summary in `metrics:dd` output (tests/coverage/LOC current vs baseline commit)

## 5) Deterministic Diff Artifacts

Run one local campaign (example):

```bash
BASE_URL=http://127.0.0.1:8788 \
CASES=cases/agents/autonomous-cli-agent-quality.json \
RUN_PREFIX=auto_prod_auto_verify \
REPORT_PREFIX=auto-prod-auto-verify \
TIMEOUT_PROFILE=auto \
TIMEOUT_MS=120000 \
TIMEOUT_AUTO_CAP_MS=5400000 \
TIMEOUT_AUTO_LOOKBACK_RUNS=20 \
RETRIES=1 \
CONCURRENCY=1 \
PREFLIGHT_MODE=off \
FAIL_FAST_TRANSPORT_STREAK=0 \
./scripts/run-local-campaign.sh
```

Expected output directories:
- `apps/runner/runs/baseline/auto_prod_auto_verify_base`
- `apps/runner/runs/new/auto_prod_auto_verify_base`
- `apps/evaluator/reports/auto-prod-auto-verify`
- `apps/evaluator/reports/auto-prod-auto-verify-2`
- `apps/evaluator/reports/auto-prod-auto-verify-3`

## 6) Mandatory Evidence Files

Check that each report directory contains:
- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`

Optional but recommended:
- `trend.html`

## 7) Contract and KPI Checks

```bash
node scripts/proof-otel-anchors.mjs --reportDir apps/evaluator/reports/auto-prod-auto-verify --minCases 1
npm run trend -- runs --last 20 --format json
```

Expected:
- OTel anchor proof passes for report claims that include anchors
- trend rows include run-level metrics and, for new runs, admissibility KPI fields when present

## 8) Historical Metrics Timeline

Use `docs/CHRONOLOGY.md` for commit/date mapping:
- capability change
- before/after metric
- measurement command
- evidence location
