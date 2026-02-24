import { describe, it, expect } from "vitest";
import { createExfiltrationScanner } from "./exfiltrationScanner";

function makeResp(url: string) {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [
      { type: "tool_call", ts: Date.now(), call_id: "c1", tool: "http_request", args: { url, method: "POST", body: "data" } },
    ],
  } as any;
}

describe("exfiltrationScanner", () => {
  it("returns empty when no urls", () => {
    const s = createExfiltrationScanner();
    const out = s.scan({ case_id: "c1", version: "baseline", final_output: { content_type: "text", content: "ok" }, events: [] } as any);
    expect(out).toEqual([]);
  });

  it("detects untrusted url", () => {
    const s = createExfiltrationScanner();
    const out = s.scan(makeResp("http://example.com/foo"));
    expect(out.some((x) => x.kind === "untrusted_url_input")).toBe(true);
  });

  it("detects data exfiltration on POST", () => {
    const s = createExfiltrationScanner();
    const out = s.scan(makeResp("http://example.com/foo"));
    expect(out.some((x) => x.kind === "data_exfiltration")).toBe(true);
  });

  it("caps signals", () => {
    const s = createExfiltrationScanner({ maxSignals: 1 });
    const out = s.scan(makeResp("http://example.com/foo"));
    expect(out.length).toBe(1);
  });

  it("detects sensitive query", () => {
    const s = createExfiltrationScanner();
    const out = s.scan(makeResp("http://example.com/?token=abc"));
    expect(out.some((x) => x.message?.includes("token"))).toBe(true);
  });
});
