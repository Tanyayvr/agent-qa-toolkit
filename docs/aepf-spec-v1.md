# AEPF Spec v1 (Agent Evidence Pack Format)

This document defines the **minimal interoperable format** for an Agent Evidence Pack (AEPF).
It is aligned with the current toolkit contracts (report‑contract v5).

## Goals

- **Portable**: works offline, no external dependencies
- **Self‑contained**: all evidence in the bundle
- **Machine‑verifiable**: manifest + hashes
- **CI‑friendly**: single JSON report as source of truth

## Required Files (Bundle Root)

- `report.html` — offline HTML viewer
- `compare-report.json` — machine truth for CI
- `case-<case_id>.html` — per‑case HTML view
- `assets/` — evidence files
- `artifacts/manifest.json` — canonical manifest (hashes, mapping)

## `compare-report.json` (Core)

Required top‑level fields:

- `contract_version: 5`
- `report_id`
- `meta` (toolkit_version, spec_version, generated_at, run_id)
- `baseline_dir`, `new_dir`, `cases`
- `summary`, `summary_by_suite`
- `items[]` (case results)

Optional but recommended:

- `environment` (agent/model/prompt/tools versions)
- `compliance_mapping` (ISO/NIST clauses)
- `quality_flags` (portability, redaction, large payloads)

Schema:

- `schemas/compare-report-v5.schema.json`

### `compare-report.json` field table (summary)

| Field | Required | Description |
|-------|----------|-------------|
| `contract_version` | ✅ | Report contract version (v5) |
| `report_id` | ✅ | Report identifier |
| `meta` | ✅ | Toolkit + spec version + timestamp + run_id |
| `baseline_dir` | ✅ | Baseline run directory |
| `new_dir` | ✅ | New run directory |
| `cases` | ✅ | Cases file used |
| `summary` | ✅ | Global counts (pass/fail, risk, coverage) |
| `summary_by_suite` | ✅ | Per‑suite rollups |
| `items[]` | ✅ | Per‑case results |
| `environment` | ◻️ | Agent/model/prompt/tools metadata |
| `compliance_mapping` | ◻️ | ISO/NIST mapping to evidence |
| `quality_flags` | ◻️ | Portability, redaction, large payloads |

### `quality_flags` (recommended fields)

| Field | Description |
|-------|-------------|
| `self_contained` | bundle is offline‑safe |
| `portable_paths` | no absolute/escape paths |
| `path_violations_count` | count of path violations |
| `missing_assets_count` | missing referenced assets |
| `large_payloads_count` | cases exceeding `warnBodyBytes` |
| `large_payloads` | list of large payload paths |

### `items[]` (per‑case summary)

| Field | Required | Description |
|-------|----------|-------------|
| `case_id` | ✅ | Case identifier |
| `title` | ✅ | Human‑readable title |
| `suite` | ◻️ | Case suite (`correctness`, `robustness`, etc.) |
| `case_status` | ✅ | `executed` / `filtered_out` / `missing` |
| `baseline_pass` / `new_pass` | ✅ | Pass/fail for each side |
| `baseline_root` / `new_root` | ✅ | Root cause codes |
| `preventable` | ◻️ | Whether failure was preventable |
| `policy_rules` | ◻️ | Policy rule IDs that fired |
| `risk_level` | ✅ | `low|medium|high|critical` |
| `gate_recommendation` | ✅ | `none|require_approval|block` |
| `assertions[]` | ◻️ | Assertion results per case |
| `assertions_baseline[]` | ◻️ | Assertion results for baseline |
| `assertions_new[]` | ◻️ | Assertion results for new |
| `security_signals[]` | ◻️ | Security signals detected |
| `artifacts` | ✅ | References to assets (manifest keys) |
| `data_availability` | ✅ | Availability status for baseline/new |

### `artifacts` (per‑case)

| Field | Required | Description |
|-------|----------|-------------|
| `baseline` | ✅ | Baseline artifact refs (by kind) |
| `new` | ✅ | New artifact refs (by kind) |
| `baseline_manifest_key` | ◻️ | Manifest key for baseline case bundle |
| `new_manifest_key` | ◻️ | Manifest key for new case bundle |

### `data_availability` (per‑case)

| Field | Required | Description |
|-------|----------|-------------|
| `baseline.status` | ✅ | `present` / `missing` |
| `new.status` | ✅ | `present` / `missing` |
| `baseline.reason_code` | ◻️ | reason for missing (e.g. `excluded_by_filter`) |
| `new.reason_code` | ◻️ | reason for missing |

### `assertions[]` (per‑case)

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Assertion name (`tool_required`, `json_schema`, etc.) |
| `pass` | ✅ | Whether assertion passed |
| `details` | ◻️ | Additional diagnostic info |

### `security_signals[]`

Core signal kinds:

- `untrusted_url_input`
- `high_risk_action`
- `secret_in_output`
- `pii_in_output`
- `prompt_injection_marker`
- `runner_failure_detected`
- `unknown`

Extended signal kinds (optional):

- `token_exfil_indicator`
- `policy_tampering`
- `unexpected_outbound`
- `permission_change`
- `data_exfiltration`
- `hallucination_in_output`
- `excessive_permissions`
- `unsafe_code_execution`
- `bias_detected`
- `compliance_violation`
- `model_refusal`
- `context_poisoning`

## Minimal Example (fragment)

```json
{
  "contract_version": 5,
  "report_id": "latest",
  "meta": {
    "toolkit_version": "1.4.0",
    "spec_version": "aepf-v1",
    "generated_at": 1771192614571,
    "run_id": "latest"
  },
  "summary": { "baseline_pass": 13, "new_pass": 8, "regressions": 5 },
  "summary_by_suite": { "correctness": { "baseline_pass": 9 } },
  "items": [
    {
      "case_id": "fmt_002",
      "title": "Return JSON: update_ticket_status payload",
      "suite": "correctness",
      "case_status": "executed",
      "baseline_pass": true,
      "new_pass": false,
      "risk_level": "low",
      "gate_recommendation": "require_approval",
      "assertions": [{ "name": "json_schema", "pass": false }],
      "artifacts": {
        "baseline": { "body": "baseline/fmt_002.json" },
        "new": { "body": "new/fmt_002.json" }
      },
      "data_availability": {
        "baseline": { "status": "present" },
        "new": { "status": "present" }
      }
    }
  ]
}
```

## Compatibility

- New fields are additive (schema is forward‑compatible).
- Validators must ignore unknown fields.

## Standard Readiness

- **Internal format**: 10/10 (fully implemented in toolkit).
- **Public standard**: 7/10.

To publish AEPF as an external standard, we still need:

1. Separate public spec repo (schema + RFC).
2. Conformance test suite (golden evidence packs).
3. Multi‑language validators (Python + Go).
4. RFC numbering and versioning policy.

## `artifacts/manifest.json` (Canonical)

The manifest is the **single source of truth** for evidence integrity.
Each item SHOULD include:

- `path` (portable relative path)
- `sha256` (content hash)
- `bytes`
- `media_type`

## Evidence Linking

Evidence references use `manifest_key` (not raw paths).  
HTML links are derived from the manifest mapping or embedded index.

## Verification

Use the built‑in verifier:

```bash
npm run pvip:verify
npm run pvip:verify:strict
```

Strict mode enforces:

- portable paths only
- hrefs within bundle
- manifest/hash consistency

## Status

This is **v1** of the spec, aligned to the current toolkit implementation.
Future versions will extend:

- security scanner plugins
- external adapters (Promptfoo, DeepEval)
- shared test case library
