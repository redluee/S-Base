import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { eq } from "drizzle-orm";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_player_sessions, mc_servers } from "../../db/schema/minecraft";
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

  function insertServer(slug: string, serverDir: string) {
    db.insert(mc_servers).values({ slug, displayName: slug, engine: "vanilla", mcVersion: "1.21.1", serverDir }).run();
  }

  it("records players from the tailed log and restarts tailing on a new start", async () => {
    const slug = "test-server-tracking";
    const srvDir = join(testDir, slug);
    await mkdir(srvDir, { recursive: true });
    insertServer(slug, srvDir);

    const killed: string[] = [];
    const joinLine =
      "[12:00:00] [User Authenticator #1/INFO]: UUID of player Alex is 11111111-2222-3333-4444-555555555555\n";
    const fakeProc = {
      stdout: new ReadableStream({
        start: (c) => {
          c.enqueue(new TextEncoder().encode(joinLine));
          c.close();
        },
      }),
      kill: () => killed.push("killed"),
    };
    const spawnMock = spyOn(Bun, "spawn").mockImplementation(() => fakeProc as unknown as ReturnType<typeof Bun.spawn>);
    try {
      minecraft.lifecycle.startPlayerTracking(slug, srvDir);
      expect(spawnMock).toHaveBeenCalledWith(
        ["tail", "-F", "-n", "0", join(srvDir, "logs", "latest.log")],
        expect.anything(),
      );
      await Bun.sleep(10);
      expect(minecraft.players.getOnline(slug).map((p) => p.playerName)).toEqual(["Alex"]);

      minecraft.lifecycle.startPlayerTracking(slug, srvDir);
      expect(killed.length).toBe(1);
    } finally {
      spawnMock.mockRestore();
      db.delete(mc_servers).where(eq(mc_servers.slug, slug)).run();
    }
  });

  it("closes open sessions and adds their playtime when a server stops", async () => {
    const slug = "test-server-sessions";
    const srvDir = join(testDir, slug);
    await mkdir(srvDir, { recursive: true });
    insertServer(slug, srvDir);
    try {
      minecraft.players.parseEvent(slug, "UUID of player Alex is 11111111-2222-3333-4444-555555555555");
      minecraft.players.parseEvent(slug, "UUID of player Sam is 66666666-2222-3333-4444-555555555555");
      const serverId = minecraft.servers.get(slug).serverId;
      db.update(mc_player_sessions)
        .set({ joinedAt: new Date(Date.now() - 90_000).toISOString() })
        .where(eq(mc_player_sessions.serverId, serverId))
        .run();

      minecraft.players.closeOpenSessions(serverId);

      expect(minecraft.players.getOnline(slug)).toEqual([]);
      const playtimes = (await minecraft.players.list(slug)).history.map((h) => h.totalPlaytime);
      expect(playtimes).toEqual([90, 90]);
    } finally {
      db.delete(mc_servers).where(eq(mc_servers.slug, slug)).run();
    }
  });

  it("warns only running servers with players and stops every running server", async () => {
    const dirs = ["test-busy", "test-empty", "test-offline"].map((slug) => join(testDir, slug));
    for (const [i, slug] of ["test-busy", "test-empty", "test-offline"].entries()) {
      await mkdir(dirs[i], { recursive: true });
      insertServer(slug, dirs[i]);
    }
    minecraft.players.parseEvent("test-busy", "UUID of player Alex is 11111111-2222-3333-4444-555555555555");
    spyOn(minecraft.lifecycle, "isRunning").mockImplementation((slug: string) => slug !== "test-offline");
    const sent: [string, string][] = [];
    spyOn(minecraft.lifecycle, "sendCommand").mockImplementation(async (slug: string, cmd: string) => {
      sent.push([slug, cmd]);
    });
    const stopped: string[] = [];
    spyOn(minecraft.lifecycle, "stopServer").mockImplementation(async (slug: string) => {
      stopped.push(slug);
      return { ok: true };
    });
    try {
      await minecraft.lifecycle.broadcastShutdownWarning(5);
      expect(sent.map(([slug]) => slug)).toEqual(["test-busy"]);
      expect(sent[0][1]).toContain("5 minuten");

      sent.length = 0;
      await minecraft.lifecycle.broadcastShutdownWarning(1);
      expect(sent[0][1]).toContain("1 minuut");

      sent.length = 0;
      await minecraft.lifecycle.stopAll();
      expect(sent.map(([slug]) => slug)).toEqual(["test-busy", "test-empty"]);
      expect(stopped).toEqual(["test-busy", "test-empty"]);
    } finally {
      for (const slug of ["test-busy", "test-empty", "test-offline"]) {
        db.delete(mc_servers).where(eq(mc_servers.slug, slug)).run();
      }
    }
  });

  it("automatically stops server after 15 minutes when no players are online", async () => {
    const srvDir = join(testDir, "test-server-autostop");
    await mkdir(srvDir, { recursive: true });

    db.insert(mc_servers)
      .values({
        slug: "test-server-autostop",
        displayName: "Auto Stop Server",
        engine: "vanilla",
        mcVersion: "1.21.1",
        serverDir: srvDir,
      })
      .run();

    let serverStopped = false;
    spyOn(minecraft.lifecycle, "stopServer").mockImplementation(async (slug: string) => {
      if (slug === "test-server-autostop") {
        serverStopped = true;
      }
      return { ok: true };
    });

    const isRunning = spyOn(minecraft.lifecycle, "isRunning").mockImplementation(() => false);
    await minecraft.idle.check();
    expect(serverStopped).toBe(false);

    isRunning.mockImplementation((slug: string) => slug === "test-server-autostop");
    await minecraft.idle.check();
    expect(serverStopped).toBe(false);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).not.toBeNull();

    const playerUuid = "11111111-2222-3333-4444-555555555555";
    minecraft.players.parseEvent("test-server-autostop", `[12:00:00] [Server]: UUID of player Alice is ${playerUuid}`);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).toBeNull();

    minecraft.players.parseEvent("test-server-autostop", `[12:05:00] [Server]: Alice left the game`);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).not.toBeNull();

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    minecraft.idle.markEmpty("test-server-autostop", tenMinutesAgo);
    await minecraft.idle.check();
    expect(serverStopped).toBe(false);

    const fifteenMinutesAndOneSecAgo = Date.now() - (15 * 60 * 1000 + 1000);
    minecraft.idle.markEmpty("test-server-autostop", fifteenMinutesAndOneSecAgo);
    await minecraft.idle.check();
    expect(serverStopped).toBe(true);
    expect(minecraft.idle.getEmptySince("test-server-autostop")).toBeNull();

    await rm(srvDir, { recursive: true, force: true });
    db.delete(mc_servers).where(eq(mc_servers.slug, "test-server-autostop")).run();
  });
});
