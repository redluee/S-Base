import { existsSync } from "fs";
import db from "../../db/client";
import { systemSettings } from "../../db/schema/system";
import { eq } from "drizzle-orm";
import type { MinecraftService } from "../minecraft";

export interface ShutdownScheduleConfig {
  enabled: boolean;
  time: string; // "HH:mm"
  blockedUntil: string | null; // ISO date string
}

export interface ShutdownScheduleStatus extends ShutdownScheduleConfig {
  isBlocked: boolean;
  nextShutdownAt: string | null;
  minutesUntilShutdown: number | null;
}

const SETTINGS_KEY = "shutdown_schedule";
const DEFAULT_CONFIG: ShutdownScheduleConfig = {
  enabled: true,
  time: "01:00",
  blockedUntil: null,
};

export class ServerShutdownService {
  private mcService?: MinecraftService;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private currentCycleKey: string | null = null;
  private sentWarnings = new Set<number>();
  private shutdownTriggeredCycles = new Set<string>();

  constructor(mcService?: MinecraftService, autoStart = process.env.NODE_ENV !== "test") {
    this.mcService = mcService;
    if (autoStart) {
      this.startScheduler();
    }
  }

  startScheduler(intervalMs = 15000) {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      this.checkScheduleTick().catch((err) => {
        console.error("[ShutdownService] Error during tick:", err);
      });
    }, intervalMs);
  }

  stopScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  getConfig(): ShutdownScheduleConfig {
    try {
      const row = db.select().from(systemSettings).where(eq(systemSettings.key, SETTINGS_KEY)).get();
      if (!row) {
        db.insert(systemSettings).values({
          key: SETTINGS_KEY,
          value: JSON.stringify(DEFAULT_CONFIG),
        }).run();
        return { ...DEFAULT_CONFIG };
      }
      return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config: ShutdownScheduleConfig) {
    const value = JSON.stringify(config);
    const existing = db.select().from(systemSettings).where(eq(systemSettings.key, SETTINGS_KEY)).get();
    if (existing) {
      db.update(systemSettings)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(systemSettings.key, SETTINGS_KEY))
        .run();
    } else {
      db.insert(systemSettings)
        .values({ key: SETTINGS_KEY, value, updatedAt: new Date().toISOString() })
        .run();
    }
  }

  getNextShutdownDate(timeStr: string, fromDate = new Date()): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const target = new Date(fromDate);
    target.setHours(hours, minutes, 0, 0);

    // If target is earlier than now minus 1 minute, it means it belongs to the next day
    if (target.getTime() <= fromDate.getTime() - 60000) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  isBlocked(config: ShutdownScheduleConfig, targetDate: Date, now = new Date()): boolean {
    if (!config.blockedUntil) return false;
    const blockedUntilDate = new Date(config.blockedUntil);
    // If the block is still in the future and covers the target date
    return blockedUntilDate.getTime() > now.getTime() && blockedUntilDate.getTime() >= targetDate.getTime();
  }

  getStatus(fromDate = new Date()): ShutdownScheduleStatus {
    const config = this.getConfig();
    const nextTarget = this.getNextShutdownDate(config.time, fromDate);
    const isCurrentlyBlocked = this.isBlocked(config, nextTarget, fromDate);
    const diffMs = nextTarget.getTime() - fromDate.getTime();
    const minutesUntilShutdown = Math.max(0, Math.floor(diffMs / 60000));

    return {
      ...config,
      isBlocked: isCurrentlyBlocked,
      nextShutdownAt: nextTarget.toISOString(),
      minutesUntilShutdown,
    };
  }

  updateSchedule(params: { time?: string; enabled?: boolean }): ShutdownScheduleStatus {
    const current = this.getConfig();
    if (params.time !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(params.time)) {
        throw new Error("Invalid time format: must be HH:mm (00:00 to 23:59)");
      }
      current.time = params.time;
    }
    if (params.enabled !== undefined) {
      current.enabled = Boolean(params.enabled);
    }
    this.saveConfig(current);
    return this.getStatus();
  }

  blockShutdown(fromDate = new Date()): ShutdownScheduleStatus {
    const current = this.getConfig();
    const nextTarget = this.getNextShutdownDate(current.time, fromDate);
    // Block until 4 hours after nextTarget (e.g. into the next morning)
    const blockUntil = new Date(nextTarget.getTime() + 4 * 60 * 60 * 1000);
    current.blockedUntil = blockUntil.toISOString();
    this.saveConfig(current);
    return this.getStatus(fromDate);
  }

  unblockShutdown(fromDate = new Date()): ShutdownScheduleStatus {
    const current = this.getConfig();
    current.blockedUntil = null;
    this.saveConfig(current);
    return this.getStatus(fromDate);
  }

  async checkScheduleTick(now = new Date()) {
    const config = this.getConfig();
    if (!config.enabled) return;

    const targetDate = this.getNextShutdownDate(config.time, now);
    if (this.isBlocked(config, targetDate, now)) return;

    const cycleKey = targetDate.toISOString();
    if (this.currentCycleKey !== cycleKey) {
      this.currentCycleKey = cycleKey;
      this.sentWarnings.clear();
    }

    const diffMs = targetDate.getTime() - now.getTime();

    // 10 minutes warning: between 9m and 10m remaining
    if (diffMs <= 10 * 60 * 1000 + 5000 && diffMs > 8.5 * 60 * 1000 && !this.sentWarnings.has(10)) {
      this.sentWarnings.add(10);
      await this.notifyOnlinePlayers(10);
    }

    // 5 minutes warning: between 4m and 5m remaining
    if (diffMs <= 5 * 60 * 1000 + 5000 && diffMs > 3.5 * 60 * 1000 && !this.sentWarnings.has(5)) {
      this.sentWarnings.add(5);
      await this.notifyOnlinePlayers(5);
    }

    // 1 minute warning: between 45s and 1m15s remaining
    if (diffMs <= 1 * 60 * 1000 + 15000 && diffMs > 25 * 1000 && !this.sentWarnings.has(1)) {
      this.sentWarnings.add(1);
      await this.notifyOnlinePlayers(1);
    }

    // Shutdown time reached: diffMs between -30s and 5s
    if (diffMs <= 5000 && diffMs >= -30000 && !this.shutdownTriggeredCycles.has(cycleKey)) {
      this.shutdownTriggeredCycles.add(cycleKey);
      await this.executeFullShutdown();
    }
  }

  async notifyOnlinePlayers(minutesLeft: number) {
    if (!this.mcService) return;
    try {
      const servers = this.mcService.listServers();
      for (const server of servers) {
        if (!this.mcService.isRunning(server.slug)) continue;
        const onlinePlayers = this.mcService.getOnlinePlayers(server.slug);
        if (onlinePlayers.length > 0) {
          const msg =
            minutesLeft === 1
              ? "say [Server] Belangrijk: De server sluit af over 1 minuut! Sla je voortgang op."
              : `say [Server] Waarschuwing: Automatische serverafsluiting over ${minutesLeft} minuten!`;
          await this.mcService.sendCommand(server.slug, msg);
        }
      }
    } catch (err) {
      console.error("[ShutdownService] Failed to notify Minecraft players:", err);
    }
  }

  async stopAllMinecraftServers() {
    if (!this.mcService) return;
    try {
      const servers = this.mcService.listServers();
      const runningServers = servers.filter((s) => this.mcService!.isRunning(s.slug));
      for (const server of runningServers) {
        try {
          await this.mcService.sendCommand(server.slug, "say [Server] De server wordt nu afgesloten...");
        } catch {}
      }

      // Stop all running servers cleanly in parallel
      await Promise.allSettled(runningServers.map((s) => this.mcService!.stopServer(s.slug)));
    } catch (err) {
      console.error("[ShutdownService] Failed to cleanly stop Minecraft servers:", err);
    }
  }

  async executeFullShutdown() {
    console.log("[ShutdownService] Starting scheduled system shutdown sequence...");
    await this.stopAllMinecraftServers();

    if (process.env.NODE_ENV === "test") {
      console.log("[ShutdownService] In test mode: skipping system shutdown execution.");
      return;
    }

    console.log("[ShutdownService] All Minecraft servers stopped. Triggering system shutdown...");
    if (existsSync("/home/gsd/shutdown_server.sh")) {
      try {
        Bun.spawn(["/home/gsd/shutdown_server.sh"]);
        return;
      } catch (err) {
        console.error("[ShutdownService] Failed to execute /home/gsd/shutdown_server.sh:", err);
      }
    }

    try {
      Bun.spawn(["sudo", "shutdown", "-h", "now"]);
    } catch (e1) {
      try {
        Bun.spawn(["sudo", "systemctl", "poweroff"]);
      } catch (e2) {
        try {
          Bun.spawn(["systemctl", "poweroff"]);
        } catch (e3) {
          console.error("[ShutdownService] Failed to execute shutdown command:", e3);
        }
      }
    }
  }
}
