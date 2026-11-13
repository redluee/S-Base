import type { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync, readdirSync, rmSync } from "fs";
import { BACKUP_DIR } from "./paths";

const FIRST_BACKUP_DELAY_MS = 30_000;

export const createBackup = (sqlite: Database, dir = BACKUP_DIR, keep = Number(process.env.BACKUP_KEEP) || 14) => {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(dir, `sbase-${stamp}.db`);
  sqlite.run(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const files = readdirSync(dir)
    .filter((f) => /^sbase-.*\.db$/.test(f))
    .sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) rmSync(join(dir, old), { force: true });
  return target;
};

export const startBackupSchedule = (sqlite: Database, intervalMs = 24 * 60 * 60 * 1000) => {
  const run = () => {
    try {
      const path = createBackup(sqlite);
      console.log(JSON.stringify({ level: "info", event: "db_backup", path }));
    } catch (error) {
      console.error(JSON.stringify({ level: "error", event: "db_backup_failed", error: String(error) }));
    }
  };
  setTimeout(run, FIRST_BACKUP_DELAY_MS).unref();
  return setInterval(run, intervalMs).unref();
};
