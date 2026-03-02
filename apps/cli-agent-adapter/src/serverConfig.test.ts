import { describe, expect, it } from "vitest";
import { resolveServerTimeoutConfig } from "./serverConfig";

describe("server timeout config", () => {
  it("derives request timeout from CLI timeout plus buffer", () => {
    const cfg = resolveServerTimeoutConfig({
      CLI_AGENT_TIMEOUT_MS: "1800000",
      CLI_AGENT_TIMEOUT_CAP_MS: "1800000",
    });

    expect(cfg).toMatchObject({
      cliTimeoutMs: 1_800_000,
      timeoutBufferMs: 120_000,
      requestTimeoutMs: 1_920_000,
      headersTimeoutMs: 1_921_000,
      keepAliveTimeoutMs: 5_000,
    });
  });

  it("supports explicit request timeout disable (0) with independent headers timeout", () => {
    const cfg = resolveServerTimeoutConfig({
      CLI_AGENT_TIMEOUT_MS: "120000",
      CLI_AGENT_TIMEOUT_CAP_MS: "120000",
      CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS: "0",
    });

    expect(cfg.requestTimeoutMs).toBe(0);
    expect(cfg.headersTimeoutMs).toBe(60_000);
  });

  it("enforces headers timeout to be above request timeout for active request timeout mode", () => {
    const cfg = resolveServerTimeoutConfig({
      CLI_AGENT_TIMEOUT_MS: "120000",
      CLI_AGENT_TIMEOUT_CAP_MS: "120000",
      CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS: "200000",
      CLI_AGENT_SERVER_HEADERS_TIMEOUT_MS: "1000",
    });

    expect(cfg.requestTimeoutMs).toBe(200_000);
    expect(cfg.headersTimeoutMs).toBe(201_000);
  });
});
