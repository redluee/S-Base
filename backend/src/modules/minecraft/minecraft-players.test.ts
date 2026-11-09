import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft players", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("handles player events, stats tracking, ban, and unban", async () => {
    const srvDir = join(testDir, "test-server-stats");
    await mkdir(srvDir, { recursive: true });

    // Insert mock server
    db.insert(mc_servers).values({
      slug: "test-server-stats",
      displayName: "Test Stats Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    const playerUuid = "12345678-1234-1234-1234-123456789abc";
    const playerName = "Steve";

    // Player joins (with realistic log prefix)
    minecraft.players.parseEvent("test-server-stats", `[20:14:59] [User Authenticator #1/INFO]: UUID of player ${playerName} is ${playerUuid}`);
    const playersJoined = await minecraft.players.list("test-server-stats");
    expect(playersJoined.online.length).toBe(1);
    expect(playersJoined.online[0].playerUuid).toBe(playerUuid);
    expect(playersJoined.online[0].playerName).toBe(playerName);

    // Redundant join without leave does not duplicate online list
    minecraft.players.parseEvent("test-server-stats", `[20:15:00] [User Authenticator #1/INFO]: UUID of player ${playerName} is ${playerUuid}`);
    const playersJoinedAgain = await minecraft.players.list("test-server-stats");
    expect(playersJoinedAgain.online.length).toBe(1);
    expect(playersJoinedAgain.online[0].playerName).toBe(playerName);

    // Player leaves with server log prefix
    minecraft.players.parseEvent("test-server-stats", `[20:28:58] [Server thread/INFO]: ${playerName} left the game`);
    const playersLeft = await minecraft.players.list("test-server-stats");
    expect(playersLeft.online.length).toBe(0);
    expect(playersLeft.history.length).toBe(1);
    expect(playersLeft.history[0].playerName).toBe(playerName);

    // Ban player
    await minecraft.players.ban("test-server-stats", playerUuid, "Griefing");
    const playersBanned = await minecraft.players.list("test-server-stats");
    expect(playersBanned.banned?.length).toBe(1);
    expect(playersBanned.banned?.[0].name).toBe(playerName);

    // Unban player
    await minecraft.players.unban("test-server-stats", playerUuid);
    const playersUnbanned = await minecraft.players.list("test-server-stats");
    expect(playersUnbanned.banned?.length).toBe(0);

    // Clean up db
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-stats")).run();
  });
});
