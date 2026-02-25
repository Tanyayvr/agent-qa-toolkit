<!-- /README.md -->
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-93%20passing-brightgreen.svg)](#)

# Agent QA Toolkit — Portable Evidence Packs, Regression Diffs, and CI Gates

The only open‑source regression testing framework purpose‑built for tool‑using AI agents.
Most tools measure model quality. We measure agent behavior:
did it call the right tools, in the right order, with safe parameters — and can you  prive it?

Portable Evidence Packs · Regression Diffs · CI Gates · Security Signals

Why this exists: most observability tools trace what happened, but do not produce a portable, signed, offline‑verifiable artifact you can attach to a ticket or gate in CI. This toolkit does - via Evidence Packs + per‑case CI gate decisions + offline artifacts.

Quick links:
[Quickstart](#quickstart) · [Live report](https://tanyayvr.github.io/agent-qa-toolkit/demo/report.html) · [Demo bundle](#demo-bundle) · [CI usage](docs/ci.md) · [Evidence Pack contract](#evidence-pack-format) · [Security scanners](docs/security-scanners.md) · [Architecture](docs/architecture.md)

## Table of Contents
1. [What You Get](#what-you-get)
2. [Quickstart](#quickstart)
3. [Demo Bundle](#demo-bundle)
4. [Evidence Pack Format](#evidence-pack-format)
5. [CI Gate Decision](#ci-gate-decision)
6. [Security Scanners](#security-scanners)
7. [Docs Map](#docs-map)
8. [Development](#development)

---

## What You Get
Turn agent runs into a portable evidence pack you can share and gate in CI:

Incident - Evidence Pack - RCA - Risk/Gate Decision

You get:
- Baseline vs New regression runs
- Per‑case replay diff (`case-<case_id>.html`) for human triage
- Machine report (`compare-report.json`) as the source of truth for CI dashboards and gating
- Root cause attribution (RCA) and policy hints
- Security signals (6 scanners + optional entropy scanner)

## What makes this different
|  | Agent QA Toolkit | LangSmith / Langfuse | Custom eval scripts |
|--|:---:|:---:|:---:|
| Portable offline artifact | ✅ | ❌ | ❌ |
| CI gate (single JSON field) | ✅ | Partial | Manual |
| Integrity checks (sha256) | ✅ | ❌ | Manual |
| Signed manifest (optional, offline) | ✅ | ❌ | ❌ |
| Redaction pre-write (runner truth) | ✅ | Configurable / depends | Manual |
| Token cost tracking | ✅ | ✅ | Manual |
| Loop detection | ✅ | Depends | Manual |
| Flakiness / pass_rate | ✅ | Partial / depends | Custom |
| No SaaS dependency | ✅ | ❌ | ✅ |

Notes: see `docs/comparison.md` for rationale.

---

## Quickstart
```bash
npm install
npm run demo
```
Open the report:
```
apps/evaluator/reports/latest/report.html
```

Live report (no install):
https://tanyayvr.github.io/agent-qa-toolkit/demo/report.html

---

## Demo Bundle
Open an example pack: `examples/demo-bundle.zip`  
Live demo (no install): https://tanyayvr.github.io/agent-qa-toolkit/demo/report.html

## Screenshots
![Report 1](docs/assets/screenshots/01.png)
![Report 2](docs/assets/screenshots/02.png)
![Report 3](docs/assets/screenshots/03.png)
![Report 4](docs/assets/screenshots/04.png)
![Report 5](docs/assets/screenshots/05.png)
![Report 6](docs/assets/screenshots/06.png)

---

## Evidence Pack Format
Evaluator produces a self‑contained report directory:
- `report.html` - overview report
- `case-<case_id>.html` — per‑case replay diff
- `compare-report.json` — CI contract
- `assets/` — evidence files
- `artifacts/manifest.json` — canonical evidence map (sha256)

Schema:
- `schemas/compare-report-v5.schema.json`

Manifest integrity:
- `pvip:verify` enforces portable paths, in‑bundle hrefs, and embedded index consistency

Manifest signing (optional):
```bash
export AQ_MANIFEST_PRIVATE_KEY=<base64-der-pkcs8>
npm run manifest:sign -- apps/evaluator/reports/latest

export AQ_MANIFEST_PUBLIC_KEY=<base64-der-spki>
npm run pvip:verify:strict -- --reportDir apps/evaluator/reports/latest
```

---

## CI Gate Decision
One field per case drives CI:
```
none | require_approval | block
```
See:
- `compare-report.json` → `items[].gate_recommendation`

---

## Security Scanners
Six scanners run in the pipeline:
- PII/secret detection
- Prompt injection markers
- Action risk (unsafe tools)
- Outbound/exfiltration
- Output quality/refusals
- Entropy‑based token exfiltration (optional)

Details:
- `docs/security-scanners.md`

---

## Docs Map
- Quick install: `docs/installation.md`
- Architecture: `docs/architecture.md`
- Agent contract: `docs/agent-integration-contract.md`
- CI guide: `docs/ci.md`
- Self‑hosted policy: `docs/self-hosted.md`

---

## Development
Runner:
```bash
npm --workspace runner run dev -- --baseUrl http://localhost:8787 --cases cases/cases.json --outDir apps/runner/runs --runId latest
```

Evaluator:
```bash
npm --workspace evaluator run dev -- --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest
```

Tests:
```bash
npm test
```

---

## What’s in this repo
- `apps/demo-agent` — demo HTTP agent with deterministic baseline/new responses
- `apps/runner` — executes cases and writes run artifacts
- `apps/evaluator` — evaluates artifacts, computes risk/gates, generates HTML
- `packages/shared-types` — canonical contract types (runtime‑0)
- `packages/cli-utils` — CLI helpers
- `packages/redaction` — PII redaction engine
- `packages/agent-sdk` — HTTP server + helpers for connecting your agent

---

## Pilot Program
We’re onboarding 5 teams in the pilot cohort.  
Apply: https://github.com/Tanyayvr/agent-qa-toolkit/issues/new?template=pilot_request.yml
