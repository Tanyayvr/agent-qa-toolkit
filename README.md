[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-vitest-brightgreen.svg)](#development)

# Agent QA Toolkit

A self-hosted evidence and release-qualification toolkit for tool-using AI agents.

The repository is intentionally open for self-serve use:

- run starter and full qualification paths on your own agent
- generate portable evidence packs and CI-facing machine contracts
- use the same core for the EU AI Act minimum package path

Commercial support, hosted workflows, and customer-specific implementation do **not** live in this repository.

---

## What The Repository Includes

### Agent Toolkit core

Use the core toolkit when you need to:

- run baseline vs new comparisons on a real agent
- separate output quality from execution quality
- generate portable evidence packs that can be verified offline
- gate release decisions with deterministic machine fields

### EU AI Act path

Use the EU path when you need to:

- build a first provider-side draft for a high-risk AI system
- run a lightweight starter check on your own agent
- assemble the minimum EU AI Act package from real runs

The EU path in this repository is the **minimum provider-side path**, not a full legal service and not a hosted compliance platform.

---

## Quick Start

Install dependencies and run the demo:

```bash
npm install
npm run demo
```

This writes a demo evidence pack to:

```text
apps/evaluator/reports/latest/report.html
```

One-command Docker:

```bash
docker compose up --build
```

---

## Run It On Your Own Agent

If your adapter is already running, start with the generic starter:

```bash
npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud
```

This is a self-serve starter check. It proves the toolkit can reach your agent and produce a first package. It does **not** replace a full qualification run.

Details:

- [docs/quickstart-your-agent.md](docs/quickstart-your-agent.md)
- [docs/agent-integration-contract.md](docs/agent-integration-contract.md)

---

## EU AI Act Path

The EU path is built on top of the same open core.

### 1. Build the draft

Open the Builder on the public site and complete the first provider-side draft:

- https://tanyayvr.github.io/agent-qa-toolkit/en/builder/

### 2. Run the self-serve EU starter

```bash
npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent
```

This is a lightweight first EU starter check on your own running adapter.

### 3. Build the real minimum package

```bash
npm run compliance:eu-ai-act -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id>
```

This is the real self-hosted EU AI Act minimum package path from real runs.

Useful EU docs:

- [docs/eu-ai-act-starter.md](docs/eu-ai-act-starter.md)
- [docs/eu-ai-act-evidence-engine.md](docs/eu-ai-act-evidence-engine.md)
- [docs/eu-ai-act-self-hosted-guidance.md](docs/eu-ai-act-self-hosted-guidance.md)
- [docs/eu-ai-act-operator-runbook.md](docs/eu-ai-act-operator-runbook.md)

---

## What The Core Toolkit Produces

Per run, the core toolkit produces a portable evidence pack you can inspect offline and use in CI:

```text
report.html
case-<case_id>.html
compare-report.json
assets/
artifacts/manifest.json
archive/retention-controls.json
review/review-decision.json
review/handoff-note.md
```

What this gives you:

- baseline vs new comparison
- explicit execution-quality signals
- transport and runtime failures counted honestly
- offline-verifiable artifacts
- manifest-based integrity

---

## What The EU Path Adds

The EU path adds provider-side documentation and EU-shaped outputs around the same core evidence engine.

That includes:

- Builder-driven provider-side draft sections
- Annex IV and linked article templates
- EU starter check on your own agent
- minimum EU package exports and verification

The EU path does **not** replace:

- legal interpretation
- final legal sign-off
- provider-owned final approval

---

## Open-Source Boundary

This repository is for self-serve use.

It includes:

- the open core toolkit
- self-hosted starter and packaging commands
- public Builder and templates
- reference adapters and integration contracts

It does **not** include:

- hosted workspaces
- commercial support terms
- customer-specific onboarding playbooks
- private implementation or delivery checklists

---

## Documentation

| Surface | Link |
|---|---|
| Engineering path | [docs/engineering-qualification-path.md](docs/engineering-qualification-path.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| Agent integration contract | [docs/agent-integration-contract.md](docs/agent-integration-contract.md) |
| EU AI Act engine | [docs/eu-ai-act-evidence-engine.md](docs/eu-ai-act-evidence-engine.md) |
| EU starter | [docs/eu-ai-act-starter.md](docs/eu-ai-act-starter.md) |
| EU self-hosted guidance | [docs/eu-ai-act-self-hosted-guidance.md](docs/eu-ai-act-self-hosted-guidance.md) |
| EU operator runbook | [docs/eu-ai-act-operator-runbook.md](docs/eu-ai-act-operator-runbook.md) |
| CI integration | [docs/ci.md](docs/ci.md) |
| Security scanners | [docs/security-scanners.md](docs/security-scanners.md) |
| Threat model | [docs/threat-model.md](docs/threat-model.md) |
| Verification checklist | [docs/VERIFY.md](docs/VERIFY.md) |
| Capability chronology | [docs/CHRONOLOGY.md](docs/CHRONOLOGY.md) |

---

## Development

Run checks:

```bash
npm test
npm run test:coverage
npm run release:gate:ci
```

Full development reference:

- [docs/architecture.md](docs/architecture.md)
