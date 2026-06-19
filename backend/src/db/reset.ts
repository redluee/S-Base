import { Database } from "bun:sqlite";
import { join } from "path";

async function reset() {
  const dbPath = join(import.meta.dir, "../../..", "sbase.db");
  const sqlite = new Database(dbPath);

  const tables = sqlite.query<{ name: string }, []>(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  ).all();

  if (tables.length === 0) {
    console.log("Database is already empty.");
    return;
  }

  sqlite.run("PRAGMA foreign_keys = OFF;");

  for (const table of tables) {
    sqlite.run(`DROP TABLE IF EXISTS "${table.name}";`);
    console.log(`DROPPED TABLE: ${table.name}`);
  }

  sqlite.run("PRAGMA foreign_keys = ON;");
  console.log("Database cleared.");
}

reset().catch(console.error);
