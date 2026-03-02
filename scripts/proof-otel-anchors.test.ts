import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SCRIPT = path.join(REPO_ROOT, "scripts", "proof-otel-anchors.mjs");

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-otel-proof-"));
  tempRoots.push(root);
  return root;
}

function runProof(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
}

function writeCompare(reportDir: string, baseline: number, newer: number) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    path.join(reportDir, "compare-report.json"),
    JSON.stringify(
      {
        summary: {
          trace_anchor_coverage: {
            cases_with_anchor_baseline: baseline,
            cases_with_anchor_new: newer,
            baseline_rate: 1,
            new_rate: 1
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );
}

describe("proof-otel-anchors script", () => {
  it("passes when both baseline/new anchor counts meet threshold", () => {
    const root = makeTempRoot();
    const reportDir = path.join(root, "report");
    writeCompare(reportDir, 2, 3);

    const result = runProof(["--reportDir", reportDir, "--minCases", "1", "--json"]);
    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.ok).toBe(true);
    expect(json.cases_with_anchor_baseline).toBe(2);
    expect(json.cases_with_anchor_new).toBe(3);
  });

  it("fails when one side has no anchors", () => {
    const root = makeTempRoot();
    const reportDir = path.join(root, "report");
    writeCompare(reportDir, 1, 0);

    const result = runProof(["--reportDir", reportDir, "--minCases", "1", "--json"]);
    expect(result.status).toBe(1);
    const json = JSON.parse(result.stdout);
    expect(json.ok).toBe(false);
    expect(json.cases_with_anchor_new).toBe(0);
  });

  it("fails when coverage block is missing", () => {
    const root = makeTempRoot();
    const reportDir = path.join(root, "report");
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(path.join(reportDir, "compare-report.json"), JSON.stringify({ summary: {} }, null, 2), "utf8");

    const result = runProof(["--reportDir", reportDir, "--json"]);
    expect(result.status).toBe(1);
    const json = JSON.parse(result.stdout);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain("trace_anchor_coverage");
  });
});
