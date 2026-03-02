import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function percentile(values: number[], q: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1));
  return sorted[pos];
}

export function summarizeHistoryCandidate(successLatencies: number[], failureLatencies: number[]): number | undefined {
  const p95Success = percentile(successLatencies, 0.95);
  if (typeof p95Success === "number") {
    // Keep headroom for model variance + command execution jitter.
    return Math.ceil(p95Success * 1.4 + 30_000);
  }

  const p95Failure = percentile(failureLatencies, 0.95);
  if (typeof p95Failure === "number") {
    // Fall back to failed-attempt latencies when no successful samples exist yet.
    return Math.ceil(p95Failure * 1.25 + 30_000);
  }

  return undefined;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesCaseFile(fileName: string, caseId: string): boolean {
  const pattern = new RegExp(`^${escapeRegExp(caseId)}(?:\\.run\\d+)?\\.json$`);
  return pattern.test(fileName);
}

async function listRecentRunDirs(dir: string, limit: number, excludeRunId?: string): Promise<string[]> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return [];
  }
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => name.length > 0 && name !== (excludeRunId ?? ""));

  const stats = await Promise.all(
    dirs.map(async (name) => {
      const abs = path.join(dir, name);
      try {
        const st = await stat(abs);
        return { abs, mtimeMs: st.mtimeMs };
      } catch {
        return { abs, mtimeMs: 0 };
      }
    })
  );

  return stats
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, Math.max(0, limit))
    .map((x) => x.abs);
}

export type TimeoutHistorySamples = {
  successLatenciesMs: number[];
  failureLatenciesMs: number[];
};

export async function collectTimeoutHistorySamples(
  outDir: string,
  selectedCaseIds: string[],
  lookbackRuns: number,
  currentRunId: string
): Promise<TimeoutHistorySamples> {
  const successLatenciesMs: number[] = [];
  const failureLatenciesMs: number[] = [];
  const selectedSet = new Set(selectedCaseIds);
  const runRoots = [path.join(outDir, "baseline"), path.join(outDir, "new")];

  for (const root of runRoots) {
    const recentRunDirs = await listRecentRunDirs(root, lookbackRuns, currentRunId);
    for (const runDir of recentRunDirs) {
      let files: string[];
      try {
        files = await readdir(runDir, { encoding: "utf8" });
      } catch {
        continue;
      }

      for (const caseId of selectedSet) {
        const matched = files.filter((f) => matchesCaseFile(f, caseId));
        for (const name of matched) {
          const abs = path.join(runDir, name);
          let parsed: unknown;
          try {
            parsed = JSON.parse(await readFile(abs, "utf-8")) as unknown;
          } catch {
            continue;
          }
          if (!isRecord(parsed)) continue;

          const runnerFailure = parsed.runner_failure;
          if (isRecord(runnerFailure) && typeof runnerFailure.latency_ms === "number" && Number.isFinite(runnerFailure.latency_ms)) {
            failureLatenciesMs.push(Math.max(1, Math.floor(runnerFailure.latency_ms)));
            continue;
          }

          const runnerTransport = parsed.runner_transport;
          if (isRecord(runnerTransport) && typeof runnerTransport.latency_ms === "number" && Number.isFinite(runnerTransport.latency_ms)) {
            successLatenciesMs.push(Math.max(1, Math.floor(runnerTransport.latency_ms)));
          }
        }
      }
    }
  }

  return { successLatenciesMs, failureLatenciesMs };
}
