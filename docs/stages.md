<!-- /tool/docs/stages.md -->
Stages: Agent QA Toolkit Roadmap (Stage 1–3)

This document defines what we are building by stages, what is queued next, what remains a long-term vision, and what is explicitly out of scope.

Stage 1 (MUST): Portable Report + Compare Report + CI Gate Truth
Goal

Turn a regression/incident into a portable, self-contained report directory that can be copied to another machine and still work:

Incident → Portable Report → RCA Support → Risk/Gate Decision

Stage 1 produces:

a machine interface for CI gating and integrations:

compare-report.json (Report Contract v3, source of truth)

a human interface for triage:

report.html

case-<case_id>.html

Outputs (report directory)

The Evaluator output directory MUST contain:

report.html

compare-report.json

case-<case_id>.html (required for humans)

assets/ (self-contained copies of referenced payloads)

The report directory MUST be portable: copying it must not break any links.

Recommended (SHOULD) for fully self-contained portability:

baseline/ and new/ (local raw copies referenced by hrefs)

repro/ (only if compare-report.json.repro is present)

Core invariants (Stage 1)

CI truth (per case)
items[].gate_recommendation is the single source of truth for CI gating at the case level.
All summary.* fields are aggregates only and MUST NOT be used as gating truth.

No silent omissions (coverage is explicit)

compare-report.json.items[] MUST contain one item per case in the compared set.

Cases that were skipped or filtered_out MUST still be represented as items.

summary.data_coverage MUST surface totals and missing/broken artifact counts, and MUST make omissions impossible to hide.

Portable href rules

All *href fields in compare-report.json MUST be relative to the report directory and resolve within it.

*href MUST NOT contain traversal (../, ..\\), MUST NOT start with / or \\, and MUST NOT contain ://.

Path/href truth tests apply only to semantic path/href fields (all *href fields and top-level baseline_dir/new_dir/cases_path) and MUST NOT be applied to URLs stored as data (e.g., security.signals[].details.urls).

Full evidence access

When evidence payloads exist, Evaluator MUST link to full payloads via assets/ (no silent truncation).

UI may display snippets, but full payload evidence MUST be available via links when captured.

Quality flags must be honest

quality_flags.self_contained reflects whether all referenced href targets exist inside the report directory.

quality_flags.portable_paths reflects whether any path/href violations exist per truth tests.

Stage 1 scope boundaries (what Stage 1 is NOT)

Stage 1 is the portable report + evidence links + CI gate truth, not a replay system.

repro is a SHOULD for CI/incident reports, but Stage 1 does not require deterministic replay.

Stage 1 supports “RCA” as classification + evidence + diffs. It does not guarantee causal proof (that is Stage 3).

Stage 1 MUST / SHOULD checklist (productized)

MUST (Stage 1):

Portable report directory + strict href rules

items[] coverage: one item per case, no silent omissions

items[].case_status = executed | skipped | filtered_out

summary.data_coverage (including items_emitted == total_cases)

Honest quality_flags

Per item: risk_level, risk_tags, gate_recommendation

Per item: data_availability (status + optional reason_code/details)

Per item: security signals pack + derived requires_gate_recommendation compatibility field

SHOULD (Stage 1):

baseline/ and new/ local raw copies when raw hrefs are emitted

repro/ directory when compare-report.json.repro is present (CI/incident reports)

items[].failure_summary (dashboard-friendly machine summary without opening assets)

Diagnostic context strings in missing_assets[] / path_violations[] (field location + value)

Stage 2 (QUEUED / NEXT): Action Governance (Evidence-Linked Gates)
Goal

Control what the agent can do (policy + approvals) while keeping decisions evidence-linked to Stage 1 outputs.

Stage 2 is an enforcement layer that consumes Stage 1 evidence and produces auditable decisions.

What Stage 2 adds

Policy-as-code for actions/tools

Define allowed actions/tools and constraints.

Define which actions require approval.

Define which actions must be blocked.

Runtime/CI gate enforcement

Before executing a high-risk action/tool call, evaluate policies and gate.

Integrate with approval workflows (human-in-the-loop).

Evidence-linked approvals
Approval/gate decisions MUST reference concrete evidence from Stage 1:

regression vs baseline

step/tool diff links

security signals

data availability and integrity conditions

failure summaries (when present)

Supply chain governance (Stage 2 minimal vs Stage 3 full)

Stage 2 includes the minimal enforcement surface needed to handle supply-chain risk without turning Stage 2 into a full provenance platform:

Stage 2 minimal (QUEUED / NEXT):

Detect and flag “untrusted change” conditions (e.g., tool/skill identity/version change, unexpected source, unsigned/unpinned artifact if the environment can report it).

Gate behavior: untrusted_change → require_approval or block, with evidence links to Stage 1.

Full provenance/signing/sandbox belongs to Stage 3 vision (see Stage 3).

Stage 2 deliverable artifacts (planned)

Stage 2 introduces a separate decision record (not part of the Stage 1 report contract):

gate_decision.json (or gate/decision.json) containing:

decision: none | require_approval | block

reason codes

links into the Stage 1 report (href references)

issuer (CI/policy/human) and timestamps

Stage 3 (VISION): Repro & Causal Debug Platform (Replay + Counterfactual)
Goal

Make failures not only diagnosable, but reproducible and causally testable.

What Stage 3 adds

Standalone Evidence Pack (separate contract, replay-ready)
A dedicated “evidence-pack” format that is distinct from the Stage 1 portable report directory and is designed to power replay and experiments, typically including:

manifest/index

event trace (e.g., JSONL)

content-addressed blobs for large payloads

structured diffs and experiment results

Replay ladder

L1: recorded dependency replay (tool responses / retrieval snapshots)

L2: controlled nondeterminism (pin versions/params/seeds/normalization)

L3: deterministic harness (optional; harder and not MVP-critical)

Counterfactual experiments / fault injection

Run single-factor overrides while locking everything else.

Produce attribution results (“what factor explains/fixes the failure”).

Full supply chain provenance & sandbox (vision)

Skill/tool signing and hash pinning

Provenance metadata and integrity checks

Permissions manifests and sandboxing

Registry governance and quarantine automation

Backlog buckets
MUST (Stage 1)

Portable report directory + strict href rules

items[] coverage: one item per case, no silent omissions

items[].case_status (executed|skipped|filtered_out) + optional reason

summary.data_coverage

Honest quality_flags

Per item: risk_level, risk_tags, gate_recommendation

Per item: data_availability (with reason_code/details)

Per item: security signals + derived compatibility gating flag

QUEUED NEXT (Stage 2)

Evidence-linked policy gates and approvals (runtime + CI)

Separate gate decision record (decision + evidence links)

Minimal supply-chain enforcement gates (untrusted change → approval/block)

FUTURE / VISION (Stage 3)

Standalone evidence-pack contract (manifest/trace/blobs)

Replay harness (L1/L2)

Counterfactual experiments + attribution

Full skill/tool provenance + signing + sandbox platform

Explicit out of scope (for now)

Claims of “absolute determinism always” for live external dependencies.

Building a general-purpose observability/evals platform to replace existing tools.

Competing head-on with enterprise control planes as a compliance-first product.

Unverified marketing claims (e.g., “no one does X”).

One-paragraph product vision (kept for alignment)

We build a proof-focused layer for tool-using AI agents: Stage 1 turns regressions into a portable report with strict portability rules, full evidence links, and a single CI gate truth per case; Stage 2 adds evidence-linked policies and approvals for safe action execution (including minimal supply-chain enforcement gates); Stage 3 evolves into a reproducibility and causal-debug platform with recorded replay and counterfactual experiments, plus full provenance and sandboxing as a long-term vision.