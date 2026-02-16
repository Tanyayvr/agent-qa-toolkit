# Key Handling Policy (Internal)

This policy governs AQ license signing keys and manifest signing keys.

## Storage
- Private keys (`AQ_LICENSE_PRIVATE_KEY`) must be stored in a secret manager or HSM.
- No private keys in repo, shell history, or CI logs.
- Public keys may be stored in repo (base64 DER SPKI).

## Rotation
- Support multiple active public keys for verification (graceful rotation).
- Rotate signing keys at least every 180 days, or immediately on compromise.

## Usage
- Signing performed only in a controlled environment (release pipeline).
- Signing key must never be exposed to customer environments.

## Incident Response
- On suspected leak: revoke key, rotate, re‑issue affected licenses, and re‑sign packs.
