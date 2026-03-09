<!-- /README.md -->
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-vitest-brightgreen.svg)](#development)

# Agent QA Toolkit — Portable Evidence Packs, Regression Diffs, and CI Gates

The only open‑source regression testing framework purpose‑built for tool‑using AI agents.
Most tools measure model quality. We measure agent behavior:
did it call the right tools, in the right order, with safe parameters — and can you prove it?

Portable Evidence Packs · Regression Diffs · CI Gates · Security Signals

Why this exists: most observability tools trace what happened, but do not produce a portable, signed, offline‑verifiable artifact you can attach to a ticket or gate in CI. This toolkit does - via Evidence Packs + per‑case CI gate decisions + offline artifacts.

**Quick links:**
[Quickstart](#quickstart) · [Live report](https://tanyayvr.github.io/agent-qa-toolkit/demo/report.html) · [Demo bundle](#demo-bundle) · [CI usage](docs/ci.md) · [Evidence Pack contract](#evidence-pack-format) · [Security scanners](docs/security-scanners.md) · [Architecture](docs/architecture.md) · [Chronology](docs/CHRONOLOGY.md) · [Verify](docs/VERIFY.md)

## Table of Contents
1. [What You Get](#what-you-get)
2. [Quickstart](#quickstart)
3. [Demo Bundle](#demo-bundle)
4. [Evidence Pack Format](#evidence-pack-format)
5. [CI Gate Decision](#ci-gate-decision)
6. [Security Scanners](#security-scanners)
7. [Historical Trending](#historical-trending)
8. [Docs Map](#docs-map)
9. [Development](#development)

---

## What You Get
Turn agent runs into a portable evidence pack you can share and gate in CI:

Incident - Evidence Pack - RCA - Risk/Gate Decision

You get:
- Baseline vs New regression runs
- Per‑case replay diff (`case-<case_id>.html`) for human triage
- Machine report (`compare-report.json`) as the **source of truth** for CI dashboards and gating
- Conservative pass semantics: runner transport/runtime failures are recorded as evidence and counted as `pass=false` (not "green" by default)
- Execution-quality summary (`summary.execution_quality`) with transport success and weak-assertion rate
- Explicit tool-telemetry assertion with deterministic reason code (`tool_telemetry_missing`) when tool trace is required but absent
- Runtime policy enforcement (`planning_gate` + `repl_policy`) with deterministic `policy_violation` evidence and required per-item `policy_evaluation`
- Decision-legibility contract (`assumption_state`) with selected/rejected candidate counts and deterministic missing/derived reason codes
- Semantic quality assertion (`semantic_quality`) for text tasks: required/forbidden concepts + calibrated similarity (`profile` or `token_f1`/`lcs_ratio`) + custom synonyms
- Synthetic fault-matrix mode (`cases/matrix.json`) to validate transport/data failure classification before external pilots
- Root cause attribution (RCA) and policy hints
- Security signals (6 scanners + optional entropy scanner)

## What makes this different
|  | Agent QA Toolkit | LangSmith / Langfuse | Custom eval scripts |
|--|:---:|:---:|:---:|
| Portable offline artifact | ✅ | ❌ | ❌ |
| CI gate (single JSON field) | ✅ | Partial | Manual |
| Integrity checks (sha256) | ✅ | ❌ | Manual |
| Signed manifest (optional, offline) | ✅ | ❌ | ❌ |
| Redaction pre-write (runner truth) | ✅ | Configurable / depends | Manual |
| Token cost tracking | ✅ | ✅ | Manual |
| Loop detection | ✅ | Depends | Manual |
| Flakiness / pass_rate | ✅ | Partial / depends | Custom |
| No SaaS dependency | ✅ | ❌ | ✅ |

Notes: see `docs/comparison.md` for rationale.  
Positioning: for teams already using Galileo or similar observability stacks, this toolkit is a complementary release-evidence layer (portable artifact + deterministic CI gate).

---

## Quickstart
```bash
npm install
npm run demo
```
Open the report:
```
apps/evaluator/reports/latest/report.html
```

One-command Docker quickstart (self-hosted):
```bash
docker compose up --build
```

Live report (no install):
https://tanyayvr.github.io/agent-qa-toolkit/demo/report.html

---

## Demo Bundle
Open an example pack: `examples/demo-bundle.zip`  
Live demo (no install): https://tanyayvr.github.io/agent-qa-toolkit/demo/report.html

## Screenshots
![Report 1](docs/assets/screenshots/01.png)
![Report 2](docs/assets/screenshots/02.png)
![Report 3](docs/assets/screenshots/03.png)
![Report 4](docs/assets/screenshots/04.png)
![Report 5](docs/assets/screenshots/05.png)
![Report 6](docs/assets/screenshots/06.png)

---

## Evidence Pack Format
Evaluator produces a self‑contained report directory:
- `report.html` - overview report
- `case-<case_id>.html` — per‑case replay diff
- `compare-report.json` — CI contract
- `assets/` — evidence files
- `artifacts/manifest.json` — canonical evidence map (sha256)

Schema:
- `schemas/compare-report-v5.schema.json`

Manifest integrity:
- `pvip:verify` enforces portable paths, in‑bundle hrefs, and embedded index consistency

Manifest signing (optional):
```bash
export AQ_MANIFEST_PRIVATE_KEY=<base64-der-pkcs8>
npm run manifest:sign -- apps/evaluator/reports/latest

export AQ_MANIFEST_PUBLIC_KEY=<base64-der-spki>
npm run pvip:verify:strict -- --reportDir apps/evaluator/reports/latest
```

---

## CI Gate Decision
One field per case drives CI:
```
none | require_approval | block
```
See:
- `compare-report.json` → `items[].gate_recommendation`

---

## Admissibility KPI (Numeric)
The report includes a numeric admissibility block in:
- `compare-report.json` -> `summary.execution_quality.admissibility_kpi`

Formulas:
- `pre_action_entropy_removed = (risk_mass_before - risk_mass_after) / risk_mass_before`
- `reconstruction_minutes_saved_per_block = reconstruction_minutes_saved_total / blocked_cases`

Purpose:
- separate probability-space (risk mass reduced before action)
- from cost-space (human reconstruction time saved)

Default model (explicit in artifact):
- risk weights: `low=1`, `medium=2`, `high=3`
- residual gate factors: `none=1`, `require_approval=0.4`, `block=0`
- minutes per removed risk unit: `30`

Tune model:
```bash
AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT=45 npm --workspace evaluator run dev -- ...
```

---

## Technical Due Diligence Bridge
For independent technical review, we map:
- immutable commit -> measurable metric delta
- command -> expected artifact path
- report id -> reproducible evidence files

Core docs:
- `docs/CHRONOLOGY.md` (date/commit/capability gain/metric before-after)
- `docs/VERIFY.md` (step-by-step reproducibility checklist)

Design note:
- this is implemented in OSS in this repository.
- paid tiers (`docs/pro.md`) are packaging/support layers, not hidden core evaluator logic.

---

## Security Scanners
Six scanners run in the pipeline:
- PII/secret detection
- Prompt injection markers
- Action risk (unsafe tools)
- Outbound/exfiltration
- Output quality/refusals
- Entropy‑based token exfiltration (optional)

Details:
- `docs/security-scanners.md`

---

## Historical Trending
**Pro+ add‑on (paid, when available)**  
To avoid pricing ambiguity:
- OSS today: `npm run trend` CLI, local SQLite store, and HTML trend export are available in this repo.
- Pro+ (paid): packaged rollout, support SLA, migration help, and governed operations for long-term trend retention.
- Pilot: early teams can use Pro+ workflows with direct support while the packaging matures.

Why it matters:
- Drift detection across releases (not just a single diff)
- Flaky visibility: pass/fail over time
- Gate trend: none/approval/block over time
- Admissibility KPI trend by release: pre-action entropy removed + reconstruction minutes saved/block
- Token cost trend: early signal of cost drift
- Release safety: avoid “green today, broken next week”
- Incident forensics: when the degradation started
- Offline‑first: SQLite + HTML, no data egress
- Shareable artifacts: attach trend.html to tickets
- No tracing UI dependency: trends from Evidence Packs
- Vendor‑neutral: works in air‑gapped environments
- CI‑friendly CLI: trend runs/tokens/html
- Audit readiness: historical evidence for compliance
- Quantifies improvements by release
- Cost control: facts for budgets/limits
- No hidden telemetry

Use it:
```bash
npm run trend -- runs --last 30
npm run trend -- tokens --last 30
npm run trend -- html --last 50 --out /tmp/trends
```
This stores data in `.agent-qa/trend.sqlite` (local filesystem; avoid NFS/SMB).

Recommended developer workflow (2 reports):
- `full history` for long-run drift context
- `kpi window` for post-KPI operational decisions

```bash
# Full history (quality/drift context)
npm run trend -- html --last 200 --out apps/evaluator/reports/trend-full

# KPI window (after KPI rollout date)
npm run trend -- html --since 2026-03-01 --out apps/evaluator/reports/trend-kpi
```

Note:
- Old reports created before KPI rollout will show `kpi_* = null`; this is expected.

---

## Docs Map
- Quick install: `docs/installation.md`
- Architecture: `docs/architecture.md`
- Agent contract: `docs/agent-integration-contract.md`
- CI guide: `docs/ci.md`
- Self‑hosted policy: `docs/self-hosted.md`
- Threat model: `docs/threat-model.md`
- Security FAQ: `docs/security-faq.md`
- Capability chronology (due diligence): `docs/CHRONOLOGY.md`
- Repro checklist (due diligence): `docs/VERIFY.md`
- Synthetic validation example: `docs/goose-synthetic-validation-mar04.md`

---

## Agent Onboarding (Data-Driven Timeout Calibration)
For a new external agent, use a 3-phase rollout instead of fixed timeout guesses.

Phase 1: calibration (2-3 runs)
- high cap, no early abort: `TIMEOUT_AUTO_CAP_MS=5400000`, `FAIL_FAST_TRANSPORT_STREAK=0`
- low retry cost: `RETRIES=0`, `CONCURRENCY=1`
- goal: collect realistic runtime latency history for auto profile

Phase 2: validation (1-2 runs)
- enable production-like controls: `RETRIES=1..2`, `FAIL_FAST_TRANSPORT_STREAK=2..3`
- verify `summary.execution_quality` in `compare-report.json` before promotion

Phase 3: production
- keep `timeoutProfile=auto`
- set cap from observed latency distribution (commonly about `2x p99`)
- keep watchdog and trend ingestion enabled for drift/instability detection

Operational note:
- do not run manual long `/run-case` probes in parallel with campaign runs when adapter concurrency is 1 (`busy` 429 can skew transport metrics).

---

## Development
Runner:
```bash
npm --workspace runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json --outDir apps/runner/runs --runId latest
```
Quality-only demo suite (no intentionally weak-expected transport-failure cases):
```bash
npm run demo:quality
```
Correctness demo now defaults to `cases/cases-quality.json` and validates weak-expected rate before run:
```bash
npm run demo:correctness
```
One-command local campaign (baseline/new2/new3 + evaluator + trend):
```bash
BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=cli CAMPAIGN_PROFILE=quality RUN_PREFIX=cli_prod REPORT_PREFIX=cli-prod ./scripts/run-local-campaign.sh
```
Profile-based agent run (recommended for external agents):
```bash
./scripts/run-agent-profile.sh --list
./scripts/run-agent-profile.sh goose-ollama
./scripts/run-agent-profile.sh --full goose-ollama
./scripts/run-agent-profile.sh --diagnostic goose-ollama
./scripts/run-agent-profile.sh gooseteam-ollama
./scripts/run-agent-profile.sh autonomous-cli
```
Same command via npm:
```bash
npm run campaign:agent -- goose-ollama
```
Launcher writes active prefixes to `/tmp/aq_run_prefix` and `/tmp/aq_report_prefix` for quick post-run summaries.
Launcher default is now buyer-friendly `quick` mode: it runs `calibration`/`smoke` and stops after green smoke.
Use `--full` when you explicitly want auto-promotion into the full quality campaign.
Default behavior is now staged (`STAGED_MODE=1`): the script runs `smoke` first (`infra` + small subset), and auto-promotes to full quality campaign only on green smoke.
When timeout auto-tuning is enabled and history is insufficient, the script can auto-run a `calibration` stage first to collect initial latency samples before `smoke`.
Implemented operator modes:
- `quick` (default): optional `calibration`, then `smoke`, then stop. Interpret green quick as `ready_for_full`, not as final quality proof.
- `full`: explicit opt-in via `--full`; runs the full quality campaign only after green smoke.
- `diagnostic`: explicit opt-in via `--diagnostic`; keeps the same full suite, but uses a more generous envelope for known slow but live agents.
- raw/manual: call `scripts/run-local-campaign.sh` directly when you intentionally need low-level campaign control.
What `quick` proves:
- adapter/agent path starts and responds;
- transport/runtime path is healthy enough for smoke;
- timeout budget for the quick envelope is sufficient or clearly classified;
- telemetry/evidence contract is present on smoke cases.
What `quick` does not prove:
- full-suite quality;
- long-run stability;
- final release readiness.
Before execution, the launcher now prints an operator runtime estimate:
- `estimatedRequestTimeoutMs`
- `estimatedStageUpperBoundMinutes`
- `recommendedMode`
- `confidence`
This estimate is advisory, not a guarantee; it exists to prevent "manual timeout tuning by small increments".
On staged failures it emits machine-readable stage output with typed reason and action:
- `stage=calibration|smoke|full`
- `reason=transport|timeout_budget|agent_stuck_or_loop|waiting_for_input|policy|semantic|unknown`
- `next_action=<deterministic recommendation>`
For DevOps handoff, each stage/report also records effective runtime envelope:
- console: `DevOps envelope (...)`
- JSON artifact: `apps/evaluator/reports/<reportId>/devops-envelope.json`
- owner model: DevOps sets limits (`TIMEOUT_MS`, `TIMEOUT_AUTO_CAP_MS`, `RETRIES`, `CONCURRENCY`, etc.); runner auto-tunes only inside these bounds.
To run the legacy single-stage flow explicitly:
```bash
BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=cli CAMPAIGN_PROFILE=quality STAGED_MODE=0 RUN_PREFIX=cli_prod REPORT_PREFIX=cli-prod ./scripts/run-local-campaign.sh
```
Operator helpers:
```bash
# adapter liveness / effective runtime envelope
npm run campaign:agent:health -- --baseUrl http://127.0.0.1:8788

# latest report summary from /tmp/aq_report_prefix
npm run campaign:agent:status

# explicit report prefix
npm run campaign:agent:status -- --reportPrefix goose-ollama-20260308_121554
```
`campaign:agent:status` now also prints:
- next recommended mode (`full` vs `diagnostic`)
- recommended timeout/cap after a budget failure
- timed-out case ids when the failure is localized

Recommended external-agent flow:
```bash
# 1) quick readiness check
npm run campaign:agent -- goose-ollama

# 2) inspect status / stage result
npm run campaign:agent:status

# 3) run full only intentionally
npm run campaign:agent:full -- goose-ollama

# 4) if full says timeout_budget for a slow but live agent, use diagnostic
npm run campaign:agent:diagnostic -- goose-ollama
```
By default this script ingests each generated report into local library (`.agent-qa/library`). Set `LIBRARY_INGEST=0` to disable.
Execution quality release gate is ON by default in `run-local-campaign.sh` (`EVAL_FAIL_ON_EXECUTION_DEGRADED=1`).
To disable explicitly (not recommended for release):
```bash
BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=cli CAMPAIGN_PROFILE=quality RUN_PREFIX=cli_prod REPORT_PREFIX=cli-prod EVAL_FAIL_ON_EXECUTION_DEGRADED=0 ./scripts/run-local-campaign.sh
```
Optional KPI hard-gate thresholds:
```bash
AQ_MIN_PRE_ACTION_ENTROPY_REMOVED=0.05 AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK=10 \
BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=cli CAMPAIGN_PROFILE=quality RUN_PREFIX=cli_prod REPORT_PREFIX=cli-prod ./scripts/run-local-campaign.sh
```
Slow-agent profile (auto timeout tuning):
```bash
BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=autonomous CAMPAIGN_PROFILE=quality RUN_PREFIX=auto_prod REPORT_PREFIX=auto-prod TIMEOUT_PROFILE=auto TIMEOUT_MS=120000 TIMEOUT_AUTO_CAP_MS=1800000 TIMEOUT_AUTO_LOOKBACK_RUNS=20 RETRIES=0 PREFLIGHT_MODE=off ./scripts/run-local-campaign.sh
```
Timeout failures now include machine-readable root cause in runner artifacts and compare report summaries:
- `timeout_budget_too_small`
- `agent_stuck_or_loop`
- `waiting_for_input`
- `transport_failure`
- `unknown_timeout`
Interpretation:
- `timeout_budget_too_small`: the configured envelope was too small for this agent/profile; this is not the same as "agent is broken".
- `agent_stuck_or_loop`: the agent appears alive but not making useful progress.
- `waiting_for_input`: the agent looks interactive and needs a different execution mode.
- `transport_failure`: adapter/network/runtime path failed before usable agent evidence was produced.
When staged/full failures happen, report directories now also carry `next-envelope.json` with the recommended next mode and envelope.
Infra-only smoke profile (weak assertions allowed):
```bash
BASE_URL=http://127.0.0.1:8788 AGENT_SUITE=autonomous CAMPAIGN_PROFILE=infra RUN_PREFIX=auto_infra REPORT_PREFIX=auto-infra ./scripts/run-local-campaign.sh
```
One-command post-run evidence pack (evaluator + trend + gated check + zip):
```bash
CASES=cases/agents/autonomous-cli-agent.json RUN_BASE=auto_prod_auto_base RUN_NEW2=auto_prod_auto_new2 RUN_NEW3=auto_prod_auto_new3 REPORT_PREFIX=auto-prod-auto PROJECT_KEY=autonomous-cli-agent ./scripts/post-run-evidence.sh
```
Multi-agent incident bundle (group 2+ report folders under one `run_id` family):
```bash
npm run bundle:group -- \
  --groupId incident-2026-02-28 \
  --outDir apps/evaluator/reports/groups/incident-2026-02-28 \
  --report agentA=apps/evaluator/reports/cli-prod \
  --report agentB=apps/evaluator/reports/agent-cli-live-2

npm run bundle:group:verify -- \
  --bundleDir apps/evaluator/reports/groups/incident-2026-02-28
```
Vendor-bridge conversion (Promptfoo / DeepEval / Giskard -> canonical bridge run):
```bash
npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-baseline.json --out /tmp/promptfoo-baseline.bridge.json --runId promptfoo_base
npm run bridge -- convert --vendor promptfoo --in examples/vendor-bridge/promptfoo-candidate.json --out /tmp/promptfoo-candidate.bridge.json --runId promptfoo_candidate
npm run bridge -- diff --baseline /tmp/promptfoo-baseline.bridge.json --candidate /tmp/promptfoo-candidate.bridge.json --out /tmp/promptfoo.diff.json --runId promptfoo_base_vs_candidate
```
Runtime handoff (live transfer between agents/adapters under one incident):
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
  --runId demo-handoff \
  --incidentId incident-2026-02-28 \
  --agentId executor
```
Proof commands (claim-safe checks before outbound posts/outreach):
```bash
# OTel anchors must exist in final evaluator artifact
npm run proof:otel -- --reportDir apps/evaluator/reports/auto-prod

# One-command demo proof (regenerates correctness report + verifies anchors)
npm run proof:otel:demo

# Runtime handoff endpoint/idempotency smoke (fast)
npm run proof:runtime-handoff -- --baseUrl http://127.0.0.1:8788 --mode endpoint

# Optional e2e receipt check (calls /run-case; use on fast adapters)
npm run proof:runtime-handoff -- --baseUrl http://127.0.0.1:8788 --mode e2e --runCaseTimeoutMs 30000

# P1 claim-proof pack (OTel + runtime handoff endpoint+e2e in one artifact)
npm run proof:p1 -- --reportDir apps/evaluator/reports/latest --baseUrl http://127.0.0.1:8788

# P1 claim-proof pack in fully local/self-contained mode (auto-spawns demo-agent)
npm run proof:p1 -- --reportDir apps/evaluator/reports/latest --selfContained --selfContainedPort 8798

# Self-contained mode with port fallback window
npm run proof:p1 -- --reportDir apps/evaluator/reports/latest --selfContained --selfContainedPort 8798 --selfContainedPortAttempts 5
```
Release-gate E2E checks:
```bash
# verifies evaluator hard gate behavior (--failOnExecutionDegraded)
npm run e2e:policy-gate

# verifies runtime policy/tool-broker allowlist enforcement + policy audit evidence
npm run e2e:runtime-policy -- --ci

# validates plugin M3/M4 release-readiness (typecheck + tests + README contract sections)
npm run plugins:release-readiness

# CI-sized soak/load + artifact integrity + quality gate
npm run e2e:soak-load -- --ci

# Heavier local qualification profile (before external release)
npm run e2e:soak-load -- --caseCount 12 --loadConcurrency 6 --loadIterations 6 --soakCycles 3 --maxRuntimeVariance 2.5

# Full local toolkit regression (uses unique run/report IDs per launch; no manual cleanup)
npm run test:toolkit -- --baseUrl http://127.0.0.1:8796

# SBOM artifacts for supply-chain evidence (CycloneDX + SPDX)
npm run sbom -- --format cyclonedx --out .agent-qa/sbom/cyclonedx.json
npm run sbom -- --format spdx --out .agent-qa/sbom/spdx.json

# High-confidence secret scan (fails on committed keys/tokens/private-key blocks)
npm run security:secrets
```
Proof notes:
- `proof:otel` is expected to fail when the selected report has no `trace_id`/`span_id` anchors (for example, runs without anchor-enabled adapter/plugin).
- `proof:runtime-handoff` requires a running adapter at `--baseUrl`; if adapter is down, the command fails with an explicit health hint.
- `proof:p1` writes `p1-claim-proof.json` (default: inside `--reportDir`) and fails non-zero if any sub-proof fails (OTel anchors, runtime endpoint idempotency, runtime e2e receipt unless `--skipRuntimeE2E`). Use `--selfContained` when you need deterministic local proof without an external adapter process.
- `proof:p1 --selfContained` now retries startup across a sequential port window (`--selfContainedPortAttempts`) to reduce false failures from local bind conflicts.
- `e2e:runtime-policy` enforces near-term runtime controls in shipped path: blocked denied commands, wrapper-only telemetry escalation (`telemetry_untrusted`), and policy-audit log persistence.
- `plugins:release-readiness` writes `apps/evaluator/reports/plugins-release-readiness.json` and fails non-zero when plugin typecheck/tests fail or required README sections are missing (`Usage`, `Reliability`, `Security`, `Limitations`).
- `e2e:soak-load` now enforces: zero transport real-failures in load summary, healthy execution-quality across soak cycles, deterministic gate signatures across cycles, and bounded campaign runtime variance.

Note:
- Runner executes both `baseline` and `new` per case.
- CLI flags that take values require a delimiter: use `--timeoutMs 210000` or `--timeoutMs=210000` (not `--timeoutMs210000`).
- Effective runtime grows with `timeoutMs * (retries + 1)`; for slow local agents start with `--retries 0` and tune `--timeoutMs` intentionally.
- For slow/variable agents, prefer `--timeoutProfile auto` with `--timeoutAutoCapMs`; auto mode now learns only from successful history (failure-only history is ignored), requires `--timeoutAutoMinSuccessSamples` (default `3`), and bounds history growth via `--timeoutAutoMaxIncreaseFactor` (default `3`).
- `--timeoutProfile auto` now also constrains runner timeout by adapter server timeout safe window (`server_request_timeout_ms - 5000ms`) when `/health` exposes it.
- Runner now has a built-in Node HTTP fallback for long-running local calls when Node `fetch` fails waiting for headers (~300s class); this reduces false `network_error: fetch failed` on slow agents.
- Runner has a case-level inactivity watchdog: `--inactivityTimeoutMs` (auto default `max(timeoutMs + 30000, 120000)`) plus heartbeat logs via `--heartbeatIntervalMs`.
- Optional preflight before campaign start: `--preflightMode off|warn|strict` and `--preflightTimeoutMs`.
- In `--preflightMode strict`, timeout-contract mismatches (runner/adapter/server) are treated as blocking failures before case execution.
- Runner preflight canary now sends header `x-aq-preflight: 1`; `cli-agent-adapter` handles `case_id="__preflight__"` as a fast config/transport probe (no external CLI spawn), so strict preflight remains deterministic even for slow agents.
- Preflight now retries transient transport failures (`/health` + `/run-case` canary) before declaring strict-mode failure, reducing false blocks on unstable local networks.
- Optional fail-fast for infra meltdowns: `--failFastTransportStreak N` (stops after N consecutive transport-failed cases).
- `cli-agent-adapter` returns structured adapter reasons in `adapter_error.code`: `timeout`, `spawn_error`, `non_zero_exit`, `aborted`, `invalid_config`, `policy_violation`.
- `cli-agent-adapter` can return `adapter_error.code=busy` with HTTP `429` when `CLI_AGENT_MAX_CONCURRENCY` is reached.
- `cli-agent-adapter` enforces timeout cap via `CLI_AGENT_TIMEOUT_CAP_MS` (default `120000`) and exposes effective runtime config in `/health`.
- `cli-agent-adapter` emits wrapper telemetry (`tool_call/tool_result/final_output`) and supports best-effort extra tool extraction from text stdout (JSON lines + `▸ tool ...` traces, e.g. Goose-style); response includes `telemetry_mode=wrapper_only|inferred`.
- Plugin adapters (`langchain-adapter`, `openai-responses-adapter`) now fail fast with `adapter_error.code=invalid_telemetry` when upstream output indicates tool activity but no structured tool events can be extracted (prevents silent wrapper-only false confidence).
- `cli-agent-adapter` aligns HTTP server request timeout with CLI timeout via `CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS` (default: `CLI_AGENT_TIMEOUT_MS/CLI_AGENT_TIMEOUT_CAP_MS` effective value + `CLI_AGENT_SERVER_TIMEOUT_BUFFER_MS`).
- Tune server timeout envelope with `CLI_AGENT_SERVER_TIMEOUT_BUFFER_MS`, `CLI_AGENT_SERVER_HEADERS_TIMEOUT_MS`, and `CLI_AGENT_SERVER_KEEP_ALIVE_TIMEOUT_MS` to avoid 5-minute Node HTTP cutoff on long local-agent calls.
- Optional adapter auth for production: set `CLI_AGENT_AUTH_TOKEN` (plus optional `CLI_AGENT_AUTH_HEADER`) to require a token on `/run-case` and `/handoff`.
- Runtime handoff channel: `POST /handoff` (idempotent by `incident_id + handoff_id`, checksum validated).
- Optional persistent runtime handoff store: set `CLI_AGENT_HANDOFF_STORE_PATH` to survive adapter restarts; retention is bounded by `CLI_AGENT_HANDOFF_TTL_MS` and `CLI_AGENT_HANDOFF_MAX_ITEMS_TOTAL`.
- Runner propagates `run_meta` to `/run-case` (`run_id`, `incident_id`, `agent_id`), forwards per-case `metadata.handoff`, and can forward optional per-case `metadata.policy` (`planning_gate`, `repl_policy`).
- Evaluator supports deterministic policy assertions via case `expected.planning_gate` and `expected.repl_policy`; failed checks emit `policy_tampering` security signals and can escalate gate recommendation (`require_approval` / `block`).
- Compare report items now include required `policy_evaluation` block (`baseline/new` with `planning_gate_pass` and `repl_policy_pass`) for hard-contract policy auditing.
- Campaign quality validation now enforces strong telemetry contracts by default (`CASE_QUALITY_REQUIRE_STRONG_TELEMETRY=1` in `scripts/run-local-campaign.sh`), so wrapper-only telemetry is rejected for quality profile runs unless explicitly relaxed.
- Campaign quality validation now also enforces semantic text-eval contracts by default (`CASE_QUALITY_REQUIRE_SEMANTIC=1`): lexical text expectations must define `expected.semantic` rules; `reference_texts` must include either `semantic.profile` (`strict|balanced|lenient`) or both `semantic.min_token_f1` + `semantic.min_lcs_ratio`.
- Compare report items now include required `assumption_state` block (`baseline/new` with status/source/selected_count/rejected_count/reason_code) for decision-legibility auditing.
- Campaign quality validation now enforces assumption-state contracts by default (`CASE_QUALITY_REQUIRE_ASSUMPTION_STATE=1` in `scripts/run-local-campaign.sh`; `--requireAssumptionState` defaults to `1` in `scripts/validate-cases-quality.mjs`): expectation-bearing cases must define `expected.assumption_state` with `required=true` and `min_selected_candidates>=1`.
- Runner preserves optional OTel anchors (`trace_anchor`) and enriches from response headers (`traceparent` / `b3` / `x-trace-id`) when available.
- In `bundle:group`, each `--report <label=dir>` label is persisted as `agent_id` in the group index/manifest.
- Group bundles remain the evidence aggregation layer; runtime transfer is handled by `/handoff`.
- Keep adapter/agent timeout below runner timeout to avoid deterministic transport aborts (`runner timeout <= adapter timeout`).
- `SIGINT/SIGTERM` are handled gracefully: partial artifacts are kept, `run.json` is finalized with interruption metadata, and exit code is deterministic.
- Optional structured logs for machines: set `AQ_LOG_FORMAT=json`.

Evaluator:
```bash
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest
```
Safety limits:
```bash
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest --maxCaseBytes 10000000 --maxMetaBytes 2000000
```
Execution-quality gate (for CI):
```bash
AQ_MIN_TRANSPORT_SUCCESS_RATE=0.95 AQ_MAX_WEAK_EXPECTED_RATE=0.20 \
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest --failOnExecutionDegraded
```
KPI thresholds can also be included in the same gate:
```bash
AQ_MIN_TRANSPORT_SUCCESS_RATE=0.95 AQ_MAX_WEAK_EXPECTED_RATE=0.20 AQ_MIN_PRE_ACTION_ENTROPY_REMOVED=0.05 AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK=10 \
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest --failOnExecutionDegraded
```
KPI calibration command (derive recommended env thresholds from historical reports):
```bash
npm run kpi:calibrate -- --reportsRoot apps/evaluator/reports --last 50 --minReports 12 --out apps/evaluator/reports/kpi-calibration.json --json
```
Calibration notes:
- `kpi:calibrate` writes a machine-readable artifact with recommended values for:
  `AQ_MIN_PRE_ACTION_ENTROPY_REMOVED`, `AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK`, `AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT`.
- For low-sample windows, command fails by default; use `--allowLowSample` only for provisional baselines.

Report UX:
- `report.html` uses client-side filtering + pagination (`25/50/100/200` rows/page) with incremental chunked rendering, debounced text filtering, and large-report mode (`1500+` rows).

Tests:
```bash
npm test
npm run test:coverage
npm run metrics:dd
npm run conformance:test:python
npm run conformance:test:go
npm run conformance:test:signature
npm run release:gate:ci
```

---

## What’s in this repo
- `apps/demo-agent` — demo HTTP agent with deterministic baseline/new responses
- `apps/runner` — executes cases and writes run artifacts
- `apps/evaluator` — evaluates artifacts, computes risk/gates, generates HTML
- `packages/shared-types` — canonical contract types (runtime‑0)
- `packages/cli-utils` — CLI helpers + shared trace-anchor normalization/extraction
- `packages/redaction` — PII redaction engine
- `packages/agent-sdk` — HTTP server + helpers for connecting your agent
- `plugins/langchain-adapter` — LangChain runnable wrapper to `SimpleAgent`
- `plugins/openai-responses-adapter` — OpenAI Responses wrapper to `SimpleAgent`
- `plugins/otel-anchor-adapter` — trace-anchor enrichment wrapper (`trace_id`/`span_id`)
- `plugins/vendor-bridge` — vendor-agnostic converters (`Promptfoo` / `DeepEval` / `Giskard`) + baseline/new gate diff
- `validators/python` — Python baseline validator (AEPF/PVIP mode parity track)
- `validators/go` — Go baseline validator (AEPF/PVIP mode parity track)

Validator note:
- Python and Go validators both verify `manifest.sig` in `strict` mode when `AQ_MANIFEST_PUBLIC_KEY` is set.
- `npm run conformance:test:signature` performs strict-signature parity checks:
  signed-pack strict pass + tampered-manifest strict fail (Node/Python/Go validators).
- `npm run release:gate:ci` is the mandatory bundled release gate used in CI; it writes
  `apps/evaluator/reports/release-gate-ci.json` with step-by-step PASS/FAIL status.

---

## Pilot Program
We’re onboarding 5 teams in the pilot cohort.  
Apply: https://github.com/Tanyayvr/agent-qa-toolkit/issues/new?template=pilot_request.yml

---

## Paid Tiers (Pro / Pro+)
We keep the core self‑hosted toolkit open‑source. Paid tiers are **optional** and focused on advanced needs.

- **Pro (later):** scanner rules library  
- **Pro+ (later):** Historical Trending + retention management  

Pilot access to paid tiers is **free for early teams**.  
Details: `docs/pro.md`
