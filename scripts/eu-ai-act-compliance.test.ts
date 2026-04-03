import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-package.mjs");
const VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-verify.mjs");
const SCRIPT_TEST_TIMEOUT_MS = 90_000;

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-eu-act-compliance-"));
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

function writeJson(absPath: string, value: unknown) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(value, null, 2), "utf8");
}

function buildRunMeta(caseIds: string[], version: "baseline" | "new") {
  return {
    selected_case_ids: caseIds,
    provenance: {
      agent_id: "eu-fixture-agent",
      agent_version: version === "new" ? "eu-fixture-agent-v2" : "eu-fixture-agent-v1",
      model: "fixture-model",
      model_version: version === "new" ? "2026-03-21" : "2026-03-01",
      prompt_version: version === "new" ? "fixture-prompt-v2" : "fixture-prompt-v1",
      tools_version: "fixture-tools-v1",
      config_hash: version === "new" ? "fixture-config-002" : "fixture-config-001",
    },
  };
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
    agent_id: "eu-fixture-agent",
    agent_version: "eu-fixture-agent-v2",
    model: "fixture-model",
    model_version: "2026-03-21",
    prompt_version: "fixture-prompt-v2",
    tools_version: "fixture-tools-v1",
    config_hash: "fixture-config-002",
  });

  return { casesPath, baselineDir, newDir, outDir, environmentPath };
}

function createLegacyEvaluatorFixture(root: string) {
  const casesPath = path.join(root, "cases.json");
  const baselineDir = path.join(root, "runs", "baseline", "legacy-r1");
  const newDir = path.join(root, "runs", "new", "legacy-r1");
  const outDir = path.join(root, "reports", "eu-package-legacy");
  const environmentPath = path.join(root, "legacy-environment.json");

  writeJson(casesPath, [
    {
      id: "c1",
      title: "legacy eu package case",
      input: { user: "hello" },
      expected: { must_include: ["ok"] },
    },
  ]);
  writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
  writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });
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
    agent_id: "legacy-eu-agent",
    agent_version: "legacy-eu-agent-v2",
    model: "legacy-model",
    model_version: "2026-03-21",
    prompt_version: "legacy-prompt-v2",
    tools_version: "legacy-tools-v1",
    config_hash: "legacy-config-002",
    baseline_provenance: {
      agent_id: "legacy-eu-agent",
      agent_version: "legacy-eu-agent-v1",
      model: "legacy-model",
      model_version: "2026-03-01",
      prompt_version: "legacy-prompt-v1",
      tools_version: "legacy-tools-v1",
      config_hash: "legacy-config-001",
    },
    new_provenance: {
      agent_id: "legacy-eu-agent",
      agent_version: "legacy-eu-agent-v2",
      model: "legacy-model",
      model_version: "2026-03-21",
      prompt_version: "legacy-prompt-v2",
      tools_version: "legacy-tools-v1",
      config_hash: "legacy-config-002",
    },
  });

  return { casesPath, baselineDir, newDir, outDir, environmentPath };
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-act compliance scripts", () => {
  it("packages and verifies the default minimum EU AI Act contract", () => {
    const root = makeTempRoot();
    const fixture = createEvaluatorFixture(root);

    const result = runNode(PACKAGE_SCRIPT, [
      "--cases",
      fixture.casesPath,
      "--baselineDir",
      fixture.baselineDir,
      "--newDir",
      fixture.newDir,
      "--outDir",
      fixture.outDir,
      "--reportId",
      "eu-package",
      "--environment",
      fixture.environmentPath,
      "--no-trend",
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Status: OK");

    const report = JSON.parse(readFileSync(path.join(fixture.outDir, "compare-report.json"), "utf8"));
    expect(report.quality_flags.portable_paths).toBe(true);
    expect(report.quality_flags.path_violations_count).toBe(0);
    expect(report.provenance?.baseline?.agent_version).toBe("eu-fixture-agent-v1");
    expect(report.provenance?.new?.agent_version).toBe("eu-fixture-agent-v2");
    expect(report.baseline_dir).toBe("_source_inputs/baseline");
    expect(report.new_dir).toBe("_source_inputs/new");
    expect(report.cases_path).toBe("_source_inputs/cases.json");
    expect(report.compliance_exports?.eu_ai_act?.post_market_monitoring_href).toBe(
      "compliance/post-market-monitoring.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.reviewer_html_href).toBeUndefined();
    expect(report.compliance_exports?.eu_ai_act?.reviewer_markdown_href).toBeUndefined();
    expect(report.compliance_exports?.eu_ai_act?.article_10_data_governance_href).toBe(
      "compliance/article-10-data-governance.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_13_instructions_href).toBe(
      "compliance/article-13-instructions.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_16_provider_obligations_href).toBe(
      "compliance/article-16-provider-obligations.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_43_conformity_assessment_href).toBe(
      "compliance/article-43-conformity-assessment.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_47_declaration_of_conformity_href).toBe(
      "compliance/article-47-declaration-of-conformity.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_9_risk_register_href).toBe(
      "compliance/article-9-risk-register.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_72_monitoring_plan_href).toBe(
      "compliance/article-72-monitoring-plan.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_17_qms_lite_href).toBe(
      "compliance/article-17-qms-lite.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.annex_v_declaration_content_href).toBe(
      "compliance/annex-v-declaration-content.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_73_serious_incident_pack_href).toBeUndefined();
    expect(existsSync(path.join(fixture.outDir, "compliance", "eu-ai-act-reviewer.pdf"))).toBe(false);
    expect(report.compliance_mapping?.map((entry: { clause: string }) => entry.clause)).toEqual(
      expect.arrayContaining([
        "Art_16",
        "Art_18",
        "Art_19",
        "Art_20",
        "Art_21",
        "Art_43",
        "Art_47",
        "Art_48",
        "Art_49",
        "Annex_V",
      ])
    );
    expect(report.compliance_coverage?.map((entry: { clause: string }) => entry.clause)).toEqual(
      expect.arrayContaining([
        "Art_16",
        "Art_18",
        "Art_19",
        "Art_20",
        "Art_21",
        "Art_43",
        "Art_47",
        "Art_48",
        "Art_49",
        "Annex_V",
      ])
    );
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("can still package and verify the full EU AI Act contract", () => {
    const root = makeTempRoot();
    const fixture = createEvaluatorFixture(root);

    const result = runNode(PACKAGE_SCRIPT, [
      "--cases",
      fixture.casesPath,
      "--baselineDir",
      fixture.baselineDir,
      "--newDir",
      fixture.newDir,
      "--outDir",
      fixture.outDir,
      "--reportId",
      "eu-package-full",
      "--environment",
      fixture.environmentPath,
      "--no-trend",
      "--contract",
      "full",
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Status: OK");
    expect(existsSync(path.join(fixture.outDir, "compliance", "eu-ai-act-reviewer.pdf"))).toBe(true);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("fails verification when a required compliance artifact is missing", () => {
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
      "eu-package-missing",
      "--environment",
      fixture.environmentPath,
      "--no-trend",
      "--no-verify",
    ]);

    expect(packageResult.status, packageResult.stderr).toBe(0);

    unlinkSync(path.join(fixture.outDir, "compliance", "article-17-qms-lite.json"));

    const verifyResult = runNode(VERIFY_SCRIPT, ["--reportDir", fixture.outDir, "--json"]);
    expect(verifyResult.status).toBe(1);

    const parsed = JSON.parse(verifyResult.stdout);
    expect(parsed.ok).toBe(false);
    expect(
      parsed.checks.some(
        (check: { name: string; pass: boolean }) => check.name === "article_17_qms_lite_present" && check.pass === false
      )
    ).toBe(true);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("packages successfully without explicit --environment when run provenance is recorded", () => {
    const root = makeTempRoot();
    const fixture = createEvaluatorFixture(root);

    const result = runNode(PACKAGE_SCRIPT, [
      "--cases",
      fixture.casesPath,
      "--baselineDir",
      fixture.baselineDir,
      "--newDir",
      fixture.newDir,
      "--outDir",
      fixture.outDir,
      "--reportId",
      "eu-package-missing-identity",
      "--no-trend",
    ]);

    expect(result.status, result.stderr).toBe(0);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("packages successfully when legacy run provenance is provided via environment overlay", () => {
    const root = makeTempRoot();
    const fixture = createLegacyEvaluatorFixture(root);

    const result = runNode(PACKAGE_SCRIPT, [
      "--cases",
      fixture.casesPath,
      "--baselineDir",
      fixture.baselineDir,
      "--newDir",
      fixture.newDir,
      "--outDir",
      fixture.outDir,
      "--reportId",
      "eu-package-legacy-overlay",
      "--environment",
      fixture.environmentPath,
      "--no-trend",
    ]);

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(readFileSync(path.join(fixture.outDir, "compare-report.json"), "utf8"));
    expect(report.provenance?.baseline?.agent_version).toBe("legacy-eu-agent-v1");
    expect(report.provenance?.new?.agent_version).toBe("legacy-eu-agent-v2");
    expect(report.environment?.agent_version).toBe("legacy-eu-agent-v2");
    expect(report.environment?.baseline_provenance).toBeUndefined();
    expect(report.environment?.new_provenance).toBeUndefined();
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("can sign the EU bundle manifest and pass strict verification", () => {
    const root = makeTempRoot();
    const fixture = createEvaluatorFixture(root);
    const { privateKey } = generateKeyPairSync("ed25519");
    const privateKeyB64 = Buffer.from(
      privateKey.export({ format: "der", type: "pkcs8" }) as Buffer
    ).toString("base64");

    const result = runNode(
      PACKAGE_SCRIPT,
      [
        "--cases",
        fixture.casesPath,
        "--baselineDir",
        fixture.baselineDir,
        "--newDir",
        fixture.newDir,
        "--outDir",
        fixture.outDir,
        "--reportId",
        "eu-package-signed",
        "--environment",
        fixture.environmentPath,
        "--no-trend",
        "--verify-strict",
        "--sign",
      ],
      REPO_ROOT,
      { ...process.env, AQ_MANIFEST_PRIVATE_KEY: privateKeyB64 }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Manifest signed:");
    expect(readFileSync(path.join(fixture.outDir, "artifacts", "manifest.sig"), "utf8").trim().length).toBeGreaterThan(0);
  }, SCRIPT_TEST_TIMEOUT_MS);

  it("fails packaging when run provenance is missing", () => {
    const root = makeTempRoot();
    const fixture = createEvaluatorFixture(root);
    writeJson(path.join(fixture.baselineDir, "run.json"), { selected_case_ids: ["c1"] });

    const result = runNode(PACKAGE_SCRIPT, [
      "--cases",
      fixture.casesPath,
      "--baselineDir",
      fixture.baselineDir,
      "--newDir",
      fixture.newDir,
      "--outDir",
      fixture.outDir,
      "--reportId",
      "eu-package-missing-provenance",
      "--no-trend",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Core qualification packaging requires baseline run provenance");
  }, SCRIPT_TEST_TIMEOUT_MS);
});
