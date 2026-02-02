//tool/apps/evaluator/src/index.ts
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Ajv from "ajv";
import { renderHtmlReport } from "./htmlReport";
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

type EvidenceRef = { kind: "tool_result"; call_id: string } | { kind: "retrieval_doc"; id: string };

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

type AgentResponse = {
  case_id: string;
  version: Version;
  workflow_id?: string;
  proposed_actions: ProposedAction[];
  final_output: FinalOutput;
  events: RunEvent[];
};

type RootCause =
  | "tool_failure"
  | "format_violation"
  | "missing_required_data"
  | "wrong_tool_choice"
  | "hallucination_signal"
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

type CompareReportItem = {
  case_id: string;
  title: string;
  baseline_pass: boolean;
  new_pass: boolean;
  preventable_by_policy: boolean;
  recommended_policy_rules: string[];
  baseline_root?: RootCause;
  new_root?: RootCause;
};

type CompareReport = {
  report_id: string;
  baseline_dir: string;
  new_dir: string;
  cases_path: string;
  summary: {
    baseline_pass: number;
    new_pass: number;
    regressions: number;
    improvements: number;
    root_cause_breakdown: Record<string, number>;
  };
  items: CompareReportItem[];
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

Exit codes:
  0  success
  1  runtime error
  2  bad arguments / usage

Examples:
  ts-node src/index.ts --cases cases/cases.json --baselineDir apps/runner/runs/baseline/latest --newDir apps/runner/runs/new/latest --outDir apps/evaluator/reports/latest --reportId latest
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
function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("--")) return null;
  return val;
}

function resolveFromRoot(projectRoot: string, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(projectRoot, p);
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

function stringifyOutput(out: FinalOutput): string {
  if (out.content_type === "text") return String(out.content ?? "");
  return JSON.stringify(out.content ?? {});
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

function extractToolCallNames(events: RunEvent[]): string[] {
  return toolCalls(events).map((e) => e.tool);
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

  const toolResultIds = new Set(toolResults(resp.events).map((e) => e.call_id));
  const retrievalIds = new Set(extractRetrievalDocIds(resp.events));
  const missingActions: string[] = [];

  for (const a of resp.proposed_actions) {
    const risk = a.risk_level ?? "medium";
    if (risk === "low") continue;

    const refs = a.evidence_refs ?? [];
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
  const failed = toolResults(resp.events)
    .filter((e) => e.status !== "ok")
    .map((e) => ({ call_id: e.call_id, status: e.status }));

  return {
    name: "tool_execution",
    pass: failed.length === 0,
    details: failed.length === 0 ? { failed: [] } : { failed },
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

  const results = extractToolResultsWithToolName(resp.events);
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
  if (evidenceFailed) rules.push("Rule4");
  return Array.from(new Set(rules));
}

function chooseRootCause(assertions: AssertionResult[], resp: AgentResponse): RootCause {
  const toolFailure = toolResults(resp.events).some((e) => e.status === "error" || e.status === "timeout");
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

  return "unknown";
}

function evaluateOne(c: Case, resp: AgentResponse, ajv: Ajv): EvaluationResult {
  const exp = c.expected;
  const assertions: AssertionResult[] = [];

  const plannedActions = resp.proposed_actions.map((a) => a.action_type);

  if (exp.action_required?.length) {
    const missing = exp.action_required.filter((x) => !plannedActions.includes(x));
    assertions.push({ name: "action_required", pass: missing.length === 0, details: { missing_actions: missing } });
  }

  const calls = extractToolCallNames(resp.events);

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
    const docs = extractRetrievalDocIds(resp.events);
    const missing = exp.retrieval_required.doc_ids.filter((d) => !docs.includes(d));
    assertions.push({ name: "retrieval_required", pass: missing.length === 0, details: { missing_doc_ids: missing, actual_doc_ids: docs } });
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

async function readRunDir(dir: string): Promise<Record<string, AgentResponse>> {
  const meta = JSON.parse(await readFile(path.join(dir, "run.json"), "utf-8")) as { selected_case_ids?: unknown };
  const ids = Array.isArray(meta.selected_case_ids) ? meta.selected_case_ids.map((x) => String(x)) : [];

  const out: Record<string, AgentResponse> = {};
  for (const id of ids) {
    const raw = await readFile(path.join(dir, `${id}.json`), "utf-8");
    out[id] = JSON.parse(raw) as AgentResponse;
  }
  return out;
}

function parseReplayAgentResponse(raw: string): ReplayAgentResponse {
  const v: unknown = JSON.parse(raw);
  return v as ReplayAgentResponse;
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


  const casesPath = resolveFromRoot(projectRoot, casesArg);
  const baselineDir = resolveFromRoot(projectRoot, baselineArg);
  const newDir = resolveFromRoot(projectRoot, newArg);
const rel = (p: string) => path.relative(projectRoot, p).split(path.sep).join("/");

  const reportId = getArg("--reportId") ?? randomUUID();
  const outDirArg = getArg("--outDir") ?? path.join("apps", "evaluator", "reports", reportId);
  const outDir = resolveFromRoot(projectRoot, outDirArg);

  await ensureDir(outDir);

  const cases = await readCases(casesPath);
  const baseline = await readRunDir(baselineDir);
  const newer = await readRunDir(newDir);

  const ajv = new Ajv({ allErrors: true, strict: false });

  const baselineEval: EvaluationResult[] = [];
  const newEval: EvaluationResult[] = [];

  for (const c of cases) {
    const b = baseline[c.id];
    if (b) baselineEval.push(evaluateOne(c, b, ajv));

    const n = newer[c.id];
    if (n) newEval.push(evaluateOne(c, n, ajv));
  }

  await writeFile(path.join(baselineDir, "evaluation.json"), JSON.stringify(baselineEval, null, 2), "utf-8");
  await writeFile(path.join(newDir, "evaluation.json"), JSON.stringify(newEval, null, 2), "utf-8");

  let baselinePass = 0;
  let newPass = 0;
  let regressions = 0;
  let improvements = 0;
  const breakdown: Record<string, number> = {};
  const items: CompareReportItem[] = [];

  for (const c of cases) {
    const b = baselineEval.find((x) => x.case_id === c.id);
    const n = newEval.find((x) => x.case_id === c.id);
    if (!b || !n) continue;

    if (b.pass) baselinePass += 1;
    if (n.pass) newPass += 1;
    if (b.pass && !n.pass) regressions += 1;
    if (!b.pass && n.pass) improvements += 1;

    if (!n.pass && n.root_cause) breakdown[n.root_cause] = (breakdown[n.root_cause] ?? 0) + 1;

    const item: CompareReportItem = {
      case_id: c.id,
      title: c.title,
      baseline_pass: b.pass,
      new_pass: n.pass,
      preventable_by_policy: n.preventable_by_policy,
      recommended_policy_rules: n.recommended_policy_rules,
    };

    if (b.root_cause !== undefined) item.baseline_root = b.root_cause;
    if (n.root_cause !== undefined) item.new_root = n.root_cause;

    items.push(item);
  }

  const report: CompareReport = {
    report_id: reportId,
    baseline_dir: rel(baselineDir),
new_dir: rel(newDir),
cases_path: rel(casesPath),
    summary: {
      baseline_pass: baselinePass,
      new_pass: newPass,
      regressions,
      improvements,
      root_cause_breakdown: breakdown,
    },
    items,
  };

  await writeFile(path.join(outDir, "compare-report.json"), JSON.stringify(report, null, 2), "utf-8");

  for (const item of items) {
    const baseRaw = await readFile(path.join(baselineDir, `${item.case_id}.json`), "utf-8");
    const newRaw = await readFile(path.join(newDir, `${item.case_id}.json`), "utf-8");
    const baseResp = parseReplayAgentResponse(baseRaw);
    const newResp = parseReplayAgentResponse(newRaw);

    const caseHtml = renderCaseDiffHtml(item.case_id, baseResp, newResp);
    await writeFile(path.join(outDir, `case-${item.case_id}.html`), caseHtml, "utf-8");
  }

  const html = renderHtmlReport(report);
  await writeFile(path.join(outDir, "report.html"), html, "utf-8");

  
  console.log(`html report: ${rel(path.join(outDir, "report.html"))}`);
  console.log("Evaluator finished");
  console.log(`baseline evaluation: ${rel(path.join(baselineDir, "evaluation.json"))}`);
  console.log(`new evaluation: ${rel(path.join(newDir, "evaluation.json"))}`);
  console.log(`compare report: ${rel(path.join(outDir, "compare-report.json"))}`);

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
