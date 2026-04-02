# EU AI Act reviewer pack

Report ID: `eu-ai-act-demo`  
Generated: 2026-04-02T04:17:44.520Z

## Summary
- Release decision: reject.
- Execution quality: healthy.
- Coverage snapshot: 3 covered / 17 partial / 0 missing EU AI Act clause(s).
- Human review queue: 1 approval case(s), 1 blocking case(s).

## How to read this pack
- Start with the reviewer PDF or reviewer HTML, not with raw JSON files.
- Read sections in Annex order; each section answers what it is for, what is generated here, what the operator still completes, and what is still open.
- Use the claim-to-evidence map before opening deeper technical files.

## If you are not reading from engineering tooling
- Read the summary at the top of each section first.
- Focus on 'Completed by the operator' and 'Still open' to see what remains outside the generated machine layer.
- Use the reviewer PDF for handoff, printing, procurement, or counsel-facing review.

## If you are doing technical verification
- Use the reviewer HTML as the readable map, then open the linked Compare report, Expanded technical pack, and Manifest where deeper verification is needed.
- Check claim-to-evidence rows before opening raw artifacts so you know which file answers which reviewer question.
- Treat filenames as secondary; Annex order and section purpose come first.

## What this pack proves
- Which exact evaluated system version produced this package.
- How the release performed on the reviewed case suite.
- Which machine-derived risks, review actions, and monitoring signals were observed.
- Which supporting files back each reviewer-facing section.

## What this pack does not complete for you
- That the provider has completed every operator-authored Annex IV or Annex V field.
- That sector-specific legal, actuarial, clinical, or financial validation obligations are fully satisfied.
- That the declaration of conformity or market-placement decision can be signed without human review.

## Linked outputs
- [Reviewer PDF](eu-ai-act-reviewer.pdf) — Printable reviewer-facing dossier generated during EU packaging.
- [Reviewer HTML](eu-ai-act-reviewer.html) — Linked reviewer-facing dossier for browser review.
- [Reviewer Markdown](eu-ai-act-reviewer.md) — Editable reviewer-facing dossier source.
- [Expanded technical pack](eu-ai-act-report.html) — Full engineering-facing Annex IV dossier with raw tables and detailed scaffolds.
- [Annex IV JSON](eu-ai-act-annex-iv.json) — Structured machine-readable Annex IV export.
- [Article 10 data governance](article-10-data-governance.json) — System-specific data-governance scaffold for the evaluated release.
- [Article 16 provider obligations](article-16-provider-obligations.json) — Provider-obligations scaffold tied to the evaluated system version.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment scaffold and route inputs for the evaluated system.
- [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Declaration-of-conformity scaffold for the evaluated system version.
- [Annex V declaration content](annex-v-declaration-content.json) — Structured Annex V declaration-content scaffold.
- [Compare report](../compare-report.json) — Underlying release-qualification report for this run.
- [Manifest](../artifacts/manifest.json) — Portable evidence index for artifact integrity.
- [Release review](release-review.json) — Machine-generated release decision and reviewer checklist.

## Review this pack in Annex order
- [1. General description of the system](#general-description)
- [2. Detailed description of development](#development-description)
- [3. Monitoring, functioning, and control](#operation-control)
- [4. Performance metrics and limitations](#performance-limits)
- [5. Risk management system (Article 9)](#risk-management)
- [6. Changes over the lifecycle](#lifecycle-changes)
- [7. Standards and alternative controls](#standards-specifications)
- [8. EU Declaration of Conformity boundary (Annex V)](#declaration-boundary)
- [9. Post-market monitoring and serious incidents](#post-market-serious-incidents)

## 1. General description of the system

### What this section is for
- This section identifies the exact agent, model, prompt, tools, and report scope used for the evaluated release.
- It is the reviewer-first entry point for understanding which system version produced the evidence in this package.

### Generated here (machine-generated)
- Report ID eu-ai-act-demo with generated timestamp 2026-04-02T04:17:44.520Z.
- Environment identity: agent golden-eu-agent / golden-eu-agent-v2, model golden-model-v1 / 2026-03-01.
- Package scope: cases _source_inputs/cases.json, baseline _source_inputs/baseline, new _source_inputs/new.
- Transfer class internal_only and redaction status none.

### Completed by the operator before handoff
- Provider legal identity, authorised representative, and external contact details.
- Narrative intended purpose and target user/deployer description.
- Market placement form, hardware/software integration context, and user-interface description.

### Claim-to-evidence map
- Claim: The package identifies the exact evaluated system version and run scope.
  - Status: Generated here
  - Reviewer use: Confirms that the dossier is tied to one concrete evaluated system rather than a generic product description.
  - Evidence:
    - [Annex IV JSON](eu-ai-act-annex-iv.json) — System identity block.
    - [Compare report](../compare-report.json) — Release scope and runtime provenance.
    - [Manifest](../artifacts/manifest.json) — Integrity index for included artifacts.
- Claim: Provider legal identity and intended-purpose narrative still need to be completed by the operator.
  - Status: Completed by the operator
  - Reviewer use: Separates the technical identity already present from the provider-authored context still needed for formal dossier completion.
  - Evidence:
    - [Annex IV JSON](eu-ai-act-annex-iv.json) — System identity block.
- Claim: The generated bundle does not itself supply market-placement form or UI-description narrative.
  - Status: Still open
  - Reviewer use: Prevents a reviewer from mistaking technical identity for a full product-description section.
  - Evidence:
    - [Annex IV JSON](eu-ai-act-annex-iv.json) — System identity block.

### Evidence files
- [Annex IV JSON](eu-ai-act-annex-iv.json) — System identity block.
- [Compare report](../compare-report.json) — Release scope and runtime provenance.
- [Manifest](../artifacts/manifest.json) — Integrity index for included artifacts.

### Still missing or still open
- None.

## 2. Detailed description of development

### What this section is for
- This section captures how the evaluated release was exercised and which machine-verifiable artifacts back the technical record.
- It is evidence-backed, but it does not replace provider-authored architecture and data-governance writing.

### Generated here (machine-generated)
- 13 manifest-backed artifact(s) indexed across 20 EU AI Act coverage clause(s).
- 2 case artifact row(s) with response, replay, and trace references where available.
- Execution exercised on suite(s): release.

### Completed by the operator before handoff
- Architecture narrative, algorithmic design decisions, trade-offs, and computational resources.
- Training/data provenance, labelling, cleaning, and datasheet material.
- Cybersecurity design narrative beyond the emitted runtime and scanner evidence.

### Claim-to-evidence map
- Claim: The bundle preserves enough runtime artifacts to reconstruct how the evaluated release was exercised.
  - Status: Generated here
  - Reviewer use: Lets the reviewer verify that development-stage claims are backed by retained evidence rather than narrative alone.
  - Evidence:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Evidence index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
    - [Manifest](../artifacts/manifest.json) — Artifact-level integrity data.
    - [Expanded technical pack](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
- Claim: Architecture, training-data, and broader development-process narrative still need provider-authored text.
  - Status: Completed by the operator
  - Reviewer use: Shows where the evidence engine stops and provider engineering documentation still needs to be attached.
  - Evidence:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Expanded technical pack](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
    - [Evidence index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
- Claim: The generated section does not claim complete training-data governance or full architecture coverage.
  - Status: Still open
  - Reviewer use: Avoids over-reading runtime evidence as if it were the whole development record.
  - Evidence:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Evidence index](evidence-index.json) — Clause-to-artifact mapping for the bundle.

### Evidence files
- [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
- [Evidence index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
- [Expanded technical pack](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
- [Manifest](../artifacts/manifest.json) — Artifact-level integrity data.

### Still missing or still open
- Art_10: missing required evidence compare-report.json.environment.training_data_provenance
- Art_9: Operator-owned risk governance still sits outside the evaluator.
- Art_9: Annex III classification and legal interpretation still require counsel.
- Art_10: Training-data lineage, labeling, representativeness, and bias controls are outside runtime evaluation.
- Art_11: The evaluator emits evidence inputs, not the full Article 11 technical file.
- Annex_IV: The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_13: Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Art_13: Human oversight procedures for deployers still require operator-authored narrative.
- Art_17: Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Art_72: Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_16: Provider-owned records for Section 2 compliance, declaration, marking, registration, and authority-facing obligations remain required.
- Art_18: The 10-year documentation-keeping record for Article 11, Article 17, notified-body records where applicable, and Article 47 remains provider-owned.
- Art_19: Provider-controlled log retention, six-month minimum retention, and retrieval path still require provider-authored records.
- Art_20: The provider-owned corrective-action, withdrawal or disabling, recall, and notification workflow remains required.
- Art_21: The provider-owned authority cooperation path, documentation response process, and log-access process remain required.
- Art_43: The provider-owned conformity assessment route and any notified-body records remain required.
- Art_47: The provider-signed EU declaration of conformity remains required before placing on the market or putting into service.
- Art_48: The provider-owned CE marking record, including digital or physical placement and notified-body identification where applicable, remains required.
- Art_49: The provider-owned EU database or national registration record remains required where Article 49 applies.
- Annex_V: Provider identification, system identification, legal references, and signatory details for the declaration remain provider-authored.

## 3. Monitoring, functioning, and control

### What this section is for
- This section gives reviewers a short view of how the evaluated release is meant to be operated, overseen, and escalated.
- It combines deployer-facing Article 13 scaffolding with human-oversight and release-review outputs.

### Generated here (machine-generated)
- Execution quality is healthy with new pass rate 50.0%.
- 1 case(s) require approval and 1 case(s) are blocked in the current review queue.
- 2 case(s) show missing assumption-state capture.

### Completed by the operator before handoff
- intended purpose statement for deployers
- known limitations and acceptable operating conditions
- human oversight and escalation instructions
- monitoring and maintenance contact path
- Named oversight roles, escalation owner, and customer/deployer contact path.
- Final instructions-for-use text and safe operating boundary wording.

### Claim-to-evidence map
- Claim: The package shows the current oversight queue, release status, and deployer-facing instruction scaffold for this release.
  - Status: Generated here
  - Reviewer use: Lets the reviewer see whether oversight and operation controls are grounded in the actual evaluated release.
  - Evidence:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
    - [Release review](release-review.json) — Release gate status and signoff expectation.
- Claim: Named oversight roles, escalation ownership, and final instructions-for-use wording must be completed by the operator.
  - Status: Completed by the operator
  - Reviewer use: Separates generated release and review facts from the deployer instructions that still need human ownership.
  - Evidence:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
- Claim: Known limitations and assumption-state gaps remain open until the operator closes them in the final dossier and workflow.
  - Status: Still open
  - Reviewer use: Keeps the reviewer focused on whether the operating boundary is complete enough for handoff.
  - Evidence:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Release review](release-review.json) — Release gate status and signoff expectation.

### Evidence files
- [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
- [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
- [Release review](release-review.json) — Release gate status and signoff expectation.

### Still missing or still open
- Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Human oversight procedures for deployers still require operator-authored narrative.
- The evaluator emits evidence inputs, not the full Article 11 technical file.
- The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_10: missing required evidence compare-report.json.environment.training_data_provenance
- Art_9: Operator-owned risk governance still sits outside the evaluator.
- Art_9: Annex III classification and legal interpretation still require counsel.
- Art_10: Training-data lineage, labeling, representativeness, and bias controls are outside runtime evaluation.
- Art_11: The evaluator emits evidence inputs, not the full Article 11 technical file.
- Annex_IV: The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_13: Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Art_13: Human oversight procedures for deployers still require operator-authored narrative.
- Art_17: Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Art_72: Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_16: Provider-owned records for Section 2 compliance, declaration, marking, registration, and authority-facing obligations remain required.
- Art_18: The 10-year documentation-keeping record for Article 11, Article 17, notified-body records where applicable, and Article 47 remains provider-owned.
- Art_19: Provider-controlled log retention, six-month minimum retention, and retrieval path still require provider-authored records.
- Art_20: The provider-owned corrective-action, withdrawal or disabling, recall, and notification workflow remains required.
- Art_21: The provider-owned authority cooperation path, documentation response process, and log-access process remain required.
- Art_43: The provider-owned conformity assessment route and any notified-body records remain required.
- Art_47: The provider-signed EU declaration of conformity remains required before placing on the market or putting into service.
- Art_48: The provider-owned CE marking record, including digital or physical placement and notified-body identification where applicable, remains required.
- Art_49: The provider-owned EU database or national registration record remains required where Article 49 applies.
- Annex_V: Provider identification, system identification, legal references, and signatory details for the declaration remain provider-authored.

## 4. Performance metrics and limitations

### What this section is for
- This section is where a reviewer sees whether the release is technically healthy, what changed, and what limitations were observed.
- It is backed by comparable runs, but the business acceptability of those metrics remains operator-owned.

### Generated here (machine-generated)
- Execution quality status healthy; regressions 0; improvements 1.
- Security signal snapshot: 2 case(s) with new signals; top kinds prompt_injection_marker, unsafe_code_execution.
- Release decision is reject with 1 approval case(s) and 1 blocking case(s).

### Completed by the operator before handoff
- Domain-specific acceptance thresholds and explanation of why these metrics are sufficient for deployment.
- Business-harm narrative, acceptable error levels, and customer impact interpretation.

### Claim-to-evidence map
- Claim: The release's current quality and blocking status are backed by comparable-run evidence and release review outputs.
  - Status: Generated here
  - Reviewer use: Supports a fast decision on whether the technical release evidence is healthy enough to read further.
  - Evidence:
    - [Compare report](../compare-report.json) — Comparable run results and execution-quality details.
    - [Release review](release-review.json) — Release gate summary and rationale.
    - [Expanded technical pack](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.
- Claim: Acceptance thresholds and harm interpretation still need operator judgment.
  - Status: Completed by the operator
  - Reviewer use: Shows that technical metrics are present, but deployment acceptability is still a human decision.
  - Evidence:
    - [Compare report](../compare-report.json) — Comparable run results and execution-quality details.
    - [Release review](release-review.json) — Release gate summary and rationale.
- Claim: Any unresolved known limitations remain open unless explicitly dispositioned by the operator.
  - Status: Still open
  - Reviewer use: Prevents a reviewer from treating the measured outputs as a complete deployment approval by themselves.
  - Evidence:
    - [Expanded technical pack](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.
    - [Release review](release-review.json) — Release gate summary and rationale.

### Evidence files
- [Compare report](../compare-report.json) — Comparable run results and execution-quality details.
- [Release review](release-review.json) — Release gate summary and rationale.
- [Expanded technical pack](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.

### Still missing or still open
- Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Human oversight procedures for deployers still require operator-authored narrative.
- The evaluator emits evidence inputs, not the full Article 11 technical file.
- The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_10: missing required evidence compare-report.json.environment.training_data_provenance
- Art_9: Operator-owned risk governance still sits outside the evaluator.
- Art_9: Annex III classification and legal interpretation still require counsel.
- Art_10: Training-data lineage, labeling, representativeness, and bias controls are outside runtime evaluation.
- Art_11: The evaluator emits evidence inputs, not the full Article 11 technical file.
- Annex_IV: The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_13: Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Art_13: Human oversight procedures for deployers still require operator-authored narrative.
- Art_17: Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Art_72: Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_16: Provider-owned records for Section 2 compliance, declaration, marking, registration, and authority-facing obligations remain required.
- Art_18: The 10-year documentation-keeping record for Article 11, Article 17, notified-body records where applicable, and Article 47 remains provider-owned.
- Art_19: Provider-controlled log retention, six-month minimum retention, and retrieval path still require provider-authored records.
- Art_20: The provider-owned corrective-action, withdrawal or disabling, recall, and notification workflow remains required.
- Art_21: The provider-owned authority cooperation path, documentation response process, and log-access process remain required.
- Art_43: The provider-owned conformity assessment route and any notified-body records remain required.
- Art_47: The provider-signed EU declaration of conformity remains required before placing on the market or putting into service.
- Art_48: The provider-owned CE marking record, including digital or physical placement and notified-body identification where applicable, remains required.
- Art_49: The provider-owned EU database or national registration record remains required where Article 49 applies.
- Annex_V: Provider identification, system identification, legal references, and signatory details for the declaration remain provider-authored.

## 5. Risk management system (Article 9)

### What this section is for
- This section gives reviewers a machine-derived draft risk register tied to observed runs, review decisions, and monitoring signals.
- It is a starting point for Article 9, not a complete provider-authored risk management system.

### Generated here (machine-generated)
- 5 machine-derived risk entry(ies): 2 from case behaviour, 2 from coverage gaps, 0 from execution quality, 1 from monitoring.
- 1 blocking, 4 review, and 0 monitor entry(ies).
- Post-release monitoring status history_current with 4 drift signal(s).

### Completed by the operator before handoff
- likelihood and severity rationale owned by the operator
- control owner and target review date for each open risk
- residual-risk acceptance rationale for any accepted risk
- provider decision linkage for block or review risks
- Residual-risk acceptance, control owners, and target review dates.

### Claim-to-evidence map
- Claim: The bundle generates a machine-derived draft risk register from observed runs, review outcomes, and monitoring signals.
  - Status: Generated here
  - Reviewer use: Lets the reviewer see that Article 9 starts from runtime evidence rather than from a blank narrative template.
  - Evidence:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
    - [Release review](release-review.json) — Current release decision and escalation rationale.
    - [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.
- Claim: Likelihood rationale, owners, review dates, and residual-risk acceptance still need operator completion.
  - Status: Completed by the operator
  - Reviewer use: Shows exactly which parts of Article 9 remain human-owned even after the machine-derived draft is present.
  - Evidence:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
- Claim: Open residual gaps remain visible until the operator dispositiones them in the final governance workflow.
  - Status: Still open
  - Reviewer use: Prevents a reviewer from misreading the generated register as a final approved risk-management system.
  - Evidence:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.

### Evidence files
- [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
- [Release review](release-review.json) — Current release decision and escalation rationale.
- [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.

### Still missing or still open
- Operator-owned risk governance still sits outside the evaluator.
- Annex III classification and legal interpretation still require counsel.
- This register is generated from runtime evidence and still requires operator-owned likelihood, impact, and acceptance rationale.

## 6. Changes over the lifecycle

### What this section is for
- This section links QMS-lite controls and monitoring continuity into one lifecycle view.
- It shows whether the evaluated release triggered additional review, remediation, or follow-up process requirements.

### Generated here (machine-generated)
- QMS-lite scaffold covers 6 process area(s) with 1 approval-required case(s) and 1 blocking case(s).
- Monitoring status history_current; execution quality healthy.
- 2 run(s) in monitoring window and 2 monitored case(s).

### Completed by the operator before handoff
- named quality management owner and document approver
- written change-management procedure and approval workflow
- incident, complaint, and corrective-action handling workflow
- document-control, retention, and versioning policy
- training, competency, and supplier-management responsibilities
- authority and customer communication procedure for material issues
- Formal change-control procedures, ownership matrix, training, and communications outside the generated scaffold.

### Claim-to-evidence map
- Claim: The bundle shows a machine-generated lifecycle view across QMS-lite controls and monitoring continuity.
  - Status: Generated here
  - Reviewer use: Lets the reviewer check whether lifecycle evidence exists for this release instead of inferring process continuity from static prose.
  - Evidence:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
    - [Release review](release-review.json) — Current promotion decision and checklist.
    - [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.
- Claim: Formal procedures, accountable roles, and training expectations still need operator-authored process documentation.
  - Status: Completed by the operator
  - Reviewer use: Keeps the reviewer aware that QMS-lite is a technical scaffold, not a complete QMS document set.
  - Evidence:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
- Claim: Residual process gaps remain open until they are closed in the provider's management system.
  - Status: Still open
  - Reviewer use: Makes lifecycle incompleteness visible instead of hiding it behind release status alone.
  - Evidence:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.

### Evidence files
- [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
- [Release review](release-review.json) — Current promotion decision and checklist.
- [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.

### Still missing or still open
- Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Operator-authored instructions for use are still required before deployer handoff.
- This export summarizes technical evidence; it does not replace deployer-facing operating instructions.
- Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Human oversight procedures for deployers still require operator-authored narrative.
- The evaluator emits evidence inputs, not the full Article 11 technical file.
- The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_10: missing required evidence compare-report.json.environment.training_data_provenance
- Art_9: Operator-owned risk governance still sits outside the evaluator.
- Art_9: Annex III classification and legal interpretation still require counsel.
- Art_10: Training-data lineage, labeling, representativeness, and bias controls are outside runtime evaluation.
- Art_11: The evaluator emits evidence inputs, not the full Article 11 technical file.
- Annex_IV: The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_13: Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Art_13: Human oversight procedures for deployers still require operator-authored narrative.
- Art_17: Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Art_72: Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_16: Provider-owned records for Section 2 compliance, declaration, marking, registration, and authority-facing obligations remain required.
- Art_18: The 10-year documentation-keeping record for Article 11, Article 17, notified-body records where applicable, and Article 47 remains provider-owned.
- Art_19: Provider-controlled log retention, six-month minimum retention, and retrieval path still require provider-authored records.
- Art_20: The provider-owned corrective-action, withdrawal or disabling, recall, and notification workflow remains required.
- Art_21: The provider-owned authority cooperation path, documentation response process, and log-access process remain required.
- Art_43: The provider-owned conformity assessment route and any notified-body records remain required.
- Art_47: The provider-signed EU declaration of conformity remains required before placing on the market or putting into service.
- Art_48: The provider-owned CE marking record, including digital or physical placement and notified-body identification where applicable, remains required.
- Art_49: The provider-owned EU database or national registration record remains required where Article 49 applies.
- Annex_V: Provider identification, system identification, legal references, and signatory details for the declaration remain provider-authored.
- Operator-owned risk governance still sits outside the evaluator.
- Annex III classification and legal interpretation still require counsel.
- This register is generated from runtime evidence and still requires operator-owned likelihood, impact, and acceptance rationale.
- This plan is a technical scaffold and still requires operator-owned monitoring ownership, cadence, retention, and authority-reporting decisions.
- This QMS-lite export is a technical scaffold, not a complete quality management system.
- Competency management, supplier management, authority communication, and formal document-control procedures remain operator-authored.

## 7. Standards and alternative controls

### What this section is for
- This section is intentionally narrow: the toolkit can point to the evidence that would support standards mapping, but it does not infer harmonised standards or common-specification claims.
- Reviewers should treat this as a support layer, not as an auto-generated conformity statement.

### Generated here (machine-generated)
- Coverage snapshot: 3 covered, 17 partial, 0 missing clause(s).
- Machine-readable evidence selectors and bundle artifacts that can be referenced inside a standards-mapping appendix.

### Completed by the operator before handoff
- Harmonised standards or common specifications actually relied upon.
- Alternative control rationale where harmonised standards are not used.
- Notified body references and any external conformity-assessment narrative.

### Claim-to-evidence map
- Claim: The bundle can support standards mapping by exposing clause coverage and evidence selectors.
  - Status: Generated here
  - Reviewer use: Lets the reviewer anchor standards discussion to actual evidence instead of to unlinked narrative references.
  - Evidence:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
    - [Evidence index](evidence-index.json) — Selectors and manifest-backed links.
    - [Annex IV JSON](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- Claim: Any actual standards reliance or alternative-control rationale must be completed by the operator.
  - Status: Completed by the operator
  - Reviewer use: Prevents readers from treating coverage selectors as if they were already a standards claim.
  - Evidence:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
    - [Annex IV JSON](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- Claim: This section does not itself establish harmonised-standard or common-specification compliance.
  - Status: Still open
  - Reviewer use: Keeps the boundary explicit between technical evidence support and formal conformity positioning.
  - Evidence:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.

### Evidence files
- [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
- [Annex IV JSON](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
- [Evidence index](evidence-index.json) — Selectors and manifest-backed links.

### Still missing or still open
- Art_10: missing required evidence compare-report.json.environment.training_data_provenance
- Art_9: Operator-owned risk governance still sits outside the evaluator.
- Art_9: Annex III classification and legal interpretation still require counsel.
- Art_10: Training-data lineage, labeling, representativeness, and bias controls are outside runtime evaluation.
- Art_11: The evaluator emits evidence inputs, not the full Article 11 technical file.
- Annex_IV: The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_13: Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Art_13: Human oversight procedures for deployers still require operator-authored narrative.
- Art_17: Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Art_72: Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_16: Provider-owned records for Section 2 compliance, declaration, marking, registration, and authority-facing obligations remain required.
- Art_18: The 10-year documentation-keeping record for Article 11, Article 17, notified-body records where applicable, and Article 47 remains provider-owned.
- Art_19: Provider-controlled log retention, six-month minimum retention, and retrieval path still require provider-authored records.
- Art_20: The provider-owned corrective-action, withdrawal or disabling, recall, and notification workflow remains required.
- Art_21: The provider-owned authority cooperation path, documentation response process, and log-access process remain required.
- Art_43: The provider-owned conformity assessment route and any notified-body records remain required.
- Art_47: The provider-signed EU declaration of conformity remains required before placing on the market or putting into service.
- Art_48: The provider-owned CE marking record, including digital or physical placement and notified-body identification where applicable, remains required.
- Art_49: The provider-owned EU database or national registration record remains required where Article 49 applies.
- Annex_V: Provider identification, system identification, legal references, and signatory details for the declaration remain provider-authored.

## 8. EU Declaration of Conformity boundary (Annex V)

### What this section is for
- The toolkit does not generate the legal declaration itself.
- What it does provide is the technical record that can support the declaration's factual statements about system identity, review scope, and supporting evidence.

### Generated here (machine-generated)
- Versioned system identity and release review status that can be cited in a declaration pack.
- Portable evidence links that can be attached or referenced from the declaration package.

### Completed by the operator before handoff
- The Annex V declaration text, legal basis, and provider-responsibility statement.
- Applicable-law references, notified body details, date, place, signer name, and title.

### Claim-to-evidence map
- Claim: The bundle provides technical facts that can support declaration drafting.
  - Status: Generated here
  - Reviewer use: Lets the reviewer reuse verified system identity and release evidence when assembling a declaration package.
  - Evidence:
    - [Annex IV JSON](eu-ai-act-annex-iv.json) — Technical support for declaration drafting.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
    - [Compare report](../compare-report.json) — Technical release results backing the declaration.
    - [Release review](release-review.json) — Current release status for the evaluated system version.
- Claim: The legal declaration text and sign-off remain operator-owned.
  - Status: Completed by the operator
  - Reviewer use: Makes it explicit that the technical pack supports the declaration but does not replace it.
  - Evidence:
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
    - [Release review](release-review.json) — Current release status for the evaluated system version.
- Claim: No declaration of conformity is generated by the toolkit outputs.
  - Status: Still open
  - Reviewer use: Prevents a reviewer from mistaking technical support for a completed Annex V declaration.
  - Evidence:
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.

### Evidence files
- [Annex IV JSON](eu-ai-act-annex-iv.json) — Technical support for declaration drafting.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
- [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
- [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
- [Compare report](../compare-report.json) — Technical release results backing the declaration.
- [Release review](release-review.json) — Current release status for the evaluated system version.

### Still missing or still open
- Declaration drafting and legal signoff remain outside the generated toolkit outputs.

## 9. Post-market monitoring and serious incidents

### What this section is for
- This section groups the post-market monitoring plan and serious-incident triage into one reviewer-facing end-of-dossier section.
- It is designed for fast external reading: what is being watched, what triggered concern, and what still requires human reporting judgment.

### Generated here (machine-generated)
- Monitoring plan status history_current with 2 run(s) in window.
- Serious-incident machine triage review_for_serious_incident with 5 trigger(s).
- 2 high/critical signal(s) and release decision reject.

### Completed by the operator before handoff
- named monitoring owner and backup owner
- monitoring cadence and SLA by deployment context
- incident, customer, and authority notification workflow
- retention period and archive location for monitoring artifacts
- corrective-action and rollback authority for repeated drift or blocking findings
- named serious-incident owner and escalation backup
- human determination of whether the event meets Article 73 serious-incident threshold
- authority, customer, and internal notification routing by jurisdiction
- incident impact assessment and affected-person analysis
- reporting deadline calculation and external communications approver
- Legal incident threshold assessment, authority routing, and disclosure decision.

### Claim-to-evidence map
- Claim: The package provides machine-generated monitoring and incident-triage scaffolds tied to current and historical signals.
  - Status: Generated here
  - Reviewer use: Gives the reviewer a fast end-of-dossier view of what is being monitored and whether serious-incident triggers are already visible.
  - Evidence:
    - [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.
- Claim: Monitoring ownership, reporting obligations, and incident routing still need operator completion.
  - Status: Completed by the operator
  - Reviewer use: Shows where operational and legal reporting duties still sit outside the generated machine layer.
  - Evidence:
    - [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.
- Claim: Open monitoring and incident gaps remain visible until the operator closes them in the final post-market workflow.
  - Status: Still open
  - Reviewer use: Keeps unresolved monitoring and reporting gaps visible instead of burying them inside the technical scaffolds.
  - Evidence:
    - [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.

### Evidence files
- [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
- [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
- [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.

### Still missing or still open
- Operator-owned risk governance still sits outside the evaluator.
- Annex III classification and legal interpretation still require counsel.
- This register is generated from runtime evidence and still requires operator-owned likelihood, impact, and acceptance rationale.
- Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Operator-authored instructions for use are still required before deployer handoff.
- This export summarizes technical evidence; it does not replace deployer-facing operating instructions.
- Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Human oversight procedures for deployers still require operator-authored narrative.
- The evaluator emits evidence inputs, not the full Article 11 technical file.
- The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_10: missing required evidence compare-report.json.environment.training_data_provenance
- Art_9: Operator-owned risk governance still sits outside the evaluator.
- Art_9: Annex III classification and legal interpretation still require counsel.
- Art_10: Training-data lineage, labeling, representativeness, and bias controls are outside runtime evaluation.
- Art_11: The evaluator emits evidence inputs, not the full Article 11 technical file.
- Annex_IV: The generated dossier still requires operator-authored intended-use, system-boundary, and deployment-context inputs.
- Art_13: Operator-authored intended-use, deployer-facing instructions, and operating constraints remain required.
- Art_13: Human oversight procedures for deployers still require operator-authored narrative.
- Art_17: Written QMS procedures, training, document control, supplier management, and authority communication remain operator responsibilities.
- Art_72: Recurring monitoring cadence, escalation workflow, and regulator-facing reporting remain operator responsibilities.
- Art_16: Provider-owned records for Section 2 compliance, declaration, marking, registration, and authority-facing obligations remain required.
- Art_18: The 10-year documentation-keeping record for Article 11, Article 17, notified-body records where applicable, and Article 47 remains provider-owned.
- Art_19: Provider-controlled log retention, six-month minimum retention, and retrieval path still require provider-authored records.
- Art_20: The provider-owned corrective-action, withdrawal or disabling, recall, and notification workflow remains required.
- Art_21: The provider-owned authority cooperation path, documentation response process, and log-access process remain required.
- Art_43: The provider-owned conformity assessment route and any notified-body records remain required.
- Art_47: The provider-signed EU declaration of conformity remains required before placing on the market or putting into service.
- Art_48: The provider-owned CE marking record, including digital or physical placement and notified-body identification where applicable, remains required.
- Art_49: The provider-owned EU database or national registration record remains required where Article 49 applies.
- Annex_V: Provider identification, system identification, legal references, and signatory details for the declaration remain provider-authored.
- This plan is a technical scaffold and still requires operator-owned monitoring ownership, cadence, retention, and authority-reporting decisions.
- This export does not decide whether the legal threshold for a serious incident has been met.
- Authority reporting workflow, deadlines, and jurisdiction-specific notification content remain operator-authored.
- Final incident narrative, impact assessment, and external communications approval remain outside the evaluator.
