import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../test-utils";
import { AuthService } from "./index";
import db from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

describe("AuthService", () => {
  let authService: AuthService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    authService = new AuthService();
  });

  it("verifies valid credentials", async () => {
    const res = await authService.verifyCredentials("admin", "admin");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.userId).toBe(adminId);
    }
  });

  it("rejects wrong password", async () => {
    const res = await authService.verifyCredentials("admin", "wrongpass");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("wrong_password");
    }
  });

  it("rejects non-existent user", async () => {
    const res = await authService.verifyCredentials("nonexistent", "pass");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("not_found");
    }
  });

  it("rejects invalid input", async () => {
    const res = await authService.verifyCredentials("", "");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("invalid_input");
    }
  });

  it("rejects paused user account", async () => {
    db.update(users).set({ isPaused: 1 }).where(eq(users.userId, testerId)).run();
    const res = await authService.verifyCredentials("tester", "tester");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("account_paused");
    }
    // Restore
    db.update(users).set({ isPaused: 0 }).where(eq(users.userId, testerId)).run();
  });

  it("creates, validates, and deletes sessions", () => {
    const sessionId = authService.createSession(adminId);
    expect(sessionId).toBeTruthy();

    const isValid = authService.verifySession(sessionId);
    expect(isValid).toBe(true);

    const user = authService.validateSession(sessionId);
    expect(user?.userId).toBe(adminId);
    expect(user?.username).toBe("admin");

    const username = authService.getUsernameFromSession(sessionId);
    expect(username).toBe("admin");

    const uid = authService.getUserIdFromSession(sessionId);
    expect(uid).toBe(adminId);

    authService.deleteSession(sessionId);
    expect(authService.verifySession(sessionId)).toBe(false);
  });

  it("checks module permissions", () => {
    const hasAccess = authService.moduleAccessCheck(adminId, "workout");
    expect(hasAccess).toBe(true);

    const userModules = authService.getUserModules(adminId);
    expect(userModules).toContain("workout");
    expect(userModules).toContain("recipes");
  });

  it("finds user by email", () => {
    const user = authService.findUserByEmail("admin@example.com");
    expect(user?.userId).toBe(adminId);
    expect(user?.username).toBe("admin");

    const notFound = authService.findUserByEmail("missing@example.com");
    expect(notFound).toBeNull();
  });

  it("handles impersonation flow properly", () => {
    // Admin impersonates tester
    const impRes = authService.impersonateUser(adminId, testerId);
    expect(impRes.ok).toBe(true);
    if (!impRes.ok) return;

    expect(impRes.targetUser.id).toBe(testerId);
    expect(impRes.targetUser.username).toBe("tester");

    // Validate impersonated session
    const validated = authService.validateSession(impRes.newSessionId);
    expect(validated).not.toBeNull();
    expect(validated?.userId).toBe(testerId);
    expect(validated?.username).toBe("tester");
    expect(validated?.isImpersonated).toBe(true);
    expect(validated?.impersonatedBy).toBe("admin");
    expect(validated?.impersonatorUserId).toBe(adminId);

    // Stop impersonation
    const stopRes = authService.stopImpersonation(impRes.newSessionId);
    expect(stopRes.ok).toBe(true);
    if (!stopRes.ok) return;

    expect(stopRes.adminUserId).toBe(adminId);
    expect(stopRes.adminUsername).toBe("admin");

    // Impersonated session should now be deleted
    expect(authService.verifySession(impRes.newSessionId)).toBe(false);

    // New admin session should be valid and not impersonated
    const adminSession = authService.validateSession(stopRes.newSessionId);
    expect(adminSession?.userId).toBe(adminId);
    expect(adminSession?.username).toBe("admin");
    expect(adminSession?.isImpersonated).toBe(false);
  });

  it("updates and preserves lastLoginAt based on force flag", () => {
    const fixedTime = "2026-08-20T10:00:00.000Z";
    db.update(users).set({ lastLoginAt: fixedTime }).where(eq(users.userId, adminId)).run();

    // With force = false and recent timestamp, lastLoginAt is preserved
    const recentTime = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
    db.update(users).set({ lastLoginAt: recentTime }).where(eq(users.userId, adminId)).run();
    authService.logLastLogin(adminId, false);

    const userAfterUnforced = db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.userId, adminId)).get();
    expect(userAfterUnforced?.lastLoginAt).toBe(recentTime);

    // With force = true, lastLoginAt is updated immediately
    authService.logLastLogin(adminId, true);
    const userAfterForced = db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.userId, adminId)).get();
    expect(userAfterForced?.lastLoginAt).not.toBe(recentTime);
    expect(new Date(userAfterForced!.lastLoginAt!).getTime()).toBeGreaterThan(new Date(recentTime).getTime());

    // With force = false and timestamp older than 12 hours, lastLoginAt is updated
    const oldTime = new Date(Date.now() - 15 * 3600 * 1000).toISOString(); // 15 hours ago
    db.update(users).set({ lastLoginAt: oldTime }).where(eq(users.userId, adminId)).run();
    authService.logLastLogin(adminId, false);
    const userAfterOld = db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.userId, adminId)).get();
    expect(userAfterOld?.lastLoginAt).not.toBe(oldTime);
  });
});
