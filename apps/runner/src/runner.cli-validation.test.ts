import { afterEach, describe, expect, it, vi } from "vitest";

type RunnerModule = {
  runRunner: () => Promise<void>;
};

async function loadRunnerWithArgv(argv: string[]): Promise<RunnerModule> {
  vi.resetModules();
  process.argv = argv;
  return await import("./runner");
}

describe("runner cli validation", () => {
  const savedArgv = [...process.argv];

  afterEach(() => {
    process.argv = [...savedArgv];
  });

  it("fails on unknown option", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--unknownOption"]);
    await expect(mod.runRunner()).rejects.toMatchObject({ name: "CliUsageError" });
  });

  it("fails when --cases has missing value", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--cases"]);
    await expect(mod.runRunner()).rejects.toThrow("Missing value for --cases");
  });

  it("fails on invalid --timeoutProfile", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--timeoutProfile", "smart"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --timeoutProfile value");
  });

  it("fails on invalid --preflightMode", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--preflightMode", "aggressive"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --preflightMode value");
  });

  it("fails when --timeoutMs <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--timeoutMs", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --timeoutMs value");
  });

  it("fails when --retries < 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--retries", "-1"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --retries value");
  });

  it("fails when --concurrency <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--concurrency", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --concurrency value");
  });

  it("fails when --preflightTimeoutMs <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--preflightTimeoutMs", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --preflightTimeoutMs value");
  });

  it("fails when --heartbeatIntervalMs <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--heartbeatIntervalMs", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --heartbeatIntervalMs value");
  });

  it("fails when --timeoutAutoCapMs <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--timeoutAutoCapMs", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --timeoutAutoCapMs value");
  });

  it("fails when --timeoutAutoLookbackRuns <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--timeoutAutoLookbackRuns", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --timeoutAutoLookbackRuns value");
  });

  it("fails when --bodySnippetBytes < 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--bodySnippetBytes", "-1"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --bodySnippetBytes value");
  });

  it("fails when --maxBodyBytes <= 0", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--maxBodyBytes", "0"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --maxBodyBytes value");
  });

  it("fails on invalid --redactionPreset", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--redactionPreset", "public"]);
    await expect(mod.runRunner()).rejects.toThrow("Invalid --redactionPreset value");
  });

  it("returns successfully for --help", async () => {
    const mod = await loadRunnerWithArgv(["node", "runner", "--help"]);
    await expect(mod.runRunner()).resolves.toBeUndefined();
  });
});
