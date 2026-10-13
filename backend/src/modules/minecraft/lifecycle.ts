import { join, resolve } from "path";
import { existsSync, readdirSync, readlinkSync, readFileSync } from "fs";
import db from "../../db/client";
import { mc_player_stats, mc_player_sessions } from "../../db/schema/minecraft";
import { eq, and, isNull } from "drizzle-orm";
import { validateSlug, sanitizeCommand } from "./validation";
import { formatJavaLaunchCommand } from "./launch";
import type { MinecraftService } from "./index";

export function getServerPids(this: MinecraftService, serverDir: string): number[] {
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

export async function startServer(this: MinecraftService, slug: string) {
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

  await this.ensureDatapacksDir(server.serverDir);

  const cmdStr = formatJavaLaunchCommand(server.engine, server.serverDir, server.javaArgs);
  
  Bun.spawnSync(["tmux", "new-session", "-d", "-s", sessionName, "-c", server.serverDir, cmdStr]);
  
  // Background tail logic for tracking
  this.startPlayerTracking(slug, server.serverDir);
  this.emptySinceMap.set(slug, Date.now());
  
  return { ok: true };
}

export async function startPlayerTracking(this: MinecraftService, slug: string, serverDir: string) {
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

export async function stopServer(this: MinecraftService, slug: string) {
  validateSlug(slug);
  this.emptySinceMap.delete(slug);
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

export async function restartServer(this: MinecraftService, slug: string) {
  await this.stopServer(slug);
  await new Promise(r => setTimeout(r, 1000));
  return this.startServer(slug);
}

export function getStatus(this: MinecraftService, slug: string) {
  validateSlug(slug);
  const isOnline = this.isRunning(slug);
  return { online: isOnline, playerCount: isOnline ? this.getOnlinePlayers(slug).length : 0 };
}

export function isRunning(this: MinecraftService, slug: string): boolean {
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

export async function getConsoleLogs(this: MinecraftService, slug: string, lines = 100) {
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

export async function sendCommand(this: MinecraftService, slug: string, command: string) {
  validateSlug(slug);
  const safeCmd = sanitizeCommand(command);
  Bun.spawnSync(["tmux", "send-keys", "-t", `mc-${slug}`, safeCmd, "C-m"]);
}
