# EU Self-Hosted Guidance

This is the canonical self-hosted guidance for the EU product surface.

## Why This Matters

For regulated and EU-facing teams, the deployment model is part of the product story:

- evidence generation happens inside the customer environment
- reports and compliance exports stay under customer control
- reviewers can consume the package without a vendor dashboard

## Recommended Deployment Pattern

Use a simple internal flow:

1. run the EU path inside customer-controlled CI or internal compute
2. write the report directory to customer-controlled storage
3. keep trend data on customer-managed local storage or an internal volume
4. attach outputs to internal reviews, release approvals, or audit packages

## Data Boundaries

Keep these boundaries explicit:

- prompts, outputs, traces, and artifacts stay in customer-controlled storage
- no vendor-hosted backend is required
- any export outside the environment is customer-controlled and policy-driven

## Storage Recommendations

Recommended:

- report directories on customer-managed storage
- trend data on local filesystem or internal persistent volume
- retention aligned with customer governance policy

Avoid:

- unmanaged shared paths with unclear access ownership
- external links inside the bundle
- network filesystems that break local SQLite assumptions for trend data

## Access Control Recommendations

Because this is self-hosted, the customer owns access control.

Recommended controls:

- restrict write access for bundle generation jobs
- give read access only to stakeholders who need the artifacts
- separate operator access from reviewer access where possible
- log artifact distribution through the customer ticketing or approval system

## What This Does Not Change

Self-hosting does not make the product:

- legal counsel
- a generic GRC workflow tool
- a complete AI governance platform

It only keeps the technical package workflow inside the customer environment.

## Related Docs

- [Get started](get-started.md)
- [EU starter](starter.md)
- [Operator runbook](runbook.md)
- [Verification checklist](../../../docs/VERIFY.md)
