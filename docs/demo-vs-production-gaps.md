# Demo-Only vs Production Pipeline: Gap Report

**Audit basis**: working tree at time of audit (uncommitted changes may exist). Search: `ripgrep` + `grep -n` over repo root.

---

## Summary Table

| # | Feature | Where it lives | Production pipeline? | Status |
|---|---------|---------------|---------------------|--------|
| 1 | **Redaction / masking** | `runner/src/sanitize.ts` | ✅ Production (when enabled) | Runner sanitizes artifacts when `--redactionPreset` is set |
| 2 | **Redaction metadata** | `runner` → `run.json`, `evaluator` reads it | ✅ Production | `redaction_applied` + `redaction_preset` are machine-proven from runner metadata |
| 3 | **Failure simulation** (500, timeout, drop, invalid JSON) | `demo-agent/index.ts`: hardcoded case handlers | ✅ Runner handles genuinely | Demo-agent *generates* failures, but runner's `fetchWithTimeout()`, `isTransientFailure()`, `saveBodyStreamed()` handle them in production code |
| 4 | **Matrix test cases** (net/data/size scenarios) | `demo-agent/index.ts`: `handleMatrixCase()` | N/A — test fixtures | Test fixtures for exercising runner/evaluator behavior, not expected for real agents |
| 5 | **Security signal detection** (PII/secret/prompt injection) | `evaluator/core.ts`: `hasSecretMarkers()`, `hasPiiMarkers()`, `computeSecuritySide()` | ✅ Production | Evaluator scans agent responses with regex. Real detection, not demo |
| 6 | **Trace integrity validation** | `evaluator/core.ts`: `computeTraceIntegritySide()` | ✅ Production | Validates event chain (tool_call→tool_result linkage, retrieval refs) |
| 7 | **Portability scan** (relative-only hrefs) | `evaluator/index.ts`: `isAbsoluteOrBadHref()`, `computeQualityFlags()` | ⚠️ Detection only | Scans and records violations, but does not fail/gate. Enforcement is the CI consumer's job |
| 8 | **`shared-types` usage** | `packages/shared-types/src/index.ts` | ✅ Production | Runner and evaluator import from `shared-types` (no type divergence risk) |
| 9 | **`transfer_class` in report** | `evaluator/index.ts`: `--transferClass` CLI flag | ✅ Production | Flag parsed, validated, written to `compare-report.json` |
| 10 | **Load test** | `runner/src/load-test.ts` | ❌ Test tooling | Calls demo-agent's `/run-case`. Not part of production pipeline |

---

## Detailed Findings

### 1. Redaction — now in runner pipeline

**What exists:**
- `runner/src/sanitize.ts`: `sanitizeValue()` masks emails, `CUST-*`, `T-*`, `MSG-*`, and token-like strings
- Runner flag: `--redactionPreset none|internal_only|transferable` (default: `none`)
- When preset is enabled: runner writes **sanitized** artifacts to `baseline/` and `new/`, and writes **raw** responses to `_raw/baseline/` and `_raw/new/`

**Impact**: redaction is now a production pipeline capability (opt-in). Transferable packs can be generated with redaction enabled.

### 2. Redaction metadata — machine-proven via runner

- Runner writes `redaction_applied` + `redaction_preset` into `run.json`
- Evaluator reads `run.json` to set `summary.quality.redaction_status` and `redaction_preset_id`
- Env vars are only a backward-compatibility fallback for older runs

### 3. Failure simulation — demo-agent generates, runner handles

This is **correctly split**:
- Demo-agent simulates: HTTP 500 (`fetch_http_500_001`), invalid JSON (`fetch_invalid_json_001`), timeout (`fetch_timeout_001`), socket drop (`fetch_network_drop_001`)
- Runner handles all these **genuinely**: `fetchWithTimeout()` + `AbortController`, `isTransientFailure()`, `saveBodyStreamed()`, transient classification
- Against a real agent, if the same failures occur, runner handles them identically

**No gap here** — demo-agent is a test fixture, runner is production code.

### 4. Matrix cases — test fixtures for runner/evaluator

- `demo-agent/index.ts`: `handleMatrixCase()` handles `matrix_net_*`, `matrix_data_*` case IDs
- These are **test fixtures** for exercising runner/evaluator behavior under network/data edge cases
- Not expected for real agents — against a real agent, these case IDs would return 404
- Runner and evaluator process them normally as any other case

**No pipeline gap** — this is by design. Documentation should state: matrix cases are demo-agent test fixtures.

### 5. `shared-types` — runner imports from shared-types

- Evaluator: `import { AgentResponse, RunEvent, ... } from "shared-types"` ✅
- Runner imports `Version`, `FetchFailureClass`, `RunnerFailureArtifact`, `NetErrorKind` from `shared-types`
- No duplicate type definitions

### 6. Portability detection — CI policy layer, not pipeline enforcement

- `evaluator/index.ts`: `isAbsoluteOrBadHref()` checks for absolute/escape paths
- `evaluator/index.ts`: `computeQualityFlags()` counts violations and records in `quality_flags`
- **But**: evaluator does not fail, gate, or return non-zero exit code on violations
- The `portable_paths: false` flag is informational — the CI consumer configures policy on how to react
- This is intentional: enforcement belongs in the **policy layer** (CI config), not in the evaluator itself

---

## What Needs to Change for Production-Ready

| Priority | Fix | Effort |
|----------|-----|--------|
| ~~**P0**~~ | ~~Runner imports from `shared-types`~~ | **Done** |
| ~~**P0**~~ | ~~Redaction in runner pipeline (variant B)~~ | **Done** — `runner/src/sanitize.ts` |
| ~~**P1**~~ | ~~Add tests for runner redaction~~ | **Done** — `runner/src/sanitize.test.ts` |
| ~~**P2**~~ | ~~Evaluator `--strictPortability`~~ | **Done** — `evaluator/src/index.ts` |
| **P2** | Evaluator: verify redaction claim by scanning artifacts for known PII patterns | **Done** — `--strictRedaction` safety gate + warnings in redaction summary |
