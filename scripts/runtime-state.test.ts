import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  readRuntimeStateRecommendation,
  runtimeStatePathForProfile,
  writeRuntimeStateRecommendation,
} from "./runtime-state.mjs";

describe("runtime-state", () => {
  it("persists and reloads a mode recommendation in a generated state file", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "aq-runtime-state-"));
    const profilePath = path.join(root, "agent-a.env");
    const runtimeStatePath = runtimeStatePathForProfile(profilePath);

    const writtenPath = writeRuntimeStateRecommendation({
      runtimeStatePath,
      profileName: "agent-a",
      runtimeClass: "slow_local_cli",
      mode: "smoke",
      timeoutMs: 720000,
      timeoutAutoCapMs: 1800000,
      timeoutAutoMaxIncreaseFactor: 6,
      confidence: "medium",
      source: "compare_report",
      stage: "smoke",
      reason: "timeout_budget",
    });

    const recommendation = readRuntimeStateRecommendation(runtimeStatePath, "quick");

    expect(writtenPath).toBe(runtimeStatePath);
    expect(recommendation).toMatchObject({
      path: runtimeStatePath,
      mode: "quick",
      timeout_ms: 720000,
      timeout_auto_cap_ms: 1800000,
      timeout_auto_max_increase_factor: 6,
      confidence: "medium",
      source: "compare_report",
      stage: "smoke",
      reason: "timeout_budget",
    });
  });
});
