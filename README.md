[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-vitest-brightgreen.svg)](#development)

# Agent QA Toolkit

A self-hosted release qualification layer for tool-using AI agents.

Most tools answer "was the output good?" or "what happened in production?"
This toolkit answers a harder question:

**Can you honestly release this agent — and can you prove it?**

It produces portable, offline-verifiable Evidence Packs and deterministic CI gates, while making the honest validation path explicit: `quick`, `full-lite`, `full`, or `diagnostic`.

Not every agent deserves the same validation loop. Pretending otherwise creates false confidence.

---

## Who This Is For

**Engineering / platform teams** — you run multiple agents, need regression loops, and want a deterministic CI gate that does not silently ignore transport and runtime failures. You get baseline vs new comparison, execution quality metrics, and a single JSON field that blocks the release.

**Enterprise / governance teams** — you need portable review artifacts: signed manifests, redacted evidence, structured intake records, and review handoff packages for internal security and compliance review. The same core platform ships an EU AI Act vertical for teams with regulatory timelines.

## Core Scope

The toolkit is a **core evidence engine for tool-using AI agents**.

That means:

- the core object under evaluation is an agent you can call through an adapter and exercise with cases
- sector-specific work should sit **above** the core as domain-authored case libraries, scanners/assertions, and optional vertical packages
- the currently shipped vertical package is the EU AI Act evidence path

This is **not** the whole domain compliance stack for every regulated sector.

It is a strong base when the question is still:

- can this agent be exercised on representative cases?
- can the result be qualified and packaged as portable evidence?
- can another reviewer verify what happened without our internal dashboards?

It is **not** the right primary tool for:

- static model validation with no agent runtime
- population-scale backtesting as the main evaluation object
- sector programs that are mostly document governance with little runtime evidence

---

## Quickstart

```bash
npm install
npm run demo
```

This runs a demo agent through a baseline and new campaign and produces an Evidence Pack at:

```text
apps/evaluator/reports/latest/report.html
```

One-command Docker:

```bash
docker compose up --build
```

Live demo (no install): https://tanyayvr.github.io/agent-qa-toolkit/demo/

## Try With Your Own Agent

If your adapter is already running, the fastest honest bridge is:

```bash
npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud
```

This generates a **starter evidence pack** on your own infrastructure. It proves
the toolkit pipeline works with your agent. It does **not** replace a real
qualification run.

Details: [docs/quickstart-your-agent.md](docs/quickstart-your-agent.md)

---

## What You Get

Per run, the toolkit produces a portable release-evidence package you can inspect offline, attach to a ticket, and gate in CI:

```text
report.html                offline human report
case-<case_id>.html        per-case replay diff for triage
compare-report.json        machine contract for CI and review
assets/                    evidence files
artifacts/manifest.json    sha256 integrity map
archive/retention-controls.json
review/review-decision.json
review/handoff-note.md     structured owner handoff
```

The manifest can be signed offline and verified by a Go or Python validator. The pack is portable across review boundaries: hand it to a security reviewer, a vendor, or a future on-call engineer who has no access to your internal tooling.

Beyond the artifact, every run gives you:

- baseline vs new regression comparison
- explicit separation of output quality vs execution quality
- transport and runtime failures counted as `pass=false`, not silently ignored
- flakiness tracking and loop detection
- security signals from 6 scanners
- local trend history across releases
- archive and retention controls scaffold for portable handoff

---

## Core Ideas

### Admissibility

A run is not just pass or fail. It is either admissible for quality conclusions or it is not.

A clean diff is not enough. If transport fails, timeouts dominate, or telemetry is missing, the run may be unusable for quality conclusions. Those cases are recorded as evidence and counted as `pass=false`. This separation of execution quality from output quality is what makes the CI gate meaningful rather than decorative.

### Honest Validation Path

Not every agent belongs in the same loop. A slow local CLI agent and a fast remote API agent should not be qualified the same way.

| Path | When to use |
|---|---|
| `quick` | Readiness and smoke only. Does **not** prove full quality. |
| `full-lite` | Practical local regression path for slower or local agents. |
| `full` | Full release qualification. Use intentionally, not by default. |
| `diagnostic` | Slow but live agents. Generous timeout envelope, same full suite. |

### CI Gate

One field per case drives CI:

```json
"gate_recommendation": "none" | "require_approval" | "block"
```

The gate reflects what the run actually proved, not what you hoped it proved.

### Structured Intake And Review Handoff

The product-grade path is not just runner plus evaluator. It also includes:

- intake scope and quality contract artifacts
- case completeness checks
- adapter onboarding checks
- baseline/new comparability checks
- structured review handoff and completion gates

That is what turns a one-off run into a repeatable release workflow.

---

## How It Works

```text
Intake scope + quality contract
    ↓
Runner  ->  run artifacts (baseline + new)
    ↓
Evaluator  ->  Evidence Pack (compare-report.json, HTML, manifest)
    ↓
Verify + review handoff
    ↓
CI gate / human review / external handoff
```

The runner executes cases against your agent via an adapter. The evaluator compares baseline vs new, computes execution quality, applies security scanners, and produces the Evidence Pack. CI, support, and reviewers all read the same machine contract.

Reference adapters:

- `cli-agent-adapter`
- `langchain-adapter`
- `openai-responses-adapter`
- `otel-anchor-adapter`

---

## What It Checks

**Execution quality** — transport success rate, weak assertion rate, timeout classification (`timeout_budget_too_small` / `agent_stuck_or_loop` / `waiting_for_input`), tool telemetry presence with explicit reason codes when required but absent.

**Output quality** — semantic text assertions with required and forbidden concepts, policy enforcement (`planning_gate` + `repl_policy`) with `policy_violation` evidence, decision legibility via `assumption_state` with selected and rejected candidate counts.

**Security signals** — PII and secret detection, prompt injection markers, action risk, outbound and exfiltration signals, output-quality and refusal signals, entropy-based token exfiltration when enabled.

---

## How This Is Different

|  | Agent QA Toolkit | LangSmith / Langfuse | Custom eval scripts |
|--|:---:|:---:|:---:|
| Portable offline artifact | ✅ | ❌ | ❌ |
| CI gate (single JSON field) | ✅ | Partial | Manual |
| Transport failures counted as `pass=false` | ✅ | ❌ | Manual |
| sha256 integrity + optional signed manifest | ✅ | ❌ | Manual |
| Explicit validation path (`quick` / `full-lite` / `full` / `diagnostic`) | ✅ | ❌ | ❌ |
| Redaction pre-write | ✅ | Configurable | Manual |
| No SaaS dependency | ✅ | ❌ | ✅ |

Most tools optimize for observability or output evaluation. This toolkit optimizes for **release qualification**: portable, deterministic, admissible evidence that an agent is ready to ship.

---

## Why Trust The Toolkit

We apply the same evidence standards to ourselves. The toolkit is claim-verifiable:

- reproducibility checklist → [docs/VERIFY.md](docs/VERIFY.md)
- capability chronology → [docs/CHRONOLOGY.md](docs/CHRONOLOGY.md)
- conformance tests across Node, Python, and Go validators
- strict offline verify for generated artifacts, including manifest signature checks in strict mode
- release gate in the repo: `npm run release:gate:ci`

---

## Vertical: EU AI Act Evidence Engine

For teams with regulatory timelines, the same core platform ships as an EU-oriented evidence workflow.

Key obligations for many providers of high-risk AI systems take effect on **2 August 2026**. Technical evidence — logging, traceability, robustness, review handoff, monitoring, and risk documentation — is required, not optional. Screenshots and declarations are not sufficient. Operational proof is.

The EU AI Act Evidence Engine packages the core qualification artifacts into a structured dossier: intake scope, quality contract, risk register, monitoring history, and a structured review handoff record.

When a regulator-, counsel-, or incident-facing package is needed, the EU path can also assemble an on-demand authority-response bundle from the verified report directory:

```bash
npm run compliance:eu-ai-act:authority-response:init -- --reportDir apps/evaluator/reports/latest
npm run compliance:eu-ai-act:authority-response -- --reportDir apps/evaluator/reports/latest
```

The authority bundle is intentionally post-review: it requires completed review artifacts, a completed `review/authority-request.json` that records disclosure scope, archive location, and legal-hold status, and a signed source bundle that can pass strict verification.

For engineering-only use, manifest hashes are usually enough. For authority- or counsel-facing handoff, authenticity matters as well as integrity. The EU path can sign `artifacts/manifest.json` and then run strict verification:

```bash
AQ_MANIFEST_PRIVATE_KEY=... \
npm run compliance:eu-ai-act -- --cases <cases> --baselineDir <baseline> --newDir <new> --outDir <out> --reportId <id> --verify-strict --sign
```

That produces `artifacts/manifest.sig` and lets strict verification check authenticity, not only hash integrity. `authority-response` now assumes this stricter path for external handoff instead of treating signing as an optional afterthought.

This is a vertical extension, not the whole product. Engineering teams without compliance requirements do not need it.

```bash
npm run demo:eu-ai-act
```

Details:

- [EU Governance Evidence Path](docs/eu-governance-evidence-path.md)
- [EU AI Act Evidence Engine](docs/eu-ai-act-evidence-engine.md)
- [EU AI Act Buyer Guide](docs/eu-ai-act-buyer-guide.md)

---

## Docs

| | Link |
|---|---|
| **Engineering path** | [docs/engineering-qualification-path.md](docs/engineering-qualification-path.md) |
| **EU governance path** | [docs/eu-governance-evidence-path.md](docs/eu-governance-evidence-path.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| CI integration | [docs/ci.md](docs/ci.md) |
| Agent integration contract | [docs/agent-integration-contract.md](docs/agent-integration-contract.md) |
| Agent evidence platform | [docs/agent-evidence-platform.md](docs/agent-evidence-platform.md) |
| Security scanners | [docs/security-scanners.md](docs/security-scanners.md) |
| Threat model | [docs/threat-model.md](docs/threat-model.md) |
| Operations model | [docs/evidence-operations-model.md](docs/evidence-operations-model.md) |
| Automation boundary | [docs/automation-boundary-and-tech-debt.md](docs/automation-boundary-and-tech-debt.md) |
| Reproducibility | [docs/VERIFY.md](docs/VERIFY.md) |
| Capability chronology | [docs/CHRONOLOGY.md](docs/CHRONOLOGY.md) |

---

## Development

Runner:

```bash
npm --workspace runner run dev -- \
  --baseUrl http://localhost:8787 \
  --cases cases/cases.json \
  --outDir apps/runner/runs \
  --runId latest
```

Evaluator:

```bash
npm --workspace evaluator run dev -- \
  --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/latest \
  --newDir apps/runner/runs/new/latest \
  --outDir apps/evaluator/reports/latest \
  --reportId latest
```

Tests:

```bash
npm test
npm run test:coverage
npm run release:gate:ci
```

Full development reference → [docs/architecture.md](docs/architecture.md)
