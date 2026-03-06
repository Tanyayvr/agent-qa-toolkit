import type { TraceAnchor } from "shared-types";

export type SignalSeverity = "low" | "medium" | "high" | "critical";
export type SignalConfidence = "low" | "medium" | "high";

export type EvidenceRef = {
  kind: "tool_result" | "retrieval_doc" | "event" | "asset" | "final_output" | "runner_failure";
  manifest_key: string;
};

export type CoreSignalKind =
  | "untrusted_url_input"
  | "high_risk_action"
  | "secret_in_output"
  | "pii_in_output"
  | "prompt_injection_marker"
  | "runner_failure_detected"
  | "unknown";

export type ExtendedSignalKind =
  | "token_exfil_indicator"
  | "policy_tampering"
  | "unexpected_outbound"
  | "permission_change"
  | "data_exfiltration"
  | "hallucination_in_output"
  | "excessive_permissions"
  | "unsafe_code_execution"
  | "bias_detected"
  | "compliance_violation"
  | "model_refusal"
  | "context_poisoning";

export type SecuritySignal = {
  kind: CoreSignalKind | ExtendedSignalKind;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  title: string;
  message?: string;
  details?: {
    tool?: string;
    call_id?: string;
    action_id?: string;
    fields?: string[];
    urls?: string[];
    notes?: string;
    sample?: string;
    pattern?: string;
    entropy?: number;
    length?: number;
  };
  evidence_refs: EvidenceRef[];
};

export type TraceIntegritySide = {
  status: "ok" | "partial" | "broken";
  issues: string[];
};

export type TraceIntegrity = {
  baseline: TraceIntegritySide;
  new: TraceIntegritySide;
};

export type SecuritySide = {
  signals: SecuritySignal[];
  requires_gate_recommendation: boolean;
};

export type SecurityPack = {
  baseline: SecuritySide;
  new: SecuritySide;
};

export type QualityFlags = {
  self_contained: boolean;
  portable_paths: boolean;
  missing_assets_count: number;
  path_violations_count: number;
  large_payloads_count: number;
  missing_assets: string[];
  path_violations: string[];
  large_payloads: string[];
};

export type ReportMeta = {
  toolkit_version: string;
  spec_version: string;
  generated_at: number;
  run_id: string;
};

export type EnvironmentContext = {
  agent_id?: string;
  model?: string;
  prompt_version?: string;
  tools_version?: string;
};

export type ItemAssertion = {
  name: string;
  pass: boolean;
  details?: Record<string, unknown>;
};

export type CompareReport = {
  contract_version: 5;
  report_id: string;
  meta: ReportMeta;
  environment?: EnvironmentContext;
  baseline_dir: string;
  new_dir: string;
  cases_path: string;

  repro?: {
    bundle_manifest_href: string;
    how_to_reproduce_href: string;
  };

  summary: {
    baseline_pass: number;
    new_pass: number;
    regressions: number;
    improvements: number;

    root_cause_breakdown: Record<string, number>;

    quality: {
      transfer_class: "internal_only" | "transferable";
      redaction_status: "none" | "applied";
      redaction_preset_id?: string;
    };

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

    execution_quality: {
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
      baseline_runner_failure_kinds?: Record<string, number>;
      new_runner_failure_kinds?: Record<string, number>;
      weak_expected_cases: number;
      weak_expected_rate: number;
      model_quality_inconclusive?: boolean;
      model_quality_inconclusive_reason?: string;
      admissibility_kpi?: {
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

    trace_anchor_coverage?: {
      cases_with_anchor_baseline: number;
      cases_with_anchor_new: number;
    };
  };

  summary_by_suite?: Record<string, {
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
  }>;

  quality_flags: QualityFlags;

  compliance_mapping?: Array<{
    framework: string;
    clause: string;
    title?: string;
    evidence?: string[];
  }>;

  items: Array<{
    case_id: string;
    title: string;
    suite?: string;

    data_availability: {
      baseline: { status: "present" | "missing" | "broken"; reason?: string; reason_code?: string; details?: Record<string, unknown> };
      new: { status: "present" | "missing" | "broken"; reason?: string; reason_code?: string; details?: Record<string, unknown> };
    };

    case_status: "executed" | "missing" | "filtered_out";
    case_status_reason?: string;

    baseline_pass: boolean;
    new_pass: boolean;

    baseline_root?: string;
    new_root?: string;

    preventable_by_policy: boolean;
    recommended_policy_rules: string[];

    trace_integrity: TraceIntegrity;
    security: SecurityPack;

    risk_level: "low" | "medium" | "high";
    risk_tags: string[];
    gate_recommendation: "none" | "require_approval" | "block";
    case_ts?: number;
    trace_anchors?: {
      baseline?: TraceAnchor;
      new?: TraceAnchor;
    };
    assertions?: ItemAssertion[];
    assertions_baseline?: ItemAssertion[];
    assertions_new?: ItemAssertion[];
    policy_evaluation: {
      baseline: {
        planning_gate_pass: boolean;
        repl_policy_pass: boolean;
      };
      new: {
        planning_gate_pass: boolean;
        repl_policy_pass: boolean;
      };
    };

    failure_summary?: {
      baseline?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number; net_error_kind?: string };
      new?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number; net_error_kind?: string };
    };

    artifacts: {
      replay_diff_href: string;

      baseline_failure_body_href?: string;
      baseline_failure_body_key?: string;
      baseline_failure_meta_href?: string;
      baseline_failure_meta_key?: string;
      new_failure_body_href?: string;
      new_failure_body_key?: string;
      new_failure_meta_href?: string;
      new_failure_meta_key?: string;

      baseline_case_response_href?: string;
      baseline_case_response_key?: string;
      new_case_response_href?: string;
      new_case_response_key?: string;
      baseline_trace_anchor_href?: string;
      baseline_trace_anchor_key?: string;
      new_trace_anchor_href?: string;
      new_trace_anchor_key?: string;
      baseline_run_meta_href?: string;
      new_run_meta_href?: string;
    };
  }>;

  embedded_manifest_index?: unknown;
};
