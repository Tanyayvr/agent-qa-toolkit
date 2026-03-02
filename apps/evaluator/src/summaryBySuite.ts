import type { CompareReport, SecuritySignal, SignalSeverity } from "./htmlReport";
import { bumpCounts, severityCountsInit, topKinds } from "./core";

export type SuiteSummary = {
  baseline_pass: number;
  new_pass: number;
  regressions: number;
  improvements: number;
  root_cause_breakdown: Record<string, number>;
  security: {
    total_cases: number;
    cases_with_signals_new: number;
    cases_with_signals_baseline: number;
    signal_counts_new: Record<SignalSeverity, number>;
    signal_counts_baseline: Record<SignalSeverity, number>;
    top_signal_kinds_new: string[];
    top_signal_kinds_baseline: string[];
  };
  risk_summary: { low: number; medium: number; high: number };
  cases_requiring_approval: number;
  cases_block_recommended: number;
  data_coverage: {
    total_cases: number;
    items_emitted: number;
    missing_baseline_artifacts: number;
    missing_new_artifacts: number;
    broken_baseline_artifacts: number;
    broken_new_artifacts: number;
  };
};

function initSuiteSummary(): SuiteSummary {
  return {
    baseline_pass: 0,
    new_pass: 0,
    regressions: 0,
    improvements: 0,
    root_cause_breakdown: {},
    security: {
      total_cases: 0,
      cases_with_signals_new: 0,
      cases_with_signals_baseline: 0,
      signal_counts_new: severityCountsInit(),
      signal_counts_baseline: severityCountsInit(),
      top_signal_kinds_new: [],
      top_signal_kinds_baseline: [],
    },
    risk_summary: { low: 0, medium: 0, high: 0 },
    cases_requiring_approval: 0,
    cases_block_recommended: 0,
    data_coverage: {
      total_cases: 0,
      items_emitted: 0,
      missing_baseline_artifacts: 0,
      missing_new_artifacts: 0,
      broken_baseline_artifacts: 0,
      broken_new_artifacts: 0,
    },
  };
}

export function computeSummaryBySuite(items: CompareReport["items"]): Record<string, SuiteSummary> {
  const suites: Record<string, SuiteSummary & { _baselineSignals: SecuritySignal[]; _newSignals: SecuritySignal[] }> = {};

  for (const it of items) {
    const suite = it.suite ?? "default";
    if (!suites[suite]) {
      suites[suite] = { ...initSuiteSummary(), _baselineSignals: [], _newSignals: [] };
    }
    const s = suites[suite]!;
    s.security.total_cases += 1;
    s.data_coverage.total_cases += 1;
    s.data_coverage.items_emitted += 1;

    if (it.baseline_pass) s.baseline_pass += 1;
    if (it.new_pass) s.new_pass += 1;
    if (it.baseline_pass && !it.new_pass) s.regressions += 1;
    if (!it.baseline_pass && it.new_pass) s.improvements += 1;

    if (it.data_availability.baseline.status === "missing") s.data_coverage.missing_baseline_artifacts += 1;
    if (it.data_availability.baseline.status === "broken") s.data_coverage.broken_baseline_artifacts += 1;
    if (it.data_availability.new.status === "missing") s.data_coverage.missing_new_artifacts += 1;
    if (it.data_availability.new.status === "broken") s.data_coverage.broken_new_artifacts += 1;

    s.risk_summary[it.risk_level] += 1;
    if (it.gate_recommendation === "require_approval") s.cases_requiring_approval += 1;
    if (it.gate_recommendation === "block") s.cases_block_recommended += 1;

    if (!it.new_pass && it.new_root) {
      s.root_cause_breakdown[it.new_root] = (s.root_cause_breakdown[it.new_root] ?? 0) + 1;
    }

    const bSigs = it.security.baseline.signals;
    const nSigs = it.security.new.signals;
    if (bSigs.length) s.security.cases_with_signals_baseline += 1;
    if (nSigs.length) s.security.cases_with_signals_new += 1;
    for (const sig of bSigs) {
      bumpCounts(s.security.signal_counts_baseline, sig.severity);
      s._baselineSignals.push(sig);
    }
    for (const sig of nSigs) {
      bumpCounts(s.security.signal_counts_new, sig.severity);
      s._newSignals.push(sig);
    }
  }

  const out: Record<string, SuiteSummary> = {};
  for (const [suite, s] of Object.entries(suites)) {
    const { _baselineSignals, _newSignals, ...rest } = s;
    rest.security.top_signal_kinds_baseline = topKinds(_baselineSignals);
    rest.security.top_signal_kinds_new = topKinds(_newSignals);
    out[suite] = rest;
  }
  return out;
}
