# EU AI Act Self-Hosted Guidance

This document explains how to deploy and operate the EU AI Act evidence workflow in a self-hosted environment without changing the core product boundary.

## Why This Matters

For regulated and EU-facing teams, the deployment model is part of the product story.

The relevant promise is:

- evidence generation happens inside the customer environment
- reports and compliance exports stay under customer control
- reviewers can consume the package without a vendor dashboard

## Recommended Deployment Pattern

Use a simple internal flow:

1. runner and evaluator execute inside customer-controlled CI or internal compute
2. evaluator writes a report directory to customer storage
3. trend DB stays on customer-managed local storage or internal volume
4. review artifacts are attached to internal tickets, release approvals, or audit packages

## Data Boundaries

Keep these boundaries explicit:

- prompts, outputs, traces, and artifacts stay in customer-controlled storage
- no vendor-hosted backend is required
- any export outside the environment is customer-controlled and policy-driven

This is especially important when the evidence pack contains sensitive prompts, outputs, or operational details.

## Storage Recommendations

Recommended:

- report directories on customer-managed storage
- trend DB on local filesystem or internal persistent volume
- retention aligned with customer governance policy

Avoid:

- unmanaged shared paths with unclear access ownership
- external links inside the bundle
- network filesystems that break local SQLite assumptions for trend DB

## Access Control Recommendations

Because this is self-hosted, the customer owns access control.

Recommended controls:

- restrict write access for bundle generation jobs
- give read access only to review stakeholders who need the artifacts
- separate operator access from reviewer access where possible
- log artifact distribution through the customer ticketing or approval system

## Encryption and Transport

Recommended:

- encryption at rest for volumes storing report directories and trend DB
- internal TLS for any customer-managed transfer endpoints
- signed or checksummed bundle verification where local policy requires attestation

The toolkit already provides manifest-based integrity.
Customers can add local signing on top when required.

## Redaction and Minimization

If the environment handles sensitive data:

- use the existing redaction workflow before broader artifact sharing
- minimize package scope to what the review audience actually needs
- attach `case-*.html` and raw assets selectively when the audience is non-engineering

Reviewers usually do not need every raw asset for first-pass governance review.

## Monitoring and Cadence

For regulated operation, keep trend ingestion enabled for recurring runs so `post-market-monitoring.json` remains current.

Recommended:

- stable trend DB path per agent or monitored scope
- scheduled recurring runs
- explicit retention policy for historical evidence
- periodic governance review that includes monitoring drift, not just latest release status

## What This Deployment Model Does Not Change

Self-hosted deployment does not change product scope.

It does not make the toolkit:

- legal counsel
- a generic GRC workflow tool
- a complete AI governance platform

It only ensures that the technical evidence layer is generated and handled inside the customer environment.

## Related Docs

- [Self-Hosted Deployment & Data Handling](self-hosted.md)
- [Threat Model](threat-model.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
- [VERIFY.md](VERIFY.md)
