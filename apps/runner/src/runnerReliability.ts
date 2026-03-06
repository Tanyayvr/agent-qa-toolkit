import type {
  NetErrorKind,
  RunnerFailureArtifact,
} from "shared-types";
import { extractErrorCode, fetchWithTimeout, formatFetchFailure } from "./httpTransport";
import { collectTimeoutHistorySamples, summarizeHistoryCandidate } from "./historyTimeout";
import type {
  AdapterRuntimeHints,
  MinimalAgentResponseOnFailure,
  PreflightResult,
  PreflightStatus,
  RunCaseRequest,
  RunnerConfig,
  TimeoutAutoResolution,
} from "./runnerTypes";
import { SERVER_TIMEOUT_SAFETY_MARGIN_MS } from "./runnerTypes";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise((r) => setTimeout(r, ms));
  const mkAbortError = (): Error => {
    const err = new Error("aborted");
    err.name = "AbortError";
    return err;
  };
  if (signal.aborted) return Promise.reject(mkAbortError());
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
      reject(mkAbortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function backoffMs(base: number, attempt: number): number {
  const exp = Math.min(6, Math.max(0, attempt - 1));
  const raw = base * Math.pow(2, exp);
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(raw * 0.2)));
  return raw + jitter;
}

export function httpIsTransient(status: number): boolean {
  if (status === 408) return true;
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

export function inferNetErrorKind(e: unknown): NetErrorKind {
  const name = e instanceof Error ? e.name : "";
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const code = (extractErrorCode(e) ?? "").toLowerCase();

  const s = `${name} ${msg} ${code}`.toLowerCase();

  if (name === "AbortError" || s.includes("abort")) return "abort";
  if (s.includes("und_err_headers_timeout") || s.includes("headers timeout")) return "headers_timeout";
  if (s.includes("enotfound") || s.includes("eai_again") || s.includes("dns")) return "dns";
  if (s.includes("cert") || s.includes("tls") || s.includes("ssl") || s.includes("handshake")) return "tls";
  if (s.includes("econnrefused") || s.includes("connection refused")) return "conn_refused";
  if (s.includes("econnreset") || s.includes("connection reset")) return "conn_reset";
  if (s.includes("socket hang up")) return "socket_hang_up";
  if (s.includes("proxy")) return "proxy";

  return "unknown";
}

export function isTransientFailure(artifact: RunnerFailureArtifact): boolean {
  if (artifact.class === "timeout") return true;
  if (artifact.class === "network_error") return true;
  if (artifact.class === "http_error" && typeof artifact.status === "number") return httpIsTransient(artifact.status);
  return false;
}

export function mkFailureResponse(artifact: RunnerFailureArtifact, message: string): MinimalAgentResponseOnFailure {
  return {
    case_id: artifact.case_id,
    version: artifact.version,
    proposed_actions: [],
    final_output: { content_type: "text", content: message },
    events: [],
    runner_failure: artifact
  };
}

export async function readAdapterRuntimeHints(
  baseUrl: string,
  probeTimeoutMs: number,
  signal?: AbortSignal
): Promise<AdapterRuntimeHints | undefined> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/health`,
      { method: "GET" },
      Math.max(1000, probeTimeoutMs),
      signal
    );
    if (!res.ok) return undefined;
    const body = (await res.json()) as unknown;
    if (!isRecord(body) || !isRecord(body.runtime)) return undefined;
    const runtime = body.runtime;
    const toPositiveInt = (v: unknown): number | undefined => {
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return undefined;
      return Math.floor(v);
    };
    const hints: AdapterRuntimeHints = {};
    const adapterTimeoutMs = toPositiveInt(runtime.timeout_ms);
    const serverRequestTimeoutMs = toPositiveInt(runtime.server_request_timeout_ms);
    const serverHeadersTimeoutMs = toPositiveInt(runtime.server_headers_timeout_ms);
    const serverKeepAliveTimeoutMs = toPositiveInt(runtime.server_keep_alive_timeout_ms);
    if (typeof adapterTimeoutMs === "number") hints.adapter_timeout_ms = adapterTimeoutMs;
    if (typeof serverRequestTimeoutMs === "number") hints.server_request_timeout_ms = serverRequestTimeoutMs;
    if (typeof serverHeadersTimeoutMs === "number") hints.server_headers_timeout_ms = serverHeadersTimeoutMs;
    if (typeof serverKeepAliveTimeoutMs === "number") hints.server_keep_alive_timeout_ms = serverKeepAliveTimeoutMs;
    return hints;
  } catch {
    return undefined;
  }
}

export async function resolveTimeoutProfileAuto(params: {
  cfg: RunnerConfig;
  selectedCaseIds: string[];
  inactivityExplicit: boolean;
  preflightExplicit: boolean;
  signal?: AbortSignal;
}): Promise<TimeoutAutoResolution> {
  const { cfg, selectedCaseIds, inactivityExplicit, preflightExplicit, signal } = params;
  const baseTimeoutMs = cfg.timeoutMs;
  const history = await collectTimeoutHistorySamples(
    cfg.outDir,
    selectedCaseIds,
    cfg.timeoutAutoLookbackRuns,
    cfg.runId
  );
  const historySuccessSampleCount = history.successLatenciesMs.length;
  const historyFailureSampleCount = history.failureLatenciesMs.length;
  const historySampleCount = historySuccessSampleCount + historyFailureSampleCount;
  const historyCandidateRaw = summarizeHistoryCandidate(history.successLatenciesMs, history.failureLatenciesMs, {
    minSuccessSamples: cfg.timeoutAutoMinSuccessSamples,
  });
  const historyGrowthCapMs = Math.max(
    baseTimeoutMs,
    Math.ceil(baseTimeoutMs * cfg.timeoutAutoMaxIncreaseFactor)
  );
  let historyCandidate = historyCandidateRaw;
  const clampedByGrowth =
    typeof historyCandidateRaw === "number" && historyCandidateRaw > historyGrowthCapMs;
  if (typeof historyCandidateRaw === "number") {
    historyCandidate = Math.min(historyCandidateRaw, historyGrowthCapMs);
  }
  let historyCandidateIgnoredReason: "failure_only_history" | "insufficient_success_samples" | undefined;
  if (historySuccessSampleCount === 0 && historyFailureSampleCount > 0) {
    historyCandidateIgnoredReason = "failure_only_history";
  } else if (
    historySuccessSampleCount > 0 &&
    historySuccessSampleCount < cfg.timeoutAutoMinSuccessSamples
  ) {
    historyCandidateIgnoredReason = "insufficient_success_samples";
  }

  const runtimeHints = await readAdapterRuntimeHints(
    cfg.baseUrl,
    Math.min(Math.max(cfg.preflightTimeoutMs, 1000), 15_000),
    signal
  );
  const adapterTimeoutMs = runtimeHints?.adapter_timeout_ms;
  const serverRequestTimeoutMs = runtimeHints?.server_request_timeout_ms;
  const adapterCandidate = typeof adapterTimeoutMs === "number" ? adapterTimeoutMs + 30_000 : undefined;
  const serverCandidate =
    typeof serverRequestTimeoutMs === "number"
      ? Math.max(1000, serverRequestTimeoutMs - SERVER_TIMEOUT_SAFETY_MARGIN_MS)
      : undefined;

  let recommendedBeforeCaps = baseTimeoutMs;
  if (typeof historyCandidate === "number") recommendedBeforeCaps = Math.max(recommendedBeforeCaps, historyCandidate);
  if (typeof adapterCandidate === "number") recommendedBeforeCaps = Math.max(recommendedBeforeCaps, adapterCandidate);

  let finalTimeoutMs = Math.min(recommendedBeforeCaps, cfg.timeoutAutoCapMs);
  const clampedByCap = finalTimeoutMs < recommendedBeforeCaps;
  const clampedByServerTimeout =
    typeof serverCandidate === "number" && finalTimeoutMs > serverCandidate;
  if (typeof serverCandidate === "number") {
    finalTimeoutMs = Math.min(finalTimeoutMs, serverCandidate);
  }
  cfg.timeoutMs = finalTimeoutMs;

  if (!inactivityExplicit) {
    cfg.inactivityTimeoutMs = Math.max(cfg.timeoutMs + 30_000, 120_000);
  }
  if (!preflightExplicit) {
    cfg.preflightTimeoutMs = Math.min(cfg.timeoutMs, 60_000);
  }

  return {
    profile: "auto",
    base_timeout_ms: baseTimeoutMs,
    selected_case_count: selectedCaseIds.length,
    history_sample_count: historySampleCount,
    history_success_sample_count: historySuccessSampleCount,
    history_failure_sample_count: historyFailureSampleCount,
    ...(typeof historyCandidateRaw === "number" ? { history_candidate_raw_timeout_ms: historyCandidateRaw } : {}),
    ...(typeof historyCandidate === "number" ? { history_candidate_timeout_ms: historyCandidate } : {}),
    ...(typeof historyCandidateIgnoredReason === "string"
      ? { history_candidate_ignored_reason: historyCandidateIgnoredReason }
      : {}),
    ...(typeof historyCandidateRaw === "number" ? { history_candidate_growth_cap_ms: historyGrowthCapMs } : {}),
    ...(typeof historyCandidateRaw === "number" ? { clamped_by_growth: clampedByGrowth } : {}),
    ...(typeof adapterTimeoutMs === "number" ? { adapter_timeout_ms: adapterTimeoutMs } : {}),
    ...(typeof adapterCandidate === "number" ? { adapter_candidate_timeout_ms: adapterCandidate } : {}),
    ...(typeof serverRequestTimeoutMs === "number" ? { server_request_timeout_ms: serverRequestTimeoutMs } : {}),
    ...(typeof serverCandidate === "number" ? { server_timeout_safety_margin_ms: SERVER_TIMEOUT_SAFETY_MARGIN_MS } : {}),
    ...(typeof serverCandidate === "number" ? { server_candidate_timeout_ms: serverCandidate } : {}),
    ...(typeof serverCandidate === "number" ? { clamped_by_server_timeout: clampedByServerTimeout } : {}),
    timeout_cap_ms: cfg.timeoutAutoCapMs,
    final_timeout_ms: cfg.timeoutMs,
    clamped_by_cap: clampedByCap,
  };
}

export async function runPreflight(cfg: RunnerConfig, signal?: AbortSignal): Promise<PreflightResult> {
  if (cfg.preflightMode === "off") {
    return {
      mode: cfg.preflightMode,
      status: "skipped",
      health_ok: false,
      canary_ok: false,
      warnings: ["preflight is disabled (--preflightMode=off)"],
      checked_at: Date.now(),
    };
  }

  const warnings: string[] = [];
  const probeTimeoutMs = cfg.preflightTimeoutMs;
  let canaryTimeoutMs = cfg.preflightTimeoutMs;
  let healthOk = false;
  let canaryOk = false;
  let timeoutContractOk = true;
  let adapterTimeoutMs: number | null = null;
  let serverRequestTimeoutMs: number | null = null;
  const preflightAttempts = Math.max(3, cfg.retries + 1);
  const preflightBackoffBaseMs = Math.max(100, cfg.backoffBaseMs);

  const shouldRetryPreflightFetchError = (err: unknown): boolean => {
    return inferNetErrorKind(err) !== "abort";
  };

  for (let attempt = 1; attempt <= preflightAttempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        `${cfg.baseUrl}/health`,
        { method: "GET" },
        probeTimeoutMs,
        signal
      );
      if (res.ok) {
        healthOk = true;
        try {
          const body = (await res.json()) as unknown;
          if (isRecord(body) && isRecord(body.runtime)) {
            const runtimeTimeout = body.runtime.timeout_ms;
            if (typeof runtimeTimeout === "number" && Number.isFinite(runtimeTimeout) && runtimeTimeout > 0) {
              adapterTimeoutMs = Math.floor(runtimeTimeout);
            }
            const serverRequestTimeout = body.runtime.server_request_timeout_ms;
            if (
              typeof serverRequestTimeout === "number" &&
              Number.isFinite(serverRequestTimeout) &&
              serverRequestTimeout > 0
            ) {
              serverRequestTimeoutMs = Math.floor(serverRequestTimeout);
            }
          }
        } catch {
          // best effort parse only
        }
        break;
      }

      const retryable = httpIsTransient(res.status);
      if (retryable && attempt < preflightAttempts) {
        await sleep(backoffMs(preflightBackoffBaseMs, attempt), signal);
        continue;
      }
      warnings.push(`/health returned HTTP ${res.status}`);
      break;
    } catch (err) {
      const retryable = shouldRetryPreflightFetchError(err);
      if (retryable && attempt < preflightAttempts) {
        await sleep(backoffMs(preflightBackoffBaseMs, attempt), signal);
        continue;
      }
      warnings.push(`/health failed: ${formatFetchFailure(err)}`);
      break;
    }
  }

  if (adapterTimeoutMs !== null && cfg.timeoutMs <= adapterTimeoutMs) {
    timeoutContractOk = false;
    warnings.push(
      `timeout mismatch: runner timeout (${cfg.timeoutMs}ms) <= adapter timeout (${adapterTimeoutMs}ms); increase --timeoutMs or lower adapter timeout`
    );
  }
  if (adapterTimeoutMs !== null && cfg.preflightTimeoutMs < Math.min(cfg.timeoutMs, adapterTimeoutMs)) {
    const requiredWindowMs = Math.min(cfg.timeoutMs, adapterTimeoutMs);
    if (cfg.preflightMode === "strict") {
      canaryTimeoutMs = Math.max(canaryTimeoutMs, requiredWindowMs);
      warnings.push(
        `preflight timeout (${cfg.preflightTimeoutMs}ms) is lower than active request timeout window (runner=${cfg.timeoutMs}ms, adapter=${adapterTimeoutMs}ms); strict mode auto-adjusted canary timeout to ${canaryTimeoutMs}ms`
      );
    } else {
      timeoutContractOk = false;
      warnings.push(
        `preflight timeout (${cfg.preflightTimeoutMs}ms) is lower than active request timeout window (runner=${cfg.timeoutMs}ms, adapter=${adapterTimeoutMs}ms)`
      );
    }
  }
  if (serverRequestTimeoutMs !== null) {
    const serverSafeWindow = Math.max(1000, serverRequestTimeoutMs - SERVER_TIMEOUT_SAFETY_MARGIN_MS);
    if (cfg.timeoutMs > serverSafeWindow) {
      timeoutContractOk = false;
      warnings.push(
        `server timeout mismatch: runner timeout (${cfg.timeoutMs}ms) is above adapter server request timeout safe window (${serverSafeWindow}ms from server=${serverRequestTimeoutMs}ms, safety=${SERVER_TIMEOUT_SAFETY_MARGIN_MS}ms)`
      );
    }
  } else if (healthOk && cfg.timeoutMs > 300_000) {
    warnings.push(
      "adapter /health does not expose server_request_timeout_ms while runner timeout is >300000ms; long requests may still be cut by upstream server timeout"
    );
  }

  const payload: RunCaseRequest = {
    case_id: "__preflight__",
    version: "baseline",
    input: { user: "preflight ping" },
    run_meta: {
      run_id: cfg.runId,
      incident_id: cfg.incidentId,
      ...(cfg.agentId ? { agent_id: cfg.agentId } : {}),
    },
  };
  for (let attempt = 1; attempt <= preflightAttempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        `${cfg.baseUrl}/run-case`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-aq-preflight": "1",
          },
          body: JSON.stringify(payload),
        },
        canaryTimeoutMs,
        signal
      );
      if (!res.ok) {
        const retryable = httpIsTransient(res.status);
        if (retryable && attempt < preflightAttempts) {
          await sleep(backoffMs(preflightBackoffBaseMs, attempt), signal);
          continue;
        }
        warnings.push(`/run-case preflight returned HTTP ${res.status}`);
      } else {
        try {
          const body = (await res.json()) as unknown;
          if (isRecord(body) && typeof body.case_id === "string") {
            canaryOk = true;
          } else {
            warnings.push("/run-case preflight response shape is not recognized");
          }
        } catch (err) {
          warnings.push(`/run-case preflight JSON parse failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      break;
    } catch (err) {
      const retryable = shouldRetryPreflightFetchError(err);
      if (retryable && attempt < preflightAttempts) {
        await sleep(backoffMs(preflightBackoffBaseMs, attempt), signal);
        continue;
      }
      warnings.push(`/run-case preflight failed: ${formatFetchFailure(err)}`);
      break;
    }
  }

  const status: PreflightStatus = healthOk && canaryOk && timeoutContractOk ? "passed" : "failed";
  return {
    mode: cfg.preflightMode,
    status,
    health_ok: healthOk,
    canary_ok: canaryOk,
    warnings,
    checked_at: Date.now(),
  };
}
