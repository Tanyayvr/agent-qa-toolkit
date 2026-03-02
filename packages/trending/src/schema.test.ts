import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { applyMigrations, verifySchemaVersion } from "./schema";

describe("trending schema", () => {
  const dbs: Database.Database[] = [];

  afterEach(() => {
    for (const db of dbs) {
      if (db.open) db.close();
    }
    dbs.length = 0;
  });

  it("applies migrations to empty db and verifies version", () => {
    const db = new Database(":memory:");
    dbs.push(db);

    applyMigrations(db);
    expect(() => verifySchemaVersion(db)).not.toThrow();
  });

  it("fails verification when schema_meta is missing", () => {
    const db = new Database(":memory:");
    dbs.push(db);
    expect(() => verifySchemaVersion(db)).toThrow("no schema");
  });

  it("fails when db version is newer than supported", () => {
    const db = new Database(":memory:");
    dbs.push(db);
    db.exec("CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.prepare("INSERT INTO schema_meta (key, value) VALUES ('version', '999')").run();
    expect(() => applyMigrations(db)).toThrow("newer than supported");
  });

  it("fails verification when version is lower than required", () => {
    const db = new Database(":memory:");
    dbs.push(db);
    db.exec("CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.prepare("INSERT INTO schema_meta (key, value) VALUES ('version', '0')").run();
    expect(() => verifySchemaVersion(db)).toThrow("required");
  });
});
