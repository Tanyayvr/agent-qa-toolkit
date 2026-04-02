#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { EU_REVIEWER_PDF_REL_PATH } from "./lib/reviewer-pdf.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-verify.mjs");
const MANIFEST_NAME = "authority-response-bundle.json";
const AUTHORITY_REQUEST_NAME = "authority-request.json";
const TODO = "TODO";

function usage(exitCode = 0) {
  const msg = [
    "Usage:",
    "  node scripts/eu-ai-act-authority-response.mjs --reportDir <path> [--bundleDir <path>] [--requestFile <path>] [--includeSourceInputs] [--strict] [--force] [--json]",
    "  node scripts/eu-ai-act-authority-response.mjs --verifyOnly --bundleDir <path> [--json]",
    "",
    "Options:",
    "  --reportDir <path>        EU AI Act report directory to package",
    "  --bundleDir <path>        Output bundle directory (default: <reportDir>/authority-response)",
    "  --requestFile <path>      Completed authority-request.json (default: <reportDir>/review/authority-request.json)",
    "  --includeSourceInputs     Copy _source_inputs/ into the authority bundle",
    "  --strict                  Deprecated: authority packaging now always runs strict source verification",
    "  --skipVerify              Not allowed for packaging; authority bundles require strict source verification",
    "  --force                   Replace an existing bundleDir",
    "  --verifyOnly              Verify an existing authority-response bundle",
    "  --json                    Print machine-readable JSON",
    "  --help                    Show this help",
  ].join("\n");
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    reportDir: null,
    bundleDir: null,
    requestFile: null,
    includeSourceInputs: false,
    strict: false,
    skipVerify: false,
    force: false,
    verifyOnly: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--includeSourceInputs") {
      args.includeSourceInputs = true;
      continue;
    }
    if (arg === "--strict") {
      args.strict = true;
      continue;
    }
    if (arg === "--skipVerify") {
      args.skipVerify = true;
      continue;
    }
    if (arg === "--force") {
      args.force = true;
      continue;
    }
    if (arg === "--verifyOnly") {
      args.verifyOnly = true;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--reportDir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.reportDir = path.resolve(value);
      i += 1;
      continue;
    }
    if (arg === "--bundleDir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.bundleDir = path.resolve(value);
      i += 1;
      continue;
    }
    if (arg === "--requestFile") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(2);
      args.requestFile = path.resolve(value);
      i += 1;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }

  if (args.verifyOnly) {
    if (!args.bundleDir) {
      console.error("Missing required --bundleDir for --verifyOnly");
      usage(2);
    }
    return args;
  }

  if (!args.reportDir) {
    console.error("Missing required --reportDir");
    usage(2);
  }
  if (!args.bundleDir) {
    args.bundleDir = path.join(args.reportDir, "authority-response");
  }
  if (!args.requestFile) {
    args.requestFile = path.join(args.reportDir, "review", AUTHORITY_REQUEST_NAME);
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

function normalizeHref(href) {
  return String(href || "").split(path.sep).join("/");
}

function isPortableHref(href) {
  if (typeof href !== "string" || href.length === 0) return false;
  if (href.includes("://")) return false;
  if (href.startsWith("/") || href.startsWith("\\")) return false;
  if (href.includes("..")) return false;
  return true;
}

function listCaseReplayHrefs(reportDir) {
  return readdirSync(reportDir)
    .filter((name) => /^case-.*\.html$/.test(name))
    .sort()
    .map((name) => normalizeHref(name));
}

function countFiles(absPath) {
  const st = statSync(absPath);
  if (!st.isDirectory()) return 1;
  let count = 0;
  for (const entry of readdirSync(absPath)) {
    count += countFiles(path.join(absPath, entry));
  }
  return count;
}

function runSourceVerify(reportDir, strict) {
  const args = [VERIFY_SCRIPT, "--reportDir", reportDir, "--contract", "full", "--json"];
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

function validateBundleManifest(doc) {
  const schema = readJson(path.join(REPO_ROOT, "schemas", "eu-ai-act-authority-response-bundle-v1.schema.json"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(doc);
  return {
    ok: Boolean(ok),
    errors: validate.errors ?? [],
  };
}

function validateSchema(schemaFileName, doc) {
  const schema = readJson(path.join(REPO_ROOT, "schemas", schemaFileName));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(doc);
  return {
    ok: Boolean(ok),
    errors: validate.errors ?? [],
  };
}

function includesTodo(value) {
  return typeof value === "string" && value.includes(TODO);
}

function validateAuthorityRequestDoc(doc) {
  const schema = validateSchema("eu-ai-act-authority-request-v1.schema.json", doc);
  const checks = [
    {
      name: "authority_request_schema",
      pass: schema.ok,
      message: "authority-request.json must match schema",
      ...(schema.ok ? {} : { details: { errors: schema.errors } }),
    },
  ];
  if (!schema.ok) {
    return { ok: false, checks };
  }

  const requestContext = doc.request_context || {};
  const disclosure = doc.disclosure_scope || {};
  const archive = doc.archive_controls || {};
  const requiredTextFields = [
    ["request_context.requesting_party", requestContext.requesting_party],
    ["request_context.jurisdiction", requestContext.jurisdiction],
    ["request_context.legal_basis", requestContext.legal_basis],
    ["request_context.submission_deadline", requestContext.submission_deadline],
    ["request_context.submission_channel", requestContext.submission_channel],
    ["request_context.response_owner", requestContext.response_owner],
    ["request_context.legal_approver", requestContext.legal_approver],
    ["disclosure_scope.scope_rationale", disclosure.scope_rationale],
    ["archive_controls.retention_owner", archive.retention_owner],
    ["archive_controls.archive_location", archive.archive_location],
    ["archive_controls.note", archive.note],
    ["residual_gap_acknowledgement", doc.residual_gap_acknowledgement],
  ];

  for (const [field, value] of requiredTextFields) {
    checks.push({
      name: `${field}_completed`,
      pass: typeof value === "string" && value.trim().length > 0 && !includesTodo(value),
      message: `${field} must be completed before packaging`,
    });
  }
  checks.push({
    name: "completion_status_ready",
    pass: doc.completion_status === "ready",
    message: "authority-request completion_status must be ready",
  });
  checks.push({
    name: "legal_hold_status_resolved",
    pass: archive.legal_hold_status === "set" || archive.legal_hold_status === "not_applicable",
    message: "archive_controls.legal_hold_status must be set or not_applicable",
  });
  checks.push({
    name: "archive_export_recorded",
    pass: archive.archive_export_recorded === true,
    message: "archive_controls.archive_export_recorded must be true before packaging",
  });

  const includeSourceInputs = disclosure.include_source_inputs === true;
  checks.push({
    name: "source_inputs_approval_completed",
    pass:
      includeSourceInputs === false ||
      (typeof disclosure.source_inputs_approval === "string" &&
        disclosure.source_inputs_approval.trim().length > 0 &&
        !includesTodo(disclosure.source_inputs_approval) &&
        disclosure.source_inputs_approval !== "not_requested"),
    message: "source_inputs_approval must be completed when source inputs are included",
  });

  return {
    ok: checks.every((check) => check.pass === true),
    checks,
  };
}

function pushCheck(checks, name, pass, message, details) {
  checks.push({
    name,
    pass,
    ...(message ? { message } : {}),
    ...(details ? { details } : {}),
  });
}

function finish(args, payload) {
  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (args.verifyOnly) {
    console.log(`Authority response bundle verify: ${payload.ok ? "PASS" : "FAIL"}`);
    console.log(`- bundle_dir: ${payload.bundle_dir}`);
    if (!payload.ok) {
      for (const check of payload.checks || []) {
        if (!check.pass) console.log(`- failed: ${check.name}${check.message ? ` (${check.message})` : ""}`);
      }
    }
  } else {
    console.log(`Authority response bundle: ${payload.ok ? "PASS" : "FAIL"}`);
    console.log(`- report_dir: ${payload.report_dir}`);
    console.log(`- bundle_dir: ${payload.bundle_dir}`);
    for (const warning of payload.warnings || []) {
      console.log(`- warning: ${warning}`);
    }
    if (!payload.ok) {
      for (const check of payload.checks || []) {
        if (!check.pass) console.log(`- failed: ${check.name}${check.message ? ` (${check.message})` : ""}`);
      }
    }
  }
  process.exit(payload.ok ? 0 : 1);
}

function verifyExistingBundle(bundleDir) {
  const checks = [];
  if (!existsSync(bundleDir)) {
    return {
      ok: false,
      bundle_dir: bundleDir,
      checks: [{ name: "bundle_dir_present", pass: false, message: "bundleDir must exist" }],
    };
  }
  const manifestPath = path.join(bundleDir, MANIFEST_NAME);
  pushCheck(checks, "manifest_present", existsSync(manifestPath), `${MANIFEST_NAME} must exist`);
  if (!existsSync(manifestPath)) {
    return { ok: false, bundle_dir: bundleDir, checks };
  }
  const manifest = readJson(manifestPath);
  const schema = validateBundleManifest(manifest);
  pushCheck(
    checks,
    "manifest_schema",
    schema.ok,
    "Authority response manifest must match schema",
    schema.ok ? undefined : { errors: schema.errors }
  );

  const included = manifest.included_artifacts && typeof manifest.included_artifacts === "object" ? manifest.included_artifacts : {};
  for (const [key, value] of Object.entries(included)) {
    if (Array.isArray(value)) {
      const missing = value.filter((href) => !existsSync(path.join(bundleDir, href)));
      pushCheck(
        checks,
        `${key}_present`,
        missing.length === 0,
        `${key} entries must exist inside bundle`,
        missing.length ? { missing } : undefined
      );
      continue;
    }
    if (typeof value === "string" && isPortableHref(value)) {
      pushCheck(
        checks,
        `${key}_present`,
        existsSync(path.join(bundleDir, value)),
        `${key} must exist inside bundle`,
        { href: value }
      );
    }
  }

  const authorityRequestHref = typeof included.authority_request_href === "string" ? included.authority_request_href : "";
  if (authorityRequestHref && existsSync(path.join(bundleDir, authorityRequestHref))) {
    const authorityRequestDoc = readJson(path.join(bundleDir, authorityRequestHref));
    const authorityRequestValidation = validateAuthorityRequestDoc(authorityRequestDoc);
    for (const check of authorityRequestValidation.checks) {
      checks.push(check);
    }

    pushCheck(
      checks,
      "authority_request_report_id_match",
      authorityRequestDoc.report_id === manifest.report_id,
      "authority-request report_id must match authority bundle report_id"
    );
    pushCheck(
      checks,
      "authority_request_source_inputs_match",
      authorityRequestDoc.disclosure_scope?.include_source_inputs === manifest.package_scope?.includes_source_inputs,
      "authority-request include_source_inputs must match package scope"
    );
    pushCheck(
      checks,
      "authority_request_review_scope_match",
      authorityRequestDoc.disclosure_scope?.include_review_artifacts === manifest.package_scope?.includes_review_artifacts,
      "authority-request include_review_artifacts must match package scope"
    );

    const retentionHref = typeof included.retention_archive_controls_href === "string" ? included.retention_archive_controls_href : "";
    if (retentionHref && existsSync(path.join(bundleDir, retentionHref))) {
      const retentionDoc = readJson(path.join(bundleDir, retentionHref));
      const externalSurfaces = Array.isArray(retentionDoc.archive_scope?.external_surfaces)
        ? retentionDoc.archive_scope.external_surfaces
        : [];
      pushCheck(
        checks,
        "authority_request_external_surfaces_reviewed",
        externalSurfaces.length === 0 || authorityRequestDoc.archive_controls?.external_surfaces_reviewed === true,
        "authority-request must confirm external surfaces were reviewed when retention controls report them"
      );
    }

    pushCheck(
      checks,
      "manifest_request_summary_match",
      manifest.authority_request_summary?.request_type === authorityRequestDoc.request_context?.request_type &&
        manifest.authority_request_summary?.requesting_party === authorityRequestDoc.request_context?.requesting_party &&
        manifest.authority_request_summary?.jurisdiction === authorityRequestDoc.request_context?.jurisdiction &&
        manifest.authority_request_summary?.submission_deadline === authorityRequestDoc.request_context?.submission_deadline &&
        manifest.authority_request_summary?.response_owner === authorityRequestDoc.request_context?.response_owner &&
        manifest.authority_request_summary?.legal_approver === authorityRequestDoc.request_context?.legal_approver &&
        manifest.authority_request_summary?.include_source_inputs === authorityRequestDoc.disclosure_scope?.include_source_inputs &&
        manifest.authority_request_summary?.legal_hold_status === authorityRequestDoc.archive_controls?.legal_hold_status &&
        manifest.authority_request_summary?.external_surfaces_reviewed === authorityRequestDoc.archive_controls?.external_surfaces_reviewed,
      "authority_request_summary must match authority-request.json"
    );
  }

  for (const relPath of manifest.package_scope?.copied_top_level_paths || []) {
    pushCheck(
      checks,
      `copied_${String(relPath).replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_present`,
      existsSync(path.join(bundleDir, relPath)),
      "Copied top-level path must exist",
      { href: relPath }
    );
  }

  return {
    ok: checks.every((check) => check.pass === true),
    bundle_dir: bundleDir,
    manifest,
    checks,
  };
}

function buildManifest({
  report,
  exportsBlock,
  reviewPresent,
  includeSourceInputs,
  copiedTopLevelPaths,
  copiedFileCount,
  strict,
  authorityRequest,
}) {
  const releaseReview = readJson(path.join(process.cwd(), exportsBlock.release_review_href));
  const monitoring = readJson(path.join(process.cwd(), exportsBlock.post_market_monitoring_href));
  const caseReplayHrefs = listCaseReplayHrefs(process.cwd());
  const retentionHref = report.bundle_exports?.retention_archive_controls_href;

  return {
    schema_version: 1,
    artifact_type: "eu_ai_act_authority_response_bundle",
    framework: "EU_AI_ACT",
    report_id: report.report_id,
    generated_at: Date.now(),
    source_verification: {
      command: "npm run compliance:eu-ai-act:verify:legacy-full",
      strict,
      status: "passed",
    },
    authority_request_summary: {
      request_type: authorityRequest.request_context.request_type,
      requesting_party: authorityRequest.request_context.requesting_party,
      jurisdiction: authorityRequest.request_context.jurisdiction,
      submission_deadline: authorityRequest.request_context.submission_deadline,
      response_owner: authorityRequest.request_context.response_owner,
      legal_approver: authorityRequest.request_context.legal_approver,
      include_source_inputs: authorityRequest.disclosure_scope.include_source_inputs === true,
      legal_hold_status: authorityRequest.archive_controls.legal_hold_status,
      external_surfaces_reviewed: authorityRequest.archive_controls.external_surfaces_reviewed === true,
    },
    package_scope: {
      includes_source_inputs: includeSourceInputs,
      includes_review_artifacts: reviewPresent,
      case_replay_count: caseReplayHrefs.length,
      copied_top_level_paths: copiedTopLevelPaths,
      copied_file_count: copiedFileCount,
    },
    source_bundle_summary: {
      execution_quality_status: report.summary?.execution_quality?.status ?? "degraded",
      cases_requiring_approval: report.summary?.cases_requiring_approval ?? 0,
      cases_block_recommended: report.summary?.cases_block_recommended ?? 0,
      release_review_status: releaseReview?.release_decision?.status ?? null,
      monitoring_status: monitoring?.summary?.monitoring_status ?? null,
    },
    included_artifacts: {
      compare_report_href: "compare-report.json",
      report_html_href: "report.html",
      manifest_href: "artifacts/manifest.json",
      retention_archive_controls_href: retentionHref,
      assets_dir_href: "assets",
      compliance_dir_href: "compliance",
      review_dir_href: "review",
      authority_request_href: `review/${AUTHORITY_REQUEST_NAME}`,
      review_decision_href: "review/review-decision.json",
      handoff_note_href: "review/handoff-note.md",
      ...(includeSourceInputs ? { source_inputs_href: "_source_inputs" } : {}),
      case_replay_hrefs: caseReplayHrefs,
      coverage_href: exportsBlock.coverage_href,
      annex_iv_href: exportsBlock.annex_iv_href,
      article_10_data_governance_href: exportsBlock.article_10_data_governance_href,
      compliance_report_html_href: exportsBlock.report_html_href,
      reviewer_html_href: exportsBlock.reviewer_html_href,
      reviewer_markdown_href: exportsBlock.reviewer_markdown_href,
      ...(existsSync(path.join(process.cwd(), EU_REVIEWER_PDF_REL_PATH))
        ? { reviewer_pdf_href: EU_REVIEWER_PDF_REL_PATH }
        : {}),
      evidence_index_href: exportsBlock.evidence_index_href,
      article_13_instructions_href: exportsBlock.article_13_instructions_href,
      article_16_provider_obligations_href: exportsBlock.article_16_provider_obligations_href,
      article_43_conformity_assessment_href: exportsBlock.article_43_conformity_assessment_href,
      article_47_declaration_of_conformity_href: exportsBlock.article_47_declaration_of_conformity_href,
      article_9_risk_register_href: exportsBlock.article_9_risk_register_href,
      article_17_qms_lite_href: exportsBlock.article_17_qms_lite_href,
      article_72_monitoring_plan_href: exportsBlock.article_72_monitoring_plan_href,
      annex_v_declaration_content_href: exportsBlock.annex_v_declaration_content_href,
      article_73_serious_incident_pack_href: exportsBlock.article_73_serious_incident_pack_href,
      human_oversight_summary_href: exportsBlock.human_oversight_summary_href,
      release_review_href: exportsBlock.release_review_href,
      post_market_monitoring_href: exportsBlock.post_market_monitoring_href,
    },
    operator_required_inputs: [
      "Complete review/authority-request.json before packaging.",
      "Record the requesting authority or counsel path, jurisdiction, and legal basis.",
      "Record the response owner, legal approver, archive location, and legal-hold status.",
      "Confirm whether optional _source_inputs/ are disclosed and record explicit approval when included.",
    ],
    residual_gaps: [
      "Final disclosure scope, legal basis, and submission decision remain human-owned.",
      "Jurisdiction-specific authority routing, deadlines, and external communications remain human-owned.",
      ...(includeSourceInputs ? [] : ["_source_inputs/ is excluded by default and requires an explicit disclosure decision before sharing."]),
    ],
  };
}

function packageBundle(args) {
  const reportDir = args.reportDir;
  const bundleDir = args.bundleDir;
  if (!existsSync(reportDir)) {
    throw new Error(`reportDir not found: ${reportDir}`);
  }
  if (existsSync(bundleDir)) {
    if (!args.force) {
      throw new Error(`bundleDir already exists: ${bundleDir} (use --force to replace)`);
    }
    rmSync(bundleDir, { recursive: true, force: true });
  }
  if (args.skipVerify) {
    throw new Error("Authority response packaging does not allow --skipVerify. Source EU bundle must pass strict verification first.");
  }

  const sourceVerify = runSourceVerify(reportDir, true);
  if (!sourceVerify.ok) {
    throw new Error(
      `Source EU bundle strict verification failed.\n${JSON.stringify(sourceVerify.parsed ?? { raw: sourceVerify.raw }, null, 2)}`
    );
  }

  const report = readJson(path.join(reportDir, "compare-report.json"));
  const exportsBlock = report?.compliance_exports?.eu_ai_act;
  const retentionHref = report?.bundle_exports?.retention_archive_controls_href;
  if (!exportsBlock) {
    throw new Error("compare-report.json is missing compliance_exports.eu_ai_act");
  }
  if (typeof retentionHref !== "string" || retentionHref.length === 0) {
    throw new Error("compare-report.json is missing bundle_exports.retention_archive_controls_href");
  }
  if (!existsSync(args.requestFile)) {
    throw new Error(`authority-request.json not found: ${args.requestFile}`);
  }
  if (!existsSync(path.join(reportDir, "review", "review-decision.json")) || !existsSync(path.join(reportDir, "review", "handoff-note.md"))) {
    throw new Error("Authority response packaging requires completed review artifacts in reportDir/review/");
  }

  const authorityRequest = readJson(args.requestFile);
  const authorityRequestValidation = validateAuthorityRequestDoc(authorityRequest);
  if (!authorityRequestValidation.ok) {
    throw new Error(`authority-request is not ready.\n${JSON.stringify(authorityRequestValidation.checks, null, 2)}`);
  }
  if (authorityRequest.report_id !== report.report_id) {
    throw new Error(`authority-request report_id ${authorityRequest.report_id} does not match compare-report report_id ${report.report_id}`);
  }
  if (authorityRequest.disclosure_scope?.include_source_inputs !== args.includeSourceInputs) {
    throw new Error("authority-request include_source_inputs does not match packaging --includeSourceInputs flag");
  }
  if (authorityRequest.disclosure_scope?.include_review_artifacts !== true) {
    throw new Error("authority-request must confirm include_review_artifacts=true for authority packaging");
  }

  const retentionDoc = readJson(path.join(reportDir, retentionHref));
  const retentionExternalSurfaces = Array.isArray(retentionDoc.archive_scope?.external_surfaces)
    ? retentionDoc.archive_scope.external_surfaces
    : [];
  if (retentionExternalSurfaces.length > 0 && authorityRequest.archive_controls?.external_surfaces_reviewed !== true) {
    throw new Error("authority-request must confirm external_surfaces_reviewed=true when retention controls report external surfaces");
  }

  mkdirSync(bundleDir, { recursive: true });
  const copyEntries = [
    "compare-report.json",
    "report.html",
    "assets",
    "artifacts",
    "archive",
    "compliance",
  ];
  if (existsSync(path.join(reportDir, "review"))) copyEntries.push("review");
  if (args.includeSourceInputs) copyEntries.push("_source_inputs");
  for (const caseReplayHref of listCaseReplayHrefs(reportDir)) {
    copyEntries.push(caseReplayHref);
  }

  const copiedTopLevelPaths = [];
  for (const relPath of [...new Set(copyEntries.map((entry) => normalizeHref(entry)))]) {
    const sourceAbs = path.join(reportDir, relPath);
    if (!existsSync(sourceAbs)) {
      if (relPath === "_source_inputs") {
        throw new Error("_source_inputs/ was requested but is missing from source report");
      }
      continue;
    }
    cpSync(sourceAbs, path.join(bundleDir, relPath), { recursive: true });
    copiedTopLevelPaths.push(relPath);
  }

  const authorityRequestTarget = path.join(bundleDir, "review", AUTHORITY_REQUEST_NAME);
  mkdirSync(path.dirname(authorityRequestTarget), { recursive: true });
  cpSync(args.requestFile, authorityRequestTarget);
  if (!copiedTopLevelPaths.includes("review")) {
    copiedTopLevelPaths.push("review");
  }

  const copiedFileCount = copiedTopLevelPaths.reduce((sum, relPath) => sum + countFiles(path.join(bundleDir, relPath)), 0);
  const reviewPresent = true;
  const previousCwd = process.cwd();
  process.chdir(bundleDir);
  try {
    const manifest = buildManifest({
      report,
      exportsBlock,
      reviewPresent,
      includeSourceInputs: args.includeSourceInputs,
      copiedTopLevelPaths,
      copiedFileCount,
      strict: args.strict,
      authorityRequest,
    });
    writeJson(path.join(bundleDir, MANIFEST_NAME), manifest);
  } finally {
    process.chdir(previousCwd);
  }

  const verified = verifyExistingBundle(bundleDir);
  return {
    ok: verified.ok,
    report_dir: reportDir,
    bundle_dir: bundleDir,
    manifest: verified.manifest,
    checks: verified.checks,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.verifyOnly) {
    finish(args, verifyExistingBundle(args.bundleDir));
  }
  finish(args, packageBundle(args));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
