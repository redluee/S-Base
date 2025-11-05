import {Database} from "bun:sqlite";
import * as path from "path";

const dbPath = path.join(import.meta.dir, "../..", "sbase.db");
const db = new Database(dbPath);

console.log(`Connected to SQLite database at: ${dbPath}`);

export default db;