# Package reviewer EU AI Act

Report ID: `eu-ai-act-demo`  
Generated: 2026-04-02T03:30:00.483Z

## Resume
- Decision de release : reject.
- Qualite d'execution : healthy.
- Vue de couverture : 3 couvertes / 17 partielles / 0 clauses EU AI Act manquantes.
- File de revue humaine : 1 cas avec approbation, 1 cas bloquants.

## Comment lire ce package
- Commencez par le PDF reviewer ou le HTML reviewer, pas par les fichiers JSON bruts.
- Lisez les sections dans l'ordre de l'annexe ; chaque section explique a quoi elle sert, ce qui est genere ici, ce que l'operateur complete encore et ce qui reste ouvert.
- Utilisez la correspondance affirmation-preuve avant d'ouvrir des fichiers techniques plus profonds.

## Si vous ne lisez pas depuis les outils d'ingenierie
- Lisez d'abord le resume en tete de chaque section.
- Focus on 'Completed by the operator' and 'Encore ouvert' to see what remains outside the generated machine layer.
- Utilisez le PDF reviewer pour la transmission, l'impression, le procurement ou une revue oriente conseil juridique.

## Si vous effectuez une verification technique
- Use the reviewer HTML as the readable map, then open the linked Rapport de comparaison, Pack technique etendu, and Manifeste where deeper verification is needed.
- Consultez d'abord les lignes affirmation-preuve pour savoir quel fichier repond a quelle question reviewer.
- Traitez les noms de fichiers comme secondaires ; l'ordre de l'annexe et le role de la section passent d'abord.

## Ce que ce package demontre
- Quelle version exacte du systeme evalue a produit ce package.
- Comment la release s'est comportee sur la suite de cas revue.
- Quels risques derives par la machine, actions de revue et signaux de monitoring ont ete observes.
- Quels fichiers de support soutiennent chaque section orientee reviewer.

## Ce que ce package ne complete pas pour vous
- Que le fournisseur a complete chaque champ redige par l'operateur dans l'Annexe IV ou l'Annexe V.
- Que les obligations sectorielles de validation juridique, actuarielle, clinique ou financiere sont entierement satisfaites.
- Que la declaration de conformite ou la decision de mise sur le marche peut etre signee sans revue humaine.

## Sorties liees
- [PDF reviewer](eu-ai-act-reviewer.pdf) — Dossier imprimable oriente reviewer genere pendant le packaging EU.
- [HTML reviewer](eu-ai-act-reviewer.html) — Dossier lie, oriente reviewer, pour lecture dans le navigateur.
- [Markdown reviewer](eu-ai-act-reviewer.md) — Source editable du dossier oriente reviewer.
- [Pack technique etendu](eu-ai-act-report.html) — Dossier Annexe IV complet, oriente ingenierie, avec tables brutes et scaffolds detailles.
- [JSON Annexe IV](eu-ai-act-annex-iv.json) — Export Annexe IV structure et lisible par machine.
- [Article 10 data governance](article-10-data-governance.json) — System-specific data-governance scaffold for the evaluated release.
- [Article 16 provider obligations](article-16-provider-obligations.json) — Provider-obligations scaffold tied to the evaluated system version.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment scaffold and route inputs for the evaluated system.
- [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Declaration-of-conformity scaffold for the evaluated system version.
- [Annex V declaration content](annex-v-declaration-content.json) — Structured Annex V declaration-content scaffold.
- [Rapport de comparaison](../compare-report.json) — Rapport de qualification de release sous-jacent pour ce run.
- [Manifeste](../artifacts/manifest.json) — Index portable de preuves pour l'integrite des artefacts.
- [Revue de release](release-review.json) — Decision de release et checklist reviewer generees par la machine.

## Lisez ce package dans l'ordre de l'annexe
- [1. Description generale du systeme](#general-description)
- [2. Description detaillee du developpement](#development-description)
- [3. Monitoring, fonctionnement et controle](#operation-control)
- [4. Metriques de performance et limites](#performance-limits)
- [5. Systeme de gestion des risques (Article 9)](#risk-management)
- [6. Changements sur le cycle de vie](#lifecycle-changes)
- [7. Standards et controles alternatifs](#standards-specifications)
- [8. Limite de la Declaration UE de conformite (Annexe V)](#declaration-boundary)
- [9. Surveillance post-commercialisation et incidents graves](#post-market-serious-incidents)

## 1. Description generale du systeme

### A quoi sert cette section
- This section identifies the exact agent, model, prompt, tools, and report scope used for the evaluated release.
- It is the reviewer-first entry point for understanding which system version produced the evidence in this package.

### Genere ici (genere par la machine)
- Identifiant de rapport eu-ai-act-demo avec horodatage de generation 2026-04-02T03:30:00.483Z.
- Identite d'environnement : agent golden-eu-agent / golden-eu-agent-v2, modele golden-model-v1 / 2026-03-01.
- Perimetre du package : cas _source_inputs/cases.json, baseline _source_inputs/baseline, nouveau _source_inputs/new.
- Classe de transfert internal_only et statut de redaction none.

### A completer par l'operateur avant transmission
- Provider legal identity, authorised representative, and external contact details.
- Narrative intended purpose and target user/deployer description.
- Market placement form, hardware/software integration context, and user-interface description.

### Affirmation-to-evidence map
- Affirmation: The package identifies the exact evaluated system version and run scope.
  - Statut: Generated here
  - Reviewer use: Confirms that the dossier is tied to one concrete evaluated system rather than a generic product description.
  - Preuves:
    - [JSON Annexe IV](eu-ai-act-annex-iv.json) — System identity block.
    - [Rapport de comparaison](../compare-report.json) — Release scope and runtime provenance.
    - [Manifeste](../artifacts/manifest.json) — Integrity index for included artifacts.
- Affirmation: Provider legal identity and intended-purpose narrative still need to be completed by the operator.
  - Statut: Completed by the operator
  - Reviewer use: Separates the technical identity already present from the provider-authored context still needed for formal dossier completion.
  - Preuves:
    - [JSON Annexe IV](eu-ai-act-annex-iv.json) — System identity block.
- Affirmation: The generated bundle does not itself supply market-placement form or UI-description narrative.
  - Statut: Encore ouvert
  - Reviewer use: Prevents a reviewer from mistaking technical identity for a full product-description section.
  - Preuves:
    - [JSON Annexe IV](eu-ai-act-annex-iv.json) — System identity block.

### Preuves files
- [JSON Annexe IV](eu-ai-act-annex-iv.json) — System identity block.
- [Rapport de comparaison](../compare-report.json) — Release scope and runtime provenance.
- [Manifeste](../artifacts/manifest.json) — Integrity index for included artifacts.

### Encore manquant ou encore ouvert
- None.

## 2. Description detaillee du developpement

### A quoi sert cette section
- This section captures how the evaluated release was exercised and which machine-verifiable artifacts back the technical record.
- It is evidence-backed, but it does not replace provider-authored architecture and data-governance writing.

### Genere ici (genere par la machine)
- 13 manifest-backed artifact(s) indexed across 20 EU AI Act coverage clause(s).
- 2 case artifact row(s) with response, replay, and trace references where available.
- Execution exercised on suite(s): release.

### A completer par l'operateur avant transmission
- Architecture narrative, algorithmic design decisions, trade-offs, and computational resources.
- Training/data provenance, labelling, cleaning, and datasheet material.
- Cybersecurity design narrative beyond the emitted runtime and scanner evidence.

### Affirmation-to-evidence map
- Affirmation: The bundle preserves enough runtime artifacts to reconstruct how the evaluated release was exercised.
  - Statut: Generated here
  - Reviewer use: Lets the reviewer verify that development-stage claims are backed by retained evidence rather than narrative alone.
  - Preuves:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Preuves index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
    - [Manifeste](../artifacts/manifest.json) — Artifact-level integrity data.
    - [Pack technique etendu](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
- Affirmation: Architecture, training-data, and broader development-process narrative still need provider-authored text.
  - Statut: Completed by the operator
  - Reviewer use: Shows where the evidence engine stops and provider engineering documentation still needs to be attached.
  - Preuves:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Pack technique etendu](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
    - [Preuves index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
- Affirmation: The generated section does not claim complete training-data governance or full architecture coverage.
  - Statut: Encore ouvert
  - Reviewer use: Avoids over-reading runtime evidence as if it were the whole development record.
  - Preuves:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Preuves index](evidence-index.json) — Clause-to-artifact mapping for the bundle.

### Preuves files
- [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
- [Preuves index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
- [Pack technique etendu](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
- [Manifeste](../artifacts/manifest.json) — Artifact-level integrity data.

### Encore manquant ou encore ouvert
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

## 3. Monitoring, fonctionnement et controle

### A quoi sert cette section
- This section gives reviewers a short view of how the evaluated release is meant to be operated, overseen, and escalated.
- It combines deployer-facing Article 13 scaffolding with human-oversight and release-review outputs.

### Genere ici (genere par la machine)
- Execution quality is healthy with new pass rate 50.0%.
- 1 case(s) require approval and 1 case(s) are blocked in the current review queue.
- 2 case(s) show missing assumption-state capture.

### A completer par l'operateur avant transmission
- intended purpose statement for deployers
- known limitations and acceptable operating conditions
- human oversight and escalation instructions
- monitoring and maintenance contact path
- Named oversight roles, escalation owner, and customer/deployer contact path.
- Final instructions-for-use text and safe operating boundary wording.

### Affirmation-to-evidence map
- Affirmation: The package shows the current oversight queue, release status, and deployer-facing instruction scaffold for this release.
  - Statut: Generated here
  - Reviewer use: Lets the reviewer see whether oversight and operation controls are grounded in the actual evaluated release.
  - Preuves:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
    - [Revue de release](release-review.json) — Release gate status and signoff expectation.
- Affirmation: Named oversight roles, escalation ownership, and final instructions-for-use wording must be completed by the operator.
  - Statut: Completed by the operator
  - Reviewer use: Separates generated release and review facts from the deployer instructions that still need human ownership.
  - Preuves:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
- Affirmation: Known limitations and assumption-state gaps remain open until the operator closes them in the final dossier and workflow.
  - Statut: Encore ouvert
  - Reviewer use: Keeps the reviewer focused on whether the operating boundary is complete enough for handoff.
  - Preuves:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Revue de release](release-review.json) — Release gate status and signoff expectation.

### Preuves files
- [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
- [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
- [Revue de release](release-review.json) — Release gate status and signoff expectation.

### Encore manquant ou encore ouvert
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

## 4. Metriques de performance et limites

### A quoi sert cette section
- This section is where a reviewer sees whether the release is technically healthy, what changed, and what limitations were observed.
- It is backed by comparable runs, but the business acceptability of those metrics remains operator-owned.

### Genere ici (genere par la machine)
- Execution quality status healthy; regressions 0; improvements 1.
- Security signal snapshot: 2 case(s) with new signals; top kinds prompt_injection_marker, unsafe_code_execution.
- Release decision is reject with 1 approval case(s) and 1 blocking case(s).

### A completer par l'operateur avant transmission
- Domain-specific acceptance thresholds and explanation of why these metrics are sufficient for deployment.
- Business-harm narrative, acceptable error levels, and customer impact interpretation.

### Affirmation-to-evidence map
- Affirmation: The release's current quality and blocking status are backed by comparable-run evidence and release review outputs.
  - Statut: Generated here
  - Reviewer use: Supports a fast decision on whether the technical release evidence is healthy enough to read further.
  - Preuves:
    - [Rapport de comparaison](../compare-report.json) — Comparable run results and execution-quality details.
    - [Revue de release](release-review.json) — Release gate summary and rationale.
    - [Pack technique etendu](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.
- Affirmation: Acceptance thresholds and harm interpretation still need operator judgment.
  - Statut: Completed by the operator
  - Reviewer use: Shows that technical metrics are present, but deployment acceptability is still a human decision.
  - Preuves:
    - [Rapport de comparaison](../compare-report.json) — Comparable run results and execution-quality details.
    - [Revue de release](release-review.json) — Release gate summary and rationale.
- Affirmation: Any unresolved known limitations remain open unless explicitly dispositioned by the operator.
  - Statut: Encore ouvert
  - Reviewer use: Prevents a reviewer from treating the measured outputs as a complete deployment approval by themselves.
  - Preuves:
    - [Pack technique etendu](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.
    - [Revue de release](release-review.json) — Release gate summary and rationale.

### Preuves files
- [Rapport de comparaison](../compare-report.json) — Comparable run results and execution-quality details.
- [Revue de release](release-review.json) — Release gate summary and rationale.
- [Pack technique etendu](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.

### Encore manquant ou encore ouvert
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

## 5. Systeme de gestion des risques (Article 9)

### A quoi sert cette section
- This section gives reviewers a machine-derived draft risk register tied to observed runs, review decisions, and monitoring signals.
- It is a starting point for Article 9, not a complete provider-authored risk management system.

### Genere ici (genere par la machine)
- 5 machine-derived risk entry(ies): 2 from case behaviour, 2 from coverage gaps, 0 from execution quality, 1 from monitoring.
- 1 blocking, 4 review, and 0 monitor entry(ies).
- Post-release monitoring status history_current with 4 drift signal(s).

### A completer par l'operateur avant transmission
- likelihood and severity rationale owned by the operator
- control owner and target review date for each open risk
- residual-risk acceptance rationale for any accepted risk
- provider decision linkage for block or review risks
- Residual-risk acceptance, control owners, and target review dates.

### Affirmation-to-evidence map
- Affirmation: The bundle generates a machine-derived draft risk register from observed runs, review outcomes, and monitoring signals.
  - Statut: Generated here
  - Reviewer use: Lets the reviewer see that Article 9 starts from runtime evidence rather than from a blank narrative template.
  - Preuves:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
    - [Revue de release](release-review.json) — Current release decision and escalation rationale.
    - [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.
- Affirmation: Likelihood rationale, owners, review dates, and residual-risk acceptance still need operator completion.
  - Statut: Completed by the operator
  - Reviewer use: Shows exactly which parts of Article 9 remain human-owned even after the machine-derived draft is present.
  - Preuves:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
- Affirmation: Open residual gaps remain visible until the operator dispositiones them in the final governance workflow.
  - Statut: Encore ouvert
  - Reviewer use: Prevents a reviewer from misreading the generated register as a final approved risk-management system.
  - Preuves:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.

### Preuves files
- [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
- [Revue de release](release-review.json) — Current release decision and escalation rationale.
- [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.

### Encore manquant ou encore ouvert
- Operator-owned risk governance still sits outside the evaluator.
- Annex III classification and legal interpretation still require counsel.
- This register is generated from runtime evidence and still requires operator-owned likelihood, impact, and acceptance rationale.

## 6. Changements sur le cycle de vie

### A quoi sert cette section
- This section links QMS-lite controls and monitoring continuity into one lifecycle view.
- It shows whether the evaluated release triggered additional review, remediation, or follow-up process requirements.

### Genere ici (genere par la machine)
- QMS-lite scaffold covers 6 process area(s) with 1 approval-required case(s) and 1 blocking case(s).
- Monitoring status history_current; execution quality healthy.
- 2 run(s) in monitoring window and 2 monitored case(s).

### A completer par l'operateur avant transmission
- named quality management owner and document approver
- written change-management procedure and approval workflow
- incident, complaint, and corrective-action handling workflow
- document-control, retention, and versioning policy
- training, competency, and supplier-management responsibilities
- authority and customer communication procedure for material issues
- Formal change-control procedures, ownership matrix, training, and communications outside the generated scaffold.

### Affirmation-to-evidence map
- Affirmation: The bundle shows a machine-generated lifecycle view across QMS-lite controls and monitoring continuity.
  - Statut: Generated here
  - Reviewer use: Lets the reviewer check whether lifecycle evidence exists for this release instead of inferring process continuity from static prose.
  - Preuves:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
    - [Revue de release](release-review.json) — Current promotion decision and checklist.
    - [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.
- Affirmation: Formal procedures, accountable roles, and training expectations still need operator-authored process documentation.
  - Statut: Completed by the operator
  - Reviewer use: Keeps the reviewer aware that QMS-lite is a technical scaffold, not a complete QMS document set.
  - Preuves:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
- Affirmation: Residual process gaps remain open until they are closed in the provider's management system.
  - Statut: Encore ouvert
  - Reviewer use: Makes lifecycle incompleteness visible instead of hiding it behind release status alone.
  - Preuves:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.

### Preuves files
- [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
- [Revue de release](release-review.json) — Current promotion decision and checklist.
- [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.

### Encore manquant ou encore ouvert
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

## 7. Standards et controles alternatifs

### A quoi sert cette section
- This section is intentionally narrow: the toolkit can point to the evidence that would support standards mapping, but it does not infer harmonised standards or common-specification claims.
- Reviewers should treat this as a support layer, not as an auto-generated conformity statement.

### Genere ici (genere par la machine)
- Coverage snapshot: 3 covered, 17 partial, 0 missing clause(s).
- Machine-readable evidence selectors and bundle artifacts that can be referenced inside a standards-mapping appendix.

### A completer par l'operateur avant transmission
- Harmonised standards or common specifications actually relied upon.
- Alternative control rationale where harmonised standards are not used.
- Notified body references and any external conformity-assessment narrative.

### Affirmation-to-evidence map
- Affirmation: The bundle can support standards mapping by exposing clause coverage and evidence selectors.
  - Statut: Generated here
  - Reviewer use: Lets the reviewer anchor standards discussion to actual evidence instead of to unlinked narrative references.
  - Preuves:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
    - [Preuves index](evidence-index.json) — Selectors and manifest-backed links.
    - [JSON Annexe IV](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- Affirmation: Any actual standards reliance or alternative-control rationale must be completed by the operator.
  - Statut: Completed by the operator
  - Reviewer use: Prevents readers from treating coverage selectors as if they were already a standards claim.
  - Preuves:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
    - [JSON Annexe IV](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- Affirmation: This section does not itself establish harmonised-standard or common-specification compliance.
  - Statut: Encore ouvert
  - Reviewer use: Keeps the boundary explicit between technical evidence support and formal conformity positioning.
  - Preuves:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.

### Preuves files
- [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
- [JSON Annexe IV](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
- [Preuves index](evidence-index.json) — Selectors and manifest-backed links.

### Encore manquant ou encore ouvert
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

## 8. Limite de la Declaration UE de conformite (Annexe V)

### A quoi sert cette section
- The toolkit does not generate the legal declaration itself.
- What it does provide is the technical record that can support the declaration's factual statements about system identity, review scope, and supporting evidence.

### Genere ici (genere par la machine)
- Versioned system identity and release review status that can be cited in a declaration pack.
- Portable evidence links that can be attached or referenced from the declaration package.

### A completer par l'operateur avant transmission
- The Annex V declaration text, legal basis, and provider-responsibility statement.
- Applicable-law references, notified body details, date, place, signer name, and title.

### Affirmation-to-evidence map
- Affirmation: The bundle provides technical facts that can support declaration drafting.
  - Statut: Generated here
  - Reviewer use: Lets the reviewer reuse verified system identity and release evidence when assembling a declaration package.
  - Preuves:
    - [JSON Annexe IV](eu-ai-act-annex-iv.json) — Technical support for declaration drafting.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
    - [Rapport de comparaison](../compare-report.json) — Technical release results backing the declaration.
    - [Revue de release](release-review.json) — Current release status for the evaluated system version.
- Affirmation: The legal declaration text and sign-off remain operator-owned.
  - Statut: Completed by the operator
  - Reviewer use: Makes it explicit that the technical pack supports the declaration but does not replace it.
  - Preuves:
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
    - [Revue de release](release-review.json) — Current release status for the evaluated system version.
- Affirmation: No declaration of conformity is generated by the toolkit outputs.
  - Statut: Encore ouvert
  - Reviewer use: Prevents a reviewer from mistaking technical support for a completed Annex V declaration.
  - Preuves:
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.

### Preuves files
- [JSON Annexe IV](eu-ai-act-annex-iv.json) — Technical support for declaration drafting.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
- [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
- [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
- [Rapport de comparaison](../compare-report.json) — Technical release results backing the declaration.
- [Revue de release](release-review.json) — Current release status for the evaluated system version.

### Encore manquant ou encore ouvert
- Declaration drafting and legal signoff remain outside the generated toolkit outputs.

## 9. Surveillance post-commercialisation et incidents graves

### A quoi sert cette section
- This section groups the post-market monitoring plan and serious-incident triage into one reviewer-facing end-of-dossier section.
- It is designed for fast external reading: what is being watched, what triggered concern, and what still requires human reporting judgment.

### Genere ici (genere par la machine)
- Monitoring plan status history_current with 2 run(s) in window.
- Serious-incident machine triage review_for_serious_incident with 5 trigger(s).
- 2 high/critical signal(s) and release decision reject.

### A completer par l'operateur avant transmission
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

### Affirmation-to-evidence map
- Affirmation: The package provides machine-generated monitoring and incident-triage scaffolds tied to current and historical signals.
  - Statut: Generated here
  - Reviewer use: Gives the reviewer a fast end-of-dossier view of what is being monitored and whether serious-incident triggers are already visible.
  - Preuves:
    - [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.
- Affirmation: Monitoring ownership, reporting obligations, and incident routing still need operator completion.
  - Statut: Completed by the operator
  - Reviewer use: Shows where operational and legal reporting duties still sit outside the generated machine layer.
  - Preuves:
    - [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.
- Affirmation: Open monitoring and incident gaps remain visible until the operator closes them in the final post-market workflow.
  - Statut: Encore ouvert
  - Reviewer use: Keeps unresolved monitoring and reporting gaps visible instead of burying them inside the technical scaffolds.
  - Preuves:
    - [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.

### Preuves files
- [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
- [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
- [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.

### Encore manquant ou encore ouvert
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
