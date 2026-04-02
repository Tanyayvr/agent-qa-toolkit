import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const STARTER_SCRIPT = path.join(REPO_ROOT, "scripts", "eu-ai-act-starter.sh");

const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aq-eu-starter-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("eu-ai-act-starter", () => {
  it("shows the draft attachment plan in dry-run mode", () => {
    const root = makeTempRoot();
    const draftJson = path.join(root, "eu-ai-act-legal-draft.json");
    writeFileSync(
      draftJson,
      `${JSON.stringify({ artifact_type: "eu_ai_act_legal_draft", sections: [] }, null, 2)}\n`,
      "utf8"
    );

    const result = spawnSync(
      "bash",
      [
        STARTER_SCRIPT,
        "--baseUrl",
        "http://localhost:8787",
        "--systemType",
        "fraud",
        "--profile",
        "my-agent",
        "--draftJson",
        draftJson,
        "--dry-run",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("builderDraft=");
    expect(result.stdout).toContain("copy ");
    expect(result.stdout).toContain("supplemental/builder-draft.json");
  });
});
