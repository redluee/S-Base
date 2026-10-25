import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixtureDir = mkdtempSync(join(tmpdir(), "sbase-backend-test-"));

process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.MC_SERVERS_DIR = join(fixtureDir, "servers");
process.env.MC_TEMPLATES_DIR = join(fixtureDir, "templates");

process.on("exit", () => rmSync(fixtureDir, { recursive: true, force: true }));
