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
    delete process.env.AGENT_MODEL;
    delete process.env.PROMPT_VERSION;
    delete process.env.TOOLS_VERSION;
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

    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });

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

    await writeJson(path.join(baselineDir, "run.json"), {
      selected_case_ids: ["c1"],
      redaction_applied: true,
      redaction_preset: "transferable",
    });
    await writeJson(path.join(newDir, "run.json"), {
      selected_case_ids: ["c1"],
      redaction_applied: true,
      redaction_preset: "transferable",
    });
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
    process.env.AGENT_MODEL = "gpt-4.1";
    process.env.PROMPT_VERSION = "pv-1";
    process.env.TOOLS_VERSION = "tv-1";

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

    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(baselineDir, "c1.json"), okResp);
    await writeJson(path.join(newDir, "c1.json"), { ...okResp, version: "new" });
    await writeJson(compliancePath, {
      compliance_mapping: [{ framework: "SOC2", clause: "CC7.2", title: "Monitoring" }],
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
    };
    expect(report.environment).toMatchObject({
      agent_id: "agent-demo",
      model: "gpt-4.1",
      prompt_version: "pv-1",
      tools_version: "tv-1",
    });
    expect(report.compliance_mapping?.[0]).toMatchObject({ framework: "SOC2", clause: "CC7.2" });
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
    };
    expect(report.environment).toMatchObject({ agent_id: "agent-from-file", model: "claude-sonnet" });
    expect(report.compliance_mapping?.[0]).toMatchObject({ framework: "ISO27001", clause: "A.12.4" });
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
    await writeJson(path.join(baselineDir, "run.json"), {
      selected_case_ids: ["c1"],
      redaction_applied: true,
      redaction_preset: "internal_only",
    });
    await writeJson(path.join(newDir, "run.json"), {
      selected_case_ids: ["c1"],
      redaction_applied: true,
      redaction_preset: "internal_only",
    });
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
    await writeJson(path.join(baselineDir, "run.json"), {
      selected_case_ids: ["c1"],
      redaction_applied: true,
      redaction_preset: "transferable",
    });
    await writeJson(path.join(newDir, "run.json"), {
      selected_case_ids: ["c1"],
      redaction_applied: false,
    });
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

    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1", "c3"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1", "c3"] });
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

    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });
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

    await writeJson(path.join(baselineDir, "run.json"), { selected_case_ids: ["c1"] });
    await writeJson(path.join(newDir, "run.json"), { selected_case_ids: ["c1"] });
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
