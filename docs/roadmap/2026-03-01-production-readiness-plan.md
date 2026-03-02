# Production-Readiness Plan (No-Disclaimer Release)

Date: 2026-03-01  
Status: active

## Goal

Close all remaining gaps so the toolkit can be sold as production-ready without caveats:

1. Stable long-running runtime behavior on real external agents.
2. Deterministic quality/security gates.
3. Clear feature-to-claim alignment (no partial/ambiguous wording).
4. Strong operational baseline (auth, persistence, load behavior, reproducible proof).

## Release Criteria (global DoD)

Production-ready is reached only when all are true:

1. `execution_quality.status=normal` on real-agent validation runs (not inconclusive).
2. No systematic transport failures (`fetch failed` class) on long-running campaigns.
3. End-to-end pipeline reproducible from clean environment with documented commands.
4. Security and quality gates are green in CI.
5. Public claims match shipped behavior with proof artifacts.

---

## P0 (Blocking)

### P0.1 Runtime stability for long requests

Scope:

1. Harden runner transport path for long-lived HTTP calls.
2. Eliminate recurring `TypeError: fetch failed` class in real campaigns.
3. Make strict preflight reliable for long timeout profiles.

Tasks:

1. Improve error classification and retry policy for long-call failures.
2. Finalize and validate fetch -> node:http(s) fallback behavior for long header wait cases.
3. Make strict preflight canary use an auto-safe timeout window and surface actionable errors.
4. Add focused regression tests for transport and preflight edge cases.

DoD:

1. 3 consecutive campaigns for `cases/agents/autonomous-cli-agent.json` complete without mass transport collapse.
2. `summary.execution_quality.baseline_transport_success_rate >= 0.95`.
3. `summary.execution_quality.new_transport_success_rate >= 0.95`.
4. No fail-fast trigger from consecutive transport failures in the reference run.

---

### P0.2 Agent adapter operational hardening

Scope:

1. Add production-safe controls for adapter endpoints.
2. Remove single-process-memory fragility for runtime handoff data.

Tasks:

1. Add optional auth guard for `/run-case` and `/handoff` (token/header based, env-configured).
2. Add persistent handoff storage mode (SQLite/file-backed) with bounded retention/cleanup.
3. Keep in-memory mode for local dev, but make production mode explicit in docs.

DoD:

1. Auth mode can be enabled without code changes (env only).
2. Restarting adapter does not lose required handoff state in persistent mode.
3. Handoff store has deterministic limits (TTL and/or size bound).

---

### P0.3 External-agent case quality (expected assertions)

Scope:

1. Reduce weak-evaluation debt from `expected: {}` suites.
2. Prevent model-quality conclusions when only transport is tested.

Tasks:

1. Define expected contracts for critical external-agent cases.
2. Keep a separate infra-smoke profile, but require meaningful expectations for quality profile.
3. Update campaign scripts to support explicit quality profile vs infra profile.

DoD:

1. `summary.execution_quality.weak_expected_rate <= 0.2` on quality campaign.
2. Reports are no longer "model_quality_inconclusive" for the quality profile.

---

## P1 (High Priority, after P0)

### P1.1 Monolith decomposition (runner/evaluator)

Status (2026-03-01): **Done in this cycle**

Scope:

1. Split oversized orchestration files into cohesive modules.

Tasks:

1. Extract transport, preflight, artifact I/O, and reporting helpers from runner.
2. Extract summary/gating/rendering blocks from evaluator.
3. Preserve CLI compatibility and output schema.

DoD:

1. No behavior drift (golden report snapshots unchanged where expected).
2. Coverage does not drop below current gates.
3. New modules each have targeted unit tests.

Delivered:

1. `apps/runner/src/historyTimeout.ts` extracted from `runner.ts` (history sampling + percentile helpers).
2. `apps/evaluator/src/executionQuality.ts` extracted from `evaluator.ts` (rate parsing, weak-expected logic, execution-quality summary).
3. `apps/evaluator/src/summaryBySuite.ts` extracted from `evaluator.ts` (suite-level aggregation).
4. `apps/evaluator/src/htmlFormatters.ts` extracted from `htmlReport.ts` (UI formatter helpers).
5. New targeted tests: `historyTimeout.test.ts`, `executionQuality.test.ts`, `summaryBySuite.test.ts`, `htmlFormatters.test.ts`.

---

### P1.2 SDK/adapter end-to-end confidence

Status (2026-03-01): **Done in this cycle**

Scope:

1. Raise confidence beyond helper-level tests.

Tasks:

1. Add e2e tests for `packages/agent-sdk` HTTP server paths.
2. Add integration tests for adapter auth + persistent handoff store.

DoD:

1. `agent-sdk` coverage materially improved.
2. Full request lifecycle (`/health`, `/handoff`, `/run-case`) verified in tests.

Delivered:

1. `packages/agent-sdk/src/index.test.ts` expanded with endpoint lifecycle checks.
2. Adapter auth + persistent handoff store behaviors covered by `apps/cli-agent-adapter/src/adapter.test.ts`.

---

### P1.3 Claim-proof packs (OTel + runtime handoff)

Status (2026-03-01): **Pending real-agent proof run**

Scope:

1. Move remaining "partial" claim areas to proven-shipped state.

Tasks:

1. Produce real-agent proof pack with non-empty OTel anchors.
2. Produce runtime handoff endpoint + e2e receipt proof on real adapter.
3. Update claim-gates doc status from partial to shipped only after proofs.

DoD:

1. Proof commands pass on current artifacts.
2. Marketing claim gates are fully green for these features.

---

## P2 (Quality Polish)

### P2.1 Dependency hygiene cleanup

Scope:

1. Remove fragile override state that causes `npm ls` invalid tree signals.

Tasks:

1. Rework eslint/ajv/minimatch dependency strategy to avoid invalid override combos.
2. Keep `npm audit` and CI gate green.

DoD:

1. `npm ls` no longer reports invalid dependency tree.
2. No high/critical vulnerabilities introduced.

---

### P2.2 Security scanner pack maturity

Scope:

1. Expand output/compliance rule packs for production default behavior.

Tasks:

1. Add curated bias/compliance rule presets.
2. Add tests for preset behavior and false-positive boundaries.

DoD:

1. Presets documented and tested.
2. Scanner output is deterministic across fixtures.

---

## Validation Command Set (single-source runbook)

Run from repo root:

```bash
cd /Users/tatanapanfilova/Documents/Project/tool
```

### 1) Static quality gates

```bash
npm run lint -- --max-warnings=0
npm run typecheck
npm run test:coverage
npm audit --audit-level=high
npm run docs:check-links
docker compose config --quiet
```

### 2) Start adapter for Autonomous-CLI-Agent

```bash
cd /Users/tatanapanfilova/Documents/Project/tool
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
export NO_PROXY=127.0.0.1,localhost
export OPENAI_API_KEY=dummy
export CLI_AGENT_CMD=/Users/tatanapanfilova/Documents/Project/tool/Autonomous-CLI-Agent/.venv/bin/python3
export CLI_AGENT_ARGS='["cli_agent.py"]'
export CLI_AGENT_WORKDIR=/Users/tatanapanfilova/Documents/Project/tool/Autonomous-CLI-Agent
export CLI_AGENT_TIMEOUT_MS=1300000
export CLI_AGENT_TIMEOUT_CAP_MS=1300000
export CLI_AGENT_MAX_CONCURRENCY=1
export CLI_AGENT_SERVER_TIMEOUT_BUFFER_MS=120000
export PORT=8788
npm --workspace cli-agent-adapter run dev
```

Health check (new terminal):

```bash
cd /Users/tatanapanfilova/Documents/Project/tool && curl -sS http://127.0.0.1:8788/health
```

### 3) Full local campaign (base/new2/new3 + evaluator + trend)

```bash
cd /Users/tatanapanfilova/Documents/Project/tool && BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=autonomous CAMPAIGN_PROFILE=quality RUN_PREFIX=auto_prod_ready REPORT_PREFIX=auto-prod-ready TIMEOUT_PROFILE=auto TIMEOUT_MS=120000 TIMEOUT_AUTO_CAP_MS=1800000 TIMEOUT_AUTO_LOOKBACK_RUNS=20 RETRIES=0 CONCURRENCY=1 PREFLIGHT_MODE=strict PREFLIGHT_TIMEOUT_MS=30000 FAIL_FAST_TRANSPORT_STREAK=2 ./scripts/run-local-campaign.sh
```

### 4) Gated evaluator verification (execution quality must be normal)

```bash
cd /Users/tatanapanfilova/Documents/Project/tool && npm --workspace evaluator run dev -- --cases cases/agents/autonomous-cli-agent.json --baselineDir apps/runner/runs/baseline/auto_prod_ready_base --newDir apps/runner/runs/new/auto_prod_ready_new3 --outDir apps/evaluator/reports/auto-prod-ready-gated --reportId auto-prod-ready-gated --failOnExecutionDegraded
```

### 5) Proof checks for claim-safe publishing

```bash
cd /Users/tatanapanfilova/Documents/Project/tool && npm run proof:runtime-handoff -- --baseUrl http://127.0.0.1:8788 --mode endpoint
cd /Users/tatanapanfilova/Documents/Project/tool && npm run proof:otel -- --reportDir apps/evaluator/reports/auto-prod-ready --minCases 1
```

### 6) Vendor-bridge smoke (partner readiness)

```bash
cd /Users/tatanapanfilova/Documents/Project/tool && npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-baseline.json --out /tmp/promptfoo-baseline.bridge.json --runId pf_base
cd /Users/tatanapanfilova/Documents/Project/tool && npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-candidate.json --out /tmp/promptfoo-candidate.bridge.json --runId pf_new
cd /Users/tatanapanfilova/Documents/Project/tool && npm run bridge -- diff --baseline /tmp/promptfoo-baseline.bridge.json --candidate /tmp/promptfoo-candidate.bridge.json --out /tmp/promptfoo.diff.json --runId pf_base_vs_new
```

---

## Exit Decision

Release as production-ready only if all below are true in the latest cycle:

1. P0 DoD complete.
2. Static quality gates green.
3. Real-agent campaign gated report passes (no execution degradation).
4. Claim-proof commands pass for published claims.
5. Outreach/demo artifacts generated from current run set (no stale packs).
