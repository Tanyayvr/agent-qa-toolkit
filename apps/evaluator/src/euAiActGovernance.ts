import type { CompareReport, ComplianceCoverageEntry } from "./reportTypes";

export type EuAiActBundleArtifacts = {
  compare_report_href: string;
  evaluator_report_html_href: string;
  manifest_href: string;
  coverage_href: string;
  annex_iv_href: string;
  report_html_href: string;
  evidence_index_href: string;
  article_13_instructions_href: string;
  article_9_risk_register_href: string;
  article_72_monitoring_plan_href: string;
  article_17_qms_lite_href: string;
  human_oversight_summary_href: string;
  release_review_href: string;
  post_market_monitoring_href: string;
};

export type ReviewerAction = "proceed" | "require_human_review" | "block_release";
export type ChecklistStatus = "pass" | "review" | "fail";
export type ReleaseDecisionStatus = "approve" | "approve_with_review" | "reject";

export type OversightCaseReview = {
  case_id: string;
  title: string;
  suite?: string;
  risk_level: CompareReport["items"][number]["risk_level"];
  gate_recommendation: CompareReport["items"][number]["gate_recommendation"];
  reviewer_action: ReviewerAction;
  rationale: string[];
  new_signal_kinds: string[];
  new_signal_count: number;
  replay_diff_href?: string;
  new_case_response_href?: string;
  new_trace_anchor_href?: string;
  new_failure_class?: string;
};

export type EuAiActHumanOversightSummary = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActBundleArtifacts;
  reviewer_action_map: {
    none: { action: ReviewerAction; guidance: string };
    require_approval: { action: ReviewerAction; guidance: string };
    block: { action: ReviewerAction; guidance: string };
  };
  overview: {
    total_cases: number;
    no_action_cases: number;
    approval_required_cases: number;
    blocked_cases: number;
  };
  review_queue: OversightCaseReview[];
  approval_required_cases: OversightCaseReview[];
  blocked_cases: OversightCaseReview[];
  blocked_case_rationale_summary: Array<{
    reason: string;
    case_count: number;
  }>;
  reviewer_guidance: string[];
};

export type EuAiActReleaseReview = {
  schema_version: 1;
  framework: "EU_AI_ACT";
  report_id: string;
  generated_at: number;
  bundle_artifacts: EuAiActBundleArtifacts;
  release_decision: {
    status: ReleaseDecisionStatus;
    rationale: string[];
    approval_case_ids: string[];
    blocking_case_ids: string[];
    required_human_actions: string[];
  };
  release_gate_summary: {
    execution_quality_status: CompareReport["summary"]["execution_quality"]["status"];
    regressions: number;
    improvements: number;
    cases_requiring_approval: number;
    cases_block_recommended: number;
    compliance_clause_status_counts: Record<ComplianceCoverageEntry["status"], number>;
  };
  checklist: Array<{
    id: string;
    label: string;
    status: ChecklistStatus;
    summary: string;
    evidence_selectors: string[];
    artifact_hrefs: string[];
  }>;
  reviewer_signoff: {
    required: boolean;
    recommended_role: string;
    reason: string;
  };
  recommended_next_step: string;
};

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function gateToAction(gateRecommendation: CompareReport["items"][number]["gate_recommendation"]): ReviewerAction {
  if (gateRecommendation === "block") return "block_release";
  if (gateRecommendation === "require_approval") return "require_human_review";
  return "proceed";
}

function caseRationale(item: CompareReport["items"][number]): string[] {
  const reasons: string[] = [];
  if (item.gate_recommendation === "block") reasons.push("Gate recommends blocking release for this case.");
  if (item.gate_recommendation === "require_approval") reasons.push("Gate requires a human approval decision before release.");
  if (item.risk_level === "high") reasons.push("Risk level is high.");
  if (item.security.new.signals.length) {
    const kinds = uniqueStrings(item.security.new.signals.map((signal) => signal.kind));
    reasons.push(`New run emitted ${item.security.new.signals.length} security signal(s): ${kinds.join(", ")}.`);
  }
  if (item.failure_summary?.new?.class) {
    reasons.push(`New run has runner failure class ${item.failure_summary.new.class}.`);
  }
  if (item.case_status !== "executed") {
    reasons.push(`Case status is ${item.case_status}.`);
  }
  if (!item.new_pass) reasons.push("New candidate did not pass this case.");
  if (item.baseline_pass && !item.new_pass) reasons.push("This is a regression from a passing baseline.");
  if (!reasons.length) reasons.push("No additional reviewer action is required for this case.");
  return reasons;
}

function toOversightCaseReview(item: CompareReport["items"][number]): OversightCaseReview {
  return {
    case_id: item.case_id,
    title: item.title,
    ...(item.suite ? { suite: item.suite } : {}),
    risk_level: item.risk_level,
    gate_recommendation: item.gate_recommendation,
    reviewer_action: gateToAction(item.gate_recommendation),
    rationale: caseRationale(item),
    new_signal_kinds: uniqueStrings(item.security.new.signals.map((signal) => signal.kind)),
    new_signal_count: item.security.new.signals.length,
    ...(item.artifacts.replay_diff_href ? { replay_diff_href: item.artifacts.replay_diff_href } : {}),
    ...(item.artifacts.new_case_response_href ? { new_case_response_href: item.artifacts.new_case_response_href } : {}),
    ...(item.artifacts.new_trace_anchor_href ? { new_trace_anchor_href: item.artifacts.new_trace_anchor_href } : {}),
    ...(item.failure_summary?.new?.class ? { new_failure_class: item.failure_summary.new.class } : {}),
  };
}

function blockedCaseRationaleSummary(blockedCases: OversightCaseReview[]): Array<{ reason: string; case_count: number }> {
  const counts = new Map<string, number>();
  for (const item of blockedCases) {
    for (const reason of item.rationale) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([reason, case_count]) => ({ reason, case_count }));
}

function complianceStatusCounts(coverage: ComplianceCoverageEntry[]): Record<ComplianceCoverageEntry["status"], number> {
  const counts: Record<ComplianceCoverageEntry["status"], number> = { covered: 0, partial: 0, missing: 0 };
  for (const entry of coverage) counts[entry.status] += 1;
  return counts;
}

export function buildEuAiActHumanOversightSummary(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  bundleArtifacts: EuAiActBundleArtifacts;
  generatedAt: number;
}): EuAiActHumanOversightSummary {
  const reviewQueue = params.report.items
    .filter((item) => item.gate_recommendation !== "none")
    .map(toOversightCaseReview);
  const approvalRequiredCases = reviewQueue.filter((item) => item.gate_recommendation === "require_approval");
  const blockedCases = reviewQueue.filter((item) => item.gate_recommendation === "block");

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    reviewer_action_map: {
      none: {
        action: "proceed",
        guidance: "No additional reviewer action is required beyond normal release process.",
      },
      require_approval: {
        action: "require_human_review",
        guidance: "Assigned reviewer must inspect the replay diff and supporting artifacts before release.",
      },
      block: {
        action: "block_release",
        guidance: "Do not release until remediation is complete and the case is rerun.",
      },
    },
    overview: {
      total_cases: params.report.items.length,
      no_action_cases: params.report.items.length - reviewQueue.length,
      approval_required_cases: approvalRequiredCases.length,
      blocked_cases: blockedCases.length,
    },
    review_queue: reviewQueue,
    approval_required_cases: approvalRequiredCases,
    blocked_cases: blockedCases,
    blocked_case_rationale_summary: blockedCaseRationaleSummary(blockedCases),
    reviewer_guidance: [
      "Use replay diffs first, then raw case responses and trace anchors when escalation is needed.",
      "A case marked block_release should stop promotion until remediation and rerun are complete.",
      "A case marked require_human_review needs an explicit reviewer decision before release.",
    ],
  };
}

export function buildEuAiActReleaseReview(params: {
  report: CompareReport;
  coverage: ComplianceCoverageEntry[];
  oversightSummary: EuAiActHumanOversightSummary;
  bundleArtifacts: EuAiActBundleArtifacts;
  generatedAt: number;
}): EuAiActReleaseReview {
  const blockingCaseIds = params.oversightSummary.blocked_cases.map((item) => item.case_id);
  const approvalCaseIds = params.oversightSummary.approval_required_cases.map((item) => item.case_id);
  const executionQualityHealthy = params.report.summary.execution_quality.status === "healthy";
  const evidencePackHealthy =
    params.report.quality_flags.self_contained &&
    params.report.quality_flags.portable_paths &&
    params.report.quality_flags.missing_assets_count === 0 &&
    params.report.quality_flags.path_violations_count === 0;
  const uncoveredAreas = uniqueStrings([
    ...params.coverage
      .filter((entry) => entry.required_evidence_missing.length > 0)
      .flatMap((entry) => entry.required_evidence_missing.map((selector) => `${entry.clause}: ${selector}`)),
    ...params.coverage.flatMap((entry) => entry.residual_gaps ?? []),
  ]);

  let decision: ReleaseDecisionStatus = "approve";
  if (!executionQualityHealthy || blockingCaseIds.length) {
    decision = "reject";
  } else if (approvalCaseIds.length) {
    decision = "approve_with_review";
  }

  const rationale: string[] = [];
  if (!executionQualityHealthy) rationale.push("Execution quality is degraded.");
  if (blockingCaseIds.length) rationale.push(`${blockingCaseIds.length} case(s) are marked block.`);
  if (approvalCaseIds.length) rationale.push(`${approvalCaseIds.length} case(s) require human approval.`);
  if (!rationale.length) rationale.push("No blocking or approval-required cases are present and execution quality is healthy.");

  const checklist: EuAiActReleaseReview["checklist"] = [
    {
      id: "execution_quality",
      label: "Execution quality is healthy",
      status: executionQualityHealthy ? "pass" : "fail",
      summary: executionQualityHealthy
        ? "Execution quality is healthy."
        : `Execution quality is ${params.report.summary.execution_quality.status}.`,
      evidence_selectors: ["compare-report.json.summary.execution_quality"],
      artifact_hrefs: ["compare-report.json", params.bundleArtifacts.report_html_href],
    },
    {
      id: "blocking_cases",
      label: "No cases are blocked",
      status: blockingCaseIds.length ? "fail" : "pass",
      summary: blockingCaseIds.length
        ? `${blockingCaseIds.length} blocking case(s): ${blockingCaseIds.join(", ")}`
        : "No cases are marked block.",
      evidence_selectors: [
        "compare-report.json.summary.cases_block_recommended",
        "compare-report.json.items[].gate_recommendation",
      ],
      artifact_hrefs: ["compare-report.json", params.bundleArtifacts.human_oversight_summary_href],
    },
    {
      id: "approval_cases",
      label: "Approval-required cases are reviewed",
      status: approvalCaseIds.length ? "review" : "pass",
      summary: approvalCaseIds.length
        ? `${approvalCaseIds.length} case(s) still require human approval.`
        : "No additional approval queue is present.",
      evidence_selectors: [
        "compare-report.json.summary.cases_requiring_approval",
        "compare-report.json.items[].gate_recommendation",
      ],
      artifact_hrefs: ["compare-report.json", params.bundleArtifacts.human_oversight_summary_href],
    },
    {
      id: "evidence_pack_integrity",
      label: "Evidence pack is self-contained and portable",
      status: evidencePackHealthy ? "pass" : "fail",
      summary: evidencePackHealthy
        ? "Evidence pack is self-contained, portable, and has no missing assets."
        : "Evidence pack has portability or missing-asset issues.",
      evidence_selectors: ["compare-report.json.quality_flags", "artifacts/manifest.json"],
      artifact_hrefs: ["compare-report.json", "artifacts/manifest.json"],
    },
    {
      id: "residual_compliance_gaps",
      label: "Residual compliance gaps are acknowledged",
      status: uncoveredAreas.length ? "review" : "pass",
      summary: uncoveredAreas.length
        ? `${uncoveredAreas.length} residual gap(s) remain documented in the bundle.`
        : "No residual compliance gaps are documented.",
      evidence_selectors: ["compare-report.json.compliance_coverage", params.bundleArtifacts.annex_iv_href],
      artifact_hrefs: [params.bundleArtifacts.annex_iv_href, params.bundleArtifacts.coverage_href],
    },
  ];

  const requiredHumanActions = uniqueStrings([
    ...(approvalCaseIds.length ? ["Assigned reviewer must clear approval-required cases before release."] : []),
    ...(blockingCaseIds.length ? ["Blocked cases must be remediated and rerun before release."] : []),
    ...(!executionQualityHealthy ? ["Execution quality must return to healthy before release."] : []),
  ]);

  return {
    schema_version: 1,
    framework: "EU_AI_ACT",
    report_id: params.report.report_id,
    generated_at: params.generatedAt,
    bundle_artifacts: params.bundleArtifacts,
    release_decision: {
      status: decision,
      rationale,
      approval_case_ids: approvalCaseIds,
      blocking_case_ids: blockingCaseIds,
      required_human_actions: requiredHumanActions,
    },
    release_gate_summary: {
      execution_quality_status: params.report.summary.execution_quality.status,
      regressions: params.report.summary.regressions,
      improvements: params.report.summary.improvements,
      cases_requiring_approval: params.report.summary.cases_requiring_approval,
      cases_block_recommended: params.report.summary.cases_block_recommended,
      compliance_clause_status_counts: complianceStatusCounts(params.coverage),
    },
    checklist,
    reviewer_signoff: {
      required: decision !== "approve",
      recommended_role: approvalCaseIds.length || blockingCaseIds.length ? "AI reviewer / release owner" : "Release owner",
      reason:
        decision === "reject"
          ? "Blocking cases or degraded execution quality prevent release."
          : decision === "approve_with_review"
            ? "Approval-required cases require explicit reviewer sign-off."
            : "No additional reviewer sign-off is required beyond normal release process.",
    },
    recommended_next_step:
      decision === "reject"
        ? "Remediate blocking or degraded cases and rerun the evaluation bundle."
        : decision === "approve_with_review"
          ? "Route approval-required cases to a reviewer and capture sign-off before release."
          : "Proceed with the standard release process.",
  };
}
