#!/usr/bin/env node
import process from "node:process";

function printHelp() {
  console.log(`Usage:
  node scripts/check-mcp-health.mjs [--baseUrl <url>] [--timeoutMs <ms>] [--json]

Examples:
  node scripts/check-mcp-health.mjs --baseUrl http://127.0.0.1:3001/health
`);
}

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.MCP_HEALTH_URL || "http://127.0.0.1:3001/health",
    timeoutMs: 5000,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--json") out.json = true;
    else if (arg === "--baseUrl") out.baseUrl = argv[++i];
    else if (arg === "--timeoutMs") out.timeoutMs = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!out.baseUrl) throw new Error("--baseUrl is required");
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs <= 0) {
    throw new Error("--timeoutMs must be a positive number");
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    const res = await fetch(args.baseUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    clearTimeout(timeout);

    const payload = {
      ok: res.ok && body?.ok === true,
      status: res.status,
      baseUrl: args.baseUrl,
      runtime: body?.runtime ?? {},
    };

    if (args.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log("MCP health:");
      console.log(`  baseUrl=${payload.baseUrl}`);
      console.log(`  ok=${payload.ok}`);
      console.log(`  status=${payload.status}`);
      console.log(`  timeoutMs=${payload.runtime.timeout_ms ?? "unknown"}`);
      console.log(`  serverRequestTimeoutMs=${payload.runtime.server_request_timeout_ms ?? "unknown"}`);
      console.log(`  headersTimeoutMs=${payload.runtime.headers_timeout_ms ?? "unknown"}`);
      console.log(`  keepAliveTimeoutMs=${payload.runtime.keep_alive_timeout_ms ?? "unknown"}`);
    }

    if (!payload.ok) process.exit(1);
  } catch (error) {
    clearTimeout(timeout);
    console.error(`MCP health check failed: ${error?.message || String(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
