//tool/apps/runner/src/index.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { TextDecoder } from "node:util";
import type { ReadableStream } from "node:stream/web";

type Version = "baseline" | "new";

type CaseFileItem = {
  id: string;
  title: string;
  input: { user: string; context?: unknown };
  expected?: unknown;
  metadata?: unknown;
};

type RunCaseRequest = {
  case_id: string;
  version: Version;
  input: { user: string; context?: unknown };
};

type RunnerConfig = {
  repoRoot: string;
  baseUrl: string;
  casesPath: string;
  outDir: string;
  runId: string;
  onlyCaseIds: string[] | null;
  dryRun: boolean;

  timeoutMs: number;
  retries: number;
  backoffBaseMs: number;
  concurrency: number;

  bodySnippetBytes: number;

  maxBodyBytes: number;
  saveFullBodyOnError: boolean;
};

type FetchFailureClass = "http_error" | "timeout" | "network_error" | "invalid_json";

type NetErrorKind =
  | "dns"
  | "tls"
  | "conn_refused"
  | "conn_reset"
  | "socket_hang_up"
  | "proxy"
  | "abort"
  | "unknown";

type RunnerFailureArtifact = {
  type: "runner_fetch_failure";
  class: FetchFailureClass;
  net_error_kind?: NetErrorKind;
  is_transient?: boolean;

  case_id: string;
  version: Version;
  url: string;
  attempt: number;
  timeout_ms: number;
  latency_ms: number;

  status?: number;
  status_text?: string;
  http_is_transient?: boolean;

  error_name?: string;
  error_message?: string;

  body_snippet?: string;

  full_body_saved_to?: string;
  full_body_meta_saved_to?: string;
  body_truncated?: boolean;
  body_bytes_written?: number;
  max_body_bytes?: number;
};

type MinimalAgentResponseOnFailure = {
  case_id: string;
  version: Version;
  workflow_id?: string;
  proposed_actions: unknown[];
  final_output: { content_type: "text"; content: string };
  events: unknown[];
  runner_failure: RunnerFailureArtifact;
};

const HELP_TEXT = `
Usage:
  runner [--repoRoot <path>] [--baseUrl <url>] [--cases <path>] [--outDir <dir>] [--runId <id>] [--only <ids>] [--dryRun]
         [--timeoutMs <ms>] [--retries <n>] [--backoffBaseMs <ms>] [--concurrency <n>]
         [--bodySnippetBytes <n>] [--maxBodyBytes <n>] [--noSaveFullBodyOnError]

Options:
  --repoRoot                Repo root (default: INIT_CWD or cwd)
  --baseUrl                 Agent base URL (default: http://localhost:8787)
  --cases                   Path to cases JSON (default: cases/cases.json)
  --outDir                  Output directory (default: apps/runner/runs)
  --runId                   Run id (default: random UUID)
  --only                    Comma-separated case ids (e.g. tool_001,fmt_002)
  --dryRun                  Do not call the agent, only print selected cases

Reliability (benchmark mode; defaults are conservative):
  --timeoutMs               Per-request timeout in ms (default: 15000)
  --retries                 Retries per request (default: 2)
  --backoffBaseMs           Base backoff in ms (default: 250)
  --concurrency             Max concurrent cases (default: 1)

Artifacts / memory limits:
  --bodySnippetBytes        Error body snippet size in bytes (default: 4000)
  --maxBodyBytes            Max bytes to write/read for a response body (default: 2000000)
  --noSaveFullBodyOnError   Do not write full error bodies to disk (default: save enabled)

  --help, -h                Show this help

Exit codes:
  0  success
  1  runtime error
  2  bad arguments / usage

Examples:
  ts-node src/index.ts --cases cases/cases.json --outDir apps/runner/runs --runId latest --only tool_001,fmt_002
  ts-node src/index.ts --baseUrl http://localhost:8787 --cases cases/cases.json --runId latest
`.trim();

class CliUsageError extends Error {
  public readonly exitCode = 2;
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

function hasFlag(...names: string[]): boolean {
  return names.some((n) => process.argv.includes(n));
}

function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function getFlag(name: string): boolean {
  return process.argv.includes(name);
}

function assertNoUnknownOptions(allowed: Set<string>): void {
  const args = process.argv.slice(2);
  for (const a of args) {
    if (a.startsWith("--") && !allowed.has(a)) {
      throw new CliUsageError(`Unknown option: ${a}\n\n${HELP_TEXT}`);
    }
  }
}

function assertHasValue(flag: string): void {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) {
    throw new CliUsageError(`Missing value for ${flag}\n\n${HELP_TEXT}`);
  }
}

function parseIntFlag(name: string, def: number): number {
  const raw = getArg(name);
  if (raw === null) return def;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new CliUsageError(`Invalid integer for ${name}: ${raw}\n\n${HELP_TEXT}`);
  return n;
}

function parseOnlyCaseIds(): string[] | null {
  const raw = getArg("--only");
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return ids.length ? ids : null;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveFromRoot(repoRoot: string, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(repoRoot, p);
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseCasesJson(raw: string): CaseFileItem[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("cases.json must be an array");

  return parsed.map((x) => {
    if (!isRecord(x)) throw new Error("cases.json element must be an object");

    const id = String(x.id);
    const title = String(x.title ?? "");
    const inputObj = isRecord(x.input) ? x.input : {};
    const user = String(inputObj.user ?? "");
    const context = inputObj.context;

    return { id, title, input: { user, context }, expected: x.expected, metadata: x.metadata };
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(base: number, attempt: number): number {
  const exp = Math.min(6, Math.max(0, attempt - 1));
  const raw = base * Math.pow(2, exp);
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(raw * 0.2)));
  return raw + jitter;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function toRel(repoRoot: string, abs: string): string {
  const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
  return rel.length ? rel : path.basename(abs);
}

function snippetFromBytes(bytes: Uint8Array, maxBytes: number): string {
  if (maxBytes <= 0) return "";
  const cut = bytes.byteLength <= maxBytes ? bytes : bytes.slice(0, maxBytes);
  const dec = new TextDecoder("utf-8", { fatal: false });
  return dec.decode(cut);
}

type SavedBody = {
  bodyRel?: string;
  metaRel?: string;
  truncated: boolean;
  bytes_written: number;
  snippet: string;
};

async function writeStreamOnceDrain(stream: ReturnType<typeof createWriteStream>, chunk: Uint8Array): Promise<void> {
  const ok = stream.write(chunk);
  if (ok) return;
  await new Promise<void>((resolve, reject) => {
    stream.once("drain", () => resolve());
    stream.once("error", (e) => reject(e));
  });
}

async function saveBodyStreamed(
  cfg: RunnerConfig,
  caseId: string,
  version: Version,
  attempt: number,
  res: Response
): Promise<SavedBody> {
  const failuresDirAbs = path.join(cfg.outDir, "_runner_failures");
  await ensureDir(failuresDirAbs);

  const bodyAbs = path.join(failuresDirAbs, `${caseId}.${version}.attempt${attempt}.body.bin`);
  const metaAbs = path.join(failuresDirAbs, `${caseId}.${version}.attempt${attempt}.body.meta.json`);

  const bodyStream = createWriteStream(bodyAbs, { flags: "w" });

  let bytesWritten = 0;
  let truncated = false;

  const snippetBytesMax = Math.max(0, cfg.bodySnippetBytes);
  const snippetChunks: Uint8Array[] = [];
  let snippetCollected = 0;

  const maxBodyBytes = Math.max(0, cfg.maxBodyBytes);

  const body = res.body as unknown as ReadableStream<Uint8Array> | null;
  if (!body) {
    const meta = {
      kind: "runner_body_capture",
      case_id: caseId,
      version,
      attempt,
      max_body_bytes: maxBodyBytes,
      truncated: false,
      bytes_written: 0,
      note: "response.body is null"
    };
    await writeFile(metaAbs, JSON.stringify(meta, null, 2), "utf-8");

    bodyStream.end();

    return {
      bodyRel: toRel(cfg.repoRoot, bodyAbs),
      metaRel: toRel(cfg.repoRoot, metaAbs),
      truncated: false,
      bytes_written: 0,
      snippet: ""
    };
  }

  const reader = body.getReader();

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      if (snippetCollected < snippetBytesMax) {
        const remain = snippetBytesMax - snippetCollected;
        const take = value.byteLength <= remain ? value : value.slice(0, remain);
        snippetChunks.push(take);
        snippetCollected += take.byteLength;
      }

      if (bytesWritten < maxBodyBytes) {
        const remainBody = maxBodyBytes - bytesWritten;
        const toWrite = value.byteLength <= remainBody ? value : value.slice(0, remainBody);
        await writeStreamOnceDrain(bodyStream, toWrite);
        bytesWritten += toWrite.byteLength;

        if (toWrite.byteLength < value.byteLength) {
          truncated = true;
          break;
        }
      } else {
        truncated = true;
        break;
      }
    }
  } finally {
    if (truncated) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }
    await new Promise<void>((resolve, reject) => {
      bodyStream.end(() => resolve());
      bodyStream.once("error", (e) => reject(e));
    });
  }

  const mergedSnippet =
    snippetChunks.length === 0
      ? new Uint8Array(0)
      : (() => {
          const total = snippetChunks.reduce((s, c) => s + c.byteLength, 0);
          const out = new Uint8Array(total);
          let off = 0;
          for (const c of snippetChunks) {
            out.set(c, off);
            off += c.byteLength;
          }
          return out;
        })();

  const meta = {
    kind: "runner_body_capture",
    case_id: caseId,
    version,
    attempt,
    max_body_bytes: maxBodyBytes,
    truncated,
    bytes_written: bytesWritten,
    content_type: res.headers.get("content-type") ?? null
  };

  await writeFile(metaAbs, JSON.stringify(meta, null, 2), "utf-8");

  return {
    bodyRel: toRel(cfg.repoRoot, bodyAbs),
    metaRel: toRel(cfg.repoRoot, metaAbs),
    truncated,
    bytes_written: bytesWritten,
    snippet: snippetFromBytes(mergedSnippet, cfg.bodySnippetBytes)
  };
}

function httpIsTransient(status: number): boolean {
  if (status === 408) return true;
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

function inferNetErrorKind(e: unknown): NetErrorKind {
  const name = e instanceof Error ? e.name : "";
  const msg = e instanceof Error ? e.message : String(e ?? "");

  const s = `${name} ${msg}`.toLowerCase();

  if (name === "AbortError" || s.includes("abort")) return "abort";
  if (s.includes("enotfound") || s.includes("eai_again") || s.includes("dns")) return "dns";
  if (s.includes("cert") || s.includes("tls") || s.includes("ssl") || s.includes("handshake")) return "tls";
  if (s.includes("econnrefused") || s.includes("connection refused")) return "conn_refused";
  if (s.includes("econnreset") || s.includes("connection reset")) return "conn_reset";
  if (s.includes("socket hang up")) return "socket_hang_up";
  if (s.includes("proxy")) return "proxy";

  return "unknown";
}

function isTransientFailure(artifact: RunnerFailureArtifact): boolean {
  if (artifact.class === "timeout") return true;
  if (artifact.class === "network_error") return true;
  if (artifact.class === "http_error" && typeof artifact.status === "number") return httpIsTransient(artifact.status);
  return false;
}

function mkFailureResponse(artifact: RunnerFailureArtifact, message: string): MinimalAgentResponseOnFailure {
  return {
    case_id: artifact.case_id,
    version: artifact.version,
    proposed_actions: [],
    final_output: { content_type: "text", content: message },
    events: [],
    runner_failure: artifact
  };
}

async function runOneCaseWithReliability(cfg: RunnerConfig, c: CaseFileItem, version: Version): Promise<unknown> {
  const url = `${cfg.baseUrl}/run-case`;
  const reqBody: RunCaseRequest = {
    case_id: c.id,
    version,
    input: { user: c.input.user, context: c.input.context }
  };

  const payload = JSON.stringify(reqBody);

  for (let attempt = 1; attempt <= Math.max(1, cfg.retries + 1); attempt++) {
    const started = Date.now();

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload
        },
        cfg.timeoutMs
      );

      const latency = Date.now() - started;

      if (!res.ok) {
        const klass: FetchFailureClass = "http_error";

        let bodyRel: string | undefined;
        let metaRel: string | undefined;
        let snippet = "";
        let truncated = false;
        let bytesWritten = 0;

        if (cfg.saveFullBodyOnError) {
          const saved = await saveBodyStreamed(cfg, c.id, version, attempt, res);
          bodyRel = saved.bodyRel;
          metaRel = saved.metaRel;
          snippet = saved.snippet;
          truncated = saved.truncated;
          bytesWritten = saved.bytes_written;
        } else {
          const text = await res.text();
          snippet = text.slice(0, Math.max(0, cfg.bodySnippetBytes));
        }

        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: klass,
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          status: res.status,
          status_text: res.statusText,
          http_is_transient: httpIsTransient(res.status),
          body_snippet: snippet,
          max_body_bytes: cfg.maxBodyBytes
        };

        if (bodyRel !== undefined) artifact.full_body_saved_to = bodyRel;
        if (metaRel !== undefined) artifact.full_body_meta_saved_to = metaRel;
        if (cfg.saveFullBodyOnError) {
          artifact.body_truncated = truncated;
          artifact.body_bytes_written = bytesWritten;
        }

        artifact.is_transient = isTransientFailure(artifact);

        const msg = [
          `runner: fetch failure (${klass})`,
          `case_id=${c.id}`,
          `version=${version}`,
          `attempt=${attempt}`,
          `url=${url}`,
          `http=${res.status} ${res.statusText}`,
          `is_transient=${String(artifact.is_transient)}`,
          bodyRel ? `full_body_saved_to=${bodyRel}` : `full_body_saved_to=disabled`,
          metaRel ? `full_body_meta_saved_to=${metaRel}` : `full_body_meta_saved_to=disabled`,
          cfg.saveFullBodyOnError ? `body_truncated=${String(truncated)}` : `body_truncated=disabled`,
          cfg.saveFullBodyOnError ? `body_bytes_written=${String(bytesWritten)}` : `body_bytes_written=disabled`
        ].join("\n");

        if (attempt <= cfg.retries && artifact.is_transient === true) {
          await sleep(backoffMs(cfg.backoffBaseMs, attempt));
          continue;
        }

        return mkFailureResponse(artifact, msg);
      }

      const body = res.body as unknown as ReadableStream<Uint8Array> | null;
      if (!body) {
        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: "invalid_json",
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          error_name: "RunnerError",
          error_message: "response.body is null",
          is_transient: false
        };
        return mkFailureResponse(artifact, "runner: invalid_json (response.body is null)");
      }

      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      let truncated = false;

      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          if (total + value.byteLength <= cfg.maxBodyBytes) {
            chunks.push(value);
            total += value.byteLength;
          } else {
            const remain = cfg.maxBodyBytes - total;
            if (remain > 0) {
              chunks.push(value.slice(0, remain));
              total += remain;
            }
            truncated = true;
            break;
          }
        }
      } finally {
        if (truncated) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
        }
      }

      const merged =
        chunks.length === 0
          ? new Uint8Array(0)
          : (() => {
              const out = new Uint8Array(total);
              let off = 0;
              for (const c0 of chunks) {
                out.set(c0, off);
                off += c0.byteLength;
              }
              return out;
            })();

      const dec = new TextDecoder("utf-8", { fatal: false });
      const text = dec.decode(merged);

      if (truncated) {
        let bodyRel: string | undefined;
        let metaRel: string | undefined;
        if (cfg.saveFullBodyOnError) {
          const failuresDirAbs = path.join(cfg.outDir, "_runner_failures");
          await ensureDir(failuresDirAbs);

          const bodyAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.success_truncated.body.bin`);
          const metaAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.success_truncated.body.meta.json`);

          await writeFile(bodyAbs, merged);
          const meta = {
            kind: "runner_body_capture_success_truncated",
            case_id: c.id,
            version,
            attempt,
            max_body_bytes: cfg.maxBodyBytes,
            truncated: true,
            bytes_written: merged.byteLength,
            content_type: res.headers.get("content-type") ?? null
          };
          await writeFile(metaAbs, JSON.stringify(meta, null, 2), "utf-8");

          bodyRel = toRel(cfg.repoRoot, bodyAbs);
          metaRel = toRel(cfg.repoRoot, metaAbs);
        }

        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: "invalid_json",
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          error_name: "BodyTooLarge",
          error_message: `Response body exceeded maxBodyBytes=${cfg.maxBodyBytes} and was truncated; cannot parse JSON.`,
          body_snippet: snippetFromBytes(merged, cfg.bodySnippetBytes),
          max_body_bytes: cfg.maxBodyBytes,
          body_truncated: true,
          body_bytes_written: merged.byteLength,
          is_transient: false
        };
        if (bodyRel !== undefined) artifact.full_body_saved_to = bodyRel;
        if (metaRel !== undefined) artifact.full_body_meta_saved_to = metaRel;

        const msg = [
          `runner: fetch failure (invalid_json)`,
          `case_id=${c.id}`,
          `version=${version}`,
          `attempt=${attempt}`,
          `url=${url}`,
          `error=${artifact.error_name}: ${artifact.error_message}`,
          bodyRel ? `full_body_saved_to=${bodyRel}` : `full_body_saved_to=disabled`,
          metaRel ? `full_body_meta_saved_to=${metaRel}` : `full_body_meta_saved_to=disabled`
        ].join("\n");

        if (attempt <= cfg.retries) {
          return mkFailureResponse(artifact, msg);
        }

        return mkFailureResponse(artifact, msg);
      }

      try {
        return JSON.parse(text) as unknown;
      } catch (e) {
        const klass: FetchFailureClass = "invalid_json";
        const snippet = text.length ? text.slice(0, Math.max(0, cfg.bodySnippetBytes)) : "";

        let bodyRel: string | undefined;
        let metaRel: string | undefined;

        if (cfg.saveFullBodyOnError) {
          const failuresDirAbs = path.join(cfg.outDir, "_runner_failures");
          await ensureDir(failuresDirAbs);

          const bodyAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.invalid_json.body.txt`);
          const metaAbs = path.join(failuresDirAbs, `${c.id}.${version}.attempt${attempt}.invalid_json.body.meta.json`);

          await writeFile(bodyAbs, text, "utf-8");
          const meta = {
            kind: "runner_invalid_json_capture",
            case_id: c.id,
            version,
            attempt,
            max_body_bytes: cfg.maxBodyBytes,
            truncated: false,
            bytes_written: Buffer.byteLength(text, "utf8"),
            content_type: res.headers.get("content-type") ?? null
          };
          await writeFile(metaAbs, JSON.stringify(meta, null, 2), "utf-8");

          bodyRel = toRel(cfg.repoRoot, bodyAbs);
          metaRel = toRel(cfg.repoRoot, metaAbs);
        }

        const artifact: RunnerFailureArtifact = {
          type: "runner_fetch_failure",
          class: klass,
          case_id: c.id,
          version,
          url,
          attempt,
          timeout_ms: cfg.timeoutMs,
          latency_ms: latency,
          error_name: e instanceof Error ? e.name : "Error",
          error_message: e instanceof Error ? e.message : String(e),
          body_snippet: snippet,
          max_body_bytes: cfg.maxBodyBytes,
          is_transient: false
        };
        if (bodyRel !== undefined) artifact.full_body_saved_to = bodyRel;
        if (metaRel !== undefined) artifact.full_body_meta_saved_to = metaRel;

        const msg = [
          `runner: fetch failure (${klass})`,
          `case_id=${c.id}`,
          `version=${version}`,
          `attempt=${attempt}`,
          `url=${url}`,
          `error=${artifact.error_name}: ${artifact.error_message}`,
          bodyRel ? `full_body_saved_to=${bodyRel}` : `full_body_saved_to=disabled`,
          metaRel ? `full_body_meta_saved_to=${metaRel}` : `full_body_meta_saved_to=disabled`
        ].join("\n");

        return mkFailureResponse(artifact, msg);
      }
    } catch (e) {
      const latency = Date.now() - started;
      const aborted = e instanceof Error && e.name === "AbortError";
      const klass: FetchFailureClass = aborted ? "timeout" : "network_error";

      const artifact: RunnerFailureArtifact = {
        type: "runner_fetch_failure",
        class: klass,
        net_error_kind: inferNetErrorKind(e),
        case_id: c.id,
        version,
        url,
        attempt,
        timeout_ms: cfg.timeoutMs,
        latency_ms: latency,
        error_name: e instanceof Error ? e.name : "Error",
        error_message: e instanceof Error ? e.message : String(e)
      };

      artifact.is_transient = klass === "timeout" || klass === "network_error";

      const msg = [
        `runner: fetch failure (${klass})`,
        `case_id=${c.id}`,
        `version=${version}`,
        `attempt=${attempt}`,
        `url=${url}`,
        `net_error_kind=${String(artifact.net_error_kind ?? "unknown")}`,
        `is_transient=${String(artifact.is_transient)}`,
        `error=${artifact.error_name}: ${artifact.error_message}`
      ].join("\n");

      if (attempt <= cfg.retries && artifact.is_transient === true) {
        await sleep(backoffMs(cfg.backoffBaseMs, attempt));
        continue;
      }

      return mkFailureResponse(artifact, msg);
    }
  }

  const fallback: RunnerFailureArtifact = {
    type: "runner_fetch_failure",
    class: "network_error",
    net_error_kind: "unknown",
    is_transient: true,
    case_id: c.id,
    version,
    url: `${cfg.baseUrl}/run-case`,
    attempt: 1,
    timeout_ms: cfg.timeoutMs,
    latency_ms: 0,
    error_name: "RunnerError",
    error_message: "unreachable"
  };
  return mkFailureResponse(fallback, "runner: unreachable state");
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const n = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIdx = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const idx = nextIdx;
      nextIdx += 1;
      if (idx >= items.length) return;

      const item = items[idx];
      if (item === undefined) return;

      results[idx] = await fn(item, idx);
    }
  }

  const workers = Array.from({ length: Math.min(n, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const repoRoot = getArg("--repoRoot") ?? process.env.INIT_CWD ?? process.cwd();
  const rel = (p: string) => path.relative(repoRoot, p).split(path.sep).join("/");
  const fmtRel = (p: string) => {
    const r = rel(p);
    return r.length ? r : ".";
  };

  if (hasFlag("--help", "-h")) {
    console.log(HELP_TEXT);
    return;
  }

  assertNoUnknownOptions(
    new Set([
      "--repoRoot",
      "--baseUrl",
      "--cases",
      "--outDir",
      "--runId",
      "--only",
      "--dryRun",
      "--timeoutMs",
      "--retries",
      "--backoffBaseMs",
      "--concurrency",
      "--bodySnippetBytes",
      "--maxBodyBytes",
      "--noSaveFullBodyOnError",
      "--help",
      "-h"
    ])
  );

  assertHasValue("--repoRoot");
  assertHasValue("--baseUrl");
  assertHasValue("--cases");
  assertHasValue("--outDir");
  assertHasValue("--runId");
  assertHasValue("--only");
  assertHasValue("--timeoutMs");
  assertHasValue("--retries");
  assertHasValue("--backoffBaseMs");
  assertHasValue("--concurrency");
  assertHasValue("--bodySnippetBytes");
  assertHasValue("--maxBodyBytes");

  const cfg: RunnerConfig = {
    repoRoot,
    baseUrl: normalizeBaseUrl(getArg("--baseUrl") ?? "http://localhost:8787"),
    casesPath: resolveFromRoot(repoRoot, getArg("--cases") ?? "cases/cases.json"),
    outDir: resolveFromRoot(repoRoot, getArg("--outDir") ?? "apps/runner/runs"),
    runId: getArg("--runId") ?? randomUUID(),
    onlyCaseIds: parseOnlyCaseIds(),
    dryRun: getFlag("--dryRun"),

    timeoutMs: parseIntFlag("--timeoutMs", 15000),
    retries: parseIntFlag("--retries", 2),
    backoffBaseMs: parseIntFlag("--backoffBaseMs", 250),
    concurrency: parseIntFlag("--concurrency", 1),

    bodySnippetBytes: parseIntFlag("--bodySnippetBytes", 4000),
    maxBodyBytes: parseIntFlag("--maxBodyBytes", 2000000),
    saveFullBodyOnError: !getFlag("--noSaveFullBodyOnError")
  };

  const raw = await readFile(cfg.casesPath, "utf-8");
  const cases = parseCasesJson(raw);

  const selectedCases = cfg.onlyCaseIds ? cases.filter((c) => cfg.onlyCaseIds!.includes(c.id)) : cases;
  if (selectedCases.length === 0) throw new Error("No cases selected. Check --only or cases.json content.");

  const baselineDir = path.join(cfg.outDir, "baseline", cfg.runId);
  const newDir = path.join(cfg.outDir, "new", cfg.runId);

  await ensureDir(baselineDir);
  await ensureDir(newDir);

  const runMeta = {
    run_id: cfg.runId,
    base_url: cfg.baseUrl,
    cases_path: rel(cfg.casesPath),
    selected_case_ids: selectedCases.map((c) => c.id),
    started_at: Date.now(),
    versions: ["baseline", "new"] as const,
    runner: {
      timeout_ms: cfg.timeoutMs,
      retries: cfg.retries,
      backoff_base_ms: cfg.backoffBaseMs,
      concurrency: cfg.concurrency,
      body_snippet_bytes: cfg.bodySnippetBytes,
      max_body_bytes: cfg.maxBodyBytes,
      save_full_body_on_error: cfg.saveFullBodyOnError
    }
  };

  console.log("Runner started");
  console.log("repoRoot:", fmtRel(cfg.repoRoot));
  console.log("baseUrl:", cfg.baseUrl);
  console.log("cases:", selectedCases.length);
  console.log("runId:", cfg.runId);
  console.log("outDir:", fmtRel(cfg.outDir));
  if (cfg.onlyCaseIds) console.log("only:", cfg.onlyCaseIds.join(", "));
  if (cfg.dryRun) console.log("dryRun:", true);
  console.log("timeoutMs:", cfg.timeoutMs);
  console.log("retries:", cfg.retries);
  console.log("concurrency:", cfg.concurrency);
  console.log("maxBodyBytes:", cfg.maxBodyBytes);

  if (cfg.dryRun) {
    for (const c of selectedCases) console.log("Case:", c.id);
    const finished = { ...runMeta, ended_at: Date.now() };
    await writeFile(path.join(baselineDir, "run.json"), JSON.stringify(finished, null, 2), "utf-8");
    await writeFile(path.join(newDir, "run.json"), JSON.stringify(finished, null, 2), "utf-8");
    console.log("Runner finished");
    console.log("baseline:", fmtRel(baselineDir));
    console.log("new:", fmtRel(newDir));
    return;
  }

  await runWithConcurrency(selectedCases, cfg.concurrency, async (c) => {
    console.log("Case:", c.id);

    const baselineResp = await runOneCaseWithReliability(cfg, c, "baseline");
    await writeFile(path.join(baselineDir, `${c.id}.json`), JSON.stringify(baselineResp, null, 2), "utf-8");

    const newResp = await runOneCaseWithReliability(cfg, c, "new");
    await writeFile(path.join(newDir, `${c.id}.json`), JSON.stringify(newResp, null, 2), "utf-8");

    return true;
  });

  const finished = { ...runMeta, ended_at: Date.now() };
  await writeFile(path.join(baselineDir, "run.json"), JSON.stringify(finished, null, 2), "utf-8");
  await writeFile(path.join(newDir, "run.json"), JSON.stringify(finished, null, 2), "utf-8");

  console.log("Runner finished");
  console.log("baseline:", fmtRel(baselineDir));
  console.log("new:", fmtRel(newDir));
}

main().catch((err) => {
  if (err && typeof err === "object" && "exitCode" in err && typeof (err as { exitCode: unknown }).exitCode === "number") {
    const note = err instanceof Error ? err.message : String(err);
    console.error(note);
    process.exit((err as { exitCode: number }).exitCode);
  }

  console.error(String(err instanceof Error ? err.stack : err));
  process.exit(1);
});
