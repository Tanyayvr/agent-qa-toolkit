# EU AI Act Evidence Engine

This document describes how Agent QA Toolkit should be positioned for EU AI Act related demand.
It is a vertical package on top of the core [Agent Evidence Platform](agent-evidence-platform.md).

Short version:

- do not position this as the only product surface
- do position Agent Evidence Platform as the core product
- do not position the toolkit as a generic compliance platform
- do not position the toolkit as legal counsel
- do position it as a self-hosted evidence engine that generates technical validation evidence for AI governance workflows

## Positioning

Recommended positioning:

> Agent QA Toolkit is a self-hosted EU AI Act evidence engine for tool-using AI agents. It turns runtime validation into portable evidence packs that can be attached to internal review, GRC workflows, release gates, and technical documentation.

This sits on top of the core product:

- core product: Agent Evidence Platform
- vertical package: EU AI Act Evidence Engine
- deterministic demo entrypoint: `npm run demo:eu-ai-act`
- explicit vertical release gate: `npm run release:gate:eu-ai-act`
- website publish entrypoint: `npm run demo:publish:surfaces`

This is the right layer in the stack:

- below legal advisory
- below enterprise GRC workflow tools
- above raw traces, prompt logs, and ad hoc eval scripts

The product promise is not "we make you compliant".
The product promise is:

- we generate machine-verifiable technical evidence
- we make agent validation portable and auditable
- we reduce the gap between engineering validation and compliance documentation

## Who This Is For

Primary buyers and champions:

- AI platform lead
- product security lead
- applied AI engineering manager
- release engineering / DevOps owner for AI systems
- compliance lead who already has legal/GRC support but lacks technical evidence

Secondary users:

- internal audit
- external counsel
- risk committee reviewers
- deployer-side technical reviewers

## Problem Statement

Most compliance workflows produce one of two weak outcomes:

- policy documents without runtime evidence
- dashboards and traces without a portable review artifact

For AI agents, this is especially problematic because the relevant questions are operational:

- does the agent execute reliably
- are failures clearly classified
- are unsafe outputs or actions detected
- is human review required for certain cases
- is there enough evidence to justify promotion or restriction

Agent QA Toolkit already solves the engineering half of that problem through:

- `compare-report.json` as machine truth
- `report.html` as human-readable triage and review artifact
- `artifacts/manifest.json` with checksums for integrity
- `review/review-decision.json` and `review/handoff-note.md` for structured owner signoff
- recurring `corrective-action-register.json` continuity when the EU bundle is linked back to an intake profile
- security scanners and gate outcomes
- traceability and replay evidence
- runtime-path classification (`quick`, `full-lite`, `full`, `diagnostic`)

## EU AI Act Fit

Best-fit framing:

- Article 9: risk evidence and validation signals
- Article 13: instructions-for-use scaffold linked to live technical evidence
- Article 17: QMS-lite scaffold linked to release, monitoring, and documentation evidence
- Article 12: record-keeping and traceability evidence
- Article 14: human oversight evidence via gate and approval signals
- Article 15: accuracy, robustness, and cybersecurity evidence
- Article 72: monitoring-plan scaffold linked to recurring drift and governance evidence

This toolkit is strongest when used to generate evidence for:

- internal technical review
- release governance
- conformity assessment preparation
- post-market monitoring evidence

## What The Toolkit Covers Well

Today the toolkit already gives a strong base for a compliance-facing evidence layer:

- portable evidence packs for offline review
- Article 13 instructions scaffold that links intended-use and oversight notes to concrete runtime artifacts
- Article 9 risk register scaffold that turns case risk, execution quality, and monitoring signals into reviewable entries
- Article 17 QMS-lite scaffold that links release controls, monitoring signals, review workflow, and documentation-control expectations
- Article 72 monitoring-plan scaffold that turns monitoring evidence into a review cadence and escalation template
- recurring corrective-action continuity so repeated gaps remain linked across governance cycles instead of being re-tracked manually
- execution-quality classification instead of "all failures look the same"
- per-case gate recommendation for deterministic human oversight hooks
- manifest-based artifact integrity
- scanner outputs for security-related review
- trend and drift signals for operational monitoring
- self-hosted deployment for sensitive environments

This makes it credible as a technical evidence engine, not just as another eval UI.

## What It Does Not Replace

The toolkit should explicitly not claim to replace:

- legal classification of system risk level
- full legal interpretation of the EU AI Act
- enterprise policy management
- training-data governance programs
- declaration issuance by legal/compliance owners
- notified body processes

That boundary is important commercially and technically.

## Product Boundary

Recommended category definition:

- not a "compliance platform"
- not a "legal AI Act consultant"
- yes: "technical evidence engine for AI governance and conformity preparation"

This keeps the message precise and defensible.

## Packaging Narrative

The toolkit can be sold or presented as a separate product surface:

- core artifact: portable evidence pack
- compliance add-on surface: EU AI Act evidence dossier
- structured human handoff: review scaffold + review gate inside the bundle
- workflow fit: plug into existing legal, GRC, or manual review processes

Recommended external message:

> Keep your legal workflow, keep your GRC workflow, keep your internal governance process. Use Agent QA Toolkit to generate the technical evidence layer those workflows are missing.

## Why Self-Hosted Matters

For EU-facing teams and regulated buyers, self-hosted positioning is important:

- sensitive prompts and outputs stay inside the environment
- evidence can be reviewed offline
- artifacts can be attached to tickets and internal approvals
- no dashboard dependency for auditors or reviewers

This is a real differentiator and should be stated plainly.

## Recommended Sales Narrative

Use this sequence:

1. Most teams can write policy docs, but they cannot generate portable technical evidence for agent behavior.
2. Most observability tools can show traces, but they do not produce an audit-friendly evidence pack.
3. Agent QA Toolkit turns agent validation into a signed, portable, self-hosted evidence layer.
4. That evidence can be referenced in internal review, technical documentation, release approval, and AI governance workflows.

## Recommended Commercial Framing

If this direction is packaged commercially, the safest framing is:

- OSS core: evidence pack generation, validators, portable artifacts
- evidence-engine packaging/support: templates, dossier generation, rollout support, governance-ready exports

This keeps the OSS boundary honest while leaving room for a paid packaging/support layer later.

## Near-Term Documentation Goal

The next documentation milestone should make this story explicit:

- what the toolkit covers today
- what is still outside scope
- what "EU AI Act evidence engine" means operationally
- what engineering roadmap closes the gap from evidence pack to dossier

## Packaging Docs

Phase 5 packaging docs:

- [EU AI Act Buyer Guide](eu-ai-act-buyer-guide.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
- [EU AI Act Review Handoff Checklist](eu-ai-act-review-handoff-checklist.md)
- [EU AI Act Self-Hosted Guidance](eu-ai-act-self-hosted-guidance.md)

For implementation planning, see [EU AI Act Evidence Engine Roadmap](eu-ai-act-evidence-engine-roadmap.md).
