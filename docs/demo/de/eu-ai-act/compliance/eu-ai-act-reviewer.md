# EU AI Act Reviewer-Paket

Report ID: `eu-ai-act-demo`  
Generated: 2026-04-02T03:30:00.483Z

## Zusammenfassung
- Release-Entscheidung: reject.
- Ausfuehrungsqualitaet: healthy.
- Coverage-Snapshot: 3 abgedeckt / 17 teilweise / 0 fehlende EU-AI-Act-Klausel(n).
- Menschliche Review-Warteschlange: 1 Freigabefall/Faelle, 1 blockierende Faelle.

## So lesen Sie dieses Paket
- Beginnen Sie mit dem Reviewer-PDF oder Reviewer-HTML, nicht mit rohen JSON-Dateien.
- Lesen Sie die Abschnitte in Annex-Reihenfolge; jeder Abschnitt erklaert, wofuer er dient, was hier erzeugt wird, was der Operator noch ergaenzt und was noch offen ist.
- Nutzen Sie die Claim-to-Evidence-Zuordnung, bevor Sie tiefere technische Dateien oeffnen.

## Wenn Sie nicht aus Engineering-Tools lesen
- Lesen Sie zuerst die Zusammenfassung am Anfang jedes Abschnitts.
- Focus on 'Completed by the operator' and 'Noch offen' to see what remains outside the generated machine layer.
- Nutzen Sie das Reviewer-PDF fuer Uebergabe, Druck, Procurement oder eine juristisch orientierte Pruefung.

## Wenn Sie technisch verifizieren
- Use the reviewer HTML as the readable map, then open the linked Compare-Report, Erweitertes Technikpaket, and Manifest where deeper verification is needed.
- Pruefen Sie zuerst die Claim-to-Evidence-Zeilen, damit Sie wissen, welche Datei welche Reviewer-Frage beantwortet.
- Behandeln Sie Dateinamen als zweitrangig; Annex-Reihenfolge und Abschnittszweck kommen zuerst.

## Was dieses Paket belegt
- Welche exakt evaluierte Systemversion dieses Paket erzeugt hat.
- Wie der Release auf der geprueften Fall-Suite abgeschnitten hat.
- Welche maschinell abgeleiteten Risiken, Review-Aktionen und Monitoring-Signale beobachtet wurden.
- Welche unterstuetzenden Dateien jeden reviewer-orientierten Abschnitt tragen.

## Was dieses Paket nicht fuer Sie abschliesst
- Dass der Anbieter jedes operator-seitig verfasste Feld aus Anhang IV oder Anhang V abgeschlossen hat.
- Dass sektorbezogene rechtliche, aktuarielle, klinische oder finanzielle Validierungspflichten vollstaendig erfuellt sind.
- Dass die Konformitaetserklaerung oder Marktplatzierungsentscheidung ohne menschliche Pruefung unterzeichnet werden kann.

## Verlinkte Ausgaben
- [Reviewer-PDF](eu-ai-act-reviewer.pdf) — Druckbares, reviewer-taugliches Dossier, das bei der EU-Paketierung erzeugt wurde.
- [Reviewer-HTML](eu-ai-act-reviewer.html) — Verlinktes reviewer-taugliches Dossier fuer die Browser-Pruefung.
- [Reviewer-Markdown](eu-ai-act-reviewer.md) — Editierbare Quelle fuer das reviewer-taugliche Dossier.
- [Erweitertes Technikpaket](eu-ai-act-report.html) — Vollstaendiges, engineering-orientiertes Annex-IV-Dossier mit Roh-Tabellen und detaillierten Scaffolds.
- [Annex-IV-JSON](eu-ai-act-annex-iv.json) — Strukturierter maschinenlesbarer Annex-IV-Export.
- [Article 10 data governance](article-10-data-governance.json) — System-specific data-governance scaffold for the evaluated release.
- [Article 16 provider obligations](article-16-provider-obligations.json) — Provider-obligations scaffold tied to the evaluated system version.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment scaffold and route inputs for the evaluated system.
- [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Declaration-of-conformity scaffold for the evaluated system version.
- [Annex V declaration content](annex-v-declaration-content.json) — Structured Annex V declaration-content scaffold.
- [Compare-Report](../compare-report.json) — Zugrunde liegender Release-Qualification-Report fuer diesen Lauf.
- [Manifest](../artifacts/manifest.json) — Portabler Nachweisindex fuer Artefakt-Integritaet.
- [Release-Review](release-review.json) — Maschinell erzeugte Release-Entscheidung und Reviewer-Checkliste.

## Pruefen Sie dieses Paket in Annex-Reihenfolge
- [1. Allgemeine Beschreibung des Systems](#general-description)
- [2. Detaillierte Beschreibung der Entwicklung](#development-description)
- [3. Ueberwachung, Funktion und Kontrolle](#operation-control)
- [4. Leistungsmetriken und Grenzen](#performance-limits)
- [5. Risikomanagementsystem (Artikel 9)](#risk-management)
- [6. Aenderungen ueber den Lebenszyklus](#lifecycle-changes)
- [7. Standards und alternative Kontrollen](#standards-specifications)
- [8. Grenze der EU-Konformitaetserklaerung (Anhang V)](#declaration-boundary)
- [9. Post-Market-Monitoring und schwerwiegende Vorfaelle](#post-market-serious-incidents)

## 1. Allgemeine Beschreibung des Systems

### Wofuer dieser Abschnitt gedacht ist
- This section identifies the exact agent, model, prompt, tools, and report scope used for the evaluated release.
- It is the reviewer-first entry point for understanding which system version produced the evidence in this package.

### Hier erzeugt (maschinell erzeugt)
- Report-ID eu-ai-act-demo mit Erzeugungszeitpunkt 2026-04-02T03:30:00.483Z.
- Umgebungsidentitaet: Agent golden-eu-agent / golden-eu-agent-v2, Modell golden-model-v1 / 2026-03-01.
- Paketumfang: Faelle _source_inputs/cases.json, Baseline _source_inputs/baseline, neu _source_inputs/new.
- Transferklasse internal_only und Schwaerzungsstatus none.

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- Provider legal identity, authorised representative, and external contact details.
- Narrative intended purpose and target user/deployer description.
- Market placement form, hardware/software integration context, and user-interface description.

### Aussage-to-evidence map
- Aussage: The package identifies the exact evaluated system version and run scope.
  - Status: Generated here
  - Reviewer use: Confirms that the dossier is tied to one concrete evaluated system rather than a generic product description.
  - Nachweise:
    - [Annex-IV-JSON](eu-ai-act-annex-iv.json) — System identity block.
    - [Compare-Report](../compare-report.json) — Release scope and runtime provenance.
    - [Manifest](../artifacts/manifest.json) — Integrity index for included artifacts.
- Aussage: Provider legal identity and intended-purpose narrative still need to be completed by the operator.
  - Status: Completed by the operator
  - Reviewer use: Separates the technical identity already present from the provider-authored context still needed for formal dossier completion.
  - Nachweise:
    - [Annex-IV-JSON](eu-ai-act-annex-iv.json) — System identity block.
- Aussage: The generated bundle does not itself supply market-placement form or UI-description narrative.
  - Status: Noch offen
  - Reviewer use: Prevents a reviewer from mistaking technical identity for a full product-description section.
  - Nachweise:
    - [Annex-IV-JSON](eu-ai-act-annex-iv.json) — System identity block.

### Nachweise files
- [Annex-IV-JSON](eu-ai-act-annex-iv.json) — System identity block.
- [Compare-Report](../compare-report.json) — Release scope and runtime provenance.
- [Manifest](../artifacts/manifest.json) — Integrity index for included artifacts.

### Noch fehlend oder noch offen
- None.

## 2. Detaillierte Beschreibung der Entwicklung

### Wofuer dieser Abschnitt gedacht ist
- This section captures how the evaluated release was exercised and which machine-verifiable artifacts back the technical record.
- It is evidence-backed, but it does not replace provider-authored architecture and data-governance writing.

### Hier erzeugt (maschinell erzeugt)
- 13 manifest-backed artifact(s) indexed across 20 EU AI Act coverage clause(s).
- 2 case artifact row(s) with response, replay, and trace references where available.
- Execution exercised on suite(s): release.

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- Architecture narrative, algorithmic design decisions, trade-offs, and computational resources.
- Training/data provenance, labelling, cleaning, and datasheet material.
- Cybersecurity design narrative beyond the emitted runtime and scanner evidence.

### Aussage-to-evidence map
- Aussage: The bundle preserves enough runtime artifacts to reconstruct how the evaluated release was exercised.
  - Status: Generated here
  - Reviewer use: Lets the reviewer verify that development-stage claims are backed by retained evidence rather than narrative alone.
  - Nachweise:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Nachweise index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
    - [Manifest](../artifacts/manifest.json) — Artifact-level integrity data.
    - [Erweitertes Technikpaket](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
- Aussage: Architecture, training-data, and broader development-process narrative still need provider-authored text.
  - Status: Completed by the operator
  - Reviewer use: Shows where the evidence engine stops and provider engineering documentation still needs to be attached.
  - Nachweise:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Erweitertes Technikpaket](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
    - [Nachweise index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
- Aussage: The generated section does not claim complete training-data governance or full architecture coverage.
  - Status: Noch offen
  - Reviewer use: Avoids over-reading runtime evidence as if it were the whole development record.
  - Nachweise:
    - [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
    - [Nachweise index](evidence-index.json) — Clause-to-artifact mapping for the bundle.

### Nachweise files
- [Article 10 data governance](article-10-data-governance.json) — Data-governance scaffold for sources, representativeness, and preparation steps.
- [Nachweise index](evidence-index.json) — Clause-to-artifact mapping for the bundle.
- [Erweitertes Technikpaket](eu-ai-act-report.html) — Detailed tables and clause-by-clause scaffolds.
- [Manifest](../artifacts/manifest.json) — Artifact-level integrity data.

### Noch fehlend oder noch offen
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

## 3. Ueberwachung, Funktion und Kontrolle

### Wofuer dieser Abschnitt gedacht ist
- This section gives reviewers a short view of how the evaluated release is meant to be operated, overseen, and escalated.
- It combines deployer-facing Article 13 scaffolding with human-oversight and release-review outputs.

### Hier erzeugt (maschinell erzeugt)
- Execution quality is healthy with new pass rate 50.0%.
- 1 case(s) require approval and 1 case(s) are blocked in the current review queue.
- 2 case(s) show missing assumption-state capture.

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- intended purpose statement for deployers
- known limitations and acceptable operating conditions
- human oversight and escalation instructions
- monitoring and maintenance contact path
- Named oversight roles, escalation owner, and customer/deployer contact path.
- Final instructions-for-use text and safe operating boundary wording.

### Aussage-to-evidence map
- Aussage: The package shows the current oversight queue, release status, and deployer-facing instruction scaffold for this release.
  - Status: Generated here
  - Reviewer use: Lets the reviewer see whether oversight and operation controls are grounded in the actual evaluated release.
  - Nachweise:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
    - [Release-Review](release-review.json) — Release gate status and signoff expectation.
- Aussage: Named oversight roles, escalation ownership, and final instructions-for-use wording must be completed by the operator.
  - Status: Completed by the operator
  - Reviewer use: Separates generated release and review facts from the deployer instructions that still need human ownership.
  - Nachweise:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
- Aussage: Known limitations and assumption-state gaps remain open until the operator closes them in the final dossier and workflow.
  - Status: Noch offen
  - Reviewer use: Keeps the reviewer focused on whether the operating boundary is complete enough for handoff.
  - Nachweise:
    - [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
    - [Release-Review](release-review.json) — Release gate status and signoff expectation.

### Nachweise files
- [Article 13 instructions](article-13-instructions.json) — Instructions-for-use scaffold.
- [Human oversight summary](human-oversight-summary.json) — Reviewer queue and action map.
- [Release-Review](release-review.json) — Release gate status and signoff expectation.

### Noch fehlend oder noch offen
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

## 4. Leistungsmetriken und Grenzen

### Wofuer dieser Abschnitt gedacht ist
- This section is where a reviewer sees whether the release is technically healthy, what changed, and what limitations were observed.
- It is backed by comparable runs, but the business acceptability of those metrics remains operator-owned.

### Hier erzeugt (maschinell erzeugt)
- Execution quality status healthy; regressions 0; improvements 1.
- Security signal snapshot: 2 case(s) with new signals; top kinds prompt_injection_marker, unsafe_code_execution.
- Release decision is reject with 1 approval case(s) and 1 blocking case(s).

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- Domain-specific acceptance thresholds and explanation of why these metrics are sufficient for deployment.
- Business-harm narrative, acceptable error levels, and customer impact interpretation.

### Aussage-to-evidence map
- Aussage: The release's current quality and blocking status are backed by comparable-run evidence and release review outputs.
  - Status: Generated here
  - Reviewer use: Supports a fast decision on whether the technical release evidence is healthy enough to read further.
  - Nachweise:
    - [Compare-Report](../compare-report.json) — Comparable run results and execution-quality details.
    - [Release-Review](release-review.json) — Release gate summary and rationale.
    - [Erweitertes Technikpaket](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.
- Aussage: Acceptance thresholds and harm interpretation still need operator judgment.
  - Status: Completed by the operator
  - Reviewer use: Shows that technical metrics are present, but deployment acceptability is still a human decision.
  - Nachweise:
    - [Compare-Report](../compare-report.json) — Comparable run results and execution-quality details.
    - [Release-Review](release-review.json) — Release gate summary and rationale.
- Aussage: Any unresolved known limitations remain open unless explicitly dispositioned by the operator.
  - Status: Noch offen
  - Reviewer use: Prevents a reviewer from treating the measured outputs as a complete deployment approval by themselves.
  - Nachweise:
    - [Erweitertes Technikpaket](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.
    - [Release-Review](release-review.json) — Release gate summary and rationale.

### Nachweise files
- [Compare-Report](../compare-report.json) — Comparable run results and execution-quality details.
- [Release-Review](release-review.json) — Release gate summary and rationale.
- [Erweitertes Technikpaket](eu-ai-act-report.html) — Detailed highlighted cases and signal summaries.

### Noch fehlend oder noch offen
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

## 5. Risikomanagementsystem (Artikel 9)

### Wofuer dieser Abschnitt gedacht ist
- This section gives reviewers a machine-derived draft risk register tied to observed runs, review decisions, and monitoring signals.
- It is a starting point for Article 9, not a complete provider-authored risk management system.

### Hier erzeugt (maschinell erzeugt)
- 5 machine-derived risk entry(ies): 2 from case behaviour, 2 from coverage gaps, 0 from execution quality, 1 from monitoring.
- 1 blocking, 4 review, and 0 monitor entry(ies).
- Post-release monitoring status history_current with 4 drift signal(s).

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- likelihood and severity rationale owned by the operator
- control owner and target review date for each open risk
- residual-risk acceptance rationale for any accepted risk
- provider decision linkage for block or review risks
- Residual-risk acceptance, control owners, and target review dates.

### Aussage-to-evidence map
- Aussage: The bundle generates a machine-derived draft risk register from observed runs, review outcomes, and monitoring signals.
  - Status: Generated here
  - Reviewer use: Lets the reviewer see that Article 9 starts from runtime evidence rather than from a blank narrative template.
  - Nachweise:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
    - [Release-Review](release-review.json) — Current release decision and escalation rationale.
    - [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.
- Aussage: Likelihood rationale, owners, review dates, and residual-risk acceptance still need operator completion.
  - Status: Completed by the operator
  - Reviewer use: Shows exactly which parts of Article 9 remain human-owned even after the machine-derived draft is present.
  - Nachweise:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
- Aussage: Open residual gaps remain visible until the operator dispositiones them in the final governance workflow.
  - Status: Noch offen
  - Reviewer use: Prevents a reviewer from misreading the generated register as a final approved risk-management system.
  - Nachweise:
    - [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.

### Nachweise files
- [Article 9 risk register](article-9-risk-register.json) — Machine-derived risk register scaffold.
- [Release-Review](release-review.json) — Current release decision and escalation rationale.
- [Post-market monitoring](post-market-monitoring.json) — Signals that reopen or update risks after release.

### Noch fehlend oder noch offen
- Operator-owned risk governance still sits outside the evaluator.
- Annex III classification and legal interpretation still require counsel.
- This register is generated from runtime evidence and still requires operator-owned likelihood, impact, and acceptance rationale.

## 6. Aenderungen ueber den Lebenszyklus

### Wofuer dieser Abschnitt gedacht ist
- This section links QMS-lite controls and monitoring continuity into one lifecycle view.
- It shows whether the evaluated release triggered additional review, remediation, or follow-up process requirements.

### Hier erzeugt (maschinell erzeugt)
- QMS-lite scaffold covers 6 process area(s) with 1 approval-required case(s) and 1 blocking case(s).
- Monitoring status history_current; execution quality healthy.
- 2 run(s) in monitoring window and 2 monitored case(s).

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- named quality management owner and document approver
- written change-management procedure and approval workflow
- incident, complaint, and corrective-action handling workflow
- document-control, retention, and versioning policy
- training, competency, and supplier-management responsibilities
- authority and customer communication procedure for material issues
- Formal change-control procedures, ownership matrix, training, and communications outside the generated scaffold.

### Aussage-to-evidence map
- Aussage: The bundle shows a machine-generated lifecycle view across QMS-lite controls and monitoring continuity.
  - Status: Generated here
  - Reviewer use: Lets the reviewer check whether lifecycle evidence exists for this release instead of inferring process continuity from static prose.
  - Nachweise:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
    - [Release-Review](release-review.json) — Current promotion decision and checklist.
    - [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.
- Aussage: Formal procedures, accountable roles, and training expectations still need operator-authored process documentation.
  - Status: Completed by the operator
  - Reviewer use: Keeps the reviewer aware that QMS-lite is a technical scaffold, not a complete QMS document set.
  - Nachweise:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
- Aussage: Residual process gaps remain open until they are closed in the provider's management system.
  - Status: Noch offen
  - Reviewer use: Makes lifecycle incompleteness visible instead of hiding it behind release status alone.
  - Nachweise:
    - [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.

### Nachweise files
- [Article 17 QMS-lite](article-17-qms-lite.json) — Lifecycle and process scaffold.
- [Release-Review](release-review.json) — Current promotion decision and checklist.
- [Post-market monitoring](post-market-monitoring.json) — Monitoring continuity and drift signals.

### Noch fehlend oder noch offen
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

## 7. Standards und alternative Kontrollen

### Wofuer dieser Abschnitt gedacht ist
- This section is intentionally narrow: the toolkit can point to the evidence that would support standards mapping, but it does not infer harmonised standards or common-specification claims.
- Reviewers should treat this as a support layer, not as an auto-generated conformity statement.

### Hier erzeugt (maschinell erzeugt)
- Coverage snapshot: 3 covered, 17 partial, 0 missing clause(s).
- Machine-readable evidence selectors and bundle artifacts that can be referenced inside a standards-mapping appendix.

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- Harmonised standards or common specifications actually relied upon.
- Alternative control rationale where harmonised standards are not used.
- Notified body references and any external conformity-assessment narrative.

### Aussage-to-evidence map
- Aussage: The bundle can support standards mapping by exposing clause coverage and evidence selectors.
  - Status: Generated here
  - Reviewer use: Lets the reviewer anchor standards discussion to actual evidence instead of to unlinked narrative references.
  - Nachweise:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
    - [Nachweise index](evidence-index.json) — Selectors and manifest-backed links.
    - [Annex-IV-JSON](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- Aussage: Any actual standards reliance or alternative-control rationale must be completed by the operator.
  - Status: Completed by the operator
  - Reviewer use: Prevents readers from treating coverage selectors as if they were already a standards claim.
  - Nachweise:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
    - [Annex-IV-JSON](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- Aussage: This section does not itself establish harmonised-standard or common-specification compliance.
  - Status: Noch offen
  - Reviewer use: Keeps the boundary explicit between technical evidence support and formal conformity positioning.
  - Nachweise:
    - [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.

### Nachweise files
- [EU coverage export](eu-ai-act-coverage.json) — Clause status and residual gaps.
- [Annex-IV-JSON](eu-ai-act-annex-iv.json) — Structured coverage-ready dossier data.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route and supporting record scaffold.
- [Nachweise index](evidence-index.json) — Selectors and manifest-backed links.

### Noch fehlend oder noch offen
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

## 8. Grenze der EU-Konformitaetserklaerung (Anhang V)

### Wofuer dieser Abschnitt gedacht ist
- The toolkit does not generate the legal declaration itself.
- What it does provide is the technical record that can support the declaration's factual statements about system identity, review scope, and supporting evidence.

### Hier erzeugt (maschinell erzeugt)
- Versioned system identity and release review status that can be cited in a declaration pack.
- Portable evidence links that can be attached or referenced from the declaration package.

### Vor der Uebergabe durch den Operator zu vervollstaendigen
- The Annex V declaration text, legal basis, and provider-responsibility statement.
- Applicable-law references, notified body details, date, place, signer name, and title.

### Aussage-to-evidence map
- Aussage: The bundle provides technical facts that can support declaration drafting.
  - Status: Generated here
  - Reviewer use: Lets the reviewer reuse verified system identity and release evidence when assembling a declaration package.
  - Nachweise:
    - [Annex-IV-JSON](eu-ai-act-annex-iv.json) — Technical support for declaration drafting.
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
    - [Compare-Report](../compare-report.json) — Technical release results backing the declaration.
    - [Release-Review](release-review.json) — Current release status for the evaluated system version.
- Aussage: The legal declaration text and sign-off remain operator-owned.
  - Status: Completed by the operator
  - Reviewer use: Makes it explicit that the technical pack supports the declaration but does not replace it.
  - Nachweise:
    - [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
    - [Release-Review](release-review.json) — Current release status for the evaluated system version.
- Aussage: No declaration of conformity is generated by the toolkit outputs.
  - Status: Noch offen
  - Reviewer use: Prevents a reviewer from mistaking technical support for a completed Annex V declaration.
  - Nachweise:
    - [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
    - [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.

### Nachweise files
- [Annex-IV-JSON](eu-ai-act-annex-iv.json) — Technical support for declaration drafting.
- [Article 43 conformity assessment](article-43-conformity-assessment.json) — Conformity-assessment route backing the declaration path.
- [Article 47 declaration scaffold](article-47-declaration-of-conformity.json) — Provider declaration scaffold for the evaluated system version.
- [Annex V declaration content](annex-v-declaration-content.json) — Required Annex V declaration-content items and gaps.
- [Compare-Report](../compare-report.json) — Technical release results backing the declaration.
- [Release-Review](release-review.json) — Current release status for the evaluated system version.

### Noch fehlend oder noch offen
- Declaration drafting and legal signoff remain outside the generated toolkit outputs.

## 9. Post-Market-Monitoring und schwerwiegende Vorfaelle

### Wofuer dieser Abschnitt gedacht ist
- This section groups the post-market monitoring plan and serious-incident triage into one reviewer-facing end-of-dossier section.
- It is designed for fast external reading: what is being watched, what triggered concern, and what still requires human reporting judgment.

### Hier erzeugt (maschinell erzeugt)
- Monitoring plan status history_current with 2 run(s) in window.
- Serious-incident machine triage review_for_serious_incident with 5 trigger(s).
- 2 high/critical signal(s) and release decision reject.

### Vor der Uebergabe durch den Operator zu vervollstaendigen
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

### Aussage-to-evidence map
- Aussage: The package provides machine-generated monitoring and incident-triage scaffolds tied to current and historical signals.
  - Status: Generated here
  - Reviewer use: Gives the reviewer a fast end-of-dossier view of what is being monitored and whether serious-incident triggers are already visible.
  - Nachweise:
    - [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
    - [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.
- Aussage: Monitoring ownership, reporting obligations, and incident routing still need operator completion.
  - Status: Completed by the operator
  - Reviewer use: Shows where operational and legal reporting duties still sit outside the generated machine layer.
  - Nachweise:
    - [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.
- Aussage: Open monitoring and incident gaps remain visible until the operator closes them in the final post-market workflow.
  - Status: Noch offen
  - Reviewer use: Keeps unresolved monitoring and reporting gaps visible instead of burying them inside the technical scaffolds.
  - Nachweise:
    - [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
    - [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.

### Nachweise files
- [Article 72 monitoring plan](article-72-monitoring-plan.json) — Technical monitoring-plan scaffold.
- [Post-market monitoring](post-market-monitoring.json) — Observed history and drift/watchlist summary.
- [Article 73 serious-incident pack](article-73-serious-incident-pack.json) — Machine-generated incident triage scaffold.

### Noch fehlend oder noch offen
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
