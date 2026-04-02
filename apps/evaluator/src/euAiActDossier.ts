import { escHtml } from "./htmlFormatters";
import type { EuAiActPostMarketMonitoring } from "./euAiActMonitoring";
import {
  buildEuAiActHumanOversightSummary,
  buildEuAiActReleaseReview,
  type EuAiActBundleArtifacts,
  type EuAiActHumanOversightSummary,
  type EuAiActReleaseReview,
} from "./euAiActGovernance";
import { listMissingEuAiActEnvironmentFields } from "./evaluatorMetadata";
import type { Manifest } from "./manifest";
import type { CompareReport, ComplianceCoverageEntry } from "./reportTypes";

export type EuAiActContractMode = "minimum" | "full";

export type EuAiActBundleExports = Pick<
  EuAiActBundleArtifacts,
  | "annex_iv_href"
  | "article_10_data_governance_href"
  | "article_13_instructions_href"
  | "article_16_provider_obligations_href"
  | "article_43_conformity_assessment_href"
  | "article_47_declaration_of_conformity_href"
  | "article_9_risk_register_href"
  | "article_72_monitoring_plan_href"
  | "article_17_qms_lite_href"
  | "annex_v_declaration_content_href"
  | "human_oversight_summary_href"
  | "post_market_monitoring_href"
> &
  Partial<Pick<EuAiActBundleArtifacts, "release_review_href">> &
  Pick<
    EuAiActBundleArtifacts,
    | "coverage_href"
    | "report_html_href"
    | "reviewer_html_href"
    | "reviewer_markdown_href"
    | "evidence_index_href"
    | "article_73_serious_incident_pack_href"
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

export type EuAiActArticle10DataGovernanceExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_10";
    generated_scope: "data_governance_scaffold";
    operator_inputs_required: string[];
  };
  governed_system: {
    report_id: string;
    environment?: CompareReport["environment"];
    toolkit_version: string;
    spec_version: string;
  };
  available_evidence: {
    manifest_href: string;
    compare_report_href: string;
    evaluator_report_html_href: string;
    retained_case_artifact_count: number;
    monitored_case_count: number;
    trace_anchor_coverage?: CompareReport["summary"]["trace_anchor_coverage"];
  };
  data_governance_sections: Array<{
    id:
      | "data_sources_and_provenance"
      | "data_relevance_and_representativeness"
      | "data_quality_and_possible_bias"
      | "data_preparation_operations";
    title: string;
    supporting_artifacts: string[];
    operator_inputs_required: string[];
  }>;
  residual_gaps: string[];
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
    agent_version?: string;
    model?: string;
    model_version?: string;
    prompt_version?: string;
    tools_version?: string;
    config_hash?: string;
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
    agent_version?: string;
    model?: string;
    model_version?: string;
    prompt_version?: string;
    tools_version?: string;
    config_hash?: string;
    execution_quality_status: CompareReport["summary"]["execution_quality"]["status"];
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

export type EuAiActArticle16ProviderObligationsExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_16";
    generated_scope: "provider_obligations_scaffold";
    operator_inputs_required: string[];
  };
  provider_identity: {
    report_id: string;
    environment?: CompareReport["environment"];
    toolkit_version: string;
    spec_version: string;
  };
  obligations: Array<{
    id:
      | "ensure_section_2_compliance_article_16"
      | "documentation_keeping_article_18"
      | "automatically_generated_logs_article_19"
      | "corrective_actions_and_duty_of_information_article_20"
      | "cooperation_with_competent_authorities_article_21"
      | "ce_marking_article_48"
      | "registration_article_49"
      | "run_conformity_assessment_article_43"
      | "keep_declaration_and_marking_records_article_47_annex_v";
    article_ref:
      | "Art_16"
      | "Art_18"
      | "Art_19"
      | "Art_20"
      | "Art_21"
      | "Art_43"
      | "Art_47"
      | "Art_48"
      | "Art_49"
      | "Annex_V";
    title: string;
    supporting_artifacts: string[];
    operator_inputs_required: string[];
  }>;
  residual_gaps: string[];
};

export type EuAiActArticle43ConformityAssessmentExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_43";
    generated_scope: "conformity_assessment_scaffold";
    operator_inputs_required: string[];
  };
  assessed_system: {
    report_id: string;
    environment?: CompareReport["environment"];
    execution_quality_status: CompareReport["summary"]["execution_quality"]["status"];
  };
  conformity_route_inputs: {
    supporting_artifacts: string[];
    operator_inputs_required: string[];
  };
  pre_assessment_checks: string[];
  residual_gaps: string[];
};

export type EuAiActArticle47DeclarationOfConformityExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_47";
    generated_scope: "declaration_of_conformity_scaffold";
    operator_inputs_required: string[];
  };
  declared_system: {
    report_id: string;
    environment?: CompareReport["environment"];
    toolkit_version: string;
    spec_version: string;
  };
  declaration_inputs: {
    supporting_artifacts: string[];
    operator_inputs_required: string[];
  };
  residual_gaps: string[];
};

export type EuAiActAnnexVDeclarationContentExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    annex: "Annex_V";
    generated_scope: "declaration_content_scaffold";
    operator_inputs_required: string[];
  };
  declaration_content_items: Array<{
    id:
      | "provider_identification"
      | "system_identification"
      | "conformity_statement"
      | "reference_to_harmonised_standards_or_specifications"
      | "notified_body_and_procedure"
      | "declaration_date_place_signature";
    title: string;
    supporting_artifacts: string[];
    operator_inputs_required: string[];
  }>;
  residual_gaps: string[];
};

export type EuAiActArticle73SeriousIncidentTrigger = {
  id: string;
  trigger_type:
    | "degraded_execution"
    | "blocking_case"
    | "high_critical_security_signal"
    | "drift_signal"
    | "release_reject"
    | "approval_queue";
  severity: "review" | "urgent";
  summary: string;
  case_ids: string[];
  artifact_hrefs: string[];
};

export type EuAiActArticle73SeriousIncidentPackExport = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActCoverageExport["bundle_artifacts"];
  document_scope: {
    article: "Art_73";
    generated_scope: "technical_serious_incident_triage_scaffold";
    operator_inputs_required: string[];
  };
  current_assessment: {
    machine_triage_status: "monitor" | "review_for_serious_incident";
    trigger_count: number;
    blocking_case_count: number;
    approval_case_count: number;
    high_or_critical_signal_count: number;
    drift_detected: boolean;
    release_decision_status: EuAiActReleaseReview["release_decision"]["status"];
    rationale: string[];
  };
  triggers: EuAiActArticle73SeriousIncidentTrigger[];
  notification_preparation: {
    recommended_artifacts: string[];
    reporting_fields_required: string[];
    operator_inputs_required: string[];
  };
  corrective_action_linkage: {
    required_human_actions: string[];
    related_artifacts: string[];
    qms_process_refs: string[];
  };
  residual_gaps: string[];
};

export type EuAiActComplianceBundle = {
  exports: EuAiActBundleExports;
  coverageExport: EuAiActCoverageExport;
  evidenceIndex: EuAiActEvidenceIndex;
  annexIv: EuAiActAnnexIvExport;
  article10DataGovernance: EuAiActArticle10DataGovernanceExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article16ProviderObligations: EuAiActArticle16ProviderObligationsExport;
  article43ConformityAssessment: EuAiActArticle43ConformityAssessmentExport;
  article47DeclarationOfConformity: EuAiActArticle47DeclarationOfConformityExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  annexVDeclarationContent: EuAiActAnnexVDeclarationContentExport;
  humanOversightSummary: EuAiActHumanOversightSummary;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  article73SeriousIncidentPack?: EuAiActArticle73SeriousIncidentPackExport;
  releaseReview?: EuAiActReleaseReview;
  reportHtml?: string;
  reviewerHtml?: string;
  reviewerMarkdown?: string;
};

export function buildEuAiActBundleArtifacts(contract: EuAiActContractMode = "full"): EuAiActBundleArtifacts {
  const baseArtifacts: EuAiActBundleArtifacts = {
    compare_report_href: "compare-report.json",
    evaluator_report_html_href: "report.html",
    manifest_href: "artifacts/manifest.json",
    annex_iv_href: "compliance/eu-ai-act-annex-iv.json",
    article_10_data_governance_href: "compliance/article-10-data-governance.json",
    article_13_instructions_href: "compliance/article-13-instructions.json",
    article_16_provider_obligations_href: "compliance/article-16-provider-obligations.json",
    article_43_conformity_assessment_href: "compliance/article-43-conformity-assessment.json",
    article_47_declaration_of_conformity_href: "compliance/article-47-declaration-of-conformity.json",
    article_9_risk_register_href: "compliance/article-9-risk-register.json",
    article_72_monitoring_plan_href: "compliance/article-72-monitoring-plan.json",
    article_17_qms_lite_href: "compliance/article-17-qms-lite.json",
    annex_v_declaration_content_href: "compliance/annex-v-declaration-content.json",
    human_oversight_summary_href: "compliance/human-oversight-summary.json",
    post_market_monitoring_href: "compliance/post-market-monitoring.json",
  };
  if (contract === "minimum") {
    return baseArtifacts;
  }
  return {
    ...baseArtifacts,
    release_review_href: "compliance/release-review.json",
    coverage_href: "compliance/eu-ai-act-coverage.json",
    report_html_href: "compliance/eu-ai-act-report.html",
    reviewer_html_href: "compliance/eu-ai-act-reviewer.html",
    reviewer_markdown_href: "compliance/eu-ai-act-reviewer.md",
    evidence_index_href: "compliance/evidence-index.json",
    article_73_serious_incident_pack_href: "compliance/article-73-serious-incident-pack.json",
  };
}

export function buildEuAiActBundleExports(bundleArtifacts: EuAiActBundleArtifacts): EuAiActBundleExports {
  return {
    annex_iv_href: bundleArtifacts.annex_iv_href,
    article_10_data_governance_href: bundleArtifacts.article_10_data_governance_href,
    article_13_instructions_href: bundleArtifacts.article_13_instructions_href,
    article_16_provider_obligations_href: bundleArtifacts.article_16_provider_obligations_href,
    article_43_conformity_assessment_href: bundleArtifacts.article_43_conformity_assessment_href,
    article_47_declaration_of_conformity_href: bundleArtifacts.article_47_declaration_of_conformity_href,
    article_9_risk_register_href: bundleArtifacts.article_9_risk_register_href,
    article_72_monitoring_plan_href: bundleArtifacts.article_72_monitoring_plan_href,
    article_17_qms_lite_href: bundleArtifacts.article_17_qms_lite_href,
    annex_v_declaration_content_href: bundleArtifacts.annex_v_declaration_content_href,
    human_oversight_summary_href: bundleArtifacts.human_oversight_summary_href,
    post_market_monitoring_href: bundleArtifacts.post_market_monitoring_href,
    ...(bundleArtifacts.release_review_href ? { release_review_href: bundleArtifacts.release_review_href } : {}),
    ...(bundleArtifacts.coverage_href ? { coverage_href: bundleArtifacts.coverage_href } : {}),
    ...(bundleArtifacts.report_html_href ? { report_html_href: bundleArtifacts.report_html_href } : {}),
    ...(bundleArtifacts.reviewer_html_href ? { reviewer_html_href: bundleArtifacts.reviewer_html_href } : {}),
    ...(bundleArtifacts.reviewer_markdown_href ? { reviewer_markdown_href: bundleArtifacts.reviewer_markdown_href } : {}),
    ...(bundleArtifacts.evidence_index_href ? { evidence_index_href: bundleArtifacts.evidence_index_href } : {}),
    ...(bundleArtifacts.article_73_serious_incident_pack_href
      ? { article_73_serious_incident_pack_href: bundleArtifacts.article_73_serious_incident_pack_href }
      : {}),
  };
}

function buildBundleArtifactRefs(bundleArtifacts: EuAiActBundleArtifacts): EuAiActCoverageExport["bundle_artifacts"] {
  return {
    compare_report_href: bundleArtifacts.compare_report_href,
    evaluator_report_html_href: bundleArtifacts.evaluator_report_html_href,
    manifest_href: bundleArtifacts.manifest_href,
    ...buildEuAiActBundleExports(bundleArtifacts),
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
        ...(item.artifacts.baseline_tool_telemetry_href
          ? { baseline_tool_telemetry_href: item.artifacts.baseline_tool_telemetry_href }
          : {}),
        ...(item.artifacts.new_tool_telemetry_href ? { new_tool_telemetry_href: item.artifacts.new_tool_telemetry_href } : {}),
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
        item.artifacts.baseline_tool_telemetry_href,
        item.artifacts.new_tool_telemetry_href,
        item.artifacts.baseline_trace_anchor_href,
        item.artifacts.new_trace_anchor_href,
      ].filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  ).length;
}

function buildArticle10DataGovernance(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle10DataGovernanceExport {
  const art10Coverage = params.coverage.filter((entry) => entry.clause === "Art_10");
  const operatorInputsRequired = [
    "training, validation, and testing data sources and provenance",
    "data collection criteria, inclusion and exclusion rules, and representativeness rationale",
    "known data limitations, possible bias, and data-quality review results",
    "data preparation operations used before training, validation, or testing",
  ];

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_10",
      generated_scope: "data_governance_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    governed_system: {
      report_id: params.report.report_id,
      ...(params.report.environment ? { environment: params.report.environment } : {}),
      toolkit_version: params.report.meta.toolkit_version,
      spec_version: params.report.meta.spec_version,
    },
    available_evidence: {
      manifest_href: params.bundleArtifacts.manifest_href,
      compare_report_href: params.bundleArtifacts.compare_report_href,
      evaluator_report_html_href: params.bundleArtifacts.evaluator_report_html_href,
      retained_case_artifact_count: retainedCaseArtifactCount(params.report),
      monitored_case_count: params.report.summary.data_coverage.total_cases,
      ...(params.report.summary.trace_anchor_coverage
        ? { trace_anchor_coverage: params.report.summary.trace_anchor_coverage }
        : {}),
    },
    data_governance_sections: [
      {
        id: "data_sources_and_provenance",
        title: "Training, validation, and testing data sources and provenance",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.compare_report_href,
          params.bundleArtifacts.manifest_href,
        ],
        operator_inputs_required: [
          "identify each dataset or data source used for training, validation, and testing",
          "state where the data comes from and under what collection or access basis it is used",
        ],
      },
      {
        id: "data_relevance_and_representativeness",
        title: "Data relevance, representativeness, and scope",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.compare_report_href,
        ],
        operator_inputs_required: [
          "state why the data is relevant for the intended purpose of the relevant AI system",
          "state how representativeness, completeness, and possible gaps were reviewed",
        ],
      },
      {
        id: "data_quality_and_possible_bias",
        title: "Data quality checks and possible bias review",
        supporting_artifacts: [
          params.bundleArtifacts.compare_report_href,
          params.bundleArtifacts.evaluator_report_html_href,
        ],
        operator_inputs_required: [
          "record known errors, imbalances, limitations, and possible bias affecting health, safety, or fundamental rights",
          "record any measures used to detect, reduce, or document those issues",
        ],
      },
      {
        id: "data_preparation_operations",
        title: "Data preparation operations",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.compare_report_href,
          params.bundleArtifacts.manifest_href,
        ],
        operator_inputs_required: [
          "record data cleaning, labeling, filtering, augmentation, or transformation operations",
          "record the order and ownership of those preparation steps",
        ],
      },
    ],
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(art10Coverage),
      "System-specific data governance, provenance, bias review, and preparation details remain provider-authored.",
    ]),
  };
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
        "Document which operator role approves approval-required cases before live deployment.",
        "Document what remediation or review is required before relying on blocked cases.",
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
    item.gate_recommendation === "block" ? "Automatic gate recommends blocking operation for this case." : "",
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
      evidence_hrefs: ["compliance/post-market-monitoring.json", "compare-report.json"],
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
      "provider decision linkage for block or review risks",
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
      ...(params.report.environment?.agent_version ? { agent_version: params.report.environment.agent_version } : {}),
      ...(params.report.environment?.model ? { model: params.report.environment.model } : {}),
      ...(params.report.environment?.model_version ? { model_version: params.report.environment.model_version } : {}),
      ...(params.report.environment?.prompt_version ? { prompt_version: params.report.environment.prompt_version } : {}),
      ...(params.report.environment?.tools_version ? { tools_version: params.report.environment.tools_version } : {}),
      ...(params.report.environment?.config_hash ? { config_hash: params.report.environment.config_hash } : {}),
      scope: params.postMarketMonitoring.summary.scope,
      monitoring_status: params.postMarketMonitoring.summary.monitoring_status,
      current_run_included_in_history: params.postMarketMonitoring.summary.current_run_included_in_history,
      runs_in_window: params.postMarketMonitoring.summary.runs_in_window,
      prior_runs_in_window: params.postMarketMonitoring.summary.prior_runs_in_window,
      monitored_case_count: params.postMarketMonitoring.summary.monitored_case_count,
    },
    monitoring_objectives: [
      "Detect regressions, approval paths, and blocking findings after placing on the market, putting into service, or during recurring provider review.",
      "Track recurring drift, risk concentration, and signal accumulation across monitored runs.",
      "Preserve a portable evidence path from current system evidence to recurring governance review.",
      "Escalate material findings to provider, security, compliance, or legal owners before relying on the system in scope.",
    ],
    data_sources: [
      {
        id: "current_release_evidence",
        description: "Current report bundle used as the baseline evidence source for provider or monitoring review.",
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
        description: "Oversight queue and risk-review artifacts used to route approval, blocking, and reviewer follow-up decisions.",
        cadence: "per_release",
        artifact_hrefs: [
          params.bundleArtifacts.human_oversight_summary_href,
          params.bundleArtifacts.article_9_risk_register_href,
          params.bundleArtifacts.compare_report_href,
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
        recommended_cadence: "Before each material change is relied on or put into service",
        rationale: "Material changes should refresh the monitoring baseline before the system is relied on in scope.",
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
        required_roles: ["provider operations owner", "platform engineer"],
        artifact_hrefs: [params.bundleArtifacts.compare_report_href, params.bundleArtifacts.article_9_risk_register_href],
      },
      {
        id: "blocking-case-present",
        condition: "One or more cases recommend blocking operation.",
        recommended_response: "block",
        required_roles: ["provider operations owner", "security or compliance reviewer"],
        artifact_hrefs: [params.bundleArtifacts.compare_report_href, params.bundleArtifacts.article_9_risk_register_href],
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
        artifact_hrefs: [params.bundleArtifacts.post_market_monitoring_href, params.bundleArtifacts.article_9_risk_register_href],
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
      "Apply remediation, rerun the relevant cases or evaluation workflow, and replace stale evidence.",
      "Escalate to legal or compliance review when the finding changes deployment assumptions, market scope, or residual-risk acceptance.",
    ],
    current_baseline: {
      execution_quality_status: params.report.summary.execution_quality.status,
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
        "Current compare-report and oversight outputs preserve approval and blocking signals for the current bundle.",
        "The evidence bundle preserves compare-report, report.html, and manifest references for each packaged run.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.compare_report_href,
        params.bundleArtifacts.human_oversight_summary_href,
        params.bundleArtifacts.evaluator_report_html_href,
      ],
      operator_inputs_required: [
        "define what counts as a material change",
        "name approvers for operation and rollback decisions",
      ],
      residual_gaps: [
        "Formal change-approval workflow and document ownership remain operator-authored.",
      ],
    },
    {
      id: "testing_and_validation",
      title: "Testing and validation",
      objective: "Keep validation, risk review, and evidence refresh repeatable for every meaningful change.",
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
        "Risk register and oversight outputs capture degraded execution, blocking cases, and human follow-up needs.",
        "Monitoring plan scaffold defines event-driven escalation triggers for drift and blocking findings.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.article_9_risk_register_href,
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
      ].filter((href): href is string => Boolean(href)),
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
      title: "Oversight and operational control",
      objective: "Bind human oversight, approval, and deployer-facing instructions into one governed provider path.",
      current_controls: [
        "Human oversight summary records approval-required and blocked cases.",
        "Article 13 instructions scaffold records oversight and escalation expectations for deployers and operators.",
      ],
      evidence_hrefs: [
        params.bundleArtifacts.human_oversight_summary_href,
        params.bundleArtifacts.article_13_instructions_href,
        params.bundleArtifacts.article_9_risk_register_href,
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
      objective: "Run recurring monitoring, detect drift, and feed monitoring outcomes back into risk and provider decisions.",
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
      ...(params.report.environment?.agent_version ? { agent_version: params.report.environment.agent_version } : {}),
      ...(params.report.environment?.model ? { model: params.report.environment.model } : {}),
      ...(params.report.environment?.model_version ? { model_version: params.report.environment.model_version } : {}),
      ...(params.report.environment?.prompt_version ? { prompt_version: params.report.environment.prompt_version } : {}),
      ...(params.report.environment?.tools_version ? { tools_version: params.report.environment.tools_version } : {}),
      ...(params.report.environment?.config_hash ? { config_hash: params.report.environment.config_hash } : {}),
      execution_quality_status: params.report.summary.execution_quality.status,
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
        role: "provider operations owner",
        responsibilities: [
          "Decide whether the current system state can proceed, requires review, or must be blocked.",
          "Ensure material changes trigger evidence refresh before the system is relied on in scope.",
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
      "One or more cases recommend blocking operation or require human approval.",
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

function buildArticle16ProviderObligations(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle16ProviderObligationsExport {
  const providerObligationCoverage = params.coverage.filter((entry) =>
    ["Art_16", "Art_18", "Art_19", "Art_20", "Art_21", "Art_48", "Art_49"].includes(entry.clause)
  );
  const operatorInputsRequired = [
    "provider-owned record of how Articles 9 to 15 are satisfied for the relevant AI system",
    "provider-owned record that technical documentation and QMS records are kept for 10 years after the system is placed on the market or put into service",
    "provider-owned record that automatically generated logs are kept for at least six months where those logs are under provider control",
    "provider-owned corrective-action and duty-to-inform record for non-conformity or risk situations",
    "provider-owned authority cooperation record covering documentation requests and access to automatically generated logs",
    "provider-owned record of CE marking application and access path where applicable",
    "provider-owned registration record for the relevant AI system where Article 49 applies",
    "provider-owned record of conformity assessment, declaration, CE marking, and registration where applicable",
  ];

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_16",
      generated_scope: "provider_obligations_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    provider_identity: {
      report_id: params.report.report_id,
      ...(params.report.environment ? { environment: params.report.environment } : {}),
      toolkit_version: params.report.meta.toolkit_version,
      spec_version: params.report.meta.spec_version,
    },
    obligations: [
      {
        id: "ensure_section_2_compliance_article_16",
        article_ref: "Art_16",
        title: "Provider responsibility to ensure compliance with Articles 9 to 15",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.article_9_risk_register_href,
          params.bundleArtifacts.article_13_instructions_href,
        ],
        operator_inputs_required: [
          "identify the provider owner who approves the Section 2 compliance record",
        ],
      },
      {
        id: "documentation_keeping_article_18",
        article_ref: "Art_18",
        title: "Keep technical documentation, QMS documentation, and related records available for 10 years",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.article_17_qms_lite_href,
          params.bundleArtifacts.article_43_conformity_assessment_href,
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
        ],
        operator_inputs_required: [
          "state where the Article 11 technical documentation is stored and how it stays available for 10 years after placing on the market or putting into service",
          "state where the Article 17 quality-management documentation is stored and how it stays available for 10 years after placing on the market or putting into service",
          "state where notified-body decisions and other applicable conformity records are retained when that route applies",
        ],
      },
      {
        id: "automatically_generated_logs_article_19",
        article_ref: "Art_19",
        title: "Keep automatically generated logs for an appropriate period of at least six months",
        supporting_artifacts: [
          params.bundleArtifacts.compare_report_href,
          params.bundleArtifacts.manifest_href,
          params.bundleArtifacts.article_13_instructions_href,
        ],
        operator_inputs_required: [
          "state which automatically generated logs are under provider control for the relevant AI system",
          "state the retention period applied to those logs and confirm that it is at least six months unless another Union or national law requires otherwise",
          "state how those logs can be retrieved when needed for conformity, monitoring, or authority access",
        ],
      },
      {
        id: "run_conformity_assessment_article_43",
        article_ref: "Art_43",
        title: "Ensure the required conformity assessment procedure is completed before placing on the market or putting into service",
        supporting_artifacts: [
          params.bundleArtifacts.article_43_conformity_assessment_href,
          params.bundleArtifacts.article_17_qms_lite_href,
        ],
        operator_inputs_required: [
          "record the conformity assessment route used for the relevant AI system",
        ],
      },
      {
        id: "ce_marking_article_48",
        article_ref: "Art_48",
        title: "Affix CE marking in the required form for the relevant high-risk AI system",
        supporting_artifacts: [
          params.bundleArtifacts.article_43_conformity_assessment_href,
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
          params.bundleArtifacts.annex_v_declaration_content_href,
        ],
        operator_inputs_required: [
          "record how CE marking is affixed or made digitally accessible for the relevant AI system",
          "record whether notified-body identification must accompany the CE marking where that route applies",
          "record where the CE marking appears in packaging, documentation, interface, or other delivery material for the relevant AI system",
        ],
      },
      {
        id: "registration_article_49",
        article_ref: "Art_49",
        title: "Register the provider and the relevant AI system where Article 49 applies",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.article_43_conformity_assessment_href,
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
          params.bundleArtifacts.annex_v_declaration_content_href,
        ],
        operator_inputs_required: [
          "record whether Article 49 registration applies to the relevant AI system",
          "record the EU database or national registration route used where registration applies",
          "record the registration reference and the owner responsible for keeping it current where registration applies",
        ],
      },
      {
        id: "keep_declaration_and_marking_records_article_47_annex_v",
        article_ref: "Art_47",
        title: "Draw up and keep the EU declaration of conformity and related records",
        supporting_artifacts: [
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
          params.bundleArtifacts.annex_v_declaration_content_href,
        ],
        operator_inputs_required: [
          "record the signed declaration, references, and any CE marking or registration records that apply",
        ],
      },
      {
        id: "corrective_actions_and_duty_of_information_article_20",
        article_ref: "Art_20",
        title: "Take corrective action and inform relevant parties when the system is not in conformity or presents a risk",
        supporting_artifacts: [
          params.bundleArtifacts.article_9_risk_register_href,
          params.bundleArtifacts.article_72_monitoring_plan_href,
          params.bundleArtifacts.post_market_monitoring_href,
          params.bundleArtifacts.article_17_qms_lite_href,
        ],
        operator_inputs_required: [
          "record the corrective-action owner and the workflow used to bring the system back into conformity",
          "record when withdrawal, disabling, or recall would be used for the relevant AI system",
          "record who must be informed without undue delay, including distributors, importers, deployers, authorised representatives, competent authorities, and the notified body where applicable",
        ],
      },
      {
        id: "cooperation_with_competent_authorities_article_21",
        article_ref: "Art_21",
        title: "Provide information, documentation, and access to logs to competent authorities upon a reasoned request",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.compare_report_href,
          params.bundleArtifacts.article_13_instructions_href,
        ],
        operator_inputs_required: [
          "record the contact route used to answer a reasoned request from a competent authority",
          "record how the provider supplies the information and documentation necessary to demonstrate conformity in an easily understood language requested by the authority",
          "record how access to automatically generated logs under provider control is granted when requested by a competent authority",
        ],
      },
    ],
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(providerObligationCoverage),
      ...params.article9RiskRegister.residual_gaps,
      ...params.article13Instructions.residual_gaps,
      ...params.article17QmsLite.residual_gaps,
      ...params.article72MonitoringPlan.residual_gaps,
      "Article 16 remains provider-owned and requires completion of the formal provider obligations record.",
    ]),
  };
}

function buildArticle43ConformityAssessment(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle43ConformityAssessmentExport {
  const art43Coverage = params.coverage.filter((entry) => entry.clause === "Art_43");
  const operatorInputsRequired = [
    "identify the conformity assessment procedure used for the relevant AI system",
    "identify whether a notified body is involved and keep the resulting records where applicable",
    "record the provider decision that the system may be placed on the market or put into service only after the required procedure is complete",
  ];

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_43",
      generated_scope: "conformity_assessment_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    assessed_system: {
      report_id: params.report.report_id,
      ...(params.report.environment ? { environment: params.report.environment } : {}),
      execution_quality_status: params.report.summary.execution_quality.status,
    },
    conformity_route_inputs: {
      supporting_artifacts: [
        params.bundleArtifacts.annex_iv_href,
        params.bundleArtifacts.article_9_risk_register_href,
        params.bundleArtifacts.article_13_instructions_href,
        params.bundleArtifacts.article_17_qms_lite_href,
        params.bundleArtifacts.article_72_monitoring_plan_href,
      ],
      operator_inputs_required: operatorInputsRequired,
    },
    pre_assessment_checks: [
      "Confirm the relevant AI system, version, and intended purpose covered by the assessment record.",
      "Confirm that the technical documentation, risk management, deployer information, oversight, and monitoring records used in the assessment are current.",
      "Confirm the conformity assessment route used for the relevant AI system and whether notified-body involvement applies.",
      "Confirm that the provider decision to place on the market or put into service is tied to the completed conformity assessment record.",
    ],
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(art43Coverage),
      ...params.article9RiskRegister.residual_gaps,
      ...params.article13Instructions.residual_gaps,
      ...params.article17QmsLite.residual_gaps,
      ...params.article72MonitoringPlan.residual_gaps,
      "Article 43 requires a provider-owned conformity assessment record for the relevant AI system.",
    ]),
  };
}

function buildArticle47DeclarationOfConformity(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  article43ConformityAssessment: EuAiActArticle43ConformityAssessmentExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle47DeclarationOfConformityExport {
  const art47Coverage = params.coverage.filter((entry) => entry.clause === "Art_47");
  const operatorInputsRequired = [
    "draw up the EU declaration of conformity before placing the system on the market or putting it into service",
    "keep the declaration under the responsibility of the provider",
    "identify the signatory, date, place, and controlled version of the declaration",
  ];

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_47",
      generated_scope: "declaration_of_conformity_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    declared_system: {
      report_id: params.report.report_id,
      ...(params.report.environment ? { environment: params.report.environment } : {}),
      toolkit_version: params.report.meta.toolkit_version,
      spec_version: params.report.meta.spec_version,
    },
    declaration_inputs: {
      supporting_artifacts: [
        params.bundleArtifacts.article_43_conformity_assessment_href,
        params.bundleArtifacts.annex_v_declaration_content_href,
        params.bundleArtifacts.annex_iv_href,
        params.bundleArtifacts.article_17_qms_lite_href,
      ],
      operator_inputs_required: operatorInputsRequired,
    },
    residual_gaps: uniqueStrings([
      ...collectResidualGaps(art47Coverage),
      ...params.article43ConformityAssessment.residual_gaps,
      ...params.article17QmsLite.residual_gaps,
      "Article 47 requires a provider-signed EU declaration of conformity for the relevant AI system.",
    ]),
  };
}

function buildAnnexVDeclarationContent(params: {
  report: CompareReport;
  article43ConformityAssessment: EuAiActArticle43ConformityAssessmentExport;
  article47DeclarationOfConformity: EuAiActArticle47DeclarationOfConformityExport;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActAnnexVDeclarationContentExport {
  const operatorInputsRequired = [
    "provider identification and contact details",
    "identification of the relevant AI system and version covered by the declaration",
    "conformity statement and references to the applicable Union harmonisation legislation",
    "references to harmonised standards, common specifications, and notified-body information where applicable",
    "date, place, name, and signature of the person empowered to sign for the provider",
  ];

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      annex: "Annex_V",
      generated_scope: "declaration_content_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    declaration_content_items: [
      {
        id: "provider_identification",
        title: "Provider name and address or other contact details",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
        ],
        operator_inputs_required: [
          "enter the provider's formal identification and contact details exactly as used in the declaration",
        ],
      },
      {
        id: "system_identification",
        title: "Identification of the AI system covered by the declaration",
        supporting_artifacts: [
          params.bundleArtifacts.annex_iv_href,
          params.bundleArtifacts.article_43_conformity_assessment_href,
        ],
        operator_inputs_required: [
          "identify the relevant AI system, version, and other identifiers covered by the declaration",
        ],
      },
      {
        id: "conformity_statement",
        title: "Statement that the declaration is issued under the sole responsibility of the provider",
        supporting_artifacts: [
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
        ],
        operator_inputs_required: [
          "complete the provider responsibility statement used in the final declaration",
        ],
      },
      {
        id: "reference_to_harmonised_standards_or_specifications",
        title: "References to harmonised standards or common specifications applied",
        supporting_artifacts: [
          params.bundleArtifacts.article_43_conformity_assessment_href,
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
        ],
        operator_inputs_required: [
          "record the standards, specifications, or other references relied on for conformity",
        ],
      },
      {
        id: "notified_body_and_procedure",
        title: "Notified body and conformity assessment procedure information where applicable",
        supporting_artifacts: [
          params.bundleArtifacts.article_43_conformity_assessment_href,
        ],
        operator_inputs_required: [
          "record the procedure used and any notified-body identity and certificate references where applicable",
        ],
      },
      {
        id: "declaration_date_place_signature",
        title: "Date, place, name, function, and signature",
        supporting_artifacts: [
          params.bundleArtifacts.article_47_declaration_of_conformity_href,
        ],
        operator_inputs_required: [
          "record the date, place, signatory name, signatory function, and signature details",
        ],
      },
    ],
    residual_gaps: uniqueStrings([
      ...params.article43ConformityAssessment.residual_gaps,
      ...params.article47DeclarationOfConformity.residual_gaps,
      "Annex V requires provider-completed declaration content for the relevant AI system.",
    ]),
  };
}

function highOrCriticalSignalCount(report: CompareReport): number {
  return Number(report.summary.security.signal_counts_new.high ?? 0) + Number(report.summary.security.signal_counts_new.critical ?? 0);
}

function buildArticle73Triggers(params: {
  report: CompareReport;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
}): EuAiActArticle73SeriousIncidentTrigger[] {
  const triggers: EuAiActArticle73SeriousIncidentTrigger[] = [];
  const pushTrigger = (trigger: EuAiActArticle73SeriousIncidentTrigger) => {
    if (triggers.some((item) => item.id === trigger.id)) return;
    triggers.push(trigger);
  };
  const blockingCaseIds = params.releaseReview.release_decision.blocking_case_ids;
  const approvalCaseIds = params.releaseReview.release_decision.approval_case_ids;
  const severeSignalCaseIds = uniqueStrings(
    params.report.items
      .filter((item) => item.security.new.signals.some((signal) => signal.severity === "high" || signal.severity === "critical"))
      .map((item) => item.case_id)
  );

  if (params.report.summary.execution_quality.status === "degraded") {
    pushTrigger({
      id: "degraded-execution",
      trigger_type: "degraded_execution",
      severity: "urgent",
      summary: `Execution quality is degraded: ${(params.report.summary.execution_quality.reasons || []).join("; ") || "see compare-report.json"}.`,
      case_ids: [],
      artifact_hrefs: [params.bundleArtifacts.compare_report_href, params.bundleArtifacts.release_review_href].filter(
        (href): href is string => typeof href === "string" && href.length > 0
      ),
    });
  }
  if (blockingCaseIds.length > 0) {
    pushTrigger({
      id: "blocking-cases-present",
      trigger_type: "blocking_case",
      severity: "urgent",
      summary: `${blockingCaseIds.length} blocking case(s) are present in the release review.`,
      case_ids: blockingCaseIds,
      artifact_hrefs: [
        params.bundleArtifacts.release_review_href,
        params.bundleArtifacts.human_oversight_summary_href,
        params.bundleArtifacts.article_9_risk_register_href,
      ].filter((href): href is string => typeof href === "string" && href.length > 0),
    });
  }
  if (highOrCriticalSignalCount(params.report) > 0) {
    pushTrigger({
      id: "high-critical-security-signals",
      trigger_type: "high_critical_security_signal",
      severity: "urgent",
      summary: `${highOrCriticalSignalCount(params.report)} high or critical security signal(s) were observed in the new run.`,
      case_ids: severeSignalCaseIds,
      artifact_hrefs: [params.bundleArtifacts.compare_report_href, params.bundleArtifacts.article_9_risk_register_href],
    });
  }
  if (params.postMarketMonitoring.summary.drift_detected) {
    pushTrigger({
      id: "monitoring-drift",
      trigger_type: "drift_signal",
      severity: "review",
      summary: `Monitoring detected drift: ${params.postMarketMonitoring.summary.drift_signals.join("; ") || "see post-market-monitoring.json"}.`,
      case_ids: [],
      artifact_hrefs: [params.bundleArtifacts.post_market_monitoring_href, params.bundleArtifacts.article_72_monitoring_plan_href],
    });
  }
  if (params.releaseReview.release_decision.status === "reject") {
    pushTrigger({
      id: "machine-release-reject",
      trigger_type: "release_reject",
      severity: "urgent",
      summary: "Machine release review currently rejects release for this bundle.",
      case_ids: blockingCaseIds,
      artifact_hrefs: [params.bundleArtifacts.release_review_href].filter(
        (href): href is string => typeof href === "string" && href.length > 0
      ),
    });
  }
  if (approvalCaseIds.length > 0) {
    pushTrigger({
      id: "approval-queue-open",
      trigger_type: "approval_queue",
      severity: "review",
      summary: `${approvalCaseIds.length} approval-required case(s) remain open for human review.`,
      case_ids: approvalCaseIds,
      artifact_hrefs: [params.bundleArtifacts.human_oversight_summary_href, params.bundleArtifacts.article_13_instructions_href],
    });
  }

  return triggers;
}

function buildArticle73SeriousIncidentPack(params: {
  report: CompareReport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
  bundleArtifacts: EuAiActCoverageExport["bundle_artifacts"];
  generatedAt: number;
}): EuAiActArticle73SeriousIncidentPackExport {
  const operatorInputsRequired = [
    "named serious-incident owner and escalation backup",
    "human determination of whether the event meets Article 73 serious-incident threshold",
    "authority, customer, and internal notification routing by jurisdiction",
    "incident impact assessment and affected-person analysis",
    "reporting deadline calculation and external communications approver",
  ];
  const triggers = buildArticle73Triggers({
    report: params.report,
    releaseReview: params.releaseReview,
    postMarketMonitoring: params.postMarketMonitoring,
    bundleArtifacts: params.bundleArtifacts,
  });
  const rationale = uniqueStrings([
    triggers.length > 0
      ? `${triggers.length} machine-detected trigger(s) require human incident review before concluding whether Article 73 reporting applies.`
      : "No machine trigger currently suggests a serious-incident review path from this bundle alone.",
    params.postMarketMonitoring.summary.drift_detected
      ? "Monitoring drift is present and should be reviewed for operational impact."
      : "",
    params.releaseReview.release_decision.status !== "approve"
      ? `Release review status is ${params.releaseReview.release_decision.status}.`
      : "",
    highOrCriticalSignalCount(params.report) > 0
      ? "High or critical security signals were observed in the packaged run."
      : "",
  ]);

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    document_scope: {
      article: "Art_73",
      generated_scope: "technical_serious_incident_triage_scaffold",
      operator_inputs_required: operatorInputsRequired,
    },
    current_assessment: {
      machine_triage_status: triggers.length > 0 ? "review_for_serious_incident" : "monitor",
      trigger_count: triggers.length,
      blocking_case_count: params.report.summary.cases_block_recommended,
      approval_case_count: params.report.summary.cases_requiring_approval,
      high_or_critical_signal_count: highOrCriticalSignalCount(params.report),
      drift_detected: params.postMarketMonitoring.summary.drift_detected,
      release_decision_status: params.releaseReview.release_decision.status,
      rationale,
    },
    triggers,
    notification_preparation: {
      recommended_artifacts: [
        params.bundleArtifacts.compare_report_href,
        params.bundleArtifacts.evaluator_report_html_href,
        params.bundleArtifacts.article_9_risk_register_href,
        params.bundleArtifacts.article_72_monitoring_plan_href,
        params.bundleArtifacts.article_17_qms_lite_href,
        params.bundleArtifacts.release_review_href,
        params.bundleArtifacts.post_market_monitoring_href,
      ].filter((href): href is string => typeof href === "string" && href.length > 0),
      reporting_fields_required: [
        "incident date and detection timestamp",
        "affected deployment context and users",
        "summary of harm or potential harm",
        "system version, model, and deployment identifiers",
        "mitigation taken, rollback status, and corrective-action owner",
      ],
      operator_inputs_required: operatorInputsRequired,
    },
    corrective_action_linkage: {
      required_human_actions: uniqueStrings([
        ...params.releaseReview.release_decision.required_human_actions,
        "Determine whether authority reporting is required and document the basis for the decision.",
      ]),
      related_artifacts: [
        params.bundleArtifacts.release_review_href,
        params.bundleArtifacts.post_market_monitoring_href,
        params.bundleArtifacts.article_72_monitoring_plan_href,
        params.bundleArtifacts.article_17_qms_lite_href,
      ].filter((href): href is string => typeof href === "string" && href.length > 0),
      qms_process_refs: uniqueStrings(
        params.article17QmsLite.process_areas
          .filter((area) => ["incident_and_corrective_action", "monitoring_and_feedback", "oversight_and_release_control"].includes(area.id))
          .map((area) => area.id)
      ),
    },
    residual_gaps: uniqueStrings([
      ...params.article9RiskRegister.residual_gaps,
      ...params.article72MonitoringPlan.residual_gaps,
      "This export does not decide whether the legal threshold for a serious incident has been met.",
      "Authority reporting workflow, deadlines, and jurisdiction-specific notification content remain operator-authored.",
      "Final incident narrative, impact assessment, and external communications approval remain outside the evaluator.",
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

type ReviewerEvidenceLink = {
  label: string;
  href: string;
  note?: string;
};

type ReviewerClaim = {
  claim: string;
  state: "machine_generated" | "operator_completed" | "still_missing";
  reviewerUse: string;
  evidence: ReviewerEvidenceLink[];
};

type ReviewerSection = {
  id: string;
  title: string;
  summary: string[];
  machineGenerated: string[];
  operatorOwned: string[];
  claims: ReviewerClaim[];
  evidence: ReviewerEvidenceLink[];
  openGaps: string[];
};

type ReviewerDocumentModel = {
  reportId: string;
  generatedAt: number;
  summary: string[];
  howToRead: string[];
  nonTechnicalGuide: string[];
  technicalGuide: string[];
  proves: string[];
  doesNotProve: string[];
  outputLinks: ReviewerEvidenceLink[];
  sections: ReviewerSection[];
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function compactList(values: Array<string | undefined>): string[] {
  return uniqueStrings(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0));
}

function markdownList(values: string[]): string {
  if (!values.length) return "- None.";
  return values.map((value) => `- ${value}`).join("\n");
}

function markdownLinks(values: ReviewerEvidenceLink[]): string {
  if (!values.length) return "- None.";
  return values
    .map((value) => `- [${value.label}](${value.href})${value.note ? ` — ${value.note}` : ""}`)
    .join("\n");
}

function markdownClaims(values: ReviewerClaim[]): string {
  if (!values.length) return "- None.";
  return values
    .map(
      (value) =>
        `- Claim: ${value.claim}\n` +
        `  - Status: ${formatClaimStateLabel(value.state)}\n` +
        `  - Reviewer use: ${value.reviewerUse}\n` +
        `  - Evidence:\n${indentMarkdown(markdownLinks(value.evidence), 4)}`
    )
    .join("\n");
}

function indentMarkdown(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function renderReviewerEvidenceRows(values: ReviewerEvidenceLink[]): string {
  if (!values.length) {
    return '<tr><td colspan="3">No linked files for this section.</td></tr>';
  }
  return values
    .map(
      (value) => `<tr>
  <td>${escHtml(value.label)}</td>
  <td><a href="${escHtml(value.href)}">${escHtml(value.href)}</a></td>
  <td>${escHtml(value.note ?? "-")}</td>
</tr>`
    )
    .join("");
}

function renderReviewerClaimRows(values: ReviewerClaim[]): string {
  if (!values.length) {
    return '<tr><td colspan="4">No claim-to-evidence rows for this section.</td></tr>';
  }
  return values
    .map(
      (value) => `<tr>
  <td>${escHtml(value.claim)}</td>
  <td>${escHtml(formatClaimStateLabel(value.state))}</td>
  <td>${escHtml(value.reviewerUse)}</td>
  <td>${renderInlineEvidenceLinks(value.evidence)}</td>
</tr>`
    )
    .join("");
}

function formatClaimStateLabel(value: ReviewerClaim["state"]): string {
  switch (value) {
    case "machine_generated":
      return "Generated here";
    case "operator_completed":
      return "Completed by the operator";
    case "still_missing":
      return "Still open";
    default:
      return String(value).replace(/_/g, " ");
  }
}

function renderInlineEvidenceLinks(values: ReviewerEvidenceLink[]): string {
  if (!values.length) return "-";
  return values
    .map((value) => `<a href="${escHtml(value.href)}">${escHtml(value.label)}</a>${value.note ? ` (${escHtml(value.note)})` : ""}`)
    .join("<br/>");
}

function pickReviewerEvidence(values: ReviewerEvidenceLink[], labels: string[]): ReviewerEvidenceLink[] {
  return labels.flatMap((label) => values.filter((value) => value.label === label));
}

function buildReviewerDocumentModel(params: {
  annexIv: EuAiActAnnexIvExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  article73SeriousIncidentPack: EuAiActArticle73SeriousIncidentPackExport;
  humanOversightSummary: EuAiActHumanOversightSummary;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
}): ReviewerDocumentModel {
  const {
    annexIv,
    article13Instructions,
    article9RiskRegister,
    article72MonitoringPlan,
    article17QmsLite,
    article73SeriousIncidentPack,
    humanOversightSummary,
    releaseReview,
    postMarketMonitoring,
  } = params;
  const coverageCounts = annexIv.clause_coverage.reduce(
    (acc, entry) => {
      acc[entry.status] += 1;
      return acc;
    },
    { covered: 0, partial: 0, missing: 0 } as Record<ComplianceCoverageEntry["status"], number>
  );
  const riskEntryTypeCounts = article9RiskRegister.entries.reduce(
    (acc, entry) => {
      acc[entry.source_type] = (acc[entry.source_type] ?? 0) + 1;
      return acc;
    },
    {} as Record<EuAiActArticle9RiskRegisterExport["entries"][number]["source_type"], number>
  );
  const commonOutputLinks: ReviewerEvidenceLink[] = [
    {
      label: "Reviewer PDF",
      href: "eu-ai-act-reviewer.pdf",
      note: "Printable reviewer-facing dossier generated during EU packaging.",
    },
    {
      label: "Reviewer HTML",
      href: "eu-ai-act-reviewer.html",
      note: "Linked reviewer-facing dossier for browser review.",
    },
    {
      label: "Reviewer Markdown",
      href: "eu-ai-act-reviewer.md",
      note: "Editable reviewer-facing dossier source.",
    },
    {
      label: "Expanded technical pack",
      href: "eu-ai-act-report.html",
      note: "Full engineering-facing Annex IV dossier with raw tables and detailed scaffolds.",
    },
    {
      label: "Annex IV JSON",
      href: "eu-ai-act-annex-iv.json",
      note: "Structured machine-readable Annex IV export.",
    },
    {
      label: "Article 10 data governance",
      href: "article-10-data-governance.json",
      note: "System-specific data-governance scaffold for the evaluated release.",
    },
    {
      label: "Article 16 provider obligations",
      href: "article-16-provider-obligations.json",
      note: "Provider-obligations scaffold tied to the evaluated system version.",
    },
    {
      label: "Article 43 conformity assessment",
      href: "article-43-conformity-assessment.json",
      note: "Conformity-assessment scaffold and route inputs for the evaluated system.",
    },
    {
      label: "Article 47 declaration scaffold",
      href: "article-47-declaration-of-conformity.json",
      note: "Declaration-of-conformity scaffold for the evaluated system version.",
    },
    {
      label: "Annex V declaration content",
      href: "annex-v-declaration-content.json",
      note: "Structured Annex V declaration-content scaffold.",
    },
    {
      label: "Compare report",
      href: "../compare-report.json",
      note: "Underlying release-qualification report for this run.",
    },
    {
      label: "Manifest",
      href: "../artifacts/manifest.json",
      note: "Portable evidence index for artifact integrity.",
    },
    {
      label: "Release review",
      href: "release-review.json",
      note: "Machine-generated release decision and reviewer checklist.",
    },
  ];

  const generalEvidence: ReviewerEvidenceLink[] = [
    { label: "Annex IV JSON", href: "eu-ai-act-annex-iv.json", note: "System identity block." },
    { label: "Compare report", href: "../compare-report.json", note: "Release scope and runtime provenance." },
    { label: "Manifest", href: "../artifacts/manifest.json", note: "Integrity index for included artifacts." },
  ];
  const developmentEvidence: ReviewerEvidenceLink[] = [
    { label: "Article 10 data governance", href: "article-10-data-governance.json", note: "Data-governance scaffold for sources, representativeness, and preparation steps." },
    { label: "Evidence index", href: "evidence-index.json", note: "Clause-to-artifact mapping for the bundle." },
    { label: "Expanded technical pack", href: "eu-ai-act-report.html", note: "Detailed tables and clause-by-clause scaffolds." },
    { label: "Manifest", href: "../artifacts/manifest.json", note: "Artifact-level integrity data." },
  ];
  const operationEvidence: ReviewerEvidenceLink[] = [
    { label: "Article 13 instructions", href: "article-13-instructions.json", note: "Instructions-for-use scaffold." },
    { label: "Human oversight summary", href: "human-oversight-summary.json", note: "Reviewer queue and action map." },
    { label: "Release review", href: "release-review.json", note: "Release gate status and signoff expectation." },
  ];
  const performanceEvidence: ReviewerEvidenceLink[] = [
    { label: "Compare report", href: "../compare-report.json", note: "Comparable run results and execution-quality details." },
    { label: "Release review", href: "release-review.json", note: "Release gate summary and rationale." },
    { label: "Expanded technical pack", href: "eu-ai-act-report.html", note: "Detailed highlighted cases and signal summaries." },
  ];
  const riskEvidence: ReviewerEvidenceLink[] = [
    { label: "Article 9 risk register", href: "article-9-risk-register.json", note: "Machine-derived risk register scaffold." },
    { label: "Release review", href: "release-review.json", note: "Current release decision and escalation rationale." },
    { label: "Post-market monitoring", href: "post-market-monitoring.json", note: "Signals that reopen or update risks after release." },
  ];
  const lifecycleEvidence: ReviewerEvidenceLink[] = [
    { label: "Article 17 QMS-lite", href: "article-17-qms-lite.json", note: "Lifecycle and process scaffold." },
    { label: "Release review", href: "release-review.json", note: "Current promotion decision and checklist." },
    { label: "Post-market monitoring", href: "post-market-monitoring.json", note: "Monitoring continuity and drift signals." },
  ];
  const standardsEvidence: ReviewerEvidenceLink[] = [
    { label: "EU coverage export", href: "eu-ai-act-coverage.json", note: "Clause status and residual gaps." },
    { label: "Annex IV JSON", href: "eu-ai-act-annex-iv.json", note: "Structured coverage-ready dossier data." },
    { label: "Article 43 conformity assessment", href: "article-43-conformity-assessment.json", note: "Conformity-assessment route and supporting record scaffold." },
    { label: "Evidence index", href: "evidence-index.json", note: "Selectors and manifest-backed links." },
  ];
  const declarationEvidence: ReviewerEvidenceLink[] = [
    { label: "Annex IV JSON", href: "eu-ai-act-annex-iv.json", note: "Technical support for declaration drafting." },
    { label: "Article 43 conformity assessment", href: "article-43-conformity-assessment.json", note: "Conformity-assessment route backing the declaration path." },
    { label: "Article 47 declaration scaffold", href: "article-47-declaration-of-conformity.json", note: "Provider declaration scaffold for the evaluated system version." },
    { label: "Annex V declaration content", href: "annex-v-declaration-content.json", note: "Required Annex V declaration-content items and gaps." },
    { label: "Compare report", href: "../compare-report.json", note: "Technical release results backing the declaration." },
    { label: "Release review", href: "release-review.json", note: "Current release status for the evaluated system version." },
  ];
  const incidentsEvidence: ReviewerEvidenceLink[] = [
    { label: "Article 72 monitoring plan", href: "article-72-monitoring-plan.json", note: "Technical monitoring-plan scaffold." },
    { label: "Post-market monitoring", href: "post-market-monitoring.json", note: "Observed history and drift/watchlist summary." },
    { label: "Article 73 serious-incident pack", href: "article-73-serious-incident-pack.json", note: "Machine-generated incident triage scaffold." },
  ];

  const sections: ReviewerSection[] = [
    {
      id: "general-description",
      title: "1. General description of the system",
      summary: [
        "This section identifies the exact agent, model, prompt, tools, and report scope used for the evaluated release.",
        "It is the reviewer-first entry point for understanding which system version produced the evidence in this package.",
      ],
      machineGenerated: [
        `Report ID ${annexIv.report_id} with generated timestamp ${new Date(annexIv.generated_at).toISOString()}.`,
        `Environment identity: agent ${annexIv.system_identity.environment?.agent_id ?? "unknown"} / ${annexIv.system_identity.environment?.agent_version ?? "unknown"}, model ${annexIv.system_identity.environment?.model ?? "unknown"} / ${annexIv.system_identity.environment?.model_version ?? "unknown"}.`,
        `Package scope: cases ${annexIv.system_identity.cases_path}, baseline ${annexIv.system_identity.baseline_dir}, new ${annexIv.system_identity.new_dir}.`,
        `Transfer class ${annexIv.system_identity.transfer_class} and redaction status ${annexIv.system_identity.redaction_status}.`,
      ],
      operatorOwned: [
        "Provider legal identity, authorised representative, and external contact details.",
        "Narrative intended purpose and target user/deployer description.",
        "Market placement form, hardware/software integration context, and user-interface description.",
      ],
      claims: [
        {
          claim: "The package identifies the exact evaluated system version and run scope.",
          state: "machine_generated",
          reviewerUse: "Confirms that the dossier is tied to one concrete evaluated system rather than a generic product description.",
          evidence: pickReviewerEvidence(generalEvidence, ["Annex IV JSON", "Compare report", "Manifest"]),
        },
        {
          claim: "Provider legal identity and intended-purpose narrative still need to be completed by the operator.",
          state: "operator_completed",
          reviewerUse: "Separates the technical identity already present from the provider-authored context still needed for formal dossier completion.",
          evidence: pickReviewerEvidence(generalEvidence, ["Annex IV JSON"]),
        },
        {
          claim: "The generated bundle does not itself supply market-placement form or UI-description narrative.",
          state: "still_missing",
          reviewerUse: "Prevents a reviewer from mistaking technical identity for a full product-description section.",
          evidence: pickReviewerEvidence(generalEvidence, ["Annex IV JSON"]),
        },
      ],
      evidence: generalEvidence,
      openGaps: [],
    },
    {
      id: "development-description",
      title: "2. Detailed description of development",
      summary: [
        "This section captures how the evaluated release was exercised and which machine-verifiable artifacts back the technical record.",
        "It is evidence-backed, but it does not replace provider-authored architecture and data-governance writing.",
      ],
      machineGenerated: [
        `${annexIv.logging_and_traceability.manifest_item_count} manifest-backed artifact(s) indexed across ${annexIv.clause_coverage.length} EU AI Act coverage clause(s).`,
        `${annexIv.logging_and_traceability.case_artifacts.length} case artifact row(s) with response, replay, and trace references where available.`,
        `Execution exercised on suite(s): ${annexIv.intended_use_and_operational_constraints.operational_constraints.suites.join(", ") || "none recorded"}.`,
      ],
      operatorOwned: [
        "Architecture narrative, algorithmic design decisions, trade-offs, and computational resources.",
        "Training/data provenance, labelling, cleaning, and datasheet material.",
        "Cybersecurity design narrative beyond the emitted runtime and scanner evidence.",
      ],
      claims: [
        {
          claim: "The bundle preserves enough runtime artifacts to reconstruct how the evaluated release was exercised.",
          state: "machine_generated",
          reviewerUse: "Lets the reviewer verify that development-stage claims are backed by retained evidence rather than narrative alone.",
          evidence: pickReviewerEvidence(developmentEvidence, ["Article 10 data governance", "Evidence index", "Manifest", "Expanded technical pack"]),
        },
        {
          claim: "Architecture, training-data, and broader development-process narrative still need provider-authored text.",
          state: "operator_completed",
          reviewerUse: "Shows where the evidence engine stops and provider engineering documentation still needs to be attached.",
          evidence: pickReviewerEvidence(developmentEvidence, ["Article 10 data governance", "Expanded technical pack", "Evidence index"]),
        },
        {
          claim: "The generated section does not claim complete training-data governance or full architecture coverage.",
          state: "still_missing",
          reviewerUse: "Avoids over-reading runtime evidence as if it were the whole development record.",
          evidence: pickReviewerEvidence(developmentEvidence, ["Article 10 data governance", "Evidence index"]),
        },
      ],
      evidence: developmentEvidence,
      openGaps: compactList(annexIv.uncovered_areas),
    },
    {
      id: "operation-control",
      title: "3. Monitoring, functioning, and control",
      summary: [
        "This section gives reviewers a short view of how the evaluated release is meant to be operated, overseen, and escalated.",
        "It combines deployer-facing Article 13 scaffolding with human-oversight and release-review outputs.",
      ],
      machineGenerated: [
        `Execution quality is ${article13Instructions.performance_and_limitations.execution_quality_status} with new pass rate ${formatPercent(article13Instructions.performance_and_limitations.pass_rate)}.`,
        `${humanOversightSummary.overview.approval_required_cases} case(s) require approval and ${humanOversightSummary.overview.blocked_cases} case(s) are blocked in the current review queue.`,
        `${annexIv.intended_use_and_operational_constraints.assumption_state_summary.cases_with_missing_assumption_state.length} case(s) show missing assumption-state capture.`,
      ],
      operatorOwned: compactList([
        ...article13Instructions.document_scope.operator_inputs_required,
        "Named oversight roles, escalation owner, and customer/deployer contact path.",
        "Final instructions-for-use text and safe operating boundary wording.",
      ]),
      claims: [
        {
          claim: "The package shows the current oversight queue, release status, and deployer-facing instruction scaffold for this release.",
          state: "machine_generated",
          reviewerUse: "Lets the reviewer see whether oversight and operation controls are grounded in the actual evaluated release.",
          evidence: pickReviewerEvidence(operationEvidence, ["Article 13 instructions", "Human oversight summary", "Release review"]),
        },
        {
          claim: "Named oversight roles, escalation ownership, and final instructions-for-use wording must be completed by the operator.",
          state: "operator_completed",
          reviewerUse: "Separates generated release and review facts from the deployer instructions that still need human ownership.",
          evidence: pickReviewerEvidence(operationEvidence, ["Article 13 instructions", "Human oversight summary"]),
        },
        {
          claim: "Known limitations and assumption-state gaps remain open until the operator closes them in the final dossier and workflow.",
          state: "still_missing",
          reviewerUse: "Keeps the reviewer focused on whether the operating boundary is complete enough for handoff.",
          evidence: pickReviewerEvidence(operationEvidence, ["Article 13 instructions", "Release review"]),
        },
      ],
      evidence: operationEvidence,
      openGaps: compactList([
        ...article13Instructions.performance_and_limitations.known_limitations,
        ...annexIv.logging_and_traceability.residual_gaps,
      ]),
    },
    {
      id: "performance-limits",
      title: "4. Performance metrics and limitations",
      summary: [
        "This section is where a reviewer sees whether the release is technically healthy, what changed, and what limitations were observed.",
        "It is backed by comparable runs, but the business acceptability of those metrics remains operator-owned.",
      ],
      machineGenerated: [
        `Execution quality status ${annexIv.accuracy_robustness_and_cybersecurity.execution_quality.status}; regressions ${annexIv.accuracy_robustness_and_cybersecurity.regressions}; improvements ${annexIv.accuracy_robustness_and_cybersecurity.improvements}.`,
        `Security signal snapshot: ${annexIv.accuracy_robustness_and_cybersecurity.security_summary.cases_with_signals_new} case(s) with new signals; top kinds ${annexIv.accuracy_robustness_and_cybersecurity.security_summary.top_signal_kinds_new.join(", ") || "none"}.`,
        `Release decision is ${releaseReview.release_decision.status} with ${releaseReview.release_gate_summary.cases_requiring_approval} approval case(s) and ${releaseReview.release_gate_summary.cases_block_recommended} blocking case(s).`,
      ],
      operatorOwned: [
        "Domain-specific acceptance thresholds and explanation of why these metrics are sufficient for deployment.",
        "Business-harm narrative, acceptable error levels, and customer impact interpretation.",
      ],
      claims: [
        {
          claim: "The release's current quality and blocking status are backed by comparable-run evidence and release review outputs.",
          state: "machine_generated",
          reviewerUse: "Supports a fast decision on whether the technical release evidence is healthy enough to read further.",
          evidence: pickReviewerEvidence(performanceEvidence, ["Compare report", "Release review", "Expanded technical pack"]),
        },
        {
          claim: "Acceptance thresholds and harm interpretation still need operator judgment.",
          state: "operator_completed",
          reviewerUse: "Shows that technical metrics are present, but deployment acceptability is still a human decision.",
          evidence: pickReviewerEvidence(performanceEvidence, ["Compare report", "Release review"]),
        },
        {
          claim: "Any unresolved known limitations remain open unless explicitly dispositioned by the operator.",
          state: "still_missing",
          reviewerUse: "Prevents a reviewer from treating the measured outputs as a complete deployment approval by themselves.",
          evidence: pickReviewerEvidence(performanceEvidence, ["Expanded technical pack", "Release review"]),
        },
      ],
      evidence: performanceEvidence,
      openGaps: compactList([...(article13Instructions.performance_and_limitations.known_limitations ?? [])]),
    },
    {
      id: "risk-management",
      title: "5. Risk management system (Article 9)",
      summary: [
        "This section gives reviewers a machine-derived draft risk register tied to observed runs, review decisions, and monitoring signals.",
        "It is a starting point for Article 9, not a complete provider-authored risk management system.",
      ],
      machineGenerated: [
        `${article9RiskRegister.summary.total_entries} machine-derived risk entry(ies): ${riskEntryTypeCounts.case_behavior ?? 0} from case behaviour, ${riskEntryTypeCounts.coverage_gap ?? 0} from coverage gaps, ${riskEntryTypeCounts.execution_quality ?? 0} from execution quality, ${riskEntryTypeCounts.monitoring_gap ?? 0} from monitoring.`,
        `${article9RiskRegister.summary.block_entries} blocking, ${article9RiskRegister.summary.review_entries} review, and ${article9RiskRegister.summary.monitor_entries} monitor entry(ies).`,
        `Post-release monitoring status ${postMarketMonitoring.summary.monitoring_status} with ${postMarketMonitoring.summary.drift_signals.length} drift signal(s).`,
      ],
      operatorOwned: compactList([
        ...article9RiskRegister.operator_inputs_required,
        "Residual-risk acceptance, control owners, and target review dates.",
      ]),
      claims: [
        {
          claim: "The bundle generates a machine-derived draft risk register from observed runs, review outcomes, and monitoring signals.",
          state: "machine_generated",
          reviewerUse: "Lets the reviewer see that Article 9 starts from runtime evidence rather than from a blank narrative template.",
          evidence: pickReviewerEvidence(riskEvidence, ["Article 9 risk register", "Release review", "Post-market monitoring"]),
        },
        {
          claim: "Likelihood rationale, owners, review dates, and residual-risk acceptance still need operator completion.",
          state: "operator_completed",
          reviewerUse: "Shows exactly which parts of Article 9 remain human-owned even after the machine-derived draft is present.",
          evidence: pickReviewerEvidence(riskEvidence, ["Article 9 risk register"]),
        },
        {
          claim: "Open residual gaps remain visible until the operator dispositiones them in the final governance workflow.",
          state: "still_missing",
          reviewerUse: "Prevents a reviewer from misreading the generated register as a final approved risk-management system.",
          evidence: pickReviewerEvidence(riskEvidence, ["Article 9 risk register", "Post-market monitoring"]),
        },
      ],
      evidence: riskEvidence,
      openGaps: compactList(article9RiskRegister.residual_gaps),
    },
    {
      id: "lifecycle-changes",
      title: "6. Changes over the lifecycle",
      summary: [
        "This section links QMS-lite controls and monitoring continuity into one lifecycle view.",
        "It shows whether the evaluated release triggered additional review, remediation, or follow-up process requirements.",
      ],
      machineGenerated: [
        `QMS-lite scaffold covers ${article17QmsLite.process_areas.length} process area(s) with ${article17QmsLite.managed_system.approval_case_count} approval-required case(s) and ${article17QmsLite.managed_system.blocking_case_count} blocking case(s).`,
        `Monitoring status ${article17QmsLite.managed_system.monitoring_status}; execution quality ${article17QmsLite.managed_system.execution_quality_status}.`,
        `${postMarketMonitoring.summary.runs_in_window} run(s) in monitoring window and ${postMarketMonitoring.summary.monitored_case_count} monitored case(s).`,
      ],
      operatorOwned: compactList([
        ...article17QmsLite.operator_inputs_required,
        "Formal change-control procedures, ownership matrix, training, and communications outside the generated scaffold.",
      ]),
      claims: [
        {
          claim: "The bundle shows a machine-generated lifecycle view across QMS-lite controls and monitoring continuity.",
          state: "machine_generated",
          reviewerUse: "Lets the reviewer check whether lifecycle evidence exists for this release instead of inferring process continuity from static prose.",
          evidence: pickReviewerEvidence(lifecycleEvidence, ["Article 17 QMS-lite", "Release review", "Post-market monitoring"]),
        },
        {
          claim: "Formal procedures, accountable roles, and training expectations still need operator-authored process documentation.",
          state: "operator_completed",
          reviewerUse: "Keeps the reviewer aware that QMS-lite is a technical scaffold, not a complete QMS document set.",
          evidence: pickReviewerEvidence(lifecycleEvidence, ["Article 17 QMS-lite"]),
        },
        {
          claim: "Residual process gaps remain open until they are closed in the provider's management system.",
          state: "still_missing",
          reviewerUse: "Makes lifecycle incompleteness visible instead of hiding it behind release status alone.",
          evidence: pickReviewerEvidence(lifecycleEvidence, ["Article 17 QMS-lite", "Post-market monitoring"]),
        },
      ],
      evidence: lifecycleEvidence,
      openGaps: compactList(article17QmsLite.residual_gaps),
    },
    {
      id: "standards-specifications",
      title: "7. Standards and alternative controls",
      summary: [
        "This section is intentionally narrow: the toolkit can point to the evidence that would support standards mapping, but it does not infer harmonised standards or common-specification claims.",
        "Reviewers should treat this as a support layer, not as an auto-generated conformity statement.",
      ],
      machineGenerated: [
        `Coverage snapshot: ${coverageCounts.covered} covered, ${coverageCounts.partial} partial, ${coverageCounts.missing} missing clause(s).`,
        "Machine-readable evidence selectors and bundle artifacts that can be referenced inside a standards-mapping appendix.",
      ],
      operatorOwned: [
        "Harmonised standards or common specifications actually relied upon.",
        "Alternative control rationale where harmonised standards are not used.",
        "Notified body references and any external conformity-assessment narrative.",
      ],
      claims: [
        {
          claim: "The bundle can support standards mapping by exposing clause coverage and evidence selectors.",
          state: "machine_generated",
          reviewerUse: "Lets the reviewer anchor standards discussion to actual evidence instead of to unlinked narrative references.",
          evidence: pickReviewerEvidence(standardsEvidence, ["EU coverage export", "Article 43 conformity assessment", "Evidence index", "Annex IV JSON"]),
        },
        {
          claim: "Any actual standards reliance or alternative-control rationale must be completed by the operator.",
          state: "operator_completed",
          reviewerUse: "Prevents readers from treating coverage selectors as if they were already a standards claim.",
          evidence: pickReviewerEvidence(standardsEvidence, ["EU coverage export", "Article 43 conformity assessment", "Annex IV JSON"]),
        },
        {
          claim: "This section does not itself establish harmonised-standard or common-specification compliance.",
          state: "still_missing",
          reviewerUse: "Keeps the boundary explicit between technical evidence support and formal conformity positioning.",
          evidence: pickReviewerEvidence(standardsEvidence, ["EU coverage export"]),
        },
      ],
      evidence: standardsEvidence,
      openGaps: compactList(annexIv.uncovered_areas),
    },
    {
      id: "declaration-boundary",
      title: "8. EU Declaration of Conformity boundary (Annex V)",
      summary: [
        "The toolkit does not generate the legal declaration itself.",
        "What it does provide is the technical record that can support the declaration's factual statements about system identity, review scope, and supporting evidence.",
      ],
      machineGenerated: [
        "Versioned system identity and release review status that can be cited in a declaration pack.",
        "Portable evidence links that can be attached or referenced from the declaration package.",
      ],
      operatorOwned: [
        "The Annex V declaration text, legal basis, and provider-responsibility statement.",
        "Applicable-law references, notified body details, date, place, signer name, and title.",
      ],
      claims: [
        {
          claim: "The bundle provides technical facts that can support declaration drafting.",
          state: "machine_generated",
          reviewerUse: "Lets the reviewer reuse verified system identity and release evidence when assembling a declaration package.",
          evidence: pickReviewerEvidence(
            declarationEvidence,
            ["Annex IV JSON", "Article 43 conformity assessment", "Article 47 declaration scaffold", "Annex V declaration content", "Compare report", "Release review"]
          ),
        },
        {
          claim: "The legal declaration text and sign-off remain operator-owned.",
          state: "operator_completed",
          reviewerUse: "Makes it explicit that the technical pack supports the declaration but does not replace it.",
          evidence: pickReviewerEvidence(
            declarationEvidence,
            ["Article 43 conformity assessment", "Article 47 declaration scaffold", "Annex V declaration content", "Release review"]
          ),
        },
        {
          claim: "No declaration of conformity is generated by the toolkit outputs.",
          state: "still_missing",
          reviewerUse: "Prevents a reviewer from mistaking technical support for a completed Annex V declaration.",
          evidence: pickReviewerEvidence(declarationEvidence, ["Article 47 declaration scaffold", "Annex V declaration content"]),
        },
      ],
      evidence: declarationEvidence,
      openGaps: ["Declaration drafting and legal signoff remain outside the generated toolkit outputs."],
    },
    {
      id: "post-market-serious-incidents",
      title: "9. Post-market monitoring and serious incidents",
      summary: [
        "This section groups the post-market monitoring plan and serious-incident triage into one reviewer-facing end-of-dossier section.",
        "It is designed for fast external reading: what is being watched, what triggered concern, and what still requires human reporting judgment.",
      ],
      machineGenerated: [
        `Monitoring plan status ${article72MonitoringPlan.monitored_system.monitoring_status} with ${article72MonitoringPlan.monitored_system.runs_in_window} run(s) in window.`,
        `Serious-incident machine triage ${article73SeriousIncidentPack.current_assessment.machine_triage_status} with ${article73SeriousIncidentPack.current_assessment.trigger_count} trigger(s).`,
        `${article73SeriousIncidentPack.current_assessment.high_or_critical_signal_count} high/critical signal(s) and release decision ${article73SeriousIncidentPack.current_assessment.release_decision_status}.`,
      ],
      operatorOwned: compactList([
        ...article72MonitoringPlan.operator_inputs_required,
        ...article73SeriousIncidentPack.document_scope.operator_inputs_required,
        ...article73SeriousIncidentPack.notification_preparation.operator_inputs_required,
        "Legal incident threshold assessment, authority routing, and disclosure decision.",
      ]),
      claims: [
        {
          claim: "The package provides machine-generated monitoring and incident-triage scaffolds tied to current and historical signals.",
          state: "machine_generated",
          reviewerUse: "Gives the reviewer a fast end-of-dossier view of what is being monitored and whether serious-incident triggers are already visible.",
          evidence: pickReviewerEvidence(incidentsEvidence, ["Article 72 monitoring plan", "Post-market monitoring", "Article 73 serious-incident pack"]),
        },
        {
          claim: "Monitoring ownership, reporting obligations, and incident routing still need operator completion.",
          state: "operator_completed",
          reviewerUse: "Shows where operational and legal reporting duties still sit outside the generated machine layer.",
          evidence: pickReviewerEvidence(incidentsEvidence, ["Article 72 monitoring plan", "Article 73 serious-incident pack"]),
        },
        {
          claim: "Open monitoring and incident gaps remain visible until the operator closes them in the final post-market workflow.",
          state: "still_missing",
          reviewerUse: "Keeps unresolved monitoring and reporting gaps visible instead of burying them inside the technical scaffolds.",
          evidence: pickReviewerEvidence(incidentsEvidence, ["Post-market monitoring", "Article 73 serious-incident pack"]),
        },
      ],
      evidence: incidentsEvidence,
      openGaps: compactList([
        ...postMarketMonitoring.residual_gaps,
        ...article73SeriousIncidentPack.residual_gaps,
      ]),
    },
  ];

  return {
    reportId: annexIv.report_id,
    generatedAt: annexIv.generated_at,
    summary: [
      `Release decision: ${releaseReview.release_decision.status}.`,
      `Execution quality: ${annexIv.accuracy_robustness_and_cybersecurity.execution_quality.status}.`,
      `Coverage snapshot: ${coverageCounts.covered} covered / ${coverageCounts.partial} partial / ${coverageCounts.missing} missing EU AI Act clause(s).`,
      `Human review queue: ${humanOversightSummary.overview.approval_required_cases} approval case(s), ${humanOversightSummary.overview.blocked_cases} blocking case(s).`,
    ],
    howToRead: [
      "Start with the reviewer PDF or reviewer HTML, not with raw JSON files.",
      "Read sections in Annex order; each section answers what it is for, what is generated here, what the operator still completes, and what is still open.",
      "Use the claim-to-evidence map before opening deeper technical files.",
    ],
    nonTechnicalGuide: [
      "Read the summary at the top of each section first.",
      "Focus on 'Completed by the operator' and 'Still open' to see what remains outside the generated machine layer.",
      "Use the reviewer PDF for handoff, printing, procurement, or counsel-facing review.",
    ],
    technicalGuide: [
      "Use the reviewer HTML as the readable map, then open the linked Compare report, Expanded technical pack, and Manifest where deeper verification is needed.",
      "Check claim-to-evidence rows before opening raw artifacts so you know which file answers which reviewer question.",
      "Treat filenames as secondary; Annex order and section purpose come first.",
    ],
    proves: [
      "Which exact evaluated system version produced this package.",
      "How the release performed on the reviewed case suite.",
      "Which machine-derived risks, review actions, and monitoring signals were observed.",
      "Which supporting files back each reviewer-facing section.",
    ],
    doesNotProve: [
      "That the provider has completed every operator-authored Annex IV or Annex V field.",
      "That sector-specific legal, actuarial, clinical, or financial validation obligations are fully satisfied.",
      "That the declaration of conformity or market-placement decision can be signed without human review.",
    ],
    outputLinks: commonOutputLinks,
    sections,
  };
}

function renderEuAiActReviewerHtml(params: {
  annexIv: EuAiActAnnexIvExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  article73SeriousIncidentPack: EuAiActArticle73SeriousIncidentPackExport;
  humanOversightSummary: EuAiActHumanOversightSummary;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
}): string {
  const model = buildReviewerDocumentModel(params);
  const sectionLinks = model.sections
    .map((section) => `<li><a href="#${escHtml(section.id)}">${escHtml(section.title)}</a></li>`)
    .join("");
  const outputLinks = model.outputLinks
    .map(
      (link) => `<li><a href="${escHtml(link.href)}">${escHtml(link.label)}</a>${link.note ? ` — ${escHtml(link.note)}` : ""}</li>`
    )
    .join("");
  const sectionCards = model.sections
    .map(
      (section) => `<section class="card section-card" id="${escHtml(section.id)}">
  <h2>${escHtml(section.title)}</h2>
  <div class="section-grid">
    <div>
      <h3>What this section is for</h3>
      <ul>${renderList(section.summary)}</ul>
    </div>
    <div>
      <h3>Generated here (machine-generated)</h3>
      <ul>${renderList(section.machineGenerated)}</ul>
    </div>
    <div>
      <h3>Completed by the operator before handoff</h3>
      <ul>${renderList(section.operatorOwned)}</ul>
    </div>
    <div>
      <h3>Still open</h3>
      <ul>${renderList(section.openGaps)}</ul>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Claim</th><th>Status</th><th>Why it matters to the reviewer</th><th>Evidence</th></tr>
    </thead>
    <tbody>${renderReviewerClaimRows(section.claims)}</tbody>
  </table>
  <table>
    <thead>
      <tr><th>Evidence file</th><th>Path</th><th>Why it matters</th></tr>
    </thead>
    <tbody>${renderReviewerEvidenceRows(section.evidence)}</tbody>
  </table>
</section>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(`EU AI Act reviewer pack · ${model.reportId}`)}</title>
<style>
  :root {
    --bg: #f6f7fb;
    --panel: #ffffff;
    --muted: #4b5563;
    --border: #d7dce5;
    --ink: #111827;
    --accent: #1d4ed8;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 20px 48px; }
  .hero, .card { background: var(--panel); border: 1px solid var(--border); border-radius: 18px; padding: 20px; }
  .card { margin-top: 16px; }
  h1, h2, h3 { margin: 0; }
  h1 { font-size: 2rem; letter-spacing: -0.03em; }
  h2 { font-size: 1.25rem; margin-bottom: 14px; }
  h3 { font-size: 0.92rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px; }
  .muted { color: var(--muted); }
  .hero-grid, .section-grid { display: grid; gap: 14px; margin-top: 16px; }
  .hero-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .section-grid { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
  .section-nav { margin-top: 16px; display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); list-style: none; padding-left: 0; }
  .section-nav a { display: block; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: #fbfcff; }
  .metric { border: 1px solid var(--border); border-radius: 14px; background: #fbfcff; padding: 14px; }
  .metric span { display: block; font-size: 0.82rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .metric strong { display: block; margin-top: 8px; font-size: 1.05rem; }
  .lists { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top: 16px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 0.95rem; }
  th, td { border-top: 1px solid var(--border); padding: 10px; text-align: left; vertical-align: top; }
  th { color: var(--muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.06em; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { color: var(--accent); }
  @media print {
    body { background: #fff; }
    .wrap { max-width: none; padding: 0; }
    .hero, .card { border: 1px solid #d1d5db; box-shadow: none; break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>EU AI Act reviewer pack</h1>
      <div class="muted" style="margin-top:8px;">Report <code>${escHtml(model.reportId)}</code> · generated ${escHtml(new Date(model.generatedAt).toISOString())}</div>
      <div class="hero-grid">
        ${model.summary
          .map((item) => {
            const parts = item.split(":");
            const label = parts.length > 1 ? (parts[0] ?? "Summary") : "Summary";
            const valueText = (parts.length > 1 ? parts.slice(1).join(":").trim() : item) || item;
            return `<div class="metric"><span>${escHtml(label)}</span><strong>${escHtml(valueText.replace(/\.$/, ""))}</strong></div>`;
          })
          .join("")}
      </div>
      <div class="lists">
        <div>
          <h3>How to read this pack</h3>
          <ul>${renderList(model.howToRead)}</ul>
        </div>
        <div>
          <h3>If you are not reading from engineering tooling</h3>
          <ul>${renderList(model.nonTechnicalGuide)}</ul>
        </div>
        <div>
          <h3>If you are doing technical verification</h3>
          <ul>${renderList(model.technicalGuide)}</ul>
        </div>
      </div>
      <div class="lists">
        <div>
          <h3>What this pack proves</h3>
          <ul>${renderList(model.proves)}</ul>
        </div>
        <div>
          <h3>What this pack does not complete for you</h3>
          <ul>${renderList(model.doesNotProve)}</ul>
        </div>
        <div>
          <h3>Linked outputs</h3>
          <ul>${outputLinks}</ul>
        </div>
      </div>
      <div>
        <h3 style="margin-top:16px;">Review this pack in Annex order</h3>
        <ul class="section-nav">${sectionLinks}</ul>
      </div>
    </section>
    ${sectionCards}
  </div>
</body>
</html>`;
}

function renderEuAiActReviewerMarkdown(params: {
  annexIv: EuAiActAnnexIvExport;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  article73SeriousIncidentPack: EuAiActArticle73SeriousIncidentPackExport;
  humanOversightSummary: EuAiActHumanOversightSummary;
  releaseReview: EuAiActReleaseReview;
  postMarketMonitoring: EuAiActPostMarketMonitoring;
}): string {
  const model = buildReviewerDocumentModel(params);
  const sectionOrder = model.sections.map((section) => `- [${section.title}](#${section.id})`).join("\n");
  const sections = model.sections
    .map(
      (section) => `## ${section.title}

### What this section is for
${markdownList(section.summary)}

### Generated here (machine-generated)
${markdownList(section.machineGenerated)}

### Completed by the operator before handoff
${markdownList(section.operatorOwned)}

### Claim-to-evidence map
${markdownClaims(section.claims)}

### Evidence files
${markdownLinks(section.evidence)}

### Still missing or still open
${markdownList(section.openGaps)}`
    )
    .join("\n\n");

  return `# EU AI Act reviewer pack

Report ID: \`${model.reportId}\`  
Generated: ${new Date(model.generatedAt).toISOString()}

## Summary
${markdownList(model.summary)}

## How to read this pack
${markdownList(model.howToRead)}

## If you are not reading from engineering tooling
${markdownList(model.nonTechnicalGuide)}

## If you are doing technical verification
${markdownList(model.technicalGuide)}

## What this pack proves
${markdownList(model.proves)}

## What this pack does not complete for you
${markdownList(model.doesNotProve)}

## Linked outputs
${markdownLinks(model.outputLinks)}

## Review this pack in Annex order
${sectionOrder}

${sections}
`;
}

function renderEuAiActHtml(params: {
  annexIv: EuAiActAnnexIvExport;
  evidenceIndex: EuAiActEvidenceIndex;
  article13Instructions: EuAiActArticle13InstructionsExport;
  article9RiskRegister: EuAiActArticle9RiskRegisterExport;
  article72MonitoringPlan: EuAiActArticle72MonitoringPlanExport;
  article17QmsLite: EuAiActArticle17QmsLiteExport;
  article73SeriousIncidentPack: EuAiActArticle73SeriousIncidentPackExport;
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
    article73SeriousIncidentPack,
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
        <a href="${escHtml("eu-ai-act-reviewer.html")}">eu-ai-act-reviewer.html</a> ·
        <a href="${escHtml("eu-ai-act-reviewer.md")}">eu-ai-act-reviewer.md</a> ·
        <a href="${escHtml("evidence-index.json")}">evidence-index.json</a> ·
        <a href="${escHtml("article-13-instructions.json")}">article-13-instructions.json</a> ·
        <a href="${escHtml("article-9-risk-register.json")}">article-9-risk-register.json</a> ·
        <a href="${escHtml("article-72-monitoring-plan.json")}">article-72-monitoring-plan.json</a> ·
        <a href="${escHtml("article-17-qms-lite.json")}">article-17-qms-lite.json</a> ·
        <a href="${escHtml("article-73-serious-incident-pack.json")}">article-73-serious-incident-pack.json</a> ·
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
        <div class="kpi"><strong>${escHtml(String(article17QmsLite.managed_system.approval_case_count))}</strong><span class="muted">approval-required cases</span></div>
        <div class="kpi"><strong>${escHtml(String(article17QmsLite.managed_system.blocking_case_count))}</strong><span class="muted">blocking cases</span></div>
        <div class="kpi"><strong>${escHtml(article17QmsLite.managed_system.monitoring_status)}</strong><span class="muted">monitoring status</span></div>
        <div class="kpi"><strong>${escHtml(String(article17QmsLite.process_areas.length))}</strong><span class="muted">process areas</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">Management review triggers:</div>
      <ul>${renderList(article17QmsLite.management_review_triggers)}</ul>
      <div class="muted" style="margin-top:12px;">Operator inputs still required:</div>
      <ul>${renderList(article17QmsLite.operator_inputs_required)}</ul>
    </div>

    <div class="card">
      <h2>Article 73 serious-incident pack</h2>
      <div class="muted">This export is a technical incident-triage scaffold. Human review is still required to determine whether Article 73 reporting applies.</div>
      <div class="grid">
        <div class="kpi"><strong>${escHtml(article73SeriousIncidentPack.current_assessment.machine_triage_status)}</strong><span class="muted">machine triage</span></div>
        <div class="kpi"><strong>${escHtml(String(article73SeriousIncidentPack.current_assessment.trigger_count))}</strong><span class="muted">incident triggers</span></div>
        <div class="kpi"><strong>${escHtml(String(article73SeriousIncidentPack.current_assessment.high_or_critical_signal_count))}</strong><span class="muted">high+critical signals</span></div>
        <div class="kpi"><strong>${escHtml(article73SeriousIncidentPack.current_assessment.release_decision_status)}</strong><span class="muted">release decision</span></div>
      </div>
      <div class="muted" style="margin-top:12px;">Current assessment rationale:</div>
      <ul>${renderList(article73SeriousIncidentPack.current_assessment.rationale)}</ul>
      <div class="muted" style="margin-top:12px;">Operator inputs still required:</div>
      <ul>${renderList(article73SeriousIncidentPack.document_scope.operator_inputs_required)}</ul>
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

  const missingEnvironmentFields = listMissingEuAiActEnvironmentFields(params.report.environment);
  if (missingEnvironmentFields.length > 0) {
    throw new Error(
      `EU AI Act bundle requires environment identity fields: ${missingEnvironmentFields.join(", ")}`
    );
  }

  const generatedAt = Date.now();
  const bundleArtifacts = params.bundleArtifacts ?? buildEuAiActBundleArtifacts();
  const bundleArtifactRefs = buildBundleArtifactRefs(bundleArtifacts);
  const fullContract = Boolean(
    bundleArtifacts.release_review_href
      || bundleArtifacts.report_html_href
      || bundleArtifacts.reviewer_html_href
      || bundleArtifacts.reviewer_markdown_href
      || bundleArtifacts.article_73_serious_incident_pack_href
  );

  const coverageExport: EuAiActCoverageExport = {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: generatedAt,
    bundle_artifacts: bundleArtifactRefs,
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
  const article10DataGovernance = buildArticle10DataGovernance({
    report: params.report,
    coverage,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const humanOversightSummary = buildEuAiActHumanOversightSummary({
    report: params.report,
    coverage,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article13Instructions = buildArticle13Instructions({
    report: params.report,
    coverage,
    annexIv,
    oversightSummary: humanOversightSummary,
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
    humanOversightSummary,
    postMarketMonitoring: params.postMarketMonitoring,
    annexIv,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article16ProviderObligations = buildArticle16ProviderObligations({
    report: params.report,
    coverage,
    article9RiskRegister,
    article13Instructions,
    article17QmsLite,
    article72MonitoringPlan,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article43ConformityAssessment = buildArticle43ConformityAssessment({
    report: params.report,
    coverage,
    article9RiskRegister,
    article13Instructions,
    article17QmsLite,
    article72MonitoringPlan,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const article47DeclarationOfConformity = buildArticle47DeclarationOfConformity({
    report: params.report,
    coverage,
    article43ConformityAssessment,
    article17QmsLite,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const annexVDeclarationContent = buildAnnexVDeclarationContent({
    report: params.report,
    article43ConformityAssessment,
    article47DeclarationOfConformity,
    bundleArtifacts: coverageExport.bundle_artifacts,
    generatedAt,
  });
  const releaseReview = fullContract
    ? buildEuAiActReleaseReview({
        report: params.report,
        coverage,
        oversightSummary: humanOversightSummary,
        bundleArtifacts: coverageExport.bundle_artifacts,
        generatedAt,
      })
    : undefined;
  const article73SeriousIncidentPack = fullContract && releaseReview
    ? buildArticle73SeriousIncidentPack({
        report: params.report,
        article9RiskRegister,
        article72MonitoringPlan,
        article17QmsLite,
        releaseReview,
        postMarketMonitoring: params.postMarketMonitoring,
        bundleArtifacts: coverageExport.bundle_artifacts,
        generatedAt,
      })
    : undefined;

  return {
    exports: buildEuAiActBundleExports(bundleArtifacts),
    coverageExport,
    evidenceIndex,
    annexIv,
    article10DataGovernance,
    article13Instructions,
    article16ProviderObligations,
    article43ConformityAssessment,
    article47DeclarationOfConformity,
    article9RiskRegister,
    article72MonitoringPlan,
    article17QmsLite,
    annexVDeclarationContent,
    humanOversightSummary,
    postMarketMonitoring: params.postMarketMonitoring,
    ...(article73SeriousIncidentPack ? { article73SeriousIncidentPack } : {}),
    ...(releaseReview ? { releaseReview } : {}),
    ...(fullContract && releaseReview && article73SeriousIncidentPack
      ? {
          reportHtml: renderEuAiActHtml({
            annexIv,
            evidenceIndex,
            article13Instructions,
            article9RiskRegister,
            article72MonitoringPlan,
            article17QmsLite,
            article73SeriousIncidentPack,
            humanOversightSummary,
            releaseReview,
            postMarketMonitoring: params.postMarketMonitoring,
          }),
          reviewerHtml: renderEuAiActReviewerHtml({
            annexIv,
            article13Instructions,
            article9RiskRegister,
            article72MonitoringPlan,
            article17QmsLite,
            article73SeriousIncidentPack,
            humanOversightSummary,
            releaseReview,
            postMarketMonitoring: params.postMarketMonitoring,
          }),
          reviewerMarkdown: renderEuAiActReviewerMarkdown({
            annexIv,
            article13Instructions,
            article9RiskRegister,
            article72MonitoringPlan,
            article17QmsLite,
            article73SeriousIncidentPack,
            humanOversightSummary,
            releaseReview,
            postMarketMonitoring: params.postMarketMonitoring,
          }),
        }
      : {}),
  };
}
