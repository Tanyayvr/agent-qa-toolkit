# Security FAQ (Self‑Hosted)

## Why can signals be empty?
Signals are **best‑effort**. Layer 1 is regex‑based; if nothing matches, the signal set may be empty even if issues exist. Add Layer 2/3 scanners for stronger coverage.

## Why not use SaaS scanners?
Self‑hosted deployments often forbid data egress. The toolkit keeps security scanning offline by default.

## What should we enable for production?
At minimum: Layer 1 + `--entropyScanner`.  
For regulated workloads: add a local ML scanner (Presidio, custom detectors) via the `SecurityScanner` interface.
