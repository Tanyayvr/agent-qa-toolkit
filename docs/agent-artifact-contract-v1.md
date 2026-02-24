
---

```md
# Agent Artifact Contract v1

This document defines the **Stage 1** artifact contract produced by the runner and consumed by the evaluator/report generator.

**Primary goals:**
1) Portable artifacts (relative paths only).
2) Deterministic, reproducible evidence for triage (replay + diff + RCA).
3) Reliability under failures (runner must still write a structured failure artifact).
4) Extensible fields for Stage 2/3 without breaking v1 (schema versioning, stable types).

---

## 1) Output locations

Runner writes artifacts for each run to:

- `apps/runner/runs/baseline/<runId>/`
- `apps/runner/runs/new/<runId>/`

Within each version directory:

- `run.json` (required)
- `<caseId>.json` for each case (required)
- `assets/` (required when any large bodies/payloads must be preserved)
- `assets/manifest.json` (recommended, stable if present)

Evaluator may write:

- `evaluation.json` into each version dir (optional in runner contract; recommended overall)

---

## 2) Global rules (MUST)

1) **Schema versioning:** each JSON file includes `schema_version` string.
2) **Portable paths:** any path fields are relative to the containing directory (no absolute `/Users/...`).
3) **Atomic writes:** JSON outputs are written atomically (write temp + rename).
4) **No undefined:** fields are either omitted or always present with the correct type.
5) **Full bodies preserved:** if a failure includes a body snippet, a full body file must exist in `assets/` (or a truncated file with truncation metadata).
6) **Stable error classes:** `timeout`, `http_error`, `invalid_json`, `schema_mismatch`, `network_error`, `other`.

---

## 3) `run.json` — Contract v1

### 3.1 Root object

**Required fields:**

- `schema_version`: `"run.v1"`
- `run_id`: string
- `version`: `"baseline" | "new"`
- `generated_at`: string (ISO 8601)
- `base_url`: string
- `cases_path`: string (relative path, as passed to runner)
- `out_dir`: string (relative path, runner output dir)
- `selected_case_ids`: array of string (final resolved list)
- `runner_version`: string

**Recommended fields:**

- `repo_commit`: string
- `dirty`: boolean
- `node_version`: string
- `timeout_ms`: number
- `retries`: number
- `concurrency`: number
- `retry_policy`: object
  - `classes`: array of string (e.g. `["timeout","network_error","http_5xx"]`)
  - `backoff`: `"exponential"`
  - `jitter`: boolean

- `limits`: object
  - `max_body_bytes`: number
  - `max_inline_snippet_bytes`: number
  - `max_payload_inline_bytes`: number

- `stats`: object
  - `cases_total`: number
  - `cases_completed`: number
  - `cases_failed`: number
  - `duration_ms`: number

---

## 4) `<caseId>.json` — Contract v1 (case artifact)

A case artifact is **one of**:
- a **successful agent response artifact** (preferred path), or
- a **runner failure artifact** (when the runner could not produce a valid response artifact).

Both variants share a minimal common envelope.

### 4.1 Common envelope (required for both)

- `schema_version`: `"case.v1"`
- `case_id`: string
- `version`: `"baseline" | "new"`
- `status`: `"ok" | "runner_error"`

- `workflow_id`: string (optional)
- `attempts`: array (optional; recommended when retries are enabled)

If `attempts` is present, each element:

- `attempt`: number (1-based)
- `started_at`: string (ISO)
- `latency_ms`: number (optional)
- `outcome`: `"ok" | "runner_error"`
- `error_class`: string (only when outcome is runner_error)

---

## 5) Successful agent response artifact (status = "ok")

### 5.1 Required fields

- `proposed_actions`: array
- `events`: array
- `final_output`: object

### 5.2 `final_output` object

Required:
- `content_type`: `"text" | "json"`
- `content`: string | object

Recommended:
- `output_hash`: string (short hash for quick comparisons)
- `redactions_applied`: array of string (if you sanitize secrets)

### 5.3 `proposed_actions[]` elements

Required:
- `action_id`: string
- `action_type`: string
- `tool_name`: string
- `params`: object
- `risk_level`: `"high" | "medium" | "low" | "unknown"`
- `risk_tags`: array of string
- `evidence_refs`: array of evidence ref objects

`evidence_refs[]` element:
- `kind`: `"tool_result" | "retrieval_doc" | "event" | "asset"`
- `call_id`: string (required when kind = tool_result)
- `doc_id`: string (required when kind = retrieval_doc)
- `id`: string (required when kind = event or asset)
MUST:
- Every `evidence_refs[]` entry must be resolvable either:
  - from `events` (via `call_id` / `doc_id`), or
  - from `assets/` (via an asset href/id).
- Evaluator and reports must be able to render evidence links without external dependencies.

Notes:
- Use exactly one identifier field per kind.
- Evidence refs must be resolvable from `events` or from `assets/`.

### 5.4 `events[]` elements

All events share:
- `type`: string
- `ts`: number (epoch ms)

Pointer compatibility (for reports):
- Reports may reference events by `events[index]` (stable ordering within a case artifact).
- If you introduce explicit event identifiers later, they must be additive and not replace index-based addressing in v1.

Supported event types in v1:

#### A) `tool_call`
Required:
- `call_id`: string
- `action_id`: string (optional but recommended)
- `tool`: string
- `args`: object

Recommended:
- `risk_level`: `"high" | "medium" | "low" | "unknown"`
- `risk_tags`: array of string

#### B) `tool_result`
Required:
- `call_id`: string
- `action_id`: string (optional but recommended)
- `status`: `"ok" | "error"`
- `latency_ms`: number

Recommended (inline, bounded):
- `payload_summary`: object | string

If the full payload is large, store it in `assets/` and reference it:
- `payload_asset_href`: string (relative path, e.g. `assets/full_payload_new_c1.json`)
- `payload_asset_sha256`: string (optional)

#### C) `retrieval`
Required:
- `query`: string
- `doc_ids`: array of string

Recommended:
- `snippets_hashes`: array of string
- `snippets_asset_href`: string (relative path) when snippets are stored in assets

#### D) `final_output`
Required:
- `content_type`: `"text" | "json"`
- `content`: string | object

---

## 6) Runner failure artifact (status = "runner_error")

When the runner cannot produce a valid response artifact, it must still write a deterministic, structured artifact.

### 6.1 Required fields

- `runner_failure`: object

`runner_failure` required fields:
- `class`: `"timeout" | "http_error" | "invalid_json" | "schema_mismatch" | "network_error" | "other"`
- `url`: string
- `attempt`: number
- `timeout_ms`: number (if applicable)
- `latency_ms`: number (if known)

Conditional fields:
- if `class = http_error`:
  - `status`: number
  - `status_text`: string (optional)

- if `class = network_error` or `other`:
  - `error_name`: string (optional)
  - `error_message`: string (optional)

Body snippet and full body preservation:
- `body_snippet`: string | null
- `full_body_saved_to`: string | null (relative href into `assets/`)
- `full_body_meta_saved_to`: string | null (relative href into `assets/`)

If the failure has no body (e.g., DNS failure), set:
- `body_snippet = null`
- `full_body_saved_to = null`

### 6.2 Failure metadata file (`assets/...meta.json`) recommended fields

If `full_body_meta_saved_to` is set, the referenced JSON should include:

- `schema_version`: `"failure-meta.v1"`
- `case_id`: string
- `version`: `"baseline" | "new"`
- `class`: string
- `content_type`: string | null
- `encoding`: string | null
- `bytes_written`: number
- `bytes_total`: number | null
- `truncated`: boolean
- `sha256`: string (optional)
- `headers`: object (optional; sanitized)
- `note`: string (optional)

---

## 7) `assets/` directory

### 7.1 When assets must exist

`assets/` must exist whenever:
- a runner failure preserved a full body,
- a tool result payload was externalized (too large for inline),
- retrieval snippets were externalized.

### 7.2 Recommended `assets/manifest.json`

If present:

- `schema_version`: `"assets-manifest.v1"`
- `generated_at`: string (ISO)
- `items`: array of:
  - `asset_id`: string
  - `href`: string (relative path)
  - `kind`: `"full_body" | "failure_meta" | "full_payload" | "retrieval_snippets" | "other"`
  - `case_id`: string | null
  - `side`: `"baseline" | "new" | null`
  - `size_bytes`: number
  - `sha256`: string (optional)

---

## 8) Compatibility guarantees

- v1 files are stable: future versions only add new fields, never change types of existing fields.
- If a field is introduced as tri-state, it remains tri-state (no later conversion from boolean to tri-state).
- Evaluator/report must treat unknown event types as ignorable (forward-compatible parsing).

---

## 9) Minimal implementation checklist (DoD for v1)

- For any runner failure: a `<caseId>.json` exists with `status="runner_error"` and `runner_failure.class`.
- If `body_snippet` is non-null, then `full_body_saved_to` is also non-null and points to an existing file in `assets/`.
- No absolute paths appear in any JSON or HTML emitted by the evaluator.
- Artifacts can be copied to another directory and remain readable by the evaluator and report generator.
