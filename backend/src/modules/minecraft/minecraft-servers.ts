import { and, eq } from "drizzle-orm";
import { rm } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_server_permissions, mc_servers, mc_templates } from "../../db/schema/minecraft";
import { ConflictError, orNotFound } from "../../utils/errors";
import type { MinecraftService } from "./index";
import { BASE_DIR } from "./paths";
import { requireText, validateEngine, validateSlug } from "./validation";

export interface NewServerInput {
  slug: string;
  displayName: string;
  engine: string;
  mcVersion: string;
  javaArgs?: string | null;
}

export interface CreateServerInput extends NewServerInput {
  templateId?: number | null;
}

export interface UpdateServerInput {
  displayName?: string;
  javaArgs?: string | null;
  engine?: string;
  mcVersion?: string;
}

export type ServerRow = typeof mc_servers.$inferSelect;

export class MinecraftServers {
  constructor(
    private readonly parts: Pick<
      MinecraftService,
      "dirs" | "downloads" | "lifecycle" | "map" | "players" | "properties" | "templates"
    >,
  ) {}

  exists(slug: string): boolean {
    return !!db.select({ slug: mc_servers.slug }).from(mc_servers).where(eq(mc_servers.slug, slug)).get();
  }

  get(slug: string): ServerRow {
    return orNotFound(db.select().from(mc_servers).where(eq(mc_servers.slug, slug)).get(), "minecraft.serverNotFound");
  }

  rows() {
    return db.select().from(mc_servers).all();
  }

  list() {
    return this.rows().map((s) => ({ ...s, online: this.parts.lifecycle.isRunning(s.slug) }));
  }

  listForUser(userId: number, hasFullAccess: boolean) {
    if (hasFullAccess) return this.list();
    return db
      .select({
        serverId: mc_servers.serverId,
        slug: mc_servers.slug,
        displayName: mc_servers.displayName,
        engine: mc_servers.engine,
        mcVersion: mc_servers.mcVersion,
        serverDir: mc_servers.serverDir,
        javaArgs: mc_servers.javaArgs,
        templateId: mc_servers.templateId,
        createdAt: mc_servers.createdAt,
      })
      .from(mc_servers)
      .innerJoin(mc_server_permissions, eq(mc_servers.serverId, mc_server_permissions.serverId))
      .where(eq(mc_server_permissions.userId, userId))
      .all()
      .map((s) => ({ ...s, online: this.parts.lifecycle.isRunning(s.slug) }));
  }

  canAccess(userId: number, slug: string, hasFullAccess: boolean): boolean {
    if (hasFullAccess) return true;
    const match = db
      .select({ serverId: mc_servers.serverId })
      .from(mc_servers)
      .innerJoin(mc_server_permissions, eq(mc_servers.serverId, mc_server_permissions.serverId))
      .where(and(eq(mc_server_permissions.userId, userId), eq(mc_servers.slug, slug)))
      .get();
    return !!match;
  }

  detail(slug: string) {
    const server = this.get(slug);
    const onlinePlayers = this.parts.players.getOnline(slug);
    const template = server.templateId
      ? (db.select().from(mc_templates).where(eq(mc_templates.templateId, server.templateId)).get() ?? null)
      : null;
    return { ...server, onlinePlayers, template, hasMap: this.parts.map.hasMapMod(server.serverDir) };
  }

  async update(slug: string, data: UpdateServerInput) {
    const server = this.get(slug);

    const updates: Partial<{ displayName: string; javaArgs: string | null; engine: string; mcVersion: string }> = {};
    if (data.displayName !== undefined) {
      updates.displayName = requireText(data.displayName, "minecraft.displayNameRequired");
    }
    if (data.javaArgs !== undefined) {
      updates.javaArgs = data.javaArgs?.trim() || null;
    }
    if (data.engine !== undefined && data.engine !== server.engine) {
      updates.engine = validateEngine(data.engine);
    }
    if (data.mcVersion?.trim() && data.mcVersion !== server.mcVersion) {
      updates.mcVersion = data.mcVersion.trim();
    }

    if (updates.engine || updates.mcVersion) {
      const engine = updates.engine || server.engine;
      const version = updates.mcVersion || server.mcVersion;
      await this.parts.downloads.installJar(engine, version, server.serverDir);
    }

    if (Object.keys(updates).length > 0) {
      db.update(mc_servers).set(updates).where(eq(mc_servers.slug, slug)).run();
    }

    return this.get(slug);
  }

  validateNew(data: NewServerInput) {
    validateSlug(data.slug);
    const displayName = requireText(data.displayName, "minecraft.displayNameRequired");
    const mcVersion = requireText(data.mcVersion, "minecraft.versionRequired");
    const engine = validateEngine(data.engine);
    if (this.exists(data.slug)) throw new ConflictError("minecraft.slugExists");
    return { slug: data.slug, displayName, mcVersion, engine, javaArgs: data.javaArgs || null };
  }

  register(data: ReturnType<MinecraftServers["validateNew"]> & { serverDir: string; templateId?: number | null }) {
    db.insert(mc_servers)
      .values({ ...data, templateId: data.templateId || null })
      .run();
    return this.get(data.slug);
  }

  async create(data: CreateServerInput) {
    const server = this.validateNew(data);
    if (data.templateId) this.parts.templates.get(data.templateId);

    const serverDir = join(BASE_DIR, server.slug);
    await this.parts.dirs.scaffold(serverDir);
    await this.parts.downloads.installJar(server.engine, server.mcVersion, serverDir);
    await this.parts.properties.write(server.slug, this.parts.properties.defaults(server.displayName), serverDir);

    return this.register({ ...server, serverDir, templateId: data.templateId });
  }

  async remove(slug: string, deleteDisk = false) {
    const server = this.get(slug);
    if (this.parts.lifecycle.isRunning(slug)) {
      await this.parts.lifecycle.stopServer(slug);
    }
    db.delete(mc_servers).where(eq(mc_servers.slug, slug)).run();
    if (deleteDisk) {
      await rm(server.serverDir, { recursive: true, force: true });
    }
    return { ok: true };
  }
}
