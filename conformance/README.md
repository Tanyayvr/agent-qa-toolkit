# Conformance Golden Packs

Golden packs exercise `pvip-verify` behavior across modes:

- `golden-minimal`: minimal valid pack against current schema contract
- `golden-full`: full optional fields + richer metadata
- `golden-security`: security signal payloads populated
- `golden-redacted`: redaction metadata coverage
- `golden-broken`: intentionally invalid pack (negative control)

Each pack includes:

- `compare-report.json`
- `artifacts/manifest.json`
- `expected.json` (mode-specific expected pass/fail)

Validator mode matrix:

- `aepf`: format/schema gate
- `pvip`: portability + integrity gate
- `strict`: strict gate including signature requirements

Current strict expectation in golden packs:

- unsigned packs are expected to fail strict (`reason: no manifest.sig`)
- broken pack is expected to fail all modes

Run:

```bash
node scripts/conformance-test.mjs
```

EU AI Act export contracts are frozen separately:

- core source fixtures: `conformance/agent-evidence-contract-source/`
- core normalized golden snapshot: `conformance/golden-agent-evidence-contract.json`
- core checker: `node scripts/agent-evidence-contract-check.mjs`
- source fixtures: `conformance/eu-ai-act-contract-source/`
- normalized golden snapshot: `conformance/golden-eu-ai-act-contract.json`
- checker: `node scripts/eu-ai-act-contract-check.mjs`
