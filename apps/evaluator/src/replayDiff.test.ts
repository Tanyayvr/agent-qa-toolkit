import { describe, it, expect } from "vitest";
import { renderCaseDiffHtml } from "./replayDiff";
import type { AgentResponse } from "shared-types";

const base: AgentResponse = {
  case_id: "c1",
  version: "baseline",
  proposed_actions: [],
  final_output: { content_type: "text", content: "ok" },
  events: [],
};

const newer: AgentResponse = {
  case_id: "c1",
  version: "new",
  proposed_actions: [],
  final_output: { content_type: "text", content: "ok" },
  events: [],
};

describe("replayDiff", () => {
  it("renders HTML", () => {
    const html = renderCaseDiffHtml("c1", base, newer);
    expect(html).toContain("Replay diff");
    expect(html).toContain("c1");
  });
});
