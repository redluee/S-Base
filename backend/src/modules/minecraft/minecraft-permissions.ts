import { and, eq, inArray } from "drizzle-orm";
import db from "../../db/client";
import { mc_server_permissions, mc_servers } from "../../db/schema/minecraft";

export class MinecraftPermissions {
  slugsByUser(userIds: number[]): Map<number, string[]> {
    const map = new Map<number, string[]>();
    if (userIds.length === 0) return map;
    const rows = db
      .select({ userId: mc_server_permissions.userId, slug: mc_servers.slug })
      .from(mc_server_permissions)
      .innerJoin(mc_servers, eq(mc_server_permissions.serverId, mc_servers.serverId))
      .where(inArray(mc_server_permissions.userId, userIds))
      .all();
    for (const row of rows) map.set(row.userId, [...(map.get(row.userId) ?? []), row.slug]);
    return map;
  }

  serverIdsOf(userId: number): Set<number> {
    const rows = db
      .select({ serverId: mc_server_permissions.serverId })
      .from(mc_server_permissions)
      .where(eq(mc_server_permissions.userId, userId))
      .all();
    return new Set(rows.map((r) => r.serverId));
  }

  setServerPermissions(userId: number, slugs: string[]): void {
    db.transaction((tx) => {
      tx.delete(mc_server_permissions).where(eq(mc_server_permissions.userId, userId)).run();
      if (slugs.length === 0) return;
      const targets = tx
        .select({ serverId: mc_servers.serverId })
        .from(mc_servers)
        .where(inArray(mc_servers.slug, slugs))
        .all();
      for (const t of targets) tx.insert(mc_server_permissions).values({ userId, serverId: t.serverId }).run();
    });
  }

  grant(userId: number, serverId: number): boolean {
    if (this.has(userId, serverId)) return false;
    db.insert(mc_server_permissions).values({ userId, serverId }).run();
    return true;
  }

  revoke(userId: number, serverId: number): boolean {
    if (!this.has(userId, serverId)) return false;
    db.delete(mc_server_permissions)
      .where(and(eq(mc_server_permissions.userId, userId), eq(mc_server_permissions.serverId, serverId)))
      .run();
    return true;
  }

  private has(userId: number, serverId: number): boolean {
    return !!db
      .select({ userId: mc_server_permissions.userId })
      .from(mc_server_permissions)
      .where(and(eq(mc_server_permissions.userId, userId), eq(mc_server_permissions.serverId, serverId)))
      .get();
  }
}
