import type { Database } from "bun:sqlite";

export function up(db: Database): void {
  db.run(`
    BEGIN TRANSACTION;
    
    -- 1. Tabel 'users'
    CREATE TABLE users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    COMMIT;
  `);
}

export function down(db: Database): void {
  db.run(`
    BEGIN TRANSACTION;

    DROP TABLE IF EXISTS users;

    COMMIT;
  `);
}
