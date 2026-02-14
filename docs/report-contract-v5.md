<!-- /tool/docs/report-contract-v5.md -->
Report Contract v5 (Stage 1): Portable Evidence Pack + Compare Report + Offline Viewer Rules

This document defines Report Contract v5 produced by the Evaluator (Stage 1).
It is designed for:
Incident → Portable Report → RCA Support → Risk/Gate Decision

Core goals:
- Zero-click minimum offline view (summary + items list + navigation).
- Evidence links derived from manifest_key using a mapping derived from artifacts/manifest.json.
- No dependency on network or local server.
- Redaction transparency and integrity preservation when sanitization is applied.

0. Normative scope
MUST (v5 compliance)
- report.html, compare-report.json exist.
- artifacts/manifest.json exists and is the canonical evidence mapping.
- assets/ (or equivalent evidence directory referenced by manifest) exists.
- report directory is portable (copyable; links still resolve).
- contract_version MUST be present and equal 5.
- compare-report.json.items[] MUST include one item per case in the compared set (no silent omissions).
- Evidence references in JSON MUST use manifest_key (no raw paths).
- HTML evidence links MUST be derived from manifest_key using an available mapping.
- If redaction is applied, the bundle MUST remain valid and verifiable offline via the manifest.

SHOULD
- case-<case_id>.html (per-case replay diff) is produced for human triage.
- Embedded thin index mapping in report.html (for zero-click evidence links).
- artifacts/redaction-summary.json is produced when redaction_status=applied (see 4.3).

MAY
- File API loader to supply mapping at runtime.

Reference implementation MUST:
- embed thin index mapping in report.html.
- emit case-<case_id>.html for all cases.

1. Outputs
Evaluator produces:
- report.html (human report)
- compare-report.json (machine report; source of truth)
- case-<case_id>.html (per-case replay diff; SHOULD, MUST for reference impl)
- assets/ (self-contained payloads; or equivalent directory referenced by manifest)
- optionally baseline/, new/ (local raw copies)
- optionally repro/ (if compare-report.json.repro exists)
- artifacts/manifest.json (evidence manifest; canonical)

2. Portability rules (MUST)
All portable path fields stored in compare-report.json MUST be:
- relative to the report directory
- resolve within it
- contain no ../ or ..\\
- not start with / or \\
- contain no :// scheme

Portable path fields include:
- all *href fields
- top-level baseline_dir, new_dir, cases_path
- manifest paths (artifacts/manifest.json and any manifest rel_path values)

Note: This rule applies to path/href fields only. URLs may appear as data (e.g., security.signals[].details.urls).

3. Offline viewer rules (MUST)
3.1 Minimum view
report.html MUST render summary + items list + navigation when opened via file:// without user action.

3.2 Evidence links
Evidence links in HTML MUST be produced only when a mapping from manifest_key to relative path is available.
If mapping is unavailable, the UI MUST show evidence presence indicators but MAY omit clickable links.

3.3 Mapping sources
Mapping MUST be derived from artifacts/manifest.json.
Mapping MAY be supplied via:
- embedded thin index in report.html (SHOULD)
- File API load (MAY)
Viewer MUST NOT require a local server and MUST NOT perform network requests.

4. Manifest and mapping
4.1 artifacts/manifest.json (source of truth)
The manifest defines evidence objects keyed by manifest_key.
manifest.json is canonical for validation and integrity.
Any href emitted in compare-report.json MUST match a manifest mapping for the same evidence (otherwise non-compliant).

Manifest item metadata (SHOULD):
- media_type
- bytes

These allow bounded-memory viewers/validators to avoid loading large blobs.

4.2 Embedded thin index (SHOULD)
If embedded, report.html MUST include a minimal mapping:
{
  "manifest_version": "v1",
  "generated_at": 1730000000000,
  "source_manifest_sha256": "<sha256 of artifacts/manifest.json>",
  "items": [
    { "manifest_key": "mk_123", "rel_path": "artifacts/abc.bin", "media_type": "application/json" }
  ]
}
The embedded index is view-only and MUST be derived from manifest.json.
Consumers MUST NOT treat the embedded index as canonical.
Implementation note (recommended):
- Embed as `<script id="embedded-manifest-index" type="application/json">...</script>`.

4.3 Redaction transparency (MUST when applied)
If any redaction/sanitization is applied, the machine truth MUST reflect it:
- summary.quality.redaction_status: "none" | "applied"
- summary.quality.redaction_preset_id?: string (when applied)

If redaction_status=applied, artifacts/redaction-summary.json MUST exist with:
{
  "preset_id": "transferable-v1",
  "categories_targeted": ["secrets","pii"],
  "actions": ["mask","remove"],
  "touched": [
    { "manifest_key": "case_1/new/final_output", "action": "mask" }
  ],
  "warnings": ["Redaction is best-effort; not a guarantee of complete removal."]
}

Redaction MUST update manifest hashes (manifest is the integrity source).

5. compare-report.json (v5)
Top-level shape:
{
  "contract_version": 5,
  "report_id": "...",
  "baseline_dir": "...",
  "new_dir": "...",
  "cases_path": "...",
  "repro": { "bundle_manifest_href": "...", "how_to_reproduce_href": "..." },
  "summary": { ... },
  "quality_flags": { ... },
  "items": [ ... ]
}

Quality flags (recommended fields):
- self_contained: boolean
- portable_paths: boolean
- missing_assets_count: number
- path_violations_count: number
- large_payloads_count: number (case response files exceeding warnBodyBytes)
- missing_assets: string[]
- path_violations: string[]
- large_payloads: string[] (e.g., "baseline/case_1.json (1200345 bytes)")

6. Items (MUST)
Each item includes:
- case_id (non-empty)
- title
- case_status: executed | skipped | filtered_out
- case_status_reason (optional)
- data_availability (baseline/new status + reason_code/details)
- baseline_pass, new_pass
- trace_integrity, security
- risk_level, risk_tags, gate_recommendation
- artifacts (hrefs + manifest keys)
- failure_summary (optional)

Evidence refs in JSON MUST be represented by manifest_key (no raw paths).

7. Evidence refs (MUST)
Evidence references in compare-report.json MUST use:
{
  "manifest_key": "mk_123",
  "kind": "tool_result|retrieval_doc|event|asset|final_output|runner_failure"
}

8. Artifacts mapping (MUST)
When an artifacts href is emitted, a corresponding manifest key SHOULD be emitted alongside it:
- baseline_case_response_href + baseline_case_response_key
- new_case_response_href + new_case_response_key
- baseline_failure_body_href + baseline_failure_body_key
- baseline_failure_meta_href + baseline_failure_meta_key
- new_failure_body_href + new_failure_body_key
- new_failure_meta_href + new_failure_meta_key

The href is for direct link fallback; the key is the canonical mapping for viewer link resolution.
If href and manifest mapping disagree, the manifest mapping wins and the href MUST be treated as invalid.

9. Compatibility
Unknown fields MUST be ignored by consumers within a known contract version.
Producers MUST omit undefined fields.

10. Minimal compliance checklist
- contract_version == 5
- report.html opens via file:// and shows minimum view without user action
- items[] covers all cases (no silent omissions)
- evidence refs use manifest_key
- hrefs are portable (no absolute paths / traversal / schemes)
- evidence links only when mapping available
- if redaction_status=applied, redaction-summary.json exists and manifest hashes are updated
