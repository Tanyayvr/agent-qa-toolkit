import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildPublishManifest,
  publishProductSurfaces,
  renderPublishIndexHtml,
  verifyPublishedSurfaces,
} from "./product-surface-publish.mjs";

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = path.join(os.tmpdir(), `aq-product-surface-publish-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  tempRoots.push(root);
  return root;
}

function writeJson(absPath: string, value: unknown) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(value, null, 2), "utf8");
}

function writeText(absPath: string, value: string) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, value, "utf8");
}

function createAgentReport(root: string) {
  writeJson(path.join(root, "compare-report.json"), {
    report_id: "agent-evidence-demo",
    meta: { generated_at: "2026-03-15T00:00:00.000Z" },
    summary: {
      cases_requiring_approval: 1,
      cases_block_recommended: 0,
      execution_quality: { status: "healthy" },
    },
    quality_flags: {
      portable_paths: true,
      self_contained: true,
    },
    items: [{ case_id: "c1" }, { case_id: "c2" }],
  });
  writeJson(path.join(root, "artifacts", "manifest.json"), { files: [] });
  writeText(path.join(root, "report.html"), "<!doctype html><title>agent</title>");
}

function createEuReport(root: string) {
  writeJson(path.join(root, "compare-report.json"), {
    report_id: "eu-ai-act-demo",
    meta: { generated_at: "2026-03-15T00:00:00.000Z" },
    summary: {
      cases_requiring_approval: 1,
      cases_block_recommended: 1,
      execution_quality: { status: "degraded" },
    },
    quality_flags: {
      portable_paths: true,
      self_contained: true,
    },
    items: [{ case_id: "c1" }],
    compliance_exports: {
      eu_ai_act: {
        report_html_href: "compliance/eu-ai-act-report.html",
        coverage_href: "compliance/eu-ai-act-coverage.json",
        annex_iv_href: "compliance/eu-ai-act-annex-iv.json",
        evidence_index_href: "compliance/evidence-index.json",
        article_13_instructions_href: "compliance/article-13-instructions.json",
        article_9_risk_register_href: "compliance/article-9-risk-register.json",
        article_72_monitoring_plan_href: "compliance/article-72-monitoring-plan.json",
        article_17_qms_lite_href: "compliance/article-17-qms-lite.json",
        human_oversight_summary_href: "compliance/human-oversight-summary.json",
        release_review_href: "compliance/release-review.json",
        post_market_monitoring_href: "compliance/post-market-monitoring.json",
      },
    },
  });
  writeJson(path.join(root, "artifacts", "manifest.json"), { files: [] });
  writeText(path.join(root, "report.html"), "<!doctype html><title>eu</title>");
  writeText(path.join(root, "compliance", "eu-ai-act-report.html"), "<!doctype html><title>dossier</title>");
  writeJson(path.join(root, "compliance", "eu-ai-act-coverage.json"), { coverage: true });
  writeJson(path.join(root, "compliance", "eu-ai-act-annex-iv.json"), { annex: true });
  writeJson(path.join(root, "compliance", "evidence-index.json"), { evidence: true });
  writeJson(path.join(root, "compliance", "article-13-instructions.json"), { article: "Art_13" });
  writeJson(path.join(root, "compliance", "article-9-risk-register.json"), { article: "Art_9" });
  writeJson(path.join(root, "compliance", "article-72-monitoring-plan.json"), { article: "Art_72" });
  writeJson(path.join(root, "compliance", "article-17-qms-lite.json"), { article: "Art_17" });
  writeJson(path.join(root, "compliance", "human-oversight-summary.json"), { oversight: true });
  writeJson(path.join(root, "compliance", "release-review.json"), { decision: "reject" });
  writeJson(path.join(root, "compliance", "post-market-monitoring.json"), {
    summary: { monitoring_status: "history_current", runs_in_window: 2 },
  });
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("product-surface-publish", () => {
  it("builds a manifest and renders index html", () => {
    const root = makeTempRoot();
    const agent = path.join(root, "agent");
    const eu = path.join(root, "eu");
    createAgentReport(agent);
    createEuReport(eu);

    const manifest = buildPublishManifest({ agentReportDir: agent, euReportDir: eu });
    const html = renderPublishIndexHtml(manifest);

    expect(manifest.surfaces).toHaveLength(2);
    expect(manifest.surfaces[0].id).toBe("agent-evidence");
    expect(manifest.surfaces[1].id).toBe("eu-ai-act");
    expect(manifest.surfaces[1].artifact_hrefs.article_13_instructions).toBe("eu-ai-act/compliance/article-13-instructions.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_9_risk_register).toBe("eu-ai-act/compliance/article-9-risk-register.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_72_monitoring_plan).toBe("eu-ai-act/compliance/article-72-monitoring-plan.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_17_qms_lite).toBe("eu-ai-act/compliance/article-17-qms-lite.json");
    expect(html).toContain("Product Surface Demos");
    expect(html).toContain("agent-evidence/report.html");
    expect(html).toContain("eu-ai-act/compliance/eu-ai-act-report.html");
  });

  it("publishes and verifies a product-surface proof root", () => {
    const root = makeTempRoot();
    const agent = path.join(root, "agent");
    const eu = path.join(root, "eu");
    const publishRoot = path.join(root, "published");
    createAgentReport(agent);
    createEuReport(eu);

    const published = publishProductSurfaces({
      publishRoot,
      agentReportDir: agent,
      euReportDir: eu,
      skipBuild: true,
    });

    expect(published.ok).toBe(true);
    expect(readFileSync(path.join(publishRoot, "index.html"), "utf8")).toContain("EU AI Act Evidence Engine");
    expect(readFileSync(path.join(publishRoot, "product-surfaces.json"), "utf8")).toContain("agent-evidence");
    expect(readFileSync(path.join(publishRoot, "agent-evidence", "report.html"), "utf8")).toContain("agent");
    expect(readFileSync(path.join(publishRoot, "eu-ai-act", "compliance", "eu-ai-act-report.html"), "utf8")).toContain(
      "dossier"
    );

    const verified = verifyPublishedSurfaces(publishRoot);
    expect(verified.ok).toBe(true);
    expect(verified.checks.every((check) => check.pass === true)).toBe(true);
  });
});
