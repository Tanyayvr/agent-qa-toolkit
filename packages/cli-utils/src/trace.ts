import type { TraceAnchor } from "shared-types";

const TRACE_ID_HEX_32 = /^[0-9a-f]{32}$/i;
const SPAN_ID_HEX_16 = /^[0-9a-f]{16}$/i;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeHexId(raw: unknown, length: 16 | 32): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim().toLowerCase();
  if (length === 32 && TRACE_ID_HEX_32.test(s)) return s;
  if (length === 16 && SPAN_ID_HEX_16.test(s)) return s;
  return undefined;
}

export function parseTraceparent(raw: unknown): { trace_id?: string; span_id?: string } {
  if (typeof raw !== "string") return {};
  const m = raw.trim().match(/^[\da-f]{2}-([\da-f]{32})-([\da-f]{16})-[\da-f]{2}$/i);
  if (!m) return {};
  const trace_id = normalizeHexId(m[1], 32);
  const span_id = normalizeHexId(m[2], 16);
  return {
    ...(trace_id ? { trace_id } : {}),
    ...(span_id ? { span_id } : {}),
  };
}

function parseB3(raw: unknown): { trace_id?: string; span_id?: string } {
  if (typeof raw !== "string") return {};
  const parts = raw.trim().split("-");
  if (parts.length < 2) return {};
  const trace_id = normalizeHexId(parts[0], 32);
  const span_id = normalizeHexId(parts[1], 16);
  return {
    ...(trace_id ? { trace_id } : {}),
    ...(span_id ? { span_id } : {}),
  };
}

export function normalizeTraceAnchorShape(v: unknown): TraceAnchor | undefined {
  if (!isRecord(v)) return undefined;
  const traceparent = typeof v.traceparent === "string" && v.traceparent.trim().length > 0 ? v.traceparent.trim() : undefined;
  const parsed = parseTraceparent(traceparent);
  const trace_id = normalizeHexId(v.trace_id, 32) ?? parsed.trace_id;
  const span_id = normalizeHexId(v.span_id, 16) ?? parsed.span_id;
  const parent_span_id = normalizeHexId(v.parent_span_id, 16);
  const baggage = typeof v.baggage === "string" && v.baggage.trim().length > 0 ? v.baggage.trim() : undefined;
  const source =
    v.source === "response_body" || v.source === "response_headers" || v.source === "derived"
      ? v.source
      : undefined;

  if (!trace_id && !span_id && !parent_span_id && !traceparent && !baggage) return undefined;
  return {
    ...(trace_id ? { trace_id } : {}),
    ...(span_id ? { span_id } : {}),
    ...(parent_span_id ? { parent_span_id } : {}),
    ...(traceparent ? { traceparent } : {}),
    ...(baggage ? { baggage } : {}),
    ...(source ? { source } : {}),
  };
}

export function extractTraceAnchorFromHeaders(headers: Headers): TraceAnchor | undefined {
  const traceparent = headers.get("traceparent");
  const parsedTraceparent = parseTraceparent(traceparent);
  const b3 = parseB3(headers.get("b3"));

  const trace_id =
    parsedTraceparent.trace_id ??
    normalizeHexId(headers.get("x-trace-id"), 32) ??
    normalizeHexId(headers.get("x-b3-traceid"), 32) ??
    b3.trace_id;

  const span_id =
    parsedTraceparent.span_id ??
    normalizeHexId(headers.get("x-span-id"), 16) ??
    normalizeHexId(headers.get("x-b3-spanid"), 16) ??
    b3.span_id;

  const baggage = headers.get("baggage");
  const hasBaggage = typeof baggage === "string" && baggage.trim().length > 0;

  if (!trace_id && !span_id && !traceparent && !hasBaggage) return undefined;

  return {
    ...(trace_id ? { trace_id } : {}),
    ...(span_id ? { span_id } : {}),
    ...(traceparent ? { traceparent } : {}),
    ...(hasBaggage ? { baggage: baggage!.trim() } : {}),
    source: "response_headers",
  };
}

export function extractTraceAnchorFromEvents(events: unknown): TraceAnchor | undefined {
  if (!Array.isArray(events)) return undefined;
  for (const e of events) {
    if (!isRecord(e)) continue;
    const trace_id = normalizeHexId(e.trace_id, 32);
    const span_id = normalizeHexId(e.span_id, 16);
    const traceparent = typeof e.traceparent === "string" && e.traceparent.trim().length > 0 ? e.traceparent.trim() : undefined;
    if (!trace_id && !span_id && !traceparent) continue;
    return {
      ...(trace_id ? { trace_id } : {}),
      ...(span_id ? { span_id } : {}),
      ...(traceparent ? { traceparent } : {}),
      source: "derived",
    };
  }
  return undefined;
}

export function attachTraceAnchorIfMissing(resp: unknown, headers: Headers): void {
  if (!isRecord(resp)) return;

  const existing = normalizeTraceAnchorShape(resp.trace_anchor);
  const fromHeaders = extractTraceAnchorFromHeaders(headers);

  if (existing && !fromHeaders) {
    if (!existing.source) existing.source = "response_body";
    resp.trace_anchor = existing;
    return;
  }
  if (!existing && fromHeaders) {
    resp.trace_anchor = fromHeaders;
    return;
  }
  if (!existing || !fromHeaders) return;

  const merged: TraceAnchor = {
    ...existing,
    ...fromHeaders,
    source: fromHeaders.source ?? existing.source ?? "response_body",
  };
  resp.trace_anchor = merged;
}
