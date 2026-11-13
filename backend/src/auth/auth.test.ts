import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../db/client";
import { users } from "../db/schema";
import { setupTestDb } from "../test-utils";
import { AuthService } from "./index";

async function rejection(promiseOrFn: Promise<unknown> | (() => unknown)) {
  try {
    await (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn);
  } catch (err) {
    return err as { status: number; key: string };
  }
  throw new Error("expected a rejection");
}

const lastLoginOf = (userId: number) =>
  db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.userId, userId)).get()?.lastLoginAt;

describe("AuthService", () => {
  const auth = new AuthService();
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    ({ adminId, testerId } = await setupTestDb());
  });

  afterEach(() => {
    db.update(users).set({ isPaused: 0 }).where(eq(users.userId, testerId)).run();
  });

  it("logs in with valid credentials and returns the user with role and modules", async () => {
    const { sessionId, user } = await auth.login("admin", "admin");
    expect(user).toMatchObject({ id: adminId, username: "admin", role: "admin", isImpersonated: false });
    expect(user.modules).toContain("workout");
    expect(auth.currentUser(sessionId).id).toBe(adminId);
  });

  it("rejects unknown users, wrong passwords and paused accounts with distinct keys", async () => {
    expect(await rejection(auth.login("nonexistent", "pass"))).toMatchObject({ status: 401, key: "auth.userNotFound" });
    expect(await rejection(auth.login("admin", "wrong"))).toMatchObject({ status: 401, key: "auth.wrongPassword" });
    db.update(users).set({ isPaused: 1 }).where(eq(users.userId, testerId)).run();
    expect(await rejection(auth.login("tester", "tester"))).toMatchObject({ status: 403, key: "auth.accountPaused" });
  });

  it("logs in by email case-insensitively and refuses unknown addresses", async () => {
    expect(auth.loginByEmail("ADMIN@example.com").user.id).toBe(adminId);
    expect(await rejection(() => auth.loginByEmail("missing@example.com"))).toMatchObject({
      status: 403,
      key: "auth.noAccount",
    });
  });

  it("invalidates a session after logout", async () => {
    const { sessionId } = await auth.login("admin", "admin");
    auth.deleteSession(sessionId);
    expect(await rejection(() => auth.currentUser(sessionId))).toMatchObject({ status: 401 });
  });

  it("impersonates a user and returns to the admin afterwards", async () => {
    const impersonated = auth.impersonate(adminId, testerId);
    expect(auth.currentUser(impersonated.sessionId)).toMatchObject({
      id: testerId,
      isImpersonated: true,
      impersonatedBy: "admin",
      impersonatorUserId: adminId,
    });

    const back = auth.stopImpersonation(impersonated.sessionId);
    expect(back.user).toMatchObject({ id: adminId, isImpersonated: false });
    expect(await rejection(() => auth.currentUser(impersonated.sessionId))).toMatchObject({ status: 401 });
    expect(await rejection(() => auth.stopImpersonation(back.sessionId))).toMatchObject({
      key: "auth.notImpersonating",
    });
  });

  it("refreshes last seen at most every five minutes and never for impersonated sessions", async () => {
    const { sessionId } = await auth.login("admin", "admin");
    const recent = new Date(Date.now() - 60 * 1000).toISOString();
    db.update(users).set({ lastLoginAt: recent }).where(eq(users.userId, adminId)).run();
    auth.currentUser(sessionId);
    expect(lastLoginOf(adminId)).toBe(recent);

    const old = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    db.update(users).set({ lastLoginAt: old }).where(eq(users.userId, adminId)).run();
    auth.currentUser(sessionId);
    expect(lastLoginOf(adminId)).not.toBe(old);

    db.update(users).set({ lastLoginAt: old }).where(eq(users.userId, testerId)).run();
    auth.currentUser(auth.impersonate(adminId, testerId).sessionId);
    expect(lastLoginOf(testerId)).toBe(old);
  });
});
