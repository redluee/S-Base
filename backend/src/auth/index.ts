import { eq, gt, and, sql } from "drizzle-orm";
import db from "../db/client";
import { users, sessions, usermodulepermissions, modules } from "../db/schema";

export class AuthService {
  async verifyCredentials(username: string, password: string): Promise<
    { ok: true; userId: number } | { ok: false; reason: "not_found" | "wrong_password" | "invalid_input" }
  > {
    if (!username || !password) return { ok: false, reason: "invalid_input" };

    const user = db.select().from(users).where(eq(users.username, username)).get();
    if (!user) return { ok: false, reason: "not_found" };

    const isMatch = await Bun.password.verify(password, user.pswdHash);
    if (!isMatch) return { ok: false, reason: "wrong_password" };

    return { ok: true, userId: user.userId };
  }

  createSession(userId: number): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    db.insert(sessions).values({ sessionId, userId, expiresAt }).run();
    return sessionId;
  }

  verifySession(sessionId: string): boolean {
    const result = db.select().from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    return !!result;
  }

  getUsernameFromSession(sessionId: string): string | null {
    const result = db.select({ username: users.username }).from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    return result?.username ?? null;
  }

  moduleAccessCheck(sessionId: string, moduleName: string): boolean {
    const result = db.select({ hasAccess: sql`1` }).from(sessions)
      .innerJoin(usermodulepermissions, eq(sessions.userId, usermodulepermissions.userId))
      .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
      .where(and(
        eq(sessions.sessionId, sessionId),
        eq(modules.moduleName, moduleName),
        gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`),
      ))
      .get();
    return !!result;
  }

  getUserIdFromSession(sessionId: string): number | null {
    const result = db.select({ userId: sessions.userId }).from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    return result?.userId ?? null;
  }

  deleteSession(sessionId: string): void {
    db.delete(sessions).where(eq(sessions.sessionId, sessionId)).run();
  }
}
