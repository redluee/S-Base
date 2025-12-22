import db from "./index.ts";
import { exit } from "process";
import { readdir } from "fs/promises";
import path from "path";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

// sql script directories
const MIGRATION_DIR = "./src/database/migrations";
const SEED_DIR = "./src/database/seeders";

// sorting sql files alphabetically for right execution order
async function getSqlFiles(directory: string): Promise<string[]> {
	try {
		const files = await readdir(directory);
		return files
			.filter((f) => f.endsWith(".sql"))
			.sort()
			.map((f) => path.join(directory, f));
	} catch (error) {
		console.warn(`Warning: Could not read directory ${directory}`);
		return [];
	}
}

// Up migration, pulls all migration files
async function runMigrations() {
	const files = await getSqlFiles(MIGRATION_DIR);
	console.log(`\nFound ${files.length} migration(s)...`);

	if (files.length === 0) return;

	const migrate = db.transaction(async () => {
		for (const file of files) {
			const sql = await Bun.file(file).text();
			db.run(sql);
			console.log(`MIGRATED: ${path.basename(file)}`);
		}
	});

	try {
		await migrate();
		console.log("Migration complete.");
	} catch (e) {
		console.error("Migration FAILED.", e);
		exit(1);
	}
}

// Seed command, runs all seeder files
async function runSeeds() {
	const files = await getSqlFiles(SEED_DIR);
	console.log(`\nFound ${files.length} seeder(s)...`);

	if (files.length === 0) return;

	const seed = db.transaction(async () => {
		for (const file of files) {
			const sql = await Bun.file(file).text();
			db.run(sql);
			console.log(`SEEDED: ${path.basename(file)}`);
		}
	});

	try {
		await seed();
		console.log("Seeding complete.");
	} catch (e) {
		console.error("Seeding FAILED.", e);
		exit(1);
	}
}

// Down command, drops the database schema
async function runDown() {
	const rl = readline.createInterface({ input, output });

	console.warn("\n-- DANGER ZONE --");
	console.log("You are about to DROP all tables in the database.");
	const answer = await rl.question(
		"Are you sure you want to proceed? Type 'yes' to confirm: "
	);
	rl.close();

	if (answer !== "yes") {
		console.log("Operation cancelled.");
		exit(0);
	}

	// Get all tables and drop them.
	try {
		const getTables = db.query(
			"SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';"
		);
		const tables = getTables.all() as { name: string }[];

		if (tables.length === 0) {
			console.log("Database is already empty.");
			return;
		}

		// Disable foreign keys temporarily to avoid constraint errors during drop
		db.run("PRAGMA foreign_keys = OFF;");

		const dropTx = db.transaction(() => {
			for (const table of tables) {
				db.run(`DROP TABLE IF EXISTS "${table.name}";`);
				console.log(`DROPPED TABLE: ${table.name}`);
			}
		});

		dropTx();
		db.run("PRAGMA foreign_keys = ON;");
		console.log("Database cleared successfully.");
	} catch (e) {
		console.error("Failed to drop database.", e);
		exit(1);
	}
}

// input handling
const command = process.argv[2];

console.log(`Running database command: ${command || "NONE"}`);

switch (command) {
	case "up":
		await runMigrations();
		break;
	case "seed":
		await runSeeds();
		break;
	case "down":
		await runDown();
		break;
	case "reset":
		await runDown();
		await runMigrations();
		await runSeeds();
		break;
	default:
		console.error("\nInvalid command.");
		console.log("Usage:");
		console.log("  bun run initiate up    - Run migrations");
		console.log("  bun run initiate seed  - Run seeders");
		console.log(
			"  bun run initiate down  - Drop all tables (Requires confirmation)"
		);
		console.log(
			"  bun run initiate reset - Drop all tables and re-run migrations and seeders"
		);
		exit(1);
}

exit(0);
