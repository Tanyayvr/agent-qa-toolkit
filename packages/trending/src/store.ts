import Database from "better-sqlite3";
import { applyMigrations, verifySchemaVersion } from "./schema";
import { ingestReport, extractTotalCases } from "./ingest";
import { queryCaseTrend, queryFlaky, queryRunTrend, queryTokenTrend } from "./query";
import { applyRetention } from "./retention";
import type { CompareReport } from "./reportTypes";
import type { IngestResult, StoreStats } from "./types";
import type { IngestOptions } from "./ingest";

export interface TrendStoreOptions {
  dbPath: string;
  readOnly?: boolean;
}

export class TrendStore {
  private db: Database.Database;
  private stmtInsertRun: Database.Statement;
  private stmtInsertCase: Database.Statement;
  private stmtDeleteRun: Database.Statement;
  private stmtCountCases: Database.Statement;
  private stmtCountGarbage: Database.Statement;

  private constructor(db: Database.Database) {
    this.db = db;

    this.stmtInsertRun = this.db.prepare(
      `INSERT OR IGNORE INTO runs (
        report_id, run_id, ingest_mode, ingested_at, generated_at,
        toolkit_version, spec_version, agent_id, model, prompt_version, tools_version,
        git_commit, git_branch, git_dirty, total_cases, baseline_pass, new_pass,
        regressions, improvements, source_path,
        kpi_risk_mass_before, kpi_risk_mass_after, kpi_pre_action_entropy_removed,
        kpi_blocked_cases, kpi_recon_minutes_saved_total, kpi_recon_minutes_saved_per_block
      ) VALUES (
        @report_id, @run_id, @ingest_mode, @ingested_at, @generated_at,
        @toolkit_version, @spec_version, @agent_id, @model, @prompt_version, @tools_version,
        @git_commit, @git_branch, @git_dirty, @total_cases, @baseline_pass, @new_pass,
        @regressions, @improvements, @source_path,
        @kpi_risk_mass_before, @kpi_risk_mass_after, @kpi_pre_action_entropy_removed,
        @kpi_blocked_cases, @kpi_recon_minutes_saved_total, @kpi_recon_minutes_saved_per_block
      )`
    );

    this.stmtInsertCase = this.db.prepare(
      `INSERT INTO case_results (
        report_id, case_id, suite, case_status, baseline_pass, new_pass,
        risk_level, gate_recommendation, root_cause, input_tokens, output_tokens,
        total_tokens, tool_call_count, loop_detected, sec_low, sec_medium,
        sec_high, sec_critical, pass_rate, run_count, generated_at
      ) VALUES (
        @report_id, @case_id, @suite, @case_status, @baseline_pass, @new_pass,
        @risk_level, @gate_recommendation, @root_cause, @input_tokens, @output_tokens,
        @total_tokens, @tool_call_count, @loop_detected, @sec_low, @sec_medium,
        @sec_high, @sec_critical, @pass_rate, @run_count, @generated_at
      )`
    );

    this.stmtDeleteRun = this.db.prepare(`DELETE FROM runs WHERE report_id = ?`);
    this.stmtCountCases = this.db.prepare(`SELECT COUNT(*) AS c FROM case_results WHERE report_id = ?`);
    this.stmtCountGarbage = this.db.prepare(
      `SELECT COUNT(*) AS c FROM case_results
       WHERE report_id = ?
         AND (case_id IS NULL
           OR risk_level IS NULL
           OR gate_recommendation IS NULL
           OR case_status IS NULL
           OR generated_at IS NULL)`
    );
  }

  static open(opts: TrendStoreOptions): TrendStore {
    const { dbPath, readOnly } = opts;
    let db: Database.Database;
    try {
      db = new Database(dbPath, { readonly: readOnly ?? false });
    } catch (err) {
      throw new Error(
        `Cannot open trend DB: ${dbPath}\n` +
          `${err instanceof Error ? err.message : String(err)}\n` +
          `If corrupted, delete the file and re-ingest.`
      );
    }

    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    if (readOnly) {
      verifySchemaVersion(db);
    } else {
      applyMigrations(db);
    }

    return new TrendStore(db);
  }

  ingest(report: CompareReport, options?: IngestOptions): IngestResult {
    if ((options?.ingestMode ?? "auto") === "auto") {
      assertAutoIngestPrereqs(report);
    }

    const params = {
      db: this.db,
      report,
      stmtInsertRun: this.stmtInsertRun,
      stmtInsertCase: this.stmtInsertCase,
      stmtDeleteRun: this.stmtDeleteRun,
      stmtCountCases: this.stmtCountCases,
      stmtCountGarbage: this.stmtCountGarbage,
    } as Parameters<typeof ingestReport>[0];
    if (options) params.options = options;
    return ingestReport(params);
  }

  queryCaseTrend(caseId: string, opts = {} as Parameters<typeof queryCaseTrend>[2]) {
    return queryCaseTrend(this.db, caseId, opts);
  }

  queryRunTrend(opts = {} as Parameters<typeof queryRunTrend>[1]) {
    return queryRunTrend(this.db, opts);
  }

  queryFlakiestCases(opts = {} as Parameters<typeof queryFlaky>[1]) {
    return queryFlaky(this.db, opts);
  }

  queryTokenTrend(opts = {} as Parameters<typeof queryTokenTrend>[1]) {
    return queryTokenTrend(this.db, opts);
  }

  applyRetention(retentionDays: number, opts?: { noVacuum?: boolean }) {
    return applyRetention(this.db, retentionDays, opts);
  }

  stats(dbPath?: string): StoreStats {
    const size = this.db.pragma("page_count") as { page_count: number }[];
    const pageSize = this.db.pragma("page_size") as { page_size: number }[];
    const dbSizeBytes = (size[0]?.page_count ?? 0) * (pageSize[0]?.page_size ?? 0);

    const totalRuns = (this.db.prepare("SELECT COUNT(*) AS c FROM runs").get() as { c: number }).c;
    const totalCaseResults = (this.db
      .prepare("SELECT COUNT(*) AS c FROM case_results")
      .get() as { c: number }).c;
    const oldest = this.db
      .prepare("SELECT MIN(generated_at) AS v FROM runs")
      .get() as { v: number | null };
    const newest = this.db
      .prepare("SELECT MAX(generated_at) AS v FROM runs")
      .get() as { v: number | null };
    const schemaVersionRow = this.db
      .prepare("SELECT value FROM schema_meta WHERE key = 'version'")
      .get() as { value: string } | undefined;

    const ingestModeCounts = Object.fromEntries(
      (this.db.prepare("SELECT ingest_mode, COUNT(*) AS c FROM runs GROUP BY ingest_mode").all() as
        | Array<{ ingest_mode: string; c: number }>
        | []).map((r) => [r.ingest_mode, r.c])
    );

    const caseStatusCounts = Object.fromEntries(
      (this.db.prepare("SELECT case_status, COUNT(*) AS c FROM case_results GROUP BY case_status").all() as
        | Array<{ case_status: string; c: number }>
        | []).map((r) => [r.case_status, r.c])
    );

    const overall = this.db
      .prepare(
        `SELECT
           COUNT(*) AS executed_total,
           SUM(CASE WHEN new_pass=1 THEN 1 ELSE 0 END) AS pass_count
         FROM case_results
         WHERE case_status = 'executed'`
      )
      .get() as { executed_total: number; pass_count: number };

    const token = this.db
      .prepare(
        `SELECT
           COUNT(CASE WHEN total_tokens IS NOT NULL THEN 1 END) AS with_tokens,
           COUNT(*) AS total
         FROM case_results
         WHERE case_status = 'executed'`
      )
      .get() as { with_tokens: number; total: number };

    const overallPassRate = overall.executed_total
      ? Number((overall.pass_count / overall.executed_total).toFixed(3))
      : null;

    const tokenCoverage = {
      totalRows: token.total,
      nonNullRows: token.with_tokens,
      coveragePercent: token.total ? (token.with_tokens / token.total) * 100 : 0,
    };

    return {
      dbPath: dbPath ?? "",
      dbSizeBytes,
      totalRuns,
      totalCaseResults,
      oldestRunAt: oldest?.v ?? null,
      newestRunAt: newest?.v ?? null,
      schemaVersion: schemaVersionRow ? Number(schemaVersionRow.value) : 0,
      ingestModeCounts,
      caseStatusCounts,
      overallPassRate,
      tokenCoverage,
    };
  }

  close(): void {
    if (this.db.open) this.db.close();
  }
}

function assertAutoIngestPrereqs(report: CompareReport): void {
  const summary = report.summary as Record<string, unknown>;
  const dc = summary.data_coverage as Record<string, unknown> | undefined;
  if (!dc || typeof dc.total_cases !== "number") {
    throw new Error("Auto-ingest: summary.data_coverage.total_cases missing.");
  }
  for (const f of ["baseline_pass", "new_pass", "regressions", "improvements"] as const) {
    if (typeof summary[f] !== "number") {
      throw new Error(`Auto-ingest: summary.${f} not a number.`);
    }
  }
  if (extractTotalCases(report) <= 0) {
    throw new Error("Auto-ingest: total_cases must be > 0.");
  }
}
