import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

type EvaluatorModule = {
  runEvaluator: () => Promise<void>;
};

async function loadEvaluatorWithArgv(argv: string[]): Promise<EvaluatorModule> {
  vi.resetModules();
  process.argv = argv;
  return await import("./evaluator");
}

async function writeJson(absPath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, JSON.stringify(value, null, 2), "utf-8");
}

function buildRunMeta(
  caseIds: string[],
  version: "baseline" | "new",
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {
    selected_case_ids: caseIds,
    provenance: {
      agent_id: "agent-demo",
      agent_version: version === "new" ? "agent-demo-v2" : "agent-demo-v1",
      model: "gpt-4.1",
      model_version: version === "new" ? "2026-03-21" : "2026-03-01",
      prompt_version: version === "new" ? "pv-2" : "pv-1",
      tools_version: "tv-1",
      config_hash: version === "new" ? "cfg-002" : "cfg-001",
    },
    ...(overrides ?? {}),
  };
}

describe("evaluator orchestration", () => {
  const savedArgv = [...process.argv];
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-evaluator-"));
    delete process.env.AQ_MIN_TRANSPORT_SUCCESS_RATE;
    delete process.env.AQ_MAX_WEAK_EXPECTED_RATE;
  });

  afterEach(async () => {
    process.argv = [...savedArgv];
    delete process.env.AGENT_ID;
    delete process.env.AGENT_VERSION;
    delete process.env.AGENT_MODEL;
    delete process.env.MODEL_VERSION;
    delete process.env.PROMPT_VERSION;
    delete process.env.TOOLS_VERSION;
    delete process.env.CONFIG_HASH;
    await rm(root, { recursive: true, force: true });
  });

  it("fails with ExecutionQualityGateError when execution is degraded and gate is enabled", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r1");
    const newDir = path.join(root, "runs", "new", "r1");
    const outDir = path.join(root, "reports", "degraded");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "weak expected case",
        input: { user: "hello" },
        expected: {},
      },
    ]);

    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
    };

    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "agent-demo",
          agent_version: "agent-demo-v1",
          model: "gpt-4.1",
          model_version: "2026-03-01",
          prompt_version: "pv-1",
          tools_version: "tv-1",
          config_hash: "cfg-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "agent-demo",
          agent_version: "agent-demo-v1",
          model: "gpt-4.1",
          model_version: "2026-03-01",
          prompt_version: "pv-1",
          tools_version: "tv-1",
          config_hash: "cfg-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "degraded-gate",
      "--failOnExecutionDegraded",
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toMatchObject({ exitCode: 1, name: "ExecutionQualityGateError" });
  });

  it("marks oversized case response as broken with file_too_large reason_code", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r2");
    const newDir = path.join(root, "runs", "new", "r2");
    const outDir = path.join(root, "reports", "oversized");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "oversized response case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);

    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "agent-from-file",
          agent_version: "agent-from-file-v1",
          model: "claude-sonnet",
          model_version: "2026-03-01",
          prompt_version: "pv-file",
          tools_version: "tools-file-v1",
          config_hash: "cfg-file-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "agent-from-file",
          agent_version: "agent-from-file-v1",
          model: "claude-sonnet",
          model_version: "2026-03-01",
          prompt_version: "pv-file",
          tools_version: "tools-file-v1",
          config_hash: "cfg-file-001",
        },
      })
    );

    const hugeResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "x".repeat(1000) },
      events: [],
      proposed_actions: [],
    };
    await writeJson(path.join(baselineDir, "c1.json"), hugeResp);
    await writeJson(path.join(newDir, "c1.json"), { ...hugeResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "oversized-case",
      "--maxCaseBytes",
      "200",
      "--no-trend",
    ]);

    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      summary?: {
        execution_quality?: {
          admissibility_kpi?: {
            pre_action_entropy_removed: number;
          };
        };
      };
      items: Array<{
        case_id: string;
        data_availability: {
          baseline: { reason_code?: string };
          new: { reason_code?: string };
        };
      }>;
    };
    const item = report.items.find((x) => x.case_id === "c1");
    expect(item).toBeDefined();
    expect(item?.data_availability.baseline.reason_code).toBe("file_too_large");
    expect(item?.data_availability.new.reason_code).toBe("file_too_large");
    expect(report.summary?.execution_quality?.admissibility_kpi).toBeDefined();
  });

  it("fails strictRedaction when redaction_applied artifacts still include sensitive markers", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r3");
    const newDir = path.join(root, "runs", "new", "r3");
    const outDir = path.join(root, "reports", "strict-redaction");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "redaction violation",
        input: { user: "hello" },
        expected: {},
      },
    ]);

    const unsafeResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "contact me at ceo@example.com" },
      events: [],
      proposed_actions: [],
    };

    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        redaction_applied: true,
        redaction_preset: "transferable",
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        redaction_applied: true,
        redaction_preset: "transferable",
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), unsafeResp);
    await writeJson(path.join(newDir, "c1.json"), { ...unsafeResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "strict-redaction",
      "--strictRedaction",
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toThrow("Redaction check failed");
  });

  it("fails strictPortability when report contains non-portable relative paths", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r4");
    const newDir = path.join(root, "runs", "new", "r4");
    const outDir = path.join(root, "reports", "strict-portability");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "portability strict case",
        input: { user: "hello" },
        expected: {},
      },
    ]);

    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
    };

    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "strict-portability",
      "--strictPortability",
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toThrow("Portability violations detected");
  });

  it("embeds environment from env vars and compliance mapping from object profile", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r5");
    const newDir = path.join(root, "runs", "new", "r5");
    const outDir = path.join(root, "reports", "env-compliance");
    const compliancePath = path.join(root, "compliance.json");

    process.env.AGENT_ID = "agent-demo";
    process.env.AGENT_VERSION = "agent-demo-v1";
    process.env.AGENT_MODEL = "gpt-4.1";
    process.env.MODEL_VERSION = "2026-03-01";
    process.env.PROMPT_VERSION = "pv-1";
    process.env.TOOLS_VERSION = "tv-1";
    process.env.CONFIG_HASH = "cfg-001";

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "env/compliance case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);

    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "agent-demo",
          agent_version: "agent-demo-v1",
          model: "gpt-4.1",
          model_version: "2026-03-01",
          prompt_version: "pv-1",
          tools_version: "tv-1",
          config_hash: "cfg-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "agent-demo",
          agent_version: "agent-demo-v1",
          model: "gpt-4.1",
          model_version: "2026-03-01",
          prompt_version: "pv-1",
          tools_version: "tv-1",
          config_hash: "cfg-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });
    await writeJson(compliancePath, {
      compliance_mapping: [{ framework: "SOC2", clause: "CC7.2", title: "Monitoring" }],
      coverage_requirements: [
        {
          framework: "SOC2",
          clause: "CC7.2",
          title: "Monitoring",
          required_evidence: ["compare-report.json.summary.security", "artifacts/manifest.json"],
          supporting_evidence: ["embedded_manifest_index.items[]"],
        },
      ],
    });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "env-compliance",
      "--complianceProfile",
      compliancePath,
      "--no-trend",
    ]);

    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      environment?: Record<string, unknown>;
      compliance_mapping?: Array<{ framework: string; clause: string }>;
      compliance_coverage?: Array<{ framework: string; clause: string; status: string }>;
    };
    expect(report.environment).toMatchObject({
      agent_id: "agent-demo",
      agent_version: "agent-demo-v1",
      model: "gpt-4.1",
      model_version: "2026-03-01",
      prompt_version: "pv-1",
      tools_version: "tv-1",
      config_hash: "cfg-001",
    });
    expect(report.compliance_mapping?.[0]).toMatchObject({ framework: "SOC2", clause: "CC7.2" });
    expect(report.compliance_coverage?.[0]).toMatchObject({
      framework: "SOC2",
      clause: "CC7.2",
      status: "covered",
    });
  });

  it("loads environment from file and compliance profile from array shape", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r6");
    const newDir = path.join(root, "runs", "new", "r6");
    const outDir = path.join(root, "reports", "env-file");
    const envPath = path.join(root, "environment.json");
    const compliancePath = path.join(root, "compliance-array.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "env-file case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(envPath, {
      agent_id: "agent-from-file",
      model: "claude-sonnet",
      prompt_version: "pv-file",
    });
    await writeJson(compliancePath, [{ framework: "ISO27001", clause: "A.12.4" }]);

    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "agent-from-file",
          agent_version: "agent-from-file-v1",
          model: "claude-sonnet",
          model_version: "2026-03-01",
          prompt_version: "pv-file",
          tools_version: "tools-file-v1",
          config_hash: "cfg-file-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "agent-from-file",
          agent_version: "agent-from-file-v1",
          model: "claude-sonnet",
          model_version: "2026-03-01",
          prompt_version: "pv-file",
          tools_version: "tools-file-v1",
          config_hash: "cfg-file-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "env-file",
      "--environment",
      envPath,
      "--complianceProfile",
      compliancePath,
      "--no-trend",
    ]);

    await mod.runEvaluator();
    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      environment?: Record<string, unknown>;
      compliance_mapping?: Array<{ framework: string; clause: string }>;
      compliance_coverage?: unknown;
    };
    expect(report.environment).toMatchObject({ agent_id: "agent-from-file", model: "claude-sonnet" });
    expect(report.compliance_mapping?.[0]).toMatchObject({ framework: "ISO27001", clause: "A.12.4" });
    expect(report.compliance_coverage).toBeUndefined();
  });

  it("fails when core packaging run provenance is missing", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "missing-prov");
    const newDir = path.join(root, "runs", "new", "missing-prov");
    const outDir = path.join(root, "reports", "missing-prov");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "missing provenance case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "missing-prov",
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toThrow("Core qualification packaging requires baseline run provenance");
  });

  it("backfills legacy baseline and new provenance from environment metadata", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "legacy-overlay");
    const newDir = path.join(root, "runs", "new", "legacy-overlay");
    const outDir = path.join(root, "reports", "legacy-overlay");
    const envPath = path.join(root, "legacy-overlay-environment.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "legacy overlay case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(envPath, {
      agent_id: "legacy-agent",
      agent_version: "legacy-agent-v2",
      model: "gpt-legacy",
      model_version: "2026-03-21",
      prompt_version: "prompt-v2",
      tools_version: "tools-v1",
      config_hash: "cfg-002",
      deployment_tier: "staging",
      baseline_provenance: {
        agent_id: "legacy-agent",
        agent_version: "legacy-agent-v1",
        model: "gpt-legacy",
        model_version: "2026-03-01",
        prompt_version: "prompt-v1",
        tools_version: "tools-v1",
        config_hash: "cfg-001",
      },
      new_provenance: {
        agent_id: "legacy-agent",
        agent_version: "legacy-agent-v2",
        model: "gpt-legacy",
        model_version: "2026-03-21",
        prompt_version: "prompt-v2",
        tools_version: "tools-v1",
        config_hash: "cfg-002",
      },
    });
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "legacy-overlay",
      "--environment",
      envPath,
      "--no-trend",
    ]);

    await mod.runEvaluator();

    const report = JSON.parse(await readFile(path.join(outDir, "compare-report.json"), "utf-8")) as {
      environment?: Record<string, unknown>;
      provenance?: {
        baseline?: Record<string, unknown>;
        new?: Record<string, unknown>;
      };
    };
    expect(report.provenance?.baseline).toMatchObject({
      agent_id: "legacy-agent",
      agent_version: "legacy-agent-v1",
      config_hash: "cfg-001",
    });
    expect(report.provenance?.new).toMatchObject({
      agent_id: "legacy-agent",
      agent_version: "legacy-agent-v2",
      config_hash: "cfg-002",
    });
    expect(report.environment).toMatchObject({
      agent_id: "legacy-agent",
      agent_version: "legacy-agent-v2",
      deployment_tier: "staging",
    });
    expect(report.environment).not.toHaveProperty("baseline_provenance");
    expect(report.environment).not.toHaveProperty("new_provenance");
  });

  it("fails when provided legacy overlay conflicts with recorded run provenance", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "overlay-mismatch");
    const newDir = path.join(root, "runs", "new", "overlay-mismatch");
    const outDir = path.join(root, "reports", "overlay-mismatch");
    const envPath = path.join(root, "overlay-mismatch-environment.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "overlay mismatch case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(envPath, {
      baseline_provenance: {
        agent_id: "agent-demo",
        agent_version: "wrong-version",
        model: "gpt-4.1",
        model_version: "2026-03-01",
        prompt_version: "pv-1",
        tools_version: "tv-1",
        config_hash: "cfg-001",
      },
    });
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    await writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "overlay-mismatch",
      "--environment",
      envPath,
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toThrow(
      "Provided baseline_provenance does not match baseline run provenance"
    );
  });

  it("fails when provided environment metadata conflicts with new run provenance", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "env-mismatch");
    const newDir = path.join(root, "runs", "new", "env-mismatch");
    const outDir = path.join(root, "reports", "env-mismatch");
    const envPath = path.join(root, "env-mismatch.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "env mismatch case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(envPath, {
      agent_id: "agent-demo",
      agent_version: "wrong-version",
    });
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "env-mismatch",
      "--environment",
      envPath,
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toThrow(
      "Provided environment metadata does not match new run provenance"
    );
  });

  it("writes EU AI Act compliance bundle outputs when EU coverage is present", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r6-eu");
    const newDir = path.join(root, "runs", "new", "r6-eu");
    const outDir = path.join(root, "reports", "eu-bundle");
    const compliancePath = path.join(root, "eu-profile.json");
    const envPath = path.join(root, "eu-environment.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "eu bundle case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(compliancePath, {
      compliance_mapping: [
        { framework: "EU_AI_ACT", clause: "Art_12", title: "Record-keeping and logging" },
        { framework: "EU_AI_ACT", clause: "Art_15", title: "Accuracy, robustness, and cybersecurity" },
      ],
      coverage_requirements: [
        {
          framework: "EU_AI_ACT",
          clause: "Art_12",
          title: "Record-keeping and logging",
          required_evidence: ["compare-report.json.items[].trace_integrity", "artifacts/manifest.json"],
        },
        {
          framework: "EU_AI_ACT",
          clause: "Art_15",
          title: "Accuracy, robustness, and cybersecurity",
          required_evidence: ["compare-report.json.summary.execution_quality", "compare-report.json.items[].security"],
        },
      ],
    });
    await writeJson(envPath, {
      agent_id: "eu-agent",
      agent_version: "eu-agent-v3",
      model: "gpt-eu",
      model_version: "2026-03-15",
      prompt_version: "prompt-eu-v1",
      tools_version: "tools-eu-v2",
      config_hash: "cfg-eu-001",
    });

    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    };
    const failureNew = {
      type: "runner_fetch_failure",
      class: "timeout",
      case_id: "c1",
      version: "new",
      url: "http://localhost/run-case",
      attempt: 1,
      timeout_ms: 1500,
      latency_ms: 1500,
    };

    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), {
      ...okResp,
      version: "new",
      runner_failure: failureNew,
    });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "eu-bundle",
      "--environment",
      envPath,
      "--complianceProfile",
      compliancePath,
      "--euContract",
      "full",
      "--no-trend",
    ]);

    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      compliance_exports?: {
        eu_ai_act?: {
          coverage_href: string;
          annex_iv_href: string;
          article_10_data_governance_href: string;
          report_html_href: string;
          reviewer_html_href: string;
          reviewer_markdown_href: string;
          evidence_index_href: string;
          article_13_instructions_href: string;
          article_16_provider_obligations_href: string;
          article_43_conformity_assessment_href: string;
          article_47_declaration_of_conformity_href: string;
          article_9_risk_register_href: string;
          article_72_monitoring_plan_href: string;
          article_17_qms_lite_href: string;
          annex_v_declaration_content_href: string;
          article_73_serious_incident_pack_href: string;
          human_oversight_summary_href: string;
          release_review_href: string;
          post_market_monitoring_href: string;
        };
      };
    };

    expect(report.compliance_exports?.eu_ai_act).toBeDefined();
    const coveragePath = path.join(outDir, report.compliance_exports?.eu_ai_act?.coverage_href ?? "");
    const annexPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.annex_iv_href ?? "");
    const article10Path = path.join(outDir, report.compliance_exports?.eu_ai_act?.article_10_data_governance_href ?? "");
    const htmlPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.report_html_href ?? "");
    const reviewerHtmlPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.reviewer_html_href ?? "");
    const reviewerMarkdownPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.reviewer_markdown_href ?? "");
    const evidenceIndexPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.evidence_index_href ?? "");
    const article13Path = path.join(outDir, report.compliance_exports?.eu_ai_act?.article_13_instructions_href ?? "");
    const article16Path = path.join(outDir, report.compliance_exports?.eu_ai_act?.article_16_provider_obligations_href ?? "");
    const article43Path = path.join(
      outDir,
      report.compliance_exports?.eu_ai_act?.article_43_conformity_assessment_href ?? ""
    );
    const article47Path = path.join(
      outDir,
      report.compliance_exports?.eu_ai_act?.article_47_declaration_of_conformity_href ?? ""
    );
    const riskRegisterPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.article_9_risk_register_href ?? "");
    const monitoringPlanPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.article_72_monitoring_plan_href ?? "");
    const qmsLitePath = path.join(outDir, report.compliance_exports?.eu_ai_act?.article_17_qms_lite_href ?? "");
    const annexVPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.annex_v_declaration_content_href ?? "");
    const incidentPackPath = path.join(
      outDir,
      report.compliance_exports?.eu_ai_act?.article_73_serious_incident_pack_href ?? ""
    );
    const oversightPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.human_oversight_summary_href ?? "");
    const releaseReviewPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.release_review_href ?? "");
    const monitoringPath = path.join(outDir, report.compliance_exports?.eu_ai_act?.post_market_monitoring_href ?? "");
    await expect(stat(coveragePath)).resolves.toBeDefined();
    await expect(stat(annexPath)).resolves.toBeDefined();
    await expect(stat(article10Path)).resolves.toBeDefined();
    await expect(stat(htmlPath)).resolves.toBeDefined();
    await expect(stat(reviewerHtmlPath)).resolves.toBeDefined();
    await expect(stat(reviewerMarkdownPath)).resolves.toBeDefined();
    await expect(stat(evidenceIndexPath)).resolves.toBeDefined();
    await expect(stat(article13Path)).resolves.toBeDefined();
    await expect(stat(article16Path)).resolves.toBeDefined();
    await expect(stat(article43Path)).resolves.toBeDefined();
    await expect(stat(article47Path)).resolves.toBeDefined();
    await expect(stat(riskRegisterPath)).resolves.toBeDefined();
    await expect(stat(monitoringPlanPath)).resolves.toBeDefined();
    await expect(stat(qmsLitePath)).resolves.toBeDefined();
    await expect(stat(annexVPath)).resolves.toBeDefined();
    await expect(stat(incidentPackPath)).resolves.toBeDefined();
    await expect(stat(oversightPath)).resolves.toBeDefined();
    await expect(stat(releaseReviewPath)).resolves.toBeDefined();
    await expect(stat(monitoringPath)).resolves.toBeDefined();

    const annexRaw = await readFile(annexPath, "utf-8");
    const annex = JSON.parse(annexRaw) as {
      system_identity?: { report_id?: string };
      clause_coverage?: Array<{ clause: string }>;
    };
    expect(annex.system_identity?.report_id).toBe("eu-bundle");
    expect(annex.clause_coverage?.map((entry) => entry.clause)).toEqual(["Art_12", "Art_15"]);

    const htmlRaw = await readFile(htmlPath, "utf-8");
    expect(htmlRaw).toContain("EU AI Act Annex IV dossier");
    expect(htmlRaw).toContain("Article 13 instructions for use scaffold");
    expect(htmlRaw).toContain("Article 9 risk register scaffold");
    expect(htmlRaw).toContain("Article 72 monitoring plan scaffold");
    expect(htmlRaw).toContain("Article 17 QMS-lite scaffold");
    expect(htmlRaw).toContain("Human oversight");
    expect(htmlRaw).toContain("Release review");
    const reviewerHtmlRaw = await readFile(reviewerHtmlPath, "utf-8");
    expect(reviewerHtmlRaw).toContain("EU AI Act reviewer pack");
    expect(reviewerHtmlRaw).toContain("1. General description of the system");
    expect(reviewerHtmlRaw).toContain("Generated here (machine-generated)");
    expect(reviewerHtmlRaw).toContain("Review this pack in Annex order");
    expect(reviewerHtmlRaw).toContain("How to read this pack");
    const reviewerMarkdownRaw = await readFile(reviewerMarkdownPath, "utf-8");
    expect(reviewerMarkdownRaw).toContain("## 9. Post-market monitoring and serious incidents");
    expect(reviewerMarkdownRaw).toContain("### Claim-to-evidence map");
    expect(reviewerMarkdownRaw).toContain("## If you are not reading from engineering tooling");

    const oversightRaw = await readFile(oversightPath, "utf-8");
    const oversight = JSON.parse(oversightRaw) as {
      review_queue?: Array<{ case_id: string; reviewer_action: string }>;
    };
    expect(oversight.review_queue?.[0]).toMatchObject({
      case_id: "c1",
      reviewer_action: "require_human_review",
    });

    const releaseReviewRaw = await readFile(releaseReviewPath, "utf-8");
    const releaseReview = JSON.parse(releaseReviewRaw) as {
      release_decision?: { status?: string };
      checklist?: Array<{ id: string; status: string }>;
    };
    expect(releaseReview.release_decision?.status).toBe("reject");
    expect(releaseReview.checklist?.find((item) => item.id === "approval_cases")?.status).toBe("review");

    const monitoringRaw = await readFile(monitoringPath, "utf-8");
    const monitoring = JSON.parse(monitoringRaw) as {
      summary?: { monitoring_status?: string; trend_ingest_enabled?: boolean };
    };
    expect(monitoring.summary?.monitoring_status).toBe("no_matching_history");
    expect(monitoring.summary?.trend_ingest_enabled).toBe(false);
  });

  it("fails EU AI Act bundle generation when run provenance is missing", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r6-eu-missing-env");
    const newDir = path.join(root, "runs", "new", "r6-eu-missing-env");
    const outDir = path.join(root, "reports", "eu-bundle-missing-env");
    const compliancePath = path.join(root, "eu-profile-missing-env.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "eu bundle identity case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(compliancePath, {
      compliance_mapping: [{ framework: "EU_AI_ACT", clause: "Art_12", title: "Record-keeping and logging" }],
      coverage_requirements: [
        {
          framework: "EU_AI_ACT",
          clause: "Art_12",
          title: "Record-keeping and logging",
          required_evidence: ["compare-report.json.items[].trace_integrity", "artifacts/manifest.json"],
        },
      ],
    });
    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    });
    await writeJson(path.join(newDir, "c1.json"), {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "text", content: "ok" },
      events: [{ type: "final_output", ts: Date.now(), content_type: "text", content: "ok" }],
      proposed_actions: [],
    });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "eu-bundle-missing-env",
      "--complianceProfile",
      compliancePath,
      "--no-trend",
    ]);

    await expect(mod.runEvaluator()).rejects.toThrow("Core qualification packaging requires baseline run provenance");
  });

  it("writes only minimum EU exports by default", async () => {
    const casesPath = path.join(root, "eu-minimum-cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r6-eu-minimum");
    const newDir = path.join(root, "runs", "new", "r6-eu-minimum");
    const outDir = path.join(root, "reports", "eu-minimum");
    const envPath = path.join(root, "eu-minimum-environment.json");
    const compliancePath = path.join(root, "eu-minimum-profile.json");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "eu minimum case",
        input: { user: "hello" },
        expected: { must_include: ["ok"] },
      },
    ]);
    await writeJson(envPath, {
      agent_id: "eu-agent",
      agent_version: "eu-agent-v3",
      model: "gpt-eu",
      model_version: "2026-03-15",
      prompt_version: "prompt-eu-v1",
      tools_version: "tools-eu-v2",
      config_hash: "cfg-eu-001",
    });
    await writeJson(compliancePath, {
      compliance_mapping: [
        { framework: "EU_AI_ACT", clause: "Art_12", title: "Record-keeping and logging" },
        { framework: "EU_AI_ACT", clause: "Art_15", title: "Accuracy, robustness and cybersecurity" },
      ],
      coverage_requirements: [
        {
          framework: "EU_AI_ACT",
          clause: "Art_12",
          title: "Record-keeping and logging",
          required_evidence: ["compare-report.json.items[].trace_integrity", "artifacts/manifest.json"],
        },
        {
          framework: "EU_AI_ACT",
          clause: "Art_15",
          title: "Accuracy, robustness and cybersecurity",
          required_evidence: ["compare-report.json.summary.execution_quality", "report.html"],
        },
      ],
    });
    await mkdir(baselineDir, { recursive: true });
    await mkdir(newDir, { recursive: true });
    const failureNew = {
      class: "timeout",
      code: "RUNNER_TIMEOUT",
      detail: "adapter stalled",
      stage: "runner.execute",
      retryable: false,
    };
    const okResp = {
      id: "c1",
      version: "baseline",
      response: { ok: true },
      metrics: { score: 1 },
      security_signals: [],
      tool_calls: [],
    };
    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        provenance: {
          agent_id: "eu-agent",
          agent_version: "eu-agent-v3",
          model: "gpt-eu",
          model_version: "2026-03-15",
          prompt_version: "prompt-eu-v1",
          tools_version: "tools-eu-v2",
          config_hash: "cfg-eu-001",
        },
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), {
      ...okResp,
      version: "new",
      runner_failure: failureNew,
    });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "eu-minimum",
      "--environment",
      envPath,
      "--complianceProfile",
      compliancePath,
      "--no-trend",
    ]);

    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      compliance_exports?: {
        eu_ai_act?: {
          annex_iv_href: string;
          article_10_data_governance_href: string;
          article_13_instructions_href: string;
          article_16_provider_obligations_href: string;
          article_43_conformity_assessment_href: string;
          article_47_declaration_of_conformity_href: string;
          article_9_risk_register_href: string;
          article_72_monitoring_plan_href: string;
          article_17_qms_lite_href: string;
          annex_v_declaration_content_href: string;
          human_oversight_summary_href: string;
          post_market_monitoring_href: string;
          release_review_href?: string;
          coverage_href?: string;
          report_html_href?: string;
          reviewer_html_href?: string;
          reviewer_markdown_href?: string;
          evidence_index_href?: string;
          article_73_serious_incident_pack_href?: string;
        };
      };
    };

    const eu = report.compliance_exports?.eu_ai_act;
    expect(eu).toBeDefined();
    expect(eu?.release_review_href).toBeUndefined();
    expect(eu?.coverage_href).toBeUndefined();
    expect(eu?.report_html_href).toBeUndefined();
    expect(eu?.reviewer_html_href).toBeUndefined();
    expect(eu?.reviewer_markdown_href).toBeUndefined();
    expect(eu?.evidence_index_href).toBeUndefined();
    expect(eu?.article_73_serious_incident_pack_href).toBeUndefined();

    await expect(stat(path.join(outDir, eu?.annex_iv_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_10_data_governance_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_13_instructions_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_16_provider_obligations_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_43_conformity_assessment_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_47_declaration_of_conformity_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_9_risk_register_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_72_monitoring_plan_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.article_17_qms_lite_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.annex_v_declaration_content_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.human_oversight_summary_href ?? ""))).resolves.toBeDefined();
    await expect(stat(path.join(outDir, eu?.post_market_monitoring_href ?? ""))).resolves.toBeDefined();

    await expect(stat(path.join(outDir, "compliance", "release-review.json"))).rejects.toBeDefined();
    await expect(stat(path.join(outDir, "compliance", "eu-ai-act-report.html"))).rejects.toBeDefined();
    await expect(stat(path.join(outDir, "compliance", "eu-ai-act-reviewer.html"))).rejects.toBeDefined();
    await expect(stat(path.join(outDir, "compliance", "eu-ai-act-reviewer.md"))).rejects.toBeDefined();
    await expect(stat(path.join(outDir, "compliance", "evidence-index.json"))).rejects.toBeDefined();
    await expect(stat(path.join(outDir, "compliance", "article-73-serious-incident-pack.json"))).rejects.toBeDefined();
  });

  it("writes redaction summary when both run metas declare redaction applied", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r7");
    const newDir = path.join(root, "runs", "new", "r7");
    const outDir = path.join(root, "reports", "redaction-summary");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "redaction summary case",
        input: { user: "hello" },
        expected: {},
      },
    ]);
    const safeResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "all safe content" },
      events: [],
      proposed_actions: [],
    };
    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        redaction_applied: true,
        redaction_preset: "internal_only",
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        redaction_applied: true,
        redaction_preset: "internal_only",
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), safeResp);
    await writeJson(path.join(newDir, "c1.json"), { ...safeResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "redaction-summary",
      "--no-trend",
    ]);
    await mod.runEvaluator();

    const redactionRaw = await readFile(path.join(outDir, "artifacts", "redaction-summary.json"), "utf-8");
    const redaction = JSON.parse(redactionRaw) as { preset_id?: string; warnings?: string[] };
    expect(redaction.preset_id).toBe("internal_only");
    expect(Array.isArray(redaction.warnings)).toBe(true);
  });

  it("records warning when baseline/new redaction_applied flags mismatch", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r7b");
    const newDir = path.join(root, "runs", "new", "r7b");
    const outDir = path.join(root, "reports", "redaction-mismatch");

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "redaction mismatch case",
        input: { user: "hello" },
        expected: {},
      },
    ]);
    const safeResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "safe text" },
      events: [],
      proposed_actions: [],
    };
    await writeJson(
      path.join(baselineDir, "run.json"),
      buildRunMeta(["c1"], "baseline", {
        redaction_applied: true,
        redaction_preset: "transferable",
      })
    );
    await writeJson(
      path.join(newDir, "run.json"),
      buildRunMeta(["c1"], "new", {
        redaction_applied: false,
      })
    );
    await writeJson(path.join(baselineDir, "c1.json"), safeResp);
    await writeJson(path.join(newDir, "c1.json"), { ...safeResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "redaction-mismatch",
      "--no-trend",
    ]);
    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      summary?: {
        quality?: {
          redaction_status?: string;
          redaction_warnings?: string[];
        };
      };
    };
    expect(report.summary?.quality?.redaction_status).toBe("none");
  });

  it("applies retention cleanup and keeps latest report directory", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r8");
    const newDir = path.join(root, "runs", "new", "r8");
    const reportsBase = path.join(root, "reports");
    const outDir = path.join(reportsBase, "fresh-report");
    const staleDir = path.join(reportsBase, "stale-report");

    await mkdir(staleDir, { recursive: true });
    const old = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
    await utimes(staleDir, old, old);

    await writeJson(casesPath, [
      {
        id: "c1",
        title: "retention cleanup case",
        input: { user: "hello" },
        expected: {},
      },
    ]);
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
    };
    await writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "retention-cleanup",
      "--retentionDays",
      "1",
      "--no-trend",
    ]);
    await mod.runEvaluator();

    await expect(readFile(path.join(outDir, "compare-report.json"), "utf8")).resolves.toContain("\"report_id\"");
    await expect(stat(staleDir)).rejects.toBeDefined();
  });

  it("emits filtered_out and missing case statuses with fallback case HTML for absent artifacts", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r9");
    const newDir = path.join(root, "runs", "new", "r9");
    const outDir = path.join(root, "reports", "mixed-status");

    await writeJson(casesPath, [
      { id: "c1", title: "executed", input: { user: "u1" }, expected: {} },
      { id: "c2", title: "filtered", input: { user: "u2" }, expected: {} },
      { id: "c3", title: "missing", input: { user: "u3" }, expected: {} },
    ]);

    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
    };

    await writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1", "c3"], "baseline"));
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1", "c3"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "mixed-status",
      "--no-trend",
    ]);
    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      items: Array<{ case_id: string; case_status: string }>;
    };
    const c2 = report.items.find((x) => x.case_id === "c2");
    const c3 = report.items.find((x) => x.case_id === "c3");
    expect(c2?.case_status).toBe("filtered_out");
    expect(c3?.case_status).toBe("missing");

    const c3Html = await readFile(path.join(outDir, "case-c3.html"), "utf8");
    expect(c3Html).toContain("response missing");
  });

  it("ingests trend DB when enabled and keeps run successful", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r10");
    const newDir = path.join(root, "runs", "new", "r10");
    const outDir = path.join(root, "reports", "trend-ingest");
    const dbPath = path.join(root, "trend.sqlite");

    await writeJson(casesPath, [{ id: "c1", title: "trend case", input: { user: "u1" }, expected: {} }]);
    const okResp = {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [],
      proposed_actions: [],
    };

    await writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "trend-ingest",
      "--trend-db",
      dbPath,
    ]);
    await mod.runEvaluator();
    await expect(stat(dbPath)).resolves.toBeDefined();
  });

  it("adds entropy scanner signals when --entropyScanner is enabled", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r11");
    const newDir = path.join(root, "runs", "new", "r11");
    const outDir = path.join(root, "reports", "entropy-signals");

    await writeJson(casesPath, [{ id: "c1", title: "entropy scanner case", input: { user: "u1" }, expected: {} }]);
    const resp = {
      case_id: "c1",
      version: "baseline",
      final_output: {
        content_type: "text",
        content: "Potential leak: sk-abcdefghijklmnopqrstuvwxyz123456",
      },
      events: [],
      proposed_actions: [],
    };

    await writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), resp);
    await writeJson(path.join(newDir, "c1.json"), { ...resp, version: "new" });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "entropy-signals",
      "--entropyScanner",
      "--no-trend",
    ]);
    await mod.runEvaluator();

    const reportRaw = await readFile(path.join(outDir, "compare-report.json"), "utf-8");
    const report = JSON.parse(reportRaw) as {
      summary?: {
        security?: {
          top_signal_kinds_baseline?: string[];
          top_signal_kinds_new?: string[];
        };
      };
    };

    expect(report.summary?.security?.top_signal_kinds_baseline).toContain("token_exfil_indicator");
    expect(report.summary?.security?.top_signal_kinds_new).toContain("token_exfil_indicator");
  });

  it("copies runner failure assets and trace anchors into artifacts/manifest", async () => {
    const casesPath = path.join(root, "cases.json");
    const baselineDir = path.join(root, "runs", "baseline", "r12");
    const newDir = path.join(root, "runs", "new", "r12");
    const outDir = path.join(root, "reports", "failure-assets");
    const failureDir = path.join(root, "failures");

    await writeJson(casesPath, [{ id: "c1", title: "failure assets", input: { user: "u1" }, expected: {} }]);
    await mkdir(failureDir, { recursive: true });

    const baselineBodyAbs = path.join(failureDir, "baseline.body.txt");
    const baselineMetaAbs = path.join(failureDir, "baseline.meta.json");
    const newBodyAbs = path.join(failureDir, "new.body.txt");
    const newMetaAbs = path.join(failureDir, "new.meta.json");
    await writeFile(baselineBodyAbs, "baseline-failure", "utf-8");
    await writeFile(baselineMetaAbs, JSON.stringify({ side: "baseline" }), "utf-8");
    await writeFile(newBodyAbs, "new-failure", "utf-8");
    await writeFile(newMetaAbs, JSON.stringify({ side: "new" }), "utf-8");

    const failureBaseline = {
      type: "runner_fetch_failure",
      class: "http_error",
      case_id: "c1",
      version: "baseline",
      url: "http://localhost/run-case",
      attempt: 1,
      timeout_ms: 1000,
      latency_ms: 10,
      status: 500,
      status_text: "Internal Server Error",
      body_snippet: "oops",
      full_body_saved_to: baselineBodyAbs,
      full_body_meta_saved_to: baselineMetaAbs,
    };
    const failureNew = {
      ...failureBaseline,
      version: "new",
      full_body_saved_to: newBodyAbs,
      full_body_meta_saved_to: newMetaAbs,
    };

    await writeJson(path.join(baselineDir, "run.json"), buildRunMeta(["c1"], "baseline"));
    await writeJson(path.join(newDir, "run.json"), buildRunMeta(["c1"], "new"));
    await writeJson(path.join(baselineDir, "c1.json"), {
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "baseline out" },
      trace_anchor: { trace_id: "11111111111111111111111111111111", span_id: "2222222222222222" },
      events: [],
      proposed_actions: [],
      runner_failure: failureBaseline,
    });
    await writeJson(path.join(newDir, "c1.json"), {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "text", content: "new out" },
      trace_anchor: { trace_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", span_id: "bbbbbbbbbbbbbbbb" },
      events: [],
      proposed_actions: [],
      runner_failure: failureNew,
    });

    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      casesPath,
      "--baselineDir",
      baselineDir,
      "--newDir",
      newDir,
      "--outDir",
      outDir,
      "--reportId",
      "failure-assets",
      "--no-trend",
    ]);
    await mod.runEvaluator();

    const report = JSON.parse(await readFile(path.join(outDir, "compare-report.json"), "utf-8")) as {
      items: Array<{
        case_id: string;
        artifacts: Record<string, string | undefined>;
        trace_anchors?: { baseline?: Record<string, string>; new?: Record<string, string> };
      }>;
    };
    const c1 = report.items.find((x) => x.case_id === "c1");
    expect(c1).toBeDefined();
    expect(c1?.artifacts.baseline_failure_body_href).toBeTruthy();
    expect(c1?.artifacts.baseline_failure_meta_href).toBeTruthy();
    expect(c1?.artifacts.new_failure_body_href).toBeTruthy();
    expect(c1?.artifacts.new_failure_meta_href).toBeTruthy();
    expect(c1?.trace_anchors?.baseline?.trace_id).toBe("11111111111111111111111111111111");
    expect(c1?.trace_anchors?.new?.trace_id).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    const manifest = JSON.parse(await readFile(path.join(outDir, "artifacts", "manifest.json"), "utf-8")) as {
      items: Array<{ manifest_key: string }>;
    };
    expect(manifest.items.some((it) => it.manifest_key === "c1/baseline/runner_failure_body")).toBe(true);
    expect(manifest.items.some((it) => it.manifest_key === "c1/new/runner_failure_body")).toBe(true);
    expect(manifest.items.some((it) => it.manifest_key === "c1/baseline/trace_anchor")).toBe(true);
    expect(manifest.items.some((it) => it.manifest_key === "c1/new/trace_anchor")).toBe(true);
  });
});
