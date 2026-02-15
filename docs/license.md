# Self‑Hosted Licensing (Offline)

This toolkit supports **offline licenses** for self‑hosted deployments.
No network call is required at runtime.

## License Files

Place these files together (recommended: `.license/`):

```
.license/
  license.json
  license.sig
  usage.json
```

- `license.json` — license payload (signed)
- `license.sig` — base64 Ed25519 signature over canonical JSON
- `usage.json` — local usage counter (created automatically)

## License Payload (license.json)

```json
{
  "version": 1,
  "product": "agent-qa-toolkit",
  "license_id": "LIC-2026-0001",
  "customer": "Example Corp",
  "issued_at": 1771192000000,
  "expires_at": 1773870400000,
  "type": "monthly",
  "limits": {
    "max_runs_per_month": 500
  }
}
```

### Types

- `type: "monthly"` → uses `limits.max_runs_per_month`
- `type: "pack"` → uses `limits.max_runs_total`

Examples:

- `docs/license-example-monthly.json`
- `docs/license-example-pack.json`

## Key Generation & Signing

Generate a keypair:

```bash
node scripts/license-keygen.mjs
```

Sign a license file:

```bash
export AQ_LICENSE_PRIVATE_KEY=<base64-der-pkcs8>
node scripts/license-sign.mjs docs/license-example-monthly.json
```

## Runtime Flags

Provide a license path either via CLI or env:

```bash
# CLI
--license .license/license.json

# ENV
export AQ_LICENSE_PATH=.license/license.json
```

Public key (required when license is provided). Format: **base64‑encoded DER (SPKI)** for Ed25519:

```bash
export AQ_LICENSE_PUBLIC_KEY=<base64-ed25519-public-key>
```

Enforce license (optional):

```bash
export AQ_LICENSE_REQUIRED=1
```

## Usage Tracking

Usage is tracked locally in `usage.json`:

- `runs_total`
- `runs_this_month`
- `month` (UTC)

## Failure Modes

- Missing signature → error
- Invalid signature → error
- License expired → error
- Limit exceeded → error

## Notes

- Licensing is **offline** and self‑hosted.
- Usage enforcement happens in `runner` (consumes runs) and `evaluator` (validates license).
