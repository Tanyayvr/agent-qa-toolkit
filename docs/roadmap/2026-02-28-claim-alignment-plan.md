# Claim-Alignment Delivery Plan (Marketing -> Product)

Date: 2026-02-28  
Status: active

## Why this exists

Several community-facing claims are already in circulation. To avoid trust debt, we ship missing product pieces before posting follow-up content that depends on them.
Interim posting rules are tracked in `docs/roadmap/2026-02-28-marketing-claim-gates.md`.

## Workstream A: Docker Compose one-command quick-start (r/selfhosted)

Priority: `P0`  
Owner: core runtime  
Target: next implementation cycle

Deliverables:
1. `docker-compose.yml` with a runnable local stack (`runner` + `evaluator` + sample adapter profile).
2. Single-command bootstrap documented in README:
- `docker compose up --build`
3. Quick smoke verification section:
- expected ports
- expected health checks
- expected artifact output paths
4. CI smoke for compose bring-up (non-flaky, bounded runtime).

Done when:
1. Fresh machine run produces one complete local evidence pack with one command.
2. Selfhosted demo can be reproduced without manual env juggling.

## Workstream B: OTel trace anchors in shipped artifacts (r/OpenTelemetry #5-6)

Priority: `P0` (claim-sensitive)  
Owner: evaluator + adapters  
Target: next implementation cycle
Implementation status (2026-02-28):
- `plugins/otel-anchor-adapter` added with runtime trace-anchor extraction/merge helpers and unit tests.
- Runner/evaluator already preserve/surface `trace_anchor`.
- Pending for full closure: one real-agent evidence pack with non-empty `trace_id`/`span_id` visible in final artifacts.

Deliverables:
1. Adapter contract supports optional trace anchors (`trace_id`, `span_id`) per run/case.
2. Runner persists anchors in case artifacts.
3. Evaluator surfaces anchors in:
- `compare-report.json`
- HTML case pages
- manifest-linked evidence metadata
4. Tests:
- unit coverage for parsing/propagation
- integration smoke proving anchors survive end-to-end.

Done when:
1. At least one real-agent run contains visible `trace_id`/`span_id` in evidence output.
2. No marketing copy says "OTel anchors shipped" before this is true.

## Workstream C: Multi-agent bundle grouping via `run_id` (r/Observability thread)

Priority: `P1` (committed soon, not blocked for current core QA)  
Owner: bundle/report pipeline  
Target: immediately after Workstreams A+B
Implementation status (2026-02-28):
- `scripts/group-bundle.mjs` builds grouped incident bundles (`index.html`, `group-index.json`, `group-manifest.json`).
- `scripts/group-bundle-verify.mjs` verifies per-run checksums from `group-manifest.json`.
- README + runbook include operator commands.

Deliverables:
1. Group-level bundle index for multiple agent runs under one logical incident (`run_id` family).
2. Cross-run navigation in output index (agent A/B/C linked in one portable package).
3. Group manifest with per-run checksums and verification command.
4. Documentation and example bundle structure.

Done when:
1. One incident containing 2+ agents is shareable as one verifiable package.
2. Reviewer can inspect per-agent diffs without manual folder archaeology.

## Workstream D: Vendor-bridge converters (Promptfoo / DeepEval / Giskard)

Priority: `P1` (go-to-market acceleration, partner-facing)  
Owner: integrations  
Target: next cycle after A/B stabilization
Implementation status (2026-02-28):
- `plugins/vendor-bridge` added with canonical import contract.
- Initial converters implemented: Promptfoo, DeepEval, Giskard.
- Baseline/new bridge diff + conservative gate mapping implemented for deterministic triage.
- CLI conversion/diff command added: `npm run bridge -- convert|diff`.
- Example fixtures added under `examples/vendor-bridge/*` for partner demos.

Deliverables:
1. Canonical bridge schema for vendor eval imports.
2. Converter examples and tests for Promptfoo/DeepEval/Giskard.
3. Baseline/new diff output for partner demos without custom per-vendor logic.
4. README/docs wiring so sales/solutions can run bridges quickly.

Done when:
1. Three converters are typechecked and covered by unit tests.
2. One partner-facing demo uses bridge output for gate semantics.

## Marketing gating rules (enforced)

1. `r/selfhosted` Docker one-command claims: post only after Workstream A is done.
2. `r/OpenTelemetry` posts #5-6: post only after Workstream B is done.
3. `r/Observability` multi-agent run_id claims: present as "planned/in progress" until Workstream C is done.

## Execution order

1. Workstream A (`P0`)
2. Workstream B (`P0`)
3. Workstream C (`P1`)
4. Workstream D (`P1`)
