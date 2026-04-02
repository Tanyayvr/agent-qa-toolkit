#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TODO = "TODO";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-authority-request-init.mjs --reportDir <path> [--out <path>] [--force] [--json]",
    "",
    "Options:",
    "  --reportDir <path>  Verified EU report directory",
    "  --out <path>        Output authority-request path (default: <reportDir>/review/authority-request.json)",
    "  --force             Overwrite an existing authority-request file",
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
    out: "",
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
      args.reportDir = path.resolve(String(argv[i + 1] ?? ""));
      i += 1;
      continue;
    }
    if (arg === "--out") {
      args.out = path.resolve(String(argv[i + 1] ?? ""));
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  if (!args.reportDir) {
    console.error("Missing required --reportDir");
    usage(2);
  }
  if (!args.out) {
    args.out = path.join(args.reportDir, "review", "authority-request.json");
  }
  return args;
}

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function writeJson(absPath, value) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildTemplate(reportDir) {
  const compareReport = readJson(path.join(reportDir, "compare-report.json"));
  const reviewDecisionPath = path.join(reportDir, "review", "review-decision.json");
  const reviewPresent = existsSync(reviewDecisionPath);
  return {
    schema_version: 1,
    artifact_type: "eu_ai_act_authority_request",
    framework: "EU_AI_ACT",
    report_id: String(compareReport.report_id || TODO),
    request_context: {
      request_type: "authority",
      requesting_party: TODO,
      jurisdiction: TODO,
      legal_basis: TODO,
      submission_deadline: TODO,
      submission_channel: TODO,
      response_owner: TODO,
      legal_approver: TODO,
    },
    disclosure_scope: {
      include_source_inputs: false,
      include_review_artifacts: reviewPresent,
      scope_rationale: TODO,
      source_inputs_approval: "not_requested",
    },
    archive_controls: {
      retention_owner: TODO,
      archive_location: TODO,
      legal_hold_status: "not_set",
      external_surfaces_reviewed: false,
      archive_export_recorded: false,
      note: TODO,
    },
    completion_status: "draft",
    residual_gap_acknowledgement: TODO,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const compareReportPath = path.join(args.reportDir, "compare-report.json");
  if (!existsSync(compareReportPath)) {
    throw new Error(`compare-report.json not found: ${compareReportPath}`);
  }
  if (existsSync(args.out) && !args.force) {
    throw new Error(`authority-request already exists: ${args.out} (use --force to overwrite)`);
  }

  const template = buildTemplate(args.reportDir);
  writeJson(args.out, template);

  const payload = {
    ok: true,
    report_dir: args.reportDir,
    authority_request: path.relative(REPO_ROOT, args.out).split(path.sep).join("/"),
    note: "Complete TODO fields and set completion_status=ready before authority-response packaging.",
  };
  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log("authority request scaffold complete");
  console.log(`reportDir: ${payload.report_dir}`);
  console.log(`authorityRequest: ${payload.authority_request}`);
  console.log(payload.note);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
