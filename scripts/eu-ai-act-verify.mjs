#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CORE_VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-verify.mjs");

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-verify.mjs --reportDir <path> [--strict] [--json]",
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

function isPortableHref(href) {
  if (typeof href !== "string" || !href.length) return false;
  if (href.includes("://")) return false;
  if (href.startsWith("/") || href.startsWith("\\")) return false;
  if (href.includes("..")) return false;
  return true;
}

function pathInsideReport(reportDir, relPath) {
  const abs = path.resolve(reportDir, relPath);
  const base = path.resolve(reportDir);
  return abs === base || abs.startsWith(base + path.sep);
}

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function checkFileExists(reportDir, relPath) {
  return isPortableHref(relPath) && pathInsideReport(reportDir, relPath) && existsSync(path.join(reportDir, relPath));
}

function sameObject(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pushCheck(checks, name, pass, message, details) {
  checks.push({
    name,
    pass,
    ...(message ? { message } : {}),
    ...(details ? { details } : {}),
  });
}

function runCoreVerify(reportDir, strict) {
  const args = [CORE_VERIFY_SCRIPT, "--reportDir", reportDir, "--json"];
  if (strict) args.push("--strict");
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportDir = path.resolve(args.reportDir);
  const checks = [];

  if (!existsSync(reportDir)) {
    throw new Error(`reportDir not found: ${reportDir}`);
  }

  const compareReportPath = path.join(reportDir, "compare-report.json");
  const reportHtmlPath = path.join(reportDir, "report.html");
  const coreVerify = runCoreVerify(reportDir, args.strict);
  pushCheck(
    checks,
    "agent_evidence_verify",
    coreVerify.ok,
    args.strict ? "Underlying strict Agent Evidence verification failed" : "Underlying Agent Evidence verification failed",
    coreVerify.parsed ?? (coreVerify.raw ? { raw: coreVerify.raw } : undefined)
  );

  if (!existsSync(compareReportPath)) {
    return finish(args, reportDir, null, checks);
  }

  const report = readJson(compareReportPath);
  const exportsBlock = report?.compliance_exports?.eu_ai_act;
  const requiredExportKeys = [
    "coverage_href",
    "annex_iv_href",
    "report_html_href",
    "evidence_index_href",
    "article_13_instructions_href",
    "article_9_risk_register_href",
    "article_72_monitoring_plan_href",
    "article_17_qms_lite_href",
    "human_oversight_summary_href",
    "release_review_href",
    "post_market_monitoring_href",
  ];
  const exportsPresent = Boolean(exportsBlock) && requiredExportKeys.every((key) => typeof exportsBlock[key] === "string");
  pushCheck(
    checks,
    "eu_ai_act_exports_present",
    exportsPresent,
    "compare-report.json must expose eu_ai_act compliance exports",
    exportsPresent ? { report_id: report.report_id } : { exports: exportsBlock ?? null }
  );

  if (!exportsPresent) {
    return finish(args, reportDir, report.report_id ?? null, checks);
  }

  const expectedBundleArtifacts = {
    compare_report_href: "compare-report.json",
    evaluator_report_html_href: "report.html",
    manifest_href: "artifacts/manifest.json",
    coverage_href: exportsBlock.coverage_href,
    annex_iv_href: exportsBlock.annex_iv_href,
    report_html_href: exportsBlock.report_html_href,
    evidence_index_href: exportsBlock.evidence_index_href,
    article_13_instructions_href: exportsBlock.article_13_instructions_href,
    article_9_risk_register_href: exportsBlock.article_9_risk_register_href,
    article_72_monitoring_plan_href: exportsBlock.article_72_monitoring_plan_href,
    article_17_qms_lite_href: exportsBlock.article_17_qms_lite_href,
    human_oversight_summary_href: exportsBlock.human_oversight_summary_href,
    release_review_href: exportsBlock.release_review_href,
    post_market_monitoring_href: exportsBlock.post_market_monitoring_href,
  };

  const artifactSpecs = [
    {
      name: "coverage",
      href: exportsBlock.coverage_href,
      schema: "eu-ai-act-coverage-v1.schema.json",
    },
    {
      name: "annex",
      href: exportsBlock.annex_iv_href,
      schema: "eu-ai-act-annex-iv-v1.schema.json",
    },
    {
      name: "evidence_index",
      href: exportsBlock.evidence_index_href,
      schema: "eu-ai-act-evidence-index-v1.schema.json",
    },
    {
      name: "article_13_instructions",
      href: exportsBlock.article_13_instructions_href,
      schema: "eu-ai-act-article-13-instructions-v1.schema.json",
    },
    {
      name: "article_9_risk_register",
      href: exportsBlock.article_9_risk_register_href,
      schema: "eu-ai-act-article-9-risk-register-v1.schema.json",
    },
    {
      name: "article_72_monitoring_plan",
      href: exportsBlock.article_72_monitoring_plan_href,
      schema: "eu-ai-act-article-72-monitoring-plan-v1.schema.json",
    },
    {
      name: "article_17_qms_lite",
      href: exportsBlock.article_17_qms_lite_href,
      schema: "eu-ai-act-article-17-qms-lite-v1.schema.json",
    },
    {
      name: "human_oversight",
      href: exportsBlock.human_oversight_summary_href,
      schema: "eu-ai-act-human-oversight-v1.schema.json",
    },
    {
      name: "release_review",
      href: exportsBlock.release_review_href,
      schema: "eu-ai-act-release-review-v1.schema.json",
    },
    {
      name: "post_market_monitoring",
      href: exportsBlock.post_market_monitoring_href,
      schema: "eu-ai-act-post-market-monitoring-v1.schema.json",
    },
  ];

  const dossierHtmlPresent = checkFileExists(reportDir, exportsBlock.report_html_href);
  pushCheck(
    checks,
    "compliance_dossier_html_present",
    dossierHtmlPresent,
    "Compliance dossier HTML must exist",
    dossierHtmlPresent ? { href: exportsBlock.report_html_href } : { href: exportsBlock.report_html_href }
  );

  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const complianceDocs = [];
  let allArtifactsPresent = true;

  for (const spec of artifactSpecs) {
    const present = checkFileExists(reportDir, spec.href);
    pushCheck(
      checks,
      `${spec.name}_present`,
      present,
      `${spec.href} must exist and stay inside the report directory`,
      { href: spec.href }
    );
    allArtifactsPresent = allArtifactsPresent && present;
    if (!present) continue;
    const doc = readJson(path.join(reportDir, spec.href));
    const schema = readJson(path.join(REPO_ROOT, "schemas", spec.schema));
    const valid = ajv.validate(schema, doc);
    pushCheck(
      checks,
      `${spec.name}_schema_valid`,
      valid,
      `${spec.name} schema validation failed`,
      valid ? undefined : { errors: ajv.errors || [] }
    );
    const reportIdMatch = doc.report_id === report.report_id;
    pushCheck(
      checks,
      `${spec.name}_report_id_match`,
      reportIdMatch,
      `${spec.name} report_id must match compare-report.json`,
      { expected: report.report_id, actual: doc.report_id }
    );
    if (doc.bundle_artifacts && typeof doc.bundle_artifacts === "object") {
      const bundleArtifactsMatch = sameObject(doc.bundle_artifacts, expectedBundleArtifacts);
      pushCheck(
        checks,
        `${spec.name}_bundle_artifacts_match`,
        bundleArtifactsMatch,
        `${spec.name} bundle_artifacts must match compare-report exports`,
        bundleArtifactsMatch ? undefined : { expected: expectedBundleArtifacts, actual: doc.bundle_artifacts }
      );
    } else {
      pushCheck(
        checks,
        `${spec.name}_bundle_artifacts_match`,
        false,
        `${spec.name} must expose bundle_artifacts`,
        { actual: doc.bundle_artifacts ?? null }
      );
    }
    complianceDocs.push({ name: spec.name, doc });
  }

  pushCheck(
    checks,
    "all_compliance_artifacts_present",
    allArtifactsPresent && dossierHtmlPresent,
    "All compliance artifacts must exist before handoff"
  );

  if (dossierHtmlPresent) {
    const dossierHtml = readFileSync(path.join(reportDir, exportsBlock.report_html_href), "utf8");
    const dossierLinksOk =
      dossierHtml.includes("article-13-instructions.json") &&
      dossierHtml.includes("article-9-risk-register.json") &&
      dossierHtml.includes("article-72-monitoring-plan.json") &&
      dossierHtml.includes("article-17-qms-lite.json") &&
      dossierHtml.includes("human-oversight-summary.json") &&
      dossierHtml.includes("release-review.json") &&
      dossierHtml.includes("post-market-monitoring.json");
    pushCheck(
      checks,
      "dossier_html_links",
      dossierLinksOk,
      "Compliance dossier HTML must link to Article 13, Article 9, Article 72, Article 17, oversight, release review, and post-market monitoring artifacts"
    );
  }

  if (existsSync(reportHtmlPath)) {
    const reportHtml = readFileSync(reportHtmlPath, "utf8");
    const mainLinksOk =
      reportHtml.includes(exportsBlock.report_html_href) &&
      reportHtml.includes(exportsBlock.article_13_instructions_href) &&
      reportHtml.includes(exportsBlock.article_9_risk_register_href) &&
      reportHtml.includes(exportsBlock.article_72_monitoring_plan_href) &&
      reportHtml.includes(exportsBlock.article_17_qms_lite_href) &&
      reportHtml.includes(exportsBlock.post_market_monitoring_href);
    pushCheck(
      checks,
      "main_report_links",
      mainLinksOk,
      "Main report.html must expose compliance dossier, Article 13, Article 9, Article 72, Article 17, and post-market monitoring links"
    );
  }

  const docsConsistency = complianceDocs.every(({ doc }) => doc.framework === "EU_AI_ACT");
  pushCheck(
    checks,
    "compliance_framework_consistency",
    docsConsistency,
    "All compliance documents must declare framework EU_AI_ACT"
  );

  return finish(args, reportDir, report.report_id ?? null, checks);
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

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
