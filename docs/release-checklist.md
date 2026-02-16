# Public Release Checklist (Self‑Hosted)

## Build & Test
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test` (unit)
- [ ] `SKIP_AUDIT=1 node scripts/demo-e2e.mjs --baseUrl http://localhost:8788 --skipAudit`
- [ ] `npm run test:toolkit`

## Report Validation
- [ ] `npm run pvip:verify`
- [ ] `npm run pvip:verify:strict`
- [ ] `npm run pvip:verify:json`

## Spec & Docs
- [ ] `docs/aepf-spec-v1.md` up to date
- [ ] `schemas/compare-report-v5.schema.json` matches current output
- [ ] README references AEPF spec + schema
- [ ] `docs/self-hosted.md` current
- [ ] `docs/agent-integration-contract.md` current

## Packaging
- [ ] `npm run pvip:pack`
- [ ] Docker compose starts (`docker-compose up --build`)
- [ ] Dockerfile uses multi-stage + `npm ci --omit=dev`
- [ ] `.dockerignore` excludes node_modules/.git/reports

## Security & Compliance
- [ ] `--strictPortability` and `--strictRedaction` flags documented
- [ ] `compliance_mapping` present in reports (if profile provided)
- [ ] No secrets committed (manual spot‑check)
- [ ] License flow documented (keygen + sign + usage)

## Release Hygiene
- [ ] `CHANGELOG.md` updated (if used)
- [ ] `LICENSE` present
- [ ] `SECURITY.md` present (if public)
