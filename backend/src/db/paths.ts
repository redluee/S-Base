import { dirname, join } from "path";

const REPO_ROOT = join(import.meta.dir, "../../..");

export const DB_PATH = process.env.DB_PATH || join(REPO_ROOT, "sbase.db");
export const IN_MEMORY_DB = DB_PATH === ":memory:";
export const UPLOADS_DIR = join(import.meta.dir, "../../uploads");
export const BACKUP_DIR = process.env.BACKUP_DIR || join(dirname(DB_PATH), "backups");
