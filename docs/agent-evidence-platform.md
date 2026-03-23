# Agent Evidence Platform

This document describes the core product surface of Agent QA Toolkit when sold or adopted without EU-specific regulatory framing.

Short version:

- this is the core product
- it is useful for AI agent release evidence even when no regulation is in scope
- EU AI Act is a vertical package on top of this surface, not a separate engine

## Positioning

Recommended positioning:

> Agent QA Toolkit is a self-hosted agent evidence platform for tool-using AI agents. It turns baseline-vs-new evaluations into portable, machine-verifiable evidence packs for engineering review, release gating, and operator governance.

That message is broader and safer than a compliance-only message.

## What The Core Product Does

The core product produces:

- upstream intake artifacts (`system-scope.json`, `quality-contract.json`)
- intake stage artifacts (`cases-coverage.json`, `adapter-capability.json`, `run-fingerprint.json`, `corrective-action-register.json`)
- `compare-report.json` as machine truth
- `report.html` as human-readable review artifact
- `artifacts/manifest.json` as integrity map
- `archive/retention-controls.json` as the archive and retention scaffold
- structured review handoff artifacts (`review/review-decision.json`, `review/handoff-note.md`)
- per-case replay diffs and raw evidence assets
- gate signals for `none | require_approval | block`
- execution-quality classification
- portable packaging and verification commands

This is already valuable for:

- release engineering
- AI platform teams
- product security review
- internal model or workflow promotion reviews
- vendor-neutral evidence handoff between teams

## What Sits Above The Core

The core platform is intentionally **agent-centric, not sector-centric**.

That means the right extension model is:

- core evidence engine for tool-using agents
- domain-authored case libraries on top of the core
- sector-specific assertions or scanners where needed
- optional vertical packages when a sector needs extra exports or handoff formats

The repository already supports the first part of that split well:

- case suites are external inputs, not hardcoded into the engine
- adapter seams already exist under `plugins/*`
- scanner logic is extensible in the evaluator
- vertical exports already exist as an added layer on top of the shared bundle model

The currently shipped vertical is the EU AI Act package.

## What The Core Is Not

The core platform is not:

- the whole compliance stack for every regulated sector
- a generic GRC platform
- a full model risk management system
- the best primary tool for population-scale statistical validation or historical backtesting when the main object is not an agent runtime

The honest claim is narrower and stronger:

> if the object under review is still a tool-using agent with measurable cases, runtime evidence, and review gates, the toolkit is a strong base layer; domain-specific compliance can then be added above it.

## Product Entry Points

Core operator commands:

```bash
npm run intake:init -- --profile support --euDossierRequired 0
npm run intake:validate -- --profile support
npm run intake:scaffold:cases -- --profile support
npm run intake:check:cases -- --profile support --cases cases/support.completed.json
npm run intake:check:adapter -- --profile support --cases cases/support.completed.json --baseUrl http://127.0.0.1:8788
npm run intake:check:runs -- --profile support --cases cases/support.completed.json --baselineDir apps/runner/runs/baseline/r1 --newDir apps/runner/runs/new/r1
```

```bash
npm run evidence:agent:package -- \
  --cases <cases.json> \
  --baselineDir <baseline-run-dir> \
  --newDir <new-run-dir> \
  --outDir apps/evaluator/reports/agent-evidence-demo \
  --reportId agent-evidence-demo
```

```bash
npm run evidence:agent:verify -- --reportDir apps/evaluator/reports/agent-evidence-demo
```

```bash
npm run review:init -- --reportDir apps/evaluator/reports/agent-evidence-demo [--profile support]
```

```bash
npm run review:check -- --reportDir apps/evaluator/reports/agent-evidence-demo [--profile support]
```

```bash
npm run evidence:agent:contracts
```

```bash
npm run demo:agent-evidence
```

```bash
npm run release:gate:agent-evidence
```

```bash
npm run demo:publish:surfaces
```

What the packaging command adds beyond a raw evaluator run:

- gives the team a structured upstream intake before case authoring and adapter work
- adds a live adapter onboarding gate before the first serious runner campaign
- adds a structural run comparability gate before packaging baseline/new evidence and persists the resulting run fingerprint
- snapshots `cases.json`, baseline run, and new run into `_source_inputs/`
- preserves portable report paths
- verifies the resulting bundle before handoff
- scaffolds and validates a structured human handoff record inside `review/`
- persists recurring corrective-action continuity back into intake after successful review checks
- exposes one deterministic demo and one release gate for the generic product surface
- feeds the website-ready proof root under `docs/demo/` when paired with `demo:publish:surfaces`

## Who This Is For

Primary buyers and champions:

- AI platform lead
- release engineering owner
- applied AI engineering manager
- product security lead
- DevOps owner responsible for promotion or incident review

These buyers do not necessarily need compliance framing.
They need release-grade evidence.

## Relationship To EU AI Act

EU AI Act should be presented as a vertical package on top of this core:

- core product: Agent Evidence Platform
- vertical package: EU AI Act Evidence Engine

That is the right split because the EU package reuses the same evidence engine and adds:

- compliance profile mapping
- clause coverage
- Annex IV dossier exports
- oversight/release/monitoring handoff docs for EU-facing buyers

Teams that only need agent evidence should stay on the core path.
Teams that need EU-specific dossier outputs should use the vertical package.

## Recommended Commercial Story

Use this sequence:

1. You already evaluate agents, but the output is not a release-grade evidence pack.
2. You need one self-hosted artifact for engineering, security, and release review.
3. Agent QA Toolkit gives you that core evidence layer.
4. If you later need regulation-specific packaging, add the EU AI Act package on top.

## Related Docs

- [Architecture](architecture.md)
- [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md)
- [EU AI Act Evidence Engine](eu-ai-act-evidence-engine.md)
