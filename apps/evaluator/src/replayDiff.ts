//tool/apps/evaluator/src/replayDiff.ts
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
};

type FinalOutputEvent = {
  type: "final_output";
  ts: number;
  content_type: "text" | "json";
  content: unknown;
};

type RunEvent = ToolCallEvent | ToolResultEvent | RetrievalEvent | FinalOutputEvent;

export type AgentResponse = {
  case_id: string;
  version: "baseline" | "new";
  workflow_id?: string;
  final_output: FinalOutput;
  events: RunEvent[];
};

type Step =
  | { kind: "call"; call_id: string; tool: string }
  | { kind: "result"; call_id: string; status: "ok" | "error" | "timeout"; tool?: string };

function esc(s: unknown): string {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asText(out: FinalOutput): string {
  if (out.content_type === "text") return String(out.content ?? "");
  return JSON.stringify(out.content ?? {}, null, 2);
}

function toolCalls(events: RunEvent[]): ToolCallEvent[] {
  return events.filter((e): e is ToolCallEvent => e.type === "tool_call");
}

function toolResults(events: RunEvent[]): ToolResultEvent[] {
  return events.filter((e): e is ToolResultEvent => e.type === "tool_result");
}

function retrievals(events: RunEvent[]): RetrievalEvent[] {
  return events.filter((e): e is RetrievalEvent => e.type === "retrieval");
}

function firstDiffIndex(a: string[], b: string[]): number | null {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (a[i] !== b[i]) return i;
  }
  return null;
}

function buildSteps(resp: AgentResponse): Step[] {
  const calls = toolCalls(resp.events);
  const results = toolResults(resp.events);

  const toolByCallId = new Map<string, string>();
  for (const c of calls) toolByCallId.set(c.call_id, c.tool);

  const steps: Step[] = [];

  for (const c of calls) {
    steps.push({ kind: "call", call_id: c.call_id, tool: c.tool });
  }

  for (const r of results) {
    const t = toolByCallId.get(r.call_id);
    if (t !== undefined) {
      steps.push({ kind: "result", call_id: r.call_id, status: r.status, tool: t });
    } else {
      steps.push({ kind: "result", call_id: r.call_id, status: r.status });
    }
  }

  return steps;
}

function renderSteps(steps: Step[], highlightTool?: string): string {
  return steps
    .map((s) => {
      const toolLabel = "tool" in s ? s.tool : undefined;
      const hl = highlightTool && toolLabel === highlightTool ? "hl" : "";
      const label =
        s.kind === "call"
          ? `CALL ${s.tool} (${s.call_id})`
          : `RESULT ${toolLabel ?? ""} (${s.call_id}) status=${s.status}`;
      return `<div class="step ${hl} mono">${esc(label)}</div>`;
    })
    .join("");
}

export function renderCaseDiffHtml(caseId: string, baseline: AgentResponse, newer: AgentResponse): string {
  const baseCalls = toolCalls(baseline.events).map((c) => c.tool);
  const newCalls = toolCalls(newer.events).map((c) => c.tool);
  const diffIdx = firstDiffIndex(baseCalls, newCalls);

  const baseRetr = retrievals(baseline.events).flatMap((r) => r.doc_ids ?? []);
  const newRetr = retrievals(newer.events).flatMap((r) => r.doc_ids ?? []);

  const baseOut = asText(baseline.final_output);
  const newOut = asText(newer.final_output);

  const baseSteps = buildSteps(baseline);
  const newSteps = buildSteps(newer);

  const firstDiffTool = diffIdx === null ? undefined : (baseCalls[diffIdx] ?? newCalls[diffIdx]);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Replay Diff: ${esc(caseId)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 10px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
  .label { color: #6b7280; font-size: 12px; margin-bottom: 8px; }
  .step { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
  .hl { background: #fffbeb; }
  pre { background: #0b1020; color: #e5e7eb; padding: 12px; border-radius: 10px; overflow: auto; font-size: 12px; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
</style>
</head>
<body>
  <div class="top">
    <h1>Replay Diff: <span class="mono">${esc(caseId)}</span></h1>
    <a class="mono" href="report.html">Back to report</a>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">Baseline tool calls</div>
      <div class="mono">${esc(baseCalls.join(" → ") || "(none)")}</div>
      <div class="label" style="margin-top:10px;">Steps</div>
      ${renderSteps(baseSteps, firstDiffTool)}
    </div>

    <div class="card">
      <div class="label">New tool calls</div>
      <div class="mono">${esc(newCalls.join(" → ") || "(none)")}</div>
      <div class="label" style="margin-top:10px;">Steps</div>
      ${renderSteps(newSteps, firstDiffTool)}
    </div>
  </div>

  <div class="grid" style="margin-top:14px;">
    <div class="card">
      <div class="label">Baseline retrieval doc_ids</div>
      <div class="mono">${esc(baseRetr.join(", ") || "(none)")}</div>
      <div class="label" style="margin-top:10px;">Baseline final output</div>
      <pre>${esc(baseOut)}</pre>
    </div>
    <div class="card">
      <div class="label">New retrieval doc_ids</div>
      <div class="mono">${esc(newRetr.join(", ") || "(none)")}</div>
      <div class="label" style="margin-top:10px;">New final output</div>
      <pre>${esc(newOut)}</pre>
    </div>
  </div>

  <div style="margin-top:14px;" class="mono">
    First divergence index: ${esc(diffIdx === null ? "none" : diffIdx)}
    ${firstDiffTool ? " | tool: " + esc(firstDiffTool) : ""}
  </div>
</body>
</html>`;
}
