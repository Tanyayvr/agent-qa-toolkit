#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const HELP = `Usage: node scripts/proof-runtime-handoff.mjs [options]

Options:
  --baseUrl <url>             Adapter URL (default: http://127.0.0.1:8788)
  --healthRetries <n>         Retries for /health transport errors (default: 3)
  --healthRetryBackoffMs <ms> Base backoff between health retries (default: 500)
  --incidentId <id>           Incident id (default: proof-<timestamp>)
  --handoffId <id>            Handoff id (default: h-<timestamp>)
  --fromAgent <id>            Producer id (default: planner)
  --toAgent <id>              Consumer id (default: executor)
  --mode <endpoint|e2e>       endpoint = /health + /handoff idempotency only
                              e2e      = endpoint checks + /run-case receipt check
                              (default: endpoint)
  --runCaseTimeoutMs <ms>     Timeout for e2e /run-case request (default: 30000)
  --json                      Print machine-readable JSON
  --help, -h                  Show help
`;

function hasFlag(name, argv = process.argv) {
  return argv.includes(name);
}

function getArg(name, argv = process.argv) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  const v = argv[idx + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function asInt(raw, fallback) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function requestJson(url, method, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, json, text };
  } finally {
    clearTimeout(timer);
  }
}

export function parseCliArgs(argv = process.argv) {
  const now = Date.now();
  const baseUrl = (getArg("--baseUrl", argv) || "http://127.0.0.1:8788").replace(/\/+$/, "");
  return {
    help: hasFlag("--help", argv) || hasFlag("-h", argv),
    jsonMode: hasFlag("--json", argv),
    baseUrl,
    incidentId: getArg("--incidentId", argv) || `proof-${now}`,
    handoffId: getArg("--handoffId", argv) || `h-${now}`,
    fromAgent: getArg("--fromAgent", argv) || "planner",
    toAgent: getArg("--toAgent", argv) || "executor",
    mode: getArg("--mode", argv) || "endpoint",
    runCaseTimeoutMs: asInt(getArg("--runCaseTimeoutMs", argv), 30000),
    healthRetries: asInt(getArg("--healthRetries", argv), 3),
    healthRetryBackoffMs: asInt(getArg("--healthRetryBackoffMs", argv), 500)
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestWithRetries(
  request,
  { url, method, body, timeoutMs, retries = 3, backoffMs = 500, sleepFn = sleep }
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request(url, method, body, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
      const delayMs = backoffMs * Math.max(1, 2 ** attempt);
      await sleepFn(delayMs);
    }
  }
  throw lastError ?? new Error("request failed");
}

export function validateEndpointResponses(health, upsert1, upsert2) {
  if (!health?.ok || !health?.json?.ok) {
    return { ok: false, error: "adapter health check failed", health_status: health?.status ?? null };
  }
  if (!(upsert1?.status === 200 || upsert1?.status === 201)) {
    return {
      ok: false,
      error: "handoff first upsert did not return 200/201",
      status: upsert1?.status ?? null,
      body: upsert1?.json ?? upsert1?.text ?? null
    };
  }
  if (!(upsert2?.status === 200 || upsert2?.status === 201)) {
    return {
      ok: false,
      error: "handoff duplicate upsert did not return 200/201",
      status: upsert2?.status ?? null,
      body: upsert2?.json ?? upsert2?.text ?? null
    };
  }
  return { ok: true };
}

export function findMatchingReceipt(runCaseJson, handoffId) {
  const receipts = Array.isArray(runCaseJson?.handoff_receipts) ? runCaseJson.handoff_receipts : [];
  const matched = receipts.find((r) => r && r.handoff_id === handoffId) ?? null;
  return { receipts, matched };
}

export function renderCliMessages(ok, payload, jsonMode) {
  if (jsonMode) {
    return {
      channel: "stdout",
      lines: [`${JSON.stringify({ ok, ...payload }, null, 2)}`]
    };
  }
  if (ok) {
    return {
      channel: "stdout",
      lines: [
        "Runtime handoff proof: OK",
        ...Object.entries(payload).map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      ]
    };
  }
  return {
    channel: "stderr",
    lines: [
      "Runtime handoff proof: FAILED",
      ...Object.entries(payload).map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    ]
  };
}

export async function cliMain(argv = process.argv, deps = {}) {
  const cli = parseCliArgs(argv);
  if (cli.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const result = await runRuntimeHandoffProof(cli, deps);
  const rendered = renderCliMessages(result.ok, result.payload, cli.jsonMode);
  if (rendered.channel === "stdout") {
    for (const line of rendered.lines) console.log(line);
  } else {
    for (const line of rendered.lines) console.error(line);
  }
  return result.ok ? 0 : 1;
}

async function main() {
  const code = await cliMain(process.argv);
  process.exit(code);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(String(err?.stack ?? err));
    process.exit(1);
  });
}
export async function runRuntimeHandoffProof(
  {
    baseUrl,
    incidentId,
    handoffId,
    fromAgent,
    toAgent,
    mode = "endpoint",
    runCaseTimeoutMs = 30000,
    healthRetries = 3,
    healthRetryBackoffMs = 500
  },
  deps = {}
) {
  const request = deps.requestJson ?? requestJson;
  const sleepFn = deps.sleep ?? sleep;

  if (mode !== "endpoint" && mode !== "e2e") {
    return { ok: false, payload: { error: `invalid --mode: ${mode}` } };
  }

  let health;
  try {
    health = await requestWithRetries(request, {
      url: `${baseUrl}/health`,
      method: "GET",
      body: null,
      timeoutMs: 5000,
      retries: healthRetries,
      backoffMs: healthRetryBackoffMs,
      sleepFn
    });
  } catch (err) {
    return {
      ok: false,
      payload: {
        error: `health request failed: ${err instanceof Error ? err.message : String(err)}`,
        hint: `adapter unavailable at ${baseUrl}. Start cli-agent-adapter and retry proof.`
      }
    };
  }

  const envelope = {
    incident_id: incidentId,
    handoff_id: handoffId,
    from_agent_id: fromAgent,
    to_agent_id: toAgent,
    objective: "Runtime handoff proof",
    schema_version: "1.0.0",
    created_at: Date.now(),
    payload: {
      proof: true,
      ts: new Date().toISOString()
    }
  };

  let upsert1;
  try {
    upsert1 = await request(`${baseUrl}/handoff`, "POST", envelope, 10000);
  } catch (err) {
    return {
      ok: false,
      payload: { error: `handoff upsert failed: ${err instanceof Error ? err.message : String(err)}` }
    };
  }

  let upsert2;
  try {
    upsert2 = await request(`${baseUrl}/handoff`, "POST", envelope, 10000);
  } catch (err) {
    return {
      ok: false,
      payload: { error: `handoff duplicate upsert failed: ${err instanceof Error ? err.message : String(err)}` }
    };
  }

  const endpointValidation = validateEndpointResponses(health, upsert1, upsert2);
  if (!endpointValidation.ok) {
    return { ok: false, payload: endpointValidation };
  }

  if (mode === "endpoint") {
    return {
      ok: true,
      payload: {
        base_url: baseUrl,
        mode,
        incident_id: incidentId,
        handoff_id: handoffId,
        health_status: health.status,
        first_upsert_status: upsert1.status,
        duplicate_upsert_status: upsert2.status
      }
    };
  }

  const runCaseBody = {
    case_id: "runtime_handoff_proof",
    version: "new",
    input: { user: "Reply with one short sentence." },
    run_meta: {
      incident_id: incidentId,
      agent_id: toAgent
    }
  };

  let runCase;
  try {
    runCase = await request(`${baseUrl}/run-case`, "POST", runCaseBody, runCaseTimeoutMs);
  } catch (err) {
    return {
      ok: false,
      payload: { error: `run-case request failed: ${err instanceof Error ? err.message : String(err)}` }
    };
  }

  if (!runCase.json) {
    return { ok: false, payload: { error: "run-case failed", status: runCase.status, body: runCase.text } };
  }

  const { receipts, matched } = findMatchingReceipt(runCase.json, handoffId);
  if (!matched) {
    return {
      ok: false,
      payload: {
        error: "handoff receipt for proof handoff_id not found in run-case response",
        receipt_count: receipts.length,
        run_case_status: runCase.status,
        run_case_ok: runCase.ok
      }
    };
  }

  const runCaseWarning =
    runCase.ok ? undefined : `run-case returned HTTP ${runCase.status}, but handoff receipt was found`;

  return {
    ok: true,
    payload: {
      base_url: baseUrl,
      mode,
      incident_id: incidentId,
      handoff_id: handoffId,
      health_status: health.status,
      first_upsert_status: upsert1.status,
      duplicate_upsert_status: upsert2.status,
      run_case_status: runCase.status,
      run_case_ok: runCase.ok,
      ...(runCaseWarning ? { run_case_warning: runCaseWarning } : {}),
      matched_receipt_status: matched.status ?? "unknown",
      receipt_count: receipts.length
    }
  };
}
