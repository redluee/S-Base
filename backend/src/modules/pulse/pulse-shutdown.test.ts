import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { systemSettings } from "../../db/schema/system";
import { setupTestDb } from "../../test-utils";
import { ValidationError } from "../../utils/errors";
import type { PowerControl } from "./pulse-power";
import { PulseShutdown, type ShutdownTarget } from "./pulse-shutdown";

function localTime(day: number, hours: number, minutes: number, seconds = 0) {
  return new Date(2026, 8, day, hours, minutes, seconds);
}

function fakeHost() {
  const calls: string[] = [];
  const power: PowerControl = {
    reboot: async () => {
      calls.push("reboot");
    },
    powerOff: async () => {
      calls.push("powerOff");
    },
  };
  const minecraft: ShutdownTarget = {
    broadcastShutdownWarning: async (minutes) => {
      calls.push(`warn:${minutes}`);
    },
    stopAll: async () => {
      calls.push("stopAll");
    },
  };
  return { calls, power, minecraft };
}

describe("PulseShutdown", () => {
  let host: ReturnType<typeof fakeHost>;
  let shutdown: PulseShutdown;

  beforeEach(async () => {
    await setupTestDb();
    db.delete(systemSettings).where(eq(systemSettings.key, "shutdown_schedule")).run();
    host = fakeHost();
    shutdown = new PulseShutdown(host.power, host.minecraft);
  });

  it("loads the default schedule without persisting it", () => {
    const status = shutdown.getStatus(localTime(7, 23, 0));
    expect(status).toMatchObject({ enabled: true, time: "01:00", isBlocked: false, blockedUntil: null });
    expect(status.nextShutdownAt).toBe(localTime(8, 1, 0).toISOString());
    expect(status.minutesUntilShutdown).toBe(120);
  });

  it("rolls the next shutdown over to the next day once the time has passed", () => {
    expect(shutdown.getNextShutdownDate("01:00", localTime(7, 23, 0))).toEqual(localTime(8, 1, 0));
    expect(shutdown.getNextShutdownDate("01:00", localTime(8, 1, 0, 30))).toEqual(localTime(8, 1, 0));
    expect(shutdown.getNextShutdownDate("01:00", localTime(8, 1, 10))).toEqual(localTime(9, 1, 0));
  });

  it("updates schedule time and validates format", () => {
    expect(shutdown.updateSchedule({ time: "02:30" }).time).toBe("02:30");
    expect(() => shutdown.updateSchedule({ time: "25:00" })).toThrow(ValidationError);
    expect(() => shutdown.updateSchedule({ time: "invalid" })).toThrow(
      expect.objectContaining({ key: "pulse.invalidTime", status: 400 }),
    );
    expect(shutdown.getConfig().time).toBe("02:30");
    expect(shutdown.updateSchedule({ enabled: false }).enabled).toBe(false);
  });

  it("blocks the upcoming shutdown until four hours after it and can unblock", () => {
    const from = localTime(7, 23, 0);
    const blocked = shutdown.blockShutdown(from);
    expect(blocked.isBlocked).toBe(true);
    expect(blocked.blockedUntil).toBe(localTime(8, 5, 0).toISOString());

    const unblocked = shutdown.unblockShutdown(from);
    expect(unblocked.isBlocked).toBe(false);
    expect(unblocked.blockedUntil).toBeNull();
  });

  it("warns players at 10, 5 and 1 minutes once, then stops Minecraft before powering off", async () => {
    shutdown.updateSchedule({ time: "01:00", enabled: true });
    await shutdown.checkScheduleTick(localTime(8, 0, 50, 10));
    await shutdown.checkScheduleTick(localTime(8, 0, 50, 25));
    await shutdown.checkScheduleTick(localTime(8, 0, 55, 10));
    await shutdown.checkScheduleTick(localTime(8, 0, 59, 10));
    expect(host.calls).toEqual(["warn:10", "warn:5", "warn:1"]);

    await shutdown.checkScheduleTick(localTime(8, 1, 0));
    await shutdown.checkScheduleTick(localTime(8, 1, 0, 15));
    expect(host.calls.slice(3)).toEqual(["stopAll", "powerOff"]);
  });

  it("does nothing while disabled or blocked", async () => {
    shutdown.updateSchedule({ enabled: false });
    await shutdown.checkScheduleTick(localTime(8, 0, 50, 10));
    shutdown.updateSchedule({ enabled: true });
    shutdown.blockShutdown(localTime(8, 0, 0));
    await shutdown.checkScheduleTick(localTime(8, 0, 50, 10));
    await shutdown.checkScheduleTick(localTime(8, 1, 0));
    expect(host.calls).toEqual([]);
  });

  it("stops Minecraft before a manual power off or reboot, even when stopping fails", async () => {
    await shutdown.powerOff();
    await shutdown.reboot();
    expect(host.calls).toEqual(["stopAll", "powerOff", "stopAll", "reboot"]);

    const failing = new PulseShutdown(host.power, {
      broadcastShutdownWarning: async () => {},
      stopAll: async () => {
        throw new Error("tmux gone");
      },
    });
    host.calls.length = 0;
    await failing.powerOff();
    expect(host.calls).toEqual(["powerOff"]);
  });
});
