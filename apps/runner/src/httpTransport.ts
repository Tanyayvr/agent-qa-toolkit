import * as http from "node:http";
import * as https from "node:https";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

const NODE_HTTP_TRANSPORT_TIMEOUT_THRESHOLD_MS = 300_000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function shouldPreferNodeHttpTransport(url: string, timeoutMs: number): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  return timeoutMs >= NODE_HTTP_TRANSPORT_TIMEOUT_THRESHOLD_MS;
}

function normalizeRequestHeaders(headers: RequestInit["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;

  const h = new Headers(headers);
  for (const [k, v] of h.entries()) {
    out[k] = v;
  }
  return out;
}

function makeAbortError(message: string): Error {
  const err = new Error(message);
  err.name = "AbortError";
  return err;
}

export function extractErrorCode(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const withCause = err as Error & { cause?: unknown; code?: unknown };
  if (typeof withCause.code === "string") return withCause.code;
  const cause = withCause.cause;
  if (isRecord(cause) && typeof cause.code === "string") return cause.code;
  return null;
}

export function shouldUseNodeHttpFallback(err: unknown, url: string): boolean {
  if (!(err instanceof Error)) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (err.name === "AbortError") return false;

  const withCause = err as Error & { cause?: unknown };
  const cause = withCause.cause;
  const causeCode = extractErrorCode(err) ?? "";
  const causeMsg = isRecord(cause) && typeof cause.message === "string" ? cause.message : "";
  const s = `${err.name} ${err.message} ${causeCode} ${causeMsg}`.toLowerCase();

  return s.includes("fetch failed") || s.includes("headers timeout") || s.includes("und_err_headers_timeout");
}

async function nodeHttpFetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const u = new URL(url);
  const isHttps = u.protocol === "https:";
  const client = isHttps ? https : http;
  const method = String(init.method ?? "GET").toUpperCase();
  const headers = normalizeRequestHeaders(init.headers);

  let bodyBuf: Buffer | undefined;
  if (typeof init.body === "string") {
    bodyBuf = Buffer.from(init.body, "utf8");
  } else if (init.body instanceof Uint8Array) {
    bodyBuf = Buffer.from(init.body);
  } else if (init.body === undefined || init.body === null) {
    bodyBuf = undefined;
  } else {
    throw new Error("Unsupported request body type for node HTTP fallback");
  }

  if (bodyBuf && headers["content-length"] === undefined) {
    headers["content-length"] = String(bodyBuf.byteLength);
  }

  return await new Promise<Response>((resolve, reject) => {
    const req = client.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port.length ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
      },
      (res) => {
        cleanup();

        const responseHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) {
            responseHeaders.set(k, v.join(", "));
            continue;
          }
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          }
        }

        const webBody = Readable.toWeb(res as unknown as Readable) as ReadableStream<Uint8Array>;
        resolve(
          new Response(webBody, {
            status: res.statusCode ?? 500,
            statusText: res.statusMessage ?? "",
            headers: responseHeaders,
          })
        );
      }
    );

    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onReqError = (err: Error) => fail(err);
    req.on("error", onReqError);

    const timeout = setTimeout(() => {
      req.destroy(makeAbortError(`This operation was aborted (timeout=${timeoutMs}ms)`));
    }, timeoutMs);

    const onAbort = () => {
      req.destroy(makeAbortError("This operation was aborted"));
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        onAbort();
      } else {
        externalSignal.addEventListener("abort", onAbort, { once: true });
      }
    }

    function cleanup(): void {
      clearTimeout(timeout);
      req.removeListener("error", onReqError);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onAbort);
      }
    }

    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  if (shouldPreferNodeHttpTransport(url, timeoutMs)) {
    // Node fetch/undici may fail around ~300s while waiting for headers on long local-agent calls.
    // For long timeout windows, go directly through node:http(s).
    return await nodeHttpFetchWithTimeout(url, init, timeoutMs, externalSignal);
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onAbort, { once: true });
  }
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (shouldUseNodeHttpFallback(err, url)) {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = Math.max(1, timeoutMs - elapsedMs);
      return await nodeHttpFetchWithTimeout(url, init, remainingMs, externalSignal);
    }
    throw err;
  } finally {
    clearTimeout(t);
    if (externalSignal) externalSignal.removeEventListener("abort", onAbort);
  }
}

export function formatFetchFailure(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts: string[] = [err.message];
  if (err.name === "AbortError") parts.push("type=abort");
  const withCause = err as Error & { cause?: unknown };
  const cause = withCause.cause;
  if (isRecord(cause)) {
    const code = typeof cause.code === "string" ? cause.code : null;
    const syscall = typeof cause.syscall === "string" ? cause.syscall : null;
    const address = typeof cause.address === "string" ? cause.address : null;
    const port = typeof cause.port === "number" ? cause.port : null;
    const causeMessage = typeof cause.message === "string" ? cause.message : null;
    if (code) parts.push(`code=${code}`);
    if (syscall) parts.push(`syscall=${syscall}`);
    if (address) parts.push(`address=${address}`);
    if (port !== null) parts.push(`port=${String(port)}`);
    if (causeMessage && causeMessage !== err.message) parts.push(`cause=${causeMessage}`);
  }
  return parts.join(" | ");
}
