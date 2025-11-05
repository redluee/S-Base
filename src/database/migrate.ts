import db from "./index.ts";
import { exit } from "process";
import { up, down } from "./migrations/recipes.ts"; // Import your migration functions


// get command line argument "down" or "up"
const arg = process.argv[2];

if (!arg) {
  console.error("Please provide an argument: 'up' or 'down'");
  exit(1);
}

try {
  if (arg === "up") {
    console.log("Running 'up' migration...");
    up(db);
    console.log("Migration 'up' completed successfully.");
  } else if (arg === "down") {
    console.log("Running 'down' migration (resetting database)...");
    down(db);
    console.log("Migration 'down' completed successfully.");
  } else {
    console.error(`Unknown argument: ${arg}. Use 'up' or 'down'.`);
    exit(1);
  }
} catch (error) {
  console.error("Migration failed:", error);
  exit(1);
} finally {
  // It's good practice to close the db connection,
  // but Bun's SQLite driver often handles this implicitly on script exit.
  // db.close(); 
  console.log("Migration script finished.");
}