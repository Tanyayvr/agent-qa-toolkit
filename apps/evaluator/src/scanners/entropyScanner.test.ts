import { describe, expect, it } from "vitest";
import type { AgentResponse } from "shared-types";
import { createEntropyScanner } from "./entropyScanner";

function mkTextResp(text: string): AgentResponse {
  return {
    case_id: "c1",
    version: "new",
    final_output: { content_type: "text", content: text },
    proposed_actions: [],
    events: [],
  };
}

describe("entropyScanner", () => {
  it("detects known key patterns", async () => {
    const scanner = createEntropyScanner();
    const resp = mkTextResp("Leaked aws key: AKIA1234567890ABCD12");
    const signals = await scanner.scan(resp);

    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]?.kind).toBe("token_exfil_indicator");
    expect(signals[0]?.title).toContain("Key pattern detected");
  });

  it("detects high-entropy token-like strings", async () => {
    const scanner = createEntropyScanner({ minEntropy: 3.2, minTokenLength: 24, maxSignals: 5 });
    const resp = mkTextResp("token=Zx91Qa8Lp2Mn7Vr5Ts3Yw6Bd4Hk0Cf9P");
    const signals = await scanner.scan(resp);

    expect(signals.some((s) => s.title.includes("High-entropy token-like string detected"))).toBe(true);
  });

  it("respects maxSignals and maxTextBytes", async () => {
    const scanner = createEntropyScanner({ maxSignals: 1, maxTextBytes: 48 });
    const resp = mkTextResp(
      "prefix prefix prefix AKIA1234567890ABCD12 sk-abcdefghijklmnopqrstuvwxyz"
    );
    const signals = await scanner.scan(resp);

    expect(signals).toHaveLength(1);
  });

  it("reads json output and emits key-pattern signal", async () => {
    const scanner = createEntropyScanner();
    const resp: AgentResponse = {
      case_id: "c1",
      version: "new",
      final_output: {
        content_type: "json",
        content: { leaked: "xoxb-12345678901234567890-abcdef" },
      },
      proposed_actions: [],
      events: [],
    };
    const signals = await scanner.scan(resp);
    expect(signals.some((s) => s.title.includes("Key pattern detected"))).toBe(true);
  });

  it("returns empty when response is non-serializable and has no text", async () => {
    const scanner = createEntropyScanner();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const resp = {
      case_id: "c1",
      version: "new",
      final_output: { content_type: "json", content: circular },
      proposed_actions: [],
      events: [],
    } as AgentResponse;

    const signals = await scanner.scan(resp);
    expect(signals).toEqual([]);
  });

  it("does not emit entropy signal below threshold", async () => {
    const scanner = createEntropyScanner({ minEntropy: 4.5, minTokenLength: 24 });
    const resp = mkTextResp("candidate=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    const signals = await scanner.scan(resp);
    expect(signals).toEqual([]);
  });
});
