import { describe, it, expect } from "vitest";
import type { AgentResponse } from "shared-types";
import { createExfiltrationScanner } from "./exfiltrationScanner";

function makeResp(url: string): AgentResponse {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [
      { type: "tool_call", ts: Date.now(), call_id: "c1", tool: "http_request", args: { url, method: "POST", body: "data" } },
    ],
  };
}

function makeRespWithArgs(args: Record<string, unknown>): AgentResponse {
  return {
    case_id: "c1",
    version: "baseline",
    final_output: { content_type: "text", content: "ok" },
    events: [{ type: "tool_call", ts: Date.now(), call_id: "c1", tool: "http_request", args }],
  };
}

describe("exfiltrationScanner", () => {
  it("returns empty when no urls", async () => {
    const s = createExfiltrationScanner();
    const out = await Promise.resolve(
      s.scan({ case_id: "c1", version: "baseline", final_output: { content_type: "text", content: "ok" }, events: [] })
    );
    expect(out).toEqual([]);
  });

  it("detects untrusted url", async () => {
    const s = createExfiltrationScanner();
    const out = await Promise.resolve(s.scan(makeResp("http://example.com/foo")));
    expect(out.some((x) => x.kind === "untrusted_url_input")).toBe(true);
  });

  it("detects data exfiltration on POST", async () => {
    const s = createExfiltrationScanner();
    const out = await Promise.resolve(s.scan(makeResp("http://example.com/foo")));
    expect(out.some((x) => x.kind === "data_exfiltration")).toBe(true);
  });

  it("caps signals", async () => {
    const s = createExfiltrationScanner({ maxSignals: 1 });
    const out = await Promise.resolve(s.scan(makeResp("http://example.com/foo")));
    expect(out.length).toBe(1);
  });

  it("detects sensitive query", async () => {
    const s = createExfiltrationScanner();
    const out = await Promise.resolve(s.scan(makeResp("http://example.com/?token=abc")));
    expect(out.some((x) => x.message?.includes("token"))).toBe(true);
  });

  it("does not mark allowlisted host as untrusted", async () => {
    const s = createExfiltrationScanner({ domainAllowlist: ["api.internal.local"] });
    const out = await Promise.resolve(s.scan(makeResp("https://api.internal.local/resource")));
    expect(out.some((x) => x.kind === "untrusted_url_input")).toBe(false);
    expect(out.some((x) => x.kind === "data_exfiltration")).toBe(true);
  });

  it("marks GET without body as unexpected_outbound", async () => {
    const s = createExfiltrationScanner();
    const out = await Promise.resolve(
      s.scan(makeRespWithArgs({ url: "https://example.org/read", method: "GET" }))
    );
    expect(out.some((x) => x.kind === "unexpected_outbound")).toBe(true);
    expect(out.some((x) => x.kind === "data_exfiltration")).toBe(false);
  });

  it("flags blocklisted domains even without explicit method", async () => {
    const s = createExfiltrationScanner({ domainBlocklist: ["*.webhook.site"] });
    const out = await Promise.resolve(s.scan(makeRespWithArgs({ url: "https://x.webhook.site/hook" })));
    expect(out.some((x) => x.kind === "data_exfiltration")).toBe(true);
  });
});
