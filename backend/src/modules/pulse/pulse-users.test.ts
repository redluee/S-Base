import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors";
import { PulseUsers } from "./pulse-users";

describe("PulseUsers", () => {
  let pulse: PulseUsers;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    pulse = new PulseUsers();
  });

  it("lists users and system modules", () => {
    const usersList = pulse.listUsers();
    expect(usersList.length).toBeGreaterThanOrEqual(2);
    expect(usersList.some((u) => u.userId === adminId)).toBe(true);

    const modulesList = pulse.listModules();
    expect(modulesList.length).toBeGreaterThan(0);
    expect(modulesList.some((m) => m.moduleName === "recipes")).toBe(true);
  });

  it("updates user email and paused status", () => {
    const updatedEmail = pulse.updateEmail(testerId, "newtester@example.com");
    expect(updatedEmail?.email).toBe("newtester@example.com");

    const paused = pulse.updateStatus(testerId, 1);
    expect(paused?.isPaused).toBe(1);

    const unpaused = pulse.updateStatus(testerId, 0);
    expect(unpaused?.isPaused).toBe(0);
  });

  it("updates user module permissions", () => {
    const updatedUser = pulse.updateModules(testerId, ["recipes", "workout"]);
    expect(updatedUser?.modules).toContain("recipes");
    expect(updatedUser?.modules).toContain("workout");

    const stats = pulse.getStats();
    expect(stats.totalUsers).toBeGreaterThan(0);
    expect(stats.activeUsers).toBeGreaterThan(0);
    expect(stats.totalPermissions).toBeGreaterThan(0);
  });

  it("updates user minecraft server monitor permissions", async () => {
    const { default: db } = await import("../../db/client");
    const { mc_servers } = await import("../../db/schema");
    db.insert(mc_servers).values({
      slug: "srv-alpha",
      displayName: "Server Alpha",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: "/tmp/srv-alpha",
    }).run();
    db.insert(mc_servers).values({
      slug: "srv-beta",
      displayName: "Server Beta",
      engine: "fabric",
      mcVersion: "1.21.1",
      serverDir: "/tmp/srv-beta",
    }).run();

    const updated = pulse.updateServerPermissions(testerId, ["srv-alpha"]);
    expect(updated?.mcServers).toContain("srv-alpha");
    expect(updated?.mcServers).not.toContain("srv-beta");

    const users = pulse.listUsers();
    const tester = users.find((u) => u.userId === testerId);
    expect(tester?.mcServers).toEqual(["srv-alpha"]);

    const cleared = pulse.updateServerPermissions(testerId, []);
    expect(cleared?.mcServers).toEqual([]);
  });

  it("creates users and normalizes input", async () => {
    const user = await pulse.createUser("  new-user  ", " New@Example.com ", "longenough");
    expect(user.username).toBe("new-user");
    expect(user.email).toBe("new@example.com");
    expect(user.modules).toEqual([]);
  });

  it("rejects invalid user input with validation errors", async () => {
    const cases: [string, string, string, string][] = [
      ["  ", "a@example.com", "longenough", "pulse.usernameRequired"],
      ["x".repeat(51), "a@example.com", "longenough", "pulse.usernameTooLong"],
      ["someone", "not-an-email", "longenough", "pulse.emailInvalid"],
      ["someone", "a@example.com", "short", "pulse.passwordTooShort"],
    ];
    for (const [username, email, password, key] of cases) {
      const err = await pulse.createUser(username, email, password).catch((e) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.key).toBe(key);
    }
  });

  it("rejects duplicate usernames and emails with conflict errors", async () => {
    await pulse.createUser("dupe", "dupe@example.com", "longenough");
    const sameName = await pulse.createUser("dupe", "other@example.com", "longenough").catch((e) => e);
    expect(sameName).toBeInstanceOf(ConflictError);
    expect(sameName.key).toBe("pulse.usernameExists");
    const sameEmail = await pulse.createUser("other", "DUPE@example.com", "longenough").catch((e) => e);
    expect(sameEmail).toBeInstanceOf(ConflictError);
    expect(sameEmail.key).toBe("pulse.emailExists");
  });

  it("throws NotFoundError for unknown users instead of returning null", () => {
    const calls = [
      () => pulse.getUser(999999),
      () => pulse.updateEmail(999999, "x@example.com"),
      () => pulse.updateStatus(999999, 1),
      () => pulse.updateModules(999999, ["recipes"]),
      () => pulse.updateServerPermissions(999999, []),
    ];
    for (const call of calls) {
      try {
        call();
        throw new Error("expected NotFoundError");
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect((err as NotFoundError).key).toBe("pulse.userNotFound");
      }
    }
  });
});
