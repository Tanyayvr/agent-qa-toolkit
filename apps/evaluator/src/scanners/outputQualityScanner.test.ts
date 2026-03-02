import { describe, it, expect } from "vitest";
import type { AgentResponse } from "shared-types";
import { createOutputQualityScanner } from "./outputQualityScanner";

function makeResp(text: string, toolStatus: "ok" | "error" = "ok"): AgentResponse {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: text },
    events: [{ type: "tool_result", ts: Date.now(), call_id: "c1", status: toolStatus, payload_summary: "" }],
  };
}

describe("outputQualityScanner", () => {
  it("detects model refusal", async () => {
    const s = createOutputQualityScanner();
    const out = await Promise.resolve(s.scan(makeResp("I cannot comply")));
    expect(out.some((x) => x.kind === "model_refusal")).toBe(true);
  });

  it("detects hallucination when tool failed", async () => {
    const s = createOutputQualityScanner();
    const out = await Promise.resolve(s.scan(makeResp("Here is the result", "error")));
    expect(out.some((x) => x.kind === "hallucination_in_output")).toBe(true);
  });

  it("bias pattern placeholder", async () => {
    const s = createOutputQualityScanner({ biasPatterns: [{ regex: /biasword/i, label: "bias" }] });
    const out = await Promise.resolve(s.scan(makeResp("biasword")));
    expect(out.some((x) => x.kind === "bias_detected")).toBe(true);
  });

  it("compliance pattern placeholder", async () => {
    const s = createOutputQualityScanner({ complianceRules: [{ id: "C1", regex: /violation/i, severity: "high" }] });
    const out = await Promise.resolve(s.scan(makeResp("violation")));
    expect(out.some((x) => x.kind === "compliance_violation")).toBe(true);
  });

  it("caps signals", async () => {
    const s = createOutputQualityScanner({ maxSignals: 1 });
    const out = await Promise.resolve(s.scan(makeResp("I cannot comply")));
    expect(out.length).toBe(1);
  });

  it("does not emit hallucination signal when disabled", async () => {
    const s = createOutputQualityScanner({ hallucinationCheck: false });
    const out = await Promise.resolve(s.scan(makeResp("confident output", "error")));
    expect(out.some((x) => x.kind === "hallucination_in_output")).toBe(false);
  });

  it("handles non-serializable json output and returns no text-based signals", async () => {
    const s = createOutputQualityScanner({ hallucinationCheck: true });
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const resp: AgentResponse = {
      case_id: "c2",
      version: "new",
      final_output: { content_type: "json", content: circular },
      events: [{ type: "tool_result", ts: Date.now(), call_id: "c1", status: "error", payload_summary: "" }],
    };
    const out = await Promise.resolve(s.scan(resp));
    expect(out).toEqual([]);
  });

  it("adds refusal only once even if multiple refusal patterns match", async () => {
    const s = createOutputQualityScanner({
      refusalPatterns: [/\bI cannot\b/i, /\bAs an AI\b/i],
      maxSignals: 10,
    });
    const out = await Promise.resolve(s.scan(makeResp("I cannot do this. As an AI, I cannot proceed.")));
    expect(out.filter((x) => x.kind === "model_refusal")).toHaveLength(1);
  });
});
