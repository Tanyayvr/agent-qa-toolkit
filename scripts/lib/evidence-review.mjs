import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  adapterCapabilityPath,
  casesCoveragePath,
  correctiveActionRegisterPath,
  loadIntakePair,
  relFrom,
  resolveIntakeDir,
  writeJson,
  runFingerprintPath,
  uniqueStrings,
} from "./evidence-intake.mjs";

const TODO = "TODO";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shortList(values = [], limit = 6) {
  return uniqueStrings(values).slice(0, limit);
}

function readJsonSafe(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function ensureFile(absPath, label) {
  if (!existsSync(absPath)) {
    throw new Error(`Missing ${label}: ${absPath}`);
  }
}

function makeContinuityKey(framework, gapId) {
  return `${String(framework || "AGENT_EVIDENCE").toLowerCase()}:${String(gapId || "").trim()}`;
}

function toRegisterStatus(disposition) {
  if (disposition === "mitigate") return "mitigating";
  if (disposition === "accept") return "accepted";
  if (disposition === "escalate") return "escalated";
  return "open";
}

function buildEmptyCorrectiveActionRegister(context) {
  return {
    schema_version: 1,
    artifact_type: "corrective_action_register",
    framework: context.framework,
    profile_id: context.intake?.systemScope?.profile_id || "",
    system_id: context.intake?.systemScope?.system_id || "",
    updated_at: 0,
    summary: {
      total_items: 0,
      open_items: 0,
      resolved_items: 0,
      recurring_items: 0,
      latest_report_id: "",
    },
    items: [],
  };
}

function normalizeCorrectiveActionRegister(raw, context) {
  const base = buildEmptyCorrectiveActionRegister(context);
  const record = asRecord(raw);
  if (!record) return base;
  const summary = asRecord(record.summary) || {};
  return {
    ...base,
    ...record,
    framework: record.framework || base.framework,
    profile_id: record.profile_id || base.profile_id,
    system_id: record.system_id || base.system_id,
    summary: {
      ...base.summary,
      ...summary,
    },
    items: Array.isArray(record.items) ? record.items.filter((item) => asRecord(item)) : [],
  };
}

function loadCorrectiveActionRegister(context) {
  if (!context.intake) return null;
  const absPath = correctiveActionRegisterPath(context.intake.intakeDir);
  if (!existsSync(absPath)) return null;
  return normalizeCorrectiveActionRegister(readJsonSafe(absPath), context);
}

function buildContinuitySummary(gapActions) {
  const newCount = gapActions.filter((gap) => gap.continuity_status === "new").length;
  const recurringCount = gapActions.filter((gap) => gap.continuity_status === "recurring").length;
  return {
    new_gap_count: newCount,
    recurring_gap_count: recurringCount,
  };
}

function buildBundleArtifacts(reportDir, compareReport, framework) {
  const artifacts = {
    compare_report_href: "compare-report.json",
    report_html_href: "report.html",
    manifest_href: "artifacts/manifest.json",
  };

  if (framework === "EU_AI_ACT") {
    const eu = compareReport?.compliance_exports?.eu_ai_act;
    if (!eu) {
      throw new Error("compare-report.json is missing compliance_exports.eu_ai_act");
    }
    return {
      ...artifacts,
      coverage_href: eu.coverage_href,
      annex_iv_href: eu.annex_iv_href,
      compliance_report_html_href: eu.report_html_href,
      evidence_index_href: eu.evidence_index_href,
      article_13_instructions_href: eu.article_13_instructions_href,
      article_9_risk_register_href: eu.article_9_risk_register_href,
      article_72_monitoring_plan_href: eu.article_72_monitoring_plan_href,
      article_17_qms_lite_href: eu.article_17_qms_lite_href,
      human_oversight_summary_href: eu.human_oversight_summary_href,
      release_review_href: eu.release_review_href,
      post_market_monitoring_href: eu.post_market_monitoring_href,
    };
  }

  return artifacts;
}

function collectMachineGapActions({ report, framework, releaseReview, coverage }) {
  const gaps = [];
  const addGap = (gap) => {
    if (gaps.some((item) => item.gap_id === gap.gap_id)) return;
    gaps.push(gap);
  };

  if (report.summary?.execution_quality?.status === "degraded") {
    addGap({
      gap_id: "execution-quality-degraded",
      source: "compare-report.summary.execution_quality",
      severity: "block",
      description: `Execution quality is degraded: ${shortList(report.summary.execution_quality.reasons).join("; ") || "see compare-report.json"}`,
      artifact_hrefs: ["compare-report.json", "report.html"],
    });
  }

  if (report.quality_flags?.self_contained === false) {
    addGap({
      gap_id: "bundle-self-contained-false",
      source: "compare-report.quality_flags.self_contained",
      severity: "block",
      description: "Bundle is not self-contained.",
      artifact_hrefs: ["compare-report.json", "artifacts/manifest.json"],
    });
  }
  if (report.quality_flags?.portable_paths === false) {
    addGap({
      gap_id: "bundle-portable-paths-false",
      source: "compare-report.quality_flags.portable_paths",
      severity: "block",
      description: "Bundle contains non-portable paths.",
      artifact_hrefs: ["compare-report.json", "artifacts/manifest.json"],
    });
  }
  if (Number(report.quality_flags?.missing_assets_count ?? 0) > 0) {
    addGap({
      gap_id: "bundle-missing-assets",
      source: "compare-report.quality_flags.missing_assets_count",
      severity: "block",
      description: `${report.quality_flags.missing_assets_count} bundle asset(s) are missing.`,
      artifact_hrefs: ["compare-report.json", "artifacts/manifest.json"],
    });
  }
  if (Number(report.quality_flags?.path_violations_count ?? 0) > 0) {
    addGap({
      gap_id: "bundle-path-violations",
      source: "compare-report.quality_flags.path_violations_count",
      severity: "block",
      description: `${report.quality_flags.path_violations_count} path violation(s) were detected.`,
      artifact_hrefs: ["compare-report.json", "artifacts/manifest.json"],
    });
  }

  for (const item of report.items || []) {
    if (item.gate_recommendation === "block") {
      addGap({
        gap_id: `case-block-${slugify(item.case_id)}`,
        source: `compare-report.items.${item.case_id}`,
        severity: "block",
        description: `Case ${item.case_id} (${item.title}) is marked block.`,
        artifact_hrefs: shortList([
          item.artifacts?.replay_diff_href,
          item.artifacts?.new_case_response_href,
          item.artifacts?.new_trace_anchor_href,
        ]),
      });
    } else if (item.gate_recommendation === "require_approval") {
      addGap({
        gap_id: `case-review-${slugify(item.case_id)}`,
        source: `compare-report.items.${item.case_id}`,
        severity: "review",
        description: `Case ${item.case_id} (${item.title}) requires human approval.`,
        artifact_hrefs: shortList([
          item.artifacts?.replay_diff_href,
          item.artifacts?.new_case_response_href,
          item.artifacts?.new_trace_anchor_href,
        ]),
      });
    }
  }

  if (framework === "EU_AI_ACT" && releaseReview) {
    if (releaseReview.release_decision?.status && releaseReview.release_decision.status !== "approve") {
      addGap({
        gap_id: "eu-machine-release-decision",
        source: "compliance/release-review.json.release_decision",
        severity: releaseReview.release_decision.status === "reject" ? "block" : "review",
        description: `Machine release review status is ${releaseReview.release_decision.status}.`,
        artifact_hrefs: ["compliance/release-review.json", "compliance/eu-ai-act-report.html"],
      });
    }
    for (const [index, action] of (releaseReview.release_decision?.required_human_actions || []).entries()) {
      addGap({
        gap_id: `eu-required-action-${index + 1}`,
        source: "compliance/release-review.json.required_human_actions",
        severity: "review",
        description: action,
        artifact_hrefs: ["compliance/release-review.json"],
      });
    }
  }

  if (framework === "EU_AI_ACT" && Array.isArray(coverage)) {
    for (const entry of coverage) {
      for (const [index, residualGap] of (entry.residual_gaps || []).entries()) {
        addGap({
          gap_id: `eu-coverage-${slugify(entry.clause)}-${index + 1}`,
          source: `compliance/eu-ai-act-coverage.json:${entry.clause}`,
          severity: entry.status === "missing" ? "block" : "review",
          description: residualGap,
          artifact_hrefs: ["compliance/eu-ai-act-coverage.json", "compliance/eu-ai-act-annex-iv.json"],
        });
      }
    }
  }

  return gaps;
}

function preferredDecisionOwner(intake, framework) {
  const owners = intake?.systemScope?.owners || {};
  if (framework === "EU_AI_ACT") {
    return {
      name: String(owners.compliance_owner || owners.release_owner || TODO),
      role: owners.compliance_owner ? "compliance_owner" : owners.release_owner ? "release_owner" : TODO,
    };
  }
  return {
    name: String(owners.release_owner || owners.evaluation_owner || TODO),
    role: owners.release_owner ? "release_owner" : owners.evaluation_owner ? "evaluation_owner" : TODO,
  };
}

function suggestedReviewers(intake, framework) {
  const owners = intake?.systemScope?.owners || {};
  const suggestions = [];
  if (owners.release_owner) suggestions.push({ name: String(owners.release_owner), role: "release_owner" });
  if (owners.evaluation_owner) suggestions.push({ name: String(owners.evaluation_owner), role: "evaluation_owner" });
  if (framework === "EU_AI_ACT" && owners.compliance_owner) {
    suggestions.push({ name: String(owners.compliance_owner), role: "compliance_owner" });
  }
  if (framework === "EU_AI_ACT" && owners.legal_reviewer) {
    suggestions.push({ name: String(owners.legal_reviewer), role: "legal_reviewer" });
  }
  return suggestions;
}

function buildNarrative(intake, report, framework) {
  const scope = intake?.systemScope;
  const deployment = scope?.deployment_context || {};
  const tools = scope?.tools || {};

  return {
    intended_use: String(scope?.intended_use || TODO),
    system_boundary:
      scope
        ? `In-scope tools: ${shortList(tools.in_scope).join(", ") || "none"}; out-of-scope tools: ${shortList(tools.out_of_scope).join(", ") || "none"}.`
        : TODO,
    deployment_context:
      scope
        ? `Environment: ${deployment.primary_environment || TODO}; markets: ${shortList(deployment.target_markets).join(", ") || TODO}; autonomy: ${deployment.autonomy_level || TODO}.`
        : TODO,
    change_summary: String(scope?.change_under_review?.summary || TODO),
    monitoring_cadence:
      scope?.evidence_preferences?.require_recurring_monitoring === true
        ? "TODO define recurring monitoring cadence and escalation owner"
        : "Not required for this release",
    reviewer_audience:
      framework === "EU_AI_ACT"
        ? "release_owner, evaluation_owner, compliance_owner, legal_reviewer"
        : "release_owner, evaluation_owner, system_owner",
    additional_notes: TODO,
  };
}

function preferredEuScaffoldOwner(intake, sectionId) {
  const owners = intake?.systemScope?.owners || {};
  const pick = (pairs) => {
    for (const [value, role] of pairs) {
      if (value) return { name: String(value), role };
    }
    return { name: TODO, role: TODO };
  };
  if (sectionId === "article_13_instructions") {
    return pick([
      [owners.compliance_owner, "compliance_owner"],
      [owners.system_owner, "system_owner"],
      [owners.release_owner, "release_owner"],
    ]);
  }
  if (sectionId === "article_17_qms_lite") {
    return pick([
      [owners.compliance_owner, "compliance_owner"],
      [owners.system_owner, "system_owner"],
      [owners.release_owner, "release_owner"],
    ]);
  }
  return pick([
    [owners.system_owner, "system_owner"],
    [owners.compliance_owner, "compliance_owner"],
    [owners.release_owner, "release_owner"],
  ]);
}

function collectEuScaffoldInputs(article13Instructions, article17QmsLite, article72MonitoringPlan) {
  const sections = [
    {
      section_id: "article_13_instructions",
      article: "Art_13",
      title: "Article 13 instructions for use",
      artifact_href: "article_13_instructions_href",
      inputs: (article13Instructions?.document_scope?.operator_inputs_required || []).map((label) => ({
        label,
        source_ref: "document_scope.operator_inputs_required",
      })),
      residual_gaps: article13Instructions?.residual_gaps || [],
    },
    {
      section_id: "article_17_qms_lite",
      article: "Art_17",
      title: "Article 17 QMS-lite",
      artifact_href: "article_17_qms_lite_href",
      inputs: [
        ...((article17QmsLite?.operator_inputs_required || []).map((label) => ({
          label,
          source_ref: "operator_inputs_required",
        })) || []),
        ...((article17QmsLite?.process_areas || []).flatMap((area) =>
          (area?.operator_inputs_required || []).map((label) => ({
            label,
            source_ref: `process_areas.${area.id}`,
          }))
        ) || []),
      ],
      residual_gaps: article17QmsLite?.residual_gaps || [],
    },
    {
      section_id: "article_72_monitoring_plan",
      article: "Art_72",
      title: "Article 72 monitoring plan",
      artifact_href: "article_72_monitoring_plan_href",
      inputs: [
        ...((article72MonitoringPlan?.operator_inputs_required || []).map((label) => ({
          label,
          source_ref: "operator_inputs_required",
        })) || []),
        ...((article72MonitoringPlan?.document_scope?.operator_inputs_required || []).map((label) => ({
          label,
          source_ref: "document_scope.operator_inputs_required",
        })) || []),
      ],
      residual_gaps: article72MonitoringPlan?.residual_gaps || [],
    },
  ];

  return sections.map((section) => {
    const byLabel = new Map();
    for (const item of section.inputs) {
      const key = String(item.label || "").trim();
      if (!key) continue;
      const existing = byLabel.get(key);
      if (existing) {
        if (!existing.source_refs.includes(item.source_ref)) existing.source_refs.push(item.source_ref);
        continue;
      }
      byLabel.set(key, {
        input_id: `${section.article.toLowerCase()}-${slugify(key)}`,
        label: key,
        source_refs: [item.source_ref],
      });
    }
    return {
      ...section,
      required_inputs: [...byLabel.values()],
      residual_gaps: uniqueStrings(section.residual_gaps),
    };
  });
}

function buildEuScaffoldCompletion(context) {
  if (context.framework !== "EU_AI_ACT") return null;
  const sections = collectEuScaffoldInputs(
    context.article13Instructions,
    context.article17QmsLite,
    context.article72MonitoringPlan
  );

  return Object.fromEntries(
    sections.map((section) => {
      const owner = preferredEuScaffoldOwner(context.intake, section.section_id);
      return [
        section.section_id,
        {
          article: section.article,
          title: section.title,
          artifact_href: context.bundleArtifacts[section.artifact_href],
          owner_name: owner.name,
          owner_role: owner.role,
          status: "pending",
          completion_note: TODO,
          required_inputs: section.required_inputs.map((input) => ({
            input_id: input.input_id,
            label: input.label,
            source_refs: input.source_refs,
            status: "pending",
            note: TODO,
          })),
          residual_gap_count: section.residual_gaps.length,
          residual_gap_examples: shortList(section.residual_gaps, 5),
          residual_gap_acknowledged: false,
          residual_gap_note: section.residual_gaps.length > 0 ? TODO : "",
        },
      ];
    })
  );
}

function buildHumanCompletion(context, gapActions) {
  const { intake, compareReport: report, framework } = context;
  const owner = preferredDecisionOwner(intake, framework);
  const continuityItems = new Map(
    (context.correctiveActionRegister?.items || [])
      .map((item) => [String(item.continuity_key || ""), item])
      .filter(([key]) => key)
  );
  const residualGapActions = gapActions.map((gap) => {
    const continuityKey = makeContinuityKey(framework, gap.gap_id);
    const priorItem = continuityItems.get(continuityKey);
    return {
      ...gap,
      continuity_key: continuityKey,
      continuity_status: priorItem ? "recurring" : "new",
      previous_occurrence_count: Number(priorItem?.occurrence_count ?? 0),
      last_seen_report_id: String(priorItem?.last_seen_report_id || ""),
      last_seen_decision_status: String(priorItem?.last_review_decision_status || ""),
      owner_name: TODO,
      disposition: "open",
      note: TODO,
    };
  });
  return {
    decision: {
      status: "pending",
      owner_name: owner.name,
      owner_role: owner.role,
      reviewers: suggestedReviewers(intake, framework),
      rationale: [TODO],
      override_machine_gap_ids: [],
      legal_review_requested: Boolean(intake?.systemScope?.human_context?.legal_review_required),
      legal_review_reason: intake?.systemScope?.human_context?.legal_review_required ? TODO : "",
    },
    narrative: buildNarrative(intake, report, framework),
    residual_gap_actions: residualGapActions,
    corrective_action_continuity: buildContinuitySummary(residualGapActions),
    eu_scaffold_completion: buildEuScaffoldCompletion(context),
  };
}

function bundleArtifactLinksForNote(bundleArtifacts) {
  return Object.entries(bundleArtifacts)
    .filter(([, href]) => typeof href === "string" && href.length > 0)
    .map(([key, href]) => ({ key, href }));
}

function relativeFromReview(reviewDir, reportDir, relPath) {
  return path.relative(reviewDir, path.join(reportDir, relPath)).split(path.sep).join("/");
}

function buildHandoffNote({ reviewDir, reportDir, reviewDecision }) {
  const artifactLinks = bundleArtifactLinksForNote(reviewDecision.bundle_artifacts)
    .map(({ key, href }) => `- ${key}: [${href}](${relativeFromReview(reviewDir, reportDir, href)})`)
    .join("\n");

  const gapLines = reviewDecision.human_completion.residual_gap_actions
    .map(
      (gap) =>
        `- ${gap.gap_id}: ${gap.description} | disposition=${gap.disposition} | owner=${gap.owner_name} | continuity=${gap.continuity_status} (${gap.previous_occurrence_count} prior)`
    )
    .join("\n");
  const continuitySummary = reviewDecision.human_completion.corrective_action_continuity;

  const narrativeRequirements = (reviewDecision.human_owned_inputs?.narrative_requirements || [])
    .map((item) => `- ${item}`)
    .join("\n");
  const euScaffoldCompletion = reviewDecision.human_completion?.eu_scaffold_completion
    ? Object.values(reviewDecision.human_completion.eu_scaffold_completion)
        .map(
          (section) =>
            `- ${section.article}: status=${section.status} | owner=${section.owner_name} | residualGaps=${section.residual_gap_count}`
        )
        .join("\n")
    : "";

  return [
    `# Review Handoff Note`,
    ``,
    `Report ID: ${reviewDecision.report_id}`,
    `Framework: ${reviewDecision.framework}`,
    `Decision status: ${reviewDecision.human_completion.decision.status}`,
    ``,
    `## Intended Use`,
    reviewDecision.human_completion.narrative.intended_use,
    ``,
    `## System Boundary`,
    reviewDecision.human_completion.narrative.system_boundary,
    ``,
    `## Deployment Context`,
    reviewDecision.human_completion.narrative.deployment_context,
    ``,
    `## Change Summary`,
    reviewDecision.human_completion.narrative.change_summary,
    ``,
    `## Monitoring Cadence`,
    reviewDecision.human_completion.narrative.monitoring_cadence,
    ``,
    `## Decision Rationale`,
    reviewDecision.human_completion.decision.rationale.map((item) => `- ${item}`).join("\n"),
    ``,
    `## Residual Gap Actions`,
    gapLines || "- none",
    ``,
    `## Corrective-Action Continuity`,
    continuitySummary
      ? `New gaps: ${continuitySummary.new_gap_count}\nRecurring gaps: ${continuitySummary.recurring_gap_count}`
      : "No continuity summary available.",
    ``,
    `## Narrative Requirements`,
    narrativeRequirements || "- none",
    ``,
    ...(euScaffoldCompletion
      ? [
          `## EU Scaffold Completion`,
          euScaffoldCompletion,
          ``,
        ]
      : []),
    `## Bundle Artifacts`,
    artifactLinks,
    ``,
    `## Additional Notes`,
    reviewDecision.human_completion.narrative.additional_notes,
    ``,
  ].join("\n");
}

export function resolveReviewContext({ cwd, reportDir, profile, explicitIntakeDir }) {
  const reportDirAbs = path.isAbsolute(reportDir) ? reportDir : path.resolve(cwd, reportDir);
  const compareReportPath = path.join(reportDirAbs, "compare-report.json");
  ensureFile(compareReportPath, "compare-report.json");
  ensureFile(path.join(reportDirAbs, "report.html"), "report.html");
  ensureFile(path.join(reportDirAbs, "artifacts", "manifest.json"), "artifacts/manifest.json");

  const compareReport = readJsonSafe(compareReportPath);
  const framework = compareReport?.compliance_exports?.eu_ai_act ? "EU_AI_ACT" : "AGENT_EVIDENCE";
  const bundleArtifacts = buildBundleArtifacts(reportDirAbs, compareReport, framework);

  let coverage = null;
  let releaseReview = null;
  let oversight = null;
  let article13Instructions = null;
  let article17QmsLite = null;
  let article72MonitoringPlan = null;
  if (framework === "EU_AI_ACT") {
    ensureFile(path.join(reportDirAbs, bundleArtifacts.coverage_href), "EU coverage export");
    ensureFile(path.join(reportDirAbs, bundleArtifacts.release_review_href), "EU release-review export");
    ensureFile(path.join(reportDirAbs, bundleArtifacts.human_oversight_summary_href), "EU human-oversight export");
    ensureFile(path.join(reportDirAbs, bundleArtifacts.article_13_instructions_href), "EU Article 13 instructions export");
    ensureFile(path.join(reportDirAbs, bundleArtifacts.article_17_qms_lite_href), "EU Article 17 QMS-lite export");
    ensureFile(path.join(reportDirAbs, bundleArtifacts.article_72_monitoring_plan_href), "EU Article 72 monitoring-plan export");
    coverage = readJsonSafe(path.join(reportDirAbs, bundleArtifacts.coverage_href)).coverage || [];
    releaseReview = readJsonSafe(path.join(reportDirAbs, bundleArtifacts.release_review_href));
    oversight = readJsonSafe(path.join(reportDirAbs, bundleArtifacts.human_oversight_summary_href));
    article13Instructions = readJsonSafe(path.join(reportDirAbs, bundleArtifacts.article_13_instructions_href));
    article17QmsLite = readJsonSafe(path.join(reportDirAbs, bundleArtifacts.article_17_qms_lite_href));
    article72MonitoringPlan = readJsonSafe(path.join(reportDirAbs, bundleArtifacts.article_72_monitoring_plan_href));
  }

  let intake = null;
  if (profile || explicitIntakeDir) {
    const intakeDir = resolveIntakeDir({
      cwd,
      profile: profile || null,
      explicitDir: explicitIntakeDir || null,
    });
    intake = loadIntakePair(intakeDir);
  }

  const context = {
    framework,
    reportDir: reportDirAbs,
    compareReport,
    bundleArtifacts,
    coverage,
    releaseReview,
    oversight,
    article13Instructions,
    article17QmsLite,
    article72MonitoringPlan,
    intake,
    correctiveActionRegister: null,
  };

  context.correctiveActionRegister = loadCorrectiveActionRegister(context);

  return context;
}

export function buildReviewDecisionTemplate(context) {
  const machineGapActions = collectMachineGapActions({
    report: context.compareReport,
    framework: context.framework,
    releaseReview: context.releaseReview,
    coverage: context.coverage,
  });

  const decision = {
    schema_version: 1,
    framework: context.framework,
    report_id: context.compareReport.report_id,
    generated_at: Date.now(),
    bundle_artifacts: context.bundleArtifacts,
    machine_summary: {
      execution_quality_status: context.compareReport.summary.execution_quality.status,
      execution_quality_reasons: context.compareReport.summary.execution_quality.reasons || [],
      cases_requiring_approval: context.compareReport.summary.cases_requiring_approval,
      cases_block_recommended: context.compareReport.summary.cases_block_recommended,
      quality_flags: {
        self_contained: context.compareReport.quality_flags.self_contained,
        portable_paths: context.compareReport.quality_flags.portable_paths,
        missing_assets_count: context.compareReport.quality_flags.missing_assets_count,
        path_violations_count: context.compareReport.quality_flags.path_violations_count,
      },
      ...(context.releaseReview
        ? {
            machine_release_decision: {
              status: context.releaseReview.release_decision.status,
              rationale: context.releaseReview.release_decision.rationale || [],
              approval_case_ids: context.releaseReview.release_decision.approval_case_ids || [],
              blocking_case_ids: context.releaseReview.release_decision.blocking_case_ids || [],
              required_human_actions: context.releaseReview.release_decision.required_human_actions || [],
            },
          }
        : {}),
    },
    human_owned_inputs: {
      business_harms: context.intake?.systemScope?.human_context?.business_harms || [],
      deployment_assumptions: context.intake?.systemScope?.human_context?.deployment_assumptions || [],
      narrative_requirements: [
        ...(context.intake?.systemScope?.human_context?.narrative_requirements || []),
        ...(context.intake?.qualityContract?.human_review?.notes || []),
      ],
    },
    human_completion: buildHumanCompletion(context, machineGapActions),
  };

  return decision;
}

export function writeReviewArtifacts({ context, reviewDecision, force = false }) {
  const reviewDir = path.join(context.reportDir, "review");
  const decisionPath = path.join(reviewDir, "review-decision.json");
  const notePath = path.join(reviewDir, "handoff-note.md");
  const snapshotDir = path.join(reviewDir, "intake");

  mkdirSync(reviewDir, { recursive: true });
  if (!force && (existsSync(decisionPath) || existsSync(notePath))) {
    throw new Error("Review artifacts already exist. Re-run with --force if you want to overwrite them.");
  }

  writeFileSync(decisionPath, JSON.stringify(reviewDecision, null, 2) + "\n", "utf8");
  writeFileSync(notePath, buildHandoffNote({ reviewDir, reportDir: context.reportDir, reviewDecision }) + "\n", "utf8");

  let snapshot = null;
  if (context.intake) {
    mkdirSync(snapshotDir, { recursive: true });
    cpSync(context.intake.paths.system_scope, path.join(snapshotDir, "system-scope.json"));
    cpSync(context.intake.paths.quality_contract, path.join(snapshotDir, "quality-contract.json"));
    const casesCoverageAbs = casesCoveragePath(context.intake.intakeDir);
    const casesCoverageSnapshotAbs = path.join(snapshotDir, "cases-coverage.json");
    const adapterCapabilityAbs = adapterCapabilityPath(context.intake.intakeDir);
    const adapterCapabilitySnapshotAbs = path.join(snapshotDir, "adapter-capability.json");
    const runFingerprintAbs = runFingerprintPath(context.intake.intakeDir);
    const runFingerprintSnapshotAbs = path.join(snapshotDir, "run-fingerprint.json");
    const correctiveActionRegisterAbs = correctiveActionRegisterPath(context.intake.intakeDir);
    const correctiveActionRegisterSnapshotAbs = path.join(snapshotDir, "corrective-action-register.json");
    if (existsSync(casesCoverageAbs)) {
      cpSync(casesCoverageAbs, casesCoverageSnapshotAbs);
    }
    if (existsSync(adapterCapabilityAbs)) {
      cpSync(adapterCapabilityAbs, adapterCapabilitySnapshotAbs);
    }
    if (existsSync(runFingerprintAbs)) {
      cpSync(runFingerprintAbs, runFingerprintSnapshotAbs);
    }
    if (existsSync(correctiveActionRegisterAbs)) {
      cpSync(correctiveActionRegisterAbs, correctiveActionRegisterSnapshotAbs);
    }
    snapshot = {
      system_scope_href: relFrom(context.reportDir, path.join(snapshotDir, "system-scope.json")),
      quality_contract_href: relFrom(context.reportDir, path.join(snapshotDir, "quality-contract.json")),
      ...(existsSync(casesCoverageSnapshotAbs)
        ? { cases_coverage_href: relFrom(context.reportDir, casesCoverageSnapshotAbs) }
        : {}),
      ...(existsSync(adapterCapabilitySnapshotAbs)
        ? { adapter_capability_href: relFrom(context.reportDir, adapterCapabilitySnapshotAbs) }
        : {}),
      ...(existsSync(runFingerprintSnapshotAbs)
        ? { run_fingerprint_href: relFrom(context.reportDir, runFingerprintSnapshotAbs) }
        : {}),
      ...(existsSync(correctiveActionRegisterSnapshotAbs)
        ? { corrective_action_register_href: relFrom(context.reportDir, correctiveActionRegisterSnapshotAbs) }
        : {}),
    };
  }

  return {
    review_dir_href: relFrom(context.reportDir, reviewDir),
    review_decision_href: relFrom(context.reportDir, decisionPath),
    handoff_note_href: relFrom(context.reportDir, notePath),
    intake_snapshot: snapshot,
  };
}

export function syncCorrectiveActionRegister({ context, reviewDecision }) {
  if (!context.intake) {
    return null;
  }

  const registerAbs = correctiveActionRegisterPath(context.intake.intakeDir);
  const reviewDecisionStatus = String(reviewDecision?.human_completion?.decision?.status || "");
  const generatedAt = Number(reviewDecision?.generated_at || Date.now());
  const currentActions = Array.isArray(reviewDecision?.human_completion?.residual_gap_actions)
    ? reviewDecision.human_completion.residual_gap_actions
    : [];
  const currentKeys = new Set();
  const existing = normalizeCorrectiveActionRegister(
    existsSync(registerAbs) ? readJsonSafe(registerAbs) : null,
    context
  );
  const byKey = new Map(
    existing.items.map((item) => [String(item.continuity_key || ""), item]).filter(([key]) => key)
  );

  for (const action of currentActions) {
    const continuityKey = String(action.continuity_key || makeContinuityKey(context.framework, action.gap_id));
    currentKeys.add(continuityKey);
    const prior = byKey.get(continuityKey);
    const history = Array.isArray(prior?.history) ? [...prior.history] : [];
    const nextEvent = {
      report_id: reviewDecision.report_id,
      generated_at: generatedAt,
      seen_status: "present",
      decision_status: reviewDecisionStatus,
      disposition: action.disposition,
      owner_name: action.owner_name,
      note: action.note,
    };
    const existingHistoryIndex = history.findIndex(
      (entry) => entry?.report_id === reviewDecision.report_id && entry?.seen_status === "present"
    );
    if (existingHistoryIndex >= 0) history[existingHistoryIndex] = nextEvent;
    else history.push(nextEvent);
    byKey.set(continuityKey, {
      continuity_key: continuityKey,
      framework: context.framework,
      gap_id: action.gap_id,
      source: action.source,
      severity: action.severity,
      description: action.description,
      artifact_hrefs: action.artifact_hrefs || [],
      first_seen_report_id: prior?.first_seen_report_id || reviewDecision.report_id,
      first_seen_at: Number(prior?.first_seen_at || generatedAt),
      last_seen_report_id: reviewDecision.report_id,
      last_seen_at: generatedAt,
      last_review_decision_status: reviewDecisionStatus,
      occurrence_count: Number(prior?.occurrence_count || 0) + (existingHistoryIndex >= 0 ? 0 : 1),
      current_status: toRegisterStatus(action.disposition),
      current_owner_name: action.owner_name,
      latest_disposition: action.disposition,
      latest_note: action.note,
      history,
    });
  }

  for (const [continuityKey, item] of byKey.entries()) {
    if (currentKeys.has(continuityKey)) continue;
    const history = Array.isArray(item.history) ? [...item.history] : [];
    const lastHistory = history[history.length - 1];
    const alreadyRecordedForReport =
      lastHistory &&
      lastHistory.report_id === reviewDecision.report_id &&
      lastHistory.seen_status === "resolved";
    if (!alreadyRecordedForReport) {
      history.push({
        report_id: reviewDecision.report_id,
        generated_at: generatedAt,
        seen_status: "resolved",
        decision_status: reviewDecisionStatus,
        disposition: "resolved",
        owner_name: item.current_owner_name || "",
        note: "Not observed in the current machine evidence bundle.",
      });
    }
    byKey.set(continuityKey, {
      ...item,
      last_review_decision_status: reviewDecisionStatus,
      current_status: "resolved",
      latest_disposition: "resolved",
      latest_note: "Not observed in the current machine evidence bundle.",
      history,
    });
  }

  const items = [...byKey.values()].sort((left, right) =>
    String(left.continuity_key || "").localeCompare(String(right.continuity_key || ""))
  );
  const register = {
    ...existing,
    framework: context.framework,
    profile_id: context.intake.systemScope?.profile_id || existing.profile_id,
    system_id: context.intake.systemScope?.system_id || existing.system_id,
    updated_at: generatedAt,
    summary: {
      total_items: items.length,
      open_items: items.filter((item) => item.current_status !== "resolved").length,
      resolved_items: items.filter((item) => item.current_status === "resolved").length,
      recurring_items: currentActions.filter((action) => Number(action.previous_occurrence_count || 0) > 0).length,
      latest_report_id: reviewDecision.report_id,
    },
    items,
  };

  writeJson(registerAbs, register);

  const reviewSnapshotDir = path.join(context.reportDir, "review", "intake");
  mkdirSync(reviewSnapshotDir, { recursive: true });
  const reviewSnapshotAbs = path.join(reviewSnapshotDir, "corrective-action-register.json");
  cpSync(registerAbs, reviewSnapshotAbs);

  return {
    href: relFrom(context.reportDir, registerAbs),
    review_snapshot_href: relFrom(context.reportDir, reviewSnapshotAbs),
    summary: register.summary,
    register,
  };
}

export function validateReviewDecision({ context, reviewDecision, handoffNoteText }) {
  const errors = [];
  const warnings = [];

  const machineGapActions = collectMachineGapActions({
    report: context.compareReport,
    framework: context.framework,
    releaseReview: context.releaseReview,
    coverage: context.coverage,
  });
  const expectedGapIds = new Set(machineGapActions.map((gap) => gap.gap_id));
  const actualGapIds = new Set((reviewDecision?.human_completion?.residual_gap_actions || []).map((gap) => gap.gap_id));

  for (const gapId of expectedGapIds) {
    if (!actualGapIds.has(gapId)) {
      errors.push({
        field: "human_completion.residual_gap_actions",
        message: `Missing machine gap action for ${gapId}`,
      });
    }
  }

  for (const gap of reviewDecision?.human_completion?.residual_gap_actions || []) {
    if (!expectedGapIds.has(gap.gap_id)) {
      warnings.push({
        field: "human_completion.residual_gap_actions",
        message: `Unknown gap action ${gap.gap_id} is present in review-decision.json`,
      });
    }
    if (!String(gap.owner_name || "").trim() || String(gap.owner_name).includes(TODO)) {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.owner_name`,
        message: "Residual gap action owner_name must be filled",
      });
    }
    if (!String(gap.note || "").trim() || String(gap.note).includes(TODO)) {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.note`,
        message: "Residual gap action note must be filled",
      });
    }
    if (gap.disposition === "open") {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.disposition`,
        message: "Residual gap action disposition cannot remain open in a ready handoff",
      });
    }
    if (!String(gap.continuity_key || "").trim()) {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.continuity_key`,
        message: "Residual gap action continuity_key must be present",
      });
    }
    if (!["new", "recurring"].includes(String(gap.continuity_status || ""))) {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.continuity_status`,
        message: "Residual gap action continuity_status must be new or recurring",
      });
    }
    if (!Number.isFinite(Number(gap.previous_occurrence_count)) || Number(gap.previous_occurrence_count) < 0) {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.previous_occurrence_count`,
        message: "Residual gap action previous_occurrence_count must be a non-negative number",
      });
    }
    if (gap.continuity_status === "recurring" && Number(gap.previous_occurrence_count) < 1) {
      errors.push({
        field: `human_completion.residual_gap_actions.${gap.gap_id}.previous_occurrence_count`,
        message: "Recurring residual gaps must record at least one previous occurrence",
      });
    }
  }

  const continuitySummary = asRecord(reviewDecision?.human_completion?.corrective_action_continuity);
  if (!continuitySummary) {
    errors.push({
      field: "human_completion.corrective_action_continuity",
      message: "Corrective-action continuity summary must be present",
    });
  } else {
    const expectedNewCount = (reviewDecision?.human_completion?.residual_gap_actions || []).filter(
      (gap) => gap.continuity_status === "new"
    ).length;
    const expectedRecurringCount = (reviewDecision?.human_completion?.residual_gap_actions || []).filter(
      (gap) => gap.continuity_status === "recurring"
    ).length;
    if (Number(continuitySummary.new_gap_count) !== expectedNewCount) {
      errors.push({
        field: "human_completion.corrective_action_continuity.new_gap_count",
        message: "Corrective-action continuity new_gap_count does not match residual gap actions",
      });
    }
    if (Number(continuitySummary.recurring_gap_count) !== expectedRecurringCount) {
      errors.push({
        field: "human_completion.corrective_action_continuity.recurring_gap_count",
        message: "Corrective-action continuity recurring_gap_count does not match residual gap actions",
      });
    }
  }

  const decision = reviewDecision?.human_completion?.decision || {};
  if (decision.status === "pending") {
    errors.push({
      field: "human_completion.decision.status",
      message: "Decision status must not remain pending",
    });
  }
  if (!String(decision.owner_name || "").trim() || String(decision.owner_name).includes(TODO)) {
    errors.push({
      field: "human_completion.decision.owner_name",
      message: "Decision owner_name must be filled",
    });
  }
  if (!String(decision.owner_role || "").trim() || String(decision.owner_role).includes(TODO)) {
    errors.push({
      field: "human_completion.decision.owner_role",
      message: "Decision owner_role must be filled",
    });
  }
  if (!Array.isArray(decision.rationale) || decision.rationale.length === 0 || decision.rationale.some((item) => String(item).includes(TODO))) {
    errors.push({
      field: "human_completion.decision.rationale",
      message: "Decision rationale must be filled",
    });
  }
  if (decision.legal_review_requested === true && (!String(decision.legal_review_reason || "").trim() || String(decision.legal_review_reason).includes(TODO))) {
    errors.push({
      field: "human_completion.decision.legal_review_reason",
      message: "legal_review_reason must be filled when legal_review_requested=true",
    });
  }

  const narrative = reviewDecision?.human_completion?.narrative || {};
  for (const field of ["intended_use", "system_boundary", "deployment_context", "change_summary", "monitoring_cadence", "reviewer_audience"]) {
    if (!String(narrative[field] || "").trim() || String(narrative[field]).includes(TODO)) {
      errors.push({
        field: `human_completion.narrative.${field}`,
        message: `${field} must be filled`,
      });
    }
  }

  if (context.framework === "EU_AI_ACT") {
    const euScaffoldCompletion = reviewDecision?.human_completion?.eu_scaffold_completion;
    const sectionIds = ["article_13_instructions", "article_17_qms_lite", "article_72_monitoring_plan"];
    if (!asRecord(euScaffoldCompletion)) {
      errors.push({
        field: "human_completion.eu_scaffold_completion",
        message: "EU bundles require a structured owner-completion record for Article 13, Article 17, and Article 72 scaffolds",
      });
    } else {
      for (const sectionId of sectionIds) {
        const section = asRecord(euScaffoldCompletion[sectionId]);
        if (!section) {
          errors.push({
            field: `human_completion.eu_scaffold_completion.${sectionId}`,
            message: `${sectionId} must be present for EU review handoff`,
          });
          continue;
        }
        for (const field of ["owner_name", "owner_role", "completion_note"]) {
          if (!String(section[field] || "").trim() || String(section[field]).includes(TODO)) {
            errors.push({
              field: `human_completion.eu_scaffold_completion.${sectionId}.${field}`,
              message: `${field} must be filled`,
            });
          }
        }
        if (section.status === "pending") {
          errors.push({
            field: `human_completion.eu_scaffold_completion.${sectionId}.status`,
            message: "EU scaffold completion status must not remain pending",
          });
        }
        const requiredInputs = Array.isArray(section.required_inputs) ? section.required_inputs : [];
        for (const input of requiredInputs) {
          if (input.status === "pending") {
            errors.push({
              field: `human_completion.eu_scaffold_completion.${sectionId}.required_inputs.${input.input_id}.status`,
              message: "Required input status must not remain pending",
            });
          }
          if (!String(input.note || "").trim() || String(input.note).includes(TODO)) {
            errors.push({
              field: `human_completion.eu_scaffold_completion.${sectionId}.required_inputs.${input.input_id}.note`,
              message: "Required input note must be filled",
            });
          }
        }
        const residualGapCount = Number(section.residual_gap_count ?? 0);
        if (
          residualGapCount > 0 &&
          section.residual_gap_acknowledged !== true
        ) {
          errors.push({
            field: `human_completion.eu_scaffold_completion.${sectionId}.residual_gap_acknowledged`,
            message: "Residual gaps must be acknowledged before EU handoff is ready",
          });
        }
        if (
          residualGapCount > 0 &&
          (!String(section.residual_gap_note || "").trim() || String(section.residual_gap_note).includes(TODO))
        ) {
          errors.push({
            field: `human_completion.eu_scaffold_completion.${sectionId}.residual_gap_note`,
            message: "Residual gap note must be filled when scaffold residual gaps remain",
          });
        }
      }
    }
  }

  const blockGapIds = (reviewDecision?.human_completion?.residual_gap_actions || [])
    .filter((gap) => gap.severity === "block")
    .map((gap) => gap.gap_id);
  const overrides = new Set(decision.override_machine_gap_ids || []);
  const approving = decision.status === "approve" || decision.status === "approve_with_conditions";
  if (approving && blockGapIds.length > 0 && overrides.size === 0) {
    errors.push({
      field: "human_completion.decision.override_machine_gap_ids",
      message: "Approving a bundle with blocking machine gaps requires explicit override_machine_gap_ids",
    });
  }
  for (const gapId of blockGapIds) {
    const gap = (reviewDecision?.human_completion?.residual_gap_actions || []).find((item) => item.gap_id === gapId);
    if (gap?.disposition === "accept" && !overrides.has(gapId)) {
      errors.push({
        field: "human_completion.decision.override_machine_gap_ids",
        message: `Gap ${gapId} is accepted despite block severity but is not listed in override_machine_gap_ids`,
      });
    }
  }

  if (typeof handoffNoteText !== "string" || !handoffNoteText.trim()) {
    errors.push({
      field: "review/handoff-note.md",
      message: "handoff-note.md must exist",
    });
  } else {
    if (handoffNoteText.includes(TODO)) {
      errors.push({
        field: "review/handoff-note.md",
        message: "handoff-note.md still contains TODO placeholders",
      });
    }
    if (!handoffNoteText.includes(String(reviewDecision.report_id))) {
      warnings.push({
        field: "review/handoff-note.md",
        message: "handoff-note.md does not mention the report_id explicitly",
      });
    }
  }

  return {
    errors,
    warnings,
    summary: {
      framework: context.framework,
      report_id: context.compareReport.report_id,
      machine_gap_count: machineGapActions.length,
      residual_gap_action_count: Array.isArray(reviewDecision?.human_completion?.residual_gap_actions)
        ? reviewDecision.human_completion.residual_gap_actions.length
        : 0,
      corrective_action_new_gap_count: Number(
        reviewDecision?.human_completion?.corrective_action_continuity?.new_gap_count ?? 0
      ),
      corrective_action_recurring_gap_count: Number(
        reviewDecision?.human_completion?.corrective_action_continuity?.recurring_gap_count ?? 0
      ),
      eu_scaffold_completion_pending_count:
        context.framework === "EU_AI_ACT" && asRecord(reviewDecision?.human_completion?.eu_scaffold_completion)
          ? Object.values(reviewDecision.human_completion.eu_scaffold_completion).filter(
              (section) => asRecord(section)?.status === "pending"
            ).length
          : 0,
      decision_status: decision.status || null,
      legal_review_requested: decision.legal_review_requested === true,
    },
  };
}
