# Agent Integration Contract (`/run-case` + `/handoff`)

This document defines the minimal HTTP contract required for a real agent to integrate with the toolkit.

---

## Endpoints

```
POST /run-case
Content-Type: application/json
```

```
POST /handoff
Content-Type: application/json
```

Optional headers:
- `x-redaction-preset`: `none | internal_only | transferable` (demo-agent uses this; real agents may ignore)
- `traceparent` / `baggage` / `x-trace-id` / `x-span-id` (optional OTel anchors; runner can persist these into artifacts)

---

## Request schema (minimal)

```json
{
  "case_id": "tool_001",
  "version": "baseline",
  "input": {
    "user": "Create a ticket for customer CUST-1234",
    "context": { "any": "json" }
  },
  "run_meta": {
    "run_id": "run-2026-02-28",
    "incident_id": "incident-2026-02-28",
    "agent_id": "executor",
    "parent_run_id": "planner-run-2026-02-28"
  },
  "handoff": {
    "incident_id": "incident-2026-02-28",
    "handoff_id": "h-001",
    "from_agent_id": "planner",
    "to_agent_id": "executor",
    "objective": "Execute approved plan",
    "schema_version": "1.0.0",
    "created_at": 1738044000123,
    "checksum": "<sha256 canonical payload>"
  }
}
```

Fields:
- `case_id` (string, required)
- `version` (string, required): `baseline | new`
- `input.user` (string, required)
- `input.context` (object, optional)
- `run_meta` (object, optional): routing metadata (`run_id`, `incident_id`, `agent_id`, `parent_run_id`)
- `handoff` (object, optional): inline runtime handoff envelope (same schema as `POST /handoff`)

---

## Response schema (minimal)

```json
{
  "case_id": "tool_001",
  "version": "baseline",
  "workflow_id": "support_ticketing_v1",
  "proposed_actions": [
    {
      "action_id": "a1",
      "action_type": "create_ticket",
      "tool_name": "create_ticket",
      "params": { "customer_id": "CUST-1234", "summary": "..." },
      "risk_level": "low",
      "risk_tags": ["customer_support"],
      "evidence_refs": [{ "kind": "tool_result", "call_id": "c1" }]
    }
  ],
  "final_output": {
    "content_type": "json",
    "content": { "action": "create_ticket", "ticket_id": "T-1234" }
  },
  "events": [
    { "type": "tool_call", "ts": 1738044000123, "call_id": "c1", "tool": "create_ticket", "args": { "customer_id": "CUST-1234" } },
    {
      "type": "tool_result",
      "ts": 1738044000456,
      "call_id": "c1",
      "status": "ok",
      "latency_ms": 333,
      "payload_summary": { "ticket_id": "T-1234" },
      "result_ref": "tool://c1"
    },
    { "type": "final_output", "ts": 1738044001300, "content_type": "json", "content": { "action": "create_ticket", "ticket_id": "T-1234" } }
  ],
  "assumption_state": {
    "selected": [
      {
        "kind": "tool",
        "candidate_id": "c1",
        "decision": "selected",
        "reason_code": "selected_by_agent",
        "tool_name": "create_ticket"
      }
    ],
    "rejected": []
  },
  "trace_anchor": {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7",
    "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "source": "response_body"
  },
  "run_meta": {
    "run_id": "run-2026-02-28",
    "incident_id": "incident-2026-02-28",
    "agent_id": "executor"
  },
  "handoff_receipts": [
    {
      "incident_id": "incident-2026-02-28",
      "handoff_id": "h-001",
      "from_agent_id": "planner",
      "to_agent_id": "executor",
      "checksum": "<sha256>",
      "accepted_at": 1738044000222,
      "status": "available"
    }
  ]
}
```

Required response fields:
- `case_id` (string)
- `version` (string): `baseline | new`
- `final_output` (object): `{ content_type: "text|json", content: any }`

Recommended (for full checks):
- `workflow_id` (string)
- `proposed_actions` (array)
- `events` (array; used for tool trace integrity + security signals)
- `assumption_state` (object; decision-legibility state for selected/rejected candidates)
- `token_usage` (object; optional cost + loop signals)

Quality-grade tool-using contract:
- emit `events`
- emit `final_output` event
- emit `tool_call` + matching `tool_result` for every declared tool execution
- for `tool_result.status = "ok"`, include `payload_summary` or `result_ref`
- for `tool_result.status = "error" | "timeout"`, include `error_code` or `error_message`

Optional `token_usage` (if available):
```json
{
  "input_tokens": 123,
  "output_tokens": 456,
  "total_tokens": 579,
  "tool_call_count": 3,
  "loop_detected": false,
  "loop_details": {
    "similarity_suspects": [
      { "tool": "search_kb", "call_ids": ["c1","c2","c3"], "similarity_score": 0.93 }
    ],
    "output_hash_duplicates": [
      { "hash": "9f3a2c1e0b12", "call_ids": ["c4","c5"], "count": 2 }
    ]
  }
}
```

Optional `trace_anchor` (recommended for OTel correlation):
```json
{
  "trace_anchor": {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7",
    "parent_span_id": "70f067aa0ba902b8",
    "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "baggage": "env=prod,service=agent",
    "source": "response_body"
  }
}
```

Optional runtime handoff visibility:
- `run_meta` (echo/visibility for routing)
- `handoff_receipts` (handoffs accepted/available/consumed by this run)
- `handoff_emits` (handoffs emitted to downstream agents)

---

## `/handoff` schema (runtime transfer)

Request:
```json
{
  "incident_id": "incident-2026-02-28",
  "handoff_id": "h-001",
  "from_agent_id": "planner",
  "to_agent_id": "executor",
  "objective": "Execute approved plan",
  "constraints": { "max_tokens": 800 },
  "decision_thresholds": { "min_confidence": 0.8 },
  "state_delta": { "approved_outline_ref": "obj://..." },
  "tool_result_refs": ["tool://call-123"],
  "retrieval_refs": ["doc://kb-45#chunk-3"],
  "schema_version": "1.0.0",
  "created_at": 1738044000123,
  "checksum": "<sha256 canonical payload>"
}
```

Adapter behavior requirements:
- idempotent by `incident_id + handoff_id`
- if same id + same checksum: return duplicate acknowledgement
- if same id + different checksum: reject (conflict)

Response (example):
```json
{
  "ok": true,
  "receipt": {
    "incident_id": "incident-2026-02-28",
    "handoff_id": "h-001",
    "from_agent_id": "planner",
    "to_agent_id": "executor",
    "checksum": "<sha256>",
    "accepted_at": 1738044000222,
    "status": "accepted"
  }
}
```

---

## Notes
- Minimal compatibility still allows responses without `events`, but quality-grade tool-using evaluation does not.
- If your agent does not execute tools, omit `proposed_actions` and `events`.
- The evaluator reads response JSON directly from runner artifacts; ensure it is valid JSON.
- Self-hosted does **not** remove prompt‑injection risk by itself; use layered scanning (regex baseline + optional entropy scanner).
- Multi‑agent runs: bundles are **run‑scoped**. If a single orchestrator can observe the workflow, emit one bundle with multiple `trace_id`s; otherwise emit multiple bundles and stitch via `workflow_id` / `parent_run_id` / `trace_id`. See `docs/format/multi-agent-bundling.md`.

---

## SDK Quick Start (TypeScript)

```ts
import { createRunCaseServer, wrapSimpleAgent } from "agent-sdk";

const agent = async ({ user, context }) => {
  return {
    workflow_id: "my_agent_v1",
    final_output: { content_type: "text", content: `ok: ${user}` },
    events: [],
  };
};

createRunCaseServer({
  port: 8787,
  handler: wrapSimpleAgent(agent),
});
```

Run locally (TypeScript, no build step):

```bash
npx ts-node scripts/agent-sdk-ts-example.ts
```

## Python Reference Adapter (Minimal, stdlib)

This is a minimal reference adapter for contract validation and local integration smoke tests.
It is not positioned as a full-featured Python SDK package yet.

```py
from agent_sdk import AgentAdapter  # from scripts/agent-sdk-python/agent_sdk.py (PYTHONPATH)

def handler(req):
    return {
        "case_id": req.get("case_id"),
        "version": req.get("version"),
        "final_output": {"content_type": "text", "content": "ok"},
        "events": []
    }

AgentAdapter(handler).serve(port=8787)
```

Run directly:

```bash
PYTHONPATH=scripts/agent-sdk-python python3 -c "from agent_sdk import AgentAdapter; AgentAdapter(lambda req: {'case_id': req.get('case_id'), 'version': req.get('version'), 'final_output': {'content_type': 'text', 'content': 'ok'}, 'events': []}).serve(port=8787)"
python3 scripts/agent-sdk-python/agent_sdk.py
```
