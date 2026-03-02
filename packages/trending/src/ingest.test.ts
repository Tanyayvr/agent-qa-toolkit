import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildResponseMap,
  countSignalsBySeverity,
  deriveCaseStatusFromItem,
  extractGitContext,
  extractRunId,
  extractTokenData,
  extractTotalCases,
  readFlakinessIfExists,
  validateEnum,
} from "./ingest";
import type { CompareReport } from "./reportTypes";

function mkReport(overrides: Partial<CompareReport> = {}): CompareReport {
  return {
    report_id: "rep-1",
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
      data_coverage: { total_cases: 2 },
    },
    items: [
      {
        case_id: "c1",
        baseline_pass: true,
        new_pass: true,
        risk_level: "low",
        gate_recommendation: "none",
      },
      {
        case_id: "c2",
        baseline_pass: false,
        new_pass: false,
        risk_level: "medium",
        gate_recommendation: "require_approval",
      },
    ],
    ...overrides,
  };
}

describe("ingest helpers", () => {
  let root = "";

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("extracts run id and total cases with fallback", () => {
    const r1 = mkReport();
    expect(extractRunId(r1)).toBe("run-1");
    expect(extractTotalCases(r1)).toBe(2);

    const r2 = mkReport({
      meta: { toolkit_version: "1", spec_version: "x", generated_at: 1 },
      summary: { baseline_pass: 1, new_pass: 1, regressions: 0, improvements: 0 },
    });
    expect(extractRunId(r2)).toBe("rep-1");
    expect(extractTotalCases(r2)).toBe(2);
  });

  it("extracts git context safely", () => {
    expect(extractGitContext(undefined)).toEqual({ commit: null, branch: null, dirty: null });
    expect(
      extractGitContext({ git_commit: "abc", git_branch: "main", git_dirty: true })
    ).toEqual({ commit: "abc", branch: "main", dirty: true });
  });

  it("validates enums and derives case status", () => {
    expect(validateEnum(" High ", new Set(["high", "low"]), "risk")).toBe("high");
    expect(() => validateEnum("invalid", new Set(["ok"]), "risk")).toThrow("Invalid risk");

    expect(
      deriveCaseStatusFromItem({
        case_id: "c1",
        baseline_pass: true,
        new_pass: true,
        risk_level: "low",
        gate_recommendation: "none",
        case_status: "filtered_out",
      })
    ).toBe("manual_unknown");

    expect(
      deriveCaseStatusFromItem({
        case_id: "c2",
        baseline_pass: true,
        new_pass: true,
        risk_level: "low",
        gate_recommendation: "none",
        data_availability: {
          baseline: { status: "broken" },
          new: { status: "present" },
        },
      })
    ).toBe("broken");
  });

  it("counts severities and token data", () => {
    expect(
      countSignalsBySeverity({
        baseline: { signals: [] },
        new: {
          signals: [{ severity: "low" }, { severity: "critical" }, { severity: "low" }],
        },
      })
    ).toEqual({ low: 2, medium: 0, high: 0, critical: 1 });

    expect(extractTokenData(undefined)).toEqual({
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      tool_call_count: null,
      loop_detected: null,
    });

    expect(
      extractTokenData({
        case_id: "c1",
        version: "new",
        final_output: { content_type: "text", content: "ok" },
        events: [],
        token_usage: {
          input_tokens: 10,
          output_tokens: 4,
          total_tokens: 14,
          tool_call_count: 1,
          loop_detected: true,
        },
      })
    ).toEqual({
      input_tokens: 10,
      output_tokens: 4,
      total_tokens: 14,
      tool_call_count: 1,
      loop_detected: 1,
    });
  });

  it("builds response map coverage and reads flakiness file", async () => {
    const report = mkReport();
    const mapped = buildResponseMap(
      {
        c1: {
          case_id: "c1",
          version: "new",
          final_output: { content_type: "text", content: "ok" },
          events: [],
        },
      },
      report.items
    );
    expect(mapped.map.size).toBe(1);
    expect(mapped.coverage).toContain("1/2");

    root = await mkdtemp(path.join(tmpdir(), "trend-flaky-"));
    const flakinessPath = path.join(root, "flakiness.json");
    await writeFile(
      flakinessPath,
      JSON.stringify({ run_id: "r1", runs_per_case: 2, cases: [{ case_id: "c1", runs: 2, baseline_pass_rate: 1, new_pass_rate: 0.5 }] }),
      "utf-8"
    );
    expect(readFlakinessIfExists(flakinessPath)?.run_id).toBe("r1");
    expect(readFlakinessIfExists(path.join(root, "missing.json"))).toBeNull();
  });
});
