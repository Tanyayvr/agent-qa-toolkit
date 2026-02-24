import type { AgentResponse } from "shared-types";
import type { SecuritySignal } from "../htmlReport";
import type { SecurityScanner } from "../securityScanner";

export type InjectionPattern = { regex: RegExp; label: string };

type PromptInjectionScannerOptions = {
  injectionPatterns: InjectionPattern[];
  maxTextBytes: number;
  maxSignals: number;
};

const DEFAULT_PATTERNS: InjectionPattern[] = [
  { regex: /ignore previous/i, label: "ignore_previous" },
  { regex: /disregard all/i, label: "disregard_all" },
  { regex: /you are now/i, label: "you_are_now" },
  { regex: /^system:/im, label: "system_prompt" },
  { regex: /<\|im_start\|>/i, label: "im_start" },
  { regex: /\[INST\]/i, label: "inst_marker" },
  { regex: /###\s*Instruction/i, label: "instruction_block" },
  { regex: /ADMIN_OVERRIDE/i, label: "admin_override" },
];

const DEFAULTS: PromptInjectionScannerOptions = {
  injectionPatterns: DEFAULT_PATTERNS,
  maxTextBytes: 500_000,
  maxSignals: 10,
};

function collectTextFromOutput(resp: AgentResponse, maxBytes: number): string {
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
  if (text.length > maxBytes) text = text.slice(0, maxBytes);
  return text;
}

function collectToolPayloads(resp: AgentResponse, maxBytes: number): string[] {
  const out: string[] = [];
  const ev = Array.isArray(resp.events) ? resp.events : [];
  for (const e of ev) {
    if (e.type === "tool_result") {
      if (typeof e.payload_summary === "string") out.push(e.payload_summary);
      else if (e.payload_summary && typeof e.payload_summary === "object") {
        try {
          out.push(JSON.stringify(e.payload_summary));
        } catch {
          // ignore
        }
      }
    }
  }
  return out.map((t) => (t.length > maxBytes ? t.slice(0, maxBytes) : t));
}

function findMatches(text: string, patterns: InjectionPattern[]): { labels: string[]; count: number } {
  let count = 0;
  const labels: string[] = [];
  for (const p of patterns) {
    const hit = p.regex.exec(text);
    if (hit) {
      labels.push(p.label);
      count++;
    }
  }
  return { labels, count };
}

export function createPromptInjectionScanner(opts?: Partial<PromptInjectionScannerOptions>): SecurityScanner {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  return {
    name: "prompt_injection_scanner",
    scan: (resp: AgentResponse): SecuritySignal[] => {
      const out: SecuritySignal[] = [];

      const outputText = collectTextFromOutput(resp, cfg.maxTextBytes);
      if (outputText) {
        const m = findMatches(outputText, cfg.injectionPatterns);
        if (m.count > 0 && out.length < cfg.maxSignals) {
          out.push({
            kind: "prompt_injection_marker",
            severity: "high",
            confidence: m.count > 1 ? "medium" : "low",
            title: "Prompt-injection marker detected in output",
            message: m.labels.join(", "),
            evidence_refs: [],
            details: { notes: outputText.slice(0, 200) },
          });
        }
      }

      const payloads = collectToolPayloads(resp, cfg.maxTextBytes);
      for (const p of payloads) {
        if (out.length >= cfg.maxSignals) break;
        const m = findMatches(p, cfg.injectionPatterns);
        if (m.count > 0) {
          out.push({
            kind: "context_poisoning",
            severity: "critical",
            confidence: m.count > 1 ? "medium" : "low",
            title: "Prompt-injection markers detected in tool payload",
            message: m.labels.join(", "),
            evidence_refs: [],
            details: { notes: p.slice(0, 200) },
          });
        }
      }

      return out;
    },
  };
}
