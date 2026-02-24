import { describe, it, expect } from "vitest";
import { createOutputQualityScanner } from "./outputQualityScanner";

function makeResp(text: string, toolStatus: "ok" | "error" = "ok") {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: text },
    events: [{ type: "tool_result", ts: Date.now(), call_id: "c1", status: toolStatus, payload_summary: "" }],
  } as any;
}

describe("outputQualityScanner", () => {
  it("detects model refusal", () => {
    const s = createOutputQualityScanner();
    const out = s.scan(makeResp("I cannot comply"));
    expect(out.some((x) => x.kind === "model_refusal")).toBe(true);
  });

  it("detects hallucination when tool failed", () => {
    const s = createOutputQualityScanner();
    const out = s.scan(makeResp("Here is the result", "error"));
    expect(out.some((x) => x.kind === "hallucination_in_output")).toBe(true);
  });

  it("bias pattern placeholder", () => {
    const s = createOutputQualityScanner({ biasPatterns: [{ regex: /biasword/i, label: "bias" }] });
    const out = s.scan(makeResp("biasword"));
    expect(out.some((x) => x.kind === "bias_detected")).toBe(true);
  });

  it("compliance pattern placeholder", () => {
    const s = createOutputQualityScanner({ complianceRules: [{ id: "C1", regex: /violation/i, severity: "high" }] });
    const out = s.scan(makeResp("violation"));
    expect(out.some((x) => x.kind === "compliance_violation")).toBe(true);
  });

  it("caps signals", () => {
    const s = createOutputQualityScanner({ maxSignals: 1 });
    const out = s.scan(makeResp("I cannot comply"));
    expect(out.length).toBe(1);
  });
});
