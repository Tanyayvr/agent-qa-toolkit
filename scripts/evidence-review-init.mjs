#!/usr/bin/env node
import {
  buildReviewDecisionTemplate,
  resolveReviewContext,
  writeReviewArtifacts,
} from "./lib/evidence-review.mjs";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/evidence-review-init.mjs --reportDir <path> [options]",
    "",
    "Options:",
    "  --reportDir <path>  Evaluator report directory to scaffold review artifacts for",
    "  --profile <id>      Optional intake profile under ops/intake/<id>",
    "  --dir <path>        Optional explicit intake directory",
    "  --force             Overwrite existing review artifacts",
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
    force: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--force") {
      args.force = true;
      continue;
    }
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

function renderHuman(summary) {
  const lines = [
    "review scaffold complete",
    `framework: ${summary.framework}`,
    `reportDir: ${summary.report_dir}`,
    `reviewDecision: ${summary.files.review_decision_href}`,
    `handoffNote: ${summary.files.handoff_note_href}`,
  ];
  if (summary.files.intake_snapshot) {
    lines.push(`intakeSnapshot: ${summary.files.intake_snapshot.system_scope_href}`);
    if (summary.files.intake_snapshot.cases_coverage_href) {
      lines.push(`casesCoverage: ${summary.files.intake_snapshot.cases_coverage_href}`);
    }
    if (summary.files.intake_snapshot.adapter_capability_href) {
      lines.push(`adapterCapability: ${summary.files.intake_snapshot.adapter_capability_href}`);
    }
    if (summary.files.intake_snapshot.run_fingerprint_href) {
      lines.push(`runFingerprint: ${summary.files.intake_snapshot.run_fingerprint_href}`);
    }
    if (summary.files.intake_snapshot.corrective_action_register_href) {
      lines.push(`correctiveActionRegister: ${summary.files.intake_snapshot.corrective_action_register_href}`);
    }
  }
  lines.push("note: review artifacts contain human-owned TODO placeholders and must be completed before review:check passes.");
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
  const reviewDecision = buildReviewDecisionTemplate(context);
  const files = writeReviewArtifacts({
    context,
    reviewDecision,
    force: args.force,
  });

  const summary = {
    ok: true,
    framework: context.framework,
    report_id: context.compareReport.report_id,
    report_dir: context.reportDir,
    files,
    machine_gap_count: reviewDecision.human_completion.residual_gap_actions.length,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  console.log(renderHuman(summary));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
