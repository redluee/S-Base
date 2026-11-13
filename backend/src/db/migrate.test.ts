import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { untrackedLegacyDatabase } from "./legacy-fixture";
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
    const sqlite = await untrackedLegacyDatabase();
    const usersBefore = sqlite.query("SELECT * FROM users").all();

    const result = await runMigrations(sqlite);
    expect(result.baselined).toBeGreaterThan(0);
    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.applied.every((file) => file > LEGACY_BASELINE_END)).toBe(true);
    expect(recorded(sqlite)).toHaveLength(result.total);
    expect(sqlite.query("SELECT * FROM users").all()).toEqual(usersBefore);
    sqlite.close();
  });
});
