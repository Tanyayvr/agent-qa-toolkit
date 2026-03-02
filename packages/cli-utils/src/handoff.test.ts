import { describe, expect, it } from "vitest";
import {
  computeHandoffChecksum,
  normalizeRunMeta,
  stableStringify,
  validateAndNormalizeHandoffEnvelope,
} from "./handoff";

describe("handoff utils", () => {
  it("stableStringify is deterministic for key order", () => {
    const a = { z: 1, a: { y: 2, b: 3 } };
    const b = { a: { b: 3, y: 2 }, z: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("normalizes run_meta and drops empty values", () => {
    expect(
      normalizeRunMeta({
        run_id: "run-1",
        incident_id: "inc-1",
        agent_id: "agent-a",
        parent_run_id: "",
      })
    ).toEqual({
      run_id: "run-1",
      incident_id: "inc-1",
      agent_id: "agent-a",
    });
    expect(normalizeRunMeta({})).toBeUndefined();
  });

  it("normalizes handoff payload and computes checksum", () => {
    const normalized = validateAndNormalizeHandoffEnvelope(
      {
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "Generate release note",
      },
      123
    );
    expect(normalized.created_at).toBe(123);
    expect(normalized.schema_version).toBe("1.0.0");
    expect(normalized.checksum).toHaveLength(64);
    expect(computeHandoffChecksum(normalized)).toBe(normalized.checksum);
  });

  it("rejects checksum mismatch", () => {
    expect(() =>
      validateAndNormalizeHandoffEnvelope({
        incident_id: "inc-1",
        handoff_id: "h-1",
        from_agent_id: "planner",
        to_agent_id: "executor",
        objective: "Generate release note",
        checksum: "deadbeef",
      })
    ).toThrow("Invalid handoff checksum");
  });
});
