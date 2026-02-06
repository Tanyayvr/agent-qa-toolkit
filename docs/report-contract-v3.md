<!-- /tool/docs/report-contract-v3.md -->
Report Contract v3 (Stage 1): Portable Evidence Pack + Compare Report + Security Signals
This document defines Report Contract v3 produced by the Evaluator (Stage 1).
It is designed for the wedge:
Incident → Portable Evidence Pack → RCA → Risk/Gate Decision
and includes a Security Signals Pack (signals may be empty in demo).
Report Contract v3 is the machine interface for:


CI gating and dashboards


triage workflows


sharing reproducible incident evidence with customers/integrators


Stage 2 governance enforcement (policy-as-code / approvals / runtime gates)



0. Normative scope (what is fixed vs queued)
MUST (v3 compliance)
The Evaluator output directory MUST contain:


report.html


compare-report.json (source of truth; this contract)


case-<case_id>.html (required for humans)


assets/ (self-contained copies of referenced payloads)


The report directory MUST be portable: copying the report directory to another machine must not break any links.
All href values stored in compare-report.json MUST be relative to the report directory and MUST resolve within it.
gate_recommendation is the single source of truth for CI gating.
security.<version>.requires_gate_recommendation is a compatibility field derived from gate_recommendation and MUST be identical for baseline/new (see 4.9).
For v3 reports, contract_version MUST be present and MUST equal 3.
For legacy v1 reports, contract_version MAY be omitted (see Backward compatibility).
Coverage MUST: compare-report.json.items[] MUST contain one item per case in the compared set (see 4.6). Cases MUST NOT be silently omitted from the report.
SHOULD (recommended for usability)
The report SHOULD include local raw copies of referenced run artifacts under:


baseline/ and new/ (within the report dir)


so that report links can point to local evidence (baseline/..., new/...) and remain fully self-contained.
If repro is present in compare-report.json, producers SHOULD include a local directory such as:


repro/ (within the report dir) containing the referenced files.


repro SHOULD be present for non-demo, non-empty runs (CI / incident reports).
INFORMATIONAL (do not use for resolving hrefs)
baseline_dir, new_dir, cases_path describe what was compared.
Consumers MUST NOT rely on them to resolve any href.

1. Outputs
Evaluator produces an output directory containing:


report.html (human report)


compare-report.json (machine report; this contract)


case-<case_id>.html (per-case replay diff; required for humans)


assets/ (self-contained copies of referenced payloads)


optionally baseline/ and new/ (local raw copies)


optionally repro/ (local repro pack files when repro is present)


The source of truth for integrations is compare-report.json.

2. Portability & resolution rules (MUST)
2.1 Href base
All href fields stored in compare-report.json MUST be relative to the report directory.
Consumers MUST resolve hrefs as:
absolute_path = join(report_dir, href)
Consumers MUST NOT resolve hrefs relative to repo root, baseline_dir, new_dir, or cases_path.
All href values MUST NOT:


contain path traversal segments (../ or ..\\)


start with / or \


contain :// (any URI scheme)


Note: This :// restriction applies to href fields. It does not prohibit URLs stored as data (e.g., security.signals[].details.urls).
2.2 Self-contained assets
If runner failure artifacts reference external payload files, evaluator MUST copy them into assets/
and link to those copies from compare-report.json and HTML pages.
2.3 No silent truncation
UI may display snippets, but full payload evidence MUST be available via asset links when captured.
2.4 Raw-copy href rule (MUST)
If any of the following hrefs are present:


baseline_case_response_href


new_case_response_href


baseline_run_meta_href


new_run_meta_href


they MUST point to files within the report directory (typically under baseline/ and new/ local copies).

3. Top-level schema: compare-report.json (v3)
3.1 JSON shape
{
  "contract_version": 3,

  "report_id": "latest",
  "baseline_dir": "apps/runner/runs/baseline/latest",
  "new_dir": "apps/runner/runs/new/latest",
  "cases_path": "cases/cases.json",

  "repro": {
    "bundle_manifest_href": "repro/manifest.json",
    "how_to_reproduce_href": "repro/how-to-reproduce.md"
  },

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
      "unknown": 0,
      "missing_case": 0
    },

    "security": {
      "total_cases": 0,
      "cases_with_signals_new": 0,
      "cases_with_signals_baseline": 0,
      "signal_counts_new": { "low": 0, "medium": 0, "high": 0, "critical": 0 },
      "signal_counts_baseline": { "low": 0, "medium": 0, "high": 0, "critical": 0 },
      "top_signal_kinds_new": [],
      "top_signal_kinds_baseline": []
    },

    "risk_summary": { "low": 0, "medium": 0, "high": 0 },
    "cases_requiring_approval": 0,
    "cases_block_recommended": 0,

    "data_coverage": {
      "total_cases": 0,
      "items_emitted": 0,
      "missing_baseline_artifacts": 0,
      "missing_new_artifacts": 0,
      "broken_baseline_artifacts": 0,
      "broken_new_artifacts": 0
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

      "data_availability": {
        "baseline": { "status": "present" },
        "new": { "status": "present" }
      },

      "baseline_pass": true,
      "new_pass": false,

      "baseline_root": "wrong_tool_choice",
      "new_root": "wrong_tool_choice",

      "preventable_by_policy": true,
      "recommended_policy_rules": ["Rule1"],

      "trace_integrity": {
        "baseline": { "status": "ok", "issues": [] },
        "new": { "status": "partial", "issues": ["missing_tool_result"] }
      },

      "security": {
        "baseline": { "signals": [], "requires_gate_recommendation": true },
        "new": {
          "signals": [
            {
              "kind": "untrusted_url_input",
              "severity": "high",
              "confidence": "medium",
              "title": "Untrusted URL input observed",
              "details": {
                "tool": "http_get",
                "call_id": "c50",
                "urls": ["https://example.com/redirect"]
              },
              "evidence_refs": [
                { "kind": "tool_call", "call_id": "c50" }
              ]
            }
          ],
          "requires_gate_recommendation": true
        }
      },

      "risk_level": "high",
      "risk_tags": ["untrusted_url_input", "regression"],
      "gate_recommendation": "require_approval",

      "governance_preview": {
        "baseline": { "recommendation": "none", "reason": "Optional diagnostic" },
        "new": { "recommendation": "require_approval", "reason": "High-risk signal + regression" }
      },

      "artifacts": {
        "replay_diff_href": "case-tool_001.html",

        "baseline_failure_body_href": "assets/baseline-tool_001-body.txt",
        "baseline_failure_meta_href": "assets/baseline-tool_001-meta.json",
        "new_failure_body_href": "assets/new-tool_001-body.txt",
        "new_failure_meta_href": "assets/new-tool_001-meta.json",

        "baseline_case_response_href": "baseline/tool_001.json",
        "new_case_response_href": "new/tool_001.json",
        "baseline_run_meta_href": "baseline/run.json",
        "new_run_meta_href": "new/run.json"
      }
    }
  ]
}


4. Field definitions
4.1 Top-level (MUST)
contract_version (number, MUST) — must be 3 for v3 reports
report_id (string, MUST)
baseline_dir (string, MUST) — informational only; must not be used to resolve hrefs
new_dir (string, MUST) — informational only; must not be used to resolve hrefs
cases_path (string, MUST) — informational only; must not be used to resolve hrefs
Backward compatibility (MUST)
Legacy v1 reports MAY omit contract_version; if contract_version is missing, consumers MUST treat the report as v1 (not v3).
Consumers MUST branch behavior by contract_version.
Unknown contract_version values MUST be treated as unsupported for CI gating.
v1/v2 consumers MUST ignore unknown fields.
4.2 repro (SHOULD)
repro SHOULD be present for non-demo, non-empty runs (CI / incident reports).
repro MAY be omitted only when no repro bundle was produced (e.g., demo or empty runs).
If present:
bundle_manifest_href (string, MUST)
how_to_reproduce_href (string, MUST)
All hrefs MUST resolve within the report directory.
4.3 summary (MUST)
baseline_pass (int, MUST)
new_pass (int, MUST)
regressions (int, MUST)
improvements (int, MUST)
root_cause_breakdown (object<string,int>, MUST)
root_cause_breakdown MUST include counts for any root cause kinds emitted by items (including missing_artifact if used).
4.3.1 summary.security (MUST; signals may be empty)
Aggregates across cases:
total_cases (int)
cases_with_signals_new (int)
cases_with_signals_baseline (int)
signal_counts_new (object with low/medium/high/critical ints)
signal_counts_baseline (same)
top_signal_kinds_new (string[], optional but recommended)
top_signal_kinds_baseline (string[], optional but recommended)
4.3.2 Summary risk & gating aggregates (MUST)
risk_summary (object, MUST): { "low": int, "medium": int, "high": int }
cases_requiring_approval (int, MUST)
cases_block_recommended (int, MUST)
4.3.3 summary.data_coverage (MUST)
Evaluators MUST surface data coverage as part of the report summary to prevent silent omissions.
Shape:
total_cases (int, MUST) — number of cases in the compared set
items_emitted (int, MUST) — number of items emitted (MUST equal total_cases for v3 compliance)
missing_baseline_artifacts (int, MUST)
missing_new_artifacts (int, MUST)
broken_baseline_artifacts (int, MUST)
broken_new_artifacts (int, MUST)
4.4 quality_flags (MUST)
self_contained (boolean) — true only if all referenced href targets exist within the report dir
portable_paths (boolean) — true only if no path violations were detected
missing_assets_count (int)
path_violations_count (int)
missing_assets (string[]) — list of missing href targets (with context)
path_violations (string[]) — list of violations (with context)
Diagnostics detail (SHOULD): entries in missing_assets[] and path_violations[] SHOULD include a machine-locatable field reference plus the offending value.
Examples:
items[0].artifacts.replay_diff_href=case-tool_001.html
items[3].artifacts.new_failure_body_href=assets/new-x-body.txt
baseline_dir=/Users/alice/...
items[2].artifacts.baseline_case_response_href=../baseline/tool_001.json
portable_paths truth tests (MUST)
portable_paths MUST be false if any stored string that represents a path/href:


starts with / or \


contains ../ or ..\\


contains :// (including file://, http://, https://)


Allowed examples (do not trigger violations):


assets/...


baseline/...


new/...


repro/...


case-<id>.html, report.html


Scope note (MUST): these truth tests apply only to fields that are semantically paths/hrefs: all href fields in this contract, and the top-level informational path fields baseline_dir, new_dir, and cases_path. These tests MUST NOT be applied to URLs stored as data (for example security.signals[].details.urls).
4.5 items[] coverage rule (MUST)
items[] MUST contain one entry per case in the compared set.
The compared set is defined by the Evaluator input (typically the cases file referenced by cases_path plus any CLI filtering).
Cases MUST NOT be silently omitted from items[] even if baseline/new artifacts are missing or broken.
If case artifacts are missing/broken, the Evaluator MUST still emit an item and express the condition via data_availability and conservative pass/fail outputs.
4.6 items[] (MUST)
Each item represents a single case comparison.
Required:
case_id (string, MUST)
title (string, MUST)
data_availability (object, MUST)
baseline_pass (boolean, MUST)
new_pass (boolean, MUST)
preventable_by_policy (boolean, MUST)
recommended_policy_rules (string[], MUST; can be empty)
trace_integrity (object, MUST)
security (object, MUST)
risk_level ("low" | "medium" | "high", MUST)
risk_tags (string[], MUST; can be empty)
gate_recommendation ("none" | "require_approval" | "block", MUST)
artifacts (object, MUST)
Optional (omit when absent; must not be undefined):
baseline_root (string)
new_root (string)
governance_preview (object)
4.6.1 case_id validity (MUST)
case_id MUST be a non-empty string.
case_id MUST NOT equal "undefined" (string) and MUST NOT be only whitespace.
case_id SHOULD be safe for filenames and URLs. Producers SHOULD restrict to:
letters, digits, underscore, dash, dot
Producers MUST ensure that case-<case_id>.html generation results in a valid filename and a resolvable href within the report directory.
4.7 data_availability (MUST)
data_availability declares whether baseline/new case artifacts were available and parseable for evaluation.
Shape:
{
  "baseline": { "status": "present|missing|broken", "reason": "optional" },
  "new": { "status": "present|missing|broken", "reason": "optional" }
}

Rules:
present means the artifact file existed and could be parsed for evaluation.
missing means the artifact file was not found.
broken means the artifact file existed but could not be parsed (e.g., invalid JSON, truncated output).
If either side is missing or broken, the Evaluator MUST still emit the item and SHOULD prefer conservative values:


baseline_pass SHOULD be false when baseline is missing/broken


new_pass SHOULD be false when new is missing/broken


trace_integrity.<version>.status SHOULD be broken for missing/broken sides


risk_level SHOULD be at least medium when the new side is missing/broken (because CI cannot trust outputs)


4.8 trace_integrity (MUST)
Shape:
{
  "baseline": { "status": "ok|partial|broken", "issues": ["..."] },
  "new": { "status": "ok|partial|broken", "issues": ["..."] }
}

status MUST be one of: ok, partial, broken
Recommended issue codes (non-exhaustive):


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


4.9 security (MUST; signals may be empty)
Per version (shape preserved for v1 compatibility):
{
  "baseline": { "signals": [], "requires_gate_recommendation": false },
  "new": { "signals": [], "requires_gate_recommendation": false }
}

Signals items:
{
  "kind": "untrusted_url_input|token_exfil_indicator|policy_tampering|unexpected_outbound|high_risk_action|permission_change|secret_in_output|connector_autoconnect|...",
  "severity": "low|medium|high|critical",
  "confidence": "low|medium|high",
  "title": "Short human-readable label",
  "details": {
    "tool": "optional",
    "call_id": "optional",
    "action_id": "optional",
    "fields": ["optional"],
    "urls": ["optional"],
    "notes": "optional"
  },
  "evidence_refs": [
    { "kind": "tool_result", "call_id": "c50" },
    { "kind": "retrieval_doc", "id": "doc-123" }
  ]
}

Evidence reference precision (MUST/SHOULD)
security.signals[].evidence_refs[].kind MUST be one of the EvidenceRef kinds defined in tool/docs/agent-artifact-contract-v1.md.
Producers SHOULD choose the most specific available EvidenceRef kind. For retrieval-query related detections, producers SHOULD reference retrieval-specific evidence (retrieval events, retrieval docs, or other retrieval evidence kinds) when available, rather than using unrelated evidence kinds.
Derived rule (MUST; compatibility field)
security.baseline.requires_gate_recommendation and security.new.requires_gate_recommendation MUST:


be identical, and


be derived from item-level gate_recommendation:


gate_recommendation == "none" → false
gate_recommendation in {"require_approval","block"} → true
This field exists for v1 shape compatibility and must not be interpreted as per-version gating.
4.10 Risk fields (MUST)
risk_level is the aggregated case risk for CI gating.
risk_tags MAY include security.signals[].kind values, but is not limited to them (e.g., operational/rule tags).
4.11 gate_recommendation (MUST)
gate_recommendation is the single CI truth:


none


require_approval


block


4.12 governance_preview (optional)
If present:
{
  "baseline": { "recommendation": "none|warn|require_approval|block", "reason": "..." },
  "new": { "recommendation": "none|warn|require_approval|block", "reason": "..." }
}

If governance_preview is present, then:
gate_recommendation MUST equal governance_preview.new.recommendation mapped to {none, require_approval, block}.
Mapping:
none → none
warn → require_approval
require_approval → require_approval
block → block
4.13 artifacts (MUST)
replay_diff_href (string, MUST)
Failure asset hrefs (optional; only present if captured):


baseline_failure_body_href (string)


baseline_failure_meta_href (string)


new_failure_body_href (string)


new_failure_meta_href (string)


Raw evidence hrefs (optional; if present MUST point inside report dir):


baseline_case_response_href (string)


new_case_response_href (string)


baseline_run_meta_href (string)


new_run_meta_href (string)


All hrefs MUST be relative to the report dir and MUST resolve within it.

5. Compatibility rules
New optional fields may be added in v3 without changing meaning.
Existing fields MUST NOT change meaning.
Unknown fields should be ignored by consumers within a known contract version.
Producers MUST avoid emitting undefined fields; omit absent fields instead.

6. Minimal compliance checklist
A report is v3-compliant if:


compare-report.json includes contract_version: 3, summary, quality_flags, and items[]


all hrefs are relative to the report dir, contain no traversal segments, and contain no schemes


copying the report directory preserves all links (portable)


quality_flags.self_contained accurately reflects presence of all referenced targets


quality_flags.portable_paths is accurate per truth tests (scope-restricted to path/href fields)


items[] contains one item per case in the compared set (no silent omissions)


summary.data_coverage.items_emitted == summary.data_coverage.total_cases


case_id is non-empty and not "undefined"


trace_integrity exists for each case item


security exists for each case item (signals may be empty)


gate_recommendation, risk_level, risk_tags exist for each case item


security.<version>.requires_gate_recommendation is identical for baseline/new and derived from gate_recommendation
