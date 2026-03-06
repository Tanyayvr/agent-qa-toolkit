import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkPluginReadmes,
  missingReadmeSections,
  parseCliArgs,
  runPluginsReleaseReadiness,
} from "./plugins-release-readiness.mjs";

const tmpDirs: string[] = [];

function mkTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aq-plugins-readiness-test-"));
  tmpDirs.push(dir);
  return dir;
}

function writeReadme(absPath: string, sections: string[]) {
  const content = sections.map((section) => `## ${section}\n\nok`).join("\n\n");
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${content}\n`, "utf8");
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("plugins-release-readiness", () => {
  it("parses CLI defaults", () => {
    const parsed = parseCliArgs(["node", "plugins-release-readiness.mjs"]);
    expect(parsed.outPath).toBe("apps/evaluator/reports/plugins-release-readiness.json");
    expect(parsed.runTypecheck).toBe(true);
    expect(parsed.runTests).toBe(true);
    expect(parsed.runReadmeCheck).toBe(true);
  });

  it("detects missing required sections", () => {
    const missing = missingReadmeSections("## Usage\n\nx\n## Security\n\ny\n");
    expect(missing).toEqual(["Reliability", "Limitations"]);
  });

  it("checks README files using custom root directory", () => {
    const rootDir = mkTmpDir();
    writeReadme(path.join(rootDir, "plugins/a/README.md"), ["Usage", "Reliability", "Security", "Limitations"]);
    writeReadme(path.join(rootDir, "plugins/b/README.md"), ["Usage", "Security"]);

    const failures = checkPluginReadmes(
      [
        { workspace: "a", readme: "plugins/a/README.md" },
        { workspace: "b", readme: "plugins/b/README.md" },
      ],
      rootDir
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.workspace).toBe("b");
    expect(failures[0]?.missing).toEqual(["Reliability", "Limitations"]);
  });

  it("writes artifact and passes when README checks are complete", async () => {
    const rootDir = mkTmpDir();
    const outPath = path.join(rootDir, "out.json");
    writeReadme(path.join(rootDir, "plugins/a/README.md"), ["Usage", "Reliability", "Security", "Limitations"]);

    const result = await runPluginsReleaseReadiness({
      rootDir,
      outPath,
      plugins: [{ workspace: "a", readme: "plugins/a/README.md", testFile: "unused.test.ts" }],
      runTypecheck: false,
      runTests: false,
      runReadmeCheck: true,
    });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(outPath)).toBe(true);
    const artifact = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(artifact.ok).toBe(true);
    expect(artifact.plugins).toEqual(["a"]);
    expect(artifact.readme_failures).toEqual([]);
  });

  it("fails when required README sections are missing", async () => {
    const rootDir = mkTmpDir();
    const outPath = path.join(rootDir, "out.json");
    writeReadme(path.join(rootDir, "plugins/a/README.md"), ["Usage", "Security"]);

    await expect(
      runPluginsReleaseReadiness({
        rootDir,
        outPath,
        plugins: [{ workspace: "a", readme: "plugins/a/README.md", testFile: "unused.test.ts" }],
        runTypecheck: false,
        runTests: false,
        runReadmeCheck: true,
      })
    ).rejects.toThrow(/plugin README readiness check failed/);

    const artifact = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(artifact.ok).toBe(false);
    expect(artifact.readme_failures[0]?.workspace).toBe("a");
  });
});
