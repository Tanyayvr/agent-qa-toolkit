import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Ajv from "ajv";
import { afterEach, describe, expect, it } from "vitest";
import { TrendStore } from "trending";
import { buildEuAiActBundleArtifacts } from "./dossier";
import { buildEuAiActPostMarketMonitoring, collectEuAiActMonitoring } from "./monitoring";
import type { CompareReport } from "../reportTypes";

function mkReport(params: {
  reportId: string;
  generatedAt: number;
  newPass: boolean;
  gate: "none" | "require_approval" | "block";
  riskLevel: "low" | "medium" | "high";
  signalSeverity?: "low" | "medium" | "high" | "critical";
}): CompareReport {
  const signalSeverity = params.signalSeverity;
  const newSignals = signalSeverity
    ? [
        {
          kind: "runner_failure_detected" as const,
          severity: signalSeverity,
          confidence: "high" as const,
          title: "Runner failure captured",
          evidence_refs: [],
        },
      ]
    : [];
  return {
    contract_version: 5,
    report_id: params.reportId,
    meta: {
      toolkit_version: "0.1.0",
      spec_version: "aepf-v1",
      generated_at: params.generatedAt,
      run_id: params.reportId,
    },
    environment: {
      agent_id: "agent-monitor",
      model: "model-monitor",
      prompt_version: "p1",
      tools_version: "t1",
    },
    baseline_dir: "baseline",
    new_dir: "new",
    cases_path: "cases.json",
    summary: {
      baseline_pass: 1,
      new_pass: params.newPass ? 1 : 0,
      regressions: params.newPass ? 0 : 1,
      improvements: 0,
      root_cause_breakdown: params.newPass ? {} : { timeout: 1 },
      quality: { transfer_class: "internal_only", redaction_status: "none" },
      security: {
        total_cases: 1,
        cases_with_signals_new: newSignals.length ? 1 : 0,
        cases_with_signals_baseline: 0,
        signal_counts_new: {
          low: signalSeverity === "low" ? 1 : 0,
          medium: signalSeverity === "medium" ? 1 : 0,
          high: signalSeverity === "high" ? 1 : 0,
          critical: signalSeverity === "critical" ? 1 : 0,
        },
        signal_counts_baseline: { low: 0, medium: 0, high: 0, critical: 0 },
        top_signal_kinds_new: newSignals.length ? ["runner_failure_detected"] : [],
        top_signal_kinds_baseline: [],
      },
      risk_summary: {
        low: params.riskLevel === "low" ? 1 : 0,
        medium: params.riskLevel === "medium" ? 1 : 0,
        high: params.riskLevel === "high" ? 1 : 0,
      },
      cases_requiring_approval: params.gate === "require_approval" ? 1 : 0,
      cases_block_recommended: params.gate === "block" ? 1 : 0,
      data_coverage: {
        total_cases: 1,
        items_emitted: 1,
        missing_baseline_artifacts: 0,
        missing_new_artifacts: 0,
        broken_baseline_artifacts: 0,
        broken_new_artifacts: 0,
      },
      execution_quality: {
        status: params.newPass ? "healthy" : "degraded",
        reasons: params.newPass ? [] : ["transport degraded"],
        thresholds: {
          min_transport_success_rate: 0.95,
          max_weak_expected_rate: 0.2,
          min_pre_action_entropy_removed: 0,
          min_reconstruction_minutes_saved_per_block: 0,
        },
        total_executed_cases: 1,
        baseline_runner_failures: 0,
        new_runner_failures: params.newPass ? 0 : 1,
        baseline_runner_failure_rate: 0,
        new_runner_failure_rate: params.newPass ? 0 : 1,
        baseline_transport_success_rate: 1,
        new_transport_success_rate: params.newPass ? 1 : 0,
        baseline_runner_failure_kinds: {},
        new_runner_failure_kinds: params.newPass ? {} : { timeout: 1 },
        weak_expected_cases: 0,
        weak_expected_rate: 0,
        model_quality_inconclusive: false,
      },
      trace_anchor_coverage: {
        cases_with_anchor_baseline: 1,
        cases_with_anchor_new: 1,
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
        case_id: "case-monitor",
        title: "monitor case",
        suite: "core",
        data_availability: {
          baseline: { status: "present" },
          new: { status: "present" },
        },
        case_status: "executed",
        baseline_pass: true,
        new_pass: params.newPass,
        ...(params.newPass ? {} : { new_root: "timeout" }),
        preventable_by_policy: false,
        recommended_policy_rules: [],
        trace_integrity: {
          baseline: { status: "ok", issues: [] },
          new: { status: "ok", issues: [] },
        },
        security: {
          baseline: { signals: [], requires_gate_recommendation: params.gate !== "none" },
          new: { signals: newSignals, requires_gate_recommendation: params.gate !== "none" },
        },
        policy_evaluation: {
          baseline: { planning_gate_pass: true, repl_policy_pass: true },
          new: { planning_gate_pass: true, repl_policy_pass: true },
        },
        assumption_state: {
          baseline: { status: "not_required", selected_count: 0, rejected_count: 0 },
          new: { status: "not_required", selected_count: 0, rejected_count: 0 },
        },
        risk_level: params.riskLevel,
        risk_tags: [],
        gate_recommendation: params.gate,
        artifacts: {
          replay_diff_href: "case-case-monitor.html",
          new_case_response_href: "assets/raw/case_responses/case-monitor/new.json",
        },
      },
    ],
  };
}

describe("euAiActMonitoring", () => {
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

  it("builds post-market monitoring export from scoped trend history", async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-eu-monitoring-"));
    const dbPath = path.join(root, "trend.sqlite");
    store = TrendStore.open({ dbPath });

    const previousReport = mkReport({
      reportId: "rep-1",
      generatedAt: 1_000,
      newPass: true,
      gate: "none",
      riskLevel: "low",
    });
    const currentReport = mkReport({
      reportId: "rep-2",
      generatedAt: 2_000,
      newPass: false,
      gate: "require_approval",
      riskLevel: "medium",
      signalSeverity: "high",
    });

    store.ingest(previousReport, { ingestMode: "manual" });
    store.ingest(currentReport, { ingestMode: "manual" });

    const bundleArtifacts = buildEuAiActBundleArtifacts();
    const monitoring = buildEuAiActPostMarketMonitoring({
      report: currentReport,
      bundleArtifacts,
      generatedAt: 2_000,
      collection: collectEuAiActMonitoring({
        report: currentReport,
        trendIngestEnabled: true,
        trendDbArg: dbPath,
        windowLastRuns: 5,
      }),
    });

    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    const schema = JSON.parse(
      readFileSync(path.join(process.cwd(), "schemas", "eu-ai-act-post-market-monitoring-v1.schema.json"), "utf-8")
    );

    expect(monitoring.summary.monitoring_status).toBe("history_current");
    expect(monitoring.summary.current_run_included_in_history).toBe(true);
    expect(monitoring.summary.drift_detected).toBe(true);
    expect(monitoring.previous_run?.report_id).toBe("rep-1");
    expect(monitoring.run_history).toHaveLength(2);
    expect(monitoring.run_history.at(-1)?.report_id).toBe("rep-2");
    expect(monitoring.monitored_cases[0]?.case_id).toBe("case-monitor");
    expect(monitoring.monitored_cases[0]?.history_summary.approval_runs).toBe(1);
    expect(monitoring.change_over_time?.approval_cases_delta_vs_previous_run).toBe(1);
    expect(ajv.validate(schema, monitoring)).toBe(true);
  });
});
