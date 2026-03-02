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

## 5) Group 2+ agent runs into one incident bundle (`P1`)
```bash
npm run bundle:group -- \
  --groupId incident-2026-02-28 \
  --outDir apps/evaluator/reports/groups/incident-2026-02-28 \
  --report autonomous=apps/evaluator/reports/cli-prod \
  --report agentcli=apps/evaluator/reports/agent-cli-live-2

npm run bundle:group:verify -- \
  --bundleDir apps/evaluator/reports/groups/incident-2026-02-28

open apps/evaluator/reports/groups/incident-2026-02-28/index.html
```

Bundle outputs:
- `index.html` (cross-run navigation)
- `group-index.json` (machine index)
- `group-manifest.json` (per-run checksums + verify target)
- `runs/<label>/...` copied report directories

Notes:
- `<label>` in `--report <label=...>` is used as `agent_id` in group metadata.
- Group bundle packages existing run evidence.

## 6) Runtime handoff smoke (`/handoff`)
```bash
curl -sS http://127.0.0.1:8788/handoff \
  -H 'Content-Type: application/json' \
  --data '{
    "incident_id":"incident-2026-02-28",
    "handoff_id":"h-001",
    "from_agent_id":"planner",
    "to_agent_id":"executor",
    "objective":"Execute approved plan",
    "schema_version":"1.0.0"
  }'

npm --workspace runner run dev -- \
  --baseUrl http://127.0.0.1:8788 \
  --cases cases/agents/cli-agent.json \
  --outDir apps/runner/runs \
  --runId handoff-smoke \
  --incidentId incident-2026-02-28 \
  --agentId executor \
  --only cli_qa_001
```
