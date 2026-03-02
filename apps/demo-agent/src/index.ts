//apps/demo-agent/src/index.ts
import express, { type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { RESPONSES } from "./responses";
import type { RunCaseRequestBody } from "./types";
import type { HandoffEnvelope, HandoffReceipt, RunMeta } from "shared-types";
import { normalizeRunMeta, validateAndNormalizeHandoffEnvelope } from "cli-utils";
import { sanitizeValue, type RedactionPreset } from "redaction";

const app = express();
app.use(express.json({ limit: "1mb" }));

type StoredHandoff = {
  envelope: HandoffEnvelope;
  accepted_at: number;
};

const handoffStore = new Map<string, Map<string, StoredHandoff>>();

function upsertHandoff(envelope: HandoffEnvelope): HandoffReceipt {
  const incidentMap = handoffStore.get(envelope.incident_id) ?? new Map<string, StoredHandoff>();
  const existing = incidentMap.get(envelope.handoff_id);
  if (existing) {
    if (existing.envelope.checksum !== envelope.checksum) {
      throw new Error(
        `handoff conflict for incident=${envelope.incident_id} handoff_id=${envelope.handoff_id}: checksum mismatch`
      );
    }
    if (!handoffStore.has(envelope.incident_id)) handoffStore.set(envelope.incident_id, incidentMap);
    return {
      incident_id: existing.envelope.incident_id,
      handoff_id: existing.envelope.handoff_id,
      from_agent_id: existing.envelope.from_agent_id,
      to_agent_id: existing.envelope.to_agent_id,
      checksum: existing.envelope.checksum,
      accepted_at: existing.accepted_at,
      status: "duplicate",
    };
  }

  const stored: StoredHandoff = { envelope, accepted_at: Date.now() };
  incidentMap.set(envelope.handoff_id, stored);
  handoffStore.set(envelope.incident_id, incidentMap);
  return {
    incident_id: envelope.incident_id,
    handoff_id: envelope.handoff_id,
    from_agent_id: envelope.from_agent_id,
    to_agent_id: envelope.to_agent_id,
    checksum: envelope.checksum,
    accepted_at: stored.accepted_at,
    status: "accepted",
  };
}

function getAvailableHandoffReceipts(runMeta: RunMeta | undefined): HandoffReceipt[] {
  if (!runMeta?.incident_id || !runMeta.agent_id) return [];
  const incident = handoffStore.get(runMeta.incident_id);
  if (!incident) return [];
  return Array.from(incident.values())
    .filter((h) => h.envelope.to_agent_id === runMeta.agent_id)
    .sort((a, b) => a.envelope.created_at - b.envelope.created_at)
    .map((h) => ({
      incident_id: h.envelope.incident_id,
      handoff_id: h.envelope.handoff_id,
      from_agent_id: h.envelope.from_agent_id,
      to_agent_id: h.envelope.to_agent_id,
      checksum: h.envelope.checksum,
      accepted_at: h.accepted_at,
      status: "available",
    }));
}

app.get("/health", (_req: Request, res: Response) => {
  let total = 0;
  for (const incident of handoffStore.values()) total += incident.size;
  res.json({
    ok: true,
    handoff_incidents: handoffStore.size,
    handoff_items_total: total,
  });
});

app.post("/handoff", (req: Request, res: Response) => {
  try {
    const normalized = validateAndNormalizeHandoffEnvelope(req.body);
    const receipt = upsertHandoff(normalized);
    res.status(receipt.status === "duplicate" ? 200 : 201).json({ ok: true, receipt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = msg.includes("checksum mismatch") ? 409 : 400;
    res.status(code).json({ ok: false, error: "invalid_handoff", message: msg });
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function safeCaseId(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeVersion(v: unknown): "baseline" | "new" | null {
  if (v === "baseline" || v === "new") return v;
  return null;
}

function normalizeRedactionPreset(v: unknown): RedactionPreset {
  if (v === "internal_only" || v === "transferable" || v === "transferable_extended") return v;
  return "none";
}

function sendJson(res: Response, payload: unknown, preset: RedactionPreset): void {
  const sanitized = sanitizeValue(payload, preset);
  res.json(sanitized);
}

function sendText(res: Response, text: string, preset: RedactionPreset): void {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(sanitizeValue(text, preset));
}

function withTraceAnchor(payload: unknown, caseId: string, version: "baseline" | "new"): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const rec = payload as Record<string, unknown>;
  const existing = rec.trace_anchor;
  const traceId = createHash("sha256").update(`trace:${caseId}`).digest("hex").slice(0, 32);
  const spanSeed = createHash("sha1").update(`span:${caseId}:${version}`).digest("hex");
  const spanId = spanSeed.slice(0, 16);
  const traceparent = `00-${traceId}-${spanId}-01`;

  const traceAnchor =
    existing && typeof existing === "object"
      ? existing
      : {
          trace_id: traceId,
          span_id: spanId,
          traceparent,
          source: "derived",
        };

  return {
    ...rec,
    trace_anchor: traceAnchor,
  };
}

function attachRuntimeMeta(payload: unknown, runMeta: RunMeta | undefined, handoffReceipts: HandoffReceipt[]): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const rec = payload as Record<string, unknown>;
  return {
    ...rec,
    ...(runMeta ? { run_meta: runMeta } : {}),
    ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
  };
}

function bigString(bytes: number, seed = "X"): string {
  const chunk = seed.repeat(1024);
  const repeats = Math.ceil(bytes / chunk.length);
  const s = Array.from({ length: repeats }, () => chunk).join("");
  return s.slice(0, bytes);
}

async function handleMatrixCase(
  caseId: string,
  version: "baseline" | "new",
  res: Response,
  preset: RedactionPreset,
  decoratePayload?: (payload: unknown) => unknown
) {
  if (!caseId.startsWith("matrix_")) return false;
  const send = (payload: unknown) => sendJson(res, decoratePayload ? decoratePayload(payload) : payload, preset);

  switch (caseId) {
    case "matrix_net_http_500_small": {
      res.status(500);
      sendText(res, "demo-agent forced 500\nref=token_abc12345\nemail=test@example.com\n", preset);
      return true;
    }
    case "matrix_net_http_500_large": {
      res.status(500);
      const body = `demo-agent forced 500\nref=token_abc12345\n` + bigString(3_200_000);
      sendText(res, body, preset);
      return true;
    }
    case "matrix_net_timeout": {
      await sleep(20000);
      send({ ok: true, note: "should not be reached under runner timeout" });
      return true;
    }
    case "matrix_net_drop": {
      const sock = res.req?.socket;
      try {
        sock?.destroy(new Error("demo-agent forced socket destroy"));
      } catch {
        try {
          sock?.destroy();
        } catch {
          // ignore
        }
      }
      return true;
    }
    case "matrix_net_partial": {
      res.status(200);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.write('{"partial": "data", "note": ');
      const sock = res.req?.socket;
      try {
        sock?.destroy(new Error("demo-agent forced partial response"));
      } catch {
        try {
          sock?.destroy();
        } catch {
          // ignore
        }
      }
      return true;
    }
    case "matrix_data_empty_body": {
      res.status(200).end();
      return true;
    }
    case "matrix_data_invalid_json": {
      res.status(200);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send('{"bad": ,,,}');
      return true;
    }
    case "matrix_data_wrong_types": {
      send(
        {
          case_id: caseId,
          version,
          workflow_id: 123,
          proposed_actions: "not-an-array",
          final_output: "oops",
          events: "bad"
        },
      );
      return true;
    }
    case "matrix_data_missing_fields": {
      send({ case_id: caseId, version });
      return true;
    }
    case "matrix_data_extra_fields": {
      send(
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: "ok" },
          events: [],
          extra_field: { note: "extra payload field" }
        },
      );
      return true;
    }
    case "matrix_data_large_json_1mb": {
      send(
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: `email=test@example.com\n${bigString(1_000_000)}` },
          events: []
        },
      );
      return true;
    }
    case "matrix_data_large_json_5mb": {
      send(
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: `token_abcd1234\n${bigString(5_000_000)}` },
          events: []
        },
      );
      return true;
    }
    case "matrix_data_huge_string_900k": {
      send(
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: bigString(900_000, "X") },
          events: []
        },
      );
      return true;
    }
    case "matrix_trace_diff_001": {
      const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
      const spanId = version === "baseline" ? "00f067aa0ba902b7" : "70f067aa0ba902b8";
      const traceparent = `00-${traceId}-${spanId}-01`;
      res.setHeader("traceparent", traceparent);
      res.setHeader("baggage", `env=demo,case_id=${caseId},version=${version}`);
      const withEvents = [
        {
          type: "tool_call",
          ts: Date.now(),
          call_id: "c1",
          action_id: "a1",
          tool: "lookup_customer",
          args: { customer_id: "CUST-TRACE" }
        },
        {
          type: "tool_result",
          ts: Date.now() + 5,
          call_id: "c1",
          action_id: "a1",
          status: "ok",
          latency_ms: 5,
          payload_summary: { customer_id: "CUST-TRACE" }
        },
        {
          type: "final_output",
          ts: Date.now() + 10,
          content_type: "text",
          content: "Trace diff case"
        }
      ];
      send(
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          trace_anchor: {
            trace_id: traceId,
            span_id: spanId,
            traceparent,
            source: "response_body",
          },
          proposed_actions: [],
          final_output: { content_type: "text", content: "Trace diff case" },
          events: version === "baseline" ? withEvents : []
        },
      );
      return true;
    }
    default:
      return false;
  }
}

/**
 * Special cases to force real runner-level failures (Stage 1 benchmark):
 * - fetch_http_500_001: baseline ok, new returns 500 with large-ish body
 * - fetch_invalid_json_001: baseline ok, new returns 200 with invalid JSON
 * - fetch_timeout_001: baseline ok, new delays beyond runner timeout (15s) -> AbortError
* - fetch_network_drop_001: baseline ok, new destroys socket mid-request -> network error */
app.post("/run-case", async (req: Request, res: Response) => {
  const body = (req.body || {}) as RunCaseRequestBody;

  const caseId = safeCaseId(body.case_id);
  const version = safeVersion((body as Record<string, unknown>).version);
  const runMeta = normalizeRunMeta(body.run_meta);
  let inlineHandoffReceipt: HandoffReceipt | undefined;
  if (body.handoff !== undefined) {
    try {
      const normalized = validateAndNormalizeHandoffEnvelope(body.handoff);
      inlineHandoffReceipt = upsertHandoff(normalized);
    } catch (err) {
      res.status(400).json({
        error: "invalid_handoff",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }
  const handoffReceipts = [
    ...(inlineHandoffReceipt ? [inlineHandoffReceipt] : []),
    ...getAvailableHandoffReceipts(runMeta),
  ];
  const redactionPreset = normalizeRedactionPreset(
    req.header("x-redaction-preset") ?? process.env.DEMO_REDACTION_PRESET
  );

  if (!caseId || !version) {
    res.status(400).json({
      error: "Invalid request",
      required: ["case_id", "version"],
      allowed_versions: ["baseline", "new"],
    });
    return;
  }

  const sendCaseJson = (payload: unknown): void => {
    const traced = withTraceAnchor(payload, caseId, version);
    const enriched = attachRuntimeMeta(traced, runMeta, handoffReceipts);
    const trace = (traced as Record<string, unknown>).trace_anchor as Record<string, unknown> | undefined;
    if (trace) {
      const traceparent = typeof trace.traceparent === "string" ? trace.traceparent : undefined;
      const baggage = `env=demo,case_id=${caseId},version=${version}`;
      if (traceparent) res.setHeader("traceparent", traceparent);
      if (typeof trace.trace_id === "string") res.setHeader("x-trace-id", trace.trace_id);
      if (typeof trace.span_id === "string") res.setHeader("x-span-id", trace.span_id);
      res.setHeader("baggage", baggage);
    }
    if (runMeta?.incident_id) res.setHeader("x-incident-id", runMeta.incident_id);
    if (runMeta?.agent_id) res.setHeader("x-agent-id", runMeta.agent_id);
    sendJson(res, enriched, redactionPreset);
  };

  if (caseId === "fetch_http_500_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return sendCaseJson(ok);
      sendCaseJson({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
      return;
    }

    const chunk = "X".repeat(8192);
    const bodyText = Array.from({ length: 64 }, () => chunk).join("\n");
    res.status(500);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(`demo-agent forced 500\ncase_id=${caseId}\nversion=${version}\n\n${bodyText}`);
    return;
  }

  if (caseId === "fetch_invalid_json_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return sendCaseJson(ok);
      sendCaseJson({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send('{"this_is":"not valid json",,,,');
    return;
  }

  if (caseId === "fetch_timeout_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return sendCaseJson(ok);
      sendCaseJson({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
      return;
    }

    await sleep(20000);
    sendCaseJson({
      case_id: caseId,
      version,
      workflow_id: "support_ticketing_v1",
      proposed_actions: [],
      final_output: { content_type: "text", content: "should not be reached under runner timeout" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "timeout branch reached" }],
    });
    return;
  }

  if (caseId === "fetch_network_drop_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return sendCaseJson(ok);
      sendCaseJson({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
      return;
    }

    const sock = req.socket;
    try {
      sock.destroy(new Error("demo-agent forced socket destroy"));
    } catch {
      try {
        sock.destroy();
      } catch {
        // ignore
      }
    }
    return;
  }

  if (
    await handleMatrixCase(
      caseId,
      version,
      res,
      redactionPreset,
      (payload) => attachRuntimeMeta(payload, runMeta, handoffReceipts)
    )
  ) {
    return;
  }

  const resp = RESPONSES[version]?.[caseId];

  if (!resp) {
    res.status(404).json({
      error: "Unknown case_id for this demo-agent",
      case_id: caseId,
      version,
      ...(runMeta ? { run_meta: runMeta } : {}),
      ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
    });
    return;
  }
  sendCaseJson(resp);
});

const port = process.env.PORT ? Number(process.env.PORT) : 8787;

app.listen(port, () => {
  console.log(`demo-agent listening on http://localhost:${port}`);
});
