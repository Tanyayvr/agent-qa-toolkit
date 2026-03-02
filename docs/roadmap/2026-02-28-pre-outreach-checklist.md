# Pre-Outreach Checklist (Founder / Sales)

Date: 2026-02-28
Status: active

Use before sending outreach to agent teams or potential partners.

## Proof package readiness

1. `report.html` exists for the run.
2. `compare-report.json` exists and is readable.
3. `manifest.json` exists and verification passes (`npm run pvip:verify -- --reportDir <dir>`).
4. If trend is mentioned, `trend.html` is attached and generated from current runs.

## Technical truth checks

1. Do not present transport-failed campaigns as model-quality outcomes.
2. Include execution-quality status (normal/degraded) in outreach notes.
3. Mention known limitations explicitly (for example, weak assertions or infra instability).
4. Avoid claiming feature completeness when status is "partial/in progress".

## Message quality

1. Personalize with agent/repo specifics (stack/use-case).
2. Keep CTA concrete: "15-minute review of your current run artifacts".
3. Attach only current artifacts (no stale screenshots).
4. Include one machine-readable asset (`compare-report.json`) plus one human asset (`report.html`).

## Internal hygiene before send

1. `npm run docs:check-links`
2. `npm run typecheck`
3. `npm run test:coverage`
4. `npm audit --audit-level=high`
