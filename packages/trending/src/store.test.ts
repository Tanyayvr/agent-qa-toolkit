import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TrendStore } from "./store";
import type { CompareReport } from "./reportTypes";
import type { AgentResponse } from "shared-types";

function mkReport(reportId: string, runId: string, generatedAt: number, aPass: boolean, bPass: boolean): CompareReport {
  return {
    contract_version: 5,
    report_id: reportId,
    meta: {
      toolkit_version: "1.0.0",
      spec_version: "aepf-v1",
      generated_at: generatedAt,
      run_id: runId,
    },
    environment: {
      agent_id: "agent-x",
      model: "phi3.5",
      prompt_version: "p1",
      tools_version: "t1",
    },
    summary: {
      baseline_pass: aPass ? 1 : 0,
      new_pass: bPass ? 1 : 0,
      regressions: aPass && !bPass ? 1 : 0,
      improvements: !aPass && bPass ? 1 : 0,
      execution_quality: {
        admissibility_kpi: {
          risk_mass_before: 4,
          risk_mass_after: 1.6,
          pre_action_entropy_removed: 0.6,
          blocked_cases: 1,
          reconstruction_minutes_saved_total: 72,
          reconstruction_minutes_saved_per_block: 72,
        },
      },
      data_coverage: { total_cases: 2 },
    },
    items: [
      {
        case_id: "case_a",
        suite: "core",
        case_status: "executed",
        baseline_pass: aPass,
        new_pass: aPass,
        risk_level: "low",
        gate_recommendation: "none",
        ...(aPass ? {} : { new_root: "missing_required_data" }),
        security: { baseline: { signals: [] }, new: { signals: [{ severity: "low" }] } },
      },
      {
        case_id: "case_b",
        suite: "core",
        case_status: "executed",
        baseline_pass: bPass,
        new_pass: bPass,
        risk_level: "medium",
        gate_recommendation: "require_approval",
        ...(bPass ? {} : { new_root: "tool_failure" }),
        security: { baseline: { signals: [] }, new: { signals: [{ severity: "high" }] } },
      },
    ],
  };
}

function mkResponses(totalA: number | null, totalB: number | null): Record<string, AgentResponse> {
  return {
    case_a: {
      case_id: "case_a",
      version: "new",
      final_output: { content_type: "text", content: "ok-a" },
      events: [],
      ...(totalA === null
        ? {}
        : { token_usage: { total_tokens: totalA, input_tokens: 10, output_tokens: 5, tool_call_count: 1 } }),
    },
    case_b: {
      case_id: "case_b",
      version: "new",
      final_output: { content_type: "text", content: "ok-b" },
      events: [],
      ...(totalB === null
        ? {}
        : {
            token_usage: {
              total_tokens: totalB,
              input_tokens: 11,
              output_tokens: 6,
              tool_call_count: 2,
              loop_detected: true,
            },
          }),
    },
  };
}

describe("TrendStore integration", () => {
  let root = "";
  let store: TrendStore | null = null;

  afterEach(async () => {
    if (store) {
      store.close();
      store = null;
    }
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("ingests reports, supports duplicate detection, and exposes query/stats", async () => {
    root = await mkdtemp(path.join(tmpdir(), "trend-store-"));
    const dbPath = path.join(root, "trend.sqlite");
    store = TrendStore.open({ dbPath });

    const rep1 = mkReport("rep-1", "run-1", 1000, true, false);
    const rep2 = mkReport("rep-2", "run-2", 2000, false, true);

    const r1 = store.ingest(rep1, { responses: mkResponses(20, null), sourcePath: "reports/rep-1.json" });
    expect(r1.inserted).toBe(true);
    expect(r1.casesIngested).toBe(2);

    const duplicate = store.ingest(rep1, { responses: mkResponses(20, null) });
    expect(duplicate.inserted).toBe(false);

    const r2 = store.ingest(rep2, { responses: mkResponses(30, 40), sourcePath: "reports/rep-2.json" });
    expect(r2.inserted).toBe(true);

    const caseTrend = store.queryCaseTrend("case_a", { last: 10 });
    expect(caseTrend.length).toBeGreaterThanOrEqual(2);
    expect(caseTrend[0]?.case_status).toBe("executed");

    const runTrend = store.queryRunTrend({ last: 10, agentId: "agent-x", model: "phi3.5" });
    expect(runTrend.length).toBeGreaterThanOrEqual(2);
    expect(runTrend[0]?.kpi_pre_action_entropy_removed).toBe(0.6);
    expect(runTrend[0]?.kpi_recon_minutes_saved_per_block).toBe(72);
    expect(runTrend[0]?.cases_requiring_approval).toBe(1);
    expect(runTrend[0]?.sec_high_total).toBe(1);
    expect(runTrend.at(-1)?.report_id).toBe("rep-2");

    const flaky = store.queryFlakiestCases({ last: 10, limit: 5 });
    expect(flaky.some((f) => f.case_id === "case_a")).toBe(true);

    const tokenTrend = store.queryTokenTrend({ last: 10 });
    expect(tokenTrend.rows.length).toBeGreaterThanOrEqual(2);
    expect(tokenTrend.coverage.totalRows).toBeGreaterThan(0);
    expect(tokenTrend.coverage.nonNullRows).toBeGreaterThan(0);

    const stats = store.stats(dbPath);
    expect(stats.dbPath).toBe(dbPath);
    expect(stats.totalRuns).toBeGreaterThanOrEqual(2);
    expect(stats.totalCaseResults).toBeGreaterThanOrEqual(4);
    expect(stats.schemaVersion).toBe(2);
    expect(typeof stats.tokenCoverage.coveragePercent).toBe("number");
  });

  it("enforces auto-ingest prerequisites", async () => {
    root = await mkdtemp(path.join(tmpdir(), "trend-store-auto-"));
    const dbPath = path.join(root, "trend.sqlite");
    store = TrendStore.open({ dbPath });

    const bad: CompareReport = {
      report_id: "bad",
      meta: { toolkit_version: "1", spec_version: "x", generated_at: 1, run_id: "r" },
      summary: { baseline_pass: 0, new_pass: 0, regressions: 0, improvements: 0 },
      items: [],
    };

    expect(() => store!.ingest(bad)).toThrow("Auto-ingest");
  });
});
