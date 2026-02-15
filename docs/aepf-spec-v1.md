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
| `security_signals[]` | ◻️ | Security signals detected |
| `artifacts` | ✅ | References to assets (manifest keys) |
| `data_availability` | ✅ | Availability status for baseline/new |

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
