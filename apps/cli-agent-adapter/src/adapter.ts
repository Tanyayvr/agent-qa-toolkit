import express, { type Express, type Request, type Response } from "express";
import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, constants as fsConstants, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { stableStringify, normalizeRunMeta, validateAndNormalizeHandoffEnvelope } from "cli-utils";
import { dirname, isAbsolute, resolve } from "node:path";
import type { HandoffEnvelope, HandoffReceipt, RunMeta } from "shared-types";
import { resolveServerTimeoutConfig } from "./serverConfig";

type CliFailureReason = "timeout" | "spawn_error" | "non_zero_exit" | "aborted" | "invalid_config" | "busy";

type CliRunSuccess = {
  stdout: string;
  stderr: string;
  code: number;
  signal: NodeJS.Signals | null;
};

type CliErrorPayload = {
  code: CliFailureReason;
  message: string;
  exit_code?: number | null;
  exit_signal?: NodeJS.Signals | null;
  stderr_snippet?: string;
  retry_after_ms?: number;
};

type StoredHandoff = {
  envelope: HandoffEnvelope;
  accepted_at: number;
};

type HandoffUpsertResult = {
  status: "accepted" | "duplicate";
  receipt: HandoffReceipt;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_CAP_MS = 120_000;
const DEFAULT_KILL_GRACE_MS = 1_000;
const DEFAULT_STDERR_SNIPPET_CHARS = 1_200;
const DEFAULT_MAX_CONCURRENCY = 1;
const DEFAULT_BUSY_RETRY_AFTER_MS = 1_000;
const DEFAULT_HANDOFF_CONTEXT_MAX_CHARS = 8_000;
const DEFAULT_HANDOFF_MAX_ITEMS = 20;
const DEFAULT_HANDOFF_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const DEFAULT_HANDOFF_MAX_ITEMS_TOTAL = 2_000;
const DEFAULT_AUTH_HEADER = "authorization";

type AdapterAuthConfig = {
  enabled: boolean;
  token: string | null;
  header: string;
};

type HandoffPersistenceConfig = {
  mode: "memory" | "file";
  filePath: string | null;
  ttlMs: number;
  maxItemsTotal: number;
};

export class CliAgentError extends Error {
  readonly reason: CliFailureReason;
  readonly exitCode?: number | null;
  readonly exitSignal?: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(params: {
    reason: CliFailureReason;
    message: string;
    exitCode?: number | null;
    exitSignal?: NodeJS.Signals | null;
    stdout?: string;
    stderr?: string;
  }) {
    super(params.message);
    this.name = "CliAgentError";
    this.reason = params.reason;
    if (params.exitCode !== undefined) this.exitCode = params.exitCode;
    if (params.exitSignal !== undefined) this.exitSignal = params.exitSignal;
    this.stdout = params.stdout ?? "";
    this.stderr = params.stderr ?? "";
  }
}

export function parseArgs(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ignore malformed JSON and fallback to shell-like splitting
  }
  return raw.split(" ").map((s) => s.trim()).filter(Boolean);
}

function boolEnv(env: NodeJS.ProcessEnv, name: string, def = false): boolean {
  const v = env[name];
  if (v === undefined) return def;
  return v === "1" || v.toLowerCase() === "true";
}

function intEnv(env: NodeJS.ProcessEnv, name: string, def: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim().length === 0) return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new CliAgentError({
      reason: "invalid_config",
      message: `Invalid env ${name}: ${raw}. Must be a positive number.`,
    });
  }
  return Math.floor(n);
}

function resolveAuthConfig(env: NodeJS.ProcessEnv): AdapterAuthConfig {
  const tokenRaw = env.CLI_AGENT_AUTH_TOKEN;
  const token = tokenRaw && tokenRaw.trim().length > 0 ? tokenRaw.trim() : null;
  const headerRaw = env.CLI_AGENT_AUTH_HEADER?.trim().toLowerCase();
  const header = headerRaw && headerRaw.length > 0 ? headerRaw : DEFAULT_AUTH_HEADER;
  return {
    enabled: token !== null,
    token,
    header,
  };
}

function extractAuthValue(req: Request, header: string): string | null {
  const raw = req.header(header);
  if (!raw || raw.trim().length === 0) return null;
  const value = raw.trim();
  if (header === "authorization") {
    const m = /^bearer\s+(.+)$/i.exec(value);
    if (m && m[1]) return m[1].trim();
  }
  return value;
}

function isAuthorized(req: Request, auth: AdapterAuthConfig): boolean {
  if (!auth.enabled || !auth.token) return true;
  const value = extractAuthValue(req, auth.header);
  return value === auth.token;
}

function resolveHandoffPersistenceConfig(env: NodeJS.ProcessEnv): HandoffPersistenceConfig {
  const configuredPath = env.CLI_AGENT_HANDOFF_STORE_PATH?.trim();
  const ttlMs = intEnv(env, "CLI_AGENT_HANDOFF_TTL_MS", DEFAULT_HANDOFF_TTL_MS);
  const maxItemsTotal = intEnv(env, "CLI_AGENT_HANDOFF_MAX_ITEMS_TOTAL", DEFAULT_HANDOFF_MAX_ITEMS_TOTAL);
  if (!configuredPath) {
    return {
      mode: "memory",
      filePath: null,
      ttlMs,
      maxItemsTotal,
    };
  }
  return {
    mode: "file",
    filePath: configuredPath,
    ttlMs,
    maxItemsTotal,
  };
}

type TimeoutResolution = {
  requestedMs: number;
  capMs: number;
  effectiveMs: number;
  clamped: boolean;
};

function resolveTimeoutMs(env: NodeJS.ProcessEnv): TimeoutResolution {
  const requestedMs = intEnv(env, "CLI_AGENT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const capMs = intEnv(env, "CLI_AGENT_TIMEOUT_CAP_MS", DEFAULT_TIMEOUT_CAP_MS);
  const effectiveMs = Math.min(requestedMs, capMs);
  return {
    requestedMs,
    capMs,
    effectiveMs,
    clamped: requestedMs > capMs,
  };
}

function getRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v || v.trim().length === 0) {
    throw new CliAgentError({
      reason: "invalid_config",
      message: `Missing required env: ${name}`,
    });
  }
  return v;
}

export function normalizeStderrSnippet(stderr: string, maxChars = DEFAULT_STDERR_SNIPPET_CHARS): string {
  const noAnsi = stderr.replace(/\u001b\[[0-9;]*m/g, "");
  const singleLine = noAnsi.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxChars) return singleLine;
  return `${singleLine.slice(0, maxChars)}...`;
}

export function buildPrompt(input: { user?: string; context?: unknown } | undefined): string {
  const user = input?.user ?? "";
  const ctx = input?.context;
  if (ctx === undefined) return user;
  return `${user}\n\nContext:\n${JSON.stringify(ctx, null, 2)}`;
}

function formatHandoffContext(
  runMeta: RunMeta | undefined,
  handoffs: StoredHandoff[],
  maxChars: number
): string | null {
  if (!runMeta?.incident_id || !runMeta.agent_id || handoffs.length === 0) return null;
  const payload = {
    incident_id: runMeta.incident_id,
    agent_id: runMeta.agent_id,
    handoffs: handoffs.map((h) => ({
      handoff_id: h.envelope.handoff_id,
      from_agent_id: h.envelope.from_agent_id,
      to_agent_id: h.envelope.to_agent_id,
      objective: h.envelope.objective,
      constraints: h.envelope.constraints,
      decision_thresholds: h.envelope.decision_thresholds,
      state_delta: h.envelope.state_delta,
      tool_result_refs: h.envelope.tool_result_refs,
      retrieval_refs: h.envelope.retrieval_refs,
      trace_anchor: h.envelope.trace_anchor,
      parent_handoff_id: h.envelope.parent_handoff_id,
      schema_version: h.envelope.schema_version,
      created_at: h.envelope.created_at,
      checksum: h.envelope.checksum,
    })),
  };

  const json = stableStringify(payload);
  const bounded = json.length > maxChars ? `${json.slice(0, maxChars)}...[truncated]` : json;
  return `[runtime_handoff_context]\n${bounded}\n\n`;
}

function buildRunCasePrompt(
  basePrompt: string,
  runMeta: RunMeta | undefined,
  handoffs: StoredHandoff[],
  includeHandoffContext: boolean,
  maxChars: number
): string {
  if (!includeHandoffContext) return basePrompt;
  const handoffBlock = formatHandoffContext(runMeta, handoffs, maxChars);
  if (!handoffBlock) return basePrompt;
  return `${handoffBlock}[user_request]\n${basePrompt}`;
}

function killProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  const pid = child.pid;
  if (typeof pid === "number" && pid > 0 && process.platform !== "win32") {
    try {
      process.kill(-pid, signal);
    } catch {
      // ignore; fallback to direct child kill below
    }
  }
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
}

function createCliErrorPayload(err: unknown, stderrSnippetChars: number): CliErrorPayload {
  if (err instanceof CliAgentError) {
    const payload: CliErrorPayload = {
      code: err.reason,
      message: err.message,
    };
    if (err.exitCode !== undefined) payload.exit_code = err.exitCode;
    if (err.exitSignal !== undefined) payload.exit_signal = err.exitSignal;
    const snippet = normalizeStderrSnippet(err.stderr, stderrSnippetChars);
    if (snippet) payload.stderr_snippet = snippet;
    return payload;
  }
  return {
    code: "spawn_error",
    message: err instanceof Error ? err.message : String(err),
  };
}

function upsertHandoff(
  store: Map<string, Map<string, StoredHandoff>>,
  envelope: HandoffEnvelope
): HandoffUpsertResult {
  const now = Date.now();
  const incidentMap = store.get(envelope.incident_id) ?? new Map<string, StoredHandoff>();
  const existing = incidentMap.get(envelope.handoff_id);
  if (existing) {
    if (existing.envelope.checksum !== envelope.checksum) {
      throw new CliAgentError({
        reason: "invalid_config",
        message: `handoff conflict for incident=${envelope.incident_id} handoff_id=${envelope.handoff_id}: checksum mismatch`,
      });
    }
    const receipt: HandoffReceipt = {
      incident_id: existing.envelope.incident_id,
      handoff_id: existing.envelope.handoff_id,
      from_agent_id: existing.envelope.from_agent_id,
      to_agent_id: existing.envelope.to_agent_id,
      checksum: existing.envelope.checksum,
      accepted_at: existing.accepted_at,
      status: "duplicate",
    };
    if (!store.has(envelope.incident_id)) {
      store.set(envelope.incident_id, incidentMap);
    }
    return { status: "duplicate", receipt };
  }

  const stored: StoredHandoff = {
    envelope,
    accepted_at: now,
  };
  incidentMap.set(envelope.handoff_id, stored);
  store.set(envelope.incident_id, incidentMap);

  return {
    status: "accepted",
    receipt: {
      incident_id: envelope.incident_id,
      handoff_id: envelope.handoff_id,
      from_agent_id: envelope.from_agent_id,
      to_agent_id: envelope.to_agent_id,
      checksum: envelope.checksum,
      accepted_at: now,
      status: "accepted",
    },
  };
}

type PersistedHandoffStore = {
  version: 1;
  saved_at: number;
  items: Array<{
    envelope: HandoffEnvelope;
    accepted_at: number;
  }>;
};

function flattenHandoffStore(store: Map<string, Map<string, StoredHandoff>>): StoredHandoff[] {
  const out: StoredHandoff[] = [];
  for (const incident of store.values()) {
    for (const item of incident.values()) out.push(item);
  }
  return out;
}

function pruneHandoffStore(
  store: Map<string, Map<string, StoredHandoff>>,
  ttlMs: number,
  maxItemsTotal: number,
  now = Date.now()
): boolean {
  const beforeKeys = new Set(
    flattenHandoffStore(store).map((x) => `${x.envelope.incident_id}::${x.envelope.handoff_id}::${x.accepted_at}`)
  );
  const keepAfter = now - ttlMs;
  const all = flattenHandoffStore(store)
    .filter((x) => x.accepted_at >= keepAfter)
    .sort((a, b) => b.accepted_at - a.accepted_at);
  const limited = all.slice(0, maxItemsTotal);

  const rebuilt = new Map<string, Map<string, StoredHandoff>>();
  for (const item of limited) {
    const incidentMap = rebuilt.get(item.envelope.incident_id) ?? new Map<string, StoredHandoff>();
    incidentMap.set(item.envelope.handoff_id, item);
    rebuilt.set(item.envelope.incident_id, incidentMap);
  }

  const afterKeys = new Set(
    limited.map((x) => `${x.envelope.incident_id}::${x.envelope.handoff_id}::${x.accepted_at}`)
  );
  const changed =
    beforeKeys.size !== afterKeys.size ||
    Array.from(beforeKeys).some((k) => !afterKeys.has(k));

  if (changed) {
    store.clear();
    for (const [k, v] of rebuilt.entries()) {
      store.set(k, v);
    }
  }

  return changed;
}

function loadHandoffStoreFromFile(filePath: string): Map<string, Map<string, StoredHandoff>> {
  const store = new Map<string, Map<string, StoredHandoff>>();
  let raw = "";
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return store;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedHandoffStore | unknown;
    if (!parsed || typeof parsed !== "object") return store;
    const items = (parsed as PersistedHandoffStore).items;
    if (!Array.isArray(items)) return store;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const acceptedAt = typeof item.accepted_at === "number" && Number.isFinite(item.accepted_at)
        ? Math.floor(item.accepted_at)
        : Date.now();
      try {
        const envelope = validateAndNormalizeHandoffEnvelope((item as { envelope?: unknown }).envelope);
        const incidentMap = store.get(envelope.incident_id) ?? new Map<string, StoredHandoff>();
        incidentMap.set(envelope.handoff_id, {
          envelope,
          accepted_at: acceptedAt,
        });
        store.set(envelope.incident_id, incidentMap);
      } catch {
        // Skip corrupted or invalid envelopes in persisted file.
      }
    }
  } catch {
    return store;
  }
  return store;
}

async function persistHandoffStoreToFile(
  filePath: string,
  store: Map<string, Map<string, StoredHandoff>>
): Promise<void> {
  const items = flattenHandoffStore(store)
    .sort((a, b) => a.accepted_at - b.accepted_at)
    .map((x) => ({
      envelope: x.envelope,
      accepted_at: x.accepted_at,
    }));

  const payload: PersistedHandoffStore = {
    version: 1,
    saved_at: Date.now(),
    items,
  };

  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), "utf-8");
  await rename(tmp, filePath);
}

function getIncidentHandoffs(
  store: Map<string, Map<string, StoredHandoff>>,
  runMeta: RunMeta | undefined,
  maxItems: number
): StoredHandoff[] {
  if (!runMeta?.incident_id || !runMeta.agent_id) return [];
  const incident = store.get(runMeta.incident_id);
  if (!incident) return [];
  const all = Array.from(incident.values())
    .filter((x) => x.envelope.to_agent_id === runMeta.agent_id)
    .sort((a, b) => a.envelope.created_at - b.envelope.created_at);
  if (all.length <= maxItems) return all;
  return all.slice(all.length - maxItems);
}

function getExecutable(env: NodeJS.ProcessEnv): { cmd: string; args: string[]; useStdin: boolean; cwd?: string } {
  const cmd = getRequiredEnv(env, "CLI_AGENT_CMD");
  const args = parseArgs(env.CLI_AGENT_ARGS);
  const useStdin = boolEnv(env, "CLI_AGENT_USE_STDIN", false);
  const cwd = env.CLI_AGENT_WORKDIR;

  const resolvedCmd =
    cwd && !isAbsolute(cmd) && (cmd.includes("/") || cmd.includes("\\"))
      ? resolve(cwd, cmd)
      : cmd;

  if (/[\r\n]/.test(resolvedCmd)) {
    throw new CliAgentError({
      reason: "invalid_config",
      message:
        "Invalid env CLI_AGENT_CMD: contains a newline. Use a single-line path or executable name.",
    });
  }

  if (isAbsolute(resolvedCmd)) {
    try {
      accessSync(resolvedCmd, fsConstants.X_OK);
    } catch {
      throw new CliAgentError({
        reason: "invalid_config",
        message: `Invalid env CLI_AGENT_CMD: executable not found or not executable: ${resolvedCmd}`,
      });
    }
  }

  if (cwd && cwd.trim().length > 0) {
    return { cmd: resolvedCmd, args, useStdin, cwd };
  }
  return { cmd: resolvedCmd, args, useStdin };
}

async function runCliAgent(
  prompt: string,
  env: NodeJS.ProcessEnv,
  signal?: AbortSignal
): Promise<CliRunSuccess> {
  const timeout = resolveTimeoutMs(env);
  const timeoutMs = timeout.effectiveMs;
  const killGraceMs = intEnv(env, "CLI_AGENT_KILL_GRACE_MS", DEFAULT_KILL_GRACE_MS);
  const { cmd, args, useStdin, cwd } = getExecutable(env);

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, useStdin ? args : [...args, prompt], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let forceKillTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
        forceKillTimer = null;
      }
      if (signal) signal.removeEventListener("abort", onAbort);
    };

    const settleOnce = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const requestTermination = () => {
      killProcessGroup(child, "SIGTERM");
      if (!forceKillTimer) {
        forceKillTimer = setTimeout(() => killProcessGroup(child, "SIGKILL"), killGraceMs);
        const timerLike = forceKillTimer as unknown as { unref?: () => void };
        if (typeof timerLike.unref === "function") timerLike.unref();
      }
    };

    const timeoutTimer = setTimeout(() => {
      requestTermination();
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "timeout",
            message: `CLI agent timed out after ${timeoutMs}ms${timeout.clamped ? ` (requested=${timeout.requestedMs}ms capped=${timeout.capMs}ms)` : ""}`,
            stdout,
            stderr,
          })
        )
      );
    }, timeoutMs);

    const onAbort = () => {
      requestTermination();
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "aborted",
            message: "CLI agent request aborted by caller",
            stdout,
            stderr,
          })
        )
      );
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "spawn_error",
            message: err.message,
            stdout,
            stderr,
          })
        )
      );
    });

    child.on("close", (code, exitSignal) => {
      if (code === 0) {
        settleOnce(() =>
          resolvePromise({
            stdout,
            stderr,
            code: 0,
            signal: exitSignal,
          })
        );
        return;
      }
      settleOnce(() =>
        rejectPromise(
          new CliAgentError({
            reason: "non_zero_exit",
            message: `CLI agent exited with code=${String(code)} signal=${String(exitSignal)}`,
            exitCode: code,
            exitSignal,
            stdout,
            stderr,
          })
        )
      );
    });

    if (useStdin) {
      child.stdin.write(prompt);
      child.stdin.end();
    }
  });
}

export function createCliAgentAdapterApp(env: NodeJS.ProcessEnv = process.env): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  let activeCliProcesses = 0;
  const authConfig = resolveAuthConfig(env);
  const handoffPersistence = resolveHandoffPersistenceConfig(env);
  const handoffStore =
    handoffPersistence.mode === "file" && handoffPersistence.filePath
      ? loadHandoffStoreFromFile(handoffPersistence.filePath)
      : new Map<string, Map<string, StoredHandoff>>();
  let persistWriteChain: Promise<void> = Promise.resolve();

  const persistHandoffStoreIfEnabled = async (): Promise<void> => {
    if (handoffPersistence.mode !== "file" || !handoffPersistence.filePath) return;
    await persistHandoffStoreToFile(handoffPersistence.filePath, handoffStore);
  };

  const queuePersistHandoffStoreIfEnabled = async (): Promise<void> => {
    if (handoffPersistence.mode !== "file" || !handoffPersistence.filePath) return;
    // Serialize writes to avoid out-of-order snapshots under concurrent requests.
    persistWriteChain = persistWriteChain
      .catch(() => {
        // Keep queue alive after a failed write; current call will attempt a fresh snapshot.
      })
      .then(async () => {
        await persistHandoffStoreToFile(handoffPersistence.filePath as string, handoffStore);
      });
    await persistWriteChain;
  };

  const persistHandoffStoreAfterMutation = async (): Promise<void> => {
    pruneHandoffStore(
      handoffStore,
      handoffPersistence.ttlMs,
      handoffPersistence.maxItemsTotal
    );
    await queuePersistHandoffStoreIfEnabled();
  };

  const pruneAndPersistHandoffStore = async (): Promise<void> => {
    const changed = pruneHandoffStore(
      handoffStore,
      handoffPersistence.ttlMs,
      handoffPersistence.maxItemsTotal
    );
    if (changed) await persistHandoffStoreIfEnabled();
  };

  const stderrSnippetChars = intEnv(env, "CLI_AGENT_STDERR_SNIPPET_CHARS", DEFAULT_STDERR_SNIPPET_CHARS);
  const timeout = resolveTimeoutMs(env);
  const killGraceMs = intEnv(env, "CLI_AGENT_KILL_GRACE_MS", DEFAULT_KILL_GRACE_MS);
  const useStdin = boolEnv(env, "CLI_AGENT_USE_STDIN", false);
  const maxConcurrency = intEnv(env, "CLI_AGENT_MAX_CONCURRENCY", DEFAULT_MAX_CONCURRENCY);
  const busyRetryAfterMs = intEnv(env, "CLI_AGENT_BUSY_RETRY_AFTER_MS", DEFAULT_BUSY_RETRY_AFTER_MS);
  const includeHandoffContext = boolEnv(env, "CLI_AGENT_INCLUDE_HANDOFF_CONTEXT", true);
  const handoffContextMaxChars = intEnv(env, "CLI_AGENT_HANDOFF_CONTEXT_MAX_CHARS", DEFAULT_HANDOFF_CONTEXT_MAX_CHARS);
  const handoffMaxItems = intEnv(env, "CLI_AGENT_HANDOFF_MAX_ITEMS", DEFAULT_HANDOFF_MAX_ITEMS);
  const serverTimeouts = resolveServerTimeoutConfig(env);

  app.use((req: Request, res: Response, next) => {
    if (!(req.path === "/run-case" || req.path === "/handoff")) {
      next();
      return;
    }
    if (isAuthorized(req, authConfig)) {
      next();
      return;
    }
    res.status(401).json({
      ok: false,
      error: "unauthorized",
      message: `Missing or invalid auth token (${authConfig.header})`,
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    pruneHandoffStore(
      handoffStore,
      handoffPersistence.ttlMs,
      handoffPersistence.maxItemsTotal
    );
    let totalHandoffs = 0;
    for (const incident of handoffStore.values()) totalHandoffs += incident.size;
    res.json({
      ok: true,
      active_cli_processes: activeCliProcesses,
      max_cli_processes: maxConcurrency,
      handoff_incidents: handoffStore.size,
      handoff_items_total: totalHandoffs,
      runtime: {
        timeout_ms: timeout.effectiveMs,
        timeout_requested_ms: timeout.requestedMs,
        timeout_cap_ms: timeout.capMs,
        timeout_clamped: timeout.clamped,
        kill_grace_ms: killGraceMs,
        stderr_snippet_chars: stderrSnippetChars,
        use_stdin: useStdin,
        busy_retry_after_ms: busyRetryAfterMs,
        include_handoff_context: includeHandoffContext,
        handoff_context_max_chars: handoffContextMaxChars,
        handoff_max_items: handoffMaxItems,
        handoff_store_mode: handoffPersistence.mode,
        handoff_store_path: handoffPersistence.filePath,
        handoff_ttl_ms: handoffPersistence.ttlMs,
        handoff_max_items_total: handoffPersistence.maxItemsTotal,
        auth_enabled: authConfig.enabled,
        auth_header: authConfig.header,
        server_request_timeout_ms: serverTimeouts.requestTimeoutMs,
        server_headers_timeout_ms: serverTimeouts.headersTimeoutMs,
        server_keep_alive_timeout_ms: serverTimeouts.keepAliveTimeoutMs,
      },
    });
  });

  app.post("/handoff", async (req: Request, res: Response) => {
    try {
      const normalized = validateAndNormalizeHandoffEnvelope(req.body);
      const upsert = upsertHandoff(handoffStore, normalized);
      await persistHandoffStoreAfterMutation();
      res.status(upsert.status === "duplicate" ? 200 : 201).json({
        ok: true,
        receipt: upsert.receipt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = msg.includes("checksum mismatch") ? 409 : 400;
      res.status(code).json({
        ok: false,
        error: "invalid_handoff",
        message: msg,
      });
    }
  });

  app.post("/run-case", async (req: Request, res: Response) => {
    const caseId = typeof req.body?.case_id === "string" ? req.body.case_id : "";
    const version = req.body?.version === "baseline" || req.body?.version === "new" ? req.body.version : "baseline";
    const basePrompt = buildPrompt(req.body?.input);
    const runMeta = normalizeRunMeta(req.body?.run_meta);
    const preflightHeader = req.header("x-aq-preflight");
    const isPreflightProbe = caseId === "__preflight__" || preflightHeader === "1";

    // Keep runner preflight deterministic and cheap: validate adapter config/transport
    // without invoking a long-running external CLI process.
    if (isPreflightProbe) {
      try {
        getExecutable(env);
        res.json({
          case_id: caseId || "__preflight__",
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: [],
          final_output: {
            content_type: "text",
            content: "[adapter:preflight] ok",
          },
          events: [],
          preflight: { ok: true },
        });
      } catch (err) {
        const adapterError = createCliErrorPayload(err, stderrSnippetChars);
        res.status(500).json({
          case_id: caseId || "__preflight__",
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: [],
          final_output: {
            content_type: "text",
            content: `[adapter:${adapterError.code}] ${adapterError.message}`,
          },
          events: [],
          adapter_error: adapterError,
          preflight: { ok: false },
        });
      }
      return;
    }

    let inlineHandoffReceipt: HandoffReceipt | undefined;
    if (req.body?.handoff !== undefined) {
      try {
        const normalized = validateAndNormalizeHandoffEnvelope(req.body.handoff);
        inlineHandoffReceipt = upsertHandoff(handoffStore, normalized).receipt;
        await persistHandoffStoreAfterMutation();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({
          case_id: caseId,
          version,
          workflow_id: "cli_agent_v1",
          proposed_actions: [],
          final_output: {
            content_type: "text",
            content: `[adapter:invalid_handoff] ${msg}`,
          },
          events: [],
          adapter_error: {
            code: "invalid_config",
            message: msg,
          },
        });
        return;
      }
    }
    await pruneAndPersistHandoffStore();
    const availableHandoffs = getIncidentHandoffs(handoffStore, runMeta, handoffMaxItems);
    const prompt = buildRunCasePrompt(
      basePrompt,
      runMeta,
      availableHandoffs,
      includeHandoffContext,
      handoffContextMaxChars
    );
    const handoffReceipts: HandoffReceipt[] = [
      ...(inlineHandoffReceipt ? [inlineHandoffReceipt] : []),
      ...availableHandoffs.map((h) => ({
        incident_id: h.envelope.incident_id,
        handoff_id: h.envelope.handoff_id,
        from_agent_id: h.envelope.from_agent_id,
        to_agent_id: h.envelope.to_agent_id,
        checksum: h.envelope.checksum,
        accepted_at: h.accepted_at,
        status: "available" as const,
      })),
    ];
    const requestAbort = new AbortController();
    req.on("aborted", () => {
      requestAbort.abort();
    });
    res.on("close", () => {
      if (!res.writableEnded) requestAbort.abort();
    });

    if (activeCliProcesses >= maxConcurrency) {
      const adapterError: CliErrorPayload = {
        code: "busy",
        message: `CLI adapter busy: active=${activeCliProcesses}, max=${maxConcurrency}`,
        retry_after_ms: busyRetryAfterMs,
      };
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(busyRetryAfterMs / 1000))));
      res.status(429).json({
        case_id: caseId,
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: [],
        final_output: {
          content_type: "text",
          content: `[adapter:busy] ${adapterError.message}`,
        },
        events: [],
        adapter_error: adapterError,
      });
      return;
    }

    activeCliProcesses += 1;
    try {
      const result = await runCliAgent(prompt, env, requestAbort.signal);
      const output = (result.stdout || result.stderr || "").trim();

      res.json({
        case_id: caseId,
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: output },
        events: [],
        ...(runMeta ? { run_meta: runMeta } : {}),
        ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
      });
    } catch (err) {
      if (requestAbort.signal.aborted) return;
      const adapterError = createCliErrorPayload(err, stderrSnippetChars);
      const output = `[adapter:${adapterError.code}] ${adapterError.message}${adapterError.stderr_snippet ? ` | stderr: ${adapterError.stderr_snippet}` : ""}`;
      res.status(500).json({
        case_id: caseId,
        version,
        workflow_id: "cli_agent_v1",
        proposed_actions: [],
        final_output: { content_type: "text", content: output },
        events: [],
        ...(runMeta ? { run_meta: runMeta } : {}),
        ...(handoffReceipts.length > 0 ? { handoff_receipts: handoffReceipts } : {}),
        adapter_error: adapterError,
      });
    } finally {
      activeCliProcesses = Math.max(0, activeCliProcesses - 1);
    }
  });

  return app;
}

export const __test__ = {
  createCliErrorPayload,
  intEnv,
  resolveAuthConfig,
  isAuthorized,
  resolveHandoffPersistenceConfig,
  resolveTimeoutMs,
  getExecutable,
  formatHandoffContext,
  buildRunCasePrompt,
  upsertHandoff,
  pruneHandoffStore,
  loadHandoffStoreFromFile,
  persistHandoffStoreToFile,
  getIncidentHandoffs,
};
