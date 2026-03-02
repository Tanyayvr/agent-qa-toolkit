import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractErrorCode,
  fetchWithTimeout,
  formatFetchFailure,
  shouldPreferNodeHttpTransport,
  shouldUseNodeHttpFallback,
} from "./httpTransport";

describe("httpTransport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decides when node http transport should be preferred", () => {
    expect(shouldPreferNodeHttpTransport("http://127.0.0.1:8788", 300_000)).toBe(true);
    expect(shouldPreferNodeHttpTransport("https://example.com", 100_000)).toBe(false);
    expect(shouldPreferNodeHttpTransport("file:///tmp/x", 500_000)).toBe(false);
  });

  it("extracts error code from error and cause", () => {
    const direct = Object.assign(new Error("x"), { code: "UND_ERR" });
    const fromCause = Object.assign(new Error("y"), { cause: { code: "ECONNREFUSED" } });
    expect(extractErrorCode(direct)).toBe("UND_ERR");
    expect(extractErrorCode(fromCause)).toBe("ECONNREFUSED");
    expect(extractErrorCode("bad")).toBeNull();
  });

  it("detects fetch fallback patterns", () => {
    const abort = new Error("This operation was aborted");
    abort.name = "AbortError";
    const fetchFailed = new Error("fetch failed");
    const headersTimeout = Object.assign(new Error("x"), { cause: { code: "UND_ERR_HEADERS_TIMEOUT" } });

    expect(shouldUseNodeHttpFallback(fetchFailed, "http://127.0.0.1:8788")).toBe(true);
    expect(shouldUseNodeHttpFallback(headersTimeout, "http://127.0.0.1:8788")).toBe(true);
    expect(shouldUseNodeHttpFallback(abort, "http://127.0.0.1:8788")).toBe(false);
    expect(shouldUseNodeHttpFallback(fetchFailed, "file:///tmp/x")).toBe(false);
  });

  it("formats fetch failure with cause metadata", () => {
    const err = Object.assign(new Error("connect failed"), {
      cause: { code: "ECONNREFUSED", syscall: "connect", address: "127.0.0.1", port: 8788 },
    });
    const out = formatFetchFailure(err);
    expect(out).toContain("connect failed");
    expect(out).toContain("code=ECONNREFUSED");
    expect(out).toContain("syscall=connect");
    expect(out).toContain("address=127.0.0.1");
    expect(out).toContain("port=8788");
  });

  it("returns fetch response for short timeouts", async () => {
    const resp = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(resp);
    const response = await fetchWithTimeout("http://example.com/run-case", { method: "GET" }, 1500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it("uses node:http fallback after transient fetch failure", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("fetch failed"));
    await expect(
      fetchWithTimeout(
        "http://example.com/run-case",
        { method: "POST", body: { bad: true } as unknown as string },
        1500
      )
    ).rejects.toThrow("Unsupported request body type");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported body types for node:http direct path", async () => {
    await expect(
      fetchWithTimeout(
        "http://example.com/run-case",
        { method: "POST", body: { bad: true } as unknown as string },
        300_000
      )
    ).rejects.toThrow("Unsupported request body type");
  });

  it("does not fallback for abort errors from fetch", async () => {
    const abort = new Error("This operation was aborted");
    abort.name = "AbortError";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abort);
    await expect(fetchWithTimeout("http://example.com/run-case", { method: "GET" }, 1500)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
