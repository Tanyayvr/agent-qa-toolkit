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
- Strict mode verifies `manifest.sig` using `AQ_MANIFEST_PUBLIC_KEY` (base64 DER SPKI public key).
