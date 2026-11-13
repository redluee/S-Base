import { and, eq, isNull } from "drizzle-orm";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import db from "../../db/client";
import { mc_player_sessions, mc_player_stats } from "../../db/schema/minecraft";
import type { MinecraftService } from "./index";
import { bannedPlayersPath } from "./server-layout";

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
  constructor(private readonly parts: Pick<MinecraftService, "idle" | "lifecycle" | "servers">) {}

  private statByUuid(serverId: number, uuid: string) {
    return db
      .select()
      .from(mc_player_stats)
      .where(and(eq(mc_player_stats.serverId, serverId), eq(mc_player_stats.playerUuid, uuid)))
      .get();
  }

  parseEvent(slug: string, line: string) {
    const server = this.parts.servers.get(slug);

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
        .where(
          and(
            eq(mc_player_sessions.serverId, server.serverId),
            eq(mc_player_sessions.playerUuid, uuid),
            isNull(mc_player_sessions.leftAt),
          ),
        )
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
      if (stat) {
        this.closeOpenSessions(server.serverId, stat.playerUuid);
        if (this.getOnline(slug).length === 0) this.parts.idle.markEmpty(slug);
      }
    }
  }

  closeOpenSessions(serverId: number, playerUuid?: string) {
    const filters = [eq(mc_player_sessions.serverId, serverId), isNull(mc_player_sessions.leftAt)];
    if (playerUuid) filters.push(eq(mc_player_sessions.playerUuid, playerUuid));
    const open = db
      .select()
      .from(mc_player_sessions)
      .where(and(...filters))
      .all();
    const leftAt = new Date().toISOString();
    for (const session of open) {
      db.update(mc_player_sessions).set({ leftAt }).where(eq(mc_player_sessions.sessionId, session.sessionId)).run();
      const stat = this.statByUuid(serverId, session.playerUuid);
      if (!stat) continue;
      const seconds = Math.max(0, Math.floor((Date.parse(leftAt) - Date.parse(session.joinedAt)) / 1000));
      db.update(mc_player_stats)
        .set({ lastSeen: leftAt, totalPlaytime: (stat.totalPlaytime || 0) + seconds })
        .where(eq(mc_player_stats.statId, stat.statId))
        .run();
    }
  }

  async list(slug: string) {
    const server = this.parts.servers.get(slug);
    const online = this.getOnline(slug);
    const history = db.select().from(mc_player_stats).where(eq(mc_player_stats.serverId, server.serverId)).all();
    const banned = await readBanList(bannedPlayersPath(server.serverDir));
    return { online, history, banned };
  }

  getOnline(slug: string): PlayerStat[] {
    const server = this.parts.servers.get(slug);

    const activeSessions = db
      .select()
      .from(mc_player_sessions)
      .where(and(eq(mc_player_sessions.serverId, server.serverId), isNull(mc_player_sessions.leftAt)))
      .all();
    const activeUuids = Array.from(new Set(activeSessions.map((s) => s.playerUuid)));
    if (activeUuids.length === 0) return [];

    const statsMap = new Map(
      db
        .select()
        .from(mc_player_stats)
        .where(eq(mc_player_stats.serverId, server.serverId))
        .all()
        .map((s) => [s.playerUuid, s]),
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

    const bannedPath = bannedPlayersPath(server.serverDir);
    const list = await readBanList(bannedPath);
    const alreadyBanned = list.some(
      (item) => item.name?.toLowerCase() === playerName.toLowerCase() || item.uuid === uuid,
    );
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
    return { ok: true };
  }

  async unban(slug: string, uuid: string) {
    const server = this.parts.servers.get(slug);
    const playerName = this.resolveName(slug, uuid);

    if (this.parts.lifecycle.isRunning(slug)) {
      await this.parts.lifecycle.sendCommand(slug, `pardon ${playerName}`);
    }

    const bannedPath = bannedPlayersPath(server.serverDir);
    if (existsSync(bannedPath)) {
      const updated = (await readBanList(bannedPath)).filter(
        (item) => item.uuid !== uuid && item.name?.toLowerCase() !== playerName.toLowerCase(),
      );
      await writeFile(bannedPath, JSON.stringify(updated, null, 2));
    }
    return { ok: true };
  }
}
