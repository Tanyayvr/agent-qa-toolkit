import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const GROUP_SCRIPT = path.join(REPO_ROOT, "scripts", "group-bundle.mjs");
const VERIFY_SCRIPT = path.join(REPO_ROOT, "scripts", "group-bundle-verify.mjs");

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeTempRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-group-bundle-"));
  tempRoots.push(root);
  return root;
}

function runNode(scriptAbs: string, args: string[], cwd: string) {
  return spawnSync(process.execPath, [scriptAbs, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function createReport(root: string, name: string) {
  const reportDir = path.join(root, "reports", name);
  mkdirSync(path.join(reportDir, "artifacts"), { recursive: true });
  writeFileSync(path.join(reportDir, "report.html"), `<html><body>${name}</body></html>`, "utf8");
  writeFileSync(
    path.join(reportDir, "compare-report.json"),
    JSON.stringify(
      {
        report_id: name,
        summary: {
          baseline_pass: 0,
          new_pass: 0,
          regressions: 0,
          improvements: 0,
          data_coverage: {
            total_cases: 1
          },
          execution_quality: {
            status: "degraded",
            baseline_transport_success_rate: 0,
            new_transport_success_rate: 0,
            weak_expected_rate: 1,
            model_quality_inconclusive: true
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );
  writeFileSync(
    path.join(reportDir, "artifacts", "manifest.json"),
    JSON.stringify({ items: [{ rel_path: "report.html" }] }, null, 2),
    "utf8"
  );
  return reportDir;
}

describe("group-bundle scripts", () => {
  it("builds and verifies a grouped incident bundle", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "agent-a");
    const reportB = createReport(root, "agent-b");
    const outDir = path.join(root, "groups", "incident-a");

    const build = runNode(
      GROUP_SCRIPT,
      [
        "--groupId",
        "incident-a",
        "--outDir",
        outDir,
        "--report",
        `a=${reportA}`,
        "--report",
        `b=${reportB}`
      ],
      REPO_ROOT
    );
    expect(build.status, build.stderr).toBe(0);

    const index = JSON.parse(readFileSync(path.join(outDir, "group-index.json"), "utf8"));
    expect(index.group_id).toBe("incident-a");
    expect(index.runs).toHaveLength(2);
    expect(index.runs.map((r: { run_label: string }) => r.run_label)).toEqual(["a", "b"]);
    expect(index.runs.map((r: { agent_id: string }) => r.agent_id)).toEqual(["a", "b"]);

    const verify = runNode(VERIFY_SCRIPT, ["--bundleDir", outDir], REPO_ROOT);
    expect(verify.status, verify.stderr).toBe(0);
    expect(verify.stdout).toContain("Status: OK");
  });

  it("detects tampered grouped artifacts", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "agent-a");
    const reportB = createReport(root, "agent-b");
    const outDir = path.join(root, "groups", "incident-b");

    const build = runNode(
      GROUP_SCRIPT,
      [
        "--groupId",
        "incident-b",
        "--outDir",
        outDir,
        "--report",
        `a=${reportA}`,
        "--report",
        `b=${reportB}`
      ],
      REPO_ROOT
    );
    expect(build.status, build.stderr).toBe(0);

    writeFileSync(path.join(outDir, "runs", "a", "report.html"), "<html>tampered</html>", "utf8");

    const verify = runNode(VERIFY_SCRIPT, ["--bundleDir", outDir, "--json"], REPO_ROOT);
    expect(verify.status).toBe(1);
    const json = JSON.parse(verify.stdout);
    expect(json.ok).toBe(false);
    expect(json.hash_mismatches.length).toBeGreaterThan(0);
  });

  it("detects missing grouped artifacts", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "agent-a");
    const outDir = path.join(root, "groups", "incident-b2");

    const build = runNode(
      GROUP_SCRIPT,
      ["--groupId", "incident-b2", "--outDir", outDir, "--report", `a=${reportA}`],
      REPO_ROOT
    );
    expect(build.status, build.stderr).toBe(0);

    unlinkSync(path.join(outDir, "runs", "a", "report.html"));

    const verify = runNode(VERIFY_SCRIPT, ["--bundleDir", outDir, "--json"], REPO_ROOT);
    expect(verify.status).toBe(1);
    const json = JSON.parse(verify.stdout);
    expect(json.ok).toBe(false);
    expect(json.missing_files.length).toBeGreaterThan(0);
  });

  it("fails on duplicate labels", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "agent-a");
    const reportB = createReport(root, "agent-b");
    const outDir = path.join(root, "groups", "incident-c");

    const build = runNode(
      GROUP_SCRIPT,
      [
        "--groupId",
        "incident-c",
        "--outDir",
        outDir,
        "--report",
        `dup=${reportA}`,
        "--report",
        `dup=${reportB}`
      ],
      REPO_ROOT
    );
    expect(build.status).toBe(1);
    expect(build.stderr).toContain("Duplicate report label");
  });

  it("fails when outDir exists without --force", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "agent-a");
    const outDir = path.join(root, "groups", "incident-d");
    mkdirSync(outDir, { recursive: true });

    const build = runNode(
      GROUP_SCRIPT,
      [
        "--groupId",
        "incident-d",
        "--outDir",
        outDir,
        "--report",
        `a=${reportA}`
      ],
      REPO_ROOT
    );
    expect(build.status).toBe(1);
    expect(build.stderr).toContain("outDir exists");
  });

  it("replaces outDir when --force is provided", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "agent-a");
    const outDir = path.join(root, "groups", "incident-d2");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "stale.txt"), "stale", "utf8");

    const build = runNode(
      GROUP_SCRIPT,
      [
        "--groupId",
        "incident-d2",
        "--outDir",
        outDir,
        "--report",
        `a=${reportA}`,
        "--force"
      ],
      REPO_ROOT
    );
    expect(build.status, build.stderr).toBe(0);
    const verify = runNode(VERIFY_SCRIPT, ["--bundleDir", outDir], REPO_ROOT);
    expect(verify.status, verify.stderr).toBe(0);
  });

  it("uses report directory basename as label when not provided", () => {
    const root = makeTempRoot();
    const reportA = createReport(root, "my-agent-report");
    const outDir = path.join(root, "groups", "incident-e");

    const build = runNode(
      GROUP_SCRIPT,
      [
        "--groupId",
        "incident-e",
        "--outDir",
        outDir,
        "--report",
        reportA
      ],
      REPO_ROOT
    );
    expect(build.status, build.stderr).toBe(0);

    const index = JSON.parse(readFileSync(path.join(outDir, "group-index.json"), "utf8"));
    expect(index.runs).toHaveLength(1);
    expect(index.runs[0].run_label).toBe("my-agent-report");
    expect(index.runs[0].agent_id).toBe("my-agent-report");
  });

  it("fails verify when group-manifest.json is missing", () => {
    const root = makeTempRoot();
    const outDir = path.join(root, "groups", "incident-missing");
    mkdirSync(outDir, { recursive: true });

    const verify = runNode(VERIFY_SCRIPT, ["--bundleDir", outDir], REPO_ROOT);
    expect(verify.status).toBe(1);
    expect(verify.stderr).toContain("group-manifest.json not found");
  });
});
