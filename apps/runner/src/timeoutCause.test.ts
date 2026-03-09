import { describe, expect, it } from "vitest";
import { classifyFetchTimeoutCause, classifyWatchdogTimeoutCause } from "./timeoutCause";

describe("timeoutCause", () => {
  it("classifies budget timeout for first-attempt timeout-edge failures", () => {
    const cause = classifyFetchTimeoutCause({
      netErrorKind: "abort",
      errorMessage: undefined,
      attempt: 1,
      retries: 1,
      timeoutMs: 10_000,
      latencyMs: 9_990,
    });
    expect(cause).toBe("timeout_budget_too_small");
  });

  it("classifies stuck/loop when retries are exhausted with repeated timeout", () => {
    const cause = classifyFetchTimeoutCause({
      netErrorKind: "abort",
      errorMessage: undefined,
      attempt: 3,
      retries: 1,
      timeoutMs: 10_000,
      latencyMs: 10_000,
    });
    expect(cause).toBe("agent_stuck_or_loop");
  });

  it("classifies waiting_for_input on interactive timeout hints", () => {
    const cause = classifyFetchTimeoutCause({
      netErrorKind: "unknown",
      errorMessage: "agent waiting for user input on stdin",
      attempt: 1,
      retries: 0,
      timeoutMs: 10_000,
      latencyMs: 8_000,
    });
    expect(cause).toBe("waiting_for_input");
  });

  it("classifies watchdog request-start as waiting_for_input", () => {
    const cause = classifyWatchdogTimeoutCause("baseline_request_start", 60_000, 40_000);
    expect(cause).toBe("waiting_for_input");
  });

  it("classifies watchdog prolonged request-start as stuck/loop", () => {
    const cause = classifyWatchdogTimeoutCause("new_request_start", 200_000, 80_000);
    expect(cause).toBe("agent_stuck_or_loop");
  });
});
