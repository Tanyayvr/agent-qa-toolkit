import type Database from "better-sqlite3";

export type Migration = { version: number; up: string };

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  report_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ingest_mode TEXT NOT NULL DEFAULT 'auto',
  ingested_at INTEGER NOT NULL,
  generated_at INTEGER NOT NULL,
  toolkit_version TEXT NOT NULL,
  spec_version TEXT NOT NULL,
  agent_id TEXT,
  model TEXT,
  prompt_version TEXT,
  tools_version TEXT,
  git_commit TEXT,
  git_branch TEXT,
  git_dirty INTEGER,
  total_cases INTEGER NOT NULL,
  baseline_pass INTEGER NOT NULL,
  new_pass INTEGER NOT NULL,
  regressions INTEGER NOT NULL,
  improvements INTEGER NOT NULL,
  source_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_generated ON runs (generated_at);
CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs (agent_id, model);
CREATE TABLE IF NOT EXISTS case_results (
  report_id TEXT NOT NULL REFERENCES runs(report_id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  suite TEXT,
  case_status TEXT NOT NULL DEFAULT 'executed',
  baseline_pass INTEGER,
  new_pass INTEGER,
  risk_level TEXT NOT NULL,
  gate_recommendation TEXT NOT NULL,
  root_cause TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  tool_call_count INTEGER,
  loop_detected INTEGER,
  sec_low INTEGER NOT NULL DEFAULT 0,
  sec_medium INTEGER NOT NULL DEFAULT 0,
  sec_high INTEGER NOT NULL DEFAULT 0,
  sec_critical INTEGER NOT NULL DEFAULT 0,
  pass_rate REAL,
  run_count INTEGER,
  generated_at INTEGER NOT NULL,
  PRIMARY KEY (report_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_cr_case_time ON case_results (case_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_cr_suite_time ON case_results (suite, generated_at);
CREATE INDEX IF NOT EXISTS idx_cr_gate ON case_results (gate_recommendation, generated_at);
`;

const SCHEMA_V2 = `
ALTER TABLE runs ADD COLUMN kpi_risk_mass_before REAL;
ALTER TABLE runs ADD COLUMN kpi_risk_mass_after REAL;
ALTER TABLE runs ADD COLUMN kpi_pre_action_entropy_removed REAL;
ALTER TABLE runs ADD COLUMN kpi_blocked_cases INTEGER;
ALTER TABLE runs ADD COLUMN kpi_recon_minutes_saved_total REAL;
ALTER TABLE runs ADD COLUMN kpi_recon_minutes_saved_per_block REAL;
`;

export const MIGRATIONS: Migration[] = [
  { version: 1, up: SCHEMA_V1 },
  { version: 2, up: SCHEMA_V2 },
];

export function applyMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = db.prepare("SELECT value FROM schema_meta WHERE key = 'version'").get() as
    | { value: string }
    | undefined;
  let current = row ? Number(row.value) : 0;
  const latest = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

  if (current > latest) {
    throw new Error(
      `Trend DB schema v${current} is newer than supported v${latest}. ` +
        `Upgrade agent-qa-toolkit or use a different --trend-db.`
    );
  }

  if (current === 0) {
    const hasRuns = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='runs'")
      .get();
    if (hasRuns) {
      current = 1;
      db.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '1')").run();
    }
  }

  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.transaction(() => {
        db.exec(m.up);
        db.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)").run(
          String(m.version)
        );
      })();
    }
  }
}

export function verifySchemaVersion(db: Database.Database): void {
  const hasMeta = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_meta'")
    .get();
  if (!hasMeta) {
    throw new Error("Trend DB has no schema. Run a write operation first.");
  }
  const row = db.prepare("SELECT value FROM schema_meta WHERE key = 'version'").get() as
    | { value: string }
    | undefined;
  const current = row ? Number(row.value) : 0;
  const latest = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
  if (current > latest) {
    throw new Error(`Trend DB schema v${current} > supported v${latest}. Upgrade the toolkit.`);
  }
  if (current < latest) {
    throw new Error(
      `Trend DB schema v${current} < required v${latest}. ` +
        `Run a write operation to trigger migration.`
    );
  }
}
