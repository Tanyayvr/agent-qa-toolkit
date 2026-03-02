# otel-anchor-adapter

Adds `trace_anchor` enrichment (`trace_id`, `span_id`, `traceparent`, `baggage`) from runtime context.

## Usage

```ts
import { withOtelTraceAnchor } from "otel-anchor-adapter";

const wrapped = withOtelTraceAnchor(agent, { preferContext: true });
```

## Input sources

- `input.context.trace_anchor`
- `input.context.traceparent` / `baggage`
- `input.context.headers.traceparent` / `x-trace-id` / `x-span-id`
