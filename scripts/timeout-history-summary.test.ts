import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { summarizeTimeoutHistory } from "./timeout-history-summary.mjs";

function writeReport(root: string, name: string, payload: {
  profileName: string;
  mode: string;
  runtimeClass: string;
  passed: boolean;
  cases: Array<{ id: string; baseline?: number; baselineFailure?: number; newer?: number; newerFailure?: number }>;
}) {
  const reportDir = path.join(root, name);
  mkdirSync(path.join(reportDir, "assets", "raw", "case_responses"), { recursive: true });
  writeFileSync(
    path.join(reportDir, "devops-envelope.json"),
    JSON.stringify({
      run_mode: payload.mode,
      runtime_class: payload.runtimeClass,
      profile_name: payload.profileName,
    }),
    "utf8"
  );
  writeFileSync(
    path.join(reportDir, "stage-result.json"),
    JSON.stringify({ status: payload.passed ? "passed" : "failed" }),
    "utf8"
  );
  writeFileSync(
    path.join(reportDir, "compare-report.json"),
    JSON.stringify({ items: payload.cases.map((item) => ({ case_id: item.id })) }),
    "utf8"
  );

  for (const item of payload.cases) {
    const caseDir = path.join(reportDir, "assets", "raw", "case_responses", item.id);
    mkdirSync(caseDir, { recursive: true });
    writeFileSync(
      path.join(caseDir, "baseline.json"),
      JSON.stringify(
        item.baselineFailure
          ? { runner_failure: { latency_ms: item.baselineFailure } }
          : { runner_transport: { latency_ms: item.baseline ?? 1000 } }
      ),
      "utf8"
    );
    writeFileSync(
      path.join(caseDir, "new.json"),
      JSON.stringify(
        item.newerFailure
          ? { runner_failure: { latency_ms: item.newerFailure } }
          : { runner_transport: { latency_ms: item.newer ?? 1000 } }
      ),
      "utf8"
    );
  }
}

describe("timeout-history-summary", () => {
  it("scopes learned history to profile + mode + case signature and exposes first-run state", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-timeout-history-"));
    const reportsDir = path.join(root, "reports");
    mkdirSync(reportsDir, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    writeFileSync(casesPath, JSON.stringify([{ id: "c1" }, { id: "c2" }]), "utf8");

    writeReport(reportsDir, "match-pass", {
      profileName: "agent-a",
      mode: "quick",
      runtimeClass: "slow_local_cli",
      passed: true,
      cases: [
        { id: "c1", baseline: 111, newer: 112 },
        { id: "c2", baselineFailure: 222, newer: 223 },
      ],
    });
    writeReport(reportsDir, "other-profile", {
      profileName: "agent-b",
      mode: "quick",
      runtimeClass: "slow_local_cli",
      passed: true,
      cases: [
        { id: "c1", baseline: 999, newer: 999 },
        { id: "c2", baseline: 999, newer: 999 },
      ],
    });

    const summary = summarizeTimeoutHistory({
      reportsDir,
      cases: casesPath,
      profileName: "agent-a",
      mode: "quick",
      runtimeClass: "slow_local_cli",
      lookbackRuns: 12,
      minSuccessSamples: 1,
    });

    expect(summary.first_run).toBe(false);
    expect(summary.matching_report_count).toBe(1);
    expect(summary.matching_passed_report_count).toBe(1);
    expect(summary.success_sample_count).toBe(3);
    expect(summary.failure_sample_count).toBe(1);
    expect(summary.class_report_count).toBe(2);
    expect(summary.class_recommended_timeout_ms).toBeGreaterThan(0);
  });
});
