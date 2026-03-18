# Intake Profiles

`ops/intake/<profile>/` holds the structured upstream intake for one supported agent or evaluation track.

Current files:

- `system-scope.json`
- `quality-contract.json`
- `cases-coverage.json` after the reviewed suite is checked
- `adapter-capability.json` after the live adapter check runs
- `run-fingerprint.json` after the baseline/new comparability check runs
- `corrective-action-register.json` after a successful `review:check` with an attached intake profile

Recommended flow:

```bash
npm run intake:init -- --profile support --euDossierRequired 1
npm run intake:validate -- --profile support
npm run intake:scaffold:cases -- --profile support
npm run intake:check:cases -- --profile support --cases cases/support.completed.json
npm run intake:check:adapter -- --profile support --cases cases/support.completed.json --baseUrl http://127.0.0.1:8788
npm run intake:check:runs -- --profile support --cases cases/support.completed.json --baselineDir apps/runner/runs/baseline/r1 --newDir apps/runner/runs/new/r1
```

What this layer automates:

- normalizes scope inputs into a stable JSON contract
- validates readiness before case authoring or adapter work starts
- makes human-owned gaps explicit instead of hiding them in notes
- scaffolds a draft `cases.json` from the quality contract
- checks whether a reviewed case suite actually covers the intake contract and required ratios
- persists that reviewed coverage in `cases-coverage.json`
- checks whether a live adapter already satisfies the required telemetry depth on a real canary case
- persists the proven adapter capability profile in `adapter-capability.json`
- checks whether baseline/new run directories are structurally comparable before packaging
- persists the resulting comparability and environment fingerprint in `run-fingerprint.json`
- syncs recurring residual-gap continuity after successful review checks

What this layer does **not** automate:

- intended-use judgment
- business harm and deployment assumptions
- approval/block policy decisions
- final narrative text
- legal interpretation or signoff

Treat the generated `cases/<profile>.intake-scaffold.json` as a draft only.
It is a starting point for a quality-grade suite, not the final evidence contract.

Recommended order after the draft exists:

1. Review and complete the scaffolded cases.
2. Run `npm run intake:check:cases -- --profile <name> --cases <cases.json>`.
   This writes `ops/intake/<name>/cases-coverage.json`.
3. Run `npm run intake:check:adapter -- --profile <name> --cases <cases.json> --baseUrl <adapter>`.
   This writes `ops/intake/<name>/adapter-capability.json`.
4. Run `node scripts/validate-cases-quality.mjs --cases <cases.json> --profile quality ...`.
5. Produce the first baseline/new run pair.
6. Run `npm run intake:check:runs -- --profile <name> --cases <cases.json> --baselineDir <run-dir> --newDir <run-dir>`.
   This writes `ops/intake/<name>/run-fingerprint.json`.
7. Package the first serious bundle.
8. Run `npm run review:init -- --reportDir <report-dir> --profile <name>`.
9. Complete the human-owned review fields, then run `npm run review:check -- --reportDir <report-dir> --profile <name>`.
   This writes `ops/intake/<name>/corrective-action-register.json` and refreshes `review/intake/corrective-action-register.json`.
