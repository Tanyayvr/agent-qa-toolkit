import { once } from "node:events";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { validateAndNormalizeHandoffEnvelope } from "cli-utils";
import { __test__, createRunCaseServer, wrapSimpleAgent } from "./index";

const servers: Server[] = [];

afterEach(async () => {
  while (servers.length > 0) {
    const s = servers.pop();
    if (!s) continue;
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
});

describe("agent-sdk helpers", () => {
  it("parses valid run-case payload", () => {
    const parsed = __test__.parseRunCaseRequest({
      case_id: "c1",
      version: "baseline",
      input: { user: "hello" },
      run_meta: { run_id: "r1", incident_id: "inc-1" },
      handoff: {
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "execute",
      },
    });
    expect(parsed.case_id).toBe("c1");
    expect(parsed.run_meta?.incident_id).toBe("inc-1");
    expect(parsed.handoff?.handoff_id).toBe("h-1");
  });

  it("rejects run-case payload without required identity fields", () => {
    expect(() => __test__.parseRunCaseRequest({ version: "baseline", input: { user: "hello" } })).toThrow(
      "missing case_id or version"
    );
    expect(() => __test__.parseRunCaseRequest({ case_id: "c1", input: { user: "hello" } })).toThrow(
      "missing case_id or version"
    );
  });

  it("rejects run-case payload without input.user string", () => {
    expect(() => __test__.parseRunCaseRequest({ case_id: "c1", version: "baseline" })).toThrow("missing input.user");
    expect(() => __test__.parseRunCaseRequest({ case_id: "c1", version: "baseline", input: { user: 42 } })).toThrow(
      "missing input.user"
    );
  });

  it("builds deterministic handoff receipts with defaults", () => {
    const normalized = validateAndNormalizeHandoffEnvelope(
      {
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "execute",
      },
      123
    );
    const receipt = __test__.buildHandoffReceipt(normalized, undefined, 456);
    expect(receipt.accepted_at).toBe(456);
    expect(receipt.status).toBe("accepted");
    expect(receipt.checksum).toBe(normalized.checksum);
  });

  it("keeps duplicate status and merges handler-provided receipt overrides", () => {
    const normalized = validateAndNormalizeHandoffEnvelope(
      {
        incident_id: "inc-2",
        handoff_id: "h-2",
        from_agent_id: "planner",
        to_agent_id: "reviewer",
        objective: "review",
      },
      100
    );
    const receipt = __test__.buildHandoffReceipt(
      normalized,
      {
        status: "duplicate",
        receipt: {
          accepted_at: 999,
          checksum: "override-checksum",
        },
      },
      200
    );
    expect(receipt.status).toBe("duplicate");
    expect(receipt.accepted_at).toBe(999);
    expect(receipt.checksum).toBe("override-checksum");
  });

  it("wrapSimpleAgent preserves run_case identity and optional sections", async () => {
    const handler = wrapSimpleAgent(async ({ user }) => ({
      final_output: { content_type: "text", content: `ok:${user}` },
      workflow_id: "wf-1",
      proposed_actions: [
        {
          action_id: "a1",
          action_type: "tool_call",
          tool_name: "search",
          params: { q: "abc" },
        },
      ],
      events: [{ type: "final_output", ts: 1, content_type: "text", content: "ok" }],
      telemetry_mode: "native",
      policy_violations: [
        {
          scope: "planning_gate",
          severity: "require_approval",
          code: "missing_plan_envelope",
          message: "missing",
        },
      ],
      trace_anchor: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "0123456789abcdef",
        source: "response_body",
      },
      token_usage: {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      },
      assumption_state: {
        selected: [
          {
            kind: "tool",
            candidate_id: "a1",
            decision: "selected",
            reason_code: "selected_by_agent",
            tool_name: "search",
          },
        ],
        rejected: [],
      },
    }));

    const out = await handler({
      case_id: "c1",
      version: "new",
      input: { user: "hello" },
      run_meta: { run_id: "r1" },
    });
    expect(out.case_id).toBe("c1");
    expect(out.version).toBe("new");
    expect(out.final_output.content).toBe("ok:hello");
    expect(out.workflow_id).toBe("wf-1");
    expect(out.proposed_actions).toHaveLength(1);
    expect(out.events).toHaveLength(1);
    expect(out.telemetry_mode).toBe("native");
    expect(out.policy_violations?.[0]?.code).toBe("missing_plan_envelope");
    expect(out.trace_anchor?.source).toBe("response_body");
    expect(out.token_usage?.total_tokens).toBe(15);
    expect(out.assumption_state?.selected[0]?.candidate_id).toBe("a1");
  });

  it("wrapSimpleAgent forwards run_meta and handoff fields when provided", async () => {
    const handler = wrapSimpleAgent(async () => ({
      final_output: { content_type: "text", content: "ok" },
      run_meta: {
        run_id: "r1",
        incident_id: "inc-1",
        agent_id: "agent-a",
      },
      handoff_emits: [
        {
          incident_id: "inc-1",
          handoff_id: "h-1",
          from_agent_id: "agent-a",
          to_agent_id: "agent-b",
          objective: "handoff",
          schema_version: "1.0.0",
          created_at: Date.now(),
          checksum: "chk-1",
        },
      ],
      handoff_receipts: [
        {
          incident_id: "inc-1",
          handoff_id: "h-1",
          from_agent_id: "agent-a",
          to_agent_id: "agent-b",
          checksum: "chk-1",
          accepted_at: Date.now(),
          status: "accepted",
        },
      ],
    }));

    const out = await handler({
      case_id: "c1",
      version: "new",
      input: { user: "hello" },
    });
    expect(out.run_meta?.incident_id).toBe("inc-1");
    expect(out.handoff_emits?.[0]?.handoff_id).toBe("h-1");
    expect(out.handoff_receipts?.[0]?.status).toBe("accepted");
  });

  it("createRunCaseServer serves /health", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" }
      })
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; id?: string };
    expect(json.ok).toBe(true);
    expect(typeof json.id).toBe("string");
  });

  it("returns 400 on invalid run-case JSON", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" }
      })
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/run-case`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; message: string };
    expect(json.error).toBe("bad_request");
    expect(json.message).toContain("invalid_json");
  });

  it("returns 400 on run-case payload validation error", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" }
      })
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/run-case`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ case_id: "c1", version: "new", input: {} })
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; message: string };
    expect(json.error).toBe("bad_request");
    expect(json.message).toContain("missing input.user");
  });

  it("returns 500 when run-case handler throws", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async () => {
        throw new Error("handler exploded");
      }
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/run-case`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ case_id: "c1", version: "new", input: { user: "hello" } })
    });
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string; message: string };
    expect(json.error).toBe("handler_error");
    expect(json.message).toContain("handler exploded");
  });

  it("returns 400 on invalid handoff payload", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" }
      })
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ incident_id: "inc-only" })
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; message: string };
    expect(json.error).toBe("bad_request");
    expect(json.message).toContain("invalid_handoff");
  });

  it("returns handoff receipt and supports duplicate status override", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" }
      }),
      handoffHandler: async () => ({
        status: "duplicate",
        receipt: { accepted_at: 777 }
      })
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "execute"
      })
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; receipt: { status: string; accepted_at: number } };
    expect(json.ok).toBe(true);
    expect(json.receipt.status).toBe("duplicate");
    expect(json.receipt.accepted_at).toBe(777);
  });

  it("returns 404 for unknown path and non-POST requests", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" },
      }),
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const getRun = await fetch(`http://127.0.0.1:${port}/run-case`, { method: "GET" });
    expect(getRun.status).toBe(404);

    const postUnknown = await fetch(`http://127.0.0.1:${port}/unknown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(postUnknown.status).toBe(404);
  });

  it("returns 400 on invalid handoff JSON body", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" },
      }),
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; message: string };
    expect(json.error).toBe("bad_request");
    expect(json.message).toContain("invalid_json");
  });

  it("returns accepted handoff receipt when no handoffHandler is provided", async () => {
    const server = createRunCaseServer({
      port: 0,
      host: "127.0.0.1",
      handler: async (req) => ({
        case_id: req.case_id,
        version: req.version,
        final_output: { content_type: "text", content: "ok" },
      }),
    });
    servers.push(server);
    await once(server, "listening");
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        incident_id: "inc-x",
        handoff_id: "h-x",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "execute",
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; receipt: { status: string } };
    expect(json.ok).toBe(true);
    expect(json.receipt.status).toBe("accepted");
  });
});
