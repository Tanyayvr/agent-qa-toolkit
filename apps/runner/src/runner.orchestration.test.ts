import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { validateAndNormalizeHandoffEnvelope } from "cli-utils";

type RunnerModule = {
  runRunner: () => Promise<void>;
};

async function loadRunnerWithArgv(argv: string[]): Promise<RunnerModule> {
  vi.resetModules();
  process.argv = argv;
  return await import("./runner");
}

async function writeJson(absPath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, JSON.stringify(value, null, 2), "utf-8");
}

describe("runner orchestration", () => {
  const savedArgv = [...process.argv];
  const savedFetch = globalThis.fetch;
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-runner-"));
  });

  afterEach(async () => {
    process.argv = [...savedArgv];
    globalThis.fetch = savedFetch;
    await rm(root, { recursive: true, force: true });
  });

  it("writes baseline/new case files for successful local agent responses", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [
      {
        id: "c1",
        title: "simple case",
        input: { user: "hello" },
      },
    ]);

    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        case_id: string;
        version: "baseline" | "new";
        run_meta?: { run_id?: string; incident_id?: string };
      };
      expect(payload.run_meta?.run_id).toBe("ok-run");
      expect(payload.run_meta?.incident_id).toBe("ok-run");
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: `ok:${payload.version}` },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "ok-run",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "ok-run", "c1.json"), "utf-8");
    const newRaw = await readFile(path.join(outDir, "new", "ok-run", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as {
      final_output: { content: string };
      runner_failure?: unknown;
      runner_transport?: { latency_ms?: number };
    };
    const newer = JSON.parse(newRaw) as {
      final_output: { content: string };
      runner_failure?: unknown;
      runner_transport?: { latency_ms?: number };
    };
    expect(baseline.runner_failure).toBeUndefined();
    expect(newer.runner_failure).toBeUndefined();
    expect(typeof baseline.runner_transport?.latency_ms).toBe("number");
    expect(typeof newer.runner_transport?.latency_ms).toBe("number");
    expect(baseline.final_output.content).toContain("ok:baseline");
    expect(newer.final_output.content).toContain("ok:new");
  });

  it("auto timeout profile increases timeout from historical successful latency samples", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [
      {
        id: "c1",
        title: "auto timeout profile case",
        input: { user: "hello" },
      },
    ]);

    // Seed historical data to emulate previous successful slow requests.
    await writeJson(path.join(outDir, "new", "seed-run", "c1.json"), {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
      runner_transport: {
        latency_ms: 100_000,
        transport_ok: true,
      },
    });
    await writeJson(path.join(outDir, "new", "seed-run", "c1.run2.json"), {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
      runner_transport: {
        latency_ms: 100_000,
        transport_ok: true,
      },
    });
    await writeJson(path.join(outDir, "new", "seed-run", "c1.run3.json"), {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
      runner_transport: {
        latency_ms: 100_000,
        transport_ok: true,
      },
    });

    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        case_id: string;
        version: "baseline" | "new";
      };
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: "ok" },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "auto-profile-run",
      "--timeoutProfile",
      "auto",
      "--timeoutMs",
      "15000",
      "--timeoutAutoMaxIncreaseFactor",
      "20",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);
    await mod.runRunner();

    const runRaw = await readFile(path.join(outDir, "baseline", "auto-profile-run", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as {
      runner?: {
        timeout_ms?: number;
        timeout_profile?: string;
        timeout_auto?: { history_sample_count?: number; history_candidate_timeout_ms?: number };
      };
    };
    expect(runMeta.runner?.timeout_profile).toBe("auto");
    expect(runMeta.runner?.timeout_auto?.history_sample_count).toBeGreaterThanOrEqual(1);
    expect(runMeta.runner?.timeout_auto?.history_candidate_timeout_ms).toBe(170_000);
    expect(runMeta.runner?.timeout_ms).toBe(170_000);
  });

  it("auto timeout profile treats adapter timeout as ceiling metadata, not as growth floor", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [
      {
        id: "c1",
        title: "auto timeout server clamp",
        input: { user: "hello" },
      },
    ]);

    // Seed high historical latency to force large recommendation.
    await writeJson(path.join(outDir, "new", "seed-run", "c1.json"), {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
      runner_transport: {
        latency_ms: 400_000,
        transport_ok: true,
      },
    });

    globalThis.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response(
          JSON.stringify({
            ok: true,
            runtime: {
              timeout_ms: 1_800_000,
              server_request_timeout_ms: 300_000,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        case_id: string;
        version: "baseline" | "new";
      };
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: "ok" },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "auto-profile-server-clamp",
      "--timeoutProfile",
      "auto",
      "--timeoutMs",
      "120000",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);
    await mod.runRunner();

    const runRaw = await readFile(path.join(outDir, "baseline", "auto-profile-server-clamp", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as {
      runner?: {
        timeout_ms?: number;
        timeout_auto?: {
          server_request_timeout_ms?: number;
          server_candidate_timeout_ms?: number;
          clamped_by_server_timeout?: boolean;
          history_candidate_ignored_reason?: string;
        };
      };
    };
    expect(runMeta.runner?.timeout_auto?.server_request_timeout_ms).toBe(300_000);
    expect(runMeta.runner?.timeout_auto?.server_candidate_timeout_ms).toBe(295_000);
    expect(runMeta.runner?.timeout_auto?.history_candidate_ignored_reason).toBe("insufficient_success_samples");
    expect(runMeta.runner?.timeout_auto?.clamped_by_server_timeout).toBe(false);
    expect(runMeta.runner?.timeout_ms).toBe(120_000);
  });

  it("forwards metadata.handoff and run_meta routing fields to /run-case", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    const handoff = validateAndNormalizeHandoffEnvelope(
      {
        incident_id: "inc-01",
        handoff_id: "h-01",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "execute task",
      },
      100
    );
    await writeJson(casesPath, [
      {
        id: "c1",
        title: "handoff case",
        input: { user: "hello" },
        metadata: {
          handoff,
          policy: {
            planning_gate: {
              required_for_mutations: true,
              mutation_tools: ["run_shell"],
              high_risk_tools: ["run_shell"],
            },
            repl_policy: {
              tool_allowlist: ["run_shell"],
              denied_command_patterns: ["rm\\s+-rf"],
              max_command_length: 256,
              denied_path_patterns: ["^/etc/"],
              allowed_path_prefixes: ["/tmp/"],
              max_tool_calls: 3,
            },
          },
        },
      },
    ]);

    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        case_id: string;
        version: "baseline" | "new";
        run_meta?: { run_id?: string; incident_id?: string; agent_id?: string };
        handoff?: { handoff_id?: string; checksum?: string };
        policy?: {
          planning_gate?: { required_for_mutations?: boolean; high_risk_tools?: string[] };
          repl_policy?: {
            tool_allowlist?: string[];
            max_command_length?: number;
            denied_path_patterns?: string[];
            allowed_path_prefixes?: string[];
            max_tool_calls?: number;
          };
        };
      };
      expect(payload.run_meta?.run_id).toBe("handoff-run");
      expect(payload.run_meta?.incident_id).toBe("inc-01");
      expect(payload.run_meta?.agent_id).toBe("agent-executor");
      expect(payload.handoff?.handoff_id).toBe("h-01");
      expect(payload.handoff?.checksum).toBe(handoff.checksum);
      expect(payload.policy?.planning_gate?.required_for_mutations).toBe(true);
      expect(payload.policy?.planning_gate?.high_risk_tools).toEqual(["run_shell"]);
      expect(payload.policy?.repl_policy?.tool_allowlist).toEqual(["run_shell"]);
      expect(payload.policy?.repl_policy?.max_command_length).toBe(256);
      expect(payload.policy?.repl_policy?.denied_path_patterns).toEqual(["^/etc/"]);
      expect(payload.policy?.repl_policy?.allowed_path_prefixes).toEqual(["/tmp/"]);
      expect(payload.policy?.repl_policy?.max_tool_calls).toBe(3);
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: "ok" },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "handoff-run",
      "--incidentId",
      "inc-01",
      "--agentId",
      "agent-executor",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "handoff-run", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: unknown };
    expect(baseline.runner_failure).toBeUndefined();
  });

  it("captures timeout as runner_failure when adapter does not respond in time", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [
      {
        id: "c1",
        title: "timeout case",
        input: { user: "hello" },
      },
    ]);

    globalThis.fetch = vi.fn(async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "timeout-run",
      "--timeoutMs",
      "60",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "timeout-run", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: { class?: string; timeout_cause?: string } };
    expect(baseline.runner_failure?.class).toBe("timeout");
    expect(baseline.runner_failure?.timeout_cause).toBe("timeout_budget_too_small");
  });

  it("captures inactivity watchdog timeout when request stays silent", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [
      {
        id: "c1",
        title: "silent adapter",
        input: { user: "hello" },
      },
    ]);

    globalThis.fetch = vi.fn((_input: unknown, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
          return;
        }
        signal?.addEventListener(
          "abort",
          () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          },
          { once: true }
        );
      });
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "watchdog-run",
      "--timeoutMs",
      "10000",
      "--inactivityTimeoutMs",
      "80",
      "--heartbeatIntervalMs",
      "20",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "watchdog-run", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as {
      runner_failure?: { class?: string; error_name?: string; timeout_cause?: string };
    };
    expect(baseline.runner_failure?.class).toBe("timeout");
    expect(baseline.runner_failure?.error_name).toBe("InactivityTimeout");
    expect(baseline.runner_failure?.timeout_cause).toBe("agent_stuck_or_loop");
  });

  it("retries transient HTTP 500 and succeeds on next attempt", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "retry", input: { user: "hello" } }]);

    let baselineCalls = 0;
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as { case_id: string; version: "baseline" | "new" };
      if (payload.version === "baseline") {
        baselineCalls += 1;
        if (baselineCalls === 1) {
          return new Response("temporary fail", { status: 500, statusText: "Internal Server Error" });
        }
      }
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: `ok:${payload.version}` },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "retry-http-success",
      "--timeoutMs",
      "2000",
      "--retries",
      "1",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "retry-http-success", "c1.json"), "utf-8");
    const newRaw = await readFile(path.join(outDir, "new", "retry-http-success", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: unknown; final_output: { content: string } };
    const newer = JSON.parse(newRaw) as { runner_failure?: unknown; final_output: { content: string } };
    expect(baseline.runner_failure).toBeUndefined();
    expect(newer.runner_failure).toBeUndefined();
    expect(baseline.final_output.content).toContain("ok:baseline");
    expect(newer.final_output.content).toContain("ok:new");
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(3);
  });

  it("stops after max retries for transient HTTP 500", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "retry exhausted", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async () => new Response("still failing", { status: 500, statusText: "Internal Server Error" })) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "retry-http-exhausted",
      "--timeoutMs",
      "2000",
      "--retries",
      "2",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "retry-http-exhausted", "c1.json"), "utf-8");
    const newerRaw = await readFile(path.join(outDir, "new", "retry-http-exhausted", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: { class?: string; attempt?: number; status?: number } };
    const newer = JSON.parse(newerRaw) as { runner_failure?: { class?: string; attempt?: number; status?: number } };
    expect(baseline.runner_failure?.class).toBe("http_error");
    expect(baseline.runner_failure?.attempt).toBe(3);
    expect(baseline.runner_failure?.status).toBe(500);
    expect(newer.runner_failure?.class).toBe("http_error");
    expect(newer.runner_failure?.attempt).toBe(3);
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(6);
  });

  it("retries transient network error and then succeeds", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "network retry", input: { user: "hello" } }]);

    let baselineCalls = 0;
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as { case_id: string; version: "baseline" | "new" };
      if (payload.version === "baseline") {
        baselineCalls += 1;
        if (baselineCalls === 1) {
          const err = new Error("connect ECONNRESET 127.0.0.1:8788");
          err.name = "TypeError";
          throw err;
        }
      }
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: `ok:${payload.version}` },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "retry-network-success",
      "--timeoutMs",
      "2000",
      "--retries",
      "1",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "retry-network-success", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: unknown };
    expect(baseline.runner_failure).toBeUndefined();
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(3);
  });

  it("performs one adapter recovery retry on transient connection refusal even when retries=0", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "adapter recovery retry", input: { user: "hello" } }]);

    let baselineCalls = 0;
    let healthCalls = 0;
    globalThis.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        healthCalls += 1;
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const payload = JSON.parse(String(init?.body ?? "{}")) as { case_id: string; version: "baseline" | "new" };
      if (payload.version === "baseline") {
        baselineCalls += 1;
        if (baselineCalls === 1) {
          const err = new Error("connect ECONNREFUSED 127.0.0.1:8788");
          err.name = "Error";
          throw err;
        }
      }
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: `ok:${payload.version}` },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "retry-network-recovery-zero-retries",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(
      path.join(outDir, "baseline", "retry-network-recovery-zero-retries", "c1.json"),
      "utf-8"
    );
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: unknown };
    expect(baseline.runner_failure).toBeUndefined();
    expect(baselineCalls).toBe(2);
    expect(healthCalls).toBe(1);
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(4);
  });

  it("does not retry invalid JSON response", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "invalid json", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async () => new Response("not-json", { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "retry-invalid-json",
      "--timeoutMs",
      "2000",
      "--retries",
      "3",
      "--backoffBaseMs",
      "1",
      "--concurrency",
      "1",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "retry-invalid-json", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: { class?: string; attempt?: number } };
    expect(baseline.runner_failure?.class).toBe("invalid_json");
    expect(baseline.runner_failure?.attempt).toBe(1);
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
  });

  it("rejects reusing runId directories that already contain artifacts", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "reuse run id", input: { user: "hello" } }]);
    await writeJson(path.join(outDir, "baseline", "reused-run-id", "c1.json"), { stale: true });

    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          case_id: "c1",
          version: "baseline",
          final_output: { content_type: "text", content: "ok" },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    ) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "reused-run-id",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);

    await expect(mod.runRunner()).rejects.toThrow("already contain JSON artifacts");
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(0);
  });

  it("blocks run on strict preflight failure before cases start", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "preflight strict", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response("down", { status: 503, statusText: "Service Unavailable" });
      }
      if (url.endsWith("/run-case")) {
        return new Response("down", { status: 503, statusText: "Service Unavailable" });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "preflight-strict-fail",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "strict",
      "--preflightTimeoutMs",
      "250",
    ]);
    await expect(mod.runRunner()).rejects.toThrow("Runner preflight failed in strict mode");

    const runRaw = await readFile(path.join(outDir, "baseline", "preflight-strict-fail", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as { preflight_blocked?: boolean };
    expect(runMeta.preflight_blocked).toBe(true);
    await expect(readFile(path.join(outDir, "baseline", "preflight-strict-fail", "c1.json"), "utf-8")).rejects.toThrow();
  });

  it("retries transient preflight transport failures in strict mode", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "preflight retry transient", input: { user: "hello" } }]);

    let healthAttempts = 0;
    let canaryAttempts = 0;
    globalThis.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/health")) {
        healthAttempts += 1;
        if (healthAttempts === 1) {
          const err = new Error("connect ECONNRESET 127.0.0.1:8788") as Error & { code?: string };
          err.code = "ECONNRESET";
          throw err;
        }
        return new Response(
          JSON.stringify({
            ok: true,
            runtime: {
              timeout_ms: 180_000,
              server_request_timeout_ms: 400_000,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.endsWith("/run-case")) {
        const payload = JSON.parse(String(init?.body ?? "{}")) as { case_id: string; version: "baseline" | "new" };
        const isPreflight = new Headers(init?.headers).get("x-aq-preflight") === "1" || payload.case_id === "__preflight__";
        if (isPreflight) {
          canaryAttempts += 1;
          if (canaryAttempts === 1) {
            const err = new Error("connect ECONNRESET 127.0.0.1:8788") as Error & { code?: string };
            err.code = "ECONNRESET";
            throw err;
          }
          return new Response(
            JSON.stringify({
              case_id: payload.case_id,
              version: payload.version,
              final_output: { content_type: "text", content: "[adapter:preflight] ok" },
              events: [],
              proposed_actions: [],
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            case_id: payload.case_id,
            version: payload.version,
            final_output: { content_type: "text", content: "ok" },
            events: [],
            proposed_actions: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "preflight-strict-retry-transient",
      "--timeoutMs",
      "200000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "strict",
      "--preflightTimeoutMs",
      "30000",
      "--backoffBaseMs",
      "1",
    ]);
    await mod.runRunner();

    const runRaw = await readFile(path.join(outDir, "baseline", "preflight-strict-retry-transient", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as { preflight?: { status?: string } };
    expect(runMeta.preflight?.status).toBe("passed");
    expect(healthAttempts).toBe(2);
    expect(canaryAttempts).toBe(2);
  });

  it("auto-adjusts strict preflight canary timeout when preflight timeout is below active timeout window", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "preflight strict auto-adjust", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response(
          JSON.stringify({
            ok: true,
            runtime: {
              timeout_ms: 180_000,
              server_request_timeout_ms: 400_000,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.endsWith("/run-case")) {
        const payload = JSON.parse(String(init?.body ?? "{}")) as { case_id: string; version: "baseline" | "new" };
        return new Response(
          JSON.stringify({
            case_id: payload.case_id,
            version: payload.version,
            final_output: { content_type: "text", content: "ok" },
            events: [],
            proposed_actions: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "preflight-strict-auto-adjust",
      "--timeoutMs",
      "200000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "strict",
      "--preflightTimeoutMs",
      "30000",
    ]);
    await mod.runRunner();

    const runRaw = await readFile(path.join(outDir, "baseline", "preflight-strict-auto-adjust", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as {
      preflight?: { status?: string; warnings?: string[] };
      preflight_blocked?: boolean;
    };
    expect(runMeta.preflight_blocked).toBeUndefined();
    expect(runMeta.preflight?.status).toBe("passed");
    expect(
      runMeta.preflight?.warnings?.some((w) => w.includes("strict mode auto-adjusted canary timeout"))
    ).toBe(true);
  });

  it("blocks strict preflight when timeout contract mismatches adapter server timeout", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "timeout contract strict", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response(
          JSON.stringify({
            ok: true,
            runtime: {
              timeout_ms: 1_800_000,
              server_request_timeout_ms: 300_000,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.endsWith("/run-case")) {
        const payload = JSON.parse(String(init?.body ?? "{}")) as { case_id: string; version: "baseline" | "new" };
        return new Response(
          JSON.stringify({
            case_id: payload.case_id,
            version: payload.version,
            final_output: { content_type: "text", content: "ok" },
            events: [],
            proposed_actions: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "preflight-timeout-contract-fail",
      "--timeoutMs",
      "600000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "strict",
      "--preflightTimeoutMs",
      "10000",
    ]);
    await expect(mod.runRunner()).rejects.toThrow("Runner preflight failed in strict mode");

    const runRaw = await readFile(path.join(outDir, "baseline", "preflight-timeout-contract-fail", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as {
      preflight_blocked?: boolean;
      preflight?: { warnings?: string[] };
    };
    expect(runMeta.preflight_blocked).toBe(true);
    expect(runMeta.preflight?.warnings?.some((w) => w.includes("server timeout mismatch"))).toBe(true);
    await expect(readFile(path.join(outDir, "baseline", "preflight-timeout-contract-fail", "c1.json"), "utf-8")).rejects.toThrow();
  });

  it("uses node http fallback when fetch fails with headers-timeout pattern", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "node http fallback", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async () => {
      const err = new TypeError("fetch failed") as TypeError & { cause?: unknown };
      err.cause = { code: "UND_ERR_HEADERS_TIMEOUT", message: "Headers Timeout Error" };
      throw err;
    }) as typeof fetch;

    const requestMock = vi.fn((...args: unknown[]) => {
      const cb = typeof args[1] === "function" ? (args[1] as (res: unknown) => void) : undefined;
      const chunks: Buffer[] = [];
      const req = new EventEmitter() as EventEmitter & {
        write: (chunk: string | Buffer) => boolean;
        end: () => void;
        destroy: (err?: Error) => void;
      };
      req.write = (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      req.end = () => {
        if (!cb) return;
        const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { case_id: string; version: "baseline" | "new" };
        const body = JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: `ok:${payload.version}` },
          events: [],
          proposed_actions: [],
        });
        const res = new Readable({
          read() {
            this.push(Buffer.from(body, "utf8"));
            this.push(null);
          },
        }) as Readable & { statusCode?: number; statusMessage?: string; headers?: Record<string, string> };
        res.statusCode = 200;
        res.statusMessage = "OK";
        res.headers = {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(body)),
        };
        cb(res);
      };
      req.destroy = (err?: Error) => {
        if (err) req.emit("error", err);
      };
      return req;
    });

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<Record<string, unknown>>("node:http");
      return {
        ...actual,
        request: requestMock,
      };
    });

    try {
      const mod = await loadRunnerWithArgv([
        "node",
        "runner",
        "--repoRoot",
        root,
        "--baseUrl",
        "http://127.0.0.1:8788",
        "--cases",
        casesPath,
        "--outDir",
        outDir,
        "--runId",
        "fetch-fallback-node-http",
        "--timeoutMs",
        "2000",
        "--retries",
        "0",
        "--concurrency",
        "1",
        "--preflightMode",
        "off",
      ]);
      await mod.runRunner();
    } finally {
      vi.doUnmock("node:http");
      vi.resetModules();
    }

    const baselineRaw = await readFile(path.join(outDir, "baseline", "fetch-fallback-node-http", "c1.json"), "utf-8");
    const newRaw = await readFile(path.join(outDir, "new", "fetch-fallback-node-http", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as { runner_failure?: unknown; final_output: { content?: string } };
    const newer = JSON.parse(newRaw) as { runner_failure?: unknown; final_output: { content?: string } };
    expect(baseline.runner_failure).toBeUndefined();
    expect(newer.runner_failure).toBeUndefined();
    expect(String(baseline.final_output.content)).toContain("ok:baseline");
    expect(String(newer.final_output.content)).toContain("ok:new");
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("captures HTTP failure snippet without full-body artifacts when --noSaveFullBodyOnError is set", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "http-failure-snippet", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async () => new Response("upstream exploded", { status: 500 })) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "no-full-body-on-error",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
      "--noSaveFullBodyOnError",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "no-full-body-on-error", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as {
      runner_failure?: { class?: string; body_snippet?: string; full_body_saved_to?: string };
    };

    expect(baseline.runner_failure?.class).toBe("http_error");
    expect(baseline.runner_failure?.body_snippet).toContain("upstream exploded");
    expect(baseline.runner_failure?.full_body_saved_to).toBeUndefined();
  });

  it("marks invalid_json when adapter returns HTTP 200 with null body", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "null-body", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "null-body-success",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "null-body-success", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as {
      runner_failure?: { class?: string; error_message?: string };
    };
    expect(baseline.runner_failure?.class).toBe("invalid_json");
    expect(baseline.runner_failure?.error_message).toContain("response.body is null");
  });

  it("marks invalid_json when successful body exceeds maxBodyBytes", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "truncated-success", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          case_id: "c1",
          version: "baseline",
          final_output: { content_type: "text", content: "x".repeat(400) },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "truncated-success",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--maxBodyBytes",
      "40",
      "--preflightMode",
      "off",
    ]);
    await mod.runRunner();

    const baselineRaw = await readFile(path.join(outDir, "baseline", "truncated-success", "c1.json"), "utf-8");
    const baseline = JSON.parse(baselineRaw) as {
      runner_failure?: { class?: string; body_truncated?: boolean; body_bytes_written?: number };
    };
    expect(baseline.runner_failure?.class).toBe("invalid_json");
    expect(baseline.runner_failure?.body_truncated).toBe(true);
    expect((baseline.runner_failure?.body_bytes_written ?? 0) > 0).toBe(true);
  });

  it("stops early when fail-fast transport streak threshold is reached", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [
      { id: "c1", title: "ff-1", input: { user: "hello" } },
      { id: "c2", title: "ff-2", input: { user: "hello" } },
      { id: "c3", title: "ff-3", input: { user: "hello" } },
    ]);

    globalThis.fetch = vi.fn(async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "fail-fast-streak",
      "--timeoutMs",
      "60",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--failFastTransportStreak",
      "1",
    ]);
    await mod.runRunner();

    const runRaw = await readFile(path.join(outDir, "baseline", "fail-fast-streak", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as {
      completed_cases?: number;
      fail_fast?: { triggered?: boolean; at_case_id?: string };
    };
    expect(runMeta.completed_cases).toBe(1);
    expect(runMeta.fail_fast?.triggered).toBe(true);
    expect(runMeta.fail_fast?.at_case_id).toBe("c1");

    await expect(readFile(path.join(outDir, "baseline", "fail-fast-streak", "c1.json"), "utf-8")).resolves.toBeTruthy();
    await expect(readFile(path.join(outDir, "baseline", "fail-fast-streak", "c2.json"), "utf-8")).rejects.toThrow();
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
  });

  it("cleans up old run directories when retentionDays is enabled", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "retention", input: { user: "hello" } }]);

    const staleDirs = [
      path.join(outDir, "baseline", "stale-old"),
      path.join(outDir, "new", "stale-old"),
      path.join(outDir, "_raw", "stale-old"),
    ];
    for (const dir of staleDirs) {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "marker.txt"), "old", "utf-8");
      const old = new Date("2020-01-01T00:00:00.000Z");
      await utimes(dir, old, old);
    }

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "retention-dry",
      "--dryRun",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
      "--retentionDays",
      "1",
    ]);
    await mod.runRunner();

    await expect(readFile(path.join(outDir, "baseline", "stale-old", "marker.txt"), "utf-8")).rejects.toThrow();
    await expect(readFile(path.join(outDir, "new", "stale-old", "marker.txt"), "utf-8")).rejects.toThrow();
    await expect(readFile(path.join(outDir, "_raw", "stale-old", "marker.txt"), "utf-8")).rejects.toThrow();
    await expect(readFile(path.join(outDir, "baseline", "retention-dry", "run.json"), "utf-8")).resolves.toBeTruthy();
  });

  it("marks run as interrupted and rethrows InterruptedRunError on SIGINT", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "interrupt", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      return await new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const rejectAbort = () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        };
        if (signal?.aborted) {
          rejectAbort();
          return;
        }
        signal?.addEventListener("abort", rejectAbort, { once: true });
      });
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "interrupt-run",
      "--timeoutMs",
      "200000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);

    const runPromise = mod.runRunner();
    await new Promise((resolve) => setTimeout(resolve, 30));
    process.emit("SIGINT");

    // Depending on exact abort timing, runner may either rethrow InterruptedRunError
    // or finish gracefully with interrupted=true in run metadata.
    const outcome = await runPromise.then(
      () => ({ rejected: false as const, error: null }),
      (error: unknown) => ({ rejected: true as const, error })
    );
    if (outcome.rejected) {
      expect(outcome.error).toMatchObject({ name: "InterruptedRunError" });
    }

    const runRaw = await readFile(path.join(outDir, "baseline", "interrupt-run", "run.json"), "utf-8");
    const runMeta = JSON.parse(runRaw) as {
      interrupted?: boolean;
      interrupt_signal?: string;
      completed_cases?: number;
    };
    expect(runMeta.interrupted).toBe(true);
    expect(runMeta.interrupt_signal).toBe("SIGINT");
    expect(runMeta.completed_cases).toBe(0);
  });

  it("writes flakiness summary when --runs > 1 and flags low new pass rate", async () => {
    const casesPath = path.join(root, "cases.json");
    const outDir = path.join(root, "runs");
    await writeJson(casesPath, [{ id: "c1", title: "flaky", input: { user: "hello" } }]);

    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        case_id: string;
        version: "baseline" | "new";
      };
      if (payload.version === "new") {
        return new Response(
          JSON.stringify({
            case_id: payload.case_id,
            version: payload.version,
            final_output: { content_type: "text", content: "degraded" },
            events: [],
            proposed_actions: [],
            runner_failure: {
              class: "transport_failure",
              error_name: "SimulatedFailure",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          case_id: payload.case_id,
          version: payload.version,
          final_output: { content_type: "text", content: "ok" },
          events: [],
          proposed_actions: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const mod = await loadRunnerWithArgv([
      "node",
      "runner",
      "--repoRoot",
      root,
      "--baseUrl",
      "http://127.0.0.1:8788",
      "--cases",
      casesPath,
      "--outDir",
      outDir,
      "--runId",
      "flakiness-run",
      "--runs",
      "2",
      "--timeoutMs",
      "2000",
      "--retries",
      "0",
      "--concurrency",
      "1",
      "--preflightMode",
      "off",
    ]);
    await mod.runRunner();

    const flakinessRaw = await readFile(path.join(outDir, "baseline", "flakiness-run", "flakiness.json"), "utf-8");
    const flakiness = JSON.parse(flakinessRaw) as {
      run_id: string;
      runs_per_case: number;
      cases: Array<{ case_id: string; baseline_pass_rate: number; new_pass_rate: number }>;
    };
    expect(flakiness.run_id).toBe("flakiness-run");
    expect(flakiness.runs_per_case).toBe(2);
    expect(flakiness.cases).toHaveLength(1);
    expect(flakiness.cases[0]?.case_id).toBe("c1");
    expect(flakiness.cases[0]?.baseline_pass_rate).toBe(1);
    expect(flakiness.cases[0]?.new_pass_rate).toBe(0);
  });
});
