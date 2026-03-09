import type { NetErrorKind, TimeoutCause } from "shared-types";

type FetchTimeoutCauseInput = {
  netErrorKind?: NetErrorKind;
  errorMessage: string | undefined;
  attempt: number;
  retries: number;
  timeoutMs: number;
  latencyMs: number;
};

function hasInteractiveWaitSignal(msg: string): boolean {
  if (!msg) return false;
  const s = msg.toLowerCase();
  return (
    s.includes("waiting for input") ||
    s.includes("waiting for user input") ||
    s.includes("provide input") ||
    s.includes("stdin") ||
    s.includes("press enter")
  );
}

export function classifyFetchTimeoutCause(input: FetchTimeoutCauseInput): TimeoutCause {
  const msg = typeof input.errorMessage === "string" ? input.errorMessage : "";
  if (hasInteractiveWaitSignal(msg)) return "waiting_for_input";

  const latencyRatio = input.timeoutMs > 0 ? input.latencyMs / input.timeoutMs : 0;
  const exhaustedRetries = input.retries > 0 && input.attempt >= input.retries + 1;
  const nearBudgetEdge = latencyRatio >= 0.95;

  if (
    exhaustedRetries ||
    (input.netErrorKind === "abort" && input.attempt > 1 && nearBudgetEdge)
  ) {
    return "agent_stuck_or_loop";
  }

  if (nearBudgetEdge || input.netErrorKind === "headers_timeout" || input.netErrorKind === "abort") {
    return "timeout_budget_too_small";
  }

  return "unknown_timeout";
}

export function classifyWatchdogTimeoutCause(stage: string, idleMs: number, timeoutMs: number): TimeoutCause {
  const s = (stage || "").toLowerCase();
  if (s.includes("request_start")) {
    if (idleMs >= timeoutMs * 2) return "agent_stuck_or_loop";
    return "waiting_for_input";
  }
  if (s.includes("request_finish")) return "agent_stuck_or_loop";
  if (s.includes("case_start") || s.includes("case_init")) return "waiting_for_input";
  return "unknown_timeout";
}
