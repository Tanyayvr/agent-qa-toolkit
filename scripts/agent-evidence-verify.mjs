#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/agent-evidence-verify.mjs --reportDir <path> [--strict] [--json]",
    "",
    "Options:",
    "  --reportDir <path>  Evaluator report directory to verify",
    "  --strict            Run underlying pvip verification in strict mode",
    "  --json              Print machine-readable JSON result",
    "  --help              Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    reportDir: null,
    strict: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--strict") {
      args.strict = true;
      continue;
    }
    if (arg === "--reportDir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        console.error("Missing value for --reportDir");
        usage(2);
      }
      args.reportDir = value;
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
  return args;
}

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function pushCheck(checks, name, pass, message, details) {
  checks.push({
    name,
    pass,
    ...(message ? { message } : {}),
    ...(details ? { details } : {}),
  });
}

function runPvipVerify(reportDir, strict) {
  const scriptAbs = path.join(REPO_ROOT, "scripts", "pvip-verify.mjs");
  const args = [scriptAbs, "--reportDir", reportDir, "--json"];
  if (strict) {
    args.push("--mode", "strict");
  } else {
    args.push("--mode", "pvip");
  }
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const raw = (result.stdout || result.stderr || "").trim();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw ? { raw } : null;
  }
  return {
    ok: result.status === 0,
    parsed,
    raw,
  };
}

function finish(args, reportDir, reportId, checks) {
  const failed = checks.filter((check) => !check.pass);
  const result = {
    ok: failed.length === 0,
    report_dir: reportDir,
    ...(reportId ? { report_id: reportId } : {}),
    mode: args.strict ? "strict" : "pvip",
    summary: {
      total_checks: checks.length,
      failed_checks: failed.length,
    },
    checks,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Report: ${reportDir}`);
    if (reportId) console.log(`Report ID: ${reportId}`);
    console.log(`Mode: ${result.mode}`);
    console.log(`Checks: ${checks.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Status: ${result.ok ? "OK" : "FAILED"}`);
    if (failed.length > 0) {
      for (const check of failed) {
        console.log(`- ${check.name}: ${check.message ?? "failed"}`);
      }
    }
  }

  process.exit(result.ok ? 0 : 1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportDir = path.resolve(args.reportDir);
  const checks = [];

  if (!existsSync(reportDir)) {
    throw new Error(`reportDir not found: ${reportDir}`);
  }

  const compareReportPath = path.join(reportDir, "compare-report.json");
  const reportHtmlPath = path.join(reportDir, "report.html");
  const manifestPath = path.join(reportDir, "artifacts", "manifest.json");

  pushCheck(checks, "compare_report_present", existsSync(compareReportPath), "compare-report.json must exist");
  pushCheck(checks, "report_html_present", existsSync(reportHtmlPath), "report.html must exist");
  pushCheck(checks, "manifest_present", existsSync(manifestPath), "artifacts/manifest.json must exist");

  const pvip = runPvipVerify(reportDir, args.strict);
  pushCheck(
    checks,
    "pvip_verify",
    pvip.ok,
    args.strict ? "Underlying strict PVIP verification failed" : "Underlying PVIP verification failed",
    pvip.parsed ?? (pvip.raw ? { raw: pvip.raw } : undefined)
  );

  if (!existsSync(compareReportPath)) {
    return finish(args, reportDir, null, checks);
  }

  const report = readJson(compareReportPath);
  pushCheck(
    checks,
    "quality_self_contained",
    report?.quality_flags?.self_contained === true,
    "compare-report.json.quality_flags.self_contained must be true",
    report?.quality_flags ? { quality_flags: report.quality_flags } : undefined
  );
  pushCheck(
    checks,
    "quality_portable_paths",
    report?.quality_flags?.portable_paths === true,
    "compare-report.json.quality_flags.portable_paths must be true",
    report?.quality_flags ? { quality_flags: report.quality_flags } : undefined
  );

  const expectedPaths = {
    cases_path: "_source_inputs/cases.json",
    baseline_dir: "_source_inputs/baseline",
    new_dir: "_source_inputs/new",
  };
  pushCheck(
    checks,
    "source_snapshot_report_paths",
    report.cases_path === expectedPaths.cases_path &&
      report.baseline_dir === expectedPaths.baseline_dir &&
      report.new_dir === expectedPaths.new_dir,
    "compare-report.json must point at packaged _source_inputs paths",
    {
      expected: expectedPaths,
      actual: {
        cases_path: report.cases_path ?? null,
        baseline_dir: report.baseline_dir ?? null,
        new_dir: report.new_dir ?? null,
      },
    }
  );

  const requiredSnapshotFiles = [
    "_source_inputs/cases.json",
    "_source_inputs/baseline/run.json",
    "_source_inputs/new/run.json",
  ];
  const missingSnapshotFiles = requiredSnapshotFiles.filter((relPath) => !existsSync(path.join(reportDir, relPath)));
  pushCheck(
    checks,
    "source_snapshot_present",
    missingSnapshotFiles.length === 0,
    "Packaged source snapshot must exist under _source_inputs/",
    missingSnapshotFiles.length ? { missing_files: missingSnapshotFiles } : { files_checked: requiredSnapshotFiles }
  );

  return finish(args, reportDir, report.report_id ?? null, checks);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
