# EU Product Boundary

This EU surface is the product entry point for the EU AI Act path.

It is not a separate engine.

## What Is Shared

The EU path reuses the shared monorepo core:

- runner
- evaluator
- packaging
- verification
- manifest signing
- shared evidence and compare-report contracts

## What Is EU-Specific

The EU surface adds:

- EU-specific commands
- EU-specific docs
- EU-specific public entry path
- EU-specific package flow
- EU-specific compliance profile in `products/eu-ai-act/config/`
- EU-specific schemas in `schemas/eu-ai-act/`

## What The EU Layer Adds

The shared toolkit already produces runtime evidence for tool-using agents.

The EU layer adds:

- provider-side draft sections through the Builder
- the EU starter flow for a first self-serve check
- the minimum EU package built from real runs
- EU verification and authority-response surfaces

## What The Public EU Path Covers

The current public minimum path focuses on provider-side outputs tied to:

- Annex IV technical documentation structure
- Article 9 risk management
- Article 10 data governance
- Article 13 instructions and information
- Article 16 provider obligations
- Article 17 QMS-lite support
- Article 43 conformity assessment support
- Article 47 and Annex V declaration materials
- Article 72 post-market monitoring support

## What Stays Provider-Owned

This EU surface does not replace:

- legal qualification and legal interpretation
- provider sign-off
- conformity decisions
- external audit representation
- customer-specific onboarding playbooks

## What It Does Not Change

This product surface does not turn the repository into:

- a separate EU-only codebase
- legal counsel
- a generic GRC platform

It only gives EU users a clean install and docs surface without starting from the wider toolkit flow.
