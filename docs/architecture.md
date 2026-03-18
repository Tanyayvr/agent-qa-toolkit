<!-- /docs/architecture.md -->
# Architecture (Self‑Hosted)

## Product Surfaces

The repository now exposes two product surfaces on top of one evidence engine, plus one public website surface for acquisition:

- **Agent Evidence Platform**: the core self-hosted packaging, verification, and contract surface for tool-using AI agents.
  Operator entrypoints:
  - `npm run evidence:agent:package -- ...`
  - `npm run evidence:agent:verify -- --reportDir <dir>`
  - `npm run evidence:agent:contracts`
  - `npm run demo:agent-evidence`
  - `npm run release:gate:agent-evidence`
- **EU AI Act Evidence Engine**: a vertical package on top of the core Agent Evidence surface.
  Operator entrypoints:
  - `npm run compliance:eu-ai-act -- ...`
  - `npm run compliance:eu-ai-act:verify -- --reportDir <dir>`
  - `npm run compliance:eu-ai-act:contracts`
  - `npm run demo:eu-ai-act`
  - `npm run release:gate:eu-ai-act`
- **EU AI Evidence Builder Website**: a static multilingual website generated into `docs/` and linked to the live proof hub.
  Operator entrypoints:
  - `npm run site:build`
  - `npm run site:verify`
  - `npm run site:refresh`

This split is deliberate:

- one shared engine and artifact model
- one generic product for agent release evidence
- one vertical package for EU-specific dossier and compliance exports
- one website publish root for stable product demos under `docs/demo/`
- one public acquisition layer under `docs/en/`, `docs/de/`, and `docs/fr/`

The website surface is intentionally static. It reuses checked-in proof assets and published demo artifacts instead of introducing a separate frontend runtime. `site:verify` compares the generated HTML against the checked-in output to prevent silent drift between the marketing surface and the real product artifacts.

## Documentation Surfaces

The repository now keeps a tighter split between public product docs and internal marketing docs:

- public entrypoint: [../README.md](../README.md)
- public engineering path: [engineering-qualification-path.md](engineering-qualification-path.md)
- public EU governance path: [eu-governance-evidence-path.md](eu-governance-evidence-path.md)
- public architecture and operator docs: this directory
- internal messaging and GTM source of truth: `docs/internal/market/`

This split is deliberate:

- public docs explain what the product does and how to operate it
- internal docs carry positioning variants, thought-leadership language, pitch material, and other non-product copy
- pricing, pilot packaging, and commercial experiments do not belong in the OSS README

## Structured Intake Layer

Before runner/evaluator packaging, the repository now supports a machine-readable intake layer for upstream requirements:

- `ops/intake/<profile>/system-scope.json`
- `ops/intake/<profile>/quality-contract.json`
- `ops/intake/<profile>/cases-coverage.json` after the reviewed suite is checked
- `ops/intake/<profile>/adapter-capability.json` after the live adapter onboarding gate runs
- `ops/intake/<profile>/run-fingerprint.json` after the baseline/new comparability gate runs
- optional draft `cases/<profile>.intake-scaffold.json`

Operator entrypoints:

- `npm run intake:init -- --profile <name> [--euDossierRequired 1]`
- `npm run intake:validate -- --profile <name>`
- `npm run intake:scaffold:cases -- --profile <name>`
- `npm run intake:check:cases -- --profile <name> --cases <cases.json>`
- `npm run intake:check:adapter -- --profile <name> --cases <cases.json> --baseUrl <adapter>`
- `npm run intake:check:runs -- --profile <name> --cases <cases.json> --baselineDir <run-dir> --newDir <run-dir>`
- `npm run review:init -- --reportDir <report-dir> [--profile <name>]`
- `npm run review:check -- --reportDir <report-dir> [--profile <name>]`

This layer is deliberate:

- it turns scoping and quality expectations into stable JSON artifacts
- it validates readiness before adapter or case work starts
- it persists intake-to-case coverage as a machine-readable stage artifact
- it persists a machine-readable adapter capability profile after the live onboarding gate
- it persists a machine-readable run fingerprint after the baseline/new comparability gate
- it verifies that a live adapter can satisfy the required `/run-case` telemetry depth on a reviewed canary case
- it verifies that baseline/new runner directories are structurally comparable before packaging
- it scaffolds a structured human review record after packaging
- it persists a recurring corrective-action register after successful review checks
- it validates that the handoff package no longer contains placeholder decisions or open machine gaps
- it makes human-owned fields explicit instead of hiding them in email or notes

Automation boundary:

- automated: schema validation, cross-file consistency checks, starter case scaffolding, case completeness checks against the intake contract, adapter onboarding probes against `/health` plus live `/run-case`, and baseline/new run comparability checks before packaging
- still human-owned: intended use, business harms, deployment assumptions, approval/block policy choices, final narrative, legal signoff

For the exact split between intentional manual work, current operational tech debt, and optional expansion backlog, see [Automation Boundary and Tech Debt](automation-boundary-and-tech-debt.md).

## Core pipeline

1) **Intake** captures upstream operator inputs before runtime evaluation begins.
   `system-scope.json` defines the system/change/owners boundary.
   `quality-contract.json` defines critical tasks, prohibited behaviors, risky actions, telemetry expectations, and case-quality targets.
   A draft `cases.json` can be scaffolded from intake, but it still requires human review before it becomes a quality-grade suite.
2) **Runner** executes cases against `/run-case` and writes artifacts to `apps/runner/runs/*`.
3) **Evaluator** compares baseline vs new, produces HTML + JSON report under `apps/evaluator/reports/*`.
   If a side has `runner_failure`, evaluator preserves failure artifacts/signals and forces that side's `*_pass=false` (conservative summary semantics).
  HTML report renders the cases table lazily from embedded rows JSON, applies client-side pagination,
  and uses incremental chunked page rendering + debounced text filtering to stay responsive on large runs.
4) **Evidence pack** is the report directory (manifest + assets + report.html + compare-report.json).
   Product-grade packaging snapshots the operator inputs into `_source_inputs/` inside the report directory,
   so the bundle preserves `cases.json`, baseline run, and new run as portable handoff inputs.
   Local campaign script (`scripts/run-local-campaign.sh`) ingests generated reports into the local library by default (`.agent-qa/library`, opt-out via `LIBRARY_INGEST=0`).
   For `CAMPAIGN_PROFILE=quality`, campaign orchestration is staged by default: `smoke` (`infra` + small subset) -> auto-promote to full quality only on green smoke.
5) **Optional vertical exports** may be added when a compliance profile is supplied.
   The current vertical package is EU AI Act:
   clause coverage + Annex IV dossier + Article 13 instructions scaffold + Article 9 risk register scaffold + Article 17 QMS-lite scaffold + Article 72 monitoring-plan scaffold + oversight/release/monitoring exports under `compliance/`.
6) **Structured review handoff** can be scaffolded directly inside a report directory:
   `npm run review:init -- --reportDir <dir> [--profile <name>]`
   creates `review/review-decision.json`, `review/handoff-note.md`, and optional `review/intake/*` snapshots.
   `npm run review:check -- --reportDir <dir>`
   validates the schema plus the human-owned readiness rules: no `pending` decision, no `TODO` placeholders, no undispositioned machine gaps, and for EU bundles no incomplete owner-completion loop for Article 13, Article 17, or Article 72 scaffolds.
   When an intake profile is attached, the same check also syncs `ops/intake/<profile>/corrective-action-register.json` and refreshes `review/intake/corrective-action-register.json`, so repeated machine gaps keep continuity across runs.
7) **Group bundle (`P1`)** can aggregate multiple report directories under one incident:
   `npm run bundle:group -- --report a=<reportDirA> --report b=<reportDirB> ...`
   producing `index.html`, `group-index.json`, and `group-manifest.json` with checksum verification via
   `npm run bundle:group:verify`.
   Labels from `--report <label=...>` are persisted as `agent_id` for per-agent navigation.
   This layer is packaging/indexing only.
7) **Runtime handoff channel (`/handoff`)** supports live agent-to-agent transfer:
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
- **Timeout root-cause taxonomy (machine-readable)**: timeout/transport failures carry deterministic `timeout_cause`:
  `timeout_budget_too_small`, `agent_stuck_or_loop`, `waiting_for_input`, `transport_failure`, `unknown_timeout`.
  Evaluator propagates this into `failure_summary` so staged gating and incident triage can distinguish budget vs stuck vs interactive wait.
- **Runner preflight**: optional adapter readiness checks via `--preflightMode off|warn|strict` and `--preflightTimeoutMs`
  (`/health` + canary `/run-case`) to catch infra issues before full campaigns.
  The canary includes `x-aq-preflight: 1`; `cli-agent-adapter` short-circuits `case_id="__preflight__"` into
  a deterministic readiness response without spawning the external CLI process.
  Preflight requests retry transient transport failures before strict-mode blocking.
- **Runtime handoff proof checks**: `node scripts/proof-runtime-handoff.mjs --baseUrl <adapter> --mode endpoint|e2e`
  validates `/handoff` idempotency (endpoint mode) and optional `/run-case` receipt propagation (e2e mode).
- **P1 claim-proof pack**: `node scripts/proof-p1-claim-pack.mjs --reportDir <report> --baseUrl <adapter>`
  produces one machine-readable artifact (`p1-claim-proof.json`) that combines OTel anchor proof + runtime handoff endpoint/e2e checks.
- **Adaptive timeout profile**: optional `--timeoutProfile auto` adjusts `timeoutMs` using historical case latencies and adapter `/health` timeout hints;
  bounded by `--timeoutAutoCapMs` to avoid unbounded waits. Auto-learning uses successful history only,
  ignores failure-only history, requires `--timeoutAutoMinSuccessSamples`, and caps history-driven growth
  with `--timeoutAutoMaxIncreaseFactor`.
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
  `AQ_MIN_TRANSPORT_SUCCESS_RATE`, `AQ_MAX_WEAK_EXPECTED_RATE`,
  `AQ_MIN_PRE_ACTION_ENTROPY_REMOVED`, `AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK`.
  `scripts/run-local-campaign.sh` enables this gate by default (`EVAL_FAIL_ON_EXECUTION_DEGRADED=1`).
- **Default staged UX (`quick` first, heavier paths only by explicit mode)**:
  The operator contract is now "qualification + evidence + right-sized validation path", not "one loop for every agent".
  `run-local-campaign.sh` emits typed stage decisions (`stage`, `reason`, `next_action`) and stops before full run on red smoke.
  Each report directory additionally receives `devops-envelope.json` with effective runtime bounds
  (`timeout*`, retries, concurrency, preflight, fail-fast) plus operator classification
  (`runMode`, `runtimeClass`, `profileName`), so operators can audit/replicate the exact envelope.
  `STAGED_MODE=0` preserves legacy single-stage behavior for CI or targeted profiling runs.
	  `scripts/run-agent-profile.sh` adds the operator-facing layer:
	  - `npm run campaign:agent:init -- --profile <name> --cliCmd <cmd> ...` bootstraps `ops/agents/<name>.env` from template for first-time external agents;
	  - default `quick` mode = optional `calibration` + `smoke`, then stop;
  - explicit `--full-lite` = green quick gate plus auto-promotion into a reduced quality subset;
  - explicit `--full` = green quick gate plus auto-promotion into full quality campaign;
  - explicit `--diagnostic` = full quality campaign with a more generous timeout envelope for known slow-but-live agents.
  This separation is deliberate:
  - `quick` = readiness/triage contract,
  - `full-lite` = practical developer-grade regression contract,
  - `full` = quality-certification contract,
  - `diagnostic` = long-run investigation contract.
  Runtime class is also deliberate: the toolkit does not assume every local agent belongs in the same loop.
  `fast_remote` and `standard_cli` may fit normal local full runs; `slow_local_cli` and `heavy_mcp_agent`
  often require quick-first local loops, `full-lite` for local iteration, and full/diagnostic on a longer or dedicated path.
  DevOps owns the runtime envelope (`TIMEOUT_MS`, `TIMEOUT_AUTO_CAP_MS`, retries, concurrency, sample count);
  runner auto-tuning stays inside that envelope and must not silently upgrade quick into a heavier mode unless that mode was requested.
  Profiles can also own the adapter envelope. When `ADAPTER_MANAGED=1`, `scripts/run-agent-profile.sh`
  restarts `cli-agent-adapter` with an aligned runtime contract before the campaign starts:
  - `CLI_AGENT_TIMEOUT_MS`
  - `CLI_AGENT_TIMEOUT_CAP_MS`
  - `CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS`
  The launcher uses the selected run mode plus smoke/calibration requirements to compute one adapter envelope,
  so operators do not hand-tune adapter and runner timeouts separately.
  Profiles that depend on MCP can also own the MCP envelope. When `MCP_MANAGED=1`, the launcher restarts
  the MCP server with a larger contract than the adapter:
  - `MCP_TIMEOUT_MS`
  - `MCP_SERVER_REQUEST_TIMEOUT_MS`
  - `MCP_HEADERS_TIMEOUT_MS`
  - `MCP_KEEP_ALIVE_TIMEOUT_MS`
  This preserves a strict chain with buffers: `runner < adapter < MCP`.
  When timeout history is missing, the run is treated as `first-run` and the initial envelope comes from runtime-class defaults for that mode
  (`fast_remote`, `standard_cli`, `slow_local_cli`, `heavy_mcp_agent`). These first-run defaults are the
  conservative upper bound for the class, so the first run is budgeted honestly instead of starting with a low guess.
  Those class defaults are intentionally defined in one shared runtime-policy module so launcher planning and advisor recommendations do not diverge.
  After a successful run exists, timeout learning is scoped to `profile + mode + case-signature`; one agent's history must not tune another agent's first run.
  If managed adapter is disabled, the launcher still checks `/health` and blocks early on an envelope mismatch,
  printing the exact restart command that would satisfy the run.
  Launcher/runtime also emit machine-readable operator planning artifacts:
  - pre-run estimate (console) with `recommendedMode` + confidence
  - `next-envelope.json` in report directories with the next suggested mode/envelope after smoke pass or timeout-budget failure
  This is what lets the product answer: "can this agent be trusted in a normal engineering/release loop, and if not, what is the honest validation path?"
- **Semantic text-eval layer**: evaluator supports deterministic semantic assertions
  (`expected.semantic.required_concepts`, `forbidden_concepts`, `reference_texts`, `profile|min_token_f1|min_lcs_ratio`, `synonyms`),
  so text checks are not limited to raw substring matching.
- **Release-gate E2E in CI**:
  `scripts/e2e-policy-gate.mjs` verifies evaluator hard-gate behavior,
  `scripts/e2e-runtime-policy.mjs` verifies runtime policy/tool-broker allowlist enforcement + policy audit persistence,
  and `scripts/e2e-soak-load.mjs` validates load/soak campaign stability + artifact integrity, including:
  zero load real-failures, healthy execution-quality in each soak cycle, deterministic gate signatures across cycles,
  and bounded runtime variance (`--maxRuntimeVariance`).
- **Admissibility KPI (numeric)**: evaluator also emits
  `summary.execution_quality.admissibility_kpi` with:
  - `risk_mass_before`, `risk_mass_after`
  - `pre_action_entropy_removed`
  - `reconstruction_minutes_saved_total`, `reconstruction_minutes_saved_per_block`
  This keeps probability-space (risk mass) separate from cost-space (human minutes).
  Risk model assumptions are persisted in the same object for auditability.
  `AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT` can tune minutes conversion without changing report shape.
  `scripts/kpi-calibrate.mjs` derives recommended KPI env thresholds from historical compare reports
  (`AQ_MIN_PRE_ACTION_ENTROPY_REMOVED`, `AQ_MIN_RECON_MINUTES_SAVED_PER_BLOCK`, `AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT`)
  and fails on low-sample windows unless explicitly overridden.
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
- This repository contains the technical trend engine used by the product surfaces above.
- Packaging, support, and commercial rollout decisions live outside the OSS entry docs.

## Technical due diligence bridge

To support independent verification, the repo keeps a direct bridge from code to artifacts:

- commit/date timeline with measurable deltas: `docs/CHRONOLOGY.md`
- deterministic verification checklist: `docs/VERIFY.md`
- machine-readable CI truth: `compare-report.json` (`gate_recommendation`, `execution_quality`)
- human triage truth: `report.html` + per-case replay pages

This prevents "dashboard-only" claims and allows third parties to reproduce runs locally.
Release-quality gate includes high-confidence secret scanning (`npm run security:secrets`) in addition to lint/type/test/docs/audit.

## Validator modes & conformance

`pvip-verify` supports layered modes:

- **AEPF (format-only)** — schema + required fields
- **PVIP (default)** — portability, manifest integrity, href checks
- **Strict** — signature + zero violations

Golden packs live in `conformance/` with `expected.json` per pack.
Baseline multi-language validator track now includes Python CLI parity checks
(`validators/python/aepf_validator/cli.py`, exercised via `scripts/conformance-test-python.mjs`).
Go baseline is added in `validators/go/aepf-validator` with parity runner
`scripts/conformance-test-go.mjs`.
Both validators enforce strict-mode signature verification when
`AQ_MANIFEST_PUBLIC_KEY` is provided.
Strict-signature parity (signed pass + tampered fail) across Node/Python/Go
is exercised by `scripts/conformance-test-signature.mjs`.
CI release entrypoint is `npm run release:gate:ci`, which bundles repository quality,
explicit product-surface gates (`agent_evidence_surface_gate`, `eu_ai_act_surface_gate`),
conformance, policy/runtime e2e, soak/load, toolkit compatibility, and `proof:p1`
self-contained checks, and writes a machine-readable summary at
`apps/evaluator/reports/release-gate-ci.json`.
Product-grade contract freeze now exists for both product surfaces:
- `npm run evidence:agent:contracts`
- `npm run compliance:eu-ai-act:contracts`
Product-grade demo entrypoints also exist for both product surfaces:
- `npm run demo:agent-evidence`
- `npm run demo:eu-ai-act`
Website publishing entrypoint:
- `npm run demo:publish:surfaces`
It publishes a stable proof surface under `docs/demo/` with:
- `index.html`
- `product-surfaces.json`
- `agent-evidence/`
- `eu-ai-act/`

## Optional adapters (plugin packages)

Reference plugin adapters are shipped in-repo under `plugins/*`:

- `plugins/langchain-adapter`
- `plugins/openai-responses-adapter`
- `plugins/otel-anchor-adapter`
- `plugins/vendor-bridge` (Promptfoo / DeepEval / Giskard import + canonical baseline/new gate diff)

They are optional and not required for the core pipeline to function.
Plugin release-readiness (P1.2 M3/M4 baseline) is validated by `npm run plugins:release-readiness`,
which enforces plugin workspace typecheck, plugin tests, and required README sections
(`Usage`, `Reliability`, `Security`, `Limitations`).
The local CLI adapter surfaces normalized failure causes (`timeout`, `spawn_error`, `non_zero_exit`, `aborted`, `invalid_config`, `busy`, `policy_violation`)
in `adapter_error.code` for fast root-cause triage.
Telemetry normalization follows three levels:
- **native**: adapter/plugin receives structured `events/proposed_actions` from agent runtime (highest fidelity).
- **inferred**: CLI adapter infers extra tool calls from stdout traces (JSON line / `▸ tool ...`) when native telemetry is absent.
- **wrapper_only**: deterministic fallback wrapper telemetry (`cli_agent_exec` tool_call/tool_result + final_output) is always emitted.
  Runtime responses expose this as `telemetry_mode=wrapper_only`; quality profiles can reject this mode.
Plugin adapters hard-fail with `adapter_error.code=invalid_telemetry` when upstream payload indicates tool activity
but extracted structured tool events are empty; this prevents silent "wrapper-only" false positives in release gates.
Inferred tool calls carry attestation fields (`_inferred_source_line_no`, `_inferred_source_line_hash`) so evaluator can audit provenance.
It also applies a runtime timeout cap (`CLI_AGENT_TIMEOUT_CAP_MS`) and reports effective runtime settings via `/health`.
To prevent long-running agent requests from being cut at Node's HTTP-server layer, the adapter configures
server-side timeouts from CLI runtime budget (`CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS`, `CLI_AGENT_SERVER_TIMEOUT_BUFFER_MS`,
`CLI_AGENT_SERVER_HEADERS_TIMEOUT_MS`, `CLI_AGENT_SERVER_KEEP_ALIVE_TIMEOUT_MS`).
Runner `timeoutProfile=auto` consumes these timeout hints and constrains selected timeout to the adapter server safe window.
`preflightMode=strict` treats timeout-contract mismatches as blocking errors to stop flaky long campaigns early.
For production hardening, adapter auth can be enabled via `CLI_AGENT_AUTH_TOKEN` (optional `CLI_AGENT_AUTH_HEADER`).
Persistent handoff retention is bounded by `CLI_AGENT_HANDOFF_TTL_MS` and `CLI_AGENT_HANDOFF_MAX_ITEMS_TOTAL`.
Runner can also forward optional per-case runtime policy (`metadata.policy`) with `planning_gate` and `repl_policy` blocks.
CLI adapter validates and enforces this runtime policy against emitted telemetry and can block response with
`adapter_error.code=policy_violation` plus structured `policy_violations` (returned as a non-transport response to preserve deterministic evaluator handling).
Policy violations are also appended to an audit log (`.agent-qa/policy-violations.ndjson`, configurable via `CLI_AGENT_POLICY_AUDIT_PATH`).
Evaluator enforces deterministic `planning_gate` / `repl_policy` assertions from case expectations and emits `policy_tampering`
signals that map to gate escalation (`require_approval` / `block`).
`compare-report` item schema requires `policy_evaluation`, making policy pass/fail contract-mandatory per case.
Evaluator also enforces a decision-legibility `assumption_state` assertion. It prefers response-native
`assumption_state`, can deterministically derive fallback counts from telemetry (`proposed_actions`/`tool_call`/`retrieval`),
and emits typed reason codes (`assumption_state_missing`, `selected_candidates_below_min`, etc.) for gating.
`compare-report` item schema requires `assumption_state` per side (`status`, `source`, `selected_count`, `rejected_count`, `reason_code`).
Quality campaign validation (`scripts/validate-cases-quality.mjs`) can require semantic contracts for lexical text expectations
(`--requireSemanticQuality 1`, enabled by default in `scripts/run-local-campaign.sh` via `CASE_QUALITY_REQUIRE_SEMANTIC=1`).
Quality campaign validation also requires assumption-state contracts by default
(`--requireAssumptionState` defaults to `1`; `scripts/run-local-campaign.sh` passes `CASE_QUALITY_REQUIRE_ASSUMPTION_STATE=1`).
For `reference_texts`, validation requires calibrated thresholds via either `semantic.profile` or explicit
`semantic.min_token_f1` + `semantic.min_lcs_ratio`.

## OSS hardening backlog (post-current release)

Aligned with external production-agent lessons, the next OSS hardening items are:

- deterministic eval expansion for objective tasks (`set similarity` / `sequence alignment` / optional layout-pixel comparators)
- planning/repl runtime hardening phase 2: extend current adapter-level enforcement to stricter execution-layer controls (mutation broker, REPL allow/deny, IO/time/path caps)
- richer REPL artifact evidence (command-level deny reasons, bounded command payloads, signed policy audit exports)

These are product-hardening tasks, not paid-only features.


## Environment metadata

Evaluator reads `--environment <json>` and preserves the full object in `compare-report.json.environment`.
Use this for:

- model/version/temperature
- deployment context (git SHA, config hash)
- OTel anchors (trace_id / span_id)
