import { createWriteStream } from "node:fs";
import { rm, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { TextDecoder } from "node:util";
import type { ReadableStream } from "node:stream/web";
import { ensureDir, writeFileAtomic, writeJsonAtomic } from "cli-utils";
import type { Version } from "shared-types";
import type { RunnerConfig } from "./runnerTypes";

export type SavedBody = {
  bodyRel?: string;
  metaRel?: string;
  truncated: boolean;
  bytes_written: number;
  snippet: string;
};

export function toRel(repoRoot: string, abs: string): string {
  const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
  return rel.length ? rel : path.basename(abs);
}

export function snippetFromBytes(bytes: Uint8Array, maxBytes: number): string {
  if (maxBytes <= 0) return "";
  const cut = bytes.byteLength <= maxBytes ? bytes : bytes.slice(0, maxBytes);
  const dec = new TextDecoder("utf-8", { fatal: false });
  return dec.decode(cut);
}

export async function readBodySnippet(res: Response, maxBytes: number): Promise<string> {
  if (maxBytes <= 0) return "";
  const body = res.body as unknown as ReadableStream<Uint8Array> | null;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      if (total + value.byteLength <= maxBytes) {
        chunks.push(value);
        total += value.byteLength;
      } else {
        const remain = maxBytes - total;
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

  return snippetFromBytes(merged, maxBytes);
}

async function writeStreamOnceDrain(stream: ReturnType<typeof createWriteStream>, chunk: Uint8Array): Promise<void> {
  const ok = stream.write(chunk);
  if (ok) return;
  await new Promise<void>((resolve, reject) => {
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (e: Error) => {
      cleanup();
      reject(e);
    };
    const cleanup = () => {
      stream.off("drain", onDrain);
      stream.off("error", onError);
    };
    stream.on("drain", onDrain);
    stream.on("error", onError);
  });
}

export async function saveBodyStreamed(
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
  const bodyTmpAbs = path.join(
    failuresDirAbs,
    `.tmp-${caseId}.${version}.attempt${attempt}.body.bin-${process.pid}-${randomUUID()}`
  );

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
    await writeFileAtomic(bodyAbs, new Uint8Array(0));
    await writeJsonAtomic(metaAbs, meta);

    return {
      bodyRel: toRel(cfg.repoRoot, bodyAbs),
      metaRel: toRel(cfg.repoRoot, metaAbs),
      truncated: false,
      bytes_written: 0,
      snippet: ""
    };
  }

  const reader = body.getReader();
  const bodyStream = createWriteStream(bodyTmpAbs, { flags: "w" });

  try {
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
    await rename(bodyTmpAbs, bodyAbs);
  } catch (err) {
    try {
      await rm(bodyTmpAbs, { force: true });
    } catch {
      // ignore cleanup errors
    }
    throw err;
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

  await writeJsonAtomic(metaAbs, meta);

  return {
    bodyRel: toRel(cfg.repoRoot, bodyAbs),
    metaRel: toRel(cfg.repoRoot, metaAbs),
    truncated,
    bytes_written: bytesWritten,
    snippet: snippetFromBytes(mergedSnippet, cfg.bodySnippetBytes)
  };
}
