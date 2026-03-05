<!-- /docs/architecture.md -->
# Architecture (Self‑Hosted)

## Core pipeline

1) **Runner** executes cases against `/run-case` and writes artifacts to `apps/runner/runs/*`.
2) **Evaluator** compares baseline vs new, produces HTML + JSON report under `apps/evaluator/reports/*`.
   If a side has `runner_failure`, evaluator preserves failure artifacts/signals and forces that side's `*_pass=false` (conservative summary semantics).
  HTML report renders the cases table lazily from embedded rows JSON, applies client-side pagination,
  and uses incremental chunked page rendering + debounced text filtering to stay responsive on large runs.
3) **Evidence pack** is the report directory (manifest + assets + report.html + compare-report.json).
4) **Group bundle (`P1`)** can aggregate multiple report directories under one incident:
   `npm run bundle:group -- --report a=<reportDirA> --report b=<reportDirB> ...`
   producing `index.html`, `group-index.json`, and `group-manifest.json` with checksum verification via
   `npm run bundle:group:verify`.
   Labels from `--report <label=...>` are persisted as `agent_id` for per-agent navigation.
   This layer is packaging/indexing only.
5) **Runtime handoff channel (`/handoff`)** supports live agent-to-agent transfer:
   - idempotent by `incident_id + handoff_id`
   - checksum-validated envelope (`sha256` canonical payload)
   - optional inline handoff on `/run-case` plus `run_meta` routing (`run_id`, `incident_id`, `agent_id`)
   - adapters/agents may expose `handoff_receipts` in case responses for auditability.
   - optional persistent store mode (`CLI_AGENT_HANDOFF_STORE_PATH`) keeps handoffs across adapter restarts.

Both runner and evaluator use atomic writes (temp + rename) for report-critical artifacts to avoid partial/corrupted JSON/HTML on crashes.
Evaluator enforces JSON size guards (`--maxCaseBytes`, `--maxMetaBytes`) to avoid unbounded memory usage on malformed or oversized artifacts.
Runner and evaluator share CLI parsing/validation guards via `packages/cli-utils` to avoid drift in argument semantics.
The same shared package also provides trace-anchor normalization/extraction helpers (`traceparent`, `b3`, header/body/event merge rules), so trace handling is consistent across runner and evaluator.
Runtime orchestration helpers are split into focused modules to reduce regression risk:
`apps/runner/src/historyTimeout.ts`, `apps/evaluator/src/executionQuality.ts`,
`apps/evaluator/src/summaryBySuite.ts`, `apps/evaluator/src/htmlFormatters.ts`,
`apps/runner/src/runnerRequest.ts`, `apps/evaluator/src/evaluatorMetadata.ts`,
`apps/evaluator/src/evaluatorRedaction.ts`, `apps/evaluator/src/evaluatorScanners.ts`,
`apps/evaluator/src/evaluatorSummary.ts`, `apps/evaluator/src/evaluatorFinalization.ts`,
`apps/evaluator/src/evaluatorTrend.ts`, `apps/evaluator/src/evaluatorRetention.ts`.

## Drift / flakiness scenarios

Runner and evaluator support additional scenarios for production drift:

- **Token usage tracking**: agent may return `token_usage` (input/output/total tokens, tool call count, `loop_detected`, `loop_details`).
  Runner persists this per run and aggregates per-case in `flakiness.json` when `--runs > 1`.
- **Flakiness detection (`--runs N`)**: runner executes each case N times and writes `flakiness.json`
  with `baseline_pass_rate` / `new_pass_rate` and optional token usage aggregates.
- **Prompt version tracing**: runner captures Git context (`git_commit`, `git_branch`, `git_dirty`)
  and writes it into `run.json` and `flakiness.json`.
- **OTel trace anchors**: runner preserves/derives `trace_anchor` (`trace_id` / `span_id` / `traceparent`)
  and evaluator copies anchors into `compare-report.json`, `case-*.html`, and `assets/trace_anchor/*` with manifest keys.
  Proof command for outbound claims: `node scripts/proof-otel-anchors.mjs --reportDir <reportDir> --minCases 1`.
- **Overnight drift CI**: GitHub workflow `agent-drift-detection.yml` runs nightly or on-demand,
  evaluates drift, and gates on `cases_block_recommended` / `cases_requiring_approval`.
- **Graceful shutdown**: runner/evaluator trap `SIGINT`/`SIGTERM`, persist interruption metadata, and exit with deterministic code (`130`/`143`).
- **Runner inactivity watchdog**: runner aborts a case when no progress heartbeat is observed for `--inactivityTimeoutMs`;
  heartbeat telemetry is emitted every `--heartbeatIntervalMs` to surface slow/stuck requests.
- **Runner preflight**: optional adapter readiness checks via `--preflightMode off|warn|strict` and `--preflightTimeoutMs`
  (`/health` + canary `/run-case`) to catch infra issues before full campaigns.
  The canary includes `x-aq-preflight: 1`; `cli-agent-adapter` short-circuits `case_id="__preflight__"` into
  a deterministic readiness response without spawning the external CLI process.
  Preflight requests retry transient transport failures before strict-mode blocking.
- **Runtime handoff proof checks**: `node scripts/proof-runtime-handoff.mjs --baseUrl <adapter> --mode endpoint|e2e`
  validates `/handoff` idempotency (endpoint mode) and optional `/run-case` receipt propagation (e2e mode).
- **Adaptive timeout profile**: optional `--timeoutProfile auto` adjusts `timeoutMs` using historical case latencies and adapter `/health` timeout hints;
  bounded by `--timeoutAutoCapMs` to avoid unbounded waits.
- **Agent onboarding phases** (recommended for new external agents):
  - calibration runs: high cap + no fail-fast to learn runtime distribution
  - validation runs: restore retries/fail-fast and confirm `execution_quality`
  - production: cap derived from observed p99 (commonly ~2x p99) with watchdog + trend enabled
- **Long-request transport fallback**: runner retries via Node HTTP transport for the known Node `fetch` long-header wait failure pattern
  (the `fetch failed` ~300s class), reducing false network failures for slow local agents.
- **Fail-fast transport guard**: optional `--failFastTransportStreak N` stops campaigns after N consecutive transport-failed cases
  to avoid spending hours on known infra degradations.
- **Synthetic fault-matrix validation**: `cases/matrix.json` (run with `CAMPAIGN_PROFILE=infra`) injects deterministic
  HTTP/network/data failures through controllable adapters (for example `demo-agent`) so teams can verify
  failure taxonomy (`http_error`, `timeout`, `network_error`, `invalid_json`) and gate behavior before customer pilots.
- **Execution-quality gating**: evaluator emits `summary.execution_quality` (transport success + weak expected rate);
  CI can enforce non-zero exit with `--failOnExecutionDegraded` and thresholds:
  `AQ_MIN_TRANSPORT_SUCCESS_RATE`, `AQ_MAX_WEAK_EXPECTED_RATE`.
- **Admissibility KPI (numeric)**: evaluator also emits
  `summary.execution_quality.admissibility_kpi` with:
  - `risk_mass_before`, `risk_mass_after`
  - `pre_action_entropy_removed`
  - `reconstruction_minutes_saved_total`, `reconstruction_minutes_saved_per_block`
  This keeps probability-space (risk mass) separate from cost-space (human minutes).
  Risk model assumptions are persisted in the same object for auditability.
  `AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT` can tune minutes conversion without changing report shape.
- **Structured logs (optional)**: set `AQ_LOG_FORMAT=json` to emit machine-ingestable JSON events in runner/evaluator while keeping human-readable console output.

## Security scanners

Evaluator runs a layered scanner set (6 total):

- **Entropy scanner** (optional flag) — token exfiltration patterns + high-entropy strings
- **PII/secret scanner** — emails, phones, SSN/CC, passport, INN, secret-like fields
- **Prompt injection scanner** — prompt injection markers + context poisoning
- **Action risk scanner** — high‑risk tool calls, permission changes, unsafe code execution
- **Exfiltration scanner** — untrusted URLs, outbound requests, data exfiltration
- **Output quality scanner** — model refusals, hallucination signals, bias/compliance placeholders

## Historical trending (local, offline)

After each evaluator run, trend data can be ingested into a local SQLite DB:

- storage: `.agent-qa/trend.sqlite` (local filesystem, not NFS/SMB)
- CLI: `npm run trend -- runs|case|tokens|flaky|html`
- HTML: offline `trend.html` (vendored Chart.js; tables-only fallback)
- run trend includes admissibility KPI dynamics: `pre_action_entropy_removed` and `reconstruction_minutes_saved_per_block`
- developer practice: keep two outputs:
  - full-history trend (all releases)
  - KPI-window trend (`--since <kpi_rollout_date>`) for release gating reviews
- pre-KPI reports naturally have null KPI fields in trend rows

Product note:
- This repository contains technical trend capabilities for pilot validation.
- Commercial packaging/support for Historical Trending is positioned as Pro+.

## Technical due diligence bridge

To support independent verification, the repo keeps a direct bridge from code to artifacts:

- commit/date timeline with measurable deltas: `docs/CHRONOLOGY.md`
- deterministic verification checklist: `docs/VERIFY.md`
- machine-readable CI truth: `compare-report.json` (`gate_recommendation`, `execution_quality`)
- human triage truth: `report.html` + per-case replay pages

This prevents "dashboard-only" claims and allows third parties to reproduce runs locally.

## Validator modes & conformance

`pvip-verify` supports layered modes:

- **AEPF (format-only)** — schema + required fields
- **PVIP (default)** — portability, manifest integrity, href checks
- **Strict** — signature + zero violations

Golden packs live in `conformance/` with `expected.json` per pack.

## Optional adapters (plugin packages)

Reference plugin adapters are shipped in-repo under `plugins/*`:

- `plugins/langchain-adapter`
- `plugins/openai-responses-adapter`
- `plugins/otel-anchor-adapter`
- `plugins/vendor-bridge` (Promptfoo / DeepEval / Giskard import + canonical baseline/new gate diff)

They are optional and not required for the core pipeline to function.
The local CLI adapter surfaces normalized failure causes (`timeout`, `spawn_error`, `non_zero_exit`, `aborted`, `invalid_config`, `busy`)
in `adapter_error.code` for fast root-cause triage.
It also applies a runtime timeout cap (`CLI_AGENT_TIMEOUT_CAP_MS`) and reports effective runtime settings via `/health`.
To prevent long-running agent requests from being cut at Node's HTTP-server layer, the adapter configures
server-side timeouts from CLI runtime budget (`CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS`, `CLI_AGENT_SERVER_TIMEOUT_BUFFER_MS`,
`CLI_AGENT_SERVER_HEADERS_TIMEOUT_MS`, `CLI_AGENT_SERVER_KEEP_ALIVE_TIMEOUT_MS`).
Runner `timeoutProfile=auto` consumes these timeout hints and constrains selected timeout to the adapter server safe window.
`preflightMode=strict` treats timeout-contract mismatches as blocking errors to stop flaky long campaigns early.
For production hardening, adapter auth can be enabled via `CLI_AGENT_AUTH_TOKEN` (optional `CLI_AGENT_AUTH_HEADER`).
Persistent handoff retention is bounded by `CLI_AGENT_HANDOFF_TTL_MS` and `CLI_AGENT_HANDOFF_MAX_ITEMS_TOTAL`.

## OSS hardening backlog (post-current release)

Aligned with external production-agent lessons, the next OSS hardening items are:

- deterministic eval expansion for objective tasks (`set similarity` / `sequence alignment` / optional layout-pixel comparators)
- stronger pre-execution planning gate checks (`declared_end_state` vs mutation payload -> `require_approval` or `block`)
- stricter REPL execution policy (allowlist, IO/time limits, risky syscall/path guardrails, explicit audit trail in evidence artifacts)

These are product-hardening tasks, not paid-only features.


## Environment metadata

Evaluator reads `--environment <json>` and preserves the full object in `compare-report.json.environment`.
Use this for:

- model/version/temperature
- deployment context (git SHA, config hash)
- OTel anchors (trace_id / span_id)
