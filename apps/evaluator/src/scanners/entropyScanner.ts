import type { AgentResponse } from "shared-types";
import type { SecuritySignal } from "../htmlReport";
import type { SecurityScanner } from "../securityScanner";

type EntropyScannerOptions = {
  maxSignals: number;
  maxTextBytes: number;
  minTokenLength: number;
  minEntropy: number;
};

const DEFAULTS: EntropyScannerOptions = {
  maxSignals: 3,
  maxTextBytes: 200_000,
  minTokenLength: 24,
  minEntropy: 3.5,
};

function shannonEntropy(s: string): number {
  if (!s.length) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let ent = 0;
  for (const n of Object.values(freq)) {
    const p = n / s.length;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function maskToken(token: string): string {
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function collectText(resp: AgentResponse, maxBytes: number): string {
  let text = "";
  if (resp.final_output?.content_type === "text") {
    text = String(resp.final_output.content ?? "");
  } else if (resp.final_output?.content_type === "json") {
    try {
      text = JSON.stringify(resp.final_output.content ?? {});
    } catch {
      text = "";
    }
  }
  if (!text) {
    try {
      text = JSON.stringify(resp);
    } catch {
      text = "";
    }
  }
  if (text.length > maxBytes) {
    return text.slice(0, maxBytes);
  }
  return text;
}

function extractCandidates(text: string, minLen: number): string[] {
  const out: string[] = [];
  const re = /[A-Za-z0-9_\\-]{10,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tok = m[0];
    if (tok.length >= minLen) out.push(tok);
  }
  return out;
}

function keyPatternSignals(text: string): SecuritySignal[] {
  const patterns: Array<{ kind: SecuritySignal["kind"]; re: RegExp; label: string }> = [
    { kind: "token_exfil_indicator", re: /AKIA[0-9A-Z]{16}/g, label: "aws_access_key" },
    { kind: "token_exfil_indicator", re: /ASIA[0-9A-Z]{16}/g, label: "aws_session_key" },
    { kind: "token_exfil_indicator", re: /AIza[0-9A-Za-z_-]{35}/g, label: "gcp_api_key" },
    { kind: "token_exfil_indicator", re: /sk-[A-Za-z0-9]{20,}/g, label: "api_key_like" },
    { kind: "token_exfil_indicator", re: /ghp_[A-Za-z0-9]{36}/g, label: "github_pat" },
    { kind: "token_exfil_indicator", re: /xoxb-[0-9A-Za-z-]{20,}/g, label: "slack_bot_token" },
  ];
  const out: SecuritySignal[] = [];
  for (const p of patterns) {
    const hit = p.re.exec(text);
    if (!hit) continue;
    out.push({
      kind: p.kind,
      severity: "high",
      confidence: "medium",
      title: "Key pattern detected",
      message: `Key pattern detected: ${p.label}`,
      evidence_refs: [],
      details: { sample: maskToken(hit[0]), pattern: p.label },
    });
  }
  return out;
}

export function createEntropyScanner(opts?: Partial<EntropyScannerOptions>): SecurityScanner {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  return {
    name: "entropy_scanner",
    scan: (resp: AgentResponse): SecuritySignal[] => {
      const text = collectText(resp, cfg.maxTextBytes);
      if (!text) return [];
      const out: SecuritySignal[] = [];
      out.push(...keyPatternSignals(text));

      const candidates = extractCandidates(text, cfg.minTokenLength);
      for (const tok of candidates) {
        if (out.length >= cfg.maxSignals) break;
        const ent = shannonEntropy(tok);
        if (ent >= cfg.minEntropy) {
          out.push({
            kind: "token_exfil_indicator",
            severity: "medium",
            confidence: "low",
            title: "High-entropy token-like string detected",
            message: "High-entropy token-like string detected",
            evidence_refs: [],
            details: { sample: maskToken(tok), entropy: Number(ent.toFixed(2)), length: tok.length },
          });
        }
      }
      return out;
    },
  };
}
