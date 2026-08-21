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

  logLastLogin(userId: number, force = true): void {
    if (!force) {
      const user = db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.userId, userId)).get();
      if (user?.lastLoginAt) {
        const last = new Date(user.lastLoginAt).getTime();
        const now = Date.now();
        if (!isNaN(last) && now - last < 12 * 60 * 60 * 1000) {
          return;
        }
      }
    }
    const now = new Date().toISOString();
    db.update(users).set({ lastLoginAt: now }).where(eq(users.userId, userId)).run();
  }

  createSession(userId: number, impersonatorUserId?: number | null): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 604800000).toISOString();

    db.insert(sessions).values({
      sessionId,
      userId,
      impersonatorUserId: impersonatorUserId ?? null,
      expiresAt,
    }).run();
    return sessionId;
  }

  verifySession(sessionId: string): boolean {
    const result = db.select().from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`), eq(users.isPaused, 0)))
      .get();
    return !!result;
  }

  validateSession(sessionId: string): {
    userId: number;
    username: string;
    email: string | null;
    isImpersonated: boolean;
    impersonatorUserId?: number | null;
    impersonatedBy?: string | null;
  } | null {
    const session = db.select({
      userId: users.userId,
      username: users.username,
      email: users.email,
      isPaused: users.isPaused,
      impersonatorUserId: sessions.impersonatorUserId,
    })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.userId))
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    if (!session || session.isPaused === 1) return null;

    let impersonatedBy: string | null = null;
    if (session.impersonatorUserId) {
      const admin = db.select({ username: users.username, isPaused: users.isPaused })
        .from(users)
        .where(eq(users.userId, session.impersonatorUserId))
        .get();
      if (admin && admin.isPaused === 0) {
        impersonatedBy = admin.username;
      }
    }

    return {
      userId: session.userId,
      username: session.username,
      email: session.email ?? null,
      isImpersonated: !!impersonatedBy,
      impersonatorUserId: impersonatedBy ? session.impersonatorUserId : null,
      impersonatedBy,
    };
  }

  impersonateUser(adminUserId: number, targetUserId: number): {
    ok: true;
    targetUser: { id: number; username: string; email: string | null };
    newSessionId: string;
  } | { ok: false; reason: string } {
    if (!this.moduleAccessCheck(adminUserId, "pulse")) {
      return { ok: false, reason: "forbidden" };
    }

    const target = db.select({ userId: users.userId, username: users.username, email: users.email, isPaused: users.isPaused })
      .from(users)
      .where(eq(users.userId, targetUserId))
      .get();

    if (!target) {
      return { ok: false, reason: "user_not_found" };
    }

    if (target.isPaused === 1) {
      return { ok: false, reason: "user_paused" };
    }

    const newSessionId = this.createSession(target.userId, adminUserId);
    return {
      ok: true,
      targetUser: {
        id: target.userId,
        username: target.username,
        email: target.email ?? null,
      },
      newSessionId,
    };
  }

  stopImpersonation(sessionId: string): {
    ok: true;
    adminUserId: number;
    adminUsername: string;
    newSessionId: string;
  } | { ok: false; reason: string } {
    const session = db.select({
      sessionId: sessions.sessionId,
      userId: sessions.userId,
      impersonatorUserId: sessions.impersonatorUserId,
    })
      .from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();

    if (!session || !session.impersonatorUserId) {
      return { ok: false, reason: "not_impersonating" };
    }

    const admin = db.select({ userId: users.userId, username: users.username, isPaused: users.isPaused })
      .from(users)
      .where(eq(users.userId, session.impersonatorUserId))
      .get();

    if (!admin || admin.isPaused === 1) {
      return { ok: false, reason: "admin_unavailable" };
    }

    this.deleteSession(sessionId);
    const newSessionId = this.createSession(admin.userId);

    return {
      ok: true,
      adminUserId: admin.userId,
      adminUsername: admin.username,
      newSessionId,
    };
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
