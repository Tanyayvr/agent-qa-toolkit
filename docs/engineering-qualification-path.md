# Engineering Qualification Path

Use this page if your question is:

> How do I qualify a tool-using AI agent for release without relying on dashboards, screenshots, or one-off green runs?

---

## What This Toolkit Is

Agent QA Toolkit is a self-hosted release qualification layer for tool-using AI agents.

It helps engineering teams answer four practical release questions:

- did the agent behave correctly across cases?
- was the run admissible for quality conclusions, or did execution failures mask the results?
- what is the honest validation path for this agent: `quick`, `full-lite`, `full`, or `diagnostic`?
- can CI and support act on deterministic machine fields instead of memory and internal dashboards?

---

## What You Get

Per run, the toolkit produces a portable release-evidence package you can inspect offline, attach to a ticket, and gate in CI:

- offline report (`report.html`)
- per-case replay diffs (`case-<id>.html`)
- machine contract (`compare-report.json`)
- manifest-indexed evidence with sha256 integrity
- retention and archive controls scaffold (`archive/retention-controls.json`)
- strict offline verify for portability and integrity
- deterministic per-case gate: `none | require_approval | block`
- structured review handoff (`review/review-decision.json`, `review/handoff-note.md`)

---

## What Problem This Solves

These are the situations this toolkit is built for:

- "it passed once, but it's flaky across runs"
- "baseline and new both timed out, so the diff looked clean even though the run was broken"
- "we can't share trace links with vendors or external reviewers"
- "the only way to understand the incident is to open several internal systems and ask the on-call engineer"
- "this agent is too slow for a full local loop — what's the honest path forward?"

The common thread: **run evidence that cannot be handed off is not evidence**. This toolkit turns a run into a portable, self-contained artifact another team can inspect without access to your internal tooling.

---

## Core Ideas

### One run = one portable evidence object

A failure becomes a handoff unit: offline HTML report, machine JSON contract, evidence files, and integrity manifest. Everything another team needs to understand what happened, without requiring access to your dashboards.

### Execution quality is first-class

A clean diff is not enough. If transport fails, timeouts dominate, or telemetry is missing, the run may be unusable for quality conclusions. Those cases are recorded as evidence and counted as `pass=false`.

### Honest validation paths

Not every agent belongs in the same loop:

| Path | When to use |
|---|---|
| `quick` | Readiness and smoke only |
| `full-lite` | Practical local regression path |
| `full` | Full release qualification |
| `diagnostic` | Slow but live agents |

What each path proves and does not prove is documented in the [operator runbook](agent-evidence-operator-runbook.md).

### Deterministic gating

CI can use the same machine contract that support and reviewers use later. One field, one decision:

```json
"gate_recommendation": "none" | "require_approval" | "block"
```

---

## Product-Grade Workflow

The production path is now more than runner plus evaluator. The toolkit supports a structured workflow with stage artifacts and gates:

1. **Intake** — define `system-scope.json` and `quality-contract.json`
2. **Cases** — scaffold and review `cases.json`, then persist `cases-coverage.json`
3. **Adapter onboarding** — prove the live adapter can satisfy `/run-case` expectations and persist `adapter-capability.json`
4. **Run comparability** — verify baseline/new structural comparability and persist `run-fingerprint.json`
5. **Package evidence** — build the portable Evidence Pack
6. **Review handoff** — scaffold and validate `review/review-decision.json` and `review/handoff-note.md`, then sync recurring `corrective-action-register.json` continuity when intake is attached

This makes the release workflow reproducible instead of team-memory-driven.

---

## Minimal Workflow

The smallest useful loop is four steps:

**Run:**

```bash
npm --workspace runner run dev -- \
  --baseUrl http://localhost:8787 \
  --cases cases/cases.json \
  --outDir apps/runner/runs \
  --runId latest
```

**Evaluate:**

```bash
npm --workspace evaluator run dev -- \
  --cases cases/cases.json \
  --baselineDir apps/runner/runs/baseline/latest \
  --newDir apps/runner/runs/new/latest \
  --outDir apps/evaluator/reports/latest \
  --reportId latest
```

**Verify:**

```bash
npm run pvip:verify:strict -- --reportDir apps/evaluator/reports/latest
```

**Gate** — CI reads:

```text
compare-report.json -> items[].gate_recommendation
```

---

## Recommended Production Workflow

For a real agent integration, use the full operator path:

**Intake and readiness:**

```bash
npm run intake:init -- --profile support --euDossierRequired 0
npm run intake:validate -- --profile support
npm run intake:scaffold:cases -- --profile support
npm run intake:check:cases -- --profile support --cases cases/support.completed.json
npm run intake:check:adapter -- --profile support --cases cases/support.completed.json --baseUrl http://127.0.0.1:8788
npm run intake:check:runs -- --profile support --cases cases/support.completed.json --baselineDir apps/runner/runs/baseline/r1 --newDir apps/runner/runs/new/r1
```

**Package and review:**

```bash
npm run evidence:agent:package -- \
  --cases cases/support.completed.json \
  --baselineDir apps/runner/runs/baseline/r1 \
  --newDir apps/runner/runs/new/r1 \
  --outDir apps/evaluator/reports/agent-evidence-demo \
  --reportId agent-evidence-demo
```

```bash
npm run evidence:agent:verify -- --reportDir apps/evaluator/reports/agent-evidence-demo
npm run review:init -- --reportDir apps/evaluator/reports/agent-evidence-demo --profile support
npm run review:check -- --reportDir apps/evaluator/reports/agent-evidence-demo --profile support
```

Or, to see the full loop end-to-end in a few minutes:

```bash
npm install
npm run demo:agent-evidence
```

---

## Recommended Next Docs

The toolkit itself is reproducible and claim-verifiable: see [VERIFY.md](VERIFY.md) and [CHRONOLOGY.md](CHRONOLOGY.md).

| Topic | Link |
|---|---|
| Full operator workflow | [agent-evidence-operator-runbook.md](agent-evidence-operator-runbook.md) |
| CI thresholds and gates | [ci.md](ci.md) |
| Agent integration contract | [agent-integration-contract.md](agent-integration-contract.md) |
| Architecture | [architecture.md](architecture.md) |
| Reproducibility checklist | [VERIFY.md](VERIFY.md) |
| Self-hosted deployment | [self-hosted.md](self-hosted.md) |
