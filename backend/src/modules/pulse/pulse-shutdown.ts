import { eq } from "drizzle-orm";
import db from "../../db/client";
import { systemSettings } from "../../db/schema/system";
import { ValidationError } from "../../utils/errors";
import type { PowerControl } from "./pulse-power";

export interface ShutdownScheduleConfig {
  enabled: boolean;
  time: string;
  blockedUntil: string | null;
}

export interface ShutdownScheduleStatus extends ShutdownScheduleConfig {
  isBlocked: boolean;
  nextShutdownAt: string | null;
  minutesUntilShutdown: number | null;
}

export interface ShutdownTarget {
  broadcastShutdownWarning(minutesLeft: number): Promise<void>;
  stopAll(): Promise<void>;
}

const SETTINGS_KEY = "shutdown_schedule";
const DEFAULT_CONFIG: ShutdownScheduleConfig = {
  enabled: true,
  time: "01:00",
  blockedUntil: null,
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const TICK_INTERVAL_MS = 15 * SECOND;
const PAST_TARGET_GRACE_MS = MINUTE;
const BLOCK_DURATION_MS = 4 * 60 * MINUTE;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const WARNINGS = [
  { minutes: 10, from: 10 * MINUTE + 5 * SECOND, until: 8.5 * MINUTE },
  { minutes: 5, from: 5 * MINUTE + 5 * SECOND, until: 3.5 * MINUTE },
  { minutes: 1, from: MINUTE + 15 * SECOND, until: 25 * SECOND },
];
const SHUTDOWN_WINDOW = { from: 5 * SECOND, until: -30 * SECOND };

export class PulseShutdown {
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private currentCycleKey: string | null = null;
  private sentWarnings = new Set<number>();
  private shutdownTriggeredCycles = new Set<string>();

  constructor(
    private readonly power: PowerControl,
    private readonly minecraft?: ShutdownTarget,
  ) {}

  startScheduler(intervalMs = TICK_INTERVAL_MS) {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      this.checkScheduleTick().catch((err) => {
        console.error("[Pulse] Shutdown schedule tick failed:", err);
      });
    }, intervalMs);
  }

  getConfig(): ShutdownScheduleConfig {
    const row = db.select().from(systemSettings).where(eq(systemSettings.key, SETTINGS_KEY)).get();
    if (!row) return { ...DEFAULT_CONFIG };
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private saveConfig(config: ShutdownScheduleConfig) {
    const value = JSON.stringify(config);
    const updatedAt = new Date().toISOString();
    db.insert(systemSettings)
      .values({ key: SETTINGS_KEY, value, updatedAt })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt } })
      .run();
  }

  getNextShutdownDate(timeStr: string, fromDate = new Date()): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const target = new Date(fromDate);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= fromDate.getTime() - PAST_TARGET_GRACE_MS) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  isBlocked(config: ShutdownScheduleConfig, targetDate: Date, now = new Date()): boolean {
    if (!config.blockedUntil) return false;
    const blockedUntil = new Date(config.blockedUntil).getTime();
    return blockedUntil > now.getTime() && blockedUntil >= targetDate.getTime();
  }

  getStatus(fromDate = new Date()): ShutdownScheduleStatus {
    const config = this.getConfig();
    const nextTarget = this.getNextShutdownDate(config.time, fromDate);
    return {
      ...config,
      isBlocked: this.isBlocked(config, nextTarget, fromDate),
      nextShutdownAt: nextTarget.toISOString(),
      minutesUntilShutdown: Math.max(0, Math.floor((nextTarget.getTime() - fromDate.getTime()) / MINUTE)),
    };
  }

  updateSchedule(params: { time?: string; enabled?: boolean }): ShutdownScheduleStatus {
    const current = this.getConfig();
    if (params.time !== undefined) {
      if (!TIME_PATTERN.test(params.time)) throw new ValidationError("pulse.invalidTime");
      current.time = params.time;
    }
    if (params.enabled !== undefined) current.enabled = params.enabled;
    this.saveConfig(current);
    return this.getStatus();
  }

  blockShutdown(fromDate = new Date()): ShutdownScheduleStatus {
    const current = this.getConfig();
    const nextTarget = this.getNextShutdownDate(current.time, fromDate);
    current.blockedUntil = new Date(nextTarget.getTime() + BLOCK_DURATION_MS).toISOString();
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

    const remainingMs = targetDate.getTime() - now.getTime();
    for (const warning of WARNINGS) {
      if (remainingMs <= warning.from && remainingMs > warning.until && !this.sentWarnings.has(warning.minutes)) {
        this.sentWarnings.add(warning.minutes);
        await this.warnPlayers(warning.minutes);
      }
    }

    const inShutdownWindow = remainingMs <= SHUTDOWN_WINDOW.from && remainingMs >= SHUTDOWN_WINDOW.until;
    if (inShutdownWindow && !this.shutdownTriggeredCycles.has(cycleKey)) {
      this.shutdownTriggeredCycles.add(cycleKey);
      await this.powerOff();
    }
  }

  private async warnPlayers(minutesLeft: number) {
    try {
      await this.minecraft?.broadcastShutdownWarning(minutesLeft);
    } catch (err) {
      console.error("[Pulse] Failed to notify Minecraft players:", err);
    }
  }

  private async stopMinecraft() {
    try {
      await this.minecraft?.stopAll();
    } catch (err) {
      console.error("[Pulse] Failed to stop Minecraft servers:", err);
    }
  }

  async reboot() {
    console.log("[Pulse] Reboot triggered.");
    await this.stopMinecraft();
    await this.power.reboot();
  }

  async powerOff() {
    console.log("[Pulse] Shutdown triggered.");
    await this.stopMinecraft();
    await this.power.powerOff();
  }
}
