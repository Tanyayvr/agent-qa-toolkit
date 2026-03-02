import type { RunnerFailureArtifact, Version } from "shared-types";
import { emitStructuredLog } from "cli-utils";
import type { CaseFileItem, MinimalAgentResponseOnFailure, RunnerConfig } from "./runnerTypes";
import { mkFailureResponse } from "./runnerReliability";

export type LinkedAbortSignal = {
  signal: AbortSignal;
  dispose: () => void;
};

export function linkAbortSignals(signals: AbortSignal[]): LinkedAbortSignal {
  const controller = new AbortController();
  const listeners: { signal: AbortSignal; onAbort: () => void }[] = [];

  const abort = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  for (const s of signals) {
    if (s.aborted) {
      abort();
      break;
    }
    const onAbort = () => abort();
    s.addEventListener("abort", onAbort, { once: true });
    listeners.push({ signal: s, onAbort });
  }

  return {
    signal: controller.signal,
    dispose: () => {
      for (const { signal, onAbort } of listeners) {
        signal.removeEventListener("abort", onAbort);
      }
    },
  };
}

export type CaseWatchdogSnapshot = {
  timed_out: boolean;
  timeout_ms: number;
  idle_ms: number;
  stage: string;
  timed_out_at?: number;
};

export type CaseWatchdog = {
  signal: AbortSignal;
  heartbeat: (stage: string, fields?: Record<string, unknown>) => void;
  isTimedOut: () => boolean;
  snapshot: () => CaseWatchdogSnapshot;
  stop: () => void;
};

export function createCaseWatchdog(params: {
  runId: string;
  caseId: string;
  inactivityTimeoutMs: number;
  heartbeatIntervalMs: number;
}): CaseWatchdog {
  const { runId, caseId, inactivityTimeoutMs, heartbeatIntervalMs } = params;

  const controller = new AbortController();
  let lastProgressAt = Date.now();
  let lastProgressStage = "case_init";
  let lastHeartbeatAt = Date.now();
  let timedOutAt: number | null = null;

  const heartbeat = (stage: string, fields?: Record<string, unknown>) => {
    lastProgressAt = Date.now();
    lastProgressStage = stage;
    lastHeartbeatAt = lastProgressAt;
    emitStructuredLog("runner", "info", "case_progress", {
      run_id: runId,
      case_id: caseId,
      stage,
      ...(fields ?? {}),
    });
  };

  const tickMs = Math.max(500, Math.min(heartbeatIntervalMs, 5_000));
  const timer = setInterval(() => {
    if (timedOutAt !== null) return;

    const now = Date.now();
    const idleMs = now - lastProgressAt;
    if (idleMs >= inactivityTimeoutMs) {
      timedOutAt = now;
      controller.abort();
      emitStructuredLog("runner", "warn", "case_watchdog_timeout", {
        run_id: runId,
        case_id: caseId,
        timeout_ms: inactivityTimeoutMs,
        idle_ms: idleMs,
        stage: lastProgressStage,
      });
      return;
    }

    if (now - lastHeartbeatAt >= heartbeatIntervalMs) {
      lastHeartbeatAt = now;
      emitStructuredLog("runner", "info", "case_heartbeat", {
        run_id: runId,
        case_id: caseId,
        timeout_ms: inactivityTimeoutMs,
        idle_ms: idleMs,
        stage: lastProgressStage,
      });
    }
  }, tickMs);

  const timerLike = timer as unknown as { unref?: () => void };
  if (typeof timerLike.unref === "function") {
    timerLike.unref();
  }

  const snapshot = (): CaseWatchdogSnapshot => ({
    timed_out: timedOutAt !== null,
    timeout_ms: inactivityTimeoutMs,
    idle_ms: Date.now() - lastProgressAt,
    stage: lastProgressStage,
    ...(timedOutAt !== null ? { timed_out_at: timedOutAt } : {}),
  });

  return {
    signal: controller.signal,
    heartbeat,
    isTimedOut: () => timedOutAt !== null,
    snapshot,
    stop: () => clearInterval(timer),
  };
}

export function mkWatchdogFailureResponse(
  cfg: RunnerConfig,
  c: CaseFileItem,
  version: Version,
  attempt: number,
  snap: CaseWatchdogSnapshot
): MinimalAgentResponseOnFailure {
  const artifact: RunnerFailureArtifact = {
    type: "runner_fetch_failure",
    class: "timeout",
    net_error_kind: "abort",
    is_transient: false,
    case_id: c.id,
    version,
    url: `${cfg.baseUrl}/run-case`,
    attempt,
    timeout_ms: snap.timeout_ms,
    latency_ms: snap.idle_ms,
    error_name: "InactivityTimeout",
    error_message: `No runner progress heartbeat for ${snap.idle_ms}ms at stage=${snap.stage}. Watchdog threshold=${snap.timeout_ms}ms.`,
  };
  const msg = [
    "runner: fetch failure (timeout)",
    `case_id=${c.id}`,
    `version=${version}`,
    `attempt=${attempt}`,
    `url=${cfg.baseUrl}/run-case`,
    `watchdog_timeout_ms=${snap.timeout_ms}`,
    `watchdog_idle_ms=${snap.idle_ms}`,
    `watchdog_stage=${snap.stage}`,
    `error=${artifact.error_name}: ${artifact.error_message}`,
  ].join("\n");
  return mkFailureResponse(artifact, msg);
}
