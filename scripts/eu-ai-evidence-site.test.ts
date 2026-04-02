import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildSite, parseCliArgs as parseBuildCliArgs, renderBuildSummary } from "./build-eu-ai-evidence-site.mjs";
import {
  parseCliArgs as parseVerifyCliArgs,
  renderVerificationSummary,
  verifyBuiltSite,
} from "./verify-eu-ai-evidence-site.mjs";

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = path.join(os.tmpdir(), `aq-eu-ai-site-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  tempRoots.push(root);
  return root;
}

function writeText(absPath: string, value: string) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, value, "utf8");
}

function writeStaticDependencies(root: string) {
  const demoFiles = [
    "index.html",
    "agent-evidence/report.html",
    "eu-ai-act/report.html",
    "eu-ai-act/compare-report.json",
    "eu-ai-act/artifacts/manifest.json",
    "eu-ai-act/archive/retention-controls.json",
    "eu-ai-act/_source_inputs/new/run.json",
    "eu-ai-act/compliance/article-9-risk-register.json",
    "eu-ai-act/compliance/eu-ai-act-annex-iv.json",
    "eu-ai-act/compliance/article-10-data-governance.json",
    "eu-ai-act/compliance/post-market-monitoring.json",
    "eu-ai-act/compliance/article-13-instructions.json",
    "eu-ai-act/compliance/article-16-provider-obligations.json",
    "eu-ai-act/compliance/human-oversight-summary.json",
    "eu-ai-act/compliance/article-17-qms-lite.json",
    "eu-ai-act/compliance/article-72-monitoring-plan.json",
    "eu-ai-act/compliance/article-73-serious-incident-pack.json",
  ];
  writeText(path.join(root, "site-assets", "site.css"), "body{}");
  writeText(path.join(root, "site-assets", "site.js"), "console.log('site');");
  writeText(path.join(root, "site-assets", "builder.js"), "console.log('builder');");
  for (const relPath of demoFiles) {
    const content =
      relPath.endsWith(".html")
        ? "<!doctype html><title>demo</title>"
        : relPath.endsWith(".pdf")
          ? "%PDF-1.4"
          : "{}";
    writeText(path.join(root, "demo", relPath), content);
    for (const locale of ["en", "de", "fr"]) {
      writeText(path.join(root, "demo", locale, relPath), content);
    }
  }
  writeText(path.join(root, "assets", "screenshots", "01.png"), "png");
  writeText(path.join(root, "assets", "screenshots", "05.png"), "png");
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-evidence-site", () => {
  const siteBuildTimeoutMs = 45_000;

  it("parses build and verify cli args", () => {
    const buildArgs = parseBuildCliArgs([
      "node",
      "scripts/build-eu-ai-evidence-site.mjs",
      "--origin",
      "https://example.com",
      "--outputRoot",
      "/tmp/site",
      "--json",
    ]);
    expect(buildArgs.origin).toBe("https://example.com");
    expect(buildArgs.outputRoot).toBe("/tmp/site");
    expect(buildArgs.json).toBe(true);

    const verifyArgs = parseVerifyCliArgs([
      "node",
      "scripts/verify-eu-ai-evidence-site.mjs",
      "--origin",
      "https://example.com",
      "--outputRoot",
      "/tmp/site",
      "--json",
    ]);
    expect(verifyArgs.origin).toBe("https://example.com");
    expect(verifyArgs.outputRoot).toBe("/tmp/site");
    expect(verifyArgs.json).toBe(true);
  });

  it(
    "builds a localized static site and verifies it strictly",
    () => {
    const root = makeTempRoot();
    writeStaticDependencies(root);

    const build = buildSite({ origin: "https://example.com", outputRoot: root, skipPublish: true });
    expect(build.ok).toBe(true);
    expect(build.page_count).toBeGreaterThan(10);
    expect(build.locale_counts.en).toBe(build.locale_counts.de);
    expect(build.locale_counts.en).toBe(build.locale_counts.fr);

    const landing = readFileSync(path.join(root, "en", "index.html"), "utf8");
    const howItWorks = readFileSync(path.join(root, "en", "how-it-works", "index.html"), "utf8");
    const builder = readFileSync(path.join(root, "en", "builder", "index.html"), "utf8");
    const agentCheck = readFileSync(path.join(root, "en", "agent-check", "index.html"), "utf8");
    const starter = readFileSync(path.join(root, "en", "eu-ai-act-starter", "index.html"), "utf8");
    const demoPage = readFileSync(path.join(root, "en", "eu-ai-act-demo", "index.html"), "utf8");
    const about = readFileSync(path.join(root, "en", "about", "index.html"), "utf8");
    const docs = readFileSync(path.join(root, "en", "docs", "index.html"), "utf8");
    const pricing = readFileSync(path.join(root, "en", "pricing", "index.html"), "utf8");
    const technology = readFileSync(path.join(root, "en", "technology", "index.html"), "utf8");
    const article10Template = readFileSync(path.join(root, "en", "templates", "article-10", "index.html"), "utf8");
    const article22Template = readFileSync(path.join(root, "en", "templates", "article-22", "index.html"), "utf8");
    const article43Template = readFileSync(path.join(root, "en", "templates", "article-43", "index.html"), "utf8");
    const annexVTemplate = readFileSync(path.join(root, "en", "templates", "annex-v", "index.html"), "utf8");
    const deLanding = readFileSync(path.join(root, "de", "index.html"), "utf8");
    const deBuilder = readFileSync(path.join(root, "de", "builder", "index.html"), "utf8");
    const deTemplate = readFileSync(path.join(root, "de", "templates", "article-17", "index.html"), "utf8");
    const deArticle22Template = readFileSync(path.join(root, "de", "templates", "article-22", "index.html"), "utf8");
    const frLanding = readFileSync(path.join(root, "fr", "index.html"), "utf8");
    const frBuilder = readFileSync(path.join(root, "fr", "builder", "index.html"), "utf8");
    const frBlog = readFileSync(path.join(root, "fr", "blog", "index.html"), "utf8");
    const frArticle22Template = readFileSync(path.join(root, "fr", "templates", "article-22", "index.html"), "utf8");
    const technicalRedirect = readFileSync(path.join(root, "en", "technical", "index.html"), "utf8");
    const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");

    expect(landing).toContain("EU AI Evidence Builder");
    expect(landing).toContain('hreflang="de"');
    expect(landing).toContain("Understand the EU workflow");
    expect(landing).toContain("Open technical overview");
    expect(landing).toContain("Open package path");
    expect(landing).toContain("eu-ai-act-demo/");
    expect(landing).toContain("Law-grounded written draft");
    expect(landing).not.toContain("Authority-ready package");
    expect(landing).not.toContain("Why does a reviewer-ready package need more than a checklist or PDF?");
    expect(howItWorks).toContain("How to prepare EU AI Act documents and evidence for review");
    expect(howItWorks).toContain("What needs to be prepared for EU AI Act review");
    expect(howItWorks).toContain("What your team needs before starting");
    expect(howItWorks).toContain("How the documentation process works");
    expect(howItWorks).toContain("What your team can hand off at the end");
    expect(howItWorks).toContain("What documents need to be prepared for EU AI Act review?");
    expect(howItWorks).toContain('"@type":"FAQPage"');
    expect(howItWorks).not.toContain("Which EU AI Act articles require more than logs and traces?");
    expect(howItWorks).not.toContain("What still needs human review and approval");
    expect(howItWorks).not.toContain("reviewer PDF/HTML/Markdown");
    expect(builder).toContain("builder-config");
    expect(builder).toContain("site-assets/builder.js");
    expect(builder).toContain("eu-ai-act-operator-runbook.md");
    expect(builder).toContain("Build your first EU AI Act draft");
    expect(builder).toContain("For companies developing or materially modifying high-risk AI systems for the EU market.");
    expect(builder).toContain("../eu-ai-act-starter/");
    expect(builder).toContain("Step 1 of 7");
    expect(builder).not.toContain("Step 1 of 5");
    expect(builder).toContain("Next");
    expect(builder).toContain("Draft");
    expect(builder).toContain("EU AI Act Annex IV technical documentation");
    expect(builder).toContain("EU AI Act Article 10 data and data governance");
    expect(builder).toContain("EU AI Act Articles 16, 22, 43, 47, 48, 49 and Annex V");
    expect(builder).toContain("Intended purpose");
    expect(builder).toContain("Law source");
    expect(builder).toContain("Progress on this EU AI Act package");
    expect(builder).toContain("Template pages for this section");
    expect(builder).toContain("State the AI provider name and the current system or agent version covered by this draft.");
    expect(builder).toContain("Example: Acme AI Ltd. - Claims Prioritization Agent v2.3.1");
    expect(builder).not.toContain("What to write: short factual draft text for this requirement.");
    expect(builder).toContain("../templates/technical-doc/");
    expect(builder).toContain("../templates/article-10/");
    expect(builder).toContain("../templates/article-22/");
    expect(builder).toContain("../templates/article-43/");
    expect(builder).toContain("../templates/article-48/");
    expect(builder).toContain("../templates/article-49/");
    expect(builder).toContain("../templates/annex-v/");
    expect(builder).not.toContain("Outside the EU?");
    expect(builder).not.toContain("This path still applies");
    expect(builder).not.toContain("Provider path only");
    expect(builder).not.toContain("Three things happen on this page");
    expect(builder).not.toContain("Does this system affect people in the EU?");
    expect(builder).not.toContain("Choose the closest primary system category");
    const builderConfigMatch = builder.match(/<script id="builder-config" type="application\/json">([\s\S]*?)<\/script>/);
    expect(builderConfigMatch).not.toBeNull();
    expect(() => JSON.parse(builderConfigMatch[1])).not.toThrow();
    expect(builderConfigMatch[1]).toContain('"copy"');
    expect(builderConfigMatch[1]).not.toContain("&quot;");
    expect(builderConfigMatch[1]).toContain('"jumpToExportLabel":"Draft"');
    expect(builderConfigMatch[1]).not.toContain('"continueToAgentCheck"');
    expect(builderConfigMatch[1]).toContain('"nextStage":"../eu-ai-act-starter/"');
    expect(builder).not.toContain("../docs/");
    expect(builder).not.toContain("Open reviewer dossier demo");
    expect(builder).not.toContain("Open live proof");
    expect(agentCheck).toContain("Page moved");
    expect(agentCheck).toContain("../eu-ai-act-starter/");
    expect(agentCheck).not.toContain("blob/main/docs/eu-ai-act-starter.md");
    expect(starter).toContain("Run a first EU AI Act starter check on your own agent");
    expect(starter).toContain("Starter command");
    expect(starter).toContain("npm run compliance:eu-ai-act:starter");
    expect(starter).not.toContain("--draftJson ./eu-ai-act-legal-draft.json");
    expect(starter).toContain("This is a first self-serve check, not the full package.");
    expect(starter).toContain("Node.js 20 or newer");
    expect(starter).toContain("What you get");
    expect(starter).toContain("What this is not");
    expect(starter).toContain("Need the full package?");
    expect(starter).toContain("../eu-ai-act-demo/");
    expect(starter).not.toContain("How the draft and runtime report connect");
    expect(starter).not.toContain("Checks adapter health at the base URL you provide.");
    expect(starter).toContain("../pricing/");
    expect(starter).not.toContain("Back to Builder");
    expect(starter).not.toContain("blob/main/docs/eu-ai-act-starter.md");
    expect(demoPage).toContain("See a sample EU AI Act minimum package");
    expect(demoPage).toContain("What this sample includes");
    expect(demoPage).toContain("Open the sample files");
    expect(demoPage).toContain("What this sample does not show");
    expect(demoPage).toContain("../builder/");
    expect(demoPage).toContain("../eu-ai-act-starter/");
    expect(demoPage).toContain("../../demo/en/eu-ai-act/report.html");
    expect(demoPage).toContain("../../demo/en/eu-ai-act/compliance/eu-ai-act-annex-iv.json");
    expect(demoPage).toContain("../../demo/en/eu-ai-act/compliance/article-9-risk-register.json");
    expect(pricing).toContain("EU AI Act pricing for high-risk AI systems");
    expect(pricing).toContain("PAID HELP");
    expect(pricing).toContain("ENTERPRISE");
    expect(pricing).toContain("Free self-serve EU AI Act path");
    expect(pricing).toContain("Paid help for one real system");
    expect(pricing).toContain("Enterprise support for broader rollout");
    expect(pricing).toContain("Open GitHub repo");
    expect(pricing).toContain("https://github.com/Tanyayvr/agent-qa-toolkit");
    expect(pricing).toContain("EUR499");
    expect(pricing).not.toContain("From EUR499");
    expect(pricing).toContain("Contact us");
    expect(pricing).not.toContain("Launch Pack");
    expect(pricing).not.toContain("TEAM");
    expect(pricing).not.toContain("STUDIO");
    expect(about).toContain("Page moved");
    expect(about).toContain("Technical Overview");
    expect(about).toContain("../technology/");
    expect(docs).toContain("Page moved");
    expect(docs).toContain("../builder/");
    expect(docs).not.toContain("blob/main/docs/eu-ai-act-starter.md");
    expect(technology).toContain("Technical Overview: from agent runs to an EU AI Act package");
    expect(technology).toContain("What to check first");
    expect(technology).toContain("First self-serve EU starter");
    expect(technology).toContain("What this technology actually does");
    expect(technology).toContain("What your team provides and what the engine does next");
    expect(technology).toContain("Command surface");
    expect(technology).toContain("npm run compliance:eu-ai-act");
    expect(technology).toContain("If the fit is real, open the repo");
    expect(technology).toContain("Open EU starter guide");
    expect(technology).toContain("Open builder");
    expect(technology).toContain("Open self-hosted guide");
    expect(technology).toContain("Open GitHub repo");
    expect(technology).toContain("See self-serve EU starter");
    expect(technology).toContain("../eu-ai-act-starter/");
    expect(technology).not.toContain("Open reviewer dossier demo");
    expect(technology).not.toContain("Open demo agent report");
    expect(technology).not.toContain("demo/en/agent-evidence/report.html");
    expect(technology).not.toContain("Open OSS docs");
    expect(technology).not.toContain("evidence-operations-model.md");
    expect(technology).not.toContain("quickstart-your-agent.md");
    expect(technology).not.toContain("npm run quickstart -- --baseUrl http://localhost:8787 --systemType fraud");
    expect(technology).not.toContain("blob/main/docs/eu-ai-act-starter.md");
    expect(technology).not.toContain("../holding/");
    expect(article10Template).toContain("EU AI Act Article 10 - Data and Data Governance Template");
    expect(article22Template).toContain("EU AI Act Article 22 - Authorised Representative Template");
    expect(article43Template).toContain("EU AI Act Article 43 - Conformity Assessment Template");
    expect(annexVTemplate).toContain("EU AI Act Annex V - Declaration Content Template");
    expect(deLanding).toContain("provider-seitigen Dokumentationspfad");
    expect(deLanding).toContain("Wenn Artikel 25 Ihre Organisation zum Anbieter macht, nutzen Sie diesen Pfad.");
    expect(deBuilder).toContain("Nur Provider-Pfad");
    expect(deBuilder).toContain("Diese Seite erstellt nur den schriftlichen provider-seitigen Entwurf");
    expect(deTemplate).toContain("Artikel 17");
    expect(deArticle22Template).toContain("Artikel 22");
    expect(frLanding).toContain("parcours de documentation cote fournisseur");
    expect(frLanding).toContain("Si l'article 25 fait de votre organisation le fournisseur, utilisez ce parcours.");
    expect(frBuilder).toContain("Parcours fournisseur uniquement");
    expect(frBuilder).toContain("Cette page construit seulement le brouillon ecrit cote fournisseur");
    expect(frBlog).toContain("Guides de documentation et de preuve pour les equipes IA");
    expect(frArticle22Template).toContain("Article 22");
    expect(technicalRedirect).toContain("Page moved");
    expect(technicalRedirect).toContain("../technology/");
    expect(sitemap).toContain("https://example.com/en/");
    expect(sitemap).toContain("https://example.com/en/eu-ai-act-demo/");
    expect(sitemap).toContain("https://example.com/de/");
    expect(sitemap).not.toContain("/holding/");
    expect(sitemap).not.toContain("/en/docs/");

    const verification = verifyBuiltSite({ origin: "https://example.com", outputRoot: root });
    expect(verification.ok).toBe(true);
    expect(verification.failed_checks).toHaveLength(0);

    expect(renderBuildSummary(build, false)).toContain("site build complete");
    expect(renderVerificationSummary(verification, false)).toContain("site verify passed");
    },
    siteBuildTimeoutMs
  );

  it(
    "fails verification when a generated file drifts",
    () => {
    const root = makeTempRoot();
    writeStaticDependencies(root);
    buildSite({ origin: "https://example.com", outputRoot: root, skipPublish: true });

    writeText(path.join(root, "en", "index.html"), "<!doctype html><title>drift</title>");

    const verification = verifyBuiltSite({ origin: "https://example.com", outputRoot: root });
    expect(verification.ok).toBe(false);
    expect(verification.failed_checks.some((check) => check.path === path.join("en", "index.html"))).toBe(true);
    expect(renderVerificationSummary(verification, false)).toContain("site verify failed");
    },
    siteBuildTimeoutMs
  );
});
