import {
  badge,
  escHtml,
  failureBadge,
  gateBadge,
  linkIfPresent,
  linkIfPresentWithKey,
  riskBadge,
  rootCell,
  rulesCell,
  securityCell,
  traceCell,
} from "./htmlFormatters";
import type { CompareReport, ItemAssertion } from "./reportTypes";

export type ReportRowEntry = {
  case_id: string;
  title: string;
  suite: string;
  risk: string;
  gate: string;
  status: string;
  diff: "regression" | "improvement" | "same";
  ts: number;
  row_html: string;
};

export function buildSuiteBlocks(suiteSummaries: NonNullable<CompareReport["summary_by_suite"]>): string {
  const suiteEntries = Object.entries(suiteSummaries);
  return suiteEntries
    .map(([suite, ss]) => {
      const suiteNote =
        suite === "robustness"
          ? `<div class="muted" style="margin-top:8px;">Robustness has no correctness assertions. PASS means the pipeline completed without fatal errors.</div>`
          : "";
      return `
<div class="card" style="margin-top:12px;">
  <div style="font-size:14px;font-weight:900;">Suite: ${escHtml(suite)}</div>
  <div class="kpi" style="margin-top:10px;">
    <div class="k"><div class="v">${escHtml(String(ss.baseline_pass))}</div><div class="l">baseline pass</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.new_pass))}</div><div class="l">new pass</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.regressions))}</div><div class="l">regressions</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.improvements))}</div><div class="l">improvements</div></div>
  </div>
  <div class="kpi" style="margin-top:10px;">
    <div class="k"><div class="v">${escHtml(String(ss.risk_summary.low))}</div><div class="l">risk low</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.risk_summary.medium))}</div><div class="l">risk medium</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.risk_summary.high))}</div><div class="l">risk high</div></div>
  </div>
  <div class="kpi" style="margin-top:10px;">
    <div class="k"><div class="v">${escHtml(String(ss.cases_requiring_approval))}</div><div class="l">require approval</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.cases_block_recommended))}</div><div class="l">block recommended</div></div>
  </div>
  <div class="kpi" style="margin-top:10px;">
    <div class="k"><div class="v">${escHtml(String(ss.data_coverage.missing_baseline_artifacts))}</div><div class="l">missing baseline</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.data_coverage.missing_new_artifacts))}</div><div class="l">missing new</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.data_coverage.broken_baseline_artifacts))}</div><div class="l">broken baseline</div></div>
    <div class="k"><div class="v">${escHtml(String(ss.data_coverage.broken_new_artifacts))}</div><div class="l">broken new</div></div>
  </div>
  ${suiteNote}
</div>`;
    })
    .join("");
}

export function buildSuiteControls(suiteSummaries: NonNullable<CompareReport["summary_by_suite"]>): {
  options: string;
  quickButtons: string;
} {
  const suiteEntries = Object.entries(suiteSummaries);
  return {
    options: suiteEntries
      .map(([suite]) => `<option value="${escHtml(suite)}">Suite: ${escHtml(suite)}</option>`)
      .join(""),
    quickButtons: suiteEntries
      .map(([suite]) => `<button class="btn tab suiteBtn" data-suite="${escHtml(suite)}">${escHtml(suite)}</button>`)
      .join(""),
  };
}

export function buildSecuritySummaryBlock(sec: CompareReport["summary"]["security"]): string {
  return `
<div class="card" style="margin-top:14px;">
  <div style="font-size:16px;font-weight:900;">Security summary</div>
  <div class="kpi" style="margin-top:10px;">
    <div class="k"><div class="v">${escHtml(String(sec.total_cases))}</div><div class="l">total_cases</div></div>
    <div class="k"><div class="v">${escHtml(String(sec.cases_with_signals_baseline))}</div><div class="l">cases_with_signals_baseline</div></div>
    <div class="k"><div class="v">${escHtml(String(sec.cases_with_signals_new))}</div><div class="l">cases_with_signals_new</div></div>
  </div>
  <div class="muted" style="margin-top:10px;">
    baseline severity counts:
    low=${escHtml(String(sec.signal_counts_baseline.low))},
    medium=${escHtml(String(sec.signal_counts_baseline.medium))},
    high=${escHtml(String(sec.signal_counts_baseline.high))},
    critical=${escHtml(String(sec.signal_counts_baseline.critical))}
  </div>
  <div class="muted" style="margin-top:6px;">
    new severity counts:
    low=${escHtml(String(sec.signal_counts_new.low))},
    medium=${escHtml(String(sec.signal_counts_new.medium))},
    high=${escHtml(String(sec.signal_counts_new.high))},
    critical=${escHtml(String(sec.signal_counts_new.critical))}
  </div>
  <div class="muted" style="margin-top:10px;">
    top_signal_kinds_baseline: ${sec.top_signal_kinds_baseline.length ? escHtml(sec.top_signal_kinds_baseline.join(", ")) : "—"}
  </div>
  <div class="muted" style="margin-top:6px;">
    top_signal_kinds_new: ${sec.top_signal_kinds_new.length ? escHtml(sec.top_signal_kinds_new.join(", ")) : "—"}
  </div>
</div>`.trim();
}

function renderAssertionRows(label: string, rows: ItemAssertion[]): string {
  return rows
    .map(
      (a) =>
        `<div class="assertionRow"><span class="muted">${escHtml(label)}:</span><span class="name">${escHtml(a.name)}</span><span class="${a.pass ? "pass" : "fail"}">${a.pass ? "pass" : "fail"}</span></div>`
    )
    .join("");
}

export function buildRowEntries(items: CompareReport["items"]): ReportRowEntry[] {
  return items.map((it) => {
    const suite = it.suite ?? "default";
    const base = it.baseline_pass ? badge("PASS", "ok") : badge("FAIL", "bad");
    const neu = it.new_pass ? badge("PASS", "ok") : badge("FAIL", "bad");

    const diffHref = it.artifacts.replay_diff_href;
    const titleLink = `<a href="${escHtml(diffHref)}">${escHtml(it.case_id)}</a>`;

    const bBody = linkIfPresentWithKey(
      it.artifacts.baseline_failure_body_href,
      it.artifacts.baseline_failure_body_key,
      "body"
    );
    const bMeta = linkIfPresentWithKey(
      it.artifacts.baseline_failure_meta_href,
      it.artifacts.baseline_failure_meta_key,
      "meta"
    );
    const nBody = linkIfPresentWithKey(
      it.artifacts.new_failure_body_href,
      it.artifacts.new_failure_body_key,
      "body"
    );
    const nMeta = linkIfPresentWithKey(
      it.artifacts.new_failure_meta_href,
      it.artifacts.new_failure_meta_key,
      "meta"
    );

    const bCase = linkIfPresentWithKey(
      it.artifacts.baseline_case_response_href,
      it.artifacts.baseline_case_response_key,
      "baseline.json"
    );
    const nCase = linkIfPresentWithKey(
      it.artifacts.new_case_response_href,
      it.artifacts.new_case_response_key,
      "new.json"
    );
    const bTrace = linkIfPresentWithKey(
      it.artifacts.baseline_trace_anchor_href,
      it.artifacts.baseline_trace_anchor_key,
      "trace-anchor.json"
    );
    const nTrace = linkIfPresentWithKey(
      it.artifacts.new_trace_anchor_href,
      it.artifacts.new_trace_anchor_key,
      "trace-anchor.json"
    );

    const bRun = linkIfPresent(it.artifacts.baseline_run_meta_href, "baseline.run.json");
    const nRun = linkIfPresent(it.artifacts.new_run_meta_href, "new.run.json");

    const baselineAssets = [bBody, bMeta, bCase, bTrace, bRun].filter(Boolean).join(" · ");
    const newAssets = [nBody, nMeta, nCase, nTrace, nRun].filter(Boolean).join(" · ");
    const preventable = it.preventable_by_policy ? badge("preventable", "mid") : `<span class="muted">—</span>`;
    const hasFailure = Boolean(it.failure_summary?.baseline || it.failure_summary?.new);
    const rowClass =
      it.baseline_pass && !it.new_pass
        ? "row-regression"
        : !it.baseline_pass && it.new_pass
          ? "row-improvement"
          : "";
    const diffKind = it.baseline_pass === it.new_pass ? "same" : it.baseline_pass ? "regression" : "improvement";
    const assertions = it.assertions ?? [];
    const failedAssertions = assertions.filter((a) => a.pass === false).map((a) => a.name);
    const assertionChip = assertions.length
      ? `<span class="metaChip" title="${escHtml(failedAssertions.join(", "))}">assertions: ${assertions.length} (fail: ${failedAssertions.length})</span>`
      : "";
    const assertionsBaseline = it.assertions_baseline ?? [];
    const failedBaseline = assertionsBaseline.filter((a) => a.pass === false).map((a) => a.name);
    const assertionBaselineChip = assertionsBaseline.length
      ? `<span class="metaChip" title="${escHtml(failedBaseline.join(", "))}">baseline assertions: ${assertionsBaseline.length} (fail: ${failedBaseline.length})</span>`
      : "";
    const assertionsNew = it.assertions_new ?? [];
    const failedNew = assertionsNew.filter((a) => a.pass === false).map((a) => a.name);
    const assertionNewChip = assertionsNew.length
      ? `<span class="metaChip" title="${escHtml(failedNew.join(", "))}">new assertions: ${assertionsNew.length} (fail: ${failedNew.length})</span>`
      : "";

    const assertionDetails =
      assertionsBaseline.length || assertionsNew.length
        ? `<details class="assertions">
              <summary>Assertions details</summary>
              <div class="assertionList">
                ${assertionsBaseline.length ? renderAssertionRows("baseline", assertionsBaseline) : ""}
                ${assertionsNew.length ? renderAssertionRows("new", assertionsNew) : ""}
              </div>
            </details>`
        : assertions.length
          ? `<details class="assertions">
                <summary>Assertions details</summary>
                <div class="assertionList">
                  ${renderAssertionRows("case", assertions)}
                </div>
              </details>`
          : "";
    const rowHtml = `
<tr class="${rowClass}" data-case="${escHtml(it.case_id)}" data-risk="${escHtml(it.risk_level)}" data-gate="${escHtml(it.gate_recommendation)}" data-status="${escHtml(it.case_status)}" data-suite="${escHtml(suite)}" data-diff="${diffKind}" data-ts="${escHtml(String(it.case_ts ?? ""))}">
  <td>
    <div class="caseTitle">${titleLink}</div>
    <div class="muted">${escHtml(it.title || "")}</div>
    <div class="caseMeta">
      ${riskBadge(it.risk_level)}
      ${gateBadge(it.gate_recommendation)}
      <span class="metaChip">${escHtml(it.case_status)}</span>
      <span class="metaChip">${escHtml(suite)}</span>
      ${suite === "robustness" ? `<span class="metaChip">no assertions</span>` : ""}
      ${assertionChip}${assertionBaselineChip}${assertionNewChip}
      ${hasFailure ? failureBadge() : ""}
    </div>
    ${assertionDetails}
  </td>
  <td>${base}</td>
  <td>${neu}</td>
  <td>${rootCell(it.baseline_root)}</td>
  <td>${rootCell(it.new_root)}</td>
  <td>${preventable}</td>
  <td>${rulesCell(it.recommended_policy_rules)}</td>
  <td>${traceCell(it.trace_integrity)}</td>
  <td>${securityCell(it.security)}</td>
  <td>
    <div><span class="muted">baseline:</span> ${baselineAssets || `<span class="muted">—</span>`}</div>
    <div><span class="muted">new:</span> ${newAssets || `<span class="muted">—</span>`}</div>
  </td>
</tr>`;

    return {
      case_id: it.case_id,
      title: it.title || "",
      suite,
      risk: it.risk_level,
      gate: it.gate_recommendation,
      status: it.case_status,
      diff: diffKind,
      ts: Number(it.case_ts ?? 0),
      row_html: rowHtml,
    };
  });
}
