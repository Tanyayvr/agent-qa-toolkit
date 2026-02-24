import { describe, it, expect } from "vitest";
import { deriveCaseStatus } from "./evaluator";

describe("evaluator helpers", () => {
  it("deriveCaseStatus", () => {
    expect(deriveCaseStatus(false, false)).toEqual({ status: "filtered_out", reason: "excluded_by_filter" });
    expect(deriveCaseStatus(true, false)).toEqual({ status: "missing", reason: "missing_case_response" });
    expect(deriveCaseStatus(true, true)).toEqual({ status: "executed" });
  });
});
