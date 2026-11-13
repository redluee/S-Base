import { Database } from "bun:sqlite";
import { join } from "path";
import { readdir } from "fs/promises";
import { DB_PATH } from "./paths";

export const LEGACY_BASELINE_END = "0040_add_set_edited_fields.sql";
const MIGRATIONS_DIR = join(import.meta.dir, "../..", "migrations");

function errorMessage(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return undefined;
}

export interface MigrationResult {
  total: number;
  applied: string[];
  skipped: string[];
  baselined: number;
}

function registerLegacyBaseline(sqlite: Database, sqlFiles: string[], appliedSet: Set<string>): number {
  if (appliedSet.size > 0) return 0;
  const userTableExists = sqlite.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!userTableExists) return 0;
  const insertStmt = sqlite.prepare("INSERT INTO _migrations (name) VALUES (?)");
  const legacyFiles = sqlFiles.filter((file) => file <= LEGACY_BASELINE_END);
  for (const file of legacyFiles) {
    insertStmt.run(file);
    appliedSet.add(file);
  }
  return legacyFiles.length;
}

function isAlreadyAppliedError(err: unknown): boolean {
  const message = errorMessage(err);
  return !!message && (message.includes("already exists") || message.includes("duplicate column name"));
}

export async function runMigrations(sqlite: Database, migrationsDir = MIGRATIONS_DIR): Promise<MigrationResult> {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  const sqlFiles = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const appliedSet = new Set(
    sqlite
      .query<{ name: string }, []>("SELECT name FROM _migrations")
      .all()
      .map((r) => r.name),
  );
  const baselined = registerLegacyBaseline(sqlite, sqlFiles, appliedSet);

  const applied: string[] = [];
  const skipped: string[] = [];
  for (const file of sqlFiles.filter((f) => !appliedSet.has(f))) {
    try {
      sqlite.exec(await Bun.file(join(migrationsDir, file)).text());
      sqlite.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
      applied.push(file);
    } catch (err) {
      if (!isAlreadyAppliedError(err)) throw err;
      sqlite.run("INSERT OR IGNORE INTO _migrations (name) VALUES (?)", [file]);
      skipped.push(file);
    }
  }

  return { total: sqlFiles.length, applied, skipped, baselined };
}

async function main() {
  const sqlite = new Database(DB_PATH);
  try {
    const result = await runMigrations(sqlite);
    if (result.baselined) console.log(`Recorded ${result.baselined} legacy migration(s) as already applied.`);
    for (const file of result.applied) console.log(`MIGRATED: ${file}`);
    for (const file of result.skipped) console.log(`SKIPPED (already exists): ${file}`);
    console.log(`Database migration complete (${result.applied.length} new applied).`);
  } catch (err: unknown) {
    console.error("Database migration error:", errorMessage(err) || err);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

if (import.meta.main) {
  main();
}
