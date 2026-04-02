import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-package.mjs");
const AUTHORITY_INIT_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-authority-request-init.mjs");
const AUTHORITY_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-authority-response.mjs");
const SCRIPT_TEST_TIMEOUT_MS = 120_000;

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-eu-authority-"));
  tempRoots.push(root);
  return root;
}

function runNode(scriptAbs: string, args: string[], cwd = REPO_ROOT, env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [scriptAbs, ...args], {
    cwd,
    env,
    encoding: "utf8",
  });
}

function makeSigningEnv() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    ...process.env,
    AQ_MANIFEST_PRIVATE_KEY: Buffer.from(privateKey.export({ format: "der", type: "pkcs8" }) as Buffer).toString(
      "base64"
    ),
    AQ_MANIFEST_PUBLIC_KEY: Buffer.from(publicKey.export({ format: "der", type: "spki" }) as Buffer).toString(
      "base64"
    ),
  };
}

function writeJson(absPath: string, value: unknown) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(value, null, 2), "utf8");
}

function buildRunMeta(caseIds: string[], version: "baseline" | "new") {
  return {
    selected_case_ids: caseIds,
    provenance: {
      agent_id: "eu-authority-agent",
      agent_version: version === "new" ? "eu-authority-agent-v2" : "eu-authority-agent-v1",
      model: "authority-model",
      model_version: version === "new" ? "2026-03-21" : "2026-03-01",
      prompt_version: version === "new" ? "authority-prompt-v2" : "authority-prompt-v1",
      tools_version: "authority-tools-v1",
      config_hash: version === "new" ? "authority-config-002" : "authority-config-001",
    },
  };
}

function completeAuthorityRequest(absPath: string, options?: { includeSourceInputs?: boolean }) {
  const includeSourceInputs = options?.includeSourceInputs === true;
  const doc = JSON.parse(readFileSync(absPath, "utf8"));
  doc.request_context.request_type = "authority";
  doc.request_context.requesting_party = "National competent authority";
  doc.request_context.jurisdiction = "EU";
  doc.request_context.legal_basis = "Article 73 incident and evidence request";
  doc.request_context.submission_deadline = "2026-08-15";
  doc.request_context.submission_channel = "secure authority portal";
  doc.request_context.response_owner = "Jane Doe";
  doc.request_context.legal_approver = "Legal Reviewer";
  doc.disclosure_scope.include_source_inputs = includeSourceInputs;
  doc.disclosure_scope.include_review_artifacts = true;
  doc.disclosure_scope.scope_rationale = includeSourceInputs
    ? "Source inputs are required to explain the runtime sequence under review."
    : "Source inputs stay excluded; the packaged dossier is sufficient for the current request.";
  doc.disclosure_scope.source_inputs_approval = includeSourceInputs ? "Legal Reviewer approved source input disclosure" : "not_requested";
  doc.archive_controls.retention_owner = "Ops Archive Owner";
  doc.archive_controls.archive_location = "s3://regulated-archive/eu-authority";
  doc.archive_controls.legal_hold_status = "set";
  doc.archive_controls.external_surfaces_reviewed = true;
  doc.archive_controls.archive_export_recorded = true;
  doc.archive_controls.note = "Authority export recorded in archive register.";
  doc.completion_status = "ready";
  doc.residual_gap_acknowledgement = "Jurisdiction-specific routing remains human-owned.";
  writeJson(absPath, doc);
}

function createEvaluatorFixture(root: string) {
  const casesPath = path.join(root, "cases.json");
  const baselineDir = path.join(root, "runs", "baseline", "r1");
  const newDir = path.join(root, "runs", "new", "r1");
  const outDir = path.join(root, "reports", "eu-package");
  const environmentPath = path.join(root, "environment.json");

  writeJson(casesPath, [
    {
      id: "c1",
      title: "eu package case",
      input: { user: "hello" },
      expected: { must_include: ["ok"] },
    },
  ]);
  writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
  writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
  writeJson(path.join(baselineDir, "c1.json"), {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "final_output", ts: 1, content_type: "text", content: "ok" }],
    proposed_actions: [],
  });
  writeJson(path.join(newDir, "c1.json"), {
    case_id: "c1",
    version: "new",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "final_output", ts: 1, content_type: "text", content: "ok" }],
    proposed_actions: [],
  });
  writeJson(environmentPath, {
    agent_id: "eu-authority-agent",
    agent_version: "eu-authority-agent-v2",
    model: "authority-model",
    model_version: "2026-03-21",
    prompt_version: "authority-prompt-v2",
    tools_version: "authority-tools-v1",
    config_hash: "authority-config-002",
  });

  return { casesPath, baselineDir, newDir, outDir, environmentPath };
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-act authority response bundle", () => {
  it(
    "fails packaging when the source EU bundle is unsigned",
    () => {
      const root = makeTempRoot();
      const fixture = createEvaluatorFixture(root);

      const packageResult = runNode(PACKAGE_SCRIPT, [
        "--cases",
        fixture.casesPath,
        "--baselineDir",
        fixture.baselineDir,
        "--newDir",
        fixture.newDir,
        "--outDir",
        fixture.outDir,
        "--reportId",
        "eu-authority-unsigned",
        "--environment",
        fixture.environmentPath,
        "--no-trend",
        "--contract",
        "full",
      ]);
      expect(packageResult.status, packageResult.stderr).toBe(0);

      mkdirSync(path.join(fixture.outDir, "review"), { recursive: true });
      writeFileSync(path.join(fixture.outDir, "review", "review-decision.json"), "{}\n", "utf8");
      writeFileSync(path.join(fixture.outDir, "review", "handoff-note.md"), "# note\n", "utf8");
      const requestInit = runNode(AUTHORITY_INIT_SCRIPT, ["--reportDir", fixture.outDir]);
      expect(requestInit.status, requestInit.stderr).toBe(0);
      completeAuthorityRequest(path.join(fixture.outDir, "review", "authority-request.json"));

      const bundleResult = runNode(AUTHORITY_SCRIPT, [
        "--reportDir",
        fixture.outDir,
        "--bundleDir",
        path.join(root, "authority-unsigned"),
      ]);
      expect(bundleResult.status).toBe(1);
      expect(bundleResult.stderr).toContain("Source EU bundle strict verification failed");
      expect(bundleResult.stderr).toContain("manifest.sig");
    },
    SCRIPT_TEST_TIMEOUT_MS
  );

  it(
    "packages a verified authority-response bundle and can optionally include source inputs",
    () => {
      const root = makeTempRoot();
      const fixture = createEvaluatorFixture(root);
      const signingEnv = makeSigningEnv();

      const packageResult = runNode(PACKAGE_SCRIPT, [
        "--cases",
        fixture.casesPath,
        "--baselineDir",
        fixture.baselineDir,
        "--newDir",
        fixture.newDir,
        "--outDir",
        fixture.outDir,
        "--reportId",
        "eu-authority",
        "--environment",
        fixture.environmentPath,
        "--no-trend",
        "--verify-strict",
        "--sign",
        "--contract",
        "full",
      ], REPO_ROOT, signingEnv);
      expect(packageResult.status, packageResult.stderr).toBe(0);

      mkdirSync(path.join(fixture.outDir, "review"), { recursive: true });
      writeFileSync(path.join(fixture.outDir, "review", "review-decision.json"), "{}\n", "utf8");
      writeFileSync(path.join(fixture.outDir, "review", "handoff-note.md"), "# note\n", "utf8");
      const requestInit = runNode(AUTHORITY_INIT_SCRIPT, ["--reportDir", fixture.outDir]);
      expect(requestInit.status, requestInit.stderr).toBe(0);
      completeAuthorityRequest(path.join(fixture.outDir, "review", "authority-request.json"));

      const bundleDir = path.join(root, "authority-default");
      const bundleResult = runNode(AUTHORITY_SCRIPT, [
        "--reportDir",
        fixture.outDir,
        "--bundleDir",
        bundleDir,
      ], REPO_ROOT, signingEnv);
      expect(bundleResult.status, bundleResult.stderr).toBe(0);
      expect(bundleResult.stdout).toContain("Authority response bundle: PASS");

      const manifest = JSON.parse(readFileSync(path.join(bundleDir, "authority-response-bundle.json"), "utf8"));
      expect(manifest.package_scope.includes_source_inputs).toBe(false);
      expect(manifest.package_scope.includes_review_artifacts).toBe(true);
      expect(manifest.included_artifacts.authority_request_href).toBe("review/authority-request.json");
      expect(manifest.included_artifacts.review_decision_href).toBe("review/review-decision.json");
      expect(manifest.authority_request_summary.requesting_party).toBe("National competent authority");
      expect(manifest.included_artifacts.article_10_data_governance_href).toBe(
        "compliance/article-10-data-governance.json"
      );
      expect(manifest.included_artifacts.article_16_provider_obligations_href).toBe(
        "compliance/article-16-provider-obligations.json"
      );
      expect(manifest.included_artifacts.article_43_conformity_assessment_href).toBe(
        "compliance/article-43-conformity-assessment.json"
      );
      expect(manifest.included_artifacts.article_47_declaration_of_conformity_href).toBe(
        "compliance/article-47-declaration-of-conformity.json"
      );
      expect(manifest.included_artifacts.annex_v_declaration_content_href).toBe(
        "compliance/annex-v-declaration-content.json"
      );
      expect(manifest.included_artifacts.article_73_serious_incident_pack_href).toBe(
        "compliance/article-73-serious-incident-pack.json"
      );
      expect(manifest.residual_gaps.some((gap: string) => gap.includes("_source_inputs/ is excluded by default"))).toBe(true);
      expect(readFileSync(path.join(bundleDir, "compliance", "article-43-conformity-assessment.json"), "utf8")).toContain(
        "Art_43"
      );
      expect(readFileSync(path.join(bundleDir, "compliance", "annex-v-declaration-content.json"), "utf8")).toContain(
        "Annex_V"
      );
      expect(readFileSync(path.join(bundleDir, "compliance", "article-73-serious-incident-pack.json"), "utf8")).toContain(
        "Art_73"
      );
      expect(existsSync(path.join(bundleDir, "_source_inputs"))).toBe(false);

      const withSourceDir = path.join(root, "authority-with-source");
      completeAuthorityRequest(path.join(fixture.outDir, "review", "authority-request.json"), { includeSourceInputs: true });
      const withSourceResult = runNode(AUTHORITY_SCRIPT, [
        "--reportDir",
        fixture.outDir,
        "--bundleDir",
        withSourceDir,
        "--includeSourceInputs",
      ], REPO_ROOT, signingEnv);
      expect(withSourceResult.status, withSourceResult.stderr).toBe(0);
      const withSourceManifest = JSON.parse(readFileSync(path.join(withSourceDir, "authority-response-bundle.json"), "utf8"));
      expect(withSourceManifest.package_scope.includes_source_inputs).toBe(true);
      expect(withSourceManifest.included_artifacts.source_inputs_href).toBe("_source_inputs");
      expect(readFileSync(path.join(withSourceDir, "review", "authority-request.json"), "utf8")).toContain("National competent authority");
      expect(readFileSync(path.join(withSourceDir, "_source_inputs", "cases.json"), "utf8")).toContain("\"c1\"");

      const verifyResult = runNode(
        AUTHORITY_SCRIPT,
        ["--verifyOnly", "--bundleDir", withSourceDir, "--json"],
        REPO_ROOT,
        signingEnv
      );
      expect(verifyResult.status).toBe(0);
      const verifyPayload = JSON.parse(verifyResult.stdout);
      expect(verifyPayload.ok).toBe(true);
    },
    SCRIPT_TEST_TIMEOUT_MS
  );

  it(
    "fails packaging when the source EU bundle no longer verifies",
    () => {
      const root = makeTempRoot();
      const fixture = createEvaluatorFixture(root);
      const signingEnv = makeSigningEnv();

      const packageResult = runNode(PACKAGE_SCRIPT, [
        "--cases",
        fixture.casesPath,
        "--baselineDir",
        fixture.baselineDir,
        "--newDir",
        fixture.newDir,
        "--outDir",
        fixture.outDir,
        "--reportId",
        "eu-authority-fail",
        "--environment",
        fixture.environmentPath,
        "--no-trend",
        "--verify-strict",
        "--sign",
        "--contract",
        "full",
      ], REPO_ROOT, signingEnv);
      expect(packageResult.status, packageResult.stderr).toBe(0);

      mkdirSync(path.join(fixture.outDir, "review"), { recursive: true });
      writeFileSync(path.join(fixture.outDir, "review", "review-decision.json"), "{}\n", "utf8");
      writeFileSync(path.join(fixture.outDir, "review", "handoff-note.md"), "# note\n", "utf8");
      const requestInit = runNode(AUTHORITY_INIT_SCRIPT, ["--reportDir", fixture.outDir]);
      expect(requestInit.status, requestInit.stderr).toBe(0);
      completeAuthorityRequest(path.join(fixture.outDir, "review", "authority-request.json"));

      unlinkSync(path.join(fixture.outDir, "compliance", "article-73-serious-incident-pack.json"));

      const bundleDir = path.join(root, "authority-fail");
      const bundleResult = runNode(AUTHORITY_SCRIPT, [
        "--reportDir",
        fixture.outDir,
        "--bundleDir",
        bundleDir,
      ], REPO_ROOT, signingEnv);
      expect(bundleResult.status).toBe(1);
      expect(bundleResult.stderr).toContain("Source EU bundle strict verification failed");
    },
    SCRIPT_TEST_TIMEOUT_MS
  );

  it(
    "fails packaging when authority-request remains draft",
    () => {
      const root = makeTempRoot();
      const fixture = createEvaluatorFixture(root);
      const signingEnv = makeSigningEnv();

      const packageResult = runNode(PACKAGE_SCRIPT, [
        "--cases",
        fixture.casesPath,
        "--baselineDir",
        fixture.baselineDir,
        "--newDir",
        fixture.newDir,
        "--outDir",
        fixture.outDir,
        "--reportId",
        "eu-authority-draft",
        "--environment",
        fixture.environmentPath,
        "--no-trend",
        "--verify-strict",
        "--sign",
        "--contract",
        "full",
      ], REPO_ROOT, signingEnv);
      expect(packageResult.status, packageResult.stderr).toBe(0);

      mkdirSync(path.join(fixture.outDir, "review"), { recursive: true });
      writeFileSync(path.join(fixture.outDir, "review", "review-decision.json"), "{}\n", "utf8");
      writeFileSync(path.join(fixture.outDir, "review", "handoff-note.md"), "# note\n", "utf8");
      const requestInit = runNode(AUTHORITY_INIT_SCRIPT, ["--reportDir", fixture.outDir]);
      expect(requestInit.status, requestInit.stderr).toBe(0);

      const bundleDir = path.join(root, "authority-draft");
      const bundleResult = runNode(AUTHORITY_SCRIPT, [
        "--reportDir",
        fixture.outDir,
        "--bundleDir",
        bundleDir,
      ], REPO_ROOT, signingEnv);
      expect(bundleResult.status).toBe(1);
      expect(bundleResult.stderr).toContain("authority-request is not ready");
    },
    SCRIPT_TEST_TIMEOUT_MS
  );
});
