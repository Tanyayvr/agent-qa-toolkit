# Conformance Golden Packs

Golden packs exercise validator modes.

- `golden-minimal`: minimal valid pack
- `golden-full`: full optional fields
- `golden-security`: security signals populated
- `golden-redacted`: redaction metadata
- `golden-broken`: intentionally invalid

Each pack includes `expected.json` with pass/fail per mode.

Run:

```bash
node scripts/conformance-test.mjs
```
