//tool/apps/evaluator/src/htmlReport.ts
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
  items: Array<{
    case_id: string;
    title: string;
    baseline_pass: boolean;
    new_pass: boolean;
    baseline_root?: string;
    new_root?: string;
    preventable_by_policy?: boolean;
    recommended_policy_rules?: string[];
  }>;
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonPretty(obj: unknown): string {
  return esc(JSON.stringify(obj ?? {}, null, 2));
}

export function renderHtmlReport(report: CompareReport): string {
  const breakdownEntries = Object.entries(report.summary.root_cause_breakdown || {})
    .sort((a, b) => b[1] - a[1])
    .map(
      ([k, v]) => `<div class="chip"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`
    )
    .join("");

  const rows = (report.items || [])
    .map((it) => {
      const status = it.new_pass ? "PASS" : "FAIL";
      const badgeClass = it.new_pass ? "ok" : "bad";
      const prevent = it.preventable_by_policy ? "Yes" : "No";
      const recRules = (it.recommended_policy_rules || []).join(", ");

      

      return `
<tr>
  <td class="mono">${esc(it.case_id)}</td>
  <td>${esc(it.title)}</td>
  <td><span class="pill ${it.baseline_pass ? "ok" : "bad"}">${it.baseline_pass ? "PASS" : "FAIL"}</span></td>
  <td><span class="pill ${badgeClass}">${esc(status)}</span></td>
  <td class="mono">${esc(it.new_root || "")}</td>
  <td><span class="pill ${it.preventable_by_policy ? "warn" : "neutral"}">${esc(prevent)}</span></td>
  <td class="mono">${esc(recRules)}</td>
 <td class="mono">
  <a href="case-${esc(it.case_id)}.html">replay diff</a>
</td>

</tr>`;
    })
    .join("");

  const summary = report.summary;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Agent Regression Report</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .sub { color: #555; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 12px 0 18px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
  .label { color: #6b7280; font-size: 12px; margin-bottom: 6px; }
  .value { font-size: 18px; font-weight: 700; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 18px; }
  .chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #e5e7eb; border-radius: 999px; padding: 6px 10px; }
  .chip .k { font-size: 12px; color: #374151; }
  .chip .v { font-size: 12px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; vertical-align: top; }
  th { font-size: 12px; color: #6b7280; font-weight: 600; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; }
  .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; border: 1px solid #e5e7eb; }
  .ok { background: #ecfdf5; border-color: #10b98133; color: #065f46; }
  .bad { background: #fef2f2; border-color: #ef444433; color: #7f1d1d; }
  .warn { background: #fffbeb; border-color: #f59e0b33; color: #7c2d12; }
  .neutral { background: #f9fafb; color: #374151; }
  .footer { margin-top: 18px; color: #6b7280; font-size: 12px; }
  details { margin-top: 14px; }
  pre { background: #0b1020; color: #e5e7eb; padding: 12px; border-radius: 10px; overflow: auto; font-size: 12px; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <h1>Agent Regression Report</h1>
  <div class="sub">
    report_id: <span class="mono">${esc(report.report_id)}</span>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">Baseline pass</div>
      <div class="value">${esc(summary.baseline_pass)}</div>
    </div>
    <div class="card">
      <div class="label">New pass</div>
      <div class="value">${esc(summary.new_pass)}</div>
    </div>
    <div class="card">
      <div class="label">Regressions</div>
      <div class="value">${esc(summary.regressions)}</div>
    </div>
    <div class="card">
      <div class="label">Improvements</div>
      <div class="value">${esc(summary.improvements)}</div>
    </div>
  </div>

  <div class="label">Root cause breakdown</div>
  <div class="chips">${breakdownEntries || "<span class='mono'>none</span>"}</div>

  <table>
    <thead>
      <tr>
        <th>case_id</th>
        <th>title</th>
        <th>baseline</th>
        <th>new</th>
        <th>root_cause</th>
        <th>preventable</th>
        <th>rules</th>
        <th>artifacts</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <details>
    <summary class="mono">show compare-report.json</summary>
    <pre>${jsonPretty(report)}</pre>
  </details>

  <div class="footer">
    baseline_dir: <span class="mono">${esc(report.baseline_dir)}</span><br/>
    new_dir: <span class="mono">${esc(report.new_dir)}</span><br/>
    cases_path: <span class="mono">${esc(report.cases_path)}</span>
  </div>
</body>
</html>`;
}
