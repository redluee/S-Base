import { Database } from "bun:sqlite";
import { join } from "path";
import { readdir } from "fs/promises";

const MIGRATIONS_DIR = join(import.meta.dir, "../..", "migrations");

export async function runMigrations(sqlite: Database, migrationsDir = MIGRATIONS_DIR) {
  // 1. Ensure migrations tracking table exists
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  const appliedRows = sqlite.query<{ name: string }, []>("SELECT name FROM _migrations").all();
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  // If _migrations is completely empty, check if this is an existing database (e.g. users table exists)
  // If so, mark all currently existing migrations as applied to prevent re-running historical data inserts/DDL
  if (appliedSet.size === 0) {
    const userTableExists = sqlite
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get();

    if (userTableExists) {
      console.log("Existing database detected without migration tracking. Recording current migrations as applied...");
      const insertStmt = sqlite.prepare("INSERT INTO _migrations (name) VALUES (?)");
      for (const file of sqlFiles) {
        insertStmt.run(file);
        appliedSet.add(file);
      }
      console.log(`Recorded ${sqlFiles.length} migration(s) as already applied.`);
    }
  }

  let migratedCount = 0;
  for (const file of sqlFiles) {
    if (appliedSet.has(file)) {
      continue;
    }

    try {
      const sql = await Bun.file(join(migrationsDir, file)).text();
      sqlite.exec(sql);
      sqlite.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
      appliedSet.add(file);
      migratedCount++;
      console.log(`MIGRATED: ${file}`);
    } catch (fileErr: any) {
      if (fileErr?.message?.includes("already exists")) {
        sqlite.run("INSERT OR IGNORE INTO _migrations (name) VALUES (?)", [file]);
        appliedSet.add(file);
        console.log(`SKIPPED (already exists): ${file}`);
      } else {
        console.error(`Migration failed for ${file}:`, fileErr?.message || fileErr);
        throw fileErr;
      }
    }
  }

  return { total: sqlFiles.length, applied: migratedCount };
}

async function main() {
  const dbPath = process.env.DB_PATH || join(import.meta.dir, "../../..", "sbase.db");
  const sqlite = new Database(dbPath);

  try {
    const result = await runMigrations(sqlite);
    console.log(`Database migration complete (${result.applied} new applied).`);
  } catch (err: any) {
    console.error("Database migration error:", err?.message || err);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

if (import.meta.main) {
  main();
}
