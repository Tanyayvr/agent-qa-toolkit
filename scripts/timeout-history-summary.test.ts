import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { summarizeTimeoutHistory } from "./timeout-history-summary.mjs";

describe("timeout-history-summary", () => {
  it("counts success and failure samples for selected cases", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-timeout-history-"));
    const outDir = path.join(root, "runs");
    const baselineRun = path.join(outDir, "baseline", "run-a");
    const newRun = path.join(outDir, "new", "run-b");
    mkdirSync(baselineRun, { recursive: true });
    mkdirSync(newRun, { recursive: true });

    const casesPath = path.join(root, "cases.json");
    writeFileSync(
      casesPath,
      JSON.stringify([{ id: "c1" }, { id: "c2" }], null, 2)
    );

    writeFileSync(
      path.join(baselineRun, "c1.json"),
      JSON.stringify({ runner_transport: { latency_ms: 111 } }, null, 2)
    );
    writeFileSync(
      path.join(newRun, "c2.json"),
      JSON.stringify({ runner_failure: { latency_ms: 222 } }, null, 2)
    );
    writeFileSync(
      path.join(newRun, "other.json"),
      JSON.stringify({ runner_transport: { latency_ms: 333 } }, null, 2)
    );

    const summary = summarizeTimeoutHistory({
      outDir,
      cases: casesPath,
      lookbackRuns: 12,
    });

    expect(summary.selected_case_count).toBe(2);
    expect(summary.success_sample_count).toBe(1);
    expect(summary.failure_sample_count).toBe(1);
    expect(summary.history_sample_count).toBe(2);
  });
});
