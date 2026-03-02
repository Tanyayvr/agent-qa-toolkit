import { describe, expect, it } from "vitest";
import type { AgentResponse } from "shared-types";
import { assessRedactionState, verifyRedactionCoverage } from "./evaluatorRedaction";

function makeResponse(caseId: string, content: string): AgentResponse {
  return {
    case_id: caseId,
    version: "new",
    final_output: { content_type: "text", content },
    events: [],
    proposed_actions: [],
  };
}

describe("evaluatorRedaction", () => {
  it("reports applied state and warns on preset mismatch", () => {
    const state = assessRedactionState({
      baselineMeta: { redaction_applied: true, redaction_preset: "transferable" },
      newMeta: { redaction_applied: true, redaction_preset: "internal_only" },
      processEnv: {},
    });

    expect(state.status).toBe("applied");
    expect(state.presetId).toBe("transferable");
    expect(state.warnings).toContain(
      "redaction_preset mismatch between baseline (transferable) and new (internal_only)."
    );
  });

  it("falls back to env when runner metadata is missing", () => {
    const state = assessRedactionState({
      baselineMeta: {},
      newMeta: {},
      processEnv: { REDACTION_STATUS: "applied", REDACTION_PRESET_ID: "transferable_extended" },
    });

    expect(state.status).toBe("applied");
    expect(state.presetId).toBe("transferable_extended");
    expect(state.warnings).toContain("redaction status derived from env vars (runner metadata missing).");
  });

  it("detects unredacted markers only when redaction is applied", () => {
    const state = { status: "applied" as const, presetId: "transferable", warnings: [] };
    const check = verifyRedactionCoverage({
      state,
      baselineById: {
        c1: makeResponse("c1", "safe output"),
      },
      newById: {
        c2: makeResponse("c2", "email me at ceo@example.com"),
      },
    });

    expect(check.violations).toBe(1);
    expect(check.samples[0]).toContain("c2");
    expect(check.warnings[0]).toContain("redaction_check_failed");
  });

  it("skips marker checks when redaction status is none", () => {
    const check = verifyRedactionCoverage({
      state: { status: "none", warnings: [] },
      baselineById: { c1: makeResponse("c1", "ceo@example.com") },
      newById: {},
    });
    expect(check).toEqual({ violations: 0, samples: [], warnings: [] });
  });
});

