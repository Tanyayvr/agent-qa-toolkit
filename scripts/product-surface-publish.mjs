#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_PUBLISH_ROOT = path.join(REPO_ROOT, "docs", "demo");
const DEFAULT_AGENT_REPORT_DIR = path.join(REPO_ROOT, "apps", "evaluator", "reports", "agent-evidence-demo");
const DEFAULT_EU_REPORT_DIR = path.join(REPO_ROOT, "apps", "evaluator", "reports", "eu-ai-act-demo");
const DEFAULT_AGENT_REPORT_ID = "agent-evidence-demo";
const DEFAULT_EU_REPORT_ID = "eu-ai-act-demo";
const DEFAULT_AGENT_DEMO_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-demo.mjs");
const DEFAULT_EU_DEMO_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-demo.mjs");

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
    },
    summary: {
      generated_at: report.meta?.generated_at ?? null,
      cases_total: Array.isArray(report.items) ? report.items.length : 0,
      approvals: report.summary?.cases_requiring_approval ?? 0,
      blocks: report.summary?.cases_block_recommended ?? 0,
      execution_quality_status: report.summary?.execution_quality?.status ?? null,
      portable_paths: report.quality_flags?.portable_paths === true,
      self_contained: report.quality_flags?.self_contained === true,
    },
  };
}

function buildEuSurfaceRecord(euReportDir) {
  const report = readJson(path.join(euReportDir, "compare-report.json"));
  const exportsBlock = report.compliance_exports?.eu_ai_act;
  if (!exportsBlock) {
    throw new Error(`Missing compliance_exports.eu_ai_act in ${path.join(euReportDir, "compare-report.json")}`);
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
      dossier_html: normalizeHref(path.join("eu-ai-act", exportsBlock.report_html_href)),
      coverage: normalizeHref(path.join("eu-ai-act", exportsBlock.coverage_href)),
      annex_iv: normalizeHref(path.join("eu-ai-act", exportsBlock.annex_iv_href)),
      evidence_index: normalizeHref(path.join("eu-ai-act", exportsBlock.evidence_index_href)),
      article_13_instructions: normalizeHref(path.join("eu-ai-act", exportsBlock.article_13_instructions_href)),
      article_9_risk_register: normalizeHref(path.join("eu-ai-act", exportsBlock.article_9_risk_register_href)),
      article_72_monitoring_plan: normalizeHref(path.join("eu-ai-act", exportsBlock.article_72_monitoring_plan_href)),
      article_17_qms_lite: normalizeHref(path.join("eu-ai-act", exportsBlock.article_17_qms_lite_href)),
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

function renderSurfaceCard(surface) {
  const artifacts = Object.entries(surface.artifact_hrefs)
    .map(([key, href]) => `<li><a href="${href}">${key}</a></li>`)
    .join("");
  const metrics = [
    metric("Cases", surface.summary.cases_total ?? 0),
    metric("Approvals", surface.summary.approvals ?? 0),
    metric("Blocks", surface.summary.blocks ?? 0),
    metric("Execution", surface.summary.execution_quality_status ?? "unknown"),
    surface.summary.monitoring_status ? metric("Monitoring", surface.summary.monitoring_status) : "",
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
      <ul class="artifact-list">${artifacts}</ul>
    </section>
  `;
}

export function renderPublishIndexHtml(manifest) {
  const cards = manifest.surfaces.map(renderSurfaceCard).join("\n");
  return `<!doctype html>
<html lang="en">
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
      <p class="eyebrow">Website Proof Surface</p>
      <h1>Product Surface Demos</h1>
      <p>These published bundles are deterministic proof artifacts for the two commercial surfaces: the core Agent Evidence Platform and the EU AI Act Evidence Engine vertical. Each card links to the exact HTML and JSON outputs the website can reference.</p>
      <p><a href="product-surfaces.json">Open machine-readable index</a></p>
    </section>
    <div class="surface-grid">${cards}</div>
    <p class="footer">Published ${manifest.generated_at}</p>
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

  for (const surface of manifest.surfaces || []) {
    for (const [key, href] of Object.entries(surface.artifact_hrefs || {})) {
      checks.push({
        name: `${surface.id}_${key}_present`,
        pass: existsSync(path.join(publishRoot, href)),
        path: path.join(publishRoot, href),
      });
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

  const manifest = buildPublishManifest({
    agentReportDir: args.agentReportDir,
    euReportDir: args.euReportDir,
  });
  writePublishOutputs(args.publishRoot, manifest);
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
