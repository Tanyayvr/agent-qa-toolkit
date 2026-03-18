import { describe, expect, it } from "vitest";
import { computeComplianceCoverage } from "./complianceCoverage";
import type { CompareReport } from "./reportTypes";

const baseReport: CompareReport & {
  embedded_manifest_index?: {
    manifest_version: "v1";
    generated_at: number;
    source_manifest_sha256: string;
    items: Array<{ manifest_key: string; rel_path: string; media_type: string }>;
  };
} = {
  contract_version: 5,
  report_id: "coverage",
  meta: { toolkit_version: "0.1.0", spec_version: "aepf-v1", generated_at: 1, run_id: "coverage" },
  environment: { agent_id: "agent-a", model: "gpt-x" },
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
      title: "case",
      data_availability: {
        baseline: { status: "present" },
        new: { status: "present" },
      },
      case_status: "executed",
      baseline_pass: true,
      new_pass: true,
      artifacts: { replay_diff_href: "case-c1.html" },
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
  embedded_manifest_index: {
    manifest_version: "v1",
    generated_at: 1,
    source_manifest_sha256: "abc",
    items: [{ manifest_key: "c1/new/case_response", rel_path: "assets/c1.json", media_type: "application/json" }],
  },
};

describe("complianceCoverage", () => {
  it("computes covered, partial, and missing coverage entries from report evidence", () => {
    const coverage = computeComplianceCoverage({
      report: baseReport,
      manifest: {
        manifest_version: "v1",
        generated_at: 1,
        items: [{ manifest_key: "c1/new/case_response", rel_path: "assets/c1.json", media_type: "application/json" }],
      },
      requirements: [
        {
          framework: "EU_AI_ACT",
          clause: "Art_9",
          title: "Risk management",
          required_evidence: [
            "compare-report.json.summary.risk_summary",
            "compare-report.json.items[].gate_recommendation",
          ],
        },
        {
          framework: "EU_AI_ACT",
          clause: "Art_11",
          title: "Technical documentation",
          required_evidence: ["compare-report.json.summary.execution_quality", "artifacts/manifest.json.items[].manifest_key"],
          residual_gaps: ["Full Annex IV dossier still requires operator-owned material."],
          status_cap: "partial",
        },
        {
          framework: "EU_AI_ACT",
          clause: "Art_10",
          title: "Data governance",
          required_evidence: ["compare-report.json.environment.training_data_provenance"],
          supporting_evidence: ["compare-report.json.summary.data_coverage"],
        },
      ],
    });

    expect(coverage?.map((entry) => entry.status)).toEqual(["covered", "partial", "partial"]);
    expect(coverage?.[0]?.required_evidence_missing).toEqual([]);
    expect(coverage?.[1]).toMatchObject({
      clause: "Art_11",
      status: "partial",
      status_cap: "partial",
      required_evidence_missing: [],
    });
    expect(coverage?.[2]).toMatchObject({
      clause: "Art_10",
      required_evidence_missing: ["compare-report.json.environment.training_data_provenance"],
      supporting_evidence_present: ["compare-report.json.summary.data_coverage"],
    });
  });
});
