<!-- /tool/docs/report-contract-v1.md -->

# Report Contract v1 (Stage 1): Compare Report + Security Signals Pack

This document defines the **Report Contract v1** produced by the Evaluator (Stage 1).
It is intentionally designed to support the fastest wedge for agent security incidents:
**Incident → Deterministic Repro Bundle → RCA → (Preview) Gate Recommendation**, including a
**Security Signals Pack** (even if detectors are initially empty in demo).

Report Contract v1 is the machine-readable interface for:
- CI gating and dashboards
- triage workflows
- sharing reproducible incident evidence with customers/integrators
- future Stage 2 governance enforcement (policy-as-code / approvals / runtime gates)

---

## 1. Outputs

Evaluator produces an output directory:

- `report.html` (human report)
- `compare-report.json` (machine report; this contract)
- `case-<case_id>.html` (per-case replay diff; optional for automation but required for humans)
- `assets/` (self-contained copies of referenced failure payloads)

The **source of truth** for integrations is `compare-report.json`.

---

## 2. Norms (Must-haves)

### 2.1 Portability
- All paths stored in `compare-report.json` MUST be **relative** to repo root or to the report directory.
- Reports MUST be **portable**: copying the report directory to another machine must not break links.

### 2.2 Self-contained assets
If runner failure artifacts reference external payload files, evaluator MUST copy them into `assets/`
and link to those copies from `compare-report.json` and HTML pages.

### 2.3 No silent truncation
UI may display snippets, but **full payload evidence must be available** via asset links when captured.

---

## 3. Top-level Schema: compare-report.json

### 3.1 JSON shape
```json
{
  "report_id": "latest",
  "baseline_dir": "apps/runner/runs/baseline/latest",
  "new_dir": "apps/runner/runs/new/latest",
  "cases_path": "cases/cases.json",

  "summary": {
    "baseline_pass": 0,
    "new_pass": 0,
    "regressions": 0,
    "improvements": 0,

    "root_cause_breakdown": {
      "format_violation": 0,
      "wrong_tool_choice": 0,
      "missing_required_data": 0,
      "hallucination_signal": 0,
      "tool_failure": 0,
      "unknown": 0
    },

    "security": {
      "total_cases": 0,
      "cases_with_signals_new": 0,
      "cases_with_signals_baseline": 0,
      "signal_counts_new": {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 0
      },
      "signal_counts_baseline": {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 0
      },
      "top_signal_kinds_new": [],
      "top_signal_kinds_baseline": []
    }
  },

  "quality_flags": {
    "self_contained": true,
    "portable_paths": true,
    "missing_assets_count": 0,
    "path_violations_count": 0,

    "missing_assets": [],
    "path_violations": []
  },

  "items": [
    {
      "case_id": "tool_001",
      "title": "Must use get_customer before creating ticket",

      "baseline_pass": true,
      "new_pass": false,

      "baseline_root": "wrong_tool_choice",
      "new_root": "wrong_tool_choice",

      "preventable_by_policy": true,
      "recommended_policy_rules": ["Rule1"],

      "trace_integrity": {
        "baseline": {
          "status": "ok",
          "issues": []
        },
        "new": {
          "status": "partial",
          "issues": ["missing_tool_result"]
        }
      },

      "security": {
        "baseline": {
          "signals": [],
          "requires_gate_recommendation": false
        },
        "new": {
          "signals": [],
          "requires_gate_recommendation": false
        }
      },

      "artifacts": {
        "replay_diff_href": "case-tool_001.html",

        "baseline_failure_body_href": "assets/...",
        "baseline_failure_meta_href": "assets/...",
        "new_failure_body_href": "assets/...",
        "new_failure_meta_href": "assets/...",

        "baseline_case_response_href": "baseline/tool_001.json",
        "new_case_response_href": "new/tool_001.json",
        "baseline_run_meta_href": "baseline/run.json",
        "new_run_meta_href": "new/run.json"
      }
    }
  ]
}
4. Field Definitions
4.1 Top-level

report_id (string, MUST)

baseline_dir (string, MUST) — relative path to baseline run directory

new_dir (string, MUST) — relative path to new run directory

cases_path (string, MUST) — relative path to cases JSON

4.2 summary (MUST)

baseline_pass (int, MUST)

new_pass (int, MUST)

regressions (int, MUST)

improvements (int, MUST)

root_cause_breakdown (object<string,int>, MUST)

4.2.1 summary.security (MUST in Sprint 1; signals may be empty)

Aggregates across cases.

total_cases (int)

cases_with_signals_new (int)

cases_with_signals_baseline (int)

signal_counts_new (object with low/medium/high/critical ints)

signal_counts_baseline (same)

top_signal_kinds_new (string[], optional but recommended)

top_signal_kinds_baseline (string[], optional but recommended)

4.3 quality_flags (MUST)

self_contained (boolean) — true only if all referenced assets exist in assets/

portable_paths (boolean) — true only if no absolute paths were detected

missing_assets_count (int)

path_violations_count (int)

missing_assets (string[]) — list of missing asset hrefs (relative)

path_violations (string[]) — list of detected absolute path strings (or file locations)

4.4 items[] (MUST)

Each item represents a single case comparison.

Required:

case_id (string)

title (string)

baseline_pass (boolean)

new_pass (boolean)

Optional (only present when relevant; must not be undefined):

baseline_root (string)

new_root (string)

Stage 1 RCA / policy preview:

preventable_by_policy (boolean, MUST)

recommended_policy_rules (string[], MUST; can be empty)

4.4.1 trace_integrity (MUST in Sprint 1)

Provides “can we prove the chain?” signals.

Shape:

{
  "baseline": { "status": "ok|partial|broken", "issues": ["..."] },
  "new": { "status": "ok|partial|broken", "issues": ["..."] }
}


status MUST be one of: ok, partial, broken

issues is a list of enumerated issue codes (strings)

Recommended issues codes (non-exhaustive):

no_events

missing_timestamps

non_monotonic_timestamps

missing_call_id

duplicate_call_id

tool_result_without_call

tool_call_without_result

retrieval_required_missing

evidence_ref_missing_target

unknown_event_type

events_not_array

4.4.2 security (MUST in Sprint 1; signals may be empty)

Security Signals Pack per case, by version.

Shape:

{
  "baseline": { "signals": [], "requires_gate_recommendation": false },
  "new": { "signals": [], "requires_gate_recommendation": false }
}


signals[] items are objects:

{
  "kind": "untrusted_url_input|token_exfil_indicator|policy_tampering|unexpected_outbound|high_risk_action|permission_change|secret_in_output|connector_autoconnect|...",
  "severity": "low|medium|high|critical",
  "confidence": "low|medium|high",
  "title": "Short human-readable label",
  "details": {
    "tool": "optional",
    "call_id": "optional",
    "action_id": "optional",
    "fields": ["optional list of suspicious fields"],
    "urls": ["optional list of urls/hosts"],
    "notes": "optional"
  },
  "evidence_refs": [
    { "kind": "tool_result", "call_id": "c50" },
    { "kind": "retrieval_doc", "id": "doc-123" }
  ]
}


Notes:

Signals MAY be empty in demo.

requires_gate_recommendation is a Stage 1 preview boolean:

true when severity is high/critical and the case is a regression or contains high-risk actions.

false otherwise.

4.4.3 artifacts (MUST)

replay_diff_href (string, MUST)

Failure asset hrefs (optional; only present if runner_failure captured payloads):

baseline_failure_body_href (string)

baseline_failure_meta_href (string)

new_failure_body_href (string)

new_failure_meta_href (string)

Recommended (SHOULD) for usability:

baseline_case_response_href (string) — link to raw baseline case JSON

new_case_response_href (string) — link to raw new case JSON

baseline_run_meta_href (string) — link to baseline run.json

new_run_meta_href (string) — link to new run.json

All hrefs MUST be relative and MUST resolve within the report directory after copy.

5. Stage 2 / Stage 3 reserved fields (optional now, planned later)

These fields MAY be added later without breaking v1:

5.1 env_snapshot (top-level)
{
  "agent": { "name": "...", "version": "...", "commit": "..." },
  "runner": { "version": "...", "commit": "..." },
  "evaluator": { "version": "...", "commit": "..." },
  "model": { "provider": "...", "id": "...", "params": {} },
  "policies": { "policy_version": "...", "skills_version": "...", "tool_schema_version": "..." }
}

5.2 nondeterminism_sources (per case, per version)
{
  "baseline": ["time", "external_http", "unrecorded_retrieval"],
  "new": ["external_http"]
}

5.3 governance_preview (per case, per version)
{
  "baseline": { "recommendation": "none|warn|require_approval|block", "reason": "..." },
  "new": { "recommendation": "require_approval", "reason": "..." }
}

6. Compatibility rules

New optional fields may be added without changing v1.

Existing fields MUST NOT change meaning.

Unknown fields should be ignored by consumers.

Producers MUST avoid emitting undefined fields; omit absent fields instead.

7. Minimal compliance checklist

A report is v1-compliant if:

compare-report.json matches the top-level schema and includes summary, quality_flags, and items[]

all hrefs are relative and resolvable after copying the report directory

quality_flags.self_contained is accurate based on actual assets present in assets/

security sections exist (signals may be empty initially)

trace_integrity sections exist (even if status is ok and issues empty)