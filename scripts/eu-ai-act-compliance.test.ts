import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-package.mjs");
const VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-verify.mjs");

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-eu-act-compliance-"));
  tempRoots.push(root);
  return root;
}

function runNode(scriptAbs: string, args: string[], cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [scriptAbs, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function writeJson(absPath: string, value: unknown) {
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(value, null, 2), "utf8");
}

function createEvaluatorFixture(root: string) {
  const casesPath = path.join(root, "cases.json");
  const baselineDir = path.join(root, "runs", "baseline", "r1");
  const newDir = path.join(root, "runs", "new", "r1");
  const outDir = path.join(root, "reports", "eu-package");

  writeJson(casesPath, [
    {
      id: "c1",
      title: "eu package case",
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

  return { casesPath, baselineDir, newDir, outDir };
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-act compliance scripts", () => {
  it("packages and verifies an EU AI Act report directory", () => {
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
      "--no-trend",
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Status: OK");

    const report = JSON.parse(readFileSync(path.join(fixture.outDir, "compare-report.json"), "utf8"));
    expect(report.quality_flags.portable_paths).toBe(true);
    expect(report.quality_flags.path_violations_count).toBe(0);
    expect(report.baseline_dir).toBe("_source_inputs/baseline");
    expect(report.new_dir).toBe("_source_inputs/new");
    expect(report.cases_path).toBe("_source_inputs/cases.json");
    expect(report.compliance_exports?.eu_ai_act?.post_market_monitoring_href).toBe(
      "compliance/post-market-monitoring.json"
    );
    expect(report.compliance_exports?.eu_ai_act?.article_13_instructions_href).toBe(
      "compliance/article-13-instructions.json"
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
  }, 45_000);

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
      "--no-trend",
      "--no-verify",
    ]);

    expect(packageResult.status, packageResult.stderr).toBe(0);

    unlinkSync(path.join(fixture.outDir, "compliance", "post-market-monitoring.json"));

    const verifyResult = runNode(VERIFY_SCRIPT, ["--reportDir", fixture.outDir, "--json"]);
    expect(verifyResult.status).toBe(1);

    const parsed = JSON.parse(verifyResult.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.checks.some((check: { name: string; pass: boolean }) => check.name === "post_market_monitoring_present" && check.pass === false)).toBe(true);
  }, 45_000);
});
