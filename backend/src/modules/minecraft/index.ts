import { join, resolve, basename } from "path";
import { homedir } from "os";
import { existsSync, readdirSync, readlinkSync, readFileSync } from "fs";
import { mkdir, writeFile, readFile, rm, unlink, readdir, copyFile, stat } from "fs/promises";
import db from "../../db/client";
import { mc_servers, mc_templates, mc_template_files, mc_player_stats, mc_player_sessions, mc_server_permissions } from "../../db/schema/minecraft";
import { eq, and, isNull } from "drizzle-orm";

const BASE_DIR = process.env.MC_SERVERS_DIR || process.env.MINECRAFT_DIR || join(homedir(), "minecraft", "servers");
const TEMPLATES_DIR = process.env.MC_TEMPLATES_DIR || process.env.MINECRAFT_TEMPLATES_DIR || join(BASE_DIR, "..", "templates");

function validateSlug(slug: string): void {
  if (!/^[a-z0-9-]{3,32}$/.test(slug)) {
    throw new Error("Invalid server slug: must be 3-32 chars, lowercase letters, digits, hyphens only");
  }
}

function sanitizeCommand(cmd: string): string {
  return cmd.replace(/[\r\n;`$&|<>]/g, "").trim().slice(0, 512);
}

const ALLOWED_EXTENSIONS = [".jar", ".zip"];
function validateFilename(filename: string): void {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error("Invalid file type");
  if (filename.includes("/") || filename.includes("..")) throw new Error("Invalid filename");
}

export function parseJavaArgs(rawArgs?: string | null): string[] {
  if (!rawArgs) return [];
  const trimmed = rawArgs.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {}
  }
  return trimmed.split(/\s+/).map((x) => x.trim()).filter(Boolean);
}

export function formatJavaLaunchCommand(engine: string, serverDir: string, rawJavaArgs?: string | null): string {
  const parsedArgs = parseJavaArgs(rawJavaArgs);
  const hasXmx = parsedArgs.some((a) => /^-Xmx/i.test(a));
  const hasXms = parsedArgs.some((a) => /^-Xms/i.test(a));

  const memFlags: string[] = [];
  if (!hasXms) memFlags.push("-Xms512M");
  if (!hasXmx) memFlags.push("-Xmx2G");

  const fullArgs = [...memFlags, ...parsedArgs];
  const hasFabricJar = existsSync(join(serverDir, "fabric-server-launch.jar"));
  const jarFile = engine === "fabric" && hasFabricJar ? "fabric-server-launch.jar" : "server.jar";

  return `java ${fullArgs.join(" ")} -jar ${jarFile} nogui`.replace(/\s+/g, " ").trim();
}

export class MinecraftService {
  listServers() {
    return db.select().from(mc_servers).all();
  }

  listServersForUser(userId: number, hasFullAccess: boolean) {
    if (hasFullAccess) {
      return db.select().from(mc_servers).all();
    }
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
      .all();
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

  async updateServer(slug: string, data: { displayName?: string; javaArgs?: string | null }) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");

    const updates: Partial<{ displayName: string; javaArgs: string | null }> = {};
    if (data.displayName !== undefined) {
      if (!data.displayName.trim()) throw new Error("Display name cannot be empty");
      updates.displayName = data.displayName.trim();
    }
    if (data.javaArgs !== undefined) {
      updates.javaArgs = data.javaArgs && data.javaArgs.trim() ? data.javaArgs.trim() : null;
    }

    if (Object.keys(updates).length > 0) {
      db.update(mc_servers)
        .set(updates)
        .where(eq(mc_servers.slug, slug))
        .run();
    }

    return this.getServer(slug);
  }


  async createServer(data: { slug: string, displayName: string, engine: string, mcVersion: string, javaArgs?: string, templateId?: number }) {
    validateSlug(data.slug);
    const serverDir = join(BASE_DIR, data.slug);
    await mkdir(serverDir, { recursive: true });
    await writeFile(join(serverDir, "eula.txt"), "eula=true\n");
    
    // Scaffolding dirs
    await mkdir(join(serverDir, "mods"), { recursive: true });
    await mkdir(join(serverDir, "datapacks"), { recursive: true });
    await mkdir(join(serverDir, "resourcepacks"), { recursive: true });
    await mkdir(join(serverDir, "logs"), { recursive: true });
    await mkdir(join(serverDir, "world"), { recursive: true });

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
    return { ...server, onlinePlayers: players, template };
  }

  getServerPids(serverDir: string): number[] {
    const normTarget = resolve(serverDir);
    const pids = new Set<number>();

    try {
      if (existsSync("/proc")) {
        const entries = readdirSync("/proc");
        for (const entry of entries) {
          if (!/^\d+$/.test(entry)) continue;
          const pid = parseInt(entry, 10);
          if (pid === process.pid) continue;
          try {
            const cwd = readlinkSync(`/proc/${pid}/cwd`);
            if (resolve(cwd) === normTarget) {
              pids.add(pid);
              continue;
            }
          } catch {}
          try {
            const cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf-8");
            if (cmdline.includes(normTarget)) {
              pids.add(pid);
            }
          } catch {}
        }
      }
    } catch {}

    if (pids.size === 0) {
      try {
        const p = Bun.spawnSync(["pgrep", "-f", normTarget]);
        if (p.exitCode === 0) {
          const lines = p.stdout.toString().split("\n").filter(Boolean);
          for (const l of lines) {
            const pid = parseInt(l.trim(), 10);
            if (!isNaN(pid) && pid !== process.pid) {
              pids.add(pid);
            }
          }
        }
      } catch {}
    }

    return Array.from(pids);
  }

  async startServer(slug: string) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    
    const sessionName = `mc-${slug}`;
    const checkTmux = Bun.spawnSync(["tmux", "has-session", "-t", sessionName]);
    if (checkTmux.exitCode === 0) {
      Bun.spawnSync(["tmux", "kill-session", "-t", sessionName]);
    }

    const strayPids = this.getServerPids(server.serverDir);
    for (const pid of strayPids) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }

    const cmdStr = formatJavaLaunchCommand(server.engine, server.serverDir, server.javaArgs);
    
    Bun.spawnSync(["tmux", "new-session", "-d", "-s", sessionName, "-c", server.serverDir, cmdStr]);
    
    // Background tail logic for tracking
    this.startPlayerTracking(slug, server.serverDir);
    
    return { ok: true };
  }
  
  private trackingProcesses: Map<string, any> = new Map();

  async startPlayerTracking(slug: string, serverDir: string) {
    if (this.trackingProcesses.has(slug)) {
      try {
        this.trackingProcesses.get(slug)?.kill();
      } catch {}
      this.trackingProcesses.delete(slug);
    }
    const logPath = join(serverDir, "logs", "latest.log");
    try {
      const proc = Bun.spawn(["tail", "-F", "-n", "0", logPath], {
        stdout: "pipe",
        stderr: "ignore",
      });
      this.trackingProcesses.set(slug, proc);
      (async () => {
        try {
          const reader = proc.stdout.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.trim()) {
                this.parsePlayerEvent(slug, line);
              }
            }
          }
        } catch {}
      })();
    } catch {}
  }

  async stopServer(slug: string) {
    validateSlug(slug);
    if (this.trackingProcesses.has(slug)) {
      try {
        this.trackingProcesses.get(slug)?.kill();
      } catch {}
      this.trackingProcesses.delete(slug);
    }
    const server = this.getServer(slug);
    if (server) {
      const now = new Date().toISOString();
      const openSessions = db.select().from(mc_player_sessions).where(and(eq(mc_player_sessions.serverId, server.serverId), isNull(mc_player_sessions.leftAt))).all();
      for (const session of openSessions) {
        db.update(mc_player_sessions).set({ leftAt: now }).where(eq(mc_player_sessions.sessionId, session.sessionId)).run();
        const stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerUuid, session.playerUuid))).get();
        if (stat) {
          const ptime = Math.max(0, Math.floor((new Date(now).getTime() - new Date(session.joinedAt).getTime()) / 1000));
          db.update(mc_player_stats).set({ lastSeen: now, totalPlaytime: (stat.totalPlaytime || 0) + ptime }).where(eq(mc_player_stats.statId, stat.statId)).run();
        }
      }
    }

    const sessionName = `mc-${slug}`;
    const checkTmux = Bun.spawnSync(["tmux", "has-session", "-t", sessionName]);
    if (checkTmux.exitCode === 0) {
      Bun.spawnSync(["tmux", "send-keys", "-t", sessionName, "stop", "C-m"]);
    }

    const serverDir = server?.serverDir;
    const startTime = Date.now();
    const maxGracefulMs = 20000;

    while (Date.now() - startTime < maxGracefulMs) {
      const isTmuxAlive = Bun.spawnSync(["tmux", "has-session", "-t", sessionName]).exitCode === 0;
      const pids = serverDir ? this.getServerPids(serverDir) : [];
      if (!isTmuxAlive && pids.length === 0) {
        return { ok: true };
      }
      await new Promise(r => setTimeout(r, 400));
    }

    // Terminate remaining processes and tmux session if still active after timeout
    if (serverDir) {
      const pids = this.getServerPids(serverDir);
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {}
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    if (serverDir) {
      const pids = this.getServerPids(serverDir);
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
    }

    const checkTmuxFinal = Bun.spawnSync(["tmux", "has-session", "-t", sessionName]);
    if (checkTmuxFinal.exitCode === 0) {
      Bun.spawnSync(["tmux", "kill-session", "-t", sessionName]);
    }

    return { ok: true };
  }

  async restartServer(slug: string) {
    await this.stopServer(slug);
    await new Promise(r => setTimeout(r, 1000));
    return this.startServer(slug);
  }

  getStatus(slug: string) {
    validateSlug(slug);
    const isOnline = this.isRunning(slug);
    return { online: isOnline, playerCount: isOnline ? this.getOnlinePlayers(slug).length : 0 };
  }

  isRunning(slug: string): boolean {
    validateSlug(slug);
    const server = this.getServer(slug);
    const check = Bun.spawnSync(["tmux", "has-session", "-t", `mc-${slug}`]);
    if (check.exitCode === 0) {
      return true;
    }
    if (server?.serverDir) {
      const pids = this.getServerPids(server.serverDir);
      if (pids.length > 0) {
        return true;
      }
    }
    return false;
  }

  async getConsoleLogs(slug: string, lines = 100) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) return [];
    try {
      const p = Bun.spawnSync(["tail", "-n", lines.toString(), join(server.serverDir, "logs", "latest.log")]);
      return p.stdout.toString().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  async sendCommand(slug: string, command: string) {
    validateSlug(slug);
    const safeCmd = sanitizeCommand(command);
    Bun.spawnSync(["tmux", "send-keys", "-t", `mc-${slug}`, safeCmd, "C-m"]);
  }

  async readProperties(slug: string) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    try {
      const content = await readFile(join(server.serverDir, "server.properties"), "utf-8");
      const lines = content.split("\n");
      const props: Record<string, string> = {};
      for (const line of lines) {
        if (line.trim().startsWith("#") || !line.trim()) continue;
        const idx = line.indexOf("=");
        if (idx > -1) {
          props[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
      }
      return props;
    } catch {
      return {};
    }
  }

  async writeProperties(slug: string, props: Record<string, string>, srvDir?: string) {
    validateSlug(slug);
    const serverDir = srvDir || this.getServer(slug)?.serverDir;
    if (!serverDir) throw new Error("Server not found");
    
    let existingLines: string[] = [];
    try {
      existingLines = (await readFile(join(serverDir, "server.properties"), "utf-8")).split("\n");
    } catch {
      // not exists
    }
    
    const newProps = { ...props };
    const outLines = [];
    
    for (const line of existingLines) {
      if (line.trim().startsWith("#") || !line.trim()) {
        outLines.push(line);
        continue;
      }
      const idx = line.indexOf("=");
      if (idx > -1) {
        const key = line.substring(0, idx).trim();
        if (key in newProps) {
          outLines.push(`${key}=${newProps[key]}`);
          delete newProps[key];
        } else {
          outLines.push(line);
        }
      } else {
        outLines.push(line);
      }
    }
    
    for (const [k, v] of Object.entries(newProps)) {
      outLines.push(`${k}=${v}`);
    }
    
    await writeFile(join(serverDir, "server.properties"), outLines.join("\n"));

    if (this.isRunning(slug)) {
      if (props.difficulty) {
        await this.sendCommand(slug, `difficulty ${props.difficulty}`);
      }
      if (props.gamemode) {
        await this.sendCommand(slug, `defaultgamemode ${props.gamemode}`);
      }
      if (props["white-list"] !== undefined) {
        const mode = props["white-list"] === "true" ? "on" : "off";
        await this.sendCommand(slug, `whitelist ${mode}`);
        if (mode === "on") {
          await this.sendCommand(slug, "whitelist reload");
        }
      }
      if (props["player-idle-timeout"] !== undefined) {
        await this.sendCommand(slug, `setidletimeout ${props["player-idle-timeout"] || "0"}`);
      }
      if (props["do-fire-tick"] !== undefined || props["doFireTick"] !== undefined) {
        const val = props["do-fire-tick"] ?? props["doFireTick"];
        await this.sendCommand(slug, `gamerule doFireTick ${val === "false" ? "false" : "true"}`);
      }
    }
  }

  generateDefaultProperties(serverName: string, seed?: string) {
    const p: Record<string, string> = {
      "server-name": serverName,
      "motd": `A Minecraft Server: ${serverName}`,
      "enforce-secure-profile": "false"
    };
    if (seed) p["level-seed"] = seed;
    return p;
  }

  async listFiles(slug: string, type: string) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    try {
      const dirPath = join(server.serverDir, type);
      const files = await readdir(dirPath);
      const results: { name: string; size: number; modified: string }[] = [];
      for (const f of files) {
        try {
          const s = await stat(join(dirPath, f));
          if (s.isFile()) {
            results.push({
              name: f,
              size: s.size,
              modified: s.mtime.toISOString(),
            });
          }
        } catch {}
      }
      return results;
    } catch {
      return [];
    }
  }

  async uploadFile(slug: string, type: string, filename: string, buffer: ArrayBuffer) {
    validateSlug(slug);
    validateFilename(filename);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    await writeFile(join(server.serverDir, type, filename), Buffer.from(buffer));
  }

  async deleteFile(slug: string, type: string, filename: string) {
    validateSlug(slug);
    validateFilename(filename);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    await unlink(join(server.serverDir, type, filename)).catch(() => {});
  }

  async copyFileFromServer(slug: string, type: string, sourceSlug: string, filename: string) {
    validateSlug(slug);
    validateSlug(sourceSlug);
    validateFilename(filename);
    const target = this.getServer(slug);
    const source = this.getServer(sourceSlug);
    if (!target || !source) throw new Error("Server not found");
    await copyFile(join(source.serverDir, type, filename), join(target.serverDir, type, filename));
  }

  async downloadVanillaJar(mcVersion: string, destDir: string) {
    const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
    const json: any = await res.json();
    const v = json.versions.find((x: any) => x.id === mcVersion);
    if (!v) throw new Error("Version not found");
    const res2 = await fetch(v.url);
    const vjson: any = await res2.json();
    const jarUrl = vjson.downloads.server.url;
    
    const buf = await fetch(jarUrl).then(r => r.arrayBuffer());
    await writeFile(join(destDir, "server.jar"), Buffer.from(buf));
  }

  async downloadFabricJar(mcVersion: string, destDir: string) {
    const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
    const loaders: any = await res.json();
    if (!Array.isArray(loaders) || loaders.length === 0) {
      throw new Error(`No Fabric loader found for Minecraft version ${mcVersion}`);
    }
    const loader = loaders.find((x: any) => x.loader.stable)?.loader?.version || loaders[0]?.loader?.version;
    if (!loader) throw new Error("Fabric loader not found");
    
    const ires = await fetch("https://meta.fabricmc.net/v2/versions/installer");
    const installers: any = await ires.json();
    const installer = installers.find((x: any) => x.stable)?.url || installers[0]?.url;
    if (!installer) throw new Error("Fabric installer not found");
    
    const buf = await fetch(installer).then(r => r.arrayBuffer());
    const instJar = join(destDir, "fabric-installer.jar");
    await writeFile(instJar, Buffer.from(buf));
    
    const proc = Bun.spawnSync(["java", "-jar", instJar, "server", "-mcversion", mcVersion, "-loader", loader, "-downloadMinecraft"], { cwd: destDir });
    if (proc.exitCode !== 0) {
      throw new Error(`Fabric installer failed: ${proc.stderr?.toString() || proc.stdout?.toString()}`);
    }
  }

  private versionCache: string[] | null = null;
  private versionCacheTime = 0;
  async listAvailableVersions(): Promise<string[]> {
    if (Date.now() - this.versionCacheTime < 3600000 && this.versionCache) {
      return this.versionCache;
    }
    const res = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
    const json: any = await res.json();
    this.versionCache = (json.versions || [])
      .filter((x: any) => x.type === "release")
      .map((x: any) => x.id);
    this.versionCacheTime = Date.now();
    return this.versionCache || [];
  }

  parsePlayerEvent(slug: string, line: string) {
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
      }
    }
  }

  async getPlayers(slug: string) {
    const server = this.getServer(slug);
    if (!server) return { online: [], history: [], banned: [] };
    const online = this.getOnlinePlayers(slug);
    const history = db.select().from(mc_player_stats).where(eq(mc_player_stats.serverId, server.serverId)).all();
    const banned = await this.getBannedPlayers(slug);
    return { online, history, banned };
  }

  getOnlinePlayers(slug: string): (typeof mc_player_stats.$inferSelect)[] {
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
  
  getPlayerName(slug: string, uuid: string) {
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    const stat = db.select().from(mc_player_stats).where(and(eq(mc_player_stats.serverId, server.serverId), eq(mc_player_stats.playerUuid, uuid))).get();
    return stat?.playerName || uuid;
  }

  async getBannedPlayers(slug: string): Promise<Array<{ uuid: string; name: string; created?: string; expires?: string; reason?: string }>> {
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

  async opPlayer(slug: string, playerName: string) {
    await this.sendCommand(slug, `op ${playerName}`);
  }

  async deopPlayer(slug: string, playerName: string) {
    await this.sendCommand(slug, `deop ${playerName}`);
  }

  async kickPlayer(slug: string, playerName: string, reason?: string) {
    await this.sendCommand(slug, `kick ${playerName} ${reason || ""}`);
  }

  async banPlayer(slug: string, playerName: string, reason?: string) {
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

  async unbanPlayer(slug: string, playerUuidOrName: string) {
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

  listTemplates() {
    return db.select().from(mc_templates).all();
  }

  getTemplate(id: number) {
    const t = db.select().from(mc_templates).where(eq(mc_templates.templateId, id)).get();
    if (!t) return null;
    const files = db.select().from(mc_template_files).where(eq(mc_template_files.templateId, id)).all();
    return { ...t, files };
  }

  async saveAsTemplate(slug: string, name: string, notes?: string) {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) throw new Error("Server not found");
    const props = await this.readProperties(slug);
    const propsJson = JSON.stringify(props);
    const t = db.insert(mc_templates).values({
      name, engine: server.engine, mcVersion: server.mcVersion, javaArgs: server.javaArgs, propertiesJson: propsJson, notes
    }).returning().get();

    const tDir = join(TEMPLATES_DIR, t.templateId.toString());
    await mkdir(tDir, { recursive: true });

    for (const type of ["mods", "datapacks", "resourcepacks"]) {
      try {
        const files = await readdir(join(server.serverDir, type));
        for (const f of files) {
          const statData = await stat(join(server.serverDir, type, f));
          if (statData.isFile()) {
            db.insert(mc_template_files).values({ templateId: t.templateId, fileType: type, filename: f }).run();
            await mkdir(join(tDir, type), { recursive: true });
            await copyFile(join(server.serverDir, type, f), join(tDir, type, f));
          }
        }
      } catch {}
    }
    return t;
  }

  async createCustomTemplate(data: {
    name: string;
    engine: string;
    mcVersion: string;
    properties?: Record<string, string>;
    notes?: string;
    javaArgs?: string;
  }) {
    if (!data.name || !data.name.trim()) {
      throw new Error("Template name is required");
    }
    const propsJson = data.properties ? JSON.stringify(data.properties) : null;
    const t = db.insert(mc_templates).values({
      name: data.name.trim(),
      engine: data.engine || "vanilla",
      mcVersion: data.mcVersion,
      javaArgs: data.javaArgs || null,
      propertiesJson: propsJson,
      notes: data.notes || null,
    }).returning().get();

    const tDir = join(TEMPLATES_DIR, t.templateId.toString());
    await mkdir(join(tDir, "mods"), { recursive: true });
    await mkdir(join(tDir, "datapacks"), { recursive: true });
    await mkdir(join(tDir, "resourcepacks"), { recursive: true });

    return this.getTemplate(t.templateId);
  }

  async listTemplateFiles(templateId: number, type: string) {
    const t = this.getTemplate(templateId);
    if (!t) throw new Error("Template not found");
    try {
      const dirPath = join(TEMPLATES_DIR, templateId.toString(), type);
      const files = await readdir(dirPath);
      const results: { name: string; size: number; modified: string }[] = [];
      for (const f of files) {
        try {
          const s = await stat(join(dirPath, f));
          if (s.isFile()) {
            results.push({
              name: f,
              size: s.size,
              modified: s.mtime.toISOString(),
            });
          }
        } catch {}
      }
      return results;
    } catch {
      return [];
    }
  }

  async uploadTemplateFile(templateId: number, type: string, filename: string, buffer: ArrayBuffer) {
    validateFilename(filename);
    const t = this.getTemplate(templateId);
    if (!t) throw new Error("Template not found");
    const tDir = join(TEMPLATES_DIR, templateId.toString(), type);
    await mkdir(tDir, { recursive: true });
    await writeFile(join(tDir, filename), Buffer.from(buffer));

    const existing = db.select().from(mc_template_files).where(
      and(
        eq(mc_template_files.templateId, templateId),
        eq(mc_template_files.fileType, type),
        eq(mc_template_files.filename, filename)
      )
    ).get();

    if (!existing) {
      db.insert(mc_template_files).values({
        templateId,
        fileType: type,
        filename,
      }).run();
    }
  }

  async deleteTemplateFile(templateId: number, type: string, filename: string) {
    validateFilename(filename);
    const t = this.getTemplate(templateId);
    if (!t) throw new Error("Template not found");
    const filePath = join(TEMPLATES_DIR, templateId.toString(), type, filename);
    await unlink(filePath).catch(() => {});
    db.delete(mc_template_files).where(
      and(
        eq(mc_template_files.templateId, templateId),
        eq(mc_template_files.fileType, type),
        eq(mc_template_files.filename, filename)
      )
    ).run();
  }

  async deleteTemplate(id: number) {
    const t = this.getTemplate(id);
    if (t) {
      db.delete(mc_templates).where(eq(mc_templates.templateId, id)).run();
      await rm(join(TEMPLATES_DIR, id.toString()), { recursive: true, force: true });
    }
    return { ok: true };
  }

  async speedrunFromTemplate(templateId: number, newSlug: string, displayName: string) {
    validateSlug(newSlug);
    const t = this.getTemplate(templateId);
    if (!t) throw new Error("Template not found");
    const seed = Math.floor(Math.random() * 2**48).toString();
    const s = await this.createServer({ slug: newSlug, displayName, engine: t.engine, mcVersion: t.mcVersion, javaArgs: t.javaArgs || undefined, templateId });
    const props = JSON.parse(t.propertiesJson || "{}");
    props["level-seed"] = seed;
    await this.writeProperties(newSlug, props);

    const tDir = join(TEMPLATES_DIR, templateId.toString());
    if (s && t.files) {
      for (const f of t.files) {
        await mkdir(join(s.serverDir, f.fileType), { recursive: true });
        await copyFile(join(tDir, f.fileType, f.filename), join(s.serverDir, f.fileType, f.filename)).catch(() => {});
      }
    }
    return this.getServer(newSlug);
  }

  async getStartupError(slug: string): Promise<{ lines: string[]; crashReport?: string }> {
    validateSlug(slug);
    const server = this.getServer(slug);
    if (!server) return { lines: [] };

    try {
      const logPath = join(server.serverDir, "logs", "latest.log");
      if (!existsSync(logPath)) return { lines: [] };

      const p = Bun.spawnSync(["tail", "-n", "50", logPath]);
      const logText = p.stdout.toString();
      const allLines = logText.split("\n").filter(Boolean);

      const tailText = allLines.slice(-10).join("\n");
      const cleanShutdownRegex = /(Stopping\s+(the\s+)?server|Closing\s+Server|All\s+dimensions\s+are\s+saved|Saving\s+chunks|Server\s+empty\s+for\s+\d+\s+seconds,\s+pausing)/i;
      if (cleanShutdownRegex.test(tailText)) {
        return { lines: [] };
      }

      const crDir = join(server.serverDir, "crash-reports");
      if (existsSync(crDir)) {
        const cr = await readdir(crDir);
        if (cr.length > 0) {
          cr.sort();
          const last = cr[cr.length - 1];
          const reportPath = join(crDir, last);
          const crStat = await stat(reportPath);
          const logStat = await stat(logPath);
          if (crStat.mtimeMs >= logStat.mtimeMs - 60000) {
            const report = await readFile(reportPath, "utf-8");
            return { lines: report.split("\n").filter(Boolean).slice(0, 50), crashReport: report };
          }
        }
      }

      const filtered = allLines.filter(l => /ERROR|FATAL|Exception in thread|Encountered an unexpected exception|FAILED TO BIND|Address already in use|You need to agree to the EULA/i.test(l));
      if (filtered.length > 0) {
        return { lines: filtered };
      }
    } catch {
      return { lines: [] };
    }

    return { lines: [] };
  }

  async inspectServerDirectory(targetPath: string) {
    const resolvedPath = resolve(targetPath);
    const folderName = basename(resolvedPath);

    if (!existsSync(resolvedPath)) {
      return {
        isValid: false,
        serverDir: resolvedPath,
        folderName,
        hasProperties: false,
        hasWorld: false,
        hasEula: false,
        eulaAccepted: false,
        hasJar: false,
        jarFiles: [],
        detectedEngine: "vanilla" as const,
        properties: {},
        error: "Directory does not exist",
      };
    }

    try {
      const s = await stat(resolvedPath);
      if (!s.isDirectory()) {
        return {
          isValid: false,
          serverDir: resolvedPath,
          folderName,
          hasProperties: false,
          hasWorld: false,
          hasEula: false,
          eulaAccepted: false,
          hasJar: false,
          jarFiles: [],
          detectedEngine: "vanilla" as const,
          properties: {},
          error: "Path is not a directory",
        };
      }

      const files = await readdir(resolvedPath);
      const jarFiles = files.filter(f => f.endsWith(".jar"));
      const hasProperties = files.includes("server.properties");
      const hasEula = files.includes("eula.txt");
      
      let eulaAccepted = false;
      if (hasEula) {
        try {
          const eulaContent = await readFile(join(resolvedPath, "eula.txt"), "utf-8");
          eulaAccepted = /eula\s*=\s*true/i.test(eulaContent);
        } catch {}
      }

      const properties: Record<string, string> = {};
      if (hasProperties) {
        try {
          const content = await readFile(join(resolvedPath, "server.properties"), "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const idx = trimmed.indexOf("=");
            if (idx > -1) {
              properties[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
            }
          }
        } catch {}
      }

      const levelName = properties["level-name"] || "world";
      const hasWorld = files.includes(levelName) || files.includes("world");

      let detectedEngine: "vanilla" | "fabric" = "vanilla";
      if (jarFiles.some(j => j.toLowerCase().includes("fabric")) || files.includes(".fabric")) {
        detectedEngine = "fabric";
      }

      let detectedVersion: string | undefined = undefined;
      // Try to read version from logs
      if (files.includes("logs")) {
        try {
          const logPath = join(resolvedPath, "logs", "latest.log");
          if (existsSync(logPath)) {
            const logHead = (await readFile(logPath, "utf-8")).slice(0, 10000);
            const vMatch = logHead.match(/Starting minecraft server version ([\w\.-]+)/i) ||
                           logHead.match(/Loading Minecraft ([\w\.-]+)/i) ||
                           logHead.match(/Minecraft Server (\d+\.\d+(\.\d+)?)/i);
            if (vMatch) {
              detectedVersion = vMatch[1];
            }
          }
        } catch {}
      }

      // Check jar filenames for version hint (e.g. paper-1.21.1-123.jar or server-1.21.jar)
      if (!detectedVersion) {
        for (const j of jarFiles) {
          const match = j.match(/(\d+\.\d+(\.\d+)?)/);
          if (match) {
            detectedVersion = match[1];
            break;
          }
        }
      }

      const detectedDisplayName = properties["server-name"] || (properties["motd"] ? properties["motd"].replace(/^A Minecraft Server:\s*/i, "") : folderName);

      return {
        isValid: true,
        serverDir: resolvedPath,
        folderName,
        hasProperties,
        hasWorld,
        hasEula,
        eulaAccepted,
        hasJar: jarFiles.length > 0,
        jarFiles,
        detectedEngine,
        detectedVersion,
        detectedDisplayName,
        properties,
      };
    } catch (err: any) {
      return {
        isValid: false,
        serverDir: resolvedPath,
        folderName,
        hasProperties: false,
        hasWorld: false,
        hasEula: false,
        eulaAccepted: false,
        hasJar: false,
        jarFiles: [],
        detectedEngine: "vanilla" as const,
        properties: {},
        error: err.message || "Failed to inspect directory",
      };
    }
  }

  async scanUnregisteredServers() {
    await mkdir(BASE_DIR, { recursive: true });
    const registeredServers = this.listServers();
    const registeredDirs = new Set(registeredServers.map(s => resolve(s.serverDir)));
    const registeredSlugs = new Set(registeredServers.map(s => s.slug));

    const entries = await readdir(BASE_DIR);
    const unlinked: Array<{
      serverDir: string;
      folderName: string;
      suggestedSlug: string;
      inspection: Awaited<ReturnType<typeof this.inspectServerDirectory>>;
    }> = [];

    for (const entry of entries) {
      const fullPath = resolve(join(BASE_DIR, entry));
      if (registeredDirs.has(fullPath)) continue;

      try {
        const s = await stat(fullPath);
        if (!s.isDirectory()) continue;

        const inspection = await this.inspectServerDirectory(fullPath);
        if (!inspection.isValid) continue;

        const suggestedSlug = entry.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32);

        unlinked.push({
          serverDir: fullPath,
          folderName: entry,
          suggestedSlug: registeredSlugs.has(suggestedSlug) ? `${suggestedSlug}-${Date.now().toString().slice(-4)}` : suggestedSlug,
          inspection,
        });
      } catch {}
    }

    return unlinked;
  }

  async importServer(data: {
    slug: string;
    displayName: string;
    engine: string;
    mcVersion: string;
    serverDir: string;
    javaArgs?: string;
  }) {
    validateSlug(data.slug);
    const existing = this.getServer(data.slug);
    if (existing) {
      throw new Error(`A server with slug "${data.slug}" already exists`);
    }

    const resolvedDir = resolve(data.serverDir);
    if (!existsSync(resolvedDir)) {
      throw new Error(`Server directory "${resolvedDir}" does not exist`);
    }

    const s = await stat(resolvedDir);
    if (!s.isDirectory()) {
      throw new Error(`Server directory "${resolvedDir}" is not a directory`);
    }

    // Ensure eula is accepted
    const eulaPath = join(resolvedDir, "eula.txt");
    try {
      if (!existsSync(eulaPath)) {
        await writeFile(eulaPath, "eula=true\n");
      } else {
        const content = await readFile(eulaPath, "utf-8");
        if (!/eula\s*=\s*true/i.test(content)) {
          await writeFile(eulaPath, content.replace(/eula\s*=\s*false/i, "eula=true"));
        }
      }
    } catch {}

    // Ensure standard subdirectories
    await mkdir(join(resolvedDir, "mods"), { recursive: true });
    await mkdir(join(resolvedDir, "datapacks"), { recursive: true });
    await mkdir(join(resolvedDir, "resourcepacks"), { recursive: true });
    await mkdir(join(resolvedDir, "logs"), { recursive: true });
    await mkdir(join(resolvedDir, "world"), { recursive: true });

    db.insert(mc_servers).values({
      slug: data.slug,
      displayName: data.displayName,
      engine: data.engine,
      mcVersion: data.mcVersion,
      javaArgs: data.javaArgs || null,
      serverDir: resolvedDir,
    }).run();

    return this.getServer(data.slug);
  }
}


