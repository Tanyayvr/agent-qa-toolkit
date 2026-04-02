#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { EU_REVIEWER_PDF_REL_PATH } from "./lib/reviewer-pdf.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_PUBLISH_ROOT = path.join(REPO_ROOT, "docs", "demo");
const DEFAULT_AGENT_REPORT_DIR = path.join(REPO_ROOT, "apps", "evaluator", "reports", "agent-evidence-demo");
const DEFAULT_EU_REPORT_DIR = path.join(REPO_ROOT, "apps", "evaluator", "reports", "eu-ai-act-demo");
const DEFAULT_AGENT_REPORT_ID = "agent-evidence-demo";
const DEFAULT_EU_REPORT_ID = "eu-ai-act-demo";
const DEFAULT_AGENT_DEMO_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-demo.mjs");
const DEFAULT_EU_DEMO_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-demo.mjs");
const DEMO_LOCALIZE_SCRIPT = path.join(REPO_ROOT, "apps", "evaluator", "src", "localizeDemoDocuments.ts");
const TS_NODE_CLI = path.join(REPO_ROOT, "node_modules", "ts-node", "dist", "bin.js");
const DEMO_LOCALES = ["en", "de", "fr"];

const PUBLISH_COPY = {
  en: {
    lang: "en",
    eyebrow: "Website Proof Surface",
    title: "Product Surface Demos",
    body:
      "These published bundles are deterministic proof artifacts for the two commercial surfaces: the core Agent Evidence Platform and the EU AI Act Evidence Engine vertical. Each card links to the exact HTML and JSON outputs the website can reference.",
    indexLink: "Open machine-readable index",
    publishedLabel: "Published",
    metrics: {
      cases: "Cases",
      approvals: "Approvals",
      blocks: "Blocks",
      execution: "Execution",
      signature: "Signature",
      monitoring: "Monitoring",
    },
    actions: {
      reviewerPdf: "Open reviewer PDF",
      reviewerHtml: "Open reviewer HTML",
      dossierHtml: "Open dossier HTML",
      primaryReport: "Open primary report",
    },
  },
  de: {
    lang: "de",
    eyebrow: "Proof-Oberflaeche der Website",
    title: "Produkt-Demos und Nachweise",
    body:
      "Diese veroeffentlichten Bundles sind deterministische Nachweisartefakte fuer die beiden kommerziellen Oberflaechen: die Agent Evidence Platform und die EU AI Act Evidence Engine. Jede Karte verlinkt auf die exakten HTML- und JSON-Ausgaben, auf die sich die Website beziehen kann.",
    indexLink: "Maschinenlesbaren Index oeffnen",
    publishedLabel: "Veroeffentlicht",
    metrics: {
      cases: "Faelle",
      approvals: "Freigaben",
      blocks: "Blocks",
      execution: "Ausfuehrung",
      signature: "Signatur",
      monitoring: "Monitoring",
    },
    actions: {
      reviewerPdf: "Reviewer-PDF oeffnen",
      reviewerHtml: "Reviewer-HTML oeffnen",
      dossierHtml: "Dossier-HTML oeffnen",
      primaryReport: "Primaerbericht oeffnen",
    },
  },
  fr: {
    lang: "fr",
    eyebrow: "Surface de preuve du site",
    title: "Demos et preuves produit",
    body:
      "Ces bundles publies sont des artefacts de preuve deterministes pour les deux surfaces commerciales : l'Agent Evidence Platform et le vertical EU AI Act Evidence Engine. Chaque carte renvoie vers les sorties HTML et JSON exactes que le site peut citer.",
    indexLink: "Ouvrir l'index lisible par machine",
    publishedLabel: "Publie",
    metrics: {
      cases: "Cas",
      approvals: "Approbations",
      blocks: "Blocages",
      execution: "Execution",
      signature: "Signature",
      monitoring: "Surveillance",
    },
    actions: {
      reviewerPdf: "Ouvrir le PDF reviewer",
      reviewerHtml: "Ouvrir le HTML reviewer",
      dossierHtml: "Ouvrir le dossier HTML",
      primaryReport: "Ouvrir le rapport principal",
    },
  },
};

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/product-surface-publish.mjs [options]",
    "",
    "Options:",
    "  --publishRoot <path>    Publish root (default: docs/demo)",
    "  --agentReportDir <path> Agent Evidence source report dir (default: apps/evaluator/reports/agent-evidence-demo)",
    "  --euReportDir <path>    EU AI Act source report dir (default: apps/evaluator/reports/eu-ai-act-demo)",
    "  --skipBuild             Reuse existing report dirs instead of rebuilding demos",
    "  --verifyOnly           Verify an existing publish root without copying or rebuilding",
    "  --json                 Print machine-readable JSON summary",
    "  --help                 Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    publishRoot: DEFAULT_PUBLISH_ROOT,
    agentReportDir: DEFAULT_AGENT_REPORT_DIR,
    euReportDir: DEFAULT_EU_REPORT_DIR,
    skipBuild: false,
    verifyOnly: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--skipBuild") {
      args.skipBuild = true;
      continue;
    }
    if (arg === "--verifyOnly") {
      args.verifyOnly = true;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--publishRoot") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.publishRoot = path.resolve(value);
      i += 1;
      continue;
    }
    if (arg === "--agentReportDir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.agentReportDir = path.resolve(value);
      i += 1;
      continue;
    }
    if (arg === "--euReportDir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.euReportDir = path.resolve(value);
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  return args;
}

function runNode(scriptAbs, scriptArgs, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [scriptAbs, ...scriptArgs], {
    cwd,
    encoding: "utf8",
  });
}

function runTsNode(scriptAbs, scriptArgs, cwd = REPO_ROOT) {
  if (!existsSync(TS_NODE_CLI)) {
    throw new Error(`ts-node CLI not found at ${TS_NODE_CLI}`);
  }
  return spawnSync(process.execPath, [TS_NODE_CLI, scriptAbs, ...scriptArgs], {
    cwd,
    encoding: "utf8",
  });
}

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function normalizeHref(href) {
  return String(href || "").split(path.sep).join("/");
}

function ensureDir(absPath) {
  mkdirSync(absPath, { recursive: true });
}

function copyReportDir(srcDir, destDir) {
  if (!existsSync(srcDir)) {
    throw new Error(`Source report directory not found: ${srcDir}`);
  }
  rmSync(destDir, { recursive: true, force: true });
  cpSync(srcDir, destDir, { recursive: true });
}

function buildAgentSurfaceRecord(agentReportDir) {
  const report = readJson(path.join(agentReportDir, "compare-report.json"));
  const retentionHref = report.bundle_exports?.retention_archive_controls_href;
  const manifestSigRel = existsSync(path.join(agentReportDir, "artifacts", "manifest.sig"))
    ? "agent-evidence/artifacts/manifest.sig"
    : null;
  if (typeof retentionHref !== "string" || retentionHref.length === 0) {
    throw new Error(`Missing bundle_exports.retention_archive_controls_href in ${path.join(agentReportDir, "compare-report.json")}`);
  }
  return {
    id: "agent-evidence",
    label: "Agent Evidence Platform",
    tagline: "Portable release evidence for tool-using AI agents.",
    publish_dir: "agent-evidence",
    report_id: report.report_id,
    command: "npm run demo:agent-evidence",
    release_gate_command: "npm run release:gate:agent-evidence",
    artifact_hrefs: {
      report_html: "agent-evidence/report.html",
      compare_report: "agent-evidence/compare-report.json",
      manifest: "agent-evidence/artifacts/manifest.json",
      ...(manifestSigRel ? { manifest_signature: manifestSigRel } : {}),
      retention_archive_controls: normalizeHref(path.join("agent-evidence", retentionHref)),
    },
    summary: {
      generated_at: report.meta?.generated_at ?? null,
      cases_total: Array.isArray(report.items) ? report.items.length : 0,
      approvals: report.summary?.cases_requiring_approval ?? 0,
      blocks: report.summary?.cases_block_recommended ?? 0,
      execution_quality_status: report.summary?.execution_quality?.status ?? null,
      portable_paths: report.quality_flags?.portable_paths === true,
      self_contained: report.quality_flags?.self_contained === true,
      signature_status: manifestSigRel ? "signed" : "unsigned",
    },
  };
}

function buildEuSurfaceRecord(euReportDir) {
  const report = readJson(path.join(euReportDir, "compare-report.json"));
  const exportsBlock = report.compliance_exports?.eu_ai_act;
  const retentionHref = report.bundle_exports?.retention_archive_controls_href;
  const manifestSigRel = existsSync(path.join(euReportDir, "artifacts", "manifest.sig"))
    ? "eu-ai-act/artifacts/manifest.sig"
    : null;
  if (!exportsBlock) {
    throw new Error(`Missing compliance_exports.eu_ai_act in ${path.join(euReportDir, "compare-report.json")}`);
  }
  if (typeof retentionHref !== "string" || retentionHref.length === 0) {
    throw new Error(`Missing bundle_exports.retention_archive_controls_href in ${path.join(euReportDir, "compare-report.json")}`);
  }
  const monitoring = readJson(path.join(euReportDir, exportsBlock.post_market_monitoring_href));
  return {
    id: "eu-ai-act",
    label: "EU AI Act Evidence Engine",
    tagline: "Dossier-ready technical evidence for EU-facing AI governance workflows.",
    publish_dir: "eu-ai-act",
    report_id: report.report_id,
    command: "npm run demo:eu-ai-act",
    release_gate_command: "npm run release:gate:eu-ai-act",
    artifact_hrefs: {
      report_html: "eu-ai-act/report.html",
      compare_report: "eu-ai-act/compare-report.json",
      manifest: "eu-ai-act/artifacts/manifest.json",
      ...(manifestSigRel ? { manifest_signature: manifestSigRel } : {}),
      retention_archive_controls: normalizeHref(path.join("eu-ai-act", retentionHref)),
      reviewer_html: normalizeHref(path.join("eu-ai-act", exportsBlock.reviewer_html_href)),
      reviewer_markdown: normalizeHref(path.join("eu-ai-act", exportsBlock.reviewer_markdown_href)),
      ...(existsSync(path.join(euReportDir, EU_REVIEWER_PDF_REL_PATH))
        ? { reviewer_pdf: normalizeHref(path.join("eu-ai-act", EU_REVIEWER_PDF_REL_PATH)) }
        : {}),
      dossier_html: normalizeHref(path.join("eu-ai-act", exportsBlock.report_html_href)),
      coverage: normalizeHref(path.join("eu-ai-act", exportsBlock.coverage_href)),
      annex_iv: normalizeHref(path.join("eu-ai-act", exportsBlock.annex_iv_href)),
      article_10_data_governance: normalizeHref(path.join("eu-ai-act", exportsBlock.article_10_data_governance_href)),
      evidence_index: normalizeHref(path.join("eu-ai-act", exportsBlock.evidence_index_href)),
      article_13_instructions: normalizeHref(path.join("eu-ai-act", exportsBlock.article_13_instructions_href)),
      article_16_provider_obligations: normalizeHref(
        path.join("eu-ai-act", exportsBlock.article_16_provider_obligations_href)
      ),
      article_43_conformity_assessment: normalizeHref(
        path.join("eu-ai-act", exportsBlock.article_43_conformity_assessment_href)
      ),
      article_47_declaration_of_conformity: normalizeHref(
        path.join("eu-ai-act", exportsBlock.article_47_declaration_of_conformity_href)
      ),
      article_9_risk_register: normalizeHref(path.join("eu-ai-act", exportsBlock.article_9_risk_register_href)),
      article_72_monitoring_plan: normalizeHref(path.join("eu-ai-act", exportsBlock.article_72_monitoring_plan_href)),
      article_17_qms_lite: normalizeHref(path.join("eu-ai-act", exportsBlock.article_17_qms_lite_href)),
      annex_v_declaration_content: normalizeHref(path.join("eu-ai-act", exportsBlock.annex_v_declaration_content_href)),
      article_73_serious_incident_pack: normalizeHref(path.join("eu-ai-act", exportsBlock.article_73_serious_incident_pack_href)),
      human_oversight_summary: normalizeHref(path.join("eu-ai-act", exportsBlock.human_oversight_summary_href)),
      release_review: normalizeHref(path.join("eu-ai-act", exportsBlock.release_review_href)),
      post_market_monitoring: normalizeHref(path.join("eu-ai-act", exportsBlock.post_market_monitoring_href)),
    },
    summary: {
      generated_at: report.meta?.generated_at ?? null,
      cases_total: Array.isArray(report.items) ? report.items.length : 0,
      approvals: report.summary?.cases_requiring_approval ?? 0,
      blocks: report.summary?.cases_block_recommended ?? 0,
      execution_quality_status: report.summary?.execution_quality?.status ?? null,
      monitoring_status: monitoring.summary?.monitoring_status ?? null,
      runs_in_window: monitoring.summary?.runs_in_window ?? null,
      portable_paths: report.quality_flags?.portable_paths === true,
      self_contained: report.quality_flags?.self_contained === true,
      signature_status: manifestSigRel ? "signed" : "unsigned",
    },
  };
}

export function buildPublishManifest(params) {
  return {
    contract_version: 1,
    generated_at: new Date().toISOString(),
    surfaces: [
      buildAgentSurfaceRecord(params.agentReportDir),
      buildEuSurfaceRecord(params.euReportDir),
    ],
  };
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${String(value)}</strong></div>`;
}

function renderSurfaceCard(surface, copy) {
  const artifacts = Object.entries(surface.artifact_hrefs)
    .map(([key, href]) => `<li><a href="${href}">${key}</a></li>`)
    .join("");
  const primaryActions = [
    surface.artifact_hrefs.reviewer_pdf
      ? `<a class="action-button" href="${surface.artifact_hrefs.reviewer_pdf}">${copy.actions.reviewerPdf}</a>`
      : "",
    surface.artifact_hrefs.reviewer_html
      ? `<a class="action-button secondary" href="${surface.artifact_hrefs.reviewer_html}">${copy.actions.reviewerHtml}</a>`
      : "",
    surface.artifact_hrefs.dossier_html
      ? `<a class="action-button secondary" href="${surface.artifact_hrefs.dossier_html}">${copy.actions.dossierHtml}</a>`
      : "",
    !surface.artifact_hrefs.reviewer_pdf && surface.artifact_hrefs.report_html
      ? `<a class="action-button" href="${surface.artifact_hrefs.report_html}">${copy.actions.primaryReport}</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  const metrics = [
    metric(copy.metrics.cases, surface.summary.cases_total ?? 0),
    metric(copy.metrics.approvals, surface.summary.approvals ?? 0),
    metric(copy.metrics.blocks, surface.summary.blocks ?? 0),
    metric(copy.metrics.execution, surface.summary.execution_quality_status ?? "unknown"),
    metric(copy.metrics.signature, surface.summary.signature_status ?? "unknown"),
    surface.summary.monitoring_status ? metric(copy.metrics.monitoring, surface.summary.monitoring_status) : "",
  ].join("");

  return `
    <section class="card">
      <div class="card-head">
        <p class="eyebrow">${surface.id}</p>
        <h2>${surface.label}</h2>
        <p class="tagline">${surface.tagline}</p>
      </div>
      <div class="metrics">${metrics}</div>
      <div class="commands">
        <code>${surface.command}</code>
        <code>${surface.release_gate_command}</code>
      </div>
      ${primaryActions ? `<div class="actions">${primaryActions}</div>` : ""}
      <ul class="artifact-list">${artifacts}</ul>
    </section>
  `;
}

export function renderPublishIndexHtml(manifest, locale = "en") {
  const copy = PUBLISH_COPY[locale] || PUBLISH_COPY.en;
  const cards = manifest.surfaces.map((surface) => renderSurfaceCard(surface, copy)).join("\n");
  return `<!doctype html>
<html lang="${copy.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Product Surface Demos</title>
  <style>
    :root {
      --bg: #f5f1e8;
      --panel: #fffaf1;
      --ink: #1f1a16;
      --muted: #6f6358;
      --border: #d7c8b2;
      --accent: #0d6b57;
      --accent-2: #9f3d20;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(13, 107, 87, 0.12), transparent 28%),
        radial-gradient(circle at top right, rgba(159, 61, 32, 0.10), transparent 24%),
        linear-gradient(180deg, #f7f2e9 0%, var(--bg) 100%);
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 48px 20px 64px;
    }
    .hero {
      display: grid;
      gap: 12px;
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: 24px;
      background: rgba(255, 250, 241, 0.92);
      backdrop-filter: blur(8px);
      box-shadow: 0 20px 50px rgba(31, 26, 22, 0.08);
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      max-width: 760px;
      line-height: 1.5;
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 3vw, 3.2rem);
      line-height: 1;
      letter-spacing: -0.04em;
    }
    .surface-grid {
      display: grid;
      gap: 18px;
      margin-top: 22px;
    }
    .card {
      display: grid;
      gap: 18px;
      padding: 24px;
      border-radius: 22px;
      border: 1px solid var(--border);
      background: var(--panel);
      box-shadow: 0 16px 40px rgba(31, 26, 22, 0.06);
    }
    .card-head h2 {
      margin: 4px 0 8px;
      font-size: 1.55rem;
      letter-spacing: -0.03em;
    }
    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      color: var(--accent);
    }
    .tagline {
      margin: 0;
      color: var(--muted);
      max-width: 720px;
    }
    .metrics {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
    .metric {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(215, 200, 178, 0.9);
      background: rgba(255, 255, 255, 0.65);
    }
    .metric span {
      display: block;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .metric strong {
      display: block;
      margin-top: 8px;
      font-size: 1.1rem;
    }
    .commands {
      display: grid;
      gap: 10px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(13, 107, 87, 0.24);
      background: rgba(13, 107, 87, 0.12);
      color: var(--ink);
      font-weight: 600;
      text-decoration: none;
    }
    .action-button.secondary {
      background: rgba(255, 255, 255, 0.76);
    }
    code {
      display: block;
      padding: 12px 14px;
      border-radius: 14px;
      background: #1f1a16;
      color: #f7f2e9;
      overflow-x: auto;
      font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      font-size: 0.92rem;
    }
    .artifact-list {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
      color: var(--muted);
    }
    a {
      color: var(--accent-2);
      text-decoration-thickness: 0.08em;
      text-underline-offset: 0.14em;
    }
    .footer {
      margin-top: 18px;
      color: var(--muted);
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1>${copy.title}</h1>
      <p>${copy.body}</p>
      <p><a href="product-surfaces.json">${copy.indexLink}</a></p>
    </section>
    <div class="surface-grid">${cards}</div>
    <p class="footer">${copy.publishedLabel} ${manifest.generated_at}</p>
  </main>
</body>
</html>
`;
}

function writePublishOutputs(publishRoot, manifest) {
  ensureDir(publishRoot);
  writeFileSync(path.join(publishRoot, "product-surfaces.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(path.join(publishRoot, "index.html"), renderPublishIndexHtml(manifest), "utf8");
}

function writeLocalizedPublishOutputs(publishRoot, manifest) {
  for (const locale of DEMO_LOCALES) {
    const localeRoot = path.join(publishRoot, locale);
    ensureDir(localeRoot);
    writeFileSync(path.join(localeRoot, "product-surfaces.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    writeFileSync(path.join(localeRoot, "index.html"), renderPublishIndexHtml(manifest, locale), "utf8");
  }
}

function copyLocalizedSurfaceDirs(args) {
  for (const locale of DEMO_LOCALES) {
    copyReportDir(args.agentReportDir, path.join(args.publishRoot, locale, "agent-evidence"));
    copyReportDir(args.euReportDir, path.join(args.publishRoot, locale, "eu-ai-act"));
  }
}

function localizePublishedDemoDocs(args) {
  const result = runTsNode(DEMO_LOCALIZE_SCRIPT, [
    "--publishRoot",
    args.publishRoot,
    "--agentReportDir",
    args.agentReportDir,
    "--euReportDir",
    args.euReportDir,
  ]);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Localized demo document generation failed");
  }
}

export function validatePublishedManifest(publishRoot, manifest) {
  const checks = [];

  const rootFiles = ["index.html", "product-surfaces.json"];
  for (const name of rootFiles) {
    checks.push({
      name: name === "index.html" ? "publish_index_present" : "publish_manifest_present",
      pass: existsSync(path.join(publishRoot, name)),
      path: path.join(publishRoot, name),
    });
  }

  for (const locale of DEMO_LOCALES) {
    for (const name of rootFiles) {
      checks.push({
        name: `${locale}_${name === "index.html" ? "publish_index_present" : "publish_manifest_present"}`,
        pass: existsSync(path.join(publishRoot, locale, name)),
        path: path.join(publishRoot, locale, name),
      });
    }
  }

  for (const surface of manifest.surfaces || []) {
    for (const [key, href] of Object.entries(surface.artifact_hrefs || {})) {
      checks.push({
        name: `${surface.id}_${key}_present`,
        pass: existsSync(path.join(publishRoot, href)),
        path: path.join(publishRoot, href),
      });
      for (const locale of DEMO_LOCALES) {
        checks.push({
          name: `${locale}_${surface.id}_${key}_present`,
          pass: existsSync(path.join(publishRoot, locale, href)),
          path: path.join(publishRoot, locale, href),
        });
      }
    }
  }

  return {
    ok: checks.every((check) => check.pass === true),
    checks,
  };
}

export function verifyPublishedSurfaces(publishRoot) {
  const manifestPath = path.join(publishRoot, "product-surfaces.json");
  if (!existsSync(manifestPath)) {
    return {
      ok: false,
      checks: [
        {
          name: "publish_manifest_present",
          pass: false,
          path: manifestPath,
        },
      ],
    };
  }
  const manifest = readJson(manifestPath);
  return {
    manifest,
    ...validatePublishedManifest(publishRoot, manifest),
  };
}

function buildDemos(args) {
  const agentRun = runNode(DEFAULT_AGENT_DEMO_SCRIPT, ["--outDir", args.agentReportDir, "--reportId", DEFAULT_AGENT_REPORT_ID]);
  if (agentRun.status !== 0) {
    throw new Error(agentRun.stderr || agentRun.stdout || "Agent Evidence demo build failed");
  }
  const euRun = runNode(DEFAULT_EU_DEMO_SCRIPT, ["--outDir", args.euReportDir, "--reportId", DEFAULT_EU_REPORT_ID]);
  if (euRun.status !== 0) {
    throw new Error(euRun.stderr || euRun.stdout || "EU AI Act demo build failed");
  }
}

export function publishProductSurfaces(args) {
  if (!args.skipBuild) {
    buildDemos(args);
  }

  const agentDest = path.join(args.publishRoot, "agent-evidence");
  const euDest = path.join(args.publishRoot, "eu-ai-act");
  ensureDir(args.publishRoot);
  copyReportDir(args.agentReportDir, agentDest);
  copyReportDir(args.euReportDir, euDest);
  copyLocalizedSurfaceDirs(args);

  const manifest = buildPublishManifest({
    agentReportDir: args.agentReportDir,
    euReportDir: args.euReportDir,
  });
  writePublishOutputs(args.publishRoot, manifest);
  writeLocalizedPublishOutputs(args.publishRoot, manifest);
  localizePublishedDemoDocs(args);
  const validation = validatePublishedManifest(args.publishRoot, manifest);
  return {
    ok: validation.ok,
    publish_root: args.publishRoot,
    manifest,
    checks: validation.checks,
  };
}

function finish(args, payload) {
  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(payload.ok ? 0 : 1);
  }

  if (payload.ok) {
    console.log(args.verifyOnly ? "Product surface publish verify: PASS" : "Product surface publish: PASS");
    console.log(`- publish_root: ${payload.publish_root}`);
    if (!args.verifyOnly) {
      console.log(`- surfaces: ${(payload.manifest?.surfaces || []).map((surface) => surface.id).join(", ")}`);
    }
  } else {
    console.error(args.verifyOnly ? "Product surface publish verify: FAIL" : "Product surface publish: FAIL");
    console.error(`- publish_root: ${payload.publish_root}`);
    for (const check of payload.checks || []) {
      if (!check.pass) console.error(`- failed: ${check.name} -> ${check.path}`);
    }
  }
  process.exit(payload.ok ? 0 : 1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.verifyOnly) {
    const verified = verifyPublishedSurfaces(args.publishRoot);
    finish(args, {
      ok: verified.ok,
      publish_root: args.publishRoot,
      manifest: verified.manifest,
      checks: verified.checks,
    });
  }

  const published = publishProductSurfaces(args);
  finish(args, published);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
