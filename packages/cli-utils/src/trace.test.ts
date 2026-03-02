import { describe, expect, it } from "vitest";
import {
  attachTraceAnchorIfMissing,
  extractTraceAnchorFromEvents,
  extractTraceAnchorFromHeaders,
  normalizeTraceAnchorShape,
  parseTraceparent
} from "./trace";

describe("trace utilities", () => {
  it("parses W3C traceparent format", () => {
    const parsed = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    expect(parsed).toEqual({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      span_id: "00f067aa0ba902b7",
    });
  });

  it("extracts trace anchor from response headers", () => {
    const h = new Headers({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      baggage: "k=v",
    });
    expect(extractTraceAnchorFromHeaders(h)).toMatchObject({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      span_id: "00f067aa0ba902b7",
      source: "response_headers",
      baggage: "k=v",
    });
  });

  it("normalizes body trace anchor and fills from traceparent", () => {
    const out = normalizeTraceAnchorShape({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    });
    expect(out).toMatchObject({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      span_id: "00f067aa0ba902b7",
    });
  });

  it("derives trace anchor from events fallback", () => {
    const out = extractTraceAnchorFromEvents([
      { type: "step", trace_id: "4bf92f3577b34da6a3ce929d0e0e4736" }
    ]);
    expect(out).toEqual({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      source: "derived"
    });
  });

  it("merges headers over body and preserves source precedence", () => {
    const resp: Record<string, unknown> = {
      trace_anchor: {
        trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        span_id: "bbbbbbbbbbbbbbbb",
        source: "response_body",
      },
    };
    const h = new Headers({
      traceparent: "00-cccccccccccccccccccccccccccccccc-dddddddddddddddd-01",
    });
    attachTraceAnchorIfMissing(resp, h);
    expect(resp.trace_anchor).toMatchObject({
      trace_id: "cccccccccccccccccccccccccccccccc",
      span_id: "dddddddddddddddd",
      source: "response_headers",
    });
  });
});
