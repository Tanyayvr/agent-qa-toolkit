//tool/apps/evaluator/src/index.ts
import path from "node:path";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Ajv from "ajv";
import {
  renderHtmlReport,
  type CompareReport,
  type TraceIntegrity,
  type SecurityPack,
  type SecuritySignal,
  type QualityFlags,
} from "./htmlReport";
import { renderCaseDiffHtml, type AgentResponse as ReplayAgentResponse } from "./replayDiff";
import { createHash } from "node:crypto";
import {
  manifestItemForRunnerFailureArtifact,
  manifestItemForCaseResponse,
  manifestItemForFinalOutput,
  manifestKeyFor,
} from "./manifest";
import type { Manifest, ManifestItem, ThinIndex } from "./manifest";

import type {
  Version,
  AgentResponse,
} from "shared-types";

import {
  evaluateOne,
  mapPolicyRules,
  computeTraceIntegritySide,
  missingTraceSide,
  computeSecuritySide,
  deriveGateRecommendation,
  deriveRiskLevel,
  deriveRiskTags,
  deriveFailureSummarySide,
  topKinds,
  severityCountsInit,
  bumpCounts,
  type Case,
  type Expected,
  type EvaluationResult,
  type CaseStatus,
  type DataAvailabilitySide,
} from "./core";

const HELP_TEXT = `
Usage:
  evaluator --cases <path> --baselineDir <dir> --newDir <dir> [--outDir <dir>] [--reportId <id>]

Required:
  --cases        Path to cases JSON (e.g. cases/cases.json)
  --baselineDir  Baseline run directory (e.g. apps/runner/runs/baseline/latest)
  --newDir       New run directory (e.g. apps/runner/runs/new/latest)

Optional:
  --outDir          Output directory for reports (default: apps/evaluator/reports/<reportId>)
  --reportId        Report id (default: random UUID)
  --transferClass   Transfer classification: internal_only (default) or transferable
  --help, -h        Show this help
`.trim();

const ARGV = normalizeArgv(process.argv);

class CliUsageError extends Error {
  public readonly exitCode = 2;
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

function normalizeArgv(argv: string[]): string[] {
  const out: string[] = [];
  for (const a of argv) {
    if (a.startsWith("--") && a.includes("=")) {
      const idx = a.indexOf("=");
      const key = a.slice(0, idx);
      const val = a.slice(idx + 1);
      out.push(key);
      if (val.length) out.push(val);
    } else {
      out.push(a);
    }
  }
  return out;
}

function hasFlag(...names: string[]): boolean {
  return names.some((n) => ARGV.includes(n));
}

function assertNoUnknownOptions(allowed: Set<string>): void {
  const args = ARGV.slice(2);
  for (const a of args) {
    if (a.startsWith("--") && !allowed.has(a)) {
      throw new CliUsageError(`Unknown option: ${a}\n\n${HELP_TEXT}`);
    }
  }
}

function assertHasValue(flag: string): void {
  const idx = ARGV.indexOf(flag);
  if (idx === -1) return;
  const next = ARGV[idx + 1];
  if (!next || next.startsWith("--")) {
    throw new CliUsageError(`Missing value for ${flag}\n\n${HELP_TEXT}`);
  }
}

function getArg(name: string): string | null {
  const idx = ARGV.indexOf(name);
  if (idx === -1) return null;
  const val = ARGV[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function resolveFromRoot(projectRoot: string, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(projectRoot, p);
}

function normRel(fromDir: string, absPath: string): string {
  const rel = path.relative(fromDir, absPath).split(path.sep).join("/");
  return rel.length ? rel : ".";
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

function renderMissingCaseHtml(caseId: string, missing: { baseline: boolean; new: boolean }): string {
  const title = `Replay diff · ${caseId}`;
  const msg = [
    missing.baseline ? "baseline response missing" : "",
    missing.new ? "new response missing" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  body { margin: 0; background: #0b0d10; color: #e8eaed; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 18px; }
  .card { background:#0f1217; border:1px solid #232836; border-radius: 12px; padding: 12px; }
  .muted { color:#9aa4b2; font-size: 13px; }
  a { color:#8ab4f8; text-decoration:none; }
  a:hover { text-decoration:underline; }
</style>
</head>
<body>
  <div class="wrap">
    <div style="font-size:20px;font-weight:800;">${title}</div>
    <div class="muted">case_id: ${caseId}</div>
    <div class="card" style="margin-top:12px;">
      <div style="font-weight:700;">Missing response</div>
      <div class="muted" style="margin-top:6px;">${msg || "unknown"}</div>
    </div>
    <div style="margin-top:12px;"><a href="report.html">Back to report</a></div>
  </div>
</body>
</html>`;
}

async function readCases(casesPath: string): Promise<Case[]> {
  const raw = await readFile(casesPath, "utf-8");
  const arr: unknown = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("cases.json must be an array");

  return arr.map((x) => {
    const obj = x as Record<string, unknown>;
    const input = (obj.input ?? {}) as Record<string, unknown>;
    return {
      id: String(obj.id),
      title: String(obj.title ?? ""),
      input: { user: String(input.user ?? ""), context: input.context },
      expected: (obj.expected ?? {}) as Expected,
    };
  });
}

async function readRunDir(dir: string): Promise<{
  byId: Record<string, AgentResponse>;
  meta: Record<string, unknown>;
  ids: string[];
  availability: Record<string, DataAvailabilitySide>;
}> {
  const runJsonAbs = path.join(dir, "run.json");
  const meta = JSON.parse(await readFile(runJsonAbs, "utf-8")) as Record<string, unknown>;
  const selected = meta.selected_case_ids;
  const ids = Array.isArray(selected) ? selected.map((x) => String(x)) : [];

  const byId: Record<string, AgentResponse> = {};
  const availability: Record<string, DataAvailabilitySide> = {};
  for (const id of ids) {
    const file = path.join(dir, `${id}.json`);
    try {
      const raw = await readFile(file, "utf-8");
      const v = JSON.parse(raw) as AgentResponse;
      byId[id] = v;
      availability[id] = { status: "present" };
    } catch (err) {
      let missing = false;
      try {
        const st = await stat(file);
        if (!st.isFile()) missing = true;
      } catch {
        missing = true;
      }
      if (missing) {
        availability[id] = { status: "missing", reason_code: "missing_file" };
      } else {
        availability[id] = {
          status: "broken",
          reason_code: "invalid_json",
          details: { error: err instanceof Error ? err.message : String(err) },
        };
      }
    }
  }

  return { byId, meta, ids, availability };
}

function toReplayResponse(resp: AgentResponse): ReplayAgentResponse {
  const out: Record<string, unknown> = {
    case_id: resp.case_id,
    version: resp.version,
    final_output: resp.final_output,
    events: Array.isArray(resp.events) ? resp.events : [],
  };

  if (typeof resp.workflow_id === "string") out.workflow_id = resp.workflow_id;

  if (Array.isArray(resp.proposed_actions)) out.proposed_actions = resp.proposed_actions;

  if (resp.runner_failure && typeof resp.runner_failure === "object") out.runner_failure = resp.runner_failure;

  return out as ReplayAgentResponse;
}

function safeBasename(p: string): string {
  const base = path.basename(p);
  if (!base || base === "." || base === "..") return "artifact.bin";
  return base.replace(/[^\w.\-]+/g, "_");
}

function sha256Hex(data: string | Uint8Array): string {
  const h = createHash("sha256");
  h.update(data);
  return h.digest("hex");
}

async function fileBytesForRel(reportDir: string, rel: string | undefined): Promise<number | undefined> {
  if (!rel) return undefined;
  try {
    const st = await stat(path.resolve(reportDir, rel));
    return st.isFile() ? st.size : undefined;
  } catch {
    return undefined;
  }
}

async function copyFileU8(srcAbs: string, destAbs: string): Promise<void> {
  const buf = await readFile(srcAbs);
  const u8 = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  await writeFile(destAbs, u8);
}

async function maybeCopyFailureAsset(params: {
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

async function copyRawCaseJson(params: {
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

async function copyRunMetaJson(params: { reportDir: string; version: Version; srcAbs: string }): Promise<string | null> {
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

function isAbsoluteOrBadHref(href: string): boolean {
  if (!href) return true;
  if (href.startsWith("http://") || href.startsWith("https://")) return true;
  if (path.isAbsolute(href)) return true;
  if (href.includes("\\\\")) return true;
  const norm = href.split("\\").join("/");
  if (norm.startsWith("../") || norm.includes("/../")) return true;
  return false;
}

async function fileExistsAbs(absPath: string): Promise<boolean> {
  try {
    const st = await stat(absPath);
    return st.isFile();
  } catch {
    return false;
  }
}

async function computeQualityFlags(
  reportDir: string,
  entries: Array<{ field: string; value: string; check_exists: boolean }>
): Promise<QualityFlags> {
  const missing_assets: string[] = [];
  const path_violations: string[] = [];

  for (const e of entries) {
    if (!e.value) continue;

    if (isAbsoluteOrBadHref(e.value)) {
      path_violations.push(`${e.field}=${e.value}`);
      continue;
    }

    if (e.check_exists) {
      const abs = path.resolve(reportDir, e.value);
      const ok = await fileExistsAbs(abs);
      if (!ok) missing_assets.push(`${e.field}=${e.value}`);
    }
  }

  const self_contained = missing_assets.length === 0;
  const portable_paths = path_violations.length === 0;

  return {
    self_contained,
    portable_paths,
    missing_assets_count: missing_assets.length,
    path_violations_count: path_violations.length,
    missing_assets,
    path_violations,
  };
}

async function main(): Promise<void> {
  const projectRoot = process.env.INIT_CWD ?? process.cwd();

  if (hasFlag("--help", "-h")) {
    console.log(HELP_TEXT);
    return;
  }

  assertNoUnknownOptions(new Set(["--cases", "--baselineDir", "--newDir", "--outDir", "--reportId", "--transferClass", "--help", "-h"]));
  assertHasValue("--cases");
  assertHasValue("--baselineDir");
  assertHasValue("--newDir");
  assertHasValue("--outDir");
  assertHasValue("--reportId");
  assertHasValue("--transferClass");

  const casesArg = getArg("--cases");
  const baselineArg = getArg("--baselineDir");
  const newArg = getArg("--newDir");

  if (!casesArg || !baselineArg || !newArg) {
    throw new CliUsageError(`Missing required arguments.\n\n${HELP_TEXT}`);
  }

  const casesPathAbs = resolveFromRoot(projectRoot, casesArg);
  const baselineDirAbs = resolveFromRoot(projectRoot, baselineArg);
  const newDirAbs = resolveFromRoot(projectRoot, newArg);

  const transferClassArg = getArg("--transferClass") ?? "internal_only";
  if (transferClassArg !== "internal_only" && transferClassArg !== "transferable") {
    throw new CliUsageError(`Invalid --transferClass value: ${transferClassArg}. Must be "internal_only" or "transferable".\n\n${HELP_TEXT}`);
  }
  const transferClass: "internal_only" | "transferable" = transferClassArg;

  const reportId = getArg("--reportId") ?? randomUUID();
  const outDirArg = getArg("--outDir") ?? path.join("apps", "evaluator", "reports", reportId);
  const reportDirAbs = resolveFromRoot(projectRoot, outDirArg);

  await ensureDir(reportDirAbs);
  await ensureDir(path.join(reportDirAbs, "assets"));

  const cases = await readCases(casesPathAbs);
  const baselineRun = await readRunDir(baselineDirAbs);
  const newRun = await readRunDir(newDirAbs);

  const baselineById = baselineRun.byId;
  const newById = newRun.byId;
  const baselineSelected = new Set(baselineRun.ids);
  const newSelected = new Set(newRun.ids);

  const ajv = new Ajv({ allErrors: true, strict: false });

  const baselineEval: EvaluationResult[] = [];
  const newEval: EvaluationResult[] = [];

  for (const c of cases) {
    const b = baselineById[c.id];
    if (b) baselineEval.push(evaluateOne(c, b, ajv));

    const n = newById[c.id];
    if (n) newEval.push(evaluateOne(c, n, ajv));
  }

  await writeFile(path.join(baselineDirAbs, "evaluation.json"), JSON.stringify(baselineEval, null, 2), "utf-8");
  await writeFile(path.join(newDirAbs, "evaluation.json"), JSON.stringify(newEval, null, 2), "utf-8");

  let baselinePass = 0;
  let newPass = 0;
  let regressions = 0;
  let improvements = 0;
  const breakdown: Record<string, number> = {};

  const items: CompareReport["items"] = [];

  const baselineRunHref = await copyRunMetaJson({ reportDir: reportDirAbs, version: "baseline", srcAbs: path.join(baselineDirAbs, "run.json") });
  const newRunHref = await copyRunMetaJson({ reportDir: reportDirAbs, version: "new", srcAbs: path.join(newDirAbs, "run.json") });

  const redactionStatus = process.env.REDACTION_STATUS === "applied" ? "applied" : "none";
  const redactionPresetId = process.env.REDACTION_PRESET_ID;

  const manifestItems: ManifestItem[] = [];

  for (const c of cases) {
    const bEval = baselineEval.find((x) => x.case_id === c.id);
    const nEval = newEval.find((x) => x.case_id === c.id);
    const baseResp = baselineById[c.id];
    const newResp = newById[c.id];

    const baselineAvail: DataAvailabilitySide = baselineSelected.has(c.id)
      ? baselineRun.availability[c.id] ?? { status: "missing", reason_code: "missing_file" }
      : { status: "missing", reason_code: "excluded_by_filter" };

    const newAvail: DataAvailabilitySide = newSelected.has(c.id)
      ? newRun.availability[c.id] ?? { status: "missing", reason_code: "missing_file" }
      : { status: "missing", reason_code: "excluded_by_filter" };

    if (baseResp?.runner_failure && baselineAvail.status === "present") {
      baselineAvail.reason_code = baseResp.runner_failure.class;
      baselineAvail.details = {
        timeout_ms: baseResp.runner_failure.timeout_ms,
        http_status: baseResp.runner_failure.status,
        attempt: baseResp.runner_failure.attempt,
      };
    }
    if (newResp?.runner_failure && newAvail.status === "present") {
      newAvail.reason_code = newResp.runner_failure.class;
      newAvail.details = {
        timeout_ms: newResp.runner_failure.timeout_ms,
        http_status: newResp.runner_failure.status,
        attempt: newResp.runner_failure.attempt,
      };
    }

    const caseStatus: CaseStatus = baselineSelected.has(c.id) || newSelected.has(c.id) ? "executed" : "filtered_out";
    const caseStatusReason = caseStatus === "filtered_out" ? "excluded_by_filter" : undefined;

    let baselinePassFlag = bEval?.pass ?? false;
    let newPassFlag = nEval?.pass ?? false;
    if (caseStatus !== "executed") {
      baselinePassFlag = false;
      newPassFlag = false;
    }

    if (baselinePassFlag) baselinePass += 1;
    if (newPassFlag) newPass += 1;
    if (baselinePassFlag && !newPassFlag) regressions += 1;
    if (!baselinePassFlag && newPassFlag) improvements += 1;

    const newRoot = nEval?.root_cause ?? (newResp ? undefined : "missing_case");
    if (!newPassFlag && newRoot) breakdown[newRoot] = (breakdown[newRoot] ?? 0) + 1;

    const replayDiffHref = `case-${c.id}.html`;

    const artifactLinks: CompareReport["items"][number]["artifacts"] = {
      replay_diff_href: replayDiffHref,
    };

    if (baselineRunHref) artifactLinks.baseline_run_meta_href = baselineRunHref;
    if (newRunHref) artifactLinks.new_run_meta_href = newRunHref;

    if (baseResp) {
      const baseRf = baseResp.runner_failure;
      if (baseRf && typeof baseRf.full_body_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "baseline",
          relOrAbsPath: baseRf.full_body_saved_to,
        });
        if (rel) artifactLinks.baseline_failure_body_href = rel;
      }
      if (baseRf && typeof baseRf.full_body_meta_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "baseline",
          relOrAbsPath: baseRf.full_body_meta_saved_to,
        });
        if (rel) artifactLinks.baseline_failure_meta_href = rel;
      }
      if (baseRf) {
        const bodyRel = artifactLinks.baseline_failure_body_href;
        const metaRel = artifactLinks.baseline_failure_meta_href;
        const items = manifestItemForRunnerFailureArtifact({
          caseId: c.id,
          version: "baseline",
          ...(bodyRel ? { bodyRel } : {}),
          ...(metaRel ? { metaRel } : {}),
        });
        for (const it of items) {
          const bytes = await fileBytesForRel(reportDirAbs, it.rel_path);
          manifestItems.push({ ...it, ...(bytes !== undefined ? { bytes } : {}) });
        }
        if (bodyRel) artifactLinks.baseline_failure_body_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "runner_failure_body" });
        if (metaRel) artifactLinks.baseline_failure_meta_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "runner_failure_meta" });
      }
    }

    if (newResp) {
      const newRf = newResp.runner_failure;
      if (newRf && typeof newRf.full_body_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "new",
          relOrAbsPath: newRf.full_body_saved_to,
        });
        if (rel) artifactLinks.new_failure_body_href = rel;
      }
      if (newRf && typeof newRf.full_body_meta_saved_to === "string") {
        const rel = await maybeCopyFailureAsset({
          projectRoot,
          reportDir: reportDirAbs,
          caseId: c.id,
          version: "new",
          relOrAbsPath: newRf.full_body_meta_saved_to,
        });
        if (rel) artifactLinks.new_failure_meta_href = rel;
      }
      if (newRf) {
        const bodyRel = artifactLinks.new_failure_body_href;
        const metaRel = artifactLinks.new_failure_meta_href;
        const items = manifestItemForRunnerFailureArtifact({
          caseId: c.id,
          version: "new",
          ...(bodyRel ? { bodyRel } : {}),
          ...(metaRel ? { metaRel } : {}),
        });
        for (const it of items) {
          const bytes = await fileBytesForRel(reportDirAbs, it.rel_path);
          manifestItems.push({ ...it, ...(bytes !== undefined ? { bytes } : {}) });
        }
        if (bodyRel) artifactLinks.new_failure_body_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "runner_failure_body" });
        if (metaRel) artifactLinks.new_failure_meta_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "runner_failure_meta" });
      }
    }

    const baseCaseSrc = path.join(baselineDirAbs, `${c.id}.json`);
    const newCaseSrc = path.join(newDirAbs, `${c.id}.json`);

    const baseCaseHref = await copyRawCaseJson({ reportDir: reportDirAbs, caseId: c.id, version: "baseline", srcAbs: baseCaseSrc });
    const newCaseHref = await copyRawCaseJson({ reportDir: reportDirAbs, caseId: c.id, version: "new", srcAbs: newCaseSrc });

    if (baseCaseHref) artifactLinks.baseline_case_response_href = baseCaseHref;
    if (newCaseHref) artifactLinks.new_case_response_href = newCaseHref;

    if (baseCaseHref) {
      const bytes = await fileBytesForRel(reportDirAbs, baseCaseHref);
      manifestItems.push({
        ...manifestItemForCaseResponse({ caseId: c.id, version: "baseline", rel_path: baseCaseHref }),
        ...(bytes !== undefined ? { bytes } : {}),
      });
    }
    if (newCaseHref) {
      const bytes = await fileBytesForRel(reportDirAbs, newCaseHref);
      manifestItems.push({
        ...manifestItemForCaseResponse({ caseId: c.id, version: "new", rel_path: newCaseHref }),
        ...(bytes !== undefined ? { bytes } : {}),
      });
    }

    if (baseCaseHref) artifactLinks.baseline_case_response_key = manifestKeyFor({ caseId: c.id, version: "baseline", kind: "case_response" });
    if (newCaseHref) artifactLinks.new_case_response_key = manifestKeyFor({ caseId: c.id, version: "new", kind: "case_response" });

    const trace: TraceIntegrity = {
      baseline: baseResp ? computeTraceIntegritySide(baseResp, c.expected) : missingTraceSide("missing_response"),
      new: newResp ? computeTraceIntegritySide(newResp, c.expected) : missingTraceSide("missing_response"),
    };

    const finalOutputDir = path.join(reportDirAbs, "assets", "final_output", c.id);
    await ensureDir(finalOutputDir);
    if (baseResp) {
      const baseFinal = path.join(finalOutputDir, "baseline.json");
      await writeFile(baseFinal, JSON.stringify(baseResp.final_output ?? {}, null, 2), "utf-8");
      const rel = normRel(reportDirAbs, baseFinal);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item = manifestItemForFinalOutput({
        caseId: c.id,
        version: "baseline",
        rel_path: rel,
        media_type: "application/json",
      });
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }
    if (newResp) {
      const newFinal = path.join(finalOutputDir, "new.json");
      await writeFile(newFinal, JSON.stringify(newResp.final_output ?? {}, null, 2), "utf-8");
      const rel = normRel(reportDirAbs, newFinal);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item = manifestItemForFinalOutput({
        caseId: c.id,
        version: "new",
        rel_path: rel,
        media_type: "application/json",
      });
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }

    if (baseResp?.runner_failure) {
      const rfDir = path.join(reportDirAbs, "assets", "runner_failure", c.id);
      await ensureDir(rfDir);
      const baseSum = path.join(rfDir, "baseline.json");
      await writeFile(baseSum, JSON.stringify(baseResp.runner_failure, null, 2), "utf-8");
      const rel = normRel(reportDirAbs, baseSum);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item: ManifestItem = {
        manifest_key: manifestKeyFor({ caseId: c.id, version: "baseline", kind: "runner_failure" }),
        rel_path: rel,
        media_type: "application/json",
      };
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }
    if (newResp?.runner_failure) {
      const rfDir = path.join(reportDirAbs, "assets", "runner_failure", c.id);
      await ensureDir(rfDir);
      const newSum = path.join(rfDir, "new.json");
      await writeFile(newSum, JSON.stringify(newResp.runner_failure, null, 2), "utf-8");
      const rel = normRel(reportDirAbs, newSum);
      const bytes = await fileBytesForRel(reportDirAbs, rel);
      const item: ManifestItem = {
        manifest_key: manifestKeyFor({ caseId: c.id, version: "new", kind: "runner_failure" }),
        rel_path: rel,
        media_type: "application/json",
      };
      if (bytes !== undefined) item.bytes = bytes;
      manifestItems.push(item);
    }

    const baselineSecurity = baseResp ? computeSecuritySide(baseResp) : { signals: [], requires_gate_recommendation: false };
    const newSecurity = newResp ? computeSecuritySide(newResp) : { signals: [], requires_gate_recommendation: false };

    const regression = baselinePassFlag && !newPassFlag;
    const gateRecommendation = deriveGateRecommendation({
      newSignals: newSecurity.signals,
      newAvailability: newAvail,
      caseStatus,
    });
    const riskLevel = deriveRiskLevel(gateRecommendation);
    const riskTags = deriveRiskTags({ newSignals: newSecurity.signals, regression, caseStatus, newAvailability: newAvail });
    const requiresGate = gateRecommendation !== "none";

    const security: SecurityPack = {
      baseline: { signals: baselineSecurity.signals, requires_gate_recommendation: requiresGate },
      new: { signals: newSecurity.signals, requires_gate_recommendation: requiresGate },
    };

    const failureSummary: { baseline?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number }; new?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number } } = {};
    const fsBaseline = deriveFailureSummarySide(baseResp?.runner_failure);
    const fsNew = deriveFailureSummarySide(newResp?.runner_failure);
    if (fsBaseline) failureSummary.baseline = fsBaseline;
    if (fsNew) failureSummary.new = fsNew;
    const hasFailureSummary = Boolean(failureSummary.baseline || failureSummary.new);

    const item: CompareReport["items"][number] = {
      case_id: c.id,
      title: c.title,
      data_availability: { baseline: baselineAvail, new: newAvail },
      case_status: caseStatus,
      baseline_pass: baselinePassFlag,
      new_pass: newPassFlag,
      preventable_by_policy: nEval ? nEval.preventable_by_policy : true,
      recommended_policy_rules: nEval ? nEval.recommended_policy_rules : mapPolicyRules("missing_case", false),
      artifacts: artifactLinks,
      trace_integrity: trace,
      security,
      risk_level: riskLevel,
      risk_tags: riskTags,
      gate_recommendation: gateRecommendation,
    };
    if (caseStatusReason) item.case_status_reason = caseStatusReason;
    if (hasFailureSummary) item.failure_summary = failureSummary;

    if (bEval?.root_cause !== undefined) item.baseline_root = bEval.root_cause;
    else if (!baseResp) item.baseline_root = "missing_case";

    if (nEval?.root_cause !== undefined) item.new_root = nEval.root_cause;
    else if (!newResp) item.new_root = "missing_case";

    items.push(item);
  }

  const total_cases = items.length;

  const signal_counts_new = severityCountsInit();
  const signal_counts_baseline = severityCountsInit();

  let cases_with_signals_new = 0;
  let cases_with_signals_baseline = 0;

  const risk_summary = { low: 0, medium: 0, high: 0 };
  let cases_requiring_approval = 0;
  let cases_block_recommended = 0;

  const data_coverage = {
    total_cases,
    items_emitted: total_cases,
    missing_baseline_artifacts: 0,
    missing_new_artifacts: 0,
    broken_baseline_artifacts: 0,
    broken_new_artifacts: 0,
  };

  const allNewSignals: SecuritySignal[] = [];
  const allBaselineSignals: SecuritySignal[] = [];

  for (const it of items) {
    const bSigs = it.security.baseline.signals;
    const nSigs = it.security.new.signals;

    if (bSigs.length) cases_with_signals_baseline += 1;
    if (nSigs.length) cases_with_signals_new += 1;

    for (const s of bSigs) {
      bumpCounts(signal_counts_baseline, s.severity);
      allBaselineSignals.push(s);
    }
    for (const s of nSigs) {
      bumpCounts(signal_counts_new, s.severity);
      allNewSignals.push(s);
    }

    risk_summary[it.risk_level] += 1;
    if (it.gate_recommendation === "require_approval") cases_requiring_approval += 1;
    if (it.gate_recommendation === "block") cases_block_recommended += 1;

    if (it.data_availability.baseline.status === "missing") data_coverage.missing_baseline_artifacts += 1;
    if (it.data_availability.baseline.status === "broken") data_coverage.broken_baseline_artifacts += 1;
    if (it.data_availability.new.status === "missing") data_coverage.missing_new_artifacts += 1;
    if (it.data_availability.new.status === "broken") data_coverage.broken_new_artifacts += 1;
  }

  const qualityEntries: Array<{ field: string; value: string; check_exists: boolean }> = [];
  qualityEntries.push({ field: "baseline_dir", value: normRel(projectRoot, baselineDirAbs), check_exists: false });
  qualityEntries.push({ field: "new_dir", value: normRel(projectRoot, newDirAbs), check_exists: false });
  qualityEntries.push({ field: "cases_path", value: normRel(projectRoot, casesPathAbs), check_exists: false });

  for (const it of items) {
    const a = it.artifacts;
    const vals: Array<[string, string | undefined]> = [
      ["items[].artifacts.replay_diff_href", a.replay_diff_href],
      ["items[].artifacts.baseline_failure_body_href", a.baseline_failure_body_href],
      ["items[].artifacts.baseline_failure_meta_href", a.baseline_failure_meta_href],
      ["items[].artifacts.new_failure_body_href", a.new_failure_body_href],
      ["items[].artifacts.new_failure_meta_href", a.new_failure_meta_href],
      ["items[].artifacts.baseline_case_response_href", a.baseline_case_response_href],
      ["items[].artifacts.new_case_response_href", a.new_case_response_href],
      ["items[].artifacts.baseline_run_meta_href", a.baseline_run_meta_href],
      ["items[].artifacts.new_run_meta_href", a.new_run_meta_href],
    ];
    for (const [field, v] of vals) {
      if (typeof v === "string" && v.length) {
        qualityEntries.push({ field, value: v, check_exists: true });
      }
    }
  }

  const quality_flags = await computeQualityFlags(reportDirAbs, qualityEntries);

  const report: CompareReport & { embedded_manifest_index?: ThinIndex } = {
    contract_version: 5,
    report_id: reportId,
    baseline_dir: normRel(projectRoot, baselineDirAbs),
    new_dir: normRel(projectRoot, newDirAbs),
    cases_path: normRel(projectRoot, casesPathAbs),
    summary: {
      baseline_pass: baselinePass,
      new_pass: newPass,
      regressions,
      improvements,
      root_cause_breakdown: breakdown,
      quality: {
        transfer_class: transferClass,
        redaction_status: redactionStatus,
        ...(redactionStatus === "applied" && redactionPresetId ? { redaction_preset_id: redactionPresetId } : {}),
      },
      security: {
        total_cases,
        cases_with_signals_new,
        cases_with_signals_baseline,
        signal_counts_new,
        signal_counts_baseline,
        top_signal_kinds_new: topKinds(allNewSignals),
        top_signal_kinds_baseline: topKinds(allBaselineSignals),
      },
      risk_summary,
      cases_requiring_approval,
      cases_block_recommended,
      data_coverage,
    },
    quality_flags,
    items,
  };

  await writeFile(path.join(reportDirAbs, "compare-report.json"), JSON.stringify(report, null, 2), "utf-8");

  const manifest: Manifest = {
    manifest_version: "v1",
    generated_at: Date.now(),
    items: manifestItems,
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestRel = "artifacts/manifest.json";
  await ensureDir(path.join(reportDirAbs, "artifacts"));
  await writeFile(path.join(reportDirAbs, manifestRel), manifestJson, "utf-8");

  if (redactionStatus === "applied") {
    const redactionSummary = {
      preset_id: redactionPresetId ?? "unknown",
      categories_targeted: [],
      actions: [],
      touched: [],
      warnings: ["Redaction is best-effort; not a guarantee of complete removal."],
    };
    const redactionRel = "artifacts/redaction-summary.json";
    await writeFile(path.join(reportDirAbs, redactionRel), JSON.stringify(redactionSummary, null, 2), "utf-8");
    const bytes = await fileBytesForRel(reportDirAbs, redactionRel);
    manifestItems.push({
      manifest_key: "redaction/summary",
      rel_path: redactionRel,
      media_type: "application/json",
      ...(bytes !== undefined ? { bytes } : {}),
    });
  }

  const thinIndex: ThinIndex = {
    manifest_version: "v1",
    generated_at: manifest.generated_at,
    source_manifest_sha256: sha256Hex(manifestJson),
    items: manifest.items.map((it) => ({ manifest_key: it.manifest_key, rel_path: it.rel_path, media_type: it.media_type })),
  };

  for (const it of items) {
    const b = baselineById[it.case_id];
    const n = newById[it.case_id];

    if (!b || !n) {
      const caseHtml = renderMissingCaseHtml(it.case_id, { baseline: !b, new: !n });
      await writeFile(path.join(reportDirAbs, `case-${it.case_id}.html`), caseHtml, "utf-8");
      continue;
    }

    const baseReplay = toReplayResponse(b);
    const newReplay = toReplayResponse(n);

    const brf = (baseReplay as unknown as { runner_failure?: Record<string, unknown> }).runner_failure;
    if (brf && typeof brf === "object") {
      if (typeof it.artifacts.baseline_failure_body_href === "string") brf.full_body_saved_to = it.artifacts.baseline_failure_body_href;
      if (typeof it.artifacts.baseline_failure_meta_href === "string") brf.full_body_meta_saved_to = it.artifacts.baseline_failure_meta_href;
    }

    const nrf = (newReplay as unknown as { runner_failure?: Record<string, unknown> }).runner_failure;
    if (nrf && typeof nrf === "object") {
      if (typeof it.artifacts.new_failure_body_href === "string") nrf.full_body_saved_to = it.artifacts.new_failure_body_href;
      if (typeof it.artifacts.new_failure_meta_href === "string") nrf.full_body_meta_saved_to = it.artifacts.new_failure_meta_href;
    }

    const caseHtml = renderCaseDiffHtml(it.case_id, baseReplay, newReplay);
    await writeFile(path.join(reportDirAbs, `case-${it.case_id}.html`), caseHtml, "utf-8");
  }


  report.embedded_manifest_index = thinIndex;

  const html = renderHtmlReport(report);
  await writeFile(path.join(reportDirAbs, "report.html"), html, "utf-8");

  console.log(`html report: ${normRel(projectRoot, path.join(reportDirAbs, "report.html"))}`);
  console.log(`compare report: ${normRel(projectRoot, path.join(reportDirAbs, "compare-report.json"))}`);
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
