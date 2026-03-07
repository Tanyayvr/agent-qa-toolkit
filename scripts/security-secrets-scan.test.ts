import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cliMain, parseCliArgs, scanForSecrets } from "./security-secrets-scan.mjs";

const tmpDirs: string[] = [];

function mkTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aq-secrets-scan-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("security-secrets-scan", () => {
  it("parses defaults", () => {
    const parsed = parseCliArgs(["node", "security-secrets-scan.mjs"]);
    expect(parsed.root).toBe(process.cwd());
    expect(parsed.maxFileBytes).toBe(1_000_000);
    expect(parsed.includeTests).toBe(false);
    expect(parsed.excludeDirs.has("node_modules")).toBe(true);
  });

  it("parses includeTests flag", () => {
    const parsed = parseCliArgs(["node", "security-secrets-scan.mjs", "--includeTests"]);
    expect(parsed.includeTests).toBe(true);
  });

  it("finds high-confidence secret markers in text files", () => {
    const root = mkTmpDir();
    fs.writeFileSync(path.join(root, "safe.txt"), "hello world");
    fs.writeFileSync(path.join(root, "leak.txt"), "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890");
    const out = scanForSecrets({
      root,
      maxFileBytes: 1_000_000,
      excludeDirs: new Set<string>(),
    });
    expect(out.findings.length).toBeGreaterThan(0);
    expect(out.findings[0]?.rule).toBe("openai_api_key");
  });

  it("returns success code from cliMain when no findings exist", () => {
    const root = mkTmpDir();
    fs.writeFileSync(path.join(root, "readme.md"), "# test");
    const code = cliMain(["node", "security-secrets-scan.mjs", "--root", root]);
    expect(code).toBe(0);
  });

  it("returns failure code from cliMain when findings exist", () => {
    const root = mkTmpDir();
    fs.writeFileSync(path.join(root, "secret.env"), "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890");
    const code = cliMain(["node", "security-secrets-scan.mjs", "--root", root]);
    expect(code).toBe(1);
  });
});
