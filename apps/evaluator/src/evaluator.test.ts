import { describe, it, expect } from "vitest";
import type { AgentResponse } from "shared-types";
import { deriveCaseStatus, parseRateThreshold, isWeakExpected, extractTraceAnchor } from "./evaluator";

describe("evaluator helpers", () => {
  it("deriveCaseStatus", () => {
    expect(deriveCaseStatus(false, false)).toEqual({ status: "filtered_out", reason: "excluded_by_filter" });
    expect(deriveCaseStatus(true, false)).toEqual({ status: "missing", reason: "missing_case_response" });
    expect(deriveCaseStatus(true, true)).toEqual({ status: "executed" });
  });

  it("parseRateThreshold clamps to [0,1] and falls back on invalid values", () => {
    expect(parseRateThreshold(undefined, 0.9)).toBe(0.9);
    expect(parseRateThreshold("1.5", 0.9)).toBe(1);
    expect(parseRateThreshold("-2", 0.9)).toBe(0);
    expect(parseRateThreshold("not-a-number", 0.9)).toBe(0.9);
  });

  it("isWeakExpected detects empty expectation contracts", () => {
    expect(isWeakExpected({})).toBe(true);
    expect(isWeakExpected({ must_include: ["hello"] })).toBe(false);
    expect(isWeakExpected({ tool_required: ["search"] })).toBe(false);
  });

  it("extractTraceAnchor prefers response trace_anchor and falls back to events", () => {
    expect(
      extractTraceAnchor({
        case_id: "c1",
        version: "baseline",
        final_output: { content_type: "text", content: "ok" },
        trace_anchor: { trace_id: "4bf92f3577b34da6a3ce929d0e0e4736", span_id: "00f067aa0ba902b7" },
        events: [],
      })
    ).toMatchObject({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      span_id: "00f067aa0ba902b7",
    });

    const fromEvent = {
      case_id: "c2",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [
        {
          type: "tool_call",
          ts: Date.now(),
          call_id: "x1",
          tool: "search",
          args: {},
          trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          span_id: "bbbbbbbbbbbbbbbb",
        },
      ],
    } as unknown;

    expect(extractTraceAnchor(fromEvent as unknown as AgentResponse)).toMatchObject({
      trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      span_id: "bbbbbbbbbbbbbbbb",
      source: "derived",
    });
  });
});
