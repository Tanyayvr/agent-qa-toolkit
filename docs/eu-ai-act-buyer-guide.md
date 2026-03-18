# EU AI Act Buyer Guide

This guide is for buyers and internal champions evaluating Agent QA Toolkit as a technical evidence layer for EU AI Act preparation.

Short version:

- this toolkit is not legal counsel
- this toolkit is not a generic compliance workflow platform
- this toolkit is a self-hosted evidence engine for tool-using AI agents
- the core product is Agent Evidence Platform; EU AI Act is a vertical package on top

## What You Are Buying

The core product outcome is a portable technical evidence pack that can be attached to:

- internal release approval
- technical documentation preparation
- AI governance review
- conformity assessment preparation
- post-market monitoring review

For EU AI Act demand, the product should be framed as:

> a self-hosted evidence engine that turns agent validation into portable, machine-verifiable review artifacts

## What Problem It Solves

Most teams have one of two weak states:

- policy documents and control spreadsheets without runtime evidence
- traces and dashboards without a portable review package

Agent QA Toolkit addresses the missing layer between engineering validation and governance review.

It produces:

- `compare-report.json` as machine truth
- `report.html` as human-readable evidence
- `artifacts/manifest.json` for bundle integrity
- `compliance/eu-ai-act-coverage.json` for clause coverage
- `compliance/eu-ai-act-annex-iv.json` and `compliance/eu-ai-act-report.html` for dossier-ready export
- `compliance/article-13-instructions.json` for a technical instructions-for-use scaffold
- `compliance/article-9-risk-register.json` for a machine-derived risk register scaffold
- `compliance/article-17-qms-lite.json` for a technical quality-management-system scaffold
- `compliance/article-72-monitoring-plan.json` for a technical post-market monitoring plan scaffold
- `compliance/human-oversight-summary.json` and `compliance/release-review.json` for governance review
- `compliance/post-market-monitoring.json` for longitudinal monitoring evidence

Operationally, this is now a repeatable packaging flow, not a manual doc assembly exercise:

- operators can generate and verify the full bundle with one command: `npm run compliance:eu-ai-act -- ...`
- the handoff package is checked before review instead of relying on ad hoc file collection

## Best-Fit Use Cases

Strongest fit:

- AI platform teams shipping tool-using agents into regulated or sensitive environments
- release owners who need a portable approval package
- compliance or audit teams that already have legal/GRC support but lack technical evidence
- self-hosted environments where prompts, outputs, and artifacts must stay inside customer infrastructure

Best-fit evidence areas:

- Article 9 risk controls
- Article 13 instructions-for-use scaffold
- Article 17 QMS-lite scaffold
- Article 12 record-keeping and traceability
- Article 14 human oversight
- Article 15 accuracy, robustness, and cybersecurity
- Article 72 post-market monitoring support and plan scaffolding

## Where It Fits In The Stack

The toolkit sits:

- above raw traces, logs, and ad hoc eval scripts
- below legal interpretation and formal compliance ownership
- alongside existing GRC workflows rather than replacing them

This is the correct commercial story:

- keep legal counsel
- keep OneTrust / Vanta / spreadsheets / internal governance workflow
- add Agent QA Toolkit as the technical evidence layer those workflows reference

## What It Does Not Claim

Do not position the product as:

- a legal AI Act consultant
- a complete AI governance platform
- a training-data governance system
- a notified body workflow system
- a full declaration-of-conformity generator

The toolkit does not decide legal classification.
It does not make a company compliant by itself.

## Why Self-Hosted Matters

For EU-facing and regulated buyers, self-hosted deployment is part of the value proposition:

- customer data stays in the customer environment
- evidence can be reviewed offline
- artifacts can be attached to tickets, approvals, and audit packages
- no hosted dashboard is required for reviewers

That matters for both engineering trust and procurement trust.

## Buyer Language That Is Safe

Use language like:

- "technical evidence engine"
- "portable compliance-ready evidence pack"
- "self-hosted AI governance evidence layer"
- "machine-verifiable validation artifacts for internal review and conformity preparation"

Avoid language like:

- "guarantees EU AI Act compliance"
- "replaces legal review"
- "complete compliance automation"

## Typical Internal Champion Story

An engineering or platform champion can explain the purchase like this:

1. We already run evaluations, but they do not produce a review-grade package.
2. Our compliance and release stakeholders should not have to read raw traces.
3. We need a self-hosted artifact we can attach to approval workflows.
4. Agent QA Toolkit turns runtime validation into that artifact.

## Recommended Commercial Package

The most defensible packaging is:

- OSS core: evaluator, evidence packs, schemas, portable artifacts
- support / rollout / packaging layer: buyer-facing templates, review package guidance, deployment guidance, operational enablement

That keeps the OSS boundary honest while leaving room for commercial services or packaged support.

## Next Docs

For the operator and review workflow:

- [Agent Evidence Platform](agent-evidence-platform.md)
- [EU AI Act Evidence Engine](eu-ai-act-evidence-engine.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
- [EU AI Act Review Handoff Checklist](eu-ai-act-review-handoff-checklist.md)
- [EU AI Act Self-Hosted Guidance](eu-ai-act-self-hosted-guidance.md)
