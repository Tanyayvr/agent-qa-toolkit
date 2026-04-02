import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ensureDir, writeFileAtomic } from "cli-utils";
import type { Version } from "shared-types";
import { findUnredactedMarkers } from "./redactionCheck";

export class FileTooLargeError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly sizeBytes: number,
    public readonly maxBytes: number
  ) {
    super(`File exceeds size limit: ${filePath} (${sizeBytes} > ${maxBytes})`);
    this.name = "FileTooLargeError";
  }
}

export function resolveFromRoot(projectRoot: string, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(projectRoot, p);
}

export function normRel(fromDir: string, absPath: string): string {
  const rel = path.relative(fromDir, absPath).split(path.sep).join("/");
  return rel.length ? rel : ".";
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function findUnredactedMarkersSafe(
  text: string,
  preset: "internal_only" | "transferable" | "transferable_extended" | null | undefined,
  processEnv?: NodeJS.ProcessEnv
): string[] {
  if (!preset) return [];
  return findUnredactedMarkers(text, preset, processEnv);
}

export async function readUtf8WithLimit(absPath: string, maxBytes: number): Promise<string> {
  const st = await stat(absPath);
  if (!st.isFile()) {
    throw new Error(`Not a file: ${absPath}`);
  }
  if (st.size > maxBytes) {
    throw new FileTooLargeError(absPath, st.size, maxBytes);
  }
  return await readFile(absPath, "utf-8");
}

export function renderMissingCaseHtml(caseId: string, missing: { baseline: boolean; new: boolean }, note?: string): string {
  const title = `Replay diff · ${caseId}`;
  const msg = [
    missing.baseline ? "baseline response missing" : "",
    missing.new ? "new response missing" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const noteBlock = note ? `<div class="muted" style="margin-top:6px;">${escHtml(note)}</div>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(title)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui; background:#0b0d10; color:#e8eaed; margin:0; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
  .card { background:#0f1217; border:1px solid #232836; border-radius: 12px; padding: 14px; }
  .muted { color:#9aa4b2; font-size: 13px; }
  code { color:#cdd6f4; }
</style>
</head>
<body>
  <div class="wrap">
    <h1 style="margin:0 0 10px 0;">${escHtml(title)}</h1>
    <div class="card">
      <div style="font-weight:700;">${escHtml(msg || "missing response artifact")}</div>
      ${noteBlock}
    </div>
  </div>
</body>
</html>`;
}

export function safeBasename(p: string): string {
  const base = path.basename(p);
  if (!base || base === "." || base === "..") return "artifact.bin";
  return base.replace(/[^\w.\-]+/g, "_");
}

export function sha256Hex(data: string | Uint8Array): string {
  const h = createHash("sha256");
  h.update(data);
  return h.digest("hex");
}

export async function fileSha256ForRel(reportDir: string, rel: string | undefined): Promise<string | undefined> {
  if (!rel) return undefined;
  try {
    const buf = await readFile(path.resolve(reportDir, rel));
    const u8 = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    return sha256Hex(u8);
  } catch {
    return undefined;
  }
}

export async function fileBytesForRel(reportDir: string, rel: string | undefined): Promise<number | undefined> {
  if (!rel) return undefined;
  try {
    const st = await stat(path.resolve(reportDir, rel));
    return st.isFile() ? st.size : undefined;
  } catch {
    return undefined;
  }
}

export async function copyFileU8(srcAbs: string, destAbs: string): Promise<void> {
  const buf = await readFile(srcAbs);
  const u8 = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  await writeFileAtomic(destAbs, u8);
}

export async function maybeCopyFailureAsset(params: {
  projectRoot: string;
  reportDir: string;
  caseId: string;
  version: Version;
  relOrAbsPath: string;
}): Promise<string | null> {
  const { projectRoot, reportDir, caseId, version, relOrAbsPath } = params;

  const srcAbs = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : resolveFromRoot(projectRoot, relOrAbsPath);

  try {
    const st = await stat(srcAbs);
    if (!st.isFile()) return null;
  } catch {
    return null;
  }

  const fileName = safeBasename(relOrAbsPath);
  const destAbs = path.join(reportDir, "assets", "runner_failure", caseId, version, fileName);
  await ensureDir(path.dirname(destAbs));
  await copyFileU8(srcAbs, destAbs);

  return normRel(reportDir, destAbs);
}

export async function copyRawCaseJson(params: {
  reportDir: string;
  caseId: string;
  version: Version;
  srcAbs: string;
}): Promise<string | null> {
  const { reportDir, caseId, version, srcAbs } = params;
  try {
    const st = await stat(srcAbs);
    if (!st.isFile()) return null;
  } catch {
    return null;
  }
  const destAbs = path.join(reportDir, "assets", "raw", "case_responses", caseId, `${version}.json`);
  await ensureDir(path.dirname(destAbs));
  await copyFileU8(srcAbs, destAbs);
  return normRel(reportDir, destAbs);
}

export async function copyRunMetaJson(params: { reportDir: string; version: Version; srcAbs: string }): Promise<string | null> {
  const { reportDir, version, srcAbs } = params;
  try {
    const st = await stat(srcAbs);
    if (!st.isFile()) return null;
  } catch {
    return null;
  }
  const destAbs = path.join(reportDir, "assets", "raw", "run_meta", `${version}.run.json`);
  await ensureDir(path.dirname(destAbs));
  await copyFileU8(srcAbs, destAbs);
  return normRel(reportDir, destAbs);
}

export function isAbsoluteOrBadHref(href: string): boolean {
  if (!href) return true;
  if (href.startsWith("http://") || href.startsWith("https://")) return true;
  if (path.isAbsolute(href)) return true;
  if (href.includes("\\\\")) return true;
  const norm = href.split("\\").join("/");
  if (norm.startsWith("../") || norm.includes("/../")) return true;
  return false;
}

export async function fileExistsAbs(absPath: string): Promise<boolean> {
  try {
    const st = await stat(absPath);
    return st.isFile();
  } catch {
    return false;
  }
}
