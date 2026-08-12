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
});
