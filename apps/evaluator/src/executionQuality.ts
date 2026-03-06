import type { CompareReport } from "./htmlReport";
import type { Expected } from "./core";

export type ExecutionQualitySummary = {
  status: "healthy" | "degraded";
  reasons: string[];
  thresholds: {
    min_transport_success_rate: number;
    max_weak_expected_rate: number;
    min_pre_action_entropy_removed: number;
    min_reconstruction_minutes_saved_per_block: number;
  };
  total_executed_cases: number;
  baseline_runner_failures: number;
  new_runner_failures: number;
  baseline_runner_failure_rate: number;
  new_runner_failure_rate: number;
  baseline_transport_success_rate: number;
  new_transport_success_rate: number;
  baseline_runner_failure_kinds: Record<string, number>;
  new_runner_failure_kinds: Record<string, number>;
  weak_expected_cases: number;
  weak_expected_rate: number;
  model_quality_inconclusive: boolean;
  model_quality_inconclusive_reason?: string;
  admissibility_kpi: {
    risk_mass_before: number;
    risk_mass_after: number;
    pre_action_entropy_removed: number;
    blocked_cases: number;
    reconstruction_minutes_saved_total: number;
    reconstruction_minutes_saved_per_block: number;
    model: {
      risk_weight_by_level: {
        low: number;
        medium: number;
        high: number;
      };
      residual_factor_by_gate: {
        none: number;
        require_approval: number;
        block: number;
      };
      minutes_per_removed_risk_unit: number;
    };
  };
};

const RISK_WEIGHT_BY_LEVEL = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

const RESIDUAL_FACTOR_BY_GATE = {
  none: 1,
  require_approval: 0.4,
  block: 0,
} as const;

function round3(n: number): number {
  return Number(n.toFixed(3));
}

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function parseRateThreshold(raw: string | undefined, fallback: number): number {
  const n = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function parseNonNegativeThreshold(raw: string | undefined, fallback: number): number {
  const n = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

export function isWeakExpected(exp: Expected): boolean {
  const hasList = (v: unknown) => Array.isArray(v) && v.length > 0;
  const hasRetrievalDocs = Array.isArray(exp.retrieval_required?.doc_ids) && exp.retrieval_required.doc_ids.length > 0;
  if (hasList(exp.action_required)) return false;
  if (exp.evidence_required_for_actions === true) return false;
  if (hasList(exp.tool_required)) return false;
  if (hasList(exp.tool_sequence)) return false;
  if (exp.json_schema !== undefined && exp.json_schema !== null) return false;
  if (hasRetrievalDocs) return false;
  if (hasList(exp.must_include)) return false;
  if (hasList(exp.must_not_include)) return false;
  return true;
}

export function computeExecutionQuality(params: {
  items: CompareReport["items"];
  expectedById: Map<string, Expected>;
  minTransportSuccessRate: number;
  maxWeakExpectedRate: number;
  minPreActionEntropyRemoved: number;
  minReconstructionMinutesSavedPerBlock: number;
  interruptedBySignal?: "SIGINT" | "SIGTERM";
}): ExecutionQualitySummary {
  const {
    items,
    expectedById,
    minTransportSuccessRate,
    maxWeakExpectedRate,
    minPreActionEntropyRemoved,
    minReconstructionMinutesSavedPerBlock,
    interruptedBySignal,
  } = params;
  const executedItems = items.filter((it) => it.case_status === "executed");
  const executedTotal = executedItems.length;
  const baselineRunnerFailures = executedItems.reduce((n, it) => n + (it.failure_summary?.baseline ? 1 : 0), 0);
  const newRunnerFailures = executedItems.reduce((n, it) => n + (it.failure_summary?.new ? 1 : 0), 0);
  const baselineRunnerFailureKinds = executedItems.reduce((acc, it) => {
    const kind = it.failure_summary?.baseline?.net_error_kind;
    if (typeof kind === "string" && kind.length > 0) {
      acc[kind] = (acc[kind] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const newRunnerFailureKinds = executedItems.reduce((acc, it) => {
    const kind = it.failure_summary?.new?.net_error_kind;
    if (typeof kind === "string" && kind.length > 0) {
      acc[kind] = (acc[kind] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const weakExpectedCaseIds = executedItems
    .filter((it) => isWeakExpected(expectedById.get(it.case_id) ?? {}))
    .map((it) => it.case_id);

  const baselineRunnerFailureRate = executedTotal > 0 ? baselineRunnerFailures / executedTotal : 0;
  const newRunnerFailureRate = executedTotal > 0 ? newRunnerFailures / executedTotal : 0;
  const baselineTransportSuccessRate = 1 - baselineRunnerFailureRate;
  const newTransportSuccessRate = 1 - newRunnerFailureRate;
  const weakExpectedRate = executedTotal > 0 ? weakExpectedCaseIds.length / executedTotal : 0;
  const minutesPerRemovedRiskUnit = parsePositiveNumber(
    process.env.AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT,
    30
  );

  let riskMassBefore = 0;
  let riskMassAfter = 0;
  let blockedCases = 0;
  for (const it of executedItems) {
    const weight = RISK_WEIGHT_BY_LEVEL[it.risk_level] ?? RISK_WEIGHT_BY_LEVEL.low;
    const residualFactor = RESIDUAL_FACTOR_BY_GATE[it.gate_recommendation] ?? RESIDUAL_FACTOR_BY_GATE.none;
    riskMassBefore += weight;
    riskMassAfter += weight * residualFactor;
    if (it.gate_recommendation === "block") blockedCases += 1;
  }
  const removedRiskMass = Math.max(0, riskMassBefore - riskMassAfter);
  const preActionEntropyRemoved = riskMassBefore > 0 ? removedRiskMass / riskMassBefore : 0;
  const reconstructionMinutesSavedTotal = removedRiskMass * minutesPerRemovedRiskUnit;
  const reconstructionMinutesSavedPerBlock =
    blockedCases > 0 ? reconstructionMinutesSavedTotal / blockedCases : 0;

  const modelQualityInconclusive =
    executedTotal === 0 ||
    baselineTransportSuccessRate < minTransportSuccessRate ||
    newTransportSuccessRate < minTransportSuccessRate;
  let modelQualityInconclusiveReason: string | undefined;
  if (executedTotal === 0) {
    modelQualityInconclusiveReason = "no_executed_cases";
  } else if (baselineTransportSuccessRate < minTransportSuccessRate || newTransportSuccessRate < minTransportSuccessRate) {
    modelQualityInconclusiveReason = "transport_success_below_threshold";
  }
  const executionReasons: string[] = [];
  if (baselineTransportSuccessRate < minTransportSuccessRate) {
    executionReasons.push(
      `baseline transport success ${baselineTransportSuccessRate.toFixed(3)} is below threshold ${minTransportSuccessRate.toFixed(3)}`
    );
  }
  if (newTransportSuccessRate < minTransportSuccessRate) {
    executionReasons.push(
      `new transport success ${newTransportSuccessRate.toFixed(3)} is below threshold ${minTransportSuccessRate.toFixed(3)}`
    );
  }
  if (weakExpectedRate > maxWeakExpectedRate) {
    executionReasons.push(
      `weak expected rate ${weakExpectedRate.toFixed(3)} is above threshold ${maxWeakExpectedRate.toFixed(3)}`
    );
  }
  if (preActionEntropyRemoved < minPreActionEntropyRemoved) {
    executionReasons.push(
      `pre-action entropy removed ${preActionEntropyRemoved.toFixed(3)} is below threshold ${minPreActionEntropyRemoved.toFixed(3)}`
    );
  }
  if (blockedCases > 0 && reconstructionMinutesSavedPerBlock < minReconstructionMinutesSavedPerBlock) {
    executionReasons.push(
      `reconstruction minutes saved per block ${reconstructionMinutesSavedPerBlock.toFixed(3)} is below threshold ${minReconstructionMinutesSavedPerBlock.toFixed(3)}`
    );
  }
  if (interruptedBySignal) {
    executionReasons.push(`interrupted by ${interruptedBySignal}`);
  }

  return {
    status: executionReasons.length > 0 ? "degraded" : "healthy",
    reasons: executionReasons,
    thresholds: {
      min_transport_success_rate: minTransportSuccessRate,
      max_weak_expected_rate: maxWeakExpectedRate,
      min_pre_action_entropy_removed: minPreActionEntropyRemoved,
      min_reconstruction_minutes_saved_per_block: minReconstructionMinutesSavedPerBlock,
    },
    total_executed_cases: executedTotal,
    baseline_runner_failures: baselineRunnerFailures,
    new_runner_failures: newRunnerFailures,
    baseline_runner_failure_rate: Number(baselineRunnerFailureRate.toFixed(3)),
    new_runner_failure_rate: Number(newRunnerFailureRate.toFixed(3)),
    baseline_transport_success_rate: Number(baselineTransportSuccessRate.toFixed(3)),
    new_transport_success_rate: Number(newTransportSuccessRate.toFixed(3)),
    baseline_runner_failure_kinds: baselineRunnerFailureKinds,
    new_runner_failure_kinds: newRunnerFailureKinds,
    weak_expected_cases: weakExpectedCaseIds.length,
    weak_expected_rate: Number(weakExpectedRate.toFixed(3)),
    model_quality_inconclusive: modelQualityInconclusive,
    ...(modelQualityInconclusiveReason ? { model_quality_inconclusive_reason: modelQualityInconclusiveReason } : {}),
    admissibility_kpi: {
      risk_mass_before: round3(riskMassBefore),
      risk_mass_after: round3(riskMassAfter),
      pre_action_entropy_removed: round3(preActionEntropyRemoved),
      blocked_cases: blockedCases,
      reconstruction_minutes_saved_total: round3(reconstructionMinutesSavedTotal),
      reconstruction_minutes_saved_per_block: round3(reconstructionMinutesSavedPerBlock),
      model: {
        risk_weight_by_level: {
          low: RISK_WEIGHT_BY_LEVEL.low,
          medium: RISK_WEIGHT_BY_LEVEL.medium,
          high: RISK_WEIGHT_BY_LEVEL.high,
        },
        residual_factor_by_gate: {
          none: RESIDUAL_FACTOR_BY_GATE.none,
          require_approval: RESIDUAL_FACTOR_BY_GATE.require_approval,
          block: RESIDUAL_FACTOR_BY_GATE.block,
        },
        minutes_per_removed_risk_unit: minutesPerRemovedRiskUnit,
      },
    },
  };
}
