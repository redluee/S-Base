import { join } from "path";
import { existsSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import db from "../../db/client";
import { mc_player_stats, mc_player_sessions } from "../../db/schema/minecraft";
import { eq, and, isNull } from "drizzle-orm";
import { validateSlug } from "./validation";
import type { MinecraftService } from "./index";

export function parsePlayerEvent(this: MinecraftService, slug: string, line: string) {
  const server = this.getServer(slug);
  if (!server) return;

  const joinMatch = line.match(/UUID of player (\S+) is ([0-9a-fA-F-]+)/);
  if (joinMatch) {
    const [, name, uuid] = joinMatch;
    let stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerUuid, uuid))).get();
    if (!stat) {
      db.insert(mc_player_stats).values({ serverId: server.serverId, playerUuid: uuid, playerName: name }).run();
    } else if (stat.playerName !== name) {
      db.update(mc_player_stats).set({ playerName: name }).where(eq(mc_player_stats.statId, stat.statId)).run();
    }
    // Close any previous open session for this player to prevent duplicates
    db.update(mc_player_sessions).set({ leftAt: new Date().toISOString() }).where(and(eq(mc_player_sessions.serverId, server.serverId), eq(mc_player_sessions.playerUuid, uuid), isNull(mc_player_sessions.leftAt))).run();
    db.insert(mc_player_sessions).values({ serverId: server.serverId, playerUuid: uuid, joinedAt: new Date().toISOString() }).run();
    // Server is no longer empty since a player joined
    this.emptySinceMap.delete(slug);
  }

  const leaveMatch = line.match(/(?:^|:\s*|\s)([A-Za-z0-9_]{1,32})\s+(?:left the game|lost connection)/);
  if (leaveMatch) {
    const [, name] = leaveMatch;
    // find uuid by name from stats
    const stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerName, name))).get();
    if (stat) {
      const openSessions = db.select().from(mc_player_sessions).where(and(eq(mc_player_sessions.serverId, server.serverId), eq(mc_player_sessions.playerUuid, stat.playerUuid), isNull(mc_player_sessions.leftAt))).all();
      const leftAt = new Date().toISOString();
      for (const session of openSessions) {
        db.update(mc_player_sessions).set({ leftAt }).where(eq(mc_player_sessions.sessionId, session.sessionId)).run();
        const ptime = Math.max(0, Math.floor((new Date(leftAt).getTime() - new Date(session.joinedAt).getTime()) / 1000));
        db.update(mc_player_stats).set({ lastSeen: leftAt, totalPlaytime: (stat.totalPlaytime || 0) + ptime }).where(eq(mc_player_stats.statId, stat.statId)).run();
      }
      // If no players are left online, start idle empty timer
      const remainingPlayers = this.getOnlinePlayers(slug);
      if (remainingPlayers.length === 0) {
        this.emptySinceMap.set(slug, Date.now());
      }
    }
  }
}

export async function getPlayers(this: MinecraftService, slug: string) {
  const server = this.getServer(slug);
  if (!server) return { online: [], history: [], banned: [] };
  const online = this.getOnlinePlayers(slug);
  const history = db.select().from(mc_player_stats).where(eq(mc_player_stats.serverId, server.serverId)).all();
  const banned = await this.getBannedPlayers(slug);
  return { online, history, banned };
}

export function getOnlinePlayers(this: MinecraftService, slug: string): (typeof mc_player_stats.$inferSelect)[] {
  const server = this.getServer(slug);
  if (!server) return [];

  const activeSessions = db.select()
    .from(mc_player_sessions)
    .where(and(eq(mc_player_sessions.serverId, server.serverId), isNull(mc_player_sessions.leftAt)))
    .all();

  const activeUuids = Array.from(new Set(activeSessions.map(s => s.playerUuid)));
  if (activeUuids.length === 0) return [];

  const allStats = db.select().from(mc_player_stats).where(eq(mc_player_stats.serverId, server.serverId)).all();
  const statsMap = new Map(allStats.map(s => [s.playerUuid, s]));

  const now = Date.now();
  return activeUuids.map(uuid => {
    const baseStat = statsMap.get(uuid);
    const session = activeSessions.filter(s => s.playerUuid === uuid).sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())[0];
    const liveSessionSeconds = session ? Math.max(0, Math.floor((now - new Date(session.joinedAt).getTime()) / 1000)) : 0;
    const baseTotal = baseStat?.totalPlaytime || 0;

    if (baseStat) {
      return {
        ...baseStat,
        totalPlaytime: baseTotal + liveSessionSeconds,
      };
    }
    return {
      statId: 0,
      serverId: server.serverId,
      playerUuid: uuid,
      playerName: uuid,
      firstSeen: new Date().toISOString(),
      lastSeen: null,
      totalPlaytime: liveSessionSeconds,
    };
  });
}

export function getPlayerName(this: MinecraftService, slug: string, uuid: string) {
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");
  const stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerUuid, uuid))).get();
  return stat?.playerName || uuid;
}

export async function getBannedPlayers(this: MinecraftService, slug: string): Promise<Array<{ uuid: string; name: string; created?: string; expires?: string; reason?: string }>> {
  const server = this.getServer(slug);
  if (!server) return [];
  try {
    const bannedPath = join(server.serverDir, "banned-players.json");
    if (!existsSync(bannedPath)) return [];
    const content = await readFile(bannedPath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export async function opPlayer(this: MinecraftService, slug: string, playerName: string) {
  await this.sendCommand(slug, `op ${playerName}`);
}

export async function deopPlayer(this: MinecraftService, slug: string, playerName: string) {
  await this.sendCommand(slug, `deop ${playerName}`);
}

export async function kickPlayer(this: MinecraftService, slug: string, playerName: string, reason?: string) {
  await this.sendCommand(slug, `kick ${playerName} ${reason || ""}`);
}

export async function banPlayer(this: MinecraftService, slug: string, playerName: string, reason?: string) {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");

  if (this.isRunning(slug)) {
    await this.sendCommand(slug, `ban ${playerName} ${reason || ""}`);
  }

  try {
    const bannedPath = join(server.serverDir, "banned-players.json");
    let list: any[] = [];
    if (existsSync(bannedPath)) {
      try {
        const content = await readFile(bannedPath, "utf-8");
        list = JSON.parse(content);
        if (!Array.isArray(list)) list = [];
      } catch {}
    }
    const stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerName, playerName))).get();
    const uuid = stat?.playerUuid || playerName;
    if (!list.some((item: any) => item.name?.toLowerCase() === playerName.toLowerCase() || (item.uuid && item.uuid === uuid))) {
      list.push({
        uuid,
        name: playerName,
        created: new Date().toISOString(),
        source: "Server",
        expires: "forever",
        reason: reason || "Banned by an operator."
      });
      await writeFile(bannedPath, JSON.stringify(list, null, 2));
    }
  } catch {}
}

export async function unbanPlayer(this: MinecraftService, slug: string, playerUuidOrName: string) {
  validateSlug(slug);
  const server = this.getServer(slug);
  if (!server) throw new Error("Server not found");

  let playerName = playerUuidOrName;
  const stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerUuid, playerUuidOrName))).get();
  if (stat) {
    playerName = stat.playerName;
  }

  if (this.isRunning(slug)) {
    await this.sendCommand(slug, `pardon ${playerName}`);
  }

  try {
    const bannedPath = join(server.serverDir, "banned-players.json");
    if (existsSync(bannedPath)) {
      const content = await readFile(bannedPath, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        const updated = list.filter((item: any) => item.uuid !== playerUuidOrName && item.name?.toLowerCase() !== playerName.toLowerCase());
        await writeFile(bannedPath, JSON.stringify(updated, null, 2));
      }
    }
  } catch {}
}
