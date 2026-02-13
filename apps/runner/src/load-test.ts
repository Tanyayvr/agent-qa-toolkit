// apps/runner/src/load-test.ts
//
// Load test for /run-case endpoint with per-version stats and CSV/JSON outputs.
//
// Usage:
//   ts-node src/load-test.ts --baseUrl http://localhost:8787 --cases cases/cases.json --concurrency 8 --iterations 50
//   ts-node src/load-test.ts --outJson /tmp/load.json --outCsv /tmp/load.csv
//   ts-node src/load-test.ts --allowFail fetch_http_500_001,fetch_timeout_001,fetch_network_drop_001
//
// Notes:
// - Does not mutate anything, only POSTs to /run-case.
// - If demo-agent is not running, all calls will fail.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Version = "baseline" | "new";

type CaseFileItem = {
  id: string;
  title: string;
  input: { user: string; context?: unknown };
};

type RunCaseRequest = {
  case_id: string;
  version: Version;
  input: { user: string; context?: unknown };
};

type RunResult = {
  ok: boolean;
  ms: number;
  version: Version;
  case_id: string;
  error?: string;
};

type Stats = {
  ok: number;
  expected_fail: number;
  real_fail: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
};

function getArg(name: string, def?: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : def;
}

function parseCases(raw: string): CaseFileItem[] {
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("cases.json must be an array");
  return arr.map((c) => ({
    id: String(c.id),
    title: String(c.title ?? ""),
    input: { user: String(c.input?.user ?? ""), context: c.input?.context },
  }));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function worker(queue: Array<() => Promise<RunResult>>, results: RunResult[]): Promise<void> {
  for (; ;) {
    const job = queue.shift();
    if (!job) return;
    const res = await job();
    results.push(res);
  }
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx] ?? 0;
}

function computeStats(results: RunResult[], allowFailSet: Set<string>): Stats {
  const ok = results.filter((r) => r.ok).map((r) => r.ms);
  const failed = results.filter((r) => !r.ok);
  const expectedFail = failed.filter((r) => allowFailSet.has(r.case_id)).length;
  const realFail = failed.length - expectedFail;
  return {
    ok: ok.length,
    expected_fail: expectedFail,
    real_fail: realFail,
    avgMs: ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : 0,
    p95Ms: percentile(ok, 95),
    p99Ms: percentile(ok, 99),
  };
}

async function main() {
  const baseUrl = (getArg("--baseUrl", "http://localhost:8787") ?? "").replace(/\/$/, "");
  const casesPath = getArg("--cases", "cases/cases.json")!;
  const concurrency = Number(getArg("--concurrency", "4"));
  const iterations = Number(getArg("--iterations", "20"));
  const timeoutMs = Number(getArg("--timeoutMs", "15000"));
  const outJson = getArg("--outJson");
  const outCsv = getArg("--outCsv");
  const allowFailRaw = getArg("--allowFail", "") ?? "";
  const allowFailSet = new Set(allowFailRaw.split(",").map((s) => s.trim()).filter(Boolean));

  const raw = await readFile(path.resolve(casesPath), "utf-8");
  const cases = parseCases(raw);

  const queue: Array<() => Promise<RunResult>> = [];
  for (let i = 0; i < iterations; i++) {
    for (const c of cases) {
      for (const version of ["baseline", "new"] as const) {
        queue.push(async () => {
          const reqBody: RunCaseRequest = {
            case_id: c.id,
            version,
            input: c.input,
          };
          const started = Date.now();
          try {
            const res = await fetchWithTimeout(
              `${baseUrl}/run-case`,
              { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) },
              timeoutMs
            );
            const ms = Date.now() - started;
            if (!res.ok) {
              return { ok: false, ms, version, case_id: c.id, error: `HTTP ${res.status}` };
            }
            await res.text().catch(() => null);
            return { ok: true, ms, version, case_id: c.id };
          } catch (e) {
            const ms = Date.now() - started;
            return { ok: false, ms, version, case_id: c.id, error: e instanceof Error ? e.name : "error" };
          }
        });
      }
    }
  }

  const results: RunResult[] = [];
  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker(queue, results));
  await Promise.all(workers);

  const statsAll = computeStats(results, allowFailSet);
  const statsBaseline = computeStats(results.filter((r) => r.version === "baseline"), allowFailSet);
  const statsNew = computeStats(results.filter((r) => r.version === "new"), allowFailSet);

  const summary = {
    baseUrl,
    cases: cases.length,
    iterations,
    concurrency,
    timeoutMs,
    allowFail: [...allowFailSet],
    stats: { all: statsAll, baseline: statsBaseline, new: statsNew },
  };

  console.log("Load test summary:", summary);
  if (statsAll.real_fail > 0) {
    console.error(`FAIL: ${statsAll.real_fail} unexpected failure(s) detected.`);
  }

  if (outJson) {
    await writeFile(outJson, JSON.stringify({ summary, results }, null, 2), "utf-8");
    console.log("Wrote JSON:", outJson);
  }
  if (outCsv) {
    const header = "case_id,version,ok,expected_fail,ms,error\n";
    const rows = results
      .map((r) => {
        const ef = !r.ok && allowFailSet.has(r.case_id) ? "1" : "0";
        return `${r.case_id},${r.version},${r.ok ? "1" : "0"},${ef},${r.ms},${r.error ?? ""}`;
      })
      .join("\n");
    await writeFile(outCsv, header + rows + "\n", "utf-8");
    console.log("Wrote CSV:", outCsv);
  }

  if (statsAll.real_fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
