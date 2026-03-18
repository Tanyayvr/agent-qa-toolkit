import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const CONTRACT_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-contract-check.mjs");

describe("eu-ai-act contract check", () => {
  it("matches the committed golden snapshot", () => {
    const result = spawnSync(process.execPath, [CONTRACT_SCRIPT], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("EU AI Act contract check: PASS");
  }, 45_000);
});
