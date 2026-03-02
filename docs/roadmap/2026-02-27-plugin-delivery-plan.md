# Plugin Delivery Plan (LangChain / OpenAI Responses / OTel Anchor)

Date: 2026-02-27
Status: in_progress (priority updated on 2026-02-28)

## Scope

1. `langchain-adapter`
2. `openai-responses-adapter`
3. `otel-anchor-adapter`

## Priority update (2026-02-28)

`otel-anchor-adapter` is promoted to `P0` due public-facing references in community channels.  
Execution dependency is tracked in `docs/roadmap/2026-02-28-claim-alignment-plan.md` (Workstream B).

## Implementation status (2026-02-28)

Delivered in-repo plugin packages:

1. `plugins/langchain-adapter` (wrapper + tests)
2. `plugins/openai-responses-adapter` (wrapper + tests)
3. `plugins/otel-anchor-adapter` (trace anchor enrichment + tests)

Current phase:
- `M1` complete (contract + package skeletons + smoke/unit tests).
- `M2` started (functional wrappers available; integration demos ongoing).
- `P1 bridge` in progress: `plugins/vendor-bridge` adds vendor-agnostic import contract and first connectors
  (`Promptfoo` / `DeepEval` / `Giskard`) with baseline/new gate diff semantics.
  CLI conversion/diff command + fixtures shipped (`npm run bridge`, `examples/vendor-bridge/*`).

## Milestones

1. `M1` Contract + skeleton adapters
- Define adapter interfaces and config schema.
- Add minimal packages under `plugins/*`.
- Add smoke tests and example wiring.

2. `M2` Functional adapters
- LangChain runnable bridge -> `/run-case`.
- OpenAI Responses bridge -> `/run-case`.
- OTel anchor injection (`trace_id`, `span_id`) into evidence metadata.

3. `M3` Reliability + docs
- Timeouts/retries/error mapping parity with runner.
- Security and redaction compatibility checks.
- Update docs with install/run examples and limitations.

4. `M4` Release readiness
- Typecheck + tests + coverage gate for adapters.
- Pilot validation on 2 real external agents per adapter.
- Versioned release notes.

5. `P1` Vendor-bridge connectors
- Canonical import contract for external eval outputs.
- Initial converters: Promptfoo / DeepEval / Giskard.
- Deterministic baseline/new bridge diff with conservative gate mapping.

## Definition of Done

1. Adapter package is installable and documented.
2. Works with runner/evaluator without custom code in core.
3. Produces deterministic artifacts for CI gating.
4. Includes at least one integration test and one real-agent smoke report.
