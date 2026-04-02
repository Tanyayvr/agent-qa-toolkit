# EU AI Act Evidence Engine

This document describes the public EU AI Act path in this repository.

The EU layer is a vertical package on top of the open Agent QA Toolkit core. It is designed for teams working on high-risk AI systems that need:

- a first provider-side documentation draft
- a lightweight starter check on a real running agent
- a minimum technical package built from real runs

It is not legal counsel, not a hosted compliance platform, and not an automated final sign-off workflow.

## Product Boundary

The EU path in this repository combines two things:

1. **provider-side documentation package**
   - Builder-driven draft sections
   - Annex IV and linked article templates
   - provider-owned text that a team completes and reviews
2. **technical evidence package**
   - runtime outputs from real agent runs
   - compare report
   - report HTML
   - manifest and archive artifacts
   - article-level technical outputs used to support the documentation package

The public EU path is the **minimum provider-side path**.

It does not promise:

- legal qualification
- legal interpretation
- automatic conformity decisions
- final approval on behalf of the provider

## What The EU Layer Adds To The Core Toolkit

The generic toolkit already produces runtime evidence for tool-using AI agents.

The EU layer adds:

- Builder-guided provider-side draft sections
- Annex IV structure and linked article templates
- EU starter flow for a first self-serve check on a running agent
- minimum EU packaging and verification commands

This gives teams a single path from:

- drafting provider-side documentation
- to running a first technical check on their own agent
- to assembling a minimum EU-shaped package from real runs

## Who This Is For

Best fit:

- providers of high-risk AI systems
- product and platform teams preparing the first provider-side package
- technical teams that need runtime-backed supporting materials, not only filled templates

The path is role-based, not company-type based.

That means it is appropriate when the organization is acting as the provider in the specific scenario, even if that organization is:

- a product company
- an integrator
- an internal AI team

## What The Minimum Package Covers

The current public minimum path focuses on provider-side requirements tied to:

- Annex IV technical documentation
- Article 9 risk management
- Article 10 data and data governance
- Article 12 logging and traceability
- Article 13 instructions and information
- Article 14 human oversight
- Article 15 accuracy, robustness, and cybersecurity
- Article 16 provider obligations
- Article 17 quality management system support
- Article 43 conformity assessment references
- Article 47 and Annex V declaration materials
- Articles 48 and 49 provider-side marking and registration references
- Article 72 post-market monitoring support

The goal is not to auto-complete every legal judgment.
The goal is to make the technical and documentation package easier to assemble, review, and maintain.

## Why Runtime Evidence Matters

Filled templates on their own are weak when a team also needs to show that the system has actually been tested and that the package is grounded in real runs.

The EU path therefore uses the same open evidence engine to produce supporting technical materials from a real agent workflow, including:

- `compare-report.json`
- `report.html`
- `artifacts/manifest.json`
- `archive/retention-controls.json`
- linked article-level technical outputs

These outputs do not replace the provider-authored documentation.
They strengthen it by attaching technical signals from real runs to the same package.

## What This Repository Does Not Provide

This repository does not provide:

- a hosted workspace
- legal advice
- a guaranteed conformity outcome
- external audit representation
- customer-specific onboarding playbooks

Commercial support and customer-specific implementation are intentionally outside the public repository boundary.
