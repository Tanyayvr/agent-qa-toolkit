import { describe, expect, it } from "vitest";
import {
  escHtml,
  executionQualityBadge,
  fmtFailureKinds,
  gateBadge,
  linkIfPresentWithKey,
  scriptSafeJson,
  securityCell,
  traceCell,
} from "./htmlFormatters";

describe("htmlFormatters", () => {
  it("escapes html and script-safe json payloads", () => {
    expect(escHtml(`<tag attr="x'&">`)).toContain("&lt;tag");
    expect(scriptSafeJson(`{"x":"</script><!--"}`)).not.toContain("</script>");
  });

  it("formats badges and failure kinds deterministically", () => {
    expect(executionQualityBadge("healthy")).toContain("execution: healthy");
    expect(executionQualityBadge("degraded")).toContain("execution: degraded");
    expect(gateBadge("block")).toContain("block");
    expect(fmtFailureKinds({ timeout: 2, fetch_failed: 5 })).toBe("fetch_failed:5 · timeout:2");
    expect(fmtFailureKinds({})).toBe("none");
  });

  it("prefers manifest key links and renders trace/security cells", () => {
    const keyed = linkIfPresentWithKey("assets/file.json", "manifest.case_1.new", "open");
    expect(keyed).toContain("data-manifest-key=");
    expect(keyed).not.toContain('href="assets/file.json"');

    const trace = traceCell({
      baseline: { status: "partial", issues: ["missing event"] },
      new: { status: "ok", issues: [] },
    });
    expect(trace).toContain("baseline");
    expect(trace).toContain("missing event");

    const sec = securityCell({
      baseline: { signals: [], requires_gate_recommendation: false },
      new: {
        signals: [
          {
            kind: "high_risk_action",
            severity: "high",
            confidence: "high",
            title: "risk",
            evidence_refs: [],
          },
        ],
        requires_gate_recommendation: true,
      },
    });
    expect(sec).toContain("gate: recommended");
    expect(sec).toContain("sec: 1 (high)");
  });
});
