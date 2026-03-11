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

## 7) New-agent rollout profile (recommended)

Phase 1: calibration (2-3 runs)
- `TIMEOUT_PROFILE=auto`
- `TIMEOUT_AUTO_CAP_MS=5400000`
- `FAIL_FAST_TRANSPORT_STREAK=0`
- `RETRIES=0`
- `CONCURRENCY=1`

Phase 2: validation (1-2 runs)
- keep `TIMEOUT_PROFILE=auto`
- set `RETRIES=1..2`
- set `FAIL_FAST_TRANSPORT_STREAK=2..3`
- check `summary.execution_quality` in report JSON

Phase 3: production
- keep auto profile enabled
- tune cap from observed p99 (often around `2x p99`)
- keep watchdog + trend ingestion enabled

Command template:
```bash
BASE_URL=http://127.0.0.1:8788 \
CASES=cases/agents/autonomous-cli-agent-quality.json \
RUN_PREFIX=auto_prod_auto_rollout \
REPORT_PREFIX=auto-prod-auto-rollout \
TIMEOUT_PROFILE=auto \
TIMEOUT_MS=120000 \
TIMEOUT_AUTO_CAP_MS=5400000 \
TIMEOUT_AUTO_LOOKBACK_RUNS=20 \
RETRIES=0 \
CONCURRENCY=1 \
PREFLIGHT_MODE=off \
FAIL_FAST_TRANSPORT_STREAK=0 \
./scripts/run-local-campaign.sh
```

Note:
- `run-local-campaign.sh` now defaults to staged execution for `CAMPAIGN_PROFILE=quality`:
  `smoke` (`infra` subset) -> auto-promote to full only on green smoke.
- Set `STAGED_MODE=0` for legacy single-stage runs when needed (for CI profiling or targeted troubleshooting).
- Each generated report folder now includes `devops-envelope.json` with the effective runtime limits
  (timeouts, retries, concurrency, preflight/fail-fast) used for that run.
- For repeatable multi-agent operation, use profile launcher:
  `./scripts/run-agent-profile.sh --list` then `./scripts/run-agent-profile.sh <profile>`.
- Profile launcher defaults to `quick` mode (calibration/smoke only); add `--full-lite`, `--full`, or `--diagnostic` when you intentionally want a heavier path.
- If a profile sets `ADAPTER_MANAGED=1`, the launcher also restarts `cli-agent-adapter` with the required timeout envelope before the run. Operators should not tune adapter timeouts separately from campaign timeouts.
- External dependencies outside the adapter itself still need to be running. Example: `gooseteam-ollama` still requires the GooseTeam MCP server.
- If timeout history is missing, the launcher seeds the first run from runtime-class defaults for the selected mode. This first-run envelope is intentionally conservative so operators do not spend the first day manually stepping timeouts upward.

## 8) Operator modes (what each run means)

- `quick` (default):
  - optional `calibration` if history is missing;
  - `smoke` on a small subset;
  - stops after smoke even when smoke is green.
  - Use it to answer: "is this agent ready for full evaluation?"
- `full-lite`:
  - explicit opt-in via `./scripts/run-agent-profile.sh --full-lite <profile>`;
  - runs a reduced quality subset only after green smoke.
  - Use it to answer: "do we have a practical developer-grade regression path for this agent?"
- `full`:
  - explicit opt-in via `./scripts/run-agent-profile.sh --full <profile>`;
  - runs the full quality campaign only after green smoke.
  - Use it to answer: "does this agent pass the full quality/evidence standard?"
- `diagnostic`:
  - explicit opt-in via `./scripts/run-agent-profile.sh --diagnostic <profile>`;
  - same full suite, but with a more generous timeout envelope for slow but live agents.
  - Use it when `full` fails with `timeout_budget_too_small` and health/progress are otherwise normal.
- raw/manual:
  - use `scripts/run-local-campaign.sh` directly when you intentionally need low-level control.

Interpretation rule:
- a green `quick` run means `ready_for_full`;
- it does not mean final product quality is proven.
- a green `full-lite` run means the agent has a usable local regression loop;
- it still does not replace `full` for release-grade certification.

## 8.1) Runtime classes (what kind of agent you are validating)

Not every local agent is operationally fit for the same validation loop. Treat runtime class as an explicit operator label, not an after-the-fact explanation.

- `fast_remote`:
  - quick/full are usually practical in local CI and on developer laptops.
- `standard_cli`:
  - quick/full are usually practical, with diagnostic reserved for unusual regressions.
- `slow_local_cli`:
  - quick is the default local path;
  - `full-lite` is usually the honest local regression loop;
  - full may still work, but diagnostic or scheduled runs are often more honest.
- `heavy_mcp_agent`:
  - quick locally;
  - `full-lite` only when the subset still fits the local loop;
  - full/diagnostic are typically better on dedicated hosts or nightly jobs.

Operational rule:
- every agent should get `quick`;
- not every agent should get local `full` as the default developer loop;
- `full-lite` exists specifically to preserve a practical indie/small-team path between quick and full.
- if an agent repeatedly requires multi-hour envelopes, that is a product signal about the agent's operational fitness, not just a timeout-tuning annoyance.

## 9) External-agent operator commands

Health check:
```bash
npm run campaign:agent:health -- --baseUrl http://127.0.0.1:8788
```

Dry-run envelope preview:
```bash
npm run campaign:agent:dry-run -- goose-ollama
```
Dry-run shows `detectedRuntimeClass`, `runtimeClassBasis`, `configuredInitialTimeoutMs`, `configuredHardCapMs`, and the required adapter envelope before any long run starts.

Quick run:
```bash
npm run campaign:agent -- goose-ollama
```

Full-lite run:
```bash
npm run campaign:agent:full-lite -- goose-ollama
```

Full run:
```bash
npm run campaign:agent:full -- goose-ollama
```

Diagnostic run:
```bash
npm run campaign:agent:diagnostic -- goose-ollama
```

Post-run summary:
```bash
npm run campaign:agent:status
npm run campaign:agent:status -- --reportPrefix goose-ollama-20260308_121554
```

What to inspect after the run:
- `stage-result.json` = what happened
- `devops-envelope.json` = what limits were used, plus `runMode`, `runtimeClass`, and `profileName`
- `next-envelope.json` = what the toolkit recommends next

If the launcher stops on failure, inspect:
- `apps/evaluator/reports/<reportId>-calibration/stage-result.json`
- `apps/evaluator/reports/<reportId>-smoke/stage-result.json`
- `apps/evaluator/reports/<reportId>/compare-report.json`

Timeout interpretation:
- `timeout_budget_too_small` = envelope too small for this agent/profile
- `agent_stuck_or_loop` = no useful progress
- `waiting_for_input` = interactive path detected
- `transport_failure` = infra/network/adapter problem
