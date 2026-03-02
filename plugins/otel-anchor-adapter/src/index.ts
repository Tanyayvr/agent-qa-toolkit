import type { SimpleAgent } from "agent-sdk";
import type { TraceAnchor } from "shared-types";

type HexLength = 16 | 32;

export type OTelAnchorAdapterOptions = {
  preferContext?: boolean;
  workflowId?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeHex(value: unknown, length: HexLength): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toLowerCase();
  const re = length === 32 ? /^[\da-f]{32}$/ : /^[\da-f]{16}$/;
  return re.test(raw) ? raw : undefined;
}

function parseTraceparent(raw: unknown): { trace_id?: string; span_id?: string } {
  if (typeof raw !== "string") return {};
  const m = raw.trim().match(/^[\da-f]{2}-([\da-f]{32})-([\da-f]{16})-[\da-f]{2}$/i);
  if (!m) return {};
  const trace_id = normalizeHex(m[1], 32);
  const span_id = normalizeHex(m[2], 16);
  return {
    ...(trace_id ? { trace_id } : {}),
    ...(span_id ? { span_id } : {}),
  };
}

function getHeader(record: Record<string, unknown>, key: string): string | undefined {
  const exact = record[key];
  if (typeof exact === "string") return exact;
  const lowered = record[key.toLowerCase()];
  if (typeof lowered === "string") return lowered;
  const upper = record[key.toUpperCase()];
  if (typeof upper === "string") return upper;
  return undefined;
}

export function extractTraceAnchorFromContext(context: unknown): TraceAnchor | undefined {
  if (!isRecord(context)) return undefined;

  if (isRecord(context.trace_anchor)) {
    const inner = context.trace_anchor;
    const trace_id = normalizeHex(inner.trace_id, 32);
    const span_id = normalizeHex(inner.span_id, 16);
    const traceparent = typeof inner.traceparent === "string" ? inner.traceparent : undefined;
    const baggage = typeof inner.baggage === "string" ? inner.baggage : undefined;
    if (!trace_id && !span_id && !traceparent && !baggage) return undefined;
    return {
      ...(trace_id ? { trace_id } : {}),
      ...(span_id ? { span_id } : {}),
      ...(traceparent ? { traceparent } : {}),
      ...(baggage ? { baggage } : {}),
      source: "response_body",
    };
  }

  const headers = isRecord(context.headers) ? context.headers : undefined;
  const traceparent =
    (typeof context.traceparent === "string" ? context.traceparent : undefined) ??
    (headers ? getHeader(headers, "traceparent") : undefined);
  const parsed = parseTraceparent(traceparent);

  const trace_id =
    parsed.trace_id ??
    normalizeHex(context.trace_id, 32) ??
    (headers ? normalizeHex(getHeader(headers, "x-trace-id"), 32) : undefined);
  const span_id =
    parsed.span_id ??
    normalizeHex(context.span_id, 16) ??
    (headers ? normalizeHex(getHeader(headers, "x-span-id"), 16) : undefined);
  const baggage =
    (typeof context.baggage === "string" ? context.baggage : undefined) ??
    (headers ? getHeader(headers, "baggage") : undefined);

  if (!trace_id && !span_id && !traceparent && !baggage) return undefined;
  return {
    ...(trace_id ? { trace_id } : {}),
    ...(span_id ? { span_id } : {}),
    ...(traceparent ? { traceparent } : {}),
    ...(typeof baggage === "string" && baggage.trim().length > 0 ? { baggage: baggage.trim() } : {}),
    source: "derived",
  };
}

function mergeAnchors(existing: TraceAnchor | undefined, derived: TraceAnchor | undefined, preferContext: boolean): TraceAnchor | undefined {
  if (!existing) return derived;
  if (!derived) return existing;
  if (preferContext) {
    return {
      ...existing,
      ...derived,
      source: derived.source ?? existing.source ?? "derived",
    };
  }
  return {
    ...derived,
    ...existing,
    source: existing.source ?? derived.source ?? "derived",
  };
}

export function withOtelTraceAnchor(agent: SimpleAgent, options: OTelAnchorAdapterOptions = {}): SimpleAgent {
  const preferContext = options.preferContext ?? true;
  const workflowId = options.workflowId;

  return async (input) => {
    const out = await agent(input);
    const derived = extractTraceAnchorFromContext(input.context);
    const merged = mergeAnchors(out.trace_anchor, derived, preferContext);
    return {
      ...out,
      ...(workflowId ? { workflow_id: workflowId } : {}),
      ...(merged ? { trace_anchor: merged } : {}),
    };
  };
}

export const __test__ = {
  normalizeHex,
  parseTraceparent,
  extractTraceAnchorFromContext,
  mergeAnchors,
};
