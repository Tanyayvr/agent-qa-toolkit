import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunnerConfig } from "./runnerTypes";
import { readBodySnippet, saveBodyStreamed, snippetFromBytes, toRel } from "./runnerArtifacts";

function mkCfg(root: string): RunnerConfig {
  return {
    repoRoot: root,
    baseUrl: "http://127.0.0.1:8788",
    casesPath: "cases/cases.json",
    outDir: path.join(root, "runs"),
    runId: "r1",
    incidentId: "i1",
    onlyCaseIds: null,
    dryRun: false,
    redactionPreset: "none",
    keepRaw: false,
    timeoutMs: 1_000,
    timeoutProfile: "off",
    timeoutAutoCapMs: 60_000,
    timeoutAutoLookbackRuns: 5,
    retries: 0,
    backoffBaseMs: 100,
    concurrency: 1,
    inactivityTimeoutMs: 5_000,
    heartbeatIntervalMs: 1_000,
    preflightMode: "off",
    preflightTimeoutMs: 2_000,
    failFastTransportStreak: 0,
    bodySnippetBytes: 32,
    maxBodyBytes: 128,
    saveFullBodyOnError: true,
    retentionDays: 0,
    runs: 1,
  };
}

describe("runnerArtifacts", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aq-runner-artifacts-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("builds portable relative paths", async () => {
    const nested = path.join(root, "a", "b", "c.txt");
    await mkdir(path.dirname(nested), { recursive: true });
    await writeFile(nested, "ok", "utf-8");

    expect(toRel(root, nested)).toBe("a/b/c.txt");
    expect(toRel(nested, nested)).toBe("c.txt");
  });

  it("creates UTF-8 snippets with max byte guard", () => {
    const bytes = new TextEncoder().encode("hello world");
    expect(snippetFromBytes(bytes, 0)).toBe("");
    expect(snippetFromBytes(bytes, 5)).toBe("hello");
    expect(snippetFromBytes(bytes, 100)).toBe("hello world");
  });

  it("reads body snippets from response streams", async () => {
    const response = new Response("abcdef", { status: 500 });
    await expect(readBodySnippet(response, 3)).resolves.toBe("abc");
    await expect(readBodySnippet(new Response(null), 32)).resolves.toBe("");
    await expect(readBodySnippet(new Response("anything"), 0)).resolves.toBe("");
  });

  it("cancels stream when snippet is truncated", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("012345"));
        controller.enqueue(new TextEncoder().encode("6789"));
      },
      cancel() {
        cancelled = true;
      },
    });

    const response = new Response(stream, { status: 500 });
    const snippet = await readBodySnippet(response, 4);

    expect(snippet).toBe("0123");
    expect(cancelled).toBe(true);
  });

  it("saves empty file+meta when response body is null", async () => {
    const cfg = mkCfg(root);
    const saved = await saveBodyStreamed(cfg, "c1", "new", 1, new Response(null, { status: 500 }));

    expect(saved.truncated).toBe(false);
    expect(saved.bytes_written).toBe(0);
    expect(saved.snippet).toBe("");

    const bodyAbs = path.resolve(root, saved.bodyRel as string);
    const metaAbs = path.resolve(root, saved.metaRel as string);
    const body = await readFile(bodyAbs);
    const meta = JSON.parse(await readFile(metaAbs, "utf-8")) as { note?: string; bytes_written: number };

    expect(body.byteLength).toBe(0);
    expect(meta.bytes_written).toBe(0);
    expect(meta.note).toBe("response.body is null");
  });

  it("streams body to disk with truncation metadata", async () => {
    const cfg = mkCfg(root);
    cfg.maxBodyBytes = 5;
    cfg.bodySnippetBytes = 4;

    const response = new Response("abcdefghij", { status: 500, headers: { "content-type": "text/plain" } });
    const saved = await saveBodyStreamed(cfg, "c2", "baseline", 2, response);

    expect(saved.truncated).toBe(true);
    expect(saved.bytes_written).toBe(5);
    expect(saved.snippet).toBe("abcd");

    const bodyAbs = path.resolve(root, saved.bodyRel as string);
    const body = await readFile(bodyAbs, "utf-8");
    expect(body).toBe("abcde");

    const metaAbs = path.resolve(root, saved.metaRel as string);
    const meta = JSON.parse(await readFile(metaAbs, "utf-8")) as {
      truncated: boolean;
      bytes_written: number;
      content_type: string | null;
    };
    expect(meta.truncated).toBe(true);
    expect(meta.bytes_written).toBe(5);
    expect(meta.content_type).toBe("text/plain");
  });

  it("streams full body when under max bytes", async () => {
    const cfg = mkCfg(root);
    cfg.maxBodyBytes = 64;
    cfg.bodySnippetBytes = 64;

    const response = new Response("small", { status: 500 });
    const saved = await saveBodyStreamed(cfg, "c3", "new", 1, response);

    expect(saved.truncated).toBe(false);
    expect(saved.bytes_written).toBe(5);
    expect(saved.snippet).toBe("small");

    const bodyAbs = path.resolve(root, saved.bodyRel as string);
    const body = await readFile(bodyAbs, "utf-8");
    expect(body).toBe("small");
  });
});
