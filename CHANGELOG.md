<!-- /CHANGELOG.md -->
# Changelog

## 2026-02-13

Production pipeline hardening and v5 readiness.

- Redaction moved into runner with `--redactionPreset` and machine-proven metadata in `run.json`
- Optional raw retention via `--keepRaw` (opt-in, warned)
- Evaluator strict gates: `--strictPortability`, `--strictRedaction`
- Demo-agent expanded for matrix coverage and redaction modes
- Added loadtest expected-fail classification and matrix suite
- Shared contract types consolidated in `packages/shared-types`
- Added unit tests for redaction sanitizer
