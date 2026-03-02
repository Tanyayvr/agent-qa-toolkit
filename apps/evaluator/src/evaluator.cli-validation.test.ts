import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

describe("evaluator cli validation", () => {
  const savedArgv = [...process.argv];

  afterEach(() => {
    process.argv = [...savedArgv];
  });

  it("fails on unknown option", async () => {
    const mod = await loadEvaluatorWithArgv(["node", "evaluator", "--unknown"]);
    await expect(mod.runEvaluator()).rejects.toMatchObject({ name: "CliUsageError" });
  });

  it("fails when required args are missing", async () => {
    const mod = await loadEvaluatorWithArgv(["node", "evaluator"]);
    await expect(mod.runEvaluator()).rejects.toThrow("Missing required arguments");
  });

  it("fails on invalid --maxCaseBytes", async () => {
    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      "cases/cases.json",
      "--baselineDir",
      "apps/runner/runs/baseline/latest",
      "--newDir",
      "apps/runner/runs/new/latest",
      "--maxCaseBytes",
      "0",
      "--no-trend",
    ]);
    await expect(mod.runEvaluator()).rejects.toThrow("Invalid --maxCaseBytes value");
  });

  it("fails on invalid --maxMetaBytes", async () => {
    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      "cases/cases.json",
      "--baselineDir",
      "apps/runner/runs/baseline/latest",
      "--newDir",
      "apps/runner/runs/new/latest",
      "--maxMetaBytes",
      "0",
      "--no-trend",
    ]);
    await expect(mod.runEvaluator()).rejects.toThrow("Invalid --maxMetaBytes value");
  });

  it("fails on invalid --transferClass", async () => {
    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      "cases/cases.json",
      "--baselineDir",
      "apps/runner/runs/baseline/latest",
      "--newDir",
      "apps/runner/runs/new/latest",
      "--transferClass",
      "public",
      "--no-trend",
    ]);
    await expect(mod.runEvaluator()).rejects.toThrow("Invalid --transferClass value");
  });

  it("fails when --environment is not valid JSON file", async () => {
    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      "cases/cases.json",
      "--baselineDir",
      "apps/runner/runs/baseline/latest",
      "--newDir",
      "apps/runner/runs/new/latest",
      "--environment",
      "missing-env.json",
      "--no-trend",
    ]);
    await expect(mod.runEvaluator()).rejects.toThrow("Invalid --environment JSON file");
  });

  it("fails when --complianceProfile is not valid JSON file", async () => {
    const mod = await loadEvaluatorWithArgv([
      "node",
      "evaluator",
      "--cases",
      "cases/cases.json",
      "--baselineDir",
      "apps/runner/runs/baseline/latest",
      "--newDir",
      "apps/runner/runs/new/latest",
      "--complianceProfile",
      "missing-compliance.json",
      "--no-trend",
    ]);
    await expect(mod.runEvaluator()).rejects.toThrow("Invalid --complianceProfile JSON file");
  });

  it("fails when --complianceProfile JSON does not match supported shape", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aq-evaluator-cli-"));
    const badCompliancePath = path.join(root, "bad-compliance.json");
    try {
      await writeFile(badCompliancePath, JSON.stringify({ foo: "bar" }), "utf8");
      const mod = await loadEvaluatorWithArgv([
        "node",
        "evaluator",
        "--cases",
        "cases/cases.json",
        "--baselineDir",
        "apps/runner/runs/baseline/latest",
        "--newDir",
        "apps/runner/runs/new/latest",
        "--complianceProfile",
        badCompliancePath,
        "--no-trend",
      ]);
      await expect(mod.runEvaluator()).rejects.toThrow("Invalid --complianceProfile JSON file");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns successfully for --help", async () => {
    const mod = await loadEvaluatorWithArgv(["node", "evaluator", "--help"]);
    await expect(mod.runEvaluator()).resolves.toBeUndefined();
  });
});
