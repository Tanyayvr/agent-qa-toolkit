import type Database from "better-sqlite3";

export function applyRetention(
  db: Database.Database,
  retentionDays: number,
  opts?: { noVacuum?: boolean }
): { deletedRuns: number; deletedCases: number } {
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const result = db.transaction(() => {
    const cases = (db
      .prepare("SELECT COUNT(*) AS c FROM case_results WHERE generated_at < ?")
      .get(cutoff) as { c: number }).c;
    const runs = db.prepare("DELETE FROM runs WHERE generated_at < ?").run(cutoff).changes;
    return { deletedRuns: runs, deletedCases: cases };
  })();

  if (result.deletedRuns > 0) {
    db.exec("ANALYZE");
    if (!opts?.noVacuum) {
      const free = (db.pragma("freelist_count") as { freelist_count: number }[])[0]?.freelist_count ?? 0;
      const total = (db.pragma("page_count") as { page_count: number }[])[0]?.page_count ?? 1;
      if (total > 0 && free / total > 0.2) {
        db.exec("VACUUM");
      }
    }
  }
  return result;
}
