#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

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

function sameObject(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
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

function validateWithSchema(schemaName, data) {
  const schemaPath = path.join(REPO_ROOT, "schemas", schemaName);
  const schema = readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(data);
  return {
    ok: Boolean(ok),
    errors: validate.errors ?? [],
  };
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
  const retentionHref = report?.bundle_exports?.retention_archive_controls_href;
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

  pushCheck(
    checks,
    "retention_archive_export_present",
    typeof retentionHref === "string" && retentionHref.length > 0,
    "compare-report.json must expose bundle_exports.retention_archive_controls_href",
    { actual: retentionHref ?? null }
  );

  if (typeof retentionHref === "string" && retentionHref.length > 0) {
    const retentionPath = path.join(reportDir, retentionHref);
    pushCheck(
      checks,
      "retention_archive_export_file_present",
      existsSync(retentionPath),
      "archive/retention-controls.json must exist",
      { href: retentionHref }
    );

    if (existsSync(retentionPath)) {
      const retentionDoc = readJson(retentionPath);
      const validation = validateWithSchema("retention-archive-controls-v1.schema.json", retentionDoc);
      pushCheck(
        checks,
        "retention_archive_export_schema",
        validation.ok,
        "retention archive controls export must match schema",
        validation.ok ? undefined : { errors: validation.errors }
      );
      const expectedBundleArtifacts = {
        compare_report_href: "compare-report.json",
        report_html_href: "report.html",
        manifest_href: "artifacts/manifest.json",
        retention_archive_controls_href: retentionHref,
      };
      pushCheck(
        checks,
        "retention_archive_bundle_artifacts_match",
        sameObject(retentionDoc?.bundle_artifacts, expectedBundleArtifacts),
        "retention archive controls bundle_artifacts must match compare-report exports",
        sameObject(retentionDoc?.bundle_artifacts, expectedBundleArtifacts)
          ? undefined
          : { expected: expectedBundleArtifacts, actual: retentionDoc?.bundle_artifacts ?? null }
      );
    }
  }

  const items = Array.isArray(report?.items) ? report.items : [];
  for (const item of items) {
    const caseId = typeof item?.case_id === "string" ? item.case_id : "unknown-case";
    const artifacts = item?.artifacts && typeof item.artifacts === "object" ? item.artifacts : {};
    for (const side of ["baseline", "new"]) {
      const caseHref = artifacts[`${side}_case_response_href`];
      const telemetryHref = artifacts[`${side}_tool_telemetry_href`];
      const telemetryKey = artifacts[`${side}_tool_telemetry_key`];
      const telemetryRequired = typeof caseHref === "string" && caseHref.length > 0;
      pushCheck(
        checks,
        `${caseId}_${side}_tool_telemetry_href_present`,
        !telemetryRequired || (typeof telemetryHref === "string" && telemetryHref.length > 0),
        `${caseId} ${side} must expose tool telemetry artifact when case response exists`,
        {
          case_response_href: caseHref ?? null,
          tool_telemetry_href: telemetryHref ?? null,
          tool_telemetry_key: telemetryKey ?? null,
        }
      );

      if (typeof telemetryHref !== "string" || telemetryHref.length === 0) continue;
      const telemetryPath = path.join(reportDir, telemetryHref);
      pushCheck(
        checks,
        `${caseId}_${side}_tool_telemetry_file_present`,
        existsSync(telemetryPath),
        `${caseId} ${side} tool telemetry artifact must exist`,
        { href: telemetryHref }
      );
      if (!existsSync(telemetryPath)) continue;

      const telemetryDoc = readJson(telemetryPath);
      const telemetryValidation = validateWithSchema("tool-telemetry-artifact-v1.schema.json", telemetryDoc);
      pushCheck(
        checks,
        `${caseId}_${side}_tool_telemetry_schema`,
        telemetryValidation.ok,
        `${caseId} ${side} tool telemetry artifact must match schema`,
        telemetryValidation.ok ? undefined : { errors: telemetryValidation.errors, href: telemetryHref }
      );
      pushCheck(
        checks,
        `${caseId}_${side}_tool_telemetry_identity`,
        telemetryDoc?.case_id === caseId && telemetryDoc?.version === side,
        `${caseId} ${side} tool telemetry artifact must match compare-report identity`,
        {
          expected: { case_id: caseId, version: side },
          actual: {
            case_id: telemetryDoc?.case_id ?? null,
            version: telemetryDoc?.version ?? null,
          },
        }
      );

      const resultRecords = Array.isArray(telemetryDoc?.tool_results) ? telemetryDoc.tool_results : [];
      for (let index = 0; index < resultRecords.length; index += 1) {
        const resultRecord = resultRecords[index];
        const resultHref = resultRecord?.normalized_result_artifact_href;
        pushCheck(
          checks,
          `${caseId}_${side}_tool_result_${index + 1}_href_present`,
          typeof resultHref === "string" && resultHref.length > 0,
          `${caseId} ${side} tool_result entries must expose normalized_result_artifact_href`,
          { call_id: resultRecord?.call_id ?? null, href: resultHref ?? null }
        );
        if (typeof resultHref !== "string" || resultHref.length === 0) continue;
        const resultPath = path.join(reportDir, resultHref);
        pushCheck(
          checks,
          `${caseId}_${side}_tool_result_${index + 1}_file_present`,
          existsSync(resultPath),
          `${caseId} ${side} tool result artifact must exist`,
          { href: resultHref, call_id: resultRecord?.call_id ?? null }
        );
        if (!existsSync(resultPath)) continue;
        const resultDoc = readJson(resultPath);
        const resultValidation = validateWithSchema("tool-result-artifact-v1.schema.json", resultDoc);
        pushCheck(
          checks,
          `${caseId}_${side}_tool_result_${index + 1}_schema`,
          resultValidation.ok,
          `${caseId} ${side} tool result artifact must match schema`,
          resultValidation.ok ? undefined : { errors: resultValidation.errors, href: resultHref }
        );
      }
    }
  }

  if (existsSync(reportHtmlPath) && typeof retentionHref === "string" && retentionHref.length > 0) {
    const reportHtml = readFileSync(reportHtmlPath, "utf8");
    pushCheck(
      checks,
      "report_html_retention_archive_link",
      reportHtml.includes(retentionHref),
      "report.html must link to retention archive controls",
      { href: retentionHref }
    );
  }

  return finish(args, reportDir, report.report_id ?? null, checks);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
