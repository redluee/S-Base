import { ConflictError } from "../../utils/errors";
import { type PowerControl, systemPower } from "./pulse-power";
import { PulseShutdown, type ShutdownTarget } from "./pulse-shutdown";
import { PulseSystemUpdate, type UpdateSpawn } from "./pulse-system-update";
import { PulseUsers } from "./pulse-users";

export type { PulseModuleInfo, PulseStats, PulseUser } from "./pulse-users";
export type { ShutdownScheduleConfig, ShutdownScheduleStatus } from "./pulse-shutdown";
export type { SystemUpdateState, UpdatePhase } from "./pulse-system-update";

export interface PulseOptions {
  minecraft?: ShutdownTarget;
  power?: PowerControl;
  spawnUpdate?: UpdateSpawn;
}

export class PulseService {
  readonly users = new PulseUsers();
  readonly shutdown: PulseShutdown;
  readonly systemUpdate: PulseSystemUpdate;

  constructor(options: PulseOptions = {}) {
    this.shutdown = new PulseShutdown(options.power ?? systemPower, options.minecraft);
    this.systemUpdate = new PulseSystemUpdate(options.spawnUpdate);
  }

  reboot() {
    if (this.systemUpdate.isRunning()) throw new ConflictError("pulse.updateRunning");
    this.shutdown.reboot().catch((err) => {
      console.error("[Pulse] Reboot failed:", err);
    });
    return { ok: true };
  }

  shutdownNow() {
    this.shutdown.powerOff().catch((err) => {
      console.error("[Pulse] Manual shutdown failed:", err);
    });
    return { ok: true };
  }
}
