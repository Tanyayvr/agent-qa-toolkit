# Agent Integration Contract (/run-case)

This document defines the minimal HTTP contract required for a real agent to integrate with the toolkit.

---

## Endpoint

```
POST /run-case
Content-Type: application/json
```

Optional headers:
- `x-redaction-preset`: `none | internal_only | transferable` (demo-only hint). Production redaction is applied by the runner before writing artifacts; agents are not required to implement or honor this header.

---

## Request schema (minimal)

```json
{
  "case_id": "tool_001",
  "version": "baseline",
  "input": {
    "user": "Create a ticket for customer CUST-1234",
    "context": { "any": "json" }
  }
}
```

Fields:
- `case_id` (string, required)
- `version` (string, required): `baseline | new`
- `input.user` (string, required)
- `input.context` (object, optional)

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
    { "type": "tool_result", "ts": 1738044000456, "call_id": "c1", "status": "ok", "latency_ms": 333, "payload_summary": { "ticket_id": "T-1234" } },
    { "type": "final_output", "ts": 1738044001300, "content_type": "json", "content": { "action": "create_ticket", "ticket_id": "T-1234" } }
  ]
}
```

Required response fields:
- `case_id` (string)
- `version` (string): `baseline | new`
- `final_output` (object): `{ content_type: "text|json", content: any }`

Optional but recommended:
- `workflow_id` (string)
- `proposed_actions` (array)
- `events` (array; used for tool trace integrity + security signals)

---

## Notes
- The toolkit is tolerant to missing `events`, but correctness checks (tool_sequence, tool_required, evidence_required) rely on it.
- If your agent does not execute tools, omit `proposed_actions` and `events`.
- The evaluator reads response JSON directly from runner artifacts; ensure it is valid JSON.
- Self-hosted does **not** remove prompt‑injection risk by itself; use layered scanning (regex baseline + optional entropy scanner).

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

## SDK Quick Start (Python, stdlib)

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
