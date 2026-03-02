const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_CAP_MS = 120_000;
const DEFAULT_SERVER_TIMEOUT_BUFFER_MS = 120_000;
const DEFAULT_SERVER_HEADERS_TIMEOUT_MS = 60_000;
const DEFAULT_SERVER_KEEP_ALIVE_TIMEOUT_MS = 5_000;

function intEnvNonNegative(env: NodeJS.ProcessEnv, name: string, def: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim().length === 0) return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid env ${name}: ${raw}. Must be a non-negative number.`);
  }
  return Math.floor(n);
}

function intEnvPositive(env: NodeJS.ProcessEnv, name: string, def: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim().length === 0) return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid env ${name}: ${raw}. Must be a positive number.`);
  }
  return Math.floor(n);
}

function resolveCliTimeoutMs(env: NodeJS.ProcessEnv): number {
  const requestedMs = intEnvPositive(env, "CLI_AGENT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const capMs = intEnvPositive(env, "CLI_AGENT_TIMEOUT_CAP_MS", DEFAULT_TIMEOUT_CAP_MS);
  return Math.min(requestedMs, capMs);
}

export type ServerTimeoutConfig = {
  requestTimeoutMs: number;
  headersTimeoutMs: number;
  keepAliveTimeoutMs: number;
  cliTimeoutMs: number;
  timeoutBufferMs: number;
};

export function resolveServerTimeoutConfig(env: NodeJS.ProcessEnv): ServerTimeoutConfig {
  const cliTimeoutMs = resolveCliTimeoutMs(env);
  const timeoutBufferMs = intEnvNonNegative(env, "CLI_AGENT_SERVER_TIMEOUT_BUFFER_MS", DEFAULT_SERVER_TIMEOUT_BUFFER_MS);

  const requestTimeoutMs = intEnvNonNegative(
    env,
    "CLI_AGENT_SERVER_REQUEST_TIMEOUT_MS",
    cliTimeoutMs + timeoutBufferMs
  );

  const keepAliveTimeoutMs = intEnvPositive(
    env,
    "CLI_AGENT_SERVER_KEEP_ALIVE_TIMEOUT_MS",
    DEFAULT_SERVER_KEEP_ALIVE_TIMEOUT_MS
  );

  const defaultHeadersTimeoutMs =
    requestTimeoutMs === 0
      ? DEFAULT_SERVER_HEADERS_TIMEOUT_MS
      : requestTimeoutMs + 1_000;

  const requestedHeadersTimeoutMs = intEnvPositive(
    env,
    "CLI_AGENT_SERVER_HEADERS_TIMEOUT_MS",
    defaultHeadersTimeoutMs
  );

  const headersTimeoutMs =
    requestTimeoutMs === 0
      ? requestedHeadersTimeoutMs
      : Math.max(requestedHeadersTimeoutMs, requestTimeoutMs + 1_000);

  return {
    requestTimeoutMs,
    headersTimeoutMs,
    keepAliveTimeoutMs,
    cliTimeoutMs,
    timeoutBufferMs,
  };
}
