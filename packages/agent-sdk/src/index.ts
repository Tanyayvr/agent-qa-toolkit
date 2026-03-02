// packages/agent-sdk/src/index.ts
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { validateAndNormalizeHandoffEnvelope } from "cli-utils";
import type {
  AgentResponse,
  FinalOutput,
  HandoffEnvelope,
  HandoffReceipt,
  RunCaseRequestPayload
} from "shared-types";

export type RunCaseRequest = RunCaseRequestPayload;

export type RunCaseHandler = (req: RunCaseRequest) => Promise<AgentResponse>;
export type HandoffHandler = (handoff: HandoffEnvelope) => Promise<{ status?: "accepted" | "duplicate"; receipt?: Partial<HandoffReceipt> } | void>;

export type SimpleAgent = (input: { user: string; context?: unknown }) => Promise<{
  final_output: FinalOutput;
  proposed_actions?: AgentResponse["proposed_actions"];
  events?: AgentResponse["events"];
  workflow_id?: string;
  trace_anchor?: AgentResponse["trace_anchor"];
  token_usage?: AgentResponse["token_usage"];
  run_meta?: AgentResponse["run_meta"];
  handoff_emits?: AgentResponse["handoff_emits"];
  handoff_receipts?: AgentResponse["handoff_receipts"];
}>;


export type ServerOptions = {
  port: number;
  host?: string;
  handler: RunCaseHandler;
  handoffHandler?: HandoffHandler;
};

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function badRequest(res: ServerResponse, msg: string): void {
  sendJson(res, 400, { error: "bad_request", message: msg });
}

export function parseRunCaseRequest(payload: unknown): RunCaseRequest {
  const obj = payload as Partial<RunCaseRequest>;
  if (!obj || typeof obj.case_id !== "string" || typeof obj.version !== "string") {
    throw new Error("missing case_id or version");
  }
  if (!obj.input || typeof obj.input.user !== "string") {
    throw new Error("missing input.user");
  }
  return obj as RunCaseRequest;
}

export function buildHandoffReceipt(
  normalized: HandoffEnvelope,
  handlerResult?: { status?: "accepted" | "duplicate"; receipt?: Partial<HandoffReceipt> } | void,
  nowMs: number = Date.now()
): HandoffReceipt {
  const status = handlerResult?.status ?? "accepted";
  return {
    incident_id: normalized.incident_id,
    handoff_id: normalized.handoff_id,
    from_agent_id: normalized.from_agent_id,
    to_agent_id: normalized.to_agent_id,
    checksum: normalized.checksum,
    accepted_at: nowMs,
    status: status === "duplicate" ? "duplicate" : "accepted",
    ...(handlerResult?.receipt ?? {})
  };
}

export function createRunCaseServer(opts: ServerOptions): Server {
  const host = opts.host ?? "0.0.0.0";

  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 404;
      return res.end();
    }

    if (req.url === "/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true, id: randomUUID() });
    }

    if (req.method !== "POST") {
      res.statusCode = 404;
      return res.end();
    }

    if (req.url === "/handoff") {
      let payload: unknown;
      try {
        payload = await readJson(req);
      } catch (err) {
        return badRequest(res, `invalid_json: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        const normalized = validateAndNormalizeHandoffEnvelope(payload);
        const handlerResult = opts.handoffHandler ? await opts.handoffHandler(normalized) : undefined;
        const receipt = buildHandoffReceipt(normalized, handlerResult);
        return sendJson(res, 200, { ok: true, receipt });
      } catch (err) {
        return badRequest(res, `invalid_handoff: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (req.url !== "/run-case") {
      res.statusCode = 404;
      return res.end();
    }

    let payload: unknown;
    try {
      payload = await readJson(req);
    } catch (err) {
      return badRequest(res, `invalid_json: ${err instanceof Error ? err.message : String(err)}`);
    }

    let parsed: RunCaseRequest;
    try {
      parsed = parseRunCaseRequest(payload);
    } catch (err) {
      return badRequest(res, err instanceof Error ? err.message : String(err));
    }

    try {
      const out = await opts.handler(parsed);
      return sendJson(res, 200, out);
    } catch (err) {
      return sendJson(res, 500, { error: "handler_error", message: err instanceof Error ? err.message : String(err) });
    }
  });

  server.listen(opts.port, host);
  return server;
}

export function wrapSimpleAgent(agent: SimpleAgent): RunCaseHandler {
  return async (req: RunCaseRequest) => {
    const out = await agent(req.input);
    return {
      case_id: req.case_id,
      version: req.version,
      final_output: out.final_output,
      ...(out.workflow_id ? { workflow_id: out.workflow_id } : {}),
      ...(out.proposed_actions ? { proposed_actions: out.proposed_actions } : {}),
      ...(out.events ? { events: out.events } : {}),
      ...(out.trace_anchor ? { trace_anchor: out.trace_anchor } : {}),
      ...(out.token_usage ? { token_usage: out.token_usage } : {}),
      ...(out.run_meta ? { run_meta: out.run_meta } : {}),
      ...(out.handoff_emits ? { handoff_emits: out.handoff_emits } : {}),
      ...(out.handoff_receipts ? { handoff_receipts: out.handoff_receipts } : {}),
    };
  };
}

export const __test__ = {
  parseRunCaseRequest,
  buildHandoffReceipt,
};
