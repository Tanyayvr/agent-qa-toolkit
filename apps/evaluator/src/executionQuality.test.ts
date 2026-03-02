import { describe, expect, it } from "vitest";
import type { CompareReport } from "./htmlReport";
import {
  computeExecutionQuality,
  isWeakExpected,
  parseRateThreshold,
} from "./executionQuality";

function mkItem(params: Partial<CompareReport["items"][number]> & { case_id: string }): CompareReport["items"][number] {
  return {
    case_id: params.case_id,
    title: params.title ?? params.case_id,
    data_availability: params.data_availability ?? {
      baseline: { status: "present" },
      new: { status: "present" },
    },
    case_status: params.case_status ?? "executed",
    baseline_pass: params.baseline_pass ?? true,
    new_pass: params.new_pass ?? true,
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
    risk_level: params.risk_level ?? "low",
    risk_tags: params.risk_tags ?? [],
    gate_recommendation: params.gate_recommendation ?? "none",
    artifacts: params.artifacts ?? { replay_diff_href: `case-${params.case_id}.html` },
    ...(params.failure_summary ? { failure_summary: params.failure_summary } : {}),
  };
}

describe("executionQuality", () => {
  it("keeps healthy status when transport and expected contracts are strong", () => {
    const items = [mkItem({ case_id: "c1" }), mkItem({ case_id: "c2" })];
    const expectedById = new Map([
      ["c1", { must_include: ["ok"] }],
      ["c2", { tool_required: ["search"] }],
    ]);

    const q = computeExecutionQuality({
      items,
      expectedById,
      minTransportSuccessRate: 0.95,
      maxWeakExpectedRate: 0.2,
    });

    expect(q.status).toBe("healthy");
    expect(q.reasons).toEqual([]);
    expect(q.model_quality_inconclusive).toBe(false);
    expect(q.baseline_transport_success_rate).toBe(1);
    expect(q.new_transport_success_rate).toBe(1);
    expect(q.weak_expected_rate).toBe(0);
    expect(q.admissibility_kpi.risk_mass_before).toBe(2);
    expect(q.admissibility_kpi.risk_mass_after).toBe(2);
    expect(q.admissibility_kpi.pre_action_entropy_removed).toBe(0);
    expect(q.admissibility_kpi.reconstruction_minutes_saved_per_block).toBe(0);
  });

  it("marks degraded and inconclusive when transport and weak-expected thresholds fail", () => {
    const items = [
      mkItem({
        case_id: "c1",
        risk_level: "high",
        gate_recommendation: "block",
        failure_summary: {
          baseline: { class: "runner_fetch_failure", net_error_kind: "fetch_failed" },
          new: { class: "runner_fetch_failure", net_error_kind: "fetch_failed" },
        },
      }),
    ];
    const expectedById = new Map([["c1", {}]]);

    const q = computeExecutionQuality({
      items,
      expectedById,
      minTransportSuccessRate: 0.95,
      maxWeakExpectedRate: 0.2,
      interruptedBySignal: "SIGINT",
    });

    expect(q.status).toBe("degraded");
    expect(q.model_quality_inconclusive).toBe(true);
    expect(q.model_quality_inconclusive_reason).toBe("transport_success_below_threshold");
    expect(q.baseline_runner_failure_kinds.fetch_failed).toBe(1);
    expect(q.new_runner_failure_kinds.fetch_failed).toBe(1);
    expect(q.reasons.some((x) => x.includes("baseline transport success"))).toBe(true);
    expect(q.reasons.some((x) => x.includes("weak expected rate"))).toBe(true);
    expect(q.reasons.some((x) => x.includes("interrupted by SIGINT"))).toBe(true);
    expect(q.admissibility_kpi.risk_mass_before).toBe(3);
    expect(q.admissibility_kpi.risk_mass_after).toBe(0);
    expect(q.admissibility_kpi.pre_action_entropy_removed).toBe(1);
    expect(q.admissibility_kpi.blocked_cases).toBe(1);
    expect(q.admissibility_kpi.reconstruction_minutes_saved_per_block).toBeGreaterThan(0);
  });

  it("parseRateThreshold and isWeakExpected preserve expected semantics", () => {
    expect(parseRateThreshold("1.2", 0.9)).toBe(1);
    expect(parseRateThreshold("-2", 0.9)).toBe(0);
    expect(parseRateThreshold("bad", 0.9)).toBe(0.9);

    expect(isWeakExpected({})).toBe(true);
    expect(isWeakExpected({ tool_sequence: ["a", "b"] })).toBe(false);
  });
});
