import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { RunTrendRow, TokenTrendRow, TokenCoverage } from "./types";

function loadChartJs(): { js: string | null; warning: string | null } {
  const chartPath = join(__dirname, "..", "vendor", "chart.umd.min.js");
  const hashPath = chartPath + ".sha256";
  let content: string;
  try {
    content = readFileSync(chartPath, "utf-8");
  } catch {
    return { js: null, warning: "Chart.js not found in vendor/. Rendering tables only." };
  }
  let expected: string;
  try {
    expected = readFileSync(hashPath, "utf-8").trim();
  } catch {
    return { js: null, warning: "chart.umd.min.js.sha256 missing. Rendering tables only." };
  }
  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== expected) {
    return {
      js: null,
      warning: "Chart.js integrity check failed. Rendering tables only.",
    };
  }
  return { js: content, warning: null };
}

export function renderTrendHtml(params: {
  outFile: string;
  runRows: RunTrendRow[];
  tokenRows: TokenTrendRow[];
  tokenCoverage: TokenCoverage;
  note?: string;
}): void {
  const { js, warning } = loadChartJs();
  const data = {
    runs: params.runRows,
    tokens: params.tokenRows,
    tokenCoverage: params.tokenCoverage,
  };
  const dataJson = JSON.stringify(data);

  const chartsEnabled = Boolean(js);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Agent QA Trend</title>
<style>
  body { background: #0b0d10; color: #e8e8e8; font-family: "Space Grotesk", system-ui, sans-serif; margin: 0; padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; }
  .banner { margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: rgba(255,192,0,0.15); color: #ffd27a; border: 1px solid rgba(255,192,0,0.3); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <h1>Historical Trending</h1>
  ${params.note ? `<div class="banner">${params.note}</div>` : ""}
  ${warning ? `<div class="banner">${warning}</div>` : ""}
  <div class="grid">
    <div class="card">
      <h3>Pass rate over time</h3>
      ${chartsEnabled ? '<canvas id="passChart" height="160"></canvas>' : renderRunTable(params.runRows)}
    </div>
    <div class="card">
      <h3>Regressions / Gates</h3>
      ${chartsEnabled ? '<canvas id="gateChart" height="160"></canvas>' : renderRunTable(params.runRows)}
    </div>
    <div class="card">
      <h3>Token usage</h3>
      ${renderTokenPanel(params.tokenRows, params.tokenCoverage, chartsEnabled)}
    </div>
    <div class="card">
      <h3>Runs</h3>
      ${renderRunTable(params.runRows)}
    </div>
    <div class="card">
      <h3>Admissibility KPI Dynamics</h3>
      ${renderKpiPanel(params.runRows, chartsEnabled)}
    </div>
  </div>

  <script type="application/json" id="trend-data">${dataJson}</script>
  ${chartsEnabled ? `<script>${js}</script>
  <script>${renderChartsScript()}</script>` : ""}
</body>
</html>`;

  writeFileSync(params.outFile, html, "utf-8");
}

function renderRunTable(rows: RunTrendRow[]): string {
  const head = `<table><thead><tr><th>Date</th><th>Exec</th><th>Pass</th><th>Fail</th><th>Reg</th><th>Gate</th></tr></thead><tbody>`;
  const body = rows
    .map((r) => {
      const d = new Date(r.generated_at).toISOString().slice(0, 10);
      return `<tr><td>${d}</td><td>${r.executed_cases}</td><td>${r.pass_count}</td><td>${r.fail_count}</td><td>${r.regressions}</td><td>${r.improvements}</td></tr>`;
    })
    .join("");
  return `${head}${body}</tbody></table>`;
}

function renderTokenPanel(rows: TokenTrendRow[], coverage: TokenCoverage, chartsEnabled: boolean): string {
  if (coverage.totalRows === 0) {
    return `<div class="banner">No token usage data. Add token_usage to agent responses.</div>`;
  }
  if (coverage.coveragePercent < 50) {
    return `<div class="banner">Token data partial (${coverage.nonNullRows}/${coverage.totalRows} cases).</div>` +
      (chartsEnabled ? '<canvas id="tokenChart" height="160"></canvas>' : renderTokenTable(rows));
  }
  return chartsEnabled ? '<canvas id="tokenChart" height="160"></canvas>' : renderTokenTable(rows);
}

function renderTokenTable(rows: TokenTrendRow[]): string {
  const head = `<table><thead><tr><th>Date</th><th>Input</th><th>Output</th><th>Total</th></tr></thead><tbody>`;
  const body = rows
    .map((r) => {
      const d = new Date(r.generated_at).toISOString().slice(0, 10);
      return `<tr><td>${d}</td><td>${r.total_input ?? 0}</td><td>${r.total_output ?? 0}</td><td>${r.total_tokens ?? 0}</td></tr>`;
    })
    .join("");
  return `${head}${body}</tbody></table>`;
}

function renderKpiPanel(rows: RunTrendRow[], chartsEnabled: boolean): string {
  const hasKpi = rows.some((r) => r.kpi_pre_action_entropy_removed !== null);
  if (!hasKpi) {
    return `<div class="banner">No admissibility KPI found in selected runs.</div>` + renderKpiTable(rows);
  }
  return chartsEnabled ? '<canvas id="kpiChart" height="160"></canvas>' : renderKpiTable(rows);
}

function renderKpiTable(rows: RunTrendRow[]): string {
  const head = `<table><thead><tr><th>Date</th><th>Entropy removed</th><th>Recon min/block</th><th>Blocked</th></tr></thead><tbody>`;
  const body = rows
    .map((r) => {
      const d = new Date(r.generated_at).toISOString().slice(0, 10);
      const entropy = r.kpi_pre_action_entropy_removed === null ? "—" : r.kpi_pre_action_entropy_removed.toFixed(3);
      const perBlock =
        r.kpi_recon_minutes_saved_per_block === null ? "—" : r.kpi_recon_minutes_saved_per_block.toFixed(2);
      const blocked = r.kpi_blocked_cases === null ? "—" : String(r.kpi_blocked_cases);
      return `<tr><td>${d}</td><td>${entropy}</td><td>${perBlock}</td><td>${blocked}</td></tr>`;
    })
    .join("");
  return `${head}${body}</tbody></table>`;
}

function renderChartsScript(): string {
  return `(() => {
    const data = JSON.parse(document.getElementById('trend-data').textContent || '{}');
    const runs = data.runs || [];
    const tokens = data.tokens || [];

    const labels = runs.map(r => new Date(r.generated_at).toISOString().slice(0,10));
    const passRate = runs.map(r => r.executed_cases ? (r.pass_count / r.executed_cases) : 0);
    const regressions = runs.map(r => r.regressions || 0);
    const improvements = runs.map(r => r.improvements || 0);
    const entropyRemoved = runs.map(r => r.kpi_pre_action_entropy_removed ?? null);
    const reconMinutesPerBlock = runs.map(r => r.kpi_recon_minutes_saved_per_block ?? null);

    const ctx1 = document.getElementById('passChart');
    if (ctx1) new Chart(ctx1, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Pass rate', data: passRate, borderColor: '#7ad3ff', tension: 0.2 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 1 } } }
    });

    const ctx2 = document.getElementById('gateChart');
    if (ctx2) new Chart(ctx2, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Regressions', data: regressions, backgroundColor: '#ff6b6b' },
        { label: 'Improvements', data: improvements, backgroundColor: '#6be7a8' }
      ]},
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const ctx3 = document.getElementById('tokenChart');
    if (ctx3) {
      const tLabels = tokens.map(r => new Date(r.generated_at).toISOString().slice(0,10));
      const input = tokens.map(r => r.total_input || 0);
      const output = tokens.map(r => r.total_output || 0);
      new Chart(ctx3, {
        type: 'bar',
        data: { labels: tLabels, datasets: [
          { label: 'Input tokens', data: input, backgroundColor: '#9ad1ff' },
          { label: 'Output tokens', data: output, backgroundColor: '#ffd27a' }
        ]},
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
      });
    }

    const ctx4 = document.getElementById('kpiChart');
    if (ctx4) new Chart(ctx4, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Pre-action entropy removed',
            data: entropyRemoved,
            borderColor: '#8ad4ff',
            backgroundColor: '#8ad4ff',
            yAxisID: 'yEntropy',
            tension: 0.2
          },
          {
            type: 'line',
            label: 'Recon min saved/block',
            data: reconMinutesPerBlock,
            borderColor: '#ffb66b',
            backgroundColor: '#ffb66b',
            yAxisID: 'yMinutes',
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          yEntropy: { type: 'linear', position: 'left', min: 0, max: 1 },
          yMinutes: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
        }
      }
    });
  })();`;
}
