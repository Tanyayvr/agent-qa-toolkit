# Changelog

All notable changes to this project are documented in this file.

## 2026-03-01

### Added
- Runtime handoff proof tooling and endpoint/e2e validation flow.
- Group bundle tooling for incident-level multi-report packaging and verification.
- Vendor bridge plugin (Promptfoo / DeepEval / Giskard conversion + diff).
- Additional orchestration tests across runner/evaluator paths.
- Threat model document (`docs/threat-model.md`).

### Changed
- Runner timeout auto-profile now uses history + adapter health/runtime hints.
- Runner preflight includes deterministic canary behavior and transient retry logic.
- Loop detection supports configurable threshold/window via env or explicit config.
- Documentation clarified OSS vs Pro/Pro+ boundary and Python adapter scope.

### Fixed
- Trace anchor merge/source consistency in runner trace enrichment path.
- CLI validation and strict-usage checks for reliability flags.

## 2026-02-28

### Added
- Inactivity watchdog and heartbeat signaling for long-running cases.
- Node HTTP fallback path for long-header timeout/fetch-failure class.
- Case-level execution-quality gating improvements in evaluator reports.
- Marketing claim preflight scripts and documentation link checks.

### Changed
- Evaluator HTML report performance path updated for larger datasets (chunked render/pagination).
- Security scanner test coverage expanded (entropy/output-quality/prompt-injection/exfiltration).

### Fixed
- Multiple schema/report consistency fixes in compare-report v5 generation.
- Runner/evaluator orchestration tests stabilized for strict preflight scenarios.

## 2026-02-13

### Added
- Redaction moved into runner write path with preset controls.
- Optional raw retention (`--keepRaw`) and run-level metadata.
- Strict portability/redaction checks in evaluator.
- Shared contract type consolidation in `packages/shared-types`.

### Changed
- Demo matrix suites expanded for reliability and expected-failure scenarios.

