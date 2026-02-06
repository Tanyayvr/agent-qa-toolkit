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
- Stage 2 (future): runtime governance (policy-as-code / approvals / runtime gates)

---

## What’s in this repo

Monorepo (npm workspaces):

- `apps/demo-agent` — demo HTTP agent with deterministic baseline/new responses
- `apps/runner` — CLI that executes cases against the agent and writes run artifacts
- `apps/evaluator` — CLI that evaluates artifacts, assigns RCA, computes risk/gates, and generates HTML reports

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

### Report Contract v2 SHOULD (to remain fully self-contained)

- include `baseline/` and `new/` local raw copies **whenever any raw-evidence href is present**:
  - `baseline_case_response_href`
  - `new_case_response_href`
  - `baseline_run_meta_href`
  - `new_run_meta_href`
- include `repro/` when `compare-report.json.repro` is present

### Portability rules (Report Contract v2)

- All **href** values stored in `compare-report.json` are **relative to the report directory** and must resolve **inside** it.
- href values must contain:
  - no `../` or `..\\`
  - no absolute prefixes (`/`, `\`)
  - no `://` schemes
- Note: the `://` restriction applies to **href fields**. URLs may still appear as data in `security.signals[].details.urls`.
- `baseline_dir` / `new_dir` / `cases_path` are **informational only** and must **not** be used to resolve links.
- `quality_flags.portable_paths` is computed by scanning stored path/href strings for violations (see `tool/docs/report-contract-v2.md`).

---

## CI gating model (Stage 1)

Each case in `compare-report.json.items[]` includes:

- `risk_level`: `low | medium | high`
- `risk_tags`: `string[]` (may include security signal kinds and/or operational tags)
- `gate_recommendation`: `none | require_approval | block` (**single CI truth**)

**CI gating reads only:** `compare-report.json.items[].gate_recommendation`  
Everything else is supporting evidence for humans and RCA.

For v1-shape compatibility, the per-version boolean fields:

- `security.baseline.requires_gate_recommendation`
- `security.new.requires_gate_recommendation`

…are derived from `gate_recommendation`, are **identical** for baseline/new, and must not be interpreted as per-version gating.

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

`apps/evaluator/reports/latest/compare-report.json`

`apps/evaluator/reports/latest/case-<id>.html`

`apps/evaluator/reports/latest/assets/`

Recommended in v2 reports (when enabled):

`apps/evaluator/reports/latest/baseline/`

`apps/evaluator/reports/latest/new/`

`apps/evaluator/reports/latest/repro/` (when compare-report.json.repro exists)

Contracts (documentation)
This repo defines versioned, stable contracts used for CI gating, integrations, and evidence portability.

`tool/docs/agent-artifact-contract-v1.md` — Agent Artifact Contract v1
Runner outputs (run.json, per-case artifacts, failure artifacts, assets), standardized failure classes, full-body preservation.

`tool/docs/report-contract-v2.md` — Report Contract v2
Portable evidence pack rules (href resolution, self-contained assets), CI gating fields (risk_level, risk_tags, gate_recommendation), compatibility behavior, and quality_flags truth tests.

`tool/docs/report-contract-v3.md` — Report Contract v3
Adds data availability and coverage fields, stricter portability rules, and expanded gating metadata.

Agent contract (HTTP API)
Runner calls the agent endpoint:

POST /run-case

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

Recommended in v2 reports:

`baseline/` and `new/` (local raw copies referenced by hrefs)

`repro/` (when compare-report.json.repro exists)

CLI usage
Runner
Help:

npm --workspace runner run dev -- --help
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

npm --workspace evaluator run dev -- --help
Common usage:

```bash
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest
```
Exit codes:

0 success

1 runtime error

2 bad args / usage

Adding or editing test cases
Cases live in:

`cases/cases.json`

Format: JSON array of case objects:

```json
[
  {
    "id": "tool_001",
    "title": "Must use get_customer before creating ticket",
    "input": { "user": "..." },
    "expected": {
      "tool_sequence": ["get_customer", "create_ticket"],
      "must_include": ["ticket created"]
    }
  }
]
```
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
Evaluator core:

`apps/evaluator/src/index.ts`

Key extension points:

assertions built in evaluateOne(...)

RCA selection in chooseRootCause(...)

policy mapping in mapPolicyRules(...)

Report HTML:

`renderHtmlReport(...)` in `apps/evaluator/src/htmlReport.ts`

Per-case replay diff:

`renderCaseDiffHtml(...)` in `apps/evaluator/src/replayDiff.ts`

Risk/gate fields (v2):

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
