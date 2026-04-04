#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { EU_REVIEWER_PDF_REL_PATH } from "./lib/reviewer-pdf.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CORE_VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-verify.mjs");
const EU_SCHEMA_DIR = path.join(REPO_ROOT, "schemas", "eu-ai-act");
const EU_CONTRACTS = new Set(["minimum", "full"]);
const REQUIRED_EU_AI_ACT_ENVIRONMENT_FIELDS = [
  "agent_id",
  "agent_version",
  "model",
  "model_version",
  "prompt_version",
  "tools_version",
  "config_hash",
];

const MINIMUM_REQUIRED_EXPORT_KEYS = [
  "annex_iv_href",
  "article_10_data_governance_href",
  "article_13_instructions_href",
  "article_16_provider_obligations_href",
  "article_43_conformity_assessment_href",
  "article_47_declaration_of_conformity_href",
  "article_9_risk_register_href",
  "article_72_monitoring_plan_href",
  "article_17_qms_lite_href",
  "annex_v_declaration_content_href",
  "human_oversight_summary_href",
];

const FULL_REQUIRED_EXPORT_KEYS = [
  "coverage_href",
  "annex_iv_href",
  "article_10_data_governance_href",
  "report_html_href",
  "reviewer_html_href",
  "reviewer_markdown_href",
  "evidence_index_href",
  "article_13_instructions_href",
  "article_16_provider_obligations_href",
  "article_43_conformity_assessment_href",
  "article_47_declaration_of_conformity_href",
  "article_9_risk_register_href",
  "article_72_monitoring_plan_href",
  "article_17_qms_lite_href",
  "annex_v_declaration_content_href",
  "article_73_serious_incident_pack_href",
  "human_oversight_summary_href",
  "release_review_href",
  "post_market_monitoring_href",
];

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-verify.mjs --reportDir <path> [--contract <minimum|full>] [--strict] [--json]",
    "",
    "Options:",
    "  --reportDir <path>  Evaluator report directory to verify",
    "  --contract <minimum|full>  EU compliance contract to verify (default: minimum)",
    "  --strict            Run underlying pvip verification in strict mode",
    "  --json              Print machine-readable JSON result",
    `  Reviewer PDF is required at ${EU_REVIEWER_PDF_REL_PATH} for --contract full`,
    "  --help              Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    reportDir: null,
    contract: "minimum",
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
    if (arg === "--contract") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        console.error("Missing value for --contract");
        usage(2);
      }
      if (!EU_CONTRACTS.has(value)) {
        console.error(`Unsupported --contract value: ${value}`);
        usage(2);
      }
      args.contract = value;
      i += 1;
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

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
}

function sameObject(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function objectContainsSubset(actual, expected) {
  if (!actual || typeof actual !== "object") return false;
  return Object.entries(expected).every(([key, value]) => {
    return Object.prototype.hasOwnProperty.call(actual, key) && sameObject(actual[key], value);
  });
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
  const environment = report?.environment && typeof report.environment === "object" ? report.environment : null;
  const missingEnvironmentFields = REQUIRED_EU_AI_ACT_ENVIRONMENT_FIELDS.filter((field) => {
    const value = environment?.[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
  pushCheck(
    checks,
    "eu_ai_act_environment_identity",
    missingEnvironmentFields.length === 0,
    "EU AI Act bundle must include environment identity fields",
    missingEnvironmentFields.length === 0
      ? { environment }
      : { missing_fields: missingEnvironmentFields, environment }
  );

  const exportsBlock = report?.compliance_exports?.eu_ai_act;
  const requiredExportKeys = args.contract === "full" ? FULL_REQUIRED_EXPORT_KEYS : MINIMUM_REQUIRED_EXPORT_KEYS;
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
    annex_iv_href: exportsBlock.annex_iv_href,
    article_10_data_governance_href: exportsBlock.article_10_data_governance_href,
    article_13_instructions_href: exportsBlock.article_13_instructions_href,
    article_16_provider_obligations_href: exportsBlock.article_16_provider_obligations_href,
    article_43_conformity_assessment_href: exportsBlock.article_43_conformity_assessment_href,
    article_47_declaration_of_conformity_href: exportsBlock.article_47_declaration_of_conformity_href,
    article_9_risk_register_href: exportsBlock.article_9_risk_register_href,
    article_72_monitoring_plan_href: exportsBlock.article_72_monitoring_plan_href,
    article_17_qms_lite_href: exportsBlock.article_17_qms_lite_href,
    annex_v_declaration_content_href: exportsBlock.annex_v_declaration_content_href,
    human_oversight_summary_href: exportsBlock.human_oversight_summary_href,
  };
  const expectedFullBundleArtifacts = {
    ...expectedBundleArtifacts,
    coverage_href: exportsBlock.coverage_href,
    report_html_href: exportsBlock.report_html_href,
    reviewer_html_href: exportsBlock.reviewer_html_href,
    reviewer_markdown_href: exportsBlock.reviewer_markdown_href,
    evidence_index_href: exportsBlock.evidence_index_href,
    article_73_serious_incident_pack_href: exportsBlock.article_73_serious_incident_pack_href,
    release_review_href: exportsBlock.release_review_href,
    post_market_monitoring_href: exportsBlock.post_market_monitoring_href,
  };

  const artifactSpecs = [
    ...(args.contract === "full"
      ? [
          {
            name: "coverage",
            href: exportsBlock.coverage_href,
            schema: "eu-ai-act-coverage-v1.schema.json",
          },
        ]
      : []),
    {
      name: "annex",
      href: exportsBlock.annex_iv_href,
      schema: "eu-ai-act-annex-iv-v1.schema.json",
    },
    {
      name: "article_10_data_governance",
      href: exportsBlock.article_10_data_governance_href,
      schema: "eu-ai-act-article-10-data-governance-v1.schema.json",
    },
    {
      name: "article_13_instructions",
      href: exportsBlock.article_13_instructions_href,
      schema: "eu-ai-act-article-13-instructions-v1.schema.json",
    },
    {
      name: "article_16_provider_obligations",
      href: exportsBlock.article_16_provider_obligations_href,
      schema: "eu-ai-act-article-16-provider-obligations-v1.schema.json",
    },
    {
      name: "article_43_conformity_assessment",
      href: exportsBlock.article_43_conformity_assessment_href,
      schema: "eu-ai-act-article-43-conformity-assessment-v1.schema.json",
    },
    {
      name: "article_47_declaration_of_conformity",
      href: exportsBlock.article_47_declaration_of_conformity_href,
      schema: "eu-ai-act-article-47-declaration-of-conformity-v1.schema.json",
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
      name: "annex_v_declaration_content",
      href: exportsBlock.annex_v_declaration_content_href,
      schema: "eu-ai-act-annex-v-declaration-content-v1.schema.json",
    },
    {
      name: "human_oversight",
      href: exportsBlock.human_oversight_summary_href,
      schema: "eu-ai-act-human-oversight-v1.schema.json",
    },
    ...(args.contract === "full"
      ? [
          {
            name: "evidence_index",
            href: exportsBlock.evidence_index_href,
            schema: "eu-ai-act-evidence-index-v1.schema.json",
          },
          {
            name: "article_73_serious_incident_pack",
            href: exportsBlock.article_73_serious_incident_pack_href,
            schema: "eu-ai-act-article-73-serious-incident-pack-v1.schema.json",
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
        ]
      : []),
  ];

  const dossierHtmlPresent = args.contract === "full" ? checkFileExists(reportDir, exportsBlock.report_html_href) : true;
  const reviewerHtmlPresent = args.contract === "full" ? checkFileExists(reportDir, exportsBlock.reviewer_html_href) : true;
  const reviewerMarkdownPresent = args.contract === "full" ? checkFileExists(reportDir, exportsBlock.reviewer_markdown_href) : true;
  const reviewerPdfPresent = args.contract === "full" ? checkFileExists(reportDir, EU_REVIEWER_PDF_REL_PATH) : true;
  if (args.contract === "full") {
    pushCheck(
      checks,
      "compliance_dossier_html_present",
      dossierHtmlPresent,
      "Compliance dossier HTML must exist",
      dossierHtmlPresent ? { href: exportsBlock.report_html_href } : { href: exportsBlock.report_html_href }
    );
    pushCheck(
      checks,
      "reviewer_html_present",
      reviewerHtmlPresent,
      "Reviewer HTML must exist",
      { href: exportsBlock.reviewer_html_href }
    );
    pushCheck(
      checks,
      "reviewer_markdown_present",
      reviewerMarkdownPresent,
      "Reviewer markdown must exist",
      { href: exportsBlock.reviewer_markdown_href }
    );
    pushCheck(
      checks,
      "reviewer_pdf_present",
      reviewerPdfPresent,
      "Reviewer PDF must exist",
      { href: EU_REVIEWER_PDF_REL_PATH }
    );
  }

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
    const schema = readJson(path.join(EU_SCHEMA_DIR, spec.schema));
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
      const bundleArtifactsMatch =
        args.contract === "full"
          ? sameObject(doc.bundle_artifacts, expectedFullBundleArtifacts)
          : objectContainsSubset(doc.bundle_artifacts, expectedBundleArtifacts);
      pushCheck(
        checks,
        `${spec.name}_bundle_artifacts_match`,
        bundleArtifactsMatch,
        `${spec.name} bundle_artifacts must match compare-report exports`,
        bundleArtifactsMatch
          ? undefined
          : {
              expected: args.contract === "full" ? expectedFullBundleArtifacts : expectedBundleArtifacts,
              actual: doc.bundle_artifacts,
            }
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
    allArtifactsPresent && dossierHtmlPresent && reviewerHtmlPresent && reviewerMarkdownPresent && reviewerPdfPresent,
    "All compliance artifacts must exist before handoff"
  );

  if (args.contract === "full" && dossierHtmlPresent) {
    const dossierHtml = readFileSync(path.join(reportDir, exportsBlock.report_html_href), "utf8");
    const dossierLinksOk =
      dossierHtml.includes("article-13-instructions.json") &&
      dossierHtml.includes("article-9-risk-register.json") &&
      dossierHtml.includes("article-72-monitoring-plan.json") &&
      dossierHtml.includes("article-17-qms-lite.json") &&
      dossierHtml.includes("article-73-serious-incident-pack.json") &&
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

  if (args.contract === "full" && reviewerHtmlPresent) {
    const reviewerHtml = readFileSync(path.join(reportDir, exportsBlock.reviewer_html_href), "utf8");
    const reviewerLinksOk =
      reviewerHtml.includes("eu-ai-act-report.html") &&
      reviewerHtml.includes("eu-ai-act-annex-iv.json") &&
      reviewerHtml.includes("article-13-instructions.json") &&
      reviewerHtml.includes("article-9-risk-register.json") &&
      reviewerHtml.includes("article-72-monitoring-plan.json") &&
      reviewerHtml.includes("article-17-qms-lite.json") &&
      reviewerHtml.includes("article-73-serious-incident-pack.json");
    pushCheck(
      checks,
      "reviewer_html_links",
      reviewerLinksOk,
      "Reviewer HTML must link to the expanded technical pack and the core EU article artifacts"
    );
  }

  if (args.contract === "full" && reviewerMarkdownPresent) {
    const reviewerMarkdown = readFileSync(path.join(reportDir, exportsBlock.reviewer_markdown_href), "utf8");
    const reviewerMarkdownSectionsOk =
      reviewerMarkdown.includes("# EU AI Act reviewer pack") &&
      reviewerMarkdown.includes("## 1. General description of the system") &&
      reviewerMarkdown.includes("## 5. Risk management system (Article 9)") &&
      reviewerMarkdown.includes("## 8. EU Declaration of Conformity boundary (Annex V)");
    pushCheck(
      checks,
      "reviewer_markdown_sections",
      reviewerMarkdownSectionsOk,
      "Reviewer markdown must expose the expected Annex-shaped reviewer section order"
    );
  }

  if (args.contract === "full" && existsSync(reportHtmlPath)) {
    const reportHtml = readFileSync(reportHtmlPath, "utf8");
    const mainLinksOk =
      reportHtml.includes(exportsBlock.reviewer_html_href) &&
      reportHtml.includes(exportsBlock.reviewer_markdown_href) &&
      reportHtml.includes(exportsBlock.report_html_href) &&
      reportHtml.includes(exportsBlock.article_13_instructions_href) &&
      reportHtml.includes(exportsBlock.article_9_risk_register_href) &&
      reportHtml.includes(exportsBlock.article_72_monitoring_plan_href) &&
      reportHtml.includes(exportsBlock.article_17_qms_lite_href) &&
      reportHtml.includes(exportsBlock.article_73_serious_incident_pack_href) &&
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
    contract: args.contract,
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
