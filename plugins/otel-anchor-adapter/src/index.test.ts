import { describe, expect, it } from "vitest";
import { withOtelTraceAnchor, __test__ } from "./index";

describe("otel-anchor-adapter", () => {
  it("normalizes only valid lowercase hex ids", () => {
    expect(__test__.normalizeHex("ABCDEF0123456789ABCDEF0123456789", 32)).toBe(
      "abcdef0123456789abcdef0123456789"
    );
    expect(__test__.normalizeHex("not-hex", 32)).toBeUndefined();
    expect(__test__.normalizeHex("1234", 16)).toBeUndefined();
    expect(__test__.normalizeHex(1234, 16)).toBeUndefined();
  });

  it("parses traceparent and normalizes ids", () => {
    const parsed = __test__.parseTraceparent("00-0123456789abcdef0123456789abcdef-89abcdef01234567-01");
    expect(parsed.trace_id).toBe("0123456789abcdef0123456789abcdef");
    expect(parsed.span_id).toBe("89abcdef01234567");
  });

  it("returns empty parsed traceparent for invalid shapes", () => {
    expect(__test__.parseTraceparent(undefined)).toEqual({});
    expect(__test__.parseTraceparent("bad-traceparent")).toEqual({});
  });

  it("extracts anchor from context.trace_anchor", () => {
    const anchor = __test__.extractTraceAnchorFromContext({
      trace_anchor: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "89abcdef01234567",
      },
    });
    expect(anchor?.trace_id).toBe("0123456789abcdef0123456789abcdef");
    expect(anchor?.source).toBe("response_body");
  });

  it("extracts anchor from headers and marks source as derived", () => {
    const anchor = __test__.extractTraceAnchorFromContext({
      headers: {
        traceparent: "00-0123456789abcdef0123456789abcdef-89abcdef01234567-01",
      },
    });
    expect(anchor?.trace_id).toBe("0123456789abcdef0123456789abcdef");
    expect(anchor?.span_id).toBe("89abcdef01234567");
    expect(anchor?.source).toBe("derived");
  });

  it("extracts anchor from x-trace-id/x-span-id + trims baggage", () => {
    const anchor = __test__.extractTraceAnchorFromContext({
      headers: {
        "X-TRACE-ID": "0123456789abcdef0123456789abcdef",
        "x-span-id": "89abcdef01234567",
        baggage: "  env=dev  ",
      },
    });
    expect(anchor).toEqual({
      trace_id: "0123456789abcdef0123456789abcdef",
      span_id: "89abcdef01234567",
      baggage: "env=dev",
      source: "derived",
    });
  });

  it("returns undefined when no usable context values exist", () => {
    expect(__test__.extractTraceAnchorFromContext(null)).toBeUndefined();
    expect(__test__.extractTraceAnchorFromContext({ trace_anchor: { trace_id: "bad" } })).toBeUndefined();
    expect(__test__.extractTraceAnchorFromContext({ headers: { traceparent: "bad" } })).toMatchObject({
      traceparent: "bad",
      source: "derived",
    });
  });

  it("merges derived and existing anchors with preference control", () => {
    const existing = { trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", source: "response_body" as const };
    const derived = { trace_id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", span_id: "cccccccccccccccc", source: "derived" as const };

    const preferCtx = __test__.mergeAnchors(existing, derived, true);
    expect(preferCtx?.trace_id).toBe("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(preferCtx?.span_id).toBe("cccccccccccccccc");

    const preferExisting = __test__.mergeAnchors(existing, derived, false);
    expect(preferExisting?.trace_id).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(preferExisting?.span_id).toBe("cccccccccccccccc");
  });

  it("returns available side when only one anchor exists", () => {
    const derived = { trace_id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", source: "derived" as const };
    expect(__test__.mergeAnchors(undefined, derived, true)).toEqual(derived);
    const existing = { trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", source: "response_body" as const };
    expect(__test__.mergeAnchors(existing, undefined, true)).toEqual(existing);
  });

  it("wraps agent and injects trace anchor from context", async () => {
    const baseAgent = async () => ({
      final_output: { content_type: "text" as const, content: "ok" },
      workflow_id: "base",
    });

    const wrapped = withOtelTraceAnchor(baseAgent, { workflowId: "otel-wrapped" });
    const out = await wrapped({
      user: "hello",
      context: {
        traceparent: "00-0123456789abcdef0123456789abcdef-89abcdef01234567-01",
      },
    });

    expect(out.workflow_id).toBe("otel-wrapped");
    expect(out.trace_anchor?.trace_id).toBe("0123456789abcdef0123456789abcdef");
  });

  it("keeps existing trace anchor when preferContext=false", async () => {
    const baseAgent = async () => ({
      final_output: { content_type: "text" as const, content: "ok" },
      workflow_id: "base",
      trace_anchor: {
        trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        source: "response_body" as const,
      },
    });

    const wrapped = withOtelTraceAnchor(baseAgent, { preferContext: false });
    const out = await wrapped({
      user: "hello",
      context: {
        traceparent: "00-0123456789abcdef0123456789abcdef-89abcdef01234567-01",
      },
    });

    expect(out.trace_anchor?.trace_id).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(out.trace_anchor?.span_id).toBe("89abcdef01234567");
  });
});
