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

  const resp = RESPONSES[version]?.[caseId];

  if (!resp) {
    res.status(404).json({
      error: "Unknown case_id for this demo-agent",
      case_id: caseId,
      version,
    });
    return;
  }

  res.json(resp);
});

const port = process.env.PORT ? Number(process.env.PORT) : 8787;

app.listen(port, () => {
  console.log(`demo-agent listening on http://localhost:${port}`);
});
