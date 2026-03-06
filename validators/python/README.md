# Python Validator (Baseline)

Run:

```bash
python3 validators/python/aepf_validator/cli.py --reportDir conformance/golden-full --mode pvip --json
```

Conformance parity check:

```bash
node scripts/conformance-test-python.mjs
```

Notes:

- This is M1 baseline for multi-language parity.
- Strict mode currently requires `manifest.sig` + `AQ_MANIFEST_PUBLIC_KEY`; cryptographic signature verification is intentionally deferred to next milestone.
