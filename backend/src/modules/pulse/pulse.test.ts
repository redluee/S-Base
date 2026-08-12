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
});
