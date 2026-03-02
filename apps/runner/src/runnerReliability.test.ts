import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RunnerConfig } from "./runnerTypes";

vi.mock("./httpTransport", () => ({
  fetchWithTimeout: vi.fn(),
  extractErrorCode: vi.fn((err: unknown) => {
    if (err && typeof err === "object" && "code" in (err as Record<string, unknown>)) {
      return String((err as Record<string, unknown>).code);
    }
    return undefined;
  }),
  formatFetchFailure: vi.fn((err: unknown) => (err instanceof Error ? err.message : String(err))),
}));

vi.mock("./historyTimeout", () => ({
  collectTimeoutHistorySamples: vi.fn(async () => ({
    successLatenciesMs: [1000, 1200],
    failureLatenciesMs: [3000],
  })),
  summarizeHistoryCandidate: vi.fn(() => 5000),
}));

import { fetchWithTimeout } from "./httpTransport";
import { collectTimeoutHistorySamples, summarizeHistoryCandidate } from "./historyTimeout";
import {
  backoffMs,
  httpIsTransient,
  inferNetErrorKind,
  isTransientFailure,
  mkFailureResponse,
  resolveTimeoutProfileAuto,
  runPreflight,
} from "./runnerReliability";

function mkCfg(overrides: Partial<RunnerConfig> = {}): RunnerConfig {
  return {
    repoRoot: ".",
    baseUrl: "http://127.0.0.1:8788",
    casesPath: "cases/cases.json",
    outDir: "apps/runner/runs",
    runId: "test-run",
    incidentId: "test-incident",
    onlyCaseIds: null,
    dryRun: false,
    redactionPreset: "none",
    keepRaw: false,
    timeoutMs: 15000,
    timeoutProfile: "off",
    timeoutAutoCapMs: 600000,
    timeoutAutoLookbackRuns: 8,
    retries: 1,
    backoffBaseMs: 100,
    concurrency: 1,
    inactivityTimeoutMs: 120000,
    heartbeatIntervalMs: 30000,
    preflightMode: "warn",
    preflightTimeoutMs: 5000,
    failFastTransportStreak: 0,
    bodySnippetBytes: 4000,
    maxBodyBytes: 2_000_000,
    saveFullBodyOnError: true,
    retentionDays: 0,
    runs: 1,
    ...overrides,
  };
}

describe("runnerReliability primitives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies transient HTTP statuses", () => {
    expect(httpIsTransient(408)).toBe(true);
    expect(httpIsTransient(429)).toBe(true);
    expect(httpIsTransient(500)).toBe(true);
    expect(httpIsTransient(503)).toBe(true);
    expect(httpIsTransient(404)).toBe(false);
  });

  it("infers network error kinds from error name/message/code", () => {
    const abortErr = new Error("operation aborted");
    abortErr.name = "AbortError";
    expect(inferNetErrorKind(abortErr)).toBe("abort");
    expect(inferNetErrorKind(new Error("UND_ERR_HEADERS_TIMEOUT"))).toBe("headers_timeout");
    expect(inferNetErrorKind({ code: "ENOTFOUND" })).toBe("dns");
    expect(inferNetErrorKind(new Error("TLS handshake failed"))).toBe("tls");
    expect(inferNetErrorKind({ code: "ECONNREFUSED" })).toBe("conn_refused");
    expect(inferNetErrorKind({ code: "ECONNRESET" })).toBe("conn_reset");
    expect(inferNetErrorKind(new Error("socket hang up"))).toBe("socket_hang_up");
    expect(inferNetErrorKind(new Error("proxy auth required"))).toBe("proxy");
    expect(inferNetErrorKind(new Error("some other error"))).toBe("unknown");
  });

  it("computes backoff with bounded exponent and jitter", () => {
    const first = backoffMs(100, 1);
    const later = backoffMs(100, 8);
    expect(first).toBeGreaterThanOrEqual(100);
    expect(first).toBeLessThan(120);
    expect(later).toBeGreaterThanOrEqual(6400);
    expect(later).toBeLessThan(7680);
  });

  it("classifies transient artifacts and builds failure response", () => {
    const art = {
      type: "runner_fetch_failure",
      class: "http_error",
      case_id: "c1",
      version: "new",
      url: "http://x",
      attempt: 1,
      timeout_ms: 1000,
      latency_ms: 50,
      status: 503,
    } as const;
    expect(isTransientFailure(art)).toBe(true);
    const resp = mkFailureResponse(art, "failed");
    expect(resp.case_id).toBe("c1");
    expect(resp.runner_failure.class).toBe("http_error");
    expect(resp.final_output.content).toBe("failed");
  });
});

describe("runPreflight / auto-timeout profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns skipped preflight when mode=off", async () => {
    const out = await runPreflight(mkCfg({ preflightMode: "off" }));
    expect(out.status).toBe("skipped");
    expect(out.warnings[0]).toContain("disabled");
  });

  it("passes preflight when health and canary succeed", async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, runtime: { timeout_ms: 10000, server_request_timeout_ms: 40000 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ case_id: "__preflight__" }),
      } as unknown as Response);

    const out = await runPreflight(mkCfg({ timeoutMs: 12000, preflightMode: "strict", preflightTimeoutMs: 8000 }));
    expect(out.status).toBe("passed");
    expect(out.health_ok).toBe(true);
    expect(out.canary_ok).toBe(true);
  });

  it("fails preflight on timeout contract mismatch and failed canary", async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, runtime: { timeout_ms: 600000, server_request_timeout_ms: 300000 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ ok: false }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ ok: false }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ ok: false }),
      } as unknown as Response);

    const out = await runPreflight(
      mkCfg({
        preflightMode: "strict",
        timeoutMs: 700000,
        preflightTimeoutMs: 10000,
      })
    );
    expect(out.status).toBe("failed");
    expect(out.warnings.join(" | ")).toContain("timeout mismatch");
    expect(out.warnings.join(" | ")).toContain("server timeout mismatch");
    expect(out.warnings.join(" | ")).toContain("preflight returned HTTP 503");
  });

  it("resolves auto timeout profile using history + adapter/runtime hints", async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        runtime: {
          timeout_ms: 20000,
          server_request_timeout_ms: 30000,
          server_headers_timeout_ms: 31000,
        },
      }),
    } as unknown as Response);
    vi.mocked(collectTimeoutHistorySamples).mockResolvedValueOnce({
      successLatenciesMs: [1000, 2000],
      failureLatenciesMs: [5000],
    });
    vi.mocked(summarizeHistoryCandidate).mockReturnValueOnce(18000);

    const cfg = mkCfg({
      timeoutProfile: "auto",
      timeoutMs: 12000,
      timeoutAutoCapMs: 1800000,
      preflightTimeoutMs: 5000,
      inactivityTimeoutMs: 120000,
    });

    const out = await resolveTimeoutProfileAuto({
      cfg,
      selectedCaseIds: ["c1", "c2"],
      inactivityExplicit: false,
      preflightExplicit: false,
    });

    expect(out.profile).toBe("auto");
    expect(out.history_sample_count).toBe(3);
    expect(out.adapter_timeout_ms).toBe(20000);
    expect(out.server_request_timeout_ms).toBe(30000);
    expect(cfg.timeoutMs).toBeLessThanOrEqual(25000); // server-safe clamp
    expect(cfg.preflightTimeoutMs).toBeLessThanOrEqual(60000);
    expect(cfg.inactivityTimeoutMs).toBeGreaterThan(cfg.timeoutMs);
  });
});
