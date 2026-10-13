import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { mkdir, writeFile, rm, readdir, copyFile, lstat } from "fs/promises";
import db from "../../db/client";
import { mc_servers, mc_templates, mc_server_permissions } from "../../db/schema/minecraft";
import { eq, and } from "drizzle-orm";
import { BASE_DIR } from "./paths";
import { validateSlug } from "./validation";
import * as map from "./map";
import * as lifecycle from "./lifecycle";
import * as files from "./files";
import * as players from "./players";
import * as templates from "./templates";
import * as importer from "./importer";
export { AIKAR_FLAGS, ZGC_FLAGS, DEFAULT_GC_FLAGS, parseJavaArgs, formatJavaLaunchCommand } from "./launch";

export const DEFAULT_AUTO_SHUTDOWN_MINUTES = 15;
export const DEFAULT_IDLE_CHECK_INTERVAL_MS = 15000;

export class MinecraftService {
  emptySinceMap: Map<string, number> = new Map();
  idleCheckInterval: ReturnType<typeof setInterval> | null = null;
  public autoShutdownMinutes: number = Number(process.env.MC_EMPTY_SHUTDOWN_MINUTES) || DEFAULT_AUTO_SHUTDOWN_MINUTES;

  trackingProcesses: Map<string, any> = new Map();
  versionCache: string[] | null = null;
  versionCacheTime = 0;

  constructor(autoStartMonitor = process.env.NODE_ENV !== "test") {
    if (autoStartMonitor) {
      this.startIdleMonitor();
    }
  }

  startIdleMonitor(intervalMs = DEFAULT_IDLE_CHECK_INTERVAL_MS) {
    if (this.idleCheckInterval) return;
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleServers().catch(() => {});
    }, intervalMs);
  }

  stopIdleMonitor() {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
  }

  getEmptySince(slug: string): number | null {
    return this.emptySinceMap.get(slug) ?? null;
  }

  markEmpty(slug: string, timestamp = Date.now()) {
    this.emptySinceMap.set(slug, timestamp);
  }

  clearEmpty(slug: string) {
    this.emptySinceMap.delete(slug);
  }

  async checkIdleServers() {
    const servers = db.select().from(mc_servers).all();
    const maxIdleMs = Math.max(1, this.autoShutdownMinutes) * 60 * 1000;
    const now = Date.now();

    for (const server of servers) {
      const slug = server.slug;
      if (!this.isRunning(slug)) {
        this.emptySinceMap.delete(slug);
        continue;
      }

      const onlinePlayers = this.getOnlinePlayers(slug);
      if (onlinePlayers.length === 0) {
        if (!this.emptySinceMap.has(slug)) {
          this.emptySinceMap.set(slug, now);
        } else {
          const emptySince = this.emptySinceMap.get(slug)!;
          if (now - emptySince >= maxIdleMs) {
            console.log(`[Minecraft] Server "${slug}" auto-stopping: no players online for ${this.autoShutdownMinutes} minutes.`);
            this.emptySinceMap.delete(slug);
            await this.stopServer(slug);
          }
        }
      } else {
        this.emptySinceMap.delete(slug);
      }
    }
  }

  listServers() {
    const servers = db.select().from(mc_servers).all();
    return servers.map((s) => ({
      ...s,
      online: this.isRunning(s.slug),
    }));
  }

  listServersForUser(userId: number, hasFullAccess: boolean) {
    if (hasFullAccess) {
      return this.listServers();
    }
    const servers = db
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
      .all();

    return servers.map((s) => ({
      ...s,
      online: this.isRunning(s.slug),
    }));
  }

  canUserAccessServer(userId: number, slug: string, hasFullAccess: boolean): boolean {
    if (hasFullAccess) return true;
    const match = db
      .select({ serverId: mc_servers.serverId })
      .from(mc_servers)
      .innerJoin(mc_server_permissions, eq(mc_servers.serverId, mc_server_permissions.serverId))
      .where(and(eq(mc_server_permissions.userId, userId), eq(mc_servers.slug, slug)))
      .get();
    return !!match;
  }

  getServer(slug: string) {
    return db.select().from(mc_servers).where(eq(mc_servers.slug, slug)).get() || null;
  }

  async updateServer(slug: string, data: { displayName?: string; javaArgs?: string | null; engine?: string; mcVersion?: string }) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");

    const updates: Partial<{ displayName: string; javaArgs: string | null; engine: string; mcVersion: string }> = {};
    if (data.displayName !== undefined) {
      if (!data.displayName.trim()) throw new Error("Display name cannot be empty");
      updates.displayName = data.displayName.trim();
    }
    if (data.javaArgs !== undefined) {
      updates.javaArgs = data.javaArgs && data.javaArgs.trim() ? data.javaArgs.trim() : null;
    }
    if (data.engine !== undefined && data.engine !== server.engine) {
      if (data.engine !== "vanilla" && data.engine !== "fabric") {
        throw new Error("Unsupported engine: must be vanilla or fabric");
      }
      updates.engine = data.engine;
    }
    if (data.mcVersion !== undefined && data.mcVersion.trim() && data.mcVersion !== server.mcVersion) {
      updates.mcVersion = data.mcVersion.trim();
    }

    if (updates.engine || updates.mcVersion) {
      const targetEngine = updates.engine || server.engine;
      const targetVersion = updates.mcVersion || server.mcVersion;
      if (targetEngine === "vanilla") {
        await this.downloadVanillaJar(targetVersion, server.serverDir);
      } else if (targetEngine === "fabric") {
        await this.downloadFabricJar(targetVersion, server.serverDir);
      }
    }

    if (Object.keys(updates).length > 0) {
      db.update(mc_servers)
        .set(updates)
        .where(eq(mc_servers.slug, slug))
        .run();
    }

    return this.getServer(slug);
  }

  getServerLevelName(serverDir: string): string {
    try {
      const propPath = join(serverDir, "server.properties");
      if (existsSync(propPath)) {
        const content = readFileSync(propPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf("=");
          if (idx > -1) {
            const key = trimmed.substring(0, idx).trim();
            if (key === "level-name") {
              const val = trimmed.substring(idx + 1).trim();
              if (val) return val;
            }
          }
        }
      }
    } catch {}
    return "world";
  }

  async ensureDatapacksDir(serverDir: string): Promise<string> {
    const levelName = this.getServerLevelName(serverDir);
    const worldDir = join(serverDir, levelName);
    const worldDatapacksDir = join(worldDir, "datapacks");
    await mkdir(worldDatapacksDir, { recursive: true });

    const rootDatapacksDir = join(serverDir, "datapacks");
    if (existsSync(rootDatapacksDir)) {
      try {
        const rootStat = await lstat(rootDatapacksDir);
        if (rootStat.isDirectory() && !rootStat.isSymbolicLink()) {
          const files = await readdir(rootDatapacksDir);
          for (const f of files) {
            const srcPath = join(rootDatapacksDir, f);
            const dstPath = join(worldDatapacksDir, f);
            if (!existsSync(dstPath)) {
              try {
                await copyFile(srcPath, dstPath);
              } catch {}
            }
          }
        }
      } catch {}
    }

    return worldDatapacksDir;
  }

  async getServerSubdir(serverDir: string, type: string): Promise<string> {
    if (type === "datapacks") {
      return this.ensureDatapacksDir(serverDir);
    }
    const targetDir = join(serverDir, type);
    await mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  async createServer(data: { slug: string, displayName: string, engine: string, mcVersion: string, javaArgs?: string, templateId?: number }) {
    validateSlug(data.slug);
    const serverDir = join(BASE_DIR, data.slug);
    await mkdir(serverDir, { recursive: true });
    await writeFile(join(serverDir, "eula.txt"), "eula=true\n");
    
    // Scaffolding dirs
    await mkdir(join(serverDir, "mods"), { recursive: true });
    await mkdir(join(serverDir, "resourcepacks"), { recursive: true });
    await mkdir(join(serverDir, "logs"), { recursive: true });
    await mkdir(join(serverDir, "world"), { recursive: true });
    await this.ensureDatapacksDir(serverDir);

    if (data.engine === "vanilla") {
      await this.downloadVanillaJar(data.mcVersion, serverDir);
    } else if (data.engine === "fabric") {
      await this.downloadFabricJar(data.mcVersion, serverDir);
    }
    
    const props = this.generateDefaultProperties(data.displayName);
    await this.writeProperties(data.slug, props, serverDir);

    db.insert(mc_servers).values({
      slug: data.slug,
      displayName: data.displayName,
      engine: data.engine,
      mcVersion: data.mcVersion,
      javaArgs: data.javaArgs || null,
      templateId: data.templateId || null,
      serverDir
    }).run();

    return this.getServer(data.slug);
  }

  async deleteServer(slug: string, deleteDisk = false) {
    validateSlug(slug);
    if (this.isRunning(slug)) {
      await this.stopServer(slug);
    }
    const server = this.getServer(slug);
    if (server) {
      db.delete(mc_servers).where(eq(mc_servers.slug, slug)).run();
      if (deleteDisk) {
        await rm(server.serverDir, { recursive: true, force: true });
      }
    }
    return { ok: true };
  }

  getServerDetail(slug: string) {
    const server = this.getServer(slug);
    if (!server) return null;
    const players = this.getOnlinePlayers(slug);
    let template = null;
    if (server.templateId) {
      template = db.select().from(mc_templates).where(eq(mc_templates.templateId, server.templateId)).get();
    }
    const hasMap = this.hasMapMod(server.serverDir);
    return { ...server, onlinePlayers: players, template, hasMap };
  }

  getMapWebDir = map.getMapWebDir;
  hasMapMod = map.hasMapMod;
  getMapStatus = map.getMapStatus;
  serveMapFile = map.serveMapFile;
  getServerPids = lifecycle.getServerPids;
  startServer = lifecycle.startServer;
  startPlayerTracking = lifecycle.startPlayerTracking;
  stopServer = lifecycle.stopServer;
  restartServer = lifecycle.restartServer;
  getStatus = lifecycle.getStatus;
  isRunning = lifecycle.isRunning;
  getConsoleLogs = lifecycle.getConsoleLogs;
  sendCommand = lifecycle.sendCommand;
  readProperties = files.readProperties;
  writeProperties = files.writeProperties;
  generateDefaultProperties = files.generateDefaultProperties;
  listFiles = files.listFiles;
  uploadFile = files.uploadFile;
  deleteFile = files.deleteFile;
  copyFileFromServer = files.copyFileFromServer;
  downloadVanillaJar = files.downloadVanillaJar;
  downloadFabricJar = files.downloadFabricJar;
  listAvailableVersions = files.listAvailableVersions;
  parsePlayerEvent = players.parsePlayerEvent;
  getPlayers = players.getPlayers;
  getOnlinePlayers = players.getOnlinePlayers;
  getPlayerName = players.getPlayerName;
  getBannedPlayers = players.getBannedPlayers;
  opPlayer = players.opPlayer;
  deopPlayer = players.deopPlayer;
  kickPlayer = players.kickPlayer;
  banPlayer = players.banPlayer;
  unbanPlayer = players.unbanPlayer;
  listTemplates = templates.listTemplates;
  getTemplate = templates.getTemplate;
  saveAsTemplate = templates.saveAsTemplate;
  createCustomTemplate = templates.createCustomTemplate;
  listTemplateFiles = templates.listTemplateFiles;
  uploadTemplateFile = templates.uploadTemplateFile;
  deleteTemplateFile = templates.deleteTemplateFile;
  deleteTemplate = templates.deleteTemplate;
  speedrunFromTemplate = templates.speedrunFromTemplate;
  getStartupError = importer.getStartupError;
  inspectServerDirectory = importer.inspectServerDirectory;
  scanUnregisteredServers = importer.scanUnregisteredServers;
  importServer = importer.importServer;
}
