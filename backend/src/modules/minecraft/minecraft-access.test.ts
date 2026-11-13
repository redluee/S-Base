import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { join } from "path";
import db from "../../db/client";
import { mc_server_permissions, mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import type { MinecraftAction } from "./minecraft-access";
import { FIXTURE_DIR } from "./minecraft-test-utils";

describe("Minecraft access rule", () => {
  const minecraft = new MinecraftService();
  let testerId: number;

  beforeEach(async () => {
    testerId = (await setupTestDb()).testerId;
    for (const slug of ["access-granted", "access-other"]) {
      db.insert(mc_servers)
        .values({ slug, displayName: slug, engine: "vanilla", mcVersion: "1.21.1", serverDir: join(FIXTURE_DIR, slug) })
        .run();
    }
    const granted = minecraft.servers.get("access-granted");
    db.insert(mc_server_permissions).values({ userId: testerId, serverId: granted.serverId }).run();
  });

  afterEach(() => {
    db.delete(mc_server_permissions).where(eq(mc_server_permissions.userId, testerId)).run();
    for (const slug of ["access-granted", "access-other"]) db.delete(mc_servers).where(eq(mc_servers.slug, slug)).run();
  });

  const monitor = (slug: string | undefined, action: MinecraftAction) => () =>
    minecraft.access.authorize({ userId: testerId, hasFullAccess: false, slug, action });

  it("lets monitor users read and start their granted servers only", () => {
    expect(monitor("access-granted", "read")).not.toThrow();
    expect(monitor("access-granted", "start")).not.toThrow();
    expect(monitor(undefined, "read")).not.toThrow();
    expect(monitor("access-other", "read")).toThrow(expect.objectContaining({ key: "minecraft.serverForbidden" }));
    expect(monitor("access-other", "start")).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("requires full access for every other change", () => {
    expect(monitor("access-granted", "manage")).toThrow(
      expect.objectContaining({ key: "minecraft.fullAccessRequired", status: 403 }),
    );
    expect(monitor(undefined, "manage")).toThrow(expect.objectContaining({ key: "minecraft.fullAccessRequired" }));
    expect(() =>
      minecraft.access.authorize({ userId: testerId, hasFullAccess: true, slug: "access-other", action: "manage" }),
    ).not.toThrow();
  });
});
