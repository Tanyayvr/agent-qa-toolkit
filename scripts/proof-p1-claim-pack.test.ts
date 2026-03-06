import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  parseCliArgs,
  readOtelCoverageProof,
  runP1ClaimProof,
} from "./proof-p1-claim-pack.mjs";

const tmpDirs: string[] = [];

function mkTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aq-p1-proof-test-"));
  tmpDirs.push(dir);
  return dir;
}

function writeCompareReport(reportDir: string, traceCoverage: Record<string, unknown>) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "compare-report.json"),
    JSON.stringify(
      {
        summary: {
          trace_anchor_coverage: traceCoverage,
          data_coverage: { total_cases: 4 },
          execution_quality: { total_executed_cases: 4 },
        },
        items: [{ case_id: "c1" }],
      },
      null,
      2
    ),
    "utf8"
  );
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("proof-p1-claim-pack", () => {
  it("parses defaults", () => {
    const parsed = parseCliArgs(["node", "proof-p1-claim-pack.mjs"]);
    expect(parsed.reportDir).toBe("apps/evaluator/reports/latest");
    expect(parsed.baseUrl).toBe("http://127.0.0.1:8788");
    expect(parsed.minCases).toBe(1);
    expect(parsed.skipRuntimeE2E).toBe(false);
    expect(parsed.runCaseTimeoutMs).toBe(30000);
  });

  it("validates otel coverage success", () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
      baseline_rate: 0.5,
      new_rate: 0.5,
    });

    const out = readOtelCoverageProof(reportDir, 1);
    expect(out.ok).toBe(true);
    expect(out.payload.cases_with_anchor_baseline).toBe(2);
  });

  it("fails when trace anchor coverage is missing", () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "compare-report.json"), JSON.stringify({ summary: {} }), "utf8");

    const out = readOtelCoverageProof(reportDir, 1);
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("trace_anchor_coverage");
  });

  it("builds proof artifact when otel + runtime checks pass", async () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    const outPath = path.join(root, "proof.json");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
    });

    const runtimeCalls: string[] = [];
    const result = await runP1ClaimProof(
      {
        reportDir,
        baseUrl: "http://127.0.0.1:8788",
        minCases: 1,
        out: outPath,
        skipRuntimeE2E: false,
        runCaseTimeoutMs: 12345,
      },
      {
        nowIso: "2026-03-06T00:00:00.000Z",
        runRuntimeHandoffProofFn: async ({ mode }) => {
          runtimeCalls.push(String(mode));
          return { ok: true, payload: { mode, status: "ok" } };
        },
      }
    );

    expect(result.ok).toBe(true);
    expect(runtimeCalls).toEqual(["endpoint", "e2e"]);
    expect(fs.existsSync(outPath)).toBe(true);
    const payload = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(payload.ok).toBe(true);
    expect(payload.checks.runtime_handoff_endpoint.mode).toBe("endpoint");
    expect(payload.checks.runtime_handoff_e2e.mode).toBe("e2e");
  });

  it("fails when runtime endpoint check fails", async () => {
    const root = mkTmpDir();
    const reportDir = path.join(root, "report");
    writeCompareReport(reportDir, {
      cases_with_anchor_baseline: 2,
      cases_with_anchor_new: 2,
    });

    const result = await runP1ClaimProof(
      {
        reportDir,
        baseUrl: "http://127.0.0.1:8788",
        minCases: 1,
        out: path.join(root, "proof.json"),
        skipRuntimeE2E: true,
        runCaseTimeoutMs: 1000,
      },
      {
        runRuntimeHandoffProofFn: async () => ({ ok: false, payload: { error: "down" } }),
      }
    );

    expect(result.ok).toBe(false);
    expect(result.payload.stage).toBe("runtime_endpoint");
  });
});
