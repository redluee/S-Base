import { eq, gt, and, sql } from "drizzle-orm";
import db from "../db/client";
import { users, sessions, usermodulepermissions, modules } from "../db/schema";

export class AuthService {
  async verifyCredentials(username: string, password: string): Promise<
    { ok: true; userId: number; email: string | null } | { ok: false; reason: "not_found" | "wrong_password" | "invalid_input" | "account_paused" }
  > {
    if (!username || !password) return { ok: false, reason: "invalid_input" };

    const user = db.select().from(users).where(eq(users.username, username)).get();
    if (!user) return { ok: false, reason: "not_found" };

    if (user.isPaused === 1) {
      return { ok: false, reason: "account_paused" };
    }

    const isMatch = await Bun.password.verify(password, user.pswdHash);
    if (!isMatch) return { ok: false, reason: "wrong_password" };

    this.logLastLogin(user.userId);
    return { ok: true, userId: user.userId, email: user.email ?? null };
  }

  logLastLogin(userId: number): void {
    const now = new Date().toISOString();
    db.update(users).set({ lastLoginAt: now }).where(eq(users.userId, userId)).run();
  }

  createSession(userId: number): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 604800000).toISOString();

    db.insert(sessions).values({ sessionId, userId, expiresAt }).run();
    return sessionId;
  }

  verifySession(sessionId: string): boolean {
    const result = db.select().from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`), eq(users.isPaused, 0)))
      .get();
    return !!result;
  }

  validateSession(sessionId: string): { userId: number; username: string; email: string | null } | null {
    const result = db.select({ userId: users.userId, username: users.username, email: users.email, isPaused: users.isPaused })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    if (!result || result.isPaused === 1) return null;
    return { userId: result.userId, username: result.username, email: result.email ?? null };
  }

  getUsernameFromSession(sessionId: string): string | null {
    const result = db.select({ username: users.username, isPaused: users.isPaused })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    if (!result || result.isPaused === 1) return null;
    return result.username;
  }

  moduleAccessCheck(userId: number, moduleName: string): boolean {
    const result = db.select({ hasAccess: sql`1` }).from(usermodulepermissions)
      .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
      .where(and(
        eq(usermodulepermissions.userId, userId),
        eq(modules.moduleName, moduleName),
      ))
      .get();
    return !!result;
  }

  getUserModules(userId: number): string[] {
    const userPerms = db.select({ moduleName: modules.moduleName })
      .from(usermodulepermissions)
      .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
      .where(eq(usermodulepermissions.userId, userId))
      .all();
    return userPerms.map((p) => p.moduleName);
  }

  getUserIdFromSession(sessionId: string): number | null {
    const result = db.select({ userId: sessions.userId, isPaused: users.isPaused })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    if (!result || result.isPaused === 1) return null;
    return result.userId;
  }

  deleteSession(sessionId: string): void {
    db.delete(sessions).where(eq(sessions.sessionId, sessionId)).run();
  }

  findUserByEmail(email: string): { userId: number; username: string; email: string | null; isPaused: number } | null {
    const user = db.select({ userId: users.userId, username: users.username, email: users.email, isPaused: users.isPaused })
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (!user) return null;
    return { userId: user.userId, username: user.username, email: user.email ?? null, isPaused: user.isPaused };
  }
}
