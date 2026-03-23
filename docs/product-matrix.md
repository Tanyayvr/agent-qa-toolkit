# Product Matrix

This document is the short commercial source of truth for the two product surfaces exposed by the repository.

## Matrix

| Surface | Buyer | Primary outcome | Main artifacts | Demo command | Release gate |
| --- | --- | --- | --- | --- | --- |
| Agent Evidence Platform | AI platform lead, release engineering, product security | Portable release evidence for tool-using AI agents | `report.html`, `compare-report.json`, `artifacts/manifest.json`, `_source_inputs/` | `npm run demo:agent-evidence` | `npm run release:gate:agent-evidence` |
| EU AI Act Evidence Engine | EU-facing AI governance owner, compliance engineering, counsel-adjacent technical team | Dossier-ready technical evidence for EU AI Act preparation | core artifacts plus `compliance/eu-ai-act-report.html`, `coverage`, `annex_iv`, `article-13-instructions`, `article-9-risk-register`, `article-17-qms-lite`, `article-72-monitoring-plan`, `article-73-serious-incident-pack`, `release-review`, `post-market-monitoring`, and on-demand `authority-response/authority-response-bundle.json` | `npm run demo:eu-ai-act` | `npm run release:gate:eu-ai-act` |

## What Is Shared

Both surfaces share:

- one evidence engine
- one evaluator/report contract
- one portable bundle model
- one contract-freeze discipline

The EU package is not a second product engine.
It is a vertical package built on top of the core Agent Evidence surface.

## How Sector Packages Fit

The core surface should be read as:

- one evidence engine for tool-using agents
- domain case libraries and sector assertions layered above it
- optional vertical exports when a sector needs extra documentation or handoff artifacts

Today the shipped vertical is EU AI Act.
That does **not** mean the core is EU-only.
It means EU is the packaged sector layer that already exists in-repo.

## What Changes Between Surfaces

Agent Evidence Platform emphasizes:

- release evidence
- security and engineering handoff
- generic agent governance without regulation-specific dossier exports

EU AI Act Evidence Engine adds:

- clause coverage
- Annex IV dossier export
- Article 13 instructions scaffold
- Article 9 risk register scaffold
- Article 17 QMS-lite scaffold
- Article 72 monitoring-plan scaffold
- Article 73 serious-incident pack
- oversight and release-review exports
- post-market monitoring export

## What We Do Not Claim

Agent Evidence Platform is not:

- a generic observability dashboard
- the whole domain compliance stack for every regulated sector
- legal advice
- a full model risk management platform
- a full GRC suite

EU AI Act Evidence Engine is not:

- legal classification
- declaration-of-conformity authority
- a replacement for counsel, notified bodies, or deployer-authored documentation

## Website Proof Surface

The publish path for website-ready demos is:

```bash
npm run demo:publish:surfaces
```

It writes a stable proof surface under `docs/demo/`:

- `docs/demo/index.html`
- `docs/demo/product-surfaces.json`
- `docs/demo/agent-evidence/`
- `docs/demo/eu-ai-act/`

Use that publish root as the source for website links, buyer demos, and pilot handoff references.

## Related Docs

- [Agent Evidence Platform](agent-evidence-platform.md)
- [EU AI Act Evidence Engine](eu-ai-act-evidence-engine.md)
- [Product Surface Publishing](product-surface-publishing.md)
