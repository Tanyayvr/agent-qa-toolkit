import { describe, expect, it } from "vitest";
import { validateReportForIngest } from "./validate";
import type { CompareReport } from "./reportTypes";

function mkReport(overrides: Partial<CompareReport> = {}): CompareReport {
  return {
    contract_version: 5,
    report_id: "r1",
    meta: {
      toolkit_version: "1.0.0",
      spec_version: "aepf-v1",
      generated_at: 1,
      run_id: "run-1",
    },
    summary: {
      baseline_pass: 1,
      new_pass: 1,
      regressions: 0,
      improvements: 0,
      data_coverage: { total_cases: 1 },
    },
    items: [
      {
        case_id: "c1",
        baseline_pass: true,
        new_pass: true,
        risk_level: "low",
        gate_recommendation: "none",
      },
    ],
    ...overrides,
  };
}

describe("validateReportForIngest", () => {
  it("accepts valid report", () => {
    const out = validateReportForIngest(mkReport());
    expect(out.valid).toBe(true);
    expect(out.errors).toHaveLength(0);
  });

  it("rejects invalid risk/gate enums", () => {
    const bad = mkReport({
      items: [
        {
          case_id: "c1",
          baseline_pass: true,
          new_pass: true,
          risk_level: "severe",
          gate_recommendation: "force_block",
        } as never,
      ],
    });
    const out = validateReportForIngest(bad);
    expect(out.valid).toBe(false);
    expect(out.errors.some((e) => e.field.includes("risk_level"))).toBe(true);
    expect(out.errors.some((e) => e.field.includes("gate_recommendation"))).toBe(true);
  });

  it("adds warnings for weak metadata and nullable passes", () => {
    const weak = mkReport({
      contract_version: 3,
      meta: {
        toolkit_version: "1.0.0",
        spec_version: "aepf-v1",
        generated_at: 1,
      },
      summary: {
        baseline_pass: 1,
        new_pass: 1,
        regressions: 0,
        improvements: 0,
      },
      items: [
        {
          case_id: "c1",
          baseline_pass: null,
          new_pass: null,
          case_status: "custom_status" as never,
          risk_level: "low",
          gate_recommendation: "none",
        },
      ],
    });
    const out = validateReportForIngest(weak);
    expect(out.valid).toBe(true);
    expect(out.warnings.some((w) => w.includes("contract_version"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("meta.run_id"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("data_coverage.total_cases"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("baseline_pass is null"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("new_pass is null"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("case_status invalid"))).toBe(true);
  });
});
