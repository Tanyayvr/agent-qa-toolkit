import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const SITE_OUTPUT_ROOT = path.join(REPO_ROOT, "docs");
const GITHUB_REPO = "https://github.com/Tanyayvr/agent-qa-toolkit";
const SITE_NAME = "EU AI Evidence Builder";

export const DEFAULT_ORIGIN = process.env.EU_AI_SITE_ORIGIN || "https://tanyayvr.github.io/agent-qa-toolkit";
const PLAUSIBLE_DOMAIN = process.env.EU_AI_SITE_PLAUSIBLE_DOMAIN || "";
const SITE_LOCALES = ["en", "de", "fr"];
const TEMPLATE_PAGE_KEYS = [
  "article-9",
  "article-10",
  "article-12",
  "article-13",
  "article-14",
  "article-15",
  "article-16",
  "article-17",
  "article-22",
  "article-43",
  "article-47",
  "article-48",
  "article-49",
  "article-72",
  "article-73",
  "annex-v",
  "technical-doc",
];
const TEMPLATE_DOWNLOAD_KEYS = TEMPLATE_PAGE_KEYS;
const ASSET_VERSION_CACHE = new Map();

const LOCALES = {
  en: {
    code: "en",
    name: "English",
    htmlLang: "en",
    nav: {
      how: "How it works",
      technical: "Technical Overview",
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
      liveDemos: "Open Builder",
      proofLabel: "Public path",
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
      viewProof: "Open EU starter",
      viewDemo: "See sample package",
      bookCall: "Review pilot requirements",
    },
    landing: {
      title: "EU AI Act Evidence Pack Builder | High-Risk AI Compliance for August 2026",
      description:
        "Build the provider-side EU AI Act documentation path for high-risk AI systems, with law-grounded drafts, statutory sections, and supporting records for the relevant AI system and its version.",
      keywords:
        "EU AI Act evidence pack, EU AI Act compliance tool, high risk AI August 2026, AI Act documentation builder, insurance AI compliance, hiring AI compliance, healthcare AI compliance, finance AI compliance",
      heroTitle: "2 August 2026 is coming. Can your AI system hand evidence to a reviewer?",
      heroText:
        "Build the provider-side EU AI Act documentation path for high-risk AI systems, with law-grounded drafts, statutory sections, and supporting records for the relevant AI system and its version.",
      heroSubline:
        "This default path is for providers of high-risk AI systems. Importer, distributor, deployer, and authorised-representative obligations differ. If Article 25 makes your organization the provider, use this path.",
      primaryCta: "Start building your package",
      secondaryCta: "Try EU starter",
      audienceTitle: "Choose your entry path",
      audienceLead:
        "Start with the job you are actually trying to complete: understand the EU workflow, inspect the technical overview, or start the package.",
      audienceCards: [
        {
          title: "Understand the EU workflow",
          text:
            "Use this route when you need to understand the provider-side documentation flow, what your team has to write, what can be attached as supporting records, and what stays human-owned.",
          result: "Best first click for governance, legal, consultants, and mixed review teams.",
          cta: "Open workflow path",
          href: "how-it-works",
        },
        {
          title: "Inspect the technology",
          text:
            "See the architecture: how technical evidence is generated, verified, and linked to the provider-side package before your team spends time in the repo.",
          result: "Best first click for CTOs, engineering leads, security, and technical diligence.",
          cta: "Open technical overview",
          href: "technical",
        },
        {
          title: "Start the package",
          text:
            "Use this route when you already want to draft the provider-side statutory sections for a high-risk AI system and complete the minimum legal package article by article.",
          result: "Best first click for operators and implementation owners who need a practical starting point.",
          cta: "Open package path",
          href: "builder",
        },
      ],
      solutionTitle: "How EU AI Act Evidence Builder works",
      steps: [
        "Confirm which provider-side statutory sections apply and which supporting records your team already has.",
        "Use the builder and templates to structure the statutory sections that need written draft text.",
        "Attach the supporting records already required for your system and export one organized provider-side package.",
      ],
      strongestFitTitle: "Strongest fit",
      strongestFitBody:
        "Best when a team needs to assemble the provider-side minimum package without inventing the structure from scratch. Legal classification, final sign-off, and role-specific legal judgment stay outside the product.",
      deliverablesTitle: "What you actually get",
      deliverablesLead:
        "The product should be legible in outputs, not only in process language.",
      deliverablesCards: [
        {
          title: "Law-grounded written draft",
          text: "A first provider-side written draft that follows Annex IV and the linked statutory sections your team has to complete.",
        },
        {
          title: "Statutory section structure",
          text: "Annex IV plus the linked provider-side sections for Articles 9, 10, 12, 13, 14, 15, 16, 17, 43, 47, 48, 49, 72, and Annex V.",
        },
        {
          title: "Supporting records list",
          text: "One place to attach the records your system already requires, such as logs, testing summaries, monitoring notes, declarations, and conformity records.",
        },
        {
          title: "Exportable provider package",
          text: "A print-ready and JSON draft that your team can review, complete, and save as part of the provider-side package.",
        },
      ],
      fitMatrixTitle: "What teams usually need under review",
      fitMatrixLead:
        "For the provider-side minimum path, teams still need more than raw logs or static notes because the law requires one structured package across multiple sections.",
      fitMatrixHeaders: ["What teams need", "Basic logs", "SaaS dashboard / eval tool", "Checklist / PDF tool", "This product"],
      fitMatrixRows: [
        [
          "Technical documentation structure",
          "No",
          "Partial",
          "Partial",
          "Yes",
        ],
        [
          "Record-keeping and logs",
          "Partial",
          "Partial",
          "Yes",
          "Yes",
        ],
        [
          "Instructions and deployer information",
          "No",
          "Partial",
          "Partial",
          "Yes",
        ],
        [
          "Human oversight material",
          "Yes",
          "Partial",
          "Partial",
          "Yes",
        ],
        [
          "Risk-management draft",
          "No",
          "Partial",
          "Partial",
          "Yes",
        ],
        [
          "Conformity and declaration sections",
          "No",
          "No",
          "Partial",
          "Yes",
        ],
        [
          "Post-market monitoring section",
          "No",
          "Partial",
          "Partial",
          "Yes",
        ],
        [
          "One organized provider-side package",
          "No",
          "Partial",
          "Partial",
          "Yes",
        ],
      ],
      proofTitle: "Choose the next step",
      proofBody:
        "Start in Builder, open the EU starter, or inspect the technical overview before your team spends time in the repository.",
      faq: [
        [
          "When does the EU AI Act start for high-risk AI?",
          "As of 28 March 2026, the main application date for most Annex III high-risk AI systems is 2 August 2026. Certain Article 6(1) routes tied to Annex I safety-component products apply from 2 August 2027. Teams that may fall into high-risk scope should be using 2026 as the date to get evidence, documentation, and review workflows in shape.",
        ],
        [
          "Which industries usually fall into Annex III high-risk AI systems?",
          "The broad search buckets are insurance, finance, hiring, healthcare, education, biometrics, law enforcement, border control, and justice. The legal scope is narrower than those labels: common Annex III examples include hiring and worker management, educational access and assessment, credit scoring, life and health insurance risk assessment, emergency triage, biometrics, and other listed high-impact uses. This site stays broad in the headline and more precise here in the answer.",
        ],
        [
          "Which EU AI Act articles require more than logs and traces?",
          "For high-risk systems, logs help with only one part of the package. Article 11 and Annex IV require technical documentation; Article 12 requires record-keeping; Article 13 requires information for deployers; Article 14 requires human oversight; Article 17 requires a documented quality management system; Article 72 requires a post-market monitoring plan; and Article 47 together with Annex V requires an EU declaration of conformity. The product exists because those obligations need to survive review together.",
        ],
        [
          "Why are basic logs not enough for high-risk AI review?",
          "Because high-risk review needs more than runtime traceability. Article 12 record-keeping matters, but teams may still need technical documentation, deployer information, human-oversight material, monitoring outputs, and a conformity-facing package that another reviewer can actually read and verify. Logs are necessary, but they are not the whole deliverable.",
        ],
        [
          "Is this default path for importers, distributors, deployers, or authorised representatives?",
          "No. The default path on this site is the provider-side path for high-risk AI systems. Those other roles have different obligations. If Article 25 makes your organization the provider, use this provider path. If a provider is established outside the Union, Article 22 adds the authorised-representative duty on top of the provider path.",
        ],
        [
          "Why isn't a SaaS dashboard or eval platform enough for EU AI Act evidence?",
          "Because most SaaS observability and eval surfaces are built for internal inspection, not for controlled reviewer handoff. They can be useful inputs, but they usually do not solve the offline dossier, review record, disclosure boundary, or machine-verifiable bundle another reviewer can inspect outside the original stack.",
        ],
        [
          "Why does the provider-side package need more than a checklist or PDF?",
          "Because the provider-side path still has to cover technical documentation, record-keeping, deployer information, human oversight, monitoring, and conformity-facing sections together. A checklist or static PDF can help with one slice of that work, but not with the whole package structure.",
        ],
        [
          "What does this product add beyond logs, SaaS dashboards, and PDF tools?",
          "It adds the provider-side package structure that simpler tools usually leave missing: law-grounded draft sections, linked article templates, a single place for required supporting records, and an exportable draft your team can complete and review.",
        ],
        [
          "Will runtime data, prompts, or evidence leave our environment?",
          "No. The core evidence workflow is designed to run inside your own environment, so runtime evidence, packaging, verification, and reviewer outputs can stay within your controlled boundary.",
        ],
        [
          "Does this replace legal review or final sign-off?",
          "No. The product structures the written provider-side package and the supporting records around it. Legal classification, residual-risk judgment, and final approval remain human-owned.",
        ],
        [
          "In which formats can the package be delivered?",
          "The builder produces a browser-generated written draft, a JSON export, and a print-ready version that your team can save as PDF. Supporting records stay attached to the same provider-side package.",
        ],
      ],
    },
    how: {
      title: "How to prepare EU AI Act documents and evidence for review",
      description:
        "Understand what your team needs to prepare first, what the workflow organizes automatically, what still needs human review, and what a reviewer receives at the end.",
      keywords:
        "how to prepare EU AI Act documents, EU AI Act documentation workflow, high risk AI review process, AI compliance workflow, what documents are needed for EU AI Act",
      headline: "How to prepare EU AI Act documents and evidence for review",
      intro:
        "Use this page when you need to understand the documentation process before starting: what your team prepares first, what the workflow organizes automatically, what still needs human review, and what a reviewer receives at the end.",
      summaryTitle: "What needs to be prepared for EU AI Act review",
      summaryLead:
        "This is the shortest view of what your team provides first, what the workflow organizes automatically, what still needs human review, and what a reviewer should receive at the end.",
      summaryColumns: [
        {
          title: "Your team provides",
          points: [
            "System scope, intended use, owners, and deployment context",
            "Dossier sections that need explanations, constraints, and references",
            "Review expectations that determine how much support is needed",
          ],
        },
        {
          title: "Organized automatically",
          points: [
            "Dossier structure and validation",
            "Supporting materials linked back to the same package",
            "A print-ready and JSON draft for the provider-side package",
          ],
        },
        {
          title: "Still with people",
          points: [
            "Legal interpretation and scope confirmation",
            "Business harms and residual-risk judgment",
            "Final wording, approval, and sign-off",
          ],
        },
        {
          title: "Your team can hand off",
          points: [
            "A readable package organized for review",
            "Linked supporting materials and attached records",
            "A provider-side draft that legal or governance teams can review",
          ],
        },
      ],
      inputsTitle: "What your team needs before starting",
      inputsLead: "The process starts with information your team already knows. The workflow cannot invent system scope, owners, or intended use on its own.",
      inputCards: [
        ["System scope", "System boundary, intended use, owners, and deployment context."],
        ["Dossier sections", "The sections that need explanations, assumptions, constraints, and references."],
        ["Review expectations", "The release or governance expectations that determine how much technical support is required."],
      ],
      workflowTitle: "How the documentation process works",
      workflowLead:
        "The goal is simple: collect the information your team already knows for the provider-side path, attach supporting materials from real runs, and end with one organized set of documents for review.",
      workflowSteps: [
        "Describe the system, its intended use, and who owns it.",
        "Add the explanations, limits, and references the package needs.",
        "Attach supporting materials from real runs and turn everything into one organized provider-side package.",
      ],
      outputsTitle: "What your team can hand off at the end",
      outputsLead: "The result should be easy to review, not only technically correct.",
      outputCards: [
        ["Dossier structure", "A package organized by the sections that need explanations, assumptions, constraints, and references."],
        ["Supporting materials", "Attached records such as logs, monitoring notes, declarations, testing summaries, and linked technical materials where they already exist."],
        ["Review handoff", "A provider-side draft that legal, governance, procurement, or other internal reviewers can examine and complete."],
      ],
      boundaryTitle: "What still needs human review and approval",
      boundaryLead:
        "The workflow organizes the package. It does not remove legal, governance, or approval responsibility.",
      boundaryPoints: [
        "Legal classification and final sign-off stay with named people.",
        "Business harms and residual-risk judgment still belong to the operator.",
        "Deployer-facing wording and release trade-offs still need human owners.",
      ],
      screenshotTitle: "What the reviewer sees at the end",
      screenshotBody:
        "The result should be readable to another person without opening your internal systems or engineering tools.",
      proofTitle: "Choose your next step",
      proofBody:
        "Start the package if you are ready to draft documents, open the legal templates if you want to inspect the statutory sections first, or open Technical Overview if your team needs the implementation side.",
      faq: [
        [
          "What documents need to be prepared for EU AI Act review?",
          "Most teams need a readable dossier, supporting technical materials from real runs, and the sections that still require human explanation, approval, or sign-off. The exact mix depends on system scope, intended use, and the review path you are preparing for.",
        ],
        [
          "Is this workflow page for deployers, importers, distributors, or authorised representatives?",
          "No. This workflow page follows the provider-side documentation path for high-risk AI systems. Other roles have different obligations. If Article 25 makes your organization the provider, use this path. If the provider is established outside the Union, add the Article 22 authorised-representative record to the same provider package.",
        ],
        [
          "What does my team need before starting the EU AI Act documentation workflow?",
          "Your team needs to define the system scope, intended use, owners, deployment context, and the dossier sections that need explanations, constraints, or references. The workflow cannot invent those inputs on its own.",
        ],
        [
          "How does the EU AI Act documentation workflow work step by step?",
          "First confirm scope and review context. Then draft the sections that need human explanation. After that, attach technical materials from real runs, check structure and completeness, and hand one organized package to the next reviewer.",
        ],
        [
          "What is generated automatically and what still needs human review?",
          "The workflow can organize dossier structure, attach supporting materials, and prepare a print-ready and JSON draft. Legal interpretation, residual-risk judgment, deployer-facing wording, and final approval still stay with named people.",
        ],
        [
          "What does the reviewer receive at the end?",
          "The reviewing team should receive a readable provider-side draft, linked supporting materials, and one organized package that can be completed and approved by the right human owners.",
        ],
        [
          "Can one workflow produce both documents and technical supporting materials?",
          "Yes. The workflow is meant to keep readable review documents and the supporting technical materials in the same package so they do not drift apart.",
        ],
        [
          "Do runtime data and evidence stay in our environment?",
          "Yes. The core workflow is designed so runtime evidence, verification, and reviewer outputs can stay inside your controlled environment.",
        ],
        [
          "Does this replace legal review or final approval?",
          "No. The workflow organizes the package and its technical support, but legal interpretation and final approval remain human responsibilities.",
        ],
      ],
    },
    pricing: {
      title: "EU AI Act pricing for high-risk AI systems",
      description:
        "Free self-serve access, paid help for the first real package, and enterprise support for broader EU AI Act work.",
      headline: "EU AI Act pricing for high-risk AI systems",
      lead:
        "Choose the path that matches your stage: free self-serve, paid help for the first real package, or enterprise support for broader rollout.",
      subscriptionsLabel: "Commercial paths",
      entryTitle: "Free self-serve",
      entryLead:
        "Use the open-source repo, Builder, templates, and EU starter when your team wants to evaluate the workflow on its own.",
      launchEyebrow: "Paid help",
      launchTitle: "Paid help for the first real package",
      launchLead:
        "Choose this when one system needs a real package and your team wants hands-on help reaching it faster.",
      tiersEyebrow: "Enterprise",
      tiersTitle: "Enterprise support for broader rollout",
      tiersLead:
        "Choose enterprise support when the work spans multiple systems, multiple teams, or formal procurement and review.",
      fitTitle: "Which path fits your team?",
      fitLead:
        "Stay self-serve while you are evaluating. Pay only when the work moves from trial to delivery.",
      fitCards: [
        ["Free self-serve", "Best when your team can run the workflow on its own and wants to evaluate fit first."],
        ["Paid help", "Best when one system needs a first real package and your team wants help reaching it."],
        ["Enterprise support", "Best when support spans multiple systems, multiple teams, or formal procurement and review."],
      ],
      faq: [
        {
          q: "Do I need to share my AI model or data?",
          a: "No. The core evidence workflow is self-hosted. Your runs stay in your environment.",
        },
        {
          q: "What should I start with?",
          a: "Start free with Builder and the EU starter if you are still evaluating fit or can run the workflow yourself. Use paid help when one system needs a first real package. Use enterprise support when the work is broader or more formal.",
        },
        {
          q: "What exactly does paid help buy?",
          a: "Paid help helps your team reach the first real package on its own system faster. It does not replace legal review, governance review, or final sign-off.",
        },
        {
          q: "When should I move beyond self-serve?",
          a: "Move beyond self-serve when one real system needs a real package and your team does not want to piece the path together alone.",
        },
        {
          q: "Does this replace legal counsel?",
          a: "No. The site and toolkit generate technical evidence and documentation structure. Legal teams still own legal interpretation.",
        },
      ],
    },
    builder: {
      title: "EU AI Act legal draft builder | EU AI Evidence Builder",
      description:
        "Start a first EU AI Act draft section by section for the organization responsible for a high-risk AI system in the EU, including Annex IV technical documentation, risk, logging, oversight, conformity, marking, registration, and declaration sections.",
      headline: "Build your first EU AI Act draft",
      intro:
        "For companies developing or materially modifying high-risk AI systems for the EU market.",
      hideTopAside: true,
      scopeEyebrow: "",
      scopeTitle: "",
      scopePoints: [],
    },
    templates: {
      title: "EU AI Act documentation templates",
      description:
        "Free EU AI Act templates for Articles 9, 10, 12, 13, 14, 15, 16, 17, 22, 43, 47, 48, 49, 72, 73, Annex IV technical documentation, and Annex V declaration content.",
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
      title: "Source docs and public path",
      description:
        "EU starter guide, operator runbooks, Builder entry points, and source-of-truth documentation behind the EU AI Evidence Builder.",
      headline: "Source docs and public path",
      faq: [
        [
          "Which document should I open first?",
          "Open the Builder first if you want to draft the provider-side package. Open the EU starter guide first if you want to test the lightweight EU path on your own agent.",
        ],
        [
          "Do I need to read raw JSON first?",
          "No. Start with the readable Builder and starter pages. The JSON artifacts stay available as the deeper technical layer.",
        ],
        [
          "Are the docs aligned across English, German, and French?",
          "Yes. The site publishes the same core pages and proof paths across all three languages, while keeping exact artifact filenames unchanged.",
        ],
      ],
    },
    contact: {
      title: "Contact the team",
      description:
        "Ask for help, open the EU starter, or inspect the open-source repository for the EU AI Evidence Builder.",
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
      technical: "Technischer Ueberblick",
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
      liveDemos: "Builder oeffnen",
      proofLabel: "Oeffentlicher Pfad",
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
      viewProof: "EU-Starter oeffnen",
      viewDemo: "Beispielpaket ansehen",
      bookCall: "Pilot prüfen",
    },
    landing: {
      title: "EU KI-Verordnung Nachweispaket | Hochrisiko-KI-Compliance fuer August 2026",
      description:
        "Bauen Sie den provider-seitigen Dokumentationspfad der EU-KI-Verordnung fuer Hochrisiko-KI-Systeme mit rechtsnahen Entwuerfen, Pflichtabschnitten und unterstuetzenden Unterlagen fuer das konkrete KI-System und seine Version.",
      keywords:
        "KI-Verordnung August 2026, Hochrisiko KI Nachweis, KI Konformitaetsbewertung, KI-Verordnung Dokumentation, Versicherung KI Compliance, Recruiting KI Compliance, Gesundheitswesen KI, Finanz KI, DSGVO KI",
      heroTitle: "Der 2. August 2026 kommt. Kann Ihr KI-System Nachweise an Reviewende uebergeben?",
      heroText:
        "Bauen Sie den provider-seitigen Dokumentationspfad der EU-KI-Verordnung fuer Hochrisiko-KI-Systeme mit rechtsnahen Entwuerfen, Pflichtabschnitten und unterstuetzenden Unterlagen fuer das konkrete KI-System und seine Version.",
      heroSubline:
        "Dieser Standardpfad gilt fuer Anbieter von Hochrisiko-KI-Systemen. Pflichten von Importeuren, Haendlern, Deployern und Bevollmaechtigten unterscheiden sich. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Pfad.",
      primaryCta: "Dokumentation starten",
      secondaryCta: "EU-Starter ausprobieren",
      audienceTitle: "Wählen Sie Ihren Einstieg",
      audienceLead:
        "Starten Sie mit der eigentlichen Aufgabe: den EU-Workflow verstehen, den technischen Ueberblick pruefen oder direkt mit dem Paket beginnen.",
      audienceCards: [
        {
          title: "Den EU-Workflow verstehen",
          text:
            "Nutzen Sie diesen Weg, wenn Sie den Dossier-Workflow, die Uebergabe-Logik, die menschlich gefuehrten Teile und die Rolle reviewer-tauglicher Nachweise verstehen muessen.",
          result: "Bester erster Klick fuer Governance, Recht, Beratung und gemischte Review-Teams.",
          cta: "Workflow-Pfad oeffnen",
          href: "how-it-works",
        },
        {
          title: "Die Technologie pruefen",
          text:
            "Sehen Sie die Architektur: wie Nachweise erzeugt, verifiziert und in reviewer-taugliche EU-Dossiers verpackt werden, bevor Ihr Team Zeit im Repository investiert.",
          result: "Bester erster Klick fuer CTOs, Engineering-Leads, Security und technische Due Diligence.",
          cta: "Technischen Ueberblick oeffnen",
          href: "technical",
        },
        {
          title: "Mit dem Paket starten",
          text:
            "Nutzen Sie diesen Weg, wenn Sie die provider-seitigen Pflichtabschnitte fuer ein Hochrisiko-KI-System jetzt entwerfen und das gesetzliche Mindestpaket Artikel fuer Artikel vervollstaendigen wollen.",
          result: "Bester erster Klick fuer Operatoren und Umsetzungsteams mit einem praktischen Startpunkt.",
          cta: "Paket-Pfad oeffnen",
          href: "builder",
        },
      ],
      solutionTitle: "So funktioniert der Dokumentations-Assistent",
      steps: [
        "Pruefen, ob nur Journalisierung im Sinn von Artikel 12 oder ein technisch belastbares Paket fuer Hochrisiko-Pruefung noetig ist.",
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
          text: "Offline-Report, Compare-Report-JSON, signiertes Manifest bei Bedarf, Reviewer-PDF/HTML/Markdown und Archivkontrollen, die ausserhalb der Engineering-Tools uebergeben werden koennen.",
        },
        {
          title: "Dossier-nahe Exporte",
          text: "Anhang-IV-Struktur plus reviewer-orientierte Ausgaben und Gerueste fuer Artikel 9, 13, 17, 72 und 73 mit Bezug zu Ausfuehrungsnachweisen.",
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
      fitMatrixTitle: "Was Teams unter Pruefung normalerweise brauchen",
      fitMatrixLead:
        "Wenn Nachweise Beschaffung, Rechtspruefung, Kundenreview oder Behoerdenanfragen ueberstehen muessen, brauchen Teams meistens mehr als Observability oder statische Dokumente.",
      fitMatrixHeaders: ["Was Teams brauchen", "Basis-Logs", "SaaS-Dashboard / Eval-Tool", "Checklist / PDF-Tool", "Dieses Produkt"],
      fitMatrixRows: [
        [
          "Lesbares Reviewer-Dossier",
          "Nein",
          "Teilweise",
          "Ja",
          "Ja",
        ],
        [
          "Nachweise bleiben an echte Runtime-Runs gebunden",
          "Teilweise",
          "Teilweise",
          "Nein",
          "Ja",
        ],
        [
          "Maschinenverifizierbare Nachweiskette",
          "Nein",
          "Teilweise",
          "Nein",
          "Ja",
        ],
        [
          "Selbst gehostete Nachweisgrenze",
          "Ja",
          "Nein",
          "Teilweise",
          "Ja",
        ],
        [
          "Kontrollierte Uebergabe ausserhalb von Engineering",
          "Nein",
          "Teilweise",
          "Nein",
          "Ja",
        ],
        [
          "Reviewer-PDF / HTML / Markdown",
          "Nein",
          "Teilweise",
          "Teilweise",
          "Ja",
        ],
        [
          "Pruefprotokoll und Abschlusschecks",
          "Nein",
          "Teilweise",
          "Nein",
          "Ja",
        ],
        [
          "Behoerdentaugliches Paket bei Bedarf",
          "Nein",
          "Nein",
          "Nein",
          "Ja",
        ],
      ],
      proofTitle: "Waehlen Sie den naechsten Schritt",
      proofBody:
        "Starten Sie im Builder, oeffnen Sie den EU-Starter oder pruefen Sie den technischen Ueberblick, bevor Ihr Team Zeit im Repository investiert.",
      faq: [
        [
          "Wann beginnt die EU-KI-Verordnung fuer Hochrisiko-KI?",
          "Stand 28. Maerz 2026 ist der zentrale Anwendungszeitpunkt fuer die meisten Hochrisiko-KI-Systeme aus Anhang III der 2. August 2026. Bestimmte Pfade nach Artikel 6 Absatz 1 in Verbindung mit Anhang-I-Sicherheitskomponenten greifen ab dem 2. August 2027. Teams mit moeglichem Hochrisiko-Scope sollten 2026 als Betriebsdatum fuer Nachweise, Dokumentation und Review-Workflows behandeln.",
        ],
        [
          "Welche Branchen fallen typischerweise unter Hochrisiko-KI nach Anhang III?",
          "Die breiten Suchbegriffe sind Versicherung, Finanzen, Recruiting, Gesundheitswesen, Bildung, Biometrie, Strafverfolgung, Grenzkontrolle und Justiz. Der rechtliche Scope ist enger als diese Schlagworte: typische Beispiele aus Anhang III sind Recruiting und Arbeitnehmermanagement, Bildungszugang und Bewertung, Kreditpruefung, Risiko- oder Preisbewertung in Lebens- und Krankenversicherung, Notfall-Triage, Biometrie und andere aufgelistete Hochwirkungsfaelle. Die Seite bleibt im Einstieg bewusst breiter und wird hier in der Antwort praeziser.",
        ],
        [
          "Welche EU-AI-Act-Artikel verlangen mehr als Logs und Traces?",
          "Bei Hochrisiko-Systemen helfen Logs nur fuer einen Teil des Pakets. Artikel 11 und Anhang IV verlangen technische Dokumentation; Artikel 12 verlangt Journalisierung; Artikel 13 verlangt Informationen fuer Deployers; Artikel 14 verlangt menschliche Aufsicht; Artikel 17 verlangt ein dokumentiertes Qualitaetsmanagementsystem; Artikel 72 verlangt einen Post-Market-Monitoring-Plan; und Artikel 47 zusammen mit Anhang V verlangt eine EU-Konformitaetserklaerung. Genau deshalb gibt es hier ein prueffertiges Paket: weil diese Pflichten gemeinsam einer Pruefung standhalten muessen.",
        ],
        [
          "Warum reichen Basis-Logs nicht fuer die Pruefung von Hochrisiko-KI aus?",
          "Weil Hochrisiko-Review mehr als Runtime-Rueckverfolgbarkeit braucht. Artikel-12-Journalisierung ist wichtig, aber Teams koennen trotzdem technische Dokumentation, Deployers-Informationen, Materialien fuer menschliche Aufsicht, Monitoring-Ausgaben und ein konformitaetsfaehiges Paket brauchen, das eine andere Person wirklich lesen und verifizieren kann. Logs sind noetig, aber nicht das ganze Deliverable.",
        ],
        [
          "Gilt dieser Standardpfad fuer Importeure, Haendler, Deployers oder Bevollmaechtigte?",
          "Nein. Der Standardpfad auf dieser Website ist der provider-seitige Pfad fuer Hochrisiko-KI-Systeme. Diese anderen Rollen haben eigene Pflichten. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Provider-Pfad. Wenn der Anbieter ausserhalb der Union niedergelassen ist, kommt Artikel 22 als Pflicht zum Bevollmaechtigten auf denselben Provider-Pfad hinzu.",
        ],
        [
          "Warum reicht ein SaaS-Dashboard oder Eval-Tool fuer EU-AI-Act-Nachweise nicht aus?",
          "Weil die meisten SaaS-Observability- und Eval-Oberflaechen fuer interne Inspektion gebaut sind, nicht fuer kontrollierte reviewer-taugliche Uebergabe. Sie koennen nuetzliche Inputs sein, loesen aber meist weder Offline-Dossier, Pruefprotokoll, Offenlegungsgrenzen noch ein maschinenverifizierbares Bundle fuer andere Reviewende ausserhalb des Ursprungs-Stacks.",
        ],
        [
          "Warum braucht ein reviewer-taugliches Paket mehr als eine Checklist oder ein PDF?",
          "Weil ein Checklist- oder statisches PDF-Tool ein System beschreiben kann, ohne mit den Runtime-Nachweisen verbunden zu bleiben, die die Aussagen tragen. Hochrisiko-Review wird genau dann schmerzhaft, wenn Dokumentebene und Nachweis-Ebene auseinanderlaufen. Der Punkt hier ist, beide verbunden zu halten.",
        ],
        [
          "Was fuegt dieses Produkt ueber Logs, SaaS-Dashboards und PDF-Tools hinaus hinzu?",
          "Es fuegt genau die Schicht hinzu, die einfachere Tools meist offenlassen: ein lesbares Reviewer-Dossier, eine maschinenverifizierbare Nachweiskette, selbst gehostete Reviewer-Ausgaben, einen kontrollierten Uebergabepfad ausserhalb von Engineering und ein Paket, das an echte Runtime-Runs gebunden bleibt statt in Screenshots oder Copy-Paste zu zerfallen.",
        ],
        [
          "Verlassen Laufzeitdaten, Prompts oder Nachweise unsere Umgebung?",
          "Nein. Der Kern-Workflow ist so gebaut, dass Laufzeit-Nachweise, Paketierung, Verifikation und Reviewer-Ausgaben innerhalb Ihrer kontrollierten Umgebung bleiben koennen.",
        ],
        [
          "Ersetzt das rechtliche Pruefung oder die finale Freigabe?",
          "Nein. Das Produkt automatisiert Nachweisbetrieb, reviewer-taugliche Paketierung und dossier-nahe Exporte. Rechtsklassifizierung, Rest-Risiko-Urteil und finale Freigabe bleiben menschlich gefuehrt.",
        ],
        [
          "In welchen Formaten kann das Paket an Reviewende uebergeben werden?",
          "Die reviewer-orientierte Schicht steht als PDF, HTML und Markdown bereit, darunter liegen maschinenverifizierbare JSON-Artefakte und dossier-nahe Exporte. So koennen nichttechnische Reviewende mit dem lesbaren Dossier beginnen, waehrend technische Reviewende die zugrunde liegende Nachweiskette weiter pruefen koennen.",
        ],
      ],
    },
    how: {
      title: "Wie man EU-KI-Verordnung Dokumente und Nachweise fuer die Pruefung vorbereitet",
      description:
        "Verstehen Sie, was Ihr Team zuerst vorbereiten muss, was der Workflow automatisch organisiert, was menschliche Pruefung bleibt und was Reviewende am Ende erhalten.",
      keywords:
        "EU KI-Verordnung Dokumentation vorbereiten, KI Hochrisiko Dokumentationsprozess, EU KI-Verordnung Workflow, welche Dokumente fuer KI-Verordnung noetig sind, KI Compliance Prozess",
      headline: "Wie man EU-KI-Verordnung Dokumente und Nachweise fuer die Pruefung vorbereitet",
      intro:
        "Nutzen Sie diese Seite, wenn Sie den Dokumentationsprozess vor dem Start verstehen muessen: was Ihr Team zuerst vorbereitet, was der Workflow automatisch organisiert, was menschliche Pruefung bleibt und was Reviewende am Ende erhalten.",
      summaryTitle: "Was fuer die Pruefung nach der EU-KI-Verordnung vorbereitet werden muss",
      summaryLead:
        "Das ist die kuerzeste Sicht darauf, was Ihr Team zuerst liefert, was der Workflow automatisch organisiert, was menschliche Pruefung bleibt und was eine reviewende Person am Ende erhalten sollte.",
      summaryColumns: [
        {
          title: "Ihr Team liefert",
          points: [
            "Systemrahmen, Verwendungszweck, verantwortliche Personen und Einsatzkontext",
            "Dossier-Abschnitte, die Erklaerungen, Grenzen und Referenzen brauchen",
            "Review-Erwartungen, die bestimmen, wie viel technische Unterstuetzung noetig ist",
          ],
        },
        {
          title: "Automatisch organisiert",
          points: [
            "Dossier-Struktur und Validierung",
            "Technische Materialien mit Bezug auf dasselbe Paket",
            "Review-Uebergabe und Behoerdenpaket bei Bedarf",
          ],
        },
        {
          title: "Bleibt bei Menschen",
          points: [
            "Rechtliche Einordnung und Scope-Bestaetigung",
            "Geschaeftsschaeden und Rest-Risiko-Urteil",
            "Finale Formulierung, Freigabe und Sign-off",
          ],
        },
        {
          title: "Reviewende erhalten",
          points: [
            "Ein lesbares Dossier fuer die Pruefung",
            "Verknuepfte technische Materialien und Reviewer-PDF/HTML/Markdown",
            "Ein Uebergabepaket, wenn Kunden-, Rechts- oder Behoerdenpruefung noetig ist",
          ],
        },
      ],
      inputsTitle: "Was Ihr Team vor dem Start braucht",
      inputsLead:
        "Der Prozess beginnt mit Informationen, die Ihr Team bereits kennt. Der Workflow kann Systemgrenze, verantwortliche Personen und Verwendungszweck nicht selbst erfinden.",
      inputCards: [
        ["Systemrahmen", "Systemgrenze, Verwendungszweck, verantwortliche Personen und Einsatzkontext."],
        ["Dossier-Abschnitte", "Die Abschnitte, die Erklaerungen, Annahmen, Grenzen und Referenzen brauchen."],
        ["Review-Erwartungen", "Release- oder Governance-Erwartungen, die bestimmen, wie viel technische Unterstuetzung noetig ist."],
      ],
      workflowTitle: "Wie der Dokumentationsprozess funktioniert",
      workflowLead:
        "Das Ziel ist einfach: Informationen sammeln, die Ihr Team fuer den provider-seitigen Pfad bereits kennt, technische Materialien aus realen Runs anhaengen und am Ende einen geordneten Satz von Unterlagen fuer die Pruefung erhalten.",
      workflowSteps: [
        "Beschreiben Sie das System, seinen Verwendungszweck und die verantwortlichen Personen.",
        "Fuegen Sie die Erklaerungen, Grenzen und Referenzen hinzu, die fuer die Pruefung gebraucht werden.",
        "Haengen Sie technische Materialien aus realen Runs an und machen Sie daraus ein geordnetes Paket fuer die Pruefung.",
      ],
      outputsTitle: "Was Reviewende am Ende erhalten",
      outputsLead: "Das Ergebnis sollte leicht pruefbar sein und nicht nur technisch korrekt.",
      outputCards: [
        ["Dossier-Struktur", "Ein Paket, das nach den Abschnitten organisiert ist, die Erklaerungen, Annahmen, Grenzen und Referenzen brauchen."],
        ["Technische Materialien", "Portabler Report, verknuepfte technische Materialien, Reviewer-PDF/HTML/Markdown und maschinenlesbare Nachweise darunter."],
        ["Review-Uebergabe", "Strukturiertes Pruefprotokoll und bei Bedarf ein abgegrenztes Paket fuer Kunden-, Rechts-, Beschaffungs- oder Behoerdenpruefung."],
      ],
      boundaryTitle: "Was weiterhin menschliche Pruefung und Freigabe braucht",
      boundaryLead:
        "Der Workflow organisiert das Paket. Er nimmt aber keine rechtliche, Governance- oder Freigabeverantwortung ab.",
      boundaryPoints: [
        "Rechtliche Klassifizierung und finale Freigabe bleiben bei benannten Personen.",
        "Urteile zu Geschaeftsschaeden und Rest-Risiko bleiben beim Operator.",
        "Deployer-orientierte Formulierungen und Release-Abwaegungen brauchen weiterhin menschliche Owner.",
      ],
      screenshotTitle: "Was Reviewende am Ende sehen",
      screenshotBody:
        "Das Ergebnis sollte fuer eine andere Person lesbar sein, ohne interne Systeme oder Engineering-Tools oeffnen zu muessen.",
      proofTitle: "Waehlen Sie den naechsten Schritt",
      proofBody:
        "Starten Sie das Paket, wenn Sie mit dem Entwurf beginnen wollen, oeffnen Sie das Live-Beispiel fuer Reviewende, wenn Sie zuerst das Ergebnis sehen wollen, oder oeffnen Sie den technischen Ueberblick fuer die Implementierungsseite.",
      faq: [
        [
          "Welche Dokumente muessen fuer eine Pruefung nach der EU-KI-Verordnung vorbereitet werden?",
          "Die meisten Teams brauchen ein lesbares Dossier, technische Materialien aus realen Runs und die Abschnitte, die weiterhin menschliche Erklaerung, Freigabe oder Sign-off verlangen. Die genaue Mischung haengt von Systemgrenze, Verwendungszweck und dem geplanten Review-Pfad ab.",
        ],
        [
          "Gilt diese Workflow-Seite fuer Deployers, Importeure, Haendler oder Bevollmaechtigte?",
          "Nein. Diese Workflow-Seite folgt dem provider-seitigen Dokumentationspfad fuer Hochrisiko-KI-Systeme. Andere Rollen haben eigene Pflichten. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Pfad. Wenn der Anbieter ausserhalb der Union niedergelassen ist, fuegen Sie denselben Provider-Unterlagen den Artikel-22-Eintrag fuer den Bevollmaechtigten hinzu.",
        ],
        [
          "Was braucht mein Team vor dem Start des Dokumentations-Workflows?",
          "Ihr Team muss Systemgrenze, Verwendungszweck, verantwortliche Personen, Einsatzkontext und die Dossier-Abschnitte festlegen, die Erklaerungen, Grenzen oder Referenzen brauchen. Diese Eingaben kann der Workflow nicht selbst erfinden.",
        ],
        [
          "Wie funktioniert der Dokumentations-Workflow nach der EU-KI-Verordnung Schritt fuer Schritt?",
          "Zuerst bestaetigen Sie Scope und Review-Kontext. Dann entwerfen Sie die Abschnitte, die menschliche Erklaerung brauchen. Danach werden technische Materialien aus realen Runs an dasselbe Paket angehaengt, Struktur und Vollstaendigkeit geprueft und ein geordnetes Paket an die naechste reviewende Person uebergeben.",
        ],
        [
          "Was wird automatisch erzeugt und was bleibt menschliche Pruefung?",
          "Der Workflow kann die Dossier-Struktur ordnen, technische Materialien anhaengen und reviewer-orientierte Ausgaben vorbereiten. Rechtliche Einordnung, Rest-Risiko-Urteil, deployer-orientierte Formulierungen und finale Freigabe bleiben bei benannten Personen.",
        ],
        [
          "Was erhalten Reviewende am Ende?",
          "Reviewende sollten ein lesbares Dossier, verknuepfte technische Materialien, Reviewer-PDF- oder HTML-Ausgaben und bei Bedarf ein abgegrenztes Uebergabepaket fuer Kunden-, Rechts-, Beschaffungs- oder Behoerdenpruefung erhalten.",
        ],
        [
          "Kann ein einzelner Workflow sowohl Dokumente als auch technische Materialien erzeugen?",
          "Ja. Der Workflow soll lesbare Review-Dokumente und die technischen Materialien im selben Paket zusammenhalten, damit sie nicht auseinanderlaufen.",
        ],
        [
          "Bleiben Laufzeitdaten und Nachweise in unserer Umgebung?",
          "Ja. Der Kern-Workflow ist so gebaut, dass Laufzeit-Nachweise, Verifikation und Reviewer-Ausgaben innerhalb Ihrer kontrollierten Umgebung bleiben koennen.",
        ],
        [
          "Ersetzt das rechtliche Pruefung oder die finale Freigabe?",
          "Nein. Der Workflow organisiert das Paket und seine technische Unterstuetzung, aber rechtliche Einordnung und finale Freigabe bleiben menschliche Verantwortung.",
        ],
      ],
    },
    pricing: {
      title: "Preise fuer EU AI Act Nachweise",
      description:
        "Kostenloser OSS-Selbstbetrieb, optionale bezahlte Hilfe fuer das erste echte Paket und Enterprise-Begleitung fuer groessere EU-AI-Act-Arbeit.",
      headline: "Kostenlos starten. Nur dann bezahlen, wenn Ihr Team Hilfe fuer das erste echte Paket braucht.",
      lead:
        "Der OSS-Kern ist kostenlos. Bezahlte Hilfe ist fuer Teams gedacht, die das erste echte Paket auf ihrem eigenen System schneller erreichen wollen. Enterprise passt fuer breiteren Rollout oder formale Pruefung.",
      subscriptionsLabel: "Kommerzielle Wege",
      entryTitle: "Mit OSS starten",
      entryLead:
        "Nutzen Sie den kostenlosen Weg, wenn Sie das Produkt pruefen, den Schnellstart auf Ihrem eigenen Agenten ausfuehren und erst dann entscheiden wollen, ob der Workflow in Ihren Stack gehoert.",
      launchEyebrow: "Bezahlte Hilfe",
      launchTitle: "Brauchen Sie Hilfe fuer das erste Paket auf Ihrem eigenen System?",
      launchLead:
        "Nutzen Sie den bezahlten Weg, wenn Ihr Team Hilfe beim Anschluss des eigenen Systems, bei der ersten Einrichtung und beim ersten echten Paket braucht.",
      tiersEyebrow: "Enterprise",
      tiersTitle: "Brauchen Sie breitere Begleitung?",
      tiersLead:
        "Enterprise passt, wenn die Arbeit mehrere Systeme, mehrere Teams oder formale Pruefung und Beschaffung umfasst.",
      fitTitle: "Waehlen Sie den Weg passend zu Ihrem Reifegrad",
      fitLead:
        "Der erste Schritt soll einfach bleiben. Bleiben Sie im Selbstbetrieb, solange es reicht. Zahlen Sie nur dann, wenn Ihr Team Hilfe fuer den Weg vom Test zum echten Paket braucht.",
      fitCards: [
        ["Beim Selbstbetrieb bleiben", "Repo, Schnellstart, Dokumentation und Demos reichen aus, solange Sie den Workflow selbst pruefen oder betreiben koennen."],
        ["Bezahlte Hilfe nutzen", "Das ist der richtige Weg, wenn ein System schnell zu einem echten ersten Paket kommen soll, ohne dass Ihr Team den Pfad allein suchen muss."],
        ["Enterprise nutzen", "Hier passt es, wenn Pruefungen extern, systemuebergreifend, konformitaetsnah oder wiederkehrend unter hoher Kontrolle laufen muessen."],
      ],
      faq: [
        {
          q: "Müssen Modell oder Daten geteilt werden?",
          a: "Nein. Die technische Nachweiserzeugung bleibt bei Ihnen gehostet.",
        },
        {
          q: "Womit sollte ich anfangen?",
          a: "OSS passt fuer die erste Eignungspruefung oder fuer Teams, die den Workflow selbst betreiben koennen. Bezahlte Hilfe passt, wenn ein System schnell zu einem echten ersten Paket kommen soll. Enterprise ist fuer teamuebergreifende oder externe Pruefungen gedacht.",
        },
        {
          q: "Was kaufe ich mit bezahlter Hilfe genau?",
          a: "Bezahlte Hilfe bringt Ihr Team schneller durch das erste echte Paket auf dem eigenen System. Vollstaendiges Case-Design, Governance-Pruefung und rechtliche Freigabe ersetzt sie nicht.",
        },
        {
          q: "Wann sollte ich ueber den Selbstbetrieb hinausgehen?",
          a: "Dann, wenn Ihr Team das erste echte Paket auf dem eigenen System braucht und den Pfad nicht allein zusammensetzen will.",
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
        "Schritt-fuer-Schritt-Assistent fuer den provider-seitigen Mindestpfad nach der EU-KI-Verordnung bei Hochrisiko-KI-Systemen.",
      headline: "Erstellen Sie den provider-seitigen Entwurf Ihres EU-AI-Act-Pakets",
      intro:
        "Nutzen Sie diese Seite, um zuerst den schriftlichen provider-seitigen Mindestentwurf fuer ein Hochrisiko-KI-System zu erstellen. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, ist dies der richtige Pfad.",
      scopeEyebrow: "Nur Provider-Pfad",
      scopeTitle: "Diese Seite erstellt nur den schriftlichen provider-seitigen Entwurf",
      scopePoints: [
        "Der Standardpfad gilt fuer Anbieter von Hochrisiko-KI-Systemen.",
        "Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Pfad.",
        "Wenn der Anbieter ausserhalb der Union niedergelassen ist, fuegen Sie den Artikel-22-Eintrag fuer den Bevollmaechtigten hinzu, sofern erforderlich.",
      ],
    },
    templates: {
      title: "EU-KI-Verordnung Vorlagen",
      description:
        "Vorlagen fuer provider-seitige Artikel der EU-KI-Verordnung, einschliesslich Artikel 22, wenn der Anbieter ausserhalb der Union niedergelassen ist.",
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
      faq: [
        [
          "Welches Dokument sollte ich zuerst oeffnen?",
          "Oeffnen Sie zuerst das Live-Reviewer-Dossier, wenn Sie die EU-Ausgabe sehen wollen. Oeffnen Sie zuerst den Schnellstart, wenn Sie den Workflow am eigenen Agenten pruefen wollen.",
        ],
        [
          "Muss ich zuerst rohes JSON lesen?",
          "Nein. Das Reviewer-Dossier ist die vorgesehene erste Leseflaeche. Die JSON-Artefakte bleiben als tiefere technische Ebene verlinkt.",
        ],
        [
          "Sind die Inhalte in Englisch, Deutsch und Franzoesisch abgestimmt?",
          "Ja. Die Site veroeffentlicht dieselben Kernseiten und Nachweispfade in allen drei Sprachen, waehrend exakte Artefaktnamen unveraendert bleiben.",
        ],
      ],
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
      technical: "Vue technique",
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
      liveDemos: "Ouvrir le builder",
      proofLabel: "Parcours public",
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
      viewProof: "Ouvrir le starter UE",
      viewDemo: "Voir un package exemple",
      bookCall: "Verifier le pilote",
    },
    landing: {
      title: "Dossier de preuve EU AI Act | Conformite IA a haut risque pour aout 2026",
      description:
        "Construisez le parcours de documentation cote fournisseur du EU AI Act pour les systemes d'IA a haut risque, avec des brouillons ancrés dans le droit, des sections obligatoires et des pieces d'appui pour le systeme d'IA concerne et sa version.",
      keywords:
        "EU AI Act aout 2026, IA haut risque preuve, outil conformite IA, documentation EU AI Act, assurance IA conformite, recrutement IA conformite, sante IA, finance IA, RGPD IA",
      heroTitle: "Le 2 aout 2026 approche. Votre systeme IA peut-il remettre une preuve a un evaluateur ?",
      heroText:
        "Construisez le parcours de documentation cote fournisseur du EU AI Act pour les systemes d'IA a haut risque, avec des brouillons ancrés dans le droit, des sections obligatoires et des pieces d'appui pour le systeme d'IA concerne et sa version.",
      heroSubline:
        "Le parcours par defaut ici concerne les fournisseurs de systemes d'IA a haut risque. Les obligations des importateurs, distributeurs, deployeurs et representants autorises sont differentes. Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours.",
      primaryCta: "Commencer le dossier",
      secondaryCta: "Essayer le starter UE",
      audienceTitle: "Choisissez votre point d'entree",
      audienceLead:
        "Commencez par le vrai travail a accomplir: comprendre le workflow EU, inspecter la vue technique, ou commencer le dossier.",
      audienceCards: [
        {
          title: "Comprendre le workflow EU",
          text:
            "Utilisez ce parcours si vous devez comprendre le flux dossier, la logique de transmission, ce qui reste humain, et ou viennent se rattacher les preuves lisibles par un evaluateur.",
          result: "Meilleur premier clic pour gouvernance, juridique, conseil et equipes de revue mixtes.",
          cta: "Ouvrir le parcours workflow",
          href: "how-it-works",
        },
        {
          title: "Inspecter la technologie",
          text:
            "Voyez l'architecture : comment la preuve est generee, verifiee et transformee en dossier EU lisible par un evaluateur avant que votre equipe ne passe du temps dans le repo.",
          result: "Meilleur premier clic pour CTO, engineering leads, securite et due diligence technique.",
          cta: "Ouvrir la vue technique",
          href: "technical",
        },
        {
          title: "Commencer le dossier",
          text:
            "Utilisez ce parcours si vous voulez deja rediger les sections obligatoires cote fournisseur pour un systeme d'IA a haut risque et completer le package legal minimum article par article.",
          result: "Meilleur premier clic pour les operateurs et responsables de mise en oeuvre qui ont besoin d'un point de depart pratique.",
          cta: "Ouvrir le parcours dossier",
          href: "builder",
        },
      ],
      solutionTitle: "Comment fonctionne l'assistant de documentation",
      steps: [
        "Verifier si le systeme a seulement besoin d'une journalisation de type article 12 ou d'un dossier technique capable de tenir sous examen a haut risque.",
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
          text: "Rapport hors ligne, compare-report JSON, manifeste signe si necessaire, reviewer PDF/HTML/Markdown et controles de retention qui restent exploitables lors d'une transmission hors des outils d'ingenierie.",
        },
        {
          title: "Exports orientes dossier",
          text: "Structure Annexe IV plus sorties orientees relecteur et brouillons pour les articles 9, 13, 17, 72 et 73 relies aux preuves d'execution.",
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
      fitMatrixTitle: "Ce dont les equipes ont generalement besoin sous revue",
      fitMatrixLead:
        "Quand la preuve doit survivre aux achats, au juridique, a la revue client ou a une autorite, les equipes ont generalement besoin de plus que d'observabilite ou de documents statiques.",
      fitMatrixHeaders: ["Ce dont les equipes ont besoin", "Logs de base", "Dashboard SaaS / outil d'evaluation", "Checklist / outil PDF", "Ce produit"],
      fitMatrixRows: [
        [
          "Dossier reviewer lisible",
          "Non",
          "Partiel",
          "Oui",
          "Oui",
        ],
        [
          "Preuve liee a de vrais runs d'execution",
          "Partiel",
          "Partiel",
          "Non",
          "Oui",
        ],
        [
          "Chaine de preuve machine-verifiable",
          "Non",
          "Partiel",
          "Non",
          "Oui",
        ],
        [
          "Perimetre de preuve heberge chez vous",
          "Oui",
          "Non",
          "Partiel",
          "Oui",
        ],
        [
          "Transmission controlee hors de l'ingenierie",
          "Non",
          "Partiel",
          "Non",
          "Oui",
        ],
        [
          "Reviewer PDF / HTML / Markdown",
          "Non",
          "Partiel",
          "Partiel",
          "Oui",
        ],
        [
          "Trace de revue et checks de completion",
          "Non",
          "Partiel",
          "Non",
          "Oui",
        ],
        [
          "Package pret pour une autorite si necessaire",
          "Non",
          "Non",
          "Non",
          "Oui",
        ],
      ],
      proofTitle: "Choisissez l'etape suivante",
      proofBody:
        "Commencez dans le builder, ouvrez le starter UE ou consultez la vue technique avant que votre equipe ne passe du temps dans le repository.",
      faq: [
        [
          "Quand le EU AI Act commence-t-il pour l'IA a haut risque ?",
          "Au 28 mars 2026, la date principale d'application pour la plupart des systemes IA a haut risque relevant de l'Annexe III est le 2 aout 2026. Certaines voies relevant de l'article 6(1) et de produits-composants de securite de l'Annexe I s'appliquent a partir du 2 aout 2027. Les equipes qui peuvent tomber dans le scope haut risque devraient traiter 2026 comme la date operationnelle pour la preuve, la documentation et la revue.",
        ],
        [
          "Quels secteurs tombent le plus souvent dans les systemes IA a haut risque de l'Annexe III ?",
          "Les grandes familles de recherche sont l'assurance, la finance, le recrutement, la sante, l'education, la biometrie, l'application de la loi, le controle aux frontieres et la justice. Le scope juridique est plus etroit que ces mots-cles : les exemples frequents de l'Annexe III couvrent le recrutement et la gestion des travailleurs, l'acces et l'evaluation dans l'education, l'evaluation de la solvabilite, l'evaluation du risque ou du prix en assurance vie ou sante, le triage d'urgence, la biometrie et d'autres usages a fort impact listes par le texte. Le site reste volontairement plus large en entree et plus precis dans cette reponse.",
        ],
        [
          "Quels articles du EU AI Act exigent plus que des logs et des traces ?",
          "Pour les systemes a haut risque, les logs ne couvrent qu'une partie du dossier. L'article 11 et l'Annexe IV exigent une documentation technique ; l'article 12 exige la journalisation ; l'article 13 exige des informations pour les deployeurs ; l'article 14 exige la supervision humaine ; l'article 17 exige un systeme de gestion de la qualite documente ; l'article 72 exige un plan de suivi post-marche ; et l'article 47 avec l'Annexe V exige une declaration UE de conformite. Le produit existe parce que ces obligations doivent tenir ensemble sous revue.",
        ],
        [
          "Pourquoi les logs de base ne suffisent-ils pas pour la revue d'une IA a haut risque ?",
          "Parce que la revue haut risque demande plus que la tracabilite d'execution. La journalisation de l'article 12 compte, mais les equipes peuvent quand meme avoir besoin de documentation technique, d'informations pour les deployeurs, de materiel de supervision humaine, de sorties de monitoring et d'un package oriente conformite qu'un autre evaluateur peut reellement lire et verifier. Les logs sont necessaires, mais ils ne constituent pas tout le livrable.",
        ],
        [
          "Ce parcours par defaut vaut-il pour les importateurs, distributeurs, deployeurs ou representants autorises ?",
          "Non. Le parcours par defaut sur ce site est le parcours cote fournisseur pour les systemes d'IA a haut risque. Ces autres roles ont leurs propres obligations. Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours. Si le fournisseur est etabli hors de l'Union, l'article 22 ajoute la charge du representant autorise au meme parcours fournisseur.",
        ],
        [
          "Pourquoi un dashboard SaaS ou une plateforme d'evaluation ne suffit-il pas pour la preuve EU AI Act ?",
          "Parce que la plupart des surfaces SaaS d'observabilite ou d'evaluation sont concues pour l'inspection interne, pas pour remettre un package lisible et portable a d'autres equipes. Elles peuvent aider, mais elles ne resolvent en general ni le dossier hors ligne, ni la frontiere de divulgation, ni le bundle machine-verifiable qu'un autre evaluateur peut verifier hors de la pile d'origine.",
        ],
        [
          "Pourquoi un package lisible demande-t-il plus qu'une checklist ou un PDF ?",
          "Parce qu'une checklist ou un PDF statique peut decrire un systeme sans rester lie a la preuve d'execution qui soutient les affirmations. La revue haut risque devient douloureuse quand la couche documentaire et la couche de preuve se detachent. Le but ici est de les garder reliees.",
        ],
        [
          "Qu'est-ce que ce produit ajoute par rapport aux logs, aux dashboards SaaS et aux outils PDF ?",
          "Il ajoute la couche que les outils plus simples laissent souvent manquer : un package lisible, une chaine de preuve machine-verifiable, des sorties hebergees chez vous, un chemin de transmission controle hors de l'ingenierie, et un package qui reste relie a de vrais runs d'execution au lieu de glisser vers des captures d'ecran ou du copier-coller.",
        ],
        [
          "Est-ce que les donnees d'execution, les prompts ou les preuves quittent notre environnement ?",
          "Non. Le workflow principal est concu pour fonctionner dans votre propre environnement, de sorte que les preuves d'execution, la mise en forme, la verification et les sorties du package peuvent rester dans votre perimetre controle.",
        ],
        [
          "Est-ce que cela remplace la revue legale ou la validation finale ?",
          "Non. Le produit automatise les operations de preuve, la mise en forme lisible par un evaluateur et les exports orientes dossier. La classification legale, le jugement sur le risque residuel et la validation finale restent humains.",
        ],
        [
          "Dans quels formats le package peut-il etre remis aux evaluateurs ?",
          "La couche orientee evaluateur est disponible en PDF, HTML et Markdown, avec dessous des artefacts JSON machine-verifiables et des exports orientes dossier. Les relecteurs non techniques peuvent donc commencer par le dossier lisible, tandis que les relecteurs techniques peuvent verifier la chaine de preuve sous-jacente.",
        ],
      ],
    },
    how: {
      title: "Comment preparer les documents et preuves EU AI Act pour la revue",
      description:
        "Comprenez ce que votre equipe doit preparer d'abord, ce que le workflow organise automatiquement, ce qui reste humain et ce qu'un evaluateur recoit a la fin.",
      keywords:
        "preparer documentation EU AI Act, workflow documentation IA haut risque, quels documents pour EU AI Act, processus conformite IA, preparation revue IA",
      headline: "Comment preparer les documents et preuves EU AI Act pour la revue",
      intro:
        "Utilisez cette page si vous devez comprendre le processus de documentation avant de commencer : ce que votre equipe prepare d'abord, ce que le workflow organise automatiquement, ce qui reste humain et ce qu'un evaluateur recoit a la fin.",
      summaryTitle: "Ce qui doit etre prepare pour la revue EU AI Act",
      summaryLead:
        "Voici la vue la plus courte de ce que votre equipe fournit d'abord, de ce que le workflow organise automatiquement, de ce qui reste humain et de ce qu'un evaluateur devrait recevoir a la fin.",
      summaryColumns: [
        {
          title: "Votre equipe fournit",
          points: [
            "Perimetre du systeme, finalite prevue, responsables et contexte de deploiement",
            "Sections du dossier qui demandent explications, limites et references",
            "Attentes de revue qui determinent le niveau de support technique necessaire",
          ],
        },
        {
          title: "Organise automatiquement",
          points: [
            "Structure du dossier et validation",
            "Materiaux techniques relies au meme package",
            "Transmission pour la revue et package autorite si necessaire",
          ],
        },
        {
          title: "Reste humain",
          points: [
            "Interpretation legale et confirmation du scope",
            "Jugement sur les dommages metier et le risque residuel",
            "Formulation finale, approbation et validation",
          ],
        },
        {
          title: "L'evaluateur recoit",
          points: [
            "Un dossier lisible organise pour la revue",
            "Des materiaux techniques relies et reviewer PDF/HTML/Markdown",
            "Un package de transmission si une revue client, juridique ou autorite est necessaire",
          ],
        },
      ],
      inputsTitle: "Ce dont votre equipe a besoin avant de commencer",
      inputsLead:
        "Le processus commence par des informations que votre equipe connait deja. Le workflow ne peut pas inventer seul le perimetre du systeme, les responsables ou la finalite prevue.",
      inputCards: [
        ["Perimetre du systeme", "Perimetre systeme, finalite prevue, responsables et contexte de deploiement."],
        ["Sections du dossier", "Les sections qui demandent explications, hypotheses, limites et references."],
        ["Attentes de revue", "Les attentes de mise en production ou de gouvernance qui definissent le niveau de support technique necessaire."],
      ],
      workflowTitle: "Comment fonctionne le processus de documentation",
      workflowLead:
        "Le but est simple : rassembler les informations que votre equipe connait deja pour le parcours cote fournisseur, rattacher les materiaux issus de vrais runs et finir avec un ensemble de documents organise pour la revue.",
      workflowSteps: [
        "Decrivez le systeme, sa finalite prevue et les personnes responsables.",
        "Ajoutez les explications, limites et references dont la revue a besoin.",
        "Rattachez les materiaux issus de vrais runs et transformez le tout en un package organise pour la revue.",
      ],
      outputsTitle: "Ce que l'evaluateur recoit a la fin",
      outputsLead: "Le resultat doit etre facile a relire, pas seulement techniquement correct.",
      outputCards: [
        ["Structure du dossier", "Un package organise selon les sections qui demandent explications, hypotheses, limites et references."],
        ["Materiaux techniques", "Rapport portable, materiaux techniques relies, reviewer PDF/HTML/Markdown et preuves lisibles par machine en dessous."],
        ["Transmission pour la revue", "Trace de revue structuree et, si besoin, package cible pour revue client, juridique, achats ou autorite."],
      ],
      boundaryTitle: "Ce qui demande encore une revue et une validation humaines",
      boundaryLead:
        "Le workflow organise le package. Il ne retire pas la responsabilite legale, gouvernance ou d'approbation.",
      boundaryPoints: [
        "La classification legale et la validation finale restent entre des mains nommees.",
        "Les jugements sur les dommages metier et le risque residuel restent chez l'operateur.",
        "Les formulations destinees aux deployeurs et les arbitrages de mise en production demandent encore des responsables humains.",
      ],
      screenshotTitle: "Ce que l'evaluateur voit a la fin",
      screenshotBody:
        "Le resultat doit etre lisible par une autre personne sans ouvrir vos systemes internes ni vos outils d'ingenierie.",
      proofTitle: "Choisissez l'etape suivante",
      proofBody:
        "Commencez le package si vous etes pret a rediger les documents, ouvrez l'exemple live pour voir d'abord le resultat, ou ouvrez la vue technique si votre equipe a besoin de la partie implementation.",
      faq: [
        [
          "Quels documents faut-il preparer pour une revue EU AI Act ?",
          "La plupart des equipes ont besoin d'un dossier lisible, de materiaux techniques issus de vrais runs et des sections qui demandent encore explication humaine, approbation ou validation. Le contenu exact depend du perimetre du systeme, de la finalite prevue et du parcours de revue vise.",
        ],
        [
          "Cette page de workflow vaut-elle pour les deployeurs, importateurs, distributeurs ou representants autorises ?",
          "Non. Cette page suit le parcours de documentation cote fournisseur pour les systemes d'IA a haut risque. Les autres roles ont des obligations differentes. Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours. Si le fournisseur est etabli hors de l'Union, ajoutez au meme package fournisseur l'enregistrement Article 22 du representant autorise.",
        ],
        [
          "De quoi mon equipe a-t-elle besoin avant de commencer le workflow de documentation ?",
          "Votre equipe doit definir le perimetre du systeme, la finalite prevue, les responsables, le contexte de deploiement et les sections du dossier qui demandent explications, limites ou references. Le workflow ne peut pas inventer ces entrees seul.",
        ],
        [
          "Comment le workflow de documentation EU AI Act fonctionne-t-il etape par etape ?",
          "D'abord vous confirmez le scope et le contexte de revue. Ensuite vous redigez les sections qui demandent une explication humaine. Puis les materiaux techniques issus de vrais runs sont rattaches au meme package, la structure et la completude sont verifiees, et un package unique est remis au relecteur suivant.",
        ],
        [
          "Qu'est-ce qui est genere automatiquement et qu'est-ce qui reste humain ?",
          "Le workflow peut organiser la structure du dossier, rattacher les materiaux techniques et preparer les sorties du package. L'interpretation legale, le jugement sur le risque residuel, les formulations pour deployeurs et la validation finale restent entre des mains nommees.",
        ],
        [
          "Que recoit l'evaluateur a la fin ?",
          "L'evaluateur devrait recevoir un dossier lisible, des materiaux techniques relies et, si besoin, un package cible pour une revue client, juridique, achats ou autorite.",
        ],
        [
          "Un meme workflow peut-il produire a la fois les documents et les materiaux techniques ?",
          "Oui. Le workflow est concu pour garder les documents lisibles pour la revue et les materiaux techniques dans le meme package afin qu'ils ne divergent pas.",
        ],
        [
          "Les donnees d'execution et les preuves restent-elles dans notre environnement ?",
          "Oui. Le workflow principal est concu pour que les preuves d'execution, la verification et les sorties du package puissent rester dans votre environnement controle.",
        ],
        [
          "Est-ce que cela remplace la revue legale ou la validation finale ?",
          "Non. Le workflow organise le package et son support technique, mais l'interpretation legale et la validation finale restent des responsabilites humaines.",
        ],
      ],
    },
    pricing: {
      title: "Tarifs pour les preuves EU AI Act",
      description:
        "Acces OSS gratuit, aide payante optionnelle pour le premier vrai paquet, et accompagnement enterprise pour un travail EU AI Act plus large.",
      headline: "Commencez gratuitement. Payez seulement quand votre equipe a besoin d'aide pour le premier vrai paquet.",
      lead:
        "Le coeur OSS est gratuit. L'aide payante sert aux equipes qui veulent atteindre plus vite le premier vrai paquet sur leur propre systeme. Enterprise convient a un deploiement plus large ou a une revue formelle.",
      subscriptionsLabel: "Parcours commerciaux",
      entryTitle: "Commencer avec OSS",
      entryLead:
        "Utilisez la voie gratuite si vous voulez inspecter le produit, lancer le demarrage rapide sur votre propre agent, puis decider si le workflow merite une place dans votre environnement.",
      launchEyebrow: "Aide payante",
      launchTitle: "Besoin d'aide pour obtenir le premier paquet sur votre propre systeme ?",
      launchLead:
        "Utilisez la voie payante quand votre equipe veut de l'aide pour connecter son propre systeme, revoir la premiere configuration et obtenir plus vite le premier vrai paquet.",
      tiersEyebrow: "Enterprise",
      tiersTitle: "Besoin d'un accompagnement plus large ?",
      tiersLead:
        "Enterprise convient quand le travail couvre plusieurs systemes, plusieurs equipes, ou une revue formelle et des achats.",
      fitTitle: "Choisissez le parcours qui correspond a votre stade",
      fitLead:
        "Gardez la premiere etape simple. Restez en autonomie tant que cela suffit. Payez seulement quand votre equipe a besoin d'aide pour passer du test au vrai paquet.",
      fitCards: [
        ["Rester en autonomie", "Le depot, le demarrage rapide, la documentation et les demonstrations suffisent tant que vous evaluez l'adequation ou pouvez operer le workflow seuls."],
        ["Prendre l'aide payante", "C'est le bon choix quand un systeme doit atteindre vite un vrai premier paquet sans que votre equipe perde des semaines a trouver le chemin seule."],
        ["Prendre Enterprise", "C'est le bon niveau quand la revue devient externe, multi-systeme, orientee conformite, ou recurrente sous examen serre."],
      ],
      faq: [
        {
          q: "Faut-il partager les donnees ou le modele ?",
          a: "Non. Le coeur du workflow reste heberge chez vous.",
        },
        {
          q: "Par quoi dois-je commencer ?",
          a: "Commencez par OSS si vous evaluez encore l'adequation ou si votre equipe peut operer le workflow seule. Prenez l'aide payante quand un systeme doit atteindre vite un vrai premier paquet. Prenez Enterprise quand le dossier doit survivre a une revue multi-equipe ou externe.",
        },
        {
          q: "Que paie exactement l'aide payante ?",
          a: "L'aide payante fait gagner du temps a votre equipe pour obtenir le premier vrai paquet sur son propre systeme. Elle ne remplace ni la vraie conception des cas, ni la revue de gouvernance, ni la validation juridique finale.",
        },
        {
          q: "Quand faut-il aller au-dela de l'autonomie ?",
          a: "Quand votre equipe a besoin du premier vrai paquet sur son propre systeme et ne veut pas reconstruire seule tout le chemin.",
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
        "Assistant pas a pas pour le parcours legal minimum cote fournisseur du EU AI Act pour les systemes d'IA a haut risque.",
      headline: "Redigez le brouillon cote fournisseur de votre package EU AI Act",
      intro:
        "Utilisez cette page pour rediger d'abord le brouillon ecrit cote fournisseur pour un systeme d'IA a haut risque. Si l'article 25 fait de votre organisation le fournisseur, c'est le bon parcours.",
      scopeEyebrow: "Parcours fournisseur uniquement",
      scopeTitle: "Cette page construit seulement le brouillon ecrit cote fournisseur",
      scopePoints: [
        "Le parcours par defaut concerne les fournisseurs de systemes d'IA a haut risque.",
        "Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours.",
        "Si le fournisseur est etabli hors de l'Union, ajoutez l'enregistrement Article 22 du representant autorise quand il est requis.",
      ],
    },
    templates: {
      title: "Modeles de documentation AI Act",
      description:
        "Modeles pour les articles cote fournisseur du EU AI Act, y compris l'article 22 lorsque le fournisseur est etabli hors de l'Union.",
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
      faq: [
        [
          "Quel document ouvrir en premier ?",
          "Ouvrez d'abord le dossier reviewer live si vous voulez voir la sortie UE. Ouvrez d'abord le guide de demarrage rapide si vous voulez tester le workflow sur votre propre agent.",
        ],
        [
          "Faut-il lire du JSON brut d'abord ?",
          "Non. Le dossier reviewer est la premiere surface de lecture prevue. Les artefacts JSON restent disponibles comme couche technique plus profonde.",
        ],
        [
          "Les contenus sont-ils alignes entre anglais, allemand et francais ?",
          "Oui. Le site publie les memes pages et chemins de preuve de base dans les trois langues, tout en conservant les noms exacts des artefacts.",
        ],
      ],
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
    ["0-2", "Needs scoping help before self-serve or paid help will be efficient."],
    ["3-4", "Good paid-help candidate: the core workflow exists but needs structuring."],
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
    ["Paid help", "One supported system that needs first-time setup and a first serious package.", "Not unlimited case authoring, not full legal drafting, not multi-agent implementation."],
    ["Enterprise support", "Broader scopes that need recurring or multi-system help.", "Not sold as unlimited done-for-you setup for every new system."],
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
      ["0-2", "Braucht Scoping-Hilfe, bevor Selbstbetrieb oder bezahlte Hilfe effizient sind."],
      ["3-4", "Guter Kandidat fuer bezahlte Hilfe: Der Kern-Workflow existiert, braucht aber Struktur."],
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
      ["Bezahlte Hilfe", "Ein unterstuetztes System, das das erste Setup und ein erstes ernstes Paket braucht.", "Keine unbegrenzte Fallausarbeitung, kein vollstaendiges rechtliches Verfassen, keine Multi-System-Implementierung."],
      ["Enterprise-Support", "Breitere Umfaenge mit wiederkehrender oder systemuebergreifender Hilfe.", "Nicht als unbegrenztes Komplettsetup fuer jedes neue System verkauft."],
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
      ["0-2", "Necessite une aide de cadrage avant qu'un mode autonome ou une aide payante soit efficace."],
      ["3-4", "Bon candidat pour l'aide payante: le workflow coeur existe mais doit etre structure."],
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
    title: "Technical Overview: from agent runs to an EU AI Act package | EU AI Evidence Builder",
    description:
      "Architecture, verification, and trust model for CTOs and engineering leads deciding whether the EU AI evidence workflow is worth technical time.",
    eyebrow: "Technical Overview",
    headline: "Technical Overview: from agent runs to an EU AI Act package",
    intro:
      "For CTOs and engineering leads deciding whether this is worth technical time now: what already exists, how to test fit on your own agent, what the engine actually does, where human approval still begins, and the fact that the default EU path here targets the provider side of a high-risk AI system.",
    inspectTitle: "What to check first",
    inspectLead:
      "Before installation, a CTO should be able to see concrete outputs, explicit gates, the split between machine evidence and human-owned completion, and the minimum your team must already have for an honest first run.",
    inspectCards: [
      ["Role scope", "The default EU path on this site is the provider-side path for high-risk AI systems. Other roles differ. If Article 25 makes your organization the provider, this is the correct path."],
      ["Real outputs", "The product ends in a portable report, compare-report JSON, manifest, retention controls, and article-level EU outputs linked back to the same bundle."],
      ["Provider-side package outputs", "The EU path produces Annex-shaped documentation outputs, provider-side JSON artifacts, and starter results tied back to the same runtime evidence."],
      ["Hard gates and source-visible path", "Packaging and verify have explicit checks, and the commands, schemas, and artifacts are visible in the repository and reflected in the public Builder and starter path."],
      ["What your team must already have", "A reachable adapter, a clear release boundary, starter cases, and named owners for thresholds and sign-off are enough to test fit honestly before deeper integration."],
    ],
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
      "The product turns comparable runs into a provider-side EU package, keeps the machine-verifiable core intact, and layers package structure and handoff on top without pretending to automate legal sign-off.",
    summaryColumns: [
      {
        title: "Evidence generation",
        points: [
          "Comparable baseline and new runs become a portable evidence bundle",
          "The bundle includes a report, machine contract, manifest, retention controls, and provider-side EU outputs",
          "EU dossier sections attach to the same verified runtime evidence instead of diverging into a document-only workflow",
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
          "The package can move across engineering, governance, counsel, procurement, and authority-facing review",
          "Readable package outputs, review records, handoff notes, and authority bundles can sit on the same package surface",
          "The goal is a package another reviewer can inspect without internal dashboards, screenshots, or unsigned file swaps",
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
    compactWorkflowTitle: "What your team provides and what the engine does next",
    compactWorkflowLead:
      "The middle of the decision should stay practical. Your team brings a reachable adapter, a real change boundary, starter cases, and named owners. From there the engine handles comparable runs, verified packaging, and provider-side EU outputs on top of the same bundle.",
    compactWorkflowSteps: [
      "Your team exposes a reachable adapter and the baseline/new boundary that is actually worth reviewing.",
      "Your team supplies starter cases, intended-use context, and named owners for thresholds and sign-off.",
      "The engine runs comparable executions, packages the bundle, and verifies integrity and structure.",
      "The engine generates provider-side EU outputs from that same verified bundle; legal judgment and final approval still stay with your team.",
    ],
    commandsTitle: "Command surface",
    commandsLead:
      "If the fit is real, these are the real commands behind packaging, signing, verification, review, and authority handoff.",
    artifactsSummaryTitle: "What must exist if the workflow is healthy",
    artifactsSummaryLead: "Judge the product by durable artifacts and explicit gates, not by screenshots or narrative alone.",
    screenshotTitle: "What the verified bundle looks like",
    screenshotBody: "This is the kind of package the technical path should produce before anyone asks governance or counsel to review it.",
    extendedTitle: "If the fit is real, open the repo",
    extendedBody:
      "Once outputs, gates, and the first-run path look real, the repository is the right next step for adapters, schemas, commands, and implementation detail.",
    extendedButton: "Open extended notes",
    opsButton: "Open self-hosted guide",
    proofButton: "Open EU starter guide",
    docsButton: "Open OSS docs",
    repoButton: "Open GitHub repo",
    quickstartJumpButton: "See self-serve EU starter",
    reviewerButton: "Open builder",
    demoAgentButton: "Open self-hosted guide",
    allDocsButton: "Open GitHub repo",
    quickstartTitle: "First self-serve EU starter",
    quickstartLead:
      "Use the EU starter guide when you want a lightweight first EU-shaped package on your own agent before deciding whether you need paid help.",
    quickstartCommand: "",
    quickstartColumns: [
      {
        title: "What it shows",
        points: [
          "The toolkit can reach your adapter and produce a lightweight EU-shaped starter package.",
          "You can see how the EU minimum path starts on your own infrastructure, not only on the demo.",
          "Your team gets an honest first signal before deciding whether paid help is worth it.",
        ],
      },
      {
        title: "What it does not do",
        points: [
          "It does not replace the real provider-side package for review.",
          "It does not replace reviewed cases, comparable runs, or final legal completion.",
          "It does not replace hands-on help when your team wants the real package on its own agent.",
        ],
      },
    ],
    quickstartButton: "Open EU starter guide",
    planningTitle: "Time to first evidence",
    planningNote: "Planning estimates, not delivery guarantees.",
    estimates: [
      ["Self-serve first setup", "3-4 weeks"],
      ["Paid help to first verified package", "5 business days"],
      ["Recurring release after onboarding", "1-2 days"],
      ["Monthly support scope", "Supported agents only"],
    ],
    workflowTitle: "What actually happens",
    intakeTitle: "Structured intake layer",
    intakeLead: "Automate the upstream contract before case authoring and adapter work starts.",
    intakeHumanTitle: "What still stays human-owned",
    boundaryTitle: "What still stays human-owned",
    boundaryBody:
      "The strongest part of the product is the path from prepared inputs to a verified evidence bundle. Scope judgment, policy thresholds, adapter-depth decisions, and final sign-off still stay with named humans.",
    artifactsTitle: "Artifacts and ready gates",
    artifactsLead: "These are the artifacts technical teams should expect to exist if the workflow is healthy.",
    reviewTitle: "Structured review handoff",
    reviewLead: "Stage 7 is still human-owned, but it is no longer an unstructured email or ticket comment.",
    reviewChecksTitle: "What the handoff gate enforces",
    readinessTitle: "Readiness self-assessment",
    readinessLead: "Use this before choosing self-serve, paid help, or enterprise support.",
    readinessScoreTitle: "How to read the score",
    maturityTitle: "Evidence maturity model",
    maturityLead: "This is the fastest way to explain where a team is now and what level the next engagement should target.",
    triggersTitle: "When evidence should be re-run",
    supportTitle: "What each engagement layer actually covers",
    failureTitle: "Common failure modes",
    landingTitle: "Need the technical overview?",
    landingBody:
      "Open the architecture, verification model, artifact contracts, and trust boundary behind the evidence engine.",
    landingButton: "Open technical overview",
    faq: [
      [
        "What should a technical team verify before integrating?",
        "Check the package boundary, the explicit verify gates, the split between machine-generated outputs and provider-owned completion, and the public self-serve path.",
      ],
      [
        "Can we test this on our own agent before deeper setup?",
        "Yes. The EU starter guide is the shortest honest path from the public draft flow to a lightweight EU starter package on your own running adapter.",
      ],
      [
        "Do we need to read filenames and raw JSON first?",
        "No. Start with the fit checks on this page. The commands, package shape, and deeper technical docs are there once you decide the product deserves installation time.",
      ],
      [
        "Does the toolkit automate legal approval?",
        "No. It automates evidence operations and packaging. Legal classification, residual-risk judgment, and final sign-off remain human-owned.",
      ],
    ],
  },
  de: {
    title: "Technischer Ueberblick: von Agent-Runs zu reviewer-tauglichen EU-Nachweisen | EU AI Evidence Builder",
    description:
      "Architektur, Verifikation und Vertrauensmodell fuer CTOs und Engineering-Leads, die entscheiden muessen, ob der EU-Nachweis-Workflow technische Zeit wert ist.",
    eyebrow: "Technischer Ueberblick",
    headline: "Technischer Ueberblick: von Agent-Runs zu reviewer-tauglichen EU-Nachweisen",
    intro:
      "Fuer CTOs und Engineering-Leads, die entscheiden muessen, ob das Thema jetzt technische Zeit wert ist: was bereits real existiert, wie Sie den Fit am eigenen Agenten pruefen, was die Engine tatsaechlich leistet, wo menschliche Freigabe beginnt und dass der EU-Standardpfad hier die Provider-Seite eines Hochrisiko-KI-Systems adressiert.",
    inspectTitle: "Was man zuerst pruefen sollte",
    inspectLead:
      "Vor jeder Installation sollte ein CTO konkrete Ausgaben, explizite Kontrollpunkte, die Trennung zwischen Maschinen-Nachweisen und menschlicher Vervollstaendigung sowie die minimalen Voraussetzungen fuer einen ehrlichen ersten Lauf sehen koennen.",
    inspectCards: [
      ["Rollen-Scope", "Der Standardpfad fuer EU-Inhalte auf dieser Website ist der provider-seitige Pfad fuer Hochrisiko-KI-Systeme. Andere Rollen unterscheiden sich. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, ist dies der richtige Pfad."],
      ["Reale Ausgaben", "Das Produkt endet in portablem Report, Maschinenvertrag, Manifest, Aufbewahrungskontrollen, Review Record und optionalem Behoerdenpaket."],
      ["Reviewer-taugliche EU-Ausgaben", "Der EU-Pfad umfasst Reviewer-PDF, Reviewer-HTML, Reviewer-Markdown und Anhangs-orientierte Dossier-Ausgaben, die auf dasselbe Nachweispaket zurueckzeigen."],
      ["Harte Kontrollpunkte und im Quellcode sichtbarer Pfad", "Packaging, Verify, Review und Authority Packaging haben explizite Checks, und die dazugehoerigen Befehle, Schemas und Artefakte sind im Repository sichtbar und in der Live-Proof-Oberflaeche wiederzufinden."],
      ["Was Ihr Team bereits haben muss", "Ein erreichbarer Adapter, eine klare Release-Grenze, erste Cases und benannte Owner fuer Schwellen und Freigabe reichen aus, um den Fit vor tieferer Integration ehrlich zu pruefen."],
    ],
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
      "Das Produkt macht aus vergleichbaren Runs reviewer-taugliche EU-Nachweise, fuegt Pruef- und Uebergabe-Struktur hinzu, erlaubt sektorielle Schichten ueber demselben Kern und laesst rechtliche sowie Policy-Verantwortung ausserhalb der Automatisierung.",
    summaryColumns: [
      {
        title: "Nachweiserzeugung",
        points: [
          "Vergleichbare Baseline- und New-Runs werden zu einem portablen Nachweispaket",
          "Das Paket enthaelt Report, Maschinenvertrag, Manifest, Reviewer-PDF/HTML/Markdown und Aufbewahrungskontrollen",
          "EU-Dossier-nahe Ausgaben haengen an denselben verifizierten Runtime-Nachweisen",
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
          "Pruefprotokolle, Uebergabe-Notizen, Reviewer-Ausgaben und Behoerdenpakete sind Teil der Produktoberflaeche",
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
    compactWorkflowTitle: "Was Ihr Team liefert und was die Engine danach uebernimmt",
    compactWorkflowLead:
      "Die Mitte der Entscheidung sollte praktisch bleiben. Ihr Team bringt einen erreichbaren Adapter, eine echte Aenderungsgrenze, erste Cases und benannte Owner mit. Von dort uebernimmt die Engine vergleichbare Runs, verifiziertes Packaging und reviewer-taugliche EU-Ausgaben auf demselben Bundle.",
    compactWorkflowSteps: [
      "Ihr Team stellt einen erreichbaren Adapter und eine Baseline/New-Grenze bereit, die wirklich pruefenswert ist.",
      "Ihr Team liefert erste Cases, Intended-Use-Kontext und benannte Owner fuer Schwellen und Freigabe.",
      "Die Engine fuehrt vergleichbare Runs aus, paketiert das Bundle und verifiziert Integritaet und Struktur.",
      "Die Engine erzeugt reviewer-taugliche EU-Ausgaben aus demselben verifizierten Bundle; Rechtsurteil und finale Freigabe bleiben beim Team.",
    ],
    commandsTitle: "Befehlsoberflaeche",
    commandsLead:
      "Wenn der Fit real ist, sind das die echten Befehle hinter Packaging, Signatur, Verifikation, Review und Behoerdenpfad.",
    artifactsSummaryTitle: "Was bei gesundem Workflow existieren muss",
    artifactsSummaryLead: "Technische Teams sollten das Produkt an dauerhaften Artefakten und expliziten Verifikationsschritten messen, nicht nur an Screenshots oder Narrativ.",
    screenshotTitle: "Wie das verifizierte Paket aussieht",
    screenshotBody: "So sollte das Paket aussehen, bevor Governance oder Rechtsberatung ueberhaupt in die Pruefung einsteigen.",
    extendedTitle: "Wenn der Fit real ist, oeffnen Sie das Repository",
    extendedBody:
      "Sobald Ausgaben, Kontrollpunkte und der Pfad fuer den ersten Lauf echt wirken, ist das Repository der richtige naechste Schritt fuer Adapter, Schemas, Befehle und Implementierungsdetails.",
    extendedButton: "Erweiterte Notizen oeffnen",
    opsButton: "Self-Hosted-Leitfaden öffnen",
    proofButton: "EU-Starter-Leitfaden oeffnen",
    docsButton: "OSS-Dokumentation oeffnen",
    repoButton: "GitHub-Repository oeffnen",
    quickstartJumpButton: "Ersten Lauf am eigenen Agenten sehen",
    reviewerButton: "Builder oeffnen",
    demoAgentButton: "Self-Hosted-Leitfaden oeffnen",
    allDocsButton: "GitHub-Repository oeffnen",
    quickstartTitle: "Schnellster ehrlicher erster Lauf",
    quickstartLead:
      "Wenn Ihr Adapter bereits laeuft, nutzen Sie den Schnellstart, um vor tieferer Integrationsarbeit ein echtes erstes Nachweispaket auf Ihrer eigenen Infrastruktur zu erzeugen.",
    quickstartCommand: "",
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
    quickstartButton: "EU-Starter-Leitfaden auf GitHub oeffnen",
    planningTitle: "Zeit bis zum ersten Nachweis",
    planningNote: "Planungswerte, keine harten Lieferzusagen.",
    estimates: [
      ["Erstsetup im Selbstbetrieb", "3-4 Wochen"],
      ["Bezahlte Hilfe bis zum ersten verifizierten Paket", "5 Arbeitstage"],
      ["Wiederkehrende Inbetriebnahme nach Onboarding", "1-2 Tage"],
      ["Monatlicher Support", "Nur betreute Agenten"],
    ],
    workflowTitle: "Was technisch wirklich passiert",
    intakeTitle: "Strukturierte Intake-Schicht",
    intakeLead: "Den Upstream-Vertrag automatisieren, bevor Cases und Adapter-Arbeit starten.",
    intakeHumanTitle: "Was menschlich gefuehrt bleibt",
    boundaryTitle: "Was weiterhin menschlich gefuehrt bleibt",
    boundaryBody:
      "Der staerkste Teil des Produkts ist der Weg von vorbereiteten Eingaben zu einem verifizierten Nachweispaket. Urteile ueber Systemgrenze, Leitlinien-Schwellen, Adapter-Tiefe und finale Freigabe bleiben bei benannten Menschen.",
    artifactsTitle: "Artefakte und Freigabe-Kontrollpunkte",
    artifactsLead: "Diese Artefakte sollten existieren, wenn der Workflow technisch gesund ist.",
    reviewTitle: "Strukturierte Pruefuebergabe",
    reviewLead: "Stage 7 bleibt menschlich gefuehrt, ist aber nicht mehr nur eine unstrukturierte Mail oder Ticket-Notiz.",
    reviewChecksTitle: "Was der Uebergabe-Kontrollpunkt erzwingt",
    readinessTitle: "Readiness-Selbsteinschaetzung",
    readinessLead: "Nutzen Sie diese Liste vor Selbstbetrieb, bezahlter Hilfe oder Enterprise-Support.",
    readinessScoreTitle: "So lesen Sie den Score",
    maturityTitle: "Nachweis-Reifegradmodell",
    maturityLead: "Damit laesst sich der aktuelle Reifegrad eines Teams sehr schnell einordnen.",
    triggersTitle: "Wann Nachweise neu erzeugt werden sollten",
    supportTitle: "Was die einzelnen Engagement-Layer wirklich abdecken",
    failureTitle: "Haeufige Ausfallmuster",
    landingTitle: "Brauchen Sie den technischen Ueberblick?",
    landingBody:
      "Oeffnen Sie Architektur, Verifikationsmodell, Artefakt-Vertraege und Vertrauensgrenze hinter der Nachweis-Engine.",
    landingButton: "Technischen Ueberblick oeffnen",
    faq: [
      [
        "Was sollte ein technisches Team vor der Integration pruefen?",
        "Pruefen Sie das Reviewer-Dossier, die expliziten Verify- und Review-Kontrollpunkte, die Trennung zwischen Maschinen-Nachweisen und operator-eigener Vervollstaendigung sowie die Produktgrenze.",
      ],
      [
        "Koennen wir das auf unserem eigenen Agenten pruefen, bevor wir tiefer einsteigen?",
        "Ja. Der Schnellstart ist der kuerzeste ehrliche Weg von der Live-Demo zu Ihrem laufenden Adapter. Er zeigt, ob das Toolkit in Ihrer Umgebung ein Starter-Nachweispaket ausfuehren, paketieren und verifizieren kann.",
      ],
      [
        "Muss ich mit Dateinamen und rohem JSON anfangen?",
        "Nein. Starten Sie mit dem Reviewer-Dossier und den produktnahen Fit-Fragen auf dieser Seite. Dateinamen, Befehle und tiefere technische Dokumente sind erst der naechste Schritt, wenn sich die Installation lohnt.",
      ],
      [
        "Automatisiert das Toolkit rechtliche Freigabe?",
        "Nein. Es automatisiert Nachweisbetrieb und Paketierung. Rechtsklassifizierung, Rest-Risiko-Urteil und finale Freigabe bleiben menschlich gefuehrt.",
      ],
    ],
  },
  fr: {
    title: "Vue technique : des runs agent aux preuves UE lisibles par un evaluateur | EU AI Evidence Builder",
    description:
      "Architecture, verification et modele de confiance pour les CTO et engineering leads qui doivent decider si le workflow de preuve EU merite du temps technique.",
    eyebrow: "Vue technique",
    headline: "Vue technique : des runs agent aux preuves UE lisibles par un evaluateur",
    intro:
      "Pour les CTO et engineering leads qui doivent decider si cela merite du temps technique maintenant : ce qui existe deja, comment tester l'adequation sur votre propre agent, ce que l'engine fait reellement, ou commence encore la validation humaine, et le fait que le parcours UE par defaut ici vise la partie fournisseur d'un systeme d'IA a haut risque.",
    inspectTitle: "Ce qu'il faut verifier d'abord",
    inspectLead:
      "Avant toute installation, un CTO doit pouvoir voir des sorties concretes, des verrous explicites, la separation entre preuve machine et completion humaine, ainsi que le minimum que votre equipe doit deja avoir pour un premier run honnete.",
    inspectCards: [
      ["Perimetre de role", "Le parcours UE par defaut sur ce site est le parcours cote fournisseur pour les systemes d'IA a haut risque. Les autres roles sont differents. Si l'article 25 fait de votre organisation le fournisseur, c'est le bon parcours."],
      ["Sorties reelles", "Le produit se termine par un rapport portable, un contrat machine, un manifest, des controles de retention, une trace de revue et un package autorite en option."],
      ["Sorties UE lisibles par un evaluateur", "Le chemin UE comprend reviewer PDF, reviewer HTML, reviewer Markdown et des sorties dossier alignees sur les annexes, toutes reliees au meme bundle de preuve."],
      ["Verrous stricts et chemin visible dans le code source", "Packaging, verify, review et authority packaging ont des controles explicites, et les commandes, schemas et artefacts associes sont visibles dans le depot et refletes dans la preuve live."],
      ["Ce que votre equipe doit deja avoir", "Un adapter joignable, une frontiere de release claire, des cas de depart et des responsables nommes pour les seuils et la validation suffisent pour tester l'adequation honnetement avant une integration plus profonde."],
    ],
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
      "Le produit transforme des runs comparables en preuves UE lisibles par un evaluateur, ajoute une structure de revue et de transmission, permet des couches sectorielles au-dessus du meme noyau, et laisse la responsabilite legale et de politique hors de la couche d'automatisation.",
    summaryColumns: [
      {
        title: "Generation de preuve",
        points: [
          "Des runs baseline/new comparables deviennent un dossier de preuve portable",
          "Le dossier inclut rapport, contrat machine, manifest, reviewer PDF/HTML/Markdown et controles de retention",
          "Les sorties dossier UE s'attachent aux memes preuves d'execution verifiees",
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
          "Les traces de revue, notes de transmission, sorties du package et dossiers pour autorite font partie du produit",
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
    compactWorkflowTitle: "Ce que votre equipe fournit et ce que l'engine fait ensuite",
    compactWorkflowLead:
      "Le milieu de la decision doit rester pratique. Votre equipe apporte un adapter joignable, une vraie frontiere de changement, des cas de depart et des responsables nommes. A partir de la, l'engine prend en charge les runs comparables, le packaging verifie et les sorties UE lisibles par un evaluateur sur le meme bundle.",
    compactWorkflowSteps: [
      "Votre equipe expose un adapter joignable et une frontiere baseline/new qui vaut vraiment la peine d'etre revue.",
      "Votre equipe fournit des cas de depart, le contexte d'usage prevu et des responsables nommes pour les seuils et la validation.",
      "L'engine execute des runs comparables, package le bundle et verifie l'integrite et la structure.",
      "L'engine genere les sorties UE lisibles par un evaluateur a partir du meme bundle verifie; le jugement legal et la validation finale restent a votre equipe.",
    ],
    commandsTitle: "Surface de commande",
    commandsLead:
      "Si l'adequation est reelle, ce sont les vraies commandes derriere le packaging, la signature, la verification, la revue et la preparation pour une autorite.",
    artifactsSummaryTitle: "Ce qui doit exister si le workflow est sain",
    artifactsSummaryLead: "Les equipes techniques doivent juger le produit a ses artefacts durables et a ses verrous explicites, pas seulement a des captures ou a du narratif.",
    screenshotTitle: "A quoi ressemble le dossier verifie",
    screenshotBody: "C'est le type de dossier que le chemin technique doit produire avant qu'une revue de gouvernance ou de conseil juridique commence.",
    extendedTitle: "Si l'adequation est reelle, ouvrez le depot",
    extendedBody:
      "Une fois les sorties, les verrous et le chemin du premier run juges credibles, le depot devient la bonne etape suivante pour les adapters, schemas, commandes et details d'implementation.",
    extendedButton: "Ouvrir les notes detaillees",
    opsButton: "Ouvrir le guide self-hosted",
    proofButton: "Ouvrir le guide starter UE",
    docsButton: "Ouvrir les docs OSS",
    repoButton: "Ouvrir le depot GitHub",
    quickstartJumpButton: "Voir le premier run sur votre propre agent",
    reviewerButton: "Ouvrir le builder",
    demoAgentButton: "Ouvrir le guide self-hosted",
    allDocsButton: "Ouvrir le repository GitHub",
    quickstartTitle: "Chemin le plus rapide vers un premier run honnete",
    quickstartLead:
      "Si votre adapter tourne deja, utilisez le demarrage rapide pour produire un vrai premier dossier de preuve sur votre propre infrastructure avant toute integration plus lourde.",
    quickstartCommand: "",
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
    quickstartButton: "Ouvrir le guide du starter UE sur GitHub",
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
    boundaryTitle: "Ce qui reste humain",
    boundaryBody:
      "La partie la plus forte du produit est le chemin entre des entrees preparees et un dossier de preuve verifie. Le jugement sur le perimetre, les seuils de politique, la profondeur de l'adapter et la validation finale restent humains.",
    artifactsTitle: "Artefacts et verrous de disponibilite",
    artifactsLead: "Voila les artefacts qu'une equipe technique devrait voir quand le workflow est sain.",
    reviewTitle: "Transmission de revue structuree",
    reviewLead: "L'etape 7 reste humaine, mais ce n'est plus un simple email ou commentaire de ticket non structure.",
    reviewChecksTitle: "Ce que le verrou de transmission impose",
    readinessTitle: "Auto-evaluation de readiness",
    readinessLead: "Utilisez cette liste avant de choisir l'autonomie, l'aide payante ou le support enterprise.",
    readinessScoreTitle: "Comment lire le score",
    maturityTitle: "Modele de maturite de preuve",
    maturityLead: "C'est la facon la plus rapide de situer le niveau de maturite actuel d'une equipe.",
    triggersTitle: "Quand il faut regenerer la preuve",
    supportTitle: "Ce que couvre vraiment chaque couche d'engagement",
    failureTitle: "Modes de defaillance frequents",
    landingTitle: "Besoin de la vue technique ?",
    landingBody:
      "Ouvrez l'architecture, le modele de verification, les contrats d'artefacts et la frontiere de confiance derriere le moteur de preuve.",
    landingButton: "Ouvrir la vue technique",
    faq: [
      [
        "Que doit verifier une equipe technique avant integration ?",
        "Verifier le dossier reviewer, les verrous explicites de verification et de revue, la separation entre preuve machine et completion restee a l'operateur, ainsi que la frontiere du produit.",
      ],
      [
        "Peut-on tester cela sur notre propre agent avant d'aller plus loin ?",
        "Oui. Le demarrage rapide est le chemin honnete le plus court entre la demo live et votre adapter deja en marche. Il montre si le toolkit peut executer, packager et verifier un premier dossier de preuve dans votre environnement.",
      ],
      [
        "Faut-il commencer par des noms de fichiers et du JSON brut ?",
        "Non. Commencez par le dossier reviewer et les questions de fit produit sur cette page. Les noms de fichiers, les commandes et la documentation technique plus profonde viennent ensuite, une fois que le produit merite du temps d'installation.",
      ],
      [
        "Le toolkit automatise-t-il la validation juridique ?",
        "Non. Il automatise les operations de preuve et le packaging. La classification legale, le jugement sur le risque residuel et la validation finale restent humains.",
      ],
    ],
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
    name: { en: "FREE", de: "KOSTENLOS", fr: "GRATUIT" },
    heading: {
      en: "Free self-serve EU AI Act path",
      de: "Kostenloser EU-KI-Selbstbedienungsweg",
      fr: "Parcours EU AI Act gratuit en autonomie",
    },
    price: { en: "Free", de: "Kostenlos", fr: "Gratuit" },
    featured: false,
    items: {
      en: ["Unlimited self-serve evaluation", "EU starter + open-source docs", "Builder + templates", "Live demos", "No setup help included"],
      de: ["Unbegrenzte Selbstbetrieb-Evaluierung", "Schnellstart + OSS-Dokumentation", "Dokumentations-Assistent + Vorlagen", "Live-Demos", "Keine Setup-Hilfe enthalten"],
      fr: ["Evaluation illimitee en autonomie", "Demarrage rapide + documentation OSS", "Assistant de documentation + modeles", "Demos live", "Sans aide au setup"],
    },
    note: {
      en: "Use the open-source repo on your own. No commercial support is included.",
      de: "Sie nutzen das OSS-Repo selbst. Kein kommerzieller Support-Scope ist enthalten.",
      fr: "Vous utilisez seul le depot OSS. Aucun perimetre de support commercial n'est inclus.",
    },
    cta: { en: "Open GitHub repo", de: "GitHub-Repo oeffnen", fr: "Ouvrir le depot GitHub" },
    href: GITHUB_REPO,
  },
  {
    key: "launch-pack",
    name: { en: "PAID HELP", de: "BEZAHLTE HILFE", fr: "AIDE PAYANTE" },
    heading: {
      en: "Paid help for one real system",
      de: "Bezahlte Hilfe fuer ein echtes System",
      fr: "Aide payante pour un systeme reel",
    },
    price: { en: "EUR499", de: "EUR499", fr: "EUR499" },
    featured: true,
    items: {
      en: [
        "1 supported agent",
        "Adapter fit check",
        "Help to reach the first real package",
        "Short results review + next-step handoff",
        "Focused help for the first package",
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
      en: "Use this when your team needs hands-on help getting to the first real package on its own system.",
      de: "Nutzen Sie das, wenn Ihr Team praktische Hilfe bis zum ersten echten Paket auf dem eigenen System braucht.",
      fr: "Utilisez-le quand votre equipe a besoin d'aide concrete pour obtenir le premier vrai paquet sur son propre systeme.",
    },
    cta: { en: "Contact us", de: "Kontakt aufnehmen", fr: "Nous contacter" },
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
    heading: {
      en: "Enterprise support for broader rollout",
      de: "Enterprise-Support fuer breiteren Rollout",
      fr: "Support enterprise pour un deploiement plus large",
    },
    price: { en: "Custom", de: "Custom", fr: "Custom" },
    featured: false,
    items: {
      en: ["Multi-system support", "Formal review support", "Dedicated export formatting", "Custom scope and SLA", "For broader or formal support needs"],
      de: [
        "Multi-System-Implementierung",
        "Unterstuetzung fuer Konformitaet / externe Pruefungen",
        "Dediziertes Exportformat",
        "Sonderumfang und SLA",
        "Fuer breitere oder formale Support-Anforderungen",
      ],
      fr: [
        "Implementation multi-systeme",
        "Support conformite / revue externe",
        "Formatage d'export dedie",
        "Perimetre sur mesure et SLA",
        "Pour des besoins de support plus larges ou plus formels",
      ],
    },
    note: {
      en: "Use this when support needs to cover multiple systems, multiple teams, or formal procurement and review.",
      de: "Nutzen Sie Enterprise, wenn der Support Beschaffung, externe Pruefungen, Konformitaetsdruck oder einen breiteren Multi-System-Rollout abdecken muss.",
      fr: "Passez a Enterprise quand le support doit tenir face aux achats, a la revue externe, a la pression de conformite ou a un deploiement multi-systeme plus large.",
    },
    cta: { en: "Contact us", de: "Kontakt aufnehmen", fr: "Nous contacter" },
    href: "contact",
  },
];

const PRICING_PREVIEW_ORDER = ["starter", "launch-pack", "enterprise"];
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
  const heading = plan.heading ? localizePlanValue(plan.heading, locale) : "";
  const hrefValue = typeof plan.href === "string" && /^https?:\/\//.test(plan.href) ? plan.href : href(plan.href);
  const externalAttrs =
    typeof plan.href === "string" && /^https?:\/\//.test(plan.href) ? ' target="_blank" rel="noreferrer"' : "";

  return `
    <article class="${classes.join(" ")}">
      <div>
        <p class="eyebrow">${escapeHtml(localizePlanValue(plan.name, locale))}</p>
        ${heading ? `<h3>${escapeHtml(heading)}</h3>` : ""}
        <p class="price">${escapeHtml(localizePlanValue(plan.price, locale))}</p>
        ${note ? `<p class="muted">${escapeHtml(note)}</p>` : ""}
      </div>
      <ul class="pricing-list">
        ${localizePlanValue(plan.items, locale)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}
      </ul>
      <a class="${buttonClass}" href="${hrefValue}"${externalAttrs} data-track-event="pricing_cta">${escapeHtml(
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
          "Without connecting your agent, the toolkit can only draft the register from the EU package you already generated. After adapter integration, it can also add entries from real runs, linked article outputs, and monitoring history.",
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
            "Adds evidence-linked entries from runs, linked article outputs, and monitoring history.",
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
            "Can link a risk entry to monitoring signals, scanner constats, and follow-up actions.",
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
        ["Residual risk review", "Capture what remains unresolved and who signs off.", "Human oversight summary and monitoring outputs."],
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
            "Before the Article 9 section is approved or relied on in provider governance.",
            "Short text or your internal scale explaining why the risk is low, medium, or high and how likely it is.",
          ],
          [
            "Control owner and target review date",
            "As soon as a risk stays open and needs follow-up after review.",
            "Named owner plus a concrete review date in the Article 9 section, tracker, or governance tool.",
          ],
          [
            "Residual-risk acceptance and sign-off",
            "At provider or governance review, after the open risks and controls have been reviewed.",
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
          "There is one full EU dossier. The Article 9 draft is one file inside that package, alongside the oversight and monitoring outputs it depends on. The JSON layout shown here is the toolkit's structured format for those requirements, not an EU-mandated form.",
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
            "Human oversight summary - human-oversight-summary.json",
            "Used when an open risk depends on human review, blocking, or escalation controls.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
          ],
          [
            "Post-market monitoring - post-market-monitoring.json",
            "Used when Article 9 is updated because drift or recurring failures appear during monitoring.",
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
            "Aufsichtsuebersicht - human-oversight-summary.json",
            "Wird genutzt, wenn ein offenes Risiko menschliche Pruefung, Blockierung oder Eskalation erfordert.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
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
            "Synthese de supervision humaine - human-oversight-summary.json",
            "Utilisee quand un risque ouvert exige une revue humaine, un blocage ou une escalade.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
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
        eyebrow: "Open the template or next step",
        title: "Take Article 9 into a real review flow",
        lead:
          "Use the template when you need the document shell. Open the EU starter when you want to see how runtime outputs can support the same Article 9 work.",
        downloadLabel: "Download free template",
        liveLabel: "Open EU starter",
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
  "article-10": {
    title: {
      en: "EU AI Act Article 10 - Data and Data Governance Template",
    },
    description: {
      en: "Template for Article 10 data governance, data provenance, relevance and bias checks, and data-preparation operations.",
    },
    intro: {
      en:
        "Article 10 is where teams explain how training, validation, and testing data are governed for the relevant AI system. The reviewer needs a clear written account of where data comes from, how relevance and possible bias are examined, and how data preparation is controlled.",
    },
    coverage: {
      en: "Evidence-backed scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 10 expects, what the toolkit can add, and what your team still owns",
        note:
          "This page is a drafting scaffold for the Article 10 section. It helps structure the writing, but your team still has to supply the system-specific data-governance details required by law.",
        headers: [
          "Article 10 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "Data governance and management practices",
            "A law-shaped section for training, validation, and testing data governance.",
            "Describe the actual governance and management practices used for the relevant AI system.",
            "A written Article 10 section in the package.",
          ],
          [
            "Data origin and collection process",
            "Prompts for data origin and collection inputs.",
            "State where the data comes from and how it is collected for this system.",
            "A short source-and-collection note.",
          ],
          [
            "Checks for relevance, representativeness, bias, and errors",
            "A draft structure for these required checks.",
            "Record the checks actually performed and the main findings.",
            "A review note or summary table for the data set.",
          ],
          [
            "Data preparation operations",
            "A place to describe the processing operations used before model work or testing.",
            "List the actual cleaning, labeling, filtering, transformation, or augmentation steps used.",
            "A concise data-preparation summary.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 10",
        lead:
          "Article 10 remains system-specific. The template can structure the section, but it cannot infer your data source, sampling logic, quality checks, or bias review from the package alone.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Data source description",
            "The section must describe the origin of the data used for the relevant AI system.",
            "A short paragraph naming the source, scope, and collection channel.",
          ],
          [
            "Representativeness and relevance review",
            "The section must explain why the data is relevant and sufficiently representative for the intended purpose.",
            "A short written assessment or review table.",
          ],
          [
            "Bias and data-quality checks",
            "The section must record what checks were done for possible bias and errors.",
            "A checklist or narrative summary of the checks and findings.",
          ],
          [
            "Data preparation summary",
            "The section must describe the main preparation operations used before training, validation, or testing.",
            "A short sequence of named preparation steps.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-16": {
    title: {
      en: "EU AI Act Article 16 - Provider Obligations Template",
    },
    description: {
      en: "Template for provider-side Article 16 duties, including documentation keeping, logs, corrective action, and authority cooperation.",
    },
    intro: {
      en:
        "Article 16 is where the provider's operational duties are gathered together. The point is not only to have technical documentation, but to show that the provider can keep required materials available, keep logs, take corrective action, and cooperate with authorities when needed.",
    },
    coverage: {
      en: "Evidence-backed scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 16 expects, what the template can add, and what your team still owns",
        note:
          "This page structures the provider-side written record for Article 16. It does not replace the actual organizational duties or approvals that the law places on the provider.",
        headers: [
          "Article 16 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "Documentation keeping under Articles 16 and 18",
            "A section shell for technical documentation, QMS records, and retained conformity records.",
            "Describe how these materials are kept available for 10 years after the system is placed on the market or put into service.",
            "A documentation-keeping note.",
          ],
          [
            "Automatically generated logs under Articles 16 and 19",
            "Prompts for log retention and retrieval.",
            "Record which automatically generated logs are under provider control and how they are kept for at least six months or longer if another law requires it.",
            "A log-retention note.",
          ],
          [
            "Corrective actions and duty of information under Article 20",
            "Prompts for corrective-action handling and notification duties.",
            "Record how the provider brings the system into conformity, when withdrawal, disabling, or recall is used, and who is informed without undue delay.",
            "A corrective-action procedure summary.",
          ],
          [
            "Cooperation with competent authorities under Article 21",
            "A place to state how requests, documentation, and log access are handled.",
            "Describe the actual cooperation path used by the provider, including how information is supplied in an easily understood language and how access to logs is granted where they are under provider control.",
            "A short authority-cooperation note.",
          ],
          [
            "Registration, declaration, marking, and related provider duties",
            "Cross-links to conformity and declaration sections.",
            "Record which provider-side duties are completed elsewhere in the package and who approves them.",
            "A cross-reference note inside the package.",
          ],
          [
            "CE marking under Article 48",
            "A place to record how the marking is applied or made digitally accessible.",
            "Record where the CE marking appears, whether it is digital, and whether notified-body identification must accompany it.",
            "A CE-marking note.",
          ],
          [
            "Registration under Article 49",
            "A place to record the registration route where it applies.",
            "Record whether registration applies, which register is used, and the retained reference for the relevant AI system.",
            "A registration note.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 16",
        lead:
          "The template can structure the provider-obligations section, but it cannot supply your retention process, corrective-action workflow, or authority response path.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Documentation keeping process",
            "Articles 16 and 18 require the provider to keep documentation and related records available.",
            "A short note naming the repository, versioning control, and 10-year retention path.",
          ],
          [
            "Log-retention and retrieval process",
            "Articles 16 and 19 require automatically generated logs to be kept where they are under provider control.",
            "A short note naming the logs kept, retention period, and retrieval path.",
          ],
          [
            "Corrective-action and notification workflow",
            "Article 20 requires corrective action and duty-to-inform when non-conformity or risk appears.",
            "A step-by-step internal escalation and notification note.",
          ],
          [
            "Authority cooperation contact path",
            "Article 21 requires cooperation with competent authorities and access to logs where applicable.",
            "A named contact and escalation path, plus the documentation and log-access route.",
          ],
          [
            "Cross-reference to conformity and declaration work",
            "Article 16 sits alongside the conformity and declaration duties.",
            "A short note linking to the related sections in the package.",
          ],
          [
            "CE-marking record",
            "Article 48 requires the provider to affix CE marking in the required form.",
            "A short note naming where the CE marking appears and how it is accessed.",
          ],
          [
            "Registration record",
            "Article 49 requires registration where that article applies.",
            "A short note naming the register, reference, and responsible owner.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-43": {
    title: {
      en: "EU AI Act Article 43 - Conformity Assessment Template",
    },
    description: {
      en: "Template for documenting the conformity assessment procedure applied to a high-risk AI system under Article 43.",
    },
    intro: {
      en:
        "Article 43 is where the package has to state how conformity assessment is handled before the system is placed on the market or put into service. The requirement is procedural and system-specific: the record has to match the route actually used for the relevant AI system.",
    },
    coverage: {
      en: "Evidence-backed scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 43 expects, what the template can add, and what your team still owns",
        note:
          "This template helps capture the conformity-assessment route in writing. It does not decide which route applies to your system and it does not perform the assessment for you.",
        headers: [
          "Article 43 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "A stated conformity-assessment route",
            "A dedicated section for the procedure used for the relevant AI system.",
            "State which conformity-assessment route applies and why.",
            "A conformity-assessment section in the package.",
          ],
          [
            "Evidence of readiness before market placement or service",
            "A place to cross-reference the documentation and supporting materials used in the assessment.",
            "List the actual documents, tests, and approvals used for the system.",
            "A referenced conformity file list.",
          ],
          [
            "Any notified-body involvement where applicable",
            "Prompts for the part of the route that involves external review.",
            "Record whether a notified body is involved and capture the relevant reference details when applicable.",
            "A notified-body note, if applicable.",
          ],
          [
            "System-specific status and date",
            "A structured section for current assessment status.",
            "Record the real status, date, and owner for the assessment work.",
            "A dated status record.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 43",
        lead:
          "Conformity assessment is not generated from runtime artifacts alone. The template can structure the section, but your team still has to state the route actually used and the status of the work.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Assessment route used",
            "The package must reflect the actual conformity-assessment procedure applied.",
            "A short route statement naming the procedure used.",
          ],
          [
            "Current assessment status",
            "The package should show where the system stands in the procedure.",
            "A dated status note with owner.",
          ],
          [
            "Notified-body details where applicable",
            "Some routes require external review details.",
            "A short external-review reference note.",
          ],
          [
            "Cross-reference to supporting documents",
            "The assessment section needs links to the underlying materials.",
            "A short list of the linked documents used in the assessment.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-47": {
    title: {
      en: "EU AI Act Article 47 - EU Declaration of Conformity Template",
    },
    description: {
      en: "Template for the EU declaration of conformity requirement under Article 47 for high-risk AI systems.",
    },
    intro: {
      en:
        "Article 47 requires the provider to draw up an EU declaration of conformity for each high-risk AI system. The declaration is not just a statement that compliance work exists somewhere else; it is a formal document tied to the relevant AI system and its conformity route.",
    },
    coverage: {
      en: "Evidence-backed scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 47 expects, what the template can add, and what your team still owns",
        note:
          "The template gives you a declaration section and a structure for the required references. It does not create a valid declaration by itself and it does not replace provider approval or signature.",
        headers: [
          "Article 47 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "A declaration for each relevant high-risk AI system",
            "A dedicated declaration section in the package.",
            "State the declaration for the specific system and version.",
            "A declaration draft tied to the system.",
          ],
          [
            "References to the conformity route and supporting materials",
            "A structured place for the references that belong with the declaration.",
            "Record the real references, standards, and conformity route used.",
            "A referenced declaration record.",
          ],
          [
            "A formal provider statement",
            "A clear place for the declaration wording.",
            "Add the final provider statement and approval text used in practice.",
            "A final declaration text for review.",
          ],
          [
            "Provider sign-off",
            "A place to capture that sign-off still remains human-owned.",
            "Record the approver, date, and signing function used by the provider.",
            "A signature-ready declaration section.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 47",
        lead:
          "The template can structure the declaration section, but your team still has to provide the final declaration text, references, approver, and signature details.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Final declaration statement",
            "Article 47 requires the provider to draw up the declaration.",
            "A short declaration statement ready for internal review.",
          ],
          [
            "References to the conformity route",
            "The declaration has to align with the actual conformity path used for the system.",
            "A short list of standards, specifications, and related references.",
          ],
          [
            "Named approver and signatory",
            "The declaration remains a provider-owned act.",
            "A sign-off record with role and date.",
          ],
          [
            "Version-specific identification",
            "The declaration has to identify the relevant AI system clearly.",
            "A short system-identification block inside the declaration.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-48": {
    title: {
      en: "EU AI Act Article 48 - CE Marking Template",
    },
    description: {
      en: "Template for recording how CE marking is applied or made digitally accessible for a high-risk AI system under Article 48.",
    },
    intro: {
      en:
        "Article 48 requires CE marking for the relevant high-risk AI system. This template is a place to record how the marking is applied in practice, whether it is digitally accessible, and whether notified-body identification must appear with it where that route applies.",
    },
    coverage: {
      en: "Provider-side scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 48 expects, what the template can add, and what your team still owns",
        note:
          "The template structures the CE-marking record. It does not decide whether notified-body identification is required and it does not replace provider approval of the final marking arrangement.",
        headers: [
          "Article 48 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "CE marking for the relevant high-risk AI system",
            "A section that records the marking arrangement for the system.",
            "State where the CE marking appears for the system in practice.",
            "A CE-marking record.",
          ],
          [
            "Digital CE marking where the system is provided digitally",
            "A place to record how the digital marking is accessed.",
            "Describe the interface path, machine-readable code, or other electronic means used.",
            "A digital-access note.",
          ],
          [
            "Notified-body identification where applicable",
            "A field for the identification number when that route applies.",
            "Record whether notified-body identification accompanies the marking and where it appears.",
            "A notified-body marking note.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 48",
        lead:
          "The template can structure the CE-marking section, but your team still has to provide the actual placement, access path, and notified-body identification details where applicable.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "CE-marking placement",
            "Article 48 requires the CE marking to appear in the required form for the relevant system.",
            "A short note naming where the marking appears in the interface, packaging, or documentation.",
          ],
          [
            "Digital access path",
            "Digital systems must make the marking easily accessible.",
            "A short note naming the interface path, machine-readable code, or other electronic access route.",
          ],
          [
            "Notified-body identifier where applicable",
            "Some conformity routes require the notified-body identification number to appear with the marking.",
            "A short note naming the identifier and where it is shown.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "article-49": {
    title: {
      en: "EU AI Act Article 49 - Registration Template",
    },
    description: {
      en: "Template for recording the registration obligations that apply to a high-risk AI system under Article 49.",
    },
    intro: {
      en:
        "Article 49 requires registration where that article applies. The useful job of the template is to record whether registration applies to the relevant AI system, which register is used, and what reference is retained in the provider package.",
    },
    coverage: {
      en: "Provider-side scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 49 expects, what the template can add, and what your team still owns",
        note:
          "The template structures the registration record. It does not decide whether registration applies to your system and it does not perform registration for you.",
        headers: [
          "Article 49 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "A registration record where Article 49 applies",
            "A section that records whether registration applies to the relevant AI system.",
            "State whether the system must be registered before it is placed on the market or put into service.",
            "A registration-applicability note.",
          ],
          [
            "The actual registration route and reference",
            "A place to record the register used and the resulting reference.",
            "Record the EU database or other applicable registration route and the retained identifier.",
            "A registration-reference note.",
          ],
          [
            "Responsible owner for keeping the registration current",
            "A field for ownership and update responsibility.",
            "Name the owner who keeps the registration record current.",
            "A named registration owner.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 49",
        lead:
          "The template can structure the registration section, but your team still has to provide the applicability decision, the register reference, and the responsible owner.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Registration applicability decision",
            "Article 49 has to be applied to the relevant system where the registration duty exists.",
            "A short note stating whether registration applies and why.",
          ],
          [
            "Register and reference",
            "Where registration applies, the provider needs the retained registration record.",
            "A short note naming the register and the recorded reference.",
          ],
          [
            "Registration owner",
            "The registration record has to stay current and attributable.",
            "A named owner and update responsibility note.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
  },
  "annex-v": {
    title: {
      en: "EU AI Act Annex V - Declaration Content Template",
    },
    description: {
      en: "Template for the information that has to appear in the EU declaration of conformity under Annex V.",
    },
    intro: {
      en:
        "Annex V sets out the content that belongs in the EU declaration of conformity. The useful job of the template is not to over-interpret the Annex, but to make sure the provider has a clear place to record the required identification, references, date, place, and signatory details.",
    },
    coverage: {
      en: "Evidence-backed scaffold",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Annex V expects, what the template can add, and what your team still owns",
        note:
          "Annex V is content-specific. The template gives you the structure, but your team still has to fill in the actual provider, system, standards, and signatory information.",
        headers: [
          "Annex V expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "Provider identification",
            "A section for provider name and address details.",
            "Fill in the provider identity exactly as it should appear in the declaration.",
            "A declaration identity block.",
          ],
          [
            "Identification of the AI system",
            "A section for system name, version, and identifying references.",
            "Record the actual system identification used in the declaration.",
            "A system-identification block.",
          ],
          [
            "References to standards, common specifications, or notified body details where applicable",
            "A section for the references that Annex V expects in the declaration.",
            "List the standards, specifications, or notified-body references that actually apply.",
            "A references block inside the declaration.",
          ],
          [
            "Place and date of issue and signatory details",
            "A section for final declaration issuance details.",
            "Fill in the place, date, signatory name, and function.",
            "A signature block ready for final approval.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Annex V",
        lead:
          "Annex V is declaration content. The template can lay out the fields, but your team still has to supply the actual identity, references, and signatory data used in the declaration.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Provider name and address",
            "Annex V requires provider identification inside the declaration.",
            "A short identity block.",
          ],
          [
            "System identification",
            "Annex V requires clear identification of the relevant AI system.",
            "A name, version, and reference line.",
          ],
          [
            "Applicable references",
            "Annex V requires the relevant standards, specifications, or notified-body references where applicable.",
            "A short list of references.",
          ],
          [
            "Issuance and signatory details",
            "Annex V requires place/date and signatory information.",
            "A dated signature block.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
    hideExamples: true,
    hideTopActions: true,
    hideBottomActions: true,
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
        "Article 12 is where the documentation has to show that a run can be reconstructed outside your internal dashboards. The hard part is not having logs in principle. The hard part is having a record trail that another team can actually inspect, follow, and retain. For high-risk systems, that trail still has to fit into a broader Annex IV documentation package.",
      de:
        "In Artikel 12 prueft eine pruefende Person, ob sich ein Run ausserhalb Ihrer internen Dashboards rekonstruieren laesst. Die Schwierigkeit besteht nicht darin, Logs im Prinzip zu haben. Die Schwierigkeit besteht darin, eine nachvollziehbare Spur zu haben, die eine andere pruefende Person wirklich prüfen, verfolgen und aufbewahren kann. Fuer eine Hochrisiko-Pruefung muss diese Spur trotzdem in ein groesseres Annex-orientiertes Paket passen.",
      fr:
        "L'article 12 est l'endroit ou un evaluateur verifie si un run peut etre reconstruit en dehors de vos tableaux de bord internes. La difficulte n'est pas d'avoir des logs en principe. La difficulte est d'avoir une piste d'enregistrements qu'un autre evaluateur peut vraiment inspecter, suivre et conserver. Pour une revue a haut risque, cette piste doit tout de meme s'integrer dans un dossier plus large structure selon l'Annexe.",
    },
    requirement: {
      en:
        "For agent systems, this means more than generic application logs. The section should show what is recorded, how files link back to a concrete run, what artifacts survive handoff, and what retention controls still depend on operator policy. Article 12 is necessary, but it does not replace Annex IV documentation, deployer information, oversight, or monitoring.",
      de:
        "Fuer Agentensysteme bedeutet das mehr als allgemeine Applikationslogs. Der Abschnitt sollte zeigen, was aufgezeichnet wird, wie Dateien auf einen konkreten Run zurueckverweisen, welche Artefakte die Uebergabe ueberstehen und welche Aufbewahrungskontrollen weiterhin von der Operator-Richtlinie abhaengen. Artikel 12 ist notwendig, ersetzt aber weder die Dokumentation nach Anhang IV noch Deployer-Informationen, Aufsicht oder Monitoring.",
      fr:
        "Pour les systemes d'agents, cela signifie plus que des logs applicatifs generiques. La section doit montrer ce qui est enregistre, comment les fichiers renvoient a un run concret, quels artefacts survivent a la transmission et quels controles de retention dependent encore de la politique de l'operateur. L'article 12 est necessaire, mais il ne remplace ni la documentation Annexe IV, ni l'information du deployeur, ni l'oversight, ni le monitoring.",
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
            "A record path after something goes wrong",
            "Lets another team inspect the generated report, compare file, and retained artifacts already in the package.",
            "Lets another team open the underlying run records and tool-level artifacts tied to the same cases.",
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
          "The toolkit can preserve and package records, but it does not choose your retention posture or disclosure rules. Those decisions still belong in your logging policy and governance workflow. Article 12 therefore becomes one reviewed layer inside the larger high-risk package, not the whole package by itself.",
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
          "Das Toolkit kann Datensaetze erhalten und in ein Paket uebernehmen, entscheidet aber nicht ueber Ihre Aufbewahrungsregeln oder Offenlegungsvorgaben. Diese Entscheidungen gehoeren weiterhin in Ihre Journalisierungsrichtlinie und Ihren Governance-Ablauf. Artikel 12 wird damit zu einer geprueften Schicht im groesseren Hochrisiko-Paket und nicht zum ganzen Paket fuer sich.",
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
          "Le toolkit peut conserver et assembler ces enregistrements dans le dossier, mais il ne choisit ni votre posture de retention ni vos regles de divulgation. Ces decisions restent dans votre politique de journalisation et votre workflow de gouvernance. L'article 12 devient donc une couche relue a l'interieur du paquet a haut risque plus large, pas le paquet complet a lui seul.",
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
        "Article 13 is where your documentation has to show that the instructions match the real technical boundary of the system. A deployment guide alone is not enough. The instructions have to name what the system is for, what conditions it relies on, and when a human must step in.",
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
          "Without connecting your agent, the toolkit can only draft the instructions file from the generated package. After adapter integration, it can also attach links from the instructions to real runs, linked article outputs, and oversight records.",
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
            "Adds links from that draft to real runs, linked article outputs, and runtime evidence for the connected system.",
            "Write the final intended purpose, excluded uses, and the deployment boundary in business terms.",
          ],
          [
            "Conditions for safe use",
            "Can point to current quality status, known limitations, and residual gaps already visible in the package.",
            "Can link those limits back to live execution quality, monitoring outputs, and logging outputs from real runs.",
            "Define prerequisites, local operating conditions, and any deployment-specific assumptions the operator must satisfy.",
          ],
          [
            "Human review instructions",
            "Can reference approval-required cases and current oversight outputs already in the package.",
            "Can link instructions back to the oversight summary, blocked cases, and escalation evidence from real runs.",
            "Write the actual operator guidance: when to review, when to stop, and who must be involved.",
          ],
          [
            "Re-check after change",
            "Can note that the instructions are tied to the current package and its unresolved gaps.",
            "Can show the new evidence and linked article outputs created after model, prompt, tool, or deployment changes.",
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
            "Before the instructions are shared with deployers, customers, or operations teams.",
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
            "Compare report - compare-report.json",
            "Supports any operator guidance tied to current quality status, highlighted cases, or system limitations.",
            "demo/eu-ai-act/compare-report.json",
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
            "Vergleichsbericht - compare-report.json",
            "Stuetzt jede Anleitung, die an beobachtete Qualitaetsbefunde, Grenzen oder bekannte Unterschiede gebunden ist.",
            "demo/eu-ai-act/compare-report.json",
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
            "Rapport de comparaison - compare-report.json",
            "Soutient toute consigne liee aux constats de qualite observes, aux limites ou aux ecarts connus.",
            "demo/eu-ai-act/compare-report.json",
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
        "Article 14 is where the documentation has to show that humans can actually supervise, intervene, and stop the system when needed. For agent workflows, that means the oversight path has to be concrete: what escalates, what blocks, who reviews it, and where that outcome is recorded.",
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
            "Can show approval-required cases, blocked cases, and the current oversight summary already in the package.",
            "Can preserve a case-linked review queue and approval or block trail tied to the connected agent.",
            "Decide what notes, approvals, or sign-offs must be captured in your governance process.",
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
            "Before the oversight process is used in real operation or governance review.",
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
            "At governance approval or when the oversight process is formally assigned.",
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
        title: "Article 14 is documented through oversight and operating outputs",
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
            "Article 9 risk register - article-9-risk-register.json",
            "Shows where blocked cases, escalation triggers, and human-review controls affect the wider risk picture.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
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
            "Artikel-9-Risikoregister - article-9-risk-register.json",
            "Zeigt, wie Aufsichtsbefunde offene Risiken, Eskalationen und erforderliche Folgeaktionen dokumentiert halten.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
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
            "Registre de risques Article 9 - article-9-risk-register.json",
            "Montre comment les constats de supervision gardent visibles les risques ouverts, les escalades et les actions de suivi requises.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
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
        "Article 15 is where performance claims stop being slogans and start needing evidence. The documentation has to show quality signals, robustness and security constats, version-to-version comparison, and a clear point where the system no longer meets the provider's accepted threshold.",
      de:
        "In Artikel 15 hoeren Leistungsversprechen auf, Schlagwoerter zu sein, und brauchen echte Nachweise. Eine pruefende Person will Qualitaetssignale, Robustheits- und Sicherheitsbefunde, Vergleiche zwischen Versionen und einen klaren Punkt sehen, an dem das System nicht fuer die Inbetriebnahme freigegeben werden sollte.",
      fr:
        "L'article 15 est l'endroit ou les promesses de performance cessent d'etre des slogans et commencent a exiger des preuves. Un evaluateur veut voir des signaux de qualite, des constats de robustesse et de securite, une comparaison entre versions et un point clair ou le systeme n'est pas pret pour la mise en production.",
    },
    requirement: {
      en:
        "A useful Article 15 section should show the quality signals that matter, the failures that still exist, the comparison across changes, and the threshold for accepting, escalating, or blocking the current version in provider governance.",
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
            "Explain which robustness or security constats are acceptable, and which require remediation before the system is relied on.",
          ],
          [
            "Version-to-version comparison",
            "Shows baseline versus new comparison already built into the rapport de comparaison.",
            "Lets that comparison stay attached to real run inputs, outputs, and retained artifacts over time.",
            "Decide whether the chosen cases are sufficient to justify the claim you want to make.",
          ],
          [
            "A documented performance threshold",
            "Shows current execution-quality status and case outcomes already in the package.",
            "Can keep the threshold evidence tied to recurring runs and monitoring history as the system changes.",
            "Set the final threshold for acceptance, escalation, or block and approve that decision.",
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
            "Before you rely on the package to support performance or conformity claims.",
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
        title: "Article 15 is documented through comparison, integrity, and performance outputs",
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
            "Article 9 risk register - article-9-risk-register.json",
            "Shows how serious performance or security issues can reopen or update risk entries.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
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
            "Artikel-9-Risikoregister - article-9-risk-register.json",
            "Zeigt, wie aktuelle Qualitaets- oder Sicherheitsbefunde als dokumentierte Risiken und Folgemassnahmen festgehalten werden.",
            "demo/eu-ai-act/compliance/article-9-risk-register.json",
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
            "Registre de risques Article 9 - article-9-risk-register.json",
            "Montre comment les constats qualite ou securite actuels sont tenus comme risques documentes et actions de suivi.",
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
        "Article 17 is where teams have to show that their process is not ad hoc. The documentation has to show how changes are controlled, how testing is repeated, how monitoring feeds back into the process, and where written procedures still sit outside the product.",
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
          "Without connecting your agent, the toolkit can only draft the QMS-lite file from the generated package. After adapter integration and recurring use, it can keep that scaffold tied to real change, monitoring, and follow-up outputs.",
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
            "Keeps that draft linked to real version changes, monitoring updates, and compare-report outputs for the connected system.",
            "Write the formal change procedure, approval path, and accountability rules your organization uses.",
          ],
          [
            "Repeatable testing and review steps",
            "Can point to the compare report and current statutory outputs already present in the package.",
            "Can keep those testing and statutory outputs current as the connected agent is rerun over time.",
            "Define which suites, thresholds, and review steps are mandatory before relying on the system or placing it on the market or putting it into service.",
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
            "A short list of linked procedures covering change control, system updates, issue follow-up, and monitoring escalation.",
          ],
          [
            "Document control and approval path",
            "When QMS documents must be versioned, approved, and updated formally.",
            "A document-control note naming owner, versioning rule, and approval step.",
          ],
          [
            "Training and competency expectations",
            "Before operator or engineering roles are treated as part of the QMS.",
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
            "A simple role map naming who owns change control, monitoring follow-up, and final approval.",
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
            "Article 16 provider obligations - article-16-provider-obligations.json",
            "Shows the provider-owned obligations and documentation controls that feed the QMS scaffold.",
            "demo/eu-ai-act/compliance/article-16-provider-obligations.json",
          ],
          [
            "Post-market monitoring - post-market-monitoring.json",
            "Shows how monitoring can feed back into the process.",
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
            "Artikel-16-Anbieterpflichten - article-16-provider-obligations.json",
            "Zeigt die provider-seitigen Pflichten und Folgeaktionen, die in das QMS-Geruest einfliessen.",
            "demo/eu-ai-act/compliance/article-16-provider-obligations.json",
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
            "Obligations du fournisseur Article 16 - article-16-provider-obligations.json",
            "Montre les obligations cote fournisseur et les actions de suivi qui alimentent le cadre QMS.",
            "demo/eu-ai-act/compliance/article-16-provider-obligations.json",
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
  "article-22": {
    title: {
      en: "EU AI Act Article 22 - Authorised Representative Template",
      de: "EU KI-Verordnung Artikel 22 - Vorlage fuer den Bevollmaechtigten",
      fr: "EU AI Act Article 22 - Modele pour le representant autorise",
    },
    description: {
      en: "Template for the authorised-representative record that applies when the provider of a high-risk AI system is established outside the Union.",
      de: "Vorlage fuer den Eintrag zum Bevollmaechtigten, wenn der Anbieter eines Hochrisiko-KI-Systems ausserhalb der Union niedergelassen ist.",
      fr: "Modele pour l'enregistrement du representant autorise quand le fournisseur d'un systeme d'IA a haut risque est etabli hors de l'Union.",
    },
    intro: {
      en:
        "Article 22 matters only where the provider is established outside the Union. In that case the provider must appoint an authorised representative in the Union by written mandate. This page is not a separate role workflow. It is a conditional provider-side record that sits next to the rest of the provider package.",
      de:
        "Artikel 22 ist nur relevant, wenn der Anbieter ausserhalb der Union niedergelassen ist. Dann muss der Anbieter per schriftlichem Mandat einen Bevollmaechtigten in der Union benennen. Diese Seite ist kein eigener Rollen-Workflow. Sie ist ein bedingter provider-seitiger Eintrag, der neben dem restlichen Provider-Paket steht.",
      fr:
        "L'article 22 ne compte que lorsque le fournisseur est etabli hors de l'Union. Dans ce cas, le fournisseur doit designer un representant autorise dans l'Union par mandat ecrit. Cette page n'est pas un workflow de role separe. C'est un enregistrement conditionnel cote fournisseur qui reste a cote du reste du package fournisseur.",
    },
    coverage: {
      en: "Provider-side scaffold",
      de: "Provider-seitiges Geruest",
      fr: "Structure cote fournisseur",
    },
    contractMatrix: {
      en: {
        eyebrow: "Who supplies what",
        title: "What Article 22 expects, what the template can add, and what your team still owns",
        note:
          "Use this page only when the provider is established outside the Union. The template structures the record of the authorised representative and the written mandate. It does not replace the actual mandate or the representative's own legal duties.",
        headers: [
          "Article 22 expects",
          "What the template can add",
          "What your team still has to write",
          "Practical output to keep",
        ],
        rows: [
          [
            "An authorised representative established in the Union",
            "A section that records the named representative and mandate reference.",
            "Name the representative and record the exact mandate used.",
            "An authorised-representative record.",
          ],
          [
            "A written mandate from the provider",
            "A place to record the mandate reference and scope.",
            "Record the signed mandate reference, date, and scope used in practice.",
            "A mandate reference note.",
          ],
          [
            "A clear boundary between provider duties and representative duties",
            "A field for the provider-side explanation of how Article 22 is handled.",
            "Record which materials the representative keeps available and how authority cooperation is routed.",
            "A provider-side Article 22 note.",
          ],
        ],
      },
      de: {
        eyebrow: "Wer liefert was",
        title: "Was Artikel 22 verlangt, was die Vorlage strukturieren kann und was Ihr Team weiterhin liefern muss",
        note:
          "Nutzen Sie diese Seite nur, wenn der Anbieter ausserhalb der Union niedergelassen ist. Die Vorlage strukturiert den Eintrag zum Bevollmaechtigten und zum schriftlichen Mandat. Sie ersetzt weder das eigentliche Mandat noch die eigenen rechtlichen Pflichten des Bevollmaechtigten.",
        headers: [
          "Was Artikel 22 verlangt",
          "Was die Vorlage ergaenzen kann",
          "Was Ihr Team weiterhin schreiben muss",
          "Welches praktische Ergebnis bleiben sollte",
        ],
        rows: [
          [
            "Einen in der Union niedergelassenen Bevollmaechtigten",
            "Einen Abschnitt, der den benannten Bevollmaechtigten und die Mandatsreferenz festhaelt.",
            "Benennen Sie den Bevollmaechtigten und halten Sie die exakt verwendete Mandatsreferenz fest.",
            "Einen Eintrag zum Bevollmaechtigten.",
          ],
          [
            "Ein schriftliches Mandat des Anbieters",
            "Einen Platz fuer die Referenz und den Geltungsbereich des Mandats.",
            "Dokumentieren Sie die unterzeichnete Mandatsreferenz, das Datum und den praktischen Geltungsbereich.",
            "Einen Hinweis zur Mandatsreferenz.",
          ],
          [
            "Eine klare Grenze zwischen Anbieterpflichten und Pflichten des Bevollmaechtigten",
            "Ein Feld fuer die provider-seitige Erklaerung, wie Artikel 22 umgesetzt wird.",
            "Dokumentieren Sie, welche Unterlagen der Bevollmaechtigte verfuegbar haelt und wie die Zusammenarbeit mit Behoerden geleitet wird.",
            "Einen provider-seitigen Hinweis zu Artikel 22.",
          ],
        ],
      },
      fr: {
        eyebrow: "Qui fournit quoi",
        title: "Ce que l'article 22 exige, ce que le modele peut structurer, et ce que votre equipe doit encore fournir",
        note:
          "Utilisez cette page seulement lorsque le fournisseur est etabli hors de l'Union. Le modele structure l'enregistrement du representant autorise et du mandat ecrit. Il ne remplace ni le mandat reel ni les obligations juridiques propres du representant.",
        headers: [
          "Ce que l'article 22 exige",
          "Ce que le modele peut ajouter",
          "Ce que votre equipe doit encore rediger",
          "Sortie pratique a conserver",
        ],
        rows: [
          [
            "Un representant autorise etabli dans l'Union",
            "Une section qui enregistre le representant nomme et la reference du mandat.",
            "Nommez le representant et enregistrez la reference exacte du mandat utilise.",
            "Un enregistrement du representant autorise.",
          ],
          [
            "Un mandat ecrit du fournisseur",
            "Un espace pour enregistrer la reference et le perimetre du mandat.",
            "Enregistrez la reference du mandat signe, la date et le perimetre applique en pratique.",
            "Une note de reference du mandat.",
          ],
          [
            "Une frontiere claire entre les obligations du fournisseur et celles du representant",
            "Un champ pour l'explication cote fournisseur de la mise en oeuvre de l'article 22.",
            "Enregistrez quels documents le representant doit garder disponibles et comment la cooperation avec l'autorite est routee.",
            "Une note cote fournisseur sur l'article 22.",
          ],
        ],
      },
    },
    operatorDetail: {
      en: {
        eyebrow: "Manual fields",
        title: "What your team still adds to Article 22",
        lead:
          "This page is only needed when the provider is established outside the Union. The template can structure the record, but your team still has to provide the representative identity, written mandate, and the actual coordination path.",
        headers: ["What you add", "Why it is required", "Practical format to use"],
        rows: [
          [
            "Authorised representative identity",
            "Article 22 requires a representative established in the Union.",
            "A short note naming the representative and contact details.",
          ],
          [
            "Written mandate reference",
            "Article 22 requires the representative to act under a written mandate from the provider.",
            "A mandate reference with date and version.",
          ],
          [
            "Provider-to-representative coordination path",
            "The representative has to be able to keep documentation and cooperate with authorities under the mandate.",
            "A short note naming the documentation handoff and authority-contact path.",
          ],
        ],
      },
      de: {
        eyebrow: "Manuelle Felder",
        title: "Was Ihr Team fuer Artikel 22 weiterhin hinzufuegt",
        lead:
          "Diese Seite wird nur benoetigt, wenn der Anbieter ausserhalb der Union niedergelassen ist. Die Vorlage kann den Eintrag strukturieren, aber Ihr Team muss weiterhin die Identitaet des Bevollmaechtigten, das schriftliche Mandat und den tatsaechlichen Koordinationspfad liefern.",
        headers: ["Was Sie hinzufuegen", "Warum es verlangt ist", "Welches praktische Format passt"],
        rows: [
          [
            "Identitaet des Bevollmaechtigten",
            "Artikel 22 verlangt einen in der Union niedergelassenen Bevollmaechtigten.",
            "Eine kurze Notiz mit Name des Bevollmaechtigten und Kontaktdaten.",
          ],
          [
            "Referenz des schriftlichen Mandats",
            "Artikel 22 verlangt, dass der Bevollmaechtigte auf Grundlage eines schriftlichen Mandats des Anbieters handelt.",
            "Eine Mandatsreferenz mit Datum und Version.",
          ],
          [
            "Koordinationspfad zwischen Anbieter und Bevollmaechtigtem",
            "Der Bevollmaechtigte muss unter dem Mandat Unterlagen verfuegbar halten und mit Behoerden zusammenarbeiten koennen.",
            "Eine kurze Notiz, die Dokumentenuebergabe und Behoerdenkontakt beschreibt.",
          ],
        ],
      },
      fr: {
        eyebrow: "Champs manuels",
        title: "Ce que votre equipe ajoute encore pour l'article 22",
        lead:
          "Cette page n'est necessaire que lorsque le fournisseur est etabli hors de l'Union. Le modele peut structurer l'enregistrement, mais votre equipe doit encore fournir l'identite du representant, le mandat ecrit et le chemin reel de coordination.",
        headers: ["Ce que vous ajoutez", "Pourquoi c'est requis", "Format pratique a utiliser"],
        rows: [
          [
            "Identite du representant autorise",
            "L'article 22 exige un representant etabli dans l'Union.",
            "Une courte note donnant le nom du representant et ses coordonnees.",
          ],
          [
            "Reference du mandat ecrit",
            "L'article 22 exige que le representant agisse sur la base d'un mandat ecrit du fournisseur.",
            "Une reference de mandat avec date et version.",
          ],
          [
            "Chemin de coordination fournisseur-representant",
            "Le representant doit pouvoir conserver la documentation et cooperer avec les autorites selon le mandat.",
            "Une courte note qui nomme le chemin de transmission documentaire et le point de contact avec l'autorite.",
          ],
        ],
      },
    },
    hideSectionGuide: true,
    hideFaq: true,
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
        "Article 72 is where teams move from one-time packaging into continuous monitoring. The documentation has to show what signals are watched during operation, how often they are reviewed, what triggers escalation, and how monitoring links back to the original dossier.",
      de:
        "In Artikel 72 wechseln Teams von einmaliger Paketierung zu kontinuierlicher Beobachtung nach dem Inverkehrbringen. Eine pruefende Person will sehen, welche Signale nach der Inbetriebnahme beobachtet werden, wie oft sie geprueft werden, was eine Eskalation ausloest und wie diese Beobachtung zum urspruenglichen Nachweispaket zurueckverweist.",
      fr:
        "L'article 72 est l'endroit ou les equipes passent d'un packaging ponctuel a une surveillance continue. Un evaluateur veut voir quels signaux sont suivis apres la mise en production, a quelle frequence ils sont revus, ce qui declenche une escalade et comment la surveillance renvoie au dossier de preuves d'origine.",
    },
    requirement: {
      en:
        "For agent systems, post-market monitoring is usually where dashboards stop being enough. Teams need a documented cadence, named triggers, and a path from drift or blocking constats back into review and corrective action.",
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
          "Without connecting your agent and collecting recurring history, the toolkit can only draft the monitoring plan from the current package. After adapter integration and recurring runs, it can add monitoring history, drift signals, and linked follow-up outputs.",
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
            "Can add drift signals, recurring failures, blocking constats, and linked follow-up outputs from recurring runs.",
            "Decide which triggers require escalation, which require only review, and which require incident preparation.",
          ],
          [
            "A continuity loop back into governance",
            "Can show how the current package already links open risks and unresolved gaps.",
            "Can link monitoring outputs back to Article 9 risk updates and corrective-action follow-up.",
            "Define the response workflow, owner, and timeline once a monitoring trigger fires.",
          ],
          [
            "Monitoring interpretation and response",
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
            "Before the plan is used in operation or governance review.",
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
        title: "Article 72 is built from monitoring, follow-up, and risk-update files",
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
            "Current monitoring history and drift evidence used during operation.",
            "demo/eu-ai-act/compliance/post-market-monitoring.json",
          ],
          [
            "Compare report - compare-report.json",
            "Shows the current execution-quality signals and recurring case outcomes that monitoring can refer back to.",
            "demo/eu-ai-act/compare-report.json",
          ],
          [
            "Article 9 risk register - article-9-risk-register.json",
            "Shows how monitoring constats can reopen or update risk entries.",
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
            "Vergleichsbericht - compare-report.json",
            "Zeigt, welche beobachteten Befunde, Fallsignale und Qualitaetsveraenderungen den Plan aktualisieren koennen.",
            "demo/eu-ai-act/compare-report.json",
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
            "Rapport de comparaison - compare-report.json",
            "Montre quels constats de surveillance, signaux par cas et variations de qualite peuvent mettre le plan a jour.",
            "demo/eu-ai-act/compare-report.json",
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
            "Can link that draft to real monitoring signals, blocked cases, approval cases, and related package outputs.",
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
            "Human oversight summary - human-oversight-summary.json",
            "Provides the human review, blocking, and escalation signals linked to the same incident package.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
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
            "Aufsichtsuebersicht - human-oversight-summary.json",
            "Liefert menschliche Pruef-, Blockierungs- und Eskalationssignale, die an dasselbe Vorfallspaket gebunden sind.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
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
            "Synthese de supervision humaine - human-oversight-summary.json",
            "Fournit les signaux de revue humaine, de blocage et d'escalade lies au meme dossier d'incident.",
            "demo/eu-ai-act/compliance/human-oversight-summary.json",
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
            "Can keep those fields linked to the latest Article 13, oversight, and other statutory outputs from the connected system.",
            "Write the final intended purpose, target users, excluded uses, and deployment assumptions.",
          ],
          [
            "Linked evidence across risk, logging, oversight, and quality",
            "Can already link the dossier to generated Article 9, 10, 12, 13, 14, 15, 16, 17, 43, 47, 72, and Annex V outputs in the package.",
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
            "When the dossier needs to show who owns oversight, documentation updates, and monitoring.",
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
            "Article 10 data governance - article-10-data-governance.json",
            "One of the linked article outputs the dossier depends on for data governance and data-quality controls.",
            "demo/eu-ai-act/compliance/article-10-data-governance.json",
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
            "Artikel-10-Daten-Governance - article-10-data-governance.json",
            "Zeigt die Datenherkunft, Relevanz, Grenzpruefung und Governance-Hinweise, auf die sich das Dossier stuetzt.",
            "demo/eu-ai-act/compliance/article-10-data-governance.json",
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
            "Gouvernance des donnees Article 10 - article-10-data-governance.json",
            "Montre la provenance des donnees, leur pertinence, les controles de limites et les indices de gouvernance dont le dossier depend.",
            "demo/eu-ai-act/compliance/article-10-data-governance.json",
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
            "For agent systems a useful pack usually contains risk signals, structured event logs, trace anchors, linked package outputs, and recurring monitoring context. The pack should also be portable enough to move between engineering, security, legal, and governance teams without losing meaning.",
        },
        {
          heading: "How to build one without inventing a second workflow",
          body:
            "The strongest path is to use the same evaluation workflow for both technical review and documentation support. When the same runs feed both technical review and compliance references, the package stays honest. That is why the product story should remain runtime-linked rather than template-only.",
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

function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
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
  return {
    surfaces: {
      "eu-ai-act": {
        label: "EU AI Act starter snapshot",
        summary: {
          runs_in_window: 2,
          approvals: 1,
          blocks: 1,
          cases_total: 2,
          monitoring_status: "history_current",
          portable_paths: true,
          execution_quality_status: "healthy",
        },
      },
    },
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
    noindex: options.noindex === true,
    excludeFromSitemap: options.excludeFromSitemap === true,
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

function absoluteAssetUrl(origin, assetPath) {
  return `${origin}/${assetPath.replace(/^\/+/, "")}`;
}

function ogLocale(locale) {
  return locale === "de" ? "de_DE" : locale === "fr" ? "fr_FR" : "en_US";
}

function pageLabel(page, locale) {
  const localeCopy = LOCALES[locale];
  const keyMap = {
    landing: locale === "de" ? "Start" : locale === "fr" ? "Accueil" : "Home",
    "how-it-works": localeCopy.nav.how,
    technical: localeCopy.nav.technical,
    templates: localeCopy.nav.templates,
    pricing: localeCopy.nav.pricing,
    demo: locale === "de" ? "EU-Demo" : locale === "fr" ? "Demo UE" : "EU demo",
    docs: localeCopy.nav.docs,
    builder: localeCopy.nav.start,
    contact: localeCopy.footer.contact,
    blog: localeCopy.blog.headline,
    privacy: localeCopy.footer.privacy,
    terms: localeCopy.footer.terms,
    disclaimer: localeCopy.footer.disclaimer,
    cookies: localeCopy.footer.cookies,
  };
  return keyMap[page.key] || page.title;
}

function websiteSchema(origin, locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EU AI Evidence Builder",
    url: `${origin}/${locale}/`,
    inLanguage: locale,
  };
}

function organizationSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EU AI Evidence Builder",
    url: `${origin}/en/`,
    sameAs: [GITHUB_REPO],
  };
}

function pageSchema(page, origin) {
  const type =
    page.key === "docs" || page.key === "templates" || page.key === "blog"
      ? "CollectionPage"
      : page.key === "builder"
        ? "WebApplication"
        : page.segment.startsWith("blog/")
          ? "Article"
          : "WebPage";
  const schema = {
    "@context": "https://schema.org",
    "@type": type,
    name: formatPageTitle(page.title),
    description: page.description,
    inLanguage: page.locale,
    url: canonicalUrl(origin, page.locale, page.segment),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${origin}/${page.locale}/`,
    },
  };
  if (type === "Article") {
    schema.author = { "@type": "Organization", name: SITE_NAME };
    schema.publisher = { "@type": "Organization", name: SITE_NAME };
    schema.mainEntityOfPage = canonicalUrl(origin, page.locale, page.segment);
    schema.articleSection = "EU AI Act";
  }
  return schema;
}

function breadcrumbSchema(page, allPages, origin) {
  const crumbs = [
    {
      "@type": "ListItem",
      position: 1,
      name: page.locale === "de" ? "Start" : page.locale === "fr" ? "Accueil" : "Home",
      item: `${origin}/${page.locale}/`,
    },
  ];

  if (!page.segment) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs,
    };
  }

  const segmentParts = toSegments(page.segment);
  let acc = [];
  for (const part of segmentParts) {
    acc = [...acc, part];
    const segment = acc.join("/");
    const match = allPages.find((candidate) => candidate.locale === page.locale && candidate.segment === segment);
    crumbs.push({
      "@type": "ListItem",
      position: crumbs.length + 1,
      name: match ? pageLabel(match, page.locale) : part,
      item: canonicalUrl(origin, page.locale, segment),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs,
  };
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

function renderPageFaqSection(locale, items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const eyebrow = locale === "de" ? "FAQ" : locale === "fr" ? "FAQ" : "FAQ";
  const title =
    locale === "de"
      ? "Haeufige Fragen"
      : locale === "fr"
        ? "Questions frequentes"
        : "Frequently asked questions";
  return `
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2 class="section-title">${escapeHtml(title)}</h2>
        <div class="split-grid">
          ${renderFaq(items)}
        </div>
      </div>
    </section>
  `;
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
  const fullTitle = formatPageTitle(page.title);
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
  const assetHref = (assetPath) => {
    if (typeof assetPath === "string" && assetPath.startsWith("demo/")) {
      const localizedDemoPath = `demo/${page.locale}/${assetPath.slice("demo/".length)}`;
      return relativeFileHref(currentParts, toSegments(localizedDemoPath));
    }
    return relativeFileHref(currentParts, toSegments(assetPath));
  };
  const versionedAssetHref = (assetPath) => {
    const hrefValue = assetHref(assetPath);
    if (typeof assetPath !== "string" || !assetPath.startsWith("site-assets/")) {
      return hrefValue;
    }
    const fsPath = path.join(SITE_OUTPUT_ROOT, ...toSegments(assetPath));
    if (!existsSync(fsPath)) {
      return hrefValue;
    }
    if (!ASSET_VERSION_CACHE.has(fsPath)) {
      const digest = createHash("sha1").update(readFileSync(fsPath)).digest("hex").slice(0, 10);
      ASSET_VERSION_CACHE.set(fsPath, digest);
    }
    return `${hrefValue}?v=${ASSET_VERSION_CACHE.get(fsPath)}`;
  };
  const alternates = pageAlternates
    .map((alt) => {
      const hrefLang = alt.locale === "en" ? "en" : alt.locale;
      return `<link rel="alternate" hreflang="${hrefLang}" href="${canonicalUrl(origin, alt.locale, alt.segment)}" />`;
    })
    .join("\n");
  const schemaBlocks = [pageSchema(page, origin), breadcrumbSchema(page, allPages, origin), ...(page.schema || [])]
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join("\n");
  const ogAltLocales = pageAlternates
    .filter((alt) => alt.locale !== page.locale)
    .map((alt) => `<meta property="og:locale:alternate" content="${ogLocale(alt.locale)}" />`)
    .join("\n");
  const robotsMeta = page.noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const socialImage = absoluteAssetUrl(origin, proof.screenshotPaths.secondary);
  const ogType = page.segment.startsWith("blog/") ? "article" : page.key === "landing" ? "website" : "website";
  const plausibleScript = PLAUSIBLE_DOMAIN
    ? `<script defer data-domain="${escapeHtml(PLAUSIBLE_DOMAIN)}" src="https://plausible.io/js/script.file-downloads.outbound-links.js"></script>`
    : "";

  return `<!doctype html>
<html lang="${localeCopy.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <meta name="robots" content="${robotsMeta}" />
  ${page.keywords ? `<meta name="keywords" content="${escapeHtml(page.keywords)}" />` : ""}
  <link rel="canonical" href="${canonicalUrl(origin, page.locale, page.segment)}" />
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${origin}/en/" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:url" content="${canonicalUrl(origin, page.locale, page.segment)}" />
  <meta property="og:site_name" content="EU AI Evidence Builder" />
  <meta property="og:locale" content="${ogLocale(page.locale)}" />
  ${ogAltLocales}
  <meta property="og:image" content="${socialImage}" />
  <meta property="og:image:alt" content="EU AI Evidence Builder proof surface" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${socialImage}" />
  <link rel="stylesheet" href="${versionedAssetHref("site-assets/site.css")}" />
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
  <script src="${versionedAssetHref("site-assets/site.js")}" defer></script>
  ${page.key === "builder" ? `<script src="${versionedAssetHref("site-assets/builder.js")}" defer></script>` : ""}
</body>
</html>`;
}

function renderLanding(locale, ctx) {
  const copy = LOCALES[locale].landing;
  const common = LOCALES[locale].common;
  const proofSurface = ctx.proof.surfaces["eu-ai-act"];
  const proofSurfaceTitle =
    locale === "de"
      ? "EU-AI-Act-Starter-Snapshot"
      : locale === "fr"
        ? "Capture starter EU AI Act"
        : proofSurface?.label || "EU AI Act starter snapshot";
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
      fitEyebrow: "Comparison",
      heroAlt: "Real evidence report screenshot",
    },
    de: {
      metrics: ["Laeufe im Fenster", "Freigaben", "Blockierungen", "Beobachtung"],
      entryEyebrow: "Einstiegspfade",
      fitEyebrow: "Vergleich",
      heroAlt: "Screenshot eines echten Nachweisberichts",
    },
    fr: {
      metrics: ["Runs dans la fenetre", "Approbations", "Blocages", "Surveillance"],
      entryEyebrow: "Parcours d'entree",
      fitEyebrow: "Comparaison",
      heroAlt: "Capture d'un vrai rapport de preuve",
    },
    en: {
      metrics: ["Runs in window", "Approvals", "Blocks", "Monitoring"],
      entryEyebrow: "Entry paths",
      fitEyebrow: "Comparison",
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
          ${copy.heroSubline ? `<p class="muted">${escapeHtml(copy.heroSubline)}</p>` : ""}
          <div class="button-row">
            <a class="button" href="${ctx.href("builder")}" data-track-event="landing_start_free">${escapeHtml(copy.primaryCta)}</a>
            <a class="button-ghost" href="${ctx.href("starter")}" data-track-event="landing_starter">${escapeHtml(copy.secondaryCta)}</a>
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
            <a class="button-soft" href="${ctx.href("builder")}" data-track-event="landing_builder">${escapeHtml(common.liveDemos)}</a>
            <a class="button-soft" href="${ctx.href("demo")}">${escapeHtml(common.viewDemo)}</a>
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
    ${renderPageFaqSection(locale, copy.faq)}
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
          <a class="button-ghost" href="${ctx.href("demo")}">${escapeHtml(LOCALES[locale].common.viewDemo)}</a>
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
          <a class="button-ghost" href="${ctx.href("starter")}">${escapeHtml(copy.proofButton)}</a>
          <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md" target="_blank" rel="noreferrer">${escapeHtml(copy.opsButton)}</a>
        </div>
      </div>
    </section>
  `;
}

function renderHowItWorks(locale, ctx) {
  const copy = LOCALES[locale].how;
  const ui = {
    en: { pipeline: "Process", inputs: "Before you start", automated: "Step by step", outputs: "At the end" },
    de: { pipeline: "Prozess", inputs: "Vor dem Start", automated: "Schritt fuer Schritt", outputs: "Am Ende" },
    fr: { pipeline: "Processus", inputs: "Avant de commencer", automated: "Etape par etape", outputs: "A la fin" },
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
      <div class="container">
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
          <a class="button-ghost" href="${ctx.href("demo")}">${escapeHtml(LOCALES[locale].common.viewDemo)}</a>
          <a class="button-soft" href="${ctx.href("technical")}" data-track-event="how_technical">${escapeHtml(TECHNICAL_PAGE[locale]?.landingButton || TECHNICAL_PAGE.en.landingButton)}</a>
        </div>
      </div>
    </section>
    ${renderPageFaqSection(locale, copy.faq)}
  `;
}

function renderTechnical(locale, ctx) {
  const copy = TECHNICAL_PAGE[locale] || TECHNICAL_PAGE.en;
  const shared = getTechnicalShared(locale);
  const repoHref = GITHUB_REPO;
  const ui = {
    en: {
      verifyEyebrow: "Before installation",
      workflowEyebrow: "Workflow",
      boundaryEyebrow: "Human-owned",
      quickstartEyebrow: "Self-serve EU starter",
      commandsEyebrow: "Deeper technical inspection",
      extendedEyebrow: "Next step",
      proofEyebrow: "Public path",
      proofTitle: "What should already exist before installation time",
      proofBody:
        "A serious product should expose a clear package boundary, explicit verify gates, and a real self-serve starter before your team spends time integrating it.",
    },
    de: {
      verifyEyebrow: "Vor der Installation",
      workflowEyebrow: "Ablauf",
      boundaryEyebrow: "Menschlich gefuehrt",
      quickstartEyebrow: "Am eigenen Agenten pruefen",
      commandsEyebrow: "Tiefere technische Pruefung",
      extendedEyebrow: "Naechster Schritt",
      proofEyebrow: "Oeffentlicher Pfad",
      proofTitle: "Was schon vor Integrationsaufwand sichtbar sein sollte",
      proofBody:
        "Ein ernstzunehmendes Produkt sollte eine klare Paketgrenze, explizite Verifikationsschritte und einen echten Self-Serve-Starter zeigen, bevor Ihr Team Integrationszeit investiert.",
    },
    fr: {
      verifyEyebrow: "Avant installation",
      workflowEyebrow: "Parcours",
      boundaryEyebrow: "Reste humain",
      quickstartEyebrow: "Tester sur votre propre agent",
      commandsEyebrow: "Inspection technique plus profonde",
      extendedEyebrow: "Etape suivante",
      proofEyebrow: "Parcours public",
      proofTitle: "Ce qui doit deja exister avant de depenser du temps d'integration",
      proofBody:
        "Un produit serieux doit montrer une frontiere de paquet claire, des etapes de verification explicites et un vrai starter self-serve avant que votre equipe n'investisse du temps d'integration.",
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
            <a class="button" href="${ctx.href("builder")}">${escapeHtml(copy.reviewerButton)}</a>
            <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md" target="_blank" rel="noreferrer">${escapeHtml(copy.demoAgentButton)}</a>
            <a class="button-ghost" href="${repoHref}" target="_blank" rel="noreferrer">${escapeHtml(copy.allDocsButton)}</a>
            <a class="button-soft" href="#first-run">${escapeHtml(copy.quickstartJumpButton)}</a>
          </div>
        </div>
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(ui.proofEyebrow)}</p>
          <h3>${escapeHtml(ui.proofTitle)}</h3>
          <div class="proof-frame">
            <img src="${ctx.assetHref(ctx.proof.screenshotPaths.secondary)}" alt="${escapeHtml(
    locale === "de"
      ? "Screenshot eines verifizierten technischen Nachweispakets"
      : locale === "fr"
        ? "Capture d'un dossier de preuve technique verifie"
        : "Verified technical evidence bundle screenshot"
  )}" />
          </div>
          <p class="muted">${escapeHtml(ui.proofBody)}</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(ui.verifyEyebrow)}</p>
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
    <section class="section section-tight" id="first-run">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.quickstartEyebrow)}</p>
        <h3>${escapeHtml(copy.quickstartTitle)}</h3>
        <p class="muted">${escapeHtml(copy.quickstartLead)}</p>
        ${copy.quickstartCommand ? `<div class="code-snippet"><code>${escapeHtml(copy.quickstartCommand)}</code></div>` : ""}
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
          <a class="button" href="${ctx.href("starter")}">${escapeHtml(copy.quickstartButton || copy.repoButton)}</a>
          <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md" target="_blank" rel="noreferrer">${escapeHtml(copy.demoAgentButton)}</a>
          <a class="button-soft" href="${repoHref}" target="_blank" rel="noreferrer">${escapeHtml(copy.allDocsButton)}</a>
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
        <p class="eyebrow">${escapeHtml(ui.commandsEyebrow)}</p>
        <h3>${escapeHtml(copy.commandsTitle)}</h3>
        <p class="muted">${escapeHtml(copy.commandsLead)}</p>
        <div class="code-snippet"><code>${escapeHtml(TECHNICAL_SHARED.packageCommands.join("\n"))}</code></div>
        <div class="button-row">
          <a class="button" href="${repoHref}" target="_blank" rel="noreferrer" data-track-event="technical_repo">${escapeHtml(copy.repoButton)}</a>
          <a class="button-ghost" href="${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md" target="_blank" rel="noreferrer">${escapeHtml(copy.opsButton)}</a>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(ui.extendedEyebrow)}</p>
        <h3>${escapeHtml(copy.extendedTitle)}</h3>
        <p class="muted">${escapeHtml(copy.extendedBody)}</p>
        <div class="button-row">
          <a class="button" href="${repoHref}" target="_blank" rel="noreferrer" data-track-event="technical_repo">${escapeHtml(copy.repoButton)}</a>
          <a class="button-ghost" href="#first-run">${escapeHtml(copy.quickstartJumpButton)}</a>
          <a class="button-soft" href="${ctx.href("builder")}">${escapeHtml(copy.reviewerButton)}</a>
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
  const launchPackLabel = locale === "de" ? "Kontakt aufnehmen" : locale === "fr" ? "Nous contacter" : "Talk to us";
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
        ${artifactPanel || hideTopActions
      ? ""
      : `
        <aside class="proof-card fade-up">
          <p class="eyebrow">Download</p>
          <h3>Free template package</h3>
          <p class="muted">Download a print-ready template and then connect live evidence where the document requires proof.</p>
          <div class="button-row">
            ${renderTemplateDownloadLink(downloadHref, "Download free template")}
            <a class="button-ghost" href="${ctx.href("builder")}">Open Builder</a>
          </div>
        </aside>
        `
    }
      </div>
    </section>
    ${contractMatrix
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
    ${contractMatrix
      ? ""
      : `
    <section class="section section-tight">
      <div class="container split-grid">
        <div class="card fade-up">
          <p class="eyebrow">${escapeHtml(requirementTitle)}</p>
          <p>${escapeHtml(requirement)}</p>
          ${requirementItems.length > 0
        ? `<ul class="check-list section-tight">${requirementItems
          .map(([heading, body]) => `<li><strong>${escapeHtml(heading)}:</strong> ${escapeHtml(body)}</li>`)
          .join("")}</ul>`
        : ""
      }
        </div>
        ${artifactPanel
        ? `
        <div class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(artifactPanel.eyebrow || "What the toolkit actually produces")}</p>
          <h3>${escapeHtml(artifactPanel.title || "")}</h3>
          ${artifactPanel.lead ? `<p class="muted">${escapeHtml(artifactPanel.lead)}</p>` : ""}
          ${Array.isArray(artifactPanel.items) && artifactPanel.items.length > 0
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
    ${contractMatrix
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
    ${mapping && !contractMatrix
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
    ${operatorDetail
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
    ${dossierContext
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
    ${hideSectionGuide
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
    ${examples && !hideExamples
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
    ${hideBottomActions
      ? ""
      : `
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <p class="eyebrow">${escapeHtml(resourcePanel?.eyebrow || "Generate machine-verifiable evidence")}</p>
        <h3>${escapeHtml(resourcePanel?.title || "Attach real proof to this section")}</h3>
        <p>${escapeHtml(resourcePanel?.lead || "Use the template first, then connect the matching technical outputs from your own package.")}</p>
        <div class="button-row">
          ${resourcePanel
        ? renderTemplateDownloadLink(downloadHref, resourcePanel.downloadLabel || "Download free template")
        : `<a class="button" href="${ctx.href("pricing")}" data-track-event="template_get_evidence">${escapeHtml(launchPackLabel)}</a>`
      }
          <a class="button-ghost" href="${ctx.href("builder")}">${escapeHtml(resourcePanel?.liveLabel || "Open builder")}</a>
        </div>
      </div>
    </section>
    `
    }
    ${hideFaq || faq.length === 0
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
  const helpPlan = getPlan("launch-pack");
  const enterprisePlan = getPlan("enterprise");
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
          <h2>${escapeHtml(copy.launchTitle)}</h2>
          <p class="muted">${escapeHtml(copy.launchLead)}</p>
          ${helpPlan ? renderPlanCard(helpPlan, locale, ctx.href, { fade: false }) : ""}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow">${escapeHtml(copy.tiersEyebrow)}</p>
        <h2>${escapeHtml(copy.tiersTitle)}</h2>
        <p class="muted">${escapeHtml(copy.tiersLead)}</p>
        ${enterprisePlan ? `<div class="pricing-grid section-tight">${renderPlanCard(enterprisePlan, locale, ctx.href)}</div>` : ""}
        <div class="proof-card section-tight fade-up">
          <p class="eyebrow">${escapeHtml(ui.fitEyebrow)}</p>
          <h2>${escapeHtml(copy.fitTitle)}</h2>
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
      ? "EU-AI-Act-Starter-Snapshot"
      : locale === "fr"
        ? "Capture starter EU AI Act"
        : proofSurface?.label || "EU AI Act starter snapshot";
  const builderUi = {
    en: {
      stepLabel: "Step",
      ofLabel: "of",
      nextLabel: "Next",
      jumpToExportLabel: "Draft",
      nextLabels: {
        step1: "Next",
        step2: "Next",
        step3: "Next",
        step4: "Next",
        step5: "Next",
        step6: "Next",
      },
      finishLabel: "Done",
      summaryEyebrow: "Your draft",
      summaryTitle: "Progress on this EU AI Act package",
      summaryHelp:
        "A field counts as started once you add any draft text. You can export this draft before every field is complete.",
      packageProgressLabel: "Whole package",
      currentSectionLabel: "Current section",
      sectionStatusTitle: "Section status",
      sectionStates: {
        empty: "Not started",
        partial: "In progress",
        full: "Draft added for every field",
      },
      evidenceEyebrow: "Need the legal text?",
      evidenceTitle: "Template pages for this section",
      evidenceHelp:
        "Open these template pages only if you want to read the legal wording and see the structure for the section you are writing now.",
      disclaimer:
        "This builder collects a first written draft against specific EU AI Act requirements. It does not replace final legal interpretation, conformity assessment, or approval.",
      stepTitles: {
        step1: "EU AI Act Annex IV technical documentation",
        step2: "EU AI Act Article 9 risk management system",
        step3: "EU AI Act Article 10 data and data governance",
        step4: "EU AI Act Articles 12 and 14",
        step5: "EU AI Act Articles 13, 15, 17 and 72",
        step6: "EU AI Act Articles 16, 22, 43, 47, 48, 49 and Annex V",
        step7: "Export your first draft",
      },
      stepLeads: {
        step1:
          "Write short factual descriptions. Use 1-3 short sentences per field and describe the real system in plain language.",
        step2:
          "Write 2-5 short bullets per field. Name the risk, when it appears, and the measure your team already uses to reduce it.",
        step3:
          "Write short factual notes about the data used for training, validation, and testing, including origin, relevance checks, bias checks, and preparation steps.",
        step4:
          "Write short operational notes about what is logged, how people can read those logs, and how human oversight works in practice.",
        step5:
          "Write short paragraphs about deployer information, performance limits, quality-management process, and post-market monitoring.",
        step6:
          "Write short factual records about provider obligations, conformity path, declaration, CE marking, registration, and Article 22 only if it applies to your organization.",
      },
      packageSections: {
        profile: "EU AI Act Annex IV technical documentation",
        risk: "EU AI Act Article 9 risk management system",
        article9: "EU AI Act Article 10 data and data governance",
        oversight: "EU AI Act Articles 12, 13, 14, 15, 17 and 72",
        evidence: "Supporting documents to attach where required",
      },
      packageTitle: "First EU AI Act law-grounded draft",
      packageDisclaimer:
        "This export is a browser-generated snapshot of your written EU AI Act draft. Return to the builder to revise any field and export again. Attach any supporting records already required for your system separately.",
      evidencePlaceholder:
        "Attach the supporting materials already required for your system, such as logs, technical documentation excerpts, testing summaries, conformity-assessment records, declaration details, and monitoring records.",
      openProof: "Open EU starter",
      openDocs: "Open EU package runbook",
      downloadJson: "Download draft JSON",
      openPrintable: "Open draft preview",
      exportHint:
        "Use Draft in the navigation if you want to open the preview. Use the button below if you want to save the draft JSON.",
      exportNextHint:
        "Next opens the starter check on your own agent.",
      placeholderText: "Write a short factual draft here.",
      sourceLabel: "Law source",
      filledLabel: "started",
      openTemplateLabel: "Open template",
      noTextYet: "No draft text added yet.",
      legalSteps: [
        {
          id: "annex-iv",
          title: "EU AI Act Annex IV technical documentation",
          lead: "Write the first draft for the Annex IV fields that identify the system, describe its interfaces and instructions for use, and explain its expected output and testing.",
          fields: [
            {
              key: "intended_purpose",
              label: "Intended purpose",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(a)",
              groupTitle: "1. Identify the system",
              groupLead: "Start with the basic facts that explain what the system is for and who provides it.",
              help: "State what the system is used for, who uses it, and what task it supports.",
              placeholder:
                "Example: The system helps claims analysts prioritize incoming motor-insurance claims for manual review.",
            },
            {
              key: "provider_name_version",
              label: "Provider name and system version",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(a)",
              help: "State the AI provider name and the current system or agent version covered by this draft.",
              placeholder: "Example: Acme AI Ltd. - Claims Prioritization Agent v2.3.1",
            },
            {
              key: "system_interactions",
              label: "Interaction with other hardware or software",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(b)",
              groupTitle: "2. Describe interfaces and delivery",
              groupLead: "Explain what the system connects to and how it is delivered or put into use.",
              help: "List the main systems, tools, APIs, databases, or hardware this system depends on or exchanges data with.",
              placeholder:
                "Example: The system receives claim data from the internal case platform and returns a priority score through an internal API.",
            },
            {
              key: "system_elements_and_development_process",
              label: "General description of the system elements and development process",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(c)",
              help: "Describe the main parts of the system and how the current version was built, tested, and released.",
              placeholder:
                "Example: The system includes a ranking model, scoring service, analyst dashboard, and release process with staging tests before production deployment.",
            },
            {
              key: "market_forms",
              label: "Forms in which the system is placed on the market or put into service",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(d)",
              help: "State how the system is made available or put into use, for example as SaaS, API, internal tool, or embedded feature.",
              placeholder:
                "Example: The system is provided as a hosted internal web application with an API used by the claims platform.",
            },
            {
              key: "hardware_requirements",
              label: "Hardware on which the system is intended to run",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(e)",
              help: "State the hardware or infrastructure the system is expected to run on.",
              placeholder:
                "Example: The service runs in AWS on managed containers and standard x86 cloud instances with encrypted storage.",
            },
            {
              key: "user_interface_description",
              label: "Basic description of the user interface for deployers",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(g)",
              groupTitle: "3. Explain use and outputs",
              groupLead: "Describe what users see, what they are told to do, and what output the system produces.",
              help: "Describe the interface a deployer or operator sees when using the system.",
              placeholder:
                "Example: Analysts use a dashboard that shows the claim number, priority score, explanation notes, and action buttons.",
            },
            {
              key: "instructions_for_use",
              label: "Instructions for use",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(1)(h)",
              help: "Summarize the instructions, limits, and expected use conditions given to the people who use the system.",
              placeholder:
                "Example: Analysts must review the score together with the claim file, must not auto-approve based on the score, and must escalate uncertain cases.",
            },
            {
              key: "expected_output_quality",
              label: "Expected output and output quality",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(2)(b)",
              help: "State what output the system produces and what level or quality of that output you expect.",
              placeholder:
                "Example: The system returns a priority score from 1 to 100 and a short explanation. The expected output is stable, readable, and suitable for analyst triage.",
            },
            {
              key: "monitoring_and_control_mechanisms",
              label: "Monitoring and control mechanisms",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(2)(f)",
              groupTitle: "4. Describe monitoring and testing",
              groupLead: "Finish the section with the controls that watch the system and the checks that validate it.",
              help: "Describe how the system is monitored, what alerts or controls exist, and how issues can be paused or escalated.",
              placeholder:
                "Example: The team monitors scoring drift, failed runs, and unusual output patterns; alerts go to the operations queue and the service can be paused by on-call staff.",
            },
            {
              key: "validation_and_testing_procedures",
              label: "Validation and testing procedures and metrics",
              sourceKey: "technical-doc",
              sourceLabel: "Annex IV(2)(g)",
              help: "Describe the main validation or testing procedures you run and the metrics or acceptance checks you use.",
              placeholder:
                "Example: Each release is tested on a holdout data set for ranking quality, false-priority rate, and runtime stability before production approval.",
            },
          ],
        },
        {
          id: "article-9",
          title: "EU AI Act Article 9 risk management system",
          lead: "Write the first draft for the Article 9 requirements on risk identification, evaluation, and mitigation.",
          fields: [
            {
              key: "risk_identification_analysis",
              label: "Known and reasonably foreseeable risks to health, safety, or fundamental rights",
              sourceKey: "article-9",
              sourceLabel: "Article 9(2)(a)",
              help: "List the main risks your team already sees if the system fails, is misused, or produces harmful outputs.",
              placeholder:
                "Example: Incorrect prioritization could delay urgent claims or create unfair treatment for some claimants.",
            },
            {
              key: "risk_estimation_evaluation",
              label: "Estimation and evaluation of risks under intended use and reasonably foreseeable misuse",
              sourceKey: "article-9",
              sourceLabel: "Article 9(2)(b)",
              help: "State when these risks appear, how serious they are, and under what normal or misuse conditions they could happen.",
              placeholder:
                "Example: The highest risk appears when incomplete claim data produces an unreliable score and analysts rely on it without checking the file.",
            },
            {
              key: "risk_management_measures",
              label: "Risk management measures designed to address identified risks",
              sourceKey: "article-9",
              sourceLabel: "Article 9(2)(d)",
              help: "List the measures already used to reduce, control, escalate, or stop the identified risks.",
              placeholder:
                "Example: Low-confidence cases are flagged for manual review, analysts can override scores, and releases are blocked if validation thresholds fail.",
            },
          ],
        },
        {
          id: "article-10",
          title: "EU AI Act Article 10 data and data governance",
          lead: "Write the first draft for the data-governance and data-preparation requirements that apply to training, validation, and testing data sets.",
          fields: [
            {
              key: "data_governance_practices",
              label: "Data governance and management practices for training, validation, and testing data sets",
              sourceKey: "article-10",
              sourceLabel: "Article 10(2)",
              help: "Describe the main rules or process your team uses to manage training, validation, and testing data.",
              placeholder:
                "Example: Data sets are versioned, access-controlled, reviewed before use, and tracked by owner, source, and update date.",
            },
            {
              key: "data_collection_and_origin",
              label: "Data collection processes and the origin of the data",
              sourceKey: "article-10",
              sourceLabel: "Article 10(2)(c)",
              help: "State where the data comes from and how it is collected or received.",
              placeholder:
                "Example: Historical claims data comes from the internal claims platform and approved third-party fraud signals come from a contracted provider.",
            },
            {
              key: "data_relevance_bias_and_errors",
              label: "Examination of relevance, representativeness, possible biases, and data errors",
              sourceKey: "article-10",
              sourceLabel: "Article 10(2)(f)",
              help: "Describe how the team checks whether the data is relevant, representative, and free from obvious bias or errors.",
              placeholder:
                "Example: The team reviews missing fields, class imbalance, region skew, and duplicate records before training or evaluation.",
            },
            {
              key: "data_preparation_operations",
              label: "Data preparation processing operations",
              sourceKey: "article-10",
              sourceLabel: "Article 10(3)",
              help: "State the main preparation steps applied to the data before it is used.",
              placeholder:
                "Example: Records are cleaned, deduplicated, normalized, split into train and test sets, and sensitive fields are masked where required.",
            },
          ],
        },
        {
          id: "articles-12-and-14",
          title: "EU AI Act Articles 12 and 14",
          lead: "Write the first draft for automatic logs, log-handling mechanisms, and the human-oversight measures linked to the system.",
          fields: [
            {
              key: "automatic_recording_of_events",
              label: "Automatic recording of events over the lifetime of the system",
              sourceKey: "article-12",
              sourceLabel: "Article 12(1)",
              help: "Describe what the system records automatically while it is operating.",
              placeholder:
                "Example: Each run records the timestamp, request ID, model version, input reference, output score, and analyst action taken afterwards.",
            },
            {
              key: "log_collection_storage_interpretation",
              label: "Mechanisms that allow deployers to collect, store, and interpret logs",
              sourceKey: "article-13",
              sourceLabel: "Article 13(3)(f)",
              help: "Describe how deployers can access the logs, store them, and understand what they mean.",
              placeholder:
                "Example: Logs are exported to the internal audit store, retained under the operations policy, and explained in the team runbook and dashboard labels.",
            },
            {
              key: "human_oversight_measures",
              label: "Human oversight measures",
              sourceKey: "article-14",
              sourceLabel: "Article 14",
              help: "Describe the human checks, approvals, or intervention points that sit around the system.",
              placeholder:
                "Example: Analysts review the score before action, supervisors review escalations, and operations staff can disable the system during incidents.",
            },
            {
              key: "interpretation_of_outputs",
              label: "Technical measures that facilitate the interpretation of outputs by deployers",
              sourceKey: "article-13",
              sourceLabel: "Article 13(3)(d)",
              help: "Describe what helps users understand the system output correctly.",
              placeholder:
                "Example: The interface shows score bands, explanation notes, confidence indicators, and a warning not to use the score as the only decision factor.",
            },
          ],
        },
        {
          id: "articles-13-15-17-72",
          title: "EU AI Act Articles 13, 15, 17 and 72",
          lead: "Write the first draft for deployer information, performance limitations, quality management, and post-market monitoring.",
          fields: [
            {
              key: "characteristics_capabilities_limitations",
              label: "Characteristics, capabilities, and limitations of performance",
              sourceKey: "article-13",
              sourceLabel: "Article 13(3)(b)",
              help: "Describe what the system can do, what it cannot do well, and what users should know before relying on it.",
              placeholder:
                "Example: The system helps rank claims for review but does not decide claim approval and performs less reliably when records are incomplete.",
            },
            {
              key: "accuracy_robustness_cybersecurity",
              label: "Level of accuracy, robustness, and cybersecurity",
              sourceKey: "article-15",
              sourceLabel: "Article 13(3)(b)(ii) and Article 15",
              help: "State the accuracy, robustness, and cybersecurity level the team expects and how it is checked.",
              placeholder:
                "Example: The release target is stable ranking quality on validation data, monitored resilience under expected input variation, and standard access and security controls.",
            },
            {
              key: "quality_management_strategy",
              label: "Strategy for regulatory compliance and procedures for managing modifications",
              sourceKey: "article-17",
              sourceLabel: "Article 17(1)(a)",
              help: "Describe the internal process that keeps the system compliant and controls changes to the system.",
              placeholder:
                "Example: The team tracks compliance owners, reviews changes before release, and records approvals when models, prompts, or workflows are modified.",
            },
            {
              key: "post_market_monitoring_plan",
              label: "Post-market monitoring plan",
              sourceKey: "article-72",
              sourceLabel: "Article 72(3)",
              help: "Describe how the system is monitored after deployment and what signals trigger follow-up action.",
              placeholder:
                "Example: The team reviews incidents, drift, complaints, and override rates each month and escalates material issues to compliance and engineering owners.",
            },
          ],
        },
        {
          id: "articles-16-43-47-annex-v",
          title: "EU AI Act Articles 16, 22, 43, 47, 48, 49 and Annex V",
          lead: "Write the first draft for provider-side obligations on documentation and corrective action, authorised-representative details where Article 22 applies, the conformity assessment procedure, CE marking, registration, and the declaration content required before placing the system on the market or putting it into service.",
          fields: [
            {
              key: "documentation_keeping_records",
              label: "How technical documentation and related records are kept available for 10 years",
              sourceKey: "article-16",
              sourceLabel: "Articles 16 and 18",
              groupTitle: "1. Provider records and cooperation",
              groupLead: "Start with the provider-side records that must stay available after the system is placed on the market or put into service.",
              help: "Describe where the documentation and related records are kept and how they remain available for the required period.",
              placeholder:
                "Example: Technical documentation, declarations, and supporting records are stored in the controlled compliance repository with retained release folders.",
            },
            {
              key: "automatic_logs_retention",
              label: "How automatically generated logs are kept for at least six months where they are under provider control",
              sourceKey: "article-16",
              sourceLabel: "Articles 16 and 19",
              help: "Describe how provider-controlled logs are retained and where that retention is managed.",
              placeholder:
                "Example: Provider-controlled audit logs are retained in the internal logging platform for at least six months under the operations retention policy.",
            },
            {
              key: "corrective_actions_and_notifications",
              label: "Corrective actions, withdrawal or disabling, and duty to inform relevant parties",
              sourceKey: "article-16",
              sourceLabel: "Articles 16 and 20",
              help: "Describe what the team does when the system is non-compliant or presents a serious risk.",
              placeholder:
                "Example: The provider can suspend deployment, notify affected customers, and issue corrective updates or disable the affected version.",
            },
            {
              key: "authority_cooperation_and_log_access",
              label: "How the provider supplies documentation and log access to competent authorities on request",
              sourceKey: "article-16",
              sourceLabel: "Articles 16 and 21",
              help: "Describe how the provider responds to a competent-authority request for documentation, information, or logs.",
              placeholder:
                "Example: Regulatory requests are handled through the compliance owner, who retrieves the requested records and coordinates log access with security and engineering.",
            },
            {
              key: "authorised_representative_and_mandate",
              label: "Authorised representative identity and written mandate where the provider is established outside the Union",
              sourceKey: "article-22",
              sourceLabel: "Article 22(1) and 22(3)",
              groupTitle: "2. Representation, conformity, marking and registration",
              groupLead: "Complete this part only where it applies to your provider setup and market placement path.",
              help: "If the provider is outside the Union, identify the authorised representative and the written mandate. If not applicable, say so.",
              placeholder:
                "Example: Not applicable. The provider is established in the Union. / Example: EU representative: Example Rep GmbH under written mandate dated 2026-02-15.",
            },
            {
              key: "conformity_assessment_procedure",
              label: "Conformity assessment procedure applied to the system",
              sourceKey: "article-43",
              sourceLabel: "Article 43",
              help: "State which conformity assessment route is used for this system.",
              placeholder:
                "Example: The provider applies the internal control procedure for this high-risk system before placing it on the market.",
            },
            {
              key: "eu_declaration_of_conformity",
              label: "EU declaration of conformity",
              sourceKey: "article-47",
              sourceLabel: "Article 47(1)",
              help: "State whether the EU declaration exists and how it is maintained for this system.",
              placeholder:
                "Example: The provider issues and keeps an EU declaration of conformity for the current system version before release.",
            },
            {
              key: "ce_marking_application",
              label: "How CE marking is applied or made digitally accessible for the system",
              sourceKey: "article-48",
              sourceLabel: "Article 48",
              help: "Describe how CE marking is applied to the system or made available in digital form.",
              placeholder:
                "Example: CE marking is displayed in the product documentation portal and linked from the customer release package.",
            },
            {
              key: "registration_record_and_reference",
              label: "Registration record and retained reference where Article 49 applies",
              sourceKey: "article-49",
              sourceLabel: "Article 49",
              help: "Describe the registration record or reference kept for the system where registration applies.",
              placeholder:
                "Example: The provider stores the registration reference and submission record in the compliance repository for the released version.",
            },
            {
              key: "declaration_identification_and_references",
              label: "Provider identification, system identification, and references required in the declaration",
              sourceKey: "annex-v",
              sourceLabel: "Annex V",
              groupTitle: "3. Declaration content",
              groupLead: "Finish with the information that must appear in the declaration itself.",
              help: "State the provider details, system details, and legal references that appear in the declaration.",
              placeholder:
                "Example: The declaration identifies Acme AI Ltd., the Claims Prioritization Agent, the applicable Regulation references, and the system version.",
            },
            {
              key: "declaration_date_place_signature",
              label: "Place and date of issue, signatory name, and function",
              sourceKey: "annex-v",
              sourceLabel: "Annex V",
              help: "State how the declaration records the place and date of issue and who signs it.",
              placeholder:
                "Example: Issued in Dublin on 2026-03-01, signed by Jane Smith, Chief Compliance Officer.",
            },
          ],
        },
      ],
      metrics: { approvals: "Approvals", blocks: "Blocks", runs: "Runs in window", execution: "Execution" },
      liveProofEyebrow: "Next step",
      openDossierDemo: "Open EU starter",
      backLabel: "Back",
      casesLabel: "Cases",
      approvalsLabel: "Approvals",
      blocksLabel: "Blocks",
      portableLabel: "Portable",
    },
    de: {
      stepLabel: "Schritt",
      ofLabel: "von",
      nextLabel: "Naechster Schritt",
      finishLabel: "Fertig",
      summaryEyebrow: "Zusammenfassung",
      summaryTitle: "Operator-Entwurf und vorlaeufige Risikopruefung",
      evidenceEyebrow: "Reviewer-tauglicher Nachweis",
      evidenceTitle: "Was die Nachweis-Engine spaeter anhaengen kann",
      selectPlaceholder: "Option auswaehlen",
      disclaimer:
        "Dies ist ein provider-seitiger Entwurfsablauf fuer den gesetzlichen Mindestpfad. Er ersetzt keine rechtliche Pruefung durch qualifizierte Beratung und ist nicht selbst das finale Konformitaetspaket. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Pfad.",
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
        step5: "Entwurfspaket herunterladen",
      },
      packageSections: {
        profile: "Systemprofil",
        risk: "Risikoklassifizierung",
        article9: "Artikel-9-Entwurf",
        oversight: "Artikel-12- und 14-Entwurf",
        evidence: "Nachweis-Referenzen",
      },
      packageTitle: "EU-AI-Act-Dokumentationsentwurf",
      packageDisclaimer:
        "Dieses Paket ist ein im Browser erzeugter erster schriftlicher Entwurf fuer den provider-seitigen Pfad gegen die gewaehlten Anforderungen der EU-KI-Verordnung. Speichern Sie es bei Bedarf als PDF und haengen Sie die bereits fuer Ihr System und Ihre Rolle noetigen Unterlagen an. Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Pfad.",
      requiredArticles: "Erforderliche Artikel",
      evidencePlaceholder:
        "Technische Nachweise sind besonders stark fuer Artikel 9, 12, 14, 15 und Anhang-IV-Referenzen. Nutzen Sie dafuer zuerst den EU-Starter und danach das echte Minimum-Paket aus Ihren eigenen Laeufen.",
      openProof: "EU-Starter oeffnen",
      openDocs: "EU-Operator-Leitfaden oeffnen",
      downloadJson: "JSON herunterladen",
      openPrintable: "Druckansicht oeffnen",
      exportHint:
        "Speichern Sie den druckfertigen Entwurf als PDF aus dem Browser, wenn Sie sofort ein Uebergabe-Dokument brauchen, und haengen Sie die benoetigten technischen Unterlagen danach separat an.",
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
        "Artikel 9 wird staerker, wenn das Paket auf aktuelle Risikotests, klare Fallsignale, Scanner-Ergebnisse und wiederholbare technische Ausgaben verweisen kann.",
      ctaRiskPoints: ["Risikoscores pro Testfall", "Fallsignale", "Ergebnisse von Sicherheitsscans", "Wiederholbare technische Ausgaben"],
      ctaOversightEyebrow: "Journalisierung und Aufsicht",
      ctaOversightTitle: "Journalisierungs- und Freigabepfade sollten auf reale Artefakte zeigen",
      ctaOversightBody:
        "Nutzen Sie zuerst den EU-Starter und spaeter Ihr echtes Paket fuer Trace-Anker, strukturierte Ereignisse und wiederholbare technische Ausgaben.",
      metrics: { approvals: "Freigaben", blocks: "Blockierungen", runs: "Laeufe im Fenster", execution: "Ausfuehrung" },
      liveProofEyebrow: "Naechster Schritt",
      openDossierDemo: "EU-Starter oeffnen",
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
      summaryTitle: "Brouillon operateur et tri preliminaire du risque",
      evidenceEyebrow: "Preuve lisible par un evaluateur",
      evidenceTitle: "Ce que le moteur de preuve peut joindre ensuite",
      selectPlaceholder: "Selectionner une option",
      disclaimer:
        "Il s'agit d'un parcours de redaction cote fournisseur pour le minimum legal. Cela ne remplace pas une revue juridique par un conseil qualifie et ce n'est pas encore le package final de conformite. Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours.",
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
        step5: "Telecharger votre brouillon",
      },
      packageSections: {
        profile: "Profil du systeme",
        risk: "Classification du risque",
        article9: "Brouillon Article 9",
        oversight: "Brouillon Articles 12 et 14",
        evidence: "References de preuve",
      },
      packageTitle: "Brouillon de dossier EU AI Act",
      packageDisclaimer:
        "Ce dossier est un premier brouillon ecrit genere dans le navigateur pour le parcours cote fournisseur vis-a-vis des exigences EU AI Act selectionnees. Enregistrez-le en PDF si besoin et joignez les documents deja requis pour votre systeme et votre role. Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours.",
      requiredArticles: "Articles requis",
      evidencePlaceholder:
        "Les preuves techniques sont les plus fortes pour les Articles 9, 12, 14, 15 et les references Annexe IV. Utilisez d'abord le starter UE puis le vrai paquet minimum base sur vos propres executions.",
      openProof: "Ouvrir le starter UE",
      openDocs: "Ouvrir le guide operateur UE",
      downloadJson: "Telecharger le JSON",
      openPrintable: "Ouvrir la version imprimable",
      exportHint:
        "Enregistrez le brouillon imprimable en PDF depuis le navigateur si vous avez besoin d'un document de transmission immediatement, puis joignez separement les sorties de preuve lisibles par un evaluateur.",
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
        "L'Article 9 est plus solide quand le dossier peut pointer vers des tests de risque recents, des signaux clairs par cas, des resultats de scanner et des sorties techniques repetables.",
      ctaRiskPoints: ["Scores de risque par cas de test", "Signaux par cas", "Resultats d'analyse de securite", "Sorties techniques repetables"],
      ctaOversightEyebrow: "Journalisation et supervision",
      ctaOversightTitle: "Les chemins de journalisation et d'approbation doivent pointer vers de vrais artefacts",
      ctaOversightBody:
        "Utilisez d'abord le starter UE puis votre vrai paquet pour les ancres de trace, les evenements structures et les sorties techniques repetables.",
      metrics: { approvals: "Approbations", blocks: "Blocages", runs: "Executions dans la fenetre", execution: "Execution" },
      liveProofEyebrow: "Etape suivante",
      openDossierDemo: "Ouvrir le starter UE",
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
  const legalSteps =
    locale === "en" && Array.isArray(builderUi.legalSteps)
      ? builderUi.legalSteps.map((step) => ({
        ...step,
        fields: step.fields.map((field) => ({
          ...field,
          sourceHref: ctx.href(`template-${field.sourceKey}`),
          sourcePageTitle:
            (TEMPLATE_CONTENT[field.sourceKey] &&
              (TEMPLATE_CONTENT[field.sourceKey].title[locale] || TEMPLATE_CONTENT[field.sourceKey].title.en)) ||
            step.title,
        })),
      }))
      : [];
  const builderCopy = {
    locale,
    stepLabel: builderUi.stepLabel,
    ofLabel: builderUi.ofLabel,
    nextLabel: builderUi.nextLabel,
    finishLabel: builderUi.finishLabel,
    summaryEyebrow: builderUi.summaryEyebrow,
    summaryTitle: builderUi.summaryTitle,
    summaryHelp: builderUi.summaryHelp || "",
    packageProgressLabel: builderUi.packageProgressLabel || "",
    currentSectionLabel: builderUi.currentSectionLabel || "",
    sectionStatusTitle: builderUi.sectionStatusTitle || "",
    sectionStates: builderUi.sectionStates || {},
    evidenceEyebrow: builderUi.evidenceEyebrow,
    evidenceTitle: builderUi.evidenceTitle,
    evidenceHelp: builderUi.evidenceHelp || "",
    selectPlaceholder: builderUi.selectPlaceholder || "",
    disclaimer: builderUi.disclaimer,
    classifications: builderUi.classifications || {},
    rationale: builderUi.rationale || {},
    stepTitles: builderUi.stepTitles,
    stepLeads: builderUi.stepLeads || {},
    nextLabels: builderUi.nextLabels || null,
    buttonHints: builderUi.buttonHints || {},
    validationErrors: builderUi.validationErrors || {},
    fields: {
      systemType:
        locale === "de"
          ? "Was macht Ihr KI-System?"
          : locale === "fr"
            ? "Que fait votre systeme d'IA ?"
            : "",
      memberStates: locale === "de" ? "Wo wird es eingesetzt?" : locale === "fr" ? "Ou sera-t-il deploye ?" : "",
      usedByEuResidents:
        locale === "de"
          ? "Wird es von EU-Buergern genutzt?"
          : locale === "fr"
            ? "Utilise par des residents de l'UE ?"
            : "",
      autonomousDecisions:
        locale === "de"
          ? "Trifft es autonome Entscheidungen mit Auswirkungen auf Personen?"
          : locale === "fr"
            ? "Prend-il des decisions autonomes affectant des personnes ?"
            : "",
      risks: locale === "de" ? "Welche Risiken hat Ihr Team identifiziert?" : locale === "fr" ? "Quels risques avez-vous identifies ?" : "",
      mitigations:
        locale === "de" ? "Welche Massnahmen sind vorhanden?" : locale === "fr" ? "Quelles mesures de mitigation existent ?" : "",
      logging:
        locale === "de"
          ? "Wie werden Journalisierung und Rueckverfolgbarkeit beschrieben?"
          : locale === "fr"
            ? "Comment decrivez-vous la journalisation et la tracabilite ?"
            : "",
      oversight:
        locale === "de"
          ? "Wie erfolgt menschliche Aufsicht?"
          : locale === "fr"
            ? "Comment la supervision humaine fonctionne-t-elle ?"
            : "",
    },
    packageSections: builderUi.packageSections,
    packageChecklist: {
      done:
        locale === "de"
          ? ["Operator-Entwurf fuer Artikel 9", "Operator-Entwurf fuer Artikel 12 zur Journalisierung", "Operator-Entwurf fuer Artikel 14 zur Aufsicht", "Druckfertiger Dokumentationsentwurf"]
          : locale === "fr"
            ? [
              "Brouillon operateur Article 9",
              "Brouillon operateur Article 12 journalisation",
              "Brouillon operateur Article 14 supervision",
              "Brouillon documentaire pret a imprimer",
            ]
            : [
              "Annex IV first draft",
              "Article 9 first draft",
              "Article 10 first draft",
              "Articles 12 and 14 first draft",
              "Articles 13, 15, 17 and 72 first draft",
              "Articles 16, 22, 43, 47, 48, 49 and Annex V first draft",
            ],
      todo:
        locale === "de"
          ? ["Erforderliche Unterlagen fuer Ihr System und Ihre Rolle anhaengen", "Finale Pruefung und Freigabe mit Ihrem Team abschliessen"]
          : locale === "fr"
            ? ["Joindre les documents requis pour votre systeme et votre role", "Finaliser la revue et la validation avec votre equipe"]
            : ["Attach any supporting documents required for your system and role", "Complete final review and approval with your team"],
    },
    packageTitle: builderUi.packageTitle,
    packageDisclaimer: builderUi.packageDisclaimer,
    requiredArticles: builderUi.requiredArticles || "",
    evidencePlaceholder: builderUi.evidencePlaceholder,
    getEvidence: locale === "de" ? "Kontakt aufnehmen" : locale === "fr" ? "Nous contacter" : "",
    openProof: "",
    openDocs: builderUi.openDocs,
    downloadJson: builderUi.downloadJson,
    openPrintable: builderUi.openPrintable,
    jumpToExportLabel: builderUi.jumpToExportLabel || "",
    exportHint: builderUi.exportHint,
    exportNextHint: builderUi.exportNextHint || "",
    placeholderText: builderUi.placeholderText,
    sourceLabel: builderUi.sourceLabel || "",
    filledLabel: builderUi.filledLabel || "",
    openTemplateLabel: builderUi.openTemplateLabel || "",
    noTextYet: builderUi.noTextYet || builderUi.placeholderText,
    yes: localeCopy.common.yes,
    no: localeCopy.common.no,
    systemTypes: builderUi.systemTypes
      ? [
        { value: "hr", label: builderUi.systemTypes.hr },
        { value: "credit", label: builderUi.systemTypes.credit },
        { value: "insurance", label: builderUi.systemTypes.insurance },
        { value: "fraud", label: builderUi.systemTypes.fraud },
        { value: "healthcare", label: builderUi.systemTypes.healthcare },
        { value: "education", label: builderUi.systemTypes.education },
        { value: "customer-service", label: builderUi.systemTypes.customerService },
        { value: "other", label: builderUi.systemTypes.other },
      ]
      : [],
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
    placeholders: builderUi.placeholders || {},
    fieldHelp: builderUi.fieldHelp || {},
    step2InputsTitle: builderUi.step2InputsTitle || null,
    step2Inputs: builderUi.step2Inputs || [],
    ctaRiskEyebrow: builderUi.ctaRiskEyebrow || "",
    ctaRiskTitle: builderUi.ctaRiskTitle || "",
    ctaRiskBody: builderUi.ctaRiskBody || "",
    ctaRiskPoints: builderUi.ctaRiskPoints || [],
    ctaOversightEyebrow: builderUi.ctaOversightEyebrow || "",
    ctaOversightTitle: builderUi.ctaOversightTitle || "",
    ctaOversightBody: builderUi.ctaOversightBody || "",
    legalSteps,
    links: {
      pricing: locale === "en" ? "" : ctx.href("pricing"),
      proof: "",
      docs: `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`,
      nextStage: ctx.href("starter"),
    },
    metrics: builderUi.metrics,
  };
  const countStartedFields = () => 0;
  const totalLegalFields = builderCopy.legalSteps.reduce((sum, step) => sum + step.fields.length, 0);
  const sourcePagesForStep = (step) =>
    Array.from(
      step.fields.reduce((map, field) => {
        const entry = map.get(field.sourceHref) || {
          href: field.sourceHref,
          title: field.sourcePageTitle || step.title,
          clauses: [],
        };
        if (!entry.clauses.includes(field.sourceLabel)) entry.clauses.push(field.sourceLabel);
        map.set(field.sourceHref, entry);
        return map;
      }, new Map()).values()
    );
  const renderLegalFields = (step) =>
    step.fields
      .map(
        (field) => `
          ${field.groupTitle ? `<div class="field" style="grid-column: 1 / -1;"><h3>${escapeHtml(field.groupTitle)}</h3>${field.groupLead ? `<p class="lang-note">${escapeHtml(field.groupLead)}</p>` : ""}</div>` : ""}
          <div class="field">
            <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
            <p class="lang-note">${escapeHtml(builderCopy.sourceLabel)}: <a href="${escapeHtml(field.sourceHref)}">${escapeHtml(field.sourceLabel)}</a></p>
            ${field.help ? `<p class="lang-note">${escapeHtml(field.help)}</p>` : ""}
            <textarea class="textarea" id="${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" placeholder="${escapeHtml(field.placeholder || builderCopy.placeholderText)}"></textarea>
          </div>`
      )
      .join("");
  const sectionStateLabel = (step) => {
    const started = countStartedFields(step);
    if (!started) return builderUi.sectionStates?.empty || "Not started";
    if (started === step.fields.length) return builderUi.sectionStates?.full || "Draft added for every field";
    return builderUi.sectionStates?.partial || "In progress";
  };
  const initialStepBody =
    locale === "en" && builderCopy.legalSteps.length
      ? `
    <div class="builder-panel">
      ${builderCopy.stepLeads.step1 ? `<p class="lang-note">${escapeHtml(builderCopy.stepLeads.step1)}</p>` : ""}
      <div class="form-grid">
        ${renderLegalFields(builderCopy.legalSteps[0])}
      </div>
    </div>`
      : `
    <div class="builder-panel">
      ${builderCopy.stepLeads.step1 ? `<p class="lang-note">${escapeHtml(builderCopy.stepLeads.step1)}</p>` : ""}
      <div class="form-grid">
        <div class="field">
          <label for="systemType">${escapeHtml(builderCopy.fields.systemType)}</label>
          ${builderCopy.fieldHelp.systemType ? `<p class="lang-note">${escapeHtml(builderCopy.fieldHelp.systemType)}</p>` : ""}
          <select class="select" id="systemType" name="systemType">
            <option value="">${escapeHtml(builderCopy.selectPlaceholder)}</option>
            ${builderCopy.systemTypes
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join("")}
          </select>
        </div>
        <fieldset class="field">
          <legend>${escapeHtml(builderCopy.fields.memberStates)}</legend>
          ${builderCopy.fieldHelp.memberStates ? `<p class="lang-note">${escapeHtml(builderCopy.fieldHelp.memberStates)}</p>` : ""}
          <div class="checkbox-list">
            ${builderCopy.memberStates
        .map(
          (value) => `
              <label class="checkbox-row">
                <input type="checkbox" name="memberStates" value="${escapeHtml(value)}" />
                <span>${escapeHtml(value)}</span>
              </label>`
        )
        .join("")}
          </div>
        </fieldset>
        <fieldset class="field">
          <legend>${escapeHtml(builderCopy.fields.usedByEuResidents)}</legend>
          ${builderCopy.fieldHelp.usedByEuResidents ? `<p class="lang-note">${escapeHtml(builderCopy.fieldHelp.usedByEuResidents)}</p>` : ""}
          <div class="radio-list">
            <label class="radio-row"><input type="radio" name="usedByEuResidents" value="yes" /> <span>${escapeHtml(builderCopy.yes)}</span></label>
            <label class="radio-row"><input type="radio" name="usedByEuResidents" value="no" checked /> <span>${escapeHtml(builderCopy.no)}</span></label>
          </div>
        </fieldset>
        <fieldset class="field">
          <legend>${escapeHtml(builderCopy.fields.autonomousDecisions)}</legend>
          ${builderCopy.fieldHelp.autonomousDecisions ? `<p class="lang-note">${escapeHtml(builderCopy.fieldHelp.autonomousDecisions)}</p>` : ""}
          <div class="radio-list">
            <label class="radio-row"><input type="radio" name="autonomousDecisions" value="yes" /> <span>${escapeHtml(builderCopy.yes)}</span></label>
            <label class="radio-row"><input type="radio" name="autonomousDecisions" value="no" checked /> <span>${escapeHtml(builderCopy.no)}</span></label>
          </div>
        </fieldset>
      </div>
    </div>`;
  const initialSummaryBody =
    locale === "en" && builderCopy.legalSteps.length
      ? `
    <div class="builder-panel">
      <p class="eyebrow">${escapeHtml(builderCopy.summaryEyebrow)}</p>
      <h3>${escapeHtml(builderCopy.summaryTitle)}</h3>
      <p class="lang-note">${escapeHtml(builderUi.summaryHelp || "")}</p>
      <div class="metric-grid">
        <div class="metric"><span>${escapeHtml(builderUi.packageProgressLabel || "Whole package")}</span><strong>0 / ${escapeHtml(String(totalLegalFields))} ${escapeHtml(builderCopy.filledLabel)}</strong></div>
        <div class="metric"><span>${escapeHtml(builderUi.currentSectionLabel || "Current section")}</span><strong>0 / ${escapeHtml(String(builderCopy.legalSteps[0].fields.length))} ${escapeHtml(builderCopy.filledLabel)}</strong></div>
      </div>
      <p class="eyebrow section-tight">${escapeHtml(builderUi.sectionStatusTitle || "Section status")}</p>
      <ul class="check-list">
        ${builderCopy.legalSteps
        .map(
          (step) =>
            `<li><strong>${escapeHtml(step.title)}</strong>: ${escapeHtml(sectionStateLabel(step))} (0 / ${escapeHtml(String(step.fields.length))} ${escapeHtml(builderCopy.filledLabel)})</li>`
        )
        .join("")}
      </ul>
    </div>
    <div class="evidence-card">
      <p class="eyebrow">${escapeHtml(builderCopy.evidenceEyebrow)}</p>
      <h3>${escapeHtml(builderCopy.evidenceTitle)}</h3>
      <p class="lang-note">${escapeHtml(builderUi.evidenceHelp || "")}</p>
      <p class="lang-note"><strong>${escapeHtml(builderCopy.legalSteps[0].title)}</strong></p>
      <ul class="check-list">
        ${sourcePagesForStep(builderCopy.legalSteps[0])
        .map(
          (page) =>
            `<li><a href="${escapeHtml(page.href)}">${escapeHtml(page.title)}</a><br><span class="lang-note">${escapeHtml(page.clauses.join(", "))}</span></li>`
        )
        .join("")}
      </ul>
    </div>`
      : `
    <div class="builder-panel">
      <p class="eyebrow">${escapeHtml(builderCopy.summaryEyebrow)}</p>
      <h3>${escapeHtml(builderCopy.summaryTitle)}</h3>
      <p class="risk-chip minimal">${escapeHtml(builderCopy.classifications.minimal)}</p>
      <p class="muted">${escapeHtml(builderCopy.buttonHints.step1 || builderCopy.validationErrors.step1SystemType || "")}</p>
      <ul class="check-list">
        <li>${escapeHtml(builderCopy.requiredArticles)}</li>
      </ul>
    </div>`;
  const builderAside =
    LOCALES[locale].builder.hideTopAside
      ? ""
      :
    Array.isArray(LOCALES[locale].builder.scopePoints) && LOCALES[locale].builder.scopePoints.length
      ? `
        <aside class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(LOCALES[locale].builder.scopeEyebrow)}</p>
          <h3>${escapeHtml(LOCALES[locale].builder.scopeTitle)}</h3>
          <ul class="pricing-list">
            ${LOCALES[locale].builder.scopePoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </aside>`
      : `
        <aside class="proof-card fade-up">
          <p class="eyebrow">${escapeHtml(builderUi.liveProofEyebrow)}</p>
          <h3>${escapeHtml(proofSurfaceTitle)}</h3>
          <div class="metric-grid">
            <div class="metric"><span>${escapeHtml(builderUi.casesLabel)}</span><strong>${proofSurface?.summary?.cases_total ?? 2}</strong></div>
            <div class="metric"><span>${escapeHtml(builderUi.approvalsLabel)}</span><strong>${proofSurface?.summary?.approvals ?? 1}</strong></div>
            <div class="metric"><span>${escapeHtml(builderUi.blocksLabel)}</span><strong>${proofSurface?.summary?.blocks ?? 1}</strong></div>
            <div class="metric"><span>${escapeHtml(builderUi.portableLabel)}</span><strong>${proofSurface?.summary?.portable_paths ? "true" : "true"}</strong></div>
          </div>
          <a class="button-ghost" href="${ctx.href("starter")}">${escapeHtml(builderUi.openDossierDemo)}</a>
        </aside>`;

  return `
    <section class="section">
      <div class="container split-grid">
        <div class="fade-up">
          <p class="eyebrow">${escapeHtml(locale === "de" ? "Dokumentations-Assistent" : locale === "fr" ? "Assistant de documentation" : "Start here")}</p>
          <h1>${escapeHtml(LOCALES[locale].builder.headline)}</h1>
          <p class="lead">${escapeHtml(LOCALES[locale].builder.intro)}</p>
        </div>
        ${builderAside}
      </div>
    </section>
    <section class="section section-tight">
      <div class="container builder-shell" id="builder-root">
        <div class="builder-progress"><div class="builder-progress-bar"></div></div>
        <div class="builder-layout">
          <div class="builder-main">
            <div class="builder-panel">
              <p class="eyebrow" data-builder-step-counter>${escapeHtml(`${builderUi.stepLabel} 1 ${builderUi.ofLabel} ${locale === "en" && builderCopy.legalSteps.length ? builderCopy.legalSteps.length + 1 : 5}`)}</p>
              <h2 data-builder-step-title>${escapeHtml(builderUi.stepTitles.step1)}</h2>
            </div>
            <div class="builder-main" data-builder-step-body>${initialStepBody}</div>
            <p class="lang-note" data-builder-error hidden></p>
            <div class="builder-nav">
              <button class="button-soft" type="button" data-builder-prev disabled>${escapeHtml(builderUi.backLabel)}</button>
              <button class="button" type="button" data-builder-next ${locale === "en" && builderCopy.legalSteps.length ? "" : "disabled"}>${escapeHtml((builderUi.nextLabels && builderUi.nextLabels.step1) || builderUi.nextLabel)}</button>
              <button class="button-ghost" type="button" data-builder-export-jump ${locale === "en" && builderCopy.legalSteps.length ? "" : "hidden disabled"}>${escapeHtml(builderUi.jumpToExportLabel || "Go to export step")}</button>
            </div>
            <p class="lang-note" data-builder-button-hint>${escapeHtml(builderUi.buttonHints?.step1 || "")}</p>
          </div>
          <aside class="builder-sidebar" data-builder-summary>${initialSummaryBody}</aside>
        </div>
        <script id="builder-config" type="application/json">${jsonForScript({
        copy: builderCopy,
        evidenceSummary: {
          approvals: proofSurface?.summary?.approvals ?? 1,
          blocks: proofSurface?.summary?.blocks ?? 1,
          runsInWindow: proofSurface?.summary?.runs_in_window ?? 2,
          executionQuality: proofSurface?.summary?.execution_quality_status ?? "healthy",
        },
      })}</script>
      </div>
    </section>
  `;
}

const AGENT_CHECK_PAGE = {
  en: {
    title: "EU AI Act starter for your own agent | EU AI Evidence Builder",
    description:
      "Use the free EU AI Act starter on your own agent to see the first lightweight package before moving to the full workflow.",
    eyebrow: "Next step",
    headline: "Try the EU AI Act starter on your own agent",
    intro:
      "Use the free starter to see the first lightweight EU AI Act package on your own running adapter. If your team later wants help getting the first real package on its own system, you can contact us.",
    prepTitle: "Before you start",
    prepLead:
      "This page is for teams that want a first honest result on their own agent before deciding whether they need help.",
    prepPoints: [
      "Your adapter must already be running.",
      "You need a reachable base URL for that adapter.",
      "The exact command and inputs are in the starter guide, not on this page.",
      "The result is a lightweight first package, not the final provider-side package.",
    ],
    formatsTitle: "What the starter gives you",
    formatsLead:
      "The free starter is useful when you want a first signal on your own agent without pretending the full package is already done.",
    formats: [
      ["A lightweight EU-shaped package", "You see how the minimum path begins on your own agent, not only on the demo."],
      ["A real first signal", "Your team sees whether the toolkit can reach your adapter and produce a usable starter result."],
      ["A cleaner buying decision", "You decide whether to stay self-serve or ask for paid help after seeing the path on your own agent."],
    ],
    helpTitle: "When to ask for help",
    helpLead:
      "Ask for help when your team wants to move beyond the starter and reach the first real package faster.",
    helpPoints: [
      "You want the first real package on your own system.",
      "Adapter setup, cases, or comparable runs are blocking progress.",
      "Your team does not want to piece the path together alone.",
    ],
    buttons: {
      back: "Back to Builder",
      quickstart: "Open EU starter guide",
      technical: "Contact us",
    },
  },
};

function renderAgentCheck(locale, ctx) {
  const copy = AGENT_CHECK_PAGE[locale] || AGENT_CHECK_PAGE.en;
  return `
    <section class="section">
      <div class="container">
        <div class="card fade-up">
          ${copy.eyebrow ? `<p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>` : ""}
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="button-row section-tight">
            <a class="button-ghost" href="${ctx.href("builder")}">${escapeHtml(copy.buttons.back)}</a>
            <a class="button" href="${ctx.href("starter")}">${escapeHtml(copy.buttons.quickstart)}</a>
            <a class="button-soft" href="${ctx.href("pricing")}">${escapeHtml(copy.buttons.technical)}</a>
          </div>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container docs-grid">
        <article class="card fade-up">
          <h2>${escapeHtml(copy.prepTitle)}</h2>
          <p class="muted">${escapeHtml(copy.prepLead)}</p>
          <ul class="pricing-list">
            ${copy.prepPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
        </article>
        <article class="card fade-up">
          <h2>${escapeHtml(copy.formatsTitle)}</h2>
          <p class="muted">${escapeHtml(copy.formatsLead)}</p>
          <ul class="pricing-list">
            ${copy.formats
              .map(([title, text]) => `<li><strong>${escapeHtml(title)}</strong>: ${escapeHtml(text)}</li>`)
              .join("")}
          </ul>
        </article>
        <article class="card fade-up">
          <h2>${escapeHtml(copy.helpTitle)}</h2>
          <p class="muted">${escapeHtml(copy.helpLead)}</p>
          <ul class="pricing-list">
            ${copy.helpPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
  `;
}

const STARTER_PAGE = {
  en: {
    title: "EU AI Act starter check for your own agent | EU AI Evidence Builder",
    description:
      "Run a first EU AI Act starter check on your own agent before moving to the full provider-side package.",
    eyebrow: "Self-serve EU starter",
    headline: "Run a first EU AI Act starter check on your own agent",
    intro:
      "This is a first self-serve check, not the full package. It shows whether the toolkit can reach your running adapter and produce a lightweight starter result.",
    commandTitle: "Starter command",
    commandLead:
      "This command does not start your adapter for you. It runs the starter check against your already-running adapter.",
    command: "npm run compliance:eu-ai-act:starter -- --baseUrl http://localhost:8787 --systemType fraud --profile my-agent",
    needsTitle: "Before you run it",
    needs: [
      "Your adapter is already running and responds to GET /health and POST /run-case.",
      "Node.js 20 or newer is installed on the machine where you run the command.",
      "You know the adapter base URL, for example http://localhost:8787.",
    ],
    createsTitle: "What you get",
    createsLead:
      "After this run you can see whether your agent works with the toolkit before moving to the full package path.",
    creates: [
      "A first check that the toolkit can reach and run your agent.",
      "A lightweight starter report and package.",
      "A clearer go / no-go signal before the full package.",
    ],
    limitsTitle: "What this is not",
    limits: [
      "Not the final provider-side package.",
      "Not the final document set for your system.",
      "Not a conformity assessment or external review result.",
    ],
    nextTitle: "Need the full package?",
    next: [
      "If you want the full provider-side package for your system, go to pricing.",
      "The paid path uses real cases and real runs for the full package.",
    ],
    buttons: {
      pricing: "See pricing",
      demo: "See sample package",
    },
  },
};

const DEMO_PAGE = {
  en: {
    title: "Sample EU AI Act package | EU AI Evidence Builder",
    description:
      "See a controlled public example of the minimum EU AI Act package for a high-risk AI system.",
    eyebrow: "Public EU demo",
    headline: "See a sample EU AI Act minimum package",
    intro:
      "This is a controlled public example of the minimum package path. It shows what the output can look like before your team runs the workflow on its own system.",
    includesTitle: "What this sample includes",
    includes: [
      "Provider-side package sections from the minimum EU path.",
      "Technical evidence files generated from sample runs.",
      "Only a small curated set of outputs, not the whole internal workspace.",
    ],
    outputsTitle: "Open the sample files",
    outputsLead:
      "Start with the readable runtime report, then open the article-level outputs that make the package concrete.",
    outputs: [
      ["Readable runtime report", "A readable technical report built from the sample runs.", "demo/eu-ai-act/report.html"],
      ["Compare report", "The machine-readable comparison between baseline and new runs.", "demo/eu-ai-act/compare-report.json"],
      ["Annex IV technical documentation", "A sample Annex IV technical documentation output.", "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json"],
      ["Article 9 risk register", "A sample risk-management output for Article 9.", "demo/eu-ai-act/compliance/article-9-risk-register.json"],
      ["Article 10 data governance", "A sample data-governance output for Article 10.", "demo/eu-ai-act/compliance/article-10-data-governance.json"],
      ["Human oversight summary", "A sample oversight and traceability output.", "demo/eu-ai-act/compliance/human-oversight-summary.json"],
    ],
    limitsTitle: "What this sample does not show",
    limits: [
      "It is not your final package.",
      "It does not replace the draft your team writes in Builder.",
      "It does not replace system-specific runs on your own agent.",
    ],
    nextTitle: "What to do next",
    next: [
      "Open Builder if you want to draft the provider-side package.",
      "Open the EU starter if you want a first self-serve check on your own agent.",
    ],
    buttons: {
      builder: "Open Builder",
      starter: "Open EU starter",
    },
  },
  de: {
    title: "Beispiel fuer ein EU-AI-Act-Paket | EU AI Evidence Builder",
    description:
      "Sehen Sie ein kontrolliertes oeffentliches Beispiel fuer den minimalen EU-AI-Act-Paketpfad.",
    eyebrow: "Oeffentliches EU-Demo",
    headline: "Beispiel fuer ein minimales EU-AI-Act-Paket",
    intro:
      "Dies ist ein kontrolliertes oeffentliches Beispiel fuer den Minimalpfad. Es zeigt, wie der Output aussehen kann, bevor Ihr Team den Workflow auf dem eigenen System ausfuehrt.",
    includesTitle: "Was dieses Beispiel enthaelt",
    includes: [
      "Provider-seitige Paketabschnitte aus dem minimalen EU-Pfad.",
      "Technische Nachweisdateien aus Beispiel-Runs.",
      "Nur eine kleine kuratierte Auswahl, nicht den ganzen internen Workspace.",
    ],
    outputsTitle: "Beispieldateien oeffnen",
    outputsLead:
      "Beginnen Sie mit dem lesbaren Laufzeitbericht und oeffnen Sie dann die artikelbezogenen Ausgaben.",
    outputs: [
      ["Lesbarer Laufzeitbericht", "Ein lesbarer technischer Bericht aus den Beispiel-Runs.", "demo/eu-ai-act/report.html"],
      ["Compare Report", "Der maschinenlesbare Vergleich zwischen Baseline- und neuen Runs.", "demo/eu-ai-act/compare-report.json"],
      ["Annex-IV-Technikdokumentation", "Ein Beispiel fuer den Annex-IV-Output.", "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json"],
      ["Artikel-9-Risikoregister", "Ein Beispiel fuer den Risikomanagement-Output nach Artikel 9.", "demo/eu-ai-act/compliance/article-9-risk-register.json"],
      ["Artikel-10-Daten-Governance", "Ein Beispiel fuer den Daten-Governance-Output nach Artikel 10.", "demo/eu-ai-act/compliance/article-10-data-governance.json"],
      ["Zusammenfassung menschlicher Aufsicht", "Ein Beispiel fuer Aufsicht und Rueckverfolgbarkeit.", "demo/eu-ai-act/compliance/human-oversight-summary.json"],
    ],
    limitsTitle: "Was dieses Beispiel nicht zeigt",
    limits: [
      "Es ist nicht Ihr finales Paket.",
      "Es ersetzt nicht den Entwurf, den Ihr Team im Builder schreibt.",
      "Es ersetzt keine systemspezifischen Runs auf Ihrem eigenen Agenten.",
    ],
    nextTitle: "Naechster Schritt",
    next: [
      "Oeffnen Sie den Builder fuer den provider-seitigen Entwurf.",
      "Oeffnen Sie den EU-Starter fuer den ersten Self-Serve-Check am eigenen Agenten.",
    ],
    buttons: {
      builder: "Builder oeffnen",
      starter: "EU-Starter oeffnen",
    },
  },
  fr: {
    title: "Exemple de package EU AI Act | EU AI Evidence Builder",
    description:
      "Voir un exemple public controle du parcours minimum de package EU AI Act.",
    eyebrow: "Demo UE public",
    headline: "Voir un exemple de package minimum EU AI Act",
    intro:
      "Ceci est un exemple public controle du parcours minimum. Il montre a quoi le resultat peut ressembler avant que votre equipe n'execute le workflow sur son propre systeme.",
    includesTitle: "Ce que cet exemple contient",
    includes: [
      "Des sections de package cote fournisseur issues du parcours minimum.",
      "Des fichiers de preuve technique generes a partir de runs exemple.",
      "Seulement un petit ensemble choisi, pas tout le workspace interne.",
    ],
    outputsTitle: "Ouvrir les fichiers exemple",
    outputsLead:
      "Commencez par le rapport runtime lisible puis ouvrez les sorties par article.",
    outputs: [
      ["Rapport runtime lisible", "Un rapport technique lisible construit a partir des runs exemple.", "demo/eu-ai-act/report.html"],
      ["Compare report", "La comparaison machine-readable entre baseline et nouveaux runs.", "demo/eu-ai-act/compare-report.json"],
      ["Documentation technique Annexe IV", "Un exemple de sortie Annexe IV.", "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json"],
      ["Registre des risques Article 9", "Un exemple de sortie de gestion des risques pour l'Article 9.", "demo/eu-ai-act/compliance/article-9-risk-register.json"],
      ["Gouvernance des donnees Article 10", "Un exemple de sortie de gouvernance des donnees pour l'Article 10.", "demo/eu-ai-act/compliance/article-10-data-governance.json"],
      ["Resume de supervision humaine", "Un exemple de sortie de supervision et de tracabilite.", "demo/eu-ai-act/compliance/human-oversight-summary.json"],
    ],
    limitsTitle: "Ce que cet exemple ne montre pas",
    limits: [
      "Ce n'est pas votre package final.",
      "Il ne remplace pas le brouillon que votre equipe ecrit dans le builder.",
      "Il ne remplace pas des runs reellement executes sur votre propre agent.",
    ],
    nextTitle: "Que faire ensuite",
    next: [
      "Ouvrez le builder si vous voulez rediger le package cote fournisseur.",
      "Ouvrez le starter UE si vous voulez un premier check self-serve sur votre propre agent.",
    ],
    buttons: {
      builder: "Ouvrir le builder",
      starter: "Ouvrir le starter UE",
    },
  },
};

function renderStarterPage(locale, ctx) {
  const copy = STARTER_PAGE[locale] || STARTER_PAGE.en;
  return `
    <section class="section">
      <div class="container">
        <div class="card fade-up">
          ${copy.eyebrow ? `<p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>` : ""}
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="button-row section-tight">
            <a class="button" href="${ctx.href("pricing")}">${escapeHtml(copy.buttons.pricing)}</a>
            <a class="button-ghost" href="${ctx.href("demo")}">${escapeHtml(copy.buttons.demo)}</a>
          </div>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <article class="card fade-up">
          <h2>${escapeHtml(copy.commandTitle)}</h2>
          <p class="muted">${escapeHtml(copy.commandLead)}</p>
          <div class="code-snippet"><code>${escapeHtml(copy.command)}</code></div>
        </article>
        <article class="card fade-up">
          <h2>${escapeHtml(copy.needsTitle)}</h2>
          <ul class="pricing-list">
            ${copy.needs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container docs-grid">
        <article class="card fade-up">
          <h2>${escapeHtml(copy.createsTitle)}</h2>
          <p class="muted">${escapeHtml(copy.createsLead)}</p>
          <ul class="pricing-list">
            ${copy.creates.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
        <article class="card fade-up">
          <h2>${escapeHtml(copy.limitsTitle)}</h2>
          <ul class="pricing-list">
            ${copy.limits.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
        <article class="card fade-up">
          <h2>${escapeHtml(copy.nextTitle)}</h2>
          <ul class="pricing-list">
            ${copy.next.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
  `;
}

function renderDemoPage(locale, ctx) {
  const copy = DEMO_PAGE[locale] || DEMO_PAGE.en;
  const openLabel = locale === "de" ? "Beispieldatei oeffnen" : locale === "fr" ? "Ouvrir le fichier exemple" : "Open sample file";
  return `
    <section class="section">
      <div class="container">
        <div class="card fade-up">
          ${copy.eyebrow ? `<p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>` : ""}
          <h1>${escapeHtml(copy.headline)}</h1>
          <p class="lead">${escapeHtml(copy.intro)}</p>
          <div class="button-row section-tight">
            <a class="button" href="${ctx.href("builder")}">${escapeHtml(copy.buttons.builder)}</a>
            <a class="button-ghost" href="${ctx.href("starter")}">${escapeHtml(copy.buttons.starter)}</a>
          </div>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container split-grid">
        <article class="card fade-up">
          <h2>${escapeHtml(copy.includesTitle)}</h2>
          <ul class="pricing-list">
            ${copy.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
        <article class="card fade-up">
          <h2>${escapeHtml(copy.limitsTitle)}</h2>
          <ul class="pricing-list">
            ${copy.limits.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <h2 class="section-title">${escapeHtml(copy.outputsTitle)}</h2>
        <p class="lead">${escapeHtml(copy.outputsLead)}</p>
        <div class="docs-grid">
          ${copy.outputs
            .map(
              ([title, text, href]) => `
                <article class="card fade-up">
                  <h3>${escapeHtml(title)}</h3>
                  <p class="muted">${escapeHtml(text)}</p>
                  <a class="button-ghost" href="${ctx.assetHref(href)}" target="_blank" rel="noreferrer">${escapeHtml(openLabel)}</a>
                </article>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container evidence-card fade-up">
        <h2>${escapeHtml(copy.nextTitle)}</h2>
        <ul class="pricing-list">
          ${copy.next.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}

function renderDocs(locale, ctx) {
  const copy = LOCALES[locale].docs;
  const ui = {
    en: {
      lead: "Use this page when you want the source-of-truth docs behind the public site: how to run the toolkit, where the self-serve path starts, and where the product boundary is documented plainly.",
      startEyebrow: "Start and verify",
      startTitle: "First source docs to open",
      startLead: "These links are the fastest way to go from curiosity to real inspection on your own infrastructure.",
      scopeEyebrow: "Scope and boundaries",
      scopeTitle: "Docs that explain what this product is and is not",
      scopeLead: "Use these once you have seen the proof path and want the clearer source-of-truth explanation behind it.",
      cards: {
        quickstart: ["EU starter guide", "Run a lightweight first EU-shaped package on your own agent.", "__starter__", "Open starter page"],
        runbook: ["EU operator runbook", "End-to-end run, package, verify, and handoff guidance for the EU evidence path.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Open on GitHub"],
        proof: ["Builder", "Start the provider-side draft and keep the public path grounded in the same minimum package flow.", "__builder__", "Open builder"],
        technology: ["Technical Overview", "Architecture, verification model, artifact contracts, and trust boundary.", "__technology__", "Open technical overview"],
        buyer: ["EU self-hosted guidance", "How to run the EU path on your own infrastructure and keep artifacts under your control.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md`, "Open on GitHub"],
        boundary: ["Verification checklist", "What to verify in the generated package and how to reproduce results.", `${GITHUB_REPO}/blob/main/docs/VERIFY.md`, "Open on GitHub"],
      },
    },
    de: {
      lead: "Diese Seite verweist auf die massgeblichen Dokumente hinter der oeffentlichen Site: wie das Toolkit laeuft, wo der Self-Serve-Pfad beginnt und wo die Produktgrenze klar dokumentiert ist.",
      startEyebrow: "Start und Verifikation",
      startTitle: "Diese Referenzdokumente zuerst oeffnen",
      startLead: "Das sind die schnellsten Links von erster Neugier zu echter Pruefung auf Ihrer eigenen Infrastruktur.",
      scopeEyebrow: "Scope und Grenzen",
      scopeTitle: "Dokumente, die erklaeren, was das Produkt ist und was nicht",
      scopeLead: "Diese Quellen helfen, sobald der Nachweis-Pfad klar ist und Sie die saubere Referenzerklaerung dahinter brauchen.",
      cards: {
        quickstart: ["EU-Starter-Leitfaden", "Ein leichtes erstes EU-Paket auf dem eigenen Agenten ausfuehren.", "__starter__", "Starter-Seite oeffnen"],
        runbook: ["EU-Operator-Leitfaden", "Ende-zu-Ende-Hinweise fuer Run, Paketierung, Verifikation und Uebergabe im EU-Pfad.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Auf GitHub oeffnen"],
        proof: ["Builder", "Starten Sie den provider-seitigen Entwurf und halten Sie den oeffentlichen Pfad am gleichen Mindestpaket ausgerichtet.", "__builder__", "Builder oeffnen"],
        technology: ["Technischer Ueberblick", "Architektur, Verifikationsmodell, Artefaktvertraege und Vertrauensgrenze.", "__technology__", "Technischen Ueberblick oeffnen"],
        buyer: ["EU Self-Hosted-Leitfaden", "Wie der EU-Pfad auf eigener Infrastruktur laeuft und wie Artefakte unter eigener Kontrolle bleiben.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md`, "Auf GitHub oeffnen"],
        boundary: ["Verifikations-Checkliste", "Was im erzeugten Paket zu pruefen ist und wie Ergebnisse reproduziert werden.", `${GITHUB_REPO}/blob/main/docs/VERIFY.md`, "Auf GitHub oeffnen"],
      },
    },
    fr: {
      lead: "Utilisez cette page pour la documentation de reference derriere le site public: comment lancer le toolkit, ou commence le parcours self-serve, et ou la frontiere du produit est documentee clairement.",
      startEyebrow: "Demarrer et verifier",
      startTitle: "Premiers docs source a ouvrir",
      startLead: "Ces liens sont le chemin le plus court entre la curiosite initiale et une vraie inspection sur votre propre infrastructure.",
      scopeEyebrow: "Perimetre et frontieres",
      scopeTitle: "Les docs qui expliquent ce que le produit est et n'est pas",
      scopeLead: "Utilisez-les apres avoir vu le chemin de preuve, quand vous voulez une explication de reference plus nette.",
      cards: {
        quickstart: ["Guide du starter UE", "Lancer un premier paquet UE leger sur votre propre agent.", "__starter__", "Ouvrir la page starter"],
        runbook: ["Guide operateur UE", "Guidage complet pour l'execution, la mise en forme, la verification et la transmission sur le chemin UE.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Ouvrir sur GitHub"],
        proof: ["Builder", "Commencez le brouillon cote fournisseur et gardez le parcours public aligne sur le meme paquet minimum.", "__builder__", "Ouvrir le builder"],
        technology: ["Vue technique", "Architecture, modele de verification, contrats d'artefacts et frontiere de confiance.", "__technology__", "Ouvrir la vue technique"],
        buyer: ["Guide self-hosted UE", "Comment executer le chemin UE sur votre propre infrastructure et garder les artefacts sous votre controle.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md`, "Ouvrir sur GitHub"],
        boundary: ["Checklist de verification", "Ce qu'il faut verifier dans le paquet genere et comment reproduire les resultats.", `${GITHUB_REPO}/blob/main/docs/VERIFY.md`, "Ouvrir sur GitHub"],
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
      quickstart: ["EU starter guide", "Run a lightweight first EU-shaped package on your own agent.", "__starter__", "Open starter page"],
      runbook: ["EU operator runbook", "End-to-end run, package, verify, and handoff guidance for the EU evidence path.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md`, "Open on GitHub"],
      proof: ["Builder", "Start the provider-side draft and keep the public path grounded in the same minimum package flow.", "__builder__", "Open builder"],
      technology: ["Technical Overview", "Architecture, verification model, artifact contracts, and trust boundary.", "__technology__", "Open technical overview"],
      buyer: ["EU self-hosted guidance", "How to run the EU path on your own infrastructure and keep artifacts under your control.", `${GITHUB_REPO}/blob/main/docs/eu-ai-act-self-hosted-guidance.md`, "Open on GitHub"],
      boundary: ["Verification checklist", "What to verify in the generated package and how to reproduce results.", `${GITHUB_REPO}/blob/main/docs/VERIFY.md`, "Open on GitHub"],
    },
  };
  const hrefFor = (value) => {
    if (value === "__builder__") return ctx.href("builder");
    if (value === "__technology__") return ctx.href("technical");
    if (value === "__starter__") return ctx.href("starter");
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

function renderContact(locale, ctx) {
  const copy = LOCALES[locale].contact;
  const cards = {
    en: {
      eyebrow: "Contact",
      pilotTitle: "Open GitHub contact path",
      pilotBody: "Use the public GitHub issue flow if you want to ask a product or implementation question.",
      pilotCta: "Open GitHub issues",
      proofTitle: "Need the starter?",
      proofBody: "Use the public starter page when you want the first self-serve check on your own running agent.",
      proofCta: "Open EU starter",
      docsTitle: "Need the builder?",
      docsBody: "Start the provider-side draft first, then attach the supporting records already required for your system and role.",
      docsCta: "Open builder",
    },
    de: {
      eyebrow: "Kontakt",
      pilotTitle: "GitHub-Kontaktpfad oeffnen",
      pilotBody: "Nutzen Sie den oeffentlichen GitHub-Issue-Pfad, wenn Sie eine Produkt- oder Umsetzungsfrage stellen moechten.",
      pilotCta: "GitHub-Issues oeffnen",
      proofTitle: "Starter noetig?",
      proofBody: "Nutzen Sie die oeffentliche Starter-Seite fuer den ersten Self-Serve-Check am eigenen laufenden Agenten.",
      proofCta: "EU-Starter oeffnen",
      docsTitle: "Brauchen Sie den Builder?",
      docsBody: "Beginnen Sie mit dem provider-seitigen Entwurf und haengen Sie technische Unterlagen dort an, wo das Paket sie braucht.",
      docsCta: "Builder oeffnen",
    },
    fr: {
      eyebrow: "Contact",
      pilotTitle: "Ouvrir le parcours GitHub",
      pilotBody: "Utilisez le flux public GitHub si vous voulez poser une question produit ou implementation.",
      pilotCta: "Ouvrir les issues GitHub",
      proofTitle: "Besoin du starter ?",
      proofBody: "Utilisez la page starter publique pour le premier test self-serve sur votre propre agent deja en cours d'execution.",
      proofCta: "Ouvrir le starter UE",
      docsTitle: "Besoin du builder ?",
      docsBody: "Commencez par le brouillon reste a l'operateur, puis rattachez la preuve lisible par un evaluateur la ou le dossier a besoin d'une preuve technique.",
      docsCta: "Ouvrir le builder",
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
            <a class="button" href="${GITHUB_REPO}/issues/new" target="_blank" rel="noreferrer">${escapeHtml(cards.pilotCta)}</a>
          </article>
          <article class="card fade-up">
            <h3>${escapeHtml(cards.proofTitle)}</h3>
            <p class="muted">${escapeHtml(cards.proofBody)}</p>
            <a class="button-ghost" href="${ctx.href("starter")}">${escapeHtml(cards.proofCta)}</a>
          </article>
          <article class="card fade-up">
            <h3>${escapeHtml(cards.docsTitle)}</h3>
            <p class="muted">${escapeHtml(cards.docsBody)}</p>
            <a class="button-ghost" href="${ctx.href("builder")}">${escapeHtml(cards.docsCta)}</a>
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
    en: `${label} now lives at a new URL. Use the button below if you are not redirected automatically.`,
    de: `${label} liegt jetzt unter einer neuen URL. Nutzen Sie den Button unten, falls keine automatische Weiterleitung erfolgt.`,
    fr: `${label} se trouve maintenant a une nouvelle URL. Utilisez le bouton ci-dessous si vous n'etes pas redirige automatiquement.`,
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
      nextTitle: "Continue with Builder or the starter",
      startBuilder: "Start free builder",
      openProof: "Open EU starter",
    },
    de: {
      eyebrow: "Blog",
      nextEyebrow: "Naechster Schritt",
      nextTitle: "Mit Builder oder Starter fortfahren",
      startBuilder: "Kostenlosen Dokumentations-Assistenten starten",
      openProof: "EU-Starter oeffnen",
    },
    fr: {
      eyebrow: "Blog",
      nextEyebrow: "Etape suivante",
      nextTitle: "Continuer avec le builder ou le starter",
      startBuilder: "Demarrer le builder gratuit",
      openProof: "Ouvrir le starter UE",
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
          <a class="button-ghost" href="${ctx.href("starter")}">${escapeHtml(ui.openProof)}</a>
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
  ${contractMatrix
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
  ${operatorDetail
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
  ${dossierContext
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

function formatPageTitle(title) {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

function faqPairsSchema(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

function faqSchema(locale, key) {
  const data = TEMPLATE_CONTENT[key];
  if (data.hideFaq === true) return null;
  const faq = pickLocalizedValue(data.faq, locale) || [];
  return faqPairsSchema(faq);
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
        schema: [landingSchema, websiteSchema(origin, locale), organizationSchema(origin), faqPairsSchema(meta.landing.faq)].filter(Boolean),
        body: (ctx) => renderLanding(locale, ctx),
      })
    );
    add(
      createPage(locale, "how-it-works", "how-it-works", {
        title: meta.how.title,
        description: meta.how.description,
        schema: [faqPairsSchema(meta.how.faq)].filter(Boolean),
        body: (ctx) => renderHowItWorks(locale, ctx),
      })
    );
    add(
      createPage(locale, "technical", "technology", {
        title: technicalMeta.title,
        description: technicalMeta.description,
        schema: [faqPairsSchema(technicalMeta.faq)].filter(Boolean),
        body: (ctx) => renderTechnical(locale, ctx),
      })
    );
    add(
      createPage(locale, "technical-legacy", "technical", {
        title: `${meta.nav.technical} | EU AI Evidence Builder`,
        description: technicalMeta.description,
        noindex: true,
        excludeFromSitemap: true,
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
      createPage(locale, "agent-check", "agent-check", {
        title: (AGENT_CHECK_PAGE[locale] || AGENT_CHECK_PAGE.en).title,
        description: (AGENT_CHECK_PAGE[locale] || AGENT_CHECK_PAGE.en).description,
        noindex: true,
        excludeFromSitemap: true,
        body: (ctx) => renderMovedPage(locale, ctx, "starter", locale === "de" ? "EU-Starter" : locale === "fr" ? "Starter UE" : "EU starter"),
      })
    );
    add(
      createPage(locale, "starter", "eu-ai-act-starter", {
        title: (STARTER_PAGE[locale] || STARTER_PAGE.en).title,
        description: (STARTER_PAGE[locale] || STARTER_PAGE.en).description,
        body: (ctx) => renderStarterPage(locale, ctx),
      })
    );
    add(
      createPage(locale, "demo", "eu-ai-act-demo", {
        title: (DEMO_PAGE[locale] || DEMO_PAGE.en).title,
        description: (DEMO_PAGE[locale] || DEMO_PAGE.en).description,
        body: (ctx) => renderDemoPage(locale, ctx),
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
      createPage(locale, "docs-legacy", "docs", {
        title: `${meta.builder.title}`,
        description: meta.builder.description,
        noindex: true,
        excludeFromSitemap: true,
        body: (ctx) => renderMovedPage(locale, ctx, "builder", "Builder"),
      })
    );
    add(
      createPage(locale, "about-legacy", "about", {
        title: `${technicalMeta.title}`,
        description: technicalMeta.description,
        noindex: true,
        excludeFromSitemap: true,
        body: (ctx) => renderMovedPage(locale, ctx, "technical", locale === "de" ? "Technischer Ueberblick" : locale === "fr" ? "Vue technique" : "Technical Overview"),
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
  <meta name="robots" content="noindex, nofollow" />
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
  const visiblePages = pages.filter((page) => page.excludeFromSitemap !== true);
  const items = visiblePages
    .map((page) => {
      const alternates = visiblePages.filter((candidate) => candidate.key === page.key);
      const altLinks = alternates
        .map(
          (alt) =>
            `<xhtml:link rel="alternate" hreflang="${alt.locale}" href="${canonicalUrl(origin, alt.locale, alt.segment)}"/>`
        )
        .join("");
      return `<url><loc>${canonicalUrl(origin, page.locale, page.segment)}</loc>${altLinks}<changefreq>weekly</changefreq><priority>${page.key === "landing" ? "1.0" : "0.8"
        }</priority></url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${items}</urlset>`;
}

function renderRobots(origin) {
  return `User-agent: *\nAllow: /\n\n# LLM-friendly summaries\n# ${origin}/llms.txt\n# ${origin}/llms-full.txt\n\nSitemap: ${origin}/sitemap.xml\n`;
}

function renderLlmsTxt(origin) {
  return `# EU AI Evidence Builder

> Self-hosted EU AI Act package builder and starter workflow for tool-using AI agents.

## Start here
- [English homepage](${origin}/en/)
- [Technical Overview](${origin}/en/technology/)
- [How it works](${origin}/en/how-it-works/)
- [Builder](${origin}/en/builder/)
- [Documentation templates](${origin}/en/templates/)

## Public path
- [Builder](${origin}/en/builder/)
- [Sample EU package](${origin}/en/eu-ai-act-demo/)
- [EU starter](${origin}/en/eu-ai-act-starter/)
- [Pricing](${origin}/en/pricing/)

## Product boundary
- Core evidence engine for tool-using AI agents
- EU AI Act vertical with provider-side documentation and technical evidence from real runs
- Article 12-style record-keeping supports, but does not replace, the wider provider-side package
- Not legal advice, legal classification, or final sign-off automation

## Languages
- [English](${origin}/en/)
- [Deutsch](${origin}/de/)
- [Français](${origin}/fr/)

## Source docs
- [README](${GITHUB_REPO}#readme)
- [EU operator runbook](${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md)
`;
}

function renderLlmsFullTxt(origin) {
  return `# EU AI Evidence Builder

> Deployment-ready site summary for LLM and agentic readers.

## What this product is
- A self-hosted evidence engine for tool-using AI agents
- Strongest current vertical: EU AI Act provider-side documentation and starter workflow
- Built for teams that need documentation plus technical evidence from real runs

## What it is not
- Not legal advice
- Not notified-body review
- Not a generic compliance suite for every regulated workflow
- Not only logging, dashboards, or template generation

## Core outputs
- Portable evidence bundle
- Machine-readable compare report
- Integrity manifest and optional signature path
- Builder-driven provider-side draft sections
- Minimum EU package outputs with linked JSON artifacts
- Article-level scaffolds for Articles 9, 10, 12, 13, 14, 15, 16, 17, 43, 47, 48, 49, 72 and Annex IV / Annex V

## Preferred reading order
1. [English homepage](${origin}/en/)
2. [How it works](${origin}/en/how-it-works/)
3. [Technical Overview](${origin}/en/technology/)
4. [Builder](${origin}/en/builder/)
5. [Sample EU package](${origin}/en/eu-ai-act-demo/)
6. [EU starter](${origin}/en/eu-ai-act-starter/)
7. [Pricing](${origin}/en/pricing/)

## Key English pages
- [Landing](${origin}/en/)
- [How it works](${origin}/en/how-it-works/)
- [Technical Overview](${origin}/en/technology/)
- [Templates](${origin}/en/templates/)
- [Sample EU package](${origin}/en/eu-ai-act-demo/)
- [Builder](${origin}/en/builder/)
- [Pricing](${origin}/en/pricing/)

## Key German pages
- [Landing](${origin}/de/)
- [So funktioniert es](${origin}/de/how-it-works/)
- [Technischer Ueberblick](${origin}/de/technology/)
- [Templates](${origin}/de/templates/)
- [Builder](${origin}/de/builder/)

## Key French pages
- [Landing](${origin}/fr/)
- [Fonctionnement](${origin}/fr/how-it-works/)
- [Vue technique](${origin}/fr/technology/)
- [Templates](${origin}/fr/templates/)
- [Builder](${origin}/fr/builder/)

## Important product boundary for EU AI Act readers
- Article 12 record-keeping matters, but high-risk review still needs Annex-shaped documentation, operator-owned completion, and monitoring continuity
- The product combines provider-side documentation with technical evidence from real runs
- The product automates packaging support, not legal classification or final approval

## Source docs and guides
- [README](${GITHUB_REPO}#readme)
- [EU operator runbook](${GITHUB_REPO}/blob/main/docs/eu-ai-act-operator-runbook.md)
`;
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
  outputs.push({
    absPath: path.join(siteOutputRoot, "llms.txt"),
    content: renderLlmsTxt(origin),
  });
  outputs.push({
    absPath: path.join(siteOutputRoot, "llms-full.txt"),
    content: renderLlmsFullTxt(origin),
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
  "demo/eu-ai-act/report.html",
  "demo/eu-ai-act/compare-report.json",
  "demo/eu-ai-act/artifacts/manifest.json",
  "demo/eu-ai-act/archive/retention-controls.json",
  "demo/eu-ai-act/_source_inputs/new/run.json",
  "demo/eu-ai-act/compliance/article-9-risk-register.json",
  "demo/eu-ai-act/compliance/eu-ai-act-annex-iv.json",
  "demo/eu-ai-act/compliance/post-market-monitoring.json",
  "demo/eu-ai-act/compliance/article-13-instructions.json",
  "demo/eu-ai-act/compliance/article-10-data-governance.json",
  "demo/eu-ai-act/compliance/article-16-provider-obligations.json",
  "demo/eu-ai-act/compliance/human-oversight-summary.json",
  "demo/eu-ai-act/compliance/article-17-qms-lite.json",
  "demo/eu-ai-act/compliance/article-72-monitoring-plan.json",
  "demo/eu-ai-act/compliance/article-73-serious-incident-pack.json",
  "assets/screenshots/01.png",
  "assets/screenshots/05.png",
  ...SITE_LOCALES.flatMap((locale) => [
    `demo/${locale}/eu-ai-act/report.html`,
    `demo/${locale}/eu-ai-act/compare-report.json`,
    `demo/${locale}/eu-ai-act/artifacts/manifest.json`,
    `demo/${locale}/eu-ai-act/archive/retention-controls.json`,
    `demo/${locale}/eu-ai-act/_source_inputs/new/run.json`,
    `demo/${locale}/eu-ai-act/compliance/article-9-risk-register.json`,
    `demo/${locale}/eu-ai-act/compliance/eu-ai-act-annex-iv.json`,
    `demo/${locale}/eu-ai-act/compliance/post-market-monitoring.json`,
    `demo/${locale}/eu-ai-act/compliance/article-13-instructions.json`,
    `demo/${locale}/eu-ai-act/compliance/article-10-data-governance.json`,
    `demo/${locale}/eu-ai-act/compliance/article-16-provider-obligations.json`,
    `demo/${locale}/eu-ai-act/compliance/human-oversight-summary.json`,
    `demo/${locale}/eu-ai-act/compliance/article-17-qms-lite.json`,
    `demo/${locale}/eu-ai-act/compliance/article-72-monitoring-plan.json`,
    `demo/${locale}/eu-ai-act/compliance/article-73-serious-incident-pack.json`,
  ]),
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
