// apps/evaluator/src/htmlReport.ts
import {
  escHtml,
  executionQualityBadge,
  fmtFailureKinds,
  pct,
  scriptSafeJson,
} from "./htmlFormatters";
import type { CompareReport } from "./reportTypes";
import { REPORT_CLIENT_SCRIPT } from "./htmlClientScript";
import {
  buildRowEntries,
  buildSecuritySummaryBlock,
  buildSuiteBlocks,
  buildSuiteControls,
} from "./htmlSections";
export type {
  CompareReport,
  CoreSignalKind,
  EnvironmentContext,
  EvidenceRef,
  ExtendedSignalKind,
  ItemAssertion,
  QualityFlags,
  ReportMeta,
  SecurityPack,
  SecuritySide,
  SecuritySignal,
  SignalConfidence,
  SignalSeverity,
  TraceIntegrity,
  TraceIntegritySide,
} from "./reportTypes";

export function renderHtmlReport(report: CompareReport & { embedded_manifest_index?: unknown }): string {
  const s = report.summary;
  const eq = s.execution_quality;

  const breakdownRows = Object.entries(s.root_cause_breakdown ?? {})
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `<tr><td><code>${escHtml(k)}</code></td><td>${escHtml(String(v))}</td></tr>`)
    .join("");

  const q = report.quality_flags;

  const suiteSummaries = report.summary_by_suite ?? {};
  const suiteEntries = Object.entries(suiteSummaries);
  const suiteBlocks = buildSuiteBlocks(suiteSummaries);
  const suiteControls = buildSuiteControls(suiteSummaries);
  const suiteOptions = suiteControls.options;
  const suiteQuick = suiteControls.quickButtons;

  const secBlock = buildSecuritySummaryBlock(s.security);

  const rowEntries = buildRowEntries(report.items);
  const rowsDataJson = JSON.stringify(rowEntries);

  const embeddedIndex = (report as unknown as { embedded_manifest_index?: unknown }).embedded_manifest_index;
  const embeddedIndexJson = embeddedIndex ? JSON.stringify(embeddedIndex) : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(`Evaluator report · ${report.report_id}`)}</title>
<style>
  :root {
    font-family: "Space Grotesk", "IBM Plex Sans", "Segoe UI", ui-sans-serif, system-ui;
    color-scheme: dark;
  }
  body {
    margin:0;
    background:
      radial-gradient(1200px 600px at 10% -10%, #1b2a3a 0%, transparent 55%),
      radial-gradient(900px 600px at 90% -20%, #2d1f32 0%, transparent 55%),
      #0b0d10;
    color:#e8eaed;
  }
  a { color:#8ab4f8; text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width: 1500px; margin: 0 auto; padding: 24px; }
  .h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px 0; letter-spacing: -0.02em; }
  .muted { color:#9aa4b2; font-size: 13px; }
  .grid { display:grid; grid-template-columns: 320px 1fr; gap: 16px; margin-top: 16px; }
  .card { background:#0f1217; border:1px solid #232836; border-radius: 16px; padding: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
  .kpi { display:flex; gap:10px; flex-wrap:wrap; margin-top: 10px; }
  .k { background:#0b0d10; border:1px solid #232836; border-radius: 12px; padding: 10px; min-width: 140px; }
  .k .v { font-size: 18px; font-weight: 900; }
  .k .l { color:#9aa4b2; font-size: 12px; margin-top: 2px; }
  .badge { display:inline-block; padding: 2px 8px; border-radius: 999px; border:1px solid #2b303b; background:#1b1f27; font-size: 12px; }
  .b-ok { background:#12261a; border-color:#214b33; color:#b8f7c0; }
  .b-bad { background:#2a1414; border-color:#553131; color:#ffb4b4; }
  .b-mid { background:#1b2230; border-color:#2b3a55; color:#c7d2fe; }
  code { color:#cdd6f4; }
  .table { width:100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  .table th, .table td { border-top:1px solid #232836; padding: 10px; vertical-align: top; }
  .table th { text-align:left; color:#cbd5e1; font-weight:800; }
  .table tr:hover td { background:#0b0f16; }
  .row-regression td:first-child { border-left: 3px solid #c2410c; padding-left: 7px; }
  .row-improvement td:first-child { border-left: 3px solid #16a34a; padding-left: 7px; }
  .btn { background:#0b0d10; border:1px solid #232836; color:#cbd5e1; border-radius: 999px; padding: 4px 10px; font-size:12px; cursor:pointer; }
  .btn:hover { border-color:#2b3a55; color:#e8eaed; }
  .tabRow { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .tab { border-radius: 999px; padding: 6px 12px; font-size:12px; font-weight:700; letter-spacing:0.01em; }
  .tab.active { background:#111827; border-color:#3b82f6; color:#dbeafe; }
  .savedRow { display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap; }
  .savedRow .muted { font-size:12px; }
  .savedList { margin-top:10px; display:flex; flex-direction:column; gap:6px; }
  .savedItem { display:flex; gap:8px; align-items:center; }
  .savedItem .name { font-size:12px; color:#c5c7cc; }
  .note { color:#9aa4b2; font-size:12px; margin-top:6px; }
  .wrapRules { display:flex; flex-wrap:wrap; gap:6px; }
  .rule { background:#0b0d10; border:1px solid #232836; border-radius: 999px; padding: 2px 8px; font-size: 12px; color:#cbd5e1; }
  .hero { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .chips { display:flex; gap:8px; flex-wrap:wrap; }
  .chip { background:#0b0d10; border:1px solid #232836; border-radius: 999px; padding: 4px 10px; font-size: 12px; color:#cbd5e1; }
  .side { position: sticky; top: 16px; align-self: start; }
  .filters input, .filters select { width:100%; background:#0b0d10; border:1px solid #232836; color:#e8eaed; border-radius: 10px; padding: 8px; margin-top: 8px; }
  .caseTitle { font-weight: 800; font-size: 14px; }
  .caseMeta { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .metaChip { background:#0b0d10; border:1px solid #232836; border-radius: 999px; padding: 2px 8px; font-size: 12px; color:#cbd5e1; }
  details.assertions { margin-top:6px; background:#0b0d10; border:1px solid #232836; border-radius: 10px; padding: 6px 8px; }
  details.assertions summary { cursor:pointer; font-size:12px; color:#cbd5e1; }
  .assertionList { margin-top:6px; display:flex; flex-direction:column; gap:4px; }
  .assertionRow { display:flex; gap:8px; align-items:center; font-size:12px; color:#cbd5e1; }
  .assertionRow .name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color:#e5e7eb; }
  .assertionRow .pass { color:#22c55e; font-weight:700; }
  .assertionRow .fail { color:#f97316; font-weight:700; }
  .printOnly { display:none; }
  @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } .side { position: static; } }
  @media print {
    body { background:#ffffff; color:#111827; }
    .wrap { padding: 12px; }
    .card, .table th, .table td { background:#ffffff !important; color:#111827 !important; border-color:#e5e7eb !important; box-shadow: none !important; }
    .side, .filters, .savedRow, .savedList, .tabRow, .btn, .chip { display:none !important; }
    .hero { align-items:flex-start; }
    .printOnly { display:block; font-size:12px; color:#111827; margin-top:6px; }
    .table { font-size:12px; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div>
        <div class="h1">Evaluator report</div>
        <div class="muted">
          contract_version: <code>${escHtml(String(report.contract_version))}</code> ·
          report_id: <code>${escHtml(report.report_id)}</code>
        </div>
        <div class="muted" style="margin-top:4px;">
          toolkit: <code>${escHtml(report.meta.toolkit_version)}</code> ·
          spec: <code>${escHtml(report.meta.spec_version)}</code> ·
          generated: <code>${escHtml(new Date(report.meta.generated_at).toISOString())}</code>
        </div>
      </div>
      <div class="chips">
        <span class="chip">transfer: ${escHtml(s.quality.transfer_class)}</span>
        <span class="chip">redaction: ${escHtml(s.quality.redaction_status)}${s.quality.redaction_preset_id ? ` (${escHtml(s.quality.redaction_preset_id)})` : ""}</span>
        <span class="chip">${executionQualityBadge(eq?.status)}</span>
        <button class="btn" onclick="window.print()">Print / PDF</button>
      </div>
    </div>
    <div class="muted" style="margin-top:6px;">
      baseline_dir: <code>${escHtml(report.baseline_dir)}</code> ·
      new_dir: <code>${escHtml(report.new_dir)}</code> ·
      cases: <code>${escHtml(report.cases_path)}</code>
    </div>

    <div class="grid">
    <div class="side">
      <div class="card" style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:900;">Suites</div>
        <div class="tabRow">
          <button class="btn tab suiteBtn" data-suite="">all</button>
          ${suiteQuick}
        </div>
        ${suiteEntries.length <= 1 ? `<div class="note">Only one suite present in this report.</div>` : ""}
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:900;">Filters</div>
        <div class="filters">
          <div id="localStorageWarning" class="note" style="display:none;">LocalStorage disabled: filters won’t persist after reload.</div>
          <input id="filterText" type="text" placeholder="Search case id or title" />
          <select id="filterSuite">
            <option value="">Suite: all</option>
            ${suiteOptions}
          </select>
          <select id="filterDiff">
            <option value="">Diff: all</option>
            <option value="regression">regression</option>
            <option value="improvement">improvement</option>
            <option value="same">same</option>
          </select>
          <select id="filterSort">
            <option value="case_id">Sort: case_id</option>
            <option value="risk">Sort: risk</option>
            <option value="gate">Sort: gate</option>
            <option value="diff">Sort: diff</option>
            <option value="suite">Sort: suite</option>
            <option value="time_desc">Sort: time (newest)</option>
            <option value="time_asc">Sort: time (oldest)</option>
          </select>
          <select id="filterRisk">
            <option value="">Risk: all</option>
            <option value="low">Risk: low</option>
            <option value="medium">Risk: medium</option>
            <option value="high">Risk: high</option>
          </select>
          <select id="filterGate">
            <option value="">Gate: all</option>
            <option value="none">Gate: none</option>
            <option value="require_approval">Gate: require approval</option>
            <option value="block">Gate: block</option>
          </select>
          <select id="filterStatus">
            <option value="">Status: all</option>
            <option value="executed">Status: executed</option>
            <option value="filtered_out">Status: filtered_out</option>
            <option value="missing">Status: missing</option>
          </select>
        </div>
        <div class="savedRow">
          <button class="btn" id="saveFilters">Save</button>
          <button class="btn" id="copyFilterLink">Copy filter link</button>
          <button class="btn" id="resetFilters">Reset</button>
          <div class="muted" id="filterCount"></div>
        </div>
        <div class="savedList" id="savedFilters"></div>
        <div class="muted" style="margin-top:6px;">Filters are encoded in the URL hash for shareable links.</div>
      </div>

      <div class="card">
        <div style="font-size:16px;font-weight:900;">Summary</div>
          <div class="kpi">
            <div class="k"><div class="v">${escHtml(String(s.baseline_pass))}</div><div class="l">baseline pass</div></div>
            <div class="k"><div class="v">${escHtml(String(s.new_pass))}</div><div class="l">new pass</div></div>
            <div class="k"><div class="v">${escHtml(String(s.regressions))}</div><div class="l">regressions</div></div>
            <div class="k"><div class="v">${escHtml(String(s.improvements))}</div><div class="l">improvements</div></div>
          </div>
          <div class="muted" style="margin-top:8px;">
            suites: ${suiteEntries.length ? escHtml(suiteEntries.map(([name]) => name).join(", ")) : "—"}
          </div>

          ${
            report.environment
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">Environment</div>
          <div class="muted" style="margin-top:6px;">
            agent: ${escHtml(report.environment.agent_id || "—")} · model: ${escHtml(report.environment.model || "—")}
          </div>
          <div class="muted" style="margin-top:4px;">
            prompt: ${escHtml(report.environment.prompt_version || "—")} · tools: ${escHtml(report.environment.tools_version || "—")}
          </div>`
              : ""
          }

          ${
            report.compliance_mapping && report.compliance_mapping.length
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">Compliance</div>
          <div class="muted" style="margin-top:6px;">
            ${report.compliance_mapping
              .map((c) => `${escHtml(c.framework)} ${escHtml(c.clause)}${c.title ? ` — ${escHtml(c.title)}` : ""}`)
              .join("<br/>")}
          </div>`
              : ""
          }

          <div style="margin-top:14px; font-size:16px; font-weight:900;">Risk</div>
          <div class="kpi">
            <div class="k"><div class="v">${escHtml(String(s.risk_summary.low))}</div><div class="l">risk low</div></div>
            <div class="k"><div class="v">${escHtml(String(s.risk_summary.medium))}</div><div class="l">risk medium</div></div>
            <div class="k"><div class="v">${escHtml(String(s.risk_summary.high))}</div><div class="l">risk high</div></div>
            <div class="k"><div class="v">${escHtml(String(s.cases_requiring_approval))}</div><div class="l">require approval</div></div>
            <div class="k"><div class="v">${escHtml(String(s.cases_block_recommended))}</div><div class="l">block recommended</div></div>
          </div>

          <div style="margin-top:14px; font-size:16px; font-weight:900;">Data coverage</div>
          <div class="kpi">
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.total_cases))}</div><div class="l">total_cases</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.items_emitted))}</div><div class="l">items_emitted</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.missing_baseline_artifacts))}</div><div class="l">missing baseline</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.missing_new_artifacts))}</div><div class="l">missing new</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.broken_baseline_artifacts))}</div><div class="l">broken baseline</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.broken_new_artifacts))}</div><div class="l">broken new</div></div>
          </div>

          ${
            eq
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">Execution quality</div>
          <div class="kpi" style="margin-top:10px;">
            <div class="k"><div class="v">${executionQualityBadge(eq.status)}</div><div class="l">status</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.baseline_transport_success_rate))}</div><div class="l">baseline transport success</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.new_transport_success_rate))}</div><div class="l">new transport success</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.baseline_runner_failures))}</div><div class="l">baseline runner failures</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.new_runner_failures))}</div><div class="l">new runner failures</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.weak_expected_rate))}</div><div class="l">weak expected rate</div></div>
          </div>
          <div class="muted" style="margin-top:10px;">
            thresholds: min transport success ${escHtml(pct(eq.thresholds.min_transport_success_rate))} · max weak expected ${escHtml(pct(eq.thresholds.max_weak_expected_rate))}
          </div>
          <div class="muted" style="margin-top:6px;">
            failure kinds: baseline ${escHtml(fmtFailureKinds(eq.baseline_runner_failure_kinds))} · new ${escHtml(fmtFailureKinds(eq.new_runner_failure_kinds))}
          </div>
          <div class="muted" style="margin-top:6px;">
            reasons: ${eq.reasons.length ? escHtml(eq.reasons.join(" · ")) : "none"}
          </div>`
              + `${eq.admissibility_kpi
                ? `<div style="margin-top:10px; font-size:14px; font-weight:900;">Admissibility KPI</div>
          <div class="kpi" style="margin-top:8px;">
            <div class="k"><div class="v">${escHtml(String(eq.admissibility_kpi.risk_mass_before))}</div><div class="l">risk mass before</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.admissibility_kpi.risk_mass_after))}</div><div class="l">risk mass after</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.admissibility_kpi.pre_action_entropy_removed))}</div><div class="l">pre-action entropy removed</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.admissibility_kpi.reconstruction_minutes_saved_per_block))}</div><div class="l">reconstruction min saved/block</div></div>
          </div>
          <div class="muted" style="margin-top:6px;">
            blocked cases: ${escHtml(String(eq.admissibility_kpi.blocked_cases))} · reconstruction min saved total: ${escHtml(String(eq.admissibility_kpi.reconstruction_minutes_saved_total))}
          </div>`
                : ""}`
              + `${eq.model_quality_inconclusive
                ? `<div class="muted" style="margin-top:6px;">
            model quality: inconclusive${eq.model_quality_inconclusive_reason ? ` (${escHtml(eq.model_quality_inconclusive_reason)})` : ""}
          </div>`
                : ""}`
              : ""
          }

          ${
            s.trace_anchor_coverage
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">OTel anchors</div>
          <div class="kpi" style="margin-top:10px;">
            <div class="k"><div class="v">${escHtml(String(s.trace_anchor_coverage.cases_with_anchor_baseline))}</div><div class="l">cases with baseline anchor</div></div>
            <div class="k"><div class="v">${escHtml(String(s.trace_anchor_coverage.cases_with_anchor_new))}</div><div class="l">cases with new anchor</div></div>
          </div>`
              : ""
          }

          <div style="margin-top:14px; font-size:16px; font-weight:900;">Quality flags</div>
          <div class="kpi" style="margin-top:10px;">
            <div class="k"><div class="v">${escHtml(String(q.self_contained))}</div><div class="l">self_contained</div></div>
            <div class="k"><div class="v">${escHtml(String(q.portable_paths))}</div><div class="l">portable_paths</div></div>
            <div class="k"><div class="v">${escHtml(String(q.missing_assets_count))}</div><div class="l">missing_assets_count</div></div>
            <div class="k"><div class="v">${escHtml(String(q.path_violations_count))}</div><div class="l">path_violations_count</div></div>
            <div class="k"><div class="v">${escHtml(String(q.large_payloads_count))}</div><div class="l">large_payloads</div></div>
          </div>
          <div class="muted" style="margin-top:10px;">
            ${q.missing_assets.length
              ? `missing_assets: ${escHtml(q.missing_assets.slice(0, 6).join(" · "))}${q.missing_assets.length > 6 ? " …" : ""}`
              : "missing_assets: —"
            }
          </div>
          <div class="muted" style="margin-top:6px;">
            ${q.path_violations.length
              ? `path_violations: ${escHtml(q.path_violations.slice(0, 6).join(" · "))}${q.path_violations.length > 6 ? " …" : ""}`
              : "path_violations: —"
            }
          </div>
          <div class="muted" style="margin-top:6px;">
            ${q.large_payloads.length
              ? `large_payloads: ${escHtml(q.large_payloads.slice(0, 4).join(" · "))}${q.large_payloads.length > 4 ? " …" : ""}`
              : "large_payloads: —"
            }
          </div>
        </div>

        ${suiteBlocks}
        ${secBlock}
      </div>

      <div class="card">
        <div style="font-size:16px;font-weight:900;">Cases</div>
        <div class="muted" style="margin-top:6px;">Tip: click case id to open replay diff</div>
        <div class="savedRow" style="margin-top:10px;">
          <button class="btn" id="pagePrev">Prev</button>
          <button class="btn" id="pageNext">Next</button>
          <label class="muted" for="pageSize">Rows/page:</label>
          <select id="pageSize" style="background:#0b0d10;border:1px solid #232836;color:#e8eaed;border-radius:10px;padding:6px 8px;">
            <option value="25">25</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
          <div class="muted" id="pageInfo"></div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>case</th>
              <th>baseline</th>
              <th>new</th>
              <th>baseline_root</th>
              <th>new_root</th>
              <th>preventable</th>
              <th>policy_rules</th>
              <th>trace</th>
              <th>security</th>
              <th>assets</th>
            </tr>
          </thead>
          <tbody id="casesBody"></tbody>
        </table>
      </div>

      <div class="card" style="margin-top:16px;">
        <div style="font-size:16px;font-weight:900;">Root cause breakdown (new)</div>
        ${breakdownRows
      ? `<table class="table"><thead><tr><th>root_cause</th><th>count</th></tr></thead><tbody>${breakdownRows}</tbody></table>`
      : `<div class="muted" style="margin-top:10px;">No failures / no breakdown</div>`
    }
        <div class="muted" style="margin-top:10px;">
          This report directory is self-contained (assets are copied into <code>assets/</code>).
        </div>
      </div>
    </div>
  </div>
  <script id="rows-data" type="application/json">${scriptSafeJson(rowsDataJson)}</script>
  <script id="embedded-manifest-index" type="application/json">${scriptSafeJson(embeddedIndexJson)}</script>
  <script>
${REPORT_CLIENT_SCRIPT}
  </script>
</body>
</html>`;
}
