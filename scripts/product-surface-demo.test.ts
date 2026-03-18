import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const AGENT_DEMO_SCRIPT = path.join(REPO_ROOT, "scripts", "agent-evidence-demo.mjs");
const EU_DEMO_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-demo.mjs");

const tempRoots: string[] = [];

function makeTempRoot(prefix: string) {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function runNode(scriptAbs: string, args: string[]) {
  return spawnSync(process.execPath, [scriptAbs, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("product surface demos", () => {
  it("builds a deterministic Agent Evidence demo bundle", () => {
    const root = makeTempRoot("aq-agent-demo-");
    const outDir = path.join(root, "agent-evidence-demo");

    const result = runNode(AGENT_DEMO_SCRIPT, ["--outDir", outDir, "--reportId", "agent-evidence-demo-test"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Agent Evidence demo: PASS");

    const report = JSON.parse(readFileSync(path.join(outDir, "compare-report.json"), "utf8"));
    expect(report.report_id).toBe("agent-evidence-demo-test");
    expect(report.quality_flags.portable_paths).toBe(true);
    expect(report.cases_path).toBe("_source_inputs/cases.json");
    expect(report.compliance_exports).toBeUndefined();
  }, 45_000);

  it("builds an EU AI Act demo bundle with monitoring history", () => {
    const root = makeTempRoot("aq-eu-demo-");
    const outDir = path.join(root, "eu-ai-act-demo");

    const result = runNode(EU_DEMO_SCRIPT, ["--outDir", outDir, "--reportId", "eu-ai-act-demo-test"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("EU AI Act demo: PASS");

    const report = JSON.parse(readFileSync(path.join(outDir, "compare-report.json"), "utf8"));
    const exportsBlock = report.compliance_exports?.eu_ai_act;
    expect(report.report_id).toBe("eu-ai-act-demo-test");
    expect(exportsBlock?.post_market_monitoring_href).toBe("compliance/post-market-monitoring.json");
    expect(exportsBlock?.article_13_instructions_href).toBe("compliance/article-13-instructions.json");
    expect(exportsBlock?.article_9_risk_register_href).toBe("compliance/article-9-risk-register.json");
    expect(exportsBlock?.article_72_monitoring_plan_href).toBe("compliance/article-72-monitoring-plan.json");
    expect(exportsBlock?.article_17_qms_lite_href).toBe("compliance/article-17-qms-lite.json");

    const monitoring = JSON.parse(readFileSync(path.join(outDir, exportsBlock.post_market_monitoring_href), "utf8"));
    expect(monitoring.summary.monitoring_status).toBe("history_current");
    expect(monitoring.summary.current_run_included_in_history).toBe(true);
    expect(monitoring.summary.runs_in_window).toBeGreaterThanOrEqual(2);
  }, 45_000);
});
