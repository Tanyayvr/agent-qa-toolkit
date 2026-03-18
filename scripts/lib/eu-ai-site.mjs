import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const SITE_OUTPUT_ROOT = path.join(REPO_ROOT, "docs");
const GITHUB_REPO = "https://github.com/Tanyayvr/agent-qa-toolkit";

export const DEFAULT_ORIGIN = process.env.EU_AI_SITE_ORIGIN || "https://tanyayvr.github.io/agent-qa-toolkit";
const PLAUSIBLE_DOMAIN = process.env.EU_AI_SITE_PLAUSIBLE_DOMAIN || "";

const LOCALES = {
  en: {
    code: "en",
    name: "English",
    htmlLang: "en",
    nav: {
      how: "How it works",
      technical: "Technical",
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
      trustLine: "Self-hosted · No data leaves your environment · Open source core",
      pilotCta: "Apply for Pilot",
      liveDemos: "Live demos",
      proofLabel: "Website proof",
      docsLabel: "Open source docs",
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
        "Build your EU AI Act technical documentation and generate machine-verifiable evidence for Articles 9, 12, 14, 15. Free templates. August 2026 deadline.",
      keywords:
        "EU AI Act compliance, EU AI Act documentation, high risk AI Europe, EU AI Act August 2026, conformity assessment preparation, AI evidence pack",
      heroTitle:
        "Your AI agent needs EU AI Act evidence documentation by August 2, 2026. We help you build it and prove it.",
      heroText:
        "Free documentation templates and a self-serve OSS setup path for Articles 9, 12, 14, 15. Paid options add setup help and machine-verifiable evidence delivery.",
      primaryCta: "Start building your package",
      secondaryCta: "See what is required",
      problemCards: [
        {
          icon: "01",
          title: "You need documentation",
          text:
            "High-risk AI systems need technical documentation, logging, risk management evidence, and a repeatable story for internal review.",
        },
        {
          icon: "02",
          title: "Auditors need proof",
          text:
            "Checklists are not enough. You need machine-readable evidence that your agent behaves the way the document claims.",
        },
        {
          icon: "03",
          title: "August 2, 2026 is fixed",
          text:
            "High-risk AI obligations under the EU AI Act take effect on August 2, 2026. Teams that wait too long will compress both documentation and testing.",
        },
      ],
      solutionTitle: "How EU AI Act Evidence Builder works",
      steps: [
        "Fill your AI system profile. We map it to the most relevant documentation sections.",
        "Download pre-filled documentation templates in a print-ready format.",
        "Generate machine-verifiable evidence with Agent QA Toolkit and attach it to your package.",
      ],
    },
    how: {
      title: "How EU AI Act Evidence Builder works",
      description:
        "See the pipeline from AI system profile to machine-verifiable evidence pack and Annex IV-ready documentation references.",
      headline: "From AI system profile to evidence-backed documentation",
      intro:
        "The site is not a generic compliance checklist. It is a documentation workflow for teams that either want a self-serve OSS path or a paid setup-and-delivery path for technical proof.",
    },
    pricing: {
      title: "EU AI Act pricing: OSS self-serve, Launch Pack, and monthly support",
      description:
        "Free OSS self-serve, one-time Launch Pack, and monthly support plans for EU AI Act technical evidence.",
      headline: "Free OSS self-serve. Paid plans add setup and supported-agent support.",
      lead:
        "Use the open-source repo for self-serve deployments at no charge. Paid plans cover one-time setup or ongoing support for a defined number of supported agents.",
      subscriptionsLabel: "Monthly support",
      oneTimeLabel: "One-time setup",
      oneTimeTitle: "Need help launching one AI system before you commit to monthly support?",
      oneTimeBody:
        "The Launch Pack is a white-glove setup for one AI system. We help configure the toolkit, produce the first serious package, and leave you with a self-hosted handoff bundle.",
      faq: [
        {
          q: "Do I need to share my AI model or data?",
          a: "No. The core evidence workflow is self-hosted. Your runs stay in your environment.",
        },
        {
          q: "What is the difference between Free OSS and the Launch Pack?",
          a: "Free OSS is self-serve: you use the builder, GitHub repo, docs, and demo proof on your own. The Launch Pack adds setup help and first-package delivery for one AI system.",
        },
        {
          q: "What is a supported agent in the monthly plans?",
          a: "A supported agent is an agent that sits inside the paid support scope. Monthly plans cover ongoing help, updates, and recurring guidance for that number of agents.",
        },
        {
          q: "Do monthly plans include done-for-you setup for every new agent?",
          a: "No. Done-for-you initial setup is sold via the Launch Pack or Enterprise implementation. Monthly plans cover support after onboarding.",
        },
        {
          q: "Is there an early-bird offer?",
          a: "Yes. The Launch Pack has a 40% early-bird discount through August 1, 2026.",
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
        "Free EU AI Act templates for Article 9 risk management, Article 12 logging, Article 14 oversight, Article 15 robustness, and Annex IV technical documentation.",
      headline: "Documentation templates for high-intent EU AI Act work",
      intro:
        "Each template page explains the requirement, shows what evidence looks like, and links to the live proof surface.",
    },
    docs: {
      title: "Technical docs and proof surface",
      description:
        "Open source docs, operator runbooks, product matrix, and live demo evidence for the EU AI Act Evidence Builder surface.",
      headline: "Technical docs and proof surface",
    },
    about: {
      title: "About EU AI Evidence Builder",
      description:
        "Why the site exists, what is open source, and how the Builder relates to Agent QA Toolkit.",
      headline: "Built as a documentation funnel, not a generic compliance portal",
    },
    contact: {
      title: "Contact the team",
      description:
        "Apply for a pilot, review the proof surface, or open the open-source repository for the EU AI Evidence Builder.",
      headline: "Choose the fastest path to a serious pilot",
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
      technical: "Technik",
      templates: "Vorlagen",
      pricing: "Preise",
      docs: "Docs",
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
      trustLine: "Self-hosted · Keine Daten verlassen Ihre Umgebung · Open-Source-Core",
      pilotCta: "Pilot beantragen",
      liveDemos: "Live-Demos",
      proofLabel: "Proof-Hub",
      docsLabel: "Open-Source-Dokumentation",
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
        "Kostenlose EU KI-Verordnung Vorlagen für Artikel 9, 12, 14, 15. Maschinenlesbare Nachweise für die Konformitätsbewertung. Frist: August 2026.",
      keywords:
        "KI-Verordnung Compliance, EU KI-Verordnung Dokumentation, KI-Verordnung August 2026, KI Konformitätsbewertung Vorlage, Hochrisiko KI System Nachweis",
      heroTitle:
        "Ihr KI-System benötigt EU-KI-Verordnung Nachweise bis zum 2. August 2026. Wir helfen Ihnen, diese strukturiert aufzubauen.",
      heroText:
        "Kostenlose Dokumentationsvorlagen für Artikel 9, 12, 14 und 15. Maschinenlesbare technische Nachweise werden über den Evidence-Workflow ergänzt.",
      primaryCta: "Dokumentation starten",
      secondaryCta: "Anforderungen ansehen",
      problemCards: [
        {
          icon: "01",
          title: "Dokumentation fehlt oft zuerst",
          text:
            "Viele Teams haben einzelne Notizen, aber keine belastbare technische Dokumentation für Konformitätsbewertung und interne Freigaben.",
        },
        {
          icon: "02",
          title: "Prüfer erwarten Nachweise",
          text:
            "Eine reine Checkliste überzeugt nicht. Sie brauchen einen nachvollziehbaren technischen Nachweis mit konkreten Artefakten.",
        },
        {
          icon: "03",
          title: "2. August 2026 ist nah",
          text:
            "Wer erst kurz vor dem Stichtag anfängt, muss Dokumentation, Tests und interne Review-Prozesse gleichzeitig aufbauen.",
        },
      ],
      solutionTitle: "So funktioniert der Builder",
      steps: [
        "Profil Ihres KI-Systems erfassen.",
        "Vorlagen für Dokumentation und Freigabe herunterladen.",
        "Maschinenlesbare Nachweise mit Agent QA Toolkit erzeugen und anhängen.",
      ],
    },
    how: {
      title: "So funktioniert der EU AI Evidence Builder",
      description:
        "Vom Systemprofil zur technischen Dokumentation mit maschinenlesbaren Nachweisen.",
      headline: "Von Systemprofilen zu belastbaren Nachweisen",
      intro:
        "Der Builder verbindet Dokumentationsvorlagen mit einem technischen Evidence-Layer, entweder self-serve ueber OSS oder als bezahltes Setup.",
    },
    pricing: {
      title: "Preise für EU AI Act Nachweise",
      description:
        "Kostenloser OSS-Self-Serve-Zugang, Launch Pack und monatliche Support-Plaene fuer EU AI Act Nachweise.",
      headline: "Kostenloses OSS self-serve. Bezahlte Plaene bringen Setup und Support fuer betreute Agenten.",
      lead:
        "Das Open-Source-Repo kann kostenlos self-serve genutzt werden. Bezahlte Plaene decken einmaliges Setup oder laufenden Support fuer eine definierte Zahl betreuter Agenten ab.",
      subscriptionsLabel: "Monatlicher Support",
      oneTimeLabel: "Einmaliges Setup",
      oneTimeTitle: "Brauchen Sie Hilfe beim Start eines KI-Systems, bevor Sie monatlichen Support buchen?",
      oneTimeBody:
        "Das Launch Pack ist ein White-Glove-Setup fuer ein KI-System. Wir helfen bei der Konfiguration, erzeugen das erste belastbare Paket und uebergeben ein self-hosted Handoff-Bundle.",
      faq: [
        {
          q: "Müssen Modell oder Daten geteilt werden?",
          a: "Nein. Die technische Nachweiserzeugung bleibt self-hosted.",
        },
        {
          q: "Was ist der Unterschied zwischen Free OSS und dem Launch Pack?",
          a: "Free OSS ist Self-Serve: Builder, GitHub-Repo, Docs und Demo-Proof nutzen Sie selbst. Das Launch Pack bringt Setup-Hilfe und die erste Paket-Lieferung fuer ein KI-System dazu.",
        },
        {
          q: "Was ist ein betreuter Agent im monatlichen Support?",
          a: "Ein betreuter Agent liegt innerhalb des bezahlten Support-Scopes. Monatliche Plaene decken laufende Hilfe, Updates und Guidance fuer diese Agenten ab.",
        },
        {
          q: "Ist in den monatlichen Plaenen das komplette Setup fuer jeden neuen Agenten enthalten?",
          a: "Nein. Das initiale Done-for-you-Setup verkaufen wir ueber Launch Pack oder Enterprise-Implementierung. Die monatlichen Plaene decken Support nach dem Onboarding ab.",
        },
        {
          q: "Gibt es ein Early-Bird-Angebot?",
          a: "Ja. Das Launch Pack hat bis zum 1. August 2026 einen Early-Bird-Rabatt von 40%.",
        },
        {
          q: "Ersetzt das rechtliche Beratung?",
          a: "Nein. Es geht um technische Nachweise und Dokumentationsstruktur.",
        },
      ],
    },
    builder: {
      title: "EU-KI-Verordnung Builder",
      description:
        "Mehrsprachiger Builder für Risiko-Screening, Dokumentationsvorlagen und technische Nachweise.",
      headline: "Bauen Sie Ihr Dokumentationspaket auf",
      intro:
        "Texteingaben bleiben frei. Für Nachweise verlinkt der Builder direkt in den Evidence-Workflow.",
    },
    templates: {
      title: "EU-KI-Verordnung Vorlagen",
      description:
        "Vorlagen für Artikel 9 und Annex IV mit direktem Zugang zu maschinenlesbaren Nachweisen.",
      headline: "Vorlagen mit klarem Bezug zu echten Nachweisen",
      intro:
        "Für den DACH-Launch priorisieren wir Artikel 9 und Annex IV, weil dort der größte Umsetzungsdruck liegt.",
    },
    docs: {
      title: "Technische Dokumentation und Proof-Hub",
      description:
        "Open-Source-Dokumentation, Live-Demos und Produkt-Matrix für den Evidence-Workflow.",
      headline: "Proof-Hub und technische Dokumentation",
    },
    about: {
      title: "Über den Builder",
      description:
        "Warum der Builder existiert und wie er mit Agent QA Toolkit zusammenhängt.",
      headline: "Ein fokussierter Funnel für Dokumentation und Nachweise",
    },
    contact: {
      title: "Kontakt",
      description:
        "Pilot anfragen, Live-Demo prüfen oder direkt in das Open-Source-Repository einsteigen.",
      headline: "Pilot oder technische Prüfung starten",
    },
    legalTitles: {
      privacy: "Datenschutz",
      terms: "Nutzungsbedingungen",
      disclaimer: "Hinweis",
      cookies: "Cookie-Einstellungen",
    },
  },
  fr: {
    code: "fr",
    name: "Français",
    htmlLang: "fr",
    nav: {
      how: "Fonctionnement",
      technical: "Technique",
      templates: "Modeles",
      pricing: "Tarifs",
      docs: "Docs",
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
      trustLine: "Self-hosted · Vos donnees restent dans votre environnement · Open source core",
      pilotCta: "Demander un pilote",
      liveDemos: "Demos live",
      proofLabel: "Proof hub",
      docsLabel: "Documentation open source",
      yes: "Oui",
      no: "Non",
      startFree: "Commencer",
      viewPricing: "Voir les tarifs",
      viewProof: "Voir les preuves live",
      bookCall: "Verifier le pilote",
    },
    landing: {
      title: "Documentation AI Act Europe | Modeles gratuits et preuves techniques",
      description:
        "Modelez votre dossier EU AI Act et reliez-le a des preuves techniques verifiables pour les articles 9, 12, 14 et 15.",
      keywords:
        "reglement europeen IA conformite, IA acte europeen documentation, evaluation de conformite IA Europe, IA haut risque aout 2026",
      heroTitle:
        "Votre systeme d'IA doit etre pret pour le reglement europeen sur l'IA avant le 2 aout 2026. Construisez votre dossier de preuves rapidement.",
      heroText:
        "Modeles gratuits pour les articles 9, 12, 14 et 15. Les preuves techniques verifiables se branchent ensuite au dossier.",
      primaryCta: "Commencer le dossier",
      secondaryCta: "Voir les exigences",
      problemCards: [
        {
          icon: "01",
          title: "La documentation manque souvent",
          text:
            "Les equipes ont des notes, mais rarement un dossier coherent pour les revues internes et la conformite.",
        },
        {
          icon: "02",
          title: "Il faut des preuves",
          text:
            "Les checklists ne suffisent pas. Il faut des traces et des artefacts lisibles par machine.",
        },
        {
          icon: "03",
          title: "Le delai est proche",
          text:
            "Le 2 aout 2026 approche. Les equipes doivent lancer le travail documentaire et technique maintenant.",
        },
      ],
      solutionTitle: "Comment fonctionne le Builder",
      steps: [
        "Decrivez votre systeme d'IA.",
        "Recuperez des modeles de documentation pre-remplis.",
        "Ajoutez des preuves techniques verifiables via Agent QA Toolkit.",
      ],
    },
    how: {
      title: "Comment fonctionne le EU AI Evidence Builder",
      description:
        "Du profil systeme aux preuves techniques reliees a la documentation.",
      headline: "Un pipeline de documentation et de preuve",
      intro:
        "Le Builder structure le dossier puis connecte les sections critiques a de vraies preuves techniques, soit en self-serve OSS, soit via une offre payante de setup.",
    },
    pricing: {
      title: "Tarifs pour les preuves EU AI Act",
      description:
        "Acces OSS gratuit en self-serve, Launch Pack et offres de support mensuel pour les preuves EU AI Act.",
      headline: "OSS gratuit en self-serve. Les offres payantes ajoutent setup et support pour des agents suivis.",
      lead:
        "Le depot open source peut etre utilise gratuitement en self-serve. Les offres payantes couvrent soit un setup ponctuel, soit un support continu pour un nombre defini d'agents suivis.",
      subscriptionsLabel: "Support mensuel",
      oneTimeLabel: "Setup ponctuel",
      oneTimeTitle: "Besoin d'aide pour lancer un systeme d'IA avant un engagement mensuel ?",
      oneTimeBody:
        "Le Launch Pack est une mise en place white-glove pour un seul systeme d'IA. Nous aidons a configurer le toolkit, produisons le premier package serieux et laissons un bundle self-hosted exploitable.",
      faq: [
        {
          q: "Faut-il partager les donnees ou le modele ?",
          a: "Non. Le coeur du workflow reste self-hosted.",
        },
        {
          q: "Quelle est la difference entre Free OSS et le Launch Pack ?",
          a: "Free OSS est self-serve : vous utilisez seul le builder, le depot GitHub, la documentation et les demos. Le Launch Pack ajoute l'aide au setup et la livraison du premier package pour un systeme d'IA.",
        },
        {
          q: "Qu'est-ce qu'un agent suivi dans les offres mensuelles ?",
          a: "Un agent suivi fait partie du perimetre du support payant. Les offres mensuelles couvrent l'aide continue, les updates et la guidance recurrente pour ce nombre d'agents.",
        },
        {
          q: "Les offres mensuelles incluent-elles un setup manuel pour chaque nouvel agent ?",
          a: "Non. Le setup initial done-for-you est vendu via le Launch Pack ou une implementation Enterprise. Les offres mensuelles couvrent le support apres onboarding.",
        },
        {
          q: "Existe-t-il une offre early-bird ?",
          a: "Oui. Le Launch Pack beneficie d'une reduction early-bird de 40% jusqu'au 1 aout 2026.",
        },
        {
          q: "Cela remplace-t-il un conseil juridique ?",
          a: "Non. Le Builder genere un cadre documentaire et des preuves techniques.",
        },
      ],
    },
    builder: {
      title: "Builder EU AI Act",
      description:
        "Wizard pas a pas pour le profil systeme, le screening de risque et le package documentaire.",
      headline: "Construisez votre package documentaire",
      intro:
        "Le Builder est gratuit pour la structure. Les preuves techniques sont branchees la ou elles sont necessaires.",
    },
    templates: {
      title: "Modeles de documentation AI Act",
      description:
        "Modeles pour l'article 9 et l'Annexe IV avec liens vers les preuves techniques live.",
      headline: "Modeles utiles pour les equipes qui doivent agir vite",
      intro:
        "Pour le lancement francophone, les priorites sont l'article 9 et l'Annexe IV.",
    },
    docs: {
      title: "Documentation technique et proof hub",
      description:
        "Demos live, matrice produit et documentation open source pour la couche de preuve.",
      headline: "Documentation technique et demos live",
    },
    about: {
      title: "A propos du Builder",
      description:
        "Pourquoi ce produit existe et comment il s'articule avec Agent QA Toolkit.",
      headline: "Un produit d'acquisition, pas un portail GRC generique",
    },
    contact: {
      title: "Contact",
      description:
        "Demandez un pilote, ouvrez les demos live ou consultez le depot open source.",
      headline: "Choisissez le chemin le plus court vers un pilote serieux",
    },
    legalTitles: {
      privacy: "Confidentialite",
      terms: "Conditions",
      disclaimer: "Avertissement",
      cookies: "Parametres des cookies",
    },
  },
};

const TECHNICAL_SHARED = {
  workflowSteps: [
    ["Scope freeze", "Capture the system boundary, deployment context, owners, and the specific change under review in `system-scope.json`."],
    ["Quality contract", "Make pass, require_approval, and block rules explicit in `quality-contract.json` before any evidence is collected."],
    ["Case suite", "Build a quality-grade `cases.json` that reflects critical paths, negative cases, and risky actions."],
    ["Adapter depth", "Make the agent callable through `/run-case` with enough telemetry for the chosen quality bar."],
    ["Comparable runs", "Produce baseline and new run inputs that are actually comparable, not just mechanically different."],
    ["Package and verify", "Generate `compare-report.json`, `report.html`, `manifest.json`, and a portable `_source_inputs/` snapshot."],
    ["EU dossier", "If needed, add clause coverage, Annex IV structure, Article 13 instructions scaffold, Article 9 risk register scaffold, Article 17 QMS-lite scaffold, Article 72 monitoring-plan scaffold, oversight outputs, and post-market monitoring exports."],
    ["Human review", "Scaffold `review/review-decision.json` and `review/handoff-note.md`, then complete narrative, residual risk notes, release decision, legal escalation, and sync the recurring corrective-action register. For EU bundles, also complete the Article 13/17/72 owner-completion loop."],
  ],
  artifactRows: [
    ["Stage 0", "ops/intake/<profile>/system-scope.json", "Intake + human", "System, change, owners, and deployment context are explicit."],
    ["Stage 1", "ops/intake/<profile>/quality-contract.json", "Intake + human", "Pass, approval, and block logic are concrete and reviewable."],
    ["Stage 2", "cases.json + cases-coverage.json", "Human + validator", "Case ids are stable; the reviewed suite passes the contract-coverage gate and persists coverage details."],
    ["Stage 3", "adapter config / endpoint + adapter-capability.json", "Developer + onboarding gate", "Canary returns valid `/run-case` responses with required telemetry depth and writes a durable adapter capability profile."],
    ["Stage 4", "runs/baseline/, runs/new/, and run-fingerprint.json", "Runner + comparability gate", "Both run dirs contain valid `run.json`, matching case outputs, and a durable run fingerprint that records comparability plus environment clues."],
    ["Stage 5", "reports/<id>/ bundle", "Packager", "Evidence verify passes and the bundle is portable."],
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
    ["5-6", "Good self-serve or Team candidate: the team is operationally ready."],
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
    "`corrective-action-register.json` for recurring gap continuity across review cycles",
    "draft `cases/<profile>.intake-scaffold.json` as a human-reviewed starting point",
  ],
  reviewArtifacts: [
    "`review/review-decision.json` for the structured owner decision, residual-gap actions, and EU scaffold completion records",
    "`review/handoff-note.md` for the narrative handoff summary",
    "optional `review/intake/*` snapshot when the review is linked back to the intake contract, including continuity artifacts when available",
  ],
  reviewChecks: [
    "Decision status must not remain `pending`.",
    "No `TODO` placeholders may remain in the review record or handoff note.",
    "Every machine-derived residual gap must have an owner, a disposition, and a note.",
    "Recurring corrective-action continuity must stay coherent and is synced back into intake on successful review checks.",
    "EU bundles must complete the Article 13, Article 17, and Article 72 owner-completion loop before handoff is ready.",
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

const TECHNICAL_PAGE = {
  en: {
    title: "Technical operating model for AI evidence | EU AI Evidence Builder",
    description:
      "Professional technical view of the workflow: inputs, artifacts, readiness, re-evaluation triggers, and support scope.",
    eyebrow: "For technical teams",
    headline: "Professional operating model for evidence-backed AI agent reviews",
    intro:
      "This page is for platform leads, release engineers, product security, and compliance engineering teams that need the real workflow, exact inputs, and actual bundle outputs.",
    opsButton: "Open operational model",
    proofButton: "Open live evidence",
    docsButton: "Open OSS docs",
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
      "The toolkit is strongest on `prepared inputs -> verified technical evidence bundle`. Intake validation is automated, but scope judgment, quality policy, adapter depth, and final signoff remain human-owned.",
    artifactsTitle: "Artifacts and ready gates",
    artifactsLead: "These are the artifacts technical teams should expect to exist if the workflow is healthy.",
    reviewTitle: "Structured review handoff",
    reviewLead: "Stage 7 is still human-owned, but it is no longer an unstructured email or ticket comment.",
    reviewChecksTitle: "What the handoff gate enforces",
    readinessTitle: "Readiness self-assessment",
    readinessLead: "Use this before choosing self-serve, Launch Pack, or monthly support.",
    readinessScoreTitle: "How to read the score",
    maturityTitle: "Evidence maturity model",
    maturityLead: "This is the fastest way to explain where a team is now and what level the next engagement should target.",
    triggersTitle: "When evidence should be re-run",
    supportTitle: "What each engagement layer actually covers",
    failureTitle: "Common failure modes",
    landingTitle: "Need the technical operating model?",
    landingBody:
      "See the real workflow, artifacts, ready gates, re-run triggers, and support boundaries before you choose self-serve or a paid path.",
    landingButton: "Open technical view",
  },
  de: {
    title: "Technische Sicht auf den Evidence-Workflow | EU AI Evidence Builder",
    description:
      "Technische Sicht auf Workflow, Artefakte, Readiness, Re-Run-Trigger und Support-Scope.",
    eyebrow: "Fuer technische Teams",
    headline: "Technische Sicht: Workflow, Artefakte und Ready Gates",
    intro:
      "Diese Seite ist fuer Plattform-Teams, Release Engineering, Product Security und Compliance Engineering gedacht. Artefaktnamen bleiben bewusst nah am Code und an den echten Output-Dateien.",
    opsButton: "Operational Model öffnen",
    proofButton: "Live-Evidence öffnen",
    docsButton: "OSS-Docs öffnen",
    planningTitle: "Time to first evidence",
    planningNote: "Planungswerte, keine harten Lieferzusagen.",
    estimates: [
      ["Self-serve Erstsetup", "3-4 Wochen"],
      ["Launch Pack bis erstes verifiziertes Paket", "5 Arbeitstage"],
      ["Wiederkehrender Release nach Onboarding", "1-2 Tage"],
      ["Monatlicher Support", "Nur betreute Agenten"],
    ],
    workflowTitle: "Was technisch wirklich passiert",
    intakeTitle: "Strukturierte Intake-Schicht",
    intakeLead: "Den Upstream-Vertrag automatisieren, bevor Cases und Adapter-Arbeit starten.",
    intakeHumanTitle: "Was menschlich gefuehrt bleibt",
    boundaryTitle: "Automationsgrenze",
    boundaryBody:
      "Der Toolkit-Kern ist am staerksten bei `prepared inputs -> verified technical evidence bundle`. Intake-Validierung ist automatisiert, Scope-Urteil, Quality-Policy, Adapter-Tiefe und Signoff bleiben menschlich gefuehrt.",
    artifactsTitle: "Artefakte und Ready Gates",
    artifactsLead: "Diese Artefakte sollten existieren, wenn der Workflow technisch gesund ist.",
    reviewTitle: "Strukturierter Review-Handoff",
    reviewLead: "Stage 7 bleibt menschlich gefuehrt, ist aber nicht mehr nur eine unstrukturierte Mail oder Ticket-Notiz.",
    reviewChecksTitle: "Was der Handoff-Gate erzwingt",
    readinessTitle: "Readiness Self-Assessment",
    readinessLead: "Nutzen Sie diese Liste vor Self-Serve, Launch Pack oder monatlichem Support.",
    readinessScoreTitle: "So lesen Sie den Score",
    maturityTitle: "Evidence Maturity Model",
    maturityLead: "Damit laesst sich der aktuelle Reifegrad eines Teams sehr schnell einordnen.",
    triggersTitle: "Wann Evidence neu erzeugt werden sollte",
    supportTitle: "Was die einzelnen Engagement-Layer wirklich abdecken",
    failureTitle: "Haeufige Failure Modes",
    landingTitle: "Brauchen Sie die technische Betriebsansicht?",
    landingBody:
      "Oeffnen Sie den technischen View fuer Workflow, Artefakte, Ready Gates, Re-Run-Trigger und klare Support-Grenzen.",
    landingButton: "Technische Sicht öffnen",
  },
  fr: {
    title: "Vue technique du workflow de preuve | EU AI Evidence Builder",
    description:
      "Vue technique du workflow, des artefacts, de la readiness, des triggers de re-run et du scope de support.",
    eyebrow: "Pour les equipes techniques",
    headline: "Vue technique : workflow, artefacts et ready gates",
    intro:
      "Cette page vise les platform teams, le release engineering, la product security et la compliance engineering. Les noms d'artefacts restent proches du code et des vrais outputs.",
    opsButton: "Ouvrir l'operating model",
    proofButton: "Ouvrir la preuve live",
    docsButton: "Ouvrir les docs OSS",
    planningTitle: "Time to first evidence",
    planningNote: "Estimations de planification, pas garanties de livraison.",
    estimates: [
      ["Premier setup self-serve", "3-4 semaines"],
      ["Launch Pack vers premier package verifie", "5 jours ouvrables"],
      ["Release recurrent apres onboarding", "1-2 jours"],
      ["Support mensuel", "Agents suivis uniquement"],
    ],
    workflowTitle: "Ce qui se passe vraiment",
    intakeTitle: "Couche d'intake structuree",
    intakeLead: "Automatiser le contrat amont avant la creation des cas et le travail d'adapter.",
    intakeHumanTitle: "Ce qui reste humain",
    boundaryTitle: "Frontiere d'automatisation",
    boundaryBody:
      "Le toolkit est le plus fort sur `prepared inputs -> verified technical evidence bundle`. La validation d'intake est automatisee, mais le scope, la policy quality, la profondeur de l'adapter et le signoff final restent humains.",
    artifactsTitle: "Artefacts et ready gates",
    artifactsLead: "Voila les artefacts qu'une equipe technique devrait voir quand le workflow est sain.",
    reviewTitle: "Handoff review structure",
    reviewLead: "Le Stage 7 reste humain, mais ce n'est plus un simple email ou commentaire de ticket non structure.",
    reviewChecksTitle: "Ce que le gate de handoff impose",
    readinessTitle: "Readiness self-assessment",
    readinessLead: "Utilisez cette liste avant de choisir self-serve, Launch Pack ou support mensuel.",
    readinessScoreTitle: "Comment lire le score",
    maturityTitle: "Evidence maturity model",
    maturityLead: "C'est la facon la plus rapide de situer le niveau de maturite actuel d'une equipe.",
    triggersTitle: "Quand il faut re-generer l'evidence",
    supportTitle: "Ce que couvre vraiment chaque couche d'engagement",
    failureTitle: "Failure modes frequents",
    landingTitle: "Besoin de la vue technique complete ?",
    landingBody:
      "Ouvrez la surface technique pour voir le vrai workflow, les artefacts, les ready gates, les triggers de re-run et les limites du support.",
    landingButton: "Ouvrir la vue technique",
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
    eyebrow: "Stage Deep Dive",
    title: "1. cases.json",
    intro:
      "Hier entscheidet sich oft die Qualitaet des gesamten Evidence-Flows. Eine Case-Suite ist keine Prompt-Liste, sondern die maschinenlesbare Beschreibung des erwarteten Verhaltens.",
    goalTitle: "Ziel",
    goalBody:
      "Erwartetes Agent-Verhalten so formalisieren, dass spaeter Korrektheit, Eskalation und Failure nachvollziehbar geprueft werden koennen.",
    inputTitle: "Minimaler Input",
    inputBody:
      "Ein JSON-Array aus Cases. `id` ist verpflichtend. Qualitativ starke Cases enthalten meist auch `title`, `input.user`, optional `input.context`, `expected` und `metadata`.",
    prepTitle: "Wie vorbereiten",
    prepBody:
      "Reale operationale Szenarien abbilden: normal, Grenzfall, riskant, refusal, tool-using, mehrdeutig, retry-sensitiv und handoff-bezogen. Demo-Cases nicht als produktionsreif behandeln.",
    qualityTitle: "Woran man Qualitaet erkennt",
    qualityLead:
      "Starke Cases lassen `expected` nicht leer. Quality-Suiten brauchen konkrete Erwartungssignale statt generischer Prompts.",
    strongSignalsTitle: "Starke Erwartungssignale",
    strongSignals: [
      "`json_schema` fuer strukturkritische Outputs",
      "`tool_required` und `tool_sequence` fuer Tool-Korrektheit",
      "`must_include` und `must_not_include` fuer klare lexikale Regeln",
      "`action_required` und `evidence_required_for_actions` fuer riskante Aktionen",
      "`semantic.*` fuer konzeptuelle Textpruefung",
      "`assumption_state` fuer Decision-Legibility",
    ],
    metricsTitle: "Empfohlene Metrics fuer die Case-Suite",
    metricsLead: "Empfohlene Zielwerte fuer Quality-Kampagnen. Nicht alles wird heute schon hart im Code erzwungen.",
    metricsRows: [
      ["Spezifitaet", "% der Cases mit aussagekraeftigem `expected`", "Ziel: >= 70%"],
      ["Negative Coverage", "% der Cases mit Fail/Eskalation/Block", "Ziel: >= 30%"],
      ["Weak expected rate", "Cases mit schwachen oder leeren Erwartungen", "Unter Validator-Schwelle halten, oft <= 20%"],
      ["Semantic depth", "Text-Cases mit `expected.semantic.*`", "Mit wachsender Reife erhoehen"],
      ["Mindestumfang", "Faelle, bevor pass_rate fuer Steuerung sinnvoll wird", "Start bei >= 20"],
    ],
    readyTitle: "Ready Gate",
    readyItems: [
      "Datei parst fehlerfrei und ids sind stabil und eindeutig.",
      "Kritische Szenarien aus dem Quality Contract sind abgedeckt.",
      "Negative und riskante Cases existieren, nicht nur Happy Path.",
      "Der Intake-Completeness-Gate besteht auf der ueberarbeiteten Suite.",
      "Der Quality-Validator besteht unter dem gewaehlten Profil.",
      "Die Suite passt zur realen Tool- und Risikooberflaeche des Agenten.",
    ],
    failureTitle: "Haeufige Failure Modes",
    failureItems: [
      "Kritische Cases haben leeres `expected`, dadurch sieht das Bundle gruener aus als es ist.",
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
      ["Intake-Completeness-Gate", "scripts/evidence-intake-check-cases.mjs"],
      ["Quality-Validator", "scripts/validate-cases-quality.mjs"],
      ["Starke Referenzsuite", "cases/cases.json"],
      ["Schwaches Smoke/Infra-Beispiel", "cases/agents/cli-agent.json"],
    ],
  },
  fr: {
    eyebrow: "Deep dive de stage",
    title: "1. cases.json",
    intro:
      "C'est souvent le premier vrai goulot d'etranglement. Une suite de cas n'est pas une liste de prompts, mais l'expression lisible par machine du comportement attendu.",
    goalTitle: "Objectif",
    goalBody:
      "Formaliser le comportement attendu de l'agent pour que la correction, l'escalade et l'echec puissent etre verifiees ensuite dans le bundle.",
    inputTitle: "Entree minimale",
    inputBody:
      "Un tableau JSON de cas. `id` est obligatoire. Les cas de qualite incluent souvent `title`, `input.user`, `input.context` optionnel, `expected` et `metadata`.",
    prepTitle: "Comment le preparer",
    prepBody:
      "Construire des scenarios operationnels representatifs : normaux, limites, risques, refusal, tool-using, ambiguite, retries et handoffs. Ne pas traiter les cas de demo comme une suite de production.",
    qualityTitle: "Ce qui ressemble a de la qualite",
    qualityLead:
      "Un bon cas ne laisse pas `expected` vide. Une vraie suite quality utilise des signaux d'attente forts, pas seulement des prompts generiques.",
    strongSignalsTitle: "Signaux d'attente forts",
    strongSignals: [
      "`json_schema` pour les sorties sensibles a la structure",
      "`tool_required` et `tool_sequence` pour la correction des tools",
      "`must_include` et `must_not_include` pour les contraintes lexicales",
      "`action_required` et `evidence_required_for_actions` pour les actions risquees",
      "`semantic.*` pour l'evaluation conceptuelle du texte",
      "`assumption_state` pour la lisibilite des decisions",
    ],
    metricsTitle: "Metrics recommandees pour la suite",
    metricsLead: "Cibles de travail pour les campagnes quality. Tout n'est pas encore impose par le code.",
    metricsRows: [
      ["Specificite", "% de cas avec `expected` utile et non vide", "Cible : >= 70%"],
      ["Negative coverage", "% de cas devant echouer ou escalader", "Cible : >= 30%"],
      ["Weak expected rate", "Cas avec attentes faibles ou vides", "Rester sous le seuil du validator, souvent <= 20%"],
      ["Semantic depth", "Cas texte utilisant `expected.semantic.*`", "Augmenter avec la maturite"],
      ["Minimum count", "Nombre de cas avant qu'un pass_rate soit vraiment utile", "Commencer a >= 20"],
    ],
    readyTitle: "Ready gate",
    readyItems: [
      "Le fichier parse correctement et les ids sont stables et uniques.",
      "Les scenarios critiques du quality contract sont couverts.",
      "Il existe des cas negatifs et risques, pas seulement du happy path.",
      "Le gate de completeness intake passe sur la suite revue.",
      "Le validator quality passe avec le profil choisi.",
      "La suite reflete le vrai perimetre de tools et de risques de l'agent.",
    ],
    failureTitle: "Failure modes frequents",
    failureItems: [
      "Les cas critiques ont un `expected` vide, donc le bundle parait plus vert qu'il ne l'est.",
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
      ["Gate de completeness intake", "scripts/evidence-intake-check-cases.mjs"],
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
      en: ["Unlimited self-serve agents", "Builder + PDF templates", "GitHub repo + docs", "Live demos", "No setup help included"],
      de: ["Unbegrenzte Self-Serve-Agenten", "Builder + PDF-Vorlagen", "GitHub-Repo + Docs", "Live-Demos", "Keine Setup-Hilfe enthalten"],
      fr: ["Agents self-serve illimites", "Builder + modeles PDF", "Depot GitHub + docs", "Demos live", "Sans aide au setup"],
    },
    note: {
      en: "Use the OSS repo on your own. No commercial support scope is attached.",
      de: "Sie nutzen das OSS-Repo selbst. Kein kommerzieller Support-Scope ist enthalten.",
      fr: "Vous utilisez seul le depot OSS. Aucun perimetre de support commercial n'est inclus.",
    },
    cta: { en: "Open OSS Docs", de: "OSS-Docs öffnen", fr: "Ouvrir la doc OSS" },
    href: "docs",
  },
  {
    key: "team",
    name: { en: "TEAM", de: "TEAM", fr: "TEAM" },
    price: { en: "EUR299/month", de: "EUR299/Monat", fr: "EUR299/mois" },
    featured: true,
    items: {
      en: ["Up to 3 supported agents", "Unlimited runs", "CI integration", "Audit PDF export", "Recurring support", "Support after onboarding"],
      de: ["Bis zu 3 betreute Agenten", "Unbegrenzte Runs", "CI-Integration", "Audit-PDF-Export", "Laufender Support", "Support nach Onboarding"],
      fr: ["Jusqu'a 3 agents suivis", "Runs illimites", "Integration CI", "Export PDF d'audit", "Support recurrent", "Support apres onboarding"],
    },
    note: {
      en: "Each additional supported agent: +EUR120/month. Initial done-for-you setup sold separately.",
      de: "Jeder weitere betreute Agent: +EUR120/Monat. Initiales Done-for-you-Setup separat.",
      fr: "Chaque agent suivi supplementaire : +EUR120/mois. Le setup done-for-you initial est vendu a part.",
    },
    cta: { en: "Book Team Pilot", de: "Team-Pilot buchen", fr: "Demander un pilote Team" },
    href: "contact",
  },
  {
    key: "studio",
    name: { en: "STUDIO", de: "STUDIO", fr: "STUDIO" },
    price: { en: "EUR890/month", de: "EUR890/Monat", fr: "EUR890/mois" },
    featured: false,
    items: {
      en: ["Up to 10 supported agents", "Trend analysis", "Historical reporting", "Compliance dashboard", "Governance workflow support", "Priority support"],
      de: [
        "Bis zu 10 betreute Agenten",
        "Trendanalyse",
        "Historische Reports",
        "Compliance-Dashboard",
        "Gemeinsamer Governance-Workflow",
        "Priorisierter Support",
      ],
      fr: [
        "Jusqu'a 10 agents suivis",
        "Analyse de tendance",
        "Historique des reports",
        "Dashboard compliance",
        "Workflow de gouvernance partage",
        "Support prioritaire",
      ],
    },
    note: {
      en: "Each additional supported agent: +EUR120/month. Initial done-for-you setup sold separately.",
      de: "Jeder weitere betreute Agent: +EUR120/Monat. Initiales Done-for-you-Setup separat.",
      fr: "Chaque agent suivi supplementaire : +EUR120/mois. Le setup done-for-you initial est vendu a part.",
    },
    cta: { en: "Talk to Sales", de: "Sales kontaktieren", fr: "Parler a l'equipe commerciale" },
    href: "contact",
  },
  {
    key: "enterprise",
    name: { en: "ENTERPRISE", de: "ENTERPRISE", fr: "ENTERPRISE" },
    price: { en: "From EUR3,500/month", de: "Ab EUR3.500/Monat", fr: "A partir de EUR3.500/mois" },
    featured: false,
    items: {
      en: ["Custom supported-agent scope", "On-premise deployment", "Dedicated implementation", "Custom evidence rules", "Notified-body export support", "SLA"],
      de: [
        "Custom Scope fuer betreute Agenten",
        "On-Premise-Deployment",
        "Dedizierte Implementierung",
        "Custom Evidence Rules",
        "Unterstuetzung fuer Notified-Body-Exports",
        "SLA",
      ],
      fr: [
        "Perimetre sur mesure pour agents suivis",
        "Deploiement on-premise",
        "Implementation dediee",
        "Regles de preuve sur mesure",
        "Support export notified body",
        "SLA",
      ],
    },
    cta: { en: "Contact Us", de: "Kontakt aufnehmen", fr: "Nous contacter" },
    href: "contact",
  },
  {
    key: "launch-pack",
    name: { en: "LAUNCH PACK", de: "LAUNCH PACK", fr: "LAUNCH PACK" },
    price: { en: "EUR499 one-time", de: "EUR499 einmalig", fr: "EUR499 paiement unique" },
    featured: false,
    items: {
      en: ["1 supported agent", "White-glove setup", "1 serious evidence package", "PDF + JSON export", "Portable handoff bundle"],
      de: ["1 betreuter Agent", "White-Glove-Setup", "1 belastbares Evidence-Paket", "PDF- und JSON-Export", "Portables Handoff-Bundle"],
      fr: ["1 agent suivi", "Setup white-glove", "1 package de preuve serieux", "Export PDF + JSON", "Bundle portable de handoff"],
    },
    note: {
      en: "Early-bird: 40% off through August 1, 2026.",
      de: "Early-Bird: 40% Rabatt bis zum 1. August 2026.",
      fr: "Early-bird : 40% de reduction jusqu'au 1 aout 2026.",
    },
    cta: { en: "Book Launch Pack", de: "Launch Pack buchen", fr: "Reserver le Launch Pack" },
    href: "contact",
  },
];

const PRICING_PREVIEW_ORDER = ["starter", "launch-pack", "team"];
const SUBSCRIPTION_PLAN_ORDER = ["starter", "team", "studio", "enterprise"];

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
        "Article 9 requires a documented risk management system that is planned, maintained, and updated throughout the lifecycle of a high-risk AI system. Teams usually understand the policy intent. The hard part is proving that the process is actually tested and not just described.",
      de:
        "Artikel 9 verlangt ein dokumentiertes Risikomanagement ueber den gesamten Lebenszyklus des Systems. Die Herausforderung liegt selten im Text selbst, sondern im belastbaren Nachweis.",
      fr:
        "L'article 9 exige un systeme de gestion des risques documente tout au long du cycle de vie. Le vrai sujet n'est pas seulement le texte, mais la preuve que ce systeme est teste.",
    },
    requirement: {
      en:
        "A strong Article 9 section normally explains how risks are identified, how mitigation measures are selected, how residual risk is reviewed, and how the process is repeated after changes to model, prompt, tools, or deployment. If you only describe the controls but cannot show recent testing activity, reviewers will quickly see the gap.",
      de:
        "Ein guter Artikel-9-Abschnitt erklaert Risikoidentifikation, Massnahmen, Rest-Risiko und den Wiederholungsprozess nach Modell-, Prompt- oder Tool-Aenderungen.",
      fr:
        "Un bon chapitre Article 9 explique l'identification des risques, les mesures, le risque residuel et la repetition des tests apres chaque changement du systeme.",
    },
    sections: {
      en: [
        ["Risk inventory", "List concrete harms, failure modes, and affected users.", "Per-case risk level, gate recommendation, scanner results."],
        ["Mitigation controls", "Explain which controls reduce the highest risks.", "Security findings, human-approval path, blocked actions."],
        ["Validation cadence", "Show how often the risk process is tested.", "Recurring evidence packs and monitoring exports."],
        ["Residual risk review", "Capture what remains unresolved and who signs off.", "Release review and oversight summary."],
      ],
      de: [
        ["Risikoinventar", "Konkrete Risiken und betroffene Gruppen erfassen.", "Case-basierte Risikostufen und Gate-Empfehlungen."],
        ["Massnahmen", "Kontrollen gegen die hoechsten Risiken beschreiben.", "Security-Signale und Freigabewege."],
        ["Validierungszyklus", "Wie oft wird getestet?", "Wiederkehrende Evidence Packs."],
        ["Rest-Risiko", "Was bleibt offen und wer gibt frei?", "Release Review und Oversight Summary."],
      ],
      fr: [
        ["Inventaire des risques", "Lister les risques concrets et les personnes concernees.", "Niveaux de risque par cas et recommandations de gate."],
        ["Mesures", "Documenter les controles utilises.", "Signaux de securite et approbations humaines."],
        ["Frequence de validation", "Montrer a quelle frequence le processus est teste.", "Evidence packs recurrents."],
        ["Risque residuel", "Qui accepte le risque restant ?", "Release review et oversight summary."],
      ],
    },
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
    title: { en: "EU AI Act Article 12 - Logging and Traceability Template" },
    description: { en: "Template for logging, trace anchors, structured event records, and audit trail expectations under Article 12." },
    intro: {
      en:
        "Article 12 is where many teams discover that they have logs, but not traceability. A strong section explains what events are recorded, what identifiers can link them together, how long records are kept, and how an operator can reconstruct a decision path when something goes wrong.",
    },
    requirement: {
      en:
        "For agent systems, this means more than generic app logs. You need a record of tool actions, final outputs, timestamps, trace anchors, and the evidence path that connects a document claim to a concrete run.",
    },
    sections: {
      en: [
        ["Event coverage", "Which events are captured and retained?", "Structured events, tool calls, tool results, replay diffs."],
        ["Traceability", "How can a reviewer correlate logs and reports?", "Trace anchors, manifest references, report ids."],
        ["Retention", "How long is evidence kept and where?", "Portable report directory plus policy text."],
        ["Review path", "How do operators audit a run?", "HTML report, compare-report JSON, raw assets."],
      ],
    },
    faq: {
      en: [
        ["Do console logs count as Article 12 evidence?", "Not by themselves. You need structured, reviewable records."],
        ["Why are trace anchors useful?", "They connect reports, raw artifacts, and external tracing systems."],
        ["Can this be self-hosted?", "Yes. The proof surface is designed to stay in your environment."],
      ],
    },
  },
  "article-14": {
    title: { en: "EU AI Act Article 14 - Human Oversight Template" },
    description: { en: "Template for approval paths, escalation criteria, and oversight controls required for Article 14." },
    intro: {
      en:
        "Article 14 asks whether humans can supervise, intervene, and stop the system when needed. For agent workflows, the question is practical: when do you require approval, when do you block actions, and where is that decision stored?",
    },
    requirement: {
      en:
        "Good documentation makes the review path legible. It explains who reviews risky cases, what threshold triggers escalation, and what records are produced when a run is approved or rejected.",
    },
    sections: {
      en: [
        ["Escalation criteria", "What triggers approval or block?", "Gate recommendation and scanner severity."],
        ["Reviewer role", "Who approves and on what basis?", "Oversight summary and release review."],
        ["Operator controls", "What can a human stop or override?", "Manual approval flow and documented controls."],
        ["Review evidence", "What record remains after a review?", "Approval queue and governance outputs."],
      ],
    },
    faq: {
      en: [
        ["Is a manual review checkbox enough?", "No. Review must be tied to real criteria and recorded outcomes."],
        ["What does a good oversight trail show?", "Why a case was escalated, who reviewed it, and what happened next."],
        ["Does this help with internal governance too?", "Yes. The same outputs help security and release review."],
      ],
    },
  },
  "article-15": {
    title: { en: "EU AI Act Article 15 - Accuracy and Robustness Template" },
    description: { en: "Template for pass rates, flakiness, robustness checks, and technical evidence under Article 15." },
    intro: {
      en:
        "Article 15 is where performance claims need numbers. Teams often know their target quality bar, but they struggle to connect those claims to recurring evidence across changes.",
    },
    requirement: {
      en:
        "The documentation should state what quality signals matter for the system, how failures are handled, and what recurring run history shows about stability and robustness.",
    },
    sections: {
      en: [
        ["Accuracy signals", "What metrics matter to the task?", "Pass rate, admissibility KPI, per-case outcomes."],
        ["Robustness checks", "How are failures explored?", "Matrix cases, degraded execution handling, regression evidence."],
        ["Repeatability", "Can the team compare versions over time?", "Baseline vs new report and trend history."],
        ["Release threshold", "When is the model not ready?", "Gate decisions and execution-quality status."],
      ],
    },
    faq: {
      en: [
        ["Can I use only one benchmark?", "That is rarely enough for a defensible Article 15 section."],
        ["Why does flakiness matter?", "Because unstable behavior weakens any quality claim."],
        ["What should reviewers actually see?", "A repeatable report, not only a narrative description."],
      ],
    },
  },
  "technical-doc": {
    title: {
      en: "EU AI Act Annex IV - Technical Documentation Template",
      de: "EU KI-Verordnung Annex IV - Vorlage fuer technische Dokumentation",
      fr: "Annexe IV de l'AI Act - Modele de documentation technique",
    },
    description: {
      en: "Annex IV template with evidence references, system identity, intended purpose, and technical documentation structure.",
      de: "Vorlage fuer technische Dokumentation nach Annex IV mit Evidence-Referenzen.",
      fr: "Modele Annexe IV avec references vers les preuves techniques.",
    },
    intro: {
      en:
        "Annex IV is the place where the documentation package becomes coherent. It is where your system identity, intended purpose, architecture, logging story, risk controls, and supporting evidence need to line up.",
      de:
        "Annex IV ist der Ort, an dem das gesamte Paket konsistent werden muss: Systemidentitaet, Zweck, Architektur, Logging und Evidence muessen zusammenpassen.",
      fr:
        "L'Annexe IV est le point de convergence du dossier: identite du systeme, finalite, architecture, logging et preuves doivent etre coherents.",
    },
    requirement: {
      en:
        "A strong template does not try to replace full legal review. It provides the technical backbone: what the system is, where it runs, what evidence exists, and what still requires human completion.",
      de:
        "Eine starke Vorlage ersetzt keine juristische Bewertung. Sie liefert das technische Rueckgrat.",
      fr:
        "Un bon modele ne remplace pas la revue juridique. Il fournit la colonne vertebrale technique.",
    },
    sections: {
      en: [
        ["System identity", "Name, version, operator assumptions, and environment.", "Report metadata and environment block."],
        ["Intended purpose", "Who the system serves and in what context.", "Builder export plus human-authored narrative."],
        ["Risk controls", "Controls, mitigations, and residual gaps.", "Article 9 coverage and security findings."],
        ["Traceability", "How events and artifacts are preserved.", "Article 12 evidence and manifest references."],
        ["Oversight and release", "Who intervenes and how release is reviewed.", "Oversight summary and release review."],
      ],
      de: [
        ["Systemidentitaet", "Name, Version und Einsatzkontext.", "Report-Metadaten und Environment."],
        ["Zweck", "Wofuer wird das System genutzt?", "Builder-Export plus ergaenzender Text."],
        ["Risikokontrollen", "Kontrollen und Rest-Risiken.", "Artikel-9-Evidence und Scanner-Ergebnisse."],
        ["Traceability", "Wie bleiben Artefakte nachvollziehbar?", "Manifest und Logging-Evidence."],
        ["Oversight", "Wie wird freigegeben?", "Oversight Summary und Release Review."],
      ],
      fr: [
        ["Identite du systeme", "Nom, version et contexte.", "Metadonnees du report et environnement."],
        ["Finalite", "Usage et contexte du systeme.", "Export Builder plus texte humain."],
        ["Controles de risque", "Mesures et risques residuels.", "Evidence Article 9 et scans."],
        ["Traceabilite", "Comment conserver les artefacts.", "Manifest et preuves de logging."],
        ["Supervision", "Comment la revue est effectuee.", "Oversight summary et release review."],
      ],
    },
    faq: {
      en: [
        ["Can Annex IV be filled from evidence alone?", "No. It needs human-authored sections too."],
        ["What is the value of automation here?", "Automation reduces the gap between technical runs and documentation references."],
        ["Should counsel still review the final package?", "Yes. Technical structure and legal sufficiency are different tasks."],
      ],
      de: [
        ["Kann Annex IV nur aus Evidence entstehen?", "Nein. Menschlich gepflegte Abschnitte bleiben notwendig."],
        ["Worin liegt der Nutzen der Automatisierung?", "Sie verknuepft technische Runs direkt mit Dokumentationsreferenzen."],
        ["Braucht man trotzdem juristische Pruefung?", "Ja."],
      ],
      fr: [
        ["Peut-on remplir l'Annexe IV uniquement avec les preuves ?", "Non. Certaines sections doivent etre redigees par des humains."],
        ["Quel est l'interet de l'automatisation ?", "Elle relie directement les runs techniques et le dossier."],
        ["Une revue juridique reste-t-elle necessaire ?", "Oui."],
      ],
    },
  },
};

const BLOG_CONTENT = {
  "eu-ai-act-deadline": {
    title: "EU AI Act August 2026 Deadline: The complete checklist for AI teams",
    description:
      "What happens on August 2, 2026, which AI systems are affected, and what technical evidence teams should start collecting now.",
    sections: [
      {
        heading: "What actually happens on August 2, 2026",
        body:
          "For many AI teams the deadline feels abstract until they map it onto release work. August 2, 2026 is not only a legal milestone. It is an operating milestone. By then, teams shipping high-risk systems into the European market need a documentation story that can survive internal review, customer diligence, and formal conformity preparation. The teams that move fastest are not the ones that write the best checklist. They are the ones that stop separating documentation from technical evidence.",
      },
      {
        heading: "Does your system likely qualify as high-risk",
        body:
          "If your workflow touches recruitment, education, access to finance, healthcare support, or other decisions that materially affect people, you should assume that a high-risk screening is worth doing now. Teams often waste time searching for certainty before they start building the package. A better pattern is to run a preliminary screening, draft the package structure, and then validate the scope with legal counsel.",
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
          "Weeks 1 to 2: run a screening and define the system boundary. Weeks 3 to 4: draft Article 9 and Annex IV structure. Weeks 5 to 8: run the first evidence loop, create recurring test cases, and link the report outputs to documentation sections. Weeks 9 to 10: tighten review, oversight, and monitoring. Weeks 11 to 12: hand the package to legal and compliance for final interpretation and gap review. This sequence is much healthier than trying to build everything in the final month.",
      },
    ],
  },
  "high-risk-ai-list": {
    title: "Is your AI system high-risk? The Annex III categories teams should screen first",
    description:
      "A practical list of Annex III-style categories and how teams should use them as a screening framework, not as a replacement for legal review.",
    sections: [
      {
        heading: "Use Annex III as a screening lens, not as a final verdict",
        body:
          "Teams usually need a fast way to decide whether documentation work should start now. Annex III-style categories give you that screening lens. Recruitment and worker management, educational access and assessment, access to essential services such as credit, and parts of healthcare support are common early flags.",
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
  },
  "evidence-pack-guide": {
    title: "What is an EU AI Act evidence pack and how do you build one",
    description:
      "A practical guide to evidence packs for Article 9, Article 12, Article 14, Article 15, and Annex IV technical documentation.",
    sections: [
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
          "The strongest path is to use the same evaluation workflow for release review and documentation support. When the same runs feed both technical review and compliance references, the package stays honest. That is why the product story should remain proof-first rather than template-only.",
      },
    ],
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
            <span class="brand-subtitle">Documentation builder for Agent QA Toolkit</span>
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
          <label class="sr-only" for="locale-switcher">Language</label>
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
        <p class="muted">This site uses only essential storage by default. Analytics can be enabled later with EU-hosted Plausible.</p>
      </div>
      <div class="button-row">
        <button class="button-soft" type="button" data-cookie-choice="essential">Essential only</button>
        <button class="button" type="button" data-cookie-choice="analytics">Allow analytics</button>
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
  <a class="skip-link" href="#main">Skip to content</a>
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
  return `
    <section class="section">
      <div class="container hero-grid">
        <div class="hero-copy fade-up">
          <p class="eyebrow">EU AI Evidence Builder</p>
          <h1>${escapeHtml(copy.heroTitle)}</h1>
          <p class="lead">${escapeHtml(copy.heroText)}</p>
          <div class="button-row">
            <a class="button" href="${ctx.href("builder")}" data-track-event="landing_start_free">${escapeHtml(copy.primaryCta)}</a>
            <a class="button-ghost" href="${ctx.href("how-it-works")}" data-track-event="landing_how">${escapeHtml(copy.secondaryCta)}</a>
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
          <h3>${escapeHtml(proofSurface ? proofSurface.label : "Live EU dossier demo")}</h3>
          <div class="proof-frame">
            <img src="${ctx.assetHref(ctx.proof.screenshotPaths.secondary)}" alt="Real evidence report screenshot" />
          </div>
          <div class="metric-grid">
            <div class="metric"><span>Runs in window</span><strong>${proofSurface?.summary?.runs_in_window ?? 2}</strong></div>
            <div class="metric"><span>Approvals</span><strong>${proofSurface?.summary?.approvals ?? 1}</strong></div>
            <div class="metric"><span>Blocks</span><strong>${proofSurface?.summary?.blocks ?? 1}</strong></div>
            <div class="metric"><span>Monitoring</span><strong>${proofSurface?.summary?.monitoring_status ?? "history_current"}</strong></div>
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
        <div class="three-col">
          ${copy.problemCards
            .map(
              (card) => `
            <article class="problem-card fade-up">
              <span class="icon-badge">${card.icon}</span>
              <h3>${escapeHtml(card.title)}</h3>
              <p class="muted">${escapeHtml(card.text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(copy.solutionTitle)}</p>
          <h2 class="section-title">${escapeHtml(copy.solutionTitle)}</h2>
          <div class="timeline">
            ${copy.steps
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
          <p class="eyebrow">Proof-first</p>
          <h3>AI agent -> Test cases -> Evidence pack -> EU AI Act document</h3>
          <div class="code-snippet"><code>{
"gate_recommendation": "require_approval",
"logging": "structured_events + trace anchors",
"annex_iv": "evidence references attached"
}</code></div>
          <p class="muted">The site gives away documentation structure. The product sells the technical proof that keeps the package credible.</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container table-card fade-up">
        <p class="eyebrow">Coverage</p>
        <h2 class="section-title">Which EU AI Act requirements does this cover?</h2>
        <table class="coverage-table">
          <thead>
            <tr><th>Article</th><th>Requirement</th><th>What we generate</th></tr>
          </thead>
          <tbody>
            <tr><td>Art. 9</td><td>Risk management system</td><td>Risk scores, gate recommendations, scanner results</td></tr>
            <tr><td>Art. 12</td><td>Record-keeping and logging</td><td>Structured events, trace anchors, audit trail</td></tr>
            <tr><td>Art. 14</td><td>Human oversight</td><td>Escalation records, approval queues, review artifacts</td></tr>
            <tr><td>Art. 15</td><td>Accuracy and robustness</td><td>Pass rates, flakiness, execution quality, admissibility signals</td></tr>
            <tr><td>Annex IV</td><td>Technical documentation</td><td>Pre-filled structure with evidence references</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    ${renderTechnicalCallout(locale, ctx)}
    ${renderPricingPreview(locale, ctx)}
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

function renderHowItWorks(locale, ctx) {
  const copy = LOCALES[locale].how;
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">Pipeline</p>
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="timeline">
            <article class="timeline-card"><span class="timeline-step">1</span><p>Builder captures system profile, deployment scope, and likely documentation burden.</p></article>
            <article class="timeline-card"><span class="timeline-step">2</span><p>Template pages show what each section requires and what evidence should exist behind it.</p></article>
            <article class="timeline-card"><span class="timeline-step">3</span><p>Agent QA Toolkit generates portable evidence packs that attach to the dossier.</p></article>
            <article class="timeline-card"><span class="timeline-step">4</span><p>Reviewers receive a coherent package: narrative templates plus machine-verifiable proof.</p></article>
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">Live surface</p>
          <h3>Use the demo hub as the website proof layer</h3>
          <div class="button-row">
            <a class="button" href="${ctx.assetHref("demo/")}" data-track-event="how_demo_hub">Open demo hub</a>
            <a class="button-soft" href="${ctx.href("technical")}" data-track-event="how_technical">Open technical view</a>
            <a class="button-ghost" href="${ctx.assetHref("demo/product-surfaces.json")}" target="_blank" rel="noreferrer">Open JSON index</a>
          </div>
          <div class="code-snippet"><code>{
"artifact": "compare-report.json",
"dossier": "eu-ai-act-report.html",
"instructions": "article-13-instructions.json",
"risk_register": "article-9-risk-register.json",
"qms_lite": "article-17-qms-lite.json",
"monitoring_plan": "article-72-monitoring-plan.json"
}</code></div>
        </div>
      </div>
    </section>
  `;
}

function renderTechnical(locale, ctx) {
  const copy = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
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
        <aside class="hero-card fade-up">
          <p class="eyebrow">${escapeHtml(copy.planningTitle)}</p>
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
        </aside>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">Workflow</p>
          <h2 class="section-title">${escapeHtml(copy.workflowTitle)}</h2>
          <div class="timeline section-tight">
            ${TECHNICAL_SHARED.workflowSteps
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
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(copy.boundaryTitle)}</p>
          <h3>Prepared inputs -> verified technical evidence bundle</h3>
          <p class="muted">${escapeHtml(copy.boundaryBody)}</p>
          <div class="code-snippet"><code>{
"human_owned": ["scope", "quality_contract", "adapter_depth", "final_signoff"],
"automated": ["runs", "package", "verify", "review_scaffold", "review_check", "eu_exports"],
"handoff": ["report.html", "compare-report.json", "manifest.json", "review/review-decision.json"]
}</code></div>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">Intake</p>
          <h2 class="section-title">${escapeHtml(copy.intakeTitle)}</h2>
          <p class="muted">${escapeHtml(copy.intakeLead)}</p>
          <div class="code-snippet"><code>${escapeHtml(TECHNICAL_SHARED.intakeCommands.join("\n"))}</code></div>
          <ul class="check-list section-tight">
            ${TECHNICAL_SHARED.intakeArtifacts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">Human-owned</p>
          <h2 class="section-title">${escapeHtml(copy.intakeHumanTitle)}</h2>
          <table class="section-table">
            <thead>
              <tr><th>Area</th><th>Why it stays manual</th></tr>
            </thead>
            <tbody>
              ${TECHNICAL_SHARED.humanOwnedRows
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
        <p class="eyebrow">Artifacts</p>
        <h2 class="section-title">${escapeHtml(copy.artifactsTitle)}</h2>
        <p class="muted">${escapeHtml(copy.artifactsLead)}</p>
        <table class="section-table">
          <thead>
            <tr><th>Stage</th><th>Artifact</th><th>Created by</th><th>Ready gate</th></tr>
          </thead>
          <tbody>
            ${TECHNICAL_SHARED.artifactRows
              .map(
                (row) => `
              <tr>
                <td>${escapeHtml(row[0])}</td>
                <td><code>${escapeHtml(row[1])}</code></td>
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
          <p class="eyebrow">Review</p>
          <h2 class="section-title">${escapeHtml(copy.reviewTitle)}</h2>
          <p class="muted">${escapeHtml(copy.reviewLead)}</p>
          <div class="code-snippet"><code>${escapeHtml(TECHNICAL_SHARED.reviewCommands.join("\n"))}</code></div>
          <ul class="check-list section-tight">
            ${TECHNICAL_SHARED.reviewArtifacts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">Gate</p>
          <h2 class="section-title">${escapeHtml(copy.reviewChecksTitle)}</h2>
          <ul class="check-list section-tight">
            ${TECHNICAL_SHARED.reviewChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">Readiness</p>
          <h2 class="section-title">${escapeHtml(copy.readinessTitle)}</h2>
          <p class="muted">${escapeHtml(copy.readinessLead)}</p>
          <ul class="check-list section-tight">
            ${TECHNICAL_SHARED.readinessChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
          <p class="eyebrow section-tight">${escapeHtml(copy.readinessScoreTitle)}</p>
          <div class="timeline">
            ${TECHNICAL_SHARED.readinessBands
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
          <p class="eyebrow">Maturity</p>
          <h2 class="section-title">${escapeHtml(copy.maturityTitle)}</h2>
          <p class="muted">${escapeHtml(copy.maturityLead)}</p>
          <table class="section-table">
            <thead>
              <tr><th>Level</th><th>Name</th><th>Characteristics</th></tr>
            </thead>
            <tbody>
              ${TECHNICAL_SHARED.maturityRows
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
          <p class="eyebrow">Re-run triggers</p>
          <h2 class="section-title">${escapeHtml(copy.triggersTitle)}</h2>
          <table class="section-table">
            <thead>
              <tr><th>Trigger</th><th>Expected action</th></tr>
            </thead>
            <tbody>
              ${TECHNICAL_SHARED.triggerRows
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
          <p class="eyebrow">Support scope</p>
          <h2 class="section-title">${escapeHtml(copy.supportTitle)}</h2>
          <table class="section-table">
            <thead>
              <tr><th>Layer</th><th>Good fit</th><th>Not included</th></tr>
            </thead>
            <tbody>
              ${TECHNICAL_SHARED.supportRows
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
        <p class="eyebrow">Failure modes</p>
        <h2 class="section-title">${escapeHtml(copy.failureTitle)}</h2>
        <div class="docs-grid section-tight">
          ${TECHNICAL_SHARED.failureCards
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
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Templates</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <p class="lead">${escapeHtml(copy.intro)}</p>
        <div class="template-grid section-tight">
          ${availableTemplateKeys
            .map((key) => {
              const data = TEMPLATE_CONTENT[key];
              return `
                <article class="template-card fade-up">
                  <p class="eyebrow">${escapeHtml(key)}</p>
                  <h3>${escapeHtml(data.title[locale] || data.title.en)}</h3>
                  <p class="muted">${escapeHtml(data.description[locale] || data.description.en)}</p>
                  <div class="button-row">
                    <a class="button" href="${ctx.href(`template-${key}`)}">Open page</a>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderTemplatePage(locale, ctx, key, downloadHref) {
  const data = TEMPLATE_CONTENT[key];
  const title = data.title[locale] || data.title.en;
  const intro = data.intro[locale] || data.intro.en;
  const requirement = data.requirement[locale] || data.requirement.en;
  const rows = data.sections[locale] || data.sections.en;
  const faq = data.faq[locale] || data.faq.en;
  const launchPackLabel = locale === "de" ? "Launch Pack buchen" : locale === "fr" ? "Reserver le Launch Pack" : "Book Launch Pack";
  return `
    <section class="section">
      <div class="container content-grid">
        <div class="fade-up">
          <p class="eyebrow">Template</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lead">${escapeHtml(intro)}</p>
        </div>
        <aside class="proof-card fade-up">
          <p class="eyebrow">Download</p>
          <h3>Free template package</h3>
          <p class="muted">Download a print-ready template and then connect live evidence where the document requires proof.</p>
          <div class="button-row">
            ${renderTemplateDownloadLink(downloadHref, "Download free template")}
            <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">See live evidence</a>
          </div>
        </aside>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">What this article requires</p>
          <p>${escapeHtml(requirement)}</p>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">Proof-first</p>
          <img src="${ctx.assetHref(ctx.proof.screenshotPaths.primary)}" alt="Real report screenshot" />
        </div>
      </div>
    </section>
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
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">Generate machine-verifiable evidence</p>
        <h3>Attach real proof to this section</h3>
        <p>Use the live proof surface to show exactly what technical evidence looks like when it is attached to a documentation package.</p>
        <div class="button-row">
          <a class="button" href="${ctx.href("pricing")}" data-track-event="template_get_evidence">${escapeHtml(launchPackLabel)}</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">Open live dossier</a>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">FAQ</p>
        <div class="split-grid">
          ${renderFaq(faq)}
        </div>
      </div>
    </section>
  `;
}

function renderPricing(locale, ctx) {
  const copy = LOCALES[locale].pricing;
  const subscriptionPlans = SUBSCRIPTION_PLAN_ORDER.map((key) => getPlan(key)).filter(Boolean);
  const launchPack = getPlan("launch-pack");
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Pricing</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <p class="lead">${escapeHtml(copy.lead)}</p>
        <p class="eyebrow section-tight">${escapeHtml(copy.subscriptionsLabel)}</p>
        <div class="pricing-grid section-tight">
          ${subscriptionPlans.map((plan) => renderPlanCard(plan, locale, ctx.href)).join("")}
        </div>
        ${
          launchPack
            ? `
        <div class="proof-card section-tight fade-up">
          <p class="eyebrow">${escapeHtml(copy.oneTimeLabel)}</p>
          <h3>${escapeHtml(copy.oneTimeTitle)}</h3>
          <p class="muted">${escapeHtml(copy.oneTimeBody)}</p>
          <div class="pricing-grid section-tight">
            ${renderPlanCard(launchPack, locale, ctx.href, { fade: false })}
          </div>
        </div>`
            : ""
        }
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">FAQ</p>
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
  const builderCopy = {
    locale,
    stepLabel: "Step",
    ofLabel: "of",
    nextLabel: "Next step",
    finishLabel: "Done",
    summaryEyebrow: "Summary",
    summaryTitle: "Preliminary risk screening",
    evidenceEyebrow: "Evidence preview",
    evidenceTitle: "What Agent QA Toolkit can attach",
    selectPlaceholder: "Select an option",
    disclaimer:
      "This is a preliminary screening. It does not replace legal review by qualified counsel.",
    classifications: {
      high: "HIGH RISK",
      limited: "LIMITED RISK",
      minimal: "MINIMAL RISK",
    },
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
          ? "Wie werden Logging und Traceability beschrieben?"
          : locale === "fr"
            ? "Comment decrivez-vous le logging et la tracabilite ?"
            : "How do you describe logging and traceability?",
      oversight:
        locale === "de"
          ? "Wie erfolgt menschliche Aufsicht?"
          : locale === "fr"
            ? "Comment la supervision humaine fonctionne-t-elle ?"
            : "How does human oversight work?",
    },
    packageSections: {
      profile: "System profile",
      risk: "Risk classification",
      article9: "Article 9 draft",
      oversight: "Articles 12 and 14 draft",
      evidence: "Evidence references",
    },
    packageChecklist: {
      done:
        locale === "de"
          ? ["Artikel-9-Entwurf", "Artikel-12-Logging-Entwurf", "Artikel-14-Oversight-Entwurf", "Druckfertiges Paket"]
          : locale === "fr"
            ? [
                "Brouillon Article 9",
                "Brouillon Article 12 logging",
                "Brouillon Article 14 oversight",
                "Package pret a imprimer",
              ]
            : ["Article 9 template draft", "Article 12 logging draft", "Article 14 oversight draft", "Print-ready package"],
      todo:
        locale === "de"
          ? ["Evidence-Workflow (self-serve via GitHub oder bezahltes Setup)", "Audit-Export (nach Setup / Team oder hoeher)"]
          : locale === "fr"
            ? ["Workflow de preuve (self-serve via GitHub ou setup payant)", "Export audit (apres setup / Team ou plus)"]
            : ["Evidence workflow (self-serve via GitHub or paid setup)", "Audit-ready export (after setup / Team or higher)"],
    },
    packageTitle: "EU AI Act Documentation Package",
    packageDisclaimer:
      "This package is a documentation draft generated in the browser. Save it as PDF from the browser print dialog, then attach live technical evidence where required.",
    requiredArticles: "Required articles",
    evidencePlaceholder:
      "Technical evidence is strongest for Articles 9, 12, 14, 15, and Annex IV references. Use the live proof surface for that part of the package.",
    getEvidence: locale === "de" ? "Launch Pack buchen" : locale === "fr" ? "Reserver le Launch Pack" : "Book Launch Pack",
    openProof: "Open live proof",
    openDocs: "Open docs",
    downloadJson: "Download JSON",
    openPrintable: "Open print-ready package",
    exportHint: "Save the printable package as PDF from your browser if you need a handoff document now.",
    placeholderText: "Add your team narrative here.",
    yes: localeCopy.common.yes,
    no: localeCopy.common.no,
    systemTypes: [
      { value: "hr", label: locale === "de" ? "HR / Recruiting" : locale === "fr" ? "RH / Recrutement" : "HR recruitment / CV screening" },
      { value: "credit", label: locale === "de" ? "Kredit / Finanzen" : locale === "fr" ? "Credit / decisions financieres" : "Credit scoring / financial decisions" },
      { value: "healthcare", label: locale === "de" ? "Gesundheitswesen" : locale === "fr" ? "Sante" : "Healthcare decision support" },
      { value: "education", label: locale === "de" ? "Bildung" : locale === "fr" ? "Education" : "Education assessment" },
      { value: "customer-service", label: locale === "de" ? "Customer service / Chatbot" : locale === "fr" ? "Service client / chatbot" : "Customer service / chatbot" },
      { value: "other", label: locale === "de" ? "Sonstiges" : locale === "fr" ? "Autre" : "Other" },
    ],
    memberStates: ["DE", "FR", "NL", "SE", "IE", "EE"],
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
    links: {
      pricing: ctx.href("pricing"),
      proof: ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html"),
      docs: ctx.href("docs"),
    },
    metrics: {
      approvals: "Approvals",
      blocks: "Blocks",
      runs: "Runs in window",
      execution: "Execution",
    },
  };

  return `
    <section class="section">
      <div class="container split-grid">
        <div class="fade-up">
          <p class="eyebrow">Builder</p>
          <h1>${escapeHtml(LOCALES[locale].builder.headline)}</h1>
          <p class="lead">${escapeHtml(LOCALES[locale].builder.intro)}</p>
        </div>
        <aside class="proof-card fade-up">
          <p class="eyebrow">Live proof</p>
          <h3>${escapeHtml(proofSurface ? proofSurface.label : "EU AI Act demo")}</h3>
          <div class="metric-grid">
            <div class="metric"><span>Cases</span><strong>${proofSurface?.summary?.cases_total ?? 2}</strong></div>
            <div class="metric"><span>Approvals</span><strong>${proofSurface?.summary?.approvals ?? 1}</strong></div>
            <div class="metric"><span>Blocks</span><strong>${proofSurface?.summary?.blocks ?? 1}</strong></div>
            <div class="metric"><span>Portable</span><strong>${proofSurface?.summary?.portable_paths ? "true" : "true"}</strong></div>
          </div>
          <a class="button-ghost" href="${ctx.assetHref("demo/eu-ai-act/compliance/eu-ai-act-report.html")}" target="_blank" rel="noreferrer">Open dossier demo</a>
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
              <button class="button-soft" type="button" data-builder-prev>Back</button>
              <button class="button" type="button" data-builder-next>Next step</button>
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
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Docs</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <p class="lead">Open-source docs stay in the repository. The public site focuses on the proof hub, templates, and pricing story.</p>
        <div class="docs-grid section-tight">
          <article class="card fade-up">
            <h3>Technical view</h3>
            <p class="muted">The professional operating model for inputs, artifacts, ready gates, and support boundaries.</p>
            <a class="button-ghost" href="${ctx.href("technical")}">Open technical page</a>
          </article>
          <article class="card fade-up">
            <h3>Proof hub</h3>
            <p class="muted">Published live demos for both product surfaces.</p>
            <a class="button-ghost" href="${ctx.assetHref("demo/")}">Open proof hub</a>
          </article>
          <article class="card fade-up">
            <h3>Product matrix</h3>
            <p class="muted">Commercial split between the core product and the EU vertical.</p>
            <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/product-matrix.md" target="_blank" rel="noreferrer">Open on GitHub</a>
          </article>
          <article class="card fade-up">
            <h3>Operations model</h3>
            <p class="muted">The internal operating spec for scope, cases, adapters, runs, bundles, and handoff.</p>
            <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/evidence-operations-model.md" target="_blank" rel="noreferrer">Open on GitHub</a>
          </article>
          <article class="card fade-up">
            <h3>Automation boundary</h3>
            <p class="muted">What remains manual by design, what is real tech debt, and what is only optional expansion.</p>
            <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/automation-boundary-and-tech-debt.md" target="_blank" rel="noreferrer">Open on GitHub</a>
          </article>
          <article class="card fade-up">
            <h3>Publishing runbook</h3>
            <p class="muted">How the site proof surface is published and verified.</p>
            <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/product-surface-publishing.md" target="_blank" rel="noreferrer">Open on GitHub</a>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderAbout(locale) {
  const copy = LOCALES[locale].about;
  return `
    <section class="section">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">About</p>
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">The Builder is the acquisition and documentation layer. Agent QA Toolkit remains the evidence engine. That split is intentional: the free path is OSS self-serve, while paid packages add setup and first-delivery help for teams that do not want to configure everything alone.</p>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">Open core</p>
          <h3>Open source core, commercial packaging around it</h3>
          <p class="muted">The site does not hide the product architecture. It makes the proof story legible for buyers.</p>
          <a class="button-ghost" href="${GITHUB_REPO}" target="_blank" rel="noreferrer">Open repository</a>
        </div>
      </div>
    </section>
  `;
}

function renderContact(locale, ctx) {
  const copy = LOCALES[locale].contact;
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Contact</p>
        <h1>${escapeHtml(copy.headline)}</h1>
        <div class="contact-grid section-tight">
          <article class="card fade-up">
            <h3>Start a pilot</h3>
            <p class="muted">Use the existing pilot request template in the open-source repository.</p>
            <a class="button" href="${GITHUB_REPO}/issues/new?template=pilot_request.yml" target="_blank" rel="noreferrer">Open pilot request</a>
          </article>
          <article class="card fade-up">
            <h3>Review the live proof</h3>
            <p class="muted">Send buyers directly to the published dossier and evidence pack surface.</p>
            <a class="button-ghost" href="${ctx.assetHref("demo/")}" data-track-event="contact_demo_hub">Open proof hub</a>
          </article>
          <article class="card fade-up">
            <h3>Need the technical docs?</h3>
            <p class="muted">Use the repository docs and product matrix as the source of truth.</p>
            <a class="button-ghost" href="${ctx.href("docs")}">Open docs</a>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderLegal(locale, key) {
  const title = LOCALES[locale].legalTitles[key];
  const blocks = {
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
      "Risk classification shown in the builder is preliminary and should be treated as a screening aid.",
    ],
    cookies: [
      "Only essential storage is active by default.",
      "If analytics is enabled later, it should remain EU-hosted and documented clearly.",
      "No third-party marketing cookies should be enabled without explicit consent.",
    ],
  };

  return `
    <section class="section">
      <div class="container legal-card">
        <p class="eyebrow">Legal</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="text-list section-tight">
          ${blocks[key].map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderBlogIndex(ctx) {
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Blog</p>
        <h1>${escapeHtml(LOCALES.en.blog.headline)}</h1>
        <p class="lead">High-intent content for teams preparing documentation, evidence, and conformity-adjacent technical review.</p>
        <div class="blog-grid section-tight">
          ${Object.entries(BLOG_CONTENT)
            .map(
              ([key, article]) => `
            <article class="blog-card fade-up">
              <h3>${escapeHtml(article.title)}</h3>
              <p class="muted">${escapeHtml(article.description)}</p>
              <a class="button-ghost" href="${ctx.href(`blog-${key}`)}">Read article</a>
            </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderBlogPage(ctx, key) {
  const article = BLOG_CONTENT[key];
  return `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Blog</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="lead">${escapeHtml(article.description)}</p>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <div class="timeline">
          ${article.sections
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
        <p class="eyebrow">Next step</p>
        <h3>Do not separate templates from proof</h3>
        <div class="button-row">
          <a class="button" href="${ctx.href("builder")}" data-track-event="blog_start_builder">Start free builder</a>
          <a class="button-ghost" href="${ctx.assetHref("demo/")}" data-track-event="blog_demo_hub">Open proof hub</a>
        </div>
      </div>
    </section>
  `;
}

function templateDownloadContent(locale, key) {
  const data = TEMPLATE_CONTENT[key];
  const title = data.title[locale] || data.title.en;
  const rows = data.sections[locale] || data.sections.en;
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
  <section><p>${escapeHtml((data.intro[locale] || data.intro.en) || "")}</p></section>
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
  <section><p>Use browser print to save this document as PDF.</p></section>
</body>
</html>`;
}

function softwareSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EU AI Act Evidence Builder",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free EU AI Act compliance documentation templates",
    },
    operatingSystem: "Web",
    inLanguage: ["en", "de", "fr"],
    url: `${origin}/en/`,
  };
}

function faqSchema(locale, key) {
  const faq = TEMPLATE_CONTENT[key].faq[locale] || TEMPLATE_CONTENT[key].faq.en || [];
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
  const landingSchema = softwareSchema(origin);

  for (const locale of ["en", "de", "fr"]) {
    const meta = LOCALES[locale];
    const technicalMeta = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
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
      createPage(locale, "technical", "technical", {
        title: technicalMeta.title,
        description: technicalMeta.description,
        body: (ctx) => renderTechnical(locale, ctx),
      })
    );
    add(
      createPage(locale, "pricing", "pricing", {
        title: meta.pricing.title,
        description: meta.pricing.description,
        schema: [
          softwareSchema(origin),
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
          renderTemplatesIndex(
            locale,
            ctx,
            locale === "en" ? ["article-9", "article-12", "article-14", "article-15", "technical-doc"] : ["article-9", "technical-doc"]
          ),
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
        body: () => renderAbout(locale),
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
          description: `${meta.legalTitles[legalKey]} for the EU AI Evidence Builder website and documentation funnel.`,
          body: () => renderLegal(locale, legalKey),
        })
      );
    }
  }

  for (const locale of ["en", "de", "fr"]) {
    for (const templateKey of locale === "en" ? ["article-9", "technical-doc", "article-12", "article-14", "article-15"] : ["article-9", "technical-doc"]) {
      const data = TEMPLATE_CONTENT[templateKey];
      add(
        createPage(locale, `template-${templateKey}`, `templates/${templateKey}`, {
          title: data.title[locale] || data.title.en,
          description: data.description[locale] || data.description.en,
          schema: [faqSchema(locale, templateKey)],
          body: (ctx) => renderTemplatePage(locale, ctx, templateKey, ctx.assetHref(`downloads/${locale}/${templateKey}.html`)),
        })
      );
    }
  }

  add(
    createPage("en", "blog", "blog", {
      title: LOCALES.en.blog.title,
      description: LOCALES.en.blog.description,
      body: (ctx) => renderBlogIndex(ctx),
    })
  );
  for (const key of Object.keys(BLOG_CONTENT)) {
    add(
      createPage("en", `blog-${key}`, `blog/${key}`, {
        title: BLOG_CONTENT[key].title,
        description: BLOG_CONTENT[key].description,
        body: (ctx) => renderBlogPage(ctx, key),
      })
    );
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

  for (const locale of ["en", "de", "fr"]) {
    for (const key of locale === "en" ? ["article-9", "article-12", "article-14", "article-15", "technical-doc"] : ["article-9", "technical-doc"]) {
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
