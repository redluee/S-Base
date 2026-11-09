import { and, eq, isNull } from "drizzle-orm";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_player_sessions, mc_player_stats } from "../../db/schema/minecraft";
import type { MinecraftParts } from "./minecraft-parts";

type PlayerStat = typeof mc_player_stats.$inferSelect;

export interface BannedPlayer {
  uuid: string;
  name: string;
  created?: string;
  expires?: string;
  reason?: string;
  source?: string;
}

async function readBanList(path: string): Promise<BannedPlayer[]> {
  if (!existsSync(path)) return [];
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf-8"));
    return Array.isArray(parsed) ? (parsed as BannedPlayer[]) : [];
  } catch {
    return [];
  }
}

export class MinecraftPlayers {
  constructor(private readonly parts: MinecraftParts) {}

  private statByUuid(serverId: number, uuid: string) {
    return db
      .select()
      .from(mc_player_stats)
      .where(and(eq(mc_player_stats.serverId, serverId), eq(mc_player_stats.playerUuid, uuid)))
      .get();
  }

  parseEvent(slug: string, line: string) {
    const server = this.parts.servers.findBySlug(slug);
    if (!server) return;

    const joinMatch = line.match(/UUID of player (\S+) is ([0-9a-fA-F-]+)/);
    if (joinMatch) {
      const [, name, uuid] = joinMatch;
      const stat = this.statByUuid(server.serverId, uuid);
      if (!stat) {
        db.insert(mc_player_stats).values({ serverId: server.serverId, playerUuid: uuid, playerName: name }).run();
      } else if (stat.playerName !== name) {
        db.update(mc_player_stats).set({ playerName: name }).where(eq(mc_player_stats.statId, stat.statId)).run();
      }
      const joinedAt = new Date().toISOString();
      db.update(mc_player_sessions)
        .set({ leftAt: joinedAt })
        .where(and(eq(mc_player_sessions.serverId, server.serverId), eq(mc_player_sessions.playerUuid, uuid), isNull(mc_player_sessions.leftAt)))
        .run();
      db.insert(mc_player_sessions).values({ serverId: server.serverId, playerUuid: uuid, joinedAt }).run();
      this.parts.idle.clearEmpty(slug);
    }

    const leaveMatch = line.match(/(?:^|:\s*|\s)([A-Za-z0-9_]{1,32})\s+(?:left the game|lost connection)/);
    if (leaveMatch) {
      const stat = db
        .select()
        .from(mc_player_stats)
        .where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerName, leaveMatch[1])))
        .get();
      if (stat) this.closeSessions(slug, server.serverId, stat);
    }
  }

  private closeSessions(slug: string, serverId: number, stat: PlayerStat) {
    const open = db
      .select()
      .from(mc_player_sessions)
      .where(and(eq(mc_player_sessions.serverId, serverId), eq(mc_player_sessions.playerUuid, stat.playerUuid), isNull(mc_player_sessions.leftAt)))
      .all();
    const leftAt = new Date().toISOString();
    for (const session of open) {
      db.update(mc_player_sessions).set({ leftAt }).where(eq(mc_player_sessions.sessionId, session.sessionId)).run();
      const seconds = Math.max(0, Math.floor((new Date(leftAt).getTime() - new Date(session.joinedAt).getTime()) / 1000));
      db.update(mc_player_stats)
        .set({ lastSeen: leftAt, totalPlaytime: (stat.totalPlaytime || 0) + seconds })
        .where(eq(mc_player_stats.statId, stat.statId))
        .run();
    }
    if (this.getOnline(slug).length === 0) this.parts.idle.markEmpty(slug);
  }

  async list(slug: string) {
    const server = this.parts.servers.get(slug);
    const online = this.getOnline(slug);
    const history = db.select().from(mc_player_stats).where(eq(mc_player_stats.serverId, server.serverId)).all();
    const banned = await this.getBanned(slug);
    return { online, history, banned };
  }

  getOnline(slug: string): PlayerStat[] {
    const server = this.parts.servers.findBySlug(slug);
    if (!server) return [];

    const activeSessions = db
      .select()
      .from(mc_player_sessions)
      .where(and(eq(mc_player_sessions.serverId, server.serverId), isNull(mc_player_sessions.leftAt)))
      .all();
    const activeUuids = Array.from(new Set(activeSessions.map((s) => s.playerUuid)));
    if (activeUuids.length === 0) return [];

    const statsMap = new Map(
      db.select().from(mc_player_stats).where(eq(mc_player_stats.serverId, server.serverId)).all().map((s) => [s.playerUuid, s]),
    );

    const now = Date.now();
    return activeUuids.map((uuid) => {
      const baseStat = statsMap.get(uuid);
      const session = activeSessions
        .filter((s) => s.playerUuid === uuid)
        .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())[0];
      const live = session ? Math.max(0, Math.floor((now - new Date(session.joinedAt).getTime()) / 1000)) : 0;
      if (baseStat) return { ...baseStat, totalPlaytime: (baseStat.totalPlaytime || 0) + live };
      return {
        statId: 0,
        serverId: server.serverId,
        playerUuid: uuid,
        playerName: uuid,
        firstSeen: new Date().toISOString(),
        lastSeen: null,
        totalPlaytime: live,
      };
    });
  }

  async getBanned(slug: string): Promise<BannedPlayer[]> {
    const server = this.parts.servers.findBySlug(slug);
    if (!server) return [];
    return readBanList(join(server.serverDir, "banned-players.json"));
  }

  private resolveName(slug: string, uuid: string) {
    const server = this.parts.servers.get(slug);
    return this.statByUuid(server.serverId, uuid)?.playerName || uuid;
  }

  async op(slug: string, uuid: string) {
    await this.parts.lifecycle.sendCommand(slug, `op ${this.resolveName(slug, uuid)}`);
    return { ok: true };
  }

  async deop(slug: string, uuid: string) {
    await this.parts.lifecycle.sendCommand(slug, `deop ${this.resolveName(slug, uuid)}`);
    return { ok: true };
  }

  async kick(slug: string, uuid: string, reason?: string) {
    await this.parts.lifecycle.sendCommand(slug, `kick ${this.resolveName(slug, uuid)} ${reason || ""}`);
    return { ok: true };
  }

  async ban(slug: string, uuid: string, reason?: string) {
    const server = this.parts.servers.get(slug);
    const playerName = this.resolveName(slug, uuid);

    if (this.parts.lifecycle.isRunning(slug)) {
      await this.parts.lifecycle.sendCommand(slug, `ban ${playerName} ${reason || ""}`);
    }

    try {
      const bannedPath = join(server.serverDir, "banned-players.json");
      const list = await readBanList(bannedPath);
      const alreadyBanned = list.some((item) => item.name?.toLowerCase() === playerName.toLowerCase() || item.uuid === uuid);
      if (!alreadyBanned) {
        list.push({
          uuid,
          name: playerName,
          created: new Date().toISOString(),
          expires: "forever",
          reason: reason || "Banned by an operator.",
          source: "Server",
        });
        await writeFile(bannedPath, JSON.stringify(list, null, 2));
      }
    } catch {}
    return { ok: true };
  }

  async unban(slug: string, uuid: string) {
    const server = this.parts.servers.get(slug);
    const playerName = this.resolveName(slug, uuid);

    if (this.parts.lifecycle.isRunning(slug)) {
      await this.parts.lifecycle.sendCommand(slug, `pardon ${playerName}`);
    }

    try {
      const bannedPath = join(server.serverDir, "banned-players.json");
      if (existsSync(bannedPath)) {
        const updated = (await readBanList(bannedPath)).filter(
          (item) => item.uuid !== uuid && item.name?.toLowerCase() !== playerName.toLowerCase(),
        );
        await writeFile(bannedPath, JSON.stringify(updated, null, 2));
      }
    } catch {}
    return { ok: true };
  }
}
