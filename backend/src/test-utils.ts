import { join } from "path";
import { readdir } from "fs/promises";
import db from "./db/client";
import { users, modules, usermodulepermissions } from "./db/schema";
import { eq } from "drizzle-orm";

let initialized = false;

export async function setupTestDb() {
  if (initialized) {
    const admin = db.select().from(users).where(eq(users.username, "admin")).get();
    const tester = db.select().from(users).where(eq(users.username, "tester")).get();
    return { adminId: admin?.userId ?? 1, testerId: tester?.userId ?? 2 };
  }

  const migrationsDir = join(import.meta.dir, "../migrations");
  try {
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of sqlFiles) {
      try {
        const sqlContent = await Bun.file(join(migrationsDir, file)).text();
        const statements = sqlContent.split(";").map((s) => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          try {
            db.run(stmt as any);
          } catch (e: any) {
            // Ignore expected duplicate table/column DDL errors if re-run
          }
        }
      } catch (err: any) {
        // Continue
      }
    }
  } catch (err: any) {
    console.warn("Test migration read notice:", err);
  }

  const adminHash = await Bun.password.hash("admin", { algorithm: "argon2id" });
  const testerHash = await Bun.password.hash("tester", { algorithm: "argon2id" });

  const existingAdmin = db.select().from(users).where(eq(users.username, "admin")).get();
  let adminId: number;
  if (!existingAdmin) {
    const res = db.insert(users).values({
      username: "admin",
      pswdHash: adminHash,
      email: "admin@example.com",
    }).returning().get();
    adminId = res.userId;
  } else {
    adminId = existingAdmin.userId;
  }

  const existingTester = db.select().from(users).where(eq(users.username, "tester")).get();
  let testerId: number;
  if (!existingTester) {
    const res = db.insert(users).values({
      username: "tester",
      pswdHash: testerHash,
      email: "tester@example.com",
    }).returning().get();
    testerId = res.userId;
  } else {
    testerId = existingTester.userId;
  }

  const moduleNames = ["recipes", "workout", "cashflow", "you", "lyric_quotes", "pulse", "measurements", "wines"];
  for (const name of moduleNames) {
    let existingMod = db.select().from(modules).where(eq(modules.moduleName, name)).get();
    if (!existingMod) {
      existingMod = db.insert(modules).values({
        moduleName: name,
        moduleAlias: name,
        description: `Module ${name}`,
      }).returning().get();
    }
    const adminPerms = db.select().from(usermodulepermissions).where(eq(usermodulepermissions.userId, adminId)).all();
    if (!adminPerms.some((p) => p.moduleId === existingMod.moduleId)) {
      db.insert(usermodulepermissions).values({ userId: adminId, moduleId: existingMod.moduleId }).run();
    }

    const testerPerms = db.select().from(usermodulepermissions).where(eq(usermodulepermissions.userId, testerId)).all();
    if (!testerPerms.some((p) => p.moduleId === existingMod.moduleId)) {
      db.insert(usermodulepermissions).values({ userId: testerId, moduleId: existingMod.moduleId }).run();
    }
  }

  initialized = true;
  return { adminId, testerId };
}
