//tool/apps/evaluator/src/index.ts
import path from "node:path";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Ajv from "ajv";
import {
  renderHtmlReport,
  type CompareReport,
  type TraceIntegrity,
  type TraceIntegritySide,
  type SecurityPack,
  type SecuritySignal,
  type QualityFlags,
  type SignalSeverity,
  type EvidenceRef,
} from "./htmlReport";
import { renderCaseDiffHtml, type AgentResponse as ReplayAgentResponse } from "./replayDiff";

type Version = "baseline" | "new";

type Expected = {
  action_required?: string[];
  evidence_required_for_actions?: boolean;
  tool_required?: string[];
  tool_sequence?: string[];
  json_schema?: unknown;
  retrieval_required?: { doc_ids?: string[] };
  must_include?: string[];
  must_not_include?: string[];
};

type Case = {
  id: string;
  title: string;
  input: { user: string; context?: unknown };
  expected: Expected;
};

type ProposedAction = {
  action_id: string;
  action_type: string;
  tool_name: string;
  params: Record<string, unknown>;
  risk_level?: "low" | "medium" | "high";
  risk_tags?: string[];
  evidence_refs?: EvidenceRef[];
};

type FinalOutput = { content_type: "text" | "json"; content: unknown };

type ToolCallEvent = {
  type: "tool_call";
  ts: number;
  call_id: string;
  action_id?: string;
  tool: string;
  args: Record<string, unknown>;
};

type ToolResultEvent = {
  type: "tool_result";
  ts: number;
  call_id: string;
  action_id?: string;
  status: "ok" | "error" | "timeout";
  latency_ms?: number;
  payload_summary?: Record<string, unknown> | string;
};

type RetrievalEvent = {
  type: "retrieval";
  ts: number;
  query?: string;
  doc_ids?: string[];
  snippets_hashes?: string[];
};

type FinalOutputEvent = {
  type: "final_output";
  ts: number;
  content_type: "text" | "json";
  content: unknown;
};

type RunEvent = ToolCallEvent | ToolResultEvent | RetrievalEvent | FinalOutputEvent;

type FetchFailureClass = "http_error" | "timeout" | "network_error" | "invalid_json";

type RunnerFailureArtifact = {
  type: "runner_fetch_failure";
  class: FetchFailureClass;
  case_id: string;
  version: Version;
  url: string;
  attempt: number;
  timeout_ms: number;
  latency_ms: number;
  status?: number;
  status_text?: string;
  error_name?: string;
  error_message?: string;
  body_snippet?: string;
  full_body_saved_to?: string;
  full_body_meta_saved_to?: string;
};

type AgentResponse = {
  case_id: string;
  version: Version;
  workflow_id?: string;
  final_output: FinalOutput;

  events?: RunEvent[];
  proposed_actions?: ProposedAction[];
  runner_failure?: RunnerFailureArtifact;
};

type RootCause =
  | "tool_failure"
  | "format_violation"
  | "missing_required_data"
  | "wrong_tool_choice"
  | "hallucination_signal"
  | "missing_case"
  | "unknown";

type AssertionDetails = Record<string, unknown>;
type AssertionResult = { name: string; pass: boolean; details?: AssertionDetails };

type EvaluationResult = {
  case_id: string;
  title: string;
  pass: boolean;
  assertions: AssertionResult[];
  preventable_by_policy: boolean;
  recommended_policy_rules: string[];
  root_cause?: RootCause;
};

const HELP_TEXT = `
Usage:
  evaluator --cases <path> --baselineDir <dir> --newDir <dir> [--outDir <dir>] [--reportId <id>]

Required:
  --cases        Path to cases JSON (e.g. cases/cases.json)
  --baselineDir  Baseline run directory (e.g. apps/runner/runs/baseline/latest)
  --newDir       New run directory (e.g. apps/runner/runs/new/latest)

Optional:
  --outDir       Output directory for reports (default: apps/evaluator/reports/<reportId>)
  --reportId     Report id (default: random UUID)
  --help, -h     Show this help
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

function stringifyOutput(out: FinalOutput): string {
  if (out.content_type === "text") return String(out.content ?? "");
  try {
    return JSON.stringify(out.content ?? {}, null, 2);
  } catch {
    return String(out.content ?? "");
  }
}

function toolCalls(events: RunEvent[]): ToolCallEvent[] {
  return events.filter((e): e is ToolCallEvent => e.type === "tool_call");
}

function toolResults(events: RunEvent[]): ToolResultEvent[] {
  return events.filter((e): e is ToolResultEvent => e.type === "tool_result");
}

function retrievalEvents(events: RunEvent[]): RetrievalEvent[] {
  return events.filter((e): e is RetrievalEvent => e.type === "retrieval");
}

function finalOutputEvents(events: RunEvent[]): FinalOutputEvent[] {
  return events.filter((e): e is FinalOutputEvent => e.type === "final_output");
}

function extractToolCallNames(events: RunEvent[]): string[] {
  const calls = toolCalls(events);
  const withIdx = calls.map((e, idx) => ({ e, idx }));
  withIdx.sort((a, b) => {
    const ta = a.e.ts;
    const tb = b.e.ts;
    const fa = Number.isFinite(ta);
    const fb = Number.isFinite(tb);
    if (fa && fb) return ta - tb;
    if (fa) return -1;
    if (fb) return 1;
    return a.idx - b.idx;
  });
  return withIdx.map((x) => x.e.tool);
}

function extractRetrievalDocIds(events: RunEvent[]): string[] {
  const ids: string[] = [];
  for (const e of retrievalEvents(events)) {
    if (Array.isArray(e.doc_ids)) ids.push(...e.doc_ids);
  }
  return ids;
}

type ToolResultWithTool = {
  call_id: string;
  status: "ok" | "error" | "timeout";
  payload_summary?: Record<string, unknown> | string;
  tool?: string;
};

function extractToolResultsWithToolName(events: RunEvent[]): ToolResultWithTool[] {
  const byCallId = new Map<string, string>();
  for (const c of toolCalls(events)) byCallId.set(c.call_id, c.tool);

  const out: ToolResultWithTool[] = [];
  for (const r of toolResults(events)) {
    const t = byCallId.get(r.call_id);
    const base: ToolResultWithTool = { call_id: r.call_id, status: r.status };
    if (r.payload_summary !== undefined) base.payload_summary = r.payload_summary;
    if (t !== undefined) base.tool = t;
    out.push(base);
  }
  return out;
}

function checkEvidenceRefsStrict(expected: Expected, resp: AgentResponse): AssertionResult {
  if (expected.evidence_required_for_actions !== true) {
    return { name: "evidence_required_for_actions", pass: true, details: { note: "not required" } };
  }

  const ev = resp.events ?? [];
  const toolResultIds = new Set(toolResults(ev).map((e) => e.call_id));
  const retrievalIds = new Set(extractRetrievalDocIds(ev));
  const missingActions: string[] = [];

  const respAny = resp as unknown as Record<string, unknown>;
  const actionsRaw = respAny.proposed_actions;
  const actions = Array.isArray(actionsRaw) ? (actionsRaw as ProposedAction[]) : [];

  for (const a of actions) {
    const risk = a.risk_level ?? "medium";
    if (risk === "low") continue;

    const refs = Array.isArray(a.evidence_refs) ? a.evidence_refs : [];
    if (refs.length === 0) {
      missingActions.push(a.action_id);
      continue;
    }

    for (const r of refs) {
      if (r.kind === "tool_result" && !toolResultIds.has(r.call_id)) {
        return {
          name: "evidence_required_for_actions",
          pass: false,
          details: { error: "evidence_refs references missing tool_result", action_id: a.action_id, call_id: r.call_id },
        };
      }
      if (r.kind === "retrieval_doc" && !retrievalIds.has(r.id)) {
        return {
          name: "evidence_required_for_actions",
          pass: false,
          details: { error: "evidence_refs references missing retrieval_doc", action_id: a.action_id, doc_id: r.id },
        };
      }
    }
  }

  return {
    name: "evidence_required_for_actions",
    pass: missingActions.length === 0,
    details: { actions_missing_evidence: missingActions },
  };
}

function checkToolExecution(resp: AgentResponse): AssertionResult {
  const ev = resp.events ?? [];
  const failed = toolResults(ev)
    .filter((e) => e.status !== "ok")
    .map((e) => ({ call_id: e.call_id, status: e.status }));

  return {
    name: "tool_execution",
    pass: failed.length === 0,
    details: { failed },
  };
}

function checkHallucinationSignal(resp: AgentResponse): AssertionResult {
  let mentioned: string | null = null;

  if (resp.final_output.content_type === "json" && resp.final_output.content && typeof resp.final_output.content === "object") {
    const obj = resp.final_output.content as Record<string, unknown>;
    const ticketId = obj.ticket_id;
    if (typeof ticketId === "string" && ticketId.length > 0) mentioned = ticketId;
  }

  if (!mentioned) {
    const text = stringifyOutput(resp.final_output);
    const m = text.match(/\bT-\d{4}\b/);
    if (!m) return { name: "hallucination_signal_check", pass: true, details: { note: "no ticket id in output" } };
    mentioned = m[0];
  }

  const results = extractToolResultsWithToolName(resp.events ?? []);
  const create = results.find((r) => r.tool === "create_ticket" && r.status === "ok");

  if (!create || create.payload_summary === undefined || typeof create.payload_summary !== "object") {
    return { name: "hallucination_signal_check", pass: true, details: { note: "no create_ticket result to compare" } };
  }

  const ticketId = (create.payload_summary as Record<string, unknown>).ticket_id;
  if (typeof ticketId !== "string") {
    return { name: "hallucination_signal_check", pass: true, details: { note: "create_ticket result has no ticket_id" } };
  }

  const mismatch = ticketId !== mentioned;
  return {
    name: "hallucination_signal_check",
    pass: !mismatch,
    details: { tool_ticket_id: ticketId, mentioned_ticket_id: mentioned, mismatch },
  };
}

function mapPolicyRules(root: RootCause | undefined, evidenceFailed: boolean): string[] {
  const rules: string[] = [];
  if (root === "wrong_tool_choice") rules.push("Rule1");
  if (root === "format_violation") rules.push("Rule3");
  if (root === "missing_required_data") rules.push("Rule2", "Rule4");
  if (root === "hallucination_signal") rules.push("Rule3", "Rule4");
  if (root === "missing_case") rules.push("Rule2");
  if (evidenceFailed) rules.push("Rule4");
  return Array.from(new Set(rules));
}

function chooseRootCause(assertions: AssertionResult[], resp: AgentResponse): RootCause {
  const ev = resp.events ?? [];
  const toolFailure = toolResults(ev).some((e) => e.status === "error" || e.status === "timeout");
  if (toolFailure) return "tool_failure";

  const schema = assertions.find((a) => a.name === "json_schema");
  if (schema && schema.pass === false) return "format_violation";

  const retrieval = assertions.find((a) => a.name === "retrieval_required");
  if (retrieval && retrieval.pass === false) return "missing_required_data";

  const wrongTool = ["action_required", "tool_required", "tool_sequence"].some((n) => {
    const a = assertions.find((x) => x.name === n);
    return a ? a.pass === false : false;
  });
  if (wrongTool) return "wrong_tool_choice";

  const halluc = assertions.find((a) => a.name === "hallucination_signal_check");
  if (halluc && halluc.pass === false) return "hallucination_signal";

  const rf = resp.runner_failure;
  if (rf && rf.type === "runner_fetch_failure") {
    if (rf.class === "timeout" || rf.class === "network_error" || rf.class === "http_error" || rf.class === "invalid_json") {
      return "missing_required_data";
    }
  }

  return "unknown";
}

function missingTraceSide(reason: string): TraceIntegritySide {
  return { status: "broken", issues: [reason] };
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

function evaluateOne(c: Case, resp: AgentResponse, ajv: Ajv): EvaluationResult {
  const exp = c.expected;
  const assertions: AssertionResult[] = [];

  const actionsRaw = (resp as unknown as Record<string, unknown>).proposed_actions;
  const actions = Array.isArray(actionsRaw) ? (actionsRaw as ProposedAction[]) : [];
  const plannedActions = actions.map((a) => a.action_type);

  if (exp.action_required?.length) {
    const missing = exp.action_required.filter((x) => !plannedActions.includes(x));
    assertions.push({ name: "action_required", pass: missing.length === 0, details: { missing_actions: missing } });
  }

  const ev = resp.events ?? [];
  const calls = extractToolCallNames(ev);

  if (exp.tool_required?.length) {
    const missing = exp.tool_required.filter((t) => !calls.includes(t));
    assertions.push({ name: "tool_required", pass: missing.length === 0, details: { missing_tools: missing } });
  }

  if (exp.tool_sequence?.length) {
    const pass = exp.tool_sequence.every((t, i) => calls[i] === t);
    assertions.push({ name: "tool_sequence", pass, details: { expected: exp.tool_sequence, actual: calls } });
  }

  if (exp.must_include?.length) {
    const out = stringifyOutput(resp.final_output).toLowerCase();
    const missing = exp.must_include.filter((p) => !out.includes(p.toLowerCase()));
    assertions.push({ name: "must_include", pass: missing.length === 0, details: { missing_phrases: missing } });
  }

  if (exp.must_not_include?.length) {
    const out = stringifyOutput(resp.final_output).toLowerCase();
    const found = exp.must_not_include.filter((p) => out.includes(p.toLowerCase()));
    assertions.push({ name: "must_not_include", pass: found.length === 0, details: { found_phrases: found } });
  }

  if (exp.retrieval_required?.doc_ids?.length) {
    const docs = extractRetrievalDocIds(ev);
    const missing = exp.retrieval_required.doc_ids.filter((d) => !docs.includes(d));
    assertions.push({
      name: "retrieval_required",
      pass: missing.length === 0,
      details: { missing_doc_ids: missing, actual_doc_ids: docs },
    });
  }

  if (exp.json_schema !== undefined && exp.json_schema !== null) {
    const validate = ajv.compile(exp.json_schema);
    const pass = Boolean(validate(resp.final_output.content));
    assertions.push({
      name: "json_schema",
      pass,
      details: pass ? { schema_errors: [] } : { schema_errors: validate.errors ?? [] },
    });
  }

  const evidence = checkEvidenceRefsStrict(exp, resp);
  assertions.push(evidence);

  const toolExec = checkToolExecution(resp);
  assertions.push(toolExec);

  const halluc = checkHallucinationSignal(resp);
  assertions.push(halluc);

  const passAll = assertions.every((a) => a.pass === true);
  const root = passAll ? undefined : chooseRootCause(assertions, resp);

  const evidenceFailed = exp.evidence_required_for_actions === true && evidence.pass === false;
  const preventableByPolicy = (root !== undefined && root !== "tool_failure") || evidenceFailed;
  const rules = mapPolicyRules(root, evidenceFailed);

  const result: EvaluationResult = {
    case_id: c.id,
    title: c.title,
    pass: passAll,
    assertions,
    preventable_by_policy: preventableByPolicy,
    recommended_policy_rules: rules,
  };

  if (!passAll && root !== undefined) result.root_cause = root;
  return result;
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

async function readRunDir(dir: string): Promise<{ byId: Record<string, AgentResponse>; meta: Record<string, unknown>; ids: string[] }> {
  const runJsonAbs = path.join(dir, "run.json");
  const meta = JSON.parse(await readFile(runJsonAbs, "utf-8")) as Record<string, unknown>;
  const selected = meta.selected_case_ids;
  const ids = Array.isArray(selected) ? selected.map((x) => String(x)) : [];

  const byId: Record<string, AgentResponse> = {};
  for (const id of ids) {
    const file = path.join(dir, `${id}.json`);
    try {
      const raw = await readFile(file, "utf-8");
      const v = JSON.parse(raw) as AgentResponse;
      byId[id] = v;
    } catch {
      continue;
    }
  }

  return { byId, meta, ids };
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

function computeTraceIntegritySide(resp: AgentResponse, expected: Expected): TraceIntegritySide {
  const issues: string[] = [];
  const events = Array.isArray(resp.events) ? resp.events : [];
  const calls = toolCalls(events);
  const results = toolResults(events);
  const retrievals = retrievalEvents(events);
  const finals = finalOutputEvents(events);

  if (!Array.isArray(resp.events)) issues.push("events_not_array");
  if (events.length === 0) issues.push("no_events");

  const callIds = calls.map((c) => c.call_id);
  const resultIds = results.map((r) => r.call_id);

  const callIdSet = new Set<string>();
  let dupCalls = 0;
  for (const id of callIds) {
    if (callIdSet.has(id)) dupCalls += 1;
    callIdSet.add(id);
  }

  const resultIdSet = new Set<string>();
  let dupResults = 0;
  for (const id of resultIds) {
    if (resultIdSet.has(id)) dupResults += 1;
    resultIdSet.add(id);
  }

  if (dupCalls > 0 || dupResults > 0) issues.push("duplicate_call_id");

  let missingToolResults = 0;
  for (const id of callIdSet) {
    if (!resultIdSet.has(id)) missingToolResults += 1;
  }
  let orphanToolResults = 0;
  for (const id of resultIdSet) {
    if (!callIdSet.has(id)) orphanToolResults += 1;
  }

  if (missingToolResults > 0) issues.push("tool_call_without_result");
  if (orphanToolResults > 0) issues.push("tool_result_without_call");

  let nonFiniteTs = 0;
  for (const e of events) {
    const ts = (e as { ts?: unknown }).ts;
    if (typeof ts !== "number" || !Number.isFinite(ts)) nonFiniteTs += 1;
  }
  if (nonFiniteTs > 0) issues.push("missing_timestamps");

  if (finals.length === 0) issues.push("missing_final_output_event");

  if (expected.retrieval_required?.doc_ids?.length) {
    if (retrievals.length === 0) issues.push("retrieval_required_missing");
  }

  const hasRunnerFailure = Boolean(resp.runner_failure && resp.runner_failure.type === "runner_fetch_failure");

  if (issues.length === 0) return { status: "ok", issues: [] };

  const isBroken =
    (events.length === 0 && !hasRunnerFailure) ||
    issues.includes("events_not_array") ||
    issues.includes("tool_result_without_call");

  return { status: isBroken ? "broken" : "partial", issues };
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

function severityCountsInit(): Record<SignalSeverity, number> {
  return { low: 0, medium: 0, high: 0, critical: 0 };
}

function bumpCounts(counts: Record<SignalSeverity, number>, severity: SignalSeverity): void {
  counts[severity] = (counts[severity] ?? 0) + 1;
}

function extractUrls(text: string): string[] {
  const m = text.match(/\bhttps?:\/\/[^\s)"]+/gi) ?? [];
  const out: string[] = [];
  for (const u of m) {
    const s = String(u || "").trim();
    if (s) out.push(s);
  }
  return out.slice(0, 20);
}

function hasSecretMarkers(text: string): boolean {
  const secretMarkers = [
    /api[_-]?key/i,
    /\bsecret\b/i,
    /bearer\s+[a-z0-9_\-\.]{10,}/i,
    /\bsk-[a-z0-9]{10,}\b/i,
    /\bpassword\b/i,
    /private[_-]?key/i,
  ];
  return secretMarkers.some((re) => re.test(text));
}

function hasPiiMarkers(text: string): boolean {
  const piiMarkers = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  ];
  return piiMarkers.some((re) => re.test(text));
}

function hasInjectionMarkers(text: string): boolean {
  const markers = [
    /ignore\s+previous\s+instructions/i,
    /system\s+prompt/i,
    /developer\s+message/i,
    /reveal\s+your\s+prompt/i,
    /exfiltrate/i,
  ];
  return markers.some((re) => re.test(text));
}

function countUnsafeToolParams(resp: AgentResponse): number {
  const actions = Array.isArray(resp.proposed_actions) ? resp.proposed_actions : [];
  let count = 0;
  for (const a of actions) {
    const params = (a as { params?: unknown }).params;
    if (!params || typeof params !== "object") continue;
    const s = JSON.stringify(params);
    if (/password|api[_-]?key|secret|token/i.test(s)) count += 1;
  }
  return count;
}

function computeSecuritySide(resp: AgentResponse): { signals: SecuritySignal[]; requires_gate_recommendation: boolean } {
  const signals: SecuritySignal[] = [];

  const finalText = stringifyOutput(resp.final_output);
  const rf = resp.runner_failure;

  const evidenceFinal: EvidenceRef[] = [{ kind: "final_output" }];
  const evidenceRunner: EvidenceRef[] = rf ? [{ kind: "runner_failure" }] : [];

  const urls = extractUrls(finalText);
  if (urls.length) {
    signals.push({
      kind: "untrusted_url_input",
      severity: "medium",
      confidence: "medium",
      title: "URLs present in final output",
      details: { urls },
      evidence_refs: evidenceFinal,
    });
  }

  if (hasSecretMarkers(finalText)) {
    signals.push({
      kind: "secret_in_output",
      severity: "high",
      confidence: "medium",
      title: "Possible secret marker in output",
      details: { notes: "Matched secret-like patterns in final_output" },
      evidence_refs: evidenceFinal,
    });
  }

  if (hasPiiMarkers(finalText)) {
    signals.push({
      kind: "pii_in_output",
      severity: "high",
      confidence: "medium",
      title: "Possible PII marker in output",
      details: { notes: "Matched PII-like patterns in final_output" },
      evidence_refs: evidenceFinal,
    });
  }

  if (hasInjectionMarkers(finalText)) {
    signals.push({
      kind: "prompt_injection_marker",
      severity: "high",
      confidence: "high",
      title: "Prompt-injection markers detected",
      details: { notes: "Matched injection-like strings in final_output" },
      evidence_refs: evidenceFinal,
    });
  }

  const unsafeParams = countUnsafeToolParams(resp);
  if (unsafeParams > 0) {
    signals.push({
      kind: "high_risk_action",
      severity: "high",
      confidence: "medium",
      title: "Unsafe tool parameters detected",
      details: { notes: `Detected ${unsafeParams} suspicious tool params occurrences`, fields: ["params"] },
      evidence_refs: Array.isArray(resp.proposed_actions) ? [{ kind: "final_output" }] : evidenceFinal,
    });
  }

  const ev = Array.isArray(resp.events) ? resp.events : [];
  const retrievals = retrievalEvents(ev);
  for (const r of retrievals) {
    const q = typeof r.query === "string" ? r.query : "";
    if (q && hasInjectionMarkers(q)) {
      signals.push({
        kind: "prompt_injection_marker",
        severity: "critical",
        confidence: "high",
        title: "Prompt-injection markers detected in retrieval query",
        details: { notes: q.slice(0, 200) },
        evidence_refs: [{ kind: "final_output" }],
      });
      break;
    }
  }

  if (rf && rf.type === "runner_fetch_failure") {
    const note = [
      rf.class ? `class=${rf.class}` : "",
      rf.error_name ? `error_name=${rf.error_name}` : "",
      rf.error_message ? `error=${rf.error_message}` : "",
      rf.url ? `url=${rf.url}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const details: { notes?: string; urls?: string[] } = { notes: note };
    if (rf.url) details.urls = [rf.url];

    signals.push({
      kind: "runner_failure_detected",
      severity: rf.class === "network_error" || rf.class === "timeout" ? "high" : "medium",
      confidence: "high",
      title: "Runner failure captured",
      details,
      evidence_refs: evidenceRunner,
    });
  }

  const requiresGate =
    signals.some((s) => s.severity === "high" || s.severity === "critical") &&
    (resp.runner_failure !== undefined || (resp.events ?? []).length === 0);

  return { signals, requires_gate_recommendation: requiresGate };
}

function topKinds(signals: SecuritySignal[]): string[] {
  const counts = new Map<string, number>();
  for (const s of signals) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 5)
    .map(([k]) => k);
}

async function computeQualityFlags(reportDir: string, hrefs: string[]): Promise<QualityFlags> {
  const missing_assets: string[] = [];
  const path_violations: string[] = [];

  for (const href of hrefs) {
    if (!href) continue;

    if (isAbsoluteOrBadHref(href)) {
      path_violations.push(href);
      continue;
    }

    const abs = path.resolve(reportDir, href);
    const ok = await fileExistsAbs(abs);
    if (!ok) missing_assets.push(href);
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

  assertNoUnknownOptions(new Set(["--cases", "--baselineDir", "--newDir", "--outDir", "--reportId", "--help", "-h"]));
  assertHasValue("--cases");
  assertHasValue("--baselineDir");
  assertHasValue("--newDir");
  assertHasValue("--outDir");
  assertHasValue("--reportId");

  const casesArg = getArg("--cases");
  const baselineArg = getArg("--baselineDir");
  const newArg = getArg("--newDir");

  if (!casesArg || !baselineArg || !newArg) {
    throw new CliUsageError(`Missing required arguments.\n\n${HELP_TEXT}`);
  }

  const casesPathAbs = resolveFromRoot(projectRoot, casesArg);
  const baselineDirAbs = resolveFromRoot(projectRoot, baselineArg);
  const newDirAbs = resolveFromRoot(projectRoot, newArg);

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

  for (const c of cases) {
    const bEval = baselineEval.find((x) => x.case_id === c.id);
    const nEval = newEval.find((x) => x.case_id === c.id);
    const baseResp = baselineById[c.id];
    const newResp = newById[c.id];

    const baselinePassFlag = bEval?.pass ?? false;
    const newPassFlag = nEval?.pass ?? false;

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
    }

    const baseCaseSrc = path.join(baselineDirAbs, `${c.id}.json`);
    const newCaseSrc = path.join(newDirAbs, `${c.id}.json`);

    const baseCaseHref = await copyRawCaseJson({ reportDir: reportDirAbs, caseId: c.id, version: "baseline", srcAbs: baseCaseSrc });
    const newCaseHref = await copyRawCaseJson({ reportDir: reportDirAbs, caseId: c.id, version: "new", srcAbs: newCaseSrc });

    if (baseCaseHref) artifactLinks.baseline_case_response_href = baseCaseHref;
    if (newCaseHref) artifactLinks.new_case_response_href = newCaseHref;

    const trace: TraceIntegrity = {
      baseline: baseResp ? computeTraceIntegritySide(baseResp, c.expected) : missingTraceSide("missing_response"),
      new: newResp ? computeTraceIntegritySide(newResp, c.expected) : missingTraceSide("missing_response"),
    };

    const security: SecurityPack = {
      baseline: baseResp ? computeSecuritySide(baseResp) : { signals: [], requires_gate_recommendation: false },
      new: newResp ? computeSecuritySide(newResp) : { signals: [], requires_gate_recommendation: false },
    };

    const item: CompareReport["items"][number] = {
      case_id: c.id,
      title: c.title,
      baseline_pass: baselinePassFlag,
      new_pass: newPassFlag,
      preventable_by_policy: nEval ? nEval.preventable_by_policy : true,
      recommended_policy_rules: nEval ? nEval.recommended_policy_rules : mapPolicyRules("missing_case", false),
      artifacts: artifactLinks,
      trace_integrity: trace,
      security,
    };

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
  }

  const qualityHrefs: string[] = [];
  for (const it of items) {
    const a = it.artifacts;
    const vals: Array<string | undefined> = [
      a.replay_diff_href,
      a.baseline_failure_body_href,
      a.baseline_failure_meta_href,
      a.new_failure_body_href,
      a.new_failure_meta_href,
      a.baseline_case_response_href,
      a.new_case_response_href,
      a.baseline_run_meta_href,
      a.new_run_meta_href,
    ];
    for (const v of vals) {
      if (typeof v === "string" && v.length) qualityHrefs.push(v);
    }
  }

  const quality_flags = await computeQualityFlags(reportDirAbs, qualityHrefs);

  const report: CompareReport = {
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
      security: {
        total_cases,
        cases_with_signals_new,
        cases_with_signals_baseline,
        signal_counts_new,
        signal_counts_baseline,
        top_signal_kinds_new: topKinds(allNewSignals),
        top_signal_kinds_baseline: topKinds(allBaselineSignals),
      },
    },
    quality_flags,
    items,
  };

  await writeFile(path.join(reportDirAbs, "compare-report.json"), JSON.stringify(report, null, 2), "utf-8");

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
