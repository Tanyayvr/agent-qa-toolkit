import { TrendStore } from "./store";
import { renderTrendHtml } from "./renderTrendHtml";
import { validateReportForIngest } from "./validate";
import { parseDate, resolveDbPath } from "./cliHelpers";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CompareReport } from "./reportTypes";

const HELP = `Usage: agent-qa trend <command> [options]

Commands:
  case <case_id>        Trend for a specific case
  runs                  Run-level summary trend (incl. admissibility KPI fields when present)
  flaky                 Flakiest cases by pass_rate
  tokens                Token cost trend (agent-reported totals)
  ingest <path>         Manually ingest compare-report.json
  gc                    Delete runs older than --retention-days
  stats                 Database statistics
  html                  Generate offline trend.html

Global:
  --db <path>           SQLite path (env: AGENT_QA_TREND_DB)
                        Default: <project>/.agent-qa/trend.sqlite
  --last <N>            Last N runs (default: 30)
  --since YYYY-MM-DD    From date, local TZ 00:00
  --until YYYY-MM-DD    Until date, local TZ 23:59
  --format table|json   Output format (default: table)

Ingest:
  --run-meta <path>     Path to run.json (for git context)
  --force-reingest      Replace existing report_id

GC:
  --retention-days <N>  Days to keep (default: 90)
  --dry-run             Preview deletions
  --no-vacuum           Skip VACUUM

HTML:
  --out <dir>           Output directory (default: .)
  --last <N>            Max runs (default: 100, cap: 500)

Notes:
  Dates use local timezone. Token data is agent-reported totals.
  Admissibility KPI is taken from compare-report summary.execution_quality.admissibility_kpi.
  DB must be on local filesystem (not NFS/SMB).
`;

function getArg(flag: string, args: string[]): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(flag: string, args: string[]): boolean {
  return args.includes(flag);
}

function parseIntArg(flag: string, args: string[], def: number): number {
  const v = getArg(flag, args);
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${flag}: ${v}`);
  return n;
}

function formatTable(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "(no rows)";
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join("\t")];
  for (const r of rows) {
    lines.push(headers.map((h) => String(r[h] ?? "")).join("\t"));
  }
  return lines.join("\n");
}

export function runTrendCli(argv: string[]): void {
  const args = argv.slice(2);
  if (args.length === 0 || hasFlag("--help", args) || hasFlag("-h", args)) {
    console.log(HELP);
    return;
  }
  const cmd = args[0];
  const dbPath = resolveDbPath(getArg("--db", args));
  const format = getArg("--format", args) ?? "table";

  try {
    if (cmd === "ingest") {
      const file = args[1];
      if (!file) throw new Error("ingest requires a path to compare-report.json");
      const raw = readFileSync(file, "utf-8");
      const parsed = JSON.parse(raw) as CompareReport;
      const validation = validateReportForIngest(parsed);
      if (!validation.valid) {
        console.error("Error: compare-report.json validation failed:");
        for (const e of validation.errors) {
          console.error(`  • ${e.field}: ${e.message}`);
        }
        if (validation.warnings.length > 0) {
          console.error("Warnings:");
          for (const w of validation.warnings) console.error(`  ⚠ ${w}`);
        }
        process.exit(1);
      }

      let runMeta: Record<string, unknown> | undefined;
      const runMetaPath = getArg("--run-meta", args);
      if (runMetaPath) {
        try {
          runMeta = JSON.parse(readFileSync(runMetaPath, "utf-8")) as Record<string, unknown>;
        } catch {
          console.error(`Error: invalid --run-meta JSON: ${runMetaPath}`);
          process.exit(1);
        }
      }
      const store = TrendStore.open({ dbPath });
      const ingestOpts = {
        ingestMode: "manual" as const,
        replace: hasFlag("--force-reingest", args),
      } as { ingestMode: "manual"; replace: boolean; runMeta?: Record<string, unknown> };
      if (runMeta) ingestOpts.runMeta = runMeta;
      const res = store.ingest(parsed, ingestOpts);
      store.close();
      console.log(`Trend: ingested ${res.casesIngested} cases → ${dbPath}`);
      return;
    }

    const store = TrendStore.open({ dbPath, readOnly: cmd !== "gc" && cmd !== "ingest" });

    if (cmd === "case") {
      const caseId = args[1];
      if (!caseId) throw new Error("case requires <case_id>");
      const last = parseIntArg("--last", args, 30);
      const since = getArg("--since", args) ? parseDate(getArg("--since", args)!, false) : undefined;
      const until = getArg("--until", args) ? parseDate(getArg("--until", args)!, true) : undefined;
      const queryOpts = { last } as { last: number; since?: number; until?: number };
      if (since !== undefined) queryOpts.since = since;
      if (until !== undefined) queryOpts.until = until;
      const rows = store.queryCaseTrend(caseId, queryOpts);
      output(rows as unknown as Array<Record<string, unknown>>, format);
      store.close();
      return;
    }

    if (cmd === "runs") {
      const last = parseIntArg("--last", args, 30);
      const since = getArg("--since", args) ? parseDate(getArg("--since", args)!, false) : undefined;
      const until = getArg("--until", args) ? parseDate(getArg("--until", args)!, true) : undefined;
      const queryOpts = { last } as { last: number; since?: number; until?: number };
      if (since !== undefined) queryOpts.since = since;
      if (until !== undefined) queryOpts.until = until;
      const rows = store.queryRunTrend(queryOpts);
      output(rows as unknown as Array<Record<string, unknown>>, format);
      store.close();
      return;
    }

    if (cmd === "flaky") {
      const last = parseIntArg("--last", args, 30);
      const limit = parseIntArg("--limit", args, 10);
      const rows = store.queryFlakiestCases({ last, limit });
      output(rows as unknown as Array<Record<string, unknown>>, format);
      store.close();
      return;
    }

    if (cmd === "tokens") {
      const last = parseIntArg("--last", args, 30);
      const since = getArg("--since", args) ? parseDate(getArg("--since", args)!, false) : undefined;
      const until = getArg("--until", args) ? parseDate(getArg("--until", args)!, true) : undefined;
      const queryOpts = { last } as { last: number; since?: number; until?: number };
      if (since !== undefined) queryOpts.since = since;
      if (until !== undefined) queryOpts.until = until;
      const res = store.queryTokenTrend(queryOpts);
      output(res.rows as unknown as Array<Record<string, unknown>>, format);
      store.close();
      return;
    }

    if (cmd === "stats") {
      const stats = store.stats(dbPath);
      output([stats as unknown as Record<string, unknown>], format);
      store.close();
      return;
    }

    if (cmd === "gc") {
      const retentionDays = parseIntArg("--retention-days", args, 90);
      const dryRun = hasFlag("--dry-run", args);
      const noVacuum = hasFlag("--no-vacuum", args);
      if (dryRun) {
        console.log("Dry-run mode: no deletions performed.");
      }
      const res = dryRun ? { deletedRuns: 0, deletedCases: 0 } : store.applyRetention(retentionDays, { noVacuum });
      store.close();
      console.log(`Deleted runs: ${res.deletedRuns}, cases: ${res.deletedCases}`);
      return;
    }

    if (cmd === "html") {
      const outDir = getArg("--out", args) ?? ".";
      const last = parseIntArg("--last", args, 100);
      if (last > 500) throw new Error("--last cap is 500. Use --since/--until for windowed views.");
      const since = getArg("--since", args) ? parseDate(getArg("--since", args)!, false) : undefined;
      const until = getArg("--until", args) ? parseDate(getArg("--until", args)!, true) : undefined;
      const queryOpts = { last } as { last: number; since?: number; until?: number };
      if (since !== undefined) queryOpts.since = since;
      if (until !== undefined) queryOpts.until = until;
      const runRows = store.queryRunTrend(queryOpts);
      const tokenRes = store.queryTokenTrend(queryOpts);
      const note = last > 200 ? "Large dataset; HTML may be slow in browsers." : undefined;
      const outFile = join(outDir, "trend.html");
      const htmlOpts = {
        outFile,
        runRows,
        tokenRows: tokenRes.rows,
        tokenCoverage: tokenRes.coverage,
      } as {
        outFile: string;
        runRows: typeof runRows;
        tokenRows: typeof tokenRes.rows;
        tokenCoverage: typeof tokenRes.coverage;
        note?: string;
      };
      if (note) htmlOpts.note = note;
      renderTrendHtml(htmlOpts);
      store.close();
      console.log(`Wrote ${outFile}`);
      return;
    }

    store.close();
    throw new Error(`Unknown command: ${cmd}`);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "SQLITE_BUSY") {
      console.error("Error: database is locked. Another process may be writing. Retry or use a different --db path.");
      process.exit(1);
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exit(1);
  }
}

function output(rows: Array<Record<string, unknown>>, format: string): void {
  if (format === "json") {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(formatTable(rows));
  }
}

if (require.main === module) {
  runTrendCli(process.argv);
}
