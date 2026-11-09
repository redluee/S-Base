import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_servers } from "../../db/schema/minecraft";
import { setupTestDb } from "../../test-utils";
import { MinecraftService } from "./index";
import { FIXTURE_DIR, mockExternalCalls } from "./minecraft-test-utils";

describe("Minecraft lifecycle and idle monitor", () => {
  let minecraft: MinecraftService;
  let restoreExternalCalls: () => void;
  const testDir = FIXTURE_DIR;

  beforeEach(async () => {
    await setupTestDb();
    minecraft = new MinecraftService();
    restoreExternalCalls = mockExternalCalls();
  });

  afterEach(() => restoreExternalCalls());

  it("handles startPlayerTracking safely without throwing TypeError", async () => {
    const srvDir = join(testDir, "test-server-tracking");
    await mkdir(join(srvDir, "logs"), { recursive: true });
    await writeFile(join(srvDir, "logs", "latest.log"), "");

    const killed: string[] = [];
    const fakeProc = {
      stdout: new ReadableStream({ start: (c) => c.close() }),
      kill: () => killed.push("killed"),
    };
    const spawnMock = spyOn(Bun, "spawn").mockImplementation(() => fakeProc as unknown as ReturnType<typeof Bun.spawn>);
    try {
      expect(() => {
        minecraft.lifecycle.startPlayerTracking("test-server-tracking", srvDir);
      }).not.toThrow();
      expect(spawnMock).toHaveBeenCalledWith(["tail", "-F", "-n", "0", join(srvDir, "logs", "latest.log")], expect.anything());
      minecraft.lifecycle.startPlayerTracking("test-server-tracking", srvDir);
      expect(killed.length).toBe(1);
    } finally {
      spawnMock.mockRestore();
    }
  });
  it("automatically stops server after 15 minutes when no players are online", async () => {
    const srvDir = join(testDir, "test-server-autostop");
    await mkdir(srvDir, { recursive: true });

    db.insert(mc_servers).values({
      slug: "test-server-autostop",
      displayName: "Auto Stop Server",
      engine: "vanilla",
      mcVersion: "1.21.1",
      serverDir: srvDir,
    }).run();

    let serverStopped = false;
    spyOn(minecraft.lifecycle, "stopServer").mockImplementation(async (slug: string) => {
      if (slug === "test-server-autostop") {
        serverStopped = true;
      }
      return { ok: true };
    });

    // Stopped server should not trigger stop
    const isRunning = spyOn(minecraft.lifecycle, "isRunning").mockImplementation(() => false);
    await minecraft.idle.check();
    expect(serverStopped).toBe(false);

    // Running server with no players starts tracking empty time
    isRunning.mockImplementation((slug: string) => slug === "test-server-autostop");
    await minecraft.idle.check();
    expect(serverStopped).toBe(false);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).not.toBeNull();

    // Player joins -> cancels empty timer
    const playerUuid = "11111111-2222-3333-4444-555555555555";
    minecraft.players.parseEvent("test-server-autostop", `[12:00:00] [Server]: UUID of player Alice is ${playerUuid}`);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).toBeNull();

    // Player leaves -> starts empty timer again
    minecraft.players.parseEvent("test-server-autostop", `[12:05:00] [Server]: Alice left the game`);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).not.toBeNull();

    // If checked before 15 minutes (e.g. 10 minutes in), server does not stop
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    minecraft.idle.markEmpty("test-server-autostop", tenMinutesAgo);
    await minecraft.idle.check();
    expect(serverStopped).toBe(false);

    // If checked after 15 minutes (e.g. 15 minutes and 1 second ago), server automatically shuts down
    const fifteenMinutesAndOneSecAgo = Date.now() - (15 * 60 * 1000 + 1000);
    minecraft.idle.markEmpty("test-server-autostop", fifteenMinutesAndOneSecAgo);
    await minecraft.idle.check();
    expect(serverStopped).toBe(true);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).toBeNull();

    // Clean up
    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-autostop")).run();
  });
});
