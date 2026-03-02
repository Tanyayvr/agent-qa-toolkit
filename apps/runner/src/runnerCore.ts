import { execFile } from "node:child_process";
import type { TokenUsage, RunEvent } from "shared-types";
import { analyzeLoops } from "./loopDetection";
import type { GitContext, RunnerConfig } from "./runnerTypes";

function execCmd(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: 3000 }, (err, stdout) => {
      resolve(err ? "" : stdout.trim());
    });
  });
}

export async function captureGitContext(repoRoot: string): Promise<GitContext> {
  const [commit, branch, dirty] = await Promise.all([
    execCmd("git", ["rev-parse", "--short", "HEAD"], repoRoot),
    execCmd("git", ["rev-parse", "--abbrev-ref", "HEAD"], repoRoot),
    execCmd("git", ["status", "--porcelain"], repoRoot),
  ]);
  const ctx: GitContext = {};
  if (commit) ctx.git_commit = commit;
  if (branch) ctx.git_branch = branch;
  if (commit || branch || dirty !== "") ctx.git_dirty = dirty.length > 0;
  return ctx;
}

export function aggregateTokenUsage(usages: (TokenUsage | undefined)[]): TokenUsage | undefined {
  const valid = usages.filter((u): u is TokenUsage => u !== undefined);
  if (valid.length === 0) return undefined;
  const result: TokenUsage = {};
  let hasInput = false, hasOutput = false, hasTotal = false, hasTools = false;
  for (const u of valid) {
    if (typeof u.input_tokens === "number") { result.input_tokens = (result.input_tokens ?? 0) + u.input_tokens; hasInput = true; }
    if (typeof u.output_tokens === "number") { result.output_tokens = (result.output_tokens ?? 0) + u.output_tokens; hasOutput = true; }
    if (typeof u.total_tokens === "number") { result.total_tokens = (result.total_tokens ?? 0) + u.total_tokens; hasTotal = true; }
    if (typeof u.tool_call_count === "number") { result.tool_call_count = (result.tool_call_count ?? 0) + u.tool_call_count; hasTools = true; }
    if (u.loop_detected === true) result.loop_detected = true;
  }
  if (!hasInput) delete result.input_tokens;
  if (!hasOutput) delete result.output_tokens;
  if (!hasTotal) delete result.total_tokens;
  if (!hasTools) delete result.tool_call_count;
  return result;
}

export function enrichResponseWithLoopAnalysis(resp: unknown): void {
  if (!resp || typeof resp !== "object") return;
  const r = resp as { events?: RunEvent[]; token_usage?: TokenUsage };
  if (!r.events || r.events.length === 0) return;

  const { loop_detected, loop_details } = analyzeLoops(r.events);
  if (!loop_detected) return;

  if (!r.token_usage) r.token_usage = {};
  if (r.token_usage.loop_detected !== true) {
    r.token_usage.loop_detected = true;
  }
  if (loop_details) r.token_usage.loop_details = loop_details;
}

export function parseOnlyCaseIdsRaw(raw: string | null): string[] | null {
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return ids.length ? ids : null;
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function formatDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export function estimateWorstCaseRuntimeMs(cfg: RunnerConfig, selectedCases: number): number {
  const attemptsPerRequest = Math.max(1, cfg.retries + 1);
  const requestsTotal = selectedCases * 2 * Math.max(1, cfg.runs);
  const retriesCount = Math.max(0, cfg.retries);
  let backoffPerRequestMs = 0;
  for (let attempt = 1; attempt <= retriesCount; attempt++) {
    const exp = Math.min(6, Math.max(0, attempt - 1));
    backoffPerRequestMs += cfg.backoffBaseMs * Math.pow(2, exp);
  }
  const perRequestMs = attemptsPerRequest * cfg.timeoutMs + backoffPerRequestMs;
  const effectiveConcurrency = Math.max(1, cfg.concurrency);
  return Math.ceil((requestsTotal * perRequestMs) / effectiveConcurrency);
}
