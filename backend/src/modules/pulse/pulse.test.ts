import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { PulseService } from "./index";

describe("PulseService", () => {
  let pulse: PulseService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    pulse = new PulseService();
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
});
