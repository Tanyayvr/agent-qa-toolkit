import { describe, it, expect } from "vitest";
import {
  normalizeBaseUrl,
  parseOnlyCaseIdsRaw,
  estimateWorstCaseRuntimeMs,
  formatDuration,
  percentile,
  summarizeHistoryCandidate,
  parseTraceparent,
  extractTraceAnchorFromHeaders,
  attachTraceAnchorIfMissing,
  inferNetErrorKind,
  shouldPreferNodeHttpTransport,
  shouldUseNodeHttpFallback,
  captureGitContext,
  aggregateTokenUsage,
  enrichResponseWithLoopAnalysis,
} from "./runner";

describe("runner helpers", () => {
  it("normalizeBaseUrl trims trailing slash", () => {
    expect(normalizeBaseUrl("http://localhost:8787/")).toBe("http://localhost:8787");
    expect(normalizeBaseUrl("http://localhost:8787")).toBe("http://localhost:8787");
  });

  it("parseOnlyCaseIdsRaw splits and trims", () => {
    expect(parseOnlyCaseIdsRaw("a,b, c")).toEqual(["a", "b", "c"]);
    expect(parseOnlyCaseIdsRaw("   ")).toBeNull();
    expect(parseOnlyCaseIdsRaw(null)).toBeNull();
  });

  it("formatDuration keeps operator-friendly units", () => {
    expect(formatDuration(999)).toBe("1s");
    expect(formatDuration(61_000)).toBe("2m");
    expect(formatDuration(3_661_000)).toBe("1h 2m");
  });

  it("estimateWorstCaseRuntimeMs accounts for retries and both versions", () => {
    const cfg = {
      repoRoot: ".",
      baseUrl: "http://localhost:8787",
      casesPath: "cases/cases.json",
      outDir: "apps/runner/runs",
      runId: "r1",
      incidentId: "inc-1",
      onlyCaseIds: null,
      dryRun: false,
      redactionPreset: "none",
      keepRaw: false,
      timeoutMs: 1000,
      timeoutProfile: "off",
      timeoutAutoCapMs: 3_600_000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 3,
      timeoutAutoMaxIncreaseFactor: 3,
      retries: 2,
      backoffBaseMs: 100,
      concurrency: 2,
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
    } as const;
    const ms = estimateWorstCaseRuntimeMs(cfg, 3);
    expect(ms).toBeGreaterThan(9_000);
  });

  it("percentile returns p95 from sorted window", () => {
    expect(percentile([], 0.95)).toBeUndefined();
    expect(percentile([10, 20, 30, 40, 50], 0.95)).toBe(50);
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
  });

  it("summarizeHistoryCandidate prefers successful latency history", () => {
    const fromSuccess = summarizeHistoryCandidate([100_000, 110_000, 120_000], [300_000]);
    // p95=120000 => ceil(120000*1.4 + 30000) = 198000
    expect(fromSuccess).toBe(198_000);
  });

  it("summarizeHistoryCandidate does not learn from failure-only history", () => {
    const fromFailure = summarizeHistoryCandidate([], [300_000, 330_000], { minSuccessSamples: 1 });
    expect(fromFailure).toBeUndefined();
  });

  it("parseTraceparent extracts trace_id and span_id", () => {
    const parsed = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    expect(parsed).toEqual({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      span_id: "00f067aa0ba902b7",
    });
  });

  it("extractTraceAnchorFromHeaders supports traceparent and baggage", () => {
    const h = new Headers({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      baggage: "env=dev,team=qa",
    });
    expect(extractTraceAnchorFromHeaders(h)).toMatchObject({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      span_id: "00f067aa0ba902b7",
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      baggage: "env=dev,team=qa",
      source: "response_headers",
    });
  });

  it("attachTraceAnchorIfMissing preserves body anchor and enriches missing fields from headers", () => {
    const resp: Record<string, unknown> = {
      case_id: "c1",
      version: "baseline",
      trace_anchor: {
        trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    };
    const h = new Headers({
      traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
      baggage: "service=agent",
    });
    attachTraceAnchorIfMissing(resp, h);
    expect(resp.trace_anchor).toMatchObject({
      trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      span_id: "bbbbbbbbbbbbbbbb",
      baggage: "service=agent",
      source: "response_headers",
    });
  });

  it("shouldUseNodeHttpFallback detects fetch headers-timeout failures", () => {
    const e = new TypeError("fetch failed");
    (e as TypeError & { cause?: unknown }).cause = {
      code: "UND_ERR_HEADERS_TIMEOUT",
      message: "Headers Timeout Error",
    };
    expect(shouldUseNodeHttpFallback(e, "http://127.0.0.1:8788/run-case")).toBe(true);
  });

  it("shouldUseNodeHttpFallback ignores abort and non-http urls", () => {
    const aborted = new Error("aborted");
    aborted.name = "AbortError";
    expect(shouldUseNodeHttpFallback(aborted, "http://127.0.0.1:8788/run-case")).toBe(false);

    const err = new TypeError("fetch failed");
    expect(shouldUseNodeHttpFallback(err, "file:///tmp/local.json")).toBe(false);
  });

  it("shouldPreferNodeHttpTransport enables node transport for long http timeouts", () => {
    expect(shouldPreferNodeHttpTransport("http://127.0.0.1:8788/run-case", 300_000)).toBe(true);
    expect(shouldPreferNodeHttpTransport("https://api.example.com/run-case", 500_000)).toBe(true);
  });

  it("shouldPreferNodeHttpTransport keeps short or non-http requests on fetch", () => {
    expect(shouldPreferNodeHttpTransport("http://127.0.0.1:8788/run-case", 299_999)).toBe(false);
    expect(shouldPreferNodeHttpTransport("file:///tmp/test.json", 500_000)).toBe(false);
  });

  it("inferNetErrorKind detects undici headers timeout from error cause", () => {
    const e = new TypeError("fetch failed") as TypeError & { cause?: unknown };
    e.cause = { code: "UND_ERR_HEADERS_TIMEOUT", message: "Headers Timeout Error" };
    expect(inferNetErrorKind(e)).toBe("headers_timeout");
  });

  it("captureGitContext returns empty object for non-repo paths", async () => {
    await expect(captureGitContext("/tmp/aq-missing-repo-xyz")).resolves.toEqual({});
  });

  it("aggregateTokenUsage merges numeric token metrics and loop flags", () => {
    const merged = aggregateTokenUsage([
      undefined,
      { input_tokens: 10, output_tokens: 20, total_tokens: 30, tool_call_count: 2 },
      { input_tokens: 5, total_tokens: 6, loop_detected: true },
    ]);
    expect(merged).toEqual({
      input_tokens: 15,
      output_tokens: 20,
      total_tokens: 36,
      tool_call_count: 2,
      loop_detected: true,
    });
  });

  it("aggregateTokenUsage returns undefined when no usable items are present", () => {
    expect(aggregateTokenUsage([undefined, undefined])).toBeUndefined();
  });

  it("enrichResponseWithLoopAnalysis sets loop flags for repetitive tool traces", () => {
    const response: Record<string, unknown> = {
      events: [
        { type: "tool_call", tool: "search", args: { q: "x" } },
        { type: "tool_call", tool: "search", args: { q: "x" } },
        { type: "tool_call", tool: "search", args: { q: "x" } },
      ],
      token_usage: {},
    };
    enrichResponseWithLoopAnalysis(response);
    expect((response.token_usage as { loop_detected?: boolean }).loop_detected).toBe(true);
  });
});
