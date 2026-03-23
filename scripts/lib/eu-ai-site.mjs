import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const SITE_OUTPUT_ROOT = path.join(REPO_ROOT, "docs");
const GITHUB_REPO = "https://github.com/Tanyayvr/agent-qa-toolkit";

export const DEFAULT_ORIGIN = process.env.EU_AI_SITE_ORIGIN || "https://tanyayvr.github.io/agent-qa-toolkit";
const PLAUSIBLE_DOMAIN = process.env.EU_AI_SITE_PLAUSIBLE_DOMAIN || "";
const SITE_LOCALES = ["en", "de", "fr"];
const TEMPLATE_PAGE_KEYS = ["article-9", "article-12", "article-13", "article-14", "article-15", "article-17", "article-72", "article-73", "technical-doc"];
const TEMPLATE_DOWNLOAD_KEYS = TEMPLATE_PAGE_KEYS;

const LOCALES = {
  en: {
    code: "en",
    name: "English",
    htmlLang: "en",
    nav: {
      how: "How it works",
      technical: "Technology",
      templates: "Templates",
      pricing: "Pricing",
      docs: "Docs",
      start: "Start Free",
    },
    footer: {
      privacy: "Privacy",
      terms: "Terms",
      disclaimer: "Disclaimer",
      cookies: "Cookies",
      contact: "Contact",
    },
    common: {
      brandSubtitle: "Documentation builder for Agent QA Toolkit",
      trustLine: "Self-hosted · No data leaves your environment · Open source core",
      pilotCta: "Apply for Pilot",
      liveDemos: "Live demos",
      proofLabel: "Website proof",
      docsLabel: "Open source docs",
      languageLabel: "Language",
      skipLink: "Skip to content",
      legalLabel: "Legal",
      cookieBannerBody:
        "This site uses only essential storage by default. Analytics can be enabled later with EU-hosted Plausible.",
      cookieEssential: "Essential only",
      cookieAnalytics: "Allow analytics",
      yes: "Yes",
      no: "No",
      startFree: "Start Free",
      viewPricing: "See full pricing",
      viewProof: "Open live evidence",
      bookCall: "Review pilot requirements",
    },
    landing: {
      title: "EU AI Act Compliance Documentation Builder | Evidence Pack Generator",
      description:
        "For high-risk or externally reviewed AI systems, build a self-hosted technical evidence dossier for EU AI Act preparation, review handoff, and authority-facing workflows.",
      keywords:
        "EU AI Act compliance, EU AI Act documentation, high risk AI Europe, EU AI Act August 2026, conformity assessment preparation, AI evidence pack",
      heroTitle:
        "When EU AI Act review gets real, screenshots and dashboards stop being enough.",
      heroText:
        "Use the site to structure the dossier. Use Agent QA Toolkit to add the self-hosted Evidence Pack, review record, archive controls, and authority-ready handoff that make the package credible.",
      primaryCta: "Start building your package",
      secondaryCta: "See live proof",
      audienceTitle: "Choose your entry path",
      audienceLead:
        "Start with the job you are actually trying to complete: consultant delivery, governance review, or technical evaluation.",
      audienceCards: [
        {
          title: "For consultants",
          text:
            "You already own legal interpretation or client delivery. Use the toolkit as the technical evidence layer behind your dossier work.",
          result: "First click: workflow fit, dossier outputs, and the handoff story.",
          cta: "Open consultant path",
          href: "how-it-works",
        },
        {
          title: "For governance teams",
          text:
            "You need a review-ready technical package for internal approval, monitoring, and EU AI Act preparation.",
          result: "First click: builder plus live EU dossier demo.",
          cta: "Open governance path",
          href: "builder",
        },
        {
          title: "For technical teams",
          text:
            "You need to decide whether the core evidence engine is concrete enough to install, review internally, and extend with sector-specific cases or scanners.",
          result: "First click: what to inspect, where the boundary is, and how sector layers fit above the core.",
          cta: "Open technical team path",
          href: "about",
        },
      ],
      solutionTitle: "How EU AI Act Evidence Builder works",
      steps: [
        "Screen whether the system needs only basic journaling or a scrutiny-grade technical package.",
        "Use the builder and templates to structure the dossier sections that need narrative and evidence references.",
        "Run the technical workflow in your own environment and attach a portable Evidence Pack where the package needs proof.",
      ],
      strongestFitTitle: "Strongest fit",
      strongestFitBody:
        "Best when evidence must survive external or cross-team review: consultant delivery, high-risk pre-evaluation, regulated procurement, incident handoff, or authority-facing requests. Legal classification and final sign-off stay outside the product.",
      deliverablesTitle: "What you actually get",
      deliverablesLead:
        "The product should be legible in outputs, not only in process language.",
      deliverablesCards: [
        {
          title: "Portable Evidence Pack",
          text: "Offline report, compare-report JSON, manifest, and retention controls that survive handoff outside engineering tooling.",
        },
        {
          title: "Dossier-facing exports",
          text: "Annex IV structure plus Article 9, 13, 17, 72, and 73 scaffolds linked to runtime evidence.",
        },
        {
          title: "Structured review record",
          text: "Named decision, handoff note, completion checks, and recurring corrective-action continuity.",
        },
        {
          title: "Authority-ready package",
          text: "When needed, a scoped authority-response bundle with disclosure and archive decisions.",
        },
      ],
      fitMatrixTitle: "Where this becomes worth the effort",
      fitMatrixLead:
        "Not every AI team needs a scrutiny-grade evidence layer. The value appears when basic logs stop being enough.",
      fitMatrixHeaders: ["Situation", "Why basic logs are weak", "What this adds"],
      fitMatrixRows: [
        ["Cross-team internal review", "Evidence lives in dashboards or tribal knowledge.", "Portable pack, review record, and deterministic gate."],
        ["Consultant or vendor handoff", "Client delivery turns into screenshots and static narrative.", "Dossier-facing exports linked to verified runtime evidence."],
        ["Incident, counsel, or authority request", "Raw traces are too sensitive or too hard to share directly.", "Scoped authority package, archive controls, and disclosure record."],
      ],
      proofTitle: "See the proof before you read more",
      proofBody:
        "Open the builder, inspect the live dossier, or jump into the technical operating model. The site should route you to a real artifact, not a generic checklist.",
    },
    how: {
      title: "How EU AI Act Evidence Builder works",
      description:
        "See the pipeline from AI system profile to machine-verifiable evidence pack and Annex IV-ready documentation references.",
      headline: "From AI system profile to evidence-backed documentation",
      intro:
        "This page is the workflow view for consultants and governance owners. It shows how the dossier path turns into a review-ready technical package.",
      summaryTitle: "Operational block at a glance",
      summaryLead: "Read this first if you want the shortest honest view of what goes in, what the product automates, what stays human-owned, and what comes out.",
      summaryColumns: [
        {
          title: "Input",
          points: [
            "System scope, intended use, owners, and deployment context",
            "Narrative dossier sections that need evidence references",
            "Quality expectations that determine evidence depth",
          ],
        },
        {
          title: "Automated",
          points: [
            "Intake structuring and validation",
            "Evidence bundle generation and dossier-facing exports",
            "Review scaffolding and authority-response packaging",
          ],
        },
        {
          title: "Human-owned",
          points: [
            "Business harms and residual-risk judgment",
            "Approval vs block policy judgment",
            "Legal classification, final narrative, and sign-off",
          ],
        },
        {
          title: "Output",
          points: [
            "Portable Evidence Pack",
            "Structured review-ready package",
            "Authority-ready handoff when needed",
          ],
        },
      ],
      inputsTitle: "What goes in",
      inputsLead: "This workflow starts with operator-owned inputs, not with generated artifacts.",
      inputCards: [
        ["System scope", "System boundary, intended use, owners, and deployment context."],
        ["Narrative sections", "The dossier sections that need assumptions, constraints, and evidence references."],
        ["Quality expectations", "The release or governance expectations that determine what evidence depth is required."],
      ],
      workflowTitle: "What the automation does",
      workflowLead: "Once the scope is frozen, the workflow should automate evidence generation and package assembly as far as possible.",
      workflowSteps: [
        "Freeze system scope, owners, and intended use before the package starts expanding.",
        "Use the builder and templates to draft narrative sections and identify where technical references are required.",
        "Run Agent QA Toolkit to generate the portable evidence bundle, dossier-facing exports, and structured review artifacts.",
        "Hand one package to governance, consultants, counsel, or authority-facing review without relying on dashboards.",
      ],
      outputsTitle: "What the workflow produces",
      outputsLead: "This should end in concrete outputs, not only in process language.",
      outputCards: [
        ["Dossier structure", "A drafted package with the sections that need narrative, assumptions, and evidence references."],
        ["Technical evidence bundle", "Portable report, compare-report JSON, manifest, retention controls, and dossier-facing exports."],
        ["Review-ready handoff", "Structured review record and, when needed, scoped authority-response packaging."],
      ],
      boundaryTitle: "Where the workflow still stops",
      boundaryLead: "The workflow prepares the technical package. It does not remove governance and legal ownership.",
      boundaryPoints: [
        "Legal classification and final sign-off stay outside the product.",
        "Business harms and residual-risk judgment still belong to the operator.",
        "Deployer-facing narrative and release trade-offs still need named human owners.",
      ],
      screenshotTitle: "What the output looks like",
      screenshotBody: "The result should be a review-ready package another person can inspect without opening your internal systems.",
      proofTitle: "Next useful clicks",
      proofBody: "From here, the real choices are: start the builder, inspect the live dossier, or open the technical operating model.",
    },
    pricing: {
      title: "EU AI Act pricing: OSS, Launch Pack, Team, Studio, and enterprise support",
      description:
        "Free OSS self-serve, a one-time Launch Pack, Team and Studio subscriptions, and custom enterprise support for EU AI Act technical evidence.",
      headline: "Start free. Pay once to reach first value, then subscribe when the workflow becomes part of operations.",
      lead:
        "The OSS core is free. The one-time Launch Pack gets one agent to a real first evidence outcome. Team and Studio are ongoing product tiers for teams already running the workflow in-house.",
      subscriptionsLabel: "Commercial paths",
      entryTitle: "Start with OSS",
      entryLead:
        "Use the free path when you want to inspect the product, run quickstart on your own agent, and decide whether the workflow deserves a place in your stack.",
      launchEyebrow: "One-time onboarding",
      launchTitle: "Need help reaching first value on your own agent?",
      launchLead:
        "Launch Pack is the one-time bridge between trying the repo and getting a real first pack on your own infrastructure.",
      tiersEyebrow: "Subscriptions",
      tiersTitle: "Ongoing product tiers",
      tiersLead:
        "Team, Studio, and Enterprise start only after the workflow is already part of real operations.",
      fitTitle: "Choose the commercial path that matches your stage",
      fitLead:
        "Do not buy support just to browse. Use the one-time pack to reach first value, then move to a subscription only when the workflow is part of day-to-day operations.",
      fitCards: [
        ["Stay self-serve", "Use the repo, quickstart, docs, and demos when you are still evaluating fit or can operate the workflow yourself."],
        ["Use Launch Pack", "Buy this when one agent needs a real first pack and your team does not want to spend weeks finding the path alone."],
        ["Use Team or Studio", "Subscribe only after the workflow is already useful and the team wants to run it continuously across 3 or 10 agents."],
        ["Use Enterprise", "Bring us in when review is external, multi-system, conformity-driven, or when support has to survive procurement and scrutiny."],
      ],
      faq: [
        {
          q: "Do I need to share my AI model or data?",
          a: "No. The core evidence workflow is self-hosted. Your runs stay in your environment.",
        },
        {
          q: "What should I start with?",
          a: "Start with OSS if you are still evaluating fit or can run the workflow yourself. Use Launch Pack when one agent needs to reach a real first evidence outcome quickly. Use Team or Studio after the workflow is already useful in-house. Use Enterprise when the package has to survive multi-team or external review.",
        },
        {
          q: "What exactly does Launch Pack buy?",
          a: "Launch Pack is a one-time onboarding offer for one agent. It gets your team to a real first evidence pack on your own infrastructure and a clear next-step handoff. It does not replace full case design, governance review, or legal sign-off.",
        },
        {
          q: "Why is Launch Pack one-time while Team and Studio are monthly?",
          a: "Launch Pack is for activation to first value. Team and Studio are for teams that already completed onboarding and now want continuous product use, updates, exports, and recurring support for 3 or 10 agents.",
        },
        {
          q: "Do Team and Studio include unlimited custom work?",
          a: "No. Team and Studio are product tiers with support, not unlimited consulting. Multi-system implementation, external-review support, or custom dossier work moves into Enterprise scope.",
        },
        {
          q: "Does this replace legal counsel?",
          a: "No. The site and toolkit generate technical evidence and documentation structure. Legal teams still own legal interpretation.",
        },
      ],
    },
    builder: {
      title: "EU AI Act documentation builder",
      description:
        "Step-by-step builder for AI system profile, risk classification, Articles 9, 12, 14, and print-ready documentation export.",
      headline: "Build your EU AI Act documentation package",
      intro:
        "This wizard helps you structure the package. Where technical proof is required, it points you to the live evidence workflow.",
    },
    templates: {
      title: "EU AI Act documentation templates",
      description:
        "Free EU AI Act templates for Articles 9, 12, 13, 14, 15, 17, 72, 73, and Annex IV technical documentation.",
      headline: "Documentation templates for high-intent EU AI Act work",
      intro:
        "Use this index to scan technical coverage and open the exact page for artifact mapping, boundaries, and template detail.",
      note:
        "Only articles where the toolkit has a real technical contribution are listed here. Section headings show the type of technical contribution, not full legal closure of the article.",
      strongGroup: "Direct technical outputs",
      partialGroup: "Evidence-backed scaffolds",
      coverageLabel: "Technical contribution",
    },
    docs: {
      title: "Source docs and proof hub",
      description:
        "Quickstart, operator runbooks, proof surfaces, and source-of-truth documentation behind the EU AI Evidence Builder.",
      headline: "Source docs and proof hub",
    },
    about: {
      title: "For technical teams evaluating fit | EU AI Evidence Builder",
      description:
        "User-facing page for platform, security, and compliance engineering teams evaluating whether the core product is real enough to install and whether sector-specific work can sit above it cleanly.",
      headline: "For technical teams evaluating fit",
      intro:
        "Use this page when the question is not pricing or regulation, but whether the core evidence engine is technically serious enough to deserve installation time.",
      inspectTitle: "What to check first",
      inspectLead:
        "A technical reviewer should be able to inspect concrete outputs, explicit gates, the split between core and sector-specific work, and an honest automation boundary before doing any deeper integration work.",
      inspectCards: [
        ["Real outputs", "The product ends in a portable report, machine contract, manifest, retention controls, review record, and optional authority package."],
        ["Hard gates", "Packaging, verify, review, and authority packaging all have explicit checks. This is not a dashboard-only story."],
        ["Sector-ready core", "The core qualifies tool-using agents. Sector case libraries, scanners, and vertical exports can sit above it without turning the base product into a generic compliance suite."],
        ["Source-visible path", "Commands, schemas, and artifacts are visible in the repository and line up with the live proof surface."],
        ["Honest boundary", "The system automates evidence operations, not legal classification, business judgment, or final sign-off."],
      ],
      quickstartTitle: "Fastest honest first run",
      quickstartLead:
        "If your adapter is already running, use quickstart to build a real starter evidence pack on your own infrastructure before doing any deeper setup work.",
      quickstartCommand: "npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud",
      quickstartPoints: [
        "Runs the starter smoke path on your own adapter and packages a portable report.",
        "Shows whether the toolkit can really execute, package, and verify evidence in your environment.",
        "Stays honest: starter evidence pack only, not full qualification or compliance readiness.",
      ],
      quickstartButton: "Open quickstart guide",
    },
    contact: {
      title: "Contact the team",
      description:
        "Apply for a pilot, review the proof surface, or open the open-source repository for the EU AI Evidence Builder.",
      headline: "Choose the fastest path to a serious pilot",
    },
    holding: {
      title: "Extended material holding page",
      description:
        "Sections trimmed from the main landing page and kept for later audit instead of being silently deleted.",
      headline: "Extended material held out of the main funnel",
      intro:
        "This page collects sections removed from the homepage so they can be reviewed later and either deleted, rewritten, or moved into a better surface.",
    },
    legalTitles: {
      privacy: "Privacy policy",
      terms: "Terms of use",
      disclaimer: "Compliance disclaimer",
      cookies: "Cookie settings",
    },
    blog: {
      title: "EU AI Act evidence blog",
      description:
        "Guides for the August 2026 deadline, Annex III high-risk categories, and what evidence packs should contain.",
      headline: "Documentation and evidence guides for AI teams",
    },
  },
  de: {
    code: "de",
    name: "Deutsch",
    htmlLang: "de",
    nav: {
      how: "So funktioniert es",
      technical: "Technologie",
      templates: "Vorlagen",
      pricing: "Preise",
      docs: "Dokumentation",
      start: "Kostenlos starten",
    },
    footer: {
      privacy: "Datenschutz",
      terms: "Nutzungsbedingungen",
      disclaimer: "Hinweis",
      cookies: "Cookies",
      contact: "Kontakt",
    },
    common: {
      brandSubtitle: "Dokumentations-Assistent fuer Agent QA Toolkit",
      trustLine: "Bei Ihnen gehostet · Ihre Daten bleiben in Ihrer Umgebung · Open-Source-Kern",
      pilotCta: "Pilot beantragen",
      liveDemos: "Live-Demos",
      proofLabel: "Nachweis-Hub",
      docsLabel: "Open-Source-Dokumentation",
      languageLabel: "Sprache",
      skipLink: "Zum Inhalt",
      legalLabel: "Rechtliches",
      cookieBannerBody:
        "Diese Website nutzt standardmaessig nur essenziellen Speicher. Analytics kann spaeter mit EU-gehostetem Plausible aktiviert werden.",
      cookieEssential: "Nur essenziell",
      cookieAnalytics: "Analytics erlauben",
      yes: "Ja",
      no: "Nein",
      startFree: "Kostenlos starten",
      viewPricing: "Preise ansehen",
      viewProof: "Live-Nachweise öffnen",
      bookCall: "Pilot prüfen",
    },
    landing: {
      title: "EU KI-Verordnung Dokumentation erstellen | Kostenlose Vorlagen",
      description:
        "Fuer Hochrisiko- oder extern gepruefte KI-Systeme: bei Ihnen gehostete technische Nachweise fuer EU-AI-Act-Vorbereitung, Pruefuebergabe und behoerdenfaehige Pakete.",
      keywords:
        "KI-Verordnung Compliance, EU KI-Verordnung Dokumentation, KI-Verordnung August 2026, KI Konformitätsbewertung Vorlage, Hochrisiko KI System Nachweis",
      heroTitle:
        "Sobald die Pruefung nach der EU-KI-Verordnung ernst wird, reichen Screenshots und Dashboards nicht mehr.",
      heroText:
        "Der Dokumentations-Assistent strukturiert das Dossier. Agent QA Toolkit liefert das bei Ihnen gehostete Nachweispaket, das Pruefprotokoll, Archivkontrollen und die behoerdentaugliche Uebergabe.",
      primaryCta: "Dokumentation starten",
      secondaryCta: "Live-Nachweise ansehen",
      audienceTitle: "Wählen Sie Ihren Einstieg",
      audienceLead:
        "Starten Sie mit der eigentlichen Aufgabe: Beratung, Governance-Pruefung oder technische Bewertung.",
      audienceCards: [
        {
          title: "Für Berater",
          text:
            "Sie verantworten rechtliche Einordnung oder Kundendokumentation. Nutzen Sie den Toolkit-Stack als technische Nachweis-Schicht.",
          result: "Erster Klick: Workflow-Passung, Dossier-Ergebnisse und Logik der Uebergabe.",
          cta: "Beratungs-Workflow",
          href: "how-it-works",
        },
        {
          title: "Für Governance-Teams",
          text:
            "Sie brauchen ein technisch belastbares Paket fuer interne Freigaben und EU-AI-Act-Vorbereitung.",
          result: "Erster Klick: Dokumentations-Assistent plus Live-Demo des Dossiers.",
          cta: "Governance-Pfad",
          href: "builder",
        },
        {
          title: "Für technische Teams",
          text:
            "Sie muessen entscheiden, ob die Kern-Engine technisch ernst genug fuer Installation, interne Pruefung und sektorielle Cases oder Scanner ist.",
          result: "Erster Klick: was man pruefen kann, wo die Grenze liegt und wie sektorielle Schichten ueber dem Kern liegen.",
          cta: "Pfad fuer technische Teams",
          href: "about",
        },
      ],
      solutionTitle: "So funktioniert der Dokumentations-Assistent",
      steps: [
        "Pruefen, ob nur Basis-Journalisierung oder ein technisch belastbares Paket noetig ist.",
        "Mit Dokumentations-Assistent und Vorlagen die Dossier-Abschnitte mit Narrativ und Nachweis-Referenzen strukturieren.",
        "Den technischen Workflow in der eigenen Umgebung ausfuehren und das portable Nachweispaket dort anhaengen, wo das Paket Belege braucht.",
      ],
      strongestFitTitle: "Stärkster Fit",
      strongestFitBody:
        "Am staerksten, wenn Nachweise extern oder teamuebergreifend standhalten muessen: Beratung, Hochrisiko-Vorpruefung, regulierte Beschaffung, Vorfall-Uebergabe oder behoerdennahe Anfragen. Rechtliche Klassifizierung und finale Freigabe bleiben ausserhalb des Produkts.",
      deliverablesTitle: "Was man konkret bekommt",
      deliverablesLead:
        "Das Produkt sollte ueber konkrete Ergebnisse verstaendlich werden, nicht nur ueber Prozesssprache.",
      deliverablesCards: [
        {
          title: "Portables Nachweispaket",
          text: "Offline-Report, Compare-Report-JSON, Manifest und Archivkontrollen, die ausserhalb der Engineering-Tools uebergeben werden koennen.",
        },
        {
          title: "Dossier-nahe Exporte",
          text: "Anhang-IV-Struktur plus Gerueste fuer Artikel 9, 13, 17, 72 und 73 mit Bezug zu Ausfuehrungsnachweisen.",
        },
        {
          title: "Strukturiertes Pruefprotokoll",
          text: "Benannte Entscheidung, Uebergabe-Notiz, Abschlusspruefungen und wiederkehrende Kontinuitaet bei Korrekturmassnahmen.",
        },
        {
          title: "Behoerdentaugliches Paket",
          text: "Wenn noetig: ein abgegrenztes Behoerdenpaket mit Offenlegungs- und Archiventscheidungen.",
        },
      ],
      fitMatrixTitle: "Wann sich dieser Aufwand lohnt",
      fitMatrixLead:
        "Nicht jedes KI-Team braucht eine belastbare Nachweis-Schicht. Der Mehrwert beginnt dort, wo einfache Logs nicht mehr reichen.",
      fitMatrixHeaders: ["Situation", "Warum einfache Logs schwach sind", "Was der Stack ergaenzt"],
      fitMatrixRows: [
        ["Teamuebergreifende interne Pruefungen", "Nachweise leben in Dashboards oder im Kopf einzelner Personen.", "Portables Paket, Pruefprotokoll und deterministischer Verifikationsschritt."],
        ["Uebergabe an Beratung oder Anbieter", "Kundendokumentation endet in Screenshots und statischem Narrativ.", "Dossier-Ergebnisse mit verifizierten Ausfuehrungsnachweisen."],
        ["Vorfall, Rechtsberatung oder Behoerdenanfrage", "Rohe Traces sind zu sensibel oder zu schwer direkt zu teilen.", "Abgegrenztes Behoerdenpaket, Archivkontrollen und Offenlegungsprotokoll."],
      ],
      proofTitle: "Nachweise sehen, bevor Sie mehr lesen",
      proofBody:
        "Dokumentations-Assistent, Live-Dossier und technisches Betriebsmodell fuehren direkt zu echten Artefakten statt zu generischen Checklisten.",
    },
    how: {
      title: "So funktioniert der EU AI Evidence Builder",
      description:
        "Vom Systemprofil zur technischen Dokumentation mit maschinenlesbaren Nachweisen.",
      headline: "Von Systemprofilen zu belastbaren Nachweisen",
      intro:
        "Diese Seite ist die Workflow-Sicht fuer Beratung und Governance. Sie zeigt, wie aus dem Dossier-Pfad ein technisch pruefbares Paket wird.",
      summaryTitle: "Betriebsmodell auf einen Blick",
      summaryLead: "Zuerst hier lesen, wenn Sie die kuerzeste ehrliche Sicht auf Eingaben, Automatisierung, menschlich gefuehrten Teil und Ergebnis wollen.",
      summaryColumns: [
        {
          title: "Eingaben",
          points: [
            "Systemrahmen, Verwendungszweck, verantwortliche Personen und Einsatzkontext",
            "Systemrahmen, Verwendungszweck, verantwortliche Personen und Einsatzkontext",
            "Narrative Dossier-Abschnitte mit Nachweis-Referenzen",
            "Qualitaetserwartungen, die die Evidenztiefe bestimmen",
          ],
        },
        {
          title: "Automatisiert",
          points: [
            "Intake-Strukturierung und Validierung",
            "Erzeugung des Nachweispakets und dossierrahe Exporte",
            "Vorbereitung der Pruefung und Paketierung fuer Behoerdenantworten",
          ],
        },
        {
          title: "Menschlich gefuehrt",
          points: [
            "Geschaeftsschaeden und Urteile zum Rest-Risiko",
            "Approval-vs-Block-Urteile",
            "Rechtliche Klassifizierung, finales Narrativ und Freigabe",
          ],
        },
        {
          title: "Ergebnis",
          points: [
            "Portables Nachweispaket",
            "Strukturiertes prueffertiges Paket",
            "Behoerdentaugliche Uebergabe bei Bedarf",
          ],
        },
      ],
      inputsTitle: "Was hineingeht",
      inputsLead: "Der Workflow startet mit vom Betreiber gelieferten Eingaben, nicht mit generierten Artefakten.",
      inputCards: [
        ["Systemrahmen", "Systemgrenze, Verwendungszweck, verantwortliche Personen und Einsatzkontext."],
        ["Narrative Abschnitte", "Dossier-Teile mit Annahmen, Grenzen und Nachweis-Referenzen."],
        ["Qualitaetserwartungen", "Release- oder Governance-Erwartungen, die die noetige Evidenztiefe bestimmen."],
      ],
      workflowTitle: "Was die Automatisierung erledigt",
      workflowLead: "Sobald der Systemrahmen feststeht, sollte der Workflow Nachweis-Erzeugung und Paketaufbau so weit wie moeglich automatisieren.",
      workflowSteps: [
        "Systemgrenze, verantwortliche Personen und Verwendungszweck festhalten, bevor das Paket ausufert.",
        "Dokumentations-Assistent und Vorlagen nutzen, um Narrative zu entwerfen und Stellen mit technischen Referenzen zu markieren.",
        "Agent QA Toolkit ausfuehren, um ein portables Nachweispaket, dossierrahe Exporte und strukturierte Pruefartefakte zu erzeugen.",
        "Ein Paket an Governance, Beratung, Rechtsberatung oder behoerdliche Pruefungen uebergeben, ohne sich auf Dashboards zu stuetzen.",
      ],
      outputsTitle: "Was der Workflow erzeugt",
      outputsLead: "Am Ende muessen konkrete Ergebnisse stehen, nicht nur Prozesssprache.",
      outputCards: [
        ["Dossier-Struktur", "Ein vorbereiteter Paketentwurf mit Narrativ, Annahmen und Nachweis-Referenzen."],
        ["Technisches Nachweispaket", "Portabler Report, Compare-Report-JSON, Manifest, Archivkontrollen und dossierrahe Exporte."],
        ["Prueffertige Uebergabe", "Strukturiertes Pruefprotokoll und bei Bedarf ein abgegrenztes Paket fuer Behoerdenantworten."],
      ],
      boundaryTitle: "Wo der Workflow weiterhin stoppt",
      boundaryLead: "Der Workflow bereitet das technische Paket vor. Governance- und Rechtsverantwortung verschwinden dadurch nicht.",
      boundaryPoints: [
        "Rechtliche Klassifizierung und finale Freigabe bleiben ausserhalb des Produkts.",
        "Urteile zu Geschaeftsschaeden und Rest-Risiko bleiben beim Operator.",
        "Einsatz-Narrativ und Abwaegungen zur Inbetriebnahme brauchen weiterhin benannte verantwortliche Personen.",
      ],
      screenshotTitle: "Wie das Ergebnis aussieht",
      screenshotBody: "Das Ergebnis sollte ein prueffertiges Paket sein, das eine andere Person ohne interne Systeme pruefen kann.",
      proofTitle: "Naechste sinnvolle Klicks",
      proofBody: "Von hier aus sind die echten Entscheidungen: Dokumentations-Assistent starten, Live-Dossier ansehen oder das technische Betriebsmodell oeffnen.",
    },
    pricing: {
      title: "Preise fuer EU AI Act Nachweise",
      description:
        "Kostenloser OSS-Selbstbetrieb, einmaliges Startpaket, Team- und Studio-Abos sowie massgeschneiderte Enterprise-Begleitung fuer EU-AI-Act-Nachweise.",
      headline: "Kostenlos starten. Einmal zahlen, um zum ersten echten Ergebnis zu kommen. Abonnieren, wenn der Workflow operativ wird.",
      lead:
        "Der OSS-Kern ist kostenlos. Das einmalige Startpaket bringt einen Agenten zum ersten echten Nachweis-Ergebnis. Team und Studio sind laufende Produktstufen fuer Teams, die den Workflow bereits intern nutzen.",
      subscriptionsLabel: "Kommerzielle Wege",
      entryTitle: "Mit OSS starten",
      entryLead:
        "Nutzen Sie den kostenlosen Weg, wenn Sie das Produkt pruefen, den Schnellstart auf Ihrem eigenen Agenten ausfuehren und erst dann entscheiden wollen, ob der Workflow in Ihren Stack gehoert.",
      launchEyebrow: "Einmaliges Onboarding",
      launchTitle: "Brauchen Sie Hilfe bis zum ersten echten Ergebnis auf Ihrem eigenen Agenten?",
      launchLead:
        "Das Startpaket ist die einmalige Bruecke zwischen Repo ausprobieren und dem ersten echten Paket auf Ihrer eigenen Infrastruktur.",
      tiersEyebrow: "Abos",
      tiersTitle: "Laufende Produktstufen",
      tiersLead:
        "Team, Studio und Enterprise beginnen erst dann, wenn der Workflow bereits Teil des echten Betriebs ist.",
      fitTitle: "Waehlen Sie den Weg passend zu Ihrem Reifegrad",
      fitLead:
        "Support sollte nicht gekauft werden, nur um sich umzusehen. Das einmalige Pack bringt Sie zum ersten Wert. Ein Abo lohnt sich erst, wenn der Workflow Teil des laufenden Betriebs wird.",
      fitCards: [
        ["Beim Selbstbetrieb bleiben", "Repo, Schnellstart, Dokumentation und Demos reichen aus, solange Sie den Workflow selbst pruefen oder betreiben koennen."],
        ["Startpaket nutzen", "Das ist der richtige Weg, wenn ein Agent schnell zu einem echten ersten Paket kommen soll, ohne dass Ihr Team den Pfad allein suchen muss."],
        ["Team oder Studio nutzen", "Ein Abo lohnt sich erst, wenn der Workflow fuer 3 oder 10 Agenten laufend intern genutzt wird."],
        ["Enterprise nutzen", "Hier passt es, wenn Pruefungen extern, systemuebergreifend, konformitaetsnah oder wiederkehrend unter hoher Kontrolle laufen muessen."],
      ],
      faq: [
        {
          q: "Müssen Modell oder Daten geteilt werden?",
          a: "Nein. Die technische Nachweiserzeugung bleibt bei Ihnen gehostet.",
        },
        {
          q: "Womit sollte ich anfangen?",
          a: "OSS passt fuer die erste Eignungspruefung oder fuer Teams, die den Workflow selbst betreiben koennen. Das Startpaket passt, wenn ein Agent schnell zu einem echten ersten Nachweis-Ergebnis kommen soll. Team oder Studio passen erst, wenn der Workflow intern bereits nuetzlich ist. Enterprise ist fuer teamuebergreifende oder externe Pruefungen gedacht.",
        },
        {
          q: "Was kaufe ich mit dem Startpaket genau?",
          a: "Das Startpaket ist ein einmaliges Onboarding-Angebot fuer einen Agenten. Es bringt Ihr Team zu einem echten ersten Nachweispaket auf Ihrer eigenen Infrastruktur und zu einem klaren naechsten Schritt. Vollstaendiges Case-Design, Governance-Pruefung und rechtliche Freigabe ersetzt es nicht.",
        },
        {
          q: "Warum ist das Startpaket einmalig, waehrend Team und Studio monatlich laufen?",
          a: "Das Startpaket ist fuer Aktivierung bis zum ersten Wert. Team und Studio sind fuer Teams gedacht, die Onboarding schon hinter sich haben und Produktnutzung, Updates, Exporte und wiederkehrenden Support fuer 3 oder 10 Agenten brauchen.",
        },
        {
          q: "Enthalten Team und Studio unbegrenzte Sonderleistungen?",
          a: "Nein. Team und Studio sind Produktstufen mit Support, aber keine unbegrenzte Beratung. Systemuebergreifende Implementierung, externe Pruefungen oder kundenspezifische Dossier-Arbeit laufen ueber Enterprise.",
        },
        {
          q: "Ersetzt das rechtliche Beratung?",
          a: "Nein. Es geht um technische Nachweise und Dokumentationsstruktur.",
        },
      ],
    },
    builder: {
      title: "Dokumentations-Assistent zur EU-KI-Verordnung",
      description:
        "Mehrsprachiger Assistent fuer Risiko-Vorpruefung, Dokumentationsvorlagen und technische Nachweise.",
      headline: "Bauen Sie Ihr Dokumentationspaket auf",
      intro:
        "Texteingaben bleiben frei. Fuer Nachweise verlinkt der Assistent direkt in den Nachweis-Workflow.",
    },
    templates: {
      title: "EU-KI-Verordnung Vorlagen",
      description:
        "Vorlagen fuer EU-AI-Act-Artikel mit direktem Zugang zu maschinenlesbaren Nachweisen.",
      headline: "Vorlagen mit klarem Bezug zu echten Nachweisen",
      intro:
        "Diese Vorlagen zeigen, wie der Dokumentations-Assistent und das Toolkit konkrete EU-AI-Act-Abschnitte mit strukturierten Nachweisen verknuepfen.",
      note:
        "Nur Artikel, zu denen das Toolkit einen realen technischen Beitrag leistet, sind hier gelistet. Die Abschnittstitel zeigen die Art des technischen Beitrags, nicht den Grad juristischer Vollstaendigkeit.",
      strongGroup: "Direkte technische Ausgaben",
      partialGroup: "Nachweisgestuetzte Gerueste",
      coverageLabel: "Technischer Beitrag",
    },
    docs: {
      title: "Referenzdokumente und Nachweis-Hub",
      description:
        "Schnellstart, Operator-Leitfaeden, Nachweis-Oberflaechen und massgebliche Produktdokumentation hinter dem EU AI Evidence Builder.",
      headline: "Referenzdokumente und Nachweis-Hub",
    },
    about: {
      title: "Fuer technische Teams, die die Passung pruefen",
      description:
        "Seite fuer Plattform-, Security- und Compliance-Engineering-Teams, die pruefen wollen, ob das Kernprodukt technisch ernst genug fuer eine Installation ist und ob sektorielle Arbeit sauber darueber liegen kann.",
      headline: "Fuer technische Teams, die die Passung pruefen",
      intro:
        "Diese Seite ist fuer den Moment gedacht, in dem nicht Preise oder Regulierung, sondern die technische Ernsthaftigkeit der Kern-Engine im Vordergrund steht.",
      inspectTitle: "Was man zuerst pruefen sollte",
      inspectLead:
        "Eine technische Prueferin oder ein technischer Pruefer sollte konkrete Ergebnisse, explizite Verifikationsschritte, die Trennung zwischen Kern und sektorieller Arbeit sowie eine ehrliche Automationsgrenze sehen koennen, bevor tiefere Integrationsarbeit beginnt.",
      inspectCards: [
        ["Reale Ergebnisse", "Das Produkt endet in portablem Report, maschinenlesbarem Vertrag, Manifest, Archivkontrollen, Pruefprotokoll und optionalem Behoerdenpaket."],
        ["Klare Verifikationsschritte", "Paketierung, Verifikation, Pruefung und Behoerdenpaket haben explizite Kontrollen. Das ist keine reine Dashboard-Geschichte."],
        ["Sektorfester Kern", "Der Kern qualifiziert tool-nutzende Agenten. Sektorielle Case-Bibliotheken, Scanner und vertikale Exporte koennen darueber liegen, ohne dass das Basisprodukt zu einer generischen Compliance-Suite wird."],
        ["Im Quelltext sichtbar", "Befehle, Schemata und Artefakte sind im Repository sichtbar und passen zur Live-Nachweis-Oberflaeche."],
        ["Ehrliche Grenze", "Das System automatisiert Nachweisablaeufe, nicht Rechtsklassifizierung, Geschaefts-Urteile oder finale Freigabe."],
      ],
      quickstartTitle: "Schnellster ehrlicher erster Lauf",
      quickstartLead:
        "Wenn Ihr Adapter bereits laeuft, nutzt der Schnellstart den kuerzesten Weg zu einem echten Starter-Nachweispaket in Ihrer eigenen Umgebung.",
      quickstartCommand: "npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud",
      quickstartPoints: [
        "Fuehrt den Starter-Smoke-Pfad auf Ihrem eigenen Adapter aus und paketiert einen portablen Report.",
        "Zeigt, ob das Toolkit in Ihrer Umgebung wirklich Nachweise erzeugen, paketieren und verifizieren kann.",
        "Bleibt ehrlich: nur Starter-Nachweispaket, keine volle Qualifikation und keine Compliance-Aussage.",
      ],
      quickstartButton: "Schnellstart-Guide oeffnen",
    },
    contact: {
      title: "Kontakt",
      description:
        "Pilot anfragen, Live-Demo prüfen oder direkt in das Open-Source-Repository einsteigen.",
      headline: "Pilot oder technische Prüfung starten",
    },
    holding: {
      title: "Holding-Seite fuer erweitertes Material",
      description:
        "Von der Startseite entfernte Abschnitte, die fuer ein spaeteres Audit gesammelt werden, statt still geloescht zu werden.",
      headline: "Erweitertes Material ausserhalb des Haupt-Funnels",
      intro:
        "Diese Seite sammelt Abschnitte, die von der Homepage entfernt wurden, damit sie spaeter geprueft, geloescht, umgeschrieben oder auf bessere Oberflaechen verteilt werden koennen.",
    },
    legalTitles: {
      privacy: "Datenschutz",
      terms: "Nutzungsbedingungen",
      disclaimer: "Hinweis",
      cookies: "Cookie-Einstellungen",
    },
    blog: {
      title: "Blog zu EU-AI-Act-Nachweisen",
      description:
        "Leitfaeden zur August-2026-Frist, zu Hochrisiko-Kategorien aus Anhang III und zu den Inhalten belastbarer Nachweispakete.",
      headline: "Leitfaeden fuer Dokumentation und Nachweise in KI-Teams",
    },
  },
  fr: {
    code: "fr",
    name: "Français",
    htmlLang: "fr",
    nav: {
      how: "Fonctionnement",
      technical: "Technologie",
      templates: "Modeles",
      pricing: "Tarifs",
      docs: "Documentation",
      start: "Commencer",
    },
    footer: {
      privacy: "Confidentialite",
      terms: "Conditions",
      disclaimer: "Avertissement",
      cookies: "Cookies",
      contact: "Contact",
    },
    common: {
      brandSubtitle: "Generateur de documentation pour Agent QA Toolkit",
      trustLine: "Heberge chez vous · Vos donnees restent dans votre environnement · Noyau open source",
      pilotCta: "Demander un pilote",
      liveDemos: "Demos live",
      proofLabel: "Hub de preuve",
      docsLabel: "Documentation open source",
      languageLabel: "Langue",
      skipLink: "Aller au contenu",
      legalLabel: "Juridique",
      cookieBannerBody:
        "Ce site utilise uniquement le stockage essentiel par defaut. Les analytics peuvent etre activees plus tard avec Plausible heberge dans l'UE.",
      cookieEssential: "Essentiel seulement",
      cookieAnalytics: "Autoriser les analytics",
      yes: "Oui",
      no: "Non",
      startFree: "Commencer gratuitement",
      viewPricing: "Voir les tarifs",
      viewProof: "Voir les preuves live",
      bookCall: "Verifier le pilote",
    },
    landing: {
      title: "Documentation AI Act Europe | Modeles gratuits et preuves techniques",
      description:
        "Pour les systemes IA a haut risque ou exposes a une revue externe: dossier de preuve technique heberge chez vous pour la preparation EU AI Act, la transmission et les workflows tournes vers l'autorite.",
      keywords:
        "reglement europeen IA conformite, IA acte europeen documentation, evaluation de conformite IA Europe, IA haut risque aout 2026",
      heroTitle:
        "Quand la revue EU AI Act devient concrete, les captures d'ecran et les tableaux de bord ne suffisent plus.",
      heroText:
        "L'assistant de documentation structure le dossier. Agent QA Toolkit ajoute le dossier de preuve heberge chez vous, la trace de revue, les controles d'archivage et la transmission exploitable pour une autorite qui rendent l'ensemble credible.",
      primaryCta: "Commencer le dossier",
      secondaryCta: "Voir la preuve live",
      audienceTitle: "Choisissez votre point d'entree",
      audienceLead:
        "Commencez par le vrai travail a accomplir: mission de conseil, revue de gouvernance ou evaluation technique.",
      audienceCards: [
        {
          title: "Pour les consultants",
          text:
            "Vous gerez deja l'interpretation legale ou la livraison client. Le toolkit sert de couche de preuve technique derriere votre dossier.",
          result: "Premier clic: adequation du workflow, resultats du dossier et logique de transmission.",
          cta: "Parcours consultants",
          href: "how-it-works",
        },
        {
          title: "Pour les equipes gouvernance",
          text:
            "Vous avez besoin d'un dossier technique pret pour la revue interne, le suivi et la preparation EU AI Act.",
          result: "Premier clic: assistant de documentation plus demonstration live du dossier.",
          cta: "Parcours gouvernance",
          href: "builder",
        },
        {
          title: "Pour les equipes techniques",
          text:
            "Vous devez juger si le moteur central est assez serieux pour meriter installation, revue interne et ajouts sectoriels via des cas ou scanners.",
          result: "Premier clic: quoi inspecter, ou se trouve la frontiere et comment les couches sectorielles se posent au-dessus du noyau.",
          cta: "Parcours equipes techniques",
          href: "about",
        },
      ],
      solutionTitle: "Comment fonctionne l'assistant de documentation",
      steps: [
        "Verifier si le systeme a besoin d'un simple journal d'evenements ou d'un dossier technique capable de tenir sous examen pousse.",
        "Structurer avec l'assistant de documentation les sections du dossier qui demandent un texte explicatif et des references de preuve.",
        "Executer le workflow technique dans votre environnement et rattacher un dossier de preuve portable la ou le dossier a besoin de preuve.",
      ],
      strongestFitTitle: "Meilleure adequation",
      strongestFitBody:
        "Le plus utile quand la preuve doit survivre a une revue externe ou multi-equipe: mission de conseil, tri a haut risque, achat reglemente, transmission d'incident ou demandes d'autorite. La classification legale et la validation finale restent hors du produit.",
      deliverablesTitle: "Ce que le produit donne vraiment",
      deliverablesLead:
        "Le produit doit se lire par ses resultats, pas seulement par le langage de process.",
      deliverablesCards: [
        {
          title: "Dossier de preuve portable",
          text: "Rapport hors ligne, compare-report JSON, manifest et controles de retention qui restent exploitables lors d'une transmission hors des outils d'ingenierie.",
        },
        {
          title: "Exports orientes dossier",
          text: "Structure Annexe IV plus brouillons pour les articles 9, 13, 17, 72 et 73 relies aux preuves d'execution.",
        },
        {
          title: "Trace de revue structuree",
          text: "Decision nommee, note de transmission, verifications de completion et continuite recurrente des actions correctives.",
        },
        {
          title: "Dossier pret pour une autorite",
          text: "Quand necessaire, un dossier cible pour reponse a une autorite avec decisions de divulgation et d'archivage.",
        },
      ],
      fitMatrixTitle: "Quand cet effort devient utile",
      fitMatrixLead:
        "Toutes les equipes IA n'ont pas besoin d'une couche de preuve scrutiny-grade. La valeur apparait quand de simples logs ne suffisent plus.",
      fitMatrixHeaders: ["Situation", "Pourquoi les logs simples sont faibles", "Ce que la couche de preuve ajoute"],
      fitMatrixRows: [
        ["Revue interne multi-equipe", "La preuve vit dans des tableaux de bord ou dans la memoire des personnes.", "Dossier portable, trace de revue et verrou de verification deterministe."],
        ["Transmission au conseil ou a un fournisseur", "La livraison client se transforme en captures d'ecran et en narratif statique.", "Exports orientes dossier relies a des preuves d'execution verifiees."],
        ["Incident, conseil juridique ou demande d'autorite", "Les traces brutes sont trop sensibles ou trop difficiles a partager directement.", "Dossier cible pour l'autorite, controles d'archivage et trace de divulgation."],
      ],
      proofTitle: "Voir la preuve avant de lire plus",
      proofBody:
        "Ouvrez l'assistant de documentation, le dossier live ou le modele operationnel technique. Le site doit mener vers un vrai artefact, pas une checklist generique.",
    },
    how: {
      title: "Comment fonctionne l'assistant de preuve EU AI Act",
      description:
        "Du profil systeme aux preuves techniques reliees a la documentation.",
      headline: "Un pipeline de documentation et de preuve",
      intro:
        "Cette page est la vue workflow pour les consultants et la gouvernance. Elle montre comment le parcours dossier devient un dossier technique pret pour la revue.",
      summaryTitle: "Bloc operationnel en un coup d'oeil",
      summaryLead: "A lire d'abord si vous voulez la vue la plus courte et la plus honnete des entrees, de l'automatisation, de la part humaine et du resultat.",
      summaryColumns: [
        {
          title: "Entrees",
          points: [
            "Perimetre du systeme, finalite prevue, responsables et contexte de deploiement",
            "Sections narratives du dossier avec references de preuve",
            "Attentes de qualite qui definissent la profondeur de preuve",
          ],
        },
        {
          title: "Automatise",
          points: [
            "Structuration et validation de l'intake",
            "Generation du dossier de preuve et exports orientes dossier",
            "Preparation de la revue et mise en forme pour reponse a une autorite",
          ],
        },
        {
          title: "Humain",
          points: [
            "Jugement sur les dommages metier et le risque residuel",
            "Jugement d'approbation ou de blocage",
            "Classification legale, narratif final et validation",
          ],
        },
        {
          title: "Resultat",
          points: [
            "Dossier de preuve portable",
            "Dossier structure pret pour la revue",
            "Transmission exploitable par une autorite si necessaire",
          ],
        },
      ],
      inputsTitle: "Ce qui entre",
      inputsLead: "Le workflow commence par des informations detenues par l'operateur, pas par des artefacts generes.",
      inputCards: [
        ["Perimetre du systeme", "Perimetre systeme, finalite prevue, responsables et contexte de deploiement."],
        ["Sections narratives", "Parties du dossier qui demandent hypotheses, contraintes et references de preuve."],
        ["Attentes de qualite", "Attentes de mise en production ou de gouvernance qui definissent la profondeur de preuve necessaire."],
      ],
      workflowTitle: "Ce que l'automatisation fait",
      workflowLead: "Une fois le perimetre fige, le workflow doit automatiser autant que possible la generation de preuve et l'assemblage du dossier.",
      workflowSteps: [
        "Figer le perimetre du systeme, les responsables et la finalite prevue avant que le dossier ne s'elargisse.",
        "Utiliser l'assistant de documentation et les modeles pour rediger les sections narratives et reperer les references techniques requises.",
        "Executer Agent QA Toolkit pour produire le dossier de preuve portable, les exports orientes dossier et les artefacts de revue structures.",
        "Remettre un seul dossier a la gouvernance, aux consultants, au juridique ou aux workflows tournes vers l'autorite sans dependre de tableaux de bord.",
      ],
      outputsTitle: "Ce que le workflow produit",
      outputsLead: "Le resultat doit etre un ensemble de resultats concrets, pas seulement du langage de process.",
      outputCards: [
        ["Structure de dossier", "Un dossier brouillon avec sections narratives, hypotheses et references de preuve."],
        ["Dossier de preuve technique", "Rapport portable, compare-report JSON, manifest, controles de retention et exports orientes dossier."],
        ["Transmission prete pour la revue", "Trace de revue structuree et, si besoin, mise en forme ciblee pour une reponse a une autorite."],
      ],
      boundaryTitle: "Ou le workflow s'arrete encore",
      boundaryLead: "Le workflow prepare le dossier technique. Il ne retire pas la responsabilite gouvernance et legale.",
      boundaryPoints: [
        "La classification legale et la validation finale restent hors du produit.",
        "Les jugements sur les dommages metier et le risque residuel restent chez l'operateur.",
        "Le narratif destine au deploiement et les arbitrages de mise en production demandent encore des responsables humains nommes.",
      ],
      screenshotTitle: "A quoi ressemble la sortie",
      screenshotBody: "Le resultat doit etre un dossier pret pour la revue qu'une autre personne peut inspecter sans ouvrir vos systemes internes.",
      proofTitle: "Prochains clics utiles",
      proofBody: "A partir d'ici, les vrais choix sont: ouvrir l'assistant de documentation, inspecter le dossier live, ou passer au modele technique.",
    },
    pricing: {
      title: "Tarifs pour les preuves EU AI Act",
      description:
        "Acces OSS gratuit, pack de lancement ponctuel, abonnements Team et Studio, et accompagnement enterprise sur mesure pour les preuves EU AI Act.",
      headline: "Commencez gratuitement. Payez une fois pour atteindre la premiere vraie valeur, puis abonnez-vous quand le workflow devient operationnel.",
      lead:
        "Le coeur OSS est gratuit. Le pack de lancement ponctuel amene un agent vers un premier vrai resultat de preuve. Team et Studio sont des offres produit recurrentes pour les equipes qui exploitent deja le workflow en interne.",
      subscriptionsLabel: "Parcours commerciaux",
      entryTitle: "Commencer avec OSS",
      entryLead:
        "Utilisez la voie gratuite si vous voulez inspecter le produit, lancer le demarrage rapide sur votre propre agent, puis decider si le workflow merite une place dans votre environnement.",
      launchEyebrow: "Onboarding ponctuel",
      launchTitle: "Besoin d'aide pour atteindre la premiere vraie valeur sur votre propre agent ?",
      launchLead:
        "Le pack de lancement est le pont ponctuel entre tester le depot et obtenir un premier vrai dossier de preuve sur votre propre infrastructure.",
      tiersEyebrow: "Abonnements",
      tiersTitle: "Tiers produit recurrents",
      tiersLead:
        "Team, Studio et Enterprise ne commencent qu'une fois que le workflow fait deja partie des operations reelles.",
      fitTitle: "Choisissez le parcours qui correspond a votre stade",
      fitLead:
        "N'achetez pas du support juste pour regarder. Le pack ponctuel sert a atteindre la premiere valeur. L'abonnement commence quand le workflow fait deja partie de l'exploitation courante.",
      fitCards: [
        ["Rester en autonomie", "Le depot, le demarrage rapide, la documentation et les demonstrations suffisent tant que vous evaluez l'adequation ou pouvez operer le workflow seuls."],
        ["Prendre le pack de lancement", "C'est le bon choix quand un agent doit atteindre vite un vrai premier dossier de preuve sans que votre equipe perde des semaines a trouver le chemin seule."],
        ["Prendre Team ou Studio", "Abonnez-vous seulement quand le workflow est deja utile en continu pour 3 ou 10 agents."],
        ["Prendre Enterprise", "C'est le bon niveau quand la revue devient externe, multi-systeme, orientee conformite, ou recurrente sous examen serre."],
      ],
      faq: [
        {
          q: "Faut-il partager les donnees ou le modele ?",
          a: "Non. Le coeur du workflow reste heberge chez vous.",
        },
        {
          q: "Par quoi dois-je commencer ?",
          a: "Commencez par OSS si vous evaluez encore l'adequation ou si votre equipe peut operer le workflow seule. Prenez le pack de lancement quand un agent doit atteindre vite un vrai premier resultat de preuve. Prenez Team ou Studio seulement apres que le workflow soit deja utile en interne. Prenez Enterprise quand le dossier doit survivre a une revue multi-equipe ou externe.",
        },
        {
          q: "Que paie exactement le pack de lancement ?",
          a: "Le pack de lancement est une offre ponctuelle d'onboarding pour un agent. Il amene votre equipe a un premier vrai dossier de preuve sur votre propre infrastructure et a une transmission claire pour la suite. Il ne remplace ni la vraie conception des cas, ni la revue de gouvernance, ni la validation juridique finale.",
        },
        {
          q: "Pourquoi le pack de lancement est-il ponctuel alors que Team et Studio sont mensuels ?",
          a: "Le pack de lancement sert a l'activation vers la premiere valeur. Team et Studio servent aux equipes qui ont deja passe l'onboarding et ont besoin d'usage produit, de mises a jour, d'exports et d'un support recurrent pour 3 ou 10 agents.",
        },
        {
          q: "Team et Studio incluent-ils du travail custom illimite ?",
          a: "Non. Team et Studio sont des offres produit avec support, pas du conseil illimite. L'implementation multi-systeme, la revue externe ou le travail de dossier sur mesure passent en perimetre Enterprise.",
        },
        {
          q: "Cela remplace-t-il un conseil juridique ?",
          a: "Non. L'assistant de documentation genere un cadre documentaire et des preuves techniques.",
        },
      ],
    },
    builder: {
      title: "Assistant EU AI Act",
      description:
        "Assistant pas a pas pour le profil systeme, le tri de risque et le dossier documentaire.",
      headline: "Construisez votre dossier documentaire",
      intro:
        "L'assistant de documentation est gratuit pour la structure. Les preuves techniques se branchent la ou elles sont necessaires.",
    },
    templates: {
      title: "Modeles de documentation AI Act",
      description:
        "Modeles pour les articles de l'EU AI Act avec liens vers les preuves techniques live.",
      headline: "Modeles utiles pour les equipes qui doivent agir vite",
      intro:
        "Ces modeles montrent comment l'assistant de documentation et le toolkit relient des sections concretes de l'EU AI Act a des preuves structurees.",
      note:
        "Seuls les articles pour lesquels le toolkit apporte une contribution technique reelle sont listes ici. Les titres de section indiquent le type de contribution technique, pas un niveau d'achevement juridique.",
      strongGroup: "Sorties techniques directes",
      partialGroup: "Brouillons appuyes par des preuves",
      coverageLabel: "Contribution technique",
    },
    docs: {
      title: "Documentation source et hub de preuve",
      description:
        "Demarrage rapide, guides operateur, surfaces de preuve et documentation de reference derriere l'assistant EU AI Evidence.",
      headline: "Documentation source et hub de preuve",
    },
    about: {
      title: "Pour les equipes techniques qui evaluent l'adequation",
      description:
        "Page pour les equipes plateforme, securite et ingenierie de conformite qui veulent juger si le produit central est assez reel pour etre installe et si du travail sectoriel peut se poser proprement au-dessus.",
      headline: "Pour les equipes techniques qui evaluent l'adequation",
      intro:
        "Utilisez cette page quand la vraie question n'est ni le prix ni la regulation, mais la solidite technique du moteur de preuve central.",
      inspectTitle: "Ce qu'il faut verifier d'abord",
      inspectLead:
        "Un evaluateur technique doit pouvoir voir des resultats concrets, des verrous explicites, la separation entre noyau et travail sectoriel, et une frontiere d'automatisation honnete avant une integration plus profonde.",
      inspectCards: [
        ["Resultats reels", "Le produit se termine par un rapport portable, un contrat lisible par machine, un manifest, des controles de retention, une trace de revue et un dossier pour autorite en option."],
        ["Verrous explicites", "Le packaging, la verification, la revue et la preparation pour autorite ont tous des controles explicites. Ce n'est pas une simple histoire de tableau de bord."],
        ["Noyau pret pour les verticales", "Le noyau qualifie des agents qui utilisent des outils. Des bibliotheques de cas, scanners et exports verticaux sectoriels peuvent se poser au-dessus sans transformer le produit de base en suite de conformite generique."],
        ["Visible dans le code source", "Les commandes, schemas et artefacts sont visibles dans le depot et correspondent a la surface de preuve live."],
        ["Frontiere honnete", "Le systeme automatise les operations de preuve, pas la classification legale, le jugement metier ou la validation finale."],
      ],
      quickstartTitle: "Chemin le plus rapide vers un premier run honnete",
      quickstartLead:
        "Si votre adapter tourne deja, utilisez le demarrage rapide pour produire un vrai premier dossier de preuve dans votre propre environnement avant toute integration plus lourde.",
      quickstartCommand: "npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud",
      quickstartPoints: [
        "Execute le chemin smoke de demarrage sur votre propre adapter et produit un rapport portable.",
        "Montre si le toolkit peut vraiment executer, packager et verifier la preuve dans votre environnement.",
        "Reste honnete: premier dossier de preuve seulement, pas qualification complete ni niveau de conformite etabli.",
      ],
      quickstartButton: "Ouvrir le guide de demarrage rapide",
    },
    contact: {
      title: "Contact",
      description:
        "Demandez un pilote, ouvrez les demos live ou consultez le depot open source.",
      headline: "Choisissez le chemin le plus court vers un pilote serieux",
    },
    holding: {
      title: "Page de stockage du materiel etendu",
      description:
        "Sections retirees de la page d'accueil et conservees pour un audit ulterieur au lieu d'etre supprimees silencieusement.",
      headline: "Materiel etendu retire du funnel principal",
      intro:
        "Cette page regroupe les sections retirees de la page d'accueil pour qu'elles soient revues plus tard et soit supprimees, soit reecrites, soit deplacees vers une meilleure surface.",
    },
    legalTitles: {
      privacy: "Confidentialite",
      terms: "Conditions",
      disclaimer: "Avertissement",
      cookies: "Parametres des cookies",
    },
    blog: {
      title: "Blog des preuves EU AI Act",
      description:
        "Guides sur l'echeance d'aout 2026, les categories a haut risque de l'Annexe III et le contenu attendu d'un dossier de preuve solide.",
      headline: "Guides de documentation et de preuve pour les equipes IA",
    },
  },
};

const TECHNICAL_SHARED = {
  packageCommands: [
    "npm run compliance:eu-ai-act -- --cases <cases.json> --baselineDir <run-dir> --newDir <run-dir> --outDir <report-dir> --reportId <id>",
    "AQ_MANIFEST_PRIVATE_KEY=... npm run compliance:eu-ai-act -- --cases <cases.json> --baselineDir <run-dir> --newDir <run-dir> --outDir <report-dir> --reportId <id> --verify-strict --sign",
    "npm run review:init -- --reportDir <report-dir> [--profile <name>]",
    "npm run review:check -- --reportDir <report-dir> [--profile <name>]",
    "npm run compliance:eu-ai-act:authority-response -- --reportDir <report-dir>",
  ],
  compactArtifactRows: [
    ["Intake contract", "`system-scope.json`, `quality-contract.json`, `cases-coverage.json`", "The scoped system and reviewed case contract are explicit."],
    ["Live integration", "`adapter-capability.json`, `run-fingerprint.json`", "The adapter and baseline/new runs are deep enough and comparable."],
    ["Verified bundle", "`report.html`, `compare-report.json`, `manifest.json`, optional `manifest.sig`, `archive/retention-controls.json`", "Portable evidence passes verify; strict mode can also attest authenticity for authority-facing handoff."],
    ["Review handoff", "`review-decision.json`, `handoff-note.md`, optional authority package", "Named owner decision and external-facing handoff are explicit before the package leaves the review chain."],
  ],
  workflowSteps: [
    ["Scope freeze", "Capture the system boundary, deployment context, owners, and the specific change under review in `system-scope.json`."],
    ["Quality contract", "Make pass, require_approval, and block rules explicit in `quality-contract.json` before any evidence is collected."],
    ["Case suite", "Build a quality-grade `cases.json` that reflects critical paths, negative cases, and risky actions."],
    ["Adapter depth", "Make the agent callable through `/run-case` with enough telemetry for the chosen quality bar."],
    ["Comparable runs", "Produce baseline and new run inputs that are actually comparable, not just mechanically different."],
    ["Package and verify", "Generate `compare-report.json`, `report.html`, `manifest.json`, `archive/retention-controls.json`, and a portable `_source_inputs/` snapshot."],
    ["EU dossier", "If needed, add clause coverage, Annex IV structure, Article 13 instructions scaffold, Article 9 risk register scaffold, Article 17 QMS-lite scaffold, Article 72 monitoring-plan scaffold, Article 73 dossier d'incident grave, oversight outputs, and post-market monitoring exports."],
    ["Human review", "Scaffold `review/review-decision.json` and `review/handoff-note.md`, then complete narrative, residual risk notes, release decision, legal escalation, and sync the recurring corrective-action register. For EU bundles, also complete the Article 13/17/72/73 owner-completion loop."],
    ["Authority bundle", "When needed, assemble an on-demand authority-response bundle from the verified EU report and choose explicitly whether `_source_inputs/` may be shared."],
  ],
  artifactRows: [
    ["Stage 0", "ops/intake/<profile>/system-scope.json", "Intake + human", "System, change, owners, and deployment context are explicit."],
    ["Stage 1", "ops/intake/<profile>/quality-contract.json", "Intake + human", "Pass, approval, and block logic are concrete and reviewable."],
    ["Stage 2", "cases.json + cases-coverage.json", "Human + validator", "Case ids are stable; the reviewed suite passes the contract-coverage gate and persists coverage details."],
    ["Stage 3", "adapter config / endpoint + adapter-capability.json", "Developer + onboarding gate", "Canary returns valid `/run-case` responses with required telemetry depth and writes a durable adapter capability profile."],
    ["Stage 4", "runs/baseline/, runs/new/, and run-fingerprint.json", "Runner + comparability gate", "Both run dirs contain valid `run.json`, matching case outputs, and a durable run fingerprint that records comparability plus environment clues."],
    ["Stage 5", "reports/<id>/ bundle + archive/retention-controls.json", "Packager", "Evidence verify passes, the bundle is portable, and archive/retention controls are explicit."],
    ["Stage 6", "reports/<id>/compliance/*", "EU packager", "EU verify passes, the instructions/risk-register/QMS-lite/monitoring-plan scaffolds are present, and residual gaps remain explicit."],
    ["Stage 7", "review/review-decision.json + review/handoff-note.md + corrective-action-register.json", "Review scaffold + human", "`review:check` passes with a named owner decision, no TODOs, no open machine gaps, synced corrective-action continuity, and completed EU owner-completion records where applicable."],
  ],
  readinessChecklist: [
    "I can describe my AI system's intended use in one sentence.",
    "I know which tools, APIs, or retrieval sources the agent uses.",
    "I have at least 20 real user scenarios or operational cases documented.",
    "I can produce baseline and new versions in a comparable environment.",
    "I have a named owner for release or governance decisions.",
    "I know whether I need only technical evidence or also EU dossier outputs.",
  ],
  readinessBands: [
    ["0-2", "Needs scoping help before self-serve or Launch Pack will be efficient."],
    ["3-4", "Good Launch Pack candidate: the core workflow exists but needs structuring."],
    ["5-6", "Good self-serve or Enterprise-support candidate: the team is operationally ready."],
  ],
  maturityRows: [
    ["L0", "No evidence", "\"It works on my machine\" and no durable review record."],
    ["L1", "Ad-hoc testing", "Manual checks exist, but artifacts are inconsistent or not portable."],
    ["L2", "Structured cases", "`cases.json` exists and the team can run repeatable checks."],
    ["L3", "Verified evidence", "Portable bundle passes integrity and portability verification."],
    ["L4", "Governed evidence", "Recurring runs, drift detection, and named human review exist."],
    ["L5", "Audit-ready", "EU dossier exports, coverage mapping, and governed handoff are in place."],
  ],
  triggerRows: [
    ["Model version change", "Re-run Stages 4-7."],
    ["Prompt or toolset change", "Usually re-run Stages 2-7."],
    ["New deployment context or market", "Re-run Stages 0-7."],
    ["Nightly drift monitoring", "Automate Stages 4-6 and escalate Stage 7 when gates fire."],
    ["EU AI Act mapping or standards update", "Re-run Stages 6-7."],
  ],
  supportRows: [
    ["OSS self-serve", "Teams that can scope, integrate, and operate the workflow alone.", "No setup help, no supported-agent scope, no done-for-you onboarding."],
    ["Launch Pack", "One supported agent that needs first-time setup and a first serious package.", "Not unlimited case authoring, not full legal drafting, not multi-agent implementation."],
    ["Monthly support", "Supported agents that already cleared onboarding and now need recurring help.", "Not full done-for-you setup for every new agent unless separately scoped."],
  ],
  failureCards: [
    ["Weak cases", "Critical cases use empty or weak `expected` blocks, so the bundle looks green while proving very little."],
    ["Shallow adapter", "The endpoint returns final text but not the telemetry depth required for tool, trace, or assumption evidence."],
    ["Incomparable runs", "Baseline and new were run with different environments, budgets, or incomplete case sets, so the diff is misleading."],
    ["Narrative without proof", "The package claims oversight, logging, or robustness, but the bundle does not contain matching artifacts."],
  ],
  intakeCommands: [
    "npm run intake:init -- --profile <name> [--euDossierRequired 1]",
    "npm run intake:validate -- --profile <name>",
    "npm run intake:scaffold:cases -- --profile <name>",
    "npm run intake:check:cases -- --profile <name> --cases <cases.json>",
    "npm run intake:check:adapter -- --profile <name> --cases <cases.json> --baseUrl <adapter>",
    "npm run intake:check:runs -- --profile <name> --cases <cases.json> --baselineDir <run-dir> --newDir <run-dir>",
  ],
  reviewCommands: [
    "npm run review:init -- --reportDir <report-dir> [--profile <name>]",
    "npm run review:check -- --reportDir <report-dir> [--profile <name>]",
  ],
  intakeArtifacts: [
    "`system-scope.json` for scope, owners, deployment context, and evidence preferences",
    "`quality-contract.json` for critical tasks, prohibited behaviors, risky actions, and case targets",
    "`cases-coverage.json` for persistent intake-to-case coverage after the reviewed suite is checked",
    "`adapter-capability.json` for the proven telemetry depth and evidence limits of the live adapter",
    "`run-fingerprint.json` for structural comparability, environment clues, and missing-signal visibility before packaging",
    "`archive/retention-controls.json` for observed retention settings, required archive paths, and operator-owned archive decisions",
    "`corrective-action-register.json` for recurring gap continuity across review cycles",
    "draft `cases/<profile>.intake-scaffold.json` as a human-reviewed starting point",
  ],
  reviewArtifacts: [
    "`review/review-decision.json` for the structured owner decision, residual-gap actions, and EU scaffold completion records",
    "`review/handoff-note.md` for the narrative handoff summary",
    "`authority-response/authority-response-bundle.json` for on-demand counsel or authority-facing package assembly",
    "optional `review/intake/*` snapshot when the review is linked back to the intake contract, including continuity artifacts when available",
  ],
  reviewChecks: [
    "Decision status must not remain `pending`.",
    "No `TODO` placeholders may remain in the review record or handoff note.",
    "Every machine-derived residual gap must have an owner, a disposition, and a note.",
    "Recurring corrective-action continuity must stay coherent and is synced back into intake on successful review checks.",
    "EU bundles must complete the Article 13, Article 17, Article 72, and Article 73 owner-completion loop before handoff is ready.",
    "Approvals with block-severity machine gaps require explicit overrides.",
    "Legal review requests need an explicit reason before the handoff is ready.",
  ],
  humanOwnedRows: [
    ["Intended use", "Owner-defined system purpose and boundary."],
    ["Business harms", "Impact and residual-risk framing stay with the operator."],
    ["Approval/block policy", "The toolkit cannot choose governance thresholds for the team."],
    ["Final narrative and signoff", "Release, compliance, and legal approval remain human-owned."],
  ],
};

const TECHNICAL_SHARED_I18N = {
  de: {
    compactArtifactRows: [
      ["Intake-Vertrag", "`system-scope.json`, `quality-contract.json`, `cases-coverage.json`", "Systemrahmen und gepruefte Falldefinition sind explizit."],
      ["Live-Integration", "`adapter-capability.json`, `run-fingerprint.json`", "Adapter sowie Baseline/New-Runs sind tief genug und vergleichbar."],
      ["Verifiziertes Paket", "`report.html`, `compare-report.json`, `manifest.json`, `archive/retention-controls.json`", "Das portable Nachweispaket besteht die Verifikation und bleibt bei der Uebergabe erhalten."],
      ["Pruefuebergabe", "`review-decision.json`, `handoff-note.md`, optionales Behoerdenpaket", "Benannte Verantwortungsentscheidung und externe Uebergabe sind explizit."],
    ],
    workflowSteps: [
      ["Rahmen einfrieren", "Systemgrenze, Einsatzkontext, verantwortliche Personen und die konkrete Aenderung in der Pruefung in `system-scope.json` festhalten."],
      ["Qualitaetsvertrag", "Pass-, Freigabe- und Block-Regeln in `quality-contract.json` explizit machen, bevor Nachweise gesammelt werden."],
      ["Case-Suite", "Eine qualitaetsfaehige `cases.json` aufbauen, die kritische Pfade, Negativfaelle und riskante Aktionen abdeckt."],
      ["Adapter-Tiefe", "Den Agenten ueber `/run-case` mit genug Telemetrie fuer den gewaehlten Qualitaetsanspruch erreichbar machen."],
      ["Vergleichbare Runs", "Baseline- und New-Run-Inputs erzeugen, die wirklich vergleichbar sind und nicht nur mechanisch unterschiedlich."],
      ["Paketieren und verifizieren", "`compare-report.json`, `report.html`, `manifest.json`, `archive/retention-controls.json` und einen portablen `_source_inputs/`-Snapshot erzeugen."],
      ["EU-Dossier", "Falls noetig Artikelabdeckung, Anhang-IV-Struktur, Artikel-13-Anweisungen, Artikel-9-Risikoregister, Artikel-17-QMS-lite, den Artikel-72-Plan zur Beobachtung nach dem Inverkehrbringen, Artikel-73-Vorfallspaket, Aufsichts-Ergebnisse und Exporte fuer die Beobachtung nach dem Inverkehrbringen hinzufuegen."],
      ["Menschliche Pruefung", "`review/review-decision.json` und `review/handoff-note.md` anlegen, dann Narrativ, Rest-Risiko-Notizen, Freigabeentscheidung zur Inbetriebnahme, juristische Eskalation und die Kontinuitaet des Registers fuer Korrekturmassnahmen vervollstaendigen. Fuer EU-Pakete zusaetzlich die Abschlussschleife der Artikel 13/17/72/73 fertigstellen."],
      ["Behoerdenpaket", "Bei Bedarf ein `authority-response-bundle` aus dem verifizierten EU-Report zusammenstellen und explizit entscheiden, ob `_source_inputs/` geteilt werden duerfen."],
    ],
    artifactRows: [
      ["Stufe 0", "ops/intake/<profile>/system-scope.json", "Intake + Mensch", "System, Aenderung, verantwortliche Personen und Einsatzkontext sind explizit."],
      ["Stufe 1", "ops/intake/<profile>/quality-contract.json", "Intake + Mensch", "Pass-, Freigabe- und Block-Logik sind konkret und pruefbar."],
      ["Stufe 2", "cases.json + cases-coverage.json", "Mensch + Validator", "Case-IDs sind stabil; die gepruefte Suite besteht den Coverage-Kontrollpunkt und persistiert Coverage-Details."],
      ["Stufe 3", "adapter config / endpoint + adapter-capability.json", "Entwicklung + Onboarding-Kontrollpunkt", "Canary liefert gueltige `/run-case`-Antworten mit erforderlicher Telemetrie-Tiefe und schreibt ein belastbares Adapter-Profil."],
      ["Stufe 4", "runs/baseline/, runs/new/ und run-fingerprint.json", "Runner + Vergleichbarkeits-Kontrollpunkt", "Beide Run-Verzeichnisse enthalten gueltige `run.json`, passende Fallergebnisse und einen dauerhaften Run-Fingerprint mit Vergleichbarkeit und Umgebungs-Hinweisen."],
      ["Stufe 5", "reports/<id>/ Paket + archive/retention-controls.json", "Paketierer", "Die Nachweis-Verifikation besteht, das Paket ist portabel und Archiv-/Aufbewahrungskontrollen sind explizit."],
      ["Stufe 6", "reports/<id>/compliance/*", "EU-Paketierer", "Die EU-Verifikation besteht, die Gerueste fuer Anweisungen, Risikoregister, QMS-lite und den Plan zur Beobachtung nach dem Inverkehrbringen sind vorhanden, Restluecken bleiben explizit."],
      ["Stufe 7", "review/review-decision.json + review/handoff-note.md + corrective-action-register.json", "Pruefgeruest + Mensch", "`review:check` besteht mit benannter Verantwortungsentscheidung, ohne TODOs, ohne offene maschinelle Luecken, mit synchroner Kontinuitaet bei Korrekturmassnahmen und abgeschlossenen EU-Ergaenzungsfeldern soweit anwendbar."],
    ],
    readinessChecklist: [
      "Ich kann den Verwendungszweck meines KI-Systems in einem Satz beschreiben.",
      "Ich weiss, welche Tools, APIs oder Retrieval-Quellen der Agent nutzt.",
      "Ich habe mindestens 20 echte Nutzerszenarien oder operative Faelle dokumentiert.",
      "Ich kann Baseline- und New-Versionen in einer vergleichbaren Umgebung erzeugen.",
      "Ich habe eine benannte verantwortliche Person fuer Release- oder Governance-Entscheidungen.",
      "Ich weiss, ob ich nur technische Nachweise oder auch EU-Dossier-Ergebnisse brauche.",
    ],
    readinessBands: [
      ["0-2", "Braucht Scoping-Hilfe, bevor Selbstbetrieb oder Startpaket effizient sind."],
      ["3-4", "Guter Kandidat fuer das Startpaket: Der Kern-Workflow existiert, braucht aber Struktur."],
      ["5-6", "Guter Kandidat fuer Selbstbetrieb oder Enterprise-Support: Das Team ist operativ bereit."],
    ],
    maturityRows: [
      ["L0", "Keine Nachweise", "\"Es funktioniert auf meinem Rechner\" und kein belastbares Pruefprotokoll."],
      ["L1", "Ad-hoc-Tests", "Manuelle Checks existieren, aber Artefakte sind inkonsistent oder nicht portabel."],
      ["L2", "Strukturierte Cases", "`cases.json` existiert und das Team kann wiederholbare Checks fahren."],
      ["L3", "Verifizierte Nachweise", "Portables Paket besteht Integritaets- und Portabilitaetspruefung."],
      ["L4", "Governierte Nachweise", "Wiederkehrende Runs, Drift-Erkennung und benannte menschliche Pruefungen existieren."],
      ["L5", "Audit-bereit", "EU-Dossier-Exporte, Abdeckungszuordnung und governierte Uebergabe sind vorhanden."],
    ],
    triggerRows: [
      ["Aenderung der Modellversion", "Stufen 4-7 erneut ausfuehren."],
      ["Prompt- oder Toolset-Aenderung", "Meist Stufen 2-7 erneut ausfuehren."],
      ["Neuer Einsatzkontext oder Markt", "Stufen 0-7 erneut ausfuehren."],
      ["Naechtliche Drift-Beobachtung", "Stufen 4-6 automatisieren und Stufe 7 eskalieren, wenn Verifikationsschritte ausloesen."],
      ["Update zu EU-AI-Act-Mapping oder Standards", "Stufen 6-7 erneut ausfuehren."],
    ],
    supportRows: [
      ["OSS im Selbstbetrieb", "Teams, die den Workflow allein eingrenzen, integrieren und betreiben koennen.", "Keine Setup-Hilfe, kein abgegrenzter Umfang fuer unterstuetzte Agenten, kein Onboarding als Komplettservice."],
      ["Startpaket", "Ein unterstuetzter Agent, der das erste Setup und ein erstes ernstes Paket braucht.", "Keine unbegrenzte Fallausarbeitung, kein vollstaendiges rechtliches Verfassen, keine Multi-Agent-Implementierung."],
      ["Monatlicher Support", "Unterstuetzte Agenten, die das Onboarding bereits abgeschlossen haben und nun wiederkehrende Hilfe brauchen.", "Kein vollstaendiges Komplettsetup fuer jeden neuen Agenten, sofern nicht separat abgegrenzt."],
    ],
    failureCards: [
      ["Schwache Cases", "Kritische Cases nutzen leere oder schwache `expected`-Bloecke, sodass das Paket grün aussieht, aber wenig beweist."],
      ["Flacher Adapter", "Der Endpoint liefert nur Endtext, aber nicht die Telemetrie-Tiefe, die fuer Werkzeug-, Trace- oder Annahmen-Nachweise noetig ist."],
      ["Nicht vergleichbare Runs", "Baseline und New liefen in unterschiedlichen Umgebungen, Budgets oder mit unvollstaendigen Fall-Sets, sodass der Vergleich irrefuehrend ist."],
      ["Narrativ ohne Nachweise", "Das Paket behauptet Aufsicht, Journalisierung oder Robustheit, enthaelt aber keine passenden Artefakte."],
    ],
    intakeArtifacts: [
      "`system-scope.json` fuer Systemrahmen, verantwortliche Personen, Einsatzkontext und Nachweis-Praeferenzen",
      "`quality-contract.json` fuer kritische Aufgaben, verbotene Verhaltensweisen, riskante Aktionen und Fallziele",
      "`cases-coverage.json` fuer persistente Intake-zu-Case-Coverage nach Pruefung der Suite",
      "`adapter-capability.json` fuer nachgewiesene Telemetrie-Tiefe und Nachweis-Grenzen des Live-Adapters",
      "`run-fingerprint.json` fuer strukturelle Vergleichbarkeit, Umgebungs-Hinweise und Sichtbarkeit fehlender Signale vor der Paketierung",
      "`archive/retention-controls.json` fuer beobachtete Aufbewahrungseinstellungen, erforderliche Archivpfade und vom Betreiber verantwortete Archiventscheidungen",
      "`corrective-action-register.json` fuer wiederkehrende Lueckenkontinuitaet ueber Pruefzyklen hinweg",
      "Entwurf `cases/<profile>.intake-scaffold.json` als menschlich gepruefter Startpunkt",
    ],
    reviewArtifacts: [
      "`review/review-decision.json` fuer die strukturierte Verantwortungsentscheidung, Aktionen zu Restluecken und EU-Abschlussdaten",
      "`review/handoff-note.md` fuer die narrative Uebergabe-Zusammenfassung",
      "`authority-response/authority-response-bundle.json` fuer ein Paket auf Abruf fuer Rechtsberatung oder Behoerden",
      "Optionaler `review/intake/*`-Snapshot, wenn die Pruefung zurueck an den Intake-Vertrag gebunden wird, einschliesslich Kontinuitaets-Artefakten soweit verfuegbar",
    ],
    reviewChecks: [
      "Der Entscheidungsstatus darf nicht `pending` bleiben.",
      "Im Pruefprotokoll oder in der Uebergabe-Notiz duerfen keine `TODO`-Platzhalter verbleiben.",
      "Jede maschinell erzeugte Restluecke muss verantwortliche Person, Disposition und Notiz haben.",
      "Die wiederkehrende Kontinuitaet der Korrekturmassnahmen muss koharent bleiben und wird bei erfolgreichen Pruefschritten zurueck in den Intake synchronisiert.",
      "EU-Pakete muessen die Abschlussschleife fuer Artikel 13, Artikel 17, Artikel 72 und Artikel 73 abschliessen, bevor die Uebergabe bereit ist.",
      "Freigaben bei maschinellen Luecken mit Block-Schweregrad verlangen explizite Overrides.",
      "Anfragen fuer juristische Pruefung brauchen einen expliziten Grund, bevor die Uebergabe bereit ist.",
    ],
    humanOwnedRows: [
      ["Verwendungszweck", "Systemzweck und Grenze bleiben von verantwortlichen Personen definiert."],
      ["Geschaeftliche Schaeden", "Einordnung von Auswirkungen und Rest-Risiko bleibt beim Operator."],
      ["Freigabe-/Block-Leitlinie", "Das Toolkit kann Governance-Schwellen nicht fuer das Team waehlen."],
      ["Finales Narrativ und Freigabe", "Release-, Compliance- und Rechtsfreigabe bleiben menschlich verantwortet."],
    ],
  },
  fr: {
    compactArtifactRows: [
      ["Contrat d'intake", "`system-scope.json`, `quality-contract.json`, `cases-coverage.json`", "Le perimetre du systeme et la definition validee des cas sont explicites."],
      ["Integration live", "`adapter-capability.json`, `run-fingerprint.json`", "L'adapter et les runs baseline/new sont assez profonds et comparables."],
      ["Dossier verifie", "`report.html`, `compare-report.json`, `manifest.json`, `archive/retention-controls.json`", "La preuve portable passe la verification et reste exploitable lors de la transmission."],
      ["Transmission de revue", "`review-decision.json`, `handoff-note.md`, dossier autorite optionnel", "La decision du responsable et la transmission externe sont explicites."],
    ],
    workflowSteps: [
      ["Geler le perimetre", "Capturer la frontiere du systeme, le contexte de deploiement, les responsables et le changement precis en revue dans `system-scope.json`."],
      ["Contrat de qualite", "Rendre explicites dans `quality-contract.json` les regles de passage, d'approbation et de blocage avant toute collecte de preuve."],
      ["Suite de cas", "Construire un `cases.json` de qualite couvrant les chemins critiques, les cas negatifs et les actions risquees."],
      ["Profondeur d'adapter", "Rendre l'agent appelable via `/run-case` avec assez de telemetrie pour le niveau de qualite choisi."],
      ["Runs comparables", "Produire des inputs baseline et new vraiment comparables, et pas seulement mecaniquement differents."],
      ["Assembler et verifier", "Generer `compare-report.json`, `report.html`, `manifest.json`, `archive/retention-controls.json` et un snapshot portable `_source_inputs/`."],
      ["Dossier UE", "Si necessaire, ajouter la couverture des articles, la structure de l'Annexe IV, le brouillon d'instructions Article 13, le registre de risques Article 9, le QMS-lite Article 17, le plan de surveillance Article 72, le dossier d'incident grave Article 73, les sorties de supervision et les exports de surveillance post-commercialisation."],
      ["Revue humaine", "Initialiser `review/review-decision.json` et `review/handoff-note.md`, puis completer le narratif, les notes de risque residuel, la decision de mise en production, l'escalade juridique et la continuite du registre d'actions correctives. Pour les bundles UE, terminer aussi la boucle de completion des Articles 13/17/72/73."],
      ["Dossier autorite", "Quand necessaire, assembler un `authority-response-bundle` a partir du rapport UE verifie et choisir explicitement si `_source_inputs/` peut etre partage."],
    ],
    artifactRows: [
      ["Etape 0", "ops/intake/<profile>/system-scope.json", "Intake + humain", "Le systeme, le changement, les responsables et le contexte de deploiement sont explicites."],
      ["Etape 1", "ops/intake/<profile>/quality-contract.json", "Intake + humain", "La logique de passage, d'approbation et de blocage est concrete et revuable."],
      ["Etape 2", "cases.json + cases-coverage.json", "Humain + validateur", "Les IDs de cas sont stables; la suite revue passe le controle de couverture et conserve les details de couverture."],
      ["Etape 3", "adapter config / endpoint + adapter-capability.json", "Developpeur + controle d'onboarding", "Le canary renvoie des reponses `/run-case` valides avec la profondeur de telemetrie requise et ecrit un profil d'adapter durable."],
      ["Etape 4", "runs/baseline/, runs/new/ et run-fingerprint.json", "Runner + controle de comparabilite", "Les deux repertoires de run contiennent un `run.json` valide, des resultats de cas correspondants et une empreinte durable enregistrant la comparabilite et le contexte d'environnement."],
      ["Etape 5", "reports/<id>/ dossier + archive/retention-controls.json", "Assembleur", "La verification des preuves reussit, le dossier est portable et les controles d'archive et de retention sont explicites."],
      ["Etape 6", "reports/<id>/compliance/*", "Packager UE", "La verification UE reussit, les brouillons d'instructions, de registre de risques, de QMS-lite et de plan de surveillance sont presents et les ecarts residuels restent explicites."],
      ["Etape 7", "review/review-decision.json + review/handoff-note.md + corrective-action-register.json", "Brouillon de revue + humain", "`review:check` reussit avec une decision nommee, sans TODO, sans ecarts machine ouverts, avec une continuite des actions correctives synchronisee et les champs UE completes quand applicable."],
    ],
    readinessChecklist: [
      "Je peux decrire la finalite prevue de mon systeme d'IA en une phrase.",
      "Je sais quels outils, API ou sources de retrieval l'agent utilise.",
      "J'ai documente au moins 20 scenarios utilisateurs reels ou cas operationnels.",
      "Je peux produire des versions baseline et new dans un environnement comparable.",
      "J'ai un responsable nomme pour les decisions de release ou de gouvernance.",
      "Je sais si j'ai besoin seulement de preuves techniques ou aussi de sorties de dossier UE.",
    ],
    readinessBands: [
      ["0-2", "Necessite une aide de cadrage avant qu'un mode autonome ou un pack de lancement soit efficace."],
      ["3-4", "Bon candidat pour le pack de lancement: le workflow coeur existe mais doit etre structure."],
      ["5-6", "Bon candidat pour le mode autonome ou le support enterprise: l'equipe est prete sur le plan operationnel."],
    ],
    maturityRows: [
      ["L0", "Aucune preuve", "\"Ca marche sur ma machine\" et aucune trace de revue durable."],
      ["L1", "Tests ad hoc", "Des checks manuels existent, mais les artefacts sont incoherents ou non portables."],
      ["L2", "Cas structures", "`cases.json` existe et l'equipe peut lancer des checks repetables."],
      ["L3", "Preuves verifiees", "Le bundle portable passe les verifications d'integrite et de portabilite."],
      ["L4", "Preuve gouvernee", "Runs recurrents, detection de derive et revue humaine nommee existent."],
      ["L5", "Pret pour audit", "Exports de dossier UE, correspondance de couverture et transmission gouvernee sont en place."],
    ],
    triggerRows: [
      ["Changement de version de modele", "Relancer les etapes 4-7."],
      ["Changement de prompt ou de set d'outils", "Relancer en general les etapes 2-7."],
      ["Nouveau contexte de deploiement ou nouveau marche", "Relancer les etapes 0-7."],
      ["Surveillance nocturne de derive", "Automatiser les etapes 4-6 et escalader l'etape 7 quand les controles se declenchent."],
      ["Mise a jour du mapping EU AI Act ou des standards", "Relancer les etapes 6-7."],
    ],
    supportRows: [
      ["OSS en autonomie", "Equipes capables de cadrer, integrer et operer le workflow seules.", "Pas d'aide au setup, pas de perimetre dedie pour agent pris en charge, pas d'onboarding fait pour vous."],
      ["Pack de lancement", "Un agent pris en charge ayant besoin du premier setup et d'un premier dossier serieux.", "Pas d'ecriture de cas illimitee, pas de redaction legale complete, pas d'implementation multi-agent."],
      ["Support mensuel", "Agents pris en charge ayant deja passe l'onboarding et ayant maintenant besoin d'aide recurrente.", "Pas de setup entierement fait pour chaque nouvel agent sauf si perimetre separe."],
    ],
    failureCards: [
      ["Cas faibles", "Des cas critiques utilisent des blocs `expected` vides ou faibles, si bien que le dossier parait vert mais prouve tres peu."],
      ["Adapter trop superficiel", "L'endpoint renvoie le texte final mais pas la profondeur de telemetrie requise pour la preuve de type outil, trace ou hypotheses."],
      ["Runs non comparables", "Baseline et new ont ete executes avec des environnements, budgets ou suites de cas incomplets differents, ce qui rend le diff trompeur."],
      ["Narratif sans preuve", "Le dossier revendique supervision, journalisation ou robustesse, mais il ne contient pas les artefacts correspondants."],
    ],
    intakeArtifacts: [
      "`system-scope.json` pour le perimetre du systeme, les responsables, le contexte de deploiement et les preferences de preuve",
      "`quality-contract.json` pour les taches critiques, comportements interdits, actions risquee et objectifs de cas",
      "`cases-coverage.json` pour une couverture persistante entre intake et cas apres verification de la suite revue",
      "`adapter-capability.json` pour la profondeur de telemetrie prouvee et les limites de preuve de l'adapter live",
      "`run-fingerprint.json` pour la comparabilite structurelle, les indices d'environnement et la visibilite des signaux manquants avant assemblage",
      "`archive/retention-controls.json` pour les reglages de retention observes, les chemins d'archive requis et les decisions d'archive restant a la charge de l'operateur",
      "`corrective-action-register.json` pour la continuite recurrente des ecarts a travers les cycles de revue",
      "Brouillon `cases/<profile>.intake-scaffold.json` comme point de depart revu par un humain",
    ],
    reviewArtifacts: [
      "`review/review-decision.json` pour la decision structuree du responsable, les actions sur les ecarts residuels et les enregistrements d'achevement des brouillons UE",
      "`review/handoff-note.md` pour le resume narratif de transmission",
      "`authority-response/authority-response-bundle.json` pour assembler a la demande un dossier destine au conseil ou a l'autorite",
      "Snapshot optionnel `review/intake/*` quand la revue est reliee au contrat d'intake, y compris les artefacts de continuite quand ils sont disponibles",
    ],
    reviewChecks: [
      "Le statut de decision ne doit pas rester `pending`.",
      "Aucun placeholder `TODO` ne doit rester dans la trace de revue ou la note de transmission.",
      "Chaque ecart residuel derive par machine doit avoir un responsable, une disposition et une note.",
      "La continuite recurrente des actions correctives doit rester coherente et etre resynchronisee vers l'intake quand les checks de revue reussissent.",
      "Les dossiers UE doivent terminer la boucle de completion des Articles 13, 17, 72 et 73 avant que la transmission soit prete.",
      "Les approvals avec des machine gaps de severite block exigent des overrides explicites.",
      "Les demandes de revue juridique exigent une raison explicite avant que la transmission soit prete.",
    ],
    humanOwnedRows: [
      ["Finalite prevue", "La finalite et la frontiere du systeme restent definies par le responsable."],
      ["Dommages metier", "Le cadrage de l'impact et du risque residuel reste du cote de l'operateur."],
      ["Politique d'approbation / de blocage", "Le toolkit ne peut pas choisir les seuils de gouvernance pour l'equipe."],
      ["Narratif final et validation", "La mise en production, la conformite et l'approbation juridique restent humaines."],
    ],
  },
};

function getTechnicalShared(locale) {
  return locale === "en" ? TECHNICAL_SHARED : { ...TECHNICAL_SHARED, ...(TECHNICAL_SHARED_I18N[locale] || {}) };
}

const TECHNICAL_PAGE = {
  en: {
    title: "Technology and evidence architecture | EU AI Evidence Builder",
    description:
      "Architecture, verification model, artifact contracts, and trust boundary behind the EU AI Evidence Builder.",
    eyebrow: "Technology",
    headline: "How the evidence engine works",
    intro:
      "Inspect the architecture, verification model, artifact contracts, trust boundary, and sector-layering model behind the evidence dossier.",
    credibilityEyebrow: "Core primitives",
    credibilityTitle: "Core technical primitives",
    credibilityLead:
      "The system is built around verified evidence artifacts, not around dashboards or document-only workflows.",
    credibilityCards: [
      {
        title: "Comparable runs",
        text: "Baseline and new runs are first-class inputs, so evidence is tied to a real change boundary rather than a one-off trace.",
      },
      {
        title: "Contract artifacts",
        text: "The evaluator emits stable machine contracts and review artifacts instead of only an interactive UI surface.",
      },
      {
        title: "Integrity verification",
        text: "Manifests, schema checks, and verify commands turn the output into something another reviewer can validate offline.",
      },
      {
        title: "Review-ready handoff",
        text: "Review records, retention controls, and authority packaging sit on the same artifact model as runtime evidence.",
      },
      {
        title: "Sector overlays",
        text: "Domain case libraries, scanners, and vertical exports can sit above the same core as long as the object under review remains a tool-using agent.",
      },
    ],
    summaryTitle: "What this technology actually does",
    summaryLead:
      "The product turns comparable runs into a verified evidence dossier, adds review and handoff structure, supports sector-specific layers above the same core, and keeps legal and policy ownership outside the automation layer.",
    summaryColumns: [
      {
        title: "Evidence generation",
        points: [
          "Comparable baseline and new runs become a portable evidence bundle",
          "The bundle includes a report, machine contract, manifest, and retention controls",
          "EU dossier-facing exports attach to the same verified runtime evidence",
        ],
      },
      {
        title: "Verification and gates",
        points: [
          "Packaging and verify are explicit steps, not implicit dashboard output",
          "Review checks and authority packaging have hard prerequisites",
          "Strict mode can verify a signed manifest when authority-facing authenticity matters",
        ],
      },
      {
        title: "Review and handoff",
        points: [
          "The package can move across engineering, governance, counsel, and authority-facing review",
          "Review records, handoff notes, and authority bundles are part of the product surface",
          "The goal is a package another reviewer can inspect without internal dashboards or unsigned file swaps",
        ],
      },
      {
        title: "Honest boundary",
        points: [
          "The product does not decide legal classification or sign-off",
          "Policy thresholds and residual-risk judgments still belong to named humans",
          "The strength of the system is evidence operations, not legal automation",
        ],
      },
    ],
    compactWorkflowTitle: "How the technology works",
    compactWorkflowLead:
      "At a high level, the stack connects runtime evidence, strict verification, signed-manifest authenticity when needed, review records, and handoff packaging into one self-hosted workflow. Sector-specific case libraries, scanners, and vertical outputs can extend the same core when the object under review is still a tool-using agent.",
    compactWorkflowSteps: [
      "The agent is exercised through checked adapters and comparable baseline/new runs.",
      "The evaluator packages a portable evidence bundle and verifies integrity and structure.",
      "EU dossier exports, review records, and retention controls attach to the same verified bundle.",
      "When needed, the workflow can produce a scoped authority-facing package from the verified report.",
    ],
    commandsTitle: "Command surface",
    commandsLead: "These commands correspond to the real packaging, signing, verify, review, and authority steps in the live product.",
    artifactsSummaryTitle: "What must exist if the workflow is healthy",
    artifactsSummaryLead: "Judge the product by durable artifacts and explicit gates, not by screenshots or narrative alone.",
    screenshotTitle: "What the verified bundle looks like",
    screenshotBody: "This is the kind of package the technical path should produce before anyone asks governance or counsel to review it.",
    extendedTitle: "Need deeper technical detail?",
    extendedBody:
      "Deep dives, readiness scoring, re-run triggers, support scope, and the longer technical notes are available on the holding page.",
    extendedButton: "Open extended notes",
    opsButton: "Open operational model",
    proofButton: "Open live evidence",
    docsButton: "Open OSS docs",
    quickstartTitle: "Fastest way to test this on your own agent",
    quickstartLead:
      "If the adapter is already running, quickstart gives you a portable starter pack without pretending that it already understands your real qualification scope.",
    quickstartCommand: "npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud",
    quickstartColumns: [
      {
        title: "What it proves",
        points: [
          "The toolkit can reach your adapter and execute the starter smoke path.",
          "A portable report can be packaged and verified on your infrastructure.",
          "The bridge from demo to your own agent is real, not a sales-only promise.",
        ],
      },
      {
        title: "What it does not prove",
        points: [
          "It does not establish meaningful production case coverage.",
          "It does not replace real identity metadata or a reviewed intake contract.",
          "It does not count as full qualification or compliance readiness.",
        ],
      },
    ],
    quickstartButton: "Open quickstart guide",
    planningTitle: "Time to first evidence",
    planningNote: "Planning estimates, not delivery guarantees.",
    estimates: [
      ["Self-serve first setup", "3-4 weeks"],
      ["Launch Pack first verified package", "5 business days"],
      ["Recurring release after onboarding", "1-2 days"],
      ["Monthly support scope", "Supported agents only"],
    ],
    workflowTitle: "What actually happens",
    intakeTitle: "Structured intake layer",
    intakeLead: "Automate the upstream contract before case authoring and adapter work starts.",
    intakeHumanTitle: "What still stays human-owned",
    boundaryTitle: "Automation boundary",
    boundaryBody:
      "The strongest part of the product is the path from prepared inputs to a verified evidence bundle. Scope judgment, policy thresholds, adapter-depth decisions, and final sign-off still stay with named humans.",
    artifactsTitle: "Artifacts and ready gates",
    artifactsLead: "These are the artifacts technical teams should expect to exist if the workflow is healthy.",
    reviewTitle: "Structured review handoff",
    reviewLead: "Stage 7 is still human-owned, but it is no longer an unstructured email or ticket comment.",
    reviewChecksTitle: "What the handoff gate enforces",
    readinessTitle: "Readiness self-assessment",
    readinessLead: "Use this before choosing self-serve, Launch Pack, or enterprise support.",
    readinessScoreTitle: "How to read the score",
    maturityTitle: "Evidence maturity model",
    maturityLead: "This is the fastest way to explain where a team is now and what level the next engagement should target.",
    triggersTitle: "When evidence should be re-run",
    supportTitle: "What each engagement layer actually covers",
    failureTitle: "Common failure modes",
    landingTitle: "Need the technology page?",
    landingBody:
      "Open the architecture, verification model, artifact contracts, and trust boundary behind the evidence engine.",
    landingButton: "Open technology page",
  },
  de: {
    title: "Technologie und Nachweisarchitektur | EU AI Evidence Builder",
    description:
      "Architektur, Verifikationsmodell, Artefakt-Vertraege und Vertrauensgrenze des EU AI Evidence Builder ansehen.",
    eyebrow: "Technologie",
    headline: "Wie die Nachweis-Engine funktioniert",
    intro:
      "Hier geht es um Architektur, Verifikationsmodell, Artefakt-Vertraege, Vertrauensgrenze und das Modell sektoraler Schichten hinter dem Nachweispaket.",
    credibilityEyebrow: "Kernprimitive",
    credibilityTitle: "Kernprimitive der Technologie",
    credibilityLead:
      "Das System ist um verifizierte Nachweis-Artefakte herum gebaut, nicht um Dashboards oder reine Dokument-Workflows.",
    credibilityCards: [
      {
        title: "Vergleichbare Runs",
        text: "Baseline- und New-Runs sind zentrale Eingaben, sodass Nachweise an eine echte Aenderungsgrenze gebunden sind.",
      },
      {
        title: "Contract-Artefakte",
        text: "Der Evaluator erzeugt stabile Maschinenvertraege und Pruefartefakte statt nur einer interaktiven Oberflaeche.",
      },
      {
        title: "Integritaets-Verifikation",
        text: "Manifest, Schema-Checks und Verify-Befehle machen das Ergebnis offline pruefbar.",
      },
      {
        title: "Prueffertige Uebergabe",
        text: "Pruefprotokolle, Aufbewahrungskontrollen und Behoerdenpakete liegen auf demselben Artefaktmodell wie die Laufzeit-Nachweise.",
      },
      {
        title: "Sektorielle Aufsaetze",
        text: "Domain-Cases, Scanner und vertikale Exporte koennen auf demselben Kern aufsetzen, solange das Objekt der Pruefung ein tool-nutzender Agent bleibt.",
      },
    ],
    summaryTitle: "Was diese Technologie tatsaechlich leistet",
    summaryLead:
      "Das Produkt macht aus vergleichbaren Runs ein verifiziertes Nachweispaket, fuegt Pruef- und Uebergabe-Struktur hinzu, erlaubt sektorielle Schichten ueber demselben Kern und laesst rechtliche sowie Policy-Verantwortung ausserhalb der Automatisierung.",
    summaryColumns: [
      {
        title: "Nachweiserzeugung",
        points: [
          "Vergleichbare Baseline- und New-Runs werden zu einem portablen Nachweispaket",
          "Das Paket enthaelt Report, Maschinenvertrag, Manifest und Aufbewahrungskontrollen",
          "EU-Dossier-nahe Exporte haengen an denselben verifizierten Runtime-Nachweisen",
        ],
      },
      {
        title: "Verifikation und Kontrollpunkte",
        points: [
          "Paketierung und Verifikation sind explizite Schritte, kein implizites Dashboard-Ergebnis",
          "Pruefschritte und Behoerdenpakete haben harte Voraussetzungen",
          "Im Strict-Modus kann ein signiertes Manifest verifiziert werden, wenn fuer Behoerdenpfade Authentizitaet wichtig ist",
        ],
      },
      {
        title: "Pruefung und Uebergabe",
        points: [
          "Das Paket kann zwischen Engineering, Governance, Rechtsberatung und behoerdlicher Pruefung uebergeben werden",
          "Pruefprotokolle, Uebergabe-Notizen und Behoerdenpakete sind Teil der Produktoberflaeche",
          "Ziel ist ein Paket, das ohne interne Dashboards oder unsignierte Dateitausche geprueft werden kann",
        ],
      },
      {
        title: "Ehrliche Grenze",
        points: [
          "Das Produkt entscheidet keine Rechtsklassifizierung und kein Signoff",
          "Leitlinien-Schwellen und Urteile zum Rest-Risiko bleiben bei benannten Menschen",
          "Die Staerke des Systems liegt in Nachweisprozessen, nicht in Rechtsautomatisierung",
        ],
      },
    ],
    compactWorkflowTitle: "Wie die Technologie funktioniert",
    compactWorkflowLead:
      "Auf hoher Ebene verbindet der Stack Laufzeit-Nachweise, strikte Verifikation, Manifest-Authentizitaet bei Bedarf, Pruefprotokolle und Uebergabe-Paketierung zu einem bei Ihnen gehosteten Workflow. Sektorielle Case-Bibliotheken, Scanner und vertikale Exporte koennen denselben Kern erweitern, solange weiter ein tool-nutzender Agent geprueft wird.",
    compactWorkflowSteps: [
      "Der Agent wird ueber gepruefte Adapter und vergleichbare Baseline/New-Runs ausgefuehrt.",
      "Der Evaluator paketiert ein portables Nachweispaket und verifiziert Integritaet und Struktur.",
      "EU-Dossier-Exporte, Pruefprotokolle und Aufbewahrungskontrollen haengen an demselben verifizierten Paket.",
      "Bei Bedarf kann daraus ein scoped Authority-Paket erzeugt werden.",
    ],
    commandsTitle: "Befehlsoberflaeche",
    commandsLead: "Diese Befehle entsprechen echten Schritten fuer Paketierung, Signatur, Verifikation, Pruefung und Behoerdenpfad im Live-Produkt.",
    artifactsSummaryTitle: "Was bei gesundem Workflow existieren muss",
    artifactsSummaryLead: "Technische Teams sollten das Produkt an dauerhaften Artefakten und expliziten Verifikationsschritten messen, nicht nur an Screenshots oder Narrativ.",
    screenshotTitle: "Wie das verifizierte Paket aussieht",
    screenshotBody: "So sollte das Paket aussehen, bevor Governance oder Rechtsberatung ueberhaupt in die Pruefung einsteigen.",
    extendedTitle: "Mehr technische Details noetig?",
    extendedBody:
      "Vertiefungen, Readiness-Bewertung, Trigger fuer neue Laeufe, Support-Umfang und laengere technische Notizen liegen auf der Holding-Seite.",
    extendedButton: "Erweiterte Notizen oeffnen",
    opsButton: "Operational Model öffnen",
    proofButton: "Live-Nachweise oeffnen",
    docsButton: "OSS-Dokumentation oeffnen",
    quickstartTitle: "Schnellster Weg zum Test am eigenen Agenten",
    quickstartLead:
      "Wenn der Adapter bereits laeuft, liefert der Schnellstart ein portables Starter-Paket, ohne so zu tun, als kenne es schon Ihren echten Qualifikationsrahmen.",
    quickstartCommand: "npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud",
    quickstartColumns: [
      {
        title: "Was es beweist",
        points: [
          "Das Toolkit erreicht Ihren Adapter und fuehrt den Starter-Smoke-Pfad aus.",
          "Ein portabler Report kann in Ihrer Umgebung paketiert und verifiziert werden.",
          "Die Bruecke von der Demo zum eigenen Agenten ist real und nicht nur Marketing-Sprache.",
        ],
      },
      {
        title: "Was es nicht beweist",
        points: [
          "Es beweist keine sinnvolle Abdeckung produktiver Testfaelle.",
          "Es ersetzt weder echte Identitaets-Metadaten noch einen geprueften Intake-Vertrag.",
          "Es ist weder volle Qualifikation noch belastbarer Compliance-Status.",
        ],
      },
    ],
    quickstartButton: "Leitfaden zum Schnellstart oeffnen",
    planningTitle: "Zeit bis zum ersten Nachweis",
    planningNote: "Planungswerte, keine harten Lieferzusagen.",
    estimates: [
      ["Erstsetup im Selbstbetrieb", "3-4 Wochen"],
      ["Startpaket bis zum ersten verifizierten Paket", "5 Arbeitstage"],
      ["Wiederkehrende Inbetriebnahme nach Onboarding", "1-2 Tage"],
      ["Monatlicher Support", "Nur betreute Agenten"],
    ],
    workflowTitle: "Was technisch wirklich passiert",
    intakeTitle: "Strukturierte Intake-Schicht",
    intakeLead: "Den Upstream-Vertrag automatisieren, bevor Cases und Adapter-Arbeit starten.",
    intakeHumanTitle: "Was menschlich gefuehrt bleibt",
    boundaryTitle: "Automationsgrenze",
    boundaryBody:
      "Der staerkste Teil des Produkts ist der Weg von vorbereiteten Eingaben zu einem verifizierten Nachweispaket. Urteile ueber Systemgrenze, Leitlinien-Schwellen, Adapter-Tiefe und finale Freigabe bleiben bei benannten Menschen.",
    artifactsTitle: "Artefakte und Freigabe-Kontrollpunkte",
    artifactsLead: "Diese Artefakte sollten existieren, wenn der Workflow technisch gesund ist.",
    reviewTitle: "Strukturierte Pruefuebergabe",
    reviewLead: "Stage 7 bleibt menschlich gefuehrt, ist aber nicht mehr nur eine unstrukturierte Mail oder Ticket-Notiz.",
    reviewChecksTitle: "Was der Uebergabe-Kontrollpunkt erzwingt",
    readinessTitle: "Readiness-Selbsteinschaetzung",
    readinessLead: "Nutzen Sie diese Liste vor Selbstbetrieb, Startpaket oder monatlichem Support.",
    readinessScoreTitle: "So lesen Sie den Score",
    maturityTitle: "Nachweis-Reifegradmodell",
    maturityLead: "Damit laesst sich der aktuelle Reifegrad eines Teams sehr schnell einordnen.",
    triggersTitle: "Wann Nachweise neu erzeugt werden sollten",
    supportTitle: "Was die einzelnen Engagement-Layer wirklich abdecken",
    failureTitle: "Haeufige Ausfallmuster",
    landingTitle: "Brauchen Sie die Technologie-Seite?",
    landingBody:
      "Oeffnen Sie Architektur, Verifikationsmodell, Artefakt-Vertraege und Vertrauensgrenze hinter der Nachweis-Engine.",
    landingButton: "Technologie-Seite oeffnen",
  },
  fr: {
    title: "Technologie et architecture de preuve | EU AI Evidence Builder",
    description:
      "Architecture, modele de verification, contrats d'artefacts et frontiere de confiance du EU AI Evidence Builder.",
    eyebrow: "Technologie",
    headline: "Comment fonctionne le moteur de preuve",
    intro:
      "Inspectez l'architecture, le modele de verification, les contrats d'artefacts, la frontiere de confiance et la logique de couches sectorielles derriere le dossier de preuve.",
    credibilityEyebrow: "Primitives centrales",
    credibilityTitle: "Primitives techniques centrales",
    credibilityLead:
      "Le systeme est construit autour d'artefacts de preuve verifies, pas autour de tableaux de bord ou de documents seuls.",
    credibilityCards: [
      {
        title: "Runs comparables",
        text: "Les runs baseline et new sont des inputs de premier niveau, afin que l'evidence soit liee a une vraie frontiere de changement.",
      },
      {
        title: "Artefacts contractuels",
        text: "L'evaluator emet des contrats machine et des artefacts de revue stables, pas seulement une interface interactive.",
      },
      {
        title: "Verification d'integrite",
        text: "Manifest, controles de schema et commandes de verification rendent le resultat verifiable hors ligne.",
      },
      {
        title: "Transmission prete pour la revue",
        text: "Les traces de revue, controles de retention et la preparation pour une autorite reposent sur le meme modele d'artefacts que les preuves d'execution.",
      },
      {
        title: "Couches sectorielles",
        text: "Des bibliotheques de cas, scanners et exports verticaux peuvent se poser sur le meme noyau tant que l'objet evalue reste un agent utilisant des outils.",
      },
    ],
    summaryTitle: "Ce que cette technologie fait reellement",
    summaryLead:
      "Le produit transforme des runs comparables en dossier de preuve verifie, ajoute une structure de revue et de transmission, permet des couches sectorielles au-dessus du meme noyau, et laisse la responsabilite legale et de politique hors de la couche d'automatisation.",
    summaryColumns: [
      {
        title: "Generation de preuve",
        points: [
          "Des runs baseline/new comparables deviennent un dossier de preuve portable",
          "Le dossier inclut rapport, contrat machine, manifest et controles de retention",
          "Les exports dossier UE s'attachent aux memes preuves d'execution verifiees",
        ],
      },
      {
        title: "Verification et controles",
        points: [
          "La mise en forme et la verification sont des etapes explicites, pas un simple resultat de tableau de bord",
          "Les controles de revue et la preparation pour autorite ont des prerequis stricts",
          "Le mode strict peut verifier un manifeste signe quand l'authenticite compte pour un dossier tourne vers l'autorite",
        ],
      },
      {
        title: "Revue et transmission",
        points: [
          "Le dossier peut circuler entre ingenierie, gouvernance, conseil juridique et revue tournee vers l'autorite",
          "Les traces de revue, notes de transmission et dossiers pour autorite font partie du produit",
          "Le but est un dossier qu'un autre evaluateur peut inspecter sans tableaux de bord internes ni echanges de fichiers non signes",
        ],
      },
      {
        title: "Frontiere honnete",
        points: [
          "Le produit ne decide pas la classification legale ni la validation finale",
          "Les seuils de politique et les jugements sur le risque residuel restent humains",
          "La force du systeme est dans l'operation de preuve, pas dans l'automatisation juridique",
        ],
      },
    ],
    compactWorkflowTitle: "Comment la technologie fonctionne",
    compactWorkflowLead:
      "A haut niveau, le systeme relie les preuves d'execution, la verification stricte, l'authenticite par manifeste signe quand il le faut, les traces de revue et la mise en forme de transmission dans un workflow heberge chez vous. Des bibliotheques de cas, scanners et sorties verticales sectorielles peuvent etendre ce noyau tant que l'objet evalue reste un agent utilisant des outils.",
    compactWorkflowSteps: [
      "L'agent est exerce via des adapters controles et des runs baseline/new comparables.",
      "L'evaluator assemble un dossier de preuve portable et verifie son integrite et sa structure.",
      "Les exports dossier UE, traces de revue et controles de retention s'attachent au meme dossier verifie.",
      "Si necessaire, un dossier cible pour une autorite peut etre produit a partir du rapport verifie.",
    ],
    commandsTitle: "Surface de commande",
    commandsLead: "Ces commandes correspondent aux vraies etapes de mise en forme, signature, verification, revue et preparation pour une autorite dans le produit live.",
    artifactsSummaryTitle: "Ce qui doit exister si le workflow est sain",
    artifactsSummaryLead: "Les equipes techniques doivent juger le produit a ses artefacts durables et a ses verrous explicites, pas seulement a des captures ou a du narratif.",
    screenshotTitle: "A quoi ressemble le dossier verifie",
    screenshotBody: "C'est le type de dossier que le chemin technique doit produire avant qu'une revue de gouvernance ou de conseil juridique commence.",
    extendedTitle: "Besoin de plus de details techniques ?",
    extendedBody:
      "Les analyses detaillees, la mesure de readiness, les declencheurs de nouveau run, le perimetre du support et les notes techniques plus longues sont disponibles sur la holding page.",
    extendedButton: "Ouvrir les notes detaillees",
    opsButton: "Ouvrir l'operating model",
    proofButton: "Ouvrir la preuve live",
    docsButton: "Ouvrir les docs OSS",
    quickstartTitle: "La facon la plus rapide de tester cela sur votre propre agent",
    quickstartLead:
      "Si l'adapter tourne deja, le demarrage rapide produit un premier dossier portable sans pretendre comprendre deja votre vrai perimetre de qualification.",
    quickstartCommand: "npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud",
    quickstartColumns: [
      {
        title: "Ce que cela prouve",
        points: [
          "Le toolkit atteint votre adapter et execute le chemin smoke de demarrage.",
          "Un rapport portable peut etre produit et verifie dans votre environnement.",
          "Le pont entre la demo et votre propre agent est reel, pas seulement un message commercial.",
        ],
      },
      {
        title: "Ce que cela ne prouve pas",
        points: [
          "Cela ne prouve pas une couverture de cas de production suffisante.",
          "Cela ne remplace ni les vraies metadonnees d'identite ni un intake contract revu.",
          "Cela ne vaut ni qualification complete ni niveau de conformite etabli.",
        ],
      },
    ],
    quickstartButton: "Ouvrir le guide de demarrage rapide",
    planningTitle: "Temps jusqu'a la premiere preuve",
    planningNote: "Estimations de planification, pas garanties de livraison.",
    estimates: [
      ["Premier setup en autonomie", "3-4 semaines"],
      ["Pack de lancement jusqu'au premier dossier verifie", "5 jours ouvrables"],
      ["Mise en production recurrente apres onboarding", "1-2 jours"],
      ["Support enterprise", "Scope apres onboarding"],
    ],
    workflowTitle: "Ce qui se passe vraiment",
    intakeTitle: "Couche d'intake structuree",
    intakeLead: "Automatiser le contrat amont avant la creation des cas et le travail d'adapter.",
    intakeHumanTitle: "Ce qui reste humain",
    boundaryTitle: "Frontiere d'automatisation",
    boundaryBody:
      "La partie la plus forte du produit est le chemin entre des entrees preparees et un dossier de preuve verifie. Le jugement sur le perimetre, les seuils de politique, la profondeur de l'adapter et la validation finale restent humains.",
    artifactsTitle: "Artefacts et verrous de disponibilite",
    artifactsLead: "Voila les artefacts qu'une equipe technique devrait voir quand le workflow est sain.",
    reviewTitle: "Transmission de revue structuree",
    reviewLead: "L'etape 7 reste humaine, mais ce n'est plus un simple email ou commentaire de ticket non structure.",
    reviewChecksTitle: "Ce que le verrou de transmission impose",
    readinessTitle: "Auto-evaluation de readiness",
    readinessLead: "Utilisez cette liste avant de choisir l'autonomie, le pack de lancement ou le support enterprise.",
    readinessScoreTitle: "Comment lire le score",
    maturityTitle: "Modele de maturite de preuve",
    maturityLead: "C'est la facon la plus rapide de situer le niveau de maturite actuel d'une equipe.",
    triggersTitle: "Quand il faut regenerer la preuve",
    supportTitle: "Ce que couvre vraiment chaque couche d'engagement",
    failureTitle: "Modes de defaillance frequents",
    landingTitle: "Besoin de la page technologie ?",
    landingBody:
      "Ouvrez l'architecture, le modele de verification, les contrats d'artefacts et la frontiere de confiance derriere le moteur de preuve.",
    landingButton: "Ouvrir la page technologie",
  },
};

const TECHNICAL_CASES = {
  en: {
    eyebrow: "Stage deep dive",
    title: "1. cases.json",
    intro:
      "This is usually the first real bottleneck. A case suite is not a prompt list. It is the machine-readable expression of what the agent must do and how the team will know it did it correctly.",
    goalTitle: "Goal",
    goalBody:
      "Formalize expected agent behavior and define how correctness, escalation, and failure will be checked later in the bundle.",
    inputTitle: "Minimum input",
    inputBody:
      "A JSON array of case objects. `id` is required. Most quality-grade cases also include `title`, `input.user`, optional `input.context`, `expected`, and `metadata`.",
    prepTitle: "How to prepare it",
    prepBody:
      "Build representative operational scenarios: normal, boundary, risky, refusal, tool-using, ambiguous, retry-sensitive, and handoff cases. Do not copy the demo suite and treat it as production-ready.",
    qualityTitle: "What quality looks like",
    qualityLead:
      "A strong case does not leave `expected` empty. Quality suites should use strong expectation signals, not only generic prompts.",
    strongSignalsTitle: "Strong expectation signals",
    strongSignals: [
      "`json_schema` for structure-sensitive outputs",
      "`tool_required` and `tool_sequence` for tool-use correctness",
      "`must_include` and `must_not_include` for explicit lexical constraints",
      "`action_required` and `evidence_required_for_actions` for risky actions",
      "`semantic.*` for concept-level text evaluation",
      "`assumption_state` for decision legibility",
    ],
    metricsTitle: "Recommended case-suite metrics",
    metricsLead: "Recommended targets for quality campaigns. These are operating targets, not all hard-enforced by code today.",
    metricsRows: [
      ["Specificity", "% of cases with non-empty, meaningful `expected` blocks", "Target: >= 70%"],
      ["Negative coverage", "% of cases that should fail, escalate, or block", "Target: >= 30%"],
      ["Weak expected rate", "Cases that only carry weak or empty expectations", "Stay below validator threshold, commonly <= 20%"],
      ["Semantic depth", "Text cases using `expected.semantic.*`, not only lexical checks", "Increase over time for mature suites"],
      ["Minimum count", "Meaningful cases before pass_rate becomes management-useful", "Start at >= 20"],
    ],
    readyTitle: "Ready gate",
    readyItems: [
      "The file parses cleanly and ids are stable and unique.",
      "Critical scenarios from the quality contract are covered.",
      "Negative and risky cases exist, not only happy path.",
      "The intake completeness gate passes against the reviewed suite and writes `cases-coverage.json`.",
      "The quality validator passes under the chosen profile.",
      "The suite reflects the real tool and risk perimeter of the agent.",
    ],
    failureTitle: "Common failure modes",
    failureItems: [
      "Critical cases have empty `expected` blocks, so the bundle looks green while proving very little.",
      "The suite is copied from demo or smoke examples and does not reflect real agent behavior.",
      "No negative cases exist, so unsafe or refusal behavior is never exercised.",
      "The suite is never updated after tool, model, or prompt changes, so drift goes unseen.",
    ],
    boundaryTitle: "Where automation stops",
    boundaryBody:
      "The toolkit can validate file shape and some quality properties. It cannot decide which business risks, workflows, and escalation paths matter for this specific agent.",
    sourcesTitle: "Reference implementation and examples",
    sources: [
      ["Contract type", "apps/runner/src/runnerTypes.ts"],
      ["Parser", "apps/runner/src/runnerCli.ts"],
      ["Intake completeness gate", "scripts/evidence-intake-check-cases.mjs"],
      ["Quality validator", "scripts/validate-cases-quality.mjs"],
      ["Strong reference suite", "cases/cases.json"],
      ["Weak smoke / infra example", "cases/agents/cli-agent.json"],
    ],
  },
  de: {
    eyebrow: "Detailblick auf die Stufe",
    title: "1. cases.json",
    intro:
      "Hier entscheidet sich oft die Qualitaet des gesamten Nachweis-Workflows. Eine Fall-Suite ist keine Prompt-Liste, sondern die maschinenlesbare Beschreibung des erwarteten Verhaltens.",
    goalTitle: "Ziel",
    goalBody:
      "Erwartetes Agent-Verhalten so formalisieren, dass spaeter Korrektheit, Eskalation und Fehlverhalten nachvollziehbar geprueft werden koennen.",
    inputTitle: "Minimaler Input",
    inputBody:
      "Ein JSON-Array aus Cases. `id` ist verpflichtend. Qualitativ starke Cases enthalten meist auch `title`, `input.user`, optional `input.context`, `expected` und `metadata`.",
    prepTitle: "Wie vorbereiten",
    prepBody:
      "Reale operationale Szenarien abbilden: normal, Grenzfall, riskant, verweigernd, mit Werkzeugnutzung, mehrdeutig, wiederholungssensitiv und uebergaberelevant. Demo-Cases nicht als produktionsreif behandeln.",
    qualityTitle: "Woran man Qualitaet erkennt",
    qualityLead:
      "Starke Cases lassen `expected` nicht leer. Quality-Suiten brauchen konkrete Erwartungssignale statt generischer Prompts.",
    strongSignalsTitle: "Starke Erwartungssignale",
    strongSignals: [
      "`json_schema` fuer strukturkritische Ergebnisse",
      "`tool_required` und `tool_sequence` fuer Tool-Korrektheit",
      "`must_include` und `must_not_include` fuer klare lexikale Regeln",
      "`action_required` und `evidence_required_for_actions` fuer riskante Aktionen",
      "`semantic.*` fuer konzeptuelle Textpruefung",
      "`assumption_state` fuer nachvollziehbare Entscheidungsgruende",
    ],
    metricsTitle: "Empfohlene Kennzahlen fuer die Fall-Suite",
    metricsLead: "Empfohlene Zielwerte fuer Quality-Kampagnen. Nicht alles wird heute schon hart im Code erzwungen.",
    metricsRows: [
      ["Spezifitaet", "% der Cases mit aussagekraeftigem `expected`", "Ziel: >= 70%"],
      ["Negativabdeckung", "% der Cases mit Fail/Eskalation/Block", "Ziel: >= 30%"],
      ["Schwache-Erwartungs-Quote", "Cases mit schwachen oder leeren Erwartungen", "Unter der Validator-Schwelle halten, oft <= 20%"],
      ["Semantische Tiefe", "Text-Cases mit `expected.semantic.*`", "Mit wachsender Reife erhoehen"],
      ["Mindestumfang", "Faelle, bevor pass_rate fuer Steuerung sinnvoll wird", "Start bei >= 20"],
    ],
    readyTitle: "Bereit fuer den naechsten Schritt",
    readyItems: [
      "Datei parst fehlerfrei und ids sind stabil und eindeutig.",
      "Kritische Szenarien aus dem Quality Contract sind abgedeckt.",
      "Negative und riskante Cases existieren, nicht nur Happy Path.",
      "Die Intake-Vollstaendigkeitspruefung besteht auf der ueberarbeiteten Suite.",
      "Der Qualitaetsvalidator besteht unter dem gewaehlten Profil.",
      "Die Suite passt zur realen Tool- und Risikooberflaeche des Agenten.",
    ],
    failureTitle: "Haeufige Fehlerbilder",
    failureItems: [
      "Kritische Cases haben leeres `expected`, dadurch sieht das Paket gruener aus als es ist.",
      "Die Suite stammt aus Demo- oder Smoke-Beispielen und passt nicht zum echten Agenten.",
      "Es gibt keine negativen Cases, deshalb wird unsicheres Verhalten nicht geprueft.",
      "Nach Modell-, Prompt- oder Tool-Aenderungen wird die Suite nicht aktualisiert.",
    ],
    boundaryTitle: "Wo die Automatik endet",
    boundaryBody:
      "Das Toolkit kann Dateiform und einige Qualitaetsmerkmale pruefen. Es kann nicht selbst bestimmen, welche Business-Risiken und Szenarien fuer diesen Agenten relevant sind.",
    sourcesTitle: "Referenzen im Code",
    sources: [
      ["Contract-Typ", "apps/runner/src/runnerTypes.ts"],
      ["Parser", "apps/runner/src/runnerCli.ts"],
      ["Intake-Vollstaendigkeits-Kontrollpunkt", "scripts/evidence-intake-check-cases.mjs"],
      ["Quality-Validator", "scripts/validate-cases-quality.mjs"],
      ["Starke Referenzsuite", "cases/cases.json"],
      ["Schwaches Smoke/Infra-Beispiel", "cases/agents/cli-agent.json"],
    ],
  },
  fr: {
    eyebrow: "Analyse detaillee de l'etape",
    title: "1. cases.json",
    intro:
      "C'est souvent le premier vrai goulot d'etranglement. Une suite de cas n'est pas une liste de prompts, mais l'expression lisible par machine du comportement attendu.",
    goalTitle: "Objectif",
    goalBody:
      "Formaliser le comportement attendu de l'agent pour que la correction, l'escalade et l'echec puissent ensuite etre verifies dans le dossier.",
    inputTitle: "Entree minimale",
    inputBody:
      "Un tableau JSON de cas. `id` est obligatoire. Les cas de qualite incluent souvent `title`, `input.user`, `input.context` optionnel, `expected` et `metadata`.",
    prepTitle: "Comment le preparer",
    prepBody:
      "Construire des scenarios operationnels representatifs : normaux, limites, risques, refus, usage d'outils, ambiguite, reprises et transmissions. Ne pas traiter les cas de demo comme une suite de production.",
    qualityTitle: "Ce qui ressemble a une suite de qualite",
    qualityLead:
      "Un bon cas ne laisse pas `expected` vide. Une vraie suite de qualite utilise des signaux d'attente forts, pas seulement des prompts generiques.",
    strongSignalsTitle: "Signaux d'attente forts",
    strongSignals: [
      "`json_schema` pour les sorties sensibles a la structure",
      "`tool_required` et `tool_sequence` pour la correction de l'usage des outils",
      "`must_include` et `must_not_include` pour les contraintes lexicales",
      "`action_required` et `evidence_required_for_actions` pour les actions risquees",
      "`semantic.*` pour l'evaluation conceptuelle du texte",
      "`assumption_state` pour la lisibilite des decisions",
    ],
    metricsTitle: "Indicateurs recommandes pour la suite",
    metricsLead: "Cibles de travail pour les campagnes quality. Tout n'est pas encore impose par le code.",
    metricsRows: [
      ["Specificite", "% de cas avec `expected` utile et non vide", "Cible : >= 70%"],
      ["Couverture negative", "% de cas devant echouer ou escalader", "Cible : >= 30%"],
      ["Taux d'attentes faibles", "Cas avec attentes faibles ou vides", "Rester sous le seuil du validateur, souvent <= 20%"],
      ["Profondeur semantique", "Cas texte utilisant `expected.semantic.*`", "Augmenter avec la maturite"],
      ["Minimum count", "Nombre de cas avant qu'un pass_rate soit vraiment utile", "Commencer a >= 20"],
    ],
    readyTitle: "Pret pour l'etape suivante",
    readyItems: [
      "Le fichier parse correctement et les ids sont stables et uniques.",
      "Les scenarios critiques du contrat de qualite sont couverts.",
      "Il existe des cas negatifs et risques, pas seulement des parcours favorables.",
      "Le controle de completude de l'intake passe sur la suite revue.",
      "Le validateur de qualite passe avec le profil choisi.",
      "La suite reflete le vrai perimetre des outils et des risques de l'agent.",
    ],
    failureTitle: "Modes de defaillance frequents",
    failureItems: [
      "Les cas critiques ont un `expected` vide, donc le dossier parait plus vert qu'il ne l'est.",
      "La suite est copiee depuis la demo ou le smoke et ne reflète pas le vrai agent.",
      "Aucun cas negatif n'existe, donc les comportements dangereux ne sont pas exerces.",
      "La suite n'est jamais mise a jour apres un changement de modele, prompt ou tool.",
    ],
    boundaryTitle: "Ou s'arrete l'automatisation",
    boundaryBody:
      "Le toolkit peut valider la forme du fichier et certaines proprietes de qualite. Il ne peut pas decider quels risques business et quels scenarios comptent pour cet agent precis.",
    sourcesTitle: "References dans le code",
    sources: [
      ["Type de contrat", "apps/runner/src/runnerTypes.ts"],
      ["Parser", "apps/runner/src/runnerCli.ts"],
      ["Controle de completude de l'intake", "scripts/evidence-intake-check-cases.mjs"],
      ["Quality validator", "scripts/validate-cases-quality.mjs"],
      ["Suite de reference forte", "cases/cases.json"],
      ["Exemple smoke/infra faible", "cases/agents/cli-agent.json"],
    ],
  },
};

const PLANS = [
  {
    key: "starter",
    name: { en: "FREE OSS", de: "FREE OSS", fr: "FREE OSS" },
    price: { en: "Free", de: "Kostenlos", fr: "Gratuit" },
    featured: false,
    items: {
      en: ["Unlimited self-serve evaluation", "Quickstart + OSS docs", "Builder + templates", "Live demos", "No setup help included"],
      de: ["Unbegrenzte Selbstbetrieb-Evaluierung", "Schnellstart + OSS-Dokumentation", "Dokumentations-Assistent + Vorlagen", "Live-Demos", "Keine Setup-Hilfe enthalten"],
      fr: ["Evaluation illimitee en autonomie", "Demarrage rapide + documentation OSS", "Assistant de documentation + modeles", "Demos live", "Sans aide au setup"],
    },
    note: {
      en: "Use the OSS repo on your own. No commercial support scope is attached.",
      de: "Sie nutzen das OSS-Repo selbst. Kein kommerzieller Support-Scope ist enthalten.",
      fr: "Vous utilisez seul le depot OSS. Aucun perimetre de support commercial n'est inclus.",
    },
    cta: { en: "Open OSS Docs", de: "OSS-Dokumentation oeffnen", fr: "Ouvrir la documentation OSS" },
    href: "docs",
  },
  {
    key: "launch-pack",
    name: { en: "LAUNCH PACK", de: "STARTPAKET", fr: "PACK DE LANCEMENT" },
    price: { en: "EUR499 one-time", de: "EUR499 einmalig", fr: "EUR499 en une fois" },
    featured: true,
    items: {
      en: [
        "1 supported agent",
        "Adapter fit check",
        "Help to reach the first real evidence pack",
        "Short results review + next-step handoff",
        "Built for activation, not for a long consulting engagement",
      ],
      de: [
        "1 unterstuetzter Agent",
        "Adapter-Fit-Check",
        "Hilfe bis zum ersten echten Nachweispaket",
        "Kurze Pruefung der Ergebnisse + naechster Schritt",
        "Gebaut fuer Aktivierung, nicht fuer langes Consulting",
      ],
      fr: [
        "1 agent supporte",
        "Verification du fit adapter",
        "Aide jusqu'au premier vrai dossier de preuve",
        "Revue courte des resultats + transmission pour la suite",
        "Concu pour l'activation, pas pour une longue mission de conseil",
      ],
    },
    note: {
      en: "One-time onboarding to first value on your own agent. This is the bridge between trying the repo and deciding to run the workflow continuously.",
      de: "Einmaliges Onboarding bis zum ersten echten Wert auf Ihrem eigenen Agenten. Das ist die Bruecke zwischen Repo ausprobieren und kontinuierlichem Einsatz.",
      fr: "Onboarding ponctuel jusqu'a la premiere vraie valeur sur votre propre agent. C'est le pont entre tester le depot et utiliser le workflow en continu.",
    },
    cta: { en: "Book Launch Pack", de: "Startpaket buchen", fr: "Reserver le pack de lancement" },
    href: "contact",
  },
  {
    key: "team",
    name: { en: "TEAM", de: "TEAM", fr: "TEAM" },
    price: {
      en: "EUR299/month billed annually",
      de: "EUR299/Monat bei Jahresabrechnung",
      fr: "EUR299/mois facture annuellement",
    },
    featured: false,
    items: {
      en: [
        "Up to 3 agents",
        "Self-hosted product use",
        "Updates and exports",
        "Async support",
        "For teams already running the workflow in-house",
      ],
      de: [
        "Bis zu 3 Agenten",
        "Produktnutzung bei Ihnen gehostet",
        "Updates und Exporte",
        "Asynchroner Support",
        "Fuer Teams, die den Workflow bereits intern nutzen",
      ],
      fr: [
        "Jusqu'a 3 agents",
        "Usage produit heberge chez vous",
        "Mises a jour et exports",
        "Support asynchrone",
        "Pour les equipes qui exploitent deja le workflow en interne",
      ],
    },
    note: {
      en: "This is the small-team operating tier. It is not sold as unlimited monthly custom implementation.",
      de: "Das ist die Betriebsstufe fuer kleine Teams. Sie wird nicht als unbegrenzte monatliche Sonderimplementierung verkauft.",
      fr: "C'est l'offre d'exploitation pour petites equipes. Elle n'est pas vendue comme une implementation sur mesure illimitee chaque mois.",
    },
    cta: { en: "Choose Team", de: "Team waehlen", fr: "Choisir Team" },
    href: "contact",
  },
  {
    key: "studio",
    name: { en: "STUDIO", de: "STUDIO", fr: "STUDIO" },
    price: {
      en: "EUR890/month billed annually",
      de: "EUR890/Monat bei Jahresabrechnung",
      fr: "EUR890/mois facture annuellement",
    },
    featured: false,
    items: {
      en: [
        "Up to 10 agents",
        "Priority support",
        "Stronger review and export assistance",
        "Better operating headroom than Team",
        "Discounted per-agent economics at larger volume",
      ],
      de: [
        "Bis zu 10 Agenten",
        "Priorisierter Support",
        "Staerkere Unterstuetzung fuer Pruefung und Export",
        "Mehr operativer Spielraum als Team",
        "Guenstigere Agenten-Oekonomie bei hoeherem Volumen",
      ],
      fr: [
        "Jusqu'a 10 agents",
        "Support prioritaire",
        "Aide plus forte pour revue et export",
        "Plus de marge operationnelle que Team",
        "Economies par agent plus favorables a plus grand volume",
      ],
    },
    note: {
      en: "This is the larger-team operating tier. Use it when the toolkit is already part of real operations across multiple agents.",
      de: "Das ist die Betriebsstufe fuer groessere Teams. Sie passt, wenn das Toolkit bereits Teil des realen Betriebs ueber mehrere Agenten ist.",
      fr: "C'est l'offre d'exploitation pour des equipes plus larges. Utilisez-la quand le toolkit fait deja partie des operations reelles sur plusieurs agents.",
    },
    cta: { en: "Choose Studio", de: "Studio waehlen", fr: "Choisir Studio" },
    href: "contact",
  },
  {
    key: "enterprise",
    name: { en: "ENTERPRISE", de: "ENTERPRISE", fr: "ENTERPRISE" },
    price: { en: "Custom", de: "Custom", fr: "Custom" },
    featured: false,
    items: {
      en: ["Multi-system implementation", "Conformity / external review support", "Dedicated export formatting", "Custom scope and SLA", "For teams whose support needs exceed Team or Studio"],
      de: [
        "Multi-System-Implementierung",
        "Unterstuetzung fuer Konformitaet / externe Pruefungen",
        "Dediziertes Exportformat",
        "Sonderumfang und SLA",
        "Fuer Teams, deren Supportbedarf ueber Team oder Studio hinausgeht",
      ],
      fr: [
        "Implementation multi-systeme",
        "Support conformite / revue externe",
        "Formatage d'export dedie",
        "Perimetre sur mesure et SLA",
        "Pour les equipes dont le besoin de support depasse Team ou Studio",
      ],
    },
    note: {
      en: "Use Enterprise when support has to survive procurement, external review, conformity pressure, or a broader multi-system rollout.",
      de: "Nutzen Sie Enterprise, wenn der Support Beschaffung, externe Pruefungen, Konformitaetsdruck oder einen breiteren Multi-System-Rollout abdecken muss.",
      fr: "Passez a Enterprise quand le support doit tenir face aux achats, a la revue externe, a la pression de conformite ou a un deploiement multi-systeme plus large.",
    },
    cta: { en: "Scope Enterprise", de: "Enterprise abstimmen", fr: "Definir Enterprise" },
    href: "contact",
  },
];

const PRICING_PREVIEW_ORDER = ["starter", "launch-pack", "team", "studio", "enterprise"];
const SUBSCRIPTION_PLAN_ORDER = ["starter", "launch-pack", "team", "studio", "enterprise"];

function localizePlanValue(value, locale) {
  if (typeof value === "string") return value;
  return value[locale] || value.en;
}

function getPlan(key) {
  return PLANS.find((plan) => plan.key === key);
}

function renderPlanCard(plan, locale, href, { fade = true } = {}) {
  const classes = ["pricing-card"];
  if (plan.featured) classes.push("is-featured");
  if (fade) classes.push("fade-up");
  const buttonClass = plan.featured ? "button" : "button-ghost";
  const note = plan.note ? localizePlanValue(plan.note, locale) : "";

  return `
    <article class="${classes.join(" ")}">
      <div>
        <p class="eyebrow">${escapeHtml(localizePlanValue(plan.name, locale))}</p>
        <p class="price">${escapeHtml(localizePlanValue(plan.price, locale))}</p>
        ${note ? `<p class="muted">${escapeHtml(note)}</p>` : ""}
      </div>
      <ul class="pricing-list">
        ${localizePlanValue(plan.items, locale)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}
      </ul>
      <a class="${buttonClass}" href="${href(plan.href)}" data-track-event="pricing_cta">${escapeHtml(
        localizePlanValue(plan.cta, locale)
      )}</a>
    </article>
  `;
}

const TEMPLATE_CONTENT = {
  "article-9": {
    title: {
      en: "EU AI Act Article 9 - Risk Management System Template",
      de: "EU KI-Verordnung Artikel 9 - Vorlage fuer Risikomanagement",
      fr: "Article 9 de l'AI Act - Modele de systeme de gestion des risques",
    },
    description: {
      en: "Free EU AI Act Article 9 template. Risk management system documentation with machine-verifiable evidence references.",
      de: "Kostenlose Vorlage fuer Artikel 9 mit technischer Nachweisstruktur.",
      fr: "Modele gratuit pour l'article 9 avec references vers des preuves techniques.",
    },
    intro: {
      en:
        "Article 9 is where the dossier shows how your team identifies risks, tracks controls, updates the register after changes, and decides what residual risk is still acceptable.",
      de:
        "Artikel 9 verlangt ein dokumentiertes Risikomanagement ueber den gesamten Lebenszyklus des Systems. Die Herausforderung liegt selten im Text selbst, sondern im belastbaren Nachweis.",
      fr:
        "L'article 9 exige un systeme de gestion des risques documente tout au long du cycle de vie. Le vrai sujet n'est pas seulement le texte, mais la preuve que ce systeme est teste.",
    },
    requirement: {
      en:
        "A usable Article 9 section should name the relevant risks, show the controls and gaps around those risks, record what remains open, and show that the register is updated after model, prompt, tool, or deployment changes.",
      de:
        "Ein guter Artikel-9-Abschnitt erklaert Risikoidentifikation, Massnahmen, Rest-Risiko und den Wiederholungsprozess nach Modell-, Prompt- oder Tool-Aenderungen.",
      fr:
        "Un bon chapitre Article 9 explique l'identification des risques, les mesures, le risque residuel et la repetition des tests apres chaque changement du systeme.",
    },
    requirementTitle: {
      en: "What Article 9 needs in practice",
    },
    requirementItems: {
      en: [
        ["Risk list", "Document concrete risks, failure modes, and affected users or groups."],
        ["Mitigation controls", "Show which controls reduce those risks and where gaps still remain."],
        ["Re-check after change", "Repeat the review after changes to model, prompt, tools, or deployment."],
        ["Residual-risk decision", "Record what stays open, who reviews it, and what follow-up is required."],
      ],
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 9 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only draft the register from the EU package you already generated. After adapter integration, it can also add entries from real runs, review outputs, and monitoring history.",
        headers: [
          "Article 9 expects",
          "Toolkit with bundle only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "A maintained risk register",
            "Creates a draft risk-register file and basic placeholders from the EU bundle.",
            "Adds evidence-linked entries from runs, review outputs, and monitoring history.",
            "Add domain risks the toolkit cannot observe and decide which ones belong in the final register.",
          ],
          [
            "A record of concrete risks",
            "Can flag missing evidence and degraded execution already visible in the bundle.",
            "Can add entries from failed cases, blocked actions, security constats, drift, and monitoring gaps.",
            "Describe the harm, affected users or process, and why that risk matters in your deployment.",
          ],
          [
            "Controls and follow-up",
            "Can point to unresolved gaps already present in the package.",
            "Can link a risk entry to review outcomes, scanner constats, and post-release follow-up.",
            "Write the control, the control owner, the review date, and the next action.",
          ],
          [
            "Residual-risk decision",
            "Shows open items but does not decide whether they are acceptable.",
            "Still does not accept, reject, or sign off residual risk for you.",
            "Set likelihood and severity rationale, then accept, block, or escalate with a named approver.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 9 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit das Register nur aus dem bereits erzeugten EU-Dossier entwerfen. Nach der Adapter-Integration kann es zusaetzlich Eintraege aus echten Runs, Pruefausgaben und dem Verlauf der Beobachtung nach dem Inverkehrbringen ergaenzen.",
        headers: [
          "Artikel 9 verlangt",
          "Toolkit nur mit vorhandenem EU-Dossier",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Ein gepflegtes Risikoregister",
            "Erzeugt eine Entwurfsdatei fuer das Risikoregister mit Grundstruktur und Platzhaltern aus dem EU-Dossier.",
            "Ergaenzt evidenzverknuepfte Eintraege aus Runs, Pruefausgaben und dem Verlauf der Beobachtung nach dem Inverkehrbringen.",
            "Ergaenzen Sie Fach- und Domainenrisiken, die das Toolkit nicht selbst beobachten kann, und entscheiden Sie, welche in das finale Register gehoeren.",
          ],
          [
            "Eine nachvollziehbare Liste konkreter Risiken",
            "Kann fehlende Nachweise und verschlechterte Ausfuehrungsqualitaet markieren, die bereits im Paket sichtbar sind.",
            "Kann Eintraege aus fehlgeschlagenen Faellen, blockierten Aktionen, Sicherheitsbefunden, Drift und Luecken in der Beobachtung nach dem Inverkehrbringen erzeugen.",
            "Beschreiben Sie den Schaden, die betroffenen Personen oder Prozesse und warum das Risiko in Ihrem Einsatz relevant ist.",
          ],
          [
            "Kontrollen und Nachverfolgung",
            "Kann auf offene Luecken verweisen, die bereits im Paket sichtbar sind.",
            "Kann einen Risikoeintrag mit Pruefergebnissen, Scanner-Befunden und Nachverfolgung nach der Inbetriebnahme verknuepfen.",
            "Schreiben Sie die Kontrolle, den Verantwortlichen, das naechste Pruefdatum und die naechste Aktion.",
          ],
          [
            "Eine Rest-Risiko-Entscheidung",
            "Zeigt offene Punkte, entscheidet aber nicht, ob sie akzeptabel sind.",
            "Akzeptiert, verwirft oder signiert das Rest-Risiko auch nach der Integration nicht fuer Sie.",
            "Legen Sie Begruendung fuer Eintrittswahrscheinlichkeit und Schwere fest und akzeptieren, blockieren oder eskalieren Sie mit namentlicher Freigabe.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 9 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que produire un brouillon du registre a partir du dossier UE deja genere. Apres integration de l'adapter, il peut aussi ajouter des entrees issues de runs reels, de sorties de revue et de l'historique de surveillance.",
        headers: [
          "L'article 9 exige",
          "Toolkit avec dossier UE seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Un registre de risques maintenu",
            "Cree un brouillon du registre de risques avec structure de base et champs reserves a partir du dossier UE.",
            "Ajoute des entrees reliees aux preuves issues des runs, des revues et de l'historique de surveillance.",
            "Ajoutez les risques metier ou sectoriels que le toolkit ne peut pas observer seul et decidez lesquels doivent apparaitre dans le registre final.",
          ],
          [
            "Une liste de risques concrets",
            "Peut signaler les preuves manquantes et une qualite d'execution degradee deja visibles dans le dossier.",
            "Peut ajouter des entrees issues de cas en echec, d'actions bloquees, de constats de securite, de derive et de lacunes de surveillance.",
            "Decrivez le dommage, les personnes ou processus touches, et pourquoi ce risque compte dans votre deploiement.",
          ],
          [
            "Des controles et un suivi",
            "Peut pointer vers des ecarts non resolus deja presents dans le dossier.",
            "Peut lier une entree de risque aux resultats de revue, aux constats du scanner et au suivi apres mise en production.",
            "Ecrivez le controle, le responsable, la prochaine date de revue et l'action suivante.",
          ],
          [
            "Une decision sur le risque residuel",
            "Montre les points ouverts mais ne decide pas s'ils sont acceptables.",
            "N'accepte, ne rejette et ne signe pas le risque residuel a votre place apres integration.",
            "Definissez la justification de probabilite et de gravite, puis acceptez, bloquez ou escaladez avec un approbateur nomme.",
          ],
        ],
      },
    },
    sections: {
      en: [
        ["Risk inventory", "List concrete harms, failure modes, and affected users.", "Per-case risk level, gate recommendation, scanner results."],
        ["Mitigation controls", "Explain which controls reduce the highest risks.", "Security constats, human-approval path, blocked actions."],
        ["Validation cadence", "Show how often the risk process is tested.", "Recurring evidence packs and monitoring exports."],
        ["Residual risk review", "Capture what remains unresolved and who signs off.", "Release review and oversight summary."],
      ],
      de: [
        ["Risikoinventar", "Konkrete Risiken und betroffene Gruppen erfassen.", "Fallbasierte Risikostufen und Kontrollpunkt-Empfehlungen."],
        ["Massnahmen", "Kontrollen gegen die hoechsten Risiken beschreiben.", "Security-Signale und Freigabewege."],
        ["Validierungszyklus", "Wie oft wird getestet?", "Wiederkehrende Nachweispakete."],
        ["Rest-Risiko", "Was bleibt offen und wer gibt frei?", "Freigabepruefung und Aufsichtszusammenfassung."],
      ],
      fr: [
        ["Inventaire des risques", "Lister les risques concrets et les personnes concernees.", "Niveaux de risque par cas et recommandations de gate."],
        ["Mesures", "Documenter les controles utilises.", "Signaux de securite et approbations humaines."],
        ["Frequence de validation", "Montrer a quelle frequence le processus est teste.", "Dossiers de preuve recurrents."],
        ["Risque residuel", "Qui accepte le risque restant ?", "Revue de mise en production et synthese de supervision."],
      ],
    },
    coverage: {
      en: "Evidence-backed scaffolds",
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team adds manually today, and when",
        lead:
          "These fields are not filled by the toolkit automatically and are not written back into the generated draft today. Add them in your Article 9 document or governance workflow while you review the register.",
        headers: ["What you add", "When you add it", "Practical format to use"],
        rows: [
          [
            "Domain-specific risk not visible in runs",
            "When you first prepare the Article 9 section, and again after major product or deployment changes.",
            "One short risk statement naming the failure or harm and the affected users, process, or business area.",
          ],
          [
            "Affected users and business harm",
            "When you review each open risk entry generated by the toolkit or added by the team.",
            "One or two sentences explaining who can be harmed and what that harm looks like in your deployment.",
          ],
          [
            "Likelihood and severity rationale",
            "Before sign-off on the Article 9 section or before a release decision that relies on it.",
            "Short text or your internal scale explaining why the risk is low, medium, or high and how likely it is.",
          ],
          [
            "Control owner and target review date",
            "As soon as a risk stays open and needs follow-up after review.",
            "Named owner plus a concrete review date in the Article 9 section, tracker, or governance tool.",
          ],
          [
            "Residual-risk acceptance and sign-off",
            "At revue de mise en production or governance sign-off, after the open risks and controls have been reviewed.",
            "Accepted, blocked, or escalate, plus the approver name and any required next step.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team heute noch manuell zu Artikel 9 ergaenzt",
        lead:
          "Diese Felder werden vom Toolkit heute nicht automatisch ausgefuellt und nicht in den generierten Entwurf zurueckgeschrieben. Ergaenzen Sie sie im Artikel-9-Dokument oder im Governance-Workflow waehrend der Pruefung des Registers.",
        headers: ["Was Sie ergaenzen", "Wann Sie es ergaenzen", "Praktisches Format"],
        rows: [
          [
            "Domainenrisiko, das in Runs nicht sichtbar ist",
            "Wenn Sie den Artikel-9-Abschnitt erstmals erstellen und erneut nach groesseren Produkt- oder Einsatz-Aenderungen.",
            "Ein kurzer Risiko-Satz mit Fehlerbild oder Schaden und den betroffenen Nutzern, Prozessen oder dem Geschaeftsbereich.",
          ],
          [
            "Betroffene Personen und geschaeftlicher Schaden",
            "Wenn Sie jeden offenen Risiko-Eintrag pruefen, den das Toolkit erzeugt oder das Team selbst hinzugefuegt hat.",
            "Ein oder zwei Saetze dazu, wer betroffen sein kann und wie der Schaden im Einsatz aussieht.",
          ],
          [
            "Begruendung fuer Eintrittswahrscheinlichkeit und Schwere",
            "Vor der Freigabe des Artikel-9-Abschnitts oder vor einer Entscheidung zur Inbetriebnahme, die sich darauf stuetzt.",
            "Kurzer Text oder interne Skala, warum das Risiko niedrig, mittel oder hoch ist und wie wahrscheinlich es auftritt.",
          ],
          [
            "Verantwortliche Person fuer die Kontrolle und Zieltermin fuer die naechste Pruefung",
            "Sobald ein Risiko offen bleibt und Nachverfolgung braucht.",
            "Namentlich benannte verantwortliche Person plus konkretes Pruefdatum im Artikel-9-Abschnitt, Tracker oder Governance-Tool.",
          ],
          [
            "Akzeptanz des Rest-Risikos und Freigabe",
            "Bei der Freigabepruefung oder Governance-Freigabe, nachdem offene Risiken und Kontrollen geprueft wurden.",
            "Akzeptiert, blockiert oder eskalieren, plus Name des Freigebenden und gegebenenfalls naechster Schritt.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore manuellement pour l'article 9",
        lead:
          "Ces champs ne sont pas remplis automatiquement par le toolkit et ne sont pas reecrits aujourd'hui dans le brouillon genere. Ajoutez-les dans votre document Article 9 ou dans votre workflow de gouvernance pendant la revue du registre.",
        headers: ["Ce que vous ajoutez", "Quand vous l'ajoutez", "Format pratique a utiliser"],
        rows: [
          [
            "Risque metier non visible dans les runs",
            "Quand vous preparez le chapitre Article 9 pour la premiere fois, puis de nouveau apres des changements majeurs de produit ou de deploiement.",
            "Une courte phrase de risque nommant la defaillance ou le dommage et les utilisateurs, processus ou domaines metier touches.",
          ],
          [
            "Personnes affectees et dommage metier",
            "Quand vous revoyez chaque entree de risque ouverte generee par le toolkit ou ajoutee par l'equipe.",
            "Une ou deux phrases expliquant qui peut etre touche et a quoi ressemble ce dommage dans votre deploiement.",
          ],
          [
            "Justification de probabilite et de gravite",
            "Avant la validation du chapitre Article 9 ou avant une decision de mise en production qui s'appuie dessus.",
            "Un texte court ou votre echelle interne expliquant pourquoi le risque est faible, moyen ou eleve et a quel point il est probable.",
          ],
          [
            "Responsable du controle et date cible de revue",
            "Des qu'un risque reste ouvert et demande un suivi.",
            "Un responsable nomme plus une date de revue concrete dans le chapitre Article 9, le tracker ou l'outil de gouvernance.",
          ],
          [
            "Acceptation du risque residuel et approbation",
            "Lors de la revue de mise en production ou de la validation de gouvernance, apres revue des risques ouverts et des controles.",
            "Accepte, bloque ou escalade, plus le nom de l'approbateur et, si besoin, l'etape suivante.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 9 is one section inside the full EU dossier",
        lead:
          "There is one full EU dossier. The Article 9 draft is one file inside that package, alongside the review and monitoring outputs it depends on. The JSON layout shown here is the toolkit's structured format for those requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 9", "Open file"],
        rows: [
          [
            "Article 9 draft risk register - article-9-risk-register.json",
            "Starting draft for the Article 9 risk section.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
          [
            "Annex IV dossier - eu-ai-act-annex-iv.json",
            "Wider technical package that links Article 9 to the other dossier sections.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
          [
            "Release review - release-review.json",
            "Used when an open risk affects release status or follow-up.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Post-market monitoring - post-market-monitoring.json",
            "Used when Article 9 is updated after release because drift or recurring failures appear.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 9 ist ein Abschnitt im vollstaendigen EU-Dossier",
        lead:
          "Es gibt ein vollstaendiges EU-Dossier. Der Artikel-9-Entwurf ist nur eine Datei in diesem Paket, zusammen mit den Pruef- und Ausgaben aus der Beobachtung nach dem Inverkehrbringen, von denen er abhaengt. Das hier gezeigte JSON-Layout ist das strukturierte Format des Toolkits fuer diese Anforderungen, nicht eine gesetzlich vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 9 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Artikel-9-Entwurf des Risikoregisters - article-9-risk-register.json",
            "Startentwurf fuer den Risiko-Abschnitt aus Artikel 9.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
          [
            "Anhang-IV-Dossier - eu-ai-act-annex-iv.json",
            "Groesseres technisches Paket, das Artikel 9 mit den anderen Dossier-Abschnitten verknuepft.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Wird genutzt, wenn ein offenes Risiko den Status der Inbetriebnahme oder die Nachverfolgung beeinflusst.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Beobachtung nach dem Inverkehrbringen - post-market-monitoring.json",
            "Wird genutzt, wenn Artikel 9 nach der Inbetriebnahme wegen Drift oder wiederkehrenden Fehlern aktualisiert wird.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 9 est une section du dossier UE complet",
        lead:
          "Il existe un dossier UE complet. Le brouillon Article 9 n'est qu'un fichier dans ce dossier, avec les sorties de revue et de surveillance dont il depend. Le format JSON montre ici est le format structure du toolkit pour ces exigences, et non une forme imposee par la loi.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 9", "Ouvrir le fichier"],
        rows: [
          [
            "Brouillon du registre de risques Article 9 - article-9-risk-register.json",
            "Brouillon de depart pour la section risques de l'article 9.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
          [
            "Dossier Annexe IV - eu-ai-act-annex-iv.json",
            "Package technique plus large reliant l'article 9 aux autres sections du dossier.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Utilisee quand un risque ouvert affecte le statut de mise en production ou le suivi.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Surveillance post-commercialisation - post-market-monitoring.json",
            "Utilise quand l'article 9 doit etre mis a jour apres mise en production en cas de derive ou de defaillances recurrentes.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
        ],
      },
    },
    examples: {
      en: {
        title: "When teams actually use this",
        items: [
          [
            "Release regression review",
            "A release degraded execution quality. The risk register gives governance a concrete place to record the new risk, its evidence, and the required follow-up.",
          ],
          [
            "Monitoring-driven reassessment",
            "Post-release drift appears in monitoring. Article 9 is where that signal should turn into a reviewed risk update instead of staying only in a dashboard.",
          ],
          [
            "Security or abuse finding handoff",
            "A scanner or reviewer flags a new issue. The scaffold helps attach that finding to the documented risk process and residual-gap tracking.",
          ],
        ],
      },
    },
    resourcePanel: {
      en: {
        eyebrow: "Open the template or live evidence",
        title: "Take Article 9 into a real review flow",
        lead:
          "Use the template when you need the document shell. Open the live dossier when you need to inspect the machine-derived entries that the toolkit can contribute to your Article 9 work.",
        downloadLabel: "Download free template",
        liveLabel: "Open live dossier",
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
    faq: {
      en: [
        ["Can Article 9 be documented without technical evidence?", "You can write the narrative, but that is weaker than a package that links to recent test evidence and review records."],
        ["What should evidence look like?", "It should be machine-readable, timestamped, and linked to real cases, not a manual spreadsheet summary."],
        ["Does this replace legal review?", "No. It gives legal and compliance teams a stronger technical basis."],
      ],
      de: [
        ["Reicht eine textliche Beschreibung?", "Sie hilft, aber ohne technische Nachweise bleibt der Abschnitt schwach."],
        ["Wie sollte Evidence aussehen?", "Maschinenlesbar, datiert und mit echten Testfaellen verknuepft."],
        ["Ersetzt das rechtliche Pruefung?", "Nein. Es verbessert die technische Grundlage fuer diese Pruefung."],
      ],
      fr: [
        ["Le texte seul suffit-il ?", "Il aide, mais reste faible sans preuves techniques reliees a de vrais tests."],
        ["A quoi ressemble une bonne preuve ?", "Une preuve lisible par machine, datee et rattachee a des cas reels."],
        ["Cela remplace-t-il la revue juridique ?", "Non. Cela renforce la base technique."],
      ],
    },
  },
  "article-12": {
    title: {
      en: "EU AI Act Article 12 - Logging and Traceability Template",
      de: "EU KI-Verordnung Artikel 12 - Vorlage fuer Journalisierung und Rueckverfolgbarkeit",
      fr: "Article 12 de l'AI Act - Modele pour la journalisation et la tracabilite",
    },
    description: {
      en: "Template for logging, trace anchors, structured event records, and audit trail expectations under Article 12.",
      de: "Vorlage fuer Journalisierung, Trace-Anker, strukturierte Ereignisaufzeichnungen und Erwartungen an den Audit-Pfad nach Artikel 12.",
      fr: "Modele pour la journalisation, les ancres de trace, les enregistrements d'evenements structures et les attentes de piste d'audit au titre de l'article 12.",
    },
    intro: {
      en:
        "Article 12 is where a reviewer checks whether a run can be reconstructed outside your internal dashboards. The hard part is not having logs in principle. The hard part is having a record trail that another reviewer can actually inspect, follow, and retain.",
      de:
        "In Artikel 12 prueft eine pruefende Person, ob sich ein Run ausserhalb Ihrer internen Dashboards rekonstruieren laesst. Die Schwierigkeit besteht nicht darin, Logs im Prinzip zu haben. Die Schwierigkeit besteht darin, eine nachvollziehbare Spur zu haben, die eine andere pruefende Person wirklich prüfen, verfolgen und aufbewahren kann.",
      fr:
        "L'article 12 est l'endroit ou un evaluateur verifie si un run peut etre reconstruit en dehors de vos tableaux de bord internes. La difficulte n'est pas d'avoir des logs en principe. La difficulte est d'avoir une piste d'enregistrements qu'un autre evaluateur peut vraiment inspecter, suivre et conserver.",
    },
    requirement: {
      en:
        "For agent systems, this means more than generic application logs. The section should show what is recorded, how files link back to a concrete run, what artifacts survive handoff, and what retention controls still depend on operator policy.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 12 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only show the trace and logging artifacts already present in the generated package. After adapter integration, it can preserve run records, tool telemetry, result and error artifacts, and trace anchors from real runs.",
        headers: [
          "Article 12 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still defined and approved by your team",
        ],
        rows: [
          [
            "A reviewable event trail",
            "Shows compare-report data, retained case artifacts, and manifest-backed file integrity already present in the package.",
            "Adds run records, tool telemetry, result artifacts, error artifacts, and trace anchors from real runs.",
            "Define which systems must be logged, what counts as a complete record, and which gaps need compensating controls.",
          ],
          [
            "A link between the report and the underlying run",
            "Can show report IDs, manifest entries, and retained artifacts already bundled together.",
            "Can point from the report back to concrete run files and case-level artifacts from the connected agent.",
            "Explain any external trace systems, storage layers, or identifiers that live outside the toolkit.",
          ],
          [
            "A reviewer path after something goes wrong",
            "Lets a reviewer inspect the generated report, compare file, and retained artifacts already in the package.",
            "Lets a reviewer open the underlying run records and tool-level artifacts tied to the same cases.",
            "Define who may access those records, under what workflow, and how incident or audit access is granted.",
          ],
          [
            "Retention and deletion controls",
            "Shows retention-control output and the retained files already inside the package.",
            "Can include the real run artifacts and telemetry files that your retention policy needs to cover.",
            "Set retention period, deletion rules, export policy, and legal disclosure rules.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 12 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit nur die Trace- und Journalisierungsartefakte zeigen, die bereits im erzeugten Paket vorhanden sind. Nach der Adapter-Integration kann es Laufprotokolle, Tool-Telemetrie, Ergebnis- und Fehlerartefakte sowie Trace-Anker aus echten Runs erfassen.",
        headers: [
          "Artikel 12 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team definiert und freigegeben",
        ],
        rows: [
          [
            "Eine pruefbare Ereignisspur",
            "Zeigt Daten aus dem Vergleichsbericht, aufbewahrte Fallartefakte und manifest-gestuetzte Dateiintegritaet, die bereits im Paket vorhanden sind.",
            "Fuegt Laufprotokolle, Tool-Telemetrie, Ergebnisartefakte, Fehlerartefakte und Trace-Anker aus echten Runs hinzu.",
            "Legen Sie fest, welche Systeme geloggt werden muessen, was als vollstaendiger Datensatz gilt und welche Luecken durch kompensierende Kontrollen abgedeckt werden muessen.",
          ],
          [
            "Eine Verbindung zwischen Bericht und zugrunde liegendem Run",
            "Kann Berichtskennungen, Manifest-Eintraege und bereits gemeinsam gebuendelte aufbewahrte Artefakte zeigen.",
            "Kann vom Bericht auf konkrete Run-Dateien und fallbezogene Artefakte des verbundenen Agenten verweisen.",
            "Erklaeren Sie externe Trace-Systeme, Speicher-Ebenen oder Kennungen, die ausserhalb des Toolkits liegen.",
          ],
          [
            "Einen Pruefpfad, wenn etwas schiefgeht",
            "Ermoeglicht einer pruefenden Person, den erzeugten Bericht, die Vergleichsdatei und aufbewahrte Artefakte zu pruefen, die bereits im Paket sind.",
            "Ermoeglicht einer pruefenden Person, die zugrunde liegenden Laufprotokolle und Tool-Artefakte zu oeffnen, die an dieselben Faelle gebunden sind.",
            "Definieren Sie, wer auf diese Datensaetze zugreifen darf, in welchem Workflow und wie Zugriff fuer Vorfallanalyse oder Audits freigegeben wird.",
          ],
          [
            "Retention- und Loeschkontrollen",
            "Zeigt die Ausgabe der Aufbewahrungskontrollen und die bereits im Paket enthaltenen aufbewahrten Dateien.",
            "Kann reale Run-Artefakte und Telemetrie-Dateien aufnehmen, die Ihre Aufbewahrungsrichtlinie abdecken muss.",
            "Legen Sie Aufbewahrungsdauer, Loeschregeln, Exportrichtlinie und Regeln fuer rechtliche Offenlegung fest.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 12 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut montrer que les artefacts de trace et de journalisation deja presents dans le dossier genere. Apres integration de l'adapter, il peut conserver les enregistrements d'execution, la telemetrie des outils, les artefacts de resultat et d'erreur, ainsi que les ancres de trace provenant de runs reels.",
        headers: [
          "L'article 12 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours defini et approuve par votre equipe",
        ],
        rows: [
          [
            "Une piste d'evenements verifiable",
            "Montre les donnees du rapport de comparaison, les artefacts de cas conserves et l'integrite des fichiers ancree par le manifest deja presents dans le dossier.",
            "Ajoute les enregistrements d'execution, la telemetrie des outils, les artefacts de resultat, les artefacts d'erreur et les ancres de trace issues de runs reels.",
            "Definissez quels systemes doivent etre journalises, ce qui compte comme enregistrement complet et quelles lacunes exigent des controles compensatoires.",
          ],
          [
            "Un lien entre le rapport et le run sous-jacent",
            "Peut montrer les IDs de rapport, les entrees du manifest et les artefacts conserves deja regroupes.",
            "Peut pointer depuis le rapport vers des fichiers de run concrets et des artefacts au niveau des cas provenant de l'agent connecte.",
            "Expliquez les systemes de trace externes, couches de stockage ou identifiants qui vivent en dehors du toolkit.",
          ],
          [
            "Un chemin de revue quand quelque chose se passe mal",
            "Permet a un evaluateur d'inspecter le rapport genere, le fichier de comparaison et les artefacts conserves deja dans le dossier.",
            "Permet a un evaluateur d'ouvrir les enregistrements de run sous-jacents et les artefacts au niveau des outils lies aux memes cas.",
            "Definissez qui peut acceder a ces enregistrements, selon quel workflow, et comment l'acces incident ou audit est accorde.",
          ],
          [
            "Des controles de retention et de suppression",
            "Montre la sortie de retention control et les fichiers conserves deja a l'interieur du dossier.",
            "Peut inclure les artefacts de run reels et les fichiers de telemetrie que votre politique de retention doit couvrir.",
            "Definissez la periode de retention, les regles de suppression, la politique d'export et les regles de divulgation juridique.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still defines around Article 12",
        lead:
          "The toolkit can preserve and package records, but it does not choose your retention posture or disclosure rules. Those decisions still belong in your logging policy and governance workflow.",
        headers: ["What you define", "When you define it", "Practical format to use"],
        rows: [
          [
            "Retention period and storage location",
            "Before you rely on the package for governance review or external handoff.",
            "A simple policy statement naming how long records are kept and where the retained files live.",
          ],
          [
            "Access and disclosure rules",
            "When the package may be opened by security, governance, counsel, or an external reviewer.",
            "A short access matrix naming who can inspect which logging artifacts and under what trigger.",
          ],
          [
            "External trace-system references",
            "Whenever your trace chain spans systems outside the toolkit package.",
            "System name, identifier format, and the lookup path needed to continue the trace outside the package.",
          ],
          [
            "Known logging gaps and compensating process",
            "When the connected adapter does not emit all of the logging depth you want.",
            "One short gap note plus the manual or external process that fills it.",
          ],
          [
            "Legal export and deletion constraints",
            "Before evidence is handed to another team or retained for a longer period.",
            "Short policy text naming when records may be exported, redacted, or deleted.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team rund um Artikel 12 noch festlegt",
        lead:
          "Das Toolkit kann Datensaetze erhalten und in ein Paket uebernehmen, entscheidet aber nicht ueber Ihre Aufbewahrungsregeln oder Offenlegungsvorgaben. Diese Entscheidungen gehoeren weiterhin in Ihre Journalisierungsrichtlinie und Ihren Governance-Ablauf.",
        headers: ["Was Sie festlegen", "Wann Sie es festlegen", "Praktisches Format"],
        rows: [
          [
            "Aufbewahrungsdauer und Speicherort",
            "Bevor Sie das Paket fuer eine Governance-Pruefung oder externe Uebergabe verwenden.",
            "Eine kurze Richtlinien-Aussage dazu, wie lange Datensaetze aufbewahrt werden und wo die Dateien liegen.",
          ],
          [
            "Zugriffs- und Offenlegungsregeln",
            "Wenn das Paket von Sicherheit, Governance, Rechtsberatung oder einer externen pruefenden Person geoeffnet werden kann.",
            "Eine kurze Zugriffsmatrix, wer welche Journalisierungs-Artefakte unter welchem Ausloeser pruefen darf.",
          ],
          [
            "Referenzen auf externe Trace-Systeme",
            "Immer dann, wenn Ihre Trace-Kette ueber Systeme ausserhalb des Toolkit-Pakets verlaeuft.",
            "Systemname, Kennungsformat und Suchpfad, die fuer die Fortsetzung der Spur ausserhalb des Pakets noetig sind.",
          ],
          [
            "Bekannte Journalisierungs-Luecken und kompensierender Prozess",
            "Wenn der verbundene Adapter nicht die gewuenschte Journalisierungs-Tiefe liefert.",
            "Eine kurze Luecken-Notiz plus der manuelle oder externe Prozess, der die Luecke schliesst.",
          ],
          [
            "Rechtliche Export- und Loeschgrenzen",
            "Bevor Nachweise an ein anderes Team uebergeben oder laenger aufbewahrt wird.",
            "Kurzer Leitlinientext dazu, wann Datensaetze exportiert, geschwaerzt oder geloescht werden duerfen.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe definit encore autour de l'article 12",
        lead:
          "Le toolkit peut conserver et assembler ces enregistrements dans le dossier, mais il ne choisit ni votre posture de retention ni vos regles de divulgation. Ces decisions restent dans votre politique de journalisation et votre workflow de gouvernance.",
        headers: ["Ce que vous definissez", "Quand vous le definissez", "Format pratique a utiliser"],
        rows: [
          [
            "Periode de retention et lieu de stockage",
            "Avant de vous appuyer sur le dossier pour une revue de gouvernance ou une transmission externe.",
            "Une courte regle indiquant combien de temps les enregistrements sont conserves et ou se trouvent les fichiers retenus.",
          ],
          [
            "Regles d'acces et de divulgation",
            "Quand le dossier peut etre ouvert par la securite, la gouvernance, le conseil juridique ou un evaluateur externe.",
            "Une courte matrice d'acces indiquant qui peut inspecter quels artefacts de journalisation et sous quel declencheur.",
          ],
          [
            "References a des systemes de trace externes",
            "Des que votre chaine de trace traverse des systemes en dehors du dossier toolkit.",
            "Nom du systeme, format d'identifiant et chemin de recherche necessaire pour poursuivre la trace hors du dossier.",
          ],
          [
            "Lacunes connues de journalisation et processus compensatoire",
            "Quand l'adapter connecte n'emet pas toute la profondeur de journalisation souhaitee.",
            "Une courte note de gap plus le processus manuel ou externe qui comble cette lacune.",
          ],
          [
            "Contraintes juridiques d'export et de suppression",
            "Avant que les preuves ne soient transmises a une autre equipe ou conservees plus longtemps.",
            "Un court texte de politique indiquant quand les enregistrements peuvent etre exportes, rediges ou supprimes.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 12 is evidenced through multiple logging and trace files",
        lead:
          "There is no single Article 12 JSON file in the package. The requirement is covered through the files below. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 12", "Open file"],
        rows: [
          [
            "Compare report - compare-report.json",
            "Main review file linking case outcomes, trace integrity, and retained artifacts.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Manifest - artifacts/manifest.json",
            "Integrity index showing which files belong to the package and how they are anchored.",
            "demo/eu-ai-act/artifacts/manifest.json",
          ],
          [
            "Source run record - _source_inputs/new/run.json",
            "Example raw run record used to reconstruct a concrete execution path.",
            "demo/eu-ai-act/_source_inputs/new/run.json",
          ],
          [
            "Retention controls - archive/retention-controls.json",
            "Archive and retention observations attached to the package.",
            "demo/eu-ai-act/archive/retention-controls.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 12 wird ueber mehrere Journalisierungs- und Trace-Dateien belegt",
        lead:
          "Es gibt keine einzelne Artikel-12-JSON-Datei im Paket. Die Anforderung wird ueber die unten stehenden Dateien abgedeckt. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 12 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Vergleichsbericht - compare-report.json",
            "Zentrale Pruefdatei, die Fallergebnisse, Trace-Integritaet und aufbewahrte Artefakte verknuepft.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Manifest - artifacts/manifest.json",
            "Integritaetsindex, der zeigt, welche Dateien zum Paket gehoeren und wie sie verankert sind.",
            "demo/eu-ai-act/artifacts/manifest.json",
          ],
          [
            "Quell-Laufprotokoll - _source_inputs/new/run.json",
            "Beispielhafter Rohdatensatz eines Runs, mit dem sich ein konkreter Ausfuehrungspfad rekonstruieren laesst.",
            "demo/eu-ai-act/_source_inputs/new/run.json",
          ],
          [
            "Aufbewahrungskontrollen - archive/retention-controls.json",
            "Archiv- und Aufbewahrungsbeobachtungen, die dem Paket beigefuegt sind.",
            "demo/eu-ai-act/archive/retention-controls.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 12 est demontre par plusieurs fichiers de journalisation et de trace",
        lead:
          "Il n'existe pas de fichier JSON unique pour l'article 12 dans le dossier. L'exigence est couverte par les fichiers ci-dessous. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 12", "Ouvrir le fichier"],
        rows: [
          [
            "Rapport de comparaison - compare-report.json",
            "Fichier principal de revue reliant les resultats des cas, l'integrite de la trace et les artefacts conserves.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Manifest - artifacts/manifest.json",
            "Index d'integrite montrant quels fichiers appartiennent au dossier et comment ils sont ancres.",
            "demo/eu-ai-act/artifacts/manifest.json",
          ],
          [
            "Fichier source du run - _source_inputs/new/run.json",
            "Exemple d'enregistrement d'execution brut utilise pour reconstruire un chemin d'execution concret.",
            "demo/eu-ai-act/_source_inputs/new/run.json",
          ],
          [
            "Controles de retention - archive/retention-controls.json",
            "Observations d'archive et de retention attachees au dossier.",
            "demo/eu-ai-act/archive/retention-controls.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-13": {
    title: {
      en: "EU AI Act Article 13 - Instructions for Use Template",
      de: "EU KI-Verordnung Artikel 13 - Vorlage fuer Gebrauchsanweisungen",
      fr: "Article 13 de l'AI Act - Modele pour les instructions d'utilisation",
    },
    description: {
      en: "Template for instructions-for-use, intended-use boundaries, operator notes, and evidence-linked deployment guidance under Article 13.",
      de: "Vorlage fuer Gebrauchsanweisungen, Grenzen des Einsatzzwecks, Operator-Hinweise und nachweisgestuetzte Einsatzanleitung nach Artikel 13.",
      fr: "Modele pour les instructions d'utilisation, les limites d'usage prevu, les notes operateur et les indications de deploiement liees aux preuves au titre de l'article 13.",
    },
    intro: {
      en:
        "Article 13 is where a reviewer checks whether your instructions match the real technical boundary of the system. A deployment guide alone is not enough. The instructions have to name what the system is for, what conditions it relies on, and when a human must step in.",
      de:
        "In Artikel 13 prueft eine pruefende Person, ob Ihre Anweisungen zur realen technischen Grenze des Systems passen. Ein Einsatzleitfaden allein reicht nicht. Die Anweisungen muessen benennen, wofuer das System gedacht ist, auf welche Bedingungen es sich stuetzt und wann ein Mensch eingreifen muss.",
      fr:
        "L'article 13 est l'endroit ou un evaluateur verifie si vos instructions correspondent a la veritable limite technique du systeme. Un simple guide de deploiement ne suffit pas. Les instructions doivent dire a quoi sert le systeme, sur quelles conditions il repose et quand un humain doit intervenir.",
    },
    requirement: {
      en:
        "A usable Article 13 section should state intended purpose, operating constraints, human-review expectations, and re-evaluation triggers. It gets stronger when those statements are tied back to real review and runtime evidence rather than free text alone.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 13 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only draft the instructions file from the generated package. After adapter integration, it can also attach links from the instructions to real runs, review outputs, and oversight records.",
        headers: [
          "Article 13 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "An intended purpose and system boundary",
            "Creates a draft instructions file with a technical scope, current system identity, and open operator-input fields.",
            "Adds links from that draft to real runs, review outputs, and runtime evidence for the connected system.",
            "Write the final intended purpose, excluded uses, and the deployment boundary in business terms.",
          ],
          [
            "Conditions for safe use",
            "Can point to current quality status, known limitations, and residual gaps already visible in the package.",
            "Can link those limits back to live execution quality, release-review output, and logging outputs from real runs.",
            "Define prerequisites, local operating conditions, and any deployment-specific assumptions the operator must satisfy.",
          ],
          [
            "Human review instructions",
            "Can reference approval-required cases and release-review outputs already in the package.",
            "Can link instructions back to the oversight summary, blocked cases, and escalation evidence from real runs.",
            "Write the actual operator guidance: when to review, when to stop, and who must be involved.",
          ],
          [
            "Re-check after change",
            "Can note that the instructions are tied to the current package and its unresolved gaps.",
            "Can show the new evidence and review outputs created after model, prompt, tool, or deployment changes.",
            "Decide when the instructions must be reissued and who approves the updated version.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 13 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit nur die Anweisungsdatei aus dem erzeugten Paket entwerfen. Nach der Adapter-Integration kann es zusaetzlich Links von diesen Anweisungen zu echten Runs, Pruefergebnissen und Aufsichtsprotokollen anhaengen.",
        headers: [
          "Artikel 13 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Einen Verwendungszweck und eine Systemgrenze",
            "Erzeugt einen Entwurf der Anweisungsdatei mit technischer Systemgrenze, aktueller Systemidentitaet und offenen Operator-Eingabefeldern.",
            "Fuegt Links von diesem Entwurf zu echten Runs, Pruefergebnissen und Laufzeit-Nachweisen des verbundenen Systems hinzu.",
            "Schreiben Sie den finalen Verwendungszweck, ausgeschlossene Nutzungen und die Einsatzgrenze in Geschaeftssprache.",
          ],
          [
            "Bedingungen fuer sichere Nutzung",
            "Kann auf aktuellen Qualitaetsstatus, bekannte Grenzen und Restluecken verweisen, die bereits im Paket sichtbar sind.",
            "Kann diese Grenzen an Live-Ausfuehrungsqualitaet, Freigabepruefung und Journalisierungs-Ergebnisse aus echten Runs zurueckbinden.",
            "Definieren Sie Voraussetzungen, lokale Betriebsbedingungen und einsatzspezifische Annahmen, die der Operator erfuellen muss.",
          ],
          [
            "Anweisungen fuer menschliche Pruefung",
            "Kann freigabepflichtige Faelle und Ergebnisse der Freigabepruefung referenzieren, die bereits im Paket vorhanden sind.",
            "Kann Anweisungen an die Aufsichtsuebersicht, blockierte Faelle und Eskalations-Nachweise aus echten Runs binden.",
            "Schreiben Sie die eigentliche Operator-Anleitung: wann geprueft werden muss, wann gestoppt wird und wer eingebunden sein muss.",
          ],
          [
            "Erneute Pruefung nach Aenderungen",
            "Kann vermerken, dass die Anweisungen an das aktuelle Paket und dessen offene Luecken gebunden sind.",
            "Kann neue Nachweis- und Pruefergebnisse zeigen, die nach Modell-, Prompt-, Tool- oder Einsatz-Aenderungen erzeugt wurden.",
            "Entscheiden Sie, wann die Anweisungen neu ausgegeben werden muessen und wer die aktualisierte Version freigibt.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 13 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que preparer le fichier d'instructions a partir du dossier genere. Apres integration de l'adapter, il peut aussi rattacher ces instructions a de vrais runs, a des sorties de revue et a des enregistrements de supervision.",
        headers: [
          "L'article 13 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Une finalite prevue et une frontiere du systeme",
            "Cree un brouillon du fichier d'instructions avec le perimetre technique, l'identite actuelle du systeme et les champs d'entree operateur encore ouverts.",
            "Ajoute des liens depuis ce brouillon vers de vrais runs, des sorties de revue et des preuves d'execution du systeme connecte.",
            "Redigez la finalite definitive, les usages exclus et la frontiere de deploiement en termes metier.",
          ],
          [
            "Des conditions d'utilisation sure",
            "Peut pointer vers l'etat qualite actuel, les limites connues et les ecarts residuels deja visibles dans le dossier.",
            "Peut relier ces limites a la qualite d'execution en conditions reelles, a la revue de mise en production et aux sorties de journalisation provenant de runs reels.",
            "Definissez les prerequis, conditions d'exploitation locales et hypotheses de deploiement que l'operateur doit respecter.",
          ],
          [
            "Des instructions de revue humaine",
            "Peut referencer les cas exigeant approbation et les sorties de revue de mise en production deja presentes dans le dossier.",
            "Peut rattacher les instructions a la synthese de supervision humaine, aux cas bloques et aux preuves d'escalade issues de runs reels.",
            "Redigez la vraie consigne operateur: quand revoir, quand arreter et qui doit etre implique.",
          ],
          [
            "Une re-evaluation apres changement",
            "Peut indiquer que les instructions sont liees au dossier actuel et a ses lacunes non resolues.",
            "Peut montrer les nouvelles preuves et sorties de revue creees apres des changements de modele, prompt, outil ou deploiement.",
            "Decidez quand les instructions doivent etre reeditees et qui approuve la version mise a jour.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 13",
        lead:
          "The toolkit can scaffold the instructions file and attach technical evidence. It does not write the final deployer-facing instructions for you.",
        headers: ["What you add", "When you add it", "Practical format to use"],
        rows: [
          [
            "Final intended purpose statement",
            "When you first prepare the Article 13 section and whenever the system scope changes.",
            "A short paragraph naming the system's purpose, users, excluded uses, and boundary.",
          ],
          [
            "Deployment assumptions and prerequisites",
            "Before the system is handed to a deployer or operator team.",
            "A list of required conditions such as data sources, workflow assumptions, approvals, or human-review capacity.",
          ],
          [
            "Operator actions and stop conditions",
            "When review, escalation, or blocking rules must be communicated to operators.",
            "A short numbered list: when to review, when to stop, who to contact, and what evidence to inspect.",
          ],
          [
            "Deployer-facing wording",
            "Before external delivery, customer review, or internal governance sign-off.",
            "The exact language your organization wants to show to deployers, customers, or operations teams.",
          ],
          [
            "Version owner and reissue decision",
            "Whenever the instructions need to be updated after a technical change.",
            "A named owner plus the approval step for the updated instructions.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team zu Artikel 13 noch hinzufuegt",
        lead:
          "Das Toolkit kann die Anweisungsdatei vorbereiten und technische Nachweise anhaengen. Es schreibt die finalen einsatzorientierten Anweisungen nicht fuer Sie.",
        headers: ["Was Sie hinzufuegen", "Wann Sie es hinzufuegen", "Praktisches Format"],
        rows: [
          [
            "Finale Aussage zum Einsatzzweck",
            "Wenn Sie den Artikel-13-Abschnitt erstmals vorbereiten und immer dann, wenn sich die Systemgrenze aendert.",
            "Ein kurzer Absatz, der Zweck, Nutzer, ausgeschlossene Nutzungen und die Grenze des Systems benennt.",
          ],
          [
            "Einsatzannahmen und Voraussetzungen",
            "Bevor das System an ein Betreiber- oder Einsatzteam uebergeben wird.",
            "Eine Liste benoetigter Bedingungen wie Datenquellen, Ablaufannahmen, Freigaben oder Kapazitaet fuer menschliche Pruefung.",
          ],
          [
            "Operator-Aktionen und Stop-Bedingungen",
            "Wenn Pruef-, Eskalations- oder Block-Regeln an Operatoren kommuniziert werden muessen.",
            "Eine kurze nummerierte Liste: wann zu pruefen ist, wann gestoppt wird, wen Sie kontaktieren und welche Nachweise Sie ansehen muessen.",
          ],
          [
            "Einsatzorientierte Formulierung",
            "Vor externer Lieferung, Kundenpruefung oder interner Governance-Freigabe.",
            "Die genaue Sprache, die Ihre Organisation Betreiber-, Kunden- oder Einsatzteams zeigen will.",
          ],
          [
            "Versionsverantwortung und Entscheidung zur Neuauflage",
            "Immer dann, wenn die Anweisungen nach einer technischen Aenderung aktualisiert werden muessen.",
            "Eine benannte verantwortliche Person plus Freigabeschritt fuer die aktualisierten Anweisungen.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore a l'article 13",
        lead:
          "Le toolkit peut structurer le fichier d'instructions et y rattacher les preuves techniques. Il ne redige pas pour vous les instructions finales destinees a l'equipe de deploiement.",
        headers: ["Ce que vous ajoutez", "Quand vous l'ajoutez", "Format pratique a utiliser"],
        rows: [
          [
            "Enonce final de la finalite prevue",
            "Quand vous preparez pour la premiere fois la section Article 13 et chaque fois que le perimetre du systeme change.",
            "Un court paragraphe nommant la finalite du systeme, ses utilisateurs, les usages exclus et sa frontiere.",
          ],
          [
            "Hypotheses de deploiement et prerequis",
            "Avant que le systeme ne soit remis a une equipe deployeur ou operateur.",
            "Une liste des conditions requises comme les sources de donnees, hypotheses de workflow, approbations ou capacite de revue humaine.",
          ],
          [
            "Actions operateur et conditions d'arret",
            "Quand les regles de revue, d'escalade ou de blocage doivent etre communiquees aux operateurs.",
            "Une courte liste numerotee: quand revoir, quand arreter, qui contacter et quelles preuves inspecter.",
          ],
          [
            "Formulation destinee au deployeur",
            "Avant une livraison externe, une revue client ou une validation interne de gouvernance.",
            "Le texte exact que votre organisation veut montrer aux deployeurs, clients ou equipes operations.",
          ],
          [
            "Responsable de version et decision de reemise",
            "A chaque fois que les instructions doivent etre mises a jour apres un changement technique.",
            "Un responsable nomme plus l'etape d'approbation de la version mise a jour.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 13 is one instructions layer inside the full dossier",
        lead:
          "The files below are the ones that matter most for Article 13. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 13", "Open file"],
        rows: [
          [
            "Article 13 instructions - article-13-instructions.json",
            "Main draft file for the Article 13 instructions section.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
          [
            "Human oversight summary - human-oversight-summary.json",
            "Supports the instructions that tell operators when human review is required.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Release review - release-review.json",
            "Supports any operator guidance tied to release status or required follow-up.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Annex IV dossier - eu-ai-act-annex-iv.json",
            "Shows how the Article 13 instructions fit into the wider technical package.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 13 ist eine Anweisungsschicht innerhalb des vollstaendigen Dossiers",
        lead:
          "Die unten stehenden Dateien sind fuer Artikel 13 am wichtigsten. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 13 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Artikel-13-Anweisungen - article-13-instructions.json",
            "Zentrale Entwurfsdatei fuer den Anweisungsabschnitt aus Artikel 13.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
          [
            "Aufsichtsuebersicht - human-oversight-summary.json",
            "Stuetzt die Anweisungen, die Operatoren sagen, wann menschliche Pruefung erforderlich ist.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Stuetzt jede Operator-Anleitung, die an den Status der Inbetriebnahme oder erforderliche Nachverfolgung gebunden ist.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Anhang-IV-Dossier - eu-ai-act-annex-iv.json",
            "Zeigt, wie die Artikel-13-Anweisungen in das groessere technische Paket passen.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 13 est une couche d'instructions a l'interieur du dossier complet",
        lead:
          "Les fichiers ci-dessous sont ceux qui comptent le plus pour l'article 13. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 13", "Ouvrir le fichier"],
        rows: [
          [
            "Instructions Article 13 - article-13-instructions.json",
            "Fichier principal de brouillon pour la section d'instructions de l'article 13.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
          [
            "Synthese de supervision humaine - human-oversight-summary.json",
            "Soutient les instructions qui disent aux operateurs quand une revue humaine est requise.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Soutient toute consigne operateur liee au statut de mise en production ou au suivi requis.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Dossier Annexe IV - eu-ai-act-annex-iv.json",
            "Montre comment les instructions de l'article 13 s'inserent dans le dossier technique plus large.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-14": {
    title: {
      en: "EU AI Act Article 14 - Human Oversight Template",
      de: "EU KI-Verordnung Artikel 14 - Vorlage fuer menschliche Aufsicht",
      fr: "Article 14 de l'AI Act - Modele pour la supervision humaine",
    },
    description: {
      en: "Template for approval paths, escalation criteria, and oversight controls required for Article 14.",
      de: "Vorlage fuer Freigabepfade, Eskalationskriterien und Aufsichtskontrollen nach Artikel 14.",
      fr: "Modele pour les chemins d'approbation, les criteres d'escalade et les controles de supervision requis par l'article 14.",
    },
    intro: {
      en:
        "Article 14 is where a reviewer checks whether humans can actually supervise, intervene, and stop the system when needed. For agent workflows, that means the review path has to be concrete: what escalates, what blocks, who reviews it, and where that outcome is recorded.",
      de:
        "In Artikel 14 prueft eine pruefende Person, ob Menschen das System tatsaechlich beaufsichtigen, eingreifen und bei Bedarf stoppen koennen. Fuer Agent-Workflows bedeutet das, dass der Pruefpfad konkret sein muss: was eskaliert, was blockiert, wer prueft und wo dieses Ergebnis festgehalten wird.",
      fr:
        "L'article 14 est l'endroit ou un evaluateur verifie si des humains peuvent reellement superviser, intervenir et arreter le systeme quand c'est necessaire. Pour les workflows d'agent, cela signifie que le chemin de revue doit etre concret: qu'est-ce qui escalade, qu'est-ce qui bloque, qui revise et ou ce resultat est enregistre.",
    },
    requirement: {
      en:
        "A strong Article 14 section should show escalation criteria, reviewable cases, approval or block outcomes, and the point where human authority still overrides automation.",
      de:
        "Ein belastbarer Abschnitt zu Artikel 14 sollte Eskalationskriterien, reviewbare Faelle, Freigabe- oder Block-Ergebnisse und den Punkt zeigen, an dem menschliche Autoritaet die Automatisierung weiterhin uebersteuert.",
      fr:
        "Une section solide pour l'article 14 doit montrer les criteres d'escalade, les cas revus par un humain, les issues d'approbation ou de blocage, ainsi que le point ou l'autorite humaine passe encore avant l'automatisation.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 14 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only summarize the oversight path already present in the generated package. After adapter integration, it can attach that oversight path to real runs, case outcomes, and review records from your connected agent.",
        headers: [
          "Article 14 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "Cases that require human review",
            "Can summarize approval-required and blocked cases already visible in the package.",
            "Can keep those cases linked to the real runs, case IDs, and policy evaluations from the connected agent.",
            "Define which situations must always escalate even if they are not flagged automatically.",
          ],
          [
            "Reasons for escalation or block",
            "Can show gate recommendations, blocked cases, and review-needed signals already in the package.",
            "Can attach those reasons to specific real runs, constats, and policy evaluation outputs.",
            "Write the final organizational threshold for escalation, rejection, or exception handling.",
          ],
          [
            "A record of what the reviewer saw and decided",
            "Can show release-review status and the current oversight summary already in the package.",
            "Can preserve a case-linked review queue and approval or block trail tied to the connected agent.",
            "Decide what reviewer notes, approvals, or sign-offs must be captured in your governance process.",
          ],
          [
            "Human authority to stop or override the system",
            "Can show where the package recommends approval or block.",
            "Can tie those recommendations back to the cases and runs that triggered them.",
            "Define who may override, who may stop the system, and what authority that person has.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 14 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit nur den Aufsichtspfad zusammenfassen, der bereits im erzeugten Paket vorhanden ist. Nach der Adapter-Integration kann es diesen Aufsichtspfad an echte Runs, Fallergebnisse und Pruefprotokolle Ihres verbundenen Agenten binden.",
        headers: [
          "Artikel 14 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Faelle, die menschliche Pruefung verlangen",
            "Kann freigabepflichtige und blockierte Faelle zusammenfassen, die bereits im Paket sichtbar sind.",
            "Kann diese Faelle an echte Runs, Fallkennungen und Leitlinien-Auswertungen des verbundenen Agenten binden.",
            "Definieren Sie, welche Situationen immer eskalieren muessen, auch wenn sie nicht automatisch markiert werden.",
          ],
          [
            "Gruende fuer Eskalation oder Block",
            "Kann Kontroll-Empfehlungen, blockierte Faelle und pruefpflichtige Signale zeigen, die bereits im Paket vorhanden sind.",
            "Kann diese Gruende an spezifische echte Runs, Befunde und Leitlinien-Ergebnisse binden.",
            "Schreiben Sie die finale organisatorische Schwelle fuer Eskalation, Ablehnung oder Ausnahmebehandlung.",
          ],
          [
            "Eine Aufzeichnung dessen, was die pruefende Person gesehen und entschieden hat",
            "Kann den Status der Freigabepruefung und die aktuelle Aufsichtsuebersicht zeigen, die bereits im Paket vorhanden sind.",
            "Kann eine fallbezogene Pruefwarteschlange und einen Freigabe- oder Blockpfad erhalten, die an den verbundenen Agenten gebunden sind.",
            "Entscheiden Sie, welche Notizen, Freigaben oder formalen Bestaetigungen in Ihrem Governance-Prozess erfasst werden muessen.",
          ],
          [
            "Menschliche Autoritaet zum Stoppen oder Uebersteuern des Systems",
            "Kann zeigen, wo das Paket Freigabe oder Block empfiehlt.",
            "Kann diese Empfehlungen auf die Faelle und Runs zurueckfuehren, die sie ausgeloest haben.",
            "Definieren Sie, wer uebersteuern darf, wer das System stoppen darf und welche Autoritaet diese Person hat.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 14 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que resumer le chemin de supervision deja present dans le dossier genere. Apres integration de l'adapter, il peut rattacher ce chemin de supervision a de vrais runs, a des resultats de cas et a des enregistrements de revue de votre agent connecte.",
        headers: [
          "L'article 14 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Des cas qui exigent une revue humaine",
            "Peut resumer les cas exigeant approbation et les cas bloques deja visibles dans le dossier.",
            "Peut garder ces cas relies aux vrais runs, aux IDs de cas et aux evaluations de politique de l'agent connecte.",
            "Definissez quelles situations doivent toujours escalader, meme si elles ne sont pas signalees automatiquement.",
          ],
          [
            "Des raisons d'escalade ou de blocage",
            "Peut montrer les recommandations de controle, les cas bloques et les signaux de revue deja presents dans le dossier.",
            "Peut rattacher ces raisons a des runs reels, des constats et des sorties de politique specifiques.",
            "Redigez le seuil organisationnel final pour l'escalade, le rejet ou la gestion d'exception.",
          ],
          [
            "Une trace de ce que l'evaluateur a vu et decide",
            "Peut montrer l'etat de revue de mise en production et le resume de supervision deja presents dans le dossier.",
            "Peut conserver une file de revue liee aux cas et une piste d'approbation ou de blocage rattachee a l'agent connecte.",
            "Decidez quelles notes, approbations ou signatures de l'evaluateur doivent etre capturees dans votre processus de gouvernance.",
          ],
          [
            "Une autorite humaine pour stopper ou outrepasser le systeme",
            "Peut montrer ou le dossier recommande une approbation ou un blocage.",
            "Peut relier ces recommandations aux cas et aux runs qui les ont declenchees.",
            "Definissez qui peut outrepasser, qui peut arreter le systeme et quelle autorite cette personne detient.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still defines around Article 14",
        lead:
          "The toolkit can show the review path and its outputs. It does not choose your approval policy or assign authority for you.",
        headers: ["What you define", "When you define it", "Practical format to use"],
        rows: [
          [
            "Review roles",
            "Before the oversight process is used for a real release or governance review.",
            "A short role list naming who reviews, who can block, and who can approve exceptional cases.",
          ],
          [
            "Escalation and block thresholds",
            "When you formalize the oversight rules for your deployment.",
            "A short threshold table or numbered list describing what always escalates and what always blocks.",
          ],
          [
            "Override and stop authority",
            "When the organization needs an explicit stop or override rule.",
            "One concise rule naming who may stop the system, under what trigger, and what record must remain.",
          ],
          [
            "Review notes and sign-off expectations",
            "Before oversight records are used in governance or external review.",
            "A short note template describing what the reviewer must record with each approval, block, or escalation.",
          ],
          [
            "Final accountability assignment",
            "At governance sign-off or release sign-off.",
            "A named owner or approving role for the final oversight process.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team rund um Artikel 14 noch definiert",
        lead:
          "Das Toolkit kann den Pruefpfad und seine Ergebnisse zeigen. Es waehlt Ihre Freigaberichtlinie nicht und weist Autoritaet nicht fuer Sie zu.",
        headers: ["Was Sie definieren", "Wann Sie es definieren", "Praktisches Format"],
        rows: [
          [
            "Pruefrollen",
            "Bevor der Aufsichtsprozess fuer eine echte Inbetriebnahme oder Governance-Pruefung verwendet wird.",
            "Eine kurze Rollenliste dazu, wer prueft, wer blockieren darf und wer Ausnahmefaelle freigeben darf.",
          ],
          [
            "Eskalations- und Block-Schwellen",
            "Wenn Sie die Aufsichtsregeln fuer Ihren Einsatz formalisieren.",
            "Eine kurze Schwellwert-Tabelle oder nummerierte Liste dazu, was immer eskaliert und was immer blockiert.",
          ],
          [
            "Uebersteuerungs- und Stopp-Autoritaet",
            "Wenn die Organisation eine explizite Stopp- oder Uebersteuerungsregel braucht.",
            "Eine knappe Regel dazu, wer das System unter welchem Ausloeser stoppen darf und welche Aufzeichnung erhalten bleiben muss.",
          ],
          [
            "Pruefnotizen und Erwartungen an die Freigabe",
            "Bevor Aufsichts-Aufzeichnungen in Governance oder externer Pruefung verwendet werden.",
            "Ein kurzes Notiz-Template dazu, was die pruefende Person bei jeder Freigabe, jedem Block oder jeder Eskalation festhalten muss.",
          ],
          [
            "Finale Verantwortungszuweisung",
            "Bei der Governance-Freigabe oder der Freigabe zur Inbetriebnahme.",
            "Eine benannte verantwortliche Person oder eine freigebende Rolle fuer den finalen Aufsichtsprozess.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe definit encore autour de l'article 14",
        lead:
          "Le toolkit peut montrer le chemin de revue et ses sorties. Il ne choisit pas votre politique d'approbation et n'assigne pas l'autorite a votre place.",
        headers: ["Ce que vous definissez", "Quand vous le definissez", "Format pratique a utiliser"],
        rows: [
          [
            "Roles des evaluateurs",
            "Avant que le processus de supervision ne soit utilise pour une vraie mise en production ou une revue de gouvernance.",
            "Une courte liste de roles nommant qui revise, qui peut bloquer et qui peut approuver les cas exceptionnels.",
          ],
          [
            "Seuils d'escalade et de blocage",
            "Quand vous formalisez les regles de supervision pour votre deploiement.",
            "Une courte table de seuils ou une liste numerotee indiquant ce qui escalade toujours et ce qui bloque toujours.",
          ],
          [
            "Autorite d'override et d'arret",
            "Quand l'organisation a besoin d'une regle explicite d'arret ou d'override.",
            "Une regle concise indiquant qui peut arreter le systeme, sous quel declencheur et quel enregistrement doit rester.",
          ],
          [
            "Notes de l'evaluateur et attentes de validation",
            "Avant que les enregistrements de supervision ne soient utilises en gouvernance ou en revue externe.",
            "Un court modele de note indiquant ce que l'evaluateur doit enregistrer avec chaque approbation, blocage ou escalation.",
          ],
          [
            "Attribution finale de responsabilite",
            "A la validation de gouvernance ou a la validation de mise en production.",
            "Un responsable nomme ou un role approbateur pour le processus final de supervision.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 14 is evidenced through oversight and review outputs",
        lead:
          "The files below are the main evidence surfaces for Article 14. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 14", "Open file"],
        rows: [
          [
            "Human oversight summary - human-oversight-summary.json",
            "Main oversight output listing the review queue, approval-required cases, and blocked cases.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Release review - release-review.json",
            "Shows the release decision and required human actions tied to oversight outcomes.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Compare report - compare-report.json",
            "Shows case-level gate recommendations and policy-evaluation fields that feed Article 14.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Article 13 instructions - article-13-instructions.json",
            "Supports the operator-facing instructions that tell humans when to review or intervene.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 14 wird ueber Aufsichts- und Pruefergebnisse belegt",
        lead:
          "Die unten stehenden Dateien sind die wichtigsten Nachweis-Oberflaechen fuer Artikel 14. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 14 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Aufsichtsuebersicht - human-oversight-summary.json",
            "Zentrale Aufsichtsdatei mit Pruefwarteschlange, freigabepflichtigen Faellen und blockierten Faellen.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Zeigt die Freigabeentscheidung und erforderliche menschliche Aktionen, die an Aufsichts-Ergebnisse gebunden sind.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Vergleichsbericht - compare-report.json",
            "Zeigt fallbezogene Kontrollpunkt-Empfehlungen und Leitlinien-Auswertungen, die in Artikel 14 einfliessen.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Artikel-13-Anweisungen - article-13-instructions.json",
            "Stuetzt die operator-orientierten Anweisungen, die Menschen sagen, wann sie pruefen oder eingreifen muessen.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 14 est demontre par les sorties de supervision et de revue",
        lead:
          "Les fichiers ci-dessous sont les principales surfaces de preuve pour l'article 14. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 14", "Ouvrir le fichier"],
        rows: [
          [
            "Synthese de supervision humaine - human-oversight-summary.json",
            "Sortie principale de supervision listant la file de revue, les cas exigeant approbation et les cas bloques.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Montre la decision de mise en production et les actions humaines requises liees aux sorties de supervision.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Rapport de comparaison - compare-report.json",
            "Montre les recommandations de controle par cas et les champs d'evaluation de politique qui alimentent l'article 14.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Instructions Article 13 - article-13-instructions.json",
            "Soutient les instructions destinees aux operateurs qui disent aux humains quand revoir ou intervenir.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-15": {
    title: {
      en: "EU AI Act Article 15 - Accuracy and Robustness Template",
      de: "EU KI-Verordnung Artikel 15 - Vorlage fuer Genauigkeit und Robustheit",
      fr: "Article 15 de l'AI Act - Modele pour la precision et la robustesse",
    },
    description: {
      en: "Template for pass rates, repeatability signals, robustness checks, and technical evidence under Article 15.",
      de: "Vorlage fuer Pass-Rates, Wiederholbarkeitssignale, Robustheitschecks und technische Nachweise nach Artikel 15.",
      fr: "Modele pour les taux de reussite, les signaux de repetabilite, les controles de robustesse et les preuves techniques au titre de l'article 15.",
    },
    intro: {
      en:
        "Article 15 is where performance claims stop being slogans and start needing evidence. A reviewer wants to see quality signals, robustness and security constats, version-to-version comparison, and a clear point where the system is not ready for release.",
      de:
        "In Artikel 15 hoeren Leistungsversprechen auf, Schlagwoerter zu sein, und brauchen echte Nachweise. Eine pruefende Person will Qualitaetssignale, Robustheits- und Sicherheitsbefunde, Vergleiche zwischen Versionen und einen klaren Punkt sehen, an dem das System nicht fuer die Inbetriebnahme freigegeben werden sollte.",
      fr:
        "L'article 15 est l'endroit ou les promesses de performance cessent d'etre des slogans et commencent a exiger des preuves. Un evaluateur veut voir des signaux de qualite, des constats de robustesse et de securite, une comparaison entre versions et un point clair ou le systeme n'est pas pret pour la mise en production.",
    },
    requirement: {
      en:
        "A useful Article 15 section should show the quality signals that matter, the failures that still exist, the comparison across changes, and the threshold for releasing or blocking the current version.",
      de:
        "Ein nuetzlicher Abschnitt zu Artikel 15 sollte die relevanten Qualitaetssignale, die noch bestehenden Fehler, den Vergleich ueber Aenderungen hinweg und die Schwelle fuer Freigabe oder Blockierung der aktuellen Version zeigen.",
      fr:
        "Une section utile pour l'article 15 doit montrer les signaux de qualite qui comptent, les defaillances encore ouvertes, la comparaison entre les changements et le seuil de mise en production ou de blocage de la version actuelle.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 15 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only expose the quality and security outputs already present in the generated package. After adapter integration, it can keep those outputs tied to real runs, version changes, and repeatable evidence over time.",
        headers: [
          "Article 15 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "Quality and accuracy signals",
            "Shows pass rate, execution-quality status, and case outcomes already present in the rapport de comparaison.",
            "Keeps those signals tied to the connected agent's real runs, versions, and case-level evidence.",
            "Define which task metrics matter, what score is acceptable, and what counts as success for your use case.",
          ],
          [
            "Robustness and security constats",
            "Shows current security constats and risk levels already present in the package.",
            "Can keep those constats linked to the actual runs, tool behavior, and case outputs that triggered them.",
            "Explain which robustness or security constats are acceptable, and which require remediation before release.",
          ],
          [
            "Version-to-version comparison",
            "Shows baseline versus new comparison already built into the rapport de comparaison.",
            "Lets that comparison stay attached to real run inputs, outputs, and retained artifacts over time.",
            "Decide whether the chosen cases are sufficient to justify the claim you want to make.",
          ],
          [
            "A release threshold",
            "Shows current release recommendation and execution-quality status already in the package.",
            "Can keep the threshold evidence tied to recurring runs and release history as the system changes.",
            "Set the final threshold for release, escalation, or block and approve that decision.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 15 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit nur die Qualitaets- und Sicherheits-Ergebnisse zeigen, die bereits im erzeugten Paket vorhanden sind. Nach der Adapter-Integration kann es diese Ergebnisse an echte Runs, Versionsaenderungen und wiederholbare Nachweise ueber die Zeit binden.",
        headers: [
          "Artikel 15 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Qualitaets- und Genauigkeitssignale",
            "Zeigt Pass-Rate, Ausfuehrungsqualitaet und Fallergebnisse, die bereits im Vergleichsbericht vorhanden sind.",
            "Haelt diese Signale an echte Runs, Versionen und case-bezogene Nachweise des verbundenen Agenten gebunden.",
            "Definieren Sie, welche Task-Metriken zaehlen, welcher Wert akzeptabel ist und was fuer Ihren Use Case als Erfolg gilt.",
          ],
          [
            "Robustheits- und Security-Findings",
            "Zeigt aktuelle Sicherheitsbefunde und Risikostufen, die bereits im Paket vorhanden sind.",
            "Kann diese Befunde an reale Runs, Tool-Verhalten und Fallergebnisse binden, die sie ausgeloest haben.",
            "Erklaeren Sie, welche Robustheits- oder Sicherheitsbefunde akzeptabel sind und welche vor der Inbetriebnahme behoben werden muessen.",
          ],
          [
            "Vergleich von Version zu Version",
            "Zeigt den Baseline-vs-New-Vergleich, der bereits im Vergleichsbericht eingebaut ist.",
            "Ermoeglicht, dass dieser Vergleich ueber die Zeit an reale Run-Eingaben, Ergebnisse und aufbewahrte Artefakte gebunden bleibt.",
            "Entscheiden Sie, ob die gewaehlten Faelle ausreichen, um die Aussage zu stuetzen, die Sie treffen wollen.",
          ],
          [
            "Eine Freigabe-Schwelle",
            "Zeigt aktuelle Release-Empfehlung und Execution-Quality-Status, die bereits im Paket vorhanden sind.",
            "Kann Schwellennachweise an wiederkehrende Runs und Freigabe-Historie binden, waehrend sich das System aendert.",
            "Setzen Sie die finale Schwelle fuer Release, Eskalation oder Block und geben Sie diese Entscheidung frei.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 15 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que montrer les sorties qualite et securite deja presentes dans le dossier genere. Apres integration de l'adapter, il peut garder ces sorties liees a de vrais runs, a des changements de version et a des preuves repetables dans le temps.",
        headers: [
          "L'article 15 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Des signaux de qualite et de precision",
            "Montre le taux de reussite, l'etat de qualite d'execution et les resultats des cas deja presents dans le rapport de comparaison.",
            "Maintient ces signaux relies aux vrais runs, aux versions et aux preuves par cas de l'agent connecte.",
            "Definissez quelles metriques de tache comptent, quel score est acceptable et ce qui constitue un succes pour votre cas d'usage.",
          ],
          [
            "Des constats de robustesse et de securite",
            "Montre les constats de securite actuels et les niveaux de risque deja presents dans le dossier.",
            "Peut rattacher ces constats aux runs reels, au comportement des outils et aux sorties de cas qui les ont declenches.",
            "Expliquez quels constats de robustesse ou de securite sont acceptables et lesquels exigent une remediation avant la mise en production.",
          ],
          [
            "Une comparaison entre versions",
            "Montre la comparaison baseline-versus-new deja integree dans le rapport de comparaison.",
            "Permet a cette comparaison de rester attachee dans le temps aux vrais inputs de run, outputs et artefacts conserves.",
            "Decidez si les cas choisis suffisent pour justifier l'affirmation que vous voulez faire.",
          ],
          [
            "Un seuil de mise en production",
            "Montre la recommandation actuelle de mise en production et l'etat de qualite d'execution deja presents dans le dossier.",
            "Peut maintenir les preuves de seuil liees aux runs recurrents et a l'historique des mises en production a mesure que le systeme change.",
            "Fixez le seuil final pour la mise en production, l'escalade ou le blocage et approuvez cette decision.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still defines around Article 15",
        lead:
          "The toolkit can generate the evidence dossier. It does not decide what quality level is acceptable for your domain or whether the chosen case set is sufficient.",
        headers: ["What you define", "When you define it", "Practical format to use"],
        rows: [
          [
            "Task-specific success threshold",
            "Before you rely on the package to justify release or conformance claims.",
            "A short threshold statement or table naming the metric, target, and minimum acceptable result.",
          ],
          [
            "Why this case suite is sufficient",
            "When you claim the current evidence is enough to support a quality statement.",
            "A short rationale naming which cases cover the main risks, failure modes, or edge conditions.",
          ],
          [
            "Business impact of remaining failures",
            "When open regressions, degraded execution, or risky cases remain in the package.",
            "One or two sentences describing what those failures mean for your deployment and users.",
          ],
          [
            "Accepted robustness and security risk",
            "Before sign-off if any significant issue remains open.",
            "A short acceptance, block, or escalate decision plus the owner who approved it.",
          ],
          [
            "Broader performance claims",
            "Whenever you want to claim more than the package directly proves.",
            "A plain-language note separating what the evidence proves from any wider claim your organization wants to make.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team rund um Artikel 15 noch definiert",
        lead:
          "Das Toolkit kann das Nachweispaket erzeugen. Es entscheidet nicht, welches Qualitaetsniveau in Ihrer Domain akzeptabel ist oder ob die gewaehlte Fall-Suite ausreichend ist.",
        headers: ["Was Sie definieren", "Wann Sie es definieren", "Praktisches Format"],
        rows: [
          [
            "Task-spezifischer Erfolgsschwellenwert",
            "Bevor Sie sich auf das Paket stuetzen, um Release- oder Conformance-Aussagen zu rechtfertigen.",
            "Eine kurze Schwellenwert-Aussage oder Tabelle mit Metrik, Zielwert und minimal akzeptablem Ergebnis.",
          ],
          [
            "Warum diese Case-Suite ausreicht",
            "Wenn Sie behaupten, dass die aktuelle Evidence ausreicht, um eine Qualitaetsaussage zu stuetzen.",
            "Eine kurze Begruendung, welche Faelle die wichtigsten Risiken, Failure Modes oder Edge Conditions abdecken.",
          ],
          [
            "Business-Auswirkung verbleibender Fehler",
            "Wenn offene Regressionen, degradierte Ausfuehrung oder riskante Faelle im Paket verbleiben.",
            "Ein oder zwei Saetze dazu, was diese Fehler fuer Ihren Einsatz und Ihre Nutzer bedeuten.",
          ],
          [
            "Akzeptiertes Robustheits- und Security-Risiko",
            "Vor dem Sign-off, wenn ein signifikanter Punkt offen bleibt.",
            "Eine kurze Akzeptieren-, Blockieren- oder Eskalieren-Entscheidung plus der verantwortlichen Person, die sie freigegeben hat.",
          ],
          [
            "Breitere Leistungsaussagen",
            "Immer dann, wenn Sie mehr behaupten wollen, als das Paket direkt belegt.",
            "Eine Klartext-Notiz, die trennt, was die Nachweise belegen und welche weitergehende Aussage Ihre Organisation treffen moechte.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe definit encore autour de l'article 15",
        lead:
          "Le toolkit peut generer le dossier de preuves. Il ne decide pas quel niveau de qualite est acceptable dans votre domaine ni si la suite de cas choisie est suffisante.",
        headers: ["Ce que vous definissez", "Quand vous le definissez", "Format pratique a utiliser"],
        rows: [
          [
            "Seuil de succes specifique a la tache",
            "Avant de vous appuyer sur le dossier pour justifier des affirmations de mise en production ou de conformite.",
            "Une courte regle ou table de seuil indiquant la metrique, la cible et le resultat minimum acceptable.",
          ],
          [
            "Pourquoi cette suite de cas est suffisante",
            "Quand vous affirmez que les preuves actuelles suffisent a soutenir une declaration de qualite.",
            "Une courte justification indiquant quels cas couvrent les principaux risques, modes de defaillance ou conditions limites.",
          ],
          [
            "Impact metier des defaillances restantes",
            "Quand des regressions ouvertes, une execution degradee ou des cas risqus restent dans le dossier.",
            "Une ou deux phrases decrivant ce que ces defaillances signifient pour votre deploiement et vos utilisateurs.",
          ],
          [
            "Risque de robustesse et de securite accepte",
            "Avant la validation si un point significatif reste ouvert.",
            "Une courte decision d'acceptation, de blocage ou d'escalade, plus le nom de la personne responsable qui l'a approuvee.",
          ],
          [
            "Declarations de performance plus larges",
            "Des que vous voulez affirmer davantage que ce que le dossier prouve directement.",
            "Une note en langage clair separant ce que les preuves demontrent de toute affirmation plus large que votre organisation souhaite formuler.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 15 is evidenced through comparison, integrity, and release outputs",
        lead:
          "The files below are the main evidence surfaces for Article 15. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 15", "Open file"],
        rows: [
          [
            "Compare report - compare-report.json",
            "Main machine-readable comparison showing pass rates, execution quality, security constats, and highlighted cases.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Evaluator report - report.html",
            "Human-readable report used to inspect the same quality and regression outputs.",
            "demo/eu-ai-act/report.html",
          ],
          [
            "Manifest - artifacts/manifest.json",
            "Integrity index anchoring the files that support the Article 15 claims.",
            "demo/eu-ai-act/artifacts/manifest.json",
          ],
          [
            "Release review - release-review.json",
            "Shows how the current quality state affects release status and follow-up.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 15 wird ueber Vergleichs-, Integritaets- und Freigabe-Ergebnisse belegt",
        lead:
          "Die unten stehenden Dateien sind die wichtigsten Nachweis-Oberflaechen fuer Artikel 15. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 15 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Vergleichsbericht - compare-report.json",
            "Zentrale maschinenlesbare Vergleichsdatei mit Pass-Raten, Ausfuehrungsqualitaet, Sicherheitsbefunden und hervorgehobenen Faellen.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Auswertungsbericht - report.html",
            "Menschenlesbarer Bericht, mit dem dieselben Qualitaets- und Regressionsergebnisse geprueft werden.",
            "demo/eu-ai-act/report.html",
          ],
          [
            "Manifest - artifacts/manifest.json",
            "Integritaetsindex, der die Dateien verankert, welche die Aussagen nach Artikel 15 stuetzen.",
            "demo/eu-ai-act/artifacts/manifest.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Zeigt, wie der aktuelle Qualitaetszustand den Release-Status und die Nachverfolgung beeinflusst.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 15 est demontre par les sorties de comparaison, d'integrite et de mise en production",
        lead:
          "Les fichiers ci-dessous sont les principales surfaces de preuve pour l'article 15. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 15", "Ouvrir le fichier"],
        rows: [
          [
            "Rapport de comparaison - compare-report.json",
            "Principal fichier de comparaison lisible par machine montrant les taux de reussite, la qualite d'execution, les constats de securite et les cas mis en avant.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Rapport d'evaluation - report.html",
            "Rapport lisible par un humain utilise pour inspecter les memes sorties de qualite et de regression.",
            "demo/eu-ai-act/report.html",
          ],
          [
            "Manifest - artifacts/manifest.json",
            "Index d'integrite ancrant les fichiers qui soutiennent les affirmations de l'article 15.",
            "demo/eu-ai-act/artifacts/manifest.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Montre comment l'etat qualite actuel affecte le statut de mise en production et le suivi.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-17": {
    title: {
      en: "EU AI Act Article 17 - Quality Management System Template",
      de: "EU KI-Verordnung Artikel 17 - Vorlage fuer ein Qualitaetsmanagementsystem",
      fr: "Article 17 de l'AI Act - Modele pour le systeme de gestion de la qualite",
    },
    description: {
      en: "Template for QMS-lite controls: change management, testing discipline, monitoring continuity, and documentation ownership under Article 17.",
      de: "Vorlage fuer QMS-lite-Kontrollen: Aenderungsmanagement, Testdisziplin, Kontinuitaet der Beobachtung nach dem Inverkehrbringen und Dokumentationsverantwortung nach Artikel 17.",
      fr: "Modele pour des controles QMS-legers: gestion du changement, discipline de test, continuite de la surveillance et responsabilite documentaire au titre de l'article 17.",
    },
    intro: {
      en:
        "Article 17 is where teams have to show that their process is not ad hoc. A reviewer wants to see how changes are controlled, how testing is repeated, how monitoring feeds back into the process, and where written procedures still sit outside the product.",
      de:
        "In Artikel 17 muessen Teams zeigen, dass ihr Prozess nicht ad hoc ist. Eine pruefende Person will sehen, wie Aenderungen kontrolliert werden, wie Tests wiederholt werden, wie die Beobachtung nach dem Inverkehrbringen in den Prozess zurueckfliesst und wo schriftliche Verfahren weiterhin ausserhalb des Produkts liegen.",
      fr:
        "L'article 17 est l'endroit ou les equipes doivent montrer que leur processus n'est pas ad hoc. Un evaluateur veut voir comment les changements sont controles, comment les tests sont repetes, comment la surveillance alimente a nouveau le processus et ou les procedures ecrites restent encore hors du produit.",
    },
    requirement: {
      en:
        "A technical evidence dossier does not replace a full written QMS. What it can do is show a repeatable process scaffold: change control, testing discipline, monitoring continuity, and the places where written procedures still need operator ownership.",
      de:
        "Ein technisches Nachweispaket ersetzt kein vollstaendig schriftliches QMS. Was es leisten kann, ist ein wiederholbares Prozessgeruest zu zeigen: Aenderungskontrolle, Testdisziplin, Kontinuitaet der Beobachtung nach dem Inverkehrbringen und die Stellen, an denen schriftliche Verfahren weiterhin dem Operator gehoeren muessen.",
      fr:
        "Un dossier de preuves techniques ne remplace pas un QMS ecrit complet. Ce qu'il peut faire, c'est montrer un cadre de processus repetable: controle des changements, discipline de test, continuite de la surveillance et endroits ou des procedures ecrites restent a la charge de l'operateur.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 17 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only draft the QMS-lite file from the generated package. After adapter integration and recurring use, it can keep that scaffold tied to real release, monitoring, and follow-up outputs.",
        headers: [
          "Article 17 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "A controlled change path",
            "Creates a QMS-lite draft with the current system identity, process areas, and management-review triggers.",
            "Keeps that draft linked to real version changes, revues de mise en production, and sorties de comparaison for the connected system.",
            "Write the formal change procedure, approval path, and accountability rules your organization uses.",
          ],
          [
            "Repeatable testing before release",
            "Can point to the rapport de comparaison, revue de mise en production, and gate outputs already present in the package.",
            "Can keep those testing and gate outputs current as the connected agent is rerun over time.",
            "Define which suites, thresholds, and review steps are mandatory before release.",
          ],
          [
            "Monitoring feedback into the process",
            "Can point to monitoring-related gaps and unresolved follow-up already visible in the package.",
            "Can link the QMS-lite file to post-market monitoring, corrective-action linkage, and follow-up signals from recurring runs.",
            "Decide how monitoring constats feed into process updates, reviews, and escalations inside your organization.",
          ],
          [
            "Written procedures and ownership",
            "Can list operator inputs still required for the draft to be complete.",
            "Still does not write the formal procedures or assign legal accountability after integration.",
            "Write the procedures, assign accountable roles, and approve the final QMS documents.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 17 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit nur die QMS-lite-Datei aus dem erzeugten Paket entwerfen. Nach der Adapter-Integration und wiederkehrender Nutzung kann es dieses Geruest mit echten Freigabe-, Beobachtungs- und Folge-Ergebnissen verknuepfen.",
        headers: [
          "Artikel 17 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Einen kontrollierten Aenderungspfad",
            "Erzeugt einen QMS-lite-Entwurf mit aktueller Systemidentitaet, Prozessbereichen und Triggern fuer die Management-Pruefung.",
            "Haelt diesen Entwurf an reale Versionsaenderungen, Freigabepruefungen und Vergleichs-Ergebnisse des verbundenen Systems gebunden.",
            "Schreiben Sie das formale Aenderungsverfahren, den Freigabepfad und die Verantwortlichkeitsregeln Ihrer Organisation.",
          ],
          [
            "Wiederholbare Tests vor der Inbetriebnahme",
            "Kann auf Vergleichsbericht, Freigabepruefung und Ergebnisse aus Kontrollpunkten verweisen, die bereits im Paket vorhanden sind.",
            "Kann diese Test- und Kontrollpunkt-Ergebnisse aktuell halten, waehrend der verbundene Agent ueber die Zeit erneut ausgefuehrt wird.",
            "Definieren Sie, welche Suiten, Schwellen und Pruefschritte vor einer Inbetriebnahme verpflichtend sind.",
          ],
          [
            "Rueckkopplung aus der Beobachtung in den Prozess",
            "Kann auf Luecken in der Beobachtung nach dem Inverkehrbringen und offene Nachverfolgung verweisen, die bereits im Paket sichtbar sind.",
            "Kann die QMS-lite-Datei mit der Beobachtung nach dem Inverkehrbringen, der Verknuepfung von Korrekturmassnahmen und Nachverfolgungssignalen aus wiederkehrenden Runs verknuepfen.",
            "Entscheiden Sie, wie Befunde aus der Beobachtung nach dem Inverkehrbringen in Prozessupdates, Pruefungen und Eskalationen Ihrer Organisation einfliessen.",
          ],
          [
            "Schriftliche Verfahren und Verantwortlichkeit",
            "Kann die Operator-Eingaben auflisten, die fuer einen vollstaendigen Entwurf noch fehlen.",
            "Schreibt auch nach der Integration keine formalen Verfahren und weist keine rechtliche Verantwortlichkeit zu.",
            "Schreiben Sie die Verfahren, benennen Sie verantwortliche Rollen und geben Sie die finalen QMS-Dokumente frei.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 17 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que preparer le fichier QMS-lite a partir du dossier genere. Apres integration de l'adapter et usage recurrent, il peut relier ce cadre a de vraies sorties de mise en production, de surveillance et de suivi.",
        headers: [
          "L'article 17 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Un chemin de changement controle",
            "Cree un brouillon QMS-lite avec l'identite actuelle du systeme, les domaines de processus et les declencheurs de revue de gestion.",
            "Maintient ce brouillon lie aux vrais changements de version, aux revues de mise en production et aux sorties de comparaison du systeme connecte.",
            "Redigez la procedure formelle de changement, le chemin d'approbation et les regles de responsabilite de votre organisation.",
          ],
          [
            "Des tests repetables avant la mise en production",
            "Peut pointer vers le rapport de comparaison, la revue de mise en production et les sorties de gate deja presentes dans le dossier.",
            "Peut garder ces sorties de test et de gate a jour a mesure que l'agent connecte est relance dans le temps.",
            "Definissez quelles suites, quels seuils et quelles etapes de revue sont obligatoires avant la mise en production.",
          ],
          [
            "Un retour de la surveillance dans le processus",
            "Peut pointer vers des lacunes liees a la surveillance et des suivis ouverts deja visibles dans le dossier.",
            "Peut relier le fichier QMS-lite a la surveillance post-commercialisation, au lien avec les actions correctives et aux signaux de suivi issus de runs recurrents.",
            "Decidez comment les constats de surveillance alimentent les mises a jour de processus, les revues et les escalades dans votre organisation.",
          ],
          [
            "Des procedures ecrites et une responsabilite claire",
            "Peut lister les inputs operateur encore requis pour que le brouillon soit complet.",
            "Ne redige toujours pas les procedures formelles ni n'assigne la responsabilite juridique apres integration.",
            "Redigez les procedures, attribuez les roles responsables et approuvez les documents QMS finaux.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 17",
        lead:
          "The toolkit can generate a technical QMS scaffold. It does not replace the written QMS procedures, training, or organizational accountability structure.",
        headers: ["What you add", "When you add it", "Practical format to use"],
        rows: [
          [
            "Written procedure set",
            "Before you treat the Article 17 package as part of a real QMS review.",
            "A short list of linked procedures covering change control, revue de mise en production, issue follow-up, and monitoring escalation.",
          ],
          [
            "Document control and approval path",
            "When QMS documents must be versioned, approved, and updated formally.",
            "A document-control note naming owner, versioning rule, and approval step.",
          ],
          [
            "Training and competency expectations",
            "Before reviewer, operator, or engineering roles are treated as part of the QMS.",
            "A role-based note describing who must be trained and what evidence of competency you keep.",
          ],
          [
            "Supplier and external-component controls",
            "Whenever third-party tools, models, or vendors affect the managed system.",
            "A short control note naming the external dependency and how it is reviewed or approved.",
          ],
          [
            "Named accountable roles",
            "At governance sign-off or QMS review.",
            "A simple role map naming who owns release control, monitoring follow-up, and final approval.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team noch zu Artikel 17 hinzufuegt",
        lead:
          "Das Toolkit kann ein technisches QMS-Geruest erzeugen. Es ersetzt nicht die schriftlichen QMS-Verfahren, Schulungen oder die organisatorische Verantwortungsstruktur.",
        headers: ["Was Sie hinzufuegen", "Wann Sie es hinzufuegen", "Praktisches Format"],
        rows: [
          [
            "Satz schriftlicher Verfahren",
            "Bevor Sie das Artikel-17-Paket als Teil einer echten QMS-Pruefung verwenden.",
            "Eine kurze Liste verknuepfter Verfahren zu Aenderungskontrolle, Freigabepruefung, Problem-Nachverfolgung und Eskalation aus der Beobachtung nach dem Inverkehrbringen.",
          ],
          [
            "Dokumentenlenkung und Freigabepfad",
            "Wenn QMS-Dokumente versioniert, formal freigegeben und aktualisiert werden muessen.",
            "Eine Notiz zur Dokumentenlenkung mit verantwortlicher Person, Versionierungsregel und Freigabeschritt.",
          ],
          [
            "Erwartungen an Training und Kompetenz",
            "Bevor pruefende, operative oder technische Rollen als Teil des QMS gelten.",
            "Eine rollenbasierte Notiz dazu, wer geschult sein muss und welche Kompetenznachweise aufbewahrt werden.",
          ],
          [
            "Kontrollen fuer Zulieferer und externe Komponenten",
            "Immer dann, wenn Dritttools, Modelle oder Anbieter das verwaltete System beeinflussen.",
            "Eine kurze Kontrollnotiz mit externer Abhaengigkeit und Art der Pruefung oder Freigabe.",
          ],
          [
            "Benannte verantwortliche Rollen",
            "Bei der Governance-Freigabe oder in der QMS-Pruefung.",
            "Eine einfache Rollenkarte dazu, wer Freigabekontrolle, Nachverfolgung aus der Beobachtung nach dem Inverkehrbringen und finale Freigabe verantwortet.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore a l'article 17",
        lead:
          "Le toolkit peut generer un cadre QMS technique. Il ne remplace pas les procedures QMS ecrites, la formation ni la structure de responsabilite de l'organisation.",
        headers: ["Ce que vous ajoutez", "Quand vous l'ajoutez", "Format pratique a utiliser"],
        rows: [
          [
            "Ensemble de procedures ecrites",
            "Avant de traiter le dossier Article 17 comme partie d'une vraie revue du QMS.",
            "Une courte liste de procedures liees couvrant le controle du changement, la revue de mise en production, le suivi des problemes et l'escalade de surveillance.",
          ],
          [
            "Controle documentaire et chemin d'approbation",
            "Quand les documents QMS doivent etre versionnes, approuves et mis a jour formellement.",
            "Une note de controle documentaire indiquant le responsable, la regle de versionnage et l'etape d'approbation.",
          ],
          [
            "Attentes de formation et de competence",
            "Avant que les roles d'evaluateur, d'operateur ou d'ingenierie ne soient traites comme partie du QMS.",
            "Une note par role decrivant qui doit etre forme et quelle preuve de competence est conservee.",
          ],
          [
            "Controles pour fournisseurs et composants externes",
            "Des que des outils tiers, des modeles ou des fournisseurs affectent le systeme gere.",
            "Une courte note de controle nommant la dependance externe et la facon dont elle est revue ou approuvee.",
          ],
          [
            "Roles responsables nommes",
            "Lors de la validation de gouvernance ou de la revue du QMS.",
            "Une carte simple des roles nommant qui possede le controle de mise en production, le suivi de surveillance et l'approbation finale.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 17 is a QMS-lite scaffold inside the wider package",
        lead:
          "The files below are the main evidence surfaces for Article 17. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 17", "Open file"],
        rows: [
          [
            "Article 17 QMS-lite - article-17-qms-lite.json",
            "Main draft file for the Article 17 technical process scaffold.",
            "demo/eu-ai-act/compliance/article-17-qms-lite.json",
          ],
          [
            "Release review - release-review.json",
            "Shows the release controls and human actions that feed the QMS scaffold.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Post-market monitoring - post-market-monitoring.json",
            "Shows how post-release monitoring can feed back into the process.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Compare report - compare-report.json",
            "Provides the repeatable testing and change evidence the QMS scaffold references.",
            "demo/eu-ai-act/compare-report.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 17 ist ein QMS-lite-Geruest innerhalb des breiteren Pakets",
        lead:
          "Die unten stehenden Dateien sind die wichtigsten Nachweis-Oberflaechen fuer Artikel 17. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 17 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Artikel-17-QMS-lite - article-17-qms-lite.json",
            "Zentrale Entwurfsdatei fuer das technische Prozessgeruest nach Artikel 17.",
            "demo/eu-ai-act/compliance/article-17-qms-lite.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Zeigt die Kontrollen zur Inbetriebnahme und die menschlichen Aktionen, die in das QMS-Geruest einfliessen.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Beobachtung nach dem Inverkehrbringen - post-market-monitoring.json",
            "Zeigt, wie die Beobachtung nach der Inbetriebnahme in den Prozess zurueckfliessen kann.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Vergleichsbericht - compare-report.json",
            "Liefert die wiederholbaren Test- und Aenderungsnachweise, auf die sich das QMS-Geruest stuetzt.",
            "demo/eu-ai-act/compare-report.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 17 est un cadre QMS-lite dans le dossier plus large",
        lead:
          "Les fichiers ci-dessous sont les principales surfaces de preuve pour l'article 17. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 17", "Ouvrir le fichier"],
        rows: [
          [
            "Cadre QMS-lite Article 17 - article-17-qms-lite.json",
            "Fichier brouillon principal pour le cadre de processus technique de l'article 17.",
            "demo/eu-ai-act/compliance/article-17-qms-lite.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Montre les controles de mise en production et les actions humaines qui alimentent le cadre QMS.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Surveillance post-commercialisation - post-market-monitoring.json",
            "Montre comment la surveillance apres mise en production peut revenir dans le processus.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Rapport de comparaison - compare-report.json",
            "Fournit les preuves de test repetable et de changement auxquelles le cadre QMS fait reference.",
            "demo/eu-ai-act/compare-report.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-72": {
    title: {
      en: "EU AI Act Article 72 - Post-Market Monitoring Template",
      de: "EU KI-Verordnung Artikel 72 - Vorlage fuer die Beobachtung nach dem Inverkehrbringen",
      fr: "Article 72 de l'AI Act - Modele pour la surveillance post-commercialisation",
    },
    description: {
      en: "Template for monitoring cadence, escalation triggers, drift signals, and evidence continuity under Article 72.",
      de: "Vorlage fuer die Taktung der Beobachtung nach dem Inverkehrbringen, Eskalations-Trigger, Drift-Signale und Nachweis-Kontinuitaet nach Artikel 72.",
      fr: "Modele pour la cadence de surveillance, les declencheurs d'escalade, les signaux de derive et la continuite des preuves au titre de l'article 72.",
    },
    intro: {
      en:
        "Article 72 is where teams move from one-time packaging into continuous monitoring. A reviewer wants to see what signals are watched after release, how often they are reviewed, what triggers escalation, and how monitoring links back to the original evidence dossier.",
      de:
        "In Artikel 72 wechseln Teams von einmaliger Paketierung zu kontinuierlicher Beobachtung nach dem Inverkehrbringen. Eine pruefende Person will sehen, welche Signale nach der Inbetriebnahme beobachtet werden, wie oft sie geprueft werden, was eine Eskalation ausloest und wie diese Beobachtung zum urspruenglichen Nachweispaket zurueckverweist.",
      fr:
        "L'article 72 est l'endroit ou les equipes passent d'un packaging ponctuel a une surveillance continue. Un evaluateur veut voir quels signaux sont suivis apres la mise en production, a quelle frequence ils sont revus, ce qui declenche une escalade et comment la surveillance renvoie au dossier de preuves d'origine.",
    },
    requirement: {
      en:
        "For agent systems, post-market monitoring is usually where dashboards stop being enough. Reviewers need a documented cadence, named triggers, and a path from drift or blocking constats back into review and corrective action.",
      de:
        "Bei Agent-Systemen ist die Beobachtung nach dem Inverkehrbringen meist der Punkt, an dem Dashboards nicht mehr ausreichen. Pruefende Personen brauchen eine dokumentierte Kadenz, benannte Trigger und einen Pfad von Drift oder blockierenden Befunden zurueck in Pruefung und Korrekturmassnahmen.",
      fr:
        "Pour les systemes d'agents, la surveillance post-commercialisation est souvent l'endroit ou les tableaux de bord ne suffisent plus. Les evaluateurs ont besoin d'une cadence documentee, de declencheurs nommes et d'un chemin ramenant la derive ou les constats bloquants vers la revue et l'action corrective.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 72 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent and collecting recurring history, the toolkit can only draft the monitoring plan from the current package. After adapter integration and recurring runs, it can add monitoring history, drift signals, and linked review outputs.",
        headers: [
          "Article 72 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "A monitoring plan",
            "Creates a draft monitoring-plan file with current objectives, signal sources, and operator inputs still required.",
            "Keeps that plan tied to real monitoring history, signal sources, and recurring outputs from the connected system.",
            "Set the final cadence, responsible teams, and the exact operating thresholds for your deployment.",
          ],
          [
            "Named triggers for new review or escalation",
            "Can point to current execution-quality issues or open risks already visible in the package.",
            "Can add drift signals, recurring failures, blocking constats, and linked review outcomes from recurring runs.",
            "Decide which triggers require escalation, which require only review, and which require incident preparation.",
          ],
          [
            "A continuity loop back into governance",
            "Can show how the current package already links revue de mise en production and unresolved gaps.",
            "Can link monitoring outputs back to revue de mise en production, Article 9 risk updates, and corrective-action follow-up.",
            "Define the response workflow, owner, and timeline once a monitoring trigger fires.",
          ],
          [
            "Post-release interpretation and response",
            "Can expose the signals and the structured outputs generated from them.",
            "Still does not decide the commercial, legal, or organizational meaning of those signals after integration.",
            "Interpret the signal, choose the action, and approve any resulting operational or regulatory response.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 72 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten und ohne wiederkehrende Historie kann das Toolkit nur den Plan zur Beobachtung nach dem Inverkehrbringen aus dem aktuellen Paket entwerfen. Nach der Adapter-Integration und wiederkehrenden Runs kann es den Verlauf der Beobachtung, Drift-Signale und verknuepfte Pruefergebnisse hinzufuegen.",
        headers: [
          "Artikel 72 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Einen Plan zur Beobachtung nach dem Inverkehrbringen",
            "Erzeugt eine Datei fuer den Beobachtungsplan mit aktuellen Zielen, Signalquellen und noch erforderlichen Operator-Eingaben.",
            "Haelt diesen Plan an einen realen Beobachtungsverlauf, Signalquellen und wiederkehrende Ergebnisse des verbundenen Systems gebunden.",
            "Legen Sie finale Kadenz, verantwortliche Teams und die genauen Betriebsschwellen fuer Ihren Einsatz fest.",
          ],
          [
            "Benannte Trigger fuer neue Pruefung oder Eskalation",
            "Kann auf aktuelle Probleme der Ausfuehrungsqualitaet oder offene Risiken verweisen, die bereits im Paket sichtbar sind.",
            "Kann Drift-Signale, wiederkehrende Fehler, blockierende Befunde und verknuepfte Pruefergebnisse aus wiederkehrenden Runs hinzufuegen.",
            "Entscheiden Sie, welche Trigger eskalieren muessen, welche nur eine Pruefung verlangen und welche die Vorbereitung eines Vorfalls ausloesen.",
          ],
          [
            "Eine Kontinuitaetsschleife zurueck in die Governance",
            "Kann zeigen, wie das aktuelle Paket bereits Freigabepruefung und offene Luecken verknuepft.",
            "Kann Ergebnisse der Beobachtung zurueck an Freigabepruefung, Artikel-9-Risikoupdates und die Nachverfolgung von Korrekturmassnahmen binden.",
            "Definieren Sie den Reaktionsablauf, die verantwortliche Person und den Zeitplan, sobald ein Beobachtungs-Trigger ausloest.",
          ],
          [
            "Interpretation und Reaktion nach der Inbetriebnahme",
            "Kann die Signale und die daraus erzeugten strukturierten Ergebnisse sichtbar machen.",
            "Entscheidet auch nach der Integration nicht ueber die kommerzielle, rechtliche oder organisatorische Bedeutung dieser Signale.",
            "Interpretieren Sie das Signal, waehlen Sie die Massnahme und geben Sie jede operative oder regulatorische Reaktion frei.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 72 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent et sans historique recurrent, le toolkit ne peut que preparer le plan de surveillance a partir du dossier actuel. Apres integration de l'adapter et runs recurrents, il peut ajouter l'historique de surveillance, les signaux de derive et les sorties de revue liees.",
        headers: [
          "L'article 72 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Un plan de surveillance",
            "Cree un fichier de plan de surveillance avec les objectifs actuels, les sources de signal et les inputs operateur encore requis.",
            "Maintient ce plan lie a un historique de surveillance reel, a des sources de signal et a des sorties recurrentes du systeme connecte.",
            "Fixez la cadence finale, les equipes responsables et les seuils d'exploitation exacts pour votre deploiement.",
          ],
          [
            "Des declencheurs nommes pour une nouvelle revue ou une escalade",
            "Peut pointer vers des problemes actuels de qualite d'execution ou des risques ouverts deja visibles dans le dossier.",
            "Peut ajouter des signaux de derive, des echecs recurrents, des constats bloquants et des sorties de revue liees issues de runs recurrents.",
            "Decidez quels declencheurs exigent une escalade, lesquels exigent seulement une revue et lesquels exigent une preparation d'incident.",
          ],
          [
            "Une boucle de continuite vers la gouvernance",
            "Peut montrer comment le dossier actuel relie deja la revue de mise en production et les ecarts non resolus.",
            "Peut relier les sorties de surveillance a la revue de mise en production, aux mises a jour de risque Article 9 et au suivi des actions correctives.",
            "Definissez le workflow de reponse, le responsable et le calendrier quand un declencheur de surveillance se produit.",
          ],
          [
            "Une interpretation et une reponse apres mise en production",
            "Peut exposer les signaux et les sorties structurees generees a partir de ceux-ci.",
            "Ne decide toujours pas, apres integration, du sens commercial, juridique ou organisationnel de ces signaux.",
            "Interpretez le signal, choisissez l'action et approuvez toute reponse operationnelle ou reglementaire resultante.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 72",
        lead:
          "The toolkit can scaffold the monitoring plan and package the evidence history. It does not choose your cadence, escalation workflow, or business thresholds for you.",
        headers: ["What you add", "When you add it", "Practical format to use"],
        rows: [
          [
            "Monitoring cadence",
            "Before the plan is used in production or governance review.",
            "A short schedule naming how often the signals are reviewed and by whom.",
          ],
          [
            "Business and governance thresholds",
            "When you define what counts as a meaningful drift, recurring failure, or trend change.",
            "A short threshold list or table naming the trigger and the action it causes.",
          ],
          [
            "Escalation workflow",
            "Before monitoring outputs are used to trigger real follow-up work.",
            "A simple path naming who reviews first, who escalates, and who approves the next step.",
          ],
          [
            "Corrective-action ownership",
            "Whenever a monitoring trigger requires remediation or re-review.",
            "A named owner and review date for each class of monitoring-driven follow-up.",
          ],
          [
            "Regulator, customer, or internal reporting obligations",
            "If post-market signals may have external reporting consequences.",
            "A short policy note naming what must be reported, to whom, and under which trigger.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team noch zu Artikel 72 hinzufuegt",
        lead:
          "Das Toolkit kann den Plan zur Beobachtung nach dem Inverkehrbringen aufbauen und die Nachweis-Historie in ein Paket uebernehmen. Es waehlt weder Ihre Kadenz noch Ihren Eskalationsablauf oder Geschaeftsschwellen fuer Sie.",
        headers: ["Was Sie hinzufuegen", "Wann Sie es hinzufuegen", "Praktisches Format"],
        rows: [
          [
            "Kadenz der Beobachtung",
            "Bevor der Plan in Produktion oder einer Governance-Pruefung verwendet wird.",
            "Ein kurzer Zeitplan dazu, wie oft die Signale geprueft werden und von wem.",
          ],
          [
            "Business- und Governance-Schwellen",
            "Wenn Sie definieren, was als bedeutsame Drift, wiederkehrender Fehler oder Trendwechsel gilt.",
            "Eine kurze Schwellenliste oder Tabelle mit Trigger und ausgeloester Aktion.",
          ],
          [
            "Eskalationsworkflow",
            "Bevor Ergebnisse der Beobachtung reale Nachverfolgung ausloesen duerfen.",
            "Ein einfacher Pfad dazu, wer zuerst prueft, wer eskaliert und wer den naechsten Schritt freigibt.",
          ],
          [
            "Verantwortung fuer Korrekturmassnahmen",
            "Immer dann, wenn ein Beobachtungs-Trigger Behebung oder erneute Pruefung erfordert.",
            "Eine benannte verantwortliche Person und ein Pruefdatum fuer jede Klasse der durch Beobachtung ausgeloesten Nachverfolgung.",
          ],
          [
            "Pflichten fuer Berichte an Aufsicht, Kunden oder intern",
            "Wenn Signale aus der Beobachtung nach dem Inverkehrbringen externe Berichtspflichten ausloesen koennen.",
            "Eine kurze Richtlinien-Notiz dazu, was an wen und unter welchem Trigger berichtet werden muss.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore a l'article 72",
        lead:
          "Le toolkit peut cadrer le plan de surveillance et assembler l'historique des preuves dans le dossier. Il ne choisit ni votre cadence, ni votre workflow d'escalade, ni vos seuils metier a votre place.",
        headers: ["Ce que vous ajoutez", "Quand vous l'ajoutez", "Format pratique a utiliser"],
        rows: [
          [
            "Cadence de surveillance",
            "Avant que le plan ne soit utilise en production ou en revue de gouvernance.",
            "Un court calendrier indiquant a quelle frequence les signaux sont revus et par qui.",
          ],
          [
            "Seuils metier et de gouvernance",
            "Quand vous definissez ce qui compte comme derive significative, echec recurrent ou changement de tendance.",
            "Une courte liste ou table de seuils indiquant le declencheur et l'action qu'il provoque.",
          ],
          [
            "Workflow d'escalade",
            "Avant que les sorties de surveillance ne declenchent un vrai travail de suivi.",
            "Un chemin simple indiquant qui revoit en premier, qui escalade et qui approuve l'etape suivante.",
          ],
          [
            "Responsable de l'action corrective",
            "Quand un declencheur de surveillance exige une remediation ou une nouvelle revue.",
            "Un responsable nomme et une date de revue pour chaque classe de suivi issue de la surveillance.",
          ],
          [
            "Obligations de reporting vers regulateur, clients ou interne",
            "Si des signaux post-market peuvent avoir des consequences de reporting externe.",
            "Une courte note de politique indiquant ce qui doit etre reporte, a qui et sous quel declencheur.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 72 is built from monitoring, review, and risk-update files",
        lead:
          "The files below are the main evidence surfaces for Article 72. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 72", "Open file"],
        rows: [
          [
            "Article 72 monitoring plan - article-72-monitoring-plan.json",
            "Main draft file for the Article 72 monitoring section.",
            "demo/eu-ai-act/compliance/article-72-monitoring-plan.json",
          ],
          [
            "Post-market monitoring - post-market-monitoring.json",
            "Current monitoring history and drift evidence used after release.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Release review - release-review.json",
            "Shows how monitoring constats link back to release status and follow-up.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Article 9 risk register - article-9-risk-register.json",
            "Shows how post-release constats can reopen or update risk entries.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 72 wird aus Dateien zur Beobachtung nach dem Inverkehrbringen, zur Pruefung und zu Risiko-Updates aufgebaut",
        lead:
          "Die unten stehenden Dateien sind die wichtigsten Nachweis-Oberflaechen fuer Artikel 72. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 72 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Artikel-72-Plan zur Beobachtung nach dem Inverkehrbringen - article-72-monitoring-plan.json",
            "Zentrale Entwurfsdatei fuer den Beobachtungsabschnitt nach Artikel 72.",
            "demo/eu-ai-act/compliance/article-72-monitoring-plan.json",
          ],
          [
            "Beobachtung nach dem Inverkehrbringen - post-market-monitoring.json",
            "Aktueller Verlauf der Beobachtung und Drift-Nachweise, die nach der Inbetriebnahme verwendet werden.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Zeigt, wie Befunde aus der Beobachtung mit dem Status der Inbetriebnahme und der Nachverfolgung verknuepft sind.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Artikel-9-Risikoregister - article-9-risk-register.json",
            "Zeigt, wie Befunde nach der Inbetriebnahme Risikoeintraege wieder oeffnen oder aktualisieren koennen.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 72 est construit a partir de fichiers de surveillance, de revue et de mise a jour du risque",
        lead:
          "Les fichiers ci-dessous sont les principales surfaces de preuve pour l'article 72. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 72", "Ouvrir le fichier"],
        rows: [
          [
            "Plan de surveillance Article 72 - article-72-monitoring-plan.json",
            "Fichier brouillon principal pour la section de surveillance de l'article 72.",
            "demo/eu-ai-act/compliance/article-72-monitoring-plan.json",
          ],
          [
            "Surveillance post-commercialisation - post-market-monitoring.json",
            "Historique actuel de surveillance et preuves de derive utilisees apres la mise en production.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Montre comment les constats de surveillance se relient au statut de mise en production et au suivi.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Registre de risques Article 9 - article-9-risk-register.json",
            "Montre comment des constats apres mise en production peuvent reouvrir ou mettre a jour des entrees de risque.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-73": {
    title: {
      en: "EU AI Act Article 73 - Serious Incident Template",
      de: "EU KI-Verordnung Artikel 73 - Vorlage fuer schwerwiegende Vorfaelle",
      fr: "Article 73 de l'AI Act - Modele pour les incidents graves",
    },
    description: {
      en: "Template for serious-incident triage, notification preparation, corrective-action linkage, and operator-owned decision points under Article 73.",
      de: "Vorlage fuer Triage schwerwiegender Vorfaelle, Vorbereitung von Meldungen, Verknuepfung von Korrekturmassnahmen und operator-verantwortete Entscheidungspunkte nach Artikel 73.",
      fr: "Modele pour le triage des incidents graves, la preparation de notification, le lien avec l'action corrective et les points de decision restant a la charge de l'operateur au titre de l'article 73.",
    },
    intro: {
      en:
        "Article 73 is not just about writing an incident memo after something goes wrong. The hard part is having a structured path that can detect likely incidents, gather the relevant evidence quickly, and prepare a handoff without pretending that the toolkit decides the legal threshold by itself.",
      de:
        "Artikel 73 bedeutet nicht nur, nach einem Vorfall eine Notiz zu schreiben. Die Schwierigkeit besteht darin, einen strukturierten Pfad zu haben, der wahrscheinliche Vorfaelle erkennt, die relevanten Nachweise schnell zusammenstellt und eine Uebergabe vorbereitet, ohne so zu tun, als entscheide das Toolkit selbst die rechtliche Schwelle.",
      fr:
        "L'article 73 ne consiste pas seulement a rediger une note d'incident quand quelque chose tourne mal. La difficulte est d'avoir un chemin structure capable de detecter les incidents probables, de rassembler rapidement les preuves pertinentes et de preparer une transmission sans pretendre que le toolkit decide a lui seul du seuil juridique.",
    },
    requirement: {
      en:
        "A strong Article 73 section should explain how likely incidents are triaged, what evidence is assembled, how corrective action links back into monitoring and review, and where operator-owned legal judgment still begins.",
      de:
        "Ein starker Abschnitt zu Artikel 73 sollte erklaeren, wie wahrscheinliche Vorfaelle triagiert werden, welche Nachweise zusammengetragen werden, wie Korrekturmassnahmen in die Beobachtung nach dem Inverkehrbringen und in Pruefungen zurueckfuehren und wo die vom Operator verantwortete rechtliche Beurteilung beginnt.",
      fr:
        "Une section solide pour l'article 73 doit expliquer comment les incidents probables sont tries, quelles preuves sont assemblees, comment l'action corrective se reconnecte a la surveillance et a la revue, et ou commence encore le jugement juridique a la charge de l'operateur.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 73 expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only draft the dossier d'incident grave from the current package. After adapter integration and monitoring history, it can add real triggers, linked evidence, and corrective-action references from live outputs.",
        headers: [
          "Article 73 expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "A trigger list for incident review",
            "Creates a serious-incident draft with current machine triage, trigger categories, and open operator inputs.",
            "Can link that draft to real monitoring signals, blocked cases, approval cases, and release-review outcomes.",
            "Decide which triggers count as serious-incident review triggers in your legal and operational context.",
          ],
          [
            "A technical evidence dossier for triage",
            "Can point to the current rapport de comparaison, review outputs, and linked dossier files already in the package.",
            "Can assemble those files around the specific cases and signals that triggered the incident review.",
            "Decide which additional documents, witnesses, or external records must be added for a real incident review.",
          ],
          [
            "Corrective-action linkage",
            "Can show the current corrective-action references already present in the generated pack.",
            "Can keep those references linked to monitoring history, revue de mise en production, and related article outputs over time.",
            "Choose the remediation owner, deadline, and approval workflow for the corrective action.",
          ],
          [
            "A reporting decision boundary",
            "Can show that incident triggers and supporting evidence exist.",
            "Still does not decide whether the legal threshold for reporting is met after integration.",
            "Make the legal reportability decision, write the notification text, and approve any authority communication.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 73 verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit das Vorfallspaket fuer schwerwiegende Vorfaelle nur aus dem aktuellen Paket entwerfen. Nach der Adapter-Integration und dem Verlauf der Beobachtung nach dem Inverkehrbringen kann es reale Trigger, verknuepfte Nachweise und Referenzen zu Korrekturmassnahmen aus Live-Ergebnissen hinzufuegen.",
        headers: [
          "Artikel 73 verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Eine Trigger-Liste fuer die Vorfallspruefung",
            "Erzeugt einen Entwurf fuer einen schwerwiegenden Vorfall mit aktueller maschineller Triage, Trigger-Kategorien und offenen Operator-Eingaben.",
            "Kann diesen Entwurf an reale Signale aus der Beobachtung nach dem Inverkehrbringen, blockierte Faelle, Freigabefaelle und Ergebnisse aus der Freigabepruefung binden.",
            "Entscheiden Sie, welche Trigger in Ihrem rechtlichen und operativen Kontext als Ausloeser fuer eine Vorfallspruefung gelten.",
          ],
          [
            "Ein technisches Nachweispaket fuer die Triage",
            "Kann auf aktuellen Vergleichsbericht, Pruefergebnisse und verknuepfte Dossier-Dateien verweisen, die bereits im Paket vorhanden sind.",
            "Kann diese Dateien um die konkreten Faelle und Signale herum zusammenstellen, die die Vorfallspruefung ausgeloest haben.",
            "Entscheiden Sie, welche zusaetzlichen Dokumente, Zeugenaussagen oder externen Unterlagen fuer eine echte Vorfallspruefung hinzugefuegt werden muessen.",
          ],
          [
            "Verknuepfung von Korrekturmassnahmen",
            "Kann die aktuellen Referenzen zu Korrekturmassnahmen zeigen, die bereits im erzeugten Paket vorhanden sind.",
            "Kann diese Referenzen ueber die Zeit mit dem Verlauf der Beobachtung nach dem Inverkehrbringen, der Freigabepruefung und verwandten Artikelergebnissen verknuepfen.",
            "Waehlen Sie verantwortliche Person, Frist und Freigabeworkflow fuer die Korrekturmassnahme.",
          ],
          [
            "Eine Entscheidungsgrenze fuer Meldepflicht",
            "Kann zeigen, dass Vorfall-Trigger und stuetzende Nachweise vorhanden sind.",
            "Entscheidet auch nach der Integration nicht, ob die rechtliche Meldeschwelle erreicht ist.",
            "Treffen Sie die rechtliche Entscheidung zur Meldung, schreiben Sie den Meldetext und geben Sie jede Behoerdenkommunikation frei.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 73 exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que preparer le dossier d'incident grave a partir du dossier actuel. Apres integration de l'adapter et historique de surveillance, il peut ajouter de vrais declencheurs, des preuves liees et des references a l'action corrective issues des sorties live.",
        headers: [
          "L'article 73 exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Une liste de declencheurs pour la revue d'incident",
            "Cree un brouillon d'incident grave avec le triage machine actuel, les categories de declencheurs et les inputs operateur encore ouverts.",
            "Peut relier ce brouillon a de vrais signaux de surveillance, a des cas bloques, a des cas d'approbation et a des sorties de revue de mise en production.",
            "Decidez quels declencheurs comptent comme declencheurs de revue d'incident grave dans votre contexte juridique et operationnel.",
          ],
          [
            "Un dossier de preuves techniques pour le triage",
            "Peut pointer vers le rapport de comparaison actuel, les sorties de revue et les fichiers de dossier lies deja presents dans le dossier.",
            "Peut assembler ces fichiers autour des cas et signaux specifiques qui ont declenche la revue d'incident.",
            "Decidez quels documents supplementaires, temoins ou enregistrements externes doivent etre ajoutes pour une vraie revue d'incident.",
          ],
          [
            "Un lien avec l'action corrective",
            "Peut montrer les references actuelles a l'action corrective deja presentes dans le dossier genere.",
            "Peut garder ces references liees dans le temps a l'historique de surveillance, a la revue de mise en production et aux sorties d'articles associees.",
            "Choisissez le responsable, l'echeance et le workflow d'approbation pour l'action corrective.",
          ],
          [
            "Une limite de decision pour le reporting",
            "Peut montrer que des declencheurs d'incident et des preuves d'appui existent.",
            "Ne decide toujours pas, apres integration, si le seuil juridique de notification est atteint.",
            "Prenez la decision juridique de reportabilite, redigez le texte de notification et approuvez toute communication vers l'autorite.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 73",
        lead:
          "The toolkit can prepare the technical side of incident triage. It does not make the legal reporting decision or author the final notification for you.",
        headers: ["What you add", "When you add it", "Practical format to use"],
        rows: [
          [
            "Legal threshold analysis",
            "As soon as the draft incident pack indicates a likely serious incident.",
            "A short legal or policy note stating whether the event appears reportable and why.",
          ],
          [
            "Notification recipients and timeline",
            "Before any formal reporting or escalation leaves the team.",
            "A short contact and timeline list naming who must be informed and by when.",
          ],
          [
            "Final reportability decision",
            "At incident review or counsel sign-off.",
            "Accepted as reportable, not reportable, or needs more review, plus the named approver.",
          ],
          [
            "Authority or customer-facing narrative",
            "When the incident pack needs to be turned into an external communication.",
            "The written summary your organization uses for the final notification or briefing.",
          ],
          [
            "Corrective-action owner and closure rule",
            "Once the incident review results in remediation work.",
            "A named owner, target date, and the rule for when the action is considered closed.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team noch zu Artikel 73 hinzufuegt",
        lead:
          "Das Toolkit kann die technische Seite der Vorfall-Triage vorbereiten. Es trifft nicht die rechtliche Meldeentscheidung und verfasst die finale Meldung nicht fuer Sie.",
        headers: ["Was Sie hinzufuegen", "Wann Sie es hinzufuegen", "Praktisches Format"],
        rows: [
          [
            "Analyse der rechtlichen Schwelle",
            "Sobald der Entwurf auf einen wahrscheinlichen schwerwiegenden Vorfall hinweist.",
            "Eine kurze rechtliche oder Richtlinien-Notiz dazu, ob das Ereignis meldepflichtig erscheint und warum.",
          ],
          [
            "Empfaenger und Zeitplan fuer Meldungen",
            "Bevor irgendeine formale Meldung oder Eskalation das Team verlaesst.",
            "Eine kurze Kontakt- und Zeitplanliste dazu, wer wann informiert werden muss.",
          ],
          [
            "Finale Entscheidung zur Meldepflicht",
            "Bei der Vorfallpruefung oder der Freigabe durch die Rechtsberatung.",
            "Meldepflichtig, nicht meldepflichtig oder weitere Pruefung noetig, plus die benannte freigebende Person.",
          ],
          [
            "Narrativ fuer Behoerden oder Kunden",
            "Wenn aus dem Vorfall-Paket eine externe Kommunikation werden muss.",
            "Die schriftliche Zusammenfassung, die Ihre Organisation fuer die finale Meldung oder das Briefing verwendet.",
          ],
          [
            "Verantwortliche Person und Abschlussregel fuer Korrekturmassnahmen",
            "Sobald die Vorfallpruefung zu Behebungsarbeit fuehrt.",
            "Eine benannte verantwortliche Person, ein Zieltermin und die Regel, wann die Massnahme als abgeschlossen gilt.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore a l'article 73",
        lead:
          "Le toolkit peut preparer la partie technique du triage d'incident. Il ne prend pas la decision juridique de notification et ne redige pas la notification finale a votre place.",
        headers: ["Ce que vous ajoutez", "Quand vous l'ajoutez", "Format pratique a utiliser"],
        rows: [
          [
            "Analyse du seuil juridique",
            "Des que le brouillon d'incident indique un incident grave probable.",
            "Une courte note juridique ou de politique indiquant si l'evenement parait reportable et pourquoi.",
          ],
          [
            "Destinataires de notification et calendrier",
            "Avant qu'un reporting formel ou une escalade ne quitte l'equipe.",
            "Une courte liste de contacts et d'echeances indiquant qui doit etre informe et quand.",
          ],
          [
            "Decision finale de reportabilite",
            "Lors de la revue d'incident ou de la validation du conseil juridique.",
            "Soumis a notification, non soumis a notification ou revue supplementaire necessaire, plus le nom de l'approbateur.",
          ],
          [
            "Narratif a destination de l'autorite ou du client",
            "Quand le dossier d'incident doit etre transforme en communication externe.",
            "Le resume ecrit utilise par votre organisation pour la notification ou le briefing final.",
          ],
          [
            "Responsable de l'action corrective et regle de cloture",
            "Une fois que la revue d'incident aboutit a un travail de remediation.",
            "Un responsable nomme, une date cible et la regle definissant quand l'action est consideree comme close.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Article 73 is built from incident, monitoring, review, and risk-update files",
        lead:
          "The files below are the main evidence surfaces for Article 73. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Article 73", "Open file"],
        rows: [
          [
            "Article 73 dossier d'incident grave - article-73-serious-incident-pack.json",
            "Main draft file for technical incident triage and preparation.",
            "demo/eu-ai-act/compliance/article-73-serious-incident-pack.json",
          ],
          [
            "Post-market monitoring - post-market-monitoring.json",
            "Provides ongoing monitoring signals that can feed incident triage.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Release review - release-review.json",
            "Provides review status and required human actions linked to the same package.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Article 9 risk register - article-9-risk-register.json",
            "Shows how a serious incident can feed back into documented risk updates.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Artikel 73 wird aus Vorfall-, Beobachtungs-, Pruef- und Risiko-Update-Dateien aufgebaut",
        lead:
          "Die unten stehenden Dateien sind die wichtigsten Nachweis-Oberflaechen fuer Artikel 73. Ihr Layout ist das strukturierte Toolkit-Format fuer diese Anforderungen und keine EU-vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Artikel 73 wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Artikel-73-Vorfallspaket - article-73-serious-incident-pack.json",
            "Zentrale Entwurfsdatei fuer technische Vorfall-Triage und Vorbereitung.",
            "demo/eu-ai-act/compliance/article-73-serious-incident-pack.json",
          ],
          [
            "Beobachtung nach dem Inverkehrbringen - post-market-monitoring.json",
            "Liefert laufende Signale aus der Beobachtung nach dem Inverkehrbringen, die in die Vorfall-Triage einfliessen koennen.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Freigabepruefung - release-review.json",
            "Liefert Pruefstatus und erforderliche menschliche Aktionen, die an dasselbe Paket gebunden sind.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Artikel-9-Risikoregister - article-9-risk-register.json",
            "Zeigt, wie ein schwerwiegender Vorfall in dokumentierte Risikoupdates zurueckfliessen kann.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'article 73 est construit a partir de fichiers d'incident, de surveillance, de revue et de mise a jour du risque",
        lead:
          "Les fichiers ci-dessous sont les principales surfaces de preuve pour l'article 73. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par l'UE.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'article 73", "Ouvrir le fichier"],
        rows: [
          [
            "Dossier d'incident grave Article 73 - article-73-serious-incident-pack.json",
            "Fichier brouillon principal pour le triage technique d'incident et la preparation.",
            "demo/eu-ai-act/compliance/article-73-serious-incident-pack.json",
          ],
          [
            "Surveillance post-commercialisation - post-market-monitoring.json",
            "Fournit des signaux de surveillance continus pouvant alimenter le triage d'incident.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Revue de mise en production - release-review.json",
            "Fournit le statut de revue et les actions humaines requises liees au meme dossier.",
            "demo/eu-ai-act/compliance/release-review.json",
          ],
          [
            "Registre de risques Article 9 - article-9-risk-register.json",
            "Montre comment un incident grave peut revenir dans des mises a jour de risque documentees.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "technical-doc": {
    title: {
      en: "EU AI Act Annex IV - Technical Documentation Template",
      de: "EU KI-Verordnung Anhang IV - Vorlage fuer technische Dokumentation",
      fr: "Annexe IV de l'AI Act - Modele de documentation technique",
    },
    description: {
      en: "Annex IV template with evidence references, system identity, intended purpose, and technical documentation structure.",
      de: "Vorlage fuer technische Dokumentation nach Anhang IV mit Nachweis-Referenzen.",
      fr: "Modele Annexe IV avec references vers les preuves techniques.",
    },
    intro: {
      en:
        "Annex IV is where the documentation package becomes coherent. It is the place where system identity, intended purpose, operating constraints, logging, risk controls, oversight, and evidence references have to line up in one dossier.",
      de:
        "Anhang IV ist der Ort, an dem das gesamte Paket konsistent werden muss: Systemidentitaet, Zweck, Architektur, Journalisierung und Nachweise muessen zusammenpassen.",
      fr:
        "L'Annexe IV est le point de convergence du dossier: identite du systeme, finalite, architecture, journalisation et preuves doivent etre coherents.",
    },
    requirement: {
      en:
        "A strong Annex IV package does not replace full legal review. It provides the technical backbone: what the system is, where it runs, what evidence exists, how the article-level outputs fit together, and what still requires human completion.",
      de:
        "Eine starke Vorlage ersetzt keine juristische Bewertung. Sie liefert das technische Rueckgrat.",
      fr:
        "Un bon modele ne remplace pas la revue juridique. Il fournit la colonne vertebrale technique.",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Annex IV expects, what the toolkit can add, and what your team still owns",
        note:
          "Without connecting your agent, the toolkit can only draft the dossier from the generated package. After adapter integration, it can keep the dossier references tied to real runs, article outputs, and recurring evidence.",
        headers: [
          "Annex IV expects",
          "Toolkit with generated package only",
          "Toolkit after adapter integration",
          "Still written and approved by your team",
        ],
        rows: [
          [
            "System identity and technical context",
            "Creates a dossier draft with current system identity, environment, evidence references, and uncovered areas.",
            "Keeps that identity tied to the connected system's real runs, versions, and linked article outputs.",
            "Write the final deployment context, organization-specific boundary, and any external component narrative.",
          ],
          [
            "Intended purpose and operating constraints",
            "Can expose operator inputs still required for intended purpose and constraints.",
            "Can keep those fields linked to the latest Article 13, oversight, and review outputs from the connected system.",
            "Write the final intended purpose, target users, excluded uses, and deployment assumptions.",
          ],
          [
            "Linked evidence across risk, logging, oversight, and quality",
            "Can already link the dossier to generated Article 9, 12, 13, 14, 15, 17, 72, and 73 outputs in the package.",
            "Keeps those links current as the connected agent is rerun and monitored over time.",
            "Decide whether the linked evidence is sufficient for the claim you want to make in the dossier.",
          ],
          [
            "A complete dossier ready for final sign-off",
            "Can list uncovered areas and residual gaps still open in the generated dossier.",
            "Still does not author the missing sections or approve dossier sufficiency after integration.",
            "Complete the remaining sections, add legal interpretation, and sign off the final Annex IV package.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Anhang IV verlangt, was das Toolkit beitragen kann und was Ihr Team weiter verantwortet",
        note:
          "Ohne Verbindung zu Ihrem Agenten kann das Toolkit das Dossier nur aus dem bereits erzeugten Paket entwerfen. Nach der Adapter-Integration kann es die Dossier-Referenzen mit echten Runs, Artikel-Ausgaben und wiederkehrenden Nachweisen verknuepfen.",
        headers: [
          "Anhang IV verlangt",
          "Toolkit nur mit bereits erzeugtem Paket",
          "Toolkit nach Adapter-Integration",
          "Weiter von Ihrem Team geschrieben und freigegeben",
        ],
        rows: [
          [
            "Systemidentitaet und technischer Kontext",
            "Erzeugt einen Dossier-Entwurf mit aktueller Systemidentitaet, Umgebung, Nachweis-Referenzen und offenen Bereichen.",
            "Verknuepft diese Identitaet mit echten Runs, Versionen und den zugehoerigen Artikel-Ausgaben des verbundenen Systems.",
            "Schreiben Sie den finalen Einsatzkontext, die organisationsspezifische Systemgrenze und die Erlaeuterung zu externen Komponenten.",
          ],
          [
            "Zweck und operative Randbedingungen",
            "Kann offene Operator-Eingaben fuer Zweck und Randbedingungen sichtbar machen.",
            "Kann diese Felder mit den neuesten Ausgaben aus Artikel 13, Aufsicht und Pruefung fuer das verbundene System verknuepfen.",
            "Schreiben Sie den finalen Zweck, Zielnutzer, ausgeschlossene Nutzungen und Einsatzannahmen.",
          ],
          [
            "Verknuepfte Nachweise ueber Risiko, Journalisierung, Aufsicht und Qualitaet",
            "Kann das Dossier bereits mit den erzeugten Ausgaben zu Artikel 9, 12, 13, 14, 15, 17, 72 und 73 verknuepfen.",
            "Haelt diese Verknuepfungen aktuell, waehrend das verbundene System erneut ausgefuehrt und ueberwacht wird.",
            "Entscheiden Sie, ob die verknuepften Nachweise fuer die Aussage im Dossier ausreichen.",
          ],
          [
            "Ein vollstaendiges Dossier fuer die finale Freigabe",
            "Kann offene Bereiche und Rest-Luecken im erzeugten Dossier auflisten.",
            "Schreibt die fehlenden Abschnitte auch nach der Integration nicht selbst und trifft keine Freigabeentscheidung ueber die Suffizienz des Dossiers.",
            "Vervollstaendigen Sie die restlichen Abschnitte, fuegen Sie die juristische Interpretation hinzu und geben Sie das finale Anhang-IV-Paket frei.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'Annexe IV exige, ce que le toolkit peut ajouter, et ce que votre equipe garde en charge",
        note:
          "Sans connecter votre agent, le toolkit ne peut que preparer le dossier a partir du dossier deja genere. Apres integration de l'adapter, il peut relier les references du dossier a des runs reels, a des sorties d'articles et a des preuves recurrentes.",
        headers: [
          "L'Annexe IV exige",
          "Toolkit avec dossier deja genere seulement",
          "Toolkit apres integration de l'adapter",
          "Toujours redige et approuve par votre equipe",
        ],
        rows: [
          [
            "Identite du systeme et contexte technique",
            "Cree un brouillon du dossier avec l'identite actuelle du systeme, l'environnement, les references de preuve et les zones non couvertes.",
            "Relie cette identite aux runs reels, aux versions et aux sorties d'articles du systeme connecte.",
            "Redigez le contexte final de deploiement, la frontiere propre a votre organisation et le recit des composants externes.",
          ],
          [
            "Finalite et contraintes d'exploitation",
            "Peut montrer les entrees operateur encore necessaires pour la finalite et les contraintes.",
            "Peut relier ces champs aux sorties les plus recentes d'Article 13, de supervision et de revue du systeme connecte.",
            "Redigez la finalite definitive, les utilisateurs vises, les usages exclus et les hypotheses de deploiement.",
          ],
          [
            "Preuves reliees sur le risque, la journalisation, la supervision et la qualite",
            "Peut deja relier le dossier aux sorties generees des Articles 9, 12, 13, 14, 15, 17, 72 et 73.",
            "Garde ces liens a jour pendant que le systeme connecte est relance et surveille dans le temps.",
            "Decidez si les preuves reliees suffisent pour l'affirmation que vous voulez faire dans le dossier.",
          ],
          [
            "Un dossier complet pret pour la validation finale",
            "Peut lister les zones non couvertes et les ecarts residuels encore ouverts dans le dossier genere.",
            "Ne redige toujours pas les sections manquantes et n'approuve pas la suffisance du dossier apres integration.",
            "Completez les sections restantes, ajoutez l'interpretation juridique et validez le dossier final Annexe IV.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Annex IV",
        lead:
          "The toolkit can generate the technical backbone of the dossier. It does not replace the human-authored parts of the final Annex IV package.",
        headers: ["What you add", "When you add it", "Practical format to use"],
        rows: [
          [
            "Intended purpose and target users",
            "When the dossier is first assembled and whenever the deployment scope changes.",
            "A short purpose statement naming the system, target users, use context, and excluded uses.",
          ],
          [
            "Deployment context and system boundary",
            "Before the dossier is shared outside the engineering workflow.",
            "A concise architecture or boundary note naming external systems, dependencies, and where the product stops.",
          ],
          [
            "Operator organization and roles",
            "When the dossier needs to show who owns oversight, release, and monitoring.",
            "A short role map naming accountable teams and approval points.",
          ],
          [
            "Human-authored narrative for uncovered areas",
            "When residual gaps or operator inputs remain open in the generated dossier.",
            "A short explanation of how those gaps are handled or why they remain acceptable.",
          ],
          [
            "Final legal and governance sign-off",
            "At the point where the Annex IV package is treated as the official dossier.",
            "A sign-off record naming approver, date, and any conditions attached to approval.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team noch zu Anhang IV ergaenzt",
        lead:
          "Das Toolkit kann das technische Rueckgrat des Dossiers erzeugen. Es ersetzt nicht die von Menschen verfassten Teile des finalen Anhang-IV-Pakets.",
        headers: ["Was Sie ergaenzen", "Wann Sie es ergaenzen", "Praktisches Format"],
        rows: [
          [
            "Zweck und Zielnutzer",
            "Wenn das Dossier erstmals zusammengestellt wird und immer dann, wenn sich der Einsatzumfang aendert.",
            "Ein kurzer Zweck-Abschnitt mit System, Zielnutzern, Einsatzkontext und ausgeschlossenen Nutzungen.",
          ],
          [
            "Einsatzkontext und Systemgrenze",
            "Bevor das Dossier ausserhalb des Engineering-Workflows geteilt wird.",
            "Eine knappe Architektur- oder Abgrenzungsnotiz mit externen Systemen, Abhaengigkeiten und der Produktgrenze.",
          ],
          [
            "Organisation und Rollen des Operators",
            "Wenn das Dossier zeigen muss, wer Aufsicht, Inbetriebnahme und die Beobachtung nach dem Inverkehrbringen verantwortet.",
            "Eine kurze Rollenkarte mit verantwortlichen Teams und Freigabepunkten.",
          ],
          [
            "Von Menschen geschriebene Erklaerung fuer offene Bereiche",
            "Wenn im generierten Dossier noch Rest-Luecken oder Operator-Eingaben offen sind.",
            "Eine kurze Erlaeuterung, wie diese Luecken behandelt werden oder warum sie akzeptabel bleiben.",
          ],
          [
            "Finale juristische und Governance-Freigabe",
            "An dem Punkt, an dem das Anhang-IV-Paket als offizielles Dossier gilt.",
            "Ein Freigabe-Eintrag mit Name, Datum und eventuellen Bedingungen der Freigabe.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore a l'Annexe IV",
        lead:
          "Le toolkit peut generer la colonne vertebrale technique du dossier. Il ne remplace pas les parties redigees par des humains dans le dossier final Annexe IV.",
        headers: ["Ce que vous ajoutez", "Quand vous l'ajoutez", "Format pratique a utiliser"],
        rows: [
          [
            "Finalite et utilisateurs vises",
            "Quand le dossier est assemble pour la premiere fois puis a chaque changement de perimetre de deploiement.",
            "Un court texte de finalite nommant le systeme, les utilisateurs vises, le contexte d'usage et les usages exclus.",
          ],
          [
            "Contexte de deploiement et frontiere du systeme",
            "Avant de partager le dossier en dehors du workflow d'ingenierie.",
            "Une note concise d'architecture ou de frontiere nommant les systemes externes, les dependances et la limite du produit.",
          ],
          [
            "Organisation operateur et roles",
            "Quand le dossier doit montrer qui possede la supervision, la mise en production et la surveillance.",
            "Une courte carte des roles nommant les equipes responsables et les points d'approbation.",
          ],
          [
            "Narratif humain pour les zones non couvertes",
            "Quand des ecarts residuels ou des entrees operateur restent ouverts dans le dossier genere.",
            "Une courte explication sur la maniere dont ces ecarts sont traites ou sur la raison de leur acceptabilite.",
          ],
          [
            "Validation juridique et gouvernance finale",
            "Au moment ou le dossier Annexe IV devient le dossier officiel.",
            "Un enregistrement de validation avec approbateur, date et conditions eventuelles.",
          ],
        ],
      },
    },
    dossierContext: {
      en: {
        eyebrow: "How this fits into the full package",
        title: "Annex IV is the top-level dossier linking the article outputs together",
        lead:
          "The files below are the main evidence surfaces for Annex IV. Their layout is the toolkit's structured format for these requirements, not an EU-mandated form.",
        headers: ["File in the package", "Why it matters for Annex IV", "Open file"],
        rows: [
          [
            "Annex IV dossier - eu-ai-act-annex-iv.json",
            "Main draft dossier linking system identity, clause coverage, and supporting article outputs.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
          [
            "Evidence index - evidence-index.json",
            "Shows the clause-by-clause evidence selectors and residual gaps behind the dossier.",
            "demo/eu-ai-act/compliance/evidence-index.json",
          ],
          [
            "Article 9 risk register - article-9-risk-register.json",
            "One of the linked article outputs the dossier depends on for risk management coverage.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
          [
            "Article 13 instructions - article-13-instructions.json",
            "One of the linked article outputs the dossier depends on for intended-use and operating guidance.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
        ],
      },
      de: {
        eyebrow: "Wie das in das Gesamtpaket passt",
        title: "Anhang IV ist das Top-Level-Dossier, das die Artikel-Ausgaben zusammenfuehrt",
        lead:
          "Die folgenden Dateien sind die wichtigsten Nachweisflaechen fuer Anhang IV. Ihr Layout ist das strukturierte Format des Toolkits fuer diese Anforderungen, nicht eine gesetzlich vorgeschriebene Form.",
        headers: ["Datei im Paket", "Warum sie fuer Anhang IV wichtig ist", "Datei oeffnen"],
        rows: [
          [
            "Anhang-IV-Dossier - eu-ai-act-annex-iv.json",
            "Hauptentwurf des Dossiers mit Systemidentitaet, Klauselabdeckung und verknuepften Artikel-Ausgaben.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
          [
            "Nachweisindex - evidence-index.json",
            "Zeigt die abschnittsbezogenen Nachweis-Selektoren und Rest-Luecken hinter dem Dossier.",
            "demo/eu-ai-act/compliance/evidence-index.json",
          ],
          [
            "Artikel-9-Risikoregister - article-9-risk-register.json",
            "Eine der verknuepften Artikel-Ausgaben, auf die sich das Dossier fuer Risikomanagement stuetzt.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
          [
            "Artikel-13-Anweisungen - article-13-instructions.json",
            "Eine der verknuepften Artikel-Ausgaben fuer Zweck und Betriebsanweisungen.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
        ],
      },
      fr: {
        eyebrow: "Comment cela s'insere dans le dossier complet",
        title: "L'Annexe IV est le dossier de plus haut niveau reliant les sorties des articles",
        lead:
          "Les fichiers ci-dessous sont les surfaces de preuve principales pour l'Annexe IV. Leur format est le format structure du toolkit pour ces exigences, et non une forme imposee par la loi.",
        headers: ["Fichier dans le dossier", "Pourquoi il compte pour l'Annexe IV", "Ouvrir le fichier"],
        rows: [
          [
            "Dossier Annexe IV - eu-ai-act-annex-iv.json",
            "Brouillon principal du dossier reliant l'identite du systeme, la couverture des clauses et les sorties d'articles.",
            "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
          ],
          [
            "Index de preuves - evidence-index.json",
            "Montre les selecteurs de preuves par clause et les ecarts residuels qui se trouvent derriere le dossier.",
            "demo/eu-ai-act/compliance/evidence-index.json",
          ],
          [
            "Registre de risques Article 9 - article-9-risk-register.json",
            "Une des sorties d'article reliees dont le dossier depend pour la couverture du risque.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
          ],
          [
            "Instructions Article 13 - article-13-instructions.json",
            "Une des sorties d'article reliees dont le dossier depend pour la finalite et les consignes d'exploitation.",
            "demo/eu-ai-act/compliance/article-13-instructions.json",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideCoverageLine: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
};

const BLOG_CONTENT = {
  "eu-ai-act-deadline": {
    title: {
      en: "EU AI Act August 2026 Deadline: The complete checklist for AI teams",
      de: "EU AI Act Frist August 2026: Die komplette Checkliste fuer KI-Teams",
      fr: "Date limite d'aout 2026 du EU AI Act: la checklist complete pour les equipes IA",
    },
    description: {
      en:
        "What happens on August 2, 2026, which AI systems are affected, and what technical evidence teams should start collecting now.",
      de:
        "Was am 2. August 2026 passiert, welche KI-Systeme betroffen sind und welche technischen Nachweise Teams jetzt schon sammeln sollten.",
      fr:
        "Ce qui se passe le 2 aout 2026, quels systemes d'IA sont concernes et quelles preuves techniques les equipes devraient commencer a reunir maintenant.",
    },
    sections: {
      en: [
        {
          heading: "What actually happens on August 2, 2026",
          body:
            "For many AI teams the deadline feels abstract until they map it onto release work. August 2, 2026 is not only a legal milestone. It is an operating milestone. By then, teams shipping high-risk systems into the European market need a documentation story that can survive internal review, customer diligence, and formal conformity preparation. The teams that move fastest are not the ones that write the best checklist. They are the ones that stop separating documentation from technical evidence.",
        },
        {
          heading: "Does your system likely qualify as high-risk",
          body:
            "If your workflow touches recruitment, education, access to finance, healthcare support, or other decisions that materially affect people, you should assume that a high-risk pre-evaluation is worth doing now. Teams often waste time searching for certainty before they start building the package. A better pattern is to run a preliminary pre-evaluation, draft the package structure, and then validate the scope with legal counsel.",
        },
        {
          heading: "What documents teams usually underestimate",
          body:
            "The usual gap is not the high-level policy statement. It is the operational section that explains how risk management is tested, how events are logged, how human approval is triggered, and what evidence shows that the system is still within the claimed quality bar. Articles 9, 12, 14, and 15 are where many engineering teams discover that their internal quality process is not yet legible enough for an external reader.",
        },
        {
          heading: "What auditors and reviewers actually look for",
          body:
            "Reviewers look for coherence. If the document says humans can intervene, there should be an approval path. If the document says risks are monitored, there should be recurring evidence. If the document says logging exists, there should be traceable records. Technical evidence does not replace legal interpretation, but without it the package feels speculative.",
        },
        {
          heading: "A 12-week execution plan",
          body:
            "Weeks 1 to 2: run a pre-evaluation and define the system boundary. Weeks 3 to 4: draft Article 9 and Annex IV structure. Weeks 5 to 8: run the first evidence loop, create recurring test cases, and link the report outputs to documentation sections. Weeks 9 to 10: tighten review, oversight, and monitoring. Weeks 11 to 12: hand the package to legal and compliance for final interpretation and gap review. This sequence is much healthier than trying to build everything in the final month.",
        },
      ],
      de: [
        {
          heading: "Was am 2. August 2026 tatsaechlich passiert",
          body:
            "Fuer viele KI-Teams wirkt die Frist abstrakt, bis sie sie auf die Arbeit vor der Inbetriebnahme abbilden. Der 2. August 2026 ist nicht nur ein juristischer Meilenstein. Er ist ein operativer Meilenstein. Bis dahin brauchen Teams, die Hochrisiko-Systeme in den europaeischen Markt bringen, eine Dokumentationsgeschichte, die interne Pruefungen, Kundenpruefung und formale Konformitaetsvorbereitung uebersteht. Die schnellsten Teams schreiben nicht einfach die beste Checkliste. Sie hoeren auf, Dokumentation von technischen Nachweisen zu trennen.",
        },
        {
          heading: "Ist Ihr System wahrscheinlich hochriskant",
          body:
            "Wenn Ihr Workflow Recruiting, Bildung, Zugang zu Finanzdienstleistungen, Gesundheitsunterstuetzung oder andere Entscheidungen beruehrt, die Menschen wesentlich betreffen, sollten Sie davon ausgehen, dass sich eine Hochrisiko-Vorpruefung jetzt lohnt. Teams verlieren oft Zeit, weil sie erst nach vollstaendiger Sicherheit suchen. Gesuender ist es, eine vorlaeufige Vorpruefung durchzufuehren, die Paketstruktur zu entwerfen und den Umfang dann mit juristischer Beratung zu bestaetigen.",
        },
        {
          heading: "Welche Dokumente Teams meist unterschaetzen",
          body:
            "Die uebliche Luecke ist nicht die allgemeine Leitlinie. Es ist der operative Abschnitt, der erklaert, wie Risikomanagement getestet wird, wie Events geloggt werden, wie menschliche Freigabe ausgeloest wird und welche Nachweise zeigen, dass das System noch innerhalb der behaupteten Qualitaetsgrenze liegt. Bei den Artikeln 9, 12, 14 und 15 stellen viele Engineering-Teams fest, dass ihr interner Qualitaetsprozess fuer externe Leser noch nicht lesbar genug ist.",
        },
        {
          heading: "Wonach Auditoren und pruefende Personen wirklich suchen",
          body:
            "Pruefende suchen Koharenz. Wenn das Dokument sagt, dass Menschen eingreifen koennen, sollte es einen Freigabepfad geben. Wenn das Dokument sagt, dass Risiken ueberwacht werden, sollte es wiederkehrende Nachweise geben. Wenn das Dokument sagt, dass Journalisierung existiert, sollte es nachvollziehbare Aufzeichnungen geben. Technische Nachweise ersetzen keine juristische Auslegung, aber ohne sie wirkt das Paket spekulativ.",
        },
        {
          heading: "Ein 12-Wochen-Umsetzungsplan",
          body:
            "Woche 1 bis 2: Vorpruefung durchfuehren und die Systemgrenze definieren. Woche 3 bis 4: Artikel-9- und Anhang-IV-Struktur entwerfen. Woche 5 bis 8: die erste Nachweis-Schleife fahren, wiederkehrende Testfaelle anlegen und Berichtsergebnisse an Dokumentationsabschnitte binden. Woche 9 bis 10: Pruefung, Aufsicht und Beobachtung nach dem Inverkehrbringen schaerfen. Woche 11 bis 12: Paket an Rechtsabteilung und Compliance zur finalen Auslegung und Lueckenpruefung uebergeben. Diese Reihenfolge ist deutlich gesuender, als im letzten Monat alles gleichzeitig aufzubauen.",
        },
      ],
      fr: [
        {
          heading: "Ce qui se passe vraiment le 2 aout 2026",
          body:
            "Pour beaucoup d'equipes IA, l'echeance reste abstraite tant qu'elles ne la relient pas au travail de mise en production. Le 2 aout 2026 n'est pas seulement un jalon juridique. C'est un jalon operationnel. D'ici la, les equipes qui mettent sur le marche europeen des systemes a haut risque ont besoin d'un dossier documentaire capable de resister a la revue interne, a la diligence client et a la preparation formelle de conformite. Les equipes qui avancent le plus vite ne sont pas celles qui redigent la meilleure checklist. Ce sont celles qui cessent de separer la documentation de la preuve technique.",
        },
        {
          heading: "Votre systeme releve-t-il probablement du haut risque",
          body:
            "Si votre workflow touche au recrutement, a l'education, a l'acces au financement, a l'assistance en sante ou a d'autres decisions qui affectent concretement des personnes, vous devriez partir du principe qu'une pre-evaluation haut risque vaut la peine d'etre faite maintenant. Les equipes perdent souvent du temps a chercher une certitude parfaite avant de commencer a construire le dossier. Un meilleur schema consiste a lancer une pre-evaluation preliminaire, esquisser la structure du dossier puis valider le perimetre avec le conseil juridique.",
        },
        {
          heading: "Quels documents les equipes sous-estiment le plus souvent",
          body:
            "L'ecart habituel n'est pas la grande declaration de politique generale. C'est la section operationnelle qui explique comment la gestion du risque est testee, comment les evenements sont journalises, comment l'approbation humaine est declenchee et quelle preuve montre que le systeme reste dans le niveau de qualite annonce. C'est au niveau des articles 9, 12, 14 et 15 que de nombreuses equipes d'ingenierie decouvrent que leur processus qualite interne n'est pas encore assez lisible pour un lecteur externe.",
        },
        {
          heading: "Ce que recherchent vraiment les auditeurs et evaluateurs",
          body:
            "Les evaluateurs recherchent la coherence. Si le document dit que des humains peuvent intervenir, il doit exister un chemin d'approbation. S'il dit que les risques sont surveilles, il doit exister des preuves recurrentes. S'il dit qu'il y a de la journalisation, il doit exister des enregistrements tracables. La preuve technique ne remplace pas l'interpretation juridique, mais sans elle le dossier semble speculatif.",
        },
        {
          heading: "Un plan d'execution sur 12 semaines",
          body:
            "Semaines 1 a 2: lancer un pre-evaluation et definir la frontiere du systeme. Semaines 3 a 4: preparer la structure de l'article 9 et de l'Annexe IV. Semaines 5 a 8: executer la premiere boucle de preuve, creer des cas de test recurrents et relier les sorties de rapport aux sections documentaires. Semaines 9 a 10: renforcer la revue, la supervision et la surveillance. Semaines 11 a 12: transmettre le dossier au juridique et a la conformite pour interpretation finale et revue des ecarts. Cette sequence est bien plus saine que d'essayer de tout construire dans le dernier mois.",
        },
      ],
    },
  },
  "high-risk-ai-list": {
    title: {
      en: "Is your AI system high-risk? The Annex III categories teams should screen first",
      de: "Ist Ihr KI-System hochriskant? Diese Kategorien aus Anhang III sollten Teams zuerst pruefen",
      fr: "Votre systeme d'IA est-il a haut risque? Les categories d'Annexe III a examiner en premier",
    },
    description: {
      en:
        "A practical list of Annex III-style categories and how teams should use them as a pre-evaluation framework, not as a replacement for legal review.",
      de:
        "Eine praktische Liste von Kategorien im Stil von Anhang III und wie Teams sie als Rahmen fuer die Vorpruefung statt als Ersatz fuer die juristische Pruefung nutzen sollten.",
      fr:
        "Une liste pratique de categories de type Annexe III et la facon dont les equipes devraient les utiliser comme cadre de pre-evaluation, pas comme remplacement de la revue juridique.",
    },
    sections: {
      en: [
        {
          heading: "Use Annex III as a pre-evaluation lens, not as a final verdict",
          body:
            "Teams usually need a fast way to decide whether documentation work should start now. Annex III-style categories give you that pre-evaluation lens. Recruitment and worker management, educational access and assessment, access to essential services such as credit, and parts of healthcare support are common early flags.",
        },
        {
          heading: "Why customer support systems are trickier than they look",
          body:
            "A customer support agent is not automatically high-risk. But the moment it influences decisions about eligibility, financial outcomes, or regulated access paths, the system becomes more serious. That is why a builder should ask both what the system is called and what it actually does in production.",
        },
        {
          heading: "What to do after a preliminary high-risk result",
          body:
            "Do not wait for perfect certainty. Build the package structure, document assumptions, start technical evidence collection, and then validate the legal scope. That is a much cheaper path than doing nothing and discovering late that the evidence layer is missing.",
        },
      ],
      de: [
        {
          heading: "Anhang III als Linse fuer die Vorpruefung nutzen, nicht als finales Urteil",
          body:
            "Teams brauchen meist eine schnelle Methode, um zu entscheiden, ob Dokumentationsarbeit jetzt starten sollte. Kategorien im Stil von Anhang III geben genau diese Linse fuer die Vorpruefung. Recruiting und Arbeitnehmermanagement, Bildungszugang und Bewertung, Zugang zu essenziellen Diensten wie Kredit und Teile der Gesundheitsunterstuetzung sind typische Fruehindikatoren.",
        },
        {
          heading: "Warum Customer-Support-Systeme kniffliger sind, als sie wirken",
          body:
            "Ein Kundensupport-Agent ist nicht automatisch hochriskant. Aber sobald er Entscheidungen ueber Anspruchsberechtigung, finanzielle Ergebnisse oder regulierte Zugangspfade beeinflusst, wird das System ernster. Deshalb sollte ein Dokumentations-Assistent nicht nur fragen, wie das System heisst, sondern auch, was es in der Produktion tatsaechlich tut.",
        },
        {
          heading: "Was nach einem vorlaeufigen Hochrisiko-Ergebnis zu tun ist",
          body:
            "Warten Sie nicht auf perfekte Sicherheit. Bauen Sie die Paketstruktur, dokumentieren Sie Annahmen, beginnen Sie mit der technischen Nachweis-Erhebung und validieren Sie dann den juristischen Rahmen. Das ist deutlich billiger, als nichts zu tun und spaet festzustellen, dass die Nachweis-Schicht fehlt.",
        },
      ],
      fr: [
        {
          heading: "Utilisez l'Annexe III comme grille de pre-evaluation, pas comme verdict final",
          body:
            "Les equipes ont generalement besoin d'un moyen rapide de decider si le travail documentaire doit commencer maintenant. Les categories de type Annexe III fournissent justement cette grille. Le recrutement et la gestion des travailleurs, l'acces et l'evaluation en education, l'acces a des services essentiels comme le credit et certaines parties de l'assistance en sante sont des signaux precoces frequents.",
        },
        {
          heading: "Pourquoi les systemes de support client sont plus complexes qu'ils n'en ont l'air",
          body:
            "Un agent de support client n'est pas automatiquement a haut risque. Mais des qu'il influence des decisions d'eligibilite, des resultats financiers ou des parcours d'acces reglementes, le systeme devient plus sensible. C'est pourquoi un assistant de documentation doit demander a la fois comment le systeme est nomme et ce qu'il fait reellement en production.",
        },
        {
          heading: "Que faire apres un resultat preliminaire haut risque",
          body:
            "N'attendez pas une certitude parfaite. Construisez la structure du dossier, documentez les hypotheses, commencez la collecte de preuves techniques puis validez le perimetre juridique. C'est une voie bien moins couteuse que de ne rien faire et de decouvrir trop tard que la couche de preuve manque.",
        },
      ],
    },
  },
  "evidence-pack-guide": {
    title: {
      en: "What is an EU AI Act evidence pack and how do you build one",
      de: "Was ist ein EU AI Act Nachweispaket und wie baut man eines",
      fr: "Qu'est-ce qu'un dossier de preuve EU AI Act et comment en construire un",
    },
    description: {
      en:
        "A practical guide to evidence packs for Article 9, Article 12, Article 14, Article 15, and Annex IV technical documentation.",
      de:
        "Ein praktischer Leitfaden fuer Nachweispakete zu Artikel 9, 12, 14, 15 und der technischen Dokumentation nach Anhang IV.",
      fr:
        "Un guide pratique des dossiers de preuve pour l'article 9, l'article 12, l'article 14, l'article 15 et la documentation technique de l'Annexe IV.",
    },
    sections: {
      en: [
        {
          heading: "An evidence pack is not a PDF attachment",
          body:
            "An evidence pack is a portable technical bundle that links claims to artifacts. In practice that means a report a human can review, a machine-readable JSON contract, an integrity manifest, and explicit references from documentation sections to those files.",
        },
        {
          heading: "What a useful evidence pack contains",
          body:
            "For agent systems a useful pack usually contains risk signals, gate recommendations, structured event logs, trace anchors, release-review outputs, and recurring monitoring context. The pack should also be portable enough to move between engineering, security, legal, and governance teams without losing meaning.",
        },
        {
          heading: "How to build one without inventing a second workflow",
          body:
            "The strongest path is to use the same evaluation workflow for revue de mise en production and documentation support. When the same runs feed both technical review and compliance references, the package stays honest. That is why the product story should remain proof-first rather than template-only.",
        },
      ],
      de: [
        {
          heading: "Ein Nachweispaket ist kein PDF-Anhang",
          body:
            "Ein Nachweispaket ist ein portables technisches Paket, das Aussagen an Artefakte bindet. Praktisch bedeutet das: ein Bericht, den Menschen pruefen koennen, ein maschinenlesbarer JSON-Vertrag, ein Integritaets-Manifest und explizite Verweise aus Dokumentationsabschnitten auf diese Dateien.",
        },
        {
          heading: "Was ein nuetzliches Nachweispaket enthaelt",
          body:
            "Fuer Agent-Systeme enthaelt ein nuetzliches Paket meist Risikosignale, Kontrollpunkt-Empfehlungen, strukturierte Ereignisprotokolle, Trace-Anker, Ergebnisse der Freigabepruefung und wiederkehrenden Kontext aus der Beobachtung nach dem Inverkehrbringen. Das Paket sollte ausserdem portabel genug sein, um zwischen Engineering, Sicherheit, Rechtsberatung und Governance zu wechseln, ohne seine Bedeutung zu verlieren.",
        },
        {
          heading: "Wie man eines baut, ohne einen zweiten Workflow zu erfinden",
          body:
            "Der staerkste Weg ist, denselben Evaluations-Workflow fuer Freigabepruefung und Dokumentationsunterstuetzung zu verwenden. Wenn dieselben Runs sowohl technische Pruefung als auch Compliance-Referenzen speisen, bleibt das Paket ehrlich. Deshalb sollte die Produktgeschichte nachweisorientiert bleiben und nicht nur vorlagenorientiert.",
        },
      ],
      fr: [
        {
          heading: "Un dossier de preuve n'est pas une piece jointe PDF",
          body:
            "Un dossier de preuve est un ensemble technique portable qui relie des affirmations a des artefacts. En pratique, cela signifie un rapport qu'un humain peut revoir, un contrat JSON lisible par machine, un manifest d'integrite et des references explicites depuis les sections documentaires vers ces fichiers.",
        },
        {
          heading: "Ce que contient un dossier de preuve utile",
          body:
            "Pour les systemes d'agents, un dossier utile contient generalement des signaux de risque, des recommandations de passage, des journaux d'evenements structures, des ancrages de trace, des sorties de revue de mise en production et un contexte de suivi recurrent. Le dossier doit aussi etre assez portable pour circuler entre ingenierie, securite, juridique et gouvernance sans perdre son sens.",
        },
        {
          heading: "Comment en construire un sans inventer un deuxieme workflow",
          body:
            "Le chemin le plus solide consiste a utiliser le meme workflow d'evaluation pour la revue de mise en production et le support documentaire. Quand les memes runs alimentent a la fois la revue technique et les references de conformite, le dossier reste honnete. C'est pourquoi l'histoire produit doit rester orientee preuve plutot que limitee aux modeles.",
        },
      ],
    },
  },
};

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineCode(value) {
  return String(value)
    .split(/`([^`]+)`/g)
    .map((part, index) => (index % 2 === 1 ? `<code>${escapeHtml(part)}</code>` : escapeHtml(part)))
    .join("");
}

function toSegments(segment) {
  if (!segment) return [];
  return segment.split("/").filter(Boolean);
}

function relativeHref(fromParts, toParts, trailingSlash = true) {
  const fromDir = path.posix.join(...fromParts);
  const toDir = path.posix.join(...toParts);
  const rel = path.posix.relative(fromDir, toDir) || ".";
  if (rel === ".") return "./";
  return trailingSlash ? `${rel}/` : rel;
}

function relativeFileHref(fromParts, fileParts) {
  return path.posix.relative(path.posix.join(...fromParts), path.posix.join(...fileParts));
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  return date.toISOString().slice(0, 10);
}

function getProofSurfaceData(siteOutputRoot = SITE_OUTPUT_ROOT) {
  const manifestPath = path.join(siteOutputRoot, "demo", "product-surfaces.json");
  if (!existsSync(manifestPath)) {
    return {
      surfaces: {},
      screenshotPaths: {
        primary: "assets/screenshots/01.png",
        secondary: "assets/screenshots/05.png",
      },
    };
  }
  const manifest = readJson(manifestPath);
  const map = {};
  for (const surface of manifest.surfaces || []) {
    map[surface.id] = surface;
  }
  return {
    surfaces: map,
    screenshotPaths: {
      primary: "assets/screenshots/01.png",
      secondary: "assets/screenshots/05.png",
    },
  };
}

function createPage(locale, key, segment, options) {
  return {
    locale,
    key,
    segment,
    title: options.title,
    description: options.description,
    keywords: options.keywords || "",
    schema: options.schema || [],
    body: options.body,
  };
}

function pagePath(locale, segment) {
  return [locale, ...toSegments(segment)];
}

function canonicalUrl(origin, locale, segment) {
  const suffix = [locale, ...toSegments(segment)].join("/");
  return `${origin}/${suffix}/`;
}

function renderHeader(page, localeCopy, href, localeOptions, pageAlternates) {
  const options = pageAlternates
    .map(
      (alt) => `<option value="${href(alt.key, alt.locale)}" ${alt.locale === page.locale ? "selected" : ""}>${escapeHtml(
        localeOptions[alt.locale].name
      )}</option>`
    )
    .join("");

  return `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="${href("landing")}">
          <span class="brand-mark">EU</span>
          <span class="brand-copy">
            <span class="brand-title">EU AI Evidence</span>
            <span class="brand-subtitle">${escapeHtml(localeCopy.common.brandSubtitle || "Documentation builder for Agent QA Toolkit")}</span>
          </span>
        </a>
        <nav class="header-nav" aria-label="Primary">
          <a href="${href("how-it-works")}">${escapeHtml(localeCopy.nav.how)}</a>
          <a href="${href("technical")}">${escapeHtml(localeCopy.nav.technical)}</a>
          <a href="${href("templates")}">${escapeHtml(localeCopy.nav.templates)}</a>
          <a href="${href("pricing")}">${escapeHtml(localeCopy.nav.pricing)}</a>
          <a href="${href("docs")}">${escapeHtml(localeCopy.nav.docs)}</a>
          <a class="button" href="${href("builder")}" data-track-event="header_start_free">${escapeHtml(
            localeCopy.nav.start
          )}</a>
          <label class="sr-only" for="locale-switcher">${escapeHtml(localeCopy.common.languageLabel)}</label>
          <select id="locale-switcher" class="locale-switch" data-locale-switcher>
            ${options}
          </select>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter(page, localeCopy, href) {
  return `
    <footer class="site-footer">
      <div class="container footer-inner">
        <p>&copy; 2026 EU AI Evidence Builder</p>
        <div class="footer-links">
          <a href="${href("privacy")}">${escapeHtml(localeCopy.footer.privacy)}</a>
          <a href="${href("terms")}">${escapeHtml(localeCopy.footer.terms)}</a>
          <a href="${href("disclaimer")}">${escapeHtml(localeCopy.footer.disclaimer)}</a>
          <a href="${href("cookies")}">${escapeHtml(localeCopy.footer.cookies)}</a>
          <a href="${href("contact")}">${escapeHtml(localeCopy.footer.contact)}</a>
          <a href="${GITHUB_REPO}" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  `;
}

function renderCookieBanner(localeCopy) {
  return `
    <div class="cookie-banner" data-cookie-banner>
      <div>
        <strong>${localeCopy.legalTitles.cookies}</strong>
        <p class="muted">${escapeHtml(localeCopy.common.cookieBannerBody)}</p>
      </div>
      <div class="button-row">
        <button class="button-soft" type="button" data-cookie-choice="essential">${escapeHtml(localeCopy.common.cookieEssential)}</button>
        <button class="button" type="button" data-cookie-choice="analytics">${escapeHtml(localeCopy.common.cookieAnalytics)}</button>
      </div>
    </div>
  `;
}

function renderFaq(items) {
  return items
    .map(
      ([question, answer]) => `
      <details class="faq-item">
        <summary>${escapeHtml(question)}</summary>
        <p>${escapeHtml(answer)}</p>
      </details>
    `
    )
    .join("");
}

function renderTemplateDownloadLink(downloadHref, label) {
  return `<a class="button" href="${downloadHref}" download>${escapeHtml(label)}</a>`;
}

function pickLocalizedValue(value, locale) {
  if (!value) return null;
  if (typeof value === "string" || Array.isArray(value)) return value;
  return value[locale] || value.en || null;
}

function renderPageHtml(page, allPages, proof, origin) {
  const localeCopy = LOCALES[page.locale];
  const currentParts = pagePath(page.locale, page.segment);
  const pageAlternates = allPages.filter((candidate) => candidate.key === page.key);
  const href = (key, locale = page.locale) => {
    const target = allPages.find((candidate) => candidate.key === key && candidate.locale === locale);
    if (!target) {
      const fallback = allPages.find((candidate) => candidate.key === key && candidate.locale === "en");
      if (!fallback) return "#";
      return relativeHref(currentParts, pagePath(fallback.locale, fallback.segment));
    }
    return relativeHref(currentParts, pagePath(target.locale, target.segment));
  };
  const assetHref = (assetPath) => relativeFileHref(currentParts, toSegments(assetPath));
  const alternates = pageAlternates
    .map((alt) => {
      const hrefLang = alt.locale === "en" ? "en" : alt.locale;
      return `<link rel="alternate" hreflang="${hrefLang}" href="${canonicalUrl(origin, alt.locale, alt.segment)}" />`;
    })
    .join("\n");
  const schemaBlocks = (page.schema || [])
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join("\n");
  const plausibleScript = PLAUSIBLE_DOMAIN
    ? `<script defer data-domain="${escapeHtml(PLAUSIBLE_DOMAIN)}" src="https://plausible.io/js/script.file-downloads.outbound-links.js"></script>`
    : "";

  return `<!doctype html>
<html lang="${localeCopy.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  ${page.keywords ? `<meta name="keywords" content="${escapeHtml(page.keywords)}" />` : ""}
  <link rel="canonical" href="${canonicalUrl(origin, page.locale, page.segment)}" />
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${origin}/en/" />
  <link rel="stylesheet" href="${assetHref("site-assets/site.css")}" />
  ${plausibleScript}
  ${schemaBlocks}
</head>
<body>
  <a class="skip-link" href="#main">${escapeHtml(localeCopy.common.skipLink)}</a>
  <div class="site-shell">
    ${renderHeader(page, localeCopy, href, LOCALES, pageAlternates)}
    <main id="main">
      ${page.body({ localeCopy, href, assetHref, proof, locale: page.locale, origin })}
    </main>
    ${renderFooter(page, localeCopy, href)}
  </div>
  ${renderCookieBanner(localeCopy)}
  <script src="${assetHref("site-assets/site.js")}" defer></script>
  ${page.key === "builder" ? `<script src="${assetHref("site-assets/builder.js")}" defer></script>` : ""}
</body>
</html>`;
}

function renderLanding(locale, ctx) {
  const copy = LOCALES[locale].landing;
  const common = LOCALES[locale].common;
  const proofSurface = ctx.proof.surfaces["eu-ai-act"];
  const proofSurfaceTitle =
    locale === "de"
      ? "EU-AI-Act-Nachweis-Engine"
      : locale === "fr"
        ? "Moteur de preuve EU AI Act"
        : proofSurface?.label || "Live EU dossier demo";
  const monitoringStatus =
    locale === "de"
      ? { history_current: "aktuell", history_stale: "veraltet", unknown: "unbekannt" }[proofSurface?.summary?.monitoring_status] ??
        proofSurface?.summary?.monitoring_status ??
        "aktuell"
      : locale === "fr"
        ? { history_current: "a jour", history_stale: "obsolete", unknown: "inconnu" }[proofSurface?.summary?.monitoring_status] ??
          proofSurface?.summary?.monitoring_status ??
          "a jour"
        : proofSurface?.summary?.monitoring_status ?? "history_current";
  const ui = {
    en: {
      metrics: ["Runs in window", "Approvals", "Blocks", "Monitoring"],
      entryEyebrow: "Entry paths",
      fitEyebrow: "Strongest fit",
      heroAlt: "Real evidence report screenshot",
    },
    de: {
      metrics: ["Laeufe im Fenster", "Freigaben", "Blockierungen", "Beobachtung"],
      entryEyebrow: "Einstiegspfade",
      fitEyebrow: "Staerkster Fit",
      heroAlt: "Screenshot eines echten Nachweisberichts",
    },
    fr: {
      metrics: ["Runs dans la fenetre", "Approbations", "Blocages", "Surveillance"],
      entryEyebrow: "Parcours d'entree",
      fitEyebrow: "Meilleur fit",
      heroAlt: "Capture d'un vrai rapport de preuve",
    },
    en: {
      metrics: ["Runs in window", "Approvals", "Blocks", "Monitoring"],
      entryEyebrow: "Entry paths",
      fitEyebrow: "Strongest fit",
      heroAlt: "Real evidence report screenshot",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container hero-grid">
        <div class="hero-copy fade-up">
          <p class="eyebrow">EU AI Evidence Builder</p>
          <h1>${escapeHtml(copy.heroTitle)}</h1>
          <p class="lead">${escapeHtml(copy.heroText)}</p>
          <div class="button-row">
            <a class="button" href="${ctx.href("builder")}" data-track-event="landing_start_free">${escapeHtml(copy.primaryCta)}</a>
            <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer" data-track-event="landing_proof">${escapeHtml(copy.secondaryCta)}</a>
          </div>
          <div class="trust-line">
            ${LOCALES[locale].common.trustLine
              .split("·")
              .map((item) => `<span class="trust-pill">${escapeHtml(item.trim())}</span>`)
              .join("")}
          </div>
        </div>
        <aside class="hero-card fade-up">
          <p class="eyebrow">${escapeHtml(common.proofLabel)}</p>
          <h3>${escapeHtml(proofSurfaceTitle)}</h3>
          <div class="proof-frame">
            <img src="${ctx.assetHref(ctx.proof.screenshotPaths.secondary)}" alt="${escapeHtml(ui.heroAlt)}" />
          </div>
          <div class="metric-grid">
            <div class="metric"><span>${escapeHtml(ui.metrics[0])}</span><strong>${proofSurface?.summary?.runs_in_window ?? 2}</strong></div>
            <div class="metric"><span>${escapeHtml(ui.metrics[1])}</span><strong>${proofSurface?.summary?.approvals ?? 1}</strong></div>
            <div class="metric"><span>${escapeHtml(ui.metrics[2])}</span><strong>${proofSurface?.summary?.blocks ?? 1}</strong></div>
            <div class="metric"><span>${escapeHtml(ui.metrics[3])}</span><strong>${escapeHtml(monitoringStatus)}</strong></div>
          </div>
          <div class="button-row">
            <a class="button-soft" href="${ctx.assetHref("demo/")}" data-track-event="landing_demo_hub">${escapeHtml(common.liveDemos)}</a>
            <a class="button-soft" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(
              common.viewProof
            )}</a>
          </div>
        </aside>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.entryEyebrow)}</p>
        <h2 class="section-title">${escapeHtml(copy.audienceTitle)}</h2>
        <p class="lead">${escapeHtml(copy.audienceLead)}</p>
        <div class="docs-grid">
          ${copy.audienceCards
            .map(
              (card) => `
            <article class="card fade-up">
              <h3>${escapeHtml(card.title)}</h3>
              <p class="muted">${escapeHtml(card.text)}</p>
              <p><strong>${escapeHtml(card.result)}</strong></p>
              <div class="button-row">
                <a class="button-soft" href="${ctx.href(card.href)}">${escapeHtml(card.cta)}</a>
              </div>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.fitEyebrow)}</p>
        <h2 class="section-title">${escapeHtml(copy.fitMatrixTitle || copy.strongestFitTitle)}</h2>
        <p class="lead">${escapeHtml(copy.fitMatrixLead || copy.strongestFitBody)}</p>
        <table class="coverage-table">
          <thead>
            <tr>${(copy.fitMatrixHeaders || ["Situation", "Why basic logs are weak", "What this adds"]).map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${(copy.fitMatrixRows || [])
              .map(
                (row) => `
              <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
        <p class="muted">${escapeHtml(copy.strongestFitTitle)}: ${escapeHtml(copy.strongestFitBody)}</p>
      </div>
    </section>
    ${renderLandingDeliverables(locale)}
    ${renderLandingProofCta(locale, ctx)}
  `;
}

function renderPricingPreview(locale, ctx) {
  const common = LOCALES[locale].common;
  const previewPlans = PRICING_PREVIEW_ORDER.map((key) => getPlan(key)).filter(Boolean);
  return `
    <section class="section">
      <div class="container fade-up">
        <p class="eyebrow">Pricing preview</p>
        <div class="pricing-grid">
          ${previewPlans
            .map((plan) =>
              renderPlanCard(
                {
                  ...plan,
                  cta: { en: common.viewPricing, de: common.viewPricing, fr: common.viewPricing },
                  href: "pricing",
                },
                locale,
                ctx.href,
                { fade: false }
              )
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderLandingDeliverables(locale) {
  const copy = LOCALES[locale].landing;
  const eyebrow = locale === "de" ? "Ergebnisse" : locale === "fr" ? "Sorties" : "Outputs";
  return `
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2 class="section-title">${escapeHtml(copy.deliverablesTitle)}</h2>
        <p class="lead">${escapeHtml(copy.deliverablesLead)}</p>
        <div class="docs-grid">
          ${copy.deliverablesCards
            .map(
              (card) => `
            <article class="card fade-up">
              <h3>${escapeHtml(card.title)}</h3>
              <p class="muted">${escapeHtml(card.text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderLandingProofCta(locale, ctx) {
  const copy = LOCALES[locale].landing;
  const technicalCopy = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  const eyebrow = locale === "de" ? "Nachweise" : locale === "fr" ? "Preuve" : "Proof";
  return `
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h3>${escapeHtml(copy.proofTitle)}</h3>
        <p class="muted">${escapeHtml(copy.proofBody)}</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("builder")}" data-track-event="landing_builder_cta">${escapeHtml(copy.primaryCta)}</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(
            LOCALES[locale].common.viewProof
          )}</a>
          <a class="button-soft" href="${ctx.href("technical")}" data-track-event="landing_technical_cta">${escapeHtml(technicalCopy.landingButton)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderTechnicalCallout(locale, ctx) {
  const copy = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  return `
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.landingTitle)}</h3>
        <p class="muted">${escapeHtml(copy.landingBody)}</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("technical")}" data-track-event="landing_technical">${escapeHtml(copy.landingButton)}</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(copy.proofButton)}</a>
          <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/evidence-operations-model.md" target="_blank" rel="noreferrer">${escapeHtml(copy.opsButton)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderHolding(locale, ctx) {
  const meta = LOCALES[locale].holding || LOCALES.en.holding;
  const landing = LOCALES[locale].landing;
  const technical = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  const how = LOCALES[locale].how;
  const ui = {
    en: {
      eyebrow: "Holding page",
      statusEyebrow: "Status",
      statusTitle: "Not part of the main landing flow",
      statusBody:
        "These sections were removed from the homepage intentionally. Keep them here until they are either deleted, rewritten, or moved into a stronger page.",
      levelsEyebrow: "From L0 to L5",
      levelsTitle: "Move from ad-hoc testing to review-ready evidence",
      l0: "Screenshots, one-off checks, and no portable handoff.",
      l5: "Verified Evidence Pack, structured review record, archive-ready package, and EU dossier outputs when needed.",
      levelsBody: "Use this as a qualification shortcut, not as a promise of automatic legal completion.",
      liveEyebrow: "Live surface",
      liveTitle: "Use the demo hub as the proof layer of the site",
      liveHub: "Open demo hub",
      liveJson: "Open JSON index",
      liveBody:
        "This block was removed from the public workflow page because it read like a demo deck instead of a workflow explanation.",
    },
    de: {
      eyebrow: "Holding-Seite",
      statusEyebrow: "Status",
      statusTitle: "Kein Teil des Haupt-Funnels",
      statusBody:
        "Diese Abschnitte wurden bewusst von der Homepage entfernt. Sie bleiben hier, bis sie geloescht, umgeschrieben oder auf eine staerkere Seite verschoben werden.",
      levelsEyebrow: "Von L0 bis L5",
      levelsTitle: "Von Ad-hoc-Tests zu prueffertigen Nachweisen",
      l0: "Screenshots, einmalige Checks und keine portable Uebergabe.",
      l5: "Verifiziertes Nachweispaket, strukturiertes Pruefprotokoll, archivfaehiges Paket und bei Bedarf EU-Dossier-Ausgaben.",
      levelsBody: "Nutzen Sie dies als Qualifikations-Abkuerzung, nicht als Versprechen automatischer rechtlicher Vollstaendigkeit.",
      liveEyebrow: "Live-Oberflaeche",
      liveTitle: "Demo-Hub als Nachweis-Ebene der Seite nutzen",
      liveHub: "Demo-Hub oeffnen",
      liveJson: "JSON-Index oeffnen",
      liveBody:
        "Dieser Block wurde von der oeffentlichen Workflow-Seite entfernt, weil er eher wie eine Demo-Flaeche als wie eine Workflow-Erklaerung wirkte.",
    },
    fr: {
      eyebrow: "Page d'archivage",
      statusEyebrow: "Statut",
      statusTitle: "Pas dans le flux principal du site",
      statusBody:
        "Ces sections ont ete retirees volontairement de la page d'accueil. Elles restent ici jusqu'a suppression, reecriture ou transfert vers une page plus solide.",
      levelsEyebrow: "De L0 a L5",
      levelsTitle: "Passer de tests ad hoc a une preuve prete pour la revue",
      l0: "Captures d'ecran, controles ponctuels et aucune transmission portable.",
      l5: "Dossier de preuve verifie, trace de revue structuree, dossier pret pour l'archive et sorties de dossier UE quand necessaire.",
      levelsBody: "Utilisez cela comme raccourci de qualification, pas comme promesse d'achevement juridique automatique.",
      liveEyebrow: "Surface live",
      liveTitle: "Utiliser le hub de demonstration comme couche de preuve du site",
      liveHub: "Ouvrir le hub de demonstration",
      liveJson: "Ouvrir l'index JSON",
      liveBody:
        "Ce bloc a ete retire de la page workflow publique parce qu'il ressemblait davantage a une vitrine de demonstration qu'a une explication du workflow.",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.eyebrow)}</p>
          <h1>${escapeHtml(meta.headline)}</h1>
          <p class="lead">${escapeHtml(meta.intro)}</p>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.statusEyebrow)}</p>
          <h3>${escapeHtml(ui.statusTitle)}</h3>
          <p class="muted">${escapeHtml(ui.statusBody)}</p>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(landing.solutionTitle)}</p>
          <h2 class="section-title">${escapeHtml(landing.solutionTitle)}</h2>
          <div class="timeline">
            ${landing.steps
              .map(
                (step, index) => `
              <article class="timeline-card">
                <span class="timeline-step">${index + 1}</span>
                <p>${escapeHtml(step)}</p>
              </article>`
              )
              .join("")}
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.levelsEyebrow)}</p>
          <h3>${escapeHtml(ui.levelsTitle)}</h3>
          <div class="timeline section-tight">
            <article class="timeline-card">
              <span class="timeline-step">L0</span>
              <p class="muted">${escapeHtml(ui.l0)}</p>
            </article>
            <article class="timeline-card">
              <span class="timeline-step">L5</span>
              <p class="muted">${escapeHtml(ui.l5)}</p>
            </article>
          </div>
          <p class="muted">${escapeHtml(ui.levelsBody)}</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(technical.eyebrow)}</p>
        <h3>${escapeHtml(technical.landingTitle)}</h3>
        <p class="muted">${escapeHtml(technical.landingBody)}</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("technical")}">${escapeHtml(technical.landingButton)}</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(
            technical.proofButton
          )}</a>
          <a class="button-soft" href="${ctx.href("how-it-works")}">${escapeHtml(LOCALES[locale].nav.how)}</a>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container split-grid">
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.liveEyebrow)}</p>
          <h3>${escapeHtml(ui.liveTitle)}</h3>
          <div class="button-row">
            <a class="button" href="${ctx.assetHref("demo/")}" data-track-event="holding_demo_hub">${escapeHtml(ui.liveHub)}</a>
            <a class="button-soft" href="${ctx.href("technical")}" data-track-event="holding_technical">${escapeHtml(technical.landingButton)}</a>
            <a class="button-ghost" href="${ctx.assetHref("demo/product-surfaces.json")}" target="_blank" rel="noreferrer">${escapeHtml(ui.liveJson)}</a>
          </div>
          <div class="code-snippet"><code>{
"artifact": "compare-report.json",
"dossier": "eu-ai-act-report.html",
"instructions": "article-13-instructions.json",
"risk_register": "article-9-risk-register.json",
"qms_lite": "article-17-qms-lite.json",
"monitoring_plan": "article-72-monitoring-plan.json",
"incident_pack": "article-73-serious-incident-pack.json"
}</code></div>
          <p class="muted">${escapeHtml(ui.liveBody)}</p>
        </div>
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(how.workflowTitle)}</p>
          <h2 class="section-title">${escapeHtml(how.workflowTitle)}</h2>
          <div class="timeline">
            ${how.workflowSteps
              .map(
                (step, index) => `
              <article class="timeline-card">
                <span class="timeline-step">${index + 1}</span>
                <p>${escapeHtml(step)}</p>
              </article>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
    ${renderTechnicalHolding(locale, ctx)}
  `;
}

function renderHowItWorks(locale, ctx) {
  const copy = LOCALES[locale].how;
  const ui = {
    en: { pipeline: "Pipeline", inputs: "Inputs", automated: "Automated path", human: "Human-owned", outputs: "Outputs" },
    de: { pipeline: "Ablauf", inputs: "Eingaben", automated: "Automatisierter Pfad", human: "Menschlich verantwortet", outputs: "Ergebnisse" },
    fr: { pipeline: "Parcours", inputs: "Entrees", automated: "Parcours automatise", human: "Reste humain", outputs: "Sorties" },
  }[locale];
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.pipeline)}</p>
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(copy.screenshotTitle)}</p>
          <h3>${escapeHtml(copy.screenshotTitle)}</h3>
          <div class="proof-frame">
            <img src="${ctx.assetHref(ctx.proof.screenshotPaths.secondary)}" alt="${escapeHtml(
              locale === "de"
                ? "Screenshot eines prueffertigen Nachweispakets"
                : locale === "fr"
                  ? "Capture d'un dossier de preuve pret pour la revue"
                  : "Review-ready evidence dossier screenshot"
            )}" />
          </div>
          <p class="muted">${escapeHtml(copy.screenshotBody)}</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <h2 class="section-title">${escapeHtml(copy.summaryTitle)}</h2>
        <p class="lead">${escapeHtml(copy.summaryLead)}</p>
        <div class="docs-grid">
          ${copy.summaryColumns
            .map(
              (column) => `
            <article class="card fade-up">
              <h3>${escapeHtml(column.title)}</h3>
              <ul class="pricing-list">
                ${column.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
              </ul>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.inputs)}</p>
        <h2 class="section-title">${escapeHtml(copy.inputsTitle)}</h2>
        <p class="lead">${escapeHtml(copy.inputsLead)}</p>
        <div class="docs-grid">
          ${copy.inputCards
            .map(
              ([title, text]) => `
            <article class="card fade-up">
              <h3>${escapeHtml(title)}</h3>
              <p class="muted">${escapeHtml(text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.automated)}</p>
          <h2 class="section-title">${escapeHtml(copy.workflowTitle)}</h2>
          <p class="lead">${escapeHtml(copy.workflowLead)}</p>
          <div class="timeline">
            ${copy.workflowSteps
              .map(
                (step, index) => `
              <article class="timeline-card"><span class="timeline-step">${index + 1}</span><p>${escapeHtml(step)}</p></article>`
              )
              .join("")}
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.human)}</p>
          <h3>${escapeHtml(copy.boundaryTitle)}</h3>
          <p class="muted">${escapeHtml(copy.boundaryLead)}</p>
          <ul class="pricing-list">
            ${copy.boundaryPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.outputs)}</p>
        <h2 class="section-title">${escapeHtml(copy.outputsTitle)}</h2>
        <p class="lead">${escapeHtml(copy.outputsLead)}</p>
        <div class="docs-grid">
          ${copy.outputCards
            .map(
              ([title, text]) => `
            <article class="card fade-up">
              <h3>${escapeHtml(title)}</h3>
              <p class="muted">${escapeHtml(text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(locale === "de" ? "Naechster Schritt" : locale === "fr" ? "Etape suivante" : "Next step")}</p>
        <h3>${escapeHtml(copy.proofTitle)}</h3>
        <p class="muted">${escapeHtml(copy.proofBody)}</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("builder")}" data-track-event="how_builder">${escapeHtml(LOCALES[locale].landing.primaryCta)}</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(
            LOCALES[locale].common.viewProof
          )}</a>
          <a class="button-soft" href="${ctx.href("technical")}" data-track-event="how_technical">${escapeHtml(TECHNICAL_PAGE[locale]?.landingButton || TECHNICAL_PAGE.en.landingButton)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderTechnical(locale, ctx) {
  const copy = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  const shared = getTechnicalShared(locale);
  const ui = {
    en: {
      workflowEyebrow: "Workflow",
      boundaryEyebrow: "Boundary",
      quickstartEyebrow: "Quickstart",
      commandsEyebrow: "Commands",
      artifactsEyebrow: "Artifacts",
      artifactsHeaders: ["Stage", "Artifact", "Ready signal"],
      extendedEyebrow: "Extended notes",
    },
    de: {
      workflowEyebrow: "Ablauf",
      boundaryEyebrow: "Grenze",
      quickstartEyebrow: "Schnellstart",
      commandsEyebrow: "Kommandos",
      artifactsEyebrow: "Artefakte",
      artifactsHeaders: ["Stufe", "Artefakt", "Ready-Signal"],
      extendedEyebrow: "Erweiterte Notizen",
    },
    fr: {
      workflowEyebrow: "Parcours",
      boundaryEyebrow: "Frontiere",
      quickstartEyebrow: "Demarrage rapide",
      commandsEyebrow: "Commandes",
      artifactsEyebrow: "Artefacts",
      artifactsHeaders: ["Etape", "Artefact", "Signal de preparation"],
      extendedEyebrow: "Notes etendues",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="button-row section-tight">
            <a class="button" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(copy.proofButton)}</a>
            <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/evidence-operations-model.md" target="_blank" rel="noreferrer">${escapeHtml(copy.opsButton)}</a>
            <a class="button-soft" href="${ctx.href("docs")}">${escapeHtml(copy.docsButton)}</a>
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(copy.screenshotTitle)}</p>
          <h3>${escapeHtml(copy.screenshotTitle)}</h3>
          <div class="proof-frame">
            <img src="${ctx.assetHref(ctx.proof.screenshotPaths.secondary)}" alt="${escapeHtml(
              locale === "de"
                ? "Screenshot eines verifizierten technischen Nachweispakets"
                : locale === "fr"
                  ? "Capture d'un dossier de preuve technique verifie"
                  : "Verified technical evidence bundle screenshot"
            )}" />
          </div>
          <p class="muted">${escapeHtml(copy.screenshotBody)}</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(copy.credibilityEyebrow)}</p>
        <h2 class="section-title">${escapeHtml(copy.credibilityTitle)}</h2>
        <p class="lead">${escapeHtml(copy.credibilityLead)}</p>
        <div class="docs-grid">
          ${copy.credibilityCards
            .map(
              (card) => `
            <article class="card fade-up">
              <h3>${escapeHtml(card.title)}</h3>
              <p class="muted">${escapeHtml(card.text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <h2 class="section-title">${escapeHtml(copy.summaryTitle)}</h2>
        <p class="lead">${escapeHtml(copy.summaryLead)}</p>
        <div class="docs-grid">
          ${copy.summaryColumns
            .map(
              (column) => `
            <article class="card fade-up">
              <h3>${escapeHtml(column.title)}</h3>
              <ul class="pricing-list">
                ${column.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
              </ul>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.workflowEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.compactWorkflowTitle)}</h2>
          <p class="lead">${escapeHtml(copy.compactWorkflowLead)}</p>
          <div class="timeline section-tight">
            ${copy.compactWorkflowSteps
              .map(
                (step, index) => `
              <article class="timeline-card">
                <span class="timeline-step">${index + 1}</span>
                <p>${escapeHtml(step)}</p>
              </article>`
              )
              .join("")}
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.boundaryEyebrow)}</p>
          <h3>${escapeHtml(copy.boundaryTitle)}</h3>
          <p class="muted">${escapeHtml(copy.boundaryBody)}</p>
          <ul class="pricing-list section-tight">
            ${shared.humanOwnedRows.map((row) => `<li><strong>${escapeHtml(row[0])}:</strong> ${escapeHtml(row[1])}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.quickstartEyebrow)}</p>
        <h3>${escapeHtml(copy.quickstartTitle)}</h3>
        <p class="muted">${escapeHtml(copy.quickstartLead)}</p>
        <div class="code-snippet"><code>${escapeHtml(copy.quickstartCommand)}</code></div>
        <div class="docs-grid section-tight">
          ${copy.quickstartColumns
            .map(
              (column) => `
            <article class="card fade-up">
              <h3>${escapeHtml(column.title)}</h3>
              <ul class="pricing-list">
                ${column.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
              </ul>
            </article>`
            )
            .join("")}
        </div>
        <div class="button-row">
          <a class="button" href="${GITHUB_REPO}/blob/main/docs/quickstart-your-agent.md" target="_blank" rel="noreferrer">${escapeHtml(copy.quickstartButton)}</a>
          <a class="button-soft" href="${ctx.href("docs")}">${escapeHtml(copy.docsButton)}</a>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.commandsEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.commandsTitle)}</h2>
          <p class="muted">${escapeHtml(copy.commandsLead)}</p>
          <div class="code-snippet"><code>${escapeHtml(TECHNICAL_SHARED.packageCommands.join("\n"))}</code></div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.artifactsEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.artifactsSummaryTitle)}</h2>
          <p class="muted">${escapeHtml(copy.artifactsSummaryLead)}</p>
          <table class="section-table section-tight">
            <thead>
              <tr><th>${escapeHtml(ui.artifactsHeaders[0])}</th><th>${escapeHtml(ui.artifactsHeaders[1])}</th><th>${escapeHtml(ui.artifactsHeaders[2])}</th></tr>
            </thead>
            <tbody>
              ${shared.compactArtifactRows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${renderInlineCode(row[1])}</td>
                  <td>${escapeHtml(row[2])}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.extendedEyebrow)}</p>
        <h3>${escapeHtml(copy.extendedTitle)}</h3>
        <p class="muted">${escapeHtml(copy.extendedBody)}</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("holding")}" data-track-event="technical_holding">${escapeHtml(copy.extendedButton || copy.extendedTitle)}</a>
          <a class="button-ghost" href="${ctx.href("builder")}" data-track-event="technical_builder">${escapeHtml(LOCALES[locale].landing.primaryCta)}</a>
          <a class="button-soft" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(copy.proofButton)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderTechnicalHolding(locale, ctx) {
  const copy = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  const shared = getTechnicalShared(locale);
  const ui = {
    en: {
      extendedEyebrow: "Extended technical notes",
      workflowEyebrow: "Ablauf",
      intakeEyebrow: "Eingangsschicht",
      humanEyebrow: "Human-owned",
      humanHeaders: ["Area", "Why it stays manual"],
      artifactsEyebrow: "Artifacts",
      artifactHeaders: ["Stage", "Artifact", "Created by", "Ready gate"],
      reviewEyebrow: "Pruefung",
      gateEyebrow: "Gate",
      readinessEyebrow: "Readiness",
      maturityEyebrow: "Maturity",
      maturityHeaders: ["Level", "Name", "Characteristics"],
      triggerEyebrow: "Re-run triggers",
      triggerHeaders: ["Trigger", "Expected action"],
      supportEyebrow: "Support scope",
      supportHeaders: ["Layer", "Good fit", "Not included"],
      failureEyebrow: "Failure modes",
    },
    de: {
      extendedEyebrow: "Erweiterte technische Notizen",
      workflowEyebrow: "Ablauf",
      intakeEyebrow: "Eingangsschicht",
      humanEyebrow: "Menschlich verantwortet",
      humanHeaders: ["Bereich", "Warum es manuell bleibt"],
      artifactsEyebrow: "Artefakte",
      artifactHeaders: ["Stufe", "Artefakt", "Erstellt von", "Freigabeschritt"],
      reviewEyebrow: "Pruefung",
      gateEyebrow: "Freigabe",
      readinessEyebrow: "Vorbereitung",
      maturityEyebrow: "Reifegrad",
      maturityHeaders: ["Stufe", "Name", "Merkmale"],
      triggerEyebrow: "Trigger fuer neue Laeufe",
      triggerHeaders: ["Trigger", "Erwartete Aktion"],
      supportEyebrow: "Supportumfang",
      supportHeaders: ["Ebene", "Geeigneter Fit", "Nicht enthalten"],
      failureEyebrow: "Ausfallmuster",
    },
    fr: {
      extendedEyebrow: "Notes techniques etendues",
      workflowEyebrow: "Parcours",
      intakeEyebrow: "Couche d'entree",
      humanEyebrow: "Reste humain",
      humanHeaders: ["Zone", "Pourquoi cela reste manuel"],
      artifactsEyebrow: "Artefacts",
      artifactHeaders: ["Etape", "Artefact", "Cree par", "Etape de disponibilite"],
      reviewEyebrow: "Revue",
      gateEyebrow: "Controle de revue",
      readinessEyebrow: "Preparation",
      maturityEyebrow: "Maturite",
      maturityHeaders: ["Niveau", "Nom", "Caracteristiques"],
      triggerEyebrow: "Declencheurs de nouveau run",
      triggerHeaders: ["Declencheur", "Action attendue"],
      supportEyebrow: "Perimetre du support",
      supportHeaders: ["Niveau", "Bon fit", "Non inclus"],
      failureEyebrow: "Modes de defaillance",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.extendedEyebrow)}</p>
        <h2>${escapeHtml(copy.extendedTitle)}</h2>
        <p class="muted">${escapeHtml(copy.extendedBody)}</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("technical")}">${escapeHtml(copy.landingButton)}</a>
          <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/evidence-operations-model.md" target="_blank" rel="noreferrer">${escapeHtml(copy.opsButton)}</a>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(copy.planningTitle)}</p>
          <h2 class="section-title">${escapeHtml(copy.planningTitle)}</h2>
          <div class="metric-grid">
            ${copy.estimates
              .map(
                ([label, value]) => `
              <div class="metric">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>`
              )
              .join("")}
          </div>
          <p class="muted">${escapeHtml(copy.planningNote)}</p>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.workflowEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.workflowTitle)}</h2>
          <div class="timeline section-tight">
            ${shared.workflowSteps
              .map(
                ([title, text], index) => `
              <article class="timeline-card">
                <span class="timeline-step">${index + 1}</span>
                <h3>${escapeHtml(title)}</h3>
                <p class="muted">${escapeHtml(text)}</p>
              </article>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.intakeEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.intakeTitle)}</h2>
          <p class="muted">${escapeHtml(copy.intakeLead)}</p>
          <div class="code-snippet"><code>${escapeHtml(TECHNICAL_SHARED.intakeCommands.join("\n"))}</code></div>
          <ul class="check-list section-tight">
            ${shared.intakeArtifacts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.humanEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.intakeHumanTitle)}</h2>
          <table class="section-table">
            <thead>
              <tr><th>${escapeHtml(ui.humanHeaders[0])}</th><th>${escapeHtml(ui.humanHeaders[1])}</th></tr>
            </thead>
            <tbody>
              ${shared.humanOwnedRows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${escapeHtml(row[1])}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    ${renderTechnicalCasesSection(locale)}
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.artifactsEyebrow)}</p>
        <h2 class="section-title">${escapeHtml(copy.artifactsTitle)}</h2>
        <p class="muted">${escapeHtml(copy.artifactsLead)}</p>
        <table class="section-table">
          <thead>
            <tr><th>${escapeHtml(ui.artifactHeaders[0])}</th><th>${escapeHtml(ui.artifactHeaders[1])}</th><th>${escapeHtml(ui.artifactHeaders[2])}</th><th>${escapeHtml(ui.artifactHeaders[3])}</th></tr>
          </thead>
          <tbody>
            ${shared.artifactRows
              .map(
                (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${renderInlineCode(row[1])}</td>
                  <td>${escapeHtml(row[2])}</td>
                  <td>${escapeHtml(row[3])}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.reviewEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.reviewTitle)}</h2>
          <p class="muted">${escapeHtml(copy.reviewLead)}</p>
          <div class="code-snippet"><code>${escapeHtml(TECHNICAL_SHARED.reviewCommands.join("\n"))}</code></div>
          <ul class="check-list section-tight">
            ${shared.reviewArtifacts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.gateEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.reviewChecksTitle)}</h2>
          <ul class="check-list section-tight">
            ${shared.reviewChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.readinessEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.readinessTitle)}</h2>
          <p class="muted">${escapeHtml(copy.readinessLead)}</p>
          <ul class="check-list section-tight">
            ${shared.readinessChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <p class="eyebrow section-tight">${escapeHtml(copy.readinessScoreTitle)}</p>
          <div class="timeline">
            ${shared.readinessBands
              .map(
                ([score, text]) => `
              <article class="timeline-card">
                <span class="timeline-step">${escapeHtml(score)}</span>
                <p class="muted">${escapeHtml(text)}</p>
              </article>`
              )
              .join("")}
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.maturityEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.maturityTitle)}</h2>
          <p class="muted">${escapeHtml(copy.maturityLead)}</p>
          <table class="section-table">
            <thead>
              <tr><th>${escapeHtml(ui.maturityHeaders[0])}</th><th>${escapeHtml(ui.maturityHeaders[1])}</th><th>${escapeHtml(ui.maturityHeaders[2])}</th></tr>
            </thead>
            <tbody>
              ${shared.maturityRows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${escapeHtml(row[1])}</td>
                  <td>${escapeHtml(row[2])}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.triggerEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.triggersTitle)}</h2>
          <table class="section-table">
            <thead>
              <tr><th>${escapeHtml(ui.triggerHeaders[0])}</th><th>${escapeHtml(ui.triggerHeaders[1])}</th></tr>
            </thead>
            <tbody>
              ${shared.triggerRows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${escapeHtml(row[1])}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.supportEyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.supportTitle)}</h2>
          <table class="section-table">
            <thead>
              <tr><th>${escapeHtml(ui.supportHeaders[0])}</th><th>${escapeHtml(ui.supportHeaders[1])}</th><th>${escapeHtml(ui.supportHeaders[2])}</th></tr>
            </thead>
            <tbody>
              ${shared.supportRows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${escapeHtml(row[1])}</td>
                  <td>${escapeHtml(row[2])}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.failureEyebrow)}</p>
        <h2 class="section-title">${escapeHtml(copy.failureTitle)}</h2>
        <div class="docs-grid section-tight">
          ${shared.failureCards
            .map(
              ([title, text]) => `
            <article class="card fade-up">
              <h3>${escapeHtml(title)}</h3>
              <p class="muted">${escapeHtml(text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderTechnicalCasesSection(locale) {
  const copy = TECHNICAL_CASES[locale] || TECHNICAL_CASES.en;
  const sourceRows = copy.sources
    .map(
      ([label, relPath]) => `
      <li><a href="${GITHUB_REPO}/blob/main/${relPath}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a><span class="muted"> · <code>${escapeHtml(relPath)}</code></span></li>`
    )
    .join("");

  return `
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2 class="section-title">${escapeHtml(copy.title)}</h2>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="timeline section-tight">
            <article class="timeline-card">
              <h3>${escapeHtml(copy.goalTitle)}</h3>
              <p class="muted">${escapeHtml(copy.goalBody)}</p>
            </article>
            <article class="timeline-card">
              <h3>${escapeHtml(copy.inputTitle)}</h3>
              <p class="muted">${escapeHtml(copy.inputBody)}</p>
            </article>
            <article class="timeline-card">
              <h3>${escapeHtml(copy.prepTitle)}</h3>
              <p class="muted">${escapeHtml(copy.prepBody)}</p>
            </article>
          </div>
          <div class="code-snippet section-tight"><code>[
  {
    "id": "ticket_update_001",
    "title": "Update ticket after retrieval",
    "input": { "user": "Resolve ticket T-2002. Return JSON only." },
    "expected": {
      "action_required": ["get_ticket", "update_ticket_status"],
      "tool_sequence": ["get_ticket", "update_ticket_status"],
      "json_schema": { "...": "..." }
    }
  }
]</code></div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(copy.qualityTitle)}</p>
          <h3>${escapeHtml(copy.qualityLead)}</h3>
          <p class="eyebrow section-tight">${escapeHtml(copy.strongSignalsTitle)}</p>
          <ul class="check-list">
            ${copy.strongSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <p class="eyebrow section-tight">${escapeHtml(copy.boundaryTitle)}</p>
          <p class="muted">${escapeHtml(copy.boundaryBody)}</p>
          <p class="eyebrow section-tight">${escapeHtml(copy.sourcesTitle)}</p>
          <ul class="artifact-list">
            ${sourceRows}
          </ul>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="table-card fade-up">
          <p class="eyebrow">Metrics</p>
          <h3>${escapeHtml(copy.metricsTitle)}</h3>
          <p class="muted">${escapeHtml(copy.metricsLead)}</p>
          <table class="section-table section-tight">
            <thead>
              <tr><th>Metric</th><th>Meaning</th><th>Target</th></tr>
            </thead>
            <tbody>
              ${copy.metricsRows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row[0])}</td>
                  <td>${escapeHtml(row[1])}</td>
                  <td>${escapeHtml(row[2])}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(copy.readyTitle)}</p>
          <ul class="check-list section-tight">
            ${copy.readyItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <p class="eyebrow section-tight">${escapeHtml(copy.failureTitle)}</p>
          <ul class="check-list">
            ${copy.failureItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
  `;
}

function renderTemplatesIndex(locale, ctx, availableTemplateKeys) {
  const copy = LOCALES[locale].templates;
  const fallbackCopy = LOCALES.en.templates;
  const eyebrow = locale === "de" ? "Vorlagen" : locale === "fr" ? "Modeles" : "Templates";
  const openLabel = locale === "de" ? "Seite oeffnen" : locale === "fr" ? "Ouvrir la page" : "Open page";
  const groups = [
    {
      title: copy.strongGroup || fallbackCopy.strongGroup,
      keys: availableTemplateKeys.filter((key) => {
        const data = TEMPLATE_CONTENT[key];
        const coverage = (data.coverage && (data.coverage[locale] || data.coverage.en)) || "";
        return coverage === "Direct technical outputs";
      }),
    },
    {
      title: copy.partialGroup || fallbackCopy.partialGroup,
      keys: availableTemplateKeys.filter((key) => {
        const data = TEMPLATE_CONTENT[key];
        const coverage = (data.coverage && (data.coverage[locale] || data.coverage.en)) || "";
        return coverage !== "Direct technical outputs";
      }),
    },
  ].filter((group) => group.keys.length > 0);
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <p class="lead">${escapeHtml(copy.intro)}</p>
        ${copy.note ? `<p class="muted">${escapeHtml(copy.note)}</p>` : ""}
        ${groups
          .map((group) => `
            <p class="eyebrow section-tight">${escapeHtml(group.title || "")}</p>
            <div class="template-grid section-tight">
              ${group.keys
                .map((key) => {
              const data = TEMPLATE_CONTENT[key];
              return `
                <article class="template-card fade-up">
                  <p class="eyebrow">${escapeHtml(key)}</p>
                  <h3>${escapeHtml(data.title[locale] || data.title.en)}</h3>
                  <div class="button-row">
                    <a class="button" href="${ctx.href(`template-${key}`)}">${escapeHtml(openLabel)}</a>
                  </div>
                </article>
              `;
                })
                .join("")}
            </div>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderTemplatePage(locale, ctx, key, downloadHref) {
  const data = TEMPLATE_CONTENT[key];
  const copy = LOCALES[locale].templates;
  const fallbackCopy = LOCALES.en.templates;
  const title = data.title[locale] || data.title.en;
  const intro = data.intro[locale] || data.intro.en;
  const requirement = pickLocalizedValue(data.requirement, locale) || "";
  const requirementTitle = pickLocalizedValue(data.requirementTitle, locale) || "What this article requires";
  const requirementItems = pickLocalizedValue(data.requirementItems, locale) || [];
  const rows = pickLocalizedValue(data.sections, locale) || [];
  const faq = pickLocalizedValue(data.faq, locale) || [];
  const coverage = (data.coverage && (data.coverage[locale] || data.coverage.en)) || "";
  const covers = (data.covers && (data.covers[locale] || data.covers.en)) || [];
  const boundary = (data.boundary && (data.boundary[locale] || data.boundary.en)) || [];
  const contractMatrix = pickLocalizedValue(data.contractMatrix, locale);
  const artifactPanel = pickLocalizedValue(data.artifactPanel, locale);
  const mapping = pickLocalizedValue(data.mapping, locale);
  const operatorDetail = pickLocalizedValue(data.operatorDetail, locale);
  const dossierContext = pickLocalizedValue(data.dossierContext, locale);
  const examples = pickLocalizedValue(data.examples, locale);
  const resourcePanel = pickLocalizedValue(data.resourcePanel, locale);
  const hideSectionGuide = data.hideSectionGuide === true;
  const hideFaq = data.hideFaq === true;
  const hideCoverageLine = data.hideCoverageLine === true;
  const hideExamples = data.hideExamples === true;
  const hideTopActions = data.hideTopActions === true;
  const hideBottomActions = data.hideBottomActions === true;
  const contributionTitle = pickLocalizedValue(data.contributionTitle, locale) || "What this covers technically";
  const boundaryTitle = pickLocalizedValue(data.boundaryTitle, locale) || "What remains human-owned";
  const launchPackLabel = locale === "de" ? "Startpaket buchen" : locale === "fr" ? "Reserver le pack de lancement" : "Book Launch Pack";
  const templateLabel = locale === "de" ? "Vorlage" : locale === "fr" ? "Modele" : "Template";
  const openFileLabel = locale === "de" ? "Datei oeffnen" : locale === "fr" ? "Ouvrir le fichier" : "Open file";
  return `
    <section class="section">
      <div class="container ${artifactPanel ? "" : "content-grid"}">
        <div class="fade-up">
          <p class="eyebrow">${templateLabel}</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lead">${escapeHtml(intro)}</p>
          ${hideCoverageLine ? "" : coverage ? `<p class="muted"><strong>${escapeHtml(copy.coverageLabel || fallbackCopy.coverageLabel || "Technical contribution")}:</strong> ${escapeHtml(coverage)}</p>` : ""}
        </div>
        ${
          artifactPanel || hideTopActions
            ? ""
            : `
        <aside class="proof-card fade-up">
          <p class="eyebrow">Download</p>
          <h3>Free template package</h3>
          <p class="muted">Download a print-ready template and then connect live evidence where the document requires proof.</p>
          <div class="button-row">
            ${renderTemplateDownloadLink(downloadHref, "Download free template")}
            <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">See live evidence</a>
          </div>
        </aside>
        `
        }
      </div>
    </section>
    ${
      contractMatrix
        ? `
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">${escapeHtml(contractMatrix.eyebrow || "Working split")}</p>
        <h3>${escapeHtml(contractMatrix.title || "")}</h3>
        ${contractMatrix.note ? `<p class="muted">${escapeHtml(contractMatrix.note)}</p>` : ""}
        <table class="section-table">
          <thead>
            <tr>${(contractMatrix.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${(contractMatrix.rows || [])
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    `
        : ""
    }
    ${
      contractMatrix
        ? ""
        : `
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(requirementTitle)}</p>
          <p>${escapeHtml(requirement)}</p>
          ${
            requirementItems.length > 0
              ? `<ul class="check-list section-tight">${requirementItems
                  .map(([heading, body]) => `<li><strong>${escapeHtml(heading)}:</strong> ${escapeHtml(body)}</li>`)
                  .join("")}</ul>`
              : ""
          }
        </div>
        ${
          artifactPanel
            ? `
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(artifactPanel.eyebrow || "What the toolkit actually produces")}</p>
          <h3>${escapeHtml(artifactPanel.title || "")}</h3>
          ${artifactPanel.lead ? `<p class="muted">${escapeHtml(artifactPanel.lead)}</p>` : ""}
          ${
            Array.isArray(artifactPanel.items) && artifactPanel.items.length > 0
              ? `<ul class="check-list section-tight">${artifactPanel.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
              : ""
          }
        </div>
        `
            : `
        <div class="proof-card fade-up">
          <p class="eyebrow">Proof-first</p>
          <img src="${ctx.assetHref(ctx.proof.screenshotPaths.primary)}" alt="${escapeHtml(
            locale === "de"
              ? "Screenshot eines echten Berichts"
              : locale === "fr"
                ? "Capture d'un rapport reel"
                : "Real report screenshot"
          )}" />
        </div>
        `
        }
      </div>
    </section>
    `
    }
    ${
      contractMatrix
        ? ""
        : `
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(contributionTitle)}</p>
          <ul class="check-list section-tight">
            ${covers.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(boundaryTitle)}</p>
          <ul class="check-list section-tight">
            ${boundary.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    `
    }
    ${
      mapping && !contractMatrix
        ? `
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">${escapeHtml(mapping.label || "Evidence mapping")}</p>
        <h3>${escapeHtml(mapping.title || "How the technical evidence is built")}</h3>
        <table class="section-table">
          <thead>
            <tr>${(mapping.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${(mapping.rows || [])
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    `
        : ""
    }
    ${
      operatorDetail
        ? `
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">${escapeHtml(operatorDetail.eyebrow || "Manual fields")}</p>
        <h3>${escapeHtml(operatorDetail.title || "")}</h3>
        ${operatorDetail.lead ? `<p class="muted">${escapeHtml(operatorDetail.lead)}</p>` : ""}
        <table class="section-table">
          <thead>
            <tr>${(operatorDetail.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${(operatorDetail.rows || [])
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    `
        : ""
    }
    ${
      dossierContext
        ? `
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">${escapeHtml(dossierContext.eyebrow || "Where this sits in the full dossier")}</p>
        <h3>${escapeHtml(dossierContext.title || "")}</h3>
        ${dossierContext.lead ? `<p class="muted">${escapeHtml(dossierContext.lead)}</p>` : ""}
        <table class="section-table">
          <thead>
            <tr>${(dossierContext.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${(dossierContext.rows || [])
              .map((row) => {
                const [fileLabel, description, href] = row;
                return `
              <tr>
                <td>${escapeHtml(fileLabel)}</td>
                <td>${escapeHtml(description)}</td>
                <td>${href ? `<a class="button-ghost" href="${ctx.assetHref(href)}" target="_blank" rel="noreferrer">${openFileLabel}</a>` : ""}</td>
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    `
        : ""
    }
    ${
      hideSectionGuide
        ? ""
        : `
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">Section guide</p>
        <table class="section-table">
          <thead>
            <tr><th>Section</th><th>What it means</th><th>What evidence looks like</th></tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                <td>${escapeHtml(row[0])}</td>
                <td>${escapeHtml(row[1])}</td>
                <td>${escapeHtml(row[2])}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    `
    }
    ${
      examples && !hideExamples
        ? `
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">Examples</p>
        <h3>${escapeHtml(examples.title || "Where this page becomes useful in practice")}</h3>
        <div class="three-col section-tight">
          ${(examples.items || [])
            .map(
              ([heading, body]) => `
            <article class="card fade-up">
              <h3>${escapeHtml(heading)}</h3>
              <p>${escapeHtml(body)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    `
        : ""
    }
    ${
      hideBottomActions
        ? ""
        : `
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(resourcePanel?.eyebrow || "Generate machine-verifiable evidence")}</p>
        <h3>${escapeHtml(resourcePanel?.title || "Attach real proof to this section")}</h3>
        <p>${escapeHtml(resourcePanel?.lead || "Use the live proof surface to show exactly what technical evidence looks like when it is attached to a documentation package.")}</p>
        <div class="button-row">
          ${
            resourcePanel
              ? renderTemplateDownloadLink(downloadHref, resourcePanel.downloadLabel || "Download free template")
              : `<a class="button" href="${ctx.href("pricing")}" data-track-event="template_get_evidence">${escapeHtml(launchPackLabel)}</a>`
          }
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(resourcePanel?.liveLabel || "Open live dossier")}</a>
        </div>
      </div>
    </section>
    `
    }
    ${
      hideFaq || faq.length === 0
        ? ""
        : `
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">FAQ</p>
        <div class="split-grid">
          ${renderFaq(faq)}
        </div>
      </div>
    </section>
    `
    }
  `;
}

function renderPricing(locale, ctx) {
  const copy = LOCALES[locale].pricing;
  const ui = {
    en: { eyebrow: "Pricing", fitEyebrow: "Fit", faqEyebrow: "FAQ" },
    de: { eyebrow: "Preise", fitEyebrow: "Welcher Weg passt", faqEyebrow: "FAQ" },
    fr: { eyebrow: "Tarifs", fitEyebrow: "Quel parcours convient", faqEyebrow: "FAQ" },
  }[locale];
  const starterPlan = getPlan("starter");
  const launchPlan = getPlan("launch-pack");
  const subscriptionPlans = ["team", "studio", "enterprise"].map((key) => getPlan(key)).filter(Boolean);
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="fade-up">
          <p class="eyebrow">${escapeHtml(ui.eyebrow)}</p>
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.lead)}</p>
          <p class="eyebrow section-tight">${escapeHtml(copy.entryTitle)}</p>
          <p class="muted">${escapeHtml(copy.entryLead)}</p>
        </div>
        <div>
          ${starterPlan ? renderPlanCard(starterPlan, locale, ctx.href, { fade: true }) : ""}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(copy.launchEyebrow)}</p>
          <h3>${escapeHtml(copy.launchTitle)}</h3>
          <p class="muted">${escapeHtml(copy.launchLead)}</p>
          ${launchPlan ? renderPlanCard(launchPlan, locale, ctx.href, { fade: false }) : ""}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(copy.tiersEyebrow)}</p>
        <h2>${escapeHtml(copy.tiersTitle)}</h2>
        <p class="muted">${escapeHtml(copy.tiersLead)}</p>
        <div class="pricing-grid section-tight">
          ${subscriptionPlans.map((plan) => renderPlanCard(plan, locale, ctx.href)).join("")}
        </div>
        <div class="proof-card section-tight fade-up">
          <p class="eyebrow">${escapeHtml(ui.fitEyebrow)}</p>
          <h3>${escapeHtml(copy.fitTitle)}</h3>
          <p class="muted">${escapeHtml(copy.fitLead)}</p>
          <div class="docs-grid section-tight">
            ${copy.fitCards
              .map(
                ([title, text]) => `
              <article class="card fade-up">
                <h3>${escapeHtml(title)}</h3>
                <p class="muted">${escapeHtml(text)}</p>
              </article>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.faqEyebrow)}</p>
        <div class="split-grid">
          ${renderFaq(copy.faq.map((item) => [item.q, item.a]))}
        </div>
      </div>
    </section>
  `;
}

function renderBuilder(locale, ctx) {
  const localeCopy = LOCALES[locale];
  const proofSurface = ctx.proof.surfaces["eu-ai-act"];
  const proofSurfaceTitle =
    locale === "de"
      ? "EU-AI-Act-Nachweis-Engine"
      : locale === "fr"
        ? "Moteur de preuve EU AI Act"
        : proofSurface?.label || "EU AI Act demo";
  const builderUi = {
    en: {
      stepLabel: "Step",
      ofLabel: "of",
      nextLabel: "Next step",
      finishLabel: "Done",
      summaryEyebrow: "Summary",
      summaryTitle: "Preliminary risk pre-evaluation",
      evidenceEyebrow: "Evidence preview",
      evidenceTitle: "What Agent QA Toolkit can attach",
      selectPlaceholder: "Select an option",
      disclaimer: "This is a preliminary pre-evaluation. It does not replace legal review by qualified counsel.",
      classifications: { high: "HIGH RISK", limited: "LIMITED RISK", minimal: "MINIMAL RISK" },
      rationale: {
        high: "Your answers suggest a system that affects people in a regulated context or under Annex III-style categories.",
        limited: "Your answers suggest a system with transparency obligations but a lower direct impact profile.",
        minimal: "Your answers suggest a lower-risk profile, but documentation and review can still be valuable.",
        autonomous: "Autonomous decision impact plus EU deployment usually deserves a high-risk review path.",
      },
      stepTitles: {
        step1: "Tell us about your AI system",
        step2: "Your preliminary risk classification",
        step3: "Article 9 - Risk management",
        step4: "Articles 12 and 14 - Logging and oversight",
        step5: "Download your package",
      },
      packageSections: {
        profile: "System profile",
        risk: "Risk classification",
        article9: "Article 9 draft",
        oversight: "Articles 12 and 14 draft",
        evidence: "Evidence references",
      },
      packageTitle: "EU AI Act Documentation Package",
      packageDisclaimer:
        "This package is a documentation draft generated in the browser. Save it as PDF from the browser print dialog, then attach live technical evidence where required.",
      requiredArticles: "Required articles",
      evidencePlaceholder:
        "Technical evidence is strongest for Articles 9, 12, 14, 15, and Annex IV references. Use the live proof surface for that part of the package.",
      openProof: "Open live proof",
      openDocs: "Open docs",
      downloadJson: "Download JSON",
      openPrintable: "Open print-ready package",
      exportHint: "Save the printable dossier as PDF from your browser if you need a handoff document now.",
      placeholderText: "Add your team narrative here.",
      placeholders: {
        risks: "Describe the main harms, failure modes, and affected users.",
        mitigations: "Describe current controls, approvals, and technical guardrails.",
        logging: "Explain what is recorded, how events are linked, and how retention works.",
        oversight: "Explain who reviews escalations and what actions humans can stop or approve.",
      },
      ctaRiskEyebrow: "Evidence required",
      ctaRiskTitle: "This section requires machine-verifiable evidence",
      ctaRiskBody:
        "Article 9 is stronger when the package can point to recent risk testing, gate recommendations, and scanner results.",
      ctaRiskPoints: ["Risk scores per test case", "Gate recommendations", "Security scan results", "Portable evidence bundle"],
      ctaOversightEyebrow: "Logging and oversight",
      ctaOversightTitle: "Logging and approval paths should point to real artifacts",
      ctaOversightBody:
        "Use a live evidence pack for trace anchors, structured events, and approval-ready review exports.",
      metrics: { approvals: "Approvals", blocks: "Blocks", runs: "Runs in window", execution: "Execution" },
      liveProofEyebrow: "Live proof",
      openDossierDemo: "Open dossier demo",
      backLabel: "Back",
      casesLabel: "Cases",
      approvalsLabel: "Approvals",
      blocksLabel: "Blocks",
      portableLabel: "Portable",
      systemTypes: {
        hr: "HR recruitment / CV pre-evaluation",
        credit: "Credit scoring / financial decisions",
        insurance: "Insurance underwriting / claims processing",
        fraud: "Fraud detection / AML pre-evaluation",
        healthcare: "Healthcare decision support",
        education: "Education assessment",
        customerService: "Customer service / chatbot",
        other: "Other",
      },
    },
    de: {
      stepLabel: "Schritt",
      ofLabel: "von",
      nextLabel: "Naechster Schritt",
      finishLabel: "Fertig",
      summaryEyebrow: "Zusammenfassung",
      summaryTitle: "Vorlaeufige Risikopruefung",
      evidenceEyebrow: "Nachweis-Vorschau",
      evidenceTitle: "Was Agent QA Toolkit anhaengen kann",
      selectPlaceholder: "Option auswaehlen",
      disclaimer: "Dies ist eine vorlaeufige Risikopruefung. Sie ersetzt keine rechtliche Pruefung durch qualifizierte Beratung.",
      classifications: { high: "HOCHRISIKO", limited: "BEGRENZTES RISIKO", minimal: "MINIMALES RISIKO" },
      rationale: {
        high: "Ihre Antworten deuten auf ein System hin, das Personen in einem regulierten Kontext oder in Anhang-III-aehnlichen Kategorien betrifft.",
        limited: "Ihre Antworten deuten auf ein System mit Transparenzpflichten, aber geringerem unmittelbarem Wirkprofil hin.",
        minimal: "Ihre Antworten deuten auf ein niedrigeres Risikoprofil hin, dennoch koennen Dokumentation und Pruefung wertvoll bleiben.",
        autonomous: "Autonome Entscheidungsauswirkungen plus Einsatz in der EU verdienen in der Regel einen Hochrisiko-Pruefpfad.",
      },
      stepTitles: {
        step1: "Erzaehlen Sie uns von Ihrem KI-System",
        step2: "Ihre vorlaeufige Risikoklassifizierung",
        step3: "Artikel 9 - Risikomanagement",
        step4: "Artikel 12 und 14 - Journalisierung und Aufsicht",
        step5: "Paket herunterladen",
      },
      packageSections: {
        profile: "Systemprofil",
        risk: "Risikoklassifizierung",
        article9: "Artikel-9-Entwurf",
        oversight: "Artikel-12- und 14-Entwurf",
        evidence: "Nachweis-Referenzen",
      },
      packageTitle: "EU-AI-Act-Dokumentationspaket",
      packageDisclaimer:
        "Dieses Paket ist ein im Browser erzeugter Dokumentationsentwurf. Speichern Sie es bei Bedarf als PDF und verknuepfen Sie anschliessend Live-Nachweise an den benoetigten Stellen.",
      requiredArticles: "Erforderliche Artikel",
      evidencePlaceholder:
        "Technische Nachweise sind besonders stark fuer Artikel 9, 12, 14, 15 und Anhang-IV-Referenzen. Nutzen Sie dafuer die Live-Nachweis-Oberflaeche.",
      openProof: "Live-Nachweise oeffnen",
      openDocs: "Dokumentation oeffnen",
      downloadJson: "JSON herunterladen",
      openPrintable: "Druckansicht oeffnen",
      exportHint: "Speichern Sie das druckfertige Paket als PDF aus dem Browser, wenn Sie sofort ein Uebergabe-Dokument brauchen.",
      placeholderText: "Fuegen Sie hier das Narrativ Ihres Teams ein.",
      placeholders: {
        risks: "Beschreiben Sie die wichtigsten Schaeden, Ausfallmuster und betroffenen Nutzer.",
        mitigations: "Beschreiben Sie aktuelle Kontrollen, Freigaben und technische Leitplanken.",
        logging: "Erklaeren Sie, was journalisiert wird, wie Ereignisse verknuepft werden und wie die Aufbewahrung funktioniert.",
        oversight: "Erklaeren Sie, wer Eskalationen prueft und welche Aktionen Menschen stoppen oder freigeben koennen.",
      },
      ctaRiskEyebrow: "Nachweise erforderlich",
      ctaRiskTitle: "Dieser Abschnitt braucht maschinenverifizierbare Nachweise",
      ctaRiskBody:
        "Artikel 9 wird staerker, wenn das Paket auf aktuelle Risikotests, Freigabeempfehlungen und Scanner-Ergebnisse verweisen kann.",
      ctaRiskPoints: ["Risikoscores pro Testfall", "Freigabeempfehlungen", "Ergebnisse von Sicherheitsscans", "Portables Nachweispaket"],
      ctaOversightEyebrow: "Journalisierung und Aufsicht",
      ctaOversightTitle: "Journalisierungs- und Freigabepfade sollten auf reale Artefakte zeigen",
      ctaOversightBody:
        "Nutzen Sie ein Live-Nachweispaket fuer Trace-Anker, strukturierte Ereignisse und prueffertige Export-Artefakte.",
      metrics: { approvals: "Freigaben", blocks: "Blockierungen", runs: "Laeufe im Fenster", execution: "Ausfuehrung" },
      liveProofEyebrow: "Live-Nachweise",
      openDossierDemo: "Dossier-Demo oeffnen",
      backLabel: "Zurueck",
      casesLabel: "Faelle",
      approvalsLabel: "Freigaben",
      blocksLabel: "Blockierungen",
      portableLabel: "Portabel",
      systemTypes: {
        hr: "Personalgewinnung / Recruiting",
        credit: "Kredit / Finanzen",
        insurance: "Versicherung / Risikopruefung / Schaden",
        fraud: "Betrugserkennung / Geldwaeschepraevention",
        healthcare: "Gesundheitswesen",
        education: "Bildung",
        customerService: "Kundenservice / Dialogsystem",
        other: "Sonstiges",
      },
    },
    fr: {
      stepLabel: "Etape",
      ofLabel: "sur",
      nextLabel: "Etape suivante",
      finishLabel: "Termine",
      summaryEyebrow: "Resume",
      summaryTitle: "Pre-evaluation du risque",
      evidenceEyebrow: "Apercu des preuves",
      evidenceTitle: "Ce que Agent QA Toolkit peut joindre",
      selectPlaceholder: "Selectionner une option",
      disclaimer: "Il s'agit d'une pre-evaluation preliminaire. Cela ne remplace pas une revue juridique par un conseil qualifie.",
      classifications: { high: "HAUT RISQUE", limited: "RISQUE LIMITE", minimal: "RISQUE MINIMAL" },
      rationale: {
        high: "Vos reponses suggerent un systeme qui affecte des personnes dans un contexte reglemente ou dans des categories de type Annexe III.",
        limited: "Vos reponses suggerent un systeme avec des obligations de transparence mais un impact direct plus faible.",
        minimal: "Vos reponses suggerent un profil de risque plus faible, mais la documentation et la revue peuvent quand meme rester utiles.",
        autonomous: "Un impact autonome sur les decisions plus un deploiement dans l'UE merite souvent un parcours de revue haut risque.",
      },
      stepTitles: {
        step1: "Parlez-nous de votre systeme d'IA",
        step2: "Votre classification preliminaire du risque",
        step3: "Article 9 - Gestion des risques",
        step4: "Articles 12 et 14 - Journalisation et supervision",
        step5: "Telecharger votre dossier",
      },
      packageSections: {
        profile: "Profil du systeme",
        risk: "Classification du risque",
        article9: "Brouillon Article 9",
        oversight: "Brouillon Articles 12 et 14",
        evidence: "References de preuve",
      },
      packageTitle: "Dossier de documentation EU AI Act",
      packageDisclaimer:
        "Ce dossier est un brouillon de documentation genere dans le navigateur. Enregistrez-le en PDF si besoin, puis rattachez les preuves techniques live aux sections concernees.",
      requiredArticles: "Articles requis",
      evidencePlaceholder:
        "Les preuves techniques sont les plus fortes pour les Articles 9, 12, 14, 15 et les references Annexe IV. Utilisez la surface de preuve live pour cette partie du dossier.",
      openProof: "Ouvrir la preuve live",
      openDocs: "Ouvrir la documentation",
      downloadJson: "Telecharger le JSON",
      openPrintable: "Ouvrir la version imprimable",
      exportHint: "Enregistrez le dossier imprimable en PDF depuis le navigateur si vous avez besoin d'un document de transmission immediatement.",
      placeholderText: "Ajoutez ici le texte de votre equipe.",
      placeholders: {
        risks: "Decrivez les principaux dommages, modes de defaillance et utilisateurs affectes.",
        mitigations: "Decrivez les controles actuels, approbations et garde-fous techniques.",
        logging: "Expliquez ce qui est journalise, comment les evenements sont relies et comment la retention fonctionne.",
        oversight: "Expliquez qui revoit les escalades et quelles actions les humains peuvent stopper ou approuver.",
      },
      ctaRiskEyebrow: "Preuve requise",
      ctaRiskTitle: "Cette section exige des preuves verifiables par machine",
      ctaRiskBody:
        "L'Article 9 est plus solide quand le dossier peut pointer vers des tests de risque recents, des recommandations de passage et des resultats de scanner.",
      ctaRiskPoints: ["Scores de risque par cas de test", "Recommandations de passage", "Resultats d'analyse de securite", "Dossier de preuve portable"],
      ctaOversightEyebrow: "Journalisation et supervision",
      ctaOversightTitle: "Les chemins de journalisation et d'approbation doivent pointer vers de vrais artefacts",
      ctaOversightBody:
        "Utilisez un dossier de preuve live pour les ancres de trace, les evenements structures et les exports de revue prets pour approbation.",
      metrics: { approvals: "Approbations", blocks: "Blocages", runs: "Executions dans la fenetre", execution: "Execution" },
      liveProofEyebrow: "Preuve live",
      openDossierDemo: "Ouvrir la demo du dossier",
      backLabel: "Retour",
      casesLabel: "Cas",
      approvalsLabel: "Approbations",
      blocksLabel: "Blocages",
      portableLabel: "Portable",
      systemTypes: {
        hr: "RH / Recrutement",
        credit: "Credit / decisions financieres",
        insurance: "Assurance / souscription / sinistres",
        fraud: "Detection de fraude / LBC",
        healthcare: "Sante",
        education: "Education",
        customerService: "Service client / agent conversationnel",
        other: "Autre",
      },
    },
  }[locale];
  const builderCopy = {
    locale,
    stepLabel: builderUi.stepLabel,
    ofLabel: builderUi.ofLabel,
    nextLabel: builderUi.nextLabel,
    finishLabel: builderUi.finishLabel,
    summaryEyebrow: builderUi.summaryEyebrow,
    summaryTitle: builderUi.summaryTitle,
    evidenceEyebrow: builderUi.evidenceEyebrow,
    evidenceTitle: builderUi.evidenceTitle,
    selectPlaceholder: builderUi.selectPlaceholder,
    disclaimer: builderUi.disclaimer,
    classifications: builderUi.classifications,
    rationale: builderUi.rationale,
    stepTitles: builderUi.stepTitles,
    fields: {
      systemType: locale === "de" ? "Was macht Ihr KI-System?" : locale === "fr" ? "Que fait votre systeme d'IA ?" : "What does your AI system do?",
      memberStates: locale === "de" ? "Wo wird es eingesetzt?" : locale === "fr" ? "Ou sera-t-il deploye ?" : "Where will it be deployed?",
      usedByEuResidents:
        locale === "de" ? "Wird es von EU-Buergern genutzt?" : locale === "fr" ? "Utilise par des residents de l'UE ?" : "Used by EU residents?",
      autonomousDecisions:
        locale === "de"
          ? "Trifft es autonome Entscheidungen mit Auswirkungen auf Personen?"
          : locale === "fr"
            ? "Prend-il des decisions autonomes affectant des personnes ?"
            : "Does it make autonomous decisions affecting people?",
      risks: locale === "de" ? "Welche Risiken hat Ihr Team identifiziert?" : locale === "fr" ? "Quels risques avez-vous identifies ?" : "What risks has your team identified?",
      mitigations:
        locale === "de" ? "Welche Massnahmen sind vorhanden?" : locale === "fr" ? "Quelles mesures de mitigation existent ?" : "What mitigation measures are in place?",
      logging:
        locale === "de"
          ? "Wie werden Journalisierung und Rueckverfolgbarkeit beschrieben?"
          : locale === "fr"
            ? "Comment decrivez-vous la journalisation et la tracabilite ?"
            : "How do you describe logging and traceability?",
      oversight:
        locale === "de"
          ? "Wie erfolgt menschliche Aufsicht?"
          : locale === "fr"
            ? "Comment la supervision humaine fonctionne-t-elle ?"
            : "How does human oversight work?",
    },
    packageSections: builderUi.packageSections,
    packageChecklist: {
      done:
        locale === "de"
          ? ["Artikel-9-Entwurf", "Artikel-12-Entwurf zur Journalisierung", "Artikel-14-Entwurf zur Aufsicht", "Druckfertiges Paket"]
          : locale === "fr"
            ? [
                "Brouillon Article 9",
                "Brouillon Article 12 journalisation",
                "Brouillon Article 14 supervision",
                "Dossier pret a imprimer",
              ]
            : ["Article 9 template draft", "Article 12 logging draft", "Article 14 oversight draft", "Print-ready package"],
      todo:
        locale === "de"
          ? ["Nachweis-Workflow (im Selbstbetrieb via GitHub oder als bezahltes Setup)", "Audit-Export (nach Setup / Enterprise-Support)"]
          : locale === "fr"
            ? ["Workflow de preuve (en autonomie via GitHub ou mise en place payante)", "Export pret pour audit (apres mise en place / support enterprise)"]
            : ["Evidence workflow (self-serve via GitHub or paid setup)", "Audit-ready export (after setup / enterprise support)"],
    },
    packageTitle: builderUi.packageTitle,
    packageDisclaimer: builderUi.packageDisclaimer,
    requiredArticles: builderUi.requiredArticles,
    evidencePlaceholder: builderUi.evidencePlaceholder,
    getEvidence: locale === "de" ? "Startpaket buchen" : locale === "fr" ? "Reserver le pack de lancement" : "Book Launch Pack",
    openProof: builderUi.openProof,
    openDocs: builderUi.openDocs,
    downloadJson: builderUi.downloadJson,
    openPrintable: builderUi.openPrintable,
    exportHint: builderUi.exportHint,
    placeholderText: builderUi.placeholderText,
    yes: localeCopy.common.yes,
    no: localeCopy.common.no,
    systemTypes: [
      { value: "hr", label: builderUi.systemTypes.hr },
      { value: "credit", label: builderUi.systemTypes.credit },
      { value: "insurance", label: builderUi.systemTypes.insurance },
      { value: "fraud", label: builderUi.systemTypes.fraud },
      { value: "healthcare", label: builderUi.systemTypes.healthcare },
      { value: "education", label: builderUi.systemTypes.education },
      { value: "customer-service", label: builderUi.systemTypes.customerService },
      { value: "other", label: builderUi.systemTypes.other },
    ],
    memberStates: [
      "AT",
      "BE",
      "BG",
      "HR",
      "CY",
      "CZ",
      "DK",
      "EE",
      "FI",
      "FR",
      "DE",
      "GR",
      "HU",
      "IE",
      "IT",
      "LV",
      "LT",
      "LU",
      "MT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SK",
      "SI",
      "ES",
      "SE",
    ],
    placeholders: builderUi.placeholders,
    ctaRiskEyebrow: builderUi.ctaRiskEyebrow,
    ctaRiskTitle: builderUi.ctaRiskTitle,
    ctaRiskBody: builderUi.ctaRiskBody,
    ctaRiskPoints: builderUi.ctaRiskPoints,
    ctaOversightEyebrow: builderUi.ctaOversightEyebrow,
    ctaOversightTitle: builderUi.ctaOversightTitle,
    ctaOversightBody: builderUi.ctaOversightBody,
    links: {
      pricing: ctx.href("pricing"),
      proof: ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html"),
      docs: ctx.href("docs"),
    },
    metrics: builderUi.metrics,
  };

  return `
    <section class="section">
      <div class="container split-grid">
        <div class="fade-up">
          <p class="eyebrow">${escapeHtml(locale === "de" ? "Dokumentations-Assistent" : locale === "fr" ? "Assistant de documentation" : "Builder")}</p>
          <h1>${escapeHtml(LOCALES[locale].builder.headline)}</h1>
          <p class="lead">${escapeHtml(LOCALES[locale].builder.intro)}</p>
        </div>
        <aside class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(builderUi.liveProofEyebrow)}</p>
          <h3>${escapeHtml(proofSurfaceTitle)}</h3>
          <div class="metric-grid">
            <div class="metric"><span>${escapeHtml(builderUi.casesLabel)}</span><strong>${proofSurface?.summary?.cases_total ?? 2}</strong></div>
            <div class="metric"><span>${escapeHtml(builderUi.approvalsLabel)}</span><strong>${proofSurface?.summary?.approvals ?? 1}</strong></div>
            <div class="metric"><span>${escapeHtml(builderUi.blocksLabel)}</span><strong>${proofSurface?.summary?.blocks ?? 1}</strong></div>
            <div class="metric"><span>${escapeHtml(builderUi.portableLabel)}</span><strong>${proofSurface?.summary?.portable_paths ? "true" : "true"}</strong></div>
          </div>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(builderUi.openDossierDemo)}</a>
        </aside>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container builder-shell" id="builder-root">
        <div class="builder-progress"><div class="builder-progress-bar"></div></div>
        <div class="builder-layout">
          <div class="builder-main">
            <div class="builder-panel">
              <p class="eyebrow" data-builder-step-counter></p>
              <h2 data-builder-step-title></h2>
            </div>
            <div class="builder-main" data-builder-step-body></div>
            <div class="builder-nav">
              <button class="button-soft" type="button" data-builder-prev>${escapeHtml(builderUi.backLabel)}</button>
              <button class="button" type="button" data-builder-next>${escapeHtml(builderUi.nextLabel)}</button>
            </div>
          </div>
          <aside class="builder-sidebar" data-builder-summary></aside>
        </div>
        <script id="builder-config" type="application/json">${escapeHtml(
          JSON.stringify({
            copy: builderCopy,
            evidenceSummary: {
              approvals: proofSurface?.summary?.approvals ?? 1,
              blocks: proofSurface?.summary?.blocks ?? 1,
              runsInWindow: proofSurface?.summary?.runs_in_window ?? 2,
              executionQuality: proofSurface?.summary?.execution_quality_status ?? "healthy",
            },
          })
        )}</script>
      </div>
    </section>
  `;
}

function renderDocs(locale, ctx) {
  const copy = LOCALES[locale].docs;
  const ui = {
    en: {
      lead: "Use this page when you want the source-of-truth docs behind the public site: how to run the toolkit, where to inspect live proof, and where the product boundary is documented plainly.",
      startEyebrow: "Start and verify",
      startTitle: "First source docs to open",
      startLead: "These links are the fastest way to go from curiosity to real inspection on your own infrastructure.",
      scopeEyebrow: "Scope and boundaries",
      scopeTitle: "Docs that explain what this product is and is not",
      scopeLead: "Use these once you have seen the proof path and want the clearer source-of-truth explanation behind it.",
      cards: {
        quickstart: ["Quickstart guide", "Run your first honest starter evidence pack on your own agent.", `${GITHUB_REPO}/blob/main/docs/quickstart-your-agent.md`, "Open on GitHub"],
        runbook: ["EU operator runbook", "End-to-end run, package, verify, and handoff guidance for the EU evidence path.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Open on GitHub"],
        proof: ["Proof hub", "Published live demos and artifact surfaces for both product paths.", "__proof__", "Open proof hub"],
        technology: ["Technology page", "Architecture, verification model, artifact contracts, and trust boundary.", "__technology__", "Open technology page"],
        buyer: ["EU buyer guide", "What the product contributes, what remains operator-owned, and where it fits in the workflow.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-buyer-guide.md`, "Open on GitHub"],
        boundary: ["Automation boundary", "What remains manual by design, what is real tech debt, and what is optional expansion.", `${GITHUB_REPO}/blob/main/docs/automation-boundary-and-tech-debt.md`, "Open on GitHub"],
      },
    },
    de: {
      lead: "Diese Seite verweist auf die massgeblichen Dokumente hinter der oeffentlichen Site: wie das Toolkit laeuft, wo die Live-Nachweise liegen und wo die Produktgrenze klar dokumentiert ist.",
      startEyebrow: "Start und Verifikation",
      startTitle: "Diese Referenzdokumente zuerst oeffnen",
      startLead: "Das sind die schnellsten Links von erster Neugier zu echter Pruefung auf Ihrer eigenen Infrastruktur.",
      scopeEyebrow: "Scope und Grenzen",
      scopeTitle: "Dokumente, die erklaeren, was das Produkt ist und was nicht",
      scopeLead: "Diese Quellen helfen, sobald der Nachweis-Pfad klar ist und Sie die saubere Referenzerklaerung dahinter brauchen.",
      cards: {
        quickstart: ["Schnellstart-Guide", "Das erste ehrliche Starter-Nachweispaket auf dem eigenen Agenten ausfuehren.", `${GITHUB_REPO}/blob/main/docs/quickstart-your-agent.md`, "Auf GitHub oeffnen"],
        runbook: ["EU-Operator-Leitfaden", "Ende-zu-Ende-Hinweise fuer Run, Paketierung, Verifikation und Uebergabe im EU-Pfad.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Auf GitHub oeffnen"],
        proof: ["Nachweis-Hub", "Veroeffentlichte Live-Demos und Artefakt-Oberflaechen fuer beide Produktpfade.", "__proof__", "Nachweis-Hub oeffnen"],
        technology: ["Technologie-Seite", "Architektur, Verifikationsmodell, Artefaktvertraege und Vertrauensgrenze.", "__technology__", "Technologie-Seite oeffnen"],
        buyer: ["EU-Kaeuferleitfaden", "Was das Produkt beitraegt, was beim Operator bleibt und wo es in den Workflow passt.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-buyer-guide.md`, "Auf GitHub oeffnen"],
        boundary: ["Automationsgrenze", "Was absichtlich manuell bleibt, was echter Tech Debt ist und was nur optionale Expansion ist.", `${GITHUB_REPO}/blob/main/docs/automation-boundary-and-tech-debt.md`, "Auf GitHub oeffnen"],
      },
    },
    fr: {
      lead: "Utilisez cette page pour la documentation de reference derriere le site public: comment lancer le toolkit, ou inspecter la preuve live, et ou la frontiere du produit est documentee clairement.",
      startEyebrow: "Demarrer et verifier",
      startTitle: "Premiers docs source a ouvrir",
      startLead: "Ces liens sont le chemin le plus court entre la curiosite initiale et une vraie inspection sur votre propre infrastructure.",
      scopeEyebrow: "Perimetre et frontieres",
      scopeTitle: "Les docs qui expliquent ce que le produit est et n'est pas",
      scopeLead: "Utilisez-les apres avoir vu le chemin de preuve, quand vous voulez une explication de reference plus nette.",
      cards: {
        quickstart: ["Guide de demarrage rapide", "Lancer votre premier dossier de preuve honnete sur votre propre agent.", `${GITHUB_REPO}/blob/main/docs/quickstart-your-agent.md`, "Ouvrir sur GitHub"],
        runbook: ["Guide operateur UE", "Guidage complet pour l'execution, la mise en forme, la verification et la transmission sur le chemin UE.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Ouvrir sur GitHub"],
        proof: ["Hub de preuve", "Demos live publiees et surfaces d'artefacts pour les deux chemins produit.", "__proof__", "Ouvrir le hub de preuve"],
        technology: ["Page technologie", "Architecture, modele de verification, contrats d'artefacts et frontiere de confiance.", "__technology__", "Ouvrir la page technologie"],
        buyer: ["Guide acheteur UE", "Ce que le produit couvre, ce qui reste a la charge de l'operateur, et ou il s'insere dans le workflow.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-buyer-guide.md`, "Ouvrir sur GitHub"],
        boundary: ["Frontiere d'automatisation", "Ce qui reste manuel par design, ce qui est une vraie dette technique, et ce qui n'est qu'une extension optionnelle.", `${GITHUB_REPO}/blob/main/docs/automation-boundary-and-tech-debt.md`, "Ouvrir sur GitHub"],
      },
    },
  }[locale] || {
    lead: "Use this page when you want the source-of-truth docs behind the public site.",
    startEyebrow: "Start and verify",
    startTitle: "First source docs to open",
    startLead: "These links are the fastest way to go from curiosity to real inspection on your own infrastructure.",
    scopeEyebrow: "Scope and boundaries",
    scopeTitle: "Docs that explain what this product is and is not",
    scopeLead: "Use these once you have seen the proof path and want the clearer source-of-truth explanation behind it.",
    cards: {
      quickstart: ["Quickstart guide", "Run your first honest starter evidence pack on your own agent.", `${GITHUB_REPO}/blob/main/docs/quickstart-your-agent.md`, "Open on GitHub"],
      runbook: ["EU operator runbook", "End-to-end run, package, verify, and handoff guidance for the EU evidence path.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Open on GitHub"],
      proof: ["Proof hub", "Published live demos and artifact surfaces for both product paths.", "__proof__", "Open proof hub"],
      technology: ["Technology page", "Architecture, verification model, artifact contracts, and trust boundary.", "__technology__", "Open technology page"],
      buyer: ["EU buyer guide", "What the product contributes, what remains operator-owned, and where it fits in the workflow.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-buyer-guide.md`, "Open on GitHub"],
      boundary: ["Automation boundary", "What remains manual by design, what is real tech debt, and what is optional expansion.", `${GITHUB_REPO}/blob/main/docs/automation-boundary-and-tech-debt.md`, "Open on GitHub"],
    },
  };
  const hrefFor = (value) => {
    if (value === "__proof__") return ctx.assetHref("demo/");
    if (value === "__technology__") return ctx.href("technical");
    return value;
  };
  const renderDocCard = ([title, text, href, label]) => `
    <article class="card fade-up">
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(text)}</p>
      <a class="button-ghost" href="${hrefFor(href)}"${href.startsWith("http") ? ' target="_blank" rel="noreferrer"' : ""}>${escapeHtml(label)}</a>
    </article>
  `;
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">${escapeHtml(LOCALES[locale].nav.docs)}</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <p class="lead">${escapeHtml(ui.lead)}</p>
        <p class="eyebrow section-tight">${escapeHtml(ui.startEyebrow)}</p>
        <h2>${escapeHtml(ui.startTitle)}</h2>
        <p class="muted">${escapeHtml(ui.startLead)}</p>
        <div class="docs-grid section-tight">
          ${renderDocCard(ui.cards.quickstart)}
          ${renderDocCard(ui.cards.runbook)}
          ${renderDocCard(ui.cards.proof)}
        </div>
        <p class="eyebrow section-tight">${escapeHtml(ui.scopeEyebrow)}</p>
        <h2>${escapeHtml(ui.scopeTitle)}</h2>
        <p class="muted">${escapeHtml(ui.scopeLead)}</p>
        <div class="docs-grid section-tight">
          ${renderDocCard(ui.cards.technology)}
          ${renderDocCard(ui.cards.buyer)}
          ${renderDocCard(ui.cards.boundary)}
        </div>
      </div>
    </section>
  `;
}

function renderAbout(locale, ctx) {
  const copy = LOCALES[locale].about;
  const labels = {
    en: {
      eyebrow: "Technical teams",
      proofEyebrow: "Live proof",
      proofTitle: "What should already exist before installation time",
      proofBody:
        "A serious product should expose real artifacts, explicit gates, and, for authority-facing paths, an authenticity story rather than hash-only integrity before your team spends time integrating it.",
      firstRunEyebrow: "First run",
    },
    de: {
      eyebrow: "Technische Teams",
      proofEyebrow: "Live-Nachweise",
      proofTitle: "Was schon vor Integrationsaufwand sichtbar sein sollte",
      proofBody:
        "Ein ernstzunehmendes Produkt sollte echte Artefakte, explizite Verifikationsschritte und fuer Behoerdenpfade eine Authentizitaetsgeschichte statt nur Hash-Integritaet zeigen, bevor Ihr Team Integrationszeit investiert.",
      firstRunEyebrow: "Erster Lauf",
    },
    fr: {
      eyebrow: "Equipes techniques",
      proofEyebrow: "Preuve live",
      proofTitle: "Ce qui doit deja exister avant de depenser du temps d'integration",
      proofBody:
        "Un produit serieux doit montrer de vrais artefacts, des etapes de verification explicites et, pour les chemins tournes vers l'autorite, une histoire d'authenticite plutot qu'une simple integrite par hash avant que votre equipe n'investisse du temps d'integration.",
      firstRunEyebrow: "Premier essai",
    },
  };
  const ui = labels[locale] || labels.en;
  const technical = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(ui.eyebrow)}</p>
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="button-row section-tight">
            <a class="button" href="${ctx.href("technical")}">${escapeHtml(technical.landingButton)}</a>
            <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">${escapeHtml(
              LOCALES[locale].common.viewProof
            )}</a>
            <a class="button-soft" href="${ctx.href("docs")}">${escapeHtml(technical.docsButton)}</a>
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.proofEyebrow)}</p>
          <h3>${escapeHtml(ui.proofTitle)}</h3>
          <div class="proof-frame">
            <img src="${ctx.assetHref(ctx.proof.screenshotPaths.secondary)}" alt="${escapeHtml(
              locale === "de"
                ? "Screenshot eines verifizierten Nachweispakets"
                : locale === "fr"
                  ? "Capture d'un dossier de preuve verifie"
                  : "Verified evidence bundle screenshot"
            )}" />
          </div>
          <p class="muted">${escapeHtml(ui.proofBody)}</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <h2 class="section-title">${escapeHtml(copy.inspectTitle)}</h2>
        <p class="lead">${escapeHtml(copy.inspectLead)}</p>
        <div class="docs-grid">
          ${copy.inspectCards
            .map(
              ([title, text]) => `
            <article class="card fade-up">
              <h3>${escapeHtml(title)}</h3>
              <p class="muted">${escapeHtml(text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.firstRunEyebrow)}</p>
        <h3>${escapeHtml(copy.quickstartTitle)}</h3>
        <p class="muted">${escapeHtml(copy.quickstartLead)}</p>
        <div class="code-snippet"><code>${escapeHtml(copy.quickstartCommand)}</code></div>
        <ul class="pricing-list section-tight">
          ${copy.quickstartPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
        <div class="button-row">
          <a class="button" href="${GITHUB_REPO}/blob/main/docs/quickstart-your-agent.md" target="_blank" rel="noreferrer">${escapeHtml(copy.quickstartButton)}</a>
          <a class="button-soft" href="${ctx.href("technical")}">${escapeHtml(technical.landingButton)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderContact(locale, ctx) {
  const copy = LOCALES[locale].contact;
  const cards = {
    en: {
      eyebrow: "Contact",
      pilotTitle: "Start a pilot",
      pilotBody: "Use the existing pilot request template in the open-source repository.",
      pilotCta: "Open pilot request",
      proofTitle: "Review the live proof",
      proofBody: "Send buyers directly to the published dossier and evidence pack surface.",
      proofCta: "Open proof hub",
      docsTitle: "Need the technical docs?",
      docsBody: "Use the repository docs and product matrix as the source of truth.",
      docsCta: "Open docs",
    },
    de: {
      eyebrow: "Kontakt",
      pilotTitle: "Pilot starten",
      pilotBody: "Nutzen Sie die bestehende Pilot-Anfragevorlage im Open-Source-Repository.",
      pilotCta: "Pilot-Anfrage oeffnen",
      proofTitle: "Live-Nachweise pruefen",
      proofBody: "Leiten Sie Interessenten direkt zum veroeffentlichten Dossier und zur passenden Nachweisoberflaeche.",
      proofCta: "Nachweis-Hub oeffnen",
      docsTitle: "Brauchen Sie die technische Dokumentation?",
      docsBody: "Nutzen Sie die Repository-Dokumente und die Produktmatrix als massgebliche Quelle.",
      docsCta: "Dokumentation oeffnen",
    },
    fr: {
      eyebrow: "Contact",
      pilotTitle: "Demarrer un pilote",
      pilotBody: "Utilisez le modele existant de demande de pilote dans le depot open source.",
      pilotCta: "Ouvrir la demande de pilote",
      proofTitle: "Verifier la preuve live",
      proofBody: "Envoyez directement les acheteurs vers le dossier publie et la surface de preuve correspondante.",
      proofCta: "Ouvrir le hub de preuve",
      docsTitle: "Besoin de la documentation technique ?",
      docsBody: "Utilisez les docs du depot et la matrice produit comme reference principale.",
      docsCta: "Ouvrir la documentation",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">${escapeHtml(cards.eyebrow)}</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <div class="contact-grid section-tight">
          <article class="card fade-up">
            <h3>${escapeHtml(cards.pilotTitle)}</h3>
            <p class="muted">${escapeHtml(cards.pilotBody)}</p>
            <a class="button" href="${GITHUB_REPO}/issues/new?template=pilot_request.yml" target="_blank" rel="noreferrer">${escapeHtml(cards.pilotCta)}</a>
          </article>
          <article class="card fade-up">
            <h3>${escapeHtml(cards.proofTitle)}</h3>
            <p class="muted">${escapeHtml(cards.proofBody)}</p>
            <a class="button-ghost" href="${ctx.assetHref("demo/")}" data-track-event="contact_demo_hub">${escapeHtml(cards.proofCta)}</a>
          </article>
          <article class="card fade-up">
            <h3>${escapeHtml(cards.docsTitle)}</h3>
            <p class="muted">${escapeHtml(cards.docsBody)}</p>
            <a class="button-ghost" href="${ctx.href("docs")}">${escapeHtml(cards.docsCta)}</a>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderLegal(locale, key) {
  const title = LOCALES[locale].legalTitles[key];
  const blocks = {
    en: {
      privacy: [
        "This site uses only essential storage by default. When analytics is enabled, the intended stack is EU-hosted Plausible.",
        "The Builder stores draft progress in local browser storage for convenience. No AI model data is required to use the free documentation flow.",
        "For evidence generation, teams are expected to run the technical workflow in their own environment.",
      ],
      terms: [
        "This site provides documentation templates and technical workflow guidance.",
        "It does not constitute legal advice or a formal conformity determination.",
        "Use of the open-source core and any commercial package remains subject to the repository license and commercial terms agreed separately.",
      ],
      disclaimer: [
        "EU AI Act obligations and interpretations can change over time.",
        "The Builder supports technical documentation and evidence generation. Qualified legal counsel should review the final package.",
        "Risk classification shown in the builder is preliminary and should be treated as a pre-evaluation aid.",
      ],
      cookies: [
        "Only essential storage is active by default.",
        "If analytics is enabled later, it should remain EU-hosted and documented clearly.",
        "No third-party marketing cookies should be enabled without explicit consent.",
      ],
    },
    de: {
      privacy: [
        "Diese Website nutzt standardmaessig nur essenziellen Speicher. Wenn Analytics spaeter aktiviert wird, sollte der vorgesehene Stack EU-gehostetes Plausible sein.",
        "Der Dokumentations-Assistent speichert Entwurfsfortschritte zur Bequemlichkeit lokal im Browser. Fuer den kostenlosen Dokumentationspfad sind keine KI-Modelldaten noetig.",
        "Fuer die Nachweiserzeugung wird erwartet, dass Teams den technischen Workflow in ihrer eigenen Umgebung ausfuehren.",
      ],
      terms: [
        "Diese Website stellt Dokumentationsvorlagen und technische Workflow-Hinweise bereit.",
        "Sie stellt keine Rechtsberatung und keine formale Konformitaetsentscheidung dar.",
        "Die Nutzung des Open-Source-Kerns und etwaiger kommerzieller Angebote unterliegt der Repository-Lizenz und separat vereinbarten kommerziellen Bedingungen.",
      ],
      disclaimer: [
        "Pflichten und Auslegungen der EU-KI-Verordnung koennen sich mit der Zeit aendern.",
        "Der Dokumentations-Assistent unterstuetzt technische Dokumentation und Nachweiserzeugung. Qualifizierte Rechtsberatung sollte das finale Paket pruefen.",
        "Die im Dokumentations-Assistenten gezeigte Risikoklassifizierung ist vorlaeufig und sollte nur als Hilfe fuer die Vorpruefung behandelt werden.",
      ],
      cookies: [
        "Standardmaessig ist nur essenzieller Speicher aktiv.",
        "Wenn Analytics spaeter aktiviert wird, sollte der Stack EU-gehostet bleiben und klar dokumentiert sein.",
        "Drittanbieter-Marketing-Cookies sollten nicht ohne ausdrueckliche Einwilligung aktiviert werden.",
      ],
    },
    fr: {
      privacy: [
        "Ce site utilise uniquement le stockage essentiel par defaut. Si les analytics sont activees plus tard, le stack vise doit rester Plausible heberge dans l'UE.",
        "L'assistant de documentation conserve l'avancement des brouillons dans le stockage local du navigateur pour plus de confort. Aucune donnee de modele d'IA n'est requise pour le flux gratuit de documentation.",
        "Pour la generation de preuves, les equipes sont censees executer le workflow technique dans leur propre environnement.",
      ],
      terms: [
        "Ce site fournit des modeles de documentation et des indications sur le workflow technique.",
        "Il ne constitue ni un conseil juridique ni une determination formelle de conformite.",
        "L'utilisation du noyau open source et de toute offre commerciale reste soumise a la licence du depot et aux conditions commerciales convenues separement.",
      ],
      disclaimer: [
        "Les obligations et interpretations de l'EU AI Act peuvent evoluer avec le temps.",
        "L'assistant de documentation aide pour la documentation technique et la generation de preuves. Un conseil juridique qualifie doit revoir le dossier final.",
        "La classification du risque affichee dans l'assistant de documentation est preliminaire et doit etre traitee comme une aide de tri preliminaire.",
      ],
      cookies: [
        "Seul le stockage essentiel est actif par defaut.",
        "Si les analytics sont activees plus tard, elles doivent rester hebergees dans l'UE et etre documentees clairement.",
        "Aucun cookie marketing tiers ne doit etre active sans consentement explicite.",
      ],
    },
  }[locale];

  return `
    <section class="section">
      <div class="container legal-card">
        <p class="eyebrow">${escapeHtml(LOCALES[locale].common.legalLabel)}</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="text-list section-tight">
          ${blocks[key].map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMovedPage(locale, ctx, destinationKey, label) {
  const titleByLocale = {
    en: "Page moved",
    de: "Seite verschoben",
    fr: "Page deplacee",
  };
  const bodyByLocale = {
    en: "The Technology page now lives at a new URL. Use the button below if you are not redirected automatically.",
    de: "Die Technologie-Seite liegt jetzt unter einer neuen URL. Nutzen Sie den Button unten, falls keine automatische Weiterleitung erfolgt.",
    fr: "La page technologie a maintenant une nouvelle URL. Utilisez le bouton ci-dessous si vous n'etes pas redirige automatiquement.",
  };
  const destination = ctx.href(destinationKey);
  return `
    <script>window.location.replace(${JSON.stringify(destination)});</script>
    <section class="section">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(titleByLocale[locale] || titleByLocale.en)}</p>
        <h1>${escapeHtml(label)}</h1>
        <p class="lead">${escapeHtml(bodyByLocale[locale] || bodyByLocale.en)}</p>
        <div class="button-row">
          <a class="button" href="${destination}">${escapeHtml(label)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderBlogIndex(locale, ctx) {
  const ui = {
    en: {
      eyebrow: "Blog",
      lead: "High-intent content for teams preparing documentation, evidence, and conformity-adjacent technical review.",
      readCta: "Read article",
    },
    de: {
      eyebrow: "Blog",
      lead: "Inhalte fuer Teams, die Dokumentation, Nachweise und konformitaetsnahe technische Pruefungen vorbereiten.",
      readCta: "Artikel lesen",
    },
    fr: {
      eyebrow: "Blog",
      lead: "Contenus pour les equipes qui preparent la documentation, les preuves et les revues techniques liees a la conformite.",
      readCta: "Lire l'article",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.eyebrow)}</p>
        <h1>${escapeHtml(LOCALES[locale].blog.headline)}</h1>
        <p class="lead">${escapeHtml(ui.lead)}</p>
        <div class="blog-grid section-tight">
          ${Object.entries(BLOG_CONTENT)
            .map(
              ([key, article]) => `
            <article class="blog-card fade-up">
              <h3>${escapeHtml(pickLocalizedValue(article.title, locale) || "")}</h3>
              <p class="muted">${escapeHtml(pickLocalizedValue(article.description, locale) || "")}</p>
              <a class="button-ghost" href="${ctx.href(`blog-${key}`)}">${escapeHtml(ui.readCta)}</a>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderBlogPage(locale, ctx, key) {
  const article = BLOG_CONTENT[key];
  const title = pickLocalizedValue(article.title, locale) || "";
  const description = pickLocalizedValue(article.description, locale) || "";
  const sections = pickLocalizedValue(article.sections, locale) || [];
  const ui = {
    en: {
      eyebrow: "Blog",
      nextEyebrow: "Next step",
      nextTitle: "Do not separate templates from proof",
      startBuilder: "Start free builder",
      openProof: "Open proof hub",
    },
    de: {
      eyebrow: "Blog",
      nextEyebrow: "Naechster Schritt",
      nextTitle: "Vorlagen nicht von Nachweisen trennen",
      startBuilder: "Kostenlosen Dokumentations-Assistenten starten",
      openProof: "Nachweis-Hub oeffnen",
    },
    fr: {
      eyebrow: "Blog",
      nextEyebrow: "Etape suivante",
      nextTitle: "Ne separez pas les modeles de la preuve",
      startBuilder: "Demarrer le builder gratuit",
      openProof: "Ouvrir le hub de preuve",
    },
  }[locale];
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <div class="timeline">
          ${sections
            .map(
              (section) => `
            <article class="card fade-up">
              <h2>${escapeHtml(section.heading)}</h2>
              <p class="muted">${escapeHtml(section.body)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.nextEyebrow)}</p>
        <h3>${escapeHtml(ui.nextTitle)}</h3>
        <div class="button-row">
          <a class="button" href="${ctx.href("builder")}" data-track-event="blog_start_builder">${escapeHtml(ui.startBuilder)}</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/")}" data-track-event="blog_demo_hub">${escapeHtml(ui.openProof)}</a>
        </div>
      </div>
    </section>
  `;
}

function templateDownloadContent(locale, key) {
  const data = TEMPLATE_CONTENT[key];
  const title = data.title[locale] || data.title.en;
  const intro = pickLocalizedValue(data.intro, locale) || "";
  const rows = pickLocalizedValue(data.sections, locale) || [];
  const contractMatrix = pickLocalizedValue(data.contractMatrix, locale);
  const operatorDetail = pickLocalizedValue(data.operatorDetail, locale);
  const dossierContext = pickLocalizedValue(data.dossierContext, locale);
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; max-width: 860px; margin: 40px auto; color: #0f172a; line-height: 1.6; }
    h1, h2 { font-family: "Space Grotesk", Inter, sans-serif; letter-spacing: -0.03em; }
    section { border: 1px solid #dbe5f1; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border-bottom: 1px solid #dbe5f1; text-align: left; vertical-align: top; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <section><p>${escapeHtml(intro)}</p></section>
  ${
    contractMatrix
      ? `
  <section>
    <h2>${escapeHtml(contractMatrix.title || "Working split")}</h2>
    ${contractMatrix.note ? `<p>${escapeHtml(contractMatrix.note)}</p>` : ""}
    <table>
      <thead><tr>${(contractMatrix.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${(contractMatrix.rows || [])
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  </section>
  `
      : `
  <section>
    <h2>Section guide</h2>
    <table>
      <thead><tr><th>Section</th><th>Meaning</th><th>Evidence</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  </section>
  `
  }
  ${
    operatorDetail
      ? `
  <section>
    <h2>${escapeHtml(operatorDetail.title || "Manual fields")}</h2>
    ${operatorDetail.lead ? `<p>${escapeHtml(operatorDetail.lead)}</p>` : ""}
    <table>
      <thead><tr>${(operatorDetail.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${(operatorDetail.rows || [])
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  </section>
  `
      : ""
  }
  ${
    dossierContext
      ? `
  <section>
    <h2>${escapeHtml(dossierContext.title || "Related files")}</h2>
    ${dossierContext.lead ? `<p>${escapeHtml(dossierContext.lead)}</p>` : ""}
    <table>
      <thead><tr>${(dossierContext.headers || []).map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${(dossierContext.rows || [])
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  </section>
  `
      : ""
  }
  <section><p>Use browser print to save this document as PDF.</p></section>
</body>
</html>`;
}

function softwareSchema(locale, origin) {
  const offerDescription =
    locale === "de"
      ? "Kostenlose Vorlagen fuer EU-AI-Act-Dokumentation und technische Nachweise"
      : locale === "fr"
        ? "Modeles gratuits de documentation EU AI Act et de preuves techniques"
        : "Free EU AI Act compliance documentation templates";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EU AI Act Evidence Builder",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: offerDescription,
    },
    operatingSystem: "Web",
    inLanguage: ["en", "de", "fr"],
    url: `${origin}/${locale}/`,
  };
}

function faqSchema(locale, key) {
  const data = TEMPLATE_CONTENT[key];
  if (data.hideFaq === true) return null;
  const faq = pickLocalizedValue(data.faq, locale) || [];
  if (faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function buildSiteDefinition(origin = DEFAULT_ORIGIN, siteOutputRoot = SITE_OUTPUT_ROOT) {
  const proof = getProofSurfaceData(siteOutputRoot);
  const pages = [];

  const add = (page) => pages.push(page);

  for (const locale of SITE_LOCALES) {
    const meta = LOCALES[locale];
    const technicalMeta = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
    const landingSchema = softwareSchema(locale, origin);
    add(
      createPage(locale, "landing", "", {
        title: meta.landing.title,
        description: meta.landing.description,
        keywords: meta.landing.keywords,
        schema: [landingSchema],
        body: (ctx) => renderLanding(locale, ctx),
      })
    );
    add(
      createPage(locale, "how-it-works", "how-it-works", {
        title: meta.how.title,
        description: meta.how.description,
        body: (ctx) => renderHowItWorks(locale, ctx),
      })
    );
    add(
      createPage(locale, "holding", "holding", {
        title: meta.holding.title,
        description: meta.holding.description,
        body: (ctx) => renderHolding(locale, ctx),
      })
    );
    add(
      createPage(locale, "technical", "technology", {
        title: technicalMeta.title,
        description: technicalMeta.description,
        body: (ctx) => renderTechnical(locale, ctx),
      })
    );
    add(
      createPage(locale, "technical-legacy", "technical", {
        title: `${meta.nav.technical} | EU AI Evidence Builder`,
        description: technicalMeta.description,
        body: (ctx) => renderMovedPage(locale, ctx, "technical", meta.nav.technical),
      })
    );
    add(
      createPage(locale, "pricing", "pricing", {
        title: meta.pricing.title,
        description: meta.pricing.description,
        schema: [
          softwareSchema(locale, origin),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: meta.pricing.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ],
        body: (ctx) => renderPricing(locale, ctx),
      })
    );
    add(
      createPage(locale, "builder", "builder", {
        title: meta.builder.title,
        description: meta.builder.description,
        body: (ctx) => renderBuilder(locale, ctx),
      })
    );
    add(
      createPage(locale, "templates", "templates", {
        title: meta.templates.title,
        description: meta.templates.description,
        body: (ctx) =>
          renderTemplatesIndex(locale, ctx, TEMPLATE_PAGE_KEYS),
      })
    );
    add(
      createPage(locale, "docs", "docs", {
        title: meta.docs.title,
        description: meta.docs.description,
        body: (ctx) => renderDocs(locale, ctx),
      })
    );
    add(
      createPage(locale, "about", "about", {
        title: meta.about.title,
        description: meta.about.description,
        body: (ctx) => renderAbout(locale, ctx),
      })
    );
    add(
      createPage(locale, "contact", "contact", {
        title: meta.contact.title,
        description: meta.contact.description,
        body: (ctx) => renderContact(locale, ctx),
      })
    );
    for (const legalKey of ["privacy", "terms", "disclaimer", "cookies"]) {
      add(
        createPage(locale, legalKey, legalKey, {
          title: `${meta.legalTitles[legalKey]} | EU AI Evidence Builder`,
          description:
            locale === "de"
              ? `${meta.legalTitles[legalKey]} fuer die Website und den Dokumentations-Funnel des EU AI Evidence Builder.`
              : locale === "fr"
                ? `${meta.legalTitles[legalKey]} pour le site web et le tunnel documentaire du EU AI Evidence Builder.`
                : `${meta.legalTitles[legalKey]} for the EU AI Evidence Builder website and documentation funnel.`,
          body: () => renderLegal(locale, legalKey),
        })
      );
    }
  }

  for (const locale of SITE_LOCALES) {
    for (const templateKey of TEMPLATE_PAGE_KEYS) {
      const data = TEMPLATE_CONTENT[templateKey];
      add(
        createPage(locale, `template-${templateKey}`, `templates/${templateKey}`, {
          title: data.title[locale] || data.title.en,
          description: data.description[locale] || data.description.en,
          schema: [faqSchema(locale, templateKey)].filter(Boolean),
          body: (ctx) => renderTemplatePage(locale, ctx, templateKey, ctx.assetHref(`downloads/${locale}/${templateKey}.html`)),
        })
      );
    }
  }

  for (const locale of SITE_LOCALES) {
    add(
      createPage(locale, "blog", "blog", {
        title: LOCALES[locale].blog.title,
        description: LOCALES[locale].blog.description,
        body: (ctx) => renderBlogIndex(locale, ctx),
      })
    );
    for (const key of Object.keys(BLOG_CONTENT)) {
      add(
        createPage(locale, `blog-${key}`, `blog/${key}`, {
          title: pickLocalizedValue(BLOG_CONTENT[key].title, locale),
          description: pickLocalizedValue(BLOG_CONTENT[key].description, locale),
          body: (ctx) => renderBlogPage(locale, ctx, key),
        })
      );
    }
  }

  return { origin, proof, pages };
}

function renderRootRedirect(origin) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EU AI Evidence Builder</title>
  <meta http-equiv="refresh" content="0; url=./en/" />
  <script>
    (function () {
      var lang = (navigator.language || "").toLowerCase();
      var target = "./en/";
      if (lang.indexOf("de") === 0) target = "./de/";
      else if (lang.indexOf("fr") === 0) target = "./fr/";
      window.location.replace(target);
    })();
  </script>
</head>
<body>
  <p>Redirecting to <a href="${origin}/en/">the site</a>...</p>
</body>
</html>`;
}

function renderSitemap(origin, pages) {
  const items = pages
    .map((page) => {
      const alternates = pages.filter((candidate) => candidate.key === page.key);
      const altLinks = alternates
        .map(
          (alt) =>
            `<xhtml:link rel="alternate" hreflang="${alt.locale}" href="${canonicalUrl(origin, alt.locale, alt.segment)}"/>`
        )
        .join("");
      return `<url><loc>${canonicalUrl(origin, page.locale, page.segment)}</loc>${altLinks}<changefreq>weekly</changefreq><priority>${
        page.key === "landing" ? "1.0" : "0.8"
      }</priority></url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${items}</urlset>`;
}

function renderRobots(origin) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

function outputPathForPage(page, siteOutputRoot = SITE_OUTPUT_ROOT) {
  return path.join(siteOutputRoot, page.locale, ...toSegments(page.segment), "index.html");
}

export function getSiteOutputs(origin = DEFAULT_ORIGIN, siteOutputRoot = SITE_OUTPUT_ROOT) {
  const definition = buildSiteDefinition(origin, siteOutputRoot);
  const outputs = [];

  outputs.push({
    absPath: path.join(siteOutputRoot, "index.html"),
    content: renderRootRedirect(origin),
  });
  outputs.push({
    absPath: path.join(siteOutputRoot, "sitemap.xml"),
    content: renderSitemap(origin, definition.pages),
  });
  outputs.push({
    absPath: path.join(siteOutputRoot, "robots.txt"),
    content: renderRobots(origin),
  });

  for (const page of definition.pages) {
    outputs.push({
      absPath: outputPathForPage(page, siteOutputRoot),
      content: renderPageHtml(page, definition.pages, definition.proof, origin),
    });
  }

  for (const locale of SITE_LOCALES) {
    for (const key of TEMPLATE_DOWNLOAD_KEYS) {
      outputs.push({
        absPath: path.join(siteOutputRoot, "downloads", locale, `${key}.html`),
        content: templateDownloadContent(locale, key),
      });
    }
  }

  return { definition, outputs };
}

const REQUIRED_STATIC_FILES = [
  "site-assets/site.css",
  "site-assets/site.js",
  "site-assets/builder.js",
  "demo/index.html",
  "demo/agent-evidence/report.html",
  "demo/eu-ai-act/compliance/eu-ai-act-report.html",
  "demo/product-surfaces.json",
  "assets/screenshots/01.png",
  "assets/screenshots/05.png",
];

export function verifySiteOutputs(origin = DEFAULT_ORIGIN, siteOutputRoot = SITE_OUTPUT_ROOT) {
  const { outputs } = getSiteOutputs(origin, siteOutputRoot);
  const checks = [];

  for (const output of outputs) {
    const relPath = path.relative(siteOutputRoot, output.absPath) || path.basename(output.absPath);
    if (!existsSync(output.absPath)) {
      checks.push({
        id: `missing:${relPath}`,
        pass: false,
        path: relPath,
        message: "generated file is missing",
      });
      continue;
    }

    const actual = readFileSync(output.absPath, "utf8");
    checks.push({
      id: `content:${relPath}`,
      pass: actual === output.content,
      path: relPath,
      message: actual === output.content ? "content matches generated output" : "generated file is stale or modified",
    });
  }

  for (const relPath of REQUIRED_STATIC_FILES) {
    const absPath = path.join(siteOutputRoot, relPath);
    checks.push({
      id: `static:${relPath}`,
      pass: existsSync(absPath),
      path: relPath,
      message: existsSync(absPath) ? "static dependency present" : "required static dependency is missing",
    });
  }

  return {
    ok: checks.every((check) => check.pass),
    checked_files: checks.length,
    checks,
  };
}

export function writeSiteOutputs(origin = DEFAULT_ORIGIN, siteOutputRoot = SITE_OUTPUT_ROOT) {
  const { outputs } = getSiteOutputs(origin, siteOutputRoot);

  const generatedRoots = [
    path.join(siteOutputRoot, "en"),
    path.join(siteOutputRoot, "de"),
    path.join(siteOutputRoot, "fr"),
    path.join(siteOutputRoot, "downloads"),
  ];
  for (const root of generatedRoots) {
    rmSync(root, { recursive: true, force: true });
  }

  for (const output of outputs) {
    mkdirSync(path.dirname(output.absPath), { recursive: true });
    writeFileSync(output.absPath, output.content, "utf8");
  }

  return outputs;
}
