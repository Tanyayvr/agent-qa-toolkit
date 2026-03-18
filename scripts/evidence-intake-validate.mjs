#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

import {
  buildIntakeSummary,
  collectTodoPaths,
  loadIntakePair,
  overlapStrings,
  readJson,
  resolveIntakeDir,
  uniqueStrings,
} from "./lib/evidence-intake.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-intake-validate.mjs (--profile <id> | --dir <path>) [--json]",
    "",
    "Options:",
    "  --profile <id>  Intake profile under ops/intake/<id>",
    "  --dir <path>    Explicit intake directory",
    "  --json          Print machine-readable output",
    "  --help          Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    profile: "",
    dir: "",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--profile") {
      args.profile = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--dir") {
      args.dir = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }
  if (!args.profile && !args.dir) {
    console.error("Missing required --profile or --dir");
    usage(2);
  }
  return args;
}

function loadSchema(name) {
  return readJson(path.join(REPO_ROOT, "schemas", name));
}

function pushIssue(target, severity, field, message, details) {
  target.push({
    severity,
    field,
    message,
    ...(details ? { details } : {}),
  });
}

function validateSchema(ajv, schema, value, field, errors) {
  const valid = ajv.validate(schema, value);
  if (!valid) {
    pushIssue(errors, "error", field, `${field} schema validation failed`, { errors: ajv.errors || [] });
  }
}

function analyzeIntake(systemScope, qualityContract) {
  const errors = [];
  const warnings = [];

  if (systemScope.profile_id !== qualityContract.profile_id) {
    pushIssue(errors, "error", "profile_id", "system_scope.profile_id and quality_contract.profile_id must match", {
      system_scope: systemScope.profile_id,
      quality_contract: qualityContract.profile_id,
    });
  }
  if (systemScope.system_id !== qualityContract.system_id) {
    pushIssue(errors, "error", "system_id", "system_scope.system_id and quality_contract.system_id must match", {
      system_scope: systemScope.system_id,
      quality_contract: qualityContract.system_id,
    });
  }

  const todoPaths = [
    ...collectTodoPaths(systemScope, "system_scope"),
    ...collectTodoPaths(qualityContract, "quality_contract"),
  ];
  for (const todoPath of todoPaths) {
    pushIssue(errors, "error", todoPath, "TODO placeholder must be replaced before intake is ready");
  }

  if (
    systemScope.change_under_review?.baseline_target &&
    systemScope.change_under_review?.new_target &&
    systemScope.change_under_review.baseline_target === systemScope.change_under_review.new_target
  ) {
    pushIssue(errors, "error", "system_scope.change_under_review", "baseline_target and new_target must differ");
  }

  const toolOverlap = overlapStrings(systemScope?.tools?.in_scope, systemScope?.tools?.out_of_scope);
  if (toolOverlap.length > 0) {
    pushIssue(errors, "error", "system_scope.tools", "in_scope and out_of_scope tools must not overlap", {
      overlap: toolOverlap,
    });
  }

  if ((qualityContract.critical_tasks || []).length < 1) {
    pushIssue(errors, "error", "quality_contract.critical_tasks", "At least one critical task is required");
  }
  if ((qualityContract.prohibited_behaviors || []).length < 1) {
    pushIssue(errors, "error", "quality_contract.prohibited_behaviors", "At least one prohibited behavior is required");
  }

  if (
    qualityContract.telemetry_requirements?.require_tool_call_result_pairs &&
    !qualityContract.telemetry_requirements?.require_events
  ) {
    pushIssue(
      errors,
      "error",
      "quality_contract.telemetry_requirements.require_tool_call_result_pairs",
      "Tool call/result pair checks require events to be enabled"
    );
  }

  if (
    systemScope.evidence_preferences?.require_eu_exports &&
    !systemScope.deployment_context?.eu_dossier_required
  ) {
    pushIssue(
      warnings,
      "warning",
      "system_scope.evidence_preferences.require_eu_exports",
      "EU exports are enabled while deployment_context.eu_dossier_required is false"
    );
  }

  if (
    systemScope.deployment_context?.eu_dossier_required &&
    !systemScope.evidence_preferences?.require_eu_exports
  ) {
    pushIssue(
      warnings,
      "warning",
      "system_scope.deployment_context.eu_dossier_required",
      "EU dossier is required but evidence_preferences.require_eu_exports is false"
    );
  }

  if (
    systemScope.human_context?.legal_review_required &&
    !String(systemScope.owners?.legal_reviewer ?? "").trim()
  ) {
    pushIssue(
      warnings,
      "warning",
      "system_scope.owners.legal_reviewer",
      "legal_review_required is true but legal_reviewer is empty"
    );
  }

  if (
    qualityContract.case_requirements?.minimum_case_count < 20
  ) {
    pushIssue(
      warnings,
      "warning",
      "quality_contract.case_requirements.minimum_case_count",
      "Recommended target is at least 20 cases for meaningful pass-rate statistics"
    );
  }

  if (
    qualityContract.case_requirements?.minimum_negative_case_ratio < 0.3
  ) {
    pushIssue(
      warnings,
      "warning",
      "quality_contract.case_requirements.minimum_negative_case_ratio",
      "Recommended target is >= 0.3 so the suite contains enough refusal/escalation coverage"
    );
  }

  if (
    qualityContract.case_requirements?.minimum_semantic_case_ratio < 0.2
  ) {
    pushIssue(
      warnings,
      "warning",
      "quality_contract.case_requirements.minimum_semantic_case_ratio",
      "Recommended target is >= 0.2 so text quality is not judged only by lexical checks"
    );
  }

  const multiToolTasks = (qualityContract.critical_tasks || []).filter(
    (task) => uniqueStrings(task.tool_sequence).length > 1 || uniqueStrings(task.required_tools).length > 1
  );
  if (qualityContract.case_requirements?.require_tool_sequence_cases && multiToolTasks.length === 0) {
    pushIssue(
      warnings,
      "warning",
      "quality_contract.case_requirements.require_tool_sequence_cases",
      "Tool sequence coverage is required but no critical task currently declares a multi-step tool path"
    );
  }

  if (
    qualityContract.telemetry_requirements?.require_assumption_state &&
    !systemScope.evidence_preferences?.require_assumption_state
  ) {
    pushIssue(
      warnings,
      "warning",
      "system_scope.evidence_preferences.require_assumption_state",
      "Quality contract requires assumption_state, but the system scope does not request it explicitly"
    );
  }

  if (
    qualityContract.telemetry_requirements?.require_trace_anchor &&
    !systemScope.evidence_preferences?.require_trace_anchor
  ) {
    pushIssue(
      warnings,
      "warning",
      "system_scope.evidence_preferences.require_trace_anchor",
      "Quality contract requires trace anchors, but the system scope does not request them explicitly"
    );
  }

  return { errors, warnings };
}

function renderHuman(summary) {
  const lines = [
    summary.ok ? "intake validate passed" : "intake validate failed",
    `profile: ${summary.summary.profile_id}`,
    `system: ${summary.summary.system_id}`,
    `criticalTasks: ${summary.summary.critical_task_count}`,
    `prohibitedBehaviors: ${summary.summary.prohibited_behavior_count}`,
    `riskyActions: ${summary.summary.risky_action_count}`,
  ];
  if (summary.errors.length > 0) {
    lines.push("errors:");
    for (const issue of summary.errors) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  if (summary.warnings.length > 0) {
    lines.push("warnings:");
    for (const issue of summary.warnings) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const intakeDir = resolveIntakeDir({
    cwd: process.cwd(),
    profile: args.profile || null,
    explicitDir: args.dir || null,
  });
  const intake = loadIntakePair(intakeDir);

  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const schemaErrors = [];
  validateSchema(ajv, loadSchema("system-scope-v1.schema.json"), intake.systemScope, "system_scope", schemaErrors);
  validateSchema(ajv, loadSchema("quality-contract-v1.schema.json"), intake.qualityContract, "quality_contract", schemaErrors);

  const semantic = analyzeIntake(intake.systemScope, intake.qualityContract);
  const errors = [...schemaErrors, ...semantic.errors];
  const warnings = [...semantic.warnings];

  const summary = buildIntakeSummary({
    intakeDir,
    paths: intake.paths,
    systemScope: intake.systemScope,
    qualityContract: intake.qualityContract,
    errors,
    warnings,
  });

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(renderHuman(summary));
  }

  process.exit(summary.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
