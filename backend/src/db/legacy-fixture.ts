import { Database } from "bun:sqlite";
import { readdir } from "fs/promises";
import { join } from "path";
import { LEGACY_BASELINE_END, MIGRATIONS_DIR } from "./migrate";

export async function untrackedLegacyDatabase(): Promise<Database> {
  const sqlite = new Database(":memory:");
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql") && f <= LEGACY_BASELINE_END).sort();
  for (const file of files) sqlite.exec(await Bun.file(join(MIGRATIONS_DIR, file)).text());
  sqlite.run("INSERT INTO users (username, pswd_hash) VALUES ('synthetic-legacy', 'unused')");
  return sqlite;
}
