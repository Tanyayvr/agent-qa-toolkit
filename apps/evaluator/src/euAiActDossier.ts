import { escHtml } from "./htmlFormatters";
import type { EuAiActPostMarketMonitoring } from "./euAiActMonitoring";
import {
  buildEuAiActHumanOversightSummary,
  buildEuAiActReleaseReview,
  type EuAiActBundleArtifacts,
  type EuAiActHumanOversightSummary,
  type EuAiActReleaseReview,
} from "./euAiActGovernance";
import type { Manifest } from "./manifest";
import type { CompareReport, ComplianceCoverageEntry } from "./reportTypes";

export type EuAiActBundleExports = Pick<
  EuAiActBundleArtifacts,
  | "coverage_href"
  | "annex_iv_href"
  | "report_html_href"
  | "evidence_index_href"
  | "article_13_instructions_href"
  | "article_9_risk_register_href"
  | "article_72_monitoring_plan_href"
  | "article_17_qms_lite_href"
  | "human_oversight_summary_href"
  | "release_review_href"
  | "post_market_monitoring_href"
>;

export type EuAiActCoverageExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: {
    compare_report_href: string;
    evaluator_report_html_href: string;
    manifest_href: string;
  } & EuAiActBundleExports;
  coverage: ComplianceCoverageEntry[];
};

export type EuAiActEvidenceIndex = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  clauses: Array<{
    clause: string;
    title?: string;
    status: ComplianceCoverageEntry["status"];
    selectors: Array<{
      selector: string;
      role: "required" | "supporting";
      presence: "present" | "missing";
      source_rel_path: string;
    }>;
    manifest_keys: string[];
    residual_gaps?: string[];
    notes?: string[];
  }>;
  manifest_items: Manifest["items"];
};

export type EuAiActAnnexIvExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  system_identity: {
    report_id: string;
    toolkit_version: string;
    spec_version: string;
    generated_at: string;
    environment?: CompareReport["environment"];
    baseline_dir: string;
    new_dir: string;
    cases_path: string;
    transfer_class: CompareReport["summary"]["quality"]["transfer_class"];
    redaction_status: CompareReport["summary"]["quality"]["redaction_status"];
    redaction_preset_id?: string;
  };
  intended_use_and_operational_constraints: {
    declared_intended_use: null;
    operator_inputs_required: string[];
    assumption_state_summary: {
      baseline: Record<"present" | "missing" | "not_required", number>;
      new: Record<"present" | "missing" | "not_required", number>;
      cases_with_missing_assumption_state: string[];
    };
    operational_constraints: {
      suites: string[];
      self_contained: boolean;
      portable_paths: boolean;
      missing_assets_count: number;
      path_violations_count: number;
      large_payloads_count: number;
      transfer_class: CompareReport["summary"]["quality"]["transfer_class"];
    };
  };
  clause_coverage: ComplianceCoverageEntry[];
  risk_controls_and_residual_risk: {
    risk_summary: CompareReport["summary"]["risk_summary"];
    gate_summary: {
      cases_requiring_approval: number;
      cases_block_recommended: number;
    };
    top_signal_kinds_new: string[];
    top_signal_kinds_baseline: string[];
    approval_cases: Array<{
      case_id: string;
      title: string;
      risk_level: CompareReport["items"][number]["risk_level"];
      gate_recommendation: CompareReport["items"][number]["gate_recommendation"];
      replay_diff_href?: string;
    }>;
    residual_gaps: string[];
  };
  logging_and_traceability: {
    manifest_item_count: number;
    trace_anchor_coverage?: CompareReport["summary"]["trace_anchor_coverage"];
    case_artifacts: Array<{
      case_id: string;
      baseline_case_response_href?: string;
      new_case_response_href?: string;
      baseline_trace_anchor_href?: string;
      new_trace_anchor_href?: string;
      replay_diff_href?: string;
    }>;
    residual_gaps: string[];
  };
  accuracy_robustness_and_cybersecurity: {
    execution_quality: CompareReport["summary"]["execution_quality"];
    security_summary: CompareReport["summary"]["security"];
    regressions: number;
    improvements: number;
    highlighted_cases: Array<{
      case_id: string;
      title: string;
      risk_level: CompareReport["items"][number]["risk_level"];
      gate_recommendation: CompareReport["items"][number]["gate_recommendation"];
      new_signal_count: number;
      replay_diff_href?: string;
    }>;
  };
  post_market_monitoring_preparation: {
    summary_by_suite?: CompareReport["summary_by_suite"];
    residual_gaps: string[];
  };
  uncovered_areas: string[];
};

export type EuAiActArticle13InstructionsExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_13";
    generated_scope: "technical_evidence_scaffold";
    intended_purpose_statement: null;
    operator_inputs_required: string[];
  };
  system_and_version: {
    report_id: string;
    environment?: CompareReport["environment"];
    toolkit_version: string;
    spec_version: string;
  };
  performance_and_limitations: {
    executed_cases: number;
    new_pass_count: number;
    pass_rate: number;
    regressions: number;
    improvements: number;
    execution_quality_status: CompareReport["summary"]["execution_quality"]["status"];
    execution_quality_reasons: string[];
    known_limitations: string[];
    highlighted_case_ids: string[];
  };
  oversight_and_escalation: {
    cases_requiring_approval: number;
    cases_block_recommended: number;
    approval_case_ids: string[];
    blocking_case_ids: string[];
    operator_guidance: string[];
  };
  logging_and_traceability: {
    manifest_href: string;
    compare_report_href: string;
    evaluator_report_html_href: string;
    retained_case_artifact_count: number;
    trace_anchor_coverage?: CompareReport["summary"]["trace_anchor_coverage"];
  };
  operating_constraints: {
    transfer_class: CompareReport["summary"]["quality"]["transfer_class"];
    redaction_status: CompareReport["summary"]["quality"]["redaction_status"];
    redaction_preset_id?: string;
    portable_paths: boolean;
    self_contained: boolean;
    supported_suites: string[];
  };
  re_evaluation_triggers: string[];
  residual_gaps: string[];
};

export type EuAiActRiskRegisterEntry = {
  risk_id: string;
  source_type: "case_behavior" | "execution_quality" | "coverage_gap" | "monitoring_gap";
  clause_refs: string[];
  severity: "low" | "medium" | "high" | "critical";
  review_status: "monitor" | "review" | "block";
  title: string;
  description: string;
  affected_case_ids: string[];
  evidence_hrefs: string[];
  existing_controls: string[];
  operator_actions_required: string[];
};

export type EuAiActArticle9RiskRegisterExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  summary: {
    total_entries: number;
    block_entries: number;
    review_entries: number;
    monitor_entries: number;
    clause_refs: string[];
  };
  entries: EuAiActRiskRegisterEntry[];
  operator_inputs_required: string[];
  residual_gaps: string[];
};

export type EuAiActArticle72MonitoringPlanExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_72";
    generated_scope: "technical_monitoring_plan_scaffold";
    operator_inputs_required: string[];
  };
  monitored_system: {
    agent_id?: string;
    model?: string;
    scope: EuAiActPostMarketMonitoring["summary"]["scope"];
    monitoring_status: EuAiActPostMarketMonitoring["summary"]["monitoring_status"];
    current_run_included_in_history: boolean;
    runs_in_window: number;
    prior_runs_in_window: number;
    monitored_case_count: number;
  };
  monitoring_objectives: string[];
  data_sources: Array<{
    id: string;
    description: string;
    cadence: "per_release" | "recurring" | "event_driven";
    artifact_hrefs: string[];
  }>;
  review_cadence: Array<{
    trigger: string;
    recommended_cadence: string;
    rationale: string;
  }>;
  escalation_rules: Array<{
    id: string;
    condition: string;
    recommended_response: "monitor" | "review" | "block";
    required_roles: string[];
    artifact_hrefs: string[];
  }>;
  corrective_action_loop: string[];
  current_baseline: {
    execution_quality_status: CompareReport["summary"]["execution_quality"]["status"];
    release_decision_status: EuAiActReleaseReview["release_decision"]["status"];
    drift_detected: boolean;
    drift_signals: string[];
    approval_case_count: number;
    blocking_case_count: number;
    previous_run_report_id?: string;
  };
  operator_inputs_required: string[];
  residual_gaps: string[];
};

export type EuAiActQmsLiteProcessArea = {
  id:
    | "change_management"
    | "testing_and_validation"
    | "incident_and_corrective_action"
    | "documentation_and_record_control"
    | "oversight_and_release_control"
    | "monitoring_and_feedback";
  title: string;
  objective: string;
  current_controls: string[];
  evidence_hrefs: string[];
  operator_inputs_required: string[];
  residual_gaps: string[];
};

export type EuAiActArticle17QmsLiteExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_17";
    generated_scope: "technical_qms_lite_scaffold";
    operator_inputs_required: string[];
  };
  managed_system: {
    agent_id?: string;
    model?: string;
    execution_quality_status: CompareReport["summary"]["execution_quality"]["status"];
    release_decision_status: EuAiActReleaseReview["release_decision"]["status"];
    monitoring_status: EuAiActPostMarketMonitoring["summary"]["monitoring_status"];
    approval_case_count: number;
    blocking_case_count: number;
  };
  process_areas: EuAiActQmsLiteProcessArea[];
  governance_roles: Array<{
    role: string;
    responsibilities: string[];
  }>;
  management_review_triggers: string[];
  current_signals: {
    residual_compliance_gap_count: number;
    drift_detected: boolean;
    drift_signal_count: number;
    review_queue_count: number;
    runs_in_window: number;
  };
  operator_inputs_required: string[];
  residual_gaps: string[];
};

export type EuAiActComplianceBundle = {
  exports: EuAiActBundleExports;
  coverageExport: EuAiActCoverageExport;
  evidenceIndex: EuAiActEvidenceIndex;
  annexIv: EuAiActAnnexIvExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  humanOversightSummary: EuAiActHumanOversightSummary;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  reportHtml: string;
};

export function buildEuAiActBundleArtifacts(): EuAiActBundleArtifacts {
  return {
    compare_report_href: "compare-report.json",
    evaluator_report_html_href: "report.html",
    manifest_href: "artifacts/manifest.json",
    coverage_href: "compliance/eu-ai-act-coverage.json",
    annex_iv_href: "compliance/eu-ai-act-annex-iv.json",
    report_html_href: "compliance/eu-ai-act-report.html",
    evidence_index_href: "compliance/evidence-index.json",
    article_13_instructions_href: "compliance/article-13-instructions.json",
    article_9_risk_register_href: "compliance/article-9-risk-register.json",
    article_72_monitoring_plan_href: "compliance/article-72-monitoring-plan.json",
    article_17_qms_lite_href: "compliance/article-17-qms-lite.json",
    human_oversight_summary_href: "compliance/human-oversight-summary.json",
    release_review_href: "compliance/release-review.json",
    post_market_monitoring_href: "compliance/post-market-monitoring.json",
  };
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function selectorSourceRelPath(selector: string): string {
  if (selector.startsWith("artifacts/manifest.json")) return "artifacts/manifest.json";
  if (selector.startsWith("report.html")) return "report.html";
  if (selector.startsWith("embedded_manifest_index")) return "compare-report.json";
  return "compare-report.json";
}

function manifestKeyKind(manifestKey: string): string {
  const parts = manifestKey.split("/");
  return parts[parts.length - 1] ?? manifestKey;
}

function clauseArtifactKinds(clause: string): Set<string> | null {
  switch (clause) {
    case "Art_9":
      return new Set(["case_response", "final_output", "trace_anchor", "runner_failure"]);
    case "Art_10":
      return new Set(["case_response"]);
    case "Art_12":
      return new Set(["case_response", "trace_anchor", "runner_failure", "runner_failure_body", "runner_failure_meta"]);
    case "Art_13":
      return new Set(["case_response", "final_output", "trace_anchor", "runner_failure"]);
    case "Art_14":
      return new Set(["case_response", "final_output", "runner_failure"]);
    case "Art_15":
      return new Set(["case_response", "final_output", "trace_anchor", "runner_failure", "runner_failure_body", "runner_failure_meta"]);
    default:
      return null;
  }
}

function manifestKeysForClause(manifest: Manifest, clause: string): string[] {
  const allowedKinds = clauseArtifactKinds(clause);
  if (!allowedKinds) {
    return manifest.items.map((item) => item.manifest_key);
  }
  return manifest.items
    .filter((item) => allowedKinds.has(manifestKeyKind(item.manifest_key)))
    .map((item) => item.manifest_key);
}

function collectResidualGaps(entries: ComplianceCoverageEntry[]): string[] {
  return uniqueStrings(entries.flatMap((entry) => entry.residual_gaps ?? []));
}

function summarizeAssumptionState(
  report: CompareReport
): EuAiActAnnexIvExport["intended_use_and_operational_constraints"]["assumption_state_summary"] {
  const baseline = { present: 0, missing: 0, not_required: 0 };
  const current = { present: 0, missing: 0, not_required: 0 };
  const casesWithMissing = new Set<string>();

  for (const item of report.items) {
    baseline[item.assumption_state.baseline.status] += 1;
    current[item.assumption_state.new.status] += 1;
    if (item.assumption_state.baseline.status === "missing" || item.assumption_state.new.status === "missing") {
      casesWithMissing.add(item.case_id);
    }
  }

  return {
    baseline,
    new: current,
    cases_with_missing_assumption_state: [...casesWithMissing],
  };
}

function buildEvidenceIndex(params: {
  report: CompareReport;
  manifest: Manifest;
  coverage: ComplianceCoverageEntry[];
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActEvidenceIndex {
  const clauses = params.coverage.map((entry) => ({
    clause: entry.clause,
    ...(entry.title ? { title: entry.title } : {}),
    status: entry.status,
    selectors: [
      ...entry.required_evidence_present.map((selector) => ({
        selector,
        role: "required" as const,
        presence: "present" as const,
        source_rel_path: selectorSourceRelPath(selector),
      })),
      ...entry.required_evidence_missing.map((selector) => ({
        selector,
        role: "required" as const,
        presence: "missing" as const,
        source_rel_path: selectorSourceRelPath(selector),
      })),
      ...entry.supporting_evidence_present.map((selector) => ({
        selector,
        role: "supporting" as const,
        presence: "present" as const,
        source_rel_path: selectorSourceRelPath(selector),
      })),
      ...entry.supporting_evidence_missing.map((selector) => ({
        selector,
        role: "supporting" as const,
        presence: "missing" as const,
        source_rel_path: selectorSourceRelPath(selector),
      })),
    ],
    manifest_keys: manifestKeysForClause(params.manifest, entry.clause),
    ...(entry.residual_gaps?.length ? { residual_gaps: entry.residual_gaps } : {}),
    ...(entry.notes?.length ? { notes: entry.notes } : {}),
  }));

  const referencedManifestKeys = new Set(clauses.flatMap((clause) => clause.manifest_keys));

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    clauses,
    manifest_items: params.manifest.items.filter((item) => referencedManifestKeys.has(item.manifest_key)),
  };
}

function buildAnnexIvExport(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  evidenceIndex: EuAiActEvidenceIndex;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActAnnexIvExport {
  const riskCoverage = params.coverage.filter((entry) => ["Art_9", "Art_14", "Art_15"].includes(entry.clause));
  const traceCoverage = params.coverage.filter((entry) => entry.clause === "Art_12");
  const monitoringCoverage = params.coverage.filter((entry) => entry.clause === "Art_72");
  const approvalCases = params.report.items
    .filter((item) => item.gate_recommendation !== "none")
    .map((item) => ({
      case_id: item.case_id,
      title: item.title,
      risk_level: item.risk_level,
      gate_recommendation: item.gate_recommendation,
      ...(item.artifacts.replay_diff_href ? { replay_diff_href: item.artifacts.replay_diff_href } : {}),
    }));
  const highlightedCases = params.report.items
    .filter((item) => item.risk_level === "high" || item.gate_recommendation !== "none" || item.security.new.signals.length > 0)
    .map((item) => ({
      case_id: item.case_id,
      title: item.title,
      risk_level: item.risk_level,
      gate_recommendation: item.gate_recommendation,
      new_signal_count: item.security.new.signals.length,
      ...(item.artifacts.replay_diff_href ? { replay_diff_href: item.artifacts.replay_diff_href } : {}),
    }));
  const uncoveredAreas = uniqueStrings([
    ...params.coverage
      .filter((entry) => entry.required_evidence_missing.length > 0)
      .flatMap((entry) => entry.required_evidence_missing.map((selector) => `${entry.clause}: missing required evidence ${selector}`)),
    ...params.coverage
      .filter((entry) => entry.status !== "covered")
      .flatMap((entry) => (entry.residual_gaps ?? []).map((gap) => `${entry.clause}: ${gap}`)),
  ]);

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    system_identity: {
      report_id: params.report.report_id,
      toolkit_version: params.report.meta.toolkit_version,
      spec_version: params.report.meta.spec_version,
      generated_at: new Date(params.report.meta.generated_at).toISOString(),
      ...(params.report.environment ? { environment: params.report.environment } : {}),
      baseline_dir: params.report.baseline_dir,
      new_dir: params.report.new_dir,
      cases_path: params.report.cases_path,
      transfer_class: params.report.summary.quality.transfer_class,
      redaction_status: params.report.summary.quality.redaction_status,
      ...(params.report.summary.quality.redaction_preset_id
        ? { redaction_preset_id: params.report.summary.quality.redaction_preset_id }
        : {}),
    },
    intended_use_and_operational_constraints: {
      declared_intended_use: null,
      operator_inputs_required: [
        "intended purpose statement",
        "system boundary description",
        "deployment context",
      ],
      assumption_state_summary: summarizeAssumptionState(params.report),
      operational_constraints: {
        suites: Object.keys(params.report.summary_by_suite ?? {}),
        self_contained: params.report.quality_flags.self_contained,
        portable_paths: params.report.quality_flags.portable_paths,
        missing_assets_count: params.report.quality_flags.missing_assets_count,
        path_violations_count: params.report.quality_flags.path_violations_count,
        large_payloads_count: params.report.quality_flags.large_payloads_count,
        transfer_class: params.report.summary.quality.transfer_class,
      },
    },
    clause_coverage: params.coverage,
    risk_controls_and_residual_risk: {
      risk_summary: params.report.summary.risk_summary,
      gate_summary: {
        cases_requiring_approval: params.report.summary.cases_requiring_approval,
        cases_block_recommended: params.report.summary.cases_block_recommended,
      },
      top_signal_kinds_new: params.report.summary.security.top_signal_kinds_new,
      top_signal_kinds_baseline: params.report.summary.security.top_signal_kinds_baseline,
      approval_cases: approvalCases,
      residual_gaps: collectResidualGaps(riskCoverage),
    },
    logging_and_traceability: {
      manifest_item_count: params.evidenceIndex.manifest_items.length,
      ...(params.report.summary.trace_anchor_coverage
        ? { trace_anchor_coverage: params.report.summary.trace_anchor_coverage }
        : {}),
      case_artifacts: params.report.items.map((item) => ({
        case_id: item.case_id,
        ...(item.artifacts.baseline_case_response_href
          ? { baseline_case_response_href: item.artifacts.baseline_case_response_href }
          : {}),
        ...(item.artifacts.new_case_response_href ? { new_case_response_href: item.artifacts.new_case_response_href } : {}),
        ...(item.artifacts.baseline_trace_anchor_href
          ? { baseline_trace_anchor_href: item.artifacts.baseline_trace_anchor_href }
          : {}),
        ...(item.artifacts.new_trace_anchor_href ? { new_trace_anchor_href: item.artifacts.new_trace_anchor_href } : {}),
        ...(item.artifacts.replay_diff_href ? { replay_diff_href: item.artifacts.replay_diff_href } : {}),
      })),
      residual_gaps: collectResidualGaps(traceCoverage),
    },
    accuracy_robustness_and_cybersecurity: {
      execution_quality: params.report.summary.execution_quality,
      security_summary: params.report.summary.security,
      regressions: params.report.summary.regressions,
      improvements: params.report.summary.improvements,
      highlighted_cases: highlightedCases,
    },
    post_market_monitoring_preparation: {
      ...(params.report.summary_by_suite ? { summary_by_suite: params.report.summary_by_suite } : {}),
      residual_gaps: collectResidualGaps(monitoringCoverage),
    },
    uncovered_areas: uncoveredAreas,
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function newPassRate(report: CompareReport): number {
  const executedCases = Math.max(
    0,
    report.summary.execution_quality.total_executed_cases || report.summary.data_coverage.total_cases || report.items.length
  );
  if (executedCases === 0) return 0;
  return Number((report.summary.new_pass / executedCases).toFixed(4));
}

function retainedCaseArtifactCount(report: CompareReport): number {
  return uniqueStrings(
    report.items.flatMap((item) =>
      [
        item.artifacts.replay_diff_href,
        item.artifacts.baseline_case_response_href,
        item.artifacts.new_case_response_href,
        item.artifacts.baseline_trace_anchor_href,
        item.artifacts.new_trace_anchor_href,
      ].filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  ).length;
}

function reviewCaseIds(oversightSummary: EuAiActHumanOversightSummary, kind: "require_approval" | "block"): string[] {
  const source = kind === "block" ? oversightSummary.blocked_cases : oversightSummary.approval_required_cases;
  return source.map((item) => item.case_id);
}

function buildArticle13Instructions(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  annexIv: EuAiActAnnexIvExport;
  oversightSummary: EuAiActHumanOversightSummary;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle13InstructionsExport {
  const art13Coverage = params.coverage.filter((entry) => entry.clause === "Art_13");
  const relevantLimitations = uniqueStrings([
    ...collectResidualGaps(art13Coverage),
    ...collectResidualGaps(params.coverage.filter((entry) => ["Art_11", "Annex_IV", "Art_72"].includes(entry.clause))),
    ...params.annexIv.uncovered_areas,
    ...(params.report.summary.execution_quality.reasons || []).map((reason) => `Execution quality note: ${reason}`),
  ]);

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_13",
      generated_scope: "technical_evidence_scaffold",
      intended_purpose_statement: null,
      operator_inputs_required: [
        "intended purpose statement for deployers",
        "known limitations and acceptable operating conditions",
        "human oversight and escalation instructions",
        "monitoring and maintenance contact path",
      ],
    },
    system_and_version: {
      report_id: params.report.report_id,
      ...(params.report.environment ? { environment: params.report.environment } : {}),
      toolkit_version: params.report.meta.toolkit_version,
      spec_version: params.report.meta.spec_version,
    },
    performance_and_limitations: {
      executed_cases: params.report.summary.execution_quality.total_executed_cases,
      new_pass_count: params.report.summary.new_pass,
      pass_rate: newPassRate(params.report),
      regressions: params.report.summary.regressions,
      improvements: params.report.summary.improvements,
      execution_quality_status: params.report.summary.execution_quality.status,
      execution_quality_reasons: params.report.summary.execution_quality.reasons || [],
      known_limitations: relevantLimitations,
      highlighted_case_ids: uniqueStrings(params.oversightSummary.review_queue.map((item) => item.case_id)),
    },
    oversight_and_escalation: {
      cases_requiring_approval: params.report.summary.cases_requiring_approval,
      cases_block_recommended: params.report.summary.cases_block_recommended,
      approval_case_ids: reviewCaseIds(params.oversightSummary, "require_approval"),
      blocking_case_ids: reviewCaseIds(params.oversightSummary, "block"),
      operator_guidance: uniqueStrings([
        ...params.oversightSummary.reviewer_guidance,
        ...params.releaseReview.release_decision.required_human_actions,
        "Document which operator role approves approval-required cases before live deployment.",
      ]),
    },
    logging_and_traceability: {
      manifest_href: params.bundleArtifacts.manifest_href,
      compare_report_href: params.bundleArtifacts.compare_report_href,
      evaluator_report_html_href: params.bundleArtifacts.evaluator_report_html_href,
      retained_case_artifact_count: retainedCaseArtifactCount(params.report),
      ...(params.report.summary.trace_anchor_coverage
        ? { trace_anchor_coverage: params.report.summary.trace_anchor_coverage }
        : {}),
    },
    operating_constraints: {
      transfer_class: params.report.summary.quality.transfer_class,
      redaction_status: params.report.summary.quality.redaction_status,
      ...(params.report.summary.quality.redaction_preset_id
        ? { redaction_preset_id: params.report.summary.quality.redaction_preset_id }
        : {}),
      portable_paths: params.report.quality_flags.portable_paths,
      self_contained: params.report.quality_flags.self_contained,
      supported_suites: Object.keys(params.report.summary_by_suite ?? {}),
    },
    re_evaluation_triggers: [
      "Model version change",
      "Prompt or toolset change",
      "New deployment context or target market",
      "Nightly drift detection or recurring governance review",
      "Policy or standards mapping update",
    ],
    residual_gaps: uniqueStrings([
      "Operator-authored instructions for use are still required before deployer handoff.",
      "This export summarizes technical evidence; it does not replace deployer-facing operating instructions.",
      ...relevantLimitations,
      ...params.postMarketMonitoring.residual_gaps,
    ]),
  };
}

function signalSeverityRank(severity: "low" | "medium" | "high" | "critical"): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function highestCaseSeverity(item: CompareReport["items"][number]): "low" | "medium" | "high" | "critical" {
  const signalSeverity = item.security.new.signals.reduce<"low" | "medium" | "high" | "critical">((current, signal) => {
    return signalSeverityRank(signal.severity) > signalSeverityRank(current) ? signal.severity : current;
  }, "low");
  if (signalSeverity === "critical") return "critical";
  if (item.gate_recommendation === "block") return signalSeverity === "high" ? "high" : "high";
  if (signalSeverity === "high") return "high";
  if (item.gate_recommendation === "require_approval" || item.risk_level === "high" || signalSeverity === "medium") return "medium";
  return "low";
}

function reviewStatusForCase(item: CompareReport["items"][number]): "monitor" | "review" | "block" {
  const severity = highestCaseSeverity(item);
  if (item.gate_recommendation === "block" || severity === "critical") return "block";
  if (item.gate_recommendation === "require_approval" || item.risk_level === "high" || item.security.new.signals.length > 0 || item.failure_summary?.new?.class) {
    return "review";
  }
  return "monitor";
}

function buildCaseRiskEntry(item: CompareReport["items"][number]): EuAiActRiskRegisterEntry | null {
  const reviewStatus = reviewStatusForCase(item);
  const severity = highestCaseSeverity(item);
  if (reviewStatus === "monitor" && severity === "low" && item.security.new.signals.length === 0 && item.failure_summary?.new?.class === undefined) {
    return null;
  }
  const controls = uniqueStrings([
    item.gate_recommendation === "block" ? "Automatic gate recommends blocking release for this case." : "",
    item.gate_recommendation === "require_approval" ? "Automatic gate requires a human approval decision before release." : "",
    item.policy_evaluation.new.planning_gate_pass ? "Planning gate evaluation is recorded for the new run." : "",
    item.policy_evaluation.new.repl_policy_pass ? "REPL policy evaluation is recorded for the new run." : "",
    item.artifacts.replay_diff_href ? "Replay diff is retained for reviewer replay." : "",
    item.artifacts.new_trace_anchor_href ? "Trace anchor is retained for traceability." : "",
    item.security.new.signals.length > 0 ? "Security signal records are retained in the evidence bundle." : "",
  ]);
  const operatorActions = uniqueStrings([
    reviewStatus === "block" ? "Remediate this issue and rerun the case before release." : "",
    reviewStatus === "review" ? "Assign a reviewer and record approval or mitigation rationale before release." : "",
    item.failure_summary?.new?.class ? "Confirm whether the runner failure reflects product behavior or infrastructure instability." : "",
  ]);
  const descriptionParts = uniqueStrings([
    `Case ${item.case_id} (${item.title}) has gate=${item.gate_recommendation}.`,
    `Risk level=${item.risk_level}.`,
    item.security.new.signals.length > 0
      ? `New run emitted ${item.security.new.signals.length} security signal(s): ${uniqueStrings(item.security.new.signals.map((signal) => signal.kind)).join(", ")}.`
      : "",
    item.failure_summary?.new?.class ? `New run failure class=${item.failure_summary.new.class}.` : "",
  ]);
  return {
    risk_id: `case-${slugify(item.case_id)}`,
    source_type: "case_behavior",
    clause_refs: uniqueStrings(["Art_9", item.security.new.signals.length > 0 ? "Art_15" : ""]),
    severity,
    review_status: reviewStatus,
    title: `Case behavior risk: ${item.case_id}`,
    description: descriptionParts.join(" "),
    affected_case_ids: [item.case_id],
    evidence_hrefs: uniqueStrings([
      item.artifacts.replay_diff_href,
      item.artifacts.new_case_response_href,
      item.artifacts.new_trace_anchor_href,
    ]),
    existing_controls: controls,
    operator_actions_required: operatorActions,
  };
}

function buildCoverageGapEntries(coverage: ComplianceCoverageEntry[]): EuAiActRiskRegisterEntry[] {
  const art9 = coverage.filter((entry) => entry.clause === "Art_9");
  const entries: EuAiActRiskRegisterEntry[] = [];
  for (const entry of art9) {
    for (const selector of entry.required_evidence_missing) {
      entries.push({
        risk_id: `coverage-missing-${slugify(selector)}`,
        source_type: "coverage_gap",
        clause_refs: ["Art_9"],
        severity: "high",
        review_status: "block",
        title: "Missing required Article 9 evidence",
        description: `Required evidence is missing for Article 9: ${selector}.`,
        affected_case_ids: [],
        evidence_hrefs: ["compare-report.json", "compliance/eu-ai-act-coverage.json"],
        existing_controls: ["Partial runtime evidence is already attached to the EU bundle."],
        operator_actions_required: [
          "Provide the missing evidence or document why it is unavailable before relying on this risk register.",
        ],
      });
    }
    for (const [index, gap] of (entry.residual_gaps || []).entries()) {
      entries.push({
        risk_id: `coverage-gap-${slugify(entry.clause)}-${index + 1}`,
        source_type: "coverage_gap",
        clause_refs: ["Art_9"],
        severity: "medium",
        review_status: "review",
        title: "Residual Article 9 governance gap",
        description: gap,
        affected_case_ids: [],
        evidence_hrefs: ["compliance/eu-ai-act-coverage.json", "compliance/eu-ai-act-annex-iv.json"],
        existing_controls: ["The residual gap is explicitly documented in the EU coverage export."],
        operator_actions_required: [
          "Assign an owner, document mitigation or acceptance, and schedule review cadence.",
        ],
      });
    }
  }
  return entries;
}

function buildExecutionQualityEntry(report: CompareReport): EuAiActRiskRegisterEntry | null {
  if (report.summary.execution_quality.status !== "degraded") return null;
  return {
    risk_id: "execution-quality-degraded",
    source_type: "execution_quality",
    clause_refs: ["Art_9", "Art_15"],
    severity: "high",
    review_status: "block",
    title: "Execution quality degraded",
    description: `Execution quality is degraded: ${(report.summary.execution_quality.reasons || []).join("; ") || "see compare-report.json"}.`,
    affected_case_ids: [],
    evidence_hrefs: ["compare-report.json", "report.html"],
    existing_controls: ["Execution quality classification is retained in the evidence bundle."],
    operator_actions_required: ["Investigate the degraded execution-quality reasons and rerun before release."],
  };
}

function buildMonitoringEntries(postMarketMonitoring: EuAiActPostMarketMonitoring): EuAiActRiskRegisterEntry[] {
  const entries: EuAiActRiskRegisterEntry[] = [];
  if (postMarketMonitoring.summary.drift_detected) {
    entries.push({
      risk_id: "monitoring-drift-detected",
      source_type: "monitoring_gap",
      clause_refs: ["Art_9", "Art_72"],
      severity: "medium",
      review_status: "review",
      title: "Monitoring drift detected",
      description: `Post-market monitoring detected drift: ${postMarketMonitoring.summary.drift_signals.join("; ") || "see post-market-monitoring.json"}.`,
      affected_case_ids: [],
      evidence_hrefs: ["compliance/post-market-monitoring.json", "compliance/release-review.json"],
      existing_controls: ["Historical monitoring output is attached to the bundle."],
      operator_actions_required: ["Review drift signals and decide whether additional mitigation or reruns are required."],
    });
  }
  for (const [index, gap] of postMarketMonitoring.residual_gaps.entries()) {
    entries.push({
      risk_id: `monitoring-gap-${index + 1}`,
      source_type: "monitoring_gap",
      clause_refs: ["Art_9", "Art_72"],
      severity: "medium",
      review_status: "review",
      title: "Monitoring residual gap",
      description: gap,
      affected_case_ids: [],
      evidence_hrefs: ["compliance/post-market-monitoring.json"],
      existing_controls: ["The monitoring gap is explicitly documented in the EU bundle."],
      operator_actions_required: ["Define the missing monitoring cadence, escalation path, or reporting workflow."],
    });
  }
  return entries;
}

function buildArticle9RiskRegister(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle9RiskRegisterExport {
  const executionQualityEntry = buildExecutionQualityEntry(params.report);
  const riskEntries = [
    ...params.report.items.map((item) => buildCaseRiskEntry(item)).filter((entry): entry is EuAiActRiskRegisterEntry => Boolean(entry)),
    ...buildCoverageGapEntries(params.coverage),
    ...(executionQualityEntry ? [executionQualityEntry] : []),
    ...buildMonitoringEntries(params.postMarketMonitoring),
  ].sort((left, right) => {
    const statusRank = { block: 3, review: 2, monitor: 1 };
    const statusDelta = statusRank[right.review_status] - statusRank[left.review_status];
    if (statusDelta !== 0) return statusDelta;
    const severityDelta = signalSeverityRank(right.severity) - signalSeverityRank(left.severity);
    if (severityDelta !== 0) return severityDelta;
    return left.risk_id.localeCompare(right.risk_id);
  });

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    summary: {
      total_entries: riskEntries.length,
      block_entries: riskEntries.filter((entry) => entry.review_status === "block").length,
      review_entries: riskEntries.filter((entry) => entry.review_status === "review").length,
      monitor_entries: riskEntries.filter((entry) => entry.review_status === "monitor").length,
      clause_refs: uniqueStrings(riskEntries.flatMap((entry) => entry.clause_refs)),
    },
    entries: riskEntries,
    operator_inputs_required: [
      "likelihood and severity rationale owned by the operator",
      "control owner and target review date for each open risk",
      "residual-risk acceptance rationale for any accepted risk",
      "release decision linkage for block or review risks",
    ],
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(params.coverage.filter((entry) => entry.clause === "Art_9")),
      ...params.postMarketMonitoring.residual_gaps,
      "This register is generated from runtime evidence and still requires operator-owned likelihood, impact, and acceptance rationale.",
    ]),
  };
}

function buildArticle72MonitoringPlan(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle72MonitoringPlanExport {
  const art72Coverage = params.coverage.filter((entry) => entry.clause === "Art_72");
  const operatorInputsRequired = [
    "named monitoring owner and backup owner",
    "monitoring cadence and SLA by deployment context",
    "incident, customer, and authority notification workflow",
    "retention period and archive location for monitoring artifacts",
    "corrective-action and rollback authority for repeated drift or blocking findings",
  ];
  const driftDetected = params.postMarketMonitoring.summary.drift_detected;
  const approvalCases = params.report.summary.cases_requiring_approval;
  const blockingCases = params.report.summary.cases_block_recommended;

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_72",
      generated_scope: "technical_monitoring_plan_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    monitored_system: {
      ...(params.report.environment?.agent_id ? { agent_id: params.report.environment.agent_id } : {}),
      ...(params.report.environment?.model ? { model: params.report.environment.model } : {}),
      scope: params.postMarketMonitoring.summary.scope,
      monitoring_status: params.postMarketMonitoring.summary.monitoring_status,
      current_run_included_in_history: params.postMarketMonitoring.summary.current_run_included_in_history,
      runs_in_window: params.postMarketMonitoring.summary.runs_in_window,
      prior_runs_in_window: params.postMarketMonitoring.summary.prior_runs_in_window,
      monitored_case_count: params.postMarketMonitoring.summary.monitored_case_count,
    },
    monitoring_objectives: [
      "Detect regressions, approval paths, and blocking findings after release or during release readiness review.",
      "Track recurring drift, risk concentration, and signal accumulation across monitored runs.",
      "Preserve a portable evidence path from current release data to recurring governance review.",
      "Escalate material findings to release, security, compliance, or legal owners before relying on the system in scope.",
    ],
    data_sources: [
      {
        id: "current_release_evidence",
        description: "Current report bundle used as the baseline evidence source for release or monitoring review.",
        cadence: "per_release",
        artifact_hrefs: [
          params.bundleArtifacts.compare_report_href,
          params.bundleArtifacts.evaluator_report_html_href,
          params.bundleArtifacts.manifest_href,
        ],
      },
      {
        id: "longitudinal_monitoring",
        description: "Trend and watchlist evidence used to compare the current run against prior monitored runs.",
        cadence: "recurring",
        artifact_hrefs: [params.bundleArtifacts.post_market_monitoring_href],
      },
      {
        id: "governance_decisions",
        description: "Oversight queue and release review used to route approval, blocking, and reviewer follow-up decisions.",
        cadence: "per_release",
        artifact_hrefs: [
          params.bundleArtifacts.human_oversight_summary_href,
          params.bundleArtifacts.release_review_href,
        ],
      },
      {
        id: "operator_reference_scaffolds",
        description: "Technical scaffolds that keep operator instructions and open risks aligned with monitoring review.",
        cadence: "event_driven",
        artifact_hrefs: [
          params.bundleArtifacts.article_13_instructions_href,
          params.bundleArtifacts.article_9_risk_register_href,
          params.bundleArtifacts.annex_iv_href,
        ],
      },
    ],
    review_cadence: [
      {
        trigger: "Release candidate or meaningful model/prompt/tool/workflow change",
        recommended_cadence: "Per release candidate before promotion",
        rationale: "Material changes should refresh the monitoring baseline before the system is promoted.",
      },
      {
        trigger: "Recurring governed operation",
        recommended_cadence: "Weekly or per formal governance checkpoint",
        rationale: "Regular review keeps drift, approval pressure, and unresolved gaps visible over time.",
      },
      {
        trigger: "Drift, blocking findings, or serious incident signals",
        recommended_cadence: "Same business day escalation",
        rationale: "Material post-market signals require a documented response instead of waiting for the next routine review.",
      },
      {
        trigger: "New deployment context, market, or regulatory mapping change",
        recommended_cadence: "Before the expanded deployment goes live",
        rationale: "Monitoring scope and thresholds can change when the operating context changes.",
      },
    ],
    escalation_rules: [
      {
        id: "execution-quality-degraded",
        condition: "Execution quality is degraded in the current evidence bundle.",
        recommended_response: "block",
        required_roles: ["release owner", "platform engineer"],
        artifact_hrefs: [params.bundleArtifacts.compare_report_href, params.bundleArtifacts.release_review_href],
      },
      {
        id: "blocking-case-present",
        condition: "One or more cases recommend blocking release or operation.",
        recommended_response: "block",
        required_roles: ["release owner", "security or compliance reviewer"],
        artifact_hrefs: [params.bundleArtifacts.release_review_href, params.bundleArtifacts.article_9_risk_register_href],
      },
      {
        id: "approval-review-queue",
        condition: "Approval-required cases remain open for the current run.",
        recommended_response: "review",
        required_roles: ["named human reviewer", "system owner"],
        artifact_hrefs: [params.bundleArtifacts.human_oversight_summary_href, params.bundleArtifacts.article_13_instructions_href],
      },
      {
        id: "monitoring-drift",
        condition: driftDetected
          ? "Current monitoring evidence detected drift versus the prior run window."
          : "Future monitoring reviews should escalate when drift is detected versus prior runs.",
        recommended_response: "review",
        required_roles: ["system owner", "compliance or governance owner"],
        artifact_hrefs: [params.bundleArtifacts.post_market_monitoring_href, params.bundleArtifacts.release_review_href],
      },
      {
        id: "history-not-current",
        condition:
          params.postMarketMonitoring.summary.monitoring_status === "history_current"
            ? "Monitoring history currently includes the latest run; keep this continuity on future runs."
            : "Monitoring history is incomplete or stale and should be restored before the bundle is treated as current monitoring evidence.",
        recommended_response:
          params.postMarketMonitoring.summary.monitoring_status === "history_current" ? "monitor" : "review",
        required_roles: ["platform owner"],
        artifact_hrefs: [params.bundleArtifacts.post_market_monitoring_href],
      },
    ],
    corrective_action_loop: [
      "Record the triggering finding and the affected artifact in the review package.",
      "Assign an owner, disposition, and due date for mitigation or acceptance.",
      "Apply remediation, rerun the relevant cases or release workflow, and replace stale evidence.",
      "Escalate to legal or compliance review when the finding changes deployment assumptions, market scope, or residual-risk acceptance.",
    ],
    current_baseline: {
      execution_quality_status: params.report.summary.execution_quality.status,
      release_decision_status: params.releaseReview.release_decision.status,
      drift_detected: driftDetected,
      drift_signals: params.postMarketMonitoring.summary.drift_signals,
      approval_case_count: approvalCases,
      blocking_case_count: blockingCases,
      ...(params.postMarketMonitoring.previous_run
        ? { previous_run_report_id: params.postMarketMonitoring.previous_run.report_id }
        : {}),
    },
    operator_inputs_required: operatorInputsRequired,
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(art72Coverage),
      ...params.postMarketMonitoring.residual_gaps,
      ...params.article13Instructions.residual_gaps,
      ...params.article9RiskRegister.residual_gaps,
      "This plan is a technical scaffold and still requires operator-owned monitoring ownership, cadence, retention, and authority-reporting decisions.",
    ]),
  };
}

function buildArticle17QmsLite(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  releaseReview: EuAiActReleaseReview;
  humanOversightSummary: EuAiActHumanOversightSummary;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  annexIv: EuAiActAnnexIvExport;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle17QmsLiteExport {
  const art17Coverage = params.coverage.filter((entry) => entry.clause === "Art_17");
  const operatorInputsRequired = [
    "named quality management owner and document approver",
    "written change-management procedure and approval workflow",
    "incident, complaint, and corrective-action handling workflow",
    "document-control, retention, and versioning policy",
    "training, competency, and supplier-management responsibilities",
    "authority and customer communication procedure for material issues",
  ];
  const processAreas: EuAiActQmsLiteProcessArea[] = [
    {
      id: "change_management",
      title: "Change management",
      objective: "Ensure material system changes trigger review, evidence refresh, and explicit approval before release.",
      current_controls: [
        "Release review output records approve / approve_with_review / reject decisions for the current bundle.",
        "The evidence bundle preserves compare-report, report.html, and manifest references for each packaged run.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.compare_report_href,
        params.bundleArtifacts.release_review_href,
        params.bundleArtifacts.evaluator_report_html_href,
      ],
      operator_inputs_required: [
        "define what counts as a material change",
        "name approvers for release and rollback decisions",
      ],
      residual_gaps: [
        "Formal change-approval workflow and document ownership remain operator-authored.",
      ],
    },
    {
      id: "testing_and_validation",
      title: "Testing and validation",
      objective: "Keep pre-release validation, risk review, and evidence refresh repeatable for every meaningful change.",
      current_controls: [
        "Execution quality, pass/fail outcomes, and per-case risk signals are retained for the current run.",
        "Machine-derived risk register entries identify block and review findings for remediation.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.compare_report_href,
        params.bundleArtifacts.article_9_risk_register_href,
        params.bundleArtifacts.article_17_qms_lite_href,
      ],
      operator_inputs_required: [
        "set minimum testing cadence and acceptance criteria",
        "define who signs off repeated approval-required cases",
      ],
      residual_gaps: [
        "Written validation procedure, acceptance thresholds, and exception handling remain operator-owned.",
      ],
    },
    {
      id: "incident_and_corrective_action",
      title: "Incident and corrective action",
      objective: "Escalate degraded execution, blocking cases, drift, or incidents into a documented remediation loop.",
      current_controls: [
        "Release review collects required human actions when execution quality degrades or cases are blocked.",
        "Monitoring plan scaffold defines event-driven escalation triggers for drift and blocking findings.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.release_review_href,
        params.bundleArtifacts.article_72_monitoring_plan_href,
        params.bundleArtifacts.post_market_monitoring_href,
      ],
      operator_inputs_required: [
        "define incident severity thresholds and response SLA",
        "define corrective-action ownership and evidence retention after remediation",
      ],
      residual_gaps: [
        "Serious-incident reporting workflow and authority communication procedure remain outside this scaffold.",
      ],
    },
    {
      id: "documentation_and_record_control",
      title: "Documentation and record control",
      objective: "Keep technical documentation, evidence references, and retained artifacts versioned and reviewable.",
      current_controls: [
        "Manifest, evidence index, and Annex IV export give a stable artifact map for the current bundle.",
        "Portable-path and self-contained checks verify that packaged evidence can be handed off without local path leakage.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.manifest_href,
        params.bundleArtifacts.evidence_index_href,
        params.bundleArtifacts.annex_iv_href,
      ],
      operator_inputs_required: [
        "define document approval workflow and retention owner",
        "define where controlled QMS documents and evidence snapshots are archived",
      ],
      residual_gaps: [
        "Formal document-control policy, retention periods, and archive approvals remain operator-authored.",
      ],
    },
    {
      id: "oversight_and_release_control",
      title: "Oversight and release control",
      objective: "Bind human oversight, release approval, and deployer-facing instructions into one governed release path.",
      current_controls: [
        "Human oversight summary records approval-required and blocked cases.",
        "Article 13 instructions scaffold records oversight and escalation expectations for deployers and operators.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.human_oversight_summary_href,
        params.bundleArtifacts.article_13_instructions_href,
        params.bundleArtifacts.release_review_href,
      ],
      operator_inputs_required: [
        "define reviewer roles and escalation chain",
        "complete operator-facing and deployer-facing narrative instructions",
      ],
      residual_gaps: [
        "Named oversight roles, approval authority, and final deployer instructions still require operator completion.",
      ],
    },
    {
      id: "monitoring_and_feedback",
      title: "Monitoring and feedback",
      objective: "Run recurring monitoring, detect drift, and feed monitoring outcomes back into risk and release decisions.",
      current_controls: [
        "Post-market monitoring export records longitudinal history and monitored-case watchlists.",
        "Article 72 monitoring-plan scaffold defines cadence and escalation hooks for recurring review.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.post_market_monitoring_href,
        params.bundleArtifacts.article_72_monitoring_plan_href,
        params.bundleArtifacts.article_9_risk_register_href,
      ],
      operator_inputs_required: [
        "set routine monitoring cadence and governance checkpoint schedule",
        "define how customer feedback, incidents, and drift findings update the risk register",
      ],
      residual_gaps: [
        "Operational feedback intake, complaint handling, and authority/customer communication still require written process ownership.",
      ],
    },
  ];

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_17",
      generated_scope: "technical_qms_lite_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    managed_system: {
      ...(params.report.environment?.agent_id ? { agent_id: params.report.environment.agent_id } : {}),
      ...(params.report.environment?.model ? { model: params.report.environment.model } : {}),
      execution_quality_status: params.report.summary.execution_quality.status,
      release_decision_status: params.releaseReview.release_decision.status,
      monitoring_status: params.postMarketMonitoring.summary.monitoring_status,
      approval_case_count: params.report.summary.cases_requiring_approval,
      blocking_case_count: params.report.summary.cases_block_recommended,
    },
    process_areas: processAreas,
    governance_roles: [
      {
        role: "system owner",
        responsibilities: [
          "Own intended use, deployment boundary, and residual-risk acceptance.",
          "Approve remediation priorities for open block or review findings.",
        ],
      },
      {
        role: "release owner",
        responsibilities: [
          "Decide whether the current release can proceed, requires review, or must be blocked.",
          "Ensure material changes trigger evidence refresh before promotion.",
        ],
      },
      {
        role: "platform or evaluation engineer",
        responsibilities: [
          "Maintain runner, adapter, and evidence-packaging workflow health.",
          "Investigate degraded execution quality, drift, or packaging integrity failures.",
        ],
      },
      {
        role: "compliance or governance reviewer",
        responsibilities: [
          "Review residual gaps, monitoring escalations, and control ownership.",
          "Escalate to legal or audit workflows when technical evidence is insufficient on its own.",
        ],
      },
    ],
    management_review_triggers: [
      "Release decision is reject or approve_with_review.",
      "Execution quality is degraded or any case is marked block.",
      "Monitoring drift is detected or monitoring history becomes stale.",
      "Deployment context, target market, or intended use changes materially.",
      "Residual compliance gaps change, expand, or lose a named owner.",
    ],
    current_signals: {
      residual_compliance_gap_count: collectResidualGaps(params.coverage).length + params.annexIv.uncovered_areas.length,
      drift_detected: params.postMarketMonitoring.summary.drift_detected,
      drift_signal_count: params.postMarketMonitoring.summary.drift_signals.length,
      review_queue_count: params.humanOversightSummary.review_queue.length,
      runs_in_window: params.postMarketMonitoring.summary.runs_in_window,
    },
    operator_inputs_required: operatorInputsRequired,
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(art17Coverage),
      ...params.article13Instructions.residual_gaps,
      ...params.article9RiskRegister.residual_gaps,
      ...params.article72MonitoringPlan.residual_gaps,
      "This QMS-lite export is a technical scaffold, not a complete quality management system.",
      "Competency management, supplier management, authority communication, and formal document-control procedures remain operator-authored.",
    ]),
  };
}

function renderCoverageRows(coverage: ComplianceCoverageEntry[]): string {
  return coverage
    .map((entry) => {
      const evidence = [
        ...entry.required_evidence_present,
        ...entry.supporting_evidence_present,
      ];
      return `<tr>
  <td><code>${escHtml(entry.clause)}</code></td>
  <td>${escHtml(entry.title ?? "-")}</td>
  <td>${escHtml(entry.status)}</td>
  <td>${escHtml(String(evidence.length))}</td>
  <td>${escHtml(String(entry.required_evidence_missing.length))}</td>
</tr>`;
    })
    .join("");
}

function renderList(values: string[]): string {
  if (!values.length) return "<li>-</li>";
  return values.map((value) => `<li>${escHtml(value)}</li>`).join("");
}

function renderEuAiActHtml(params: {
  annexIv: EuAiActAnnexIvExport;
  evidenceIndex: EuAiActEvidenceIndex;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  humanOversightSummary: EuAiActHumanOversightSummary;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
}): string {
  const {
    annexIv,
    evidenceIndex,
    article13Instructions,
    article9RiskRegister,
    article72MonitoringPlan,
    article17QmsLite,
    humanOversightSummary,
    releaseReview,
    postMarketMonitoring,
  } = params;

  const oversightRows = humanOversightSummary.review_queue.length
    ? humanOversightSummary.review_queue
      .map((item) => `<tr>
        <td><code>${escHtml(item.case_id)}</code></td>
        <td>${escHtml(item.title)}</td>
        <td>${escHtml(item.gate_recommendation)}</td>
        <td>${escHtml(item.reviewer_action)}</td>
        <td>${item.rationale.map((reason) => escHtml(reason)).join("<br/>")}</td>
      </tr>`)
      .join("")
    : '<tr><td colspan="5">No review queue items.</td></tr>';
  const checklistRows = releaseReview.checklist
    .map((item) => `<tr>
      <td><code>${escHtml(item.id)}</code></td>
      <td>${escHtml(item.label)}</td>
      <td>${escHtml(item.status)}</td>
      <td>${escHtml(item.summary)}</td>
    </tr>`)
    .join("");
  const monitoringRunRows = postMarketMonitoring.run_history.length
    ? postMarketMonitoring.run_history
      .map((entry) => `<tr>
        <td><code>${escHtml(entry.report_id)}</code></td>
        <td>${escHtml(new Date(entry.generated_at).toISOString().slice(0, 10))}</td>
        <td>${escHtml(String(entry.pass_rate))}</td>
        <td>${escHtml(String(entry.cases_requiring_approval))}</td>
        <td>${escHtml(String(entry.cases_block_recommended))}</td>
        <td>${escHtml(String(entry.signal_totals.high + entry.signal_totals.critical))}</td>
      </tr>`)
      .join("")
    : '<tr><td colspan="6">No historical monitoring rows available.</td></tr>';
  const monitoredCaseRows = postMarketMonitoring.monitored_cases.length
    ? postMarketMonitoring.monitored_cases
      .map((item) => `<tr>
        <td><code>${escHtml(item.case_id)}</code></td>
        <td>${escHtml(item.title)}</td>
        <td>${escHtml(item.current_state.gate_recommendation)}</td>
        <td>${escHtml(String(item.history_summary.runs_observed))}</td>
        <td>${escHtml(String(item.history_summary.pass_rate))}</td>
        <td>${escHtml(item.flagged_because.join(" | "))}</td>
      </tr>`)
      .join("")
    : '<tr><td colspan="6">No monitored case watchlist items in this bundle.</td></tr>';
  const riskRegisterRows = article9RiskRegister.entries.length
    ? article9RiskRegister.entries
      .map((entry) => `<tr>
        <td><code>${escHtml(entry.risk_id)}</code></td>
        <td>${escHtml(entry.title)}</td>
        <td>${escHtml(entry.severity)}</td>
        <td>${escHtml(entry.review_status)}</td>
        <td>${escHtml(entry.description)}</td>
      </tr>`)
      .join("")
    : '<tr><td colspan="5">No machine-derived risk register entries.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(`EU AI Act dossier · ${annexIv.report_id}`)}</title>
<style>
  body { margin: 0; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; background: #f6f7fb; color: #111827; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border: 1px solid #d7dce5; border-radius: 16px; padding: 18px; margin-top: 16px; }
  h1, h2 { margin: 0; }
  h1 { font-size: 28px; }
  h2 { font-size: 18px; margin-bottom: 12px; }
  .muted { color: #4b5563; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
  .kpi { border: 1px solid #d7dce5; border-radius: 12px; padding: 12px; background: #fbfcff; }
  .kpi strong { display: block; font-size: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-top: 1px solid #d7dce5; text-align: left; padding: 10px; vertical-align: top; }
  th { color: #374151; }
  code { color: #1d4ed8; }
  ul { margin: 8px 0 0 18px; }
  a { color: #1d4ed8; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>EU AI Act Annex IV dossier</h1>
    <div class="muted" style="margin-top:6px;">Report <code>${escHtml(annexIv.report_id)}</code> · generated ${escHtml(new Date(annexIv.generated_at).toISOString())}</div>

    <div class="card">
      <h2>Bundle artifacts</h2>
      <div class="muted">
        <a href="../${escHtml(annexIv.bundle_artifacts.compare_report_href)}">compare-report.json</a> ·
        <a href="../${escHtml(annexIv.bundle_artifacts.evaluator_report_html_href)}">report.html</a> ·
        <a href="../${escHtml(annexIv.bundle_artifacts.manifest_href)}">artifacts/manifest.json</a> ·
        <a href="${escHtml("eu-ai-act-annex-iv.json")}">annex-iv.json</a> ·
        <a href="${escHtml("evidence-index.json")}">evidence-index.json</a> ·
        <a href="${escHtml("article-13-instructions.json")}">article-13-instructions.json</a> ·
        <a href="${escHtml("article-9-risk-register.json")}">article-9-risk-register.json</a> ·
        <a href="${escHtml("article-72-monitoring-plan.json")}">article-72-monitoring-plan.json</a> ·
        <a href="${escHtml("article-17-qms-lite.json")}">article-17-qms-lite.json</a> ·
        <a href="${escHtml("human-oversight-summary.json")}">human-oversight-summary.json</a> ·
        <a href="${escHtml("release-review.json")}">release-review.json</a> ·
        <a href="${escHtml("post-market-monitoring.json")}">post-market-monitoring.json</a>
      </div>
    </div>

    <div class="card">
      <h2>System identity</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(annexIv.system_identity.toolkit_version)}</strong><span class="muted">toolkit version</span></div>
        <div class="kpi"><strong>${escHtml(annexIv.system_identity.transfer_class)}</strong><span class="muted">transfer class</span></div>
        <div class="kpi"><strong>${escHtml(annexIv.system_identity.redaction_status)}</strong><span class="muted">redaction status</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">
        cases: <code>${escHtml(annexIv.system_identity.cases_path)}</code><br/>
        baseline: <code>${escHtml(annexIv.system_identity.baseline_dir)}</code><br/>
        new: <code>${escHtml(annexIv.system_identity.new_dir)}</code>
      </div>
    </div>

    <div class="card">
      <h2>Operational constraints and intended-use assumptions</h2>
      <div class="muted">Declared intended use is not stored in the evaluator output and must be added by the operator.</div>
      <ul>${renderList(annexIv.intended_use_and_operational_constraints.operator_inputs_required)}</ul>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(String(annexIv.intended_use_and_operational_constraints.assumption_state_summary.baseline.present))}</strong><span class="muted">baseline assumptions present</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.intended_use_and_operational_constraints.assumption_state_summary.new.present))}</strong><span class="muted">new assumptions present</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.intended_use_and_operational_constraints.assumption_state_summary.cases_with_missing_assumption_state.length))}</strong><span class="muted">cases missing assumption state</span></div>
      </div>
    </div>

    <div class="card">
      <h2>Clause coverage</h2>
      <table>
        <thead>
          <tr><th>clause</th><th>title</th><th>status</th><th>evidence refs</th><th>missing required</th></tr>
        </thead>
        <tbody>
          ${renderCoverageRows(annexIv.clause_coverage)}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Risk controls and residual risk</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(String(annexIv.risk_controls_and_residual_risk.risk_summary.low))}</strong><span class="muted">risk low</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.risk_controls_and_residual_risk.risk_summary.medium))}</strong><span class="muted">risk medium</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.risk_controls_and_residual_risk.risk_summary.high))}</strong><span class="muted">risk high</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.risk_controls_and_residual_risk.gate_summary.cases_requiring_approval))}</strong><span class="muted">require approval</span></div>
      </div>
      <ul>${renderList(annexIv.risk_controls_and_residual_risk.residual_gaps)}</ul>
    </div>

    <div class="card">
      <h2>Article 13 instructions for use scaffold</h2>
      <div class="muted">This export is a technical scaffold. Operator-authored deployer instructions are still required.</div>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(String(article13Instructions.performance_and_limitations.pass_rate))}</strong><span class="muted">new pass rate</span></div>
        <div class="kpi"><strong>${escHtml(article13Instructions.performance_and_limitations.execution_quality_status)}</strong><span class="muted">execution quality</span></div>
        <div class="kpi"><strong>${escHtml(String(article13Instructions.oversight_and_escalation.cases_requiring_approval))}</strong><span class="muted">approval-required cases</span></div>
        <div class="kpi"><strong>${escHtml(String(article13Instructions.oversight_and_escalation.cases_block_recommended))}</strong><span class="muted">blocking cases</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">Required operator inputs:</div>
      <ul>${renderList(article13Instructions.document_scope.operator_inputs_required)}</ul>
      <div class="muted" style="margin-top:12px;">Known limitations:</div>
      <ul>${renderList(article13Instructions.performance_and_limitations.known_limitations)}</ul>
    </div>

    <div class="card">
      <h2>Article 9 risk register scaffold</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(String(article9RiskRegister.summary.total_entries))}</strong><span class="muted">total entries</span></div>
        <div class="kpi"><strong>${escHtml(String(article9RiskRegister.summary.block_entries))}</strong><span class="muted">block entries</span></div>
        <div class="kpi"><strong>${escHtml(String(article9RiskRegister.summary.review_entries))}</strong><span class="muted">review entries</span></div>
        <div class="kpi"><strong>${escHtml(String(article9RiskRegister.summary.monitor_entries))}</strong><span class="muted">monitor entries</span></div>
      </div>
      <table>
        <thead>
          <tr><th>risk id</th><th>title</th><th>severity</th><th>status</th><th>description</th></tr>
        </thead>
        <tbody>${riskRegisterRows}</tbody>
      </table>
      <div class="muted" style="margin-top:12px;">Operator inputs still required:</div>
      <ul>${renderList(article9RiskRegister.operator_inputs_required)}</ul>
    </div>

    <div class="card">
      <h2>Article 72 monitoring plan scaffold</h2>
      <div class="muted">This export is a technical monitoring-plan scaffold. Owners still need to complete cadence, retention, and authority/customer escalation workflow details.</div>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(article72MonitoringPlan.monitored_system.monitoring_status)}</strong><span class="muted">monitoring status</span></div>
        <div class="kpi"><strong>${escHtml(String(article72MonitoringPlan.monitored_system.runs_in_window))}</strong><span class="muted">runs in window</span></div>
        <div class="kpi"><strong>${escHtml(String(article72MonitoringPlan.current_baseline.approval_case_count))}</strong><span class="muted">approval cases</span></div>
        <div class="kpi"><strong>${escHtml(String(article72MonitoringPlan.current_baseline.blocking_case_count))}</strong><span class="muted">blocking cases</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">Operator inputs still required:</div>
      <ul>${renderList(article72MonitoringPlan.operator_inputs_required)}</ul>
      <div class="muted" style="margin-top:12px;">Escalation rules:</div>
      <ul>${renderList(article72MonitoringPlan.escalation_rules.map((rule) => `${rule.id}: ${rule.condition} -> ${rule.recommended_response}`))}</ul>
    </div>

    <div class="card">
      <h2>Article 17 QMS-lite scaffold</h2>
      <div class="muted">This export is a technical quality-management scaffold. Operator-owned procedures, approvals, training, and communications still need to be authored outside the evaluator.</div>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(article17QmsLite.managed_system.execution_quality_status)}</strong><span class="muted">execution quality</span></div>
        <div class="kpi"><strong>${escHtml(article17QmsLite.managed_system.release_decision_status)}</strong><span class="muted">release decision</span></div>
        <div class="kpi"><strong>${escHtml(article17QmsLite.managed_system.monitoring_status)}</strong><span class="muted">monitoring status</span></div>
        <div class="kpi"><strong>${escHtml(String(article17QmsLite.process_areas.length))}</strong><span class="muted">process areas</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">Management review triggers:</div>
      <ul>${renderList(article17QmsLite.management_review_triggers)}</ul>
      <div class="muted" style="margin-top:12px;">Operator inputs still required:</div>
      <ul>${renderList(article17QmsLite.operator_inputs_required)}</ul>
    </div>

    <div class="card">
      <h2>Human oversight</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(String(humanOversightSummary.overview.approval_required_cases))}</strong><span class="muted">approval required</span></div>
        <div class="kpi"><strong>${escHtml(String(humanOversightSummary.overview.blocked_cases))}</strong><span class="muted">blocked cases</span></div>
        <div class="kpi"><strong>${escHtml(String(humanOversightSummary.review_queue.length))}</strong><span class="muted">review queue</span></div>
      </div>
      <table>
        <thead>
          <tr><th>case</th><th>title</th><th>gate</th><th>reviewer action</th><th>rationale</th></tr>
        </thead>
        <tbody>${oversightRows}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>Logging and traceability</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(String(annexIv.logging_and_traceability.manifest_item_count))}</strong><span class="muted">manifest items</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.logging_and_traceability.case_artifacts.length))}</strong><span class="muted">case artifact rows</span></div>
      </div>
      <ul>${renderList(annexIv.logging_and_traceability.residual_gaps)}</ul>
    </div>

    <div class="card">
      <h2>Accuracy, robustness, and cybersecurity</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(annexIv.accuracy_robustness_and_cybersecurity.execution_quality.status)}</strong><span class="muted">execution quality</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.accuracy_robustness_and_cybersecurity.regressions))}</strong><span class="muted">regressions</span></div>
        <div class="kpi"><strong>${escHtml(String(annexIv.accuracy_robustness_and_cybersecurity.highlighted_cases.length))}</strong><span class="muted">highlighted cases</span></div>
      </div>
    </div>

    <div class="card">
      <h2>Release review</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(releaseReview.release_decision.status)}</strong><span class="muted">release decision</span></div>
        <div class="kpi"><strong>${escHtml(String(releaseReview.release_gate_summary.cases_requiring_approval))}</strong><span class="muted">approval-required cases</span></div>
        <div class="kpi"><strong>${escHtml(String(releaseReview.release_gate_summary.cases_block_recommended))}</strong><span class="muted">blocking cases</span></div>
      </div>
      <ul>${renderList(releaseReview.release_decision.rationale)}</ul>
      <table>
        <thead>
          <tr><th>id</th><th>check</th><th>status</th><th>summary</th></tr>
        </thead>
        <tbody>${checklistRows}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>Post-market monitoring</h2>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(postMarketMonitoring.summary.monitoring_status)}</strong><span class="muted">monitoring status</span></div>
        <div class="kpi"><strong>${escHtml(String(postMarketMonitoring.summary.runs_in_window))}</strong><span class="muted">runs in window</span></div>
        <div class="kpi"><strong>${escHtml(String(postMarketMonitoring.summary.monitored_case_count))}</strong><span class="muted">monitored cases</span></div>
        <div class="kpi"><strong>${escHtml(String(postMarketMonitoring.summary.drift_signals.length))}</strong><span class="muted">drift signals</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">
        scope: ${escHtml(postMarketMonitoring.summary.scope)} · current run in history:
        ${escHtml(String(postMarketMonitoring.summary.current_run_included_in_history))}
      </div>
      <ul>${renderList(postMarketMonitoring.summary.drift_signals)}</ul>
      <table>
        <thead>
          <tr><th>report</th><th>date</th><th>pass rate</th><th>approval</th><th>block</th><th>high+critical signals</th></tr>
        </thead>
        <tbody>${monitoringRunRows}</tbody>
      </table>
      <table style="margin-top:12px;">
        <thead>
          <tr><th>case</th><th>title</th><th>gate</th><th>runs observed</th><th>pass rate</th><th>flagged because</th></tr>
        </thead>
        <tbody>${monitoredCaseRows}</tbody>
      </table>
      <ul>${renderList(postMarketMonitoring.residual_gaps)}</ul>
    </div>

    <div class="card">
      <h2>Uncovered areas</h2>
      <ul>${renderList(annexIv.uncovered_areas)}</ul>
    </div>

    <div class="card">
      <h2>Evidence index summary</h2>
      <div class="muted">${escHtml(String(evidenceIndex.clauses.length))} clauses · ${escHtml(String(evidenceIndex.manifest_items.length))} manifest-backed artifacts indexed</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildEuAiActComplianceBundle(params: {
  report: CompareReport;
  manifest: Manifest;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  bundleArtifacts?: EuAiActBundleArtifacts;
}): EuAiActComplianceBundle | undefined {
  const coverage = (params.report.compliance_coverage ?? []).filter((entry) => entry.framework === "EU_AI_ACT");
  if (!coverage.length) return undefined;

  const generatedAt = Date.now();
  const bundleArtifacts = params.bundleArtifacts ?? buildEuAiActBundleArtifacts();

      const coverageExport: EuAiActCoverageExport = {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: generatedAt,
    bundle_artifacts: {
      compare_report_href: bundleArtifacts.compare_report_href,
      evaluator_report_html_href: bundleArtifacts.evaluator_report_html_href,
      manifest_href: bundleArtifacts.manifest_href,
      coverage_href: bundleArtifacts.coverage_href,
      annex_iv_href: bundleArtifacts.annex_iv_href,
      report_html_href: bundleArtifacts.report_html_href,
      evidence_index_href: bundleArtifacts.evidence_index_href,
      article_13_instructions_href: bundleArtifacts.article_13_instructions_href,
      article_9_risk_register_href: bundleArtifacts.article_9_risk_register_href,
      article_72_monitoring_plan_href: bundleArtifacts.article_72_monitoring_plan_href,
      article_17_qms_lite_href: bundleArtifacts.article_17_qms_lite_href,
      human_oversight_summary_href: bundleArtifacts.human_oversight_summary_href,
      release_review_href: bundleArtifacts.release_review_href,
      post_market_monitoring_href: bundleArtifacts.post_market_monitoring_href,
    },
    coverage,
  };

  const evidenceIndex = buildEvidenceIndex({
    report: params.report,
    manifest: params.manifest,
    coverage,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const annexIv = buildAnnexIvExport({
    report: params.report,
    coverage,
    evidenceIndex,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const humanOversightSummary = buildEuAiActHumanOversightSummary({
    report: params.report,
    coverage,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const releaseReview = buildEuAiActReleaseReview({
    report: params.report,
    coverage,
    oversightSummary: humanOversightSummary,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article13Instructions = buildArticle13Instructions({
    report: params.report,
    coverage,
    annexIv,
    oversightSummary: humanOversightSummary,
    releaseReview,
    postMarketMonitoring: params.postMarketMonitoring,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article9RiskRegister = buildArticle9RiskRegister({
    report: params.report,
    coverage,
    postMarketMonitoring: params.postMarketMonitoring,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article72MonitoringPlan = buildArticle72MonitoringPlan({
    report: params.report,
    coverage,
    article13Instructions,
    article9RiskRegister,
    releaseReview,
    postMarketMonitoring: params.postMarketMonitoring,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article17QmsLite = buildArticle17QmsLite({
    report: params.report,
    coverage,
    article13Instructions,
    article9RiskRegister,
    article72MonitoringPlan,
    releaseReview,
    humanOversightSummary,
    postMarketMonitoring: params.postMarketMonitoring,
    annexIv,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });

  return {
    exports: {
      coverage_href: bundleArtifacts.coverage_href,
      annex_iv_href: bundleArtifacts.annex_iv_href,
      report_html_href: bundleArtifacts.report_html_href,
      evidence_index_href: bundleArtifacts.evidence_index_href,
      article_13_instructions_href: bundleArtifacts.article_13_instructions_href,
      article_9_risk_register_href: bundleArtifacts.article_9_risk_register_href,
      article_72_monitoring_plan_href: bundleArtifacts.article_72_monitoring_plan_href,
      article_17_qms_lite_href: bundleArtifacts.article_17_qms_lite_href,
      human_oversight_summary_href: bundleArtifacts.human_oversight_summary_href,
      release_review_href: bundleArtifacts.release_review_href,
      post_market_monitoring_href: bundleArtifacts.post_market_monitoring_href,
    },
    coverageExport,
    evidenceIndex,
    annexIv,
    article13Instructions,
    article9RiskRegister,
    article72MonitoringPlan,
    article17QmsLite,
    humanOversightSummary,
    releaseReview,
    postMarketMonitoring: params.postMarketMonitoring,
    reportHtml: renderEuAiActHtml({
      annexIv,
      evidenceIndex,
      article13Instructions,
      article9RiskRegister,
      article72MonitoringPlan,
      article17QmsLite,
      humanOversightSummary,
      releaseReview,
      postMarketMonitoring: params.postMarketMonitoring,
    }),
  };
}
