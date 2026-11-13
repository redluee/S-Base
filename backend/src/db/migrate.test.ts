import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { LEGACY_BASELINE_END, runMigrations } from "./migrate";

const recorded = (sqlite: Database) =>
  sqlite
    .query<{ name: string }, []>("SELECT name FROM _migrations ORDER BY name")
    .all()
    .map((r) => r.name);

describe("runMigrations", () => {
  it("applies every migration once on a fresh database and nothing on a second run", async () => {
    const sqlite = new Database(":memory:");
    const first = await runMigrations(sqlite);
    expect(first.applied.length + first.skipped.length).toBe(first.total);
    expect(recorded(sqlite)).toHaveLength(first.total);
    expect((await runMigrations(sqlite)).applied).toEqual([]);
    sqlite.close();
  });

  it("baselines an untracked legacy database and applies only newer migrations", async () => {
    const sqlite = new Database(":memory:");
    sqlite.run("CREATE TABLE users (user_id INTEGER PRIMARY KEY, username TEXT);");
    sqlite.run(
      "CREATE TABLE modules (module_id INTEGER PRIMARY KEY, module_name TEXT UNIQUE, module_alias TEXT, description TEXT);",
    );
    sqlite.run("INSERT INTO users (username) VALUES ('admin');");

    const result = await runMigrations(sqlite);
    expect(result.baselined).toBeGreaterThan(0);
    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.applied.every((file) => file > LEGACY_BASELINE_END)).toBe(true);
    expect(recorded(sqlite)).toHaveLength(result.total);
    expect(sqlite.query("SELECT username FROM users").all()).toEqual([{ username: "admin" }]);
    sqlite.close();
  });
});
