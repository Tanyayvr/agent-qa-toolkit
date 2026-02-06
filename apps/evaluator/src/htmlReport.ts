//tool/apps/evaluator/src/htmlReport.ts
export type SignalSeverity = "low" | "medium" | "high" | "critical";
export type SignalConfidence = "low" | "medium" | "high";

export type EvidenceRef =
  | { kind: "tool_result"; call_id: string }
  | { kind: "retrieval_doc"; id: string }
  | { kind: "final_output" }
  | { kind: "runner_failure" };

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
  missing_assets: string[];
  path_violations: string[];
};

export type CompareReport = {
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

    security: {
      total_cases: number;
      cases_with_signals_new: number;
      cases_with_signals_baseline: number;
      signal_counts_new: Record<SignalSeverity, number>;
      signal_counts_baseline: Record<SignalSeverity, number>;
      top_signal_kinds_new: string[];
      top_signal_kinds_baseline: string[];
    };
  };

  quality_flags: QualityFlags;

  items: Array<{
    case_id: string;
    title: string;

    baseline_pass: boolean;
    new_pass: boolean;

    baseline_root?: string;
    new_root?: string;

    preventable_by_policy: boolean;
    recommended_policy_rules: string[];

    trace_integrity: TraceIntegrity;
    security: SecurityPack;

    artifacts: {
      replay_diff_href: string;

      baseline_failure_body_href?: string;
      baseline_failure_meta_href?: string;
      new_failure_body_href?: string;
      new_failure_meta_href?: string;

      baseline_case_response_href?: string;
      new_case_response_href?: string;
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

function badge(text: string, tone: "ok" | "bad" | "mid" = "mid"): string {
  const cls = tone === "ok" ? "b-ok" : tone === "bad" ? "b-bad" : "b-mid";
  return `<span class="badge ${cls}">${escHtml(text)}</span>`;
}

function linkIfPresent(href: string | undefined, label: string): string {
  if (!href) return "";
  return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
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
  ${
    p.new.requires_gate_recommendation
      ? `<div class="muted" style="margin-top:6px;">${badge("gate: recommended", "bad")}</div>`
      : ""
  }
</div>`.trim();
}

export function renderHtmlReport(report: CompareReport): string {
  const s = report.summary;

  const breakdownRows = Object.entries(s.root_cause_breakdown ?? {})
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `<tr><td><code>${escHtml(k)}</code></td><td>${escHtml(String(v))}</td></tr>`)
    .join("");

  const q = report.quality_flags;
  const qBlock = `
<div class="card" style="margin-top:14px;">
  <div style="font-size:16px;font-weight:900;">Quality flags</div>
  <div class="kpi" style="margin-top:10px;">
    <div class="k"><div class="v">${escHtml(String(q.self_contained))}</div><div class="l">self_contained</div></div>
    <div class="k"><div class="v">${escHtml(String(q.portable_paths))}</div><div class="l">portable_paths</div></div>
    <div class="k"><div class="v">${escHtml(String(q.missing_assets_count))}</div><div class="l">missing_assets_count</div></div>
    <div class="k"><div class="v">${escHtml(String(q.path_violations_count))}</div><div class="l">path_violations_count</div></div>
  </div>
  <div class="muted" style="margin-top:10px;">
    ${
      q.missing_assets.length
        ? `missing_assets: ${escHtml(q.missing_assets.slice(0, 6).join(" · "))}${q.missing_assets.length > 6 ? " …" : ""}`
        : "missing_assets: —"
    }
  </div>
  <div class="muted" style="margin-top:6px;">
    ${
      q.path_violations.length
        ? `path_violations: ${escHtml(q.path_violations.slice(0, 6).join(" · "))}${q.path_violations.length > 6 ? " …" : ""}`
        : "path_violations: —"
    }
  </div>
</div>`.trim();

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
      const base = it.baseline_pass ? badge("PASS", "ok") : badge("FAIL", "bad");
      const neu = it.new_pass ? badge("PASS", "ok") : badge("FAIL", "bad");

      const diffHref = it.artifacts.replay_diff_href;
      const titleLink = `<a href="${escHtml(diffHref)}">${escHtml(it.case_id)}</a>`;

      const bBody = linkIfPresent(it.artifacts.baseline_failure_body_href, "body");
      const bMeta = linkIfPresent(it.artifacts.baseline_failure_meta_href, "meta");
      const nBody = linkIfPresent(it.artifacts.new_failure_body_href, "body");
      const nMeta = linkIfPresent(it.artifacts.new_failure_meta_href, "meta");

      const bCase = linkIfPresent(it.artifacts.baseline_case_response_href, "baseline.json");
      const nCase = linkIfPresent(it.artifacts.new_case_response_href, "new.json");

      const bRun = linkIfPresent(it.artifacts.baseline_run_meta_href, "baseline.run.json");
      const nRun = linkIfPresent(it.artifacts.new_run_meta_href, "new.run.json");

      const baselineAssets = [bBody, bMeta, bCase, bRun].filter(Boolean).join(" · ");
      const newAssets = [nBody, nMeta, nCase, nRun].filter(Boolean).join(" · ");

      const preventable = it.preventable_by_policy ? badge("preventable", "mid") : `<span class="muted">—</span>`;

      return `
<tr>
  <td>
    <div style="font-weight:700;">${titleLink}</div>
    <div class="muted">${escHtml(it.title || "")}</div>
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

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(`Evaluator report · ${report.report_id}`)}</title>
<style>
  :root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  body { margin:0; background:#0b0d10; color:#e8eaed; }
  a { color:#8ab4f8; text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }
  .h1 { font-size: 22px; font-weight: 900; margin: 0 0 6px 0; }
  .muted { color:#9aa4b2; font-size: 13px; }
  .grid { display:grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-top: 14px; }
  .card { background:#0f1217; border:1px solid #232836; border-radius: 14px; padding: 12px; }
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
  .wrapRules { display:flex; flex-wrap:wrap; gap:6px; }
  .rule { background:#0b0d10; border:1px solid #232836; border-radius: 999px; padding: 2px 8px; font-size: 12px; color:#cbd5e1; }
  @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="h1">Evaluator report</div>
    <div class="muted">
      report_id: <code>${escHtml(report.report_id)}</code> ·
      baseline_dir: <code>${escHtml(report.baseline_dir)}</code> ·
      new_dir: <code>${escHtml(report.new_dir)}</code> ·
      cases: <code>${escHtml(report.cases_path)}</code>
    </div>

    ${qBlock}
    ${secBlock}

    <div class="grid">
      <div class="card">
        <div style="font-size:16px;font-weight:900;">Summary</div>
        <div class="kpi">
          <div class="k"><div class="v">${escHtml(String(s.baseline_pass))}</div><div class="l">baseline pass</div></div>
          <div class="k"><div class="v">${escHtml(String(s.new_pass))}</div><div class="l">new pass</div></div>
          <div class="k"><div class="v">${escHtml(String(s.regressions))}</div><div class="l">regressions</div></div>
          <div class="k"><div class="v">${escHtml(String(s.improvements))}</div><div class="l">improvements</div></div>
        </div>

        <div style="margin-top:14px; font-size:16px; font-weight:900;">Cases</div>
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

      <div class="card">
        <div style="font-size:16px;font-weight:900;">Root cause breakdown (new)</div>
        ${
          breakdownRows
            ? `<table class="table"><thead><tr><th>root_cause</th><th>count</th></tr></thead><tbody>${breakdownRows}</tbody></table>`
            : `<div class="muted" style="margin-top:10px;">No failures / no breakdown</div>`
        }
        <div class="muted" style="margin-top:10px;">
          This report directory is self-contained (assets are copied into <code>assets/</code>).
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
