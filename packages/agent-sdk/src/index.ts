// packages/agent-sdk/src/index.ts
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AgentResponse, Version, FinalOutput } from "shared-types";

export type RunCaseRequest = {
  case_id: string;
  version: Version;
  input: { user: string; context?: unknown };
};

export type RunCaseHandler = (req: RunCaseRequest) => Promise<AgentResponse>;

export type SimpleAgent = (input: { user: string; context?: unknown }) => Promise<{
  final_output: FinalOutput;
  proposed_actions?: AgentResponse["proposed_actions"];
  events?: AgentResponse["events"];
  workflow_id?: string;
}>;

export type ServerOptions = {
  port: number;
  host?: string;
  handler: RunCaseHandler;
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

export function createRunCaseServer(opts: ServerOptions): Server {
  const host = opts.host ?? "0.0.0.0";

  const server = createServer(async (req, res) => {
    if (!req.url || req.method !== "POST") {
      res.statusCode = 404;
      return res.end();
    }

    if (req.url === "/health") {
      return sendJson(res, 200, { ok: true, id: randomUUID() });
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

    const obj = payload as Partial<RunCaseRequest>;
    if (!obj || typeof obj.case_id !== "string" || typeof obj.version !== "string") {
      return badRequest(res, "missing case_id or version");
    }
    if (!obj.input || typeof obj.input.user !== "string") {
      return badRequest(res, "missing input.user");
    }

    try {
      const out = await opts.handler(obj as RunCaseRequest);
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
    };
  };
}
