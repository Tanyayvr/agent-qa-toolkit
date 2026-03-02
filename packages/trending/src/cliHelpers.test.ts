import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseDate, resolveDbPath } from "./cliHelpers";

describe("trending cliHelpers", () => {
  const envSnapshot = {
    AGENT_QA_TREND_DB: process.env.AGENT_QA_TREND_DB,
    INIT_CWD: process.env.INIT_CWD,
  };
  let tempRoot = "";

  afterEach(async () => {
    process.env.AGENT_QA_TREND_DB = envSnapshot.AGENT_QA_TREND_DB;
    process.env.INIT_CWD = envSnapshot.INIT_CWD;
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("parses YYYY-MM-DD bounds", () => {
    const start = parseDate("2026-02-27", false);
    const end = parseDate("2026-02-27", true);
    expect(end).toBeGreaterThan(start);
    expect(end - start).toBeGreaterThanOrEqual(86_399_000);
  });

  it("throws on invalid date format", () => {
    expect(() => parseDate("27-02-2026", false)).toThrow("Invalid date");
  });

  it("prefers explicit db path over env/project defaults", () => {
    const explicit = resolveDbPath("./tmp/my-trend.sqlite");
    expect(explicit.endsWith("tmp/my-trend.sqlite")).toBe(true);
  });

  it("uses AGENT_QA_TREND_DB when provided", () => {
    process.env.AGENT_QA_TREND_DB = "./tmp/env-trend.sqlite";
    const resolved = resolveDbPath();
    expect(resolved.endsWith("tmp/env-trend.sqlite")).toBe(true);
  });

  it("uses project .agent-qa path when writable", async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), "trend-cli-"));
    process.env.AGENT_QA_TREND_DB = "";
    process.env.INIT_CWD = tempRoot;

    const resolved = resolveDbPath();
    expect(resolved).toBe(path.resolve(tempRoot, ".agent-qa", "trend.sqlite"));
  });
});
