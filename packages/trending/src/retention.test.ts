import { describe, expect, it } from "vitest";
import { applyRetention } from "./retention";

class FakeDb {
  public caseCount = 0;
  public deletedRuns = 0;
  public freelist = 0;
  public pageCount = 1;
  public execCalls: string[] = [];

  transaction<T>(fn: () => T): () => T {
    return () => fn();
  }

  prepare(sql: string): { get: (_cutoff: number) => { c: number }; run: (_cutoff: number) => { changes: number } } {
    if (sql.includes("SELECT COUNT(*) AS c")) {
      return {
        get: () => ({ c: this.caseCount }),
        run: () => ({ changes: 0 }),
      };
    }
    if (sql.includes("DELETE FROM runs")) {
      return {
        get: () => ({ c: 0 }),
        run: () => ({ changes: this.deletedRuns }),
      };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  }

  pragma(name: string): Array<{ freelist_count?: number; page_count?: number }> {
    if (name === "freelist_count") return [{ freelist_count: this.freelist }];
    if (name === "page_count") return [{ page_count: this.pageCount }];
    return [{}];
  }

  exec(sql: string): void {
    this.execCalls.push(sql);
  }
}

describe("trending retention", () => {
  it("returns deleted counters from transaction", () => {
    const db = new FakeDb();
    db.caseCount = 7;
    db.deletedRuns = 3;

    const out = applyRetention(db as never, 30);
    expect(out).toEqual({ deletedRuns: 3, deletedCases: 7 });
  });

  it("runs ANALYZE and VACUUM when free ratio is high", () => {
    const db = new FakeDb();
    db.caseCount = 1;
    db.deletedRuns = 2;
    db.freelist = 30;
    db.pageCount = 100;

    applyRetention(db as never, 7);
    expect(db.execCalls).toContain("ANALYZE");
    expect(db.execCalls).toContain("VACUUM");
  });

  it("skips VACUUM when noVacuum option is set", () => {
    const db = new FakeDb();
    db.caseCount = 1;
    db.deletedRuns = 2;
    db.freelist = 30;
    db.pageCount = 100;

    applyRetention(db as never, 7, { noVacuum: true });
    expect(db.execCalls).toContain("ANALYZE");
    expect(db.execCalls).not.toContain("VACUUM");
  });
});
