# Go Validator (Baseline)

Run:

```bash
cd validators/go/aepf-validator
go run . --reportDir ../../../conformance/golden-full --mode pvip --json
```

Conformance parity check from repo root:

```bash
node scripts/conformance-test-go.mjs
```

Notes:

- This is M2 baseline for multi-language parity.
- Strict mode verifies `manifest.sig` using `AQ_MANIFEST_PUBLIC_KEY` (base64 DER SPKI public key).
