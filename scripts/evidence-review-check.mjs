#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

import {
  resolveReviewContext,
  syncCorrectiveActionRegister,
  validateReviewDecision,
} from "./lib/evidence-review.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-review-check.mjs --reportDir <path> [options]",
    "",
    "Options:",
    "  --reportDir <path>  Evaluator report directory containing review/ artifacts",
    "  --profile <id>      Optional intake profile under ops/intake/<id>",
    "  --dir <path>        Optional explicit intake directory",
    "  --json              Print machine-readable output",
    "  --help              Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    reportDir: "",
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
    if (arg === "--reportDir") {
      args.reportDir = String(argv[i + 1] ?? "");
      i += 1;
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

  if (!args.reportDir.trim()) {
    console.error("Missing required --reportDir");
    usage(2);
  }

  return args;
}

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function pushIssue(target, severity, field, message, details) {
  target.push({
    severity,
    field,
    message,
    ...(details ? { details } : {}),
  });
}

function renderHuman(result) {
  const lines = [
    result.ok ? "review check passed" : "review check failed",
    `framework: ${result.framework}`,
    `report: ${result.report_dir}`,
    `reportId: ${result.report_id}`,
    `decisionStatus: ${result.summary.decision_status ?? "unknown"}`,
    `machineGaps: ${result.summary.machine_gap_count}`,
    `residualGapActions: ${result.summary.residual_gap_action_count}`,
    `newCorrectiveActions: ${result.summary.corrective_action_new_gap_count ?? 0}`,
    `recurringCorrectiveActions: ${result.summary.corrective_action_recurring_gap_count ?? 0}`,
  ];
  if (typeof result.summary.eu_scaffold_completion_pending_count === "number") {
    lines.push(`euScaffoldPending: ${result.summary.eu_scaffold_completion_pending_count}`);
  }
  if (result.files?.corrective_action_register_href) {
    lines.push(`correctiveActionRegister: ${result.files.corrective_action_register_href}`);
  }
  if (result.errors.length > 0) {
    lines.push("errors:");
    for (const issue of result.errors) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  if (result.warnings.length > 0) {
    lines.push("warnings:");
    for (const issue of result.warnings) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = resolveReviewContext({
    cwd: process.cwd(),
    reportDir: args.reportDir,
    profile: args.profile || null,
    explicitIntakeDir: args.dir || null,
  });

  const reviewDecisionPath = path.join(context.reportDir, "review", "review-decision.json");
  const handoffNotePath = path.join(context.reportDir, "review", "handoff-note.md");
  const errors = [];
  const warnings = [];

  if (!existsSync(reviewDecisionPath)) {
    pushIssue(errors, "error", "review/review-decision.json", "review-decision.json must exist");
  }

  let reviewDecision = null;
  if (existsSync(reviewDecisionPath)) {
    try {
      reviewDecision = readJson(reviewDecisionPath);
    } catch (error) {
      pushIssue(errors, "error", "review/review-decision.json", "review-decision.json must be valid JSON", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (reviewDecision) {
    const schemaPath = path.join(REPO_ROOT, "schemas", "evidence-review-decision-v1.schema.json");
    const schema = readJson(schemaPath);
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    const valid = ajv.validate(schema, reviewDecision);
    if (!valid) {
      pushIssue(errors, "error", "review/review-decision.json", "review-decision.json schema validation failed", {
        errors: ajv.errors || [],
      });
    }

    if (reviewDecision.report_id !== context.compareReport.report_id) {
      pushIssue(errors, "error", "review/review-decision.json.report_id", "report_id must match compare-report.json", {
        expected: context.compareReport.report_id,
        actual: reviewDecision.report_id ?? null,
      });
    }

    const validation = validateReviewDecision({
      context,
      reviewDecision,
      handoffNoteText: existsSync(handoffNotePath) ? readFileSync(handoffNotePath, "utf8") : "",
    });
    errors.push(...validation.errors.map((issue) => ({ severity: "error", ...issue })));
    warnings.push(...validation.warnings.map((issue) => ({ severity: "warning", ...issue })));

    const result = {
      ok: errors.length === 0,
      framework: context.framework,
      report_dir: context.reportDir,
      report_id: context.compareReport.report_id,
      summary: validation.summary,
      files: {},
      errors,
      warnings,
    };

    if (result.ok) {
      const continuitySync = syncCorrectiveActionRegister({ context, reviewDecision });
      if (continuitySync) {
        const registerSchemaPath = path.join(REPO_ROOT, "schemas", "corrective-action-register-v1.schema.json");
        const registerSchema = readJson(registerSchemaPath);
        const registerValid = ajv.validate(registerSchema, continuitySync.register);
        if (!registerValid) {
          errors.push({
            severity: "error",
            field: "ops/intake/<profile>/corrective-action-register.json",
            message: "corrective-action-register.json schema validation failed",
            details: {
              errors: ajv.errors || [],
            },
          });
          result.ok = false;
        }
        result.files.corrective_action_register_href = continuitySync.href;
        result.files.corrective_action_register_snapshot_href = continuitySync.review_snapshot_href;
        result.summary.corrective_action_register_total_items = continuitySync.summary.total_items;
        result.summary.corrective_action_register_open_items = continuitySync.summary.open_items;
        result.summary.corrective_action_register_resolved_items = continuitySync.summary.resolved_items;
      }
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(renderHuman(result));
    }
    process.exit(result.ok ? 0 : 1);
  }

  const result = {
    ok: false,
    framework: context.framework,
    report_dir: context.reportDir,
    report_id: context.compareReport.report_id,
    summary: {
      decision_status: null,
      machine_gap_count: 0,
      residual_gap_action_count: 0,
      corrective_action_new_gap_count: 0,
      corrective_action_recurring_gap_count: 0,
      eu_scaffold_completion_pending_count: 0,
      legal_review_requested: false,
    },
    files: {},
    errors,
    warnings,
  };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHuman(result));
  }
  process.exit(1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
