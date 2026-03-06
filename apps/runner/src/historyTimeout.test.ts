import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectTimeoutHistorySamples,
  percentile,
  summarizeHistoryCandidate,
} from "./historyTimeout";

describe("historyTimeout helpers", () => {
  it("percentile and summarizeHistoryCandidate compute p95-based recommendations", () => {
    expect(percentile([], 0.95)).toBeUndefined();
    expect(percentile([10, 20, 30, 40, 50], 0.95)).toBe(50);
    expect(summarizeHistoryCandidate([100_000, 110_000, 120_000], [300_000], { minSuccessSamples: 3 })).toBe(198_000);
    expect(summarizeHistoryCandidate([100_000, 110_000], [300_000], { minSuccessSamples: 3 })).toBeUndefined();
    expect(summarizeHistoryCandidate([], [300_000, 330_000], { minSuccessSamples: 1 })).toBeUndefined();
  });

  it("collectTimeoutHistorySamples reads baseline/new run history and ignores current run", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "timeout-history-"));
    const baselineRoot = path.join(root, "baseline");
    const newRoot = path.join(root, "new");
    mkdirSync(path.join(baselineRoot, "old-run"), { recursive: true });
    mkdirSync(path.join(newRoot, "old-run"), { recursive: true });
    mkdirSync(path.join(baselineRoot, "current-run"), { recursive: true });

    writeFileSync(
      path.join(baselineRoot, "old-run", "c1.json"),
      JSON.stringify({ runner_transport: { latency_ms: 1234 } }),
      "utf-8"
    );
    writeFileSync(
      path.join(newRoot, "old-run", "c1.run2.json"),
      JSON.stringify({ runner_failure: { latency_ms: 4321 } }),
      "utf-8"
    );
    writeFileSync(path.join(newRoot, "old-run", "c1.bad.json"), "{bad", "utf-8");
    writeFileSync(
      path.join(baselineRoot, "current-run", "c1.json"),
      JSON.stringify({ runner_transport: { latency_ms: 9999 } }),
      "utf-8"
    );

    const samples = await collectTimeoutHistorySamples(root, ["c1"], 10, "current-run");
    expect(samples.successLatenciesMs).toEqual([1234]);
    expect(samples.failureLatenciesMs).toEqual([4321]);
  });
});
