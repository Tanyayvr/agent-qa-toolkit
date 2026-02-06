<!-- /docs/report-contract-v1.md -->

# Report Contract v1 (Stage 1)

This document defines the **Report Contract v1** produced by the evaluator.

The contract covers:
1) **Human-readable HTML** (`report.html`, `case-<id>.html`) requirements (what must be visible in UI).
2) **Machine-readable output** (`compare-report.json`) requirements (stable CI interface).
3) **Assets** requirements (`assets/`) for full bodies and large payloads.
4) Portability and forward-compatibility rules (Stage 2/3 ready without breaking v1).

---

## 0) Goals

**Primary goals**
- Make regressions triageable in 1–2 clicks (what changed, where it diverged, why it failed).
- Preserve evidence: UI shows snippets, but **full bodies/payloads must be accessible** via assets.
- Make CI gating possible without parsing HTML (via `compare-report.json`).

**Non-goals (v1)**
- Runtime enforcement (Stage 2).
- True deterministic replay engine (Stage 3). v1 includes scaffolding fields only.

---

## 1) Output layout

Evaluator writes reports to:

- `apps/evaluator/reports/<reportId>/`

Required files and directories:

- `report.html` — main report page
- `compare-report.json` — machine-readable report
- `case-<case_id>.html` — per-case replay/diff page (one per case)
- `assets/` — full bodies / large payloads referenced by HTML/JSON

Recommended (stable if present):
- `assets/manifest.json` — assets registry for easier tooling/validation

---

## 2) Global rules (MUST)

1) **Portable paths:** all links and path fields in HTML/JSON must be **relative** to the report directory. No absolute paths.
2) **Self-contained:** copying the entire report directory to another location must preserve all links and functionality.
3) **No truncation without preservation:** if UI shows a snippet, a corresponding **full body/payload file** must exist in `assets/` (or a truncated file + truncation metadata).
4) **Schema versioning:** each JSON file must include `schema_version`.
5) **No undefined:** fields must be either omitted, or always present with the correct type. Prefer stable defaults:
   - arrays are always arrays (possibly empty),
   - booleans are always booleans,
   - tri-state fields use `"true" | "false" | "unknown"`.

---

## 3) `compare-report.json` (Machine Interface) — v1

### 3.1 Root object

Required fields:

- `schema_version`: `"compare-report.v1"`
- `generated_at`: ISO 8601 string
- `report_id`: string
- `baseline_dir`: string (relative)
- `new_dir`: string (relative)
- `cases_path`: string (relative)

- `toolchain`: object
  - `runner_version`: string
  - `evaluator_version`: string
  - `node_version`: string (recommended)

- `summary`: object
  - `baseline_pass`: number
  - `baseline_fail`: number
  - `baseline_error`: number
  - `new_pass`: number
  - `new_fail`: number
  - `new_error`: number
  - `regressions`: number
  - `improvements`: number
  - `unchanged`: number
  - `risk_high`: number
  - `risk_medium`: number
  - `risk_low`: number
  - `risk_unknown`: number

- `quality_flags`: object
  - `self_contained`: boolean
  - `relative_links_only`: boolean
  - `full_bodies_preserved`: boolean

- `root_cause_breakdown_new`: array of objects:
  - `root_cause`: string
  - `count`: number

- `items`: array of per-case items

### 3.2 Per-case item (`items[]`)

Required fields:

- `case_id`: string
- `title`: string

- `baseline_status`: `"pass" | "fail" | "error"`
- `new_status`: `"pass" | "fail" | "error"`

- `baseline_root`: string (present only if baseline_status != "pass")
- `new_root`: string (present only if new_status != "pass")

- `preventable_by_policy`: `"true" | "false" | "unknown"`
- `recommended_policy_rules`: array of string (always an array)

- `risk`: object
  - `risk_level`: `"high" | "medium" | "low" | "unknown"`
  - `risk_tags`: array of string
  - `exfil_indicators`: array of string

- `gate_recommendation`: object (Stage 2 preview, non-enforcing)
  - `should_block`: boolean
  - `requires_approval`: boolean
  - `reason_codes`: array of string
  - `evidence_refs`: array of `{ "kind": "event" | "asset", "id": string }`

- `artifacts`: object
  - `case_page_href`: string (relative)
  - `replay_diff_href`: string (relative)
  - `baseline_failure_body_href`: string | null
  - `baseline_failure_meta_href`: string | null
  - `new_failure_body_href`: string | null
  - `new_failure_meta_href`: string | null
  - `bundle_manifest_href`: string | null (Stage 3 scaffold)
  - `assets_manifest_href`: string | null (if `assets/manifest.json` exists)

- `divergence`: object
  - `first_divergence_type`: `"tool_sequence" | "tool_args" | "tool_result" | "retrieval" | "final_output" | "runner_error" | "unknown"`
  - `baseline_pointer`: string | null
  - `new_pointer`: string | null
  - `explain`: string (1–3 sentences)

- `replay`: object (Stage 3 scaffold)
  - `replay_mode_available`: boolean
  - `external_calls_recorded`: boolean
  - `nondeterminism_sources`: array of `"time" | "network" | "random" | "model" | "unknown"`

---

## 4) `report.html` (Main UI Page) — v1

The main report page must visibly include:

### 4.1 Run identification
- `report_id`
- `baseline_dir` (relative)
- `new_dir` (relative)
- `cases_path` (relative)
- `generated_at`
- report schema version (v1)

### 4.2 Summary (counts)
- baseline: pass/fail/error
- new: pass/fail/error
- regressions / improvements / unchanged

### 4.3 Root cause breakdown (new)
A table: `root_cause` → `count`

### 4.4 Cases table
For each case row:
- `case_id` (link to `case-<id>.html`)
- `title`
- baseline status (PASS/FAIL/ERROR)
- new status (PASS/FAIL/ERROR)
- `baseline_root` (if baseline failed/errored)
- `new_root` (if new failed/errored)
- `preventable_by_policy` (true/false/unknown)
- `recommended_policy_rules` (chips/list)
- `risk_level` (H/M/L/U) and `risk_tags` (chips)
- Assets column:
  - baseline failure body/meta links if present
  - new failure body/meta links if present
  - explicit indicator for “full body saved: yes/no” per side

### 4.5 Global quality badges
- “reportDir is self-contained” (yes/no)
- “relative links only” (yes/no)
- “full bodies preserved” (yes/no)

---

## 5) `case-<id>.html` (Per-case UI Page) — v1

The case page must show Baseline and New sections **symmetrically**.

### 5.1 Header
- `case_id`
- `title`
- link “Back to report”

### 5.2 Workflow metadata (compact)
- `workflow_id` (if present)
- model/prompt/policy/skills identifiers if present
- timing (duration_ms) if present

### 5.3 Final output
- render text, or pretty JSON with toggle

### 5.4 Proposed actions
A table with:
- `action_id`
- `action_type`
- `tool_name`
- `risk_level`
- `risk_tags`
- `evidence_refs` rendered in a readable/clickable way

### 5.5 Runner failure (if present)
If the runner produced a failure artifact, show:
- `class` (timeout/http_error/invalid_json/schema_mismatch/network_error/other)
- `attempt`, `timeout_ms`, `latency_ms`
- `status` / `status_text` (if http_error)
- `error_name` / `error_message` (if present)
- `body_snippet` (truncated)
- links to:
  - `full_body_saved_to` (assets/...)
  - `full_body_meta_saved_to` (assets/...)

### 5.6 Events / trace
Show sections:
- Tool calls: ts, call_id, tool, args
- Tool results: ts, call_id, status, latency_ms, payload_summary, plus link to full payload if externalized
- Retrieval: query, doc_ids, snippets hashes, plus link to stored snippets if externalized
- Final output event (if present)

### 5.7 Diff summary (why it diverged)
Show a “First divergence” block:
- divergence_type
- pointers (baseline/new)
- short explanation (1–3 sentences)
- links to evidence (events/assets)

---

## 6) `assets/` requirements — v1

### 6.1 When assets are required
Assets must be created when:
- a runner failure includes a snippet (store full body in assets),
- a tool result payload is too large for inline rendering,
- retrieval snippets are too large for inline rendering.

### 6.2 Truncation model
If full body exceeds a configured limit:
- still write an asset file (possibly truncated),
- write a meta file with:
  - bytes_written, bytes_total (if known), truncated flag.

### 6.3 `assets/manifest.json` (recommended)
If present, it must be stable:

- `schema_version`: `"assets-manifest.v1"`
- `generated_at`: ISO string
- `items`: array of
  - `asset_id`: string
  - `href`: relative path
  - `kind`: `"full_body" | "failure_meta" | "full_payload" | "retrieval_snippets" | "bundle_manifest" | "other"`
  - `case_id`: string | null
  - `side`: `"baseline" | "new" | null`
  - `size_bytes`: number
  - `sha256`: string (optional)

---

## 7) Forward compatibility (Stage 2/3 readiness)

- v1 is stable: future versions only add fields, never change types.
- Unknown event types must be ignored by the UI and machine parsers.
- Stage 2 enforcement will rely on the existing v1 fields:
  - evidence refs, risk tags, gate recommendation (still non-enforcing in v1).
- Stage 3 deterministic replay can add:
  - bundle manifests and replay metadata via nullable fields already defined in v1.
