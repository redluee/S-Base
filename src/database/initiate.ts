import db from "./index.ts";
import { exit } from "process";
import { readdir } from "fs/promises";
import path from "path";

console.log("Starting database initialization...");

// Read all migration files from the migrations directory
const migrationDir = "./src/database/migrations";
const migrationFiles = (await readdir(migrationDir))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => path.join(migrationDir, f));
migrationFiles.sort();

const seedDir = "./src/database/seeders";
const seedFiles = (await readdir(seedDir))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => path.join(seedDir, f));
seedFiles.sort();

console.log(
  `Found ${migrationFiles.length} migration(s), ${seedFiles.length} seeder(s)`
);

// Begin a transaction to run all migrations
if (migrationFiles.length > 0) {
  const runMigrations = db.transaction(async () => {
    for (const file of migrationFiles) {
      try {
        const sql = await Bun.file(file).text();
        db.run(sql); // Run the migration SQL
        console.log(`Migrated: ${file}`);
      } catch (e) {
        console.error(`FAILED migration: ${file}`, e);
        throw e; // This will cause the transaction to roll back
      }
    }
  })();
  await runMigrations;
}

// Begin a transaction to run all seeders
if (seedFiles.length > 0) {
  const runSeeders = db.transaction(async () => {
    for (const file of seedFiles) {
      try {
        const sql = await Bun.file(file).text();
        db.run(sql); // Run the seeder SQL
        console.log(`Seeded: ${file}`);
      } catch (e) {
        console.error(`FAILED seeding: ${file}`, e);
        throw e; // This will cause the transaction to roll back
      }
    }
  })();
  await runSeeders;
}

console.log("Database initialization complete.");
exit(0);
