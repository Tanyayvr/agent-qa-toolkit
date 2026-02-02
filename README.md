<!-- /README.md -->

# Agent QA Toolkit: Replay Diff + Root-Cause (Stage 1) + (Future) Action Governance (Stage 2)

Benchmark-quality toolkit for teams building **tool-using AI agents**.

**Goal:** before and after release, automatically detect regressions between agent versions, explain *why* something broke deterministically, and produce **reproducible artifacts** (replay + diff + root-cause) suitable for CI and for sharing with customers / integrators.

---

## What’s in this repo

Monorepo (npm workspaces):

- `apps/demo-agent` — demo HTTP agent with deterministic baseline/new responses
- `apps/runner` — CLI that executes cases against the agent and writes run artifacts
- `apps/evaluator` — CLI that evaluates artifacts, assigns root cause, and generates HTML reports

Quality bar (benchmark mode):

- ESLint v9 flat config
- Strict TypeScript (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, no `any`)
- `npm audit` clean
- All commands run from **repo root**

---

## Quickstart (3 commands)

From repo root:

1) Install
```bash
npm install
Run the full demo pipeline (idempotent latest)

bash
Копировать код
npm run demo
Open the report

apps/evaluator/reports/latest/report.html

each case diff: apps/evaluator/reports/latest/case-*.html

Demo pipeline (what npm run demo does)
Single command, deterministic artifacts:

npm run lint

npm run typecheck

npm audit

Ensures demo-agent is running (health check; starts if needed)

Runs runner with --runId latest

Runs evaluator with --reportId latest

Generates:

apps/evaluator/reports/latest/report.html

apps/evaluator/reports/latest/case-<id>.html

All paths in reports and logs are portable (no /Users/...).

Agent contract
Runner calls the agent endpoint:

POST /run-case

Request body
json
Копировать код
{
  "case_id": "tool_001",
  "version": "baseline",
  "input": {
    "user": "user prompt",
    "context": { "optional": "context" }
  }
}
Response contract (required)
Agent must return JSON with:

proposed_actions (array)

events (array)

final_output (object)

At minimum:

json
Копировать код
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
      "risk_level": "medium",
      "risk_tags": [],
      "evidence_refs": [
        { "kind": "tool_result", "call_id": "c1" }
      ]
    }
  ],
  "events": [
    {
      "type": "tool_call",
      "ts": 1730000000000,
      "call_id": "c1",
      "action_id": "a1",
      "tool": "get_customer",
      "args": {}
    },
    {
      "type": "tool_result",
      "ts": 1730000000100,
      "call_id": "c1",
      "action_id": "a1",
      "status": "ok",
      "latency_ms": 100,
      "payload_summary": { "customer_id": "123" }
    },
    {
      "type": "final_output",
      "ts": 1730000000200,
      "content_type": "text",
      "content": "final answer"
    }
  ],
  "final_output": {
    "content_type": "text",
    "content": "final answer"
  }
}
Notes:

events must include tool calls/results if tools are used.

Retrieval (RAG) uses an event of type retrieval.

evidence_refs are policy-ready (Stage 2 will enforce).

Artifact structure
Runner outputs
Runner writes run artifacts to:

apps/runner/runs/baseline/<runId>/

apps/runner/runs/new/<runId>/

Files:

<caseId>.json — raw agent response for the case

run.json — run metadata (portable paths)

(after evaluator) evaluation.json — evaluation results for that version

Example:

arduino
Копировать код
apps/runner/runs/
  baseline/
    latest/
      fmt_002.json
      tool_001.json
      ...
      run.json
      evaluation.json
  new/
    latest/
      fmt_002.json
      tool_001.json
      ...
      run.json
      evaluation.json
Evaluator outputs
Evaluator writes:

apps/evaluator/reports/<reportId>/report.html

apps/evaluator/reports/<reportId>/compare-report.json

apps/evaluator/reports/<reportId>/case-<caseId>.html

Example:

swift
Копировать код
apps/evaluator/reports/
  latest/
    report.html
    compare-report.json
    case-fmt_002.html
    case-tool_001.html
    ...
All report paths are relative/portable.

CLI usage
Runner
bash
Копировать код
npm --workspace runner run dev -- --help
Common usage:

bash
Копировать код
npm --workspace runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json --outDir apps/runner/runs --runId latest
Only selected cases:

bash
Копировать код
npm --workspace runner run dev -- --only tool_001,fmt_002 --runId latest
Exit codes:

0 success

1 runtime error

2 bad args / usage

Evaluator
bash
Копировать код
npm --workspace evaluator run dev -- --help
Common usage:

bash
Копировать код
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest
Exit codes:

0 success

1 runtime error

2 bad args / usage

Adding or editing test cases
Cases live in:

cases/cases.json

Format: JSON array of case objects:

json
Копировать код
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
expected supports (Stage 1):

action_required

tool_required

tool_sequence

json_schema (validated via AJV)

retrieval_required (doc ids)

must_include

must_not_include

evidence_required_for_actions

Assertions & root-cause rules (how to extend)
Evaluator core lives in:

apps/evaluator/src/index.ts

Key extension points:

Assertions are constructed in evaluateOne(...)

Root cause is selected by chooseRootCause(...)

Policy mapping is in mapPolicyRules(...)

HTML output:

renderHtmlReport(...) in apps/evaluator/src/htmlReport.ts

per-case replay diff: renderCaseDiffHtml(...) in apps/evaluator/src/replayDiff.ts

Root cause priority (Stage 1):

tool_failure

format_violation

missing_required_data

wrong_tool_choice

hallucination_signal

unknown

Plugging in a real agent (instead of demo-agent)
Runner only needs an agent that implements:

POST /run-case (request/response contract above)

Point runner to your agent:

--baseUrl <your-agent-url>

Example:

bash
Копировать код
npm --workspace runner run dev -- --baseUrl http://your-agent-host:8787 --runId latest
You can keep the same evaluator + report generation unchanged.

Stage 2 (future): Action Governance
Stage 1 already produces policy-ready signals:

proposed_actions + evidence_refs

preventable_by_policy

recommended_policy_rules

Stage 2 will add:

policy engine (e.g. OPA)

action-level allow/deny/approve

enforcement in the runner/agent loop

Stage 1 UI can show “Preventable by Policy” without enforcement.

Development
Recommended commands (repo root):

bash
Копировать код
npm run lint
npm run typecheck
npm run demo
Reports:

apps/evaluator/reports/latest/report.html

apps/evaluator/reports/latest/case-*.html
EOF