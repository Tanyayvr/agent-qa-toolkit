import { describe, it, expect } from "vitest";
import { createActionRiskScanner } from "./actionRiskScanner";

function makeResp(tool: string, args: Record<string, unknown> = {}) {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "tool_call", ts: Date.now(), call_id: "c1", tool, args }],
  } as any;
}

describe("actionRiskScanner", () => {
  it("returns empty for non-risky tool", () => {
    const s = createActionRiskScanner();
    expect(s.scan(makeResp("safe_tool"))).toEqual([]);
  });

  it("detects high risk action", () => {
    const s = createActionRiskScanner();
    const out = s.scan(makeResp("delete_user"));
    expect(out[0]!.kind).toBe("high_risk_action");
  });

  it("detects permission change", () => {
    const s = createActionRiskScanner();
    const out = s.scan(makeResp("grant_role"));
    expect(out[0]!.kind).toBe("permission_change");
  });

  it("bumps severity on flags", () => {
    const s = createActionRiskScanner();
    const out = s.scan(makeResp("delete_user", { force: true, args: "--force" }));
    expect(out[0]!.severity).toBe("critical");
  });

  it("caps signals", () => {
    const s = createActionRiskScanner({ maxSignals: 1 });
    const out = s.scan({
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [
        { type: "tool_call", ts: Date.now(), call_id: "c1", tool: "delete_user", args: {} },
        { type: "tool_call", ts: Date.now(), call_id: "c2", tool: "drop_table", args: {} },
      ],
    } as any);
    expect(out.length).toBe(1);
  });
});
