PVIP Compare Report Contract (Core): compare-report.json (Machine Truth)

This document defines the PVIP Core machine contract for compare-report.json.
It specifies the fixed JSON shape, required fields, enums, conditional MUST rules, and semantic validation rules.

This contract is designed for the wedge:

Incident / Regression → PVIP Bundle → Offline Triage & RCA → Gate / Risk Decision

compare-report.json is the canonical machine truth for a PVIP bundle.

0. Contract layers: Core vs Profiles (normative)

PVIP Compare Report is explicitly layered:

- Core (MUST): minimal offline, cross-tool machine truth for triage and evidence resolution.
- Profiles (MAY; profile-scoped MUSTs): additional semantics such as security signals, policy/governance, and gating recommendations.
  Profile requirements become MUST only when the corresponding profile is declared and/or validation_mode requires it.

Core compliance MUST NOT require policy/governance/security/gating semantics.

0. Normative scope
0.1 MUST (Core compliance)

A PVIP bundle MUST include a root-level file:

compare-report.json — canonical machine report

compare-report.json MUST:

be valid JSON,

be self-contained as a machine document (no required external services),

reference evidence only via manifest_key (no raw file paths for evidence),

contain one items[] entry per case in the compared set (no silent omissions),

satisfy all schema and semantic rules in this document.

0.2 Canonical truth (MUST)

compare-report.json is the only canonical machine truth for integrations.

HTML pages are view-only and MUST NOT contain unique required semantics not represented in compare-report.json.

1. Top-level structure (Core MUST)
1.1 JSON shape

compare-report.json MUST be an object with these top-level keys:

contract_version (number, MUST)

report_id (string, MUST)

producer (object, MUST)

profiles_declared (string[], MUST)

summary (object, MUST)

items (array, MUST)

Optional top-level keys (MAY be omitted entirely):

repro (object, SHOULD for non-demo, non-empty runs)

external_references (array, MAY; optional-only, non-evidence)

producer_claims (object, MAY; non-authoritative hints only)

notes (string, MAY)
baseline_dir (string, MAY; path-like pointer; PortablePath-scanned when present)
new_dir (string, MAY; path-like pointer; PortablePath-scanned when present)
cases_path (string, MAY; path-like pointer; PortablePath-scanned when present)
1.2 contract_version (MUST)

contract_version MUST be present and MUST be an integer.

For this contract document:

contract_version MUST equal 1.

Unknown contract_version values:

Consumers MUST treat unknown versions as unsupported for CI gating.

2. Required top-level fields (Core MUST)
2.1 report_id (MUST)

report_id MUST be a non-empty string.

2.2 producer (MUST)

producer MUST be an object that identifies what produced the report.

Shape (Core MUST):

{
  "name": "string",
  "version": "string",
  "build": {
    "commit": "string",
    "build_id": "string",
    "built_at": "string"
  }
}


Rules (Core MUST):

producer.name MUST be non-empty.

producer.version MUST be non-empty.

producer.build MUST be present.

producer.build.built_at MUST be ISO 8601 date-time string.

2.3 profiles_declared (MUST)

profiles_declared MUST be a non-empty array of strings.

Rules (Core MUST):

profiles_declared MUST include "core".

If any non-core profile is declared, it MUST NOT change Core meanings; it may only add stricter requirements.

3. Evidence reference model: manifest_key only (Core MUST)
3.1 EvidenceRef (Core MUST)

Any reference to evidence payloads (tool results, runner outputs, traces, diffs, assets, media, logs) MUST be expressed using a manifest_key reference object.

Canonical EvidenceRef shape (Core MUST):

{ "manifest_key": "string", "kind": "string", "label"?: "string" }


Rules (Core MUST):

manifest_key MUST be a non-empty string.

kind MUST be a non-empty string (producer-defined but stable).

label MAY be omitted; if present must be string.

3.2 Forbidden evidence forms (Core MUST)

The contract MUST NOT require (and producers MUST NOT emit as required evidence references):

absolute file paths,

OS-specific paths,

relative file paths outside the bundle,

URLs (http/https/file/etc) as evidence.

Paths/URLs MAY appear only in external_references[] and MUST NOT be required.

4. summary (Core MUST)
4.1 summary shape (MUST)

summary MUST be an object with:

total_cases (int, MUST)

items_emitted (int, MUST)

executed_cases (int, MUST)

skipped_cases (int, MUST)

filtered_out_cases (int, MUST)

baseline_pass_count (int, MUST)

new_pass_count (int, MUST)

regressions (int, MUST)

improvements (int, MUST)

data_coverage (object, MUST)


4.2 Coverage invariants (Core MUST)

summary.items_emitted MUST equal summary.total_cases.

summary.executed_cases + summary.skipped_cases + summary.filtered_out_cases MUST equal summary.total_cases.

4.3 risk_summary (MUST)

Shape:

{ "low": 0, "medium": 0, "high": 0 }


Rules:

values MUST be integers >= 0

sum MUST equal summary.total_cases

4.4 data_coverage (MUST)

summary.data_coverage MUST surface missing/broken inputs to prevent silent omissions.

Shape (Core MUST):

{
  "missing_baseline_artifacts": 0,
  "missing_new_artifacts": 0,
  "broken_baseline_artifacts": 0,
  "broken_new_artifacts": 0
}


Rules:

all values MUST be integers >= 0

4.5 Profile-scoped summary aggregates (MUST NOT be Core-required)

The following summary aggregates MUST NOT be required for Core compliance:
- root_cause_breakdown
- risk_summary
- cases_requiring_approval
- cases_block_recommended
If present, they MUST be treated as profile-scoped outputs and MUST NOT affect Core validity unless the relevant profile is declared/required.

5. producer_claims (Optional-only, non-authoritative)
5.1 producer_claims shape (MAY)

producer_claims MAY include convenience booleans and diagnostics such as:
- self_contained (boolean)
- portable_paths (boolean)
- missing_assets_count (int)
- path_violations_count (int)
- missing_assets (string[])
- path_violations (string[])

Rules (Core MUST):
- producer_claims is OPTIONAL and NON-AUTHORITATIVE.
- The source of truth for Core validity is the validator output, not producer_claims.
- If producer_claims contradict validator findings, validator results are canonical.


6. items[] coverage rule (Core MUST)
6.1 Coverage (MUST)

items[] MUST contain one entry per case in the compared set.

Cases MUST NOT be silently omitted even if:

skipped,

filtered out,

baseline/new artifacts are missing or broken.

6.2 Determining the compared set (Core MUST)

The compared set MUST be defined by the evaluator input (cases source + filtering rules), but regardless of filtering the report MUST account for the full compared set.

summary.total_cases MUST equal the compared set size.

7. items[] schema (Core MUST)

Each item represents exactly one case.

7.1 Required item fields (MUST)

Each items[i] MUST contain:

case_id (string, MUST)

title (string, MUST)

case_status (string enum, MUST)

case_status_reason (string, conditional MUST; see §7.3)

data_availability (object, MUST)

baseline_pass (boolean, MUST)

new_pass (boolean, MUST)

diff_status (string enum, MUST)

baseline_root (string, MAY)

new_root (string, MAY)

trace (object, MUST)

delta_summary (object, conditional MUST; see §9)

failure_summary (object, conditional MUST; see §10)

artifacts (object, MUST)
7.1A Profile-scoped item fields (MUST NOT be Core-required)

The following per-item fields MUST NOT be required for Core compliance:
- preventable_by_policy
- recommended_policy_rules
- security
- risk_level
- risk_tags
- gate_recommendation
If present, they MUST be treated as profile-scoped outputs and MUST NOT affect Core validity unless the relevant profile is declared/required.


7.2 case_id validity (MUST)

case_id MUST be a non-empty string.

case_id MUST NOT equal "undefined".

case_id MUST NOT be only whitespace.

case_id MUST NOT contain "/" or "\".

case_id MUST NOT contain any ".." path segment.

Producers SHOULD restrict to: letters, digits, underscore, dash, dot.


7.3 case_status (MUST)

Enum (Core MUST):

executed

skipped

filtered_out

Rules (Core MUST):

If case_status != executed, then case_status_reason MUST be present and MUST be a short machine-readable reason code string.

If case_status == executed, case_status_reason MAY be omitted.

7.4 diff_status (MUST)

Enum (Core MUST):

regression

improvement

unchanged

unknown

Rules (Core MUST):

unknown means classification was not possible due to missing/broken inputs or insufficient conditions.

unknown MUST NOT be used to bypass conditional MUST requirements that are triggered by execution and pass/fail outcomes (see §10).

8. data_availability (Core MUST)
8.1 Shape (MUST)
{
  "baseline": {
    "status": "present|missing|broken",
    "reason_code": "string",
    "reason": "string",
    "details": {}
  },
  "new": {
    "status": "present|missing|broken",
    "reason_code": "string",
    "reason": "string",
    "details": {}
  }
}


Rules (Core MUST):

status MUST be one of present, missing, broken.

reason_code, reason, details are optional; if absent they MUST be omitted (not undefined).

Status meanings (Core MUST):

present: artifact existed and was parseable for evaluation.

missing: artifact not found / not produced / not included.

broken: artifact existed but unparseable or unusable.

8.2 Conservative defaults (Core SHOULD)

If either side is missing or broken:

that side’s pass SHOULD be false.

diff_status SHOULD be unknown unless classification is still valid with remaining evidence.

9. delta_summary (Core conditional MUST)
9.1 When delta_summary MUST be present

If:

case_status == "executed" AND

diff_status is one of regression, improvement, unchanged

then delta_summary MUST be present.

If diff_status == "unknown", delta_summary MAY be omitted.

9.2 delta_summary shape (MUST when present)
{
  "what_changed": "string",
  "root_cause": "string",
"evidence": [ { "manifest_key": "string", "kind": "string", "label"?: "string" } ]
}


Rules:

what_changed MUST be non-empty.

root_cause MUST be non-empty (or "unknown" if not attributable).

evidence MUST be an array.

Evidence completeness rule (Core MUST):

If diff_status is regression or improvement AND data_availability.baseline.status=="present" AND data_availability.new.status=="present":

delta_summary.evidence MUST be non-empty.

All evidence entries MUST use manifest_key (no paths).

10. failure_summary (Core conditional MUST)
10.1 When failure_summary MUST be present

If:

case_status == "executed" AND

(baseline_pass == false OR new_pass == false)

then failure_summary MUST be present.

If case_status != executed:

failure_summary MAY be omitted.

10.2 failure_summary shape (MUST when present)
{
  "baseline": { "class": "string", "details": {} },
  "new": { "class": "string", "details": {} }
}


Rules (Core MUST):

class MUST be present for any side where a failure occurred.

Allowed class values (Core MUST set):

http_error

timeout

network_error

invalid_json

tool_error

other

details MAY include:

http_status (number)

timeout_ms (number)

attempts (number)

note (string)

Consistency rule (Core MUST):

If failure_summary.<side>.class is present, it MUST be consistent with:

data_availability.<side>.status and any reason_code.

11. trace (Core MUST)
11.1 trace shape (MUST)

trace MUST be an object. Minimal required shape:

{
  "baseline": { "status": "ok|partial|broken", "issues": ["string"] },
  "new": { "status": "ok|partial|broken", "issues": ["string"] }
}


Rules (Core MUST):

status MUST be ok, partial, or broken.

issues MUST be an array (may be empty).

12. security (Profile-scoped; MUST NOT be Core-required)

security is a profile-scoped optional section.

Core rule (MUST):
- security MUST NOT be required for Core compliance.
- security MAY be omitted entirely in Core-only bundles.
- If security is present, it MUST conform to the shape and rules below (profile validation), but its absence MUST NOT affect Core validity.

12.1 security shape (Profile MUST when declared/required; otherwise MAY)

security MUST be an object:

{
  "signals": [
    {
      "kind": "string",
      "severity": "low|medium|high|critical",
      "confidence": "low|medium|high",
      "title": "string",
      "details": {},
      "evidence_refs": [ { "manifest_key": "string", "kind": "string", "label": "string" } ]
    }
  ]
}

Rules (Profile MUST when declared/required; otherwise MAY):

signals MUST be present (may be empty).

severity MUST be one of: low, medium, high, critical.

confidence MUST be one of: low, medium, high.

evidence_refs entries MUST reference evidence via manifest_key (no paths/URLs).
details MUST NOT require URLs; URLs MAY exist as data but MUST NOT be dereferenced by viewer.


13. risk & gating (Profile-scoped; MUST NOT be Core-required)

13.1 risk_level (MUST)

Enum:

low

medium

high

13.2 gate_recommendation (MUST)

Enum:

none

require_approval

block

Rule (Core MUST):

PVIP Core does not prescribe gate policy truth. gate_recommendation, if present, is profile-scoped guidance only.

14. artifacts (Core MUST)
14.1 artifacts shape (MUST)

artifacts MUST be an object containing references to derived HTML and any captured payload artifacts, using manifest_key references.

Required:

Required (conditional MUST):

replay_diff_ref (EvidenceRef, conditional MUST) — points to a derived per-case replay/view artifact (e.g., case-<case_id>.html or equivalent).

Rules (Core MUST):
- If case_status=="executed" AND a per-case replay/view artifact is emitted in the bundle, replay_diff_ref MUST be present.
- If case_status!="executed" (skipped|filtered_out), replay_diff_ref MAY be omitted.
Fields (Core):

- replay_diff_ref (EvidenceRef, MAY) — points to a derived per-case replay/view artifact (e.g., case-<case_id>.html or equivalent).

Optional (MAY be omitted):

- baseline_failure_body_ref (EvidenceRef)
- baseline_failure_meta_ref (EvidenceRef)
- new_failure_body_ref (EvidenceRef)
- new_failure_meta_ref (EvidenceRef)


Rules (Core MUST):

If a ref field is present, it MUST be an EvidenceRef with manifest_key.

No artifact ref may be a raw path or URL.

15. repro envelope (Core conditional MUST)
15.1 repro (top-level) (SHOULD)

repro SHOULD be present for non-demo, non-empty runs.

If present (Core MUST):

{
  "mode": "none|partial|deterministic",
  "inputs": { "manifest_keys": ["string"] },
  "known_nondeterminism": ["string"],
  "determinism_checks": ["string"],
  "env_requirements": ["string"],
  "critical_checks": [ { "name": "string", "pass": true, "note": "string" } ]
}


Rules:

mode MUST be one of none|partial|deterministic.

inputs.manifest_keys MUST be present; must contain at least 1 key.

arrays MUST exist (may be empty) except inputs.manifest_keys which MUST be non-empty.

Deterministic mode rule (Core MUST):

if mode=="deterministic", then critical_checks MUST exist and every entry MUST have pass==true.

Partial mode rule (Core MUST):

if mode=="partial", entries in known_nondeterminism MUST be scoped (not generic).

All keys in inputs.manifest_keys MUST resolve via manifest.

16. external_references (Optional-only, Core MAY)
16.1 external_references shape (MAY)
[
  { "type": "string", "value": "string", "note": "string" }
]


Rules (Core MUST):

MUST be optional.

MUST NOT be required for interpretation.

MUST NOT be used as evidence.

Viewer MUST NOT auto-fetch/dereference.

If any entry is marked required (by any field), Core MUST be invalid.

Portability scan surface (Core MUST)

PortablePath checks MUST be applied to the following designated path/href fields in compare-report.json:

• Any JSON field name ending with "_href" or "_path" anywhere in the document, at any nesting depth (deep traversal).

• The explicitly enumerated path-like pointers when present:
  - baseline_dir, new_dir, cases_path (top-level),
  - items[].baseline_root and items[].new_root (per-item).


Rules (Core MUST):

Any PortablePath violation in the designated path/href fields above MUST make Core invalid.

external_references[].value MAY contain URLs/IDs and is exempt from Core invalidation by PortablePath, but MUST be treated as optional-only and MUST NOT be treated as evidence.

manifest_key values MUST be treated as opaque identifiers (not paths); PortablePath rules apply to paths/hrefs, not to manifest_key strings.

18. Semantic validation rules (Core MUST)

Validator MUST enforce at least:

profiles_declared includes "core".

Coverage:

summary.items_emitted == summary.total_cases

items.length == summary.total_cases

case_status enum correctness.

If case_status != executed → case_status_reason present.

If case_status==executed AND (baseline_pass==false OR new_pass==false) → failure_summary present.

If case_status==executed AND diff_status ∈ {regression, improvement, unchanged} → delta_summary present.

If regression/improvement AND both sides present → delta_summary.evidence non-empty.

All EvidenceRefs in Core-required locations:

- delta_summary.evidence[].manifest_key
- items[].artifacts.*_ref.manifest_key (for any present *_ref fields)
- repro.inputs.manifest_keys[]

Rules (Core MUST):
- Every such manifest_key MUST be non-empty and MUST resolve via artifacts/manifest.json to an existing local file.

EvidenceRefs in profile-scoped sections (e.g., security) MUST be validated only when the relevant profile is declared and/or validation_mode requires it, and MUST NOT affect Core validity otherwise.


Deterministic repro:

mode=deterministic requires critical_checks all pass.

PortablePath:

invalidates Core on any PortablePath violation in the designated JSON scan surface (deep traversal of all *_href/*_path plus enumerated path-like pointers); violations in external_references[].value MUST be reported but MUST NOT be used as evidence and MUST NOT satisfy any Core requirement.

Profile boundary (Core MUST)

Validator MUST NOT require profile-scoped fields (security/policy/risk/gating) for Core validity.
Producer-emitted flags/claims (producer_claims) MUST NOT be treated as the source of truth for Core validity.


19. Minimal compliance checklist (Core)

A report is Core-compliant if:

compare-report.json exists at bundle root and parses.

contract_version==1.

profiles_declared includes "core".

summary.total_cases == items.length == summary.items_emitted.

Every case in compared set is represented as an item (no silent omissions).

Every item has required fields and correct enums.

Conditional MUSTs are satisfied (case_status_reason, failure_summary, delta_summary).

All evidence references MUST reference evidence via manifest_key (no paths/URLs) and MUST resolve via artifacts/manifest.json to an existing local file.

Profile-scoped fields (security/policy/risk/gating) MAY be present but are not required for Core compliance.

Producer claims/flags (producer_claims) MAY be present but are not required and are non-authoritative.

PortablePath violations do not exist in required scan surface.
