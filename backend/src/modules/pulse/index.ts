import { ConflictError } from "../../utils/errors";
import type { MinecraftService } from "../minecraft";
import { PulseShutdown } from "./pulse-shutdown";
import { PulseSystemUpdate, type UpdateSpawn } from "./pulse-system-update";
import { PulseUsers } from "./pulse-users";

export type { PulseModuleInfo, PulseStats, PulseUser } from "./pulse-users";
export type { ShutdownScheduleConfig, ShutdownScheduleStatus } from "./pulse-shutdown";
export type { SystemUpdateState, UpdatePhase } from "./pulse-system-update";

export class PulseService {
  readonly users = new PulseUsers();
  readonly shutdown: PulseShutdown;
  readonly systemUpdate: PulseSystemUpdate;

  constructor(options: { minecraft?: MinecraftService; autoStart?: boolean; spawnUpdate?: UpdateSpawn } = {}) {
    this.shutdown = new PulseShutdown(options.minecraft, options.autoStart);
    this.systemUpdate = new PulseSystemUpdate(options.spawnUpdate);
  }

  reboot() {
    if (this.systemUpdate.isRunning()) throw new ConflictError("pulse.updateRunning");
    this.shutdown.triggerReboot().catch((err) => {
      console.error("[Pulse] Reboot failed:", err);
    });
    return { ok: true };
  }

  shutdownNow() {
    this.shutdown.triggerManualShutdown().catch((err) => {
      console.error("[Pulse] Manual shutdown failed:", err);
    });
    return { ok: true };
  }
}
