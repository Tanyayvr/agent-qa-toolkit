#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAgentEvidenceFixtureArgs,
  resolveAgentEvidenceFixtureRoot,
} from "./lib/product-surface-fixtures.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-package.mjs");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "apps", "evaluator", "reports", "agent-evidence-demo");
const DEFAULT_REPORT_ID = "agent-evidence-demo";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/agent-evidence-demo.mjs [options]",
    "",
    "Options:",
    "  --outDir <path>    Output report directory (default: apps/evaluator/reports/agent-evidence-demo)",
    "  --reportId <id>    Report id to embed in the generated bundle (default: agent-evidence-demo)",
    "  --json             Print machine-readable JSON summary",
    "  --help             Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    outDir: DEFAULT_OUT_DIR,
    reportId: DEFAULT_REPORT_ID,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--outDir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.outDir = path.resolve(value);
      i += 1;
      continue;
    }
    if (arg === "--reportId") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.reportId = value;
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  return args;
}

function runNode(scriptAbs, scriptArgs, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [scriptAbs, ...scriptArgs], {
    cwd,
    encoding: "utf8",
  });
}

function finish(args, payload) {
  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(payload.ok ? 0 : 1);
  }

  if (payload.ok) {
    console.log("Agent Evidence demo: PASS");
    console.log(`- report_dir: ${payload.report_dir}`);
    console.log(`- report_id: ${payload.report_id}`);
    console.log(`- fixture_root: ${payload.fixture_root}`);
    process.exit(0);
  }

  console.error("Agent Evidence demo: FAIL");
  console.error(`- report_dir: ${payload.report_dir}`);
  console.error(`- error: ${payload.error}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runNode(
    PACKAGE_SCRIPT,
    [
      ...buildAgentEvidenceFixtureArgs(REPO_ROOT, {
        outDir: args.outDir,
        reportId: args.reportId,
      }),
      "--sign-if-key-present",
    ]
  );

  if (result.status !== 0) {
    finish(args, {
      ok: false,
      report_dir: args.outDir,
      report_id: args.reportId,
      error: result.stderr || result.stdout || "Agent Evidence demo packaging failed",
    });
  }

  finish(args, {
    ok: true,
    report_dir: args.outDir,
    report_id: args.reportId,
    fixture_root: path.relative(REPO_ROOT, resolveAgentEvidenceFixtureRoot(REPO_ROOT)).split(path.sep).join("/"),
  });
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
