# Evidence Operations Model

This document is the working operational source of truth for how Agent QA Toolkit is used in practice.

It covers:

- the real delivery chain from scoping to handoff
- what inputs must exist at each stage
- what "ready" means at each stage
- which parts are automated today
- which parts remain human-owned
- what is sold as OSS self-serve, Launch Pack, and monthly support

This document is intentionally operational.
It is not a pitch deck and it is not legal guidance.

## Scope

This model applies to both product surfaces:

- core: Agent Evidence Platform
- vertical: EU AI Act Evidence Engine

The EU path reuses the same evidence engine and adds dossier-facing exports later in the chain.

## Automation Boundary

What the toolkit automates well today:

- structured intake initialization and validation (`system-scope.json`, `quality-contract.json`)
- draft `cases.json` scaffolding from the intake layer
- persistent intake-to-case coverage artifact generation (`cases-coverage.json`)
- persistent adapter capability profile generation (`adapter-capability.json`)
- persistent run fingerprint generation (`run-fingerprint.json`)
- persistent corrective-action register generation (`corrective-action-register.json`)
- runner-normalized baseline/new runs
- portable evidence packaging
- bundle verification
- report generation
- integrity manifests
- EU clause coverage and dossier exports

What the toolkit does not create automatically:

- the right system scope
- the right cases
- the right adapter contract for a given stack
- the right pass/risk policy for a given team
- operator-authored narrative and review notes
- legal interpretation and final signoff

Operationally, the toolkit is strongest on:

`prepared inputs -> verified technical evidence bundle`

The main human work remains:

`scope -> quality contract -> integration -> governance decision`

## Roles

| Role | Main responsibility |
| --- | --- |
| System owner | Defines what system is in scope, what change is being evaluated, and what a successful rollout means |
| Evaluation owner | Designs cases, quality assertions, and gate semantics |
| Integration owner | Connects the agent or adapter to the runner contract |
| Release owner | Decides whether the resulting bundle is sufficient for promotion or restriction |
| Compliance owner | Uses technical evidence in internal governance or regulatory preparation |
| Counsel / legal reviewer | Owns legal interpretation, classification, and final legal signoff |

One person may play multiple roles in a small team.

## Commercial Boundary

### OSS Self-Serve

Customer owns:

- system scoping
- case authoring
- adapter setup
- baseline/new runs
- bundle generation
- narrative completion
- legal review

Toolkit provides:

- open-source runner/evaluator/packager/verify flow
- docs, templates, validators, demos, and reference integrations

### Launch Pack

We help with one supported agent and one first delivery cycle.

Typical scope:

- scope review for one agent
- first quality cases review
- adapter or integration alignment
- first baseline/new run path
- first packaged bundle
- operator handoff of the working process

Out of scope unless separately agreed:

- full legal drafting
- final legal signoff
- unlimited case authoring
- unlimited new-agent onboarding

### Monthly Support

Monthly support is for supported agents on a recurring plan.
It is not unlimited done-for-you implementation.

Typical scope:

- support on recurring runs
- troubleshooting and calibration
- case-set refinement
- gate and threshold tuning
- trend and monitoring interpretation
- bundle review guidance for release or governance workflows

Out of scope unless separately agreed:

- full manual onboarding of every new agent
- full rewriting of customer documentation
- legal opinions or notified-body handling

## Operating Sequence

1. Define the system in scope.
2. Define what counts as good, bad, and risky.
3. Prepare a quality-grade `cases.json`.
4. Connect the agent or adapter to `/run-case`.
5. Produce comparable baseline/new run inputs.
6. Package and verify the evidence bundle.
7. If needed, add the EU AI Act profile and dossier exports.
8. Complete human review, narrative, and signoff.

The steps are sequential on purpose.
If the team skips step 1 or 2, the rest of the pipeline becomes mechanically correct but operationally weak.

Current operator commands for the upstream part of the chain:

- `npm run intake:init -- --profile <name> [--euDossierRequired 1]`
- `npm run intake:validate -- --profile <name>`
- `npm run intake:scaffold:cases -- --profile <name>`
- `npm run intake:check:cases -- --profile <name> --cases <cases.json>`

Current operator commands for the downstream review handoff:

- `npm run review:init -- --reportDir <report-dir> [--profile <name>]`
- `npm run review:check -- --reportDir <report-dir> [--profile <name>]`

## Stage 0: System Scope Freeze

- **Goal:** define exactly what system, change, and deployment context are being evaluated.
- **Primary owner:** system owner.
- **Supporting owners:** evaluation owner, release owner, compliance owner if EU-facing.
- **Exact input checklist:**
  - system name and internal identifier
  - agent identifier or endpoint name
  - intended use in one sentence
  - in-scope tools and out-of-scope tools
  - target environment for baseline and new
  - change being evaluated
  - risk owner and release owner
  - whether EU dossier output is needed
- **Ready gate:** the team can answer "what system is under test, what change is being compared, and who decides promotion" without ambiguity.
- **Expected output:** one short scope brief that downstream steps can reference.
- **Automation available today:** `npm run intake:init` creates `ops/intake/<profile>/system-scope.json`, and `npm run intake:validate` checks schema completeness, owner fields, overlap errors, and unresolved placeholders.
- **Self-serve:** customer writes the scope brief.
- **Launch Pack:** we review and normalize the scope brief for one supported agent.
- **Monthly support:** we review scope changes over time for supported agents.

## Stage 1: Quality Contract (`good / bad / risky`)

- **Goal:** convert vague expectations into machine-checkable acceptance and escalation rules.
- **Primary owner:** evaluation owner.
- **Supporting owners:** system owner, release owner, product security owner when actions are risky.
- **Exact input checklist:**
  - list of critical tasks the agent must perform
  - list of tasks it must refuse or escalate
  - risky actions and risky tools
  - rules for `none`, `require_approval`, and `block`
  - required outputs, schemas, and tool sequences where relevant
  - rules for ambiguity handling and missing-information handling
- **Ready gate:** every critical scenario has an explicit machine-checkable success or escalation contract.
- **Expected output:** a written quality contract that can be encoded into case expectations.
- **Automation available today:** `npm run intake:init` also creates `ops/intake/<profile>/quality-contract.json`, and `npm run intake:validate` checks cross-file consistency, telemetry mismatches, and minimum quality targets.
- **Self-serve:** customer defines the quality contract.
- **Launch Pack:** we help translate the contract into first-pass case expectations for one supported agent.
- **Monthly support:** we help tune thresholds and gate semantics as the system evolves.

## Stage 2: `cases.json`

- **Goal:** represent the quality contract as a versioned case suite.
- **Primary owner:** evaluation owner.
- **Supporting owners:** system owner, integration owner.
- **Exact input checklist:**
  - stable case ids
  - case titles
  - `input.user` for every case
  - `input.context` where runtime context matters
  - explicit `expected` assertions for important cases
  - metadata for severity, tags, and suite segmentation
  - tool expectations for tool-using workflows
  - semantic expectations where text quality matters
  - assumption-state expectations where decision legibility matters
- **Current code contract:** `cases.json` must be an array of objects with `id`, `title`, `input`, optional `expected`, optional `metadata`, see `apps/runner/src/runnerTypes.ts` and `apps/runner/src/runnerCli.ts`.
- **Operational quality bar:** a quality-grade suite should not rely on weak or empty `expected` blocks for most important cases; use `scripts/validate-cases-quality.mjs` to check weak-rate, semantic quality, and assumption-state coverage.
- **Ready gate:**
  - file parses cleanly
  - case ids are stable and unique
  - critical scenarios are covered
  - quality validator passes under the chosen profile
- **Expected output:** one versioned `cases.json` plus a persistent `cases-coverage.json` artifact that records what is covered, missing, weak, or unmapped.
- **Automation available today:** `npm run intake:scaffold:cases -- --profile <name>` generates a draft `cases/<profile>.intake-scaffold.json` from the quality contract. It is a starter file, not a substitute for human review.
- **Automation available today:** `npm run intake:check:cases -- --profile <name> --cases <cases.json>` checks task/risk/refusal coverage, scenario variants, required ratios, and whether draft markers or TODO placeholders remain in the suite, then writes `ops/intake/<profile>/cases-coverage.json`.
- **Self-serve:** customer authors and maintains the case file.
- **Launch Pack:** we review or co-design the first quality-grade cases file for one supported agent.
- **Monthly support:** we review incremental case additions, drift in weak-rate, and whether the suite still reflects real operational risk.

## Stage 3: Agent / Adapter Integration

- **Goal:** make the system callable through the canonical `/run-case` contract.
- **Primary owner:** integration owner.
- **Supporting owners:** evaluation owner, system owner.
- **Exact input checklist:**
  - reachable adapter or service URL
  - `/run-case` endpoint contract
  - support for `baseline` and `new` versions
  - mapping from toolkit request payload to the real agent runtime
  - response mapping back to `final_output`
  - `events` when tool or retrieval evidence is needed
  - `trace_anchor` when trace correlation is needed
  - `assumption_state` when decision legibility is required
  - runtime policy and handoff support if those features are in scope
- **Current code contract:** request and response shape live in `packages/shared-types/src/index.ts`.
- **Operational quality bar:** integration is not "done" when the adapter returns text; it is done when it returns the telemetry and evidence depth the chosen quality contract depends on.
- **Automation available today:** `npm run intake:check:adapter -- --profile <name> --cases <cases.json> --baseUrl <adapter>` verifies `/health`, preflight support, and a live `/run-case` canary selected from the reviewed case suite, then writes `ops/intake/<profile>/adapter-capability.json`.
- **Ready gate:**
  - adapter is reachable
  - canary case returns a valid response shape
  - baseline/new version routing works
  - required telemetry fields are present for the chosen case suite
- **Expected output:** a stable integration path that runner can call repeatedly, plus an `adapter-capability.json` artifact that records the proven telemetry depth and current evidence limits.
- **Self-serve:** customer builds or configures the adapter.
- **Launch Pack:** we help align one supported agent to the contract and verify the first working path.
- **Monthly support:** we help when integrations break, drift, or need calibration for supported agents.

## Stage 4: Baseline / New Run Inputs

- **Goal:** produce comparable runtime evidence for "before" and "after".
- **Primary owner:** integration owner or evaluation owner, depending on the team.
- **Supporting owners:** system owner, release owner.
- **Exact input checklist:**
  - one approved `cases.json`
  - baseline target
  - new target
  - same runtime envelope unless the change intentionally differs
  - timeout and retry settings
  - preflight mode
  - redaction preset
  - incident id or run grouping convention
  - optional multi-run count for flakiness
- **Current code contract:** runner emits per-case JSON files plus `run.json`, and when `--runs > 1` also writes `flakiness.json`.
- **Operational quality bar:** baseline and new must be comparable; if environments or budgets differ silently, the diff becomes untrustworthy.
- **Automation available today:** `npm run intake:check:runs -- --profile <name> --cases <cases.json> --baselineDir <run-dir> --newDir <run-dir>` checks selected-case alignment, runner envelope mismatches, preflight/interruption/fail-fast state, missing case artifacts, and durable environment clues before packaging, then writes `ops/intake/<profile>/run-fingerprint.json`.
- **Ready gate:**
  - runner completed with valid `run.json` in both dirs
  - selected-case list matches expectation
  - preflight did not fail in strict mode
  - transport failures are understood, not ignored
  - if multi-run was used, flakiness summary is reviewed
- **Expected output:** two runner-style directories ready for packaging, plus a persistent `run-fingerprint.json` artifact that records structural comparability, environment clues, and missing-signal visibility.
- **Self-serve:** customer runs the campaigns.
- **Launch Pack:** we help produce the first comparable baseline/new pair for one supported agent.
- **Monthly support:** we help tune runtime envelopes, investigate failures, and interpret flakiness over time.

## Stage 5: Portable Bundle Packaging

- **Goal:** convert prepared inputs into a handoff-grade evidence bundle.
- **Primary owner:** evaluation owner or release owner.
- **Supporting owners:** integration owner.
- **Exact input checklist:**
  - `cases.json`
  - baseline run directory
  - new run directory
  - output directory
  - report id
  - optional environment file
  - optional trend DB if monitoring context is needed
- **Current code contract:** `scripts/agent-evidence-package.mjs` snapshots inputs into `_source_inputs/`, runs evaluator, then runs verification.
- **Operational quality bar:** bundle must be portable and self-contained; the evidence consumer should not need access to the original runtime directories.
- **Ready gate:**
  - `compare-report.json` exists
  - `report.html` exists
  - `artifacts/manifest.json` exists
  - `_source_inputs/cases.json`, `_source_inputs/baseline/run.json`, `_source_inputs/new/run.json` exist
  - `quality_flags.self_contained === true`
  - `quality_flags.portable_paths === true`
  - `npm run evidence:agent:verify -- --reportDir <dir>` exits cleanly
- **Expected output:** one portable Agent Evidence bundle.
- **Self-serve:** customer packages and verifies bundles directly.
- **Launch Pack:** we help produce and review the first serious bundle for one supported agent.
- **Monthly support:** we help interpret recurring bundle results and failures for supported agents.

## Stage 6: EU AI Act Dossier Layer

- **Goal:** add EU-facing clause coverage and dossier exports on top of the core bundle.
- **Primary owner:** compliance owner or evaluation owner.
- **Supporting owners:** system owner, release owner.
- **Exact input checklist:**
  - verified core evidence bundle inputs
  - compliance profile
  - system/environment metadata
  - operator-owned intended-use and deployment-context notes for later human completion
- **Current code contract:** `scripts/eu-ai-act-package.mjs` wraps the core packaging flow and injects the EU profile by default.
- **Operational quality bar:** the output must stay honest about scope; runtime evidence may support Articles 9, 12, 13, 14, 15 strongly, while Articles 10, 11, full Annex IV completion, and Article 72 still retain operator-owned gaps.
- **Ready gate:**
  - EU packaging command completes successfully
  - EU verify passes
  - coverage and dossier exports are present
  - residual gaps are explicit, not hidden
- **Expected output:** one evidence bundle plus EU dossier-facing exports such as coverage, Annex IV structure, Article 13 instructions scaffold, Article 9 risk register scaffold, Article 17 QMS-lite scaffold, Article 72 monitoring-plan scaffold, oversight summary, release review, and post-market monitoring export.
- **Self-serve:** customer runs the EU package and fills the remaining operator-authored sections.
- **Launch Pack:** we help produce the first EU-facing technical package for one supported agent.
- **Monthly support:** we help tune recurring monitoring, clause coverage interpretation, and dossier handoff mechanics for supported agents.

## Stage 7: Human Narrative, Review, and Signoff

- **Goal:** turn machine evidence into an actual business or governance decision.
- **Primary owner:** release owner for core path, compliance owner for EU path.
- **Supporting owners:** system owner, evaluation owner, counsel where needed.
- **Exact input checklist:**
  - packaged bundle
  - intended-use statement
  - system boundary description
  - deployment context
  - change summary
  - residual risk note
  - monitoring cadence
  - reviewer names and decision owner
- **Operational quality bar:** every important narrative claim should map back to bundle evidence, and every residual gap should have an owner.
- **Automation available today:** `npm run review:init -- --reportDir <report-dir> [--profile <name>]` scaffolds `review/review-decision.json` and `review/handoff-note.md` directly inside the bundle, optionally snapshots `system-scope.json`, `quality-contract.json`, and an existing `corrective-action-register.json`, pre-populates machine-derived gap actions, and for EU bundles also scaffolds an owner-completion record for Article 13, Article 17, and Article 72 exports.
- **Automation available today:** `npm run review:check -- --reportDir <report-dir> [--profile <name>]` validates the review schema, blocks `pending` decisions, rejects unresolved `TODO` placeholders, requires every machine-derived residual gap to be dispositioned by a named owner, requires recurring-gap continuity metadata to stay coherent, and for EU bundles requires the Article 13/17/72 owner-completion loop to be explicitly completed. On successful checks with intake attached, it also syncs `ops/intake/<profile>/corrective-action-register.json` and refreshes `review/intake/corrective-action-register.json`.
- **Ready gate:**
  - release or governance decision is explicitly recorded
  - residual gaps are accepted, mitigated, or escalated
  - narrative does not contradict the machine evidence
  - legal review is requested when legal interpretation is required
- **Expected output:** one review-ready or audit-ready handoff package with `review/review-decision.json`, `review/handoff-note.md`, optional `review/intake/*` snapshots, and for intake-linked reviews a durable corrective-action register that links repeated gaps across runs.
- **Self-serve:** customer writes the narrative, performs review, and owns signoff.
- **Launch Pack:** we help structure the first handoff package, but do not replace internal approvers or counsel.
- **Monthly support:** we help teams maintain a repeatable review workflow and interpret recurring evidence outputs.

## Minimum Definition of Done By Stage

| Stage | Minimum done condition |
| --- | --- |
| Scope freeze | Team agrees what system and change are in scope |
| Quality contract | Team can explain pass, approval, and block logic concretely |
| Cases | `cases.json` passes parser and agreed quality validator profile |
| Integration | Adapter passes canary and returns required response fields |
| Runs | Baseline and new run dirs are valid and comparable, and `run-fingerprint.json` is recorded |
| Packaging | Evidence verify passes and bundle is portable |
| EU dossier | EU verify passes and residual gaps are explicit |
| Human review | `review:check` passes with a named owner decision, no unresolved machine gaps, completed EU owner-completion records where applicable, and synced corrective-action continuity when intake is attached |

## What Is Actually Being Sold

| Layer | What the customer gets | What remains customer-owned |
| --- | --- | --- |
| OSS self-serve | Toolkit, validators, packaging, verification, demos, docs | Scope, cases, integration, runs, narrative, signoff |
| Launch Pack | Help onboarding one supported agent to a first working evidence cycle | Long-term operations, broad legal drafting, unlimited new work |
| Monthly support | Recurring help on supported agents: tuning, troubleshooting, interpretation, governed operations | Final release decisions, legal review, out-of-scope implementation work |

## Recommended Next Coding Order

When using this document to drive implementation, work in this sequence:

1. tighten stage-0 and stage-1 intake templates
2. strengthen case-authoring and case-quality tooling
3. improve adapter onboarding checks
4. improve run readiness and comparability checks
5. extend review-signoff scaffolding only where it reduces real operator ambiguity
6. only then expand EU dossier automation further

That order reduces the real operational bottlenecks instead of only generating more artifacts downstream.

## Related Docs

- [Automation Boundary and Tech Debt](automation-boundary-and-tech-debt.md)
- [Agent Evidence Platform](agent-evidence-platform.md)
- [Agent Evidence Operator Runbook](agent-evidence-operator-runbook.md)
- [EU AI Act Evidence Engine](eu-ai-act-evidence-engine.md)
- [EU AI Act Operator Runbook](eu-ai-act-operator-runbook.md)
- [Product Matrix](product-matrix.md)
