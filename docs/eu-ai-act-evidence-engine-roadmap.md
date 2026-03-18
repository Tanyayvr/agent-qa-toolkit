# EU AI Act Evidence Engine Roadmap

This roadmap turns the current evidence-pack architecture into a stronger compliance-facing product surface.

It is intentionally scoped as an evidence and documentation roadmap, not a legal automation roadmap.

## Objective

Build a compliance-facing export layer on top of existing evidence packs so the toolkit can support EU AI Act preparation workflows without pretending to replace legal or GRC systems.

## Product Goal

Target outcome:

- engineering teams run the toolkit as they do today
- evaluator produces the normal evidence pack
- an additional compliance-ready dossier is emitted from that pack
- legal, risk, and review teams consume the dossier without needing raw traces or custom interpretation

## Non-Goals

Do not build these in this roadmap:

- legal risk classification wizard
- generic GRC workflow system
- training-data governance platform
- legal declaration generator with legal sign-off logic
- notified body workflow automation

## Phase 1: Compliance Surface Hardening

Goal:

- move from "documentation-only mapping" to "structured coverage model"

Deliverables:

- `compliance_coverage` block in `compare-report.json`
- coverage status per clause: `covered | partial | missing`
- evidence references tied to manifest-backed artifacts
- explicit residual gaps block for out-of-scope requirements

Suggested output files:

- `apps/evaluator/reports/<report_id>/compliance/eu-ai-act-coverage.json`

Suggested code areas:

- evaluator schema and finalization flow
- HTML report rendering
- compliance profile loading

Acceptance criteria:

- EU AI Act profile can produce clause-by-clause coverage output
- coverage is machine-readable
- every evidence reference resolves to existing bundle artifacts

## Phase 2: Annex IV Dossier Export

Goal:

- generate a compliance-facing technical dossier derived from the evidence pack

Deliverables:

- Annex IV-oriented JSON export
- human-readable HTML export for reviewers
- environment/system identity section
- operational constraints and intended-use assumptions section
- risk controls and residual-risk section
- logging/traceability section
- accuracy/robustness/cybersecurity section

Suggested output files:

- `apps/evaluator/reports/<report_id>/compliance/eu-ai-act-annex-iv.json`
- `apps/evaluator/reports/<report_id>/compliance/eu-ai-act-report.html`
- `apps/evaluator/reports/<report_id>/compliance/evidence-index.json`

Suggested code areas:

- evaluator export pipeline
- report templates
- manifest-linked evidence indexing

Acceptance criteria:

- dossier can be generated from a normal report directory without manual editing
- reviewer can trace every claimed evidence point back to bundle artifacts
- dossier states uncovered areas clearly instead of hiding them

## Phase 3: Human Oversight and Release Governance Packaging

Goal:

- make human oversight evidence and release-decision evidence first-class compliance outputs

Deliverables:

- dedicated oversight section in HTML report
- explicit mapping from gate outcomes to reviewer action
- approval-required case list
- blocked-case rationale summary
- release sign-off checklist derived from report outputs

Suggested output files:

- `apps/evaluator/reports/<report_id>/compliance/release-review.json`
- `apps/evaluator/reports/<report_id>/compliance/human-oversight-summary.json`

Acceptance criteria:

- reviewers can see which cases require approval and why
- release evidence is separated from pure debugging output
- gate reasoning is legible without reading raw event traces

## Phase 4: Post-Market Monitoring Layer

Goal:

- connect one-off evidence packs to longitudinal monitoring evidence

Deliverables:

- compliance-oriented trend export
- drift summary for monitored agents
- recurring-run bundle for governance reviews
- explicit change-over-time view for pass/fail, gate decisions, and scanner findings

Suggested output files:

- `apps/evaluator/reports/<report_id>/compliance/post-market-monitoring.json`
- trend bundle export for a date window

Suggested code areas:

- trending CLI
- group bundle generation
- compliance export layer

Acceptance criteria:

- a team can show not only one release artifact, but also historical monitoring evidence
- trend outputs are attachable to governance review workflows

## Phase 5: Commercial Packaging Layer

Goal:

- package the evidence-engine story without changing the OSS technical boundary

Deliverables:

- buyer-facing guide
- operator runbook for evidence generation
- sample review package for counsel / internal audit
- deployment guidance for self-hosted regulated environments

Suggested docs:

- buyer-facing positioning doc
- implementation guide
- internal review handoff checklist

Acceptance criteria:

- story is clear to both engineering buyers and compliance buyers
- scope boundaries are explicit
- no claim implies the toolkit is itself legal counsel or full compliance automation

## Build Order

Recommended sequence:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5

Reason:

- coverage model must exist before dossier export
- dossier export must exist before buyer-facing packaging becomes credible
- post-market outputs are valuable, but they build on the evidence structure above

## First Engineering Cut

If this is split into practical implementation iterations, use:

### Iteration A

- add `compliance_coverage`
- extend EU AI Act profile beyond minimal mapping
- render compliance coverage in HTML

### Iteration B

- add Annex IV JSON export
- add evidence index output
- add compliance-focused HTML export

### Iteration C

- add release review and oversight exports
- add post-market monitoring export hooks
- add docs and packaging layer

## Documentation Tasks

Parallel doc work should include:

- product positioning doc
- scope boundary doc
- operator usage doc for compliance bundle generation
- examples of how to hand off artifacts to internal review

## Success Criteria

This roadmap is successful if the toolkit can honestly say:

- we generate a portable technical evidence layer for EU AI Act preparation
- we do not ask reviewers to trust dashboards
- we do not pretend runtime traces are the same thing as compliance evidence
- we do not overclaim legal coverage
