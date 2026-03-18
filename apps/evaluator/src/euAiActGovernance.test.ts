import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import {
  buildEuAiActHumanOversightSummary,
  buildEuAiActReleaseReview,
  type EuAiActBundleArtifacts,
} from "./euAiActGovernance";
import type { CompareReport, ComplianceCoverageEntry } from "./reportTypes";

const bundleArtifacts: EuAiActBundleArtifacts = {
  compare_report_href: "compare-report.json",
  evaluator_report_html_href: "report.html",
  manifest_href: "artifacts/manifest.json",
  coverage_href: "compliance/eu-ai-act-coverage.json",
  annex_iv_href: "compliance/eu-ai-act-annex-iv.json",
  report_html_href: "compliance/eu-ai-act-report.html",
  evidence_index_href: "compliance/evidence-index.json",
  article_13_instructions_href: "compliance/article-13-instructions.json",
  article_9_risk_register_href: "compliance/article-9-risk-register.json",
  article_72_monitoring_plan_href: "compliance/article-72-monitoring-plan.json",
  article_17_qms_lite_href: "compliance/article-17-qms-lite.json",
  human_oversight_summary_href: "compliance/human-oversight-summary.json",
  release_review_href: "compliance/release-review.json",
  post_market_monitoring_href: "compliance/post-market-monitoring.json",
};

const coverage: ComplianceCoverageEntry[] = [
  {
    framework: "EU_AI_ACT",
    clause: "Art_12",
    title: "Record-keeping",
    status: "covered",
    required_evidence: ["compare-report.json.items[].trace_integrity"],
    required_evidence_present: ["compare-report.json.items[].trace_integrity"],
    required_evidence_missing: [],
    supporting_evidence: [],
    supporting_evidence_present: [],
    supporting_evidence_missing: [],
  },
];

const report: CompareReport = {
  contract_version: 5,
  report_id: "governance",
  meta: { toolkit_version: "0.1.0", spec_version: "aepf-v1", generated_at: 1, run_id: "governance" },
  baseline_dir: "baseline",
  new_dir: "new",
  cases_path: "cases.json",
  summary: {
    baseline_pass: 1,
    new_pass: 0,
    regressions: 1,
    improvements: 0,
    root_cause_breakdown: {},
    quality: { transfer_class: "internal_only", redaction_status: "none" },
    security: {
      total_cases: 2,
      cases_with_signals_new: 1,
      cases_with_signals_baseline: 0,
      signal_counts_new: { low: 0, medium: 1, high: 0, critical: 0 },
      signal_counts_baseline: { low: 0, medium: 0, high: 0, critical: 0 },
      top_signal_kinds_new: ["prompt_injection_marker"],
      top_signal_kinds_baseline: [],
    },
    risk_summary: { low: 0, medium: 1, high: 1 },
    cases_requiring_approval: 1,
    cases_block_recommended: 1,
    data_coverage: {
      total_cases: 2,
      items_emitted: 2,
      missing_baseline_artifacts: 0,
      missing_new_artifacts: 0,
      broken_baseline_artifacts: 0,
      broken_new_artifacts: 0,
    },
    execution_quality: {
      status: "degraded",
      reasons: ["new transport success below threshold"],
      thresholds: {
        min_transport_success_rate: 0.95,
        max_weak_expected_rate: 0.2,
        min_pre_action_entropy_removed: 0,
        min_reconstruction_minutes_saved_per_block: 0,
      },
      total_executed_cases: 2,
      baseline_runner_failures: 0,
      new_runner_failures: 1,
      baseline_runner_failure_rate: 0,
      new_runner_failure_rate: 0.5,
      baseline_transport_success_rate: 1,
      new_transport_success_rate: 0.5,
      baseline_runner_failure_kinds: {},
      new_runner_failure_kinds: { timeout: 1 },
      weak_expected_cases: 0,
      weak_expected_rate: 0,
      model_quality_inconclusive: false,
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
      case_id: "c-review",
      title: "approval case",
      data_availability: { baseline: { status: "present" }, new: { status: "present" } },
      case_status: "executed",
      baseline_pass: true,
      new_pass: false,
      preventable_by_policy: false,
      recommended_policy_rules: [],
      trace_integrity: { baseline: { status: "ok", issues: [] }, new: { status: "ok", issues: [] } },
      security: {
        baseline: { signals: [], requires_gate_recommendation: true },
        new: {
          signals: [
            {
              kind: "prompt_injection_marker",
              severity: "medium",
              confidence: "high",
              title: "Prompt injection marker",
              evidence_refs: [],
            },
          ],
          requires_gate_recommendation: true,
        },
      },
      policy_evaluation: {
        baseline: { planning_gate_pass: true, repl_policy_pass: true },
        new: { planning_gate_pass: true, repl_policy_pass: true },
      },
      assumption_state: {
        baseline: { status: "not_required", selected_count: 0, rejected_count: 0 },
        new: { status: "not_required", selected_count: 0, rejected_count: 0 },
      },
      risk_level: "medium",
      risk_tags: [],
      gate_recommendation: "require_approval",
      artifacts: {
        replay_diff_href: "case-c-review.html",
        new_case_response_href: "assets/c-review-new.json",
      },
    },
    {
      case_id: "c-block",
      title: "blocking case",
      data_availability: { baseline: { status: "present" }, new: { status: "broken" } },
      case_status: "executed",
      baseline_pass: true,
      new_pass: false,
      baseline_root: "ok",
      new_root: "timeout",
      preventable_by_policy: false,
      recommended_policy_rules: [],
      trace_integrity: { baseline: { status: "ok", issues: [] }, new: { status: "broken", issues: ["missing span"] } },
      security: {
        baseline: { signals: [], requires_gate_recommendation: true },
        new: { signals: [], requires_gate_recommendation: true },
      },
      policy_evaluation: {
        baseline: { planning_gate_pass: true, repl_policy_pass: true },
        new: { planning_gate_pass: false, repl_policy_pass: false },
      },
      assumption_state: {
        baseline: { status: "not_required", selected_count: 0, rejected_count: 0 },
        new: { status: "missing", selected_count: 0, rejected_count: 0, reason_code: "missing" },
      },
      risk_level: "high",
      risk_tags: [],
      gate_recommendation: "block",
      failure_summary: {
        new: { class: "timeout", timeout_ms: 15000 },
      },
      artifacts: {
        replay_diff_href: "case-c-block.html",
        new_case_response_href: "assets/c-block-new.json",
      },
    },
  ],
};

describe("euAiActGovernance", () => {
  it("builds oversight and release-review outputs with reviewer actions and schemas", () => {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    const oversightSchema = JSON.parse(
      readFileSync(path.join(process.cwd(), "schemas", "eu-ai-act-human-oversight-v1.schema.json"), "utf-8")
    );
    const releaseSchema = JSON.parse(
      readFileSync(path.join(process.cwd(), "schemas", "eu-ai-act-release-review-v1.schema.json"), "utf-8")
    );

    const oversight = buildEuAiActHumanOversightSummary({
      report,
      coverage,
      bundleArtifacts,
      generatedAt: 1,
    });
    const releaseReview = buildEuAiActReleaseReview({
      report,
      coverage,
      oversightSummary: oversight,
      bundleArtifacts,
      generatedAt: 1,
    });

    expect(oversight.review_queue).toHaveLength(2);
    expect(oversight.approval_required_cases[0]?.reviewer_action).toBe("require_human_review");
    expect(oversight.blocked_cases[0]?.reviewer_action).toBe("block_release");
    expect(releaseReview.release_decision.status).toBe("reject");
    expect(releaseReview.checklist.find((item) => item.id === "approval_cases")?.status).toBe("review");
    expect(releaseReview.checklist.find((item) => item.id === "blocking_cases")?.status).toBe("fail");
    expect(ajv.validate(oversightSchema, oversight)).toBe(true);
    expect(ajv.validate(releaseSchema, releaseReview)).toBe(true);
  });
});
