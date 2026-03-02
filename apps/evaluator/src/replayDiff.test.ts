import { describe, it, expect } from "vitest";
import { renderCaseDiffHtml } from "./replayDiff";
import type { AgentResponse } from "shared-types";

const base: AgentResponse = {
  case_id: "c1",
  version: "baseline",
  proposed_actions: [],
  final_output: { content_type: "text", content: "ok" },
  events: [],
};

const newer: AgentResponse = {
  case_id: "c1",
  version: "new",
  proposed_actions: [],
  final_output: { content_type: "text", content: "ok" },
  events: [],
};

describe("replayDiff", () => {
  it("renders HTML", () => {
    const html = renderCaseDiffHtml("c1", base, newer);
    expect(html).toContain("Replay diff");
    expect(html).toContain("c1");
  });

  it("matches stable snapshot for complex diff payload", () => {
    const baseline: AgentResponse = {
      case_id: "c42",
      version: "baseline",
      workflow_id: "wf-baseline",
      final_output: { content_type: "json", content: { answer: "ok", score: 0.91 } },
      proposed_actions: [
        {
          action_id: "a1",
          action_type: "lookup",
          tool_name: "search_docs",
          params: { q: "policy" },
          risk_level: "low",
          risk_tags: ["read"],
          evidence_refs: [{ kind: "tool_result", call_id: "call-1" }],
        },
      ],
      events: [
        { type: "tool_call", ts: 1_700_000_000_000, call_id: "call-1", tool: "search_docs", args: { q: "policy" } },
        { type: "tool_result", ts: 1_700_000_000_100, call_id: "call-1", status: "ok", latency_ms: 100, payload_summary: { hits: 3 } },
        { type: "retrieval", ts: 1_700_000_000_200, query: "policy", doc_ids: ["d1"], snippets_hashes: ["h1"] },
      ],
      runner_failure: {
        type: "runner_fetch_failure",
        class: "http_error",
        net_error_kind: "headers_timeout",
        case_id: "c42",
        version: "baseline",
        url: "http://localhost:8787/run-case",
        attempt: 2,
        timeout_ms: 15000,
        latency_ms: 1200,
        status: 500,
        status_text: "Internal Server Error",
        error_name: "HttpError",
        error_message: "upstream failed",
        body_snippet: "full_body_saved_to=apps/runner/runs/_runner_failures/c42.baseline.attempt2.body.bin",
        full_body_saved_to: "assets/runner_failure/c42/baseline/c42.baseline.attempt2.body.bin",
        full_body_meta_saved_to: "assets/runner_failure/c42/baseline/c42.baseline.attempt2.body.meta.json",
      },
    };

    const next: AgentResponse = {
      case_id: "c42",
      version: "new",
      workflow_id: "wf-new",
      final_output: { content_type: "text", content: "final answer" },
      proposed_actions: [],
      events: [{ type: "final_output", ts: 1_700_000_000_300, content_type: "text", content: "final answer" }],
    };

    const html = renderCaseDiffHtml("c42", baseline, next);
    expect(html).toMatchSnapshot();
  });

  it("suppresses noisy filler snippets and keeps portable asset links", () => {
    const noisy = "x".repeat(160);
    const baseline: AgentResponse = {
      case_id: "noise-1",
      version: "baseline",
      final_output: {
        content_type: "text",
        content:
          "full_body_saved_to=apps/runner/runs/_runner_failures/noise-1.baseline.attempt1.body.bin",
      },
      runner_failure: {
        type: "runner_fetch_failure",
        class: "http_error",
        case_id: "noise-1",
        version: "baseline",
        url: "http://localhost:8788/run-case",
        attempt: 1,
        timeout_ms: 1000,
        latency_ms: 900,
        body_snippet: noisy,
        full_body_saved_to:
          "apps/runner/runs/_runner_failures/noise-1.baseline.attempt1.body.bin",
        full_body_meta_saved_to:
          "apps/runner/runs/_runner_failures/noise-1.baseline.attempt1.body.meta.json",
      },
    };
    const next: AgentResponse = {
      case_id: "noise-1",
      version: "new",
      final_output: { content_type: "json", content: { ok: true } },
      proposed_actions: [],
      events: [],
    };

    const html = renderCaseDiffHtml("noise-1", baseline, next);
    expect(html).toContain("[suppressed noisy filler]");
    expect(html).toContain("assets/runner_failure/noise-1/baseline");
    expect(html).toContain("full body");
    expect(html).toContain("full body meta");
  });

  it("renders event tables and truncates large payloads", () => {
    const hugeArgs = "z".repeat(2500);
    const baseline: AgentResponse = {
      case_id: "events-1",
      version: "baseline",
      final_output: { content_type: "text", content: "done" },
      trace_anchor: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "0123456789abcdef",
        source: "response_headers",
      },
      events: [
        {
          type: "tool_call",
          ts: Number.NaN,
          call_id: "c-1",
          tool: "search_docs",
          args: { q: hugeArgs },
        },
        {
          type: "tool_result",
          ts: 1,
          call_id: "c-1",
          status: "ok",
          payload_summary: { long: hugeArgs },
        },
        {
          type: "retrieval",
          ts: 2,
          query: "abc",
          doc_ids: ["d1", "d2"],
          snippets_hashes: ["h1"],
        },
      ],
    };
    const next: AgentResponse = {
      case_id: "events-1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
    };

    const html = renderCaseDiffHtml("events-1", baseline, next);
    expect(html).toContain("Tool calls");
    expect(html).toContain("Tool results");
    expect(html).toContain("Retrieval");
    expect(html).toContain("… [truncated]");
    expect(html).toContain("trace_id");
    expect(html).toContain("No events");
  });

  it("renders fallback blocks for missing workflow/events/actions/failures", () => {
    const baseline = {
      case_id: "fallback-1",
      version: "baseline",
      final_output: { content_type: "json", content: { ok: true } },
      events: [
        { type: "tool_call", ts: Number.NaN, call_id: "x1", tool: "search", args: { q: "a" } },
      ],
    } as unknown as AgentResponse;
    const next = {
      case_id: "fallback-1",
      version: "new",
      final_output: { content_type: "text", content: "done" },
    } as unknown as AgentResponse;

    const html = renderCaseDiffHtml("fallback-1", baseline, next);
    expect(html).toContain("workflow_id: (none)");
    expect(html).toContain("No proposed_actions");
    expect(html).toContain("No runner_failure");
    expect(html).toContain("No trace anchor");
    expect(html).toContain("Tool calls");
    expect(html).toContain("None");
  });

  it("keeps non-noisy snippets and truncates very long final output", () => {
    const longOutput = "a".repeat(2600);
    const baseline: AgentResponse = {
      case_id: "snippet-1",
      version: "baseline",
      workflow_id: "wf",
      final_output: { content_type: "text", content: longOutput },
      runner_failure: {
        type: "runner_fetch_failure",
        class: "http_error",
        case_id: "snippet-1",
        version: "baseline",
        url: "http://localhost:8788/run-case",
        attempt: 1,
        timeout_ms: 1000,
        latency_ms: 900,
        body_snippet:
          "error payload with mixed chars 1234567890 abcdef ghijklmnopqrstuvwxyz and useful details",
      },
      events: [],
    };
    const next: AgentResponse = {
      case_id: "snippet-1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
    };

    const html = renderCaseDiffHtml("snippet-1", baseline, next);
    expect(html).toContain("error payload with mixed chars");
    expect(html).not.toContain("[suppressed noisy filler]");
    expect(html).toContain("… [truncated]");
  });

  it("renders detailed trace anchor and failure diagnostics", () => {
    const snippet = `prefix-${"abc123".repeat(170)}`; // > 900 chars, mixed (not noisy)
    const baseline: AgentResponse = {
      case_id: "diag-1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      trace_anchor: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "0123456789abcdef",
        parent_span_id: "fedcba9876543210",
        traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
        baggage: "env=dev",
        source: "response_headers",
      },
      runner_failure: {
        type: "runner_fetch_failure",
        class: "network_error",
        net_error_kind: "headers_timeout",
        case_id: "diag-1",
        version: "baseline",
        url: "http://localhost:8788/run-case",
        attempt: 2,
        timeout_ms: 15000,
        latency_ms: 16000,
        status: 504,
        status_text: "Gateway Timeout",
        error_name: "TimeoutError",
        error_message: "upstream timed out",
        body_snippet: snippet,
      },
      events: [],
    };

    const next: AgentResponse = {
      case_id: "diag-1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [],
    };

    const html = renderCaseDiffHtml("diag-1", baseline, next);
    expect(html).toContain("parent_span_id");
    expect(html).toContain("traceparent");
    expect(html).toContain("baggage");
    expect(html).toContain("headers_timeout");
    expect(html).toContain("504");
    expect(html).toContain("TimeoutError");
    expect(html).toContain("snippet_chars=900");
  });
});
