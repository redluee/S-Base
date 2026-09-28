import { Database } from "bun:sqlite";
import { join, dirname } from "path";
import { mkdirSync, readdirSync, unlinkSync } from "fs";

const defaultDbPath = join(import.meta.dir, "../../..", "sbase.db");

export const getBackupDir = () => process.env.BACKUP_DIR || join(dirname(process.env.DB_PATH || defaultDbPath), "backups");

export const createBackup = (sqlite: Database, dir = getBackupDir(), keep = Number(process.env.BACKUP_KEEP) || 14) => {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(dir, `sbase-${stamp}.db`);
  sqlite.run(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const files = readdirSync(dir).filter((f) => /^sbase-.*\.db$/.test(f)).sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) {
    try {
      unlinkSync(join(dir, old));
    } catch {}
  }
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
  setTimeout(run, 30_000).unref();
  return setInterval(run, intervalMs).unref();
};
