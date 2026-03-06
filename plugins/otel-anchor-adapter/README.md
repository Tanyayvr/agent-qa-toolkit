# otel-anchor-adapter

Adds `trace_anchor` enrichment (`trace_id`, `span_id`, `traceparent`, `baggage`) from runtime context.

## Usage

```ts
import { withOtelTraceAnchor } from "otel-anchor-adapter";

const wrapped = withOtelTraceAnchor(agent, { preferContext: true });
```

## Reliability

- Deterministically normalizes OpenTelemetry IDs (`trace_id`/`span_id`) to lowercase hex format.
- Can merge context-derived and response-provided anchors; `preferContext` controls precedence.
- Keeps response anchor when context has no valid trace fields.

## Security

- Only propagates trace metadata fields; does not execute tools or external calls.
- Works with existing redaction/scanner pipeline because anchor data stays in contract metadata.

## Input sources

- `input.context.trace_anchor`
- `input.context.traceparent` / `baggage`
- `input.context.headers.traceparent` / `x-trace-id` / `x-span-id`

## Limitations

- Requires upstream context/headers to include valid OTel-compatible trace metadata.
- Does not create new spans; only enriches existing agent responses with trace anchors.
