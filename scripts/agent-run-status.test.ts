import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { summarizeReportDir } from "./agent-run-status.mjs";

describe("agent-run-status", () => {
  it("summarizes stage result, execution quality and timeout causes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aq-agent-run-status-"));
    fs.writeFileSync(
      path.join(dir, "stage-result.json"),
      JSON.stringify({
        stage: "smoke",
        status: "failed",
        reason: "timeout_budget",
        next_action: "increase_timeout_or_run_calibration_then_retry",
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "devops-envelope.json"),
      JSON.stringify({
        profile: "infra",
        sample_count: 1,
        timeout_profile: "auto",
        timeout_ms: 120000,
        timeout_auto_cap_ms: 1900000,
        retries: 0,
        concurrency: 1,
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "compare-report.json"),
      JSON.stringify({
        summary: {
          execution_quality: {
            status: "degraded",
            reasons: ["baseline transport success 0.5 is below threshold 0.95"],
            baseline_transport_success_rate: 0.5,
            new_transport_success_rate: 1,
          },
        },
        items: [
          {
            failure_summary: {
              baseline: { timeout_cause: "timeout_budget_too_small" },
              new: { timeout_cause: "agent_stuck_or_loop" },
            },
          },
          {
            failure_summary: {
              baseline: { timeout_cause: "timeout_budget_too_small" },
            },
          },
        ],
      }),
      "utf8",
    );

    const summary = summarizeReportDir(dir);
    expect(summary.stage_result?.stage).toBe("smoke");
    expect(summary.execution_quality?.status).toBe("degraded");
    expect(summary.timeout_causes).toEqual({
      "baseline:timeout_budget_too_small": 2,
      "new:agent_stuck_or_loop": 1,
    });
    expect(summary.devops_envelope?.timeoutMs).toBe(120000);
  });
});
