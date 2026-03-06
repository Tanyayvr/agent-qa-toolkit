import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildCompareReportDocument,
  buildQualityEntries,
  maybeAttachLargePayloadWarnings,
} from "./evaluatorSummary";

describe("evaluatorSummary", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-evaluator-summary-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("collects quality entries for artifact hrefs", () => {
    const entries = buildQualityEntries({
      projectRoot: root,
      baselineDirAbs: path.join(root, "runs", "baseline"),
      newDirAbs: path.join(root, "runs", "new"),
      casesPathAbs: path.join(root, "cases", "cases.json"),
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
            baseline_case_response_href: "assets/raw/case_responses/c1/baseline.json",
            new_case_response_href: "assets/raw/case_responses/c1/new.json",
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
          risk_level: "low",
          risk_tags: [],
          gate_recommendation: "none",
        },
      ],
    });

    expect(entries.some((x) => x.field === "baseline_dir")).toBe(true);
    expect(entries.some((x) => x.field === "items[].artifacts.replay_diff_href")).toBe(true);
    expect(entries.some((x) => x.field === "items[].artifacts.baseline_case_response_href")).toBe(true);
  });

  it("adds large payload warnings when case payload exceeds threshold", async () => {
    const baselineDir = path.join(root, "runs", "baseline");
    const newDir = path.join(root, "runs", "new");
    await mkdir(baselineDir, { recursive: true });
    await mkdir(newDir, { recursive: true });
    await writeFile(path.join(baselineDir, "c1.json"), JSON.stringify({ data: "x".repeat(100) }), "utf-8");
    await writeFile(path.join(newDir, "c1.json"), JSON.stringify({ data: "ok" }), "utf-8");

    const qualityFlags: { large_payloads?: string[]; large_payloads_count?: number } = {};
    await maybeAttachLargePayloadWarnings({
      cases: [{ id: "c1" }],
      baselineDirAbs: baselineDir,
      newDirAbs: newDir,
      warnBodyBytes: 10,
      qualityFlags,
    });

    expect(qualityFlags.large_payloads_count).toBe(2);
    expect(qualityFlags.large_payloads?.some((x) => x.includes("baseline/c1.json"))).toBe(true);
    expect(qualityFlags.large_payloads?.some((x) => x.includes("new/c1.json"))).toBe(true);
  });

  it("builds compare report document with optional compliance mapping", () => {
    const report = buildCompareReportDocument({
      reportId: "r1",
      toolkitVersion: "0.1.0",
      generatedAt: 1,
      environment: { agent_id: "a1" },
      projectRoot: root,
      baselineDirAbs: path.join(root, "runs", "baseline"),
      newDirAbs: path.join(root, "runs", "new"),
      casesPathAbs: path.join(root, "cases.json"),
      baselinePass: 1,
      newPass: 1,
      regressions: 0,
      improvements: 0,
      breakdown: {},
      transferClass: "internal_only",
      redactionStatus: "none",
      totalCases: 1,
      casesWithSignalsNew: 0,
      casesWithSignalsBaseline: 0,
      signalCountsNew: { low: 0, medium: 0, high: 0, critical: 0 },
      signalCountsBaseline: { low: 0, medium: 0, high: 0, critical: 0 },
      topSignalKindsNew: [],
      topSignalKindsBaseline: [],
      riskSummary: { low: 1, medium: 0, high: 0 },
      casesRequiringApproval: 0,
      casesBlockRecommended: 0,
      dataCoverage: {
        total_cases: 1,
        items_emitted: 1,
        missing_baseline_artifacts: 0,
        missing_new_artifacts: 0,
        broken_baseline_artifacts: 0,
        broken_new_artifacts: 0,
      },
      executionQuality: {
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
        admissibility_kpi: {
          risk_mass_before: 1,
          risk_mass_after: 0,
          pre_action_entropy_removed: 1,
          blocked_cases: 0,
          reconstruction_minutes_saved_total: 0,
          reconstruction_minutes_saved_per_block: 0,
          model: {
            risk_weight_by_level: { low: 1, medium: 3, high: 6 },
            residual_factor_by_gate: { none: 1, require_approval: 0.4, block: 0 },
            minutes_per_removed_risk_unit: 30,
          },
        },
      },
      traceAnchorCoverage: {
        cases_with_anchor_baseline: 0,
        cases_with_anchor_new: 0,
      },
      summaryBySuite: {},
      qualityFlags: {
        self_contained: true,
        portable_paths: true,
        missing_assets_count: 0,
        path_violations_count: 0,
        large_payloads_count: 0,
        missing_assets: [],
        path_violations: [],
        large_payloads: [],
      },
      complianceMapping: [{ framework: "ISO", clause: "A.1" }],
      items: [],
    });

    expect(report.report_id).toBe("r1");
    expect(report.compliance_mapping?.[0]?.framework).toBe("ISO");
    expect(report.summary.execution_quality?.status).toBe("healthy");
  });
});
