#!/usr/bin/env node
import process from "node:process";

function printHelp() {
  console.log(`Usage:
  node scripts/check-adapter-health.mjs [--baseUrl <url>] [--timeoutMs <ms>] [--json]

Examples:
  node scripts/check-adapter-health.mjs --baseUrl http://127.0.0.1:8788
  npm run campaign:agent:health -- --baseUrl http://127.0.0.1:8788
`);
}

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.BASE_URL || "http://127.0.0.1:8788",
    timeoutMs: 5000,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--json") {
      out.json = true;
      continue;
    }
    if (arg === "--baseUrl") {
      out.baseUrl = argv[++i];
      continue;
    }
    if (arg === "--timeoutMs") {
      out.timeoutMs = Number(argv[++i]);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
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

  const baseUrl = args.baseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    clearTimeout(timeout);

    const payload = {
      ok: res.ok && body?.ok === true,
      status: res.status,
      baseUrl,
      active_cli_processes: body?.active_cli_processes ?? null,
      max_cli_processes: body?.max_cli_processes ?? null,
      runtime: body?.runtime ?? {},
    };

    if (args.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log("Adapter health:");
      console.log(`  baseUrl=${payload.baseUrl}`);
      console.log(`  ok=${payload.ok}`);
      console.log(`  status=${payload.status}`);
      console.log(`  activeCliProcesses=${payload.active_cli_processes ?? "unknown"}`);
      console.log(`  maxCliProcesses=${payload.max_cli_processes ?? "unknown"}`);
      console.log(`  timeoutMs=${payload.runtime.timeout_ms ?? "unknown"}`);
      console.log(`  timeoutCapMs=${payload.runtime.timeout_cap_ms ?? "unknown"}`);
      console.log(`  serverRequestTimeoutMs=${payload.runtime.server_request_timeout_ms ?? "unknown"}`);
    }

    if (!payload.ok) process.exit(1);
  } catch (error) {
    clearTimeout(timeout);
    console.error(`Health check failed: ${error?.message || String(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
