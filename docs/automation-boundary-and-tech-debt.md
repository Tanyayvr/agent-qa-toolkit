# Automation Boundary and Tech Debt

This document is the repository-level source of truth for what remains manual on purpose and what remains unfinished in the current operational product.

It exists to prevent three common failures:

- treating human governance work as if it were missing automation
- treating roadmap expansion as if it were product debt
- selling or documenting behavior that the toolkit does not actually automate

## Classification Rules

Use these labels deliberately:

- **Human-owned by design**: the toolkit should not try to fully automate this because it depends on business judgment, governance judgment, or legal interpretation.
- **Operational tech debt**: the toolkit should handle this better inside the current product promise, and the gap creates avoidable operator friction or ambiguity.
- **Optional expansion backlog**: valuable next capability, but not required to keep the current v1 operational story honest.

## Human-Owned By Design

These areas remain intentionally non-automated.

| Area | Why it stays human-owned | Current artifact or surface |
| --- | --- | --- |
| Intended use and deployment context | The toolkit cannot decide what the system is for, where it is used, or what organizational boundary is in scope. | `system-scope.json`, handoff note, operator-authored Annex IV completion |
| Business harms and residual risk rationale | The toolkit can surface signals and candidate risks, but it cannot decide which harms matter most for a given business or regulated workflow. | `quality-contract.json`, Article 9 risk register scaffold, review note |
| Approval vs block policy judgment | The toolkit can enforce and report the chosen thresholds; it should not invent the thresholds. | `quality-contract.json`, `review/review-decision.json` |
| Acceptable trade-offs for promotion | A release or governance owner must decide whether degraded execution, approval queues, or residual gaps are acceptable. | `release-review.json`, `review/review-decision.json` |
| Narrative completion | The toolkit can scaffold structure and machine-derived gaps, but the final explanatory story still belongs to the operator. | `review/handoff-note.md`, Article 13/17/72 scaffolds |
| Legal classification and legal signoff | Legal interpretation, system classification, declaration workflows, and counsel signoff are outside product scope. | counsel workflow outside the bundle |

These are not defects.
They are the deliberate edge of the product.

## Current Operational Tech Debt

There is no critical operational tech debt in the current v1 hardening scope.

The remaining boundaries below are either intentionally human-owned or optional expansion backlog.

## Optional Expansion Backlog

These are worthwhile next capabilities, but they are not required to keep the current product claims honest.

| Area | Why it is optional rather than debt |
| --- | --- |
| Article 73 serious-incident pack | Strong EU add-on, but outside the minimum operational chain already automated today. |
| Retention and archive controls | Valuable for authority-facing workflows, but not required for the existing portable-bundle contract. |
| Authority-response bundle | Useful for regulated environments, but it is a packaging extension beyond the current review handoff path. |
| Article 10 data/test governance add-on | Relevant for some teams, but not core to the current agent-runtime evidence promise. |
| Rich operator UI over intake and review | Helpful for adoption, but the current CLI + JSON workflow is already functional and testable. |

## Decision Policy

Use this policy before automating anything new:

1. If the work requires business, governance, or legal judgment, keep it human-owned and make the boundary explicit.
2. If the work belongs inside the current product promise and operators are compensating manually every time, treat it as tech debt.
3. If the work expands the product into a new adjacent workflow, treat it as optional backlog until it is explicitly promoted into scope.

## Current Status

For the present operational chain, the toolkit already covers:

- structured intake initialization and validation
- case scaffolding and completeness gating
- persistent intake-to-case coverage artifact generation
- adapter onboarding checks
- persistent adapter capability profile generation
- baseline/new comparability checks
- persistent run fingerprint generation
- portable packaging and verification
- EU dossier-facing technical exports
- structured review scaffolding and review checks
- recurring corrective-action register generation across review cycles

That means the current v1 operational story is:

`requirements -> cases -> adapter -> runs -> bundle -> EU exports -> review handoff`

What remains manual is not mostly "missing automation".
It is mostly governance work that should stay owned by people.

## Next Recommended Automation Order

If we continue extending the operational product, the next order should start from optional expansion backlog rather than from unresolved v1 hardening gaps.

## Related Docs

- [Evidence Operations Model](evidence-operations-model.md)
- [Architecture](architecture.md)
- [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
