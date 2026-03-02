import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cliMain,
  findMatchingReceipt,
  parseCliArgs,
  requestWithRetries,
  renderCliMessages,
  requestJson,
  runRuntimeHandoffProof,
  validateEndpointResponses
} from "./proof-runtime-handoff.mjs";

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("proof-runtime-handoff helpers", () => {
  it("parses CLI args with defaults", () => {
    const opts = parseCliArgs(["node", "proof-runtime-handoff.mjs"]);
    expect(opts.baseUrl).toBe("http://127.0.0.1:8788");
    expect(opts.mode).toBe("endpoint");
    expect(opts.fromAgent).toBe("planner");
    expect(opts.toAgent).toBe("executor");
    expect(opts.runCaseTimeoutMs).toBe(30000);
    expect(opts.healthRetries).toBe(3);
    expect(opts.healthRetryBackoffMs).toBe(500);
  });

  it("parses CLI args with explicit values", () => {
    const opts = parseCliArgs([
      "node",
      "proof-runtime-handoff.mjs",
      "--baseUrl",
      "http://127.0.0.1:8788/",
      "--incidentId",
      "inc-x",
      "--handoffId",
      "h-x",
      "--fromAgent",
      "p",
      "--toAgent",
      "e",
      "--mode",
      "e2e",
      "--runCaseTimeoutMs",
      "7777",
      "--healthRetries",
      "5",
      "--healthRetryBackoffMs",
      "250",
      "--json",
    ]);
    expect(opts.baseUrl).toBe("http://127.0.0.1:8788");
    expect(opts.incidentId).toBe("inc-x");
    expect(opts.handoffId).toBe("h-x");
    expect(opts.fromAgent).toBe("p");
    expect(opts.toAgent).toBe("e");
    expect(opts.mode).toBe("e2e");
    expect(opts.runCaseTimeoutMs).toBe(7777);
    expect(opts.healthRetries).toBe(5);
    expect(opts.healthRetryBackoffMs).toBe(250);
    expect(opts.jsonMode).toBe(true);
  });

  it("validates healthy endpoint + idempotent upserts", () => {
    const result = validateEndpointResponses(
      { ok: true, status: 200, json: { ok: true } },
      { status: 201, json: { ok: true } },
      { status: 200, json: { ok: true } }
    );
    expect(result).toEqual({ ok: true });
  });

  it("fails validation when first upsert status is unexpected", () => {
    const result = validateEndpointResponses(
      { ok: true, status: 200, json: { ok: true } },
      { status: 409, json: { ok: false } },
      { status: 200, json: { ok: true } }
    );
    expect(result.ok).toBe(false);
    expect(String(result.error)).toContain("first upsert");
  });

  it("finds matching receipt by handoff id", () => {
    const { receipts, matched } = findMatchingReceipt(
      {
        handoff_receipts: [
          { handoff_id: "h-1", status: "available" },
          { handoff_id: "h-2", status: "accepted" }
        ]
      },
      "h-2"
    );
    expect(receipts).toHaveLength(2);
    expect(matched).toMatchObject({ handoff_id: "h-2", status: "accepted" });
  });

  it("returns null when matching receipt is absent", () => {
    const { receipts, matched } = findMatchingReceipt({ handoff_receipts: [{ handoff_id: "h-1" }] }, "h-404");
    expect(receipts).toHaveLength(1);
    expect(matched).toBeNull();
  });

  it("runRuntimeHandoffProof fails on invalid mode", async () => {
    const out = await runRuntimeHandoffProof({
      baseUrl: "http://x",
      incidentId: "inc",
      handoffId: "h",
      fromAgent: "a",
      toAgent: "b",
      mode: "bad-mode",
      runCaseTimeoutMs: 1234
    });
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("invalid --mode");
  });

  it("runRuntimeHandoffProof handles health transport error", async () => {
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "endpoint",
        runCaseTimeoutMs: 1234,
        healthRetries: 0,
        healthRetryBackoffMs: 1
      },
      {
        sleep: async () => {},
        requestJson: async () => {
          throw new Error("boom");
        }
      }
    );
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("health request failed");
    expect(String(out.payload.hint)).toContain("Start cli-agent-adapter");
  });

  it("runRuntimeHandoffProof retries transient health transport failure", async () => {
    let healthCalls = 0;
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "endpoint",
        runCaseTimeoutMs: 1234,
        healthRetries: 2,
        healthRetryBackoffMs: 1
      },
      {
        sleep: async () => {},
        requestJson: async (url) => {
          if (String(url).endsWith("/health")) {
            healthCalls += 1;
            if (healthCalls < 2) throw new Error("transient");
            return { ok: true, status: 200, json: { ok: true } };
          }
          return { ok: true, status: 200, json: { ok: true } };
        }
      }
    );
    expect(out.ok).toBe(true);
    expect(healthCalls).toBe(2);
  });

  it("runRuntimeHandoffProof returns endpoint success payload", async () => {
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "endpoint",
        runCaseTimeoutMs: 1234
      },
      {
        requestJson: async (url) => {
          if (String(url).endsWith("/health")) return { ok: true, status: 200, json: { ok: true } };
          return { ok: true, status: 200, json: { ok: true } };
        }
      }
    );
    expect(out.ok).toBe(true);
    expect(out.payload.mode).toBe("endpoint");
    expect(out.payload.first_upsert_status).toBe(200);
  });

  it("runRuntimeHandoffProof reports endpoint validation failure", async () => {
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "endpoint",
        runCaseTimeoutMs: 1234
      },
      {
        requestJson: async (url) => {
          if (String(url).endsWith("/health")) return { ok: true, status: 200, json: { ok: true } };
          return { ok: false, status: 500, json: { ok: false } };
        }
      }
    );
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("first upsert");
  });

  it("runRuntimeHandoffProof fails when run-case returns non-ok", async () => {
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "e2e",
        runCaseTimeoutMs: 1234
      },
      {
        requestJson: async (url) => {
          if (String(url).endsWith("/run-case")) {
            return { ok: false, status: 500, text: "bad" };
          }
          return { ok: true, status: 200, json: { ok: true } };
        }
      }
    );
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("run-case failed");
  });

  it("runRuntimeHandoffProof fails when receipt is missing", async () => {
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "e2e",
        runCaseTimeoutMs: 1234
      },
      {
        requestJson: async (url) => {
          if (String(url).endsWith("/run-case")) {
            return {
              ok: true,
              status: 200,
              json: { handoff_receipts: [{ handoff_id: "other", status: "accepted" }] }
            };
          }
          return { ok: true, status: 200, json: { ok: true } };
        }
      }
    );
    expect(out.ok).toBe(false);
    expect(String(out.payload.error)).toContain("handoff receipt");
  });

  it("runRuntimeHandoffProof returns e2e success payload when receipt is matched", async () => {
    const out = await runRuntimeHandoffProof(
      {
        baseUrl: "http://x",
        incidentId: "inc",
        handoffId: "h",
        fromAgent: "a",
        toAgent: "b",
        mode: "e2e",
        runCaseTimeoutMs: 1234
      },
      {
        requestJson: async (url) => {
          if (String(url).endsWith("/run-case")) {
            return {
              ok: true,
              status: 200,
              json: { handoff_receipts: [{ handoff_id: "h", status: "accepted" }] }
            };
          }
          return { ok: true, status: 200, json: { ok: true } };
        }
      }
    );
    expect(out.ok).toBe(true);
    expect(out.payload.mode).toBe("e2e");
    expect(out.payload.matched_receipt_status).toBe("accepted");
  });

  it("requestJson parses JSON responses", async () => {
    const fakeRes = {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ ok: true })
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeRes as unknown as Response)
    );

    const res = await requestJson("http://127.0.0.1:8788/x", "GET", null, 2000);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ ok: true });
  });

  it("requestWithRetries retries and succeeds", async () => {
    let attempts = 0;
    const res = await requestWithRetries(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("retry");
        return { ok: true };
      },
      { url: "x", method: "GET", body: null, timeoutMs: 100, retries: 3, backoffMs: 1, sleepFn: async () => {} }
    );
    expect(attempts).toBe(3);
    expect(res).toEqual({ ok: true });
  });

  it("requestJson keeps text when body is not valid JSON", async () => {
    const fakeRes = {
      status: 200,
      ok: true,
      text: async () => "not-json"
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeRes as unknown as Response)
    );

    const res = await requestJson("http://127.0.0.1:8788/x", "GET", null, 2000);
    expect(res.ok).toBe(true);
    expect(res.json).toBeNull();
    expect(res.text).toBe("not-json");
  });

  it("renderCliMessages renders JSON and text variants", () => {
    const jsonOut = renderCliMessages(true, { a: 1 }, true);
    expect(jsonOut.channel).toBe("stdout");
    expect(jsonOut.lines[0]).toContain("\"ok\": true");

    const okOut = renderCliMessages(true, { a: 1 }, false);
    expect(okOut.channel).toBe("stdout");
    expect(okOut.lines[0]).toContain("OK");

    const failOut = renderCliMessages(false, { error: "x" }, false);
    expect(failOut.channel).toBe("stderr");
    expect(failOut.lines[0]).toContain("FAILED");
  });

  it("cliMain returns 0 on --help", async () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const code = await cliMain(["node", "proof-runtime-handoff.mjs", "--help"]);
    expect(code).toBe(0);
    expect(writeSpy).toHaveBeenCalled();
  });

  it("cliMain returns 1 on failed run and prints error path", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cliMain(
      ["node", "proof-runtime-handoff.mjs", "--mode", "bad-mode"],
    );
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalled();
  });
});
