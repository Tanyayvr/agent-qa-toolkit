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

function baseCompareReport(reportId: string) {
  return {
    contract_version: 5,
    report_id: reportId,
    meta: {
      toolkit_version: "1.4.0",
      spec_version: "aepf-v1",
      generated_at: 1,
      run_id: `${reportId}-run`,
    },
    baseline_dir: "baseline",
    new_dir: "new",
    cases_path: "cases.json",
    summary: {
      baseline_pass: 1,
      new_pass: 1,
      regressions: 0,
      improvements: 0,
      root_cause_breakdown: {},
      quality: { transfer_class: "internal_only", redaction_status: "none" },
      security: {
        total_cases: 1,
        cases_with_signals_new: 0,
        cases_with_signals_baseline: 0,
        signal_counts_new: { low: 0, medium: 0, high: 0, critical: 0 },
        signal_counts_baseline: { low: 0, medium: 0, high: 0, critical: 0 },
        top_signal_kinds_new: [],
        top_signal_kinds_baseline: [],
      },
      risk_summary: { low: 1, medium: 0, high: 0 },
      cases_requiring_approval: 0,
      cases_block_recommended: 0,
      data_coverage: {
        total_cases: 1,
        items_emitted: 1,
        missing_baseline_artifacts: 0,
        missing_new_artifacts: 0,
        broken_baseline_artifacts: 0,
        broken_new_artifacts: 0,
      },
      execution_quality: {
        status: "healthy",
        reasons: [],
        thresholds: {
          min_transport_success_rate: 0.95,
          max_weak_expected_rate: 0.2,
          min_pre_action_entropy_removed: 0,
          min_reconstruction_minutes_saved_per_block: 0,
        },
        total_executed_cases: 1,
        baseline_runner_failures: 0,
        new_runner_failures: 0,
        baseline_runner_failure_rate: 0,
        new_runner_failure_rate: 0,
        baseline_transport_success_rate: 1,
        new_transport_success_rate: 1,
        baseline_runner_failure_kinds: {},
        new_runner_failure_kinds: {},
        weak_expected_cases: 0,
        weak_expected_rate: 0,
        model_quality_inconclusive: false,
      },
    },
    summary_by_suite: {
      correctness: {
        baseline_pass: 1,
        new_pass: 1,
        regressions: 0,
        improvements: 0,
        root_cause_breakdown: {},
        security: {
          total_cases: 1,
          cases_with_signals_new: 0,
          cases_with_signals_baseline: 0,
          signal_counts_new: { low: 0, medium: 0, high: 0, critical: 0 },
          signal_counts_baseline: { low: 0, medium: 0, high: 0, critical: 0 },
          top_signal_kinds_new: [],
          top_signal_kinds_baseline: [],
        },
        risk_summary: { low: 1, medium: 0, high: 0 },
        cases_requiring_approval: 0,
        cases_block_recommended: 0,
        data_coverage: {
          total_cases: 1,
          items_emitted: 1,
          missing_baseline_artifacts: 0,
          missing_new_artifacts: 0,
          broken_baseline_artifacts: 0,
          broken_new_artifacts: 0,
        },
      },
    },
    quality_flags: {
      self_contained: true,
      portable_paths: true,
      missing_assets_count: 0,
      path_violations_count: 0,
      large_payloads_count: 0,
      missing_assets: [],
      path_violations: [],
      large_payloads: [],
    },
    items: [
      {
        case_id: "c1",
        title: "Test",
        suite: "correctness",
        data_availability: {
          baseline: { status: "present" },
          new: { status: "present" },
        },
        case_status: "executed",
        baseline_pass: true,
        new_pass: true,
        preventable_by_policy: false,
        recommended_policy_rules: [],
        trace_integrity: { baseline: { status: "ok", issues: [] }, new: { status: "ok", issues: [] } },
        security: {
          baseline: { signals: [], requires_gate_recommendation: false },
          new: { signals: [], requires_gate_recommendation: false },
        },
        policy_evaluation: {
          baseline: { planning_gate_pass: true, repl_policy_pass: true },
          new: { planning_gate_pass: true, repl_policy_pass: true },
        },
        assumption_state: {
          baseline: { status: "not_required", selected_count: 0, rejected_count: 0 },
          new: { status: "not_required", selected_count: 0, rejected_count: 0 },
        },
        risk_level: "low",
        risk_tags: [],
        gate_recommendation: "none",
        artifacts: { replay_diff_href: "case-c1.html" },
      },
    ],
  };
}

function createAgentReport(root: string) {
  const report = baseCompareReport("agent-evidence-demo");
  report.summary.cases_requiring_approval = 1;
  report.bundle_exports = {
    retention_archive_controls_href: "archive/retention-controls.json",
  };
  writeJson(path.join(root, "compare-report.json"), report);
  writeJson(path.join(root, "artifacts", "manifest.json"), { files: [] });
  writeJson(path.join(root, "archive", "retention-controls.json"), {
    artifact_type: "retention_archive_controls",
  });
  writeText(path.join(root, "report.html"), "<!doctype html><title>agent</title>");
}

function createEuReport(root: string) {
  const report = baseCompareReport("eu-ai-act-demo");
  report.summary.cases_requiring_approval = 1;
  report.summary.cases_block_recommended = 1;
  report.summary.execution_quality.status = "degraded";
  report.bundle_exports = {
    retention_archive_controls_href: "archive/retention-controls.json",
  };
  report.compliance_exports = {
    eu_ai_act: {
      report_html_href: "compliance/eu-ai-act-report.html",
      reviewer_html_href: "compliance/eu-ai-act-reviewer.html",
      reviewer_markdown_href: "compliance/eu-ai-act-reviewer.md",
      coverage_href: "compliance/eu-ai-act-coverage.json",
      annex_iv_href: "compliance/eu-ai-act-annex-iv.json",
      article_10_data_governance_href: "compliance/article-10-data-governance.json",
      evidence_index_href: "compliance/evidence-index.json",
      article_13_instructions_href: "compliance/article-13-instructions.json",
      article_16_provider_obligations_href: "compliance/article-16-provider-obligations.json",
      article_43_conformity_assessment_href: "compliance/article-43-conformity-assessment.json",
      article_47_declaration_of_conformity_href: "compliance/article-47-declaration-of-conformity.json",
      article_9_risk_register_href: "compliance/article-9-risk-register.json",
      article_72_monitoring_plan_href: "compliance/article-72-monitoring-plan.json",
      article_17_qms_lite_href: "compliance/article-17-qms-lite.json",
      annex_v_declaration_content_href: "compliance/annex-v-declaration-content.json",
      article_73_serious_incident_pack_href: "compliance/article-73-serious-incident-pack.json",
      human_oversight_summary_href: "compliance/human-oversight-summary.json",
      release_review_href: "compliance/release-review.json",
      post_market_monitoring_href: "compliance/post-market-monitoring.json",
    },
  };
  writeJson(path.join(root, "compare-report.json"), report);
  writeJson(path.join(root, "artifacts", "manifest.json"), { files: [] });
  writeJson(path.join(root, "archive", "retention-controls.json"), {
    artifact_type: "retention_archive_controls",
  });
  writeText(path.join(root, "report.html"), '<!doctype html><html lang="en"><title>eu</title></html>');
  writeText(path.join(root, "compliance", "eu-ai-act-report.html"), '<!doctype html><html lang="en"><title>dossier</title></html>');
  writeText(path.join(root, "compliance", "eu-ai-act-reviewer.html"), '<!doctype html><html lang="en"><title>reviewer</title></html>');
  writeText(path.join(root, "compliance", "eu-ai-act-reviewer.md"), "# reviewer");
  writeText(path.join(root, "compliance", "eu-ai-act-reviewer.pdf"), "%PDF-1.4");
  writeJson(path.join(root, "compliance", "eu-ai-act-coverage.json"), { coverage: true });
  writeJson(path.join(root, "compliance", "eu-ai-act-annex-iv.json"), { annex: true });
  writeJson(path.join(root, "compliance", "article-10-data-governance.json"), { article: "Art_10" });
  writeJson(path.join(root, "compliance", "evidence-index.json"), { evidence: true });
  writeJson(path.join(root, "compliance", "article-13-instructions.json"), { article: "Art_13" });
  writeJson(path.join(root, "compliance", "article-16-provider-obligations.json"), { article: "Art_16" });
  writeJson(path.join(root, "compliance", "article-43-conformity-assessment.json"), { article: "Art_43" });
  writeJson(path.join(root, "compliance", "article-47-declaration-of-conformity.json"), { article: "Art_47" });
  writeJson(path.join(root, "compliance", "article-9-risk-register.json"), { article: "Art_9" });
  writeJson(path.join(root, "compliance", "article-72-monitoring-plan.json"), { article: "Art_72" });
  writeJson(path.join(root, "compliance", "article-17-qms-lite.json"), { article: "Art_17" });
  writeJson(path.join(root, "compliance", "annex-v-declaration-content.json"), { annex: "Annex_V" });
  writeJson(path.join(root, "compliance", "article-73-serious-incident-pack.json"), { article: "Art_73" });
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
    expect(manifest.surfaces[0].summary.signature_status).toBe("unsigned");
    expect(manifest.surfaces[1].summary.signature_status).toBe("unsigned");
    expect(manifest.surfaces[0].artifact_hrefs.retention_archive_controls).toBe("agent-evidence/archive/retention-controls.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_13_instructions).toBe("eu-ai-act/compliance/article-13-instructions.json");
    expect(manifest.surfaces[1].artifact_hrefs.reviewer_html).toBe("eu-ai-act/compliance/eu-ai-act-reviewer.html");
    expect(manifest.surfaces[1].artifact_hrefs.reviewer_markdown).toBe("eu-ai-act/compliance/eu-ai-act-reviewer.md");
    expect(manifest.surfaces[1].artifact_hrefs.reviewer_pdf).toBe("eu-ai-act/compliance/eu-ai-act-reviewer.pdf");
    expect(manifest.surfaces[1].artifact_hrefs.article_9_risk_register).toBe("eu-ai-act/compliance/article-9-risk-register.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_72_monitoring_plan).toBe("eu-ai-act/compliance/article-72-monitoring-plan.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_17_qms_lite).toBe("eu-ai-act/compliance/article-17-qms-lite.json");
    expect(manifest.surfaces[1].artifact_hrefs.article_73_serious_incident_pack).toBe(
      "eu-ai-act/compliance/article-73-serious-incident-pack.json"
    );
    expect(html).toContain("Product Surface Demos");
    expect(html).toContain("agent-evidence/report.html");
    expect(html).toContain("eu-ai-act/compliance/eu-ai-act-report.html");
    expect(html).toContain("eu-ai-act/compliance/eu-ai-act-reviewer.html");
    expect(html).toContain("eu-ai-act/compliance/eu-ai-act-reviewer.pdf");
    expect(html).toContain("Open reviewer PDF");
    expect(html).toContain("Signature");
    expect(html).toContain("unsigned");
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
    expect(readFileSync(path.join(publishRoot, "agent-evidence", "archive", "retention-controls.json"), "utf8")).toContain(
      "retention_archive_controls"
    );
    expect(readFileSync(path.join(publishRoot, "eu-ai-act", "compliance", "eu-ai-act-report.html"), "utf8")).toContain(
      "dossier"
    );
    expect(readFileSync(path.join(publishRoot, "eu-ai-act", "compliance", "eu-ai-act-reviewer.html"), "utf8")).toContain(
      "reviewer"
    );
    expect(readFileSync(path.join(publishRoot, "eu-ai-act", "compliance", "eu-ai-act-reviewer.pdf"), "utf8")).toContain(
      "%PDF"
    );
    expect(readFileSync(path.join(publishRoot, "de", "index.html"), "utf8")).toContain("Produkt-Demos und Nachweise");
    expect(readFileSync(path.join(publishRoot, "fr", "index.html"), "utf8")).toContain("Demos et preuves produit");
    expect(readFileSync(path.join(publishRoot, "de", "agent-evidence", "report.html"), "utf8")).toContain('lang="de"');
    expect(readFileSync(path.join(publishRoot, "fr", "agent-evidence", "report.html"), "utf8")).toContain('lang="fr"');
    expect(readFileSync(path.join(publishRoot, "de", "eu-ai-act", "compliance", "eu-ai-act-reviewer.html"), "utf8")).toContain(
      'lang="de"'
    );
    expect(readFileSync(path.join(publishRoot, "fr", "eu-ai-act", "compliance", "eu-ai-act-reviewer.html"), "utf8")).toContain(
      'lang="fr"'
    );

    const verified = verifyPublishedSurfaces(publishRoot);
    expect(verified.ok).toBe(true);
    expect(verified.checks.every((check) => check.pass === true)).toBe(true);
  });
});
