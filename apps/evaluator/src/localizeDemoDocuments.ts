import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderHtmlReport } from "./htmlReport";
import type { CompareReport } from "./reportTypes";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - imported from JS helper used by publish step
import { renderEuReviewerPdfFromPaths } from "../../../scripts/lib/reviewer-pdf.mjs";

type Locale = "en" | "de" | "fr";

const LOCALES: Locale[] = ["en", "de", "fr"];

function parseArgs(argv: string[]) {
  const out = {
    publishRoot: "",
    agentReportDir: "",
    euReportDir: "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if ((token === "--publishRoot" || token === "--agentReportDir" || token === "--euReportDir") && value) {
      if (token === "--publishRoot") out.publishRoot = path.resolve(value);
      if (token === "--agentReportDir") out.agentReportDir = path.resolve(value);
      if (token === "--euReportDir") out.euReportDir = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${token}`);
  }

  if (!out.publishRoot || !out.agentReportDir || !out.euReportDir) {
    throw new Error("Usage: ts-node apps/evaluator/src/localizeDemoDocuments.ts --publishRoot <path> --agentReportDir <path> --euReportDir <path>");
  }

  return out;
}

function readJson<T>(absPath: string): T {
  return JSON.parse(readFileSync(absPath, "utf8")) as T;
}

function ensureParent(absPath: string) {
  mkdirSync(path.dirname(absPath), { recursive: true });
}

function replacePairs(text: string, pairs: Array<[string, string]>): string {
  return pairs.reduce((acc, [from, to]) => acc.split(from).join(to), text);
}

function setHtmlLang(text: string, locale: Locale): string {
  return text.replace(/<html lang="[^"]+">/i, `<html lang="${locale}">`);
}

function translateReviewerText(text: string, locale: Locale): string {
  if (locale === "en") return text;

  const pairs =
    locale === "de"
      ? ([
          ["EU AI Act reviewer pack", "EU AI Act Reviewer-Paket"],
          ["How to read this pack", "So lesen Sie dieses Paket"],
          ["If you are not reading from engineering tooling", "Wenn Sie nicht aus Engineering-Tools lesen"],
          ["If you are doing technical verification", "Wenn Sie technisch verifizieren"],
          ["What this pack proves", "Was dieses Paket belegt"],
          ["What this pack does not complete for you", "Was dieses Paket nicht fuer Sie abschliesst"],
          ["Linked outputs", "Verlinkte Ausgaben"],
          ["Review this pack in Annex order", "Pruefen Sie dieses Paket in Annex-Reihenfolge"],
          ["What this section is for", "Wofuer dieser Abschnitt gedacht ist"],
          ["Generated here (machine-generated)", "Hier erzeugt (maschinell erzeugt)"],
          ["Completed by the operator before handoff", "Vor der Uebergabe durch den Operator zu vervollstaendigen"],
          ["Still open", "Noch offen"],
          ["Claim", "Aussage"],
          ["Status", "Status"],
          ["Why it matters to the reviewer", "Warum das fuer die pruefende Person wichtig ist"],
          ["Evidence", "Nachweise"],
          ["Evidence file", "Nachweisdatei"],
          ["Path", "Pfad"],
          ["Why it matters", "Warum es wichtig ist"],
          ["Reviewer PDF", "Reviewer-PDF"],
          ["Printable reviewer-facing dossier generated during EU packaging.", "Druckbares, reviewer-taugliches Dossier, das bei der EU-Paketierung erzeugt wurde."],
          ["Reviewer HTML", "Reviewer-HTML"],
          ["Linked reviewer-facing dossier for browser review.", "Verlinktes reviewer-taugliches Dossier fuer die Browser-Pruefung."],
          ["Reviewer Markdown", "Reviewer-Markdown"],
          ["Editable reviewer-facing dossier source.", "Editierbare Quelle fuer das reviewer-taugliche Dossier."],
          ["Expanded technical pack", "Erweitertes Technikpaket"],
          ["Full engineering-facing Annex IV dossier with raw tables and detailed scaffolds.", "Vollstaendiges, engineering-orientiertes Annex-IV-Dossier mit Roh-Tabellen und detaillierten Scaffolds."],
          ["Annex IV JSON", "Annex-IV-JSON"],
          ["Structured machine-readable Annex IV export.", "Strukturierter maschinenlesbarer Annex-IV-Export."],
          ["Compare report", "Compare-Report"],
          ["Underlying release-qualification report for this run.", "Zugrunde liegender Release-Qualification-Report fuer diesen Lauf."],
          ["Manifest", "Manifest"],
          ["Portable evidence index for artifact integrity.", "Portabler Nachweisindex fuer Artefakt-Integritaet."],
          ["Release review", "Release-Review"],
          ["Machine-generated release decision and reviewer checklist.", "Maschinell erzeugte Release-Entscheidung und Reviewer-Checkliste."],
          ["1. General description of the system", "1. Allgemeine Beschreibung des Systems"],
          ["2. Detailed description of development", "2. Detaillierte Beschreibung der Entwicklung"],
          ["3. Monitoring, functioning, and control", "3. Ueberwachung, Funktion und Kontrolle"],
          ["4. Performance metrics and limitations", "4. Leistungsmetriken und Grenzen"],
          ["5. Risk management system (Article 9)", "5. Risikomanagementsystem (Artikel 9)"],
          ["6. Changes over the lifecycle", "6. Aenderungen ueber den Lebenszyklus"],
          ["7. Standards and alternative controls", "7. Standards und alternative Kontrollen"],
          ["8. EU Declaration of Conformity boundary (Annex V)", "8. Grenze der EU-Konformitaetserklaerung (Anhang V)"],
          ["9. Post-market monitoring and serious incidents", "9. Post-Market-Monitoring und schwerwiegende Vorfaelle"],
          ["Start with the reviewer PDF or reviewer HTML, not with raw JSON files.", "Beginnen Sie mit dem Reviewer-PDF oder Reviewer-HTML, nicht mit rohen JSON-Dateien."],
          ["Read sections in Annex order; each section answers what it is for, what is generated here, what the operator still completes, and what is still open.", "Lesen Sie die Abschnitte in Annex-Reihenfolge; jeder Abschnitt erklaert, wofuer er dient, was hier erzeugt wird, was der Operator noch ergaenzt und was noch offen ist."],
          ["Use the claim-to-evidence map before opening deeper technical files.", "Nutzen Sie die Claim-to-Evidence-Zuordnung, bevor Sie tiefere technische Dateien oeffnen."],
          ["Read the summary at the top of each section first.", "Lesen Sie zuerst die Zusammenfassung am Anfang jedes Abschnitts."],
          ["Focus on 'Completed by the operator' and 'Still open' to see what remains outside the generated machine layer.", "Konzentrieren Sie sich auf 'Vor der Uebergabe durch den Operator zu vervollstaendigen' und 'Noch offen', um zu sehen, was ausserhalb der erzeugten Maschinenebene bleibt."],
          ["Use the reviewer PDF for handoff, printing, procurement, or counsel-facing review.", "Nutzen Sie das Reviewer-PDF fuer Uebergabe, Druck, Procurement oder eine juristisch orientierte Pruefung."],
          ["Use the reviewer HTML as the readable map, then open the linked Compare report, Expanded technical pack, and Manifest where deeper verification is needed.", "Nutzen Sie das Reviewer-HTML als lesbare Karte und oeffnen Sie danach den verlinkten Compare-Report, das erweiterte Technikpaket und das Manifest, wo tiefere Verifikation noetig ist."],
          ["Check claim-to-evidence rows before opening raw artifacts so you know which file answers which reviewer question.", "Pruefen Sie zuerst die Claim-to-Evidence-Zeilen, damit Sie wissen, welche Datei welche Reviewer-Frage beantwortet."],
          ["Treat filenames as secondary; Annex order and section purpose come first.", "Behandeln Sie Dateinamen als zweitrangig; Annex-Reihenfolge und Abschnittszweck kommen zuerst."],
          ["Which exact evaluated system version produced this package.", "Welche exakt evaluierte Systemversion dieses Paket erzeugt hat."],
          ["How the release performed on the reviewed case suite.", "Wie der Release auf der geprueften Fall-Suite abgeschnitten hat."],
          ["Which machine-derived risks, review actions, and monitoring signals were observed.", "Welche maschinell abgeleiteten Risiken, Review-Aktionen und Monitoring-Signale beobachtet wurden."],
          ["Which supporting files back each reviewer-facing section.", "Welche unterstuetzenden Dateien jeden reviewer-orientierten Abschnitt tragen."],
          ["That the provider has completed every operator-authored Annex IV or Annex V field.", "Dass der Anbieter jedes operator-seitig verfasste Feld aus Anhang IV oder Anhang V abgeschlossen hat."],
          ["That sector-specific legal, actuarial, clinical, or financial validation obligations are fully satisfied.", "Dass sektorbezogene rechtliche, aktuarielle, klinische oder finanzielle Validierungspflichten vollstaendig erfuellt sind."],
          ["That the declaration of conformity or market-placement decision can be signed without human review.", "Dass die Konformitaetserklaerung oder Marktplatzierungsentscheidung ohne menschliche Pruefung unterzeichnet werden kann."],
          ["### Claim-to-evidence map", "### Claim-to-Evidence-Zuordnung"],
          ["### Evidence files", "### Nachweisdateien"],
          ["### Still missing or still open", "### Noch fehlend oder noch offen"],
          ["## Summary", "## Zusammenfassung"],
          ["## Linked outputs", "## Verlinkte Ausgaben"],
          ["## What this pack proves", "## Was dieses Paket belegt"],
          ["## What this pack does not complete for you", "## Was dieses Paket nicht fuer Sie abschliesst"],
        ] satisfies Array<[string, string]>)
      : ([
          ["EU AI Act reviewer pack", "Package reviewer EU AI Act"],
          ["How to read this pack", "Comment lire ce package"],
          ["If you are not reading from engineering tooling", "Si vous ne lisez pas depuis les outils d'ingenierie"],
          ["If you are doing technical verification", "Si vous effectuez une verification technique"],
          ["What this pack proves", "Ce que ce package demontre"],
          ["What this pack does not complete for you", "Ce que ce package ne complete pas pour vous"],
          ["Linked outputs", "Sorties liees"],
          ["Review this pack in Annex order", "Lisez ce package dans l'ordre de l'annexe"],
          ["What this section is for", "A quoi sert cette section"],
          ["Generated here (machine-generated)", "Genere ici (genere par la machine)"],
          ["Completed by the operator before handoff", "A completer par l'operateur avant transmission"],
          ["Still open", "Encore ouvert"],
          ["Claim", "Affirmation"],
          ["Status", "Statut"],
          ["Why it matters to the reviewer", "Pourquoi c'est important pour l'evaluateur"],
          ["Evidence", "Preuves"],
          ["Evidence file", "Fichier de preuve"],
          ["Path", "Chemin"],
          ["Why it matters", "Pourquoi c'est important"],
          ["Reviewer PDF", "PDF reviewer"],
          ["Printable reviewer-facing dossier generated during EU packaging.", "Dossier imprimable oriente reviewer genere pendant le packaging EU."],
          ["Reviewer HTML", "HTML reviewer"],
          ["Linked reviewer-facing dossier for browser review.", "Dossier lie, oriente reviewer, pour lecture dans le navigateur."],
          ["Reviewer Markdown", "Markdown reviewer"],
          ["Editable reviewer-facing dossier source.", "Source editable du dossier oriente reviewer."],
          ["Expanded technical pack", "Pack technique etendu"],
          ["Full engineering-facing Annex IV dossier with raw tables and detailed scaffolds.", "Dossier Annexe IV complet, oriente ingenierie, avec tables brutes et scaffolds detailles."],
          ["Annex IV JSON", "JSON Annexe IV"],
          ["Structured machine-readable Annex IV export.", "Export Annexe IV structure et lisible par machine."],
          ["Compare report", "Rapport de comparaison"],
          ["Underlying release-qualification report for this run.", "Rapport de qualification de release sous-jacent pour ce run."],
          ["Manifest", "Manifeste"],
          ["Portable evidence index for artifact integrity.", "Index portable de preuves pour l'integrite des artefacts."],
          ["Release review", "Revue de release"],
          ["Machine-generated release decision and reviewer checklist.", "Decision de release et checklist reviewer generees par la machine."],
          ["1. General description of the system", "1. Description generale du systeme"],
          ["2. Detailed description of development", "2. Description detaillee du developpement"],
          ["3. Monitoring, functioning, and control", "3. Monitoring, fonctionnement et controle"],
          ["4. Performance metrics and limitations", "4. Metriques de performance et limites"],
          ["5. Risk management system (Article 9)", "5. Systeme de gestion des risques (Article 9)"],
          ["6. Changes over the lifecycle", "6. Changements sur le cycle de vie"],
          ["7. Standards and alternative controls", "7. Standards et controles alternatifs"],
          ["8. EU Declaration of Conformity boundary (Annex V)", "8. Limite de la Declaration UE de conformite (Annexe V)"],
          ["9. Post-market monitoring and serious incidents", "9. Surveillance post-commercialisation et incidents graves"],
          ["Start with the reviewer PDF or reviewer HTML, not with raw JSON files.", "Commencez par le PDF reviewer ou le HTML reviewer, pas par les fichiers JSON bruts."],
          ["Read sections in Annex order; each section answers what it is for, what is generated here, what the operator still completes, and what is still open.", "Lisez les sections dans l'ordre de l'annexe ; chaque section explique a quoi elle sert, ce qui est genere ici, ce que l'operateur complete encore et ce qui reste ouvert."],
          ["Use the claim-to-evidence map before opening deeper technical files.", "Utilisez la correspondance affirmation-preuve avant d'ouvrir des fichiers techniques plus profonds."],
          ["Read the summary at the top of each section first.", "Lisez d'abord le resume en tete de chaque section."],
          ["Focus on 'Completed by the operator' and 'Still open' to see what remains outside the generated machine layer.", "Concentrez-vous sur 'A completer par l'operateur avant transmission' et 'Encore ouvert' pour voir ce qui reste hors de la couche machine generee."],
          ["Use the reviewer PDF for handoff, printing, procurement, or counsel-facing review.", "Utilisez le PDF reviewer pour la transmission, l'impression, le procurement ou une revue oriente conseil juridique."],
          ["Use the reviewer HTML as the readable map, then open the linked Compare report, Expanded technical pack, and Manifest where deeper verification is needed.", "Utilisez le HTML reviewer comme carte lisible, puis ouvrez le rapport de comparaison, le pack technique etendu et le manifeste lorsque des verifications plus profondes sont necessaires."],
          ["Check claim-to-evidence rows before opening raw artifacts so you know which file answers which reviewer question.", "Consultez d'abord les lignes affirmation-preuve pour savoir quel fichier repond a quelle question reviewer."],
          ["Treat filenames as secondary; Annex order and section purpose come first.", "Traitez les noms de fichiers comme secondaires ; l'ordre de l'annexe et le role de la section passent d'abord."],
          ["Which exact evaluated system version produced this package.", "Quelle version exacte du systeme evalue a produit ce package."],
          ["How the release performed on the reviewed case suite.", "Comment la release s'est comportee sur la suite de cas revue."],
          ["Which machine-derived risks, review actions, and monitoring signals were observed.", "Quels risques derives par la machine, actions de revue et signaux de monitoring ont ete observes."],
          ["Which supporting files back each reviewer-facing section.", "Quels fichiers de support soutiennent chaque section orientee reviewer."],
          ["That the provider has completed every operator-authored Annex IV or Annex V field.", "Que le fournisseur a complete chaque champ redige par l'operateur dans l'Annexe IV ou l'Annexe V."],
          ["That sector-specific legal, actuarial, clinical, or financial validation obligations are fully satisfied.", "Que les obligations sectorielles de validation juridique, actuarielle, clinique ou financiere sont entierement satisfaites."],
          ["That the declaration of conformity or market-placement decision can be signed without human review.", "Que la declaration de conformite ou la decision de mise sur le marche peut etre signee sans revue humaine."],
          ["### Claim-to-evidence map", "### Correspondance affirmation-preuve"],
          ["### Evidence files", "### Fichiers de preuve"],
          ["### Still missing or still open", "### Encore manquant ou encore ouvert"],
          ["## Summary", "## Resume"],
          ["## Linked outputs", "## Sorties liees"],
          ["## What this pack proves", "## Ce que ce package demontre"],
          ["## What this pack does not complete for you", "## Ce que ce package ne complete pas pour vous"],
        ] satisfies Array<[string, string]>);

  let next = replacePairs(text, pairs);

  const patterns: Array<[RegExp, string]> =
    locale === "de"
      ? [
          [/Release decision: (.+?)\./g, "Release-Entscheidung: $1."],
          [/Execution quality: (.+?)\./g, "Ausfuehrungsqualitaet: $1."],
          [/Coverage snapshot: (.+?) covered \/ (.+?) partial \/ (.+?) missing EU AI Act clause\(s\)\./g, "Coverage-Snapshot: $1 abgedeckt / $2 teilweise / $3 fehlende EU-AI-Act-Klausel(n)."],
          [/Human review queue: (.+?) approval case\(s\), (.+?) blocking case\(s\)\./g, "Menschliche Review-Warteschlange: $1 Freigabefall/Faelle, $2 blockierende Faelle."],
          [/Report ID (.+?) with generated timestamp (.+?)\./g, "Report-ID $1 mit Erzeugungszeitpunkt $2."],
          [/Environment identity: agent (.+?) \/ (.+?), model (.+?) \/ (.+?)\./g, "Umgebungsidentitaet: Agent $1 / $2, Modell $3 / $4."],
          [/Package scope: cases (.+?), baseline (.+?), new (.+?)\./g, "Paketumfang: Faelle $1, Baseline $2, neu $3."],
          [/Transfer class (.+?) and redaction status (.+?)\./g, "Transferklasse $1 und Schwaerzungsstatus $2."],
          [/Report <code>(.+?)<\/code> · generated (.+?)<\/div>/g, "Report <code>$1</code> · erzeugt $2</div>"],
        ]
      : [
          [/Release decision: (.+?)\./g, "Decision de release : $1."],
          [/Execution quality: (.+?)\./g, "Qualite d'execution : $1."],
          [/Coverage snapshot: (.+?) covered \/ (.+?) partial \/ (.+?) missing EU AI Act clause\(s\)\./g, "Vue de couverture : $1 couvertes / $2 partielles / $3 clauses EU AI Act manquantes."],
          [/Human review queue: (.+?) approval case\(s\), (.+?) blocking case\(s\)\./g, "File de revue humaine : $1 cas avec approbation, $2 cas bloquants."],
          [/Report ID (.+?) with generated timestamp (.+?)\./g, "Identifiant de rapport $1 avec horodatage de generation $2."],
          [/Environment identity: agent (.+?) \/ (.+?), model (.+?) \/ (.+?)\./g, "Identite d'environnement : agent $1 / $2, modele $3 / $4."],
          [/Package scope: cases (.+?), baseline (.+?), new (.+?)\./g, "Perimetre du package : cas $1, baseline $2, nouveau $3."],
          [/Transfer class (.+?) and redaction status (.+?)\./g, "Classe de transfert $1 et statut de redaction $2."],
          [/Report <code>(.+?)<\/code> · generated (.+?)<\/div>/g, "Rapport <code>$1</code> · genere $2</div>"],
        ];

  for (const [pattern, replacement] of patterns) {
    next = next.replace(pattern, replacement);
  }
  return setHtmlLang(next, locale);
}

function translateDossierText(text: string, locale: Locale): string {
  if (locale === "en") return text;
  const pairs =
    locale === "de"
      ? ([
          ["EU AI Act Annex IV dossier", "EU AI Act Annex-IV-Dossier"],
          ["Bundle artifacts", "Bundle-Artefakte"],
          ["System identity", "Systemidentitaet"],
          ["Operational constraints and intended-use assumptions", "Betriebsgrenzen und Intended-Use-Annahmen"],
          ["Clause coverage", "Klauselabdeckung"],
          ["Risk controls and residual risk", "Risikokontrollen und Restrisiko"],
          ["Article 13 instructions for use scaffold", "Artikel-13-Scaffold fuer Gebrauchsanweisungen"],
          ["Article 9 risk register scaffold", "Artikel-9-Risikoregister-Scaffold"],
          ["Article 72 monitoring plan scaffold", "Artikel-72-Monitoringplan-Scaffold"],
          ["Article 17 QMS-lite scaffold", "Artikel-17-QMS-lite-Scaffold"],
          ["Article 73 serious-incident pack", "Artikel-73-Paket fuer schwerwiegende Vorfaelle"],
          ["Human oversight", "Menschliche Aufsicht"],
          ["Logging and traceability", "Logging und Rueckverfolgbarkeit"],
          ["Accuracy, robustness, and cybersecurity", "Genauigkeit, Robustheit und Cybersicherheit"],
          ["Release review", "Release-Review"],
          ["Post-market monitoring", "Post-Market-Monitoring"],
          ["Uncovered areas", "Nicht abgedeckte Bereiche"],
          ["Evidence index summary", "Zusammenfassung des Evidence-Index"],
          ["toolkit version", "Toolkit-Version"],
          ["transfer class", "Transferklasse"],
          ["redaction status", "Schwaerzungsstatus"],
          ["Declared intended use is not stored in the evaluator output and must be added by the operator.", "Der deklarierte Intended Use ist nicht im Evaluator-Output gespeichert und muss vom Operator ergaenzt werden."],
          ["This export is a technical scaffold. Operator-authored deployer instructions are still required.", "Dieser Export ist ein technisches Scaffold. Vom Operator verfasste Deploye-Anweisungen sind weiterhin erforderlich."],
          ["This export is a technical monitoring-plan scaffold. Owners still need to complete cadence, retention, and authority/customer escalation workflow details.", "Dieser Export ist ein technisches Monitoringplan-Scaffold. Owners muessen weiterhin Taktung, Aufbewahrung und Behoerden-/Kunden-Eskalationsdetails vervollstaendigen."],
          ["This export is a technical quality-management scaffold. Operator-owned procedures, approvals, training, and communications still need to be authored outside the evaluator.", "Dieser Export ist ein technisches Qualitaetsmanagement-Scaffold. Operator-eigene Verfahren, Freigaben, Schulungen und Kommunikation muessen weiterhin ausserhalb des Evaluators verfasst werden."],
          ["This export is a technical incident-triage scaffold. Human review is still required to determine whether Article 73 reporting applies.", "Dieser Export ist ein technisches Incident-Triage-Scaffold. Es bleibt menschliche Pruefung erforderlich, um festzustellen, ob Artikel-73-Meldung greift."],
          ["No review queue items.", "Keine Eintraege in der Review-Warteschlange."],
          ["No historical monitoring rows available.", "Keine historischen Monitoring-Zeilen verfuegbar."],
          ["No monitored case watchlist items in this bundle.", "Keine Watchlist-Eintraege fuer ueberwachte Faelle in diesem Bundle."],
          ["No machine-derived risk register entries.", "Keine maschinell abgeleiteten Risikoregister-Eintraege."],
          ["No matching historical runs are available for this monitoring scope.", "Fuer diesen Monitoring-Scope sind keine passenden historischen Laeufe verfuegbar."],
          ["Required operator inputs:", "Erforderliche Operator-Eingaben:"],
          ["Known limitations:", "Bekannte Grenzen:"],
          ["Escalation rules:", "Eskalationsregeln:"],
          ["Management review triggers:", "Trigger fuer Management-Review:"],
          ["Current assessment rationale:", "Begruendung der aktuellen Bewertung:"],
          ["Current release decision and escalation rationale.", "Aktuelle Release-Entscheidung und Eskalationsbegruendung."],
          ["This export is a technical scaffold. Operator-authored deployer instructions are still required.", "Dieser Export ist ein technisches Scaffold. Vom Operator verfasste Deploye-Anweisungen sind weiterhin erforderlich."],
        ] satisfies Array<[string, string]>)
      : ([
          ["EU AI Act Annex IV dossier", "Dossier EU AI Act Annexe IV"],
          ["Bundle artifacts", "Artefacts du bundle"],
          ["System identity", "Identite du systeme"],
          ["Operational constraints and intended-use assumptions", "Contraintes operationnelles et hypotheses d'usage prevu"],
          ["Clause coverage", "Couverture des clauses"],
          ["Risk controls and residual risk", "Controles de risque et risque residuel"],
          ["Article 13 instructions for use scaffold", "Scaffold Article 13 pour les instructions d'utilisation"],
          ["Article 9 risk register scaffold", "Scaffold du registre des risques Article 9"],
          ["Article 72 monitoring plan scaffold", "Scaffold du plan de monitoring Article 72"],
          ["Article 17 QMS-lite scaffold", "Scaffold QMS-lite Article 17"],
          ["Article 73 serious-incident pack", "Pack incident grave Article 73"],
          ["Human oversight", "Supervision humaine"],
          ["Logging and traceability", "Journalisation et tracabilite"],
          ["Accuracy, robustness, and cybersecurity", "Exactitude, robustesse et cybersécurite"],
          ["Release review", "Revue de release"],
          ["Post-market monitoring", "Surveillance post-commercialisation"],
          ["Uncovered areas", "Zones non couvertes"],
          ["Evidence index summary", "Resume de l'index de preuves"],
          ["toolkit version", "version toolkit"],
          ["transfer class", "classe de transfert"],
          ["redaction status", "statut de redaction"],
          ["Declared intended use is not stored in the evaluator output and must be added by the operator.", "L'usage prevu declare n'est pas stocke dans la sortie de l'evaluateur et doit etre ajoute par l'operateur."],
          ["This export is a technical scaffold. Operator-authored deployer instructions are still required.", "Cet export est un scaffold technique. Des instructions de deployeur redigees par l'operateur restent necessaires."],
          ["This export is a technical monitoring-plan scaffold. Owners still need to complete cadence, retention, and authority/customer escalation workflow details.", "Cet export est un scaffold technique de plan de surveillance. Les responsables doivent encore completer la cadence, la retention et les details d'escalade vers les autorites/clients."],
          ["This export is a technical quality-management scaffold. Operator-owned procedures, approvals, training, and communications still need to be authored outside the evaluator.", "Cet export est un scaffold technique de gestion de la qualite. Les procedures, validations, formations et communications detenues par l'operateur doivent encore etre redigees hors de l'evaluateur."],
          ["This export is a technical incident-triage scaffold. Human review is still required to determine whether Article 73 reporting applies.", "Cet export est un scaffold technique de triage d'incident. Une revue humaine reste necessaire pour determiner si le signalement Article 73 s'applique."],
          ["No review queue items.", "Aucun element dans la file de revue."],
          ["No historical monitoring rows available.", "Aucune ligne de monitoring historique disponible."],
          ["No monitored case watchlist items in this bundle.", "Aucun element de watchlist de cas surveille dans ce bundle."],
          ["No machine-derived risk register entries.", "Aucune entree de registre des risques derivee par la machine."],
          ["No matching historical runs are available for this monitoring scope.", "Aucun run historique correspondant n'est disponible pour ce perimetre de surveillance."],
          ["Required operator inputs:", "Entrees operateur requises :"],
          ["Known limitations:", "Limites connues :"],
          ["Escalation rules:", "Regles d'escalade :"],
          ["Management review triggers:", "Declencheurs de revue de gestion :"],
          ["Current assessment rationale:", "Justification de l'evaluation actuelle :"],
          ["Current release decision and escalation rationale.", "Decision de release actuelle et justification d'escalade."],
        ] satisfies Array<[string, string]>);

  return setHtmlLang(replacePairs(text, pairs), locale);
}

function localizeAgentReports(agentReportDir: string, euReportDir: string, publishRoot: string) {
  const agentReport = readJson<CompareReport>(path.join(agentReportDir, "compare-report.json"));
  const euReport = readJson<CompareReport>(path.join(euReportDir, "compare-report.json"));

  for (const locale of LOCALES) {
    const agentOut = path.join(publishRoot, locale, "agent-evidence", "report.html");
    const euOut = path.join(publishRoot, locale, "eu-ai-act", "report.html");
    ensureParent(agentOut);
    ensureParent(euOut);
    writeFileSync(agentOut, renderHtmlReport(agentReport, { locale }), "utf8");
    writeFileSync(euOut, renderHtmlReport(euReport, { locale }), "utf8");
  }
}

function localizeEuHumanDocs(euReportDir: string, publishRoot: string) {
  const reviewerHtmlSrc = readFileSync(path.join(euReportDir, "compliance", "eu-ai-act-reviewer.html"), "utf8");
  const reviewerMdSrc = readFileSync(path.join(euReportDir, "compliance", "eu-ai-act-reviewer.md"), "utf8");
  const dossierHtmlSrc = readFileSync(path.join(euReportDir, "compliance", "eu-ai-act-report.html"), "utf8");

  for (const locale of LOCALES) {
    const reviewerHtmlOut = path.join(publishRoot, locale, "eu-ai-act", "compliance", "eu-ai-act-reviewer.html");
    const reviewerMdOut = path.join(publishRoot, locale, "eu-ai-act", "compliance", "eu-ai-act-reviewer.md");
    const reviewerPdfOut = path.join(publishRoot, locale, "eu-ai-act", "compliance", "eu-ai-act-reviewer.pdf");
    const dossierHtmlOut = path.join(publishRoot, locale, "eu-ai-act", "compliance", "eu-ai-act-report.html");

    ensureParent(reviewerHtmlOut);
    ensureParent(reviewerMdOut);
    ensureParent(reviewerPdfOut);
    ensureParent(dossierHtmlOut);

    const reviewerHtml = translateReviewerText(reviewerHtmlSrc, locale);
    const reviewerMd = translateReviewerText(reviewerMdSrc, locale);
    const dossierHtml = translateDossierText(dossierHtmlSrc, locale);

    writeFileSync(reviewerHtmlOut, reviewerHtml, "utf8");
    writeFileSync(reviewerMdOut, reviewerMd, "utf8");
    writeFileSync(dossierHtmlOut, dossierHtml, "utf8");
    renderEuReviewerPdfFromPaths(reviewerMdOut, reviewerPdfOut);
  }
}

function main() {
  const args = parseArgs(process.argv);
  localizeAgentReports(args.agentReportDir, args.euReportDir, args.publishRoot);
  localizeEuHumanDocs(args.euReportDir, args.publishRoot);
}

main();
