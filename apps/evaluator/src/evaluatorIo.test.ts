import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FileTooLargeError,
  copyRunMetaJson,
  copyRawCaseJson,
  fileBytesForRel,
  fileExistsAbs,
  fileSha256ForRel,
  findUnredactedMarkersSafe,
  isAbsoluteOrBadHref,
  maybeCopyFailureAsset,
  normRel,
  readUtf8WithLimit,
  renderMissingCaseHtml,
  resolveFromRoot,
  safeBasename,
  sha256Hex,
} from "./evaluatorIo";

describe("evaluatorIo", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-evaluator-io-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("resolves and normalizes paths", () => {
    const abs = resolveFromRoot(root, "a/b/c.txt");
    expect(abs).toBe(path.join(root, "a", "b", "c.txt"));
    expect(resolveFromRoot(root, abs)).toBe(abs);

    expect(normRel(root, abs)).toBe("a/b/c.txt");
  });

  it("reads utf8 files with size guard", async () => {
    const okAbs = path.join(root, "ok.txt");
    await writeFile(okAbs, "hello", "utf-8");

    await expect(readUtf8WithLimit(okAbs, 32)).resolves.toBe("hello");
    await expect(readUtf8WithLimit(okAbs, 2)).rejects.toBeInstanceOf(FileTooLargeError);

    const dirAbs = path.join(root, "folder");
    await mkdir(dirAbs, { recursive: true });
    await expect(readUtf8WithLimit(dirAbs, 32)).rejects.toThrow("Not a file");
  });

  it("copies optional runner failure assets", async () => {
    const reportDir = path.join(root, "report");
    const srcAbs = path.join(root, "src", "failure.body.txt");
    await mkdir(path.dirname(srcAbs), { recursive: true });
    await writeFile(srcAbs, "failure-body", "utf-8");

    const copied = await maybeCopyFailureAsset({
      projectRoot: root,
      reportDir,
      caseId: "c1",
      version: "baseline",
      relOrAbsPath: srcAbs,
    });
    expect(copied).toMatch(/^assets\/runner_failure\/c1\/baseline\//);

    const copiedAbs = path.join(reportDir, copied as string);
    await expect(readFile(copiedAbs, "utf-8")).resolves.toBe("failure-body");

    await expect(
      maybeCopyFailureAsset({
        projectRoot: root,
        reportDir,
        caseId: "c1",
        version: "new",
        relOrAbsPath: "missing.txt",
      })
    ).resolves.toBeNull();
  });

  it("copies raw case and run meta assets", async () => {
    const reportDir = path.join(root, "report");
    const srcCase = path.join(root, "runs", "new", "c1.json");
    const srcRun = path.join(root, "runs", "new", "run.json");
    await mkdir(path.dirname(srcCase), { recursive: true });
    await writeFile(srcCase, '{"ok":true}', "utf-8");
    await writeFile(srcRun, '{"run":true}', "utf-8");

    const caseRel = await copyRawCaseJson({ reportDir, caseId: "c1", version: "new", srcAbs: srcCase });
    const runRel = await copyRunMetaJson({ reportDir, version: "new", srcAbs: srcRun });

    expect(caseRel).toBe("assets/raw/case_responses/c1/new.json");
    expect(runRel).toBe("assets/raw/run_meta/new.run.json");

    await expect(readFile(path.join(reportDir, caseRel as string), "utf-8")).resolves.toContain("ok");
    await expect(readFile(path.join(reportDir, runRel as string), "utf-8")).resolves.toContain("run");

    await expect(
      copyRawCaseJson({ reportDir, caseId: "c2", version: "baseline", srcAbs: path.join(root, "nope.json") })
    ).resolves.toBeNull();
    await expect(copyRunMetaJson({ reportDir, version: "baseline", srcAbs: path.join(root, "nope-run.json") })).resolves.toBeNull();
  });

  it("computes hashes and file stats by rel path", async () => {
    const reportDir = path.join(root, "report");
    const rel = "assets/sample.txt";
    const abs = path.join(reportDir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "sample", "utf-8");

    const digest = await fileSha256ForRel(reportDir, rel);
    expect(digest).toBe(sha256Hex(new TextEncoder().encode("sample")));
    await expect(fileBytesForRel(reportDir, rel)).resolves.toBe(6);

    await expect(fileSha256ForRel(reportDir, "missing.txt")).resolves.toBeUndefined();
    await expect(fileBytesForRel(reportDir, "missing.txt")).resolves.toBeUndefined();
    await expect(fileExistsAbs(abs)).resolves.toBe(true);
    await expect(fileExistsAbs(path.join(reportDir, "missing.txt"))).resolves.toBe(false);
  });

  it("validates href portability guard", () => {
    expect(isAbsoluteOrBadHref("http://example.com/x")).toBe(true);
    expect(isAbsoluteOrBadHref("https://example.com/x")).toBe(true);
    expect(isAbsoluteOrBadHref(path.join(root, "x"))).toBe(true);
    expect(isAbsoluteOrBadHref("..//x")).toBe(true);
    expect(isAbsoluteOrBadHref("\\\\server\\share\\x")).toBe(true);
    expect(isAbsoluteOrBadHref("assets/case.json")).toBe(false);
  });

  it("renders missing-case html and escaping helpers", () => {
    const html = renderMissingCaseHtml("<c1>", { baseline: true, new: false }, "note <unsafe>");
    expect(html).toContain("Replay diff · &lt;c1&gt;");
    expect(html).toContain("baseline response missing");
    expect(html).toContain("note &lt;unsafe&gt;");

    expect(safeBasename("../a b.txt")).toBe("a_b.txt");
    expect(safeBasename(".")).toBe("artifact.bin");
  });

  it("checks redaction markers only when preset is enabled", () => {
    expect(findUnredactedMarkersSafe("contact: ceo@example.com", undefined)).toEqual([]);
    expect(findUnredactedMarkersSafe("contact: ceo@example.com", null)).toEqual([]);
    expect(findUnredactedMarkersSafe("contact: ceo@example.com", "transferable")).toContain("email");
    expect(findUnredactedMarkersSafe("clean text", "internal_only")).toEqual([]);
  });
});
