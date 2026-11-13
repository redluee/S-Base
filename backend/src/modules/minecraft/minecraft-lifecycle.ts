import { ValidationError } from "../../utils/errors";
import type { MinecraftService } from "./index";
import { formatJavaLaunchCommand } from "./launch";
import { readLogTail } from "./log-tail";
import { latestLogPath, tmuxSession } from "./server-layout";
import { sanitizeCommand, validateSlug } from "./validation";

const GRACEFUL_STOP_MS = 20000;
const STOP_POLL_MS = 400;
const KILL_GRACE_MS = 1000;
const RESTART_PAUSE_MS = 1000;

function shutdownWarning(minutesLeft: number): string {
  return minutesLeft === 1
    ? "say [Server] Belangrijk: De server sluit af over 1 minuut! Sla je voortgang op."
    : `say [Server] Waarschuwing: Automatische serverafsluiting over ${minutesLeft} minuten!`;
}

const SHUTDOWN_NOTICE = "say [Server] De server wordt nu afgesloten...";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MinecraftLifecycle {
  private readonly trackingProcesses = new Map<string, ReturnType<typeof Bun.spawn>>();

  constructor(private readonly parts: Pick<MinecraftService, "dirs" | "idle" | "players" | "processes" | "servers">) {}

  private tmuxAlive(slug: string): boolean {
    return Bun.spawnSync(["tmux", "has-session", "-t", tmuxSession(slug)]).exitCode === 0;
  }

  private killTmux(slug: string) {
    if (this.tmuxAlive(slug)) Bun.spawnSync(["tmux", "kill-session", "-t", tmuxSession(slug)]);
  }

  async startServer(slug: string) {
    validateSlug(slug);
    const server = this.parts.servers.get(slug);

    this.killTmux(slug);
    this.parts.processes.kill(this.parts.processes.findPids(server.serverDir), "SIGKILL");
    await this.parts.dirs.ensureDatapacksDir(server.serverDir);

    const cmdStr = formatJavaLaunchCommand(server.engine, server.serverDir, server.javaArgs);
    Bun.spawnSync(["tmux", "new-session", "-d", "-s", tmuxSession(slug), "-c", server.serverDir, cmdStr]);

    this.startPlayerTracking(slug, server.serverDir);
    this.parts.idle.markEmpty(slug);

    return { ok: true };
  }

  startPlayerTracking(slug: string, serverDir: string) {
    this.stopTracking(slug);
    const proc = Bun.spawn(["tail", "-F", "-n", "0", latestLogPath(serverDir)], { stdout: "pipe", stderr: "ignore" });
    this.trackingProcesses.set(slug, proc);
    void this.consumeLog(slug, proc);
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
    } catch (err) {
      console.error(`[Minecraft] Log tracking for "${slug}" stopped:`, err);
    }
  }

  private stopTracking(slug: string) {
    try {
      this.trackingProcesses.get(slug)?.kill();
    } catch {}
    this.trackingProcesses.delete(slug);
  }

  async stopServer(slug: string) {
    validateSlug(slug);
    const server = this.parts.servers.get(slug);
    this.parts.idle.clearEmpty(slug);
    this.stopTracking(slug);
    this.parts.players.closeOpenSessions(server.serverId);

    if (this.tmuxAlive(slug)) {
      Bun.spawnSync(["tmux", "send-keys", "-t", tmuxSession(slug), "stop", "C-m"]);
    }

    const startTime = Date.now();
    while (Date.now() - startTime < GRACEFUL_STOP_MS) {
      if (!this.tmuxAlive(slug) && this.parts.processes.findPids(server.serverDir).length === 0) {
        return { ok: true };
      }
      await sleep(STOP_POLL_MS);
    }

    this.parts.processes.kill(this.parts.processes.findPids(server.serverDir), "SIGTERM");
    await sleep(KILL_GRACE_MS);
    this.parts.processes.kill(this.parts.processes.findPids(server.serverDir), "SIGKILL");
    this.killTmux(slug);

    return { ok: true };
  }

  async restartServer(slug: string) {
    await this.stopServer(slug);
    await sleep(RESTART_PAUSE_MS);
    return this.startServer(slug);
  }

  getStatus(slug: string) {
    this.parts.servers.get(slug);
    const online = this.isRunning(slug);
    return { online, playerCount: online ? this.parts.players.getOnline(slug).length : 0 };
  }

  isRunning(slug: string): boolean {
    validateSlug(slug);
    if (this.tmuxAlive(slug)) return true;
    if (!this.parts.servers.exists(slug)) return false;
    return this.parts.processes.findPids(this.parts.servers.get(slug).serverDir).length > 0;
  }

  runningSlugs(): string[] {
    return this.parts.servers
      .rows()
      .map((s) => s.slug)
      .filter((slug) => this.isRunning(slug));
  }

  async broadcastShutdownWarning(minutesLeft: number) {
    for (const slug of this.runningSlugs()) {
      if (this.parts.players.getOnline(slug).length > 0) await this.sendCommand(slug, shutdownWarning(minutesLeft));
    }
  }

  async stopAll() {
    const running = this.runningSlugs();
    for (const slug of running) await this.sendCommand(slug, SHUTDOWN_NOTICE);
    await Promise.allSettled(running.map((slug) => this.stopServer(slug)));
  }

  async getConsoleLogs(slug: string, lines = 100) {
    const server = this.parts.servers.get(slug);
    return readLogTail(latestLogPath(server.serverDir), lines);
  }

  async runConsoleCommand(slug: string, command: string) {
    this.parts.servers.get(slug);
    if (!sanitizeCommand(command)) throw new ValidationError("minecraft.commandRequired");
    await this.sendCommand(slug, command);
    return { ok: true };
  }

  async sendCommand(slug: string, command: string) {
    validateSlug(slug);
    Bun.spawnSync(["tmux", "send-keys", "-t", tmuxSession(slug), sanitizeCommand(command), "C-m"]);
  }
}
