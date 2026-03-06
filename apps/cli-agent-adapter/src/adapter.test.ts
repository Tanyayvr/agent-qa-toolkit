import { once } from "node:events";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CliAgentError, createCliAgentAdapterApp, normalizeStderrSnippet, parseArgs, __test__ } from "./adapter";
import { validateAndNormalizeHandoffEnvelope } from "cli-utils";

describe("cli-agent-adapter helpers", () => {
  it("parseArgs supports JSON array and plain string fallback", () => {
    expect(parseArgs("[\"a\",\"b\",\"c\"]")).toEqual(["a", "b", "c"]);
    expect(parseArgs("a b   c")).toEqual(["a", "b", "c"]);
    expect(parseArgs("[\"broken\"")).toEqual(["[\"broken\""]);
    expect(parseArgs(undefined)).toEqual([]);
  });

  it("normalizeStderrSnippet strips ansi, folds whitespace and truncates", () => {
    const raw = "\u001b[31mError:\u001b[0m failed\n   with\tmore details";
    const normalized = normalizeStderrSnippet(raw, 22);
    expect(normalized).toBe("Error: failed with mor...");
  });

  it("createCliErrorPayload keeps structured reason for non-zero exit", () => {
    const err = new CliAgentError({
      reason: "non_zero_exit",
      message: "CLI agent exited with code=2 signal=null",
      exitCode: 2,
      stderr: "fatal: invalid flag",
    });
    const payload = __test__.createCliErrorPayload(err, 120);
    expect(payload).toMatchObject({
      code: "non_zero_exit",
      exit_code: 2,
    });
    expect(payload.stderr_snippet).toContain("fatal: invalid flag");
  });

  it("createCliErrorPayload falls back for generic errors", () => {
    const payload = __test__.createCliErrorPayload(new Error("spawn blew up"), 120);
    expect(payload).toEqual({
      code: "spawn_error",
      message: "spawn blew up",
    });
  });

  it("resolveAuthConfig enables token mode and defaults to authorization header", () => {
    const cfg = __test__.resolveAuthConfig({
      CLI_AGENT_AUTH_TOKEN: "secret-token",
    });
    expect(cfg).toMatchObject({
      enabled: true,
      token: "secret-token",
      header: "authorization",
    });
  });

  it("intEnv rejects invalid positive numbers", () => {
    expect(() => __test__.intEnv({ X: "0" }, "X", 1)).toThrow("Invalid env X");
    expect(() => __test__.intEnv({ X: "-5" }, "X", 1)).toThrow("Invalid env X");
    expect(() => __test__.intEnv({ X: "abc" }, "X", 1)).toThrow("Invalid env X");
  });

  it("resolveTimeoutMs clamps oversized timeout by cap", () => {
    const t = __test__.resolveTimeoutMs({
      CLI_AGENT_TIMEOUT_MS: "210000",
      CLI_AGENT_TIMEOUT_CAP_MS: "120000",
    });
    expect(t).toMatchObject({
      requestedMs: 210000,
      capMs: 120000,
      effectiveMs: 120000,
      clamped: true,
    });
  });

  it("resolveTimeoutMs keeps requested timeout when below cap", () => {
    const t = __test__.resolveTimeoutMs({
      CLI_AGENT_TIMEOUT_MS: "45000",
      CLI_AGENT_TIMEOUT_CAP_MS: "120000",
    });
    expect(t).toMatchObject({
      requestedMs: 45000,
      capMs: 120000,
      effectiveMs: 45000,
      clamped: false,
    });
  });

  it("getExecutable rejects newline in CLI_AGENT_CMD", () => {
    expect(() =>
      __test__.getExecutable({
        CLI_AGENT_CMD: "/Users/me/Autonomous-\n  CLI-Agent/.venv/bin/python3",
      })
    ).toThrow("contains a newline");
  });

  it("getExecutable rejects missing absolute executable", () => {
    expect(() =>
      __test__.getExecutable({
        CLI_AGENT_CMD: "/definitely/not/present/agent-cli",
      })
    ).toThrow("executable not found or not executable");
  });

  it("getExecutable resolves relative path from workdir and supports stdin mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "adapter-exec-"));
    const script = join(dir, "agent.sh");
    writeFileSync(script, "#!/bin/sh\necho ok\n");
    chmodSync(script, 0o755);
    try {
      const executable = __test__.getExecutable({
        CLI_AGENT_CMD: "./agent.sh",
        CLI_AGENT_WORKDIR: dir,
        CLI_AGENT_USE_STDIN: "true",
      });
      expect(executable.cmd).toBe(script);
      expect(executable.cwd).toBe(dir);
      expect(executable.useStdin).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("upsertHandoff is idempotent for same checksum", () => {
    const store = new Map();
    const envelope = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-1",
      from_agent_id: "planner",
      to_agent_id: "executor",
      objective: "plan",
    }, 100);
    const first = __test__.upsertHandoff(store, envelope);
    const second = __test__.upsertHandoff(store, envelope);
    expect(first.status).toBe("accepted");
    expect(second.status).toBe("duplicate");
    expect(second.receipt.handoff_id).toBe("h-1");
  });

  it("upsertHandoff rejects checksum conflict for same handoff id", () => {
    const store = new Map();
    const first = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-1",
      from_agent_id: "planner",
      to_agent_id: "executor",
      objective: "task-a",
      created_at: 100,
    });
    const conflicting = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-1",
      from_agent_id: "planner",
      to_agent_id: "executor",
      objective: "task-b",
      created_at: 100,
    });
    __test__.upsertHandoff(store, first);
    expect(() => __test__.upsertHandoff(store, conflicting)).toThrow("checksum mismatch");
  });

  it("getIncidentHandoffs filters by incident + agent id", () => {
    const store = new Map();
    const h1 = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-1",
      from_agent_id: "planner",
      to_agent_id: "executor",
      objective: "step-1",
    }, 100);
    const h2 = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-2",
      from_agent_id: "planner",
      to_agent_id: "reviewer",
      objective: "step-2",
    }, 101);
    __test__.upsertHandoff(store, h1);
    __test__.upsertHandoff(store, h2);
    const picked = __test__.getIncidentHandoffs(store, { incident_id: "inc-1", agent_id: "executor" }, 10);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.envelope.handoff_id).toBe("h-1");
  });

  it("pruneHandoffStore removes expired records and keeps deterministic size bound", () => {
    const store = new Map<string, Map<string, { envelope: ReturnType<typeof validateAndNormalizeHandoffEnvelope>; accepted_at: number }>>();
    const make = (id: string, acceptedAt: number) => ({
      envelope: validateAndNormalizeHandoffEnvelope({
        incident_id: "inc-1",
        handoff_id: id,
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: id,
        created_at: acceptedAt,
      }),
      accepted_at: acceptedAt,
    });
    const incident = new Map();
    incident.set("h-old", make("h-old", 10));
    incident.set("h-new1", make("h-new1", 9_000));
    incident.set("h-new2", make("h-new2", 9_100));
    store.set("inc-1", incident);

    const changed = __test__.pruneHandoffStore(store, 1_000, 1, 10_000);
    expect(changed).toBe(true);
    const picked = __test__.getIncidentHandoffs(store, { incident_id: "inc-1", agent_id: "executor" }, 10);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.envelope.handoff_id).toBe("h-new2");
  });

  it("buildRunCasePrompt injects handoff context when enabled", () => {
    const store = new Map();
    const h1 = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-1",
      from_agent_id: "planner",
      to_agent_id: "executor",
      objective: "do task",
      state_delta: { approved: true },
    }, 100);
    __test__.upsertHandoff(store, h1);
    const handoffs = __test__.getIncidentHandoffs(store, { incident_id: "inc-1", agent_id: "executor" }, 10);
    const prompt = __test__.buildRunCasePrompt(
      "user asks to execute",
      { incident_id: "inc-1", agent_id: "executor" },
      handoffs,
      true,
      4000
    );
    expect(prompt).toContain("[runtime_handoff_context]");
    expect(prompt).toContain("\"handoff_id\":\"h-1\"");
    expect(prompt).toContain("[user_request]");
  });

  it("formatHandoffContext truncates oversized payloads", () => {
    const store = new Map();
    const h1 = validateAndNormalizeHandoffEnvelope({
      incident_id: "inc-1",
      handoff_id: "h-1",
      from_agent_id: "planner",
      to_agent_id: "executor",
      objective: "x".repeat(100),
      state_delta: { notes: "y".repeat(500) },
    }, 100);
    __test__.upsertHandoff(store, h1);
    const handoffs = __test__.getIncidentHandoffs(store, { incident_id: "inc-1", agent_id: "executor" }, 10);
    const block = __test__.formatHandoffContext({ incident_id: "inc-1", agent_id: "executor" }, handoffs, 80);
    expect(block).toContain("...[truncated]");
  });

  it("extractInferredToolCalls parses Goose-like tool traces from output", () => {
    const calls = __test__.extractInferredToolCalls([
      "some prefix",
      "{\"name\":\"localhost_3001_mcp__register_agent\",\"arguments\":{\"team\":\"alpha\"}}",
      "▸ list_agents localhost_3001_mcp",
    ].join("\n"));
    expect(calls).toEqual([
      { tool: "register_agent", args: { team: "alpha" } },
      { tool: "list_agents", args: { raw: "localhost_3001_mcp" } },
    ]);
  });

  it("buildExecutionTelemetry always records adapter exec tool and final_output event", () => {
    const telemetry = __test__.buildExecutionTelemetry({
      caseId: "c1",
      prompt: "hello",
      finalOutputContent: "DONE",
      outputContentType: "text",
      startedAtMs: 100,
      finishedAtMs: 130,
      status: "ok",
      execToolName: "cli_agent_exec",
      cmd: "goose",
      args: ["run"],
      useStdin: false,
    });
    expect(telemetry.proposedActions[0]?.tool_name).toBe("cli_agent_exec");
    expect(telemetry.events.some((e) => e.type === "tool_call")).toBe(true);
    expect(telemetry.events.some((e) => e.type === "tool_result")).toBe(true);
    expect(telemetry.events.some((e) => e.type === "final_output")).toBe(true);
    expect(telemetry.telemetryMode).toBe("wrapper_only");
  });
});

describe("cli-agent-adapter app", () => {
  const proxyEnvBackup = {
    HTTP_PROXY: process.env.HTTP_PROXY,
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    ALL_PROXY: process.env.ALL_PROXY,
    NO_PROXY: process.env.NO_PROXY,
    http_proxy: process.env.http_proxy,
    https_proxy: process.env.https_proxy,
    all_proxy: process.env.all_proxy,
    no_proxy: process.env.no_proxy,
  };

  beforeAll(() => {
    // Keep loopback calls deterministic in tests regardless of shell/proxy config.
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.all_proxy;
    process.env.NO_PROXY = "127.0.0.1,localhost";
    process.env.no_proxy = "127.0.0.1,localhost";
  });

  afterAll(() => {
    process.env.HTTP_PROXY = proxyEnvBackup.HTTP_PROXY;
    process.env.HTTPS_PROXY = proxyEnvBackup.HTTPS_PROXY;
    process.env.ALL_PROXY = proxyEnvBackup.ALL_PROXY;
    process.env.NO_PROXY = proxyEnvBackup.NO_PROXY;
    process.env.http_proxy = proxyEnvBackup.http_proxy;
    process.env.https_proxy = proxyEnvBackup.https_proxy;
    process.env.all_proxy = proxyEnvBackup.all_proxy;
    process.env.no_proxy = proxyEnvBackup.no_proxy;
  });

  const baseEnv = {
    CLI_AGENT_CMD: "/bin/sh",
    CLI_AGENT_ARGS: JSON.stringify(["-c", "printf '%s' \"$1\"", "_"]),
    CLI_AGENT_TIMEOUT_MS: "5000",
    CLI_AGENT_TIMEOUT_CAP_MS: "5000",
    CLI_AGENT_MAX_CONCURRENCY: "1",
  };

  async function withAdapter(
    env: Record<string, string>,
    fn: (baseUrl: string) => Promise<void>
  ): Promise<void> {
    const app = createCliAgentAdapterApp(env);
    const server = app.listen(0);
    await once(server, "listening");
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      throw new Error("Failed to bind test server");
    }
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    try {
      await fn(baseUrl);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  async function postJson(baseUrl: string, path: string, body: unknown): Promise<Response> {
    const request = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    } as const;
    try {
      return await fetch(`${baseUrl}${path}`, request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/fetch failed|socket/i.test(msg)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 25));
      return await fetch(`${baseUrl}${path}`, request);
    }
  }

  async function postJsonWithHeaders(
    baseUrl: string,
    path: string,
    body: unknown,
    headers: Record<string, string>
  ): Promise<Response> {
    const request = {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    } as const;
    try {
      return await fetch(`${baseUrl}${path}`, request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/fetch failed|socket/i.test(msg)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 25));
      return await fetch(`${baseUrl}${path}`, request);
    }
  }

  it("health returns runtime fields and handoff counters", async () => {
    await withAdapter(baseEnv, async (baseUrl) => {
      const before = await fetch(`${baseUrl}/health`);
      const beforeJson = (await before.json()) as Record<string, unknown>;
      expect(before.status).toBe(200);
      expect(beforeJson.ok).toBe(true);
      expect(beforeJson.handoff_items_total).toBe(0);

      const envelope = validateAndNormalizeHandoffEnvelope({
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "do-work",
        created_at: 100,
      });
      const upsert = await postJson(baseUrl, "/handoff", envelope);
      expect(upsert.status).toBe(201);

      const after = await fetch(`${baseUrl}/health`);
      const afterJson = (await after.json()) as Record<string, unknown>;
      expect(afterJson.handoff_items_total).toBe(1);
      const runtime = afterJson.runtime as Record<string, unknown>;
      expect(runtime.timeout_ms).toBe(5000);
      expect(runtime.timeout_clamped).toBe(false);
      expect(runtime.server_request_timeout_ms).toBe(125000);
      expect(runtime.server_headers_timeout_ms).toBe(126000);
    });
  });

  it("run-case succeeds and includes handoff context/receipts when available", async () => {
    await withAdapter(baseEnv, async (baseUrl) => {
      const envelope = validateAndNormalizeHandoffEnvelope({
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "execute",
        created_at: 101,
      });
      expect((await postJson(baseUrl, "/handoff", envelope)).status).toBe(201);

      const response = await postJson(baseUrl, "/run-case", {
        case_id: "c1",
        version: "new",
        input: { user: "hello from user" },
        run_meta: { incident_id: "inc-1", agent_id: "executor" },
      });
      expect(response.status).toBe(200);
      const json = (await response.json()) as Record<string, unknown>;
      const output = (json.final_output as { content?: string } | undefined)?.content ?? "";
      expect(output).toContain("[runtime_handoff_context]");
      expect(output).toContain("\"handoff_id\":\"h-1\"");
      const events = (json.events as Array<{ type?: string; tool?: string }> | undefined) ?? [];
      expect(events.some((e) => e.type === "tool_call" && e.tool === "cli_agent_exec")).toBe(true);
      expect(events.some((e) => e.type === "tool_result")).toBe(true);
      expect(events.some((e) => e.type === "final_output")).toBe(true);
      expect(["wrapper_only", "inferred"]).toContain((json.telemetry_mode as string | undefined) ?? "");

      const receipts = (json.handoff_receipts as Array<{ status?: string }> | undefined) ?? [];
      expect(receipts).toHaveLength(1);
      expect(receipts[0]?.status).toBe("available");
    });
  });

  it("run-case supports stdin mode and returns direct prompt output", async () => {
    await withAdapter(
      {
        ...baseEnv,
        CLI_AGENT_ARGS: JSON.stringify(["-c", "cat"]),
        CLI_AGENT_USE_STDIN: "true",
      },
      async (baseUrl) => {
        const response = await postJson(baseUrl, "/run-case", {
          case_id: "stdin-1",
          version: "new",
          input: { user: "stdin prompt" },
        });
        expect(response.status).toBe(200);
        const json = (await response.json()) as Record<string, unknown>;
        const output = (json.final_output as { content?: string } | undefined)?.content ?? "";
        expect(output).toBe("stdin prompt");
        const events = (json.events as Array<{ type?: string; tool?: string }> | undefined) ?? [];
        expect(events.some((e) => e.type === "tool_call" && e.tool === "cli_agent_exec")).toBe(true);
        expect(json.telemetry_mode).toBe("wrapper_only");
      }
    );
  });

  it("rejects invalid runtime policy payload with invalid_config", async () => {
    await withAdapter(baseEnv, async (baseUrl) => {
      const response = await postJson(baseUrl, "/run-case", {
        case_id: "policy-invalid",
        version: "new",
        input: { user: "ping" },
        policy: {
          repl_policy: {
            denied_command_patterns: ["[broken"],
          },
        },
      });
      expect(response.status).toBe(400);
      const json = (await response.json()) as { adapter_error?: { code?: string; message?: string } };
      expect(json.adapter_error?.code).toBe("invalid_config");
      expect(String(json.adapter_error?.message ?? "")).toContain("invalid regex");
    });
  });

  it("blocks request when runtime policy is violated", async () => {
    await withAdapter(baseEnv, async (baseUrl) => {
      const response = await postJson(baseUrl, "/run-case", {
        case_id: "policy-block",
        version: "new",
        input: { user: "{\"name\":\"localhost_3001_mcp__run_shell\",\"arguments\":{\"command\":\"rm -rf /tmp/demo\"}}" },
        policy: {
          repl_policy: {
            tool_allowlist: ["run_shell"],
            denied_command_patterns: ["rm\\s+-rf"],
          },
        },
      });
      expect(response.status).toBe(409);
      const json = (await response.json()) as {
        adapter_error?: { code?: string; message?: string };
        policy_violations?: Array<{ code?: string }>;
        telemetry_mode?: string;
      };
      expect(json.adapter_error?.code).toBe("policy_violation");
      expect(json.telemetry_mode).toBe("inferred");
      const codes = (json.policy_violations ?? []).map((v) => v.code);
      expect(codes).toContain("denied_command_pattern");
    });
  });

  it("run-case preflight probe bypasses CLI execution and returns deterministic response", async () => {
    await withAdapter(baseEnv, async (baseUrl) => {
      const response = await postJson(baseUrl, "/run-case", {
        case_id: "__preflight__",
        version: "baseline",
        input: { user: "this should not reach cli process" },
      });
      expect(response.status).toBe(200);
      const json = (await response.json()) as Record<string, unknown>;
      const output = (json.final_output as { content?: string } | undefined)?.content ?? "";
      expect(output).toContain("[adapter:preflight] ok");
      expect((json.preflight as { ok?: boolean } | undefined)?.ok).toBe(true);
    });
  });

  it("run-case preflight probe surfaces invalid adapter config without spawning cli process", async () => {
    await withAdapter(
      {
        ...baseEnv,
        CLI_AGENT_CMD: "/definitely/not/present/agent-cli",
      },
      async (baseUrl) => {
        const response = await postJson(baseUrl, "/run-case", {
          case_id: "__preflight__",
          version: "baseline",
          input: { user: "preflight" },
        });
        expect(response.status).toBe(500);
        const json = (await response.json()) as {
          adapter_error?: { code?: string; message?: string };
          preflight?: { ok?: boolean };
        };
        expect(json.adapter_error?.code).toBe("invalid_config");
        expect(json.preflight?.ok).toBe(false);
      }
    );
  });

  it("returns 429 busy when max concurrency is exhausted", async () => {
    await withAdapter(
      {
        ...baseEnv,
        CLI_AGENT_ARGS: JSON.stringify(["-c", "sleep 1; printf '%s' \"$1\"", "_"]),
        CLI_AGENT_MAX_CONCURRENCY: "1",
      },
      async (baseUrl) => {
        const longRequest = postJson(baseUrl, "/run-case", {
          case_id: "long",
          version: "new",
          input: { user: "hold slot" },
        });
        await new Promise((resolve) => setTimeout(resolve, 100));

        const busy = await postJson(baseUrl, "/run-case", {
          case_id: "busy",
          version: "new",
          input: { user: "second request" },
        });
        expect(busy.status).toBe(429);
        expect(busy.headers.get("retry-after")).toBeTruthy();
        const busyJson = (await busy.json()) as Record<string, unknown>;
        expect((busyJson.adapter_error as { code?: string } | undefined)?.code).toBe("busy");

        await longRequest;
      }
    );
  });

  it("returns adapter_error for timeout and non-zero exit", async () => {
    await withAdapter(
      {
        ...baseEnv,
        CLI_AGENT_ARGS: JSON.stringify(["-c", "sleep 1; echo done"]),
        CLI_AGENT_TIMEOUT_MS: "50",
        CLI_AGENT_TIMEOUT_CAP_MS: "50",
      },
      async (baseUrl) => {
        const timeoutRes = await postJson(baseUrl, "/run-case", {
          case_id: "timeout",
          version: "new",
          input: { user: "will timeout" },
        });
        expect(timeoutRes.status).toBe(500);
        const timeoutJson = (await timeoutRes.json()) as Record<string, unknown>;
        expect((timeoutJson.adapter_error as { code?: string } | undefined)?.code).toBe("timeout");
        const timeoutEvents = (timeoutJson.events as Array<{ type?: string }> | undefined) ?? [];
        expect(timeoutEvents.some((e) => e.type === "tool_result")).toBe(true);
      }
    );

    await withAdapter(
      {
        ...baseEnv,
        CLI_AGENT_ARGS: JSON.stringify(["-c", "echo 'fatal bad flag' 1>&2; exit 7"]),
      },
      async (baseUrl) => {
        const failRes = await postJson(baseUrl, "/run-case", {
          case_id: "non-zero",
          version: "new",
          input: { user: "will fail" },
        });
        expect(failRes.status).toBe(500);
        const failJson = (await failRes.json()) as Record<string, unknown>;
        const adapterError = failJson.adapter_error as { code?: string; exit_code?: number; stderr_snippet?: string };
        expect(adapterError.code).toBe("non_zero_exit");
        expect(adapterError.exit_code).toBe(7);
        expect(adapterError.stderr_snippet).toContain("fatal bad flag");
      }
    );
  });

  it("enforces auth token on /handoff and /run-case when enabled", async () => {
    await withAdapter(
      {
        ...baseEnv,
        CLI_AGENT_AUTH_TOKEN: "top-secret",
      },
      async (baseUrl) => {
        const denied = await postJson(baseUrl, "/run-case", {
          case_id: "c1",
          version: "new",
          input: { user: "hello" },
        });
        expect(denied.status).toBe(401);

        const allowed = await postJsonWithHeaders(
          baseUrl,
          "/run-case",
          {
            case_id: "c1",
            version: "new",
            input: { user: "hello" },
          },
          { authorization: "Bearer top-secret" }
        );
        expect(allowed.status).toBe(200);
      }
    );
  });

  it("loads persisted handoffs after restart in file store mode", async () => {
    const dir = mkdtempSync(join(tmpdir(), "adapter-store-"));
    const storePath = join(dir, "handoffs.json");
    const env = {
      ...baseEnv,
      CLI_AGENT_HANDOFF_STORE_PATH: storePath,
      CLI_AGENT_HANDOFF_TTL_MS: "86400000",
      CLI_AGENT_HANDOFF_MAX_ITEMS_TOTAL: "100",
    };
    try {
      await withAdapter(env, async (baseUrl) => {
        const envelope = validateAndNormalizeHandoffEnvelope({
          incident_id: "inc-persist",
          handoff_id: "h-1",
          from_agent_id: "planner",
          to_agent_id: "executor",
          objective: "persist me",
          created_at: 123,
        });
        const upsert = await postJson(baseUrl, "/handoff", envelope);
        expect(upsert.status).toBe(201);
      });

      await withAdapter(env, async (baseUrl) => {
        const response = await postJson(baseUrl, "/run-case", {
          case_id: "c1",
          version: "new",
          input: { user: "hello from user" },
          run_meta: { incident_id: "inc-persist", agent_id: "executor" },
        });
        expect(response.status).toBe(200);
        const json = (await response.json()) as Record<string, unknown>;
        const output = (json.final_output as { content?: string } | undefined)?.content ?? "";
        expect(output).toContain("\"handoff_id\":\"h-1\"");
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handoff endpoint handles duplicate and conflict, inline invalid handoff fails fast", async () => {
    await withAdapter(baseEnv, async (baseUrl) => {
      const base = validateAndNormalizeHandoffEnvelope({
        incident_id: "inc-x",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "first",
        created_at: 123,
      });
      const duplicate = { ...base };
      const conflict = validateAndNormalizeHandoffEnvelope({
        incident_id: "inc-x",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "changed",
        created_at: 123,
      });

      expect((await postJson(baseUrl, "/handoff", base)).status).toBe(201);
      expect((await postJson(baseUrl, "/handoff", duplicate)).status).toBe(200);
      expect((await postJson(baseUrl, "/handoff", conflict)).status).toBe(409);

      const invalidInline = await postJson(baseUrl, "/run-case", {
        case_id: "bad-inline",
        version: "new",
        input: { user: "x" },
        handoff: { incident_id: "inc" },
      });
      expect(invalidInline.status).toBe(400);
      const invalidJson = (await invalidInline.json()) as Record<string, unknown>;
      expect((invalidJson.adapter_error as { code?: string } | undefined)?.code).toBe("invalid_config");
    });
  });
});
