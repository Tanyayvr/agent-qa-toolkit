# Pre-Post Checklist (Reddit / LinkedIn / HN)

Date: 2026-02-28
Status: active

Use before publishing any technical claim.

## Claim validation

1. Each claim points to a real code path or command output.
2. Scope is explicit: shipped / partial / planned.
3. No "fully shipped" wording for features without real-agent proof.

## Fast technical checks

1. `npm run docs:check-links`
2. `npm run typecheck`
3. `npm run test:coverage`
4. `npm audit --audit-level=high`

## Feature-specific checks

1. Docker quickstart claim -> `docker compose config --quiet` passes.
2. Vendor-bridge claim -> `npm run bridge -- --help` works and one convert+diff smoke run succeeds.
3. OTel anchors claim -> `node scripts/proof-otel-anchors.mjs --reportDir <reportDir> --minCases 1` passes.
4. Runtime handoff claim -> `node scripts/proof-runtime-handoff.mjs --baseUrl <adapter> --mode endpoint` passes (use `--mode e2e` for receipt path checks on fast adapters).
5. Multi-agent claim -> wording must distinguish bundle grouping vs runtime handoff.

## Messaging hygiene

1. Include one hard evidence link per strong claim (file path or command).
2. Avoid claims about removed/private components unless code exists now.
3. Avoid deprecated terms if docs were renamed.
4. Keep CTA aligned to actual onboarding path (`README` quickstart + pilot template).
