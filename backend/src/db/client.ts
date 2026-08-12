import { join } from "path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const dbPath = process.env.DB_PATH || join(import.meta.dir, "../../..", "sbase.db");
const sqlite = new Database(dbPath);
if (dbPath !== ":memory:") {
  sqlite.run("PRAGMA journal_mode = WAL");
}
sqlite.run("PRAGMA foreign_keys = ON");

const db = drizzle(sqlite, { schema });

const cleanup = () => {
  try {
    sqlite.run("PRAGMA wal_checkpoint(TRUNCATE);");
    sqlite.close();
  } catch {}
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

export default db;

