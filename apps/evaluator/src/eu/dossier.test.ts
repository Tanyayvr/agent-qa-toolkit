import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import { buildEuAiActBundleArtifacts, buildEuAiActComplianceBundle } from "./dossier";
import type { CompareReport } from "../reportTypes";

const EU_SCHEMA_DIR = path.join(process.cwd(), "schemas", "eu-ai-act");

const report: CompareReport = {
  contract_version: 5,
  report_id: "eu-dossier",
  meta: { toolkit_version: "0.1.0", spec_version: "aepf-v1", generated_at: 1, run_id: "eu-dossier" },
  environment: {
    agent_id: "agent-a",
    agent_version: "agent-a-v2",
    model: "gpt-x",
    model_version: "2026-03-01",
    prompt_version: "prompt-v1",
    tools_version: "tools-v1",
    config_hash: "cfg-001",
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
    trace_anchor_coverage: {
      cases_with_anchor_baseline: 1,
      cases_with_anchor_new: 1,
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
  compliance_coverage: [
    {
      framework: "EU_AI_ACT",
      clause: "Art_11",
      title: "Technical documentation",
      status: "partial",
      status_cap: "partial",
      required_evidence: ["compare-report.json.summary"],
      required_evidence_present: ["compare-report.json.summary"],
      required_evidence_missing: [],
      supporting_evidence: ["artifacts/manifest.json"],
      supporting_evidence_present: ["artifacts/manifest.json"],
      supporting_evidence_missing: [],
      residual_gaps: ["Full technical file still requires operator-authored material."],
    },
    {
      framework: "EU_AI_ACT",
      clause: "Art_12",
      title: "Record-keeping and logging",
      status: "covered",
      required_evidence: ["compare-report.json.items[].trace_integrity", "artifacts/manifest.json"],
      required_evidence_present: ["compare-report.json.items[].trace_integrity", "artifacts/manifest.json"],
      required_evidence_missing: [],
      supporting_evidence: [],
      supporting_evidence_present: [],
      supporting_evidence_missing: [],
    },
    {
      framework: "EU_AI_ACT",
      clause: "Art_15",
      title: "Accuracy, robustness, and cybersecurity",
      status: "covered",
      required_evidence: ["compare-report.json.summary.execution_quality"],
      required_evidence_present: ["compare-report.json.summary.execution_quality"],
      required_evidence_missing: [],
      supporting_evidence: [],
      supporting_evidence_present: [],
      supporting_evidence_missing: [],
    },
  ],
  items: [
    {
      case_id: "c1",
      title: "case",
      data_availability: {
        baseline: { status: "present" },
        new: { status: "present" },
      },
      case_status: "executed",
      baseline_pass: true,
      new_pass: true,
      artifacts: {
        replay_diff_href: "case-c1.html",
        baseline_case_response_href: "assets/raw/c1-baseline.json",
        new_case_response_href: "assets/raw/c1-new.json",
        baseline_trace_anchor_href: "assets/trace/c1-baseline.json",
        new_trace_anchor_href: "assets/trace/c1-new.json",
      },
      preventable_by_policy: false,
      recommended_policy_rules: [],
      trace_integrity: {
        baseline: { status: "ok", issues: [] },
        new: { status: "ok", issues: [] },
      },
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
    },
  ],
};

describe("euAiActDossier", () => {
  it("builds coverage export, evidence index, annex IV json, and HTML", () => {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    const bundleArtifacts = buildEuAiActBundleArtifacts();
    const bundle = buildEuAiActComplianceBundle({
      report,
      bundleArtifacts,
      postMarketMonitoring: {
        schema_version: 1,
        framework: "EU_AI_ACT",
        report_id: "eu-dossier",
        generated_at: 1,
        bundle_artifacts: bundleArtifacts,
        summary: {
          monitoring_status: "no_matching_history",
          trend_ingest_enabled: false,
          scope: "agent_model",
          current_run_included_in_history: false,
          runs_in_window: 0,
          prior_runs_in_window: 0,
          monitored_case_count: 0,
          drift_detected: false,
          drift_signals: [],
        },
        monitoring_window: {
          last_runs: 20,
          agent_id: "agent-a",
          model: "gpt-x",
        },
        current_run: {
          report_id: "eu-dossier",
          generated_at: 1,
          model: "gpt-x",
          executed_cases: 1,
          pass_count: 1,
          fail_count: 0,
          skipped_count: 0,
          pass_rate: 1,
          regressions: 0,
          improvements: 0,
          cases_requiring_approval: 0,
          cases_block_recommended: 0,
          high_risk_cases: 0,
          signal_totals: { low: 0, medium: 0, high: 0, critical: 0 },
        },
        run_history: [],
        monitored_cases: [],
        residual_gaps: ["No matching historical runs are available for this monitoring scope."],
        governance_review_attachment: {
          recommended_artifacts: [
            "compliance/post-market-monitoring.json",
            "compliance/release-review.json",
            "compliance/human-oversight-summary.json",
            "compliance/eu-ai-act-annex-iv.json",
            "compare-report.json",
          ],
          recurring_review_questions: ["Q1", "Q2", "Q3"],
        },
      },
      manifest: {
        manifest_version: "v1",
        generated_at: 1,
        items: [
          {
            manifest_key: "c1/baseline/case_response",
            rel_path: "assets/raw/c1-baseline.json",
            media_type: "application/json",
            bytes: 128,
            sha256: "a".repeat(64),
          },
          {
            manifest_key: "c1/new/case_response",
            rel_path: "assets/raw/c1-new.json",
            media_type: "application/json",
            bytes: 256,
            sha256: "b".repeat(64),
          },
          {
            manifest_key: "c1/new/trace_anchor",
            rel_path: "assets/trace/c1-new.json",
            media_type: "application/json",
            bytes: 96,
            sha256: "c".repeat(64),
          },
        ],
      },
    });
    expect(bundle).toBeDefined();
    if (!bundle || !bundle.article73SeriousIncidentPack || !bundle.releaseReview) {
      throw new Error("Expected the full EU AI Act bundle to include Article 73 and release review outputs");
    }
    const coverageSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-coverage-v1.schema.json"), "utf-8")
    );
    const evidenceSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-evidence-index-v1.schema.json"), "utf-8")
    );
    const annexSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-annex-iv-v1.schema.json"), "utf-8")
    );
    const article13Schema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-13-instructions-v1.schema.json"), "utf-8")
    );
    const article10Schema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-10-data-governance-v1.schema.json"), "utf-8")
    );
    const article16Schema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-16-provider-obligations-v1.schema.json"), "utf-8")
    );
    const article43Schema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-43-conformity-assessment-v1.schema.json"), "utf-8")
    );
    const article47Schema = JSON.parse(
      readFileSync(
        path.join(EU_SCHEMA_DIR, "eu-ai-act-article-47-declaration-of-conformity-v1.schema.json"),
        "utf-8"
      )
    );
    const riskRegisterSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-9-risk-register-v1.schema.json"), "utf-8")
    );
    const monitoringPlanSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-72-monitoring-plan-v1.schema.json"), "utf-8")
    );
    const qmsLiteSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-17-qms-lite-v1.schema.json"), "utf-8")
    );
    const annexVSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-annex-v-declaration-content-v1.schema.json"), "utf-8")
    );
    const incidentPackSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-article-73-serious-incident-pack-v1.schema.json"), "utf-8")
    );
    const monitoringSchema = JSON.parse(
      readFileSync(path.join(EU_SCHEMA_DIR, "eu-ai-act-post-market-monitoring-v1.schema.json"), "utf-8")
    );

    expect(bundle?.exports.annex_iv_href).toBe("compliance/eu-ai-act-annex-iv.json");
    expect(bundle?.exports.article_10_data_governance_href).toBe("compliance/article-10-data-governance.json");
    expect(bundle?.exports.human_oversight_summary_href).toBe("compliance/human-oversight-summary.json");
    expect(bundle?.exports.reviewer_html_href).toBe("compliance/eu-ai-act-reviewer.html");
    expect(bundle?.exports.reviewer_markdown_href).toBe("compliance/eu-ai-act-reviewer.md");
    expect(bundle?.exports.article_13_instructions_href).toBe("compliance/article-13-instructions.json");
    expect(bundle?.exports.article_16_provider_obligations_href).toBe("compliance/article-16-provider-obligations.json");
    expect(bundle?.exports.article_43_conformity_assessment_href).toBe("compliance/article-43-conformity-assessment.json");
    expect(bundle?.exports.article_47_declaration_of_conformity_href).toBe(
      "compliance/article-47-declaration-of-conformity.json"
    );
    expect(bundle?.exports.article_9_risk_register_href).toBe("compliance/article-9-risk-register.json");
    expect(bundle?.exports.article_72_monitoring_plan_href).toBe("compliance/article-72-monitoring-plan.json");
    expect(bundle?.exports.article_17_qms_lite_href).toBe("compliance/article-17-qms-lite.json");
    expect(bundle?.exports.annex_v_declaration_content_href).toBe("compliance/annex-v-declaration-content.json");
    expect(bundle?.exports.article_73_serious_incident_pack_href).toBe("compliance/article-73-serious-incident-pack.json");
    expect(bundle?.exports.release_review_href).toBe("compliance/release-review.json");
    expect(bundle?.exports.post_market_monitoring_href).toBe("compliance/post-market-monitoring.json");
    expect(bundle?.coverageExport.coverage).toHaveLength(3);
    expect(bundle?.evidenceIndex.clauses[0]?.selectors[0]?.source_rel_path).toBe("compare-report.json");
    expect(bundle?.evidenceIndex.manifest_items.length).toBeGreaterThan(0);
    expect(bundle?.annexIv.system_identity.report_id).toBe("eu-dossier");
    expect(bundle?.article10DataGovernance.document_scope.article).toBe("Art_10");
    expect(bundle?.article13Instructions.document_scope.article).toBe("Art_13");
    expect(bundle?.article16ProviderObligations.document_scope.article).toBe("Art_16");
    expect(bundle?.article16ProviderObligations.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "documentation_keeping_article_18", article_ref: "Art_18" }),
        expect.objectContaining({ id: "automatically_generated_logs_article_19", article_ref: "Art_19" }),
        expect.objectContaining({ id: "ce_marking_article_48", article_ref: "Art_48" }),
        expect.objectContaining({ id: "registration_article_49", article_ref: "Art_49" }),
        expect.objectContaining({
          id: "corrective_actions_and_duty_of_information_article_20",
          article_ref: "Art_20",
        }),
        expect.objectContaining({ id: "cooperation_with_competent_authorities_article_21", article_ref: "Art_21" }),
      ])
    );
    expect(bundle?.article43ConformityAssessment.document_scope.article).toBe("Art_43");
    expect(bundle?.article47DeclarationOfConformity.document_scope.article).toBe("Art_47");
    expect(bundle?.article9RiskRegister.summary.total_entries).toBeGreaterThan(0);
    expect(bundle?.article72MonitoringPlan.document_scope.article).toBe("Art_72");
    expect(bundle?.article72MonitoringPlan.current_baseline.approval_case_count).toBe(0);
    expect(bundle?.article72MonitoringPlan.current_baseline.blocking_case_count).toBe(0);
    expect(bundle?.article17QmsLite.document_scope.article).toBe("Art_17");
    expect(bundle?.annexVDeclarationContent.document_scope.annex).toBe("Annex_V");
    expect(bundle?.article17QmsLite.process_areas).toHaveLength(6);
    expect(bundle.article73SeriousIncidentPack.document_scope.article).toBe("Art_73");
    expect(bundle.article73SeriousIncidentPack.current_assessment.machine_triage_status).toBe("monitor");
    expect(bundle?.humanOversightSummary.review_queue).toEqual([]);
    expect(bundle.releaseReview.release_decision.status).toBe("approve");
    expect(bundle?.postMarketMonitoring.summary.monitoring_status).toBe("no_matching_history");
    expect(bundle?.annexIv.uncovered_areas).toContain(
      "Art_11: Full technical file still requires operator-authored material."
    );
    expect(bundle?.reportHtml).toContain("EU AI Act Annex IV dossier");
    expect(bundle?.reportHtml).toContain("Article 13 instructions for use scaffold");
    expect(bundle?.reportHtml).toContain("Article 9 risk register scaffold");
    expect(bundle?.reportHtml).toContain("Article 72 monitoring plan scaffold");
    expect(bundle?.reportHtml).toContain("Article 17 QMS-lite scaffold");
    expect(bundle?.reportHtml).toContain("Article 73 serious-incident pack");
    expect(bundle?.reportHtml).toContain("Human oversight");
    expect(bundle?.reportHtml).toContain("Release review");
    expect(bundle?.reportHtml).toContain("Post-market monitoring");
    expect(bundle?.reportHtml).toContain("Uncovered areas");
    expect(bundle?.reviewerHtml).toContain("EU AI Act reviewer pack");
    expect(bundle?.reviewerHtml).toContain("1. General description of the system");
    expect(bundle?.reviewerHtml).toContain("8. EU Declaration of Conformity boundary (Annex V)");
    expect(bundle?.reviewerHtml).toContain("Generated here (machine-generated)");
    expect(bundle?.reviewerHtml).toContain("Claim");
    expect(bundle?.reviewerHtml).toContain("Review this pack in Annex order");
    expect(bundle?.reviewerHtml).toContain("How to read this pack");
    expect(bundle?.reviewerMarkdown).toContain("# EU AI Act reviewer pack");
    expect(bundle?.reviewerMarkdown).toContain("## 5. Risk management system (Article 9)");
    expect(bundle?.reviewerMarkdown).toContain("### Claim-to-evidence map");
    expect(bundle?.reviewerMarkdown).toContain("## If you are not reading from engineering tooling");
    expect(bundle?.reviewerMarkdown).toContain("### Completed by the operator before handoff");
    expect(ajv.validate(coverageSchema, bundle?.coverageExport)).toBe(true);
    expect(ajv.validate(evidenceSchema, bundle?.evidenceIndex)).toBe(true);
    expect(ajv.validate(annexSchema, bundle?.annexIv)).toBe(true);
    expect(ajv.validate(article10Schema, bundle?.article10DataGovernance)).toBe(true);
    expect(ajv.validate(article13Schema, bundle?.article13Instructions)).toBe(true);
    expect(ajv.validate(article16Schema, bundle?.article16ProviderObligations)).toBe(true);
    expect(ajv.validate(article43Schema, bundle?.article43ConformityAssessment)).toBe(true);
    expect(ajv.validate(article47Schema, bundle?.article47DeclarationOfConformity)).toBe(true);
    expect(ajv.validate(riskRegisterSchema, bundle?.article9RiskRegister)).toBe(true);
    expect(ajv.validate(monitoringPlanSchema, bundle?.article72MonitoringPlan)).toBe(true);
    expect(ajv.validate(qmsLiteSchema, bundle?.article17QmsLite)).toBe(true);
    expect(ajv.validate(annexVSchema, bundle?.annexVDeclarationContent)).toBe(true);
    expect(ajv.validate(incidentPackSchema, bundle?.article73SeriousIncidentPack)).toBe(true);
    expect(ajv.validate(monitoringSchema, bundle?.postMarketMonitoring)).toBe(true);
  });

  it("fails when required EU identity metadata is missing", () => {
    expect(() =>
      buildEuAiActComplianceBundle({
        report: {
          ...report,
          environment: { agent_id: "agent-a", model: "gpt-x" },
        },
        bundleArtifacts: buildEuAiActBundleArtifacts(),
        manifest: { manifest_version: "v1", generated_at: 1, items: [] },
        postMarketMonitoring: {
          schema_version: 1,
          framework: "EU_AI_ACT",
          report_id: "eu-dossier",
          generated_at: 1,
          bundle_artifacts: buildEuAiActBundleArtifacts(),
          summary: {
            monitoring_status: "no_matching_history",
            trend_ingest_enabled: false,
            scope: "agent_model",
            current_run_included_in_history: false,
            runs_in_window: 0,
            prior_runs_in_window: 0,
            monitored_case_count: 0,
            drift_detected: false,
            drift_signals: [],
          },
          monitoring_window: { last_runs: 20, agent_id: "agent-a", model: "gpt-x" },
          current_run: {
            report_id: "eu-dossier",
            generated_at: 1,
            model: "gpt-x",
            executed_cases: 1,
            pass_count: 1,
            fail_count: 0,
            skipped_count: 0,
            pass_rate: 1,
            regressions: 0,
            improvements: 0,
            cases_requiring_approval: 0,
            cases_block_recommended: 0,
            high_risk_cases: 0,
            signal_totals: { low: 0, medium: 0, high: 0, critical: 0 },
          },
          run_history: [],
          monitored_cases: [],
          residual_gaps: [],
          governance_review_attachment: {
            recommended_artifacts: ["compare-report.json"],
            recurring_review_questions: ["Q1"],
          },
        },
      })
    ).toThrow("EU AI Act bundle requires environment identity fields");
  });
});
