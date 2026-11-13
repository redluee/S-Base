import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { DB_PATH, IN_MEMORY_DB } from "./paths";

const sqlite = new Database(DB_PATH);
if (!IN_MEMORY_DB) {
  sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA synchronous = NORMAL");
}
sqlite.run("PRAGMA foreign_keys = ON");
sqlite.run("PRAGMA busy_timeout = 5000");

const db = drizzle(sqlite, { schema });

export function closeDatabase(): void {
  sqlite.run("PRAGMA wal_checkpoint(TRUNCATE);");
  sqlite.close();
}

export { sqlite };
export default db;
