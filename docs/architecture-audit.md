# Architecture Audit: Agent QA Toolkit

## Audit Basis

- **Repo**: local working copy (path omitted)
- **Last commit**: `11b3a13` (2026-02-12 15:51 -0700)
- **Uncommitted changes in**: `README.md`, `apps/demo-agent/src/responses.ts`, `apps/evaluator/package.json`, `apps/evaluator/src/htmlReport.ts`, `apps/evaluator/src/index.ts`, `apps/runner/src/index.ts`, `package-lock.json`, `package.json`
- **Search method**: `ripgrep` over repo root, `grep -n` for line-level verification
- **npm audit at time of writing**: `found 0 vulnerabilities` (after `overrides.qs: "6.14.2"` applied in root `package.json`; requires npm v8+ for overrides support)

> [!IMPORTANT]
> All findings below refer to working-tree content at the time of writing, not a tagged release. Function references point to working-tree state. Line numbers are omitted because they will shift on next commit.

---

## What Stage 1 Is (and Is Not)

Stage 1 is a **CLI batch tool** (not a service). It runs `runner → evaluator → report dir`, then exits.

**What the tooling provides:**
- Deterministic contract shape and link/path rules given identical input artifacts and tooling versions (pinned via lockfile + `.nvmrc`)
- Bounded response body capture during runner fetch (configurable `--maxBodyBytes`, streaming writes)
- Retry with exponential backoff + jitter for transient failures
- Portable report directory with relative hrefs and manifest-addressed evidence
- Contract-versioned output (`contract_version: 5`)

**What the tooling does not provide:**
- Deterministic agent output (agent may be non-deterministic; network/timing/retries change results)
- SLO/SLI (no persistent service to measure)
- Horizontal scaling (single-process CLI)
- Authentication/authorization (local execution assumed)
- Data encryption at rest (plain files on disk)
- Payload redaction (contract models redaction intent via metadata fields, but no content transformation is implemented in this repo — see section 4)

---

## Core Stage 1 MUSTs

### 1. Atomic write of report directory
**Not implemented.**
Evaluator `main()` writes directly to the target `reportDirAbs` via incremental `writeFile` calls. If the process crashes mid-evaluation, the directory may contain an incomplete report. Fix: write to a temp dir, then `rename` on success.

### 2. No silent omissions (items[] covers all cases)
**Implemented in code. Not validated by test.**
Evaluator `main()` iterates all cases from `readCases()` and pushes one item per case into `items[]`. `data_coverage` is computed. But no test asserts `items.length === cases.length`. This logic lives in `main()`, which is not unit-tested.

### 3. Manifest closure (all bundle files indexed)
**Hashing present. Closure not validated.**
`sha256Hex()` hashes the manifest JSON. `source_manifest_sha256` is written to `compare-report.json`. But there is no validator that checks whether every file in `assets/` is listed in the manifest, or whether every manifest entry resolves to an existing file.

### 4. Portability (no absolute/escape paths in hrefs)
**Detected by quality_flags scan. Enforcement depends on CI policy.**
`isAbsoluteOrBadHref()` checks for `http://`, `https://`, absolute paths, `\\`, `../`, `/../`. Results are recorded in `quality_flags.portable_paths` and `quality_flags.path_violations`. This is detection, not enforcement — the evaluator does not fail or gate on violations. Whether violations block a build depends on the CI consumer reading `quality_flags`.

---

## Non-Core (Nice-to-Have)

| Item | Status |
|------|--------|
| SBOM generation | Not found in repo |
| Dockerfile | Not found in repo |
| Progress bar / ETA | Not found. Runner prints per-case progress via `console.log` in `runner/index.ts` |
| Rate limiting (runner → agent) | Not found |
| Circuit breaker | Not found |
| Cleanup / TTL for old reports | Runner/Evaluator support `--retentionDays` (opt-in) |
| Structured JSON logging | Not found. All output is `console.log` plain text |

---

**Suites (correctness vs robustness):**  
Cases now support `suite` to separate semantic correctness checks from robustness/transport checks.  
`cases/cases.json` is `suite=correctness`, `cases/matrix.json` is `suite=robustness`, and `cases/all.json` combines both with `summary_by_suite` emitted in the report.

**Matrix coverage (demo-agent + `cases/matrix.json`):**  
Network failures (500/timeout/drop/partial), data shape errors (invalid JSON, empty body, missing fields, wrong types, extra fields), and large payloads (1MB/5MB + huge string) are supported in the demo-agent for systematic validation.  
Note: `loadtest` validates transport-level success only (HTTP status + timing). It does not parse JSON or validate schemas.

---

**Portability enforcement:**  
Evaluator supports `--strictPortability` to fail builds when portability violations are detected (`quality_flags.portable_paths=false`).

**Redaction enforcement:**  
Evaluator supports `--strictRedaction` to fail builds if redaction is applied but unredacted markers remain.
Runner supports extended redaction via `--redactionPreset transferable_extended` (IP/phone/CC/JWT patterns).

**E2E pipeline check:**  
`npm run demo:e2e` runs correctness + robustness suites back-to-back (lint/typecheck once). Useful as a CI health gate for the pipeline.

**Toolkit tests:**  
`npm run test:toolkit` validates report schema shape, gate expectations for known cases, and portability (hrefs resolve, assets exist).

**Security plugins:**  
Evaluator now exposes a `SecurityScanner` interface (`apps/evaluator/src/securityScanner.ts`) to allow sidecar scanners (Presidio/TruffleHog) to append signals without replacing core regex checks.

**Audit log:**  
Runner and evaluator append audit events to a JSONL file when `AUDIT_LOG_PATH` is set (start/finish, run/report ids).

**Raw retention:**  
Runner supports `--keepRaw` to store unsanitized responses under `_raw/`. This is opt-in and should be avoided for transferable packs.

**Large payload warnings:**  
Evaluator supports `--warnBodyBytes` (default 1,000,000) to flag large case responses in `quality_flags.large_payloads`.

## Category Details

### 1. Architecture and Boundaries

| What | Where (function / file) |
|------|------------------------|
| npm workspaces separate apps + packages | root `package.json`: `workspaces: ["apps/*", "packages/*"]` |
| Typed failure classes | `runner/index.ts`: `FetchFailureClass` type, `RunnerFailureArtifact` type |
| Exit code contract: 0 success, 1 runtime, 2 usage | `runner/index.ts`: `CliUsageError.exitCode = 2`, `process.exit(1)` in catch. Same pattern in `evaluator/index.ts` |
| Contract versioning in output | `evaluator/index.ts`: `contract_version: 5`, `manifest_version: "v1"` |

**Status**: compare-report schema validation added in `schemas/compare-report-v5.schema.json` and enforced in `scripts/toolkit-tests.mjs`.

**Status**: packaging and offline verification added via `scripts/pvip-pack.mjs` and `scripts/pvip-verify.mjs`.

**Status**: manifest item hashes (`sha256`) added in evaluator for offline integrity checks.
**Status**: pvip-verify enforces portable paths, in-bundle hrefs, and embedded-index consistency.

### 2. Bounded Memory

| What | Where |
|------|-------|
| Response body streamed to disk, not buffered | `runner/index.ts`: `saveBodyStreamed()` uses `createWriteStream` |
| Write respects Node stream drain protocol | `runner/index.ts`: `writeStreamOnceDrain()` — awaits `drain` event before writing next chunk |
| Body truncated at maxBodyBytes in stream loop | `runner/index.ts`: inside `saveBodyStreamed()`, checks `bytesWritten < maxBodyBytes`, slices remainder, sets `truncated = true` |
| Truncation metadata in artifact | `runner/index.ts`: `body_truncated`, `body_bytes_written`, `max_body_bytes` fields in `RunnerFailureArtifact` |
| Manifest items include `bytes` for viewer budget | `evaluator/manifest.ts`: `ManifestItem.bytes` field |

**Gap**: evaluator reads case files with `readFile` + `JSON.parse` without size check. If runner writes a large file to disk (before encountering the truncation threshold), evaluator loads it entirely into memory.

**Potential risk to evaluate**: compressed responses and decompressed-size bounding. Searched `Content-Encoding`, `gzip`, `decompress` in runner — no explicit handling found.

### 3. Reliability

| What | Where |
|------|-------|
| Retry loop with attempt counter | `runner/index.ts`: `runCase()` — `for (let attempt = 1; attempt <= cfg.retries + 1; ...)` |
| Transient error classification | `runner/index.ts`: `isTransientFailure()` — timeout/network_error = transient; `httpIsTransient()` — 429/500/502/503/504 |
| Retry only on transient | `runner/index.ts`: `if (attempt <= cfg.retries && artifact.is_transient === true)` |
| Exponential backoff with jitter | `runner/index.ts`: `backoffMs()` — `base * 2^(attempt-1)` + 20% random jitter |
| Concurrency worker pool | `runner/index.ts`: `runWithConcurrency()` — `n` workers drawing from shared index |
| Per-request timeout via AbortController | `runner/index.ts`: `fetchWithTimeout()` |

### 4. Security

| What | Where | Caveat |
|------|-------|--------|
| Secret markers detected in output | `evaluator/core.ts`: `hasSecretMarkers()` | Regex-based pattern matching, not sanitization |
| PII markers detected in output | `evaluator/core.ts`: `hasPiiMarkers()` | Same — detection only |
| Prompt injection markers detected | `evaluator/core.ts`: `computeSecuritySide()` | Detection, triggers signal |
| Redaction transparency modeled in contract | `evaluator/index.ts`: reads `REDACTION_STATUS` env, writes `redaction-summary.json` with `preset_id` + `timestamp` | **Metadata only in evaluator.** Does not sanitize payloads. |
| Demo redaction (payload masking) | `demo-agent/index.ts`: `x-redaction-preset` header / `DEMO_REDACTION_PRESET` env | Demo-only masking for emails, `CUST-*`, `T-*`, `MSG-*`, token-like strings. Not used by runner/evaluator in production paths. |
| Transfer classification CLI flag | `evaluator/index.ts`: `--transferClass` (internal_only / transferable) | Written to `summary.quality.transfer_class` |
| npm audit | `npm audit` currently reports `found 0 vulnerabilities`. Root `package.json` contains `overrides.qs: "6.14.2"` (npm v8+ feature) to pin qs outside advisory GHSA-w7fw-mjwx-w883. Prior to this override, audit reported 1 low-severity vulnerability. Verify: `cat package.json \| grep -A2 overrides` and `npm audit` (run as separate commands) |
| Lockfile | `package-lock.json` present for deterministic `npm ci` |

### 5. Observability

**Minimal.** All output is unstructured `console.log`:
- Runner prints config at start, then `Case: <id>` per case, then `Runner finished`
- No JSON log format, no log levels, no run_id/case_id correlation per line
- Searched `trace_id`, `request_id`, `structured` in runner and evaluator — not found

---

## Load Profiles

"Load" for a CLI tool = cases × payload size × concurrency × disk throughput.

| Profile | Cases | Payload (per response) | Concurrency | Notes |
|---------|-------|----------------------|-------------|-------|
| CI small | ≤ 20 | ≤ 100 KB | 1 | Current default |
| CI medium | 20–100 | ≤ 500 KB | 4–8 | Report HTML grows linearly with cases |
| Stress | 1000+ | ≤ 2 MB | 8–16 | Evaluator loads all case JSONs into memory; HTML report is a single string. Not tested at this scale |

Not documented in repo: expected payload sizes, recommended concurrency, or memory requirements.

---

## Evidence Pointer Table

Where contract MUSTs are implemented or detected:

| Contract MUST | Implementation layer | Function / file |
|---------------|---------------------|----------------|
| `contract_version: 5` | Evaluator output | `evaluator/index.ts` |
| One item per case in `items[]` | Evaluator `main()` loop | `evaluator/index.ts` |
| `gate_recommendation` per case | Core logic | `core.ts`: `deriveGateRecommendation()` |
| `manifest_key`-only evidence refs | Evaluator core | `core.ts`: `checkEvidenceRefsStrict()` (validation), `computeSecuritySide()` + `manifestKeyFor()` (construction) |
| Portability scan (relative hrefs) | Quality flags detection (not enforcement) | `evaluator/index.ts`: `isAbsoluteOrBadHref()`, `computeQualityFlags()` |
| `source_manifest_sha256` | Evaluator output | `evaluator/index.ts`: `sha256Hex()` |
| Embedded manifest index in HTML | HTML report | `evaluator/htmlReport.ts`: `renderHtmlReport()` |
| `data_coverage` summary | Evaluator output | `evaluator/index.ts` |
| `transfer_class` | Evaluator CLI + output | `evaluator/index.ts`: CLI parse + write |
| Bounded body capture | Runner streaming | `runner/index.ts`: `saveBodyStreamed()` |
| Retry transient only | Runner retry loop | `runner/index.ts`: `runCase()` |
