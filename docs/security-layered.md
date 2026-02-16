# Layered Security Model (Self‑Hosted)

This toolkit ships a **layered** model so teams can choose how far to go while staying offline.

## Layer 1 — Fast Heuristics (default)
- Regex markers for secrets, PII, and prompt‑injection phrases.
- Goal: low latency, immediate signal.
- Caveat: higher false‑negatives on obfuscated text.

## Layer 2 — Local Entropy/Key Scanner (optional)
- Enable with `--entropyScanner`.
- Detects high‑entropy tokens and common key patterns.
- Still offline and low‑latency.

## Layer 3 — Optional Local ML Scanners (plugin)
- For self‑hosted use: Presidio, local classifiers, or custom scanners.
- Integrates via `SecurityScanner` interface without changing core logic.

## Layer 4 — Human Review / Policy
- CI gates (`require_approval` / `block`) + evidence packs for review.

## Why layered?
- Forum feedback shows regex‑only detection misses obfuscated attacks.
- Teams want offline‑safe options, not SaaS dependencies.

## Guidance
- Start with Layer 1+2 for baseline.
- Add Layer 3 if you handle sensitive data or regulated workloads.
