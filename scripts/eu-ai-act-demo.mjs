#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEuAiActFixtureArgs,
  resolveEuAiActFixtureRoot,
} from "./lib/product-surface-fixtures.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-package.mjs");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "apps", "evaluator", "reports", "eu-ai-act-demo");
const DEFAULT_REPORT_ID = "eu-ai-act-demo";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-demo.mjs [options]",
    "",
    "Options:",
    "  --outDir <path>      Output report directory (default: apps/evaluator/reports/eu-ai-act-demo)",
    "  --reportId <id>      Report id to embed in the generated bundle (default: eu-ai-act-demo)",
    "  --seedReportId <id>  Seed report id used to populate monitoring history (default: <reportId>-seed)",
    "  --trendDb <path>     Stable trend DB path to reuse instead of a temporary DB",
    "  --json               Print machine-readable JSON summary",
    "  --help               Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    outDir: DEFAULT_OUT_DIR,
    reportId: DEFAULT_REPORT_ID,
    seedReportId: `${DEFAULT_REPORT_ID}-seed`,
    trendDb: null,
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
      if (args.seedReportId === `${DEFAULT_REPORT_ID}-seed`) {
        args.seedReportId = `${value}-seed`;
      }
      i += 1;
      continue;
    }
    if (arg === "--seedReportId") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.seedReportId = value;
      i += 1;
      continue;
    }
    if (arg === "--trendDb") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.trendDb = path.resolve(value);
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
    console.log("EU AI Act demo: PASS");
    console.log(`- report_dir: ${payload.report_dir}`);
    console.log(`- report_id: ${payload.report_id}`);
    console.log(`- seed_report_id: ${payload.seed_report_id}`);
    console.log(`- fixture_root: ${payload.fixture_root}`);
    if (payload.trend_db) console.log(`- trend_db: ${payload.trend_db}`);
    process.exit(0);
  }

  console.error("EU AI Act demo: FAIL");
  console.error(`- report_dir: ${payload.report_dir}`);
  console.error(`- error: ${payload.error}`);
  process.exit(1);
}

function packageVariant(params) {
  const result = runNode(PACKAGE_SCRIPT, buildEuAiActFixtureArgs(REPO_ROOT, params));
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `EU AI Act demo packaging failed for ${params.variant}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "aq-eu-ai-act-demo-"));
  const seedOutDir = path.join(tempRoot, "seed-report");
  const trendDb = args.trendDb ?? path.join(tempRoot, "trend.sqlite");

  try {
    packageVariant({
      variant: "seed",
      outDir: seedOutDir,
      reportId: args.seedReportId,
      trendDb,
    });
    packageVariant({
      variant: "current",
      outDir: args.outDir,
      reportId: args.reportId,
      trendDb,
    });
  } catch (error) {
    finish(args, {
      ok: false,
      report_dir: args.outDir,
      report_id: args.reportId,
      seed_report_id: args.seedReportId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  finish(args, {
    ok: true,
    report_dir: args.outDir,
    report_id: args.reportId,
    seed_report_id: args.seedReportId,
    fixture_root: path.relative(REPO_ROOT, resolveEuAiActFixtureRoot(REPO_ROOT)).split(path.sep).join("/"),
    trend_db: args.trendDb ?? null,
  });
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
