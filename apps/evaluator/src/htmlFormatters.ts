import type {
  SecurityPack,
  SecuritySignal,
  SignalSeverity,
  TraceIntegrity,
  TraceIntegritySide,
} from "./htmlReport";
import { getReportCopy, type ReportCopy } from "./reportI18n";

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a JSON string for safe embedding in <script type="application/json">.
 *  Only escapes sequences that would prematurely close the script tag. */
export function scriptSafeJson(json: string): string {
  return json.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
}

export function badge(text: string, tone: "ok" | "bad" | "mid" = "mid"): string {
  const cls = tone === "ok" ? "b-ok" : tone === "bad" ? "b-bad" : "b-mid";
  return `<span class="badge ${cls}">${escHtml(text)}</span>`;
}

export function riskBadge(level: "low" | "medium" | "high", copy: ReportCopy = getReportCopy()): string {
  if (level === "high") return badge(copy.riskHighOption.replace("Risk: ", "").replace("Risiko: ", "").replace("Risque : ", ""), "bad");
  if (level === "medium") return badge(copy.riskMediumOption.replace("Risk: ", "").replace("Risiko: ", "").replace("Risque : ", ""), "mid");
  return badge(copy.riskLowOption.replace("Risk: ", "").replace("Risiko: ", "").replace("Risque : ", ""), "ok");
}

export function pct(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "n/a";
  return `${(v * 100).toFixed(1)}%`;
}

export function executionQualityBadge(
  status: "healthy" | "degraded" | undefined,
  copy: ReportCopy = getReportCopy()
): string {
  if (status === "healthy") return badge(copy.executionHealthyBadge, "ok");
  if (status === "degraded") return badge(copy.executionDegradedBadge, "bad");
  return badge(copy.executionUnknownBadge, "mid");
}

export function gateBadge(g: "none" | "require_approval" | "block", copy: ReportCopy = getReportCopy()): string {
  if (g === "block") return badge(copy.gateBlockBadge, "bad");
  if (g === "require_approval") return badge(copy.gateApprovalBadge, "mid");
  return badge(copy.gateNoneBadge, "ok");
}

export function fmtFailureKinds(kinds: Record<string, number> | undefined): string {
  if (!kinds) return "none";
  const entries = Object.entries(kinds).filter((x) => Number.isFinite(x[1]) && x[1] > 0);
  if (entries.length === 0) return "none";
  return entries
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `${k}:${v}`)
    .join(" · ");
}

export function failureBadge(copy: ReportCopy = getReportCopy()): string {
  return badge(copy.runnerFailureBadge, "bad");
}

export function linkIfPresent(href: string | undefined, label: string): string {
  if (!href) return "";
  return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
}

export function linkIfPresentWithKey(href: string | undefined, key: string | undefined, label: string): string {
  if (key) {
    return `<a data-manifest-key="${escHtml(key)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
  }
  if (href) {
    return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
  }
  return "";
}

export function rulesCell(rules: string[]): string {
  const arr = Array.isArray(rules) ? rules : [];
  if (arr.length === 0) return `<span class="muted">—</span>`;
  return `<div class="wrapRules">${arr.map((r) => `<span class="rule">${escHtml(r)}</span>`).join("")}</div>`;
}

export function rootCell(root: string | undefined): string {
  if (!root) return `<span class="muted">—</span>`;
  return `<code>${escHtml(root)}</code>`;
}

export function traceSideBadge(side: TraceIntegritySide, copy: ReportCopy = getReportCopy()): string {
  if (side.status === "ok") return badge(copy.traceOkBadge, "ok");
  if (side.status === "partial") return badge(copy.tracePartialBadge, "mid");
  return badge(copy.traceBrokenBadge, "bad");
}

export function traceCell(t: TraceIntegrity, copy: ReportCopy = getReportCopy()): string {
  const b = t.baseline;
  const n = t.new;

  const bIssues = b.issues.length ? `<div class="muted" style="margin-top:6px;">${escHtml(b.issues.join(", "))}</div>` : "";
  const nIssues = n.issues.length ? `<div class="muted" style="margin-top:6px;">${escHtml(n.issues.join(", "))}</div>` : "";

  return `
<div>
  <div><span class="muted">${escHtml(copy.baselineSideLabel)}:</span> ${traceSideBadge(b, copy)}</div>
  ${bIssues}
  <div style="margin-top:6px;"><span class="muted">${escHtml(copy.newSideLabel)}:</span> ${traceSideBadge(n, copy)}</div>
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

export function securityCell(p: SecurityPack, copy: ReportCopy = getReportCopy()): string {
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
  <div><span class="muted">${escHtml(copy.baselineSideLabel)}:</span> ${badge(`${copy.securityPrefix}: ${bLabel}`, bTone as "ok" | "bad" | "mid")}</div>
  <div style="margin-top:6px;"><span class="muted">${escHtml(copy.newSideLabel)}:</span> ${badge(`${copy.securityPrefix}: ${nLabel}`, nTone as "ok" | "bad" | "mid")}</div>
  ${p.new.requires_gate_recommendation
      ? `<div class="muted" style="margin-top:6px;">${badge(copy.gateRecommendedBadge, "bad")}</div>`
      : ""
    }
</div>`.trim();
}
