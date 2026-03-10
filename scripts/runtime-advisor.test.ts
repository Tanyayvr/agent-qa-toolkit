import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { estimateRuntimePlan, recommendRuntimeEnvelope } from "./runtime-advisor.mjs";

describe("runtime-advisor", () => {
  it("estimates a quick plan from history", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-plan-"));
    const outDir = path.join(root, "runs");
    const baselineRun = path.join(outDir, "baseline", "run-a");
    mkdirSync(baselineRun, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    writeFileSync(casesPath, JSON.stringify([{ id: "c1" }, { id: "c2" }], null, 2), "utf8");
    writeFileSync(
      path.join(baselineRun, "c1.json"),
      JSON.stringify({ runner_transport: { latency_ms: 100000 } }, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(baselineRun, "c2.json"),
      JSON.stringify({ runner_transport: { latency_ms: 120000 } }, null, 2),
      "utf8"
    );

    const plan = estimateRuntimePlan({
      mode: "quick",
      cases: casesPath,
      outDir,
      timeoutProfile: "auto",
      timeoutMs: 120000,
      timeoutAutoCapMs: 1900000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 1,
      timeoutAutoMaxIncreaseFactor: 3,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "generic",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 2,
    });

    expect(plan.estimate_source).toBe("history_candidate");
    expect(plan.selected_case_count).toBe(2);
    expect(plan.recommended_mode).toBe("quick");
    expect(plan.estimated_request_timeout_ms).toBeGreaterThan(120000);
  });

  it("recommends diagnostic mode for timeout-budget full failure on slow local cli", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-recommend-"));
    const outDir = path.join(root, "runs");
    const baselineRun = path.join(outDir, "baseline", "run-a");
    mkdirSync(baselineRun, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    const comparePath = path.join(root, "compare-report.json");
    writeFileSync(
      casesPath,
      JSON.stringify([{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }], null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(baselineRun, "c1.json"),
      JSON.stringify({ runner_transport: { latency_ms: 250000 } }, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(baselineRun, "c2.json"),
      JSON.stringify({ runner_transport: { latency_ms: 260000 } }, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(baselineRun, "c3.json"),
      JSON.stringify({ runner_transport: { latency_ms: 270000 } }, null, 2),
      "utf8"
    );
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
      outDir,
      timeoutProfile: "auto",
      timeoutMs: 120000,
      timeoutAutoCapMs: 1900000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 3,
      timeoutAutoMaxIncreaseFactor: 3,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "slow_local_cli",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 0,
    });

    expect(recommendation.reason).toBe("timeout_budget");
    expect(recommendation.suggested_envelope.mode).toBe("diagnostic");
    expect(recommendation.suggested_envelope.timeout_ms).toBeGreaterThan(360000);
    expect(recommendation.timed_out_case_ids).toEqual(["c4"]);
  });

  it("keeps full-lite as the recommended next path when runtime is elevated but not diagnostic", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-full-lite-"));
    const outDir = path.join(root, "runs");
    const baselineRun = path.join(outDir, "baseline", "run-a");
    mkdirSync(baselineRun, { recursive: true });
    const casesPath = path.join(root, "cases.json");
    writeFileSync(
      casesPath,
      JSON.stringify([{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }, { id: "c5" }], null, 2),
      "utf8"
    );
    for (const [id, latency] of [
      ["c1", 180000],
      ["c2", 210000],
      ["c3", 240000],
    ]) {
      writeFileSync(
        path.join(baselineRun, `${id}.json`),
        JSON.stringify({ runner_transport: { latency_ms: latency } }, null, 2),
        "utf8"
      );
    }

    const plan = estimateRuntimePlan({
      mode: "full-lite",
      cases: casesPath,
      outDir,
      timeoutProfile: "auto",
      timeoutMs: 180000,
      timeoutAutoCapMs: 3600000,
      timeoutAutoLookbackRuns: 12,
      timeoutAutoMinSuccessSamples: 1,
      timeoutAutoMaxIncreaseFactor: 4,
      sampleCount: 1,
      retries: 0,
      concurrency: 1,
      runtimeClass: "slow_local_cli",
      diagnosticThresholdMs: 90 * 60 * 1000,
      maxCases: 5,
    });

    expect(plan.recommended_mode).toBe("full-lite");
    expect(plan.estimated_request_timeout_ms).toBeGreaterThanOrEqual(180000);
  });
});
