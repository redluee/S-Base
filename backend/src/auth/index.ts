import { and, eq, gt, sql } from "drizzle-orm";
import db from "../db/client";
import { modules, sessions, usermodulepermissions, users } from "../db/schema";
import { type RateLimiter, loginLimiter } from "../security";
import {
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors";
import { SESSION_TTL_SECONDS } from "./session-cookie";

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
const DEFAULT_CREDENTIAL_USERS = ["admin", "tester"];

export type Role = "admin" | "user";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  role: Role;
  modules: string[];
  isImpersonated: boolean;
  impersonatorUserId: number | null;
  impersonatedBy: string | null;
}

export interface SessionUser {
  userId: number;
  username: string;
}

interface UserRow {
  userId: number;
  username: string;
  email: string | null;
  isPaused: number;
}

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export class AuthService {
  constructor(private readonly limiter: RateLimiter = loginLimiter) {}

  async login(username: string, password: string, ip: string): Promise<{ sessionId: string; user: AuthUser }> {
    const ipKey = `ip:${ip}`;
    const userKey = `user:${username.toLowerCase()}`;
    const blocked = [this.limiter.check(ipKey), this.limiter.check(userKey)].find((l) => !l.allowed);
    if (blocked) throw new TooManyRequestsError("auth.tooManyAttempts", blocked.retryAfter);
    try {
      const session = await this.verifyCredentials(username, password);
      this.limiter.reset(userKey);
      return session;
    } catch (err) {
      this.limiter.hit(ipKey);
      this.limiter.hit(userKey);
      throw err;
    }
  }

  private async verifyCredentials(username: string, password: string) {
    const user = db.select().from(users).where(eq(users.username, username)).get();
    if (!user) throw new UnauthorizedError("auth.userNotFound");
    if (user.isPaused === 1) throw new ForbiddenError("auth.accountPaused");
    if (!(await Bun.password.verify(password, user.pswdHash))) throw new UnauthorizedError("auth.wrongPassword");
    return this.startSession(user);
  }

  loginByEmail(email: string): { sessionId: string; user: AuthUser } {
    const user = db
      .select({ userId: users.userId, username: users.username, email: users.email, isPaused: users.isPaused })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email.trim()})`)
      .get();
    if (!user) throw new ForbiddenError("auth.noAccount", { email });
    if (user.isPaused === 1) throw new ForbiddenError("auth.accountPaused");
    return this.startSession(user);
  }

  async findDefaultCredentialUsers(): Promise<string[]> {
    const found: string[] = [];
    for (const name of DEFAULT_CREDENTIAL_USERS) {
      const user = db.select().from(users).where(eq(users.username, name)).get();
      if (user && (await Bun.password.verify(name, user.pswdHash))) found.push(name);
    }
    return found;
  }

  sessionUser(sessionId: string): SessionUser & { email: string | null; impersonator: UserRow | null } {
    if (!sessionId) throw new UnauthorizedError();
    const session = db
      .select({
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
    if (!session || session.isPaused === 1) throw new UnauthorizedError();

    const impersonator = session.impersonatorUserId ? this.activeUser(session.impersonatorUserId) : null;
    if (!session.impersonatorUserId) this.touchLastSeen(session.userId);

    return {
      userId: session.userId,
      username: session.username,
      email: session.email ?? null,
      impersonator,
    };
  }

  currentUser(sessionId: string): AuthUser {
    const session = this.sessionUser(sessionId);
    return this.describe(session, session.impersonator);
  }

  impersonate(adminUserId: number, targetUserId: number): { sessionId: string; user: AuthUser } {
    const target = db
      .select({ userId: users.userId, username: users.username, email: users.email, isPaused: users.isPaused })
      .from(users)
      .where(eq(users.userId, targetUserId))
      .get();
    if (!target) throw new NotFoundError("pulse.userNotFound");
    if (target.isPaused === 1) throw new ValidationError("pulse.userPaused");
    const sessionId = this.createSession(target.userId, adminUserId);
    return { sessionId, user: this.describe(target, this.activeUser(adminUserId)) };
  }

  stopImpersonation(sessionId: string): { sessionId: string; user: AuthUser } {
    const session = db
      .select({ impersonatorUserId: sessions.impersonatorUserId })
      .from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, sql`CURRENT_TIMESTAMP`)))
      .get();
    if (!session) throw new UnauthorizedError();
    if (!session.impersonatorUserId) throw new ValidationError("auth.notImpersonating");
    const admin = this.activeUser(session.impersonatorUserId);
    if (!admin) throw new ValidationError("auth.adminUnavailable");
    this.deleteSession(sessionId);
    return { sessionId: this.createSession(admin.userId), user: this.describe(admin, null) };
  }

  moduleAccessCheck(userId: number, moduleName: string): boolean {
    const result = db
      .select({ hasAccess: sql`1` })
      .from(usermodulepermissions)
      .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
      .where(and(eq(usermodulepermissions.userId, userId), eq(modules.moduleName, moduleName)))
      .get();
    return !!result;
  }

  getUserModules(userId: number): string[] {
    return db
      .select({ moduleName: modules.moduleName })
      .from(usermodulepermissions)
      .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
      .where(eq(usermodulepermissions.userId, userId))
      .all()
      .map((p) => p.moduleName);
  }

  deleteSession(sessionId: string): void {
    db.delete(sessions).where(eq(sessions.sessionId, sessionId)).run();
  }

  private startSession(user: UserRow): { sessionId: string; user: AuthUser } {
    db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.userId, user.userId)).run();
    return { sessionId: this.createSession(user.userId), user: this.describe(user, null) };
  }

  private createSession(userId: number, impersonatorUserId: number | null = null): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    db.insert(sessions).values({ sessionId, userId, impersonatorUserId, expiresAt }).run();
    return sessionId;
  }

  private touchLastSeen(userId: number): void {
    const user = db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.userId, userId)).get();
    const last = user?.lastLoginAt ? new Date(user.lastLoginAt).getTime() : Number.NaN;
    if (!Number.isNaN(last) && Date.now() - last < LAST_SEEN_THROTTLE_MS) return;
    db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.userId, userId)).run();
  }

  private activeUser(userId: number): UserRow | null {
    const user = db
      .select({ userId: users.userId, username: users.username, email: users.email, isPaused: users.isPaused })
      .from(users)
      .where(eq(users.userId, userId))
      .get();
    return user && user.isPaused === 0 ? user : null;
  }

  private describe(
    user: { userId: number; username: string; email: string | null },
    impersonator: UserRow | null,
  ): AuthUser {
    const userModules = this.getUserModules(user.userId);
    return {
      id: user.userId,
      username: user.username,
      email: user.email ?? null,
      role: userModules.includes("pulse") ? "admin" : "user",
      modules: userModules,
      isImpersonated: !!impersonator,
      impersonatorUserId: impersonator?.userId ?? null,
      impersonatedBy: impersonator?.username ?? null,
    };
  }
}
