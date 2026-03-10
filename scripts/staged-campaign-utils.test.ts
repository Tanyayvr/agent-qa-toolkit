import { describe, expect, it } from "vitest";
import {
  classifyStageFailure,
  mapTimeoutCauseToStageReason,
  pickSubsetCases,
  pickSmokeCases,
  stageNextAction,
} from "./staged-campaign-utils.mjs";

describe("staged-campaign-utils", () => {
  it("picks deterministic generic subset", () => {
    const input = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const picked = pickSubsetCases(input, 3);
    expect(picked).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("picks deterministic smoke subset", () => {
    const input = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const picked = pickSmokeCases(input, 2);
    expect(picked).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("maps timeout causes to stage reasons", () => {
    expect(mapTimeoutCauseToStageReason("timeout_budget_too_small")).toBe("timeout_budget");
    expect(mapTimeoutCauseToStageReason("agent_stuck_or_loop")).toBe("agent_stuck_or_loop");
    expect(mapTimeoutCauseToStageReason("waiting_for_input")).toBe("waiting_for_input");
    expect(mapTimeoutCauseToStageReason("transport_failure")).toBe("transport");
    expect(mapTimeoutCauseToStageReason("unknown_timeout")).toBe("unknown");
  });

  it("classifies stage failure from timeout cause first", () => {
    const out = classifyStageFailure({
      summary: { execution_quality: { reasons: ["baseline transport success 0.1 is below threshold 0.95"] } },
      items: [
        {
          failure_summary: {
            baseline: { class: "timeout", timeout_cause: "agent_stuck_or_loop" },
          },
        },
      ],
    });
    expect(out.reason).toBe("agent_stuck_or_loop");
    expect(out.source).toBe("timeout_cause");
  });

  it("classifies policy failures", () => {
    const out = classifyStageFailure({
      summary: { execution_quality: { reasons: [] } },
      items: [
        {
          policy_evaluation: {
            baseline: { planning_gate_pass: true, repl_policy_pass: true },
            new: { planning_gate_pass: false, repl_policy_pass: true },
          },
        },
      ],
    });
    expect(out.reason).toBe("policy");
    expect(out.next_action).toBe(stageNextAction("policy"));
  });

  it("classifies semantic failures", () => {
    const out = classifyStageFailure({
      summary: { execution_quality: { reasons: ["weak expected rate 0.5 is above threshold 0.2"] } },
      items: [],
    });
    expect(out.reason).toBe("semantic");
  });

  it("falls back to transport when runner failures are present without timeout cause", () => {
    const out = classifyStageFailure({
      summary: {
        execution_quality: {
          reasons: [],
          baseline_runner_failures: 2,
          new_runner_failures: 0,
        },
      },
      items: [],
    });
    expect(out.reason).toBe("transport");
  });
});
