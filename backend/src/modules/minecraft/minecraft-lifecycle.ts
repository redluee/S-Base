import { and, eq, isNull } from "drizzle-orm";
import { join } from "path";
import db from "../../db/client";
import { mc_player_sessions, mc_player_stats } from "../../db/schema/minecraft";
import { ValidationError } from "../../utils/errors";
import { formatJavaLaunchCommand } from "./launch";
import { readLogTail } from "./log-tail";
import type { MinecraftParts } from "./minecraft-parts";
import { sanitizeCommand, validateSlug } from "./validation";

const GRACEFUL_STOP_MS = 20000;

export class MinecraftLifecycle {
  private readonly trackingProcesses = new Map<string, ReturnType<typeof Bun.spawn>>();

  constructor(private readonly parts: MinecraftParts) {}

  private tmuxAlive(sessionName: string): boolean {
    return Bun.spawnSync(["tmux", "has-session", "-t", sessionName]).exitCode === 0;
  }

  async startServer(slug: string) {
    validateSlug(slug);
    const server = this.parts.servers.get(slug);

    const sessionName = `mc-${slug}`;
    if (this.tmuxAlive(sessionName)) {
      Bun.spawnSync(["tmux", "kill-session", "-t", sessionName]);
    }

    this.parts.processes.kill(this.parts.processes.findPids(server.serverDir), "SIGKILL");
    await this.parts.dirs.ensureDatapacksDir(server.serverDir);

    const cmdStr = formatJavaLaunchCommand(server.engine, server.serverDir, server.javaArgs);
    Bun.spawnSync(["tmux", "new-session", "-d", "-s", sessionName, "-c", server.serverDir, cmdStr]);

    this.startPlayerTracking(slug, server.serverDir);
    this.parts.idle.markEmpty(slug);

    return { ok: true };
  }

  startPlayerTracking(slug: string, serverDir: string) {
    this.stopTracking(slug);
    const logPath = join(serverDir, "logs", "latest.log");
    try {
      const proc = Bun.spawn(["tail", "-F", "-n", "0", logPath], { stdout: "pipe", stderr: "ignore" });
      this.trackingProcesses.set(slug, proc);
      void this.consumeLog(slug, proc);
    } catch {}
  }

  private async consumeLog(slug: string, proc: ReturnType<typeof Bun.spawn>) {
    try {
      if (!(proc.stdout instanceof ReadableStream)) return;
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
          if (line.trim()) this.parts.players.parseEvent(slug, line);
        }
      }
    } catch {}
  }

  private stopTracking(slug: string) {
    try {
      this.trackingProcesses.get(slug)?.kill();
    } catch {}
    this.trackingProcesses.delete(slug);
  }

  private closeOpenSessions(serverId: number) {
    const now = new Date().toISOString();
    const open = db
      .select()
      .from(mc_player_sessions)
      .where(and(eq(mc_player_sessions.serverId, serverId), isNull(mc_player_sessions.leftAt)))
      .all();
    for (const session of open) {
      db.update(mc_player_sessions)
        .set({ leftAt: now })
        .where(eq(mc_player_sessions.sessionId, session.sessionId))
        .run();
      const stat = db
        .select()
        .from(mc_player_stats)
        .where(and(eq(mc_player_stats.serverId, serverId), eq(mc_player_stats.playerUuid, session.playerUuid)))
        .get();
      if (stat) {
        const seconds = Math.max(
          0,
          Math.floor((new Date(now).getTime() - new Date(session.joinedAt).getTime()) / 1000),
        );
        db.update(mc_player_stats)
          .set({ lastSeen: now, totalPlaytime: (stat.totalPlaytime || 0) + seconds })
          .where(eq(mc_player_stats.statId, stat.statId))
          .run();
      }
    }
  }

  async stopServer(slug: string) {
    validateSlug(slug);
    const server = this.parts.servers.get(slug);
    this.parts.idle.clearEmpty(slug);
    this.stopTracking(slug);
    this.closeOpenSessions(server.serverId);

    const sessionName = `mc-${slug}`;
    if (this.tmuxAlive(sessionName)) {
      Bun.spawnSync(["tmux", "send-keys", "-t", sessionName, "stop", "C-m"]);
    }

    const startTime = Date.now();
    while (Date.now() - startTime < GRACEFUL_STOP_MS) {
      if (!this.tmuxAlive(sessionName) && this.parts.processes.findPids(server.serverDir).length === 0) {
        return { ok: true };
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    this.parts.processes.kill(this.parts.processes.findPids(server.serverDir), "SIGTERM");
    await new Promise((r) => setTimeout(r, 1000));
    this.parts.processes.kill(this.parts.processes.findPids(server.serverDir), "SIGKILL");

    if (this.tmuxAlive(sessionName)) {
      Bun.spawnSync(["tmux", "kill-session", "-t", sessionName]);
    }

    return { ok: true };
  }

  async restartServer(slug: string) {
    await this.stopServer(slug);
    await new Promise((r) => setTimeout(r, 1000));
    return this.startServer(slug);
  }

  getStatus(slug: string) {
    this.parts.servers.get(slug);
    const online = this.isRunning(slug);
    return { online, playerCount: online ? this.parts.players.getOnline(slug).length : 0 };
  }

  isRunning(slug: string): boolean {
    validateSlug(slug);
    if (this.tmuxAlive(`mc-${slug}`)) return true;
    const server = this.parts.servers.findBySlug(slug);
    return !!server?.serverDir && this.parts.processes.findPids(server.serverDir).length > 0;
  }

  async getConsoleLogs(slug: string, lines = 100) {
    const server = this.parts.servers.get(slug);
    return readLogTail(join(server.serverDir, "logs", "latest.log"), lines);
  }

  async runConsoleCommand(slug: string, command: string) {
    this.parts.servers.get(slug);
    if (!sanitizeCommand(command)) throw new ValidationError("minecraft.commandRequired");
    await this.sendCommand(slug, command);
    return { ok: true };
  }

  async sendCommand(slug: string, command: string) {
    validateSlug(slug);
    Bun.spawnSync(["tmux", "send-keys", "-t", `mc-${slug}`, sanitizeCommand(command), "C-m"]);
  }
}
