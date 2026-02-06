//tool/apps/evaluator/src/replayDiff.ts
type Version = "baseline" | "new";

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

type ToolCallEvent = leadingToolCallEvent;
type ToolResultEvent = leadingToolResultEvent;

type leadingToolCallEvent = {
  type: "tool_call";
  ts: number;
  call_id: string;
  action_id?: string;
  tool: string;
  args: Record<string, unknown>;
};

type leadingToolResultEvent = {
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

export type AgentResponse = {
  case_id: string;
  version: Version;
  workflow_id?: string;
  proposed_actions?: ProposedAction[];
  final_output: FinalOutput;
  events?: RunEvent[];
  runner_failure?: RunnerFailureArtifact;
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function fmtFinal(out: FinalOutput): string {
  if (out.content_type === "text") return String(out.content ?? "");
  return fmtJson(out.content ?? {});
}

function normalizePortablePathsInText(s: string): string {
  const raw = String(s ?? "");

  return raw.replace(
    /(full_body_(?:meta_)?saved_to=)apps\/runner\/runs\/_runner_failures\/([^\s]+)/g,
    (_m, prefix: string, tail: string) => {
      const parts = tail.split("/");
      const filename = parts[parts.length - 1] || tail;

      const m = filename.match(/^(.+?)\.(baseline|new)\.(.+)$/);
      if (!m) return `${prefix}assets/runner_failure/_unknown/${filename}`;

      const caseId = m[1];
      const version = m[2];
      return `${prefix}assets/runner_failure/${caseId}/${version}/${filename}`;
    }
  );
}

function collapseLongRuns(s: string, minRun: number): { text: string; collapsed_runs: number } {
  const raw = String(s ?? "");
  if (!raw) return { text: "", collapsed_runs: 0 };
  if (minRun <= 1) return { text: raw, collapsed_runs: 0 };

  let out = "";
  let i = 0;
  let runs = 0;

  while (i < raw.length) {
    const ch = raw[i];
    let j = i + 1;
    while (j < raw.length && raw[j] === ch) j++;

    const len = j - i;
    if (len >= minRun) {
      runs += 1;
      const safeCh = ch === "\n" ? "\\n" : ch === "\t" ? "\\t" : ch === " " ? "␠" : ch;
      out += `… [collapsed: '${safeCh}' × ${len}] …`;
    } else {
      out += raw.slice(i, j);
    }

    i = j;
  }

  return { text: out, collapsed_runs: runs };
}

function normalizeSnippetForReport(raw: string, opts?: { minRun?: number }): { text: string; collapsed_runs: number } {
  const minRun = opts?.minRun ?? 120;
  const portable = normalizePortablePathsInText(raw);
  const collapsed = collapseLongRuns(portable, minRun);
  return { text: collapsed.text, collapsed_runs: collapsed.collapsed_runs };
}

function truncateText(s: string, maxChars: number): { text: string; truncated: boolean; totalChars: number } {
  const raw = String(s ?? "");
  if (maxChars <= 0) return { text: "", truncated: raw.length > 0, totalChars: raw.length };
  if (raw.length <= maxChars) return { text: raw, truncated: false, totalChars: raw.length };
  return { text: raw.slice(0, maxChars), truncated: true, totalChars: raw.length };
}

function computeCharDominanceRatio(s: string): number {
  const raw = String(s ?? "");
  const cleaned = raw.replace(/\s+/g, "");
  if (!cleaned) return 0;

  const counts = new Map<string, number>();
  for (const ch of cleaned) counts.set(ch, (counts.get(ch) ?? 0) + 1);

  let max = 0;
  for (const v of counts.values()) if (v > max) max = v;

  return max / cleaned.length;
}

function isNoisyFillerSnippet(info: { text: string; collapsed_runs: number }): boolean {
  const t = String(info.text ?? "").trim();
  if (!t) return false;

  if (info.collapsed_runs > 0) return true;

  const dominance = computeCharDominanceRatio(t);

  if (t.length >= 60 && dominance >= 0.9) return true;
  if (t.length >= 20 && dominance >= 0.95) return true;

  return false;
}

function asArray<T>(v: T[] | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function isToolCall(e: RunEvent): e is ToolCallEvent {
  return e.type === "tool_call";
}
function isToolResult(e: RunEvent): e is ToolResultEvent {
  return e.type === "tool_result";
}
function isRetrieval(e: RunEvent): e is RetrievalEvent {
  return e.type === "retrieval";
}

function fmtTs(ts: number | undefined): string {
  if (!ts || !Number.isFinite(ts)) return "";
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
}

function summarizeEvents(events: RunEvent[]): {
  toolCalls: ToolCallEvent[];
  toolResults: ToolResultEvent[];
  retrievals: RetrievalEvent[];
} {
  const toolCalls: ToolCallEvent[] = [];
  const toolResults: ToolResultEvent[] = [];
  const retrievals: RetrievalEvent[] = [];

  for (const e of events) {
    if (isToolCall(e)) toolCalls.push(e);
    else if (isToolResult(e)) toolResults.push(e);
    else if (isRetrieval(e)) retrievals.push(e);
  }

  return { toolCalls, toolResults, retrievals };
}

function linkIfPresent(href: string | undefined, label: string): string {
  if (!href) return "";
  return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
}

function renderFailureBlock(f: RunnerFailureArtifact | undefined): string {
  if (!f) return `<div class="muted">No runner_failure</div>`;

  const lines: string[] = [];
  lines.push(`<div><b>class</b>: ${escHtml(f.class)}</div>`);
  lines.push(`<div><b>attempt</b>: ${escHtml(String(f.attempt))}</div>`);
  lines.push(`<div><b>timeout_ms</b>: ${escHtml(String(f.timeout_ms))}</div>`);
  lines.push(`<div><b>latency_ms</b>: ${escHtml(String(f.latency_ms))}</div>`);
  lines.push(`<div><b>url</b>: <code>${escHtml(f.url)}</code></div>`);

  if (typeof f.status === "number") {
    lines.push(`<div><b>http</b>: ${escHtml(String(f.status))} ${escHtml(String(f.status_text ?? ""))}</div>`);
  }
  if (f.error_name || f.error_message) {
    lines.push(`<div><b>error</b>: ${escHtml(String(f.error_name ?? "Error"))}: ${escHtml(String(f.error_message ?? ""))}</div>`);
  }

  if (f.body_snippet) {
    const normalized = normalizeSnippetForReport(f.body_snippet, { minRun: 120 });

    lines.push(`<div class="mt8"><b>body_snippet</b>:</div>`);

    if (isNoisyFillerSnippet(normalized)) {
      lines.push(`<div class="muted">[suppressed noisy filler]</div>`);
      if (normalized.collapsed_runs > 0) {
        lines.push(`<div class="muted" style="margin-top:6px;">collapsed_runs=${escHtml(String(normalized.collapsed_runs))}</div>`);
      }
    } else {
      const t = truncateText(normalized.text, 900);
      lines.push(`<pre class="pre">${escHtml(t.text)}${t.truncated ? "\n… [truncated]" : ""}</pre>`);

      const metaBits: string[] = [];
      if (t.truncated) metaBits.push(`snippet_chars=${escHtml(String(900))} total_chars=${escHtml(String(t.totalChars))}`);
      if (metaBits.length) {
        lines.push(`<div class="muted" style="margin-top:6px;">${metaBits.join(" ")}</div>`);
      }
    }
  }

  const bodyLink = linkIfPresent(f.full_body_saved_to, "full body");
  const metaLink = linkIfPresent(f.full_body_meta_saved_to, "full body meta");
  if (bodyLink || metaLink) {
    lines.push(`<div class="mt8"><b>assets</b>: ${[bodyLink, metaLink].filter(Boolean).join(" · ")}</div>`);
  }

  return `<div class="box">${lines.join("")}</div>`;
}

function renderActions(actions: ProposedAction[] | undefined): string {
  const arr = asArray(actions);
  if (arr.length === 0) return `<div class="muted">No proposed_actions</div>`;

  const rows = arr
    .map((a) => {
      const evidence = (a.evidence_refs ?? [])
        .map((r) => (r.kind === "tool_result" ? `tool_result:${r.call_id}` : `retrieval_doc:${r.id}`))
        .join(", ");

      const risk = a.risk_level ? escHtml(a.risk_level) : "";
      const tags = Array.isArray(a.risk_tags) ? a.risk_tags.join(", ") : "";

      return `
<tr>
  <td><code>${escHtml(a.action_id)}</code></td>
  <td>${escHtml(a.action_type)}</td>
  <td><code>${escHtml(a.tool_name)}</code></td>
  <td>${risk}</td>
  <td>${escHtml(tags)}</td>
  <td><code>${escHtml(evidence)}</code></td>
</tr>`;
    })
    .join("");

  return `
<table class="table">
  <thead>
    <tr>
      <th>action_id</th>
      <th>action_type</th>
      <th>tool</th>
      <th>risk</th>
      <th>risk_tags</th>
      <th>evidence_refs</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function renderToolTimeline(events: RunEvent[] | undefined): string {
  const ev = asArray(events);
  if (ev.length === 0) return `<div class="muted">No events</div>`;

  const { toolCalls, toolResults, retrievals } = summarizeEvents(ev);

  const callRows = toolCalls
    .map((c) => {
      const ts = fmtTs(c.ts);
      return `<tr><td>${escHtml(ts)}</td><td><code>${escHtml(c.call_id)}</code></td><td><code>${escHtml(c.tool)}</code></td><td><pre class="pre sm">${escHtml(fmtJson(c.args))}</pre></td></tr>`;
    })
    .join("");

  const resRows = toolResults
    .map((r) => {
      const ts = fmtTs(r.ts);
      const payload = r.payload_summary !== undefined ? fmtJson(r.payload_summary) : "";
      const latency = r.latency_ms !== undefined ? String(r.latency_ms) : "";
      return `<tr><td>${escHtml(ts)}</td><td><code>${escHtml(r.call_id)}</code></td><td>${escHtml(r.status)}</td><td>${escHtml(latency)}</td><td><pre class="pre sm">${escHtml(payload)}</pre></td></tr>`;
    })
    .join("");

  const retRows = retrievals
    .map((r) => {
      const ts = fmtTs(r.ts);
      const parts: string[] = [];
      if (r.query !== undefined) parts.push(`query=${r.query}`);
      if (Array.isArray(r.doc_ids) && r.doc_ids.length) parts.push(`doc_ids=[${r.doc_ids.join(", ")}]`);
      if (Array.isArray(r.snippets_hashes) && r.snippets_hashes.length) parts.push(`snippets_hashes=[${r.snippets_hashes.join(", ")}]`);
      return `<tr><td>${escHtml(ts)}</td><td><code>${escHtml(parts.join(" | "))}</code></td></tr>`;
    })
    .join("");

  return `
<div class="grid2">
  <div>
    <div class="h3">Tool calls</div>
    ${
      toolCalls.length
        ? `<table class="table"><thead><tr><th>ts</th><th>call_id</th><th>tool</th><th>args</th></tr></thead><tbody>${callRows}</tbody></table>`
        : `<div class="muted">None</div>`
    }
  </div>
  <div>
    <div class="h3">Tool results</div>
    ${
      toolResults.length
        ? `<table class="table"><thead><tr><th>ts</th><th>call_id</th><th>status</th><th>latency_ms</th><th>payload</th></tr></thead><tbody>${resRows}</tbody></table>`
        : `<div class="muted">None</div>`
    }
  </div>
</div>

<div class="mt16">
  <div class="h3">Retrieval</div>
  ${
    retrievals.length
      ? `<table class="table"><thead><tr><th>ts</th><th>details</th></tr></thead><tbody>${retRows}</tbody></table>`
      : `<div class="muted">None</div>`
  }
</div>
`;
}

function renderOneSide(title: string, resp: AgentResponse): string {
  const finalText = truncateText(normalizePortablePathsInText(fmtFinal(resp.final_output)), 2200).text;
  const wf = resp.workflow_id
    ? `<div><b>workflow_id</b>: <code>${escHtml(resp.workflow_id)}</code></div>`
    : `<div class="muted">workflow_id: (none)</div>`;

  return `
<div class="col">
  <div class="h2">${escHtml(title)}</div>
  ${wf}

  <div class="mt12 h3">Final output</div>
  <pre class="pre">${escHtml(finalText)}</pre>

  <div class="mt12 h3">Proposed actions</div>
  ${renderActions(resp.proposed_actions)}

  <div class="mt12 h3">Runner failure</div>
  ${renderFailureBlock(resp.runner_failure)}

  <div class="mt12 h3">Events</div>
  ${renderToolTimeline(resp.events)}
</div>`;
}

export function renderCaseDiffHtml(caseId: string, baseline: AgentResponse, newer: AgentResponse): string {
  const title = `Replay diff · ${caseId}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(title)}</title>
<style>
  :root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  body { margin: 0; background: #0b0d10; color: #e8eaed; }
  a { color: #8ab4f8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }
  .top { display:flex; justify-content: space-between; align-items:center; gap: 12px; }
  .badge { display:inline-block; padding: 2px 8px; border-radius: 999px; background:#1b1f27; border:1px solid #2b303b; color:#cbd5e1; font-size:12px; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
  .col { background:#0f1217; border:1px solid #232836; border-radius: 12px; padding: 12px; }
  .h2 { font-size: 18px; font-weight: 700; margin: 0 0 6px 0; }
  .h3 { font-size: 14px; font-weight: 700; margin: 0; }
  .muted { color:#9aa4b2; font-size: 13px; }
  .mt8 { margin-top: 8px; }
  .mt12 { margin-top: 12px; }
  .mt16 { margin-top: 16px; }
  code { color:#cdd6f4; }
  .pre { white-space: pre-wrap; word-break: break-word; background:#0b0d10; border:1px solid #232836; border-radius: 10px; padding: 10px; overflow:auto; }
  .pre.sm { font-size: 12px; }
  .table { width:100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  .table th, .table td { border-top:1px solid #232836; padding: 8px; vertical-align: top; }
  .table th { text-align:left; color:#cbd5e1; font-weight:700; }
  .box { background:#0b0d10; border:1px solid #232836; border-radius: 10px; padding: 10px; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }
  @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } .grid2 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <div style="font-size:20px;font-weight:800;">${escHtml(title)}</div>
        <div class="muted">case_id: <span class="badge">${escHtml(caseId)}</span></div>
      </div>
      <div>
        <a href="report.html">Back to report</a>
      </div>
    </div>

    <div class="grid">
      ${renderOneSide("Baseline", baseline)}
      ${renderOneSide("New", newer)}
    </div>
  </div>
</body>
</html>`;
}
