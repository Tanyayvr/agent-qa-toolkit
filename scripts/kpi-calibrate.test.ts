import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildCalibrationArtifact,
  extractKpiSample,
  formatExportCommand,
  parseCliArgs,
  runKpiCalibration,
} from "./kpi-calibrate.mjs";

const tmpDirs: string[] = [];

function mkTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aq-kpi-calibrate-test-"));
  tmpDirs.push(dir);
  return dir;
}

function writeCompareReport(
  reportsRoot: string,
  reportId: string,
  params: {
    status?: "healthy" | "degraded";
    entropy: number;
    blocked: number;
    reconTotal: number;
    reconPerBlock: number;
    riskBefore: number;
    riskAfter: number;
    modelMinutes?: number;
    baselineTransport?: number;
    newTransport?: number;
  }
) {
  const reportDir = path.join(reportsRoot, reportId);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "compare-report.json"),
    JSON.stringify(
      {
        report_id: reportId,
        summary: {
          execution_quality: {
            status: params.status ?? "healthy",
            baseline_transport_success_rate: params.baselineTransport ?? 1,
            new_transport_success_rate: params.newTransport ?? 1,
            admissibility_kpi: {
              risk_mass_before: params.riskBefore,
              risk_mass_after: params.riskAfter,
              pre_action_entropy_removed: params.entropy,
              blocked_cases: params.blocked,
              reconstruction_minutes_saved_total: params.reconTotal,
              reconstruction_minutes_saved_per_block: params.reconPerBlock,
              model: {
                minutes_per_removed_risk_unit: params.modelMinutes ?? 30,
              },
            },
          },
        },
      },
      null,
      2
    ),
    "utf8"
  );
  return reportDir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("kpi-calibrate", () => {
  it("parses CLI defaults", () => {
    const parsed = parseCliArgs(["node", "kpi-calibrate.mjs"]);
    expect(parsed.reportsRoot).toBe("apps/evaluator/reports");
    expect(parsed.last).toBe(30);
    expect(parsed.minReports).toBe(8);
    expect(parsed.qLower).toBe(0.25);
    expect(parsed.includeDegraded).toBe(false);
  });

  it("extracts KPI sample only from healthy by default", () => {
    const root = mkTmpDir();
    const healthy = writeCompareReport(root, "r1", {
      status: "healthy",
      entropy: 0.4,
      blocked: 1,
      reconTotal: 24,
      reconPerBlock: 24,
      riskBefore: 10,
      riskAfter: 6,
    });
    const degraded = writeCompareReport(root, "r2", {
      status: "degraded",
      entropy: 0.2,
      blocked: 0,
      reconTotal: 0,
      reconPerBlock: 0,
      riskBefore: 8,
      riskAfter: 8,
    });

    expect(extractKpiSample(healthy, false)?.report_id).toBe("r1");
    expect(extractKpiSample(degraded, false)).toBeNull();
    expect(extractKpiSample(degraded, true)?.report_id).toBe("r2");
  });

  it("builds calibration artifact and env recommendations", () => {
    const artifact = buildCalibrationArtifact({
      reportsRoot: "/tmp/reports",
      selectedReportDirs: ["/tmp/reports/r1", "/tmp/reports/r2"],
      samples: [
        {
          report_dir: "/tmp/reports/r1",
          report_id: "r1",
          status: "healthy",
          baseline_transport_success_rate: 1,
          new_transport_success_rate: 1,
          risk_mass_before: 10,
          risk_mass_after: 6,
          removed_risk_mass: 4,
          pre_action_entropy_removed: 0.4,
          blocked_cases: 1,
          reconstruction_minutes_saved_total: 24,
          reconstruction_minutes_saved_per_block: 24,
          model_minutes_per_removed_risk_unit: 30,
          observed_minutes_per_removed_risk_unit: 6,
        },
        {
          report_dir: "/tmp/reports/r2",
          report_id: "r2",
          status: "healthy",
          baseline_transport_success_rate: 0.99,
          new_transport_success_rate: 0.98,
          risk_mass_before: 12,
          risk_mass_after: 9,
          removed_risk_mass: 3,
          pre_action_entropy_removed: 0.25,
          blocked_cases: 1,
          reconstruction_minutes_saved_total: 18,
          reconstruction_minutes_saved_per_block: 18,
          model_minutes_per_removed_risk_unit: 30,
          observed_minutes_per_removed_risk_unit: 6,
        },
      ],
      minReports: 2,
      qLower: 0.25,
      includeDegraded: false,
      generatedAt: "2026-03-06T00:00:00.000Z",
    });

    expect(artifact.sample.kpi_reports_count).toBe(2);
    expect(artifact.recommended_env.AQ_RECON_MINUTES_PER_REMOVED_RISK_UNIT).toBe(6);
    expect(artifact.recommended_env.AQ_MIN_PRE_ACTION_ENTROPY_REMOVED).toBeGreaterThan(0);
    expect(formatExportCommand(artifact.recommended_env)).toContain("AQ_MIN_PRE_ACTION_ENTROPY_REMOVED=");
  });

  it("fails when samples are below threshold unless allowLowSample is set", async () => {
    const reportsRoot = mkTmpDir();
    writeCompareReport(reportsRoot, "r1", {
      entropy: 0.4,
      blocked: 1,
      reconTotal: 24,
      reconPerBlock: 24,
      riskBefore: 10,
      riskAfter: 6,
    });

    await expect(
      runKpiCalibration({
        reportsRoot,
        last: 10,
        minReports: 2,
        qLower: 0.25,
        includeDegraded: false,
        allowLowSample: false,
        out: path.join(reportsRoot, "out.json"),
        jsonMode: false,
        help: false,
      })
    ).rejects.toThrow(/not enough KPI-bearing reports/);

    const out = await runKpiCalibration({
      reportsRoot,
      last: 10,
      minReports: 2,
      qLower: 0.25,
      includeDegraded: false,
      allowLowSample: true,
      out: path.join(reportsRoot, "out-allow.json"),
      jsonMode: false,
      help: false,
    });

    expect(out.artifact.sample.kpi_reports_count).toBe(1);
    expect(out.artifact.warnings.length).toBeGreaterThan(0);
  });
});
