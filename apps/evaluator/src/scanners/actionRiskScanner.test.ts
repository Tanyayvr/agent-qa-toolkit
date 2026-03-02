import { describe, it, expect } from "vitest";
import type { AgentResponse } from "shared-types";
import { createActionRiskScanner } from "./actionRiskScanner";

function makeResp(tool: string, args: Record<string, unknown> = {}): AgentResponse {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "tool_call", ts: Date.now(), call_id: "c1", tool, args }],
  };
}

describe("actionRiskScanner", () => {
  it("returns empty for non-risky tool", async () => {
    const s = createActionRiskScanner();
    const out = await Promise.resolve(s.scan(makeResp("safe_tool")));
    expect(out).toEqual([]);
  });

  it("detects high risk action", async () => {
    const s = createActionRiskScanner();
    const out = await Promise.resolve(s.scan(makeResp("delete_user")));
    expect(out[0]!.kind).toBe("high_risk_action");
  });

  it("detects permission change", async () => {
    const s = createActionRiskScanner();
    const out = await Promise.resolve(s.scan(makeResp("grant_role")));
    expect(out[0]!.kind).toBe("permission_change");
  });

  it("bumps severity on flags", async () => {
    const s = createActionRiskScanner();
    const out = await Promise.resolve(s.scan(makeResp("delete_user", { force: true, args: "--force" })));
    expect(out[0]!.severity).toBe("critical");
  });

  it("caps signals", async () => {
    const s = createActionRiskScanner({ maxSignals: 1 });
    const out = await Promise.resolve(s.scan({
      case_id: "c1",
      version: "baseline",
      final_output: { content_type: "text", content: "ok" },
      events: [
        { type: "tool_call", ts: Date.now(), call_id: "c1", tool: "delete_user", args: {} },
        { type: "tool_call", ts: Date.now(), call_id: "c2", tool: "drop_table", args: {} },
      ],
    } satisfies AgentResponse));
    expect(out.length).toBe(1);
  });
});
