# Marketing Claim Gates (Interim)

Date: 2026-02-28
Status: active

Purpose:
- Keep public messaging aligned with shipped code.
- Prevent trust debt from posting claims ahead of implementation proof.

## Gate matrix

1. Self-hosted one-command (`docker compose up --build`)
- Status: shipped
- Evidence: `docker-compose.yml`, `docs/self-hosted-deploy.md`, `README.md`
- Posting rule: allowed

2. OTel anchors in artifacts (`trace_id` / `span_id`)
- Status: partially shipped
- Evidence: `plugins/otel-anchor-adapter`, runner/evaluator anchor plumbing in code
- Missing proof: real-agent pack with non-empty anchors in final artifacts
- Verification command: `node scripts/proof-otel-anchors.mjs --reportDir <reportDir> --minCases 1`
- Posting rule: do not claim "fully shipped" yet; use "plugin shipped, e2e proof in progress"

3. Multi-agent incident grouping by `run_id`
- Status: shipped for packaging/indexing
- Evidence: `scripts/group-bundle.mjs`, `scripts/group-bundle-verify.mjs`, tests
- Scope note: this is bundle-level grouping, not runtime state handoff between agents
- Posting rule: allowed with scope note

4. Runtime handoff (`/handoff`, `run_meta`, receipts)
- Status: shipped in adapter/contract level
- Evidence: shared types + adapter tests + runner propagation
- Verification command: `node scripts/proof-runtime-handoff.mjs --baseUrl <adapter> --mode endpoint|e2e`
- Posting rule: allowed; avoid claiming full autonomous multi-agent orchestration

5. Vendor-bridge (Promptfoo / DeepEval / Giskard)
- Status: shipped
- Evidence: `plugins/vendor-bridge`, CLI `npm run bridge`, fixtures in `examples/vendor-bridge/`
- Posting rule: allowed

## Enforcement checklist (before each post wave)

1. Verify each claim against code paths and tests.
2. Verify docs wording matches implementation scope.
3. Avoid words: "fully", "production-proven", "standard adopted" unless explicitly proven.
4. Keep one hard link per claim to code/doc evidence.

## Related docs

- `docs/roadmap/2026-02-28-claim-alignment-plan.md`
- `docs/roadmap/2026-02-28-pre-post-checklist.md`
- `docs/roadmap/2026-02-28-pre-outreach-checklist.md`
- `docs/internal/market/marketing-plan.md`
- `README.md`
