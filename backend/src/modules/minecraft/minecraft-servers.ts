import { and, eq } from "drizzle-orm";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import db from "../../db/client";
import { mc_server_permissions, mc_servers, mc_templates } from "../../db/schema/minecraft";
import { ConflictError, orNotFound } from "../../utils/errors";
import type { MinecraftParts } from "./minecraft-parts";
import { BASE_DIR } from "./paths";
import { requireText, validateEngine, validateSlug } from "./validation";

export interface CreateServerInput {
  slug: string;
  displayName: string;
  engine: string;
  mcVersion: string;
  javaArgs?: string | null;
  templateId?: number | null;
}

export interface UpdateServerInput {
  displayName?: string;
  javaArgs?: string | null;
  engine?: string;
  mcVersion?: string;
}

export class MinecraftServers {
  constructor(private readonly parts: MinecraftParts) {}

  findBySlug(slug: string) {
    return db.select().from(mc_servers).where(eq(mc_servers.slug, slug)).get() ?? null;
  }

  get(slug: string) {
    return orNotFound(this.findBySlug(slug), "minecraft.serverNotFound");
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

  async create(data: CreateServerInput) {
    validateSlug(data.slug);
    const displayName = requireText(data.displayName, "minecraft.displayNameRequired");
    const mcVersion = requireText(data.mcVersion, "minecraft.versionRequired");
    const engine = validateEngine(data.engine);
    if (this.findBySlug(data.slug)) throw new ConflictError("minecraft.slugExists");
    if (data.templateId) this.parts.templates.get(data.templateId);

    const serverDir = join(BASE_DIR, data.slug);
    await mkdir(serverDir, { recursive: true });
    await writeFile(join(serverDir, "eula.txt"), "eula=true\n");

    for (const dir of ["mods", "resourcepacks", "logs", "world"]) {
      await mkdir(join(serverDir, dir), { recursive: true });
    }
    await this.parts.dirs.ensureDatapacksDir(serverDir);

    await this.parts.downloads.installJar(engine, mcVersion, serverDir);

    const props = this.parts.properties.defaults(displayName);
    await this.parts.properties.write(data.slug, props, serverDir);

    db.insert(mc_servers)
      .values({
        slug: data.slug,
        displayName,
        engine,
        mcVersion,
        javaArgs: data.javaArgs || null,
        templateId: data.templateId || null,
        serverDir,
      })
      .run();

    return this.get(data.slug);
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
