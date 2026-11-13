import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { ensureDefaultModules } from "./auth/modules";
import db, { sqlite } from "./db/client";
import { runMigrations } from "./db/migrate";
import { modules, usermodulepermissions, users } from "./db/schema";

let ready: Promise<{ adminId: number; testerId: number }> | null = null;

async function createUserWithAllModules(username: string): Promise<number> {
  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) return existing.userId;
  const { userId } = db
    .insert(users)
    .values({ username, pswdHash: await hashPassword(username), email: `${username}@example.com` })
    .returning()
    .get();
  for (const { moduleId } of db.select().from(modules).all()) {
    db.insert(usermodulepermissions).values({ userId, moduleId }).run();
  }
  return userId;
}

async function initialize() {
  await runMigrations(sqlite);
  ensureDefaultModules();
  return { adminId: await createUserWithAllModules("admin"), testerId: await createUserWithAllModules("tester") };
}

export function setupTestDb() {
  ready ??= initialize();
  return ready;
}
