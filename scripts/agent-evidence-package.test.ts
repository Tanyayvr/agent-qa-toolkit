import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-package.mjs");
const VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-verify.mjs");

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-agent-evidence-"));
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
      agent_id: "agent-evidence-agent",
      agent_version: version === "new" ? "agent-evidence-v2" : "agent-evidence-v1",
      model: "agent-evidence-model",
      model_version: version === "new" ? "2026-03-21" : "2026-03-01",
      prompt_version: version === "new" ? "prompt-v2" : "prompt-v1",
      tools_version: "tools-v1",
      config_hash: version === "new" ? "cfg-agent-evidence-new" : "cfg-agent-evidence-baseline",
    },
  };
}

function createEvaluatorFixture(root: string) {
  const casesPath = path.join(root, "cases.json");
  const baselineDir = path.join(root, "runs", "baseline", "r1");
  const newDir = path.join(root, "runs", "new", "r1");
  const outDir = path.join(root, "reports", "agent-evidence");

  writeJson(casesPath, [
    {
      id: "c1",
      title: "agent evidence case",
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
    events: [
      { type: "tool_call", ts: 1, call_id: "call-1", tool: "search_kb", args: { q: "hello" } },
      {
        type: "tool_result",
        ts: 2,
        call_id: "call-1",
        status: "ok",
        payload_summary: { hits: 1 },
        result_ref: "tool://call-1",
      },
      { type: "final_output", ts: 3, content_type: "text", content: "ok" },
    ],
    proposed_actions: [],
  });
  writeJson(path.join(newDir, "c1.json"), {
    case_id: "c1",
    version: "new",
    final_output: { content_type: "text", content: "ok" },
    events: [
      { type: "tool_call", ts: 1, call_id: "call-1", tool: "search_kb", args: { q: "hello" } },
      {
        type: "tool_result",
        ts: 2,
        call_id: "call-1",
        status: "ok",
        payload_summary: { hits: 1 },
        result_ref: "tool://call-1",
      },
      { type: "final_output", ts: 3, content_type: "text", content: "ok" },
    ],
    proposed_actions: [],
  });

  return { casesPath, baselineDir, newDir, outDir };
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("agent-evidence scripts", () => {
  it("packages and verifies a generic agent evidence report directory", () => {
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
      "agent-evidence",
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
    expect(report.bundle_exports?.retention_archive_controls_href).toBe("archive/retention-controls.json");
    expect(report.compliance_exports).toBeUndefined();
    expect(report.provenance?.baseline?.agent_version).toBe("agent-evidence-v1");
    expect(report.provenance?.new?.agent_version).toBe("agent-evidence-v2");
    expect(report.items[0]?.artifacts?.baseline_tool_telemetry_href).toBeTruthy();
    expect(report.items[0]?.artifacts?.new_tool_telemetry_href).toBeTruthy();
    const baselineTelemetry = JSON.parse(
      readFileSync(path.join(fixture.outDir, report.items[0].artifacts.baseline_tool_telemetry_href), "utf8")
    );
    expect(baselineTelemetry.tool_results[0]?.normalized_result_artifact_href).toBeTruthy();
    const retentionControls = JSON.parse(
      readFileSync(path.join(fixture.outDir, "archive", "retention-controls.json"), "utf8")
    );
    expect(retentionControls.bundle_artifacts.retention_archive_controls_href).toBe("archive/retention-controls.json");
  }, 45_000);

  it("fails verification when the packaged source snapshot is damaged", () => {
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
      "agent-evidence-missing-source",
      "--no-trend",
      "--no-verify",
    ]);

    expect(packageResult.status, packageResult.stderr).toBe(0);

    unlinkSync(path.join(fixture.outDir, "_source_inputs", "cases.json"));

    const verifyResult = runNode(VERIFY_SCRIPT, ["--reportDir", fixture.outDir, "--json"]);
    expect(verifyResult.status).toBe(1);

    const parsed = JSON.parse(verifyResult.stdout);
    expect(parsed.ok).toBe(false);
    expect(
      parsed.checks.some(
        (check: { name: string; pass: boolean }) => check.name === "source_snapshot_present" && check.pass === false
      )
    ).toBe(true);
  }, 45_000);

  it("fails verification when a normalized tool telemetry artifact is missing", () => {
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
      "agent-evidence-missing-telemetry",
      "--no-trend",
      "--no-verify",
    ]);

    expect(packageResult.status, packageResult.stderr).toBe(0);

    const report = JSON.parse(readFileSync(path.join(fixture.outDir, "compare-report.json"), "utf8"));
    unlinkSync(path.join(fixture.outDir, report.items[0].artifacts.baseline_tool_telemetry_href));

    const verifyResult = runNode(VERIFY_SCRIPT, ["--reportDir", fixture.outDir, "--json"]);
    expect(verifyResult.status).toBe(1);

    const parsed = JSON.parse(verifyResult.stdout);
    expect(parsed.ok).toBe(false);
    expect(
      parsed.checks.some(
        (check: { name: string; pass: boolean }) =>
          check.name === "c1_baseline_tool_telemetry_file_present" && check.pass === false
      )
    ).toBe(true);
  }, 45_000);

  it("can sign the manifest and pass strict verification", () => {
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
        "agent-evidence-signed",
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
  }, 45_000);
});
