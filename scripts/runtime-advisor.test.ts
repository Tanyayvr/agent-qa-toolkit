import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { estimateRuntimePlan, recommendRuntimeEnvelope } from "./runtime-advisor.mjs";

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

function writeRuntimeState(root: string, payload: {
  profileName: string;
  runtimeClass: string;
  mode: string;
  timeoutMs: number;
  timeoutAutoCapMs: number;
  timeoutAutoMaxIncreaseFactor: number;
}) {
  const runtimeStatePath = path.join(root, `${payload.profileName}.runtime-state.json`);
  writeFileSync(
    runtimeStatePath,
    JSON.stringify(
      {
        schema_version: 1,
        profile_name: payload.profileName,
        runtime_class: payload.runtimeClass,
        updated_at: new Date().toISOString(),
        modes: {
          [payload.mode]: {
            timeout_ms: payload.timeoutMs,
            timeout_auto_cap_ms: payload.timeoutAutoCapMs,
            timeout_auto_max_increase_factor: payload.timeoutAutoMaxIncreaseFactor,
            updated_at: new Date().toISOString(),
          },
        },
      },
      null,
      2
    ),
    "utf8"
  );
  return runtimeStatePath;
}

describe("runtime-advisor", () => {
  it("uses first-run class seed when there is no scoped history", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-plan-"));
    const reportsDir = path.join(root, "reports");
    mkdirSync(reportsDir, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    writeFileSync(casesPath, JSON.stringify([{ id: "c1" }, { id: "c2" }], null, 2), "utf8");

    const plan = estimateRuntimePlan({
      mode: "quick",
      cases: casesPath,
      outDir: path.join(root, "runs"),
      reportsDir,
      profileName: "agent-new",
      timeoutProfile: "auto",
      timeoutMs: 1800000,
      timeoutAutoCapMs: 21600000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 1,
      timeoutAutoMaxIncreaseFactor: 6,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "heavy_mcp_agent",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 2,
    });

    expect(plan.first_run).toBe(true);
    expect(plan.estimate_source).toBe("first_run_class_seed");
    expect(plan.recommended_first_run_minimum_ms).toBe(1800000);
    expect(plan.estimated_request_timeout_ms).toBe(1800000);
  });

  it("uses scoped learned history for repeat runs of the same profile and mode", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-learned-"));
    const reportsDir = path.join(root, "reports");
    mkdirSync(reportsDir, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    writeFileSync(casesPath, JSON.stringify([{ id: "c1" }, { id: "c2" }], null, 2), "utf8");

    writeReport(reportsDir, "agent-a-quick", {
      profileName: "agent-a",
      mode: "quick",
      runtimeClass: "slow_local_cli",
      passed: true,
      cases: [
        { id: "c1", baseline: 300000, newer: 310000 },
        { id: "c2", baseline: 320000, newer: 330000 },
      ],
    });
    writeReport(reportsDir, "other-profile", {
      profileName: "agent-b",
      mode: "quick",
      runtimeClass: "slow_local_cli",
      passed: true,
      cases: [
        { id: "c1", baseline: 900000, newer: 900000 },
        { id: "c2", baseline: 900000, newer: 900000 },
      ],
    });

    const plan = estimateRuntimePlan({
      mode: "quick",
      cases: casesPath,
      outDir: path.join(root, "runs"),
      reportsDir,
      profileName: "agent-a",
      timeoutProfile: "auto",
      timeoutMs: 900000,
      timeoutAutoCapMs: 21600000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 1,
      timeoutAutoMaxIncreaseFactor: 6,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "slow_local_cli",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 2,
    });

    expect(plan.first_run).toBe(false);
    expect(plan.matching_report_count).toBe(1);
    expect(plan.estimate_source).toBe("history_candidate");
    expect(plan.estimated_request_timeout_ms).toBeGreaterThan(900000);
  });

  it("auto-applies persisted runtime state before scoped success history exists", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-state-floor-"));
    const reportsDir = path.join(root, "reports");
    mkdirSync(reportsDir, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    writeFileSync(casesPath, JSON.stringify([{ id: "c1" }, { id: "c2" }], null, 2), "utf8");
    const runtimeStatePath = writeRuntimeState(root, {
      profileName: "agent-stateful",
      runtimeClass: "slow_local_cli",
      mode: "quick",
      timeoutMs: 1260000,
      timeoutAutoCapMs: 2400000,
      timeoutAutoMaxIncreaseFactor: 6,
    });

    const plan = estimateRuntimePlan({
      mode: "quick",
      cases: casesPath,
      outDir: path.join(root, "runs"),
      reportsDir,
      profileName: "agent-stateful",
      timeoutProfile: "auto",
      timeoutMs: 120000,
      timeoutAutoCapMs: 300000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 1,
      timeoutAutoMaxIncreaseFactor: 3,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "slow_local_cli",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 2,
      runtimeStatePath,
    });

    expect(plan.first_run).toBe(true);
    expect(plan.runtime_state_applied).toBe(true);
    expect(plan.estimate_source).toBe("first_run_runtime_state");
    expect(plan.estimated_request_timeout_ms).toBe(1260000);
    expect(plan.resolved_timeout_auto_cap_ms).toBe(2400000);
    expect(plan.resolved_timeout_auto_max_increase_factor).toBe(6);
  });

  it("keeps full mode for timeout-budget recommendation", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-recommend-"));
    const reportsDir = path.join(root, "reports");
    mkdirSync(reportsDir, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    const comparePath = path.join(root, "compare-report.json");
    writeFileSync(
      casesPath,
      JSON.stringify([{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }], null, 2),
      "utf8"
    );
    writeReport(reportsDir, "agent-a-full", {
      profileName: "agent-a",
      mode: "full",
      runtimeClass: "slow_local_cli",
      passed: true,
      cases: [
        { id: "c1", baseline: 250000, newer: 255000 },
        { id: "c2", baseline: 260000, newer: 265000 },
        { id: "c3", baseline: 270000, newer: 275000 },
        { id: "c4", baseline: 280000, newer: 285000 },
      ],
    });
    writeFileSync(
      comparePath,
      JSON.stringify({
        summary: { execution_quality: { status: "degraded" } },
        items: [
          {
            case_id: "c4",
            failure_summary: {
              baseline: {
                class: "timeout",
                timeout_ms: 360000,
                timeout_cause: "timeout_budget_too_small",
              },
            },
          },
        ],
      }),
      "utf8"
    );

    const recommendation = recommendRuntimeEnvelope({
      stage: "full",
      mode: "full",
      compare: comparePath,
      cases: casesPath,
      outDir: path.join(root, "runs"),
      reportsDir,
      profileName: "agent-a",
      timeoutProfile: "auto",
      timeoutMs: 120000,
      timeoutAutoCapMs: 1900000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 1,
      timeoutAutoMaxIncreaseFactor: 3,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "slow_local_cli",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 0,
    });

    expect(recommendation.reason).toBe("timeout_budget");
    expect(recommendation.suggested_envelope.mode).toBe("full");
    expect(recommendation.suggested_envelope.timeout_ms).toBeGreaterThan(360000);
    expect(recommendation.timed_out_case_ids).toEqual(["c4"]);
  });
});
