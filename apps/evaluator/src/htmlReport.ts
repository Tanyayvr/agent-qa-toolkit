// apps/evaluator/src/htmlReport.ts
import {
  escHtml,
  executionQualityBadge,
  fmtFailureKinds,
  pct,
  scriptSafeJson,
} from "./htmlFormatters";
import type { CompareReport } from "./reportTypes";
import { renderReportClientScript } from "./htmlClientScript";
import {
  buildRowEntries,
  buildSecuritySummaryBlock,
  buildSuiteBlocks,
  buildSuiteControls,
} from "./htmlSections";
import { getReportCopy, type ReportCopy, type ReportLocale } from "./reportI18n";
export type {
  BundleExports,
  ComplianceExports,
  ComplianceCoverageEntry,
  ComplianceCoverageStatus,
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

function renderBundleControlsSection(report: CompareReport, title: string): string {
  const retentionHref = report.bundle_exports?.retention_archive_controls_href;
  if (!retentionHref) return "";
  return `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(title)}</div>
          <div class="muted" style="margin-top:6px;">
            <a href="${escHtml(retentionHref)}">retention-controls.json</a>
          </div>`;
}

function complianceStatusBadge(status: "covered" | "partial" | "missing", labels: { covered: string; partial: string; missing: string }): string {
  if (status === "covered") return `<span class="badge b-ok">${escHtml(labels.covered)}</span>`;
  if (status === "partial") return `<span class="badge b-mid">${escHtml(labels.partial)}</span>`;
  return `<span class="badge b-bad">${escHtml(labels.missing)}</span>`;
}

function renderSelectorList(selectors: string[]): string {
  if (!selectors.length) return '<span class="muted">-</span>';
  return selectors.map((selector) => `<code>${escHtml(selector)}</code>`).join("<br/>");
}

function renderComplianceSection(report: CompareReport, copy: ReportCopy): string {
  const euExports = report.compliance_exports?.eu_ai_act;
  const exportLinks = euExports
    ? [
        euExports.coverage_href ? `<a href="${escHtml(euExports.coverage_href)}">coverage.json</a>` : "",
        `<a href="${escHtml(euExports.annex_iv_href)}">annex-iv.json</a>`,
        `<a href="${escHtml(euExports.article_10_data_governance_href)}">article-10-data-governance.json</a>`,
        euExports.reviewer_html_href ? `<a href="${escHtml(euExports.reviewer_html_href)}">eu-ai-act-reviewer.html</a>` : "",
        euExports.reviewer_markdown_href ? `<a href="${escHtml(euExports.reviewer_markdown_href)}">eu-ai-act-reviewer.md</a>` : "",
        euExports.report_html_href ? `<a href="${escHtml(euExports.report_html_href)}">eu-ai-act-report.html</a>` : "",
        euExports.evidence_index_href ? `<a href="${escHtml(euExports.evidence_index_href)}">evidence-index.json</a>` : "",
        `<a href="${escHtml(euExports.article_13_instructions_href)}">article-13-instructions.json</a>`,
        `<a href="${escHtml(euExports.article_16_provider_obligations_href)}">article-16-provider-obligations.json</a>`,
        `<a href="${escHtml(euExports.article_43_conformity_assessment_href)}">article-43-conformity-assessment.json</a>`,
        `<a href="${escHtml(euExports.article_47_declaration_of_conformity_href)}">article-47-declaration-of-conformity.json</a>`,
        `<a href="${escHtml(euExports.article_9_risk_register_href)}">article-9-risk-register.json</a>`,
        `<a href="${escHtml(euExports.article_72_monitoring_plan_href)}">article-72-monitoring-plan.json</a>`,
        `<a href="${escHtml(euExports.article_17_qms_lite_href)}">article-17-qms-lite.json</a>`,
        `<a href="${escHtml(euExports.annex_v_declaration_content_href)}">annex-v-declaration-content.json</a>`,
        euExports.article_73_serious_incident_pack_href
          ? `<a href="${escHtml(euExports.article_73_serious_incident_pack_href)}">article-73-serious-incident-pack.json</a>`
          : "",
        `<a href="${escHtml(euExports.human_oversight_summary_href)}">human-oversight-summary.json</a>`,
        euExports.release_review_href ? `<a href="${escHtml(euExports.release_review_href)}">release-review.json</a>` : "",
        `<a href="${escHtml(euExports.post_market_monitoring_href)}">post-market-monitoring.json</a>`,
      ].filter(Boolean).join(" · ")
    : "";
  const exportLinksBlock = exportLinks ? `<div class="muted" style="margin-top:6px;">${exportLinks}</div>` : "";

  if (report.compliance_coverage?.length) {
    const rows = report.compliance_coverage
      .map((entry) => {
        const evidenceBlock = [
          entry.required_evidence_present.length
            ? `<div><span class="badge b-ok">${escHtml(copy.requiredPresentLabel)} ${escHtml(String(entry.required_evidence_present.length))}</span><div class="muted" style="margin-top:4px;">${renderSelectorList(entry.required_evidence_present)}</div></div>`
            : "",
          entry.required_evidence_missing.length
            ? `<div style="margin-top:8px;"><span class="badge b-bad">${escHtml(copy.requiredMissingLabel)} ${escHtml(String(entry.required_evidence_missing.length))}</span><div class="muted" style="margin-top:4px;">${renderSelectorList(entry.required_evidence_missing)}</div></div>`
            : "",
          entry.supporting_evidence_present.length
            ? `<div style="margin-top:8px;"><span class="badge b-mid">${escHtml(copy.supportingPresentLabel)} ${escHtml(String(entry.supporting_evidence_present.length))}</span><div class="muted" style="margin-top:4px;">${renderSelectorList(entry.supporting_evidence_present)}</div></div>`
            : "",
          entry.supporting_evidence_missing.length
            ? `<div style="margin-top:8px;"><span class="badge">${escHtml(copy.supportingMissingLabel)} ${escHtml(String(entry.supporting_evidence_missing.length))}</span><div class="muted" style="margin-top:4px;">${renderSelectorList(entry.supporting_evidence_missing)}</div></div>`
            : "",
        ].filter(Boolean).join("");
        const notes = [
          entry.residual_gaps?.length
            ? `<div><span class="badge b-bad">${escHtml(copy.residualGapsLabel)}</span><div class="muted" style="margin-top:4px;">${entry.residual_gaps.map((gap) => escHtml(gap)).join("<br/>")}</div></div>`
            : "",
          entry.notes?.length
            ? `<div style="margin-top:8px;"><span class="badge">${escHtml(copy.notesLabel)}</span><div class="muted" style="margin-top:4px;">${entry.notes.map((note) => escHtml(note)).join("<br/>")}</div></div>`
            : "",
        ].filter(Boolean).join("");

        return `<tr>
          <td><code>${escHtml(entry.framework)}</code></td>
          <td><code>${escHtml(entry.clause)}</code>${entry.title ? `<div class="muted" style="margin-top:4px;">${escHtml(entry.title)}</div>` : ""}</td>
          <td>${complianceStatusBadge(entry.status, { covered: copy.coveredBadge, partial: copy.partialBadge, missing: copy.missingBadge })}${entry.status_cap ? `<div class="muted" style="margin-top:4px;">${escHtml(copy.capLabel)}: <code>${escHtml(entry.status_cap)}</code></div>` : ""}</td>
          <td>${evidenceBlock || '<span class="muted">-</span>'}</td>
          <td>${notes || '<span class="muted">-</span>'}</td>
        </tr>`;
      })
      .join("");

    return `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.complianceTitle)}</div>
          ${exportLinksBlock}
          <table class="table" style="margin-top:6px;">
            <thead>
              <tr>
                <th>${escHtml(copy.complianceFrameworkHeader)}</th>
                <th>${escHtml(copy.complianceClauseHeader)}</th>
                <th>${escHtml(copy.complianceStatusHeader)}</th>
                <th>${escHtml(copy.complianceEvidenceHeader)}</th>
                <th>${escHtml(copy.complianceGapsHeader)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`;
  }

  if (report.compliance_mapping?.length) {
    return `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.complianceTitle)}</div>
          ${exportLinksBlock}
          <div class="muted" style="margin-top:6px;">
            ${report.compliance_mapping
              .map((entry) => `${escHtml(entry.framework)} ${escHtml(entry.clause)}${entry.title ? ` - ${escHtml(entry.title)}` : ""}`)
              .join("<br/>")}
          </div>`;
  }

  return "";
}

export function renderHtmlReport(
  report: CompareReport & { embedded_manifest_index?: unknown },
  options: { locale?: ReportLocale } = {}
): string {
  const copy = getReportCopy(options.locale);
  const s = report.summary;
  const eq = s.execution_quality;

  const breakdownRows = Object.entries(s.root_cause_breakdown ?? {})
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `<tr><td><code>${escHtml(k)}</code></td><td>${escHtml(String(v))}</td></tr>`)
    .join("");

  const q = report.quality_flags;

  const suiteSummaries = report.summary_by_suite ?? {};
  const suiteEntries = Object.entries(suiteSummaries);
  const suiteBlocks = buildSuiteBlocks(suiteSummaries, copy);
  const suiteControls = buildSuiteControls(suiteSummaries, copy);
  const suiteOptions = suiteControls.options;
  const suiteQuick = suiteControls.quickButtons;

  const secBlock = buildSecuritySummaryBlock(s.security, copy);

  const rowEntries = buildRowEntries(report.items, copy);
  const rowsDataJson = JSON.stringify(rowEntries);

  const embeddedIndex = (report as unknown as { embedded_manifest_index?: unknown }).embedded_manifest_index;
  const embeddedIndexJson = embeddedIndex ? JSON.stringify(embeddedIndex) : "";

  return `<!doctype html>
<html lang="${escHtml(copy.htmlLang)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(`${copy.title} · ${report.report_id}`)}</title>
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
        <div class="h1">${escHtml(copy.title)}</div>
        <div class="muted">
          contract_version: <code>${escHtml(String(report.contract_version))}</code> ·
          report_id: <code>${escHtml(report.report_id)}</code>
        </div>
        <div class="muted" style="margin-top:4px;">
          ${escHtml(copy.toolkitLabel)}: <code>${escHtml(report.meta.toolkit_version)}</code> ·
          ${escHtml(copy.specLabel)}: <code>${escHtml(report.meta.spec_version)}</code> ·
          ${escHtml(copy.generatedLabel)}: <code>${escHtml(new Date(report.meta.generated_at).toISOString())}</code>
        </div>
      </div>
      <div class="chips">
        <span class="chip">${escHtml(copy.transferLabel)}: ${escHtml(s.quality.transfer_class)}</span>
        <span class="chip">${escHtml(copy.redactionLabel)}: ${escHtml(s.quality.redaction_status)}${s.quality.redaction_preset_id ? ` (${escHtml(s.quality.redaction_preset_id)})` : ""}</span>
        <span class="chip">${executionQualityBadge(eq?.status, copy)}</span>
        <button class="btn" onclick="window.print()">${escHtml(copy.printButton)}</button>
      </div>
    </div>
    <div class="muted" style="margin-top:6px;">
      ${escHtml(copy.baselineDirLabel)}: <code>${escHtml(report.baseline_dir)}</code> ·
      ${escHtml(copy.newDirLabel)}: <code>${escHtml(report.new_dir)}</code> ·
      ${escHtml(copy.casesLabel)}: <code>${escHtml(report.cases_path)}</code>
    </div>

    <div class="grid">
    <div class="side">
      <div class="card" style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:900;">${escHtml(copy.suitesTitle)}</div>
        <div class="tabRow">
          <button class="btn tab suiteBtn" data-suite="">${escHtml(copy.allSuites)}</button>
          ${suiteQuick}
        </div>
        ${suiteEntries.length <= 1 ? `<div class="note">${escHtml(copy.oneSuiteNote)}</div>` : ""}
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:900;">${escHtml(copy.filtersTitle)}</div>
        <div class="filters">
          <div id="localStorageWarning" class="note" style="display:none;">${escHtml(copy.localStorageWarning)}</div>
          <input id="filterText" type="text" placeholder="${escHtml(copy.searchPlaceholder)}" />
          <select id="filterSuite">
            <option value="">${escHtml(copy.suiteAllOption)}</option>
            ${suiteOptions}
          </select>
          <select id="filterDiff">
            <option value="">${escHtml(copy.diffAllOption)}</option>
            <option value="regression">${escHtml(copy.diffRegression)}</option>
            <option value="improvement">${escHtml(copy.diffImprovement)}</option>
            <option value="same">${escHtml(copy.diffSame)}</option>
          </select>
          <select id="filterSort">
            <option value="case_id">${escHtml(copy.sortCaseId)}</option>
            <option value="risk">${escHtml(copy.sortRisk)}</option>
            <option value="gate">${escHtml(copy.sortGate)}</option>
            <option value="diff">${escHtml(copy.sortDiff)}</option>
            <option value="suite">${escHtml(copy.sortSuite)}</option>
            <option value="time_desc">${escHtml(copy.sortTimeNewest)}</option>
            <option value="time_asc">${escHtml(copy.sortTimeOldest)}</option>
          </select>
          <select id="filterRisk">
            <option value="">${escHtml(copy.riskAllOption)}</option>
            <option value="low">${escHtml(copy.riskLowOption)}</option>
            <option value="medium">${escHtml(copy.riskMediumOption)}</option>
            <option value="high">${escHtml(copy.riskHighOption)}</option>
          </select>
          <select id="filterGate">
            <option value="">${escHtml(copy.gateAllOption)}</option>
            <option value="none">${escHtml(copy.gateNoneOption)}</option>
            <option value="require_approval">${escHtml(copy.gateApprovalOption)}</option>
            <option value="block">${escHtml(copy.gateBlockOption)}</option>
          </select>
          <select id="filterStatus">
            <option value="">${escHtml(copy.statusAllOption)}</option>
            <option value="executed">${escHtml(copy.statusExecutedOption)}</option>
            <option value="filtered_out">${escHtml(copy.statusFilteredOption)}</option>
            <option value="missing">${escHtml(copy.statusMissingOption)}</option>
          </select>
        </div>
        <div class="savedRow">
          <button class="btn" id="saveFilters">${escHtml(copy.saveButton)}</button>
          <button class="btn" id="copyFilterLink">${escHtml(copy.copyFilterLinkButton)}</button>
          <button class="btn" id="resetFilters">${escHtml(copy.resetButton)}</button>
          <div class="muted" id="filterCount"></div>
        </div>
        <div class="savedList" id="savedFilters"></div>
        <div class="muted" style="margin-top:6px;">${escHtml(copy.filtersHashNote)}</div>
      </div>

      <div class="card">
        <div style="font-size:16px;font-weight:900;">${escHtml(copy.summaryTitle)}</div>
          <div class="kpi">
            <div class="k"><div class="v">${escHtml(String(s.baseline_pass))}</div><div class="l">${escHtml(copy.baselinePassLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.new_pass))}</div><div class="l">${escHtml(copy.newPassLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.regressions))}</div><div class="l">${escHtml(copy.regressionsLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.improvements))}</div><div class="l">${escHtml(copy.improvementsLabel)}</div></div>
          </div>
          <div class="muted" style="margin-top:8px;">
            ${escHtml(copy.suitesLabel)}: ${suiteEntries.length ? escHtml(suiteEntries.map(([name]) => name).join(", ")) : "—"}
          </div>

          ${
            report.environment
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.environmentTitle)}</div>
          <div class="muted" style="margin-top:6px;">
            ${escHtml(copy.agentLabel)}: ${escHtml(report.environment.agent_id || "—")} · ${escHtml(copy.agentVersionLabel)}: ${escHtml(report.environment.agent_version || "—")}
          </div>
          <div class="muted" style="margin-top:4px;">
            ${escHtml(copy.modelLabel)}: ${escHtml(report.environment.model || "—")} · ${escHtml(copy.modelVersionLabel)}: ${escHtml(report.environment.model_version || "—")}
          </div>
          <div class="muted" style="margin-top:4px;">
            ${escHtml(copy.promptLabel)}: ${escHtml(report.environment.prompt_version || "—")} · ${escHtml(copy.toolsLabel)}: ${escHtml(report.environment.tools_version || "—")} · ${escHtml(copy.configHashLabel)}: ${escHtml(report.environment.config_hash || "—")}
          </div>`
              : ""
          }
          ${
            report.provenance
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.runProvenanceTitle)}</div>
          <div class="muted" style="margin-top:6px;">
            baseline agent_version=${escHtml(report.provenance.baseline.agent_version)} · model=${escHtml(report.provenance.baseline.model)} · model_version=${escHtml(report.provenance.baseline.model_version)}
          </div>
          <div class="muted" style="margin-top:4px;">
            baseline prompt=${escHtml(report.provenance.baseline.prompt_version)} · tools=${escHtml(report.provenance.baseline.tools_version)} · config_hash=${escHtml(report.provenance.baseline.config_hash)}
          </div>
          <div class="muted" style="margin-top:8px;">
            new agent_version=${escHtml(report.provenance.new.agent_version)} · model=${escHtml(report.provenance.new.model)} · model_version=${escHtml(report.provenance.new.model_version)}
          </div>
          <div class="muted" style="margin-top:4px;">
            new prompt=${escHtml(report.provenance.new.prompt_version)} · tools=${escHtml(report.provenance.new.tools_version)} · config_hash=${escHtml(report.provenance.new.config_hash)}
          </div>
          <div class="muted" style="margin-top:6px;">
            ${escHtml(copy.changedFieldsLabel)}: ${report.provenance.changed_fields.length ? escHtml(report.provenance.changed_fields.join(", ")) : escHtml(copy.noneText)}
          </div>`
              : ""
          }

          ${renderBundleControlsSection(report, copy.bundleControlsTitle)}
          ${renderComplianceSection(report, copy)}

          <div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.riskTitle)}</div>
          <div class="kpi">
            <div class="k"><div class="v">${escHtml(String(s.risk_summary.low))}</div><div class="l">${escHtml(copy.riskLowLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.risk_summary.medium))}</div><div class="l">${escHtml(copy.riskMediumLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.risk_summary.high))}</div><div class="l">${escHtml(copy.riskHighLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.cases_requiring_approval))}</div><div class="l">${escHtml(copy.requireApprovalLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.cases_block_recommended))}</div><div class="l">${escHtml(copy.blockRecommendedLabel)}</div></div>
          </div>

          <div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.dataCoverageTitle)}</div>
          <div class="kpi">
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.total_cases))}</div><div class="l">${escHtml(copy.totalCasesLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.items_emitted))}</div><div class="l">${escHtml(copy.itemsEmittedLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.missing_baseline_artifacts))}</div><div class="l">${escHtml(copy.missingBaselineLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.missing_new_artifacts))}</div><div class="l">${escHtml(copy.missingNewLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.broken_baseline_artifacts))}</div><div class="l">${escHtml(copy.brokenBaselineLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.data_coverage.broken_new_artifacts))}</div><div class="l">${escHtml(copy.brokenNewLabel)}</div></div>
          </div>

          ${
            eq
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.executionQualityTitle)}</div>
          <div class="kpi" style="margin-top:10px;">
            <div class="k"><div class="v">${executionQualityBadge(eq.status, copy)}</div><div class="l">${escHtml(copy.statusLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.baseline_transport_success_rate))}</div><div class="l">${escHtml(copy.baselineTransportSuccessLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.new_transport_success_rate))}</div><div class="l">${escHtml(copy.newTransportSuccessLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.baseline_runner_failures))}</div><div class="l">${escHtml(copy.baselineRunnerFailuresLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.new_runner_failures))}</div><div class="l">${escHtml(copy.newRunnerFailuresLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.weak_expected_rate))}</div><div class="l">${escHtml(copy.weakExpectedRateLabel)}</div></div>
          </div>
          <div class="muted" style="margin-top:10px;">
            ${escHtml(copy.thresholdsLabel)}: ${escHtml(copy.thresholdMinTransportSuccessShort)} ${escHtml(
              pct(eq.thresholds.min_transport_success_rate)
            )} · ${escHtml(copy.thresholdMaxWeakExpectedShort)} ${escHtml(pct(eq.thresholds.max_weak_expected_rate))} · ${escHtml(
              copy.thresholdMinPreActionEntropyRemovedShort
            )} ${escHtml(pct(eq.thresholds.min_pre_action_entropy_removed))} · ${escHtml(
              copy.thresholdMinReconstructionMinutesSavedPerBlockShort
            )} ${escHtml(String(eq.thresholds.min_reconstruction_minutes_saved_per_block))}
          </div>
          <div class="muted" style="margin-top:6px;">
            ${escHtml(copy.failureKindsLabel)}: ${escHtml(copy.baselineSideLabel)} ${escHtml(fmtFailureKinds(eq.baseline_runner_failure_kinds))} · ${escHtml(copy.newSideLabel)} ${escHtml(fmtFailureKinds(eq.new_runner_failure_kinds))}
          </div>
          <div class="muted" style="margin-top:6px;">
            ${escHtml(copy.reasonsLabel)}: ${eq.reasons.length ? escHtml(eq.reasons.join(" · ")) : escHtml(copy.noneText)}
          </div>`
              + `${eq.admissibility_kpi
                ? `<div style="margin-top:10px; font-size:14px; font-weight:900;">${escHtml(copy.admissibilityKpiTitle)}</div>
          <div class="kpi" style="margin-top:8px;">
            <div class="k"><div class="v">${escHtml(String(eq.admissibility_kpi.risk_mass_before))}</div><div class="l">${escHtml(copy.riskMassBeforeLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.admissibility_kpi.risk_mass_after))}</div><div class="l">${escHtml(copy.riskMassAfterLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(pct(eq.admissibility_kpi.pre_action_entropy_removed))}</div><div class="l">${escHtml(copy.preActionEntropyRemovedLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(eq.admissibility_kpi.reconstruction_minutes_saved_per_block))}</div><div class="l">${escHtml(copy.reconstructionMinutesSavedPerBlockLabel)}</div></div>
          </div>
          <div class="muted" style="margin-top:6px;">
            ${escHtml(copy.blockedCasesLabel)}: ${escHtml(String(eq.admissibility_kpi.blocked_cases))} · ${escHtml(copy.reconstructionMinutesSavedTotalLabel)}: ${escHtml(String(eq.admissibility_kpi.reconstruction_minutes_saved_total))}
          </div>`
                : ""}`
              + `${eq.model_quality_inconclusive
                ? `<div class="muted" style="margin-top:6px;">
            ${escHtml(copy.modelQualityLabel)}: ${escHtml(copy.inconclusiveLabel)}${eq.model_quality_inconclusive_reason ? ` (${escHtml(eq.model_quality_inconclusive_reason)})` : ""}
          </div>`
                : ""}`
              : ""
          }

          ${
            s.trace_anchor_coverage
              ? `<div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.otelAnchorsTitle)}</div>
          <div class="kpi" style="margin-top:10px;">
            <div class="k"><div class="v">${escHtml(String(s.trace_anchor_coverage.cases_with_anchor_baseline))}</div><div class="l">${escHtml(copy.casesWithBaselineAnchorLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(s.trace_anchor_coverage.cases_with_anchor_new))}</div><div class="l">${escHtml(copy.casesWithNewAnchorLabel)}</div></div>
          </div>`
              : ""
          }

          <div style="margin-top:14px; font-size:16px; font-weight:900;">${escHtml(copy.qualityFlagsTitle)}</div>
          <div class="kpi" style="margin-top:10px;">
            <div class="k"><div class="v">${escHtml(String(q.self_contained))}</div><div class="l">${escHtml(copy.selfContainedLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(q.portable_paths))}</div><div class="l">${escHtml(copy.portablePathsLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(q.missing_assets_count))}</div><div class="l">${escHtml(copy.missingAssetsCountLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(q.path_violations_count))}</div><div class="l">${escHtml(copy.pathViolationsCountLabel)}</div></div>
            <div class="k"><div class="v">${escHtml(String(q.large_payloads_count))}</div><div class="l">${escHtml(copy.largePayloadsCountLabel)}</div></div>
          </div>
          <div class="muted" style="margin-top:10px;">
            ${q.missing_assets.length
              ? `${escHtml(copy.missingAssetsListLabel)}: ${escHtml(q.missing_assets.slice(0, 6).join(" · "))}${q.missing_assets.length > 6 ? " …" : ""}`
              : `${escHtml(copy.missingAssetsListLabel)}: —`
            }
          </div>
          <div class="muted" style="margin-top:6px;">
            ${q.path_violations.length
              ? `${escHtml(copy.pathViolationsListLabel)}: ${escHtml(q.path_violations.slice(0, 6).join(" · "))}${q.path_violations.length > 6 ? " …" : ""}`
              : `${escHtml(copy.pathViolationsListLabel)}: —`
            }
          </div>
          <div class="muted" style="margin-top:6px;">
            ${q.large_payloads.length
              ? `${escHtml(copy.largePayloadsListLabel)}: ${escHtml(q.large_payloads.slice(0, 4).join(" · "))}${q.large_payloads.length > 4 ? " …" : ""}`
              : `${escHtml(copy.largePayloadsListLabel)}: —`
            }
          </div>
        </div>

        ${suiteBlocks}
        ${secBlock}
      </div>

      <div class="card">
        <div style="font-size:16px;font-weight:900;">${escHtml(copy.caseSectionTitle)}</div>
        <div class="muted" style="margin-top:6px;">${escHtml(copy.caseTip)}</div>
        <div class="savedRow" style="margin-top:10px;">
          <button class="btn" id="pagePrev">${escHtml(copy.prevButton)}</button>
          <button class="btn" id="pageNext">${escHtml(copy.nextButton)}</button>
          <label class="muted" for="pageSize">${escHtml(copy.rowsPerPageLabel)}</label>
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
              <th>${escHtml(copy.caseHeader)}</th>
              <th>${escHtml(copy.baselineHeader)}</th>
              <th>${escHtml(copy.newHeader)}</th>
              <th>${escHtml(copy.baselineRootHeader)}</th>
              <th>${escHtml(copy.newRootHeader)}</th>
              <th>${escHtml(copy.preventableHeader)}</th>
              <th>${escHtml(copy.policyRulesHeader)}</th>
              <th>${escHtml(copy.traceHeader)}</th>
              <th>${escHtml(copy.securityHeader)}</th>
              <th>${escHtml(copy.assetsHeader)}</th>
            </tr>
          </thead>
          <tbody id="casesBody"></tbody>
        </table>
      </div>

      <div class="card" style="margin-top:16px;">
        <div style="font-size:16px;font-weight:900;">${escHtml(copy.rootCauseBreakdownTitle)}</div>
        ${breakdownRows
      ? `<table class="table"><thead><tr><th>${escHtml(copy.rootCauseHeader)}</th><th>${escHtml(copy.countHeader)}</th></tr></thead><tbody>${breakdownRows}</tbody></table>`
      : `<div class="muted" style="margin-top:10px;">${escHtml(copy.noBreakdown)}</div>`
    }
        <div class="muted" style="margin-top:10px;">
          ${escHtml(copy.selfContainedNote)}
        </div>
      </div>
    </div>
  </div>
  <script id="rows-data" type="application/json">${scriptSafeJson(rowsDataJson)}</script>
  <script id="embedded-manifest-index" type="application/json">${scriptSafeJson(embeddedIndexJson)}</script>
  <script>
${renderReportClientScript(copy)}
  </script>
</body>
</html>`;
}
