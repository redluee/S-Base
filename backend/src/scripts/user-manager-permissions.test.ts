import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { AuthService } from "../auth";
import { MinecraftPermissions } from "../modules/minecraft/minecraft-permissions";
import { setupTestDb } from "../test-utils";
import db from "../db/client";
import { mc_servers } from "../db/schema";
import {
  grantPermission,
  grantServerPermission,
  revokePermission,
  revokeServerPermission,
} from "./user-manager-permissions";

describe("user-manager permissions", () => {
  const auth = new AuthService();
  let testerId: number;

  beforeEach(async () => {
    ({ testerId } = await setupTestDb());
    spyOn(console, "log").mockImplementation(() => {});
  });

  it("grants and revokes a module permission", async () => {
    await revokePermission("tester", "cashflow");
    expect(auth.moduleAccessCheck(testerId, "cashflow")).toBe(false);
    await grantPermission("tester", "cashflow");
    expect(auth.moduleAccessCheck(testerId, "cashflow")).toBe(true);
    await revokePermission("tester", "cashflow");
    expect(auth.moduleAccessCheck(testerId, "cashflow")).toBe(false);
  });

  it("grants and revokes a server permission", async () => {
    const { serverId } = db
      .insert(mc_servers)
      .values({ slug: "cli-srv", displayName: "CLI", engine: "vanilla", mcVersion: "1.21", serverDir: "/tmp/cli-srv" })
      .returning()
      .get();
    const permissions = new MinecraftPermissions();
    await grantServerPermission("tester", "cli-srv");
    expect(permissions.serverIdsOf(testerId).has(serverId)).toBe(true);
    await revokeServerPermission("tester", "cli-srv");
    expect(permissions.serverIdsOf(testerId).has(serverId)).toBe(false);
  });
});
