import { describe, it, expect } from "vitest";
import { renderHtmlReport, type CompareReport } from "./htmlReport";

const baseReport: CompareReport = {
  contract_version: 5,
  report_id: "test",
  meta: { toolkit_version: "1.4.0", spec_version: "aepf-v1", generated_at: 1, run_id: "run" },
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
      case_id: "case_1",
      title: "Test",
      suite: "correctness",
      data_availability: {
        baseline: { status: "present" },
        new: { status: "present" },
      },
      case_status: "executed",
      baseline_pass: true,
      new_pass: true,
      preventable_by_policy: true,
      recommended_policy_rules: [],
      trace_integrity: { baseline: { status: "ok", issues: [] }, new: { status: "ok", issues: [] } },
      security: { baseline: { signals: [], requires_gate_recommendation: false }, new: { signals: [], requires_gate_recommendation: false } },
      policy_evaluation: {
        baseline: { planning_gate_pass: true, repl_policy_pass: true },
        new: { planning_gate_pass: true, repl_policy_pass: true },
      },
      risk_level: "low",
      risk_tags: [],
      gate_recommendation: "none",
      artifacts: { replay_diff_href: "case-case_1.html" },
    },
  ],
};

function cloneReport(report: CompareReport): CompareReport {
  return JSON.parse(JSON.stringify(report)) as CompareReport;
}

describe("htmlReport", () => {
  it("renders HTML", () => {
    const html = renderHtmlReport({ ...baseReport, embedded_manifest_index: { items: [] } });
    expect(html).toContain("Evaluator report");
    expect(html).toContain("case_1");
  });

  it("embeds rows JSON and renders client-side table body", () => {
    const html = renderHtmlReport({ ...baseReport, embedded_manifest_index: { items: [] } });
    expect(html).toContain('id="casesBody"');
    expect(html).toContain('id="rows-data"');
    expect(html).toContain('"case_id":"case_1"');
    expect(html).toContain('"row_html":"\\n<tr');
    expect(html).toContain('id="pagePrev"');
    expect(html).toContain('id="pageNext"');
    expect(html).toContain('id="pageSize"');
    expect(html).toContain("renderJobId");
    expect(html).toContain("requestAnimationFrame");
    expect(html).toContain("Rendering rows...");
  });

  it("renders optional execution/compliance/environment/trace sections and breakdown table", () => {
    const report = cloneReport(baseReport);
    report.summary.root_cause_breakdown = {
      timeout: 2,
      invalid_json: 1,
    };
    report.summary.execution_quality = {
      status: "degraded",
      reasons: ["new transport success 0.700 is below threshold 0.950"],
      thresholds: {
        min_transport_success_rate: 0.95,
        max_weak_expected_rate: 0.2,
        min_pre_action_entropy_removed: 0,
        min_reconstruction_minutes_saved_per_block: 0,
      },
      total_executed_cases: 3,
      baseline_runner_failures: 0,
      new_runner_failures: 1,
      baseline_runner_failure_rate: 0,
      new_runner_failure_rate: 0.333,
      baseline_transport_success_rate: 1,
      new_transport_success_rate: 0.7,
      baseline_runner_failure_kinds: { none: 0 },
      new_runner_failure_kinds: { timeout: 1 },
      weak_expected_cases: 0,
      weak_expected_rate: 0,
      model_quality_inconclusive: true,
      model_quality_inconclusive_reason: "transport_success_below_threshold",
      admissibility_kpi: {
        risk_mass_before: 10,
        risk_mass_after: 4,
        pre_action_entropy_removed: 0.6,
        blocked_cases: 2,
        reconstruction_minutes_saved_total: 90,
        reconstruction_minutes_saved_per_block: 45,
        model: {
          risk_weight_by_level: { low: 1, medium: 2, high: 3 },
          residual_factor_by_gate: { none: 1, require_approval: 0.4, block: 0 },
          minutes_per_removed_risk_unit: 30,
        },
      },
    };
    report.summary.trace_anchor_coverage = {
      cases_with_anchor_baseline: 3,
      cases_with_anchor_new: 2,
    };
    report.environment = {
      agent_id: "agent-a",
      model: "gpt-x",
      prompt_version: "p1",
      tools_version: "t1",
    };
    report.compliance_mapping = [
      { framework: "EU AI Act", clause: "Art. 9", title: "Risk management" },
    ];
    report.quality_flags = {
      ...report.quality_flags,
      missing_assets: ["a", "b", "c", "d", "e", "f", "g"],
      path_violations: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
      large_payloads: ["l1", "l2", "l3", "l4", "l5"],
    };
    report.summary_by_suite = {
      correctness: report.summary_by_suite?.correctness ?? report.summary,
      security: report.summary_by_suite?.correctness ?? report.summary,
    };

    const html = renderHtmlReport(report);

    expect(html).toContain("Execution quality");
    expect(html).toContain("Admissibility KPI");
    expect(html).toContain("model quality: inconclusive");
    expect(html).toContain("OTel anchors");
    expect(html).toContain("Environment");
    expect(html).toContain("Compliance");
    expect(html).not.toContain("Only one suite present in this report.");
    expect(html).toContain("root_cause");
    expect(html).toContain("invalid_json");
    expect(html).toContain("missing_assets:");
    expect(html).toContain("path_violations:");
    expect(html).toContain("large_payloads:");
    expect(html).toContain(" …");
  });

  it("renders fallback sections when optional blocks are absent", () => {
    const report = cloneReport(baseReport);
    report.summary.root_cause_breakdown = {};
    delete (report.summary as { execution_quality?: unknown }).execution_quality;
    delete report.summary.trace_anchor_coverage;
    delete report.environment;
    report.compliance_mapping = [];
    const html = renderHtmlReport(report);

    expect(html).toContain("No failures / no breakdown");
    expect(html).not.toContain("Execution quality");
    expect(html).not.toContain("OTel anchors");
    expect(html).not.toContain("Environment");
    expect(html).not.toContain("Compliance");
    // embedded index intentionally absent here
    expect(html).toContain('id="embedded-manifest-index"');
    expect(html).not.toContain('"items"');
  });

  it("renders execution quality without KPI block when admissibility is absent", () => {
    const report = cloneReport(baseReport);
    report.summary.execution_quality = {
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
      model_quality_inconclusive: true,
    };
    const html = renderHtmlReport(report);

    expect(html).toContain("Execution quality");
    expect(html).toContain("model quality: inconclusive");
    expect(html).not.toContain("Admissibility KPI");
  });
});
