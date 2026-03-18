# EU AI Evidence Builder Website

This repository ships a public website surface for the EU AI Act funnel in the same `docs/` publish root that already hosts the live product demos.

## Purpose

The website is the acquisition layer for the EU AI vertical:

- free documentation templates and a browser-side builder reduce friction
- live proof links route buyers into real evidence artifacts
- the paid path remains the self-hosted evidence workflow in Agent QA Toolkit

This is deliberate. The site is not a separate product engine and it is not a legal-advice portal.

## Publish Model

The static site is generated into `docs/`:

- root redirect: `docs/index.html`
- locales: `docs/en/`, `docs/de/`, `docs/fr/`
- template downloads: `docs/downloads/<locale>/`
- live proof hub: `docs/demo/`

Generated pages are deterministic. The verification step compares checked-in HTML against the generated output and fails on drift.

## Commands

Build the site:

```bash
npm run site:build
```

Verify the generated output:

```bash
npm run site:verify
```

Refresh both in one step:

```bash
npm run site:refresh
```

## Scope

Current MVP scope:

- locales: `en`, `de`, `fr`
- pages: landing, how-it-works, technical, builder, pricing, docs, about, contact, legal pages
- templates:
  - `article-9`
  - `technical-doc`
  - English-only additional templates:
    - `article-12`
    - `article-14`
    - `article-15`
- blog:
  - English-only SEO articles for deadline, Annex III categories, and evidence-pack education

The `technical` page is the professional surface for platform and release teams.
It now carries:

- the structured intake layer (`system-scope.json`, `quality-contract.json`, and draft case scaffolding)
- the case-completeness gate that checks whether a reviewed suite really covers the intake contract
- the adapter onboarding gate that proves a live `/run-case` endpoint meets the required telemetry depth and writes `adapter-capability.json`
- the run comparability gate that checks baseline/new runner directories before packaging and writes `run-fingerprint.json`
- the structured review handoff layer (`review-decision.json`, `handoff-note.md`, the review gate, and recurring `corrective-action-register.json` continuity)
- the EU dossier layer with Article 13 instructions scaffold and Article 9 risk register scaffold
- the Article 17 QMS-lite scaffold for technical provider-side procedures and review controls
- the Article 72 monitoring-plan scaffold layered on top of recurring monitoring evidence
- the operating model and automation boundary
- a linked boundary/tech-debt document that separates intentional manual work from real automation gaps
- readiness, artifact expectations, re-run triggers, and support boundaries

This keeps the public landing concise while still giving technical buyers a credible upstream-to-bundle workflow.

## Dependencies

The site assumes these existing static assets remain present:

- `docs/site-assets/site.css`
- `docs/site-assets/site.js`
- `docs/site-assets/builder.js`
- `docs/demo/`
- `docs/assets/screenshots/01.png`
- `docs/assets/screenshots/05.png`

The public proof story depends on the published demo hub. If the proof surface changes, rebuild the site so the landing metrics and proof links stay aligned.
