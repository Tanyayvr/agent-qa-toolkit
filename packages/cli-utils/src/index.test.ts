import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CliUsageError,
  InterruptedRunError,
  emitStructuredLog,
  makeArgvHelpers,
  makeCliUsageGuards,
  normalizeArgv,
  writeJsonAtomic,
} from "./index";

let tempRoot = "";

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

describe("cli-utils", () => {
  it("normalizes --flag=value arguments", () => {
    expect(normalizeArgv(["node", "cmd", "--cases=cases.json", "--runId=test"])).toEqual([
      "node",
      "cmd",
      "--cases",
      "cases.json",
      "--runId",
      "test",
    ]);
  });

  it("suggests missing delimiter for concatenated option values", () => {
    const { assertNoUnknownOptions } = makeArgvHelpers([
      "node",
      "runner",
      "--timeoutMs210000",
    ]);
    expect(() =>
      assertNoUnknownOptions(
        new Set([
          "--timeoutMs",
          "--cases",
          "--outDir",
        ]),
        "HELP"
      )
    ).toThrow('Did you mean "--timeoutMs 210000"');
  });

  it("wraps parser failures into CliUsageError", () => {
    const guards = makeCliUsageGuards("HELP", {
      assertNoUnknownOptions: () => {
        throw new Error("unknown");
      },
      assertHasValue: () => {
        throw new Error("missing");
      },
      parseIntFlag: () => {
        throw new Error("bad int");
      },
    });

    expect(() => guards.assertNoUnknownOptionsOrThrow(new Set(["--known"]))).toThrow(CliUsageError);
    expect(() => guards.assertHasValueOrThrow("--cases")).toThrow(CliUsageError);
    expect(() => guards.parseIntFlagOrThrow("--timeoutMs", 1000)).toThrow(CliUsageError);
  });

  it("emits structured log when enabled", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      emitStructuredLog("runner", "info", "start", { run_id: "r1" }, true);
      expect(spy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(String(spy.mock.calls[0]?.[0] ?? "{}")) as Record<string, unknown>;
      expect(payload.component).toBe("runner");
      expect(payload.level).toBe("info");
      expect(payload.event).toBe("start");
      expect(payload.run_id).toBe("r1");
      expect(typeof payload.ts).toBe("number");
    } finally {
      spy.mockRestore();
    }
  });

  it("writes JSON atomically and creates parent directory", async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), "cli-utils-"));
    const out = path.join(tempRoot, "nested", "file.json");
    await writeJsonAtomic(out, { ok: true, n: 1 });
    const raw = await readFile(out, "utf-8");
    expect(JSON.parse(raw)).toEqual({ ok: true, n: 1 });
  });

  it("creates interrupted run error with deterministic exit code", () => {
    const sigint = new InterruptedRunError("Runner", "SIGINT");
    const sigterm = new InterruptedRunError("Evaluator", "SIGTERM");
    expect(sigint.exitCode).toBe(130);
    expect(sigterm.exitCode).toBe(143);
    expect(sigint.message).toContain("Runner interrupted by SIGINT");
  });
});
