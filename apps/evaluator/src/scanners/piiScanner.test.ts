import { describe, it, expect } from "vitest";
import { createPiiScanner } from "./piiScanner";

function makeResp(text: string) {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: text },
    events: [],
  } as any;
}

describe("piiScanner", () => {
  it("returns empty for empty response", () => {
    const s = createPiiScanner();
    expect(s.scan(makeResp(""))).toEqual([]);
  });

  it("detects email", () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const out = s.scan(makeResp("email test a@b.com"));
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.kind).toBe("pii_in_output");
  });

  it("detects credit card with luhn", () => {
    const s = createPiiScanner({ maxSignals: 5 });
    const out = s.scan(makeResp("cc 4111111111111111"));
    expect(out.some((x) => x.confidence === "high")).toBe(true);
  });

  it("caps signals", () => {
    const s = createPiiScanner({ maxSignals: 1 });
    const out = s.scan(makeResp("a@b.com c@d.com"));
    expect(out.length).toBe(1);
  });

  it("masks sample", () => {
    const s = createPiiScanner({ maxSignals: 1 });
    const out = s.scan(makeResp("email test a@b.com"));
    expect(out[0]!.details?.sample).toMatch(/\*\*\*\*/);
  });
});
