import {
  TrendStore,
  resolveDbPath,
  type CaseTrendRow,
  type RunTrendRow,
} from "trending";
import type { CompareReport } from "./reportTypes";
import type { EuAiActBundleArtifacts } from "./euAiActGovernance";

export type MonitoringHistoryStatus =
  | "history_current"
  | "history_stale"
  | "no_matching_history"
  | "trend_unavailable";

export type EuAiActRunHistoryEntry = {
  report_id: string;
  generated_at: number;
  model?: string;
  executed_cases: number;
  pass_count: number;
  fail_count: number;
  skipped_count: number;
  pass_rate: number;
  regressions: number;
  improvements: number;
  cases_requiring_approval: number;
  cases_block_recommended: number;
  high_risk_cases: number;
  signal_totals: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
};

export type EuAiActMonitoredCaseTimelineEntry = {
  report_id: string;
  generated_at: number;
  new_pass: boolean | null;
  risk_level: string;
  gate_recommendation: string;
  sec_high: number;
  sec_critical: number;
};

export type EuAiActMonitoredCase = {
  case_id: string;
  title: string;
  suite?: string;
  flagged_because: string[];
  current_state: {
    new_pass: boolean;
    risk_level: CompareReport["items"][number]["risk_level"];
    gate_recommendation: CompareReport["items"][number]["gate_recommendation"];
    new_signal_count: number;
  };
  history_summary: {
    runs_observed: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    approval_runs: number;
    blocking_runs: number;
    high_risk_runs: number;
    high_or_critical_signal_runs: number;
  };
  timeline: EuAiActMonitoredCaseTimelineEntry[];
};

export type EuAiActPostMarketMonitoring = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActBundleArtifacts;
  summary: {
    monitoring_status: MonitoringHistoryStatus;
    trend_ingest_enabled: boolean;
    scope: "agent_model" | "unscoped";
    current_run_included_in_history: boolean;
    runs_in_window: number;
    prior_runs_in_window: number;
    monitored_case_count: number;
    drift_detected: boolean;
    drift_signals: string[];
  };
  monitoring_window: {
    last_runs: number;
    agent_id?: string;
    model?: string;
    earliest_generated_at?: number;
    latest_generated_at?: number;
  };
  current_run: EuAiActRunHistoryEntry;
  previous_run?: EuAiActRunHistoryEntry;
  change_over_time?: {
    pass_rate_delta_vs_previous_run: number;
    fail_count_delta_vs_previous_run: number;
    approval_cases_delta_vs_previous_run: number;
    blocking_cases_delta_vs_previous_run: number;
    high_signal_delta_vs_previous_run: number;
    critical_signal_delta_vs_previous_run: number;
  };
  run_history: EuAiActRunHistoryEntry[];
  monitored_cases: EuAiActMonitoredCase[];
  residual_gaps: string[];
  governance_review_attachment: {
    recommended_artifacts: string[];
    recurring_review_questions: string[];
  };
};

type MonitoringCollection = {
  historyStatus: MonitoringHistoryStatus;
  trendIngestEnabled: boolean;
  windowLastRuns: number;
  scopeAgentId?: string;
  scopeModel?: string;
  currentRunIncludedInHistory: boolean;
  runHistoryRows: RunTrendRow[];
  caseHistoryById: Record<string, CaseTrendRow[]>;
  notes: string[];
};

const DEFAULT_WINDOW_LAST_RUNS = 20;
const DEFAULT_CASE_TIMELINE_RUNS = 8;
const DEFAULT_MONITORED_CASE_LIMIT = 10;

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}

function boolFromTrend(value: number | null): boolean | null {
  if (value === null || value === undefined) return null;
  return value === 1;
}

function passRate(passCount: number, executedCases: number): number {
  if (executedCases <= 0) return 0;
  return roundMetric(passCount / executedCases);
}

function selectMonitoredItems(report: CompareReport): CompareReport["items"] {
  return report.items
    .filter((item) => {
      if (item.case_status !== "executed") return false;
      if (item.gate_recommendation !== "none") return true;
      if (item.risk_level === "high") return true;
      if (item.security.new.signals.length > 0) return true;
      if (item.baseline_pass && !item.new_pass) return true;
      return false;
    })
    .slice(0, DEFAULT_MONITORED_CASE_LIMIT);
}

function flaggedBecause(item: CompareReport["items"][number]): string[] {
  const reasons: string[] = [];
  if (item.gate_recommendation === "block") reasons.push("Current run recommends blocking release.");
  if (item.gate_recommendation === "require_approval") reasons.push("Current run requires human approval.");
  if (item.risk_level === "high") reasons.push("Current run risk level is high.");
  if (item.security.new.signals.length > 0) {
    reasons.push(`Current run emitted ${item.security.new.signals.length} security signal(s).`);
  }
  if (item.baseline_pass && !item.new_pass) reasons.push("Current run regressed from a passing baseline.");
  return reasons;
}

function runHistoryEntryFromRow(row: RunTrendRow): EuAiActRunHistoryEntry {
  return {
    report_id: row.report_id,
    generated_at: row.generated_at,
    ...(row.model ? { model: row.model } : {}),
    executed_cases: row.executed_cases,
    pass_count: row.pass_count,
    fail_count: row.fail_count,
    skipped_count: row.skipped_count,
    pass_rate: passRate(row.pass_count, row.executed_cases),
    regressions: row.regressions,
    improvements: row.improvements,
    cases_requiring_approval: row.cases_requiring_approval,
    cases_block_recommended: row.cases_block_recommended,
    high_risk_cases: row.high_risk_cases,
    signal_totals: {
      low: row.sec_low_total,
      medium: row.sec_medium_total,
      high: row.sec_high_total,
      critical: row.sec_critical_total,
    },
  };
}

function runHistoryEntryFromReport(report: CompareReport): EuAiActRunHistoryEntry {
  const executedCases = report.items.filter((item) => item.case_status === "executed").length;
  const highRiskCases = report.items.filter((item) => item.case_status === "executed" && item.risk_level === "high").length;
  return {
    report_id: report.report_id,
    generated_at: report.meta.generated_at,
    ...(report.environment?.model ? { model: report.environment.model } : {}),
    executed_cases: executedCases,
    pass_count: report.summary.new_pass,
    fail_count: Math.max(executedCases - report.summary.new_pass, 0),
    skipped_count: report.items.length - executedCases,
    pass_rate: passRate(report.summary.new_pass, executedCases),
    regressions: report.summary.regressions,
    improvements: report.summary.improvements,
    cases_requiring_approval: report.summary.cases_requiring_approval,
    cases_block_recommended: report.summary.cases_block_recommended,
    high_risk_cases: highRiskCases,
    signal_totals: {
      low: report.summary.security.signal_counts_new.low,
      medium: report.summary.security.signal_counts_new.medium,
      high: report.summary.security.signal_counts_new.high,
      critical: report.summary.security.signal_counts_new.critical,
    },
  };
}

function driftSignals(currentRun: EuAiActRunHistoryEntry, previousRun?: EuAiActRunHistoryEntry): string[] {
  if (!previousRun) return [];

  const signals: string[] = [];
  const passRateDelta = roundMetric(currentRun.pass_rate - previousRun.pass_rate);
  const highSignalDelta =
    currentRun.signal_totals.high +
    currentRun.signal_totals.critical -
    (previousRun.signal_totals.high + previousRun.signal_totals.critical);
  const criticalDelta = currentRun.signal_totals.critical - previousRun.signal_totals.critical;

  if (passRateDelta <= -0.1) {
    signals.push(`Pass rate dropped by ${Math.abs(passRateDelta).toFixed(3)} versus the previous run.`);
  }
  if (currentRun.fail_count > previousRun.fail_count) {
    signals.push(`Fail count increased from ${previousRun.fail_count} to ${currentRun.fail_count}.`);
  }
  if (currentRun.cases_requiring_approval > previousRun.cases_requiring_approval) {
    signals.push(
      `Approval-required cases increased from ${previousRun.cases_requiring_approval} to ${currentRun.cases_requiring_approval}.`
    );
  }
  if (currentRun.cases_block_recommended > previousRun.cases_block_recommended) {
    signals.push(
      `Blocking cases increased from ${previousRun.cases_block_recommended} to ${currentRun.cases_block_recommended}.`
    );
  }
  if (highSignalDelta > 0) {
    signals.push(`High/critical signal volume increased by ${highSignalDelta}.`);
  }
  if (criticalDelta > 0) {
    signals.push(`Critical signal count increased by ${criticalDelta}.`);
  }
  return signals;
}

function monitoredCaseFromRows(
  item: CompareReport["items"][number],
  rows: CaseTrendRow[]
): EuAiActMonitoredCase {
  const passCount = rows.reduce((acc, row) => acc + (row.new_pass === 1 ? 1 : 0), 0);
  const failCount = rows.reduce((acc, row) => acc + (row.new_pass === 0 ? 1 : 0), 0);
  const approvalRuns = rows.reduce((acc, row) => acc + (row.gate_recommendation === "require_approval" ? 1 : 0), 0);
  const blockingRuns = rows.reduce((acc, row) => acc + (row.gate_recommendation === "block" ? 1 : 0), 0);
  const highRiskRuns = rows.reduce((acc, row) => acc + (row.risk_level === "high" ? 1 : 0), 0);
  const highOrCriticalRuns = rows.reduce(
    (acc, row) => acc + (row.sec_high > 0 || row.sec_critical > 0 ? 1 : 0),
    0
  );

  return {
    case_id: item.case_id,
    title: item.title,
    ...(item.suite ? { suite: item.suite } : {}),
    flagged_because: flaggedBecause(item),
    current_state: {
      new_pass: item.new_pass,
      risk_level: item.risk_level,
      gate_recommendation: item.gate_recommendation,
      new_signal_count: item.security.new.signals.length,
    },
    history_summary: {
      runs_observed: rows.length,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate(passCount, rows.length),
      approval_runs: approvalRuns,
      blocking_runs: blockingRuns,
      high_risk_runs: highRiskRuns,
      high_or_critical_signal_runs: highOrCriticalRuns,
    },
    timeline: rows.map((row) => ({
      report_id: row.report_id,
      generated_at: row.generated_at,
      new_pass: boolFromTrend(row.new_pass),
      risk_level: row.risk_level,
      gate_recommendation: row.gate_recommendation,
      sec_high: row.sec_high,
      sec_critical: row.sec_critical,
    })),
  };
}

function residualGaps(params: {
  report: CompareReport;
  collection: MonitoringCollection;
  previousRun?: EuAiActRunHistoryEntry;
}): string[] {
  const gaps: string[] = [...params.collection.notes];
  if (!params.collection.trendIngestEnabled) {
    gaps.push("Trend ingest was disabled for this run, so the monitoring window is not refreshed with the current release.");
  }
  if (params.collection.historyStatus === "trend_unavailable") {
    gaps.push("Trend history could not be read from the configured SQLite store.");
  }
  if (params.collection.historyStatus === "no_matching_history") {
    gaps.push("No matching historical runs are available for this monitoring scope.");
  }
  if (params.collection.historyStatus === "history_stale") {
    gaps.push("Historical trend data exists, but the current run is not present in the selected monitoring window.");
  }
  if (!params.report.environment?.agent_id && !params.report.environment?.model) {
    gaps.push("Monitoring scope is unscoped because environment.agent_id/model is missing from the report.");
  }
  if (!params.previousRun) {
    gaps.push("No prior run is available to compute change-over-time deltas.");
  }
  return gaps;
}

function governanceReviewAttachment(bundleArtifacts: EuAiActBundleArtifacts): EuAiActPostMarketMonitoring["governance_review_attachment"] {
  return {
    recommended_artifacts: [
      bundleArtifacts.post_market_monitoring_href,
      bundleArtifacts.release_review_href,
      bundleArtifacts.human_oversight_summary_href,
      bundleArtifacts.article_13_instructions_href,
      bundleArtifacts.article_9_risk_register_href,
      bundleArtifacts.article_72_monitoring_plan_href,
      bundleArtifacts.article_17_qms_lite_href,
      bundleArtifacts.annex_iv_href,
      bundleArtifacts.compare_report_href,
    ],
    recurring_review_questions: [
      "Did approval-required or blocking cases increase compared with the previous monitored run?",
      "Is pass rate declining or are high/critical security findings accumulating over time?",
      "Do monitored cases show repeat gating patterns that require operator remediation or workflow changes?",
    ],
  };
}

export function buildEuAiActPostMarketMonitoring(params: {
  report: CompareReport;
  bundleArtifacts: EuAiActBundleArtifacts;
  generatedAt: number;
  collection: MonitoringCollection;
}): EuAiActPostMarketMonitoring {
  const currentRun = runHistoryEntryFromReport(params.report);
  const runHistory = params.collection.runHistoryRows.map(runHistoryEntryFromRow);
  const currentHistoryIndex = runHistory.findIndex((entry) => entry.report_id === params.report.report_id);
  const previousRun =
    currentHistoryIndex > 0
      ? runHistory[currentHistoryIndex - 1]
      : currentHistoryIndex === -1
        ? runHistory.at(-1)
        : undefined;
  const changeOverTime = previousRun
    ? {
        pass_rate_delta_vs_previous_run: roundMetric(currentRun.pass_rate - previousRun.pass_rate),
        fail_count_delta_vs_previous_run: currentRun.fail_count - previousRun.fail_count,
        approval_cases_delta_vs_previous_run:
          currentRun.cases_requiring_approval - previousRun.cases_requiring_approval,
        blocking_cases_delta_vs_previous_run:
          currentRun.cases_block_recommended - previousRun.cases_block_recommended,
        high_signal_delta_vs_previous_run:
          currentRun.signal_totals.high + currentRun.signal_totals.critical -
          (previousRun.signal_totals.high + previousRun.signal_totals.critical),
        critical_signal_delta_vs_previous_run: currentRun.signal_totals.critical - previousRun.signal_totals.critical,
      }
    : undefined;
  const drift = driftSignals(currentRun, previousRun);
  const monitoredCases = selectMonitoredItems(params.report).map((item) =>
    monitoredCaseFromRows(item, params.collection.caseHistoryById[item.case_id] ?? [])
  );
  const earliestGeneratedAt = runHistory[0]?.generated_at;
  const latestGeneratedAt = runHistory.at(-1)?.generated_at;

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    summary: {
      monitoring_status: params.collection.historyStatus,
      trend_ingest_enabled: params.collection.trendIngestEnabled,
      scope: params.collection.scopeAgentId || params.collection.scopeModel ? "agent_model" : "unscoped",
      current_run_included_in_history: params.collection.currentRunIncludedInHistory,
      runs_in_window: runHistory.length,
      prior_runs_in_window: runHistory.length - (params.collection.currentRunIncludedInHistory ? 1 : 0),
      monitored_case_count: monitoredCases.length,
      drift_detected: drift.length > 0,
      drift_signals: drift,
    },
    monitoring_window: {
      last_runs: params.collection.windowLastRuns,
      ...(params.collection.scopeAgentId ? { agent_id: params.collection.scopeAgentId } : {}),
      ...(params.collection.scopeModel ? { model: params.collection.scopeModel } : {}),
      ...(earliestGeneratedAt !== undefined ? { earliest_generated_at: earliestGeneratedAt } : {}),
      ...(latestGeneratedAt !== undefined ? { latest_generated_at: latestGeneratedAt } : {}),
    },
    current_run: currentRun,
    ...(previousRun ? { previous_run: previousRun } : {}),
    ...(changeOverTime ? { change_over_time: changeOverTime } : {}),
    run_history: runHistory,
    monitored_cases: monitoredCases,
    residual_gaps: residualGaps({
      report: params.report,
      collection: params.collection,
      ...(previousRun ? { previousRun } : {}),
    }),
    governance_review_attachment: governanceReviewAttachment(params.bundleArtifacts),
  };
}

export function collectEuAiActMonitoring(params: {
  report: CompareReport;
  trendIngestEnabled: boolean;
  trendDbArg?: string;
  windowLastRuns?: number;
}): MonitoringCollection {
  const windowLastRuns = params.windowLastRuns ?? DEFAULT_WINDOW_LAST_RUNS;
  const scopeAgentId = params.report.environment?.agent_id;
  const scopeModel = params.report.environment?.model;
  const monitoredItems = selectMonitoredItems(params.report);

  if (!params.trendIngestEnabled) {
    return {
      historyStatus: "no_matching_history",
      trendIngestEnabled: false,
      windowLastRuns,
      ...(scopeAgentId ? { scopeAgentId } : {}),
      ...(scopeModel ? { scopeModel } : {}),
      currentRunIncludedInHistory: false,
      runHistoryRows: [],
      caseHistoryById: {},
      notes: ["Trend ingest disabled for this run."],
    };
  }

  try {
    const dbPath = resolveDbPath(params.trendDbArg ?? undefined);
    const store = TrendStore.open({ dbPath, readOnly: true });
    try {
      const queryOpts = {
        last: windowLastRuns,
        ...(scopeAgentId ? { agentId: scopeAgentId } : {}),
        ...(scopeModel ? { model: scopeModel } : {}),
      };
      const runHistoryRows = store.queryRunTrend(queryOpts);
      const caseHistoryById: Record<string, CaseTrendRow[]> = {};
      for (const item of monitoredItems) {
        caseHistoryById[item.case_id] = store.queryCaseTrend(item.case_id, {
          ...queryOpts,
          last: DEFAULT_CASE_TIMELINE_RUNS,
        });
      }
      const currentRunIncludedInHistory = runHistoryRows.some((row) => row.report_id === params.report.report_id);
      const historyStatus =
        runHistoryRows.length === 0
          ? "no_matching_history"
          : currentRunIncludedInHistory
            ? "history_current"
            : "history_stale";

      return {
        historyStatus,
        trendIngestEnabled: true,
        windowLastRuns,
        ...(scopeAgentId ? { scopeAgentId } : {}),
        ...(scopeModel ? { scopeModel } : {}),
        currentRunIncludedInHistory,
        runHistoryRows,
        caseHistoryById,
        notes: [],
      };
    } finally {
      store.close();
    }
  } catch (error) {
    return {
      historyStatus: "trend_unavailable",
      trendIngestEnabled: true,
      windowLastRuns,
      ...(scopeAgentId ? { scopeAgentId } : {}),
      ...(scopeModel ? { scopeModel } : {}),
      currentRunIncludedInHistory: false,
      runHistoryRows: [],
      caseHistoryById: {},
      notes: [error instanceof Error ? error.message : String(error)],
    };
  }
}
