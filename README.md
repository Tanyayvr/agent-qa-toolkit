<!-- /README.md -->
# Agent QA Toolkit — Portable Evidence Packs, Regression Diffs, and CI Gates (Stage 1)

Benchmark-quality toolkit for teams building tool-using AI agents.

## What you get (Stage 1)

Turn agent runs into a portable evidence pack you can share and gate in CI:

**Incident → Portable Evidence Pack → RCA → Risk/Gate Decision**

You get:

- Baseline vs New regression runs
- Per-case replay diff (`case-<case_id>.html`) for human triage
- Machine report (`compare-report.json`) as the **source of truth** for CI dashboards and gating
- Root cause attribution (RCA) and policy hints
- Security Signals Pack (signals may be empty in demo)
- Stage 2 (queued): evidence-linked governance (policy-as-code / approvals / runtime gates)

---

## Data handling (Self-hosted only)

This toolkit is **local-first and self-hosted**:

- No SaaS backend.
- No user accounts, no payments, no external storage.
- All artifacts are written to **local disk** and remain under your control.
- You decide if/where to share bundles (zip/CI artifacts), and you own retention.

This reduces compliance scope: data does not leave your environment unless you export it.

See formal policy: `docs/self-hosted.md`
Deployment: `docs/self-hosted-deploy.md`
CI: `docs/ci.md`

---

## UI & Integration

**UI (current):**
- Filters/search + suite filters
- Baseline vs new comparison in one view
- Evidence/trace visibility
- Regression/improvement row highlights

**Integration options:**

### A) File‑based (current)
- Share `reports/<id>` as zip/tar.
- Fully offline and enterprise‑friendly.

### B) HTTP API (next step)
- Runner uploads bundle to a customer‑owned endpoint.
- Viewer fetches bundles from customer storage.
- Requires customer‑managed auth and storage.

### C) CI‑native
- Runner/Evaluator in CI.
- Artifacts stored in CI storage.
- Viewer opens artifacts with no vendor access.

---

## Stages (Stage 1–3)

- **Stage 1 (MUST):** Portable report directory + evidence links + CI gating truth (this repo ships this now).
- **Stage 2 (QUEUED / NEXT):** Evidence-linked action governance (policy enforcement + approvals) using Stage 1 evidence.
- **Stage 3 (VISION):** Repro + causal debug platform (replay ladder + counterfactual experiments). Not required for Stage 1.

---

## What’s in this repo

Monorepo (npm workspaces):

- `apps/demo-agent` — demo HTTP agent with deterministic baseline/new responses
- `apps/runner` — CLI that executes cases against the agent and writes run artifacts
- `apps/evaluator` — CLI that evaluates artifacts, assigns RCA, computes risk/gates, and generates HTML reports
- `packages/shared-types` — canonical contract types shared across all apps (runtime-0: types only, zero dependencies)

Quality bar (benchmark mode):

- ESLint v9 flat config
- Strict TypeScript (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, no `any`)
- `npm audit` clean
- All commands run from repo root

---

## Stage 1: Portable Evidence Pack (what “portable” means)

Evaluator produces a **self-contained report directory** (copyable anywhere) that includes:

- `report.html` — overview report for humans
- `case-<case_id>.html` — per-case replay diff (**required for humans**)
- `compare-report.json` — machine report (**source of truth for CI gating**)
- `assets/` — copies of referenced payload evidence
- `artifacts/manifest.json` — evidence manifest (canonical mapping)

Report schema:
- `schemas/compare-report-v5.schema.json`
- validated in `npm run test:toolkit`

Manifest integrity:
- manifest items include `sha256` for offline verification
- `pvip:verify` enforces portable paths, in-bundle hrefs, and embedded-index consistency
- `pvip:verify` scans *_href/*_path fields in compare-report.json for portable paths
- `pvip:verify --strict` also enforces manifest size/hash consistency

Compliance mapping (optional):
- `docs/compliance-mapping.md`
- `docs/compliance-profile.example.json` (example mapping file)

### Report Contract v5 SHOULD (to remain fully self-contained)

- include `baseline/` and `new/` local raw copies **whenever any raw-evidence href is present**:
  - `baseline_case_response_href`
  - `new_case_response_href`
  - `baseline_run_meta_href`
  - `new_run_meta_href`
- include `repro/` when `compare-report.json.repro` is present (recommended for CI/incident reports)
- embed a thin manifest index in `report.html` for zero-click evidence links

### Portability rules (Report Contract v5)

- All **href** values stored in `compare-report.json` are **relative to the report directory** and must resolve **inside** it.
- href values must contain:
  - no `../` or `..\\`
  - no absolute prefixes (`/`, `\`)
  - no `://` schemes
- Note: the `://` restriction applies to **href fields**. URLs may still appear as data in `security.signals[].details.urls`.
- `baseline_dir` / `new_dir` / `cases_path` are **informational only** and must **not** be used to resolve links.
- `quality_flags.portable_paths` is computed by scanning stored path/href strings for violations (see `docs/report-contract-v5.md`).

### Evidence links (Report Contract v5)

- Evidence references in JSON use `manifest_key` (no raw paths).
- HTML links are derived from `manifest_key` using a mapping derived from `artifacts/manifest.json`.
- `report.html` embeds a thin index for zero-click link resolution.

### Redaction and bounded memory (Report Contract v5)

- If redaction is applied, summary includes `summary.quality.redaction_status` and optional `summary.quality.redaction_preset_id`.
- When `redaction_status=applied`, a `artifacts/redaction-summary.json` file is included.
- Manifest items SHOULD include `bytes` and `media_type` so viewers/validators can stay bounded-memory.

---

## CI gating model (Stage 1)

Each case in `compare-report.json.items[]` includes:

- `contract_version`: `5` (top-level, MUST)
- `case_status`: `executed | filtered_out | missing` (coverage transparency; Stage 1 requires one item per case)
- `data_availability`: `{ baseline, new }` with status + optional reason_code/details (MUST)
- `risk_level`: `low | medium | high`
- `risk_tags`: `string[]` (may include security signal kinds and/or operational tags)
- `gate_recommendation`: `none | require_approval | block` (**single CI truth**)
- `assertions[]` (optional; includes name/pass/details)

**CI gating reads only:** `compare-report.json.items[].gate_recommendation`  
Everything else is supporting evidence for humans and RCA.

## Policy rules (recommended_policy_rules)
Derived from root cause + evidence:
- `Rule1` → wrong_tool_choice
- `Rule2` → missing_required_data / missing_case
- `Rule3` → format_violation / hallucination_signal
- `Rule4` → evidence failed or hallucination_signal / missing_required_data

For v1-shape compatibility, the per-version boolean fields:

- `security.baseline.requires_gate_recommendation`
- `security.new.requires_gate_recommendation`

…are derived from `gate_recommendation`, are **identical** for baseline/new, and must not be interpreted as per-version gating.

Stage 1 summary MUST include:

- `summary.data_coverage` (coverage transparency)
- `contract_version: 5`
- `meta` (toolkit_version, spec_version, generated_at, run_id)

Optional (recommended in v5):

- `items[].failure_summary` (dashboard-friendly failure summary)

---

## AEPF Spec

The report format is published as **AEPF (Agent Evidence Pack Format)**:

- Spec: `docs/aepf-spec-v1.md`
- Schema: `schemas/compare-report-v5.schema.json`

---

## Quickstart (3 commands)

From repo root:

Install:

```bash
npm install
```

Run the full demo pipeline:

```bash
npm run demo
```

Open the report (macOS):

```bash
open apps/evaluator/reports/latest/report.html
```

Otherwise, open `apps/evaluator/reports/latest/report.html` in your browser.

Per-case diffs:

`apps/evaluator/reports/latest/case-*.html`

Machine report (CI interface):

`apps/evaluator/reports/latest/compare-report.json`

Demo pipeline (what npm run demo does)
Runs:

```bash
npm run lint
npm run typecheck
npm audit
```

Then:

ensures demo-agent is reachable (health check; starts if needed)

runs Runner with `--runId latest`

runs Evaluator with `--reportId latest`

Produces:

`apps/evaluator/reports/latest/report.html`

Pack & verify:

```bash
npm run pvip:pack
npm run pvip:verify
```

Add environment metadata (optional):

```bash
npm -w evaluator run dev -- \
  --cases cases/all.json \
  --baselineDir apps/runner/runs/baseline/latest \
  --newDir apps/runner/runs/new/latest \
  --outDir apps/evaluator/reports/latest \
  --reportId latest \
  --environment docs/environment.example.json
```

Strict/JSON verify:

```bash
npm run pvip:verify:strict
npm run pvip:verify:json
```

`apps/evaluator/reports/latest/compare-report.json`

Suite-specific demo runs:

```bash
npm run demo:correctness
npm run demo:robustness
```

These write reports to:

`apps/evaluator/reports/correctness_latest/`

`apps/evaluator/reports/robustness_latest/`

E2E demo (runs correctness + robustness, lint/typecheck once):

```bash
npm run demo:e2e
```

Toolkit tests (E2E + contract + portability checks):

```bash
npm run test:toolkit
```

Note: if `npm audit` is blocked by network policy, run with `--skipAudit`:

```bash
node scripts/demo.mjs --suite correctness --skipAudit
```

`apps/evaluator/reports/latest/case-<id>.html`

`apps/evaluator/reports/latest/assets/`

Recommended in v5 reports (when enabled):

`apps/evaluator/reports/latest/baseline/`

`apps/evaluator/reports/latest/new/`

`apps/evaluator/reports/latest/repro/` (when compare-report.json.repro exists)

Audit log (optional):

Set `AUDIT_LOG_PATH=/path/to/audit.jsonl` to append JSONL audit events for runner/evaluator start/finish.

Retention (optional):
- `--retentionDays N` on runner/evaluator deletes run/report dirs older than N days.

Contracts (documentation)
This repo defines versioned, stable contracts used for CI gating, integrations, and evidence portability.

docs/agent-artifact-contract-v1.md — Agent Artifact Contract v1
Runner outputs (run.json, per-case artifacts, failure artifacts, assets), standardized failure classes, full-body preservation.

docs/report-contract-v2.md — Report Contract v2
Portable evidence pack rules (href resolution, self-contained assets), CI gating fields (risk_level, risk_tags, gate_recommendation), compatibility behavior, and quality_flags truth tests.

docs/report-contract-v5.md — Report Contract v5 (Stage 1)
Adds manifest_key-based evidence references, embedded thin index for zero-click links, stricter offline rules, and preserves v3 coverage/gating fields.

Agent contract (HTTP API)
Runner calls the agent endpoint:

POST /run-case

Formal spec: `docs/agent-integration-contract.md`

Agent SDKs:
- TypeScript: `packages/agent-sdk` (createRunCaseServer, wrapSimpleAgent)
- Python (stdlib demo): `scripts/agent-sdk-python/agent_sdk.py`

TypeScript quick start (no build):

```bash
npx ts-node scripts/agent-sdk-ts-example.ts
```

Request body:

```json
{
  "case_id": "tool_001",
  "version": "baseline",
  "input": {
    "user": "user prompt",
    "context": { "optional": "context" }
  }
}
```
Response contract (required): agent must return JSON with:

proposed_actions (array)

events (array)

final_output (object)

Minimum example:

```json
{
  "case_id": "tool_001",
  "version": "baseline",
  "workflow_id": "optional",
  "proposed_actions": [
    {
      "action_id": "a1",
      "action_type": "get_customer",
      "tool_name": "get_customer",
      "params": {},
      "evidence_refs": [{ "kind": "tool_result", "call_id": "c1" }]
    }
  ],
  "events": [
    { "type": "tool_call", "ts": 1730000000000, "call_id": "c1", "action_id": "a1", "tool": "get_customer", "args": {} },
    { "type": "tool_result", "ts": 1730000000100, "call_id": "c1", "action_id": "a1", "status": "ok", "latency_ms": 100, "payload_summary": { "customer_id": "123" } },
    { "type": "final_output", "ts": 1730000000200, "content_type": "text", "content": "final answer" }
  ],
  "final_output": { "content_type": "text", "content": "final answer" }
}
```
Notes:

events must include tool calls/results if tools are used.

Retrieval (RAG) uses an event of type retrieval.

evidence_refs are policy-ready (Stage 2 will enforce).

Artifact structure
Runner outputs:

Baseline:

apps/runner/runs/baseline/<runId>/

New:

apps/runner/runs/new/<runId>/

Files:

`<caseId>.json` — case artifact (agent response or runner failure artifact)

`run.json` — run metadata

`assets/` — full bodies / large payloads when needed

Evaluator outputs:

`apps/evaluator/reports/<reportId>/report.html`

`apps/evaluator/reports/<reportId>/compare-report.json`

`apps/evaluator/reports/<reportId>/case-<caseId>.html`

`apps/evaluator/reports/<reportId>/assets/`

Recommended in v5 reports:

`baseline/` and `new/` (local raw copies referenced by hrefs)

`repro/` (when compare-report.json.repro exists)

CLI usage
Runner
Help:

```bash
npm --workspace runner run dev -- --help
```

Common usage:

```bash
npm --workspace runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json --outDir apps/runner/runs --runId latest
```
Only selected cases:

```bash
npm --workspace runner run dev -- --only tool_001,fmt_002 --runId latest
```
Exit codes:

0 success

1 runtime error

2 bad args / usage

Evaluator
Help:

```bash
npm --workspace evaluator run dev -- --help
```

Common usage:

```bash
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest --transferClass internal_only
```
Exit codes:

0 success

1 runtime error

2 bad args / usage

Adding or editing test cases
Cases live in:

`cases/cases.json`
`cases/matrix.json` (robustness / edge cases)
`cases/all.json` (combined correctness + robustness; each case has `suite`)

Format: JSON array of case objects:

```json
[
  {
    "id": "tool_001",
    "title": "Must use get_customer before creating ticket",
    "suite": "correctness",
    "input": { "user": "..." },
    "expected": {
      "tool_sequence": ["get_customer", "create_ticket"],
      "must_include": ["ticket created"]
    }
  }
]
```
Notes:
- `suite` is optional. Use it to group cases in the report (e.g. `correctness` vs `robustness`).
  For combined runs, use `cases/all.json` so both suites appear in one report.
expected supports (Stage 1):

action_required

tool_required

tool_sequence

json_schema (AJV)

retrieval_required

must_include

must_not_include

evidence_required_for_actions

Where to extend (assertions, RCA, risk/gates)
Evaluator core logic (pure, testable):

`apps/evaluator/src/core.ts`

Key extension points:

assertions built in evaluateOne(...)

RCA selection in chooseRootCause(...)

policy mapping in mapPolicyRules(...)

Evaluator CLI/IO orchestration:

`apps/evaluator/src/index.ts`

Report HTML:

renderHtmlReport(...) in apps/evaluator/src/htmlReport.ts

Per-case replay diff:

renderCaseDiffHtml(...) in apps/evaluator/src/replayDiff.ts

Risk/gate fields (v5):

risk_level, risk_tags, gate_recommendation computed per case

summary.risk_summary, summary.cases_requiring_approval, summary.cases_block_recommended computed across cases

Development (repo root)
```bash
npm run lint
npm run typecheck
npm run demo
```
Reports:

`apps/evaluator/reports/latest/report.html`

`apps/evaluator/reports/latest/case-*.html`

`apps/evaluator/reports/latest/compare-report.json`

Load testing (offline, local agent)
```bash
npm run loadtest -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --concurrency 8 --iterations 50 --outJson /tmp/load.json --outCsv /tmp/load.csv

# Classify expected-fail cases so only real failures cause exit 1:
npm run loadtest -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --concurrency 8 --iterations 20 \
  --allowFail fetch_http_500_001,fetch_timeout_001,fetch_network_drop_001,fetch_invalid_json_001

# Verify redaction mode (demo-agent) during load test:
npm run loadtest -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --concurrency 4 --iterations 5 --redactionPreset transferable
```

Runner redaction (production)
```bash
# Sanitized artifacts only (default; no raw copies)
npm -w runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --outDir apps/runner/runs --runId redaction_test --redactionPreset transferable

# Extended redaction preset (phone/IP/JWT/CC patterns)
npm -w runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --outDir apps/runner/runs --runId redaction_test --redactionPreset transferable_extended

# Optional retention: delete runs older than N days
npm -w runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --outDir apps/runner/runs --runId redaction_test --retentionDays 7

# Keep raw (unsanitized) copies under apps/runner/runs/_raw/ (explicit opt-in; avoid for transferable packs)
npm -w runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json \
  --outDir apps/runner/runs --runId redaction_test --redactionPreset transferable --keepRaw
```

Matrix tests (network/data/size/structure)
```bash
npm run loadtest -- --baseUrl http://localhost:8787 --cases cases/matrix.json \
  --concurrency 4 --iterations 3 \
  --redactionPreset transferable \
  --allowFail matrix_net_http_500_small,matrix_net_http_500_large,matrix_net_timeout,matrix_net_drop,matrix_net_partial,matrix_data_empty_body,matrix_data_invalid_json,matrix_data_large_json_5mb \
  --outJson /tmp/matrix.json --outCsv /tmp/matrix.csv
```

Note: `cases/matrix.json` includes `matrix_data_huge_string_900k` to validate large-but-valid payloads.

Strict portability checks (fail on violations)
```bash
npm -w evaluator run dev -- --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/latest \
  --newDir apps/runner/runs/new/latest \
  --outDir apps/evaluator/reports/latest \
  --reportId latest \
  --transferClass internal_only \
  --strictPortability
```

Strict redaction checks (fail if markers remain after redaction)
```bash
npm -w evaluator run dev -- --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/redaction_test \
  --newDir apps/runner/runs/new/redaction_test \
  --outDir apps/evaluator/reports/redaction_test \
  --reportId redaction_test \
  --transferClass internal_only \
  --strictRedaction
```

Large payload warnings (default 1,000,000 bytes)
```bash
npm -w evaluator run dev -- --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/latest \
  --newDir apps/runner/runs/new/latest \
  --outDir apps/evaluator/reports/latest \
  --reportId latest \
  --transferClass internal_only \
  --warnBodyBytes 1000000
```

Demo-agent supported case_ids (baseline and new)
- fmt_001
- fmt_002
- fmt_003
- tool_001
- tool_002
- tool_003
- tool_004
- data_001
- data_002
- fail_001

Transport failure cases (expected to fail on new)
- fetch_http_500_001
- fetch_invalid_json_001
- fetch_timeout_001
- fetch_network_drop_001

Redaction in demo-agent
- Use `DEMO_REDACTION_PRESET=internal_only|transferable` or request header `x-redaction-preset`.
- Response payloads are masked (emails, `CUST-####`, `T-####`, `MSG-####`, and token-like strings).
- This is demo-only behavior for validating redaction flows.
