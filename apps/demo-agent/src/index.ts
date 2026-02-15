//apps/demo-agent/src/index.ts
import express, { type Request, type Response } from "express";
import { RESPONSES } from "./responses";
import type { RunCaseRequestBody } from "./types";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
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

type RedactionPreset = "none" | "internal_only" | "transferable";

function normalizeRedactionPreset(v: unknown): RedactionPreset {
  if (v === "internal_only" || v === "transferable") return v;
  return "none";
}

function maskString(input: string, preset: RedactionPreset): string {
  if (preset === "none") return input;
  let s = input;
  s = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted_email]");
  s = s.replace(/\bCUST-\d+\b/g, "CUST-REDACTED");
  s = s.replace(/\bT-\d+\b/g, "T-REDACTED");
  s = s.replace(/\bMSG-\d+\b/g, "MSG-REDACTED");
  if (preset === "transferable") {
    s = s.replace(/\b(sk|api|token|secret)[-_]?[a-z0-9]{8,}\b/gi, "[redacted_token]");
  }
  return s;
}

function applyRedaction<T>(value: T, preset: RedactionPreset): T {
  if (preset === "none") return value;
  if (typeof value === "string") {
    return maskString(value, preset) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => applyRedaction(v, preset)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = applyRedaction(v, preset);
    }
    return out as T;
  }
  return value;
}

function sendJson(res: Response, payload: unknown, preset: RedactionPreset): void {
  const sanitized = applyRedaction(payload, preset);
  res.json(sanitized);
}

function sendText(res: Response, text: string, preset: RedactionPreset): void {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(maskString(text, preset));
}

function bigString(bytes: number, seed = "X"): string {
  const chunk = seed.repeat(1024);
  const repeats = Math.ceil(bytes / chunk.length);
  const s = Array.from({ length: repeats }, () => chunk).join("");
  return s.slice(0, bytes);
}

async function handleMatrixCase(caseId: string, version: "baseline" | "new", res: Response, preset: RedactionPreset) {
  if (!caseId.startsWith("matrix_")) return false;

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
      sendJson(res, { ok: true, note: "should not be reached under runner timeout" }, preset);
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
      sendJson(
        res,
        {
          case_id: caseId,
          version,
          workflow_id: 123,
          proposed_actions: "not-an-array",
          final_output: "oops",
          events: "bad"
        },
        preset
      );
      return true;
    }
    case "matrix_data_missing_fields": {
      sendJson(res, { case_id: caseId, version }, preset);
      return true;
    }
    case "matrix_data_extra_fields": {
      sendJson(
        res,
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: "ok" },
          events: [],
          extra_field: { note: "extra payload field" }
        },
        preset
      );
      return true;
    }
    case "matrix_data_large_json_1mb": {
      sendJson(
        res,
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: `email=test@example.com\n${bigString(1_000_000)}` },
          events: []
        },
        preset
      );
      return true;
    }
    case "matrix_data_large_json_5mb": {
      sendJson(
        res,
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: `token_abcd1234\n${bigString(5_000_000)}` },
          events: []
        },
        preset
      );
      return true;
    }
    case "matrix_data_huge_string_900k": {
      sendJson(
        res,
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: bigString(900_000, "X") },
          events: []
        },
        preset
      );
      return true;
    }
    case "matrix_trace_diff_001": {
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
      sendJson(
        res,
        {
          case_id: caseId,
          version,
          workflow_id: "matrix_v1",
          proposed_actions: [],
          final_output: { content_type: "text", content: "Trace diff case" },
          events: version === "baseline" ? withEvents : []
        },
        preset
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

  if (caseId === "fetch_http_500_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return res.json(ok);
      return res.json({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
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
      if (ok) return res.json(ok);
      return res.json({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
    }

    res.status(200);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send('{"this_is":"not valid json",,,,');
    return;
  }

  if (caseId === "fetch_timeout_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return res.json(ok);
      return res.json({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
    }

    await sleep(20000);
    res.json({ ok: true, note: "should not be reached under runner timeout" });
    return;
  }

  if (caseId === "fetch_network_drop_001") {
    if (version === "baseline") {
      const ok = RESPONSES.baseline?.[caseId];
      if (ok) return res.json(ok);
      return res.json({
        case_id: caseId,
        version,
        workflow_id: "support_ticketing_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: "baseline ok" },
        events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "baseline ok" }],
      });
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

  if (await handleMatrixCase(caseId, version, res, redactionPreset)) {
    return;
  }

  const resp = RESPONSES[version]?.[caseId];

  if (!resp) {
    res.status(404).json({
      error: "Unknown case_id for this demo-agent",
      case_id: caseId,
      version,
    });
    return;
  }

  sendJson(res, resp, redactionPreset);
});

const port = process.env.PORT ? Number(process.env.PORT) : 8787;

app.listen(port, () => {
  console.log(`demo-agent listening on http://localhost:${port}`);
});
