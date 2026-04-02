import { describe, it, expect } from "vitest";
import type { AgentResponse } from "shared-types";
import { createPiiScanner } from "./piiScanner";

function makeResp(text: string): AgentResponse {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: text },
    events: [],
  };
}

describe("piiScanner", () => {
  it("returns empty for empty response", async () => {
    const s = createPiiScanner();
    expect(await s.scan(makeResp(""))).toEqual([]);
  });

  it("detects email", async () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const out = await s.scan(makeResp("email test a@b.com"));
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.kind).toBe("pii_in_output");
  });

  it("detects credit card with luhn", async () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const out = await s.scan(makeResp("cc 4111111111111111"));
    expect(out.some((x) => x.confidence === "high")).toBe(true);
  });

  it("caps signals", async () => {
    const s = createPiiScanner({ maxSignals: 1 });
    const out = await s.scan(makeResp("a@b.com c@d.com"));
    expect(out.length).toBe(1);
  });

  it("masks sample", async () => {
    const s = createPiiScanner({ maxSignals: 1 });
    const out = await s.scan(makeResp("email test a@b.com"));
    expect(out[0]!.details?.sample).toMatch(/\*\*\*\*/);
  });

  it("ignores non-luhn credit card-like numbers", async () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const out = await s.scan(makeResp("fake cc 1234567890123456"));
    expect(out.some((x) => x.details?.sample === "1234****")).toBe(false);
  });

  it("collects payload_summary text/object from tool_result events", async () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const resp: AgentResponse = {
      case_id: "c2",
      version: "new",
      final_output: { content_type: "text", content: "" },
      events: [
        { type: "tool_result", ts: Date.now(), call_id: "1", status: "ok", payload_summary: "token=supersecret12345" },
        { type: "tool_result", ts: Date.now(), call_id: "2", status: "ok", payload_summary: { contact: "a@b.com" } },
      ],
    };
    const out = await s.scan(resp);
    expect(out.some((x) => x.kind === "secret_in_output")).toBe(true);
    expect(out.some((x) => x.kind === "pii_in_output")).toBe(true);
  });

  it("detects EU fintech identifiers such as IBAN and BIC/SWIFT", async () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const out = await s.scan(makeResp("iban DE89 3704 0044 0532 0130 00 bic DEUTDEFF"));
    expect(out.some((x) => x.message === "iban detected")).toBe(true);
    expect(out.some((x) => x.message === "bic_swift detected")).toBe(true);
  });

  it("handles non-serializable json final output safely", async () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const resp: AgentResponse = {
      case_id: "c3",
      version: "new",
      final_output: { content_type: "json", content: circular },
      events: [],
    };
    expect(s.scan(resp)).toEqual([]);
  });
});
