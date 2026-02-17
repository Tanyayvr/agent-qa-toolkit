# Installation & Run Modes

This toolkit is self-hosted. Choose one of the run modes below.

---

## 1) Local (npm) — fastest for evaluation

Requirements:
- Node.js 20+
- npm

Steps:
```bash
npm install
npm run demo
open apps/evaluator/reports/latest/report.html
```

What it does:
- Runs demo-agent locally
- Executes runner + evaluator
- Produces `apps/evaluator/reports/latest/`

---

## 2) Docker Compose — full pipeline

Requirements:
- Docker Desktop (Compose v2) or classic docker-compose

Steps:
```bash
docker compose up --build
```
If your Docker does not support `docker compose`, use:
```bash
docker-compose up --build
```

Output:
- `apps/evaluator/reports/latest/report.html`
- `apps/evaluator/reports/latest/compare-report.json`

Notes:
- Uses demo-agent fixture and `cases/all.json` (correctness + robustness).
- Replace demo-agent with your real agent service for production.

---

## 3) Real agent integration (runner + evaluator)

Requirements:
- Your agent exposes `POST /run-case` (see `docs/agent-integration-contract.md`)

Run runner:
```bash
npm -w runner run dev -- \
  --baseUrl http://<agent-host>:<port> \
  --cases cases/cases.json \
  --outDir apps/runner/runs \
  --runId my_run
```

Run evaluator:
```bash
npm -w evaluator run dev -- \
  --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/my_run \
  --newDir apps/runner/runs/new/my_run \
  --outDir apps/evaluator/reports/my_run \
  --reportId my_run
```

---

## 4) Agent SDK (optional)

If your agent does not expose `/run-case`, use the SDK adapters:
- TypeScript: `packages/agent-sdk/README.md`
- Python: `scripts/agent-sdk-python/agent_sdk.py`

---

## 5) CI Integration

See `docs/ci.md` for CI pipeline examples and strict verification.

