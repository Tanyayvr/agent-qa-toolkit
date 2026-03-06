#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();

function getArg(name, def = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return def;
  return val;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function parsePositiveNumber(name, value, min = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= min) {
    throw new Error(`invalid ${name}: ${String(value)} (must be > ${min})`);
  }
  return num;
}

async function waitForHealth(baseUrl, retries = 60, sleepMs = 250) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json?.ok === true) return;
      }
    } catch {
      // keep retrying
    }
    await new Promise((r) => setTimeout(r, sleepMs));
  }
  throw new Error(`health check failed for ${baseUrl}`);
}

async function postJson(baseUrl, endpoint, body, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
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

async function stopProcess(proc, timeoutMs = 2000) {
  if (!proc || proc.killed) return;
  proc.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve();
    }, timeoutMs);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  const ciMode = hasFlag("--ci");
  const port = parsePositiveNumber("--port", getArg("--port", ciMode ? "8797" : "8797"));
  const baseUrl = getArg("--baseUrl", `http://127.0.0.1:${port}`);
  const timeoutMs = parsePositiveNumber("--timeoutMs", getArg("--timeoutMs", ciMode ? "20000" : "20000"));
  const tmpRoot = await mkdtemp(path.join(tmpdir(), "aq-runtime-policy-e2e-"));
  const auditPath = path.join(tmpRoot, "policy", "policy-violations.ndjson");
  await mkdir(path.dirname(auditPath), { recursive: true });

  let adapter = null;
  try {
    adapter = spawn("npm", ["--workspace", "cli-agent-adapter", "run", "dev"], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        CLI_AGENT_CMD: process.execPath,
        CLI_AGENT_ARGS: JSON.stringify(["-e", "process.stdout.write(process.argv[1]||\"\")"]),
        CLI_AGENT_TIMEOUT_MS: "120000",
        CLI_AGENT_TIMEOUT_CAP_MS: "120000",
        CLI_AGENT_MAX_CONCURRENCY: "1",
        CLI_AGENT_POLICY_AUDIT_PATH: auditPath,
        NO_PROXY: "127.0.0.1,localhost",
        HTTP_PROXY: "",
        HTTPS_PROXY: "",
        ALL_PROXY: "",
        http_proxy: "",
        https_proxy: "",
        all_proxy: "",
      },
      stdio: "inherit",
    });

    await waitForHealth(baseUrl);

    const deniedPattern = await postJson(
      baseUrl,
      "/run-case",
      {
        case_id: "runtime_policy_denied_pattern",
        version: "new",
        input: {
          user: '{"name":"localhost_3001_mcp__run_shell","arguments":{"command":"rm -rf /tmp/demo"}}',
        },
        policy: {
          repl_policy: {
            tool_allowlist: ["run_shell"],
            denied_command_patterns: ["rm\\s+-rf"],
          },
        },
      },
      timeoutMs
    );

    assert(deniedPattern.status === 200, `expected status=200 for denied pattern case, got ${deniedPattern.status}`);
    assert(deniedPattern.json?.adapter_error?.code === "policy_violation", "expected adapter_error.code=policy_violation");
    assert(deniedPattern.json?.telemetry_mode === "inferred", "expected telemetry_mode=inferred for denied pattern case");
    const deniedCodes = Array.isArray(deniedPattern.json?.policy_violations)
      ? deniedPattern.json.policy_violations.map((v) => String(v?.code ?? ""))
      : [];
    assert(deniedCodes.includes("denied_command_pattern"), "expected denied_command_pattern policy violation");

    const wrapperOnly = await postJson(
      baseUrl,
      "/run-case",
      {
        case_id: "runtime_policy_wrapper_only",
        version: "new",
        input: { user: "plain text output only" },
        policy: {
          planning_gate: {
            required_for_mutations: true,
          },
        },
      },
      timeoutMs
    );

    assert(wrapperOnly.status === 200, `expected status=200 for wrapper case, got ${wrapperOnly.status}`);
    assert(wrapperOnly.json?.adapter_error?.code === "policy_violation", "expected policy_violation for wrapper case");
    assert(wrapperOnly.json?.telemetry_mode === "wrapper_only", "expected telemetry_mode=wrapper_only");
    const wrapperCodes = Array.isArray(wrapperOnly.json?.policy_violations)
      ? wrapperOnly.json.policy_violations.map((v) => String(v?.code ?? ""))
      : [];
    assert(wrapperCodes.includes("telemetry_untrusted"), "expected telemetry_untrusted policy violation");

    assert(existsSync(auditPath), `policy audit file not found: ${auditPath}`);
    const auditRaw = (await readFile(auditPath, "utf8")).trim();
    assert(auditRaw.length > 0, "policy audit file is empty");
    const rows = auditRaw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((row) => row && typeof row === "object");

    const ids = new Set(rows.map((row) => String(row.case_id ?? "")));
    assert(ids.has("runtime_policy_denied_pattern"), "audit is missing runtime_policy_denied_pattern entry");
    assert(ids.has("runtime_policy_wrapper_only"), "audit is missing runtime_policy_wrapper_only entry");

    console.log("e2e-runtime-policy: PASS");
  } finally {
    await stopProcess(adapter, 2500);
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
