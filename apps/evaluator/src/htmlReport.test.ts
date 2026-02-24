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
      risk_level: "low",
      risk_tags: [],
      gate_recommendation: "none",
      artifacts: { replay_diff_href: "case-case_1.html" },
    },
  ],
};

describe("htmlReport", () => {
  it("renders HTML", () => {
    const html = renderHtmlReport({ ...baseReport, embedded_manifest_index: { items: [] } });
    expect(html).toContain("Evaluator report");
    expect(html).toContain("case_1");
  });
});
