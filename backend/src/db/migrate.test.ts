import { describe, it, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "./migrate";

describe("Database Migration Runner", () => {
  it("runs migrations on a fresh database and records them in _migrations", async () => {
    const memDb = new Database(":memory:");

    const result1 = await runMigrations(memDb);
    expect(result1.applied).toBeGreaterThan(0);

    const rows = memDb.query<{ name: string }, []>("SELECT name FROM _migrations").all();
    expect(rows.length).toBe(result1.total);

    // Running again should apply 0 migrations
    const result2 = await runMigrations(memDb);
    expect(result2.applied).toBe(0);

    memDb.close();
  });

  it("handles legacy databases by registering existing migrations without resetting permissions", async () => {
    const memDb = new Database(":memory:");

    // Run first migration cycle
    await runMigrations(memDb);

    // Simulate creating a user and revoking cashflow permission
    const user = memDb.query<{ user_id: number }, []>(
      "INSERT INTO users (username, pswd_hash) VALUES ('tester', 'hash') RETURNING user_id"
    ).get();

    // Verify cashflow module exists
    const cashflowMod = memDb.query<{ module_id: number }, []>(
      "SELECT module_id FROM modules WHERE module_name = 'cashflow'"
    ).get();
    expect(cashflowMod).toBeDefined();

    // Ensure no permissions exist for tester
    const permsBefore = memDb.query(
      "SELECT * FROM usermodulepermissions WHERE user_id = ?",
      [user!.user_id]
    ).all();
    expect(permsBefore.length).toBe(0);

    // Simulate updating app and running migrations again
    await runMigrations(memDb);

    // Permission must NOT be re-inserted
    const permsAfter = memDb.query(
      "SELECT * FROM usermodulepermissions WHERE user_id = ?",
      [user!.user_id]
    ).all();
    expect(permsAfter.length).toBe(0);

    memDb.close();
  });

  it("registers legacy database when _migrations table did not exist yet", async () => {
    const memDb = new Database(":memory:");

    // Setup dummy legacy db with users table
    memDb.run("CREATE TABLE users (user_id INTEGER PRIMARY KEY, username TEXT);");
    memDb.run("INSERT INTO users (username) VALUES ('admin');");

    const result = await runMigrations(memDb);
    expect(result.applied).toBe(0);

    const rows = memDb.query<{ name: string }, []>("SELECT name FROM _migrations").all();
    expect(rows.length).toBeGreaterThan(0);

    memDb.close();
  });
});
