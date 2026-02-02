//apps/demo-agent/src/index.ts
import express, { type Request, type Response } from "express";

import { RESPONSES } from "./responses";
import type { RunCaseRequestBody } from "./types";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {

  res.json({ ok: true });
});

app.post("/run-case", (req: Request, res: Response) => {

  const body = (req.body || {}) as RunCaseRequestBody;

  const caseId = typeof body.case_id === "string" ? body.case_id : "";
  const versionRaw = typeof body.version === "string" ? body.version : "";
  const version = versionRaw === "baseline" || versionRaw === "new" ? versionRaw : null;

  if (!caseId || !version) {
    res.status(400).json({
      error: "Invalid request",
      required: ["case_id", "version"],
      allowed_versions: ["baseline", "new"],
    });
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
