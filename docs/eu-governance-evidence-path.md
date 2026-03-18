# EU Governance Evidence Path

Use this page if your question is:

> How do we produce portable technical evidence for AI review, release gating, oversight, and EU-oriented governance workflows without depending on SaaS dashboards?

---

## What This Toolkit Is

Agent QA Toolkit is a self-hosted evidence engine for tool-using AI agents.

It is not legal advice and not a generic compliance suite. Its role is technical: generate portable evidence artifacts, make execution quality and admissibility explicit, support internal review and release gating, and help teams prepare dossier-ready technical material.

---

## What You Get

Per evaluated run, the toolkit produces a portable evidence package ready for internal review and handoff:

- offline human report (`report.html`)
- machine-readable contract (`compare-report.json`)
- manifest-indexed evidence with sha256 integrity hashes
- strict offline verify with no SaaS dependency
- structured review handoff support
- deterministic gate recommendations: `none | require_approval | block`

For the EU-oriented vertical, the bundle also adds dossier-facing exports such as:

- clause coverage
- Annex IV structure
- Article 13 instructions scaffold
- Article 9 risk register scaffold
- Article 17 QMS-lite scaffold
- Article 72 monitoring-plan scaffold
- oversight, release, and post-market monitoring outputs

Those scaffolds are then tracked through structured owner completion in the review record.
Recurring residual gaps can also be linked across review cycles through the corrective-action register when the bundle is tied back to an intake profile.

---

## What Problem This Solves

In governance-oriented workflows the hard question is rarely "was the answer good?" It is:

- can another reviewer understand what happened without access to our internal tooling?
- can we distinguish model and output issues from runtime degradation?
- can we hand evidence across approval chains, vendors, or external reviewers?
- can we produce a reproducible artifact that supports an internal review decision?

The toolkit solves this by turning one run into one portable evidence object — self-contained, offline-verifiable, and portable across review boundaries.

---

## Strongest Fit

This toolkit is strongest where the evidence requirement is technical rather than legal:

- **logging and run reconstruction** — structured replay diffs and machine contracts make incidents reconstructible without internal access
- **robustness and reliability evidence** — execution quality metrics and admissibility separation make failure modes explicit and auditable
- **human review handoff** — the Evidence Pack is designed to be handed to a reviewer who did not run the campaign
- **release gating with deterministic fields** — CI and review use the same machine contract
- **internal governance workflows** — portable artifacts that survive tooling and team changes
- **EU AI Act preparation** — dossier-ready technical exports for Article 9, 12, 13, 14, 15, 17, and 72 adjacent workflows

For regulated and air-gapped environments: self-hosted, offline-verifiable, vendor-neutral, no mandatory data egress.

---

## Short Workflow

**Intake and readiness:**

```bash
npm run intake:init -- --profile support --euDossierRequired 1
npm run intake:validate -- --profile support
npm run intake:scaffold:cases -- --profile support
npm run intake:check:cases -- --profile support --cases cases/support.completed.json
npm run intake:check:adapter -- --profile support --cases cases/support.completed.json --baseUrl http://127.0.0.1:8788
npm run intake:check:runs -- --profile support --cases cases/support.completed.json --baselineDir apps/runner/runs/baseline/r1 --newDir apps/runner/runs/new/r1
```

**Package EU-oriented evidence:**

```bash
npm run compliance:eu-ai-act -- \
  --cases cases/support.completed.json \
  --baselineDir apps/runner/runs/baseline/r1 \
  --newDir apps/runner/runs/new/r1 \
  --outDir apps/evaluator/reports/eu-ai-act-demo \
  --reportId eu-ai-act-demo
```

**Verify and hand off:**

```bash
npm run compliance:eu-ai-act:verify -- --reportDir apps/evaluator/reports/eu-ai-act-demo
npm run review:init -- --reportDir apps/evaluator/reports/eu-ai-act-demo --profile support
npm run review:check -- --reportDir apps/evaluator/reports/eu-ai-act-demo --profile support
```

**EU-oriented demo:**

```bash
npm run demo:eu-ai-act
```

---

## EU AI Act Timeline

Key obligations for many providers of high-risk AI systems take effect on **2 August 2026**.

This vertical packages the core qualification artifacts into a structured dossier: intake scope, quality contract, risk register, monitoring history, and a structured review handoff record.

This is a vertical extension of the core platform, not a separate engine and not a substitute for legal classification or legal sign-off.

---

## Recommended Next Docs

The toolkit itself is reproducible and claim-verifiable: see [VERIFY.md](VERIFY.md) and [CHRONOLOGY.md](CHRONOLOGY.md).

| Topic | Link |
|---|---|
| EU AI Act positioning | [eu-ai-act-evidence-engine.md](eu-ai-act-evidence-engine.md) |
| Buyer guide | [eu-ai-act-buyer-guide.md](eu-ai-act-buyer-guide.md) |
| Operator workflow | [eu-ai-act-operator-runbook.md](eu-ai-act-operator-runbook.md) |
| Review handoff checklist | [eu-ai-act-review-handoff-checklist.md](eu-ai-act-review-handoff-checklist.md) |
| Self-hosted guidance | [eu-ai-act-self-hosted-guidance.md](eu-ai-act-self-hosted-guidance.md) |
| Operations model | [evidence-operations-model.md](evidence-operations-model.md) |
| Reproducibility checklist | [VERIFY.md](VERIFY.md) |

Live demo: https://tanyayvr.github.io/agent-qa-toolkit/demo/
