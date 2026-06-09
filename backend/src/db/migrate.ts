import { Database } from "bun:sqlite";
import { join } from "path";
import { readdir } from "fs/promises";

const MIGRATIONS_DIR = join(import.meta.dir, "../../../migrations");

async function migrate() {
  const sqlite = new Database(
    join(import.meta.dir, "../../..", "sbase.db"),
  );

  try {
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    if (sqlFiles.length === 0) {
      console.log("No migration files found.");
      return;
    }

    for (const file of sqlFiles) {
      const sql = await Bun.file(join(MIGRATIONS_DIR, file)).text();
      sqlite.run(sql);
      console.log(`MIGRATED: ${file}`);
    }

    console.log("Migration complete.");
  } catch {
    // If directory doesn't exist, use drizzle-kit push
    console.log("No SQL migrations found. Use 'drizzle-kit push' for schema sync.");
  }
}

migrate();
