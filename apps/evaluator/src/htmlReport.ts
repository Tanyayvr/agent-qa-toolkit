//tool/apps/evaluator/src/htmlReport.ts
export type SignalSeverity = "low" | "medium" | "high" | "critical";
export type SignalConfidence = "low" | "medium" | "high";

export type EvidenceRef = {
  kind: "tool_result" | "retrieval_doc" | "event" | "asset" | "final_output" | "runner_failure";
  manifest_key: string;
};

export type SecuritySignal = {
  kind:
  | "untrusted_url_input"
  | "token_exfil_indicator"
  | "policy_tampering"
  | "unexpected_outbound"
  | "high_risk_action"
  | "permission_change"
  | "secret_in_output"
  | "pii_in_output"
  | "prompt_injection_marker"
  | "runner_failure_detected"
  | "unknown";
  severity: SignalSeverity;
  confidence: SignalConfidence;
  title: string;
  details?: {
    tool?: string;
    call_id?: string;
    action_id?: string;
    fields?: string[];
    urls?: string[];
    notes?: string;
  };
  evidence_refs: EvidenceRef[];
};

export type TraceIntegritySide = {
  status: "ok" | "partial" | "broken";
  issues: string[];
};

export type TraceIntegrity = {
  baseline: TraceIntegritySide;
  new: TraceIntegritySide;
};

export type SecuritySide = {
  signals: SecuritySignal[];
  requires_gate_recommendation: boolean;
};

export type SecurityPack = {
  baseline: SecuritySide;
  new: SecuritySide;
};

export type QualityFlags = {
  self_contained: boolean;
  portable_paths: boolean;
  missing_assets_count: number;
  path_violations_count: number;
  large_payloads_count: number;
  missing_assets: string[];
  path_violations: string[];
  large_payloads: string[];
};

export type CompareReport = {
  contract_version: 5;
  report_id: string;
  baseline_dir: string;
  new_dir: string;
  cases_path: string;

  repro?: {
    bundle_manifest_href: string;
    how_to_reproduce_href: string;
  };

  summary: {
    baseline_pass: number;
    new_pass: number;
    regressions: number;
    improvements: number;

    root_cause_breakdown: Record<string, number>;

    quality: {
      transfer_class: "internal_only" | "transferable";
      redaction_status: "none" | "applied";
      redaction_preset_id?: string;
    };

    security: {
      total_cases: number;
      cases_with_signals_new: number;
      cases_with_signals_baseline: number;
      signal_counts_new: Record<SignalSeverity, number>;
      signal_counts_baseline: Record<SignalSeverity, number>;
      top_signal_kinds_new: string[];
      top_signal_kinds_baseline: string[];
    };

    risk_summary: { low: number; medium: number; high: number };
    cases_requiring_approval: number;
    cases_block_recommended: number;

    data_coverage: {
      total_cases: number;
      items_emitted: number;
      missing_baseline_artifacts: number;
      missing_new_artifacts: number;
      broken_baseline_artifacts: number;
      broken_new_artifacts: number;
    };
  };

  summary_by_suite?: Record<string, {
    baseline_pass: number;
    new_pass: number;
    regressions: number;
    improvements: number;
    root_cause_breakdown: Record<string, number>;
    security: {
      total_cases: number;
      cases_with_signals_new: number;
      cases_with_signals_baseline: number;
      signal_counts_new: Record<SignalSeverity, number>;
      signal_counts_baseline: Record<SignalSeverity, number>;
      top_signal_kinds_new: string[];
      top_signal_kinds_baseline: string[];
    };
    risk_summary: { low: number; medium: number; high: number };
    cases_requiring_approval: number;
    cases_block_recommended: number;
    data_coverage: {
      total_cases: number;
      items_emitted: number;
      missing_baseline_artifacts: number;
      missing_new_artifacts: number;
      broken_baseline_artifacts: number;
      broken_new_artifacts: number;
    };
  }>;

  quality_flags: QualityFlags;

  items: Array<{
    case_id: string;
    title: string;
    suite?: string;

    data_availability: {
      baseline: { status: "present" | "missing" | "broken"; reason?: string; reason_code?: string; details?: Record<string, unknown> };
      new: { status: "present" | "missing" | "broken"; reason?: string; reason_code?: string; details?: Record<string, unknown> };
    };

    case_status: "executed" | "skipped" | "filtered_out";
    case_status_reason?: string;

    baseline_pass: boolean;
    new_pass: boolean;

    baseline_root?: string;
    new_root?: string;

    preventable_by_policy: boolean;
    recommended_policy_rules: string[];

    trace_integrity: TraceIntegrity;
    security: SecurityPack;

    risk_level: "low" | "medium" | "high";
    risk_tags: string[];
    gate_recommendation: "none" | "require_approval" | "block";

    failure_summary?: {
      baseline?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number };
      new?: { class: string; http_status?: number; timeout_ms?: number; attempts?: number };
    };

    artifacts: {
      replay_diff_href: string;

      baseline_failure_body_href?: string;
      baseline_failure_body_key?: string;
      baseline_failure_meta_href?: string;
      baseline_failure_meta_key?: string;
      new_failure_body_href?: string;
      new_failure_body_key?: string;
      new_failure_meta_href?: string;
      new_failure_meta_key?: string;

      baseline_case_response_href?: string;
      baseline_case_response_key?: string;
      new_case_response_href?: string;
      new_case_response_key?: string;
      baseline_run_meta_href?: string;
      new_run_meta_href?: string;
    };
  }>;
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a JSON string for safe embedding in <script type="application/json">.
 *  Only escapes sequences that would prematurely close the script tag. */
function scriptSafeJson(json: string): string {
  return json.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
}

function badge(text: string, tone: "ok" | "bad" | "mid" = "mid"): string {
  const cls = tone === "ok" ? "b-ok" : tone === "bad" ? "b-bad" : "b-mid";
  return `<span class="badge ${cls}">${escHtml(text)}</span>`;
}

function riskBadge(level: "low" | "medium" | "high"): string {
  if (level === "high") return badge("high", "bad");
  if (level === "medium") return badge("medium", "mid");
  return badge("low", "ok");
}

function gateBadge(g: "none" | "require_approval" | "block"): string {
  if (g === "block") return badge("block", "bad");
  if (g === "require_approval") return badge("approve", "mid");
  return badge("none", "ok");
}

function failureBadge(): string {
  return badge("runner_failure", "bad");
}

function linkIfPresent(href: string | undefined, label: string): string {
  if (!href) return "";
  return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
}

function linkIfPresentWithKey(href: string | undefined, key: string | undefined, label: string): string {
  if (key) {
    return `<a data-manifest-key="${escHtml(key)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
  }
  if (href) {
    return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
  }
  return "";
}

function rulesCell(rules: string[]): string {
  const arr = Array.isArray(rules) ? rules : [];
  if (arr.length === 0) return `<span class="muted">—</span>`;
  return `<div class="wrapRules">${arr.map((r) => `<span class="rule">${escHtml(r)}</span>`).join("")}</div>`;
}

function rootCell(root: string | undefined): string {
  if (!root) return `<span class="muted">—</span>`;
  return `<code>${escHtml(root)}</code>`;
}

function traceSideBadge(side: TraceIntegritySide): string {
  if (side.status === "ok") return badge("ok", "ok");
  if (side.status === "partial") return badge("partial", "mid");
  return badge("broken", "bad");
}

function traceCell(t: TraceIntegrity): string {
  const b = t.baseline;
  const n = t.new;

  const bIssues = b.issues.length ? `<div class="muted" style="margin-top:6px;">${escHtml(b.issues.join(", "))}</div>` : "";
  const nIssues = n.issues.length ? `<div class="muted" style="margin-top:6px;">${escHtml(n.issues.join(", "))}</div>` : "";

  return `
<div>
  <div><span class="muted">baseline:</span> ${traceSideBadge(b)}</div>
  ${bIssues}
  <div style="margin-top:6px;"><span class="muted">new:</span> ${traceSideBadge(n)}</div>
  ${nIssues}
</div>`.trim();
}

function severityOrder(s: SignalSeverity): number {
  if (s === "critical") return 4;
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

function maxSeverity(signals: SecuritySignal[]): SignalSeverity | null {
  if (!signals.length) return null;
  let best: SignalSeverity = "low";
  for (const sig of signals) {
    if (severityOrder(sig.severity) > severityOrder(best)) best = sig.severity;
  }
  return best;
}

function securityCell(p: SecurityPack): string {
  const bMax = maxSeverity(p.baseline.signals);
  const nMax = maxSeverity(p.new.signals);

  const bCount = p.baseline.signals.length;
  const nCount = p.new.signals.length;

  const bTone = bCount === 0 ? "ok" : bMax && (bMax === "high" || bMax === "critical") ? "bad" : "mid";
  const nTone = nCount === 0 ? "ok" : nMax && (nMax === "high" || nMax === "critical") ? "bad" : "mid";

  const bLabel = bCount === 0 ? "0" : `${bCount} (${bMax ?? "low"})`;
  const nLabel = nCount === 0 ? "0" : `${nCount} (${nMax ?? "low"})`;

  return `
<div>
  <div><span class="muted">baseline:</span> ${badge(`sec: ${bLabel}`, bTone as "ok" | "bad" | "mid")}</div>
  <div style="margin-top:6px;"><span class="muted">new:</span> ${badge(`sec: ${nLabel}`, nTone as "ok" | "bad" | "mid")}</div>
  ${p.new.requires_gate_recommendation
      ? `<div class="muted" style="margin-top:6px;">${badge("gate: recommended", "bad")}</div>`
      : ""
    }
</div>`.trim();
}

export function renderHtmlReport(report: CompareReport & { embedded_manifest_index?: unknown }): string {
  const s = report.summary;

  const breakdownRows = Object.entries(s.root_cause_breakdown ?? {})
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `<tr><td><code>${escHtml(k)}</code></td><td>${escHtml(String(v))}</td></tr>`)
    .join("");

  const q = report.quality_flags;

  const suiteSummaries = report.summary_by_suite ?? {};
  const suiteEntries = Object.entries(suiteSummaries);
  const suiteBlocks = suiteEntries
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

  const suiteOptions = suiteEntries
    .map(([suite]) => `<option value="${escHtml(suite)}">Suite: ${escHtml(suite)}</option>`)
    .join("");
  const suiteQuick = suiteEntries
    .map(([suite]) => `<button class="btn suiteBtn" data-suite="${escHtml(suite)}">${escHtml(suite)}</button>`)
    .join("");

  const sec = s.security;
  const secBlock = `
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

  const rows = report.items
    .map((it) => {
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

      const bRun = linkIfPresent(it.artifacts.baseline_run_meta_href, "baseline.run.json");
      const nRun = linkIfPresent(it.artifacts.new_run_meta_href, "new.run.json");

      const baselineAssets = [bBody, bMeta, bCase, bRun].filter(Boolean).join(" · ");
      const newAssets = [nBody, nMeta, nCase, nRun].filter(Boolean).join(" · ");

      const preventable = it.preventable_by_policy ? badge("preventable", "mid") : `<span class="muted">—</span>`;

      const hasFailure = Boolean(it.failure_summary?.baseline || it.failure_summary?.new);
      const rowClass =
        it.baseline_pass && !it.new_pass
          ? "row-regression"
          : !it.baseline_pass && it.new_pass
            ? "row-improvement"
            : "";
      const diffKind = it.baseline_pass === it.new_pass ? "same" : it.baseline_pass ? "regression" : "improvement";
      return `
<tr class="${rowClass}" data-case="${escHtml(it.case_id)}" data-risk="${escHtml(it.risk_level)}" data-gate="${escHtml(it.gate_recommendation)}" data-status="${escHtml(it.case_status)}" data-suite="${escHtml(suite)}" data-diff="${diffKind}">
  <td>
    <div class="caseTitle">${titleLink}</div>
    <div class="muted">${escHtml(it.title || "")}</div>
    <div class="caseMeta">
      ${riskBadge(it.risk_level)}
      ${gateBadge(it.gate_recommendation)}
      <span class="metaChip">${escHtml(it.case_status)}</span>
      <span class="metaChip">${escHtml(suite)}</span>
      ${suite === "robustness" ? `<span class="metaChip">no assertions</span>` : ""}
      ${hasFailure ? failureBadge() : ""}
    </div>
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
    })
    .join("");

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
  @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } .side { position: static; } }
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
      </div>
      <div class="chips">
        <span class="chip">transfer: ${escHtml(s.quality.transfer_class)}</span>
        <span class="chip">redaction: ${escHtml(s.quality.redaction_status)}${s.quality.redaction_preset_id ? ` (${escHtml(s.quality.redaction_preset_id)})` : ""}</span>
      </div>
    </div>
    <div class="muted" style="margin-top:6px;">
      baseline_dir: <code>${escHtml(report.baseline_dir)}</code> ·
      new_dir: <code>${escHtml(report.new_dir)}</code> ·
      cases: <code>${escHtml(report.cases_path)}</code>
    </div>

    <div class="grid">
    <div class="side">
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

        <div class="card" style="margin-top:16px;">
          <div style="font-size:16px;font-weight:900;">Suite quick filters</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <button class="btn suiteBtn" data-suite="">all</button>
            ${suiteQuick}
          </div>
        </div>

        <div class="card" style="margin-top:16px;">
          <div style="font-size:16px;font-weight:900;">Filters</div>
          <div class="filters">
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
              <option value="skipped">Status: skipped</option>
            </select>
          </div>
        </div>
        ${secBlock}
      </div>

      <div class="card">
        <div style="font-size:16px;font-weight:900;">Cases</div>
        <div class="muted" style="margin-top:6px;">Tip: click case id to open replay diff</div>
        <div class="kpi">
          <div class="k"><div class="v">${escHtml(String(s.baseline_pass))}</div><div class="l">baseline pass</div></div>
          <div class="k"><div class="v">${escHtml(String(s.new_pass))}</div><div class="l">new pass</div></div>
          <div class="k"><div class="v">${escHtml(String(s.regressions))}</div><div class="l">regressions</div></div>
          <div class="k"><div class="v">${escHtml(String(s.improvements))}</div><div class="l">improvements</div></div>
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
          <tbody>${rows}</tbody>
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
  <script id="embedded-manifest-index" type="application/json">${scriptSafeJson(embeddedIndexJson)}</script>
  <script>
    (function() {
      var el = document.getElementById("embedded-manifest-index");
      if (!el) return;
      var raw = el.textContent || "";
      var idx;
      try { idx = JSON.parse(raw); } catch (e) { return; }
      if (!idx || !Array.isArray(idx.items)) return;
      var map = new Map();
      for (var i = 0; i < idx.items.length; i++) {
        var it = idx.items[i];
        if (it && it.manifest_key && it.rel_path) map.set(String(it.manifest_key), String(it.rel_path));
      }
      var links = document.querySelectorAll("a[data-manifest-key]");
      for (var j = 0; j < links.length; j++) {
        var a = links[j];
        var key = a.getAttribute("data-manifest-key");
        if (!key) continue;
        var href = map.get(key);
        if (href) {
          a.setAttribute("href", href);
        } else {
          a.classList.add("muted");
          a.removeAttribute("href");
        }
      }

      var filterText = document.getElementById("filterText");
      var filterSuite = document.getElementById("filterSuite");
      var filterDiff = document.getElementById("filterDiff");
      var filterRisk = document.getElementById("filterRisk");
      var filterGate = document.getElementById("filterGate");
      var filterStatus = document.getElementById("filterStatus");
      var rows = document.querySelectorAll("tbody tr[data-case]");

      function applyFilters() {
        var text = (filterText && filterText.value || "").toLowerCase();
        var suite = filterSuite && filterSuite.value || "";
        var diff = filterDiff && filterDiff.value || "";
        var risk = filterRisk && filterRisk.value || "";
        var gate = filterGate && filterGate.value || "";
        var status = filterStatus && filterStatus.value || "";

        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var caseId = (r.getAttribute("data-case") || "").toLowerCase();
          var title = r.querySelector(".muted") ? r.querySelector(".muted").textContent.toLowerCase() : "";
          var rRisk = r.getAttribute("data-risk") || "";
          var rGate = r.getAttribute("data-gate") || "";
          var rStatus = r.getAttribute("data-status") || "";
          var rSuite = r.getAttribute("data-suite") || "";
          var rDiff = r.getAttribute("data-diff") || "";

          var ok = true;
          if (text && !(caseId.includes(text) || title.includes(text))) ok = false;
          if (suite && rSuite !== suite) ok = false;
          if (diff && rDiff !== diff) ok = false;
          if (risk && rRisk !== risk) ok = false;
          if (gate && rGate !== gate) ok = false;
          if (status && rStatus !== status) ok = false;
          r.style.display = ok ? "" : "none";
        }
      }

      if (filterText) filterText.addEventListener("input", applyFilters);
      if (filterSuite) filterSuite.addEventListener("change", applyFilters);
      if (filterDiff) filterDiff.addEventListener("change", applyFilters);
      if (filterRisk) filterRisk.addEventListener("change", applyFilters);
      if (filterGate) filterGate.addEventListener("change", applyFilters);
      if (filterStatus) filterStatus.addEventListener("change", applyFilters);

      var suiteButtons = document.querySelectorAll(".suiteBtn");
      if (suiteButtons && filterSuite) {
        for (var k = 0; k < suiteButtons.length; k++) {
          suiteButtons[k].addEventListener("click", function (e) {
            var btn = e.currentTarget;
            var value = btn && btn.getAttribute("data-suite");
            filterSuite.value = value || "";
            applyFilters();
          });
        }
      }
    })();
  </script>
</body>
</html>`;
}
