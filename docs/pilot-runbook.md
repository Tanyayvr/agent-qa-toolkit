# Pilot Runbook (Self-Run)

## 1) Run demo (sanity check)
```bash
npm install
npm run demo
open apps/evaluator/reports/latest/report.html
```

## 2) Run on your agent
```bash
npm run pilot
```

## 3) Where artifacts are
- HTML report: `apps/evaluator/reports/<runId>/report.html`
- Machine report: `apps/evaluator/reports/<runId>/compare-report.json`
- Manifest: `apps/evaluator/reports/<runId>/artifacts/manifest.json`

## 4) How to report a bug
Please attach:
- `compare-report.json`
- `artifacts/manifest.json`
- `assets/raw/run_meta/*`
- any `case-*.html` relevant to the issue

