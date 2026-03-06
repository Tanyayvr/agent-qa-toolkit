import { describe, expect, it } from "vitest";
import type { CompareReport } from "./htmlReport";
import { computeSummaryBySuite } from "./summaryBySuite";

function mkItem(params: Partial<CompareReport["items"][number]> & { case_id: string }): CompareReport["items"][number] {
  return {
    case_id: params.case_id,
    title: params.title ?? params.case_id,
    ...(params.suite ? { suite: params.suite } : {}),
    data_availability: params.data_availability ?? {
      baseline: { status: "present" },
      new: { status: "present" },
    },
    case_status: params.case_status ?? "executed",
    baseline_pass: params.baseline_pass ?? true,
    new_pass: params.new_pass ?? true,
    ...(params.baseline_root ? { baseline_root: params.baseline_root } : {}),
    ...(params.new_root ? { new_root: params.new_root } : {}),
    preventable_by_policy: params.preventable_by_policy ?? true,
    recommended_policy_rules: params.recommended_policy_rules ?? [],
    trace_integrity: params.trace_integrity ?? {
      baseline: { status: "ok", issues: [] },
      new: { status: "ok", issues: [] },
    },
    security: params.security ?? {
      baseline: { signals: [], requires_gate_recommendation: false },
      new: { signals: [], requires_gate_recommendation: false },
    },
    policy_evaluation: params.policy_evaluation ?? {
      baseline: { planning_gate_pass: true, repl_policy_pass: true },
      new: { planning_gate_pass: true, repl_policy_pass: true },
    },
    risk_level: params.risk_level ?? "low",
    risk_tags: params.risk_tags ?? [],
    gate_recommendation: params.gate_recommendation ?? "none",
    artifacts: params.artifacts ?? { replay_diff_href: `case-${params.case_id}.html` },
  };
}

describe("computeSummaryBySuite", () => {
  it("aggregates per-suite pass/regression/risk and coverage counters", () => {
    const items: CompareReport["items"] = [
      mkItem({
        case_id: "c1",
        suite: "correctness",
        baseline_pass: true,
        new_pass: false,
        new_root: "wrong_format",
        risk_level: "high",
        gate_recommendation: "block",
        data_availability: {
          baseline: { status: "present" },
          new: { status: "broken" },
        },
      }),
      mkItem({
        case_id: "c2",
        suite: "correctness",
        baseline_pass: false,
        new_pass: true,
        risk_level: "medium",
        gate_recommendation: "require_approval",
        data_availability: {
          baseline: { status: "missing" },
          new: { status: "present" },
        },
      }),
      mkItem({
        case_id: "c3",
        // default suite branch
        baseline_pass: true,
        new_pass: true,
        risk_level: "low",
      }),
    ];

    const suites = computeSummaryBySuite(items);
    expect(Object.keys(suites).sort()).toEqual(["correctness", "default"]);

    expect(suites.correctness).toMatchObject({
      baseline_pass: 1,
      new_pass: 1,
      regressions: 1,
      improvements: 1,
      root_cause_breakdown: { wrong_format: 1 },
      risk_summary: { low: 0, medium: 1, high: 1 },
      cases_requiring_approval: 1,
      cases_block_recommended: 1,
      data_coverage: {
        total_cases: 2,
        items_emitted: 2,
        missing_baseline_artifacts: 1,
        missing_new_artifacts: 0,
        broken_baseline_artifacts: 0,
        broken_new_artifacts: 1,
      },
    });

    expect(suites.default).toMatchObject({
      baseline_pass: 1,
      new_pass: 1,
      regressions: 0,
      improvements: 0,
      risk_summary: { low: 1, medium: 0, high: 0 },
    });
  });
});
