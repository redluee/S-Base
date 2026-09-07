import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { ServerShutdownService } from "./shutdown-service";

describe("ServerShutdownService", () => {
  let shutdownService: ServerShutdownService;

  beforeEach(async () => {
    await setupTestDb();
    shutdownService = new ServerShutdownService(undefined, false);
  });

  it("loads default schedule status", () => {
    const status = shutdownService.getStatus(new Date("2026-09-07T23:00:00Z"));
    expect(status.enabled).toBe(true);
    expect(status.time).toBe("01:00");
    expect(status.isBlocked).toBe(false);
    expect(status.nextShutdownAt).toBeDefined();
  });

  it("computes next shutdown date correctly across day boundaries", () => {
    const fromEvening = new Date("2026-09-07T23:00:00.000Z");
    const next1 = shutdownService.getNextShutdownDate("01:00", fromEvening);
    expect(next1.getDate()).toBe(8);
    expect(next1.getHours()).toBe(1);

    const fromPastTarget = new Date("2026-09-08T01:10:00.000Z");
    const next2 = shutdownService.getNextShutdownDate("01:00", fromPastTarget);
    expect(next2.getDate()).toBe(9);
    expect(next2.getHours()).toBe(1);
  });

  it("updates schedule time and validates format", () => {
    const updated = shutdownService.updateSchedule({ time: "02:30" });
    expect(updated.time).toBe("02:30");

    expect(() => {
      shutdownService.updateSchedule({ time: "25:00" });
    }).toThrow();

    expect(() => {
      shutdownService.updateSchedule({ time: "invalid" });
    }).toThrow();

    const disabled = shutdownService.updateSchedule({ enabled: false });
    expect(disabled.enabled).toBe(false);
  });

  it("handles blocking and unblocking upcoming shutdown", () => {
    const fromTime = new Date("2026-09-07T23:00:00.000Z");
    const blockedStatus = shutdownService.blockShutdown(fromTime);
    expect(blockedStatus.isBlocked).toBe(true);
    expect(blockedStatus.blockedUntil).toBeDefined();

    const unblockedStatus = shutdownService.unblockShutdown(fromTime);
    expect(unblockedStatus.isBlocked).toBe(false);
    expect(unblockedStatus.blockedUntil).toBeNull();
  });

  it("dispatches chat warnings to running servers only when players are online", async () => {
    const sentCommands: { slug: string; cmd: string }[] = [];
    const stoppedServers: string[] = [];

    const mockMc: any = {
      listServers: () => [{ slug: "server-a" }, { slug: "server-b" }],
      isRunning: (slug: string) => true,
      getOnlinePlayers: (slug: string) => (slug === "server-a" ? [{ username: "Steve" }] : []),
      sendCommand: async (slug: string, cmd: string) => {
        sentCommands.push({ slug, cmd });
      },
      stopServer: async (slug: string) => {
        stoppedServers.push(slug);
        return { ok: true };
      },
    };

    const serviceWithMock = new ServerShutdownService(mockMc, false);

    // Test 10 minutes warning
    const testNow10m = new Date("2026-09-08T00:50:10.000Z"); // 9m 50s before 01:00
    // Force target to 01:00
    serviceWithMock.updateSchedule({ time: "01:00", enabled: true });
    await serviceWithMock.checkScheduleTick(testNow10m);

    // Only server-a had players online
    expect(sentCommands.length).toBe(1);
    expect(sentCommands[0].slug).toBe("server-a");
    expect(sentCommands[0].cmd).toContain("10 minuten");

    // Clear and test 5 minutes warning
    sentCommands.length = 0;
    const testNow5m = new Date("2026-09-08T00:55:10.000Z");
    await serviceWithMock.checkScheduleTick(testNow5m);
    expect(sentCommands.length).toBe(1);
    expect(sentCommands[0].slug).toBe("server-a");
    expect(sentCommands[0].cmd).toContain("5 minuten");

    // Clear and test 1 minute warning
    sentCommands.length = 0;
    const testNow1m = new Date("2026-09-08T00:59:10.000Z");
    await serviceWithMock.checkScheduleTick(testNow1m);
    expect(sentCommands.length).toBe(1);
    expect(sentCommands[0].slug).toBe("server-a");
    expect(sentCommands[0].cmd).toContain("1 minuut");

    // Test shutdown trigger at 01:00:00
    const testNow0m = new Date("2026-09-08T01:00:00.000Z");
    await serviceWithMock.checkScheduleTick(testNow0m);
    expect(stoppedServers).toContain("server-a");
    expect(stoppedServers).toContain("server-b");
  });

  it("does not send warnings or execute shutdown when blocked", async () => {
    const sentCommands: { slug: string; cmd: string }[] = [];
    const mockMc: any = {
      listServers: () => [{ slug: "server-a" }],
      isRunning: () => true,
      getOnlinePlayers: () => [{ username: "Player" }],
      sendCommand: async (slug: string, cmd: string) => {
        sentCommands.push({ slug, cmd });
      },
      stopServer: async () => ({ ok: true }),
    };

    const service = new ServerShutdownService(mockMc, false);
    service.blockShutdown(new Date("2026-09-08T00:00:00.000Z"));

    const testNow10m = new Date("2026-09-08T00:50:10.000Z");
    await service.checkScheduleTick(testNow10m);
    expect(sentCommands.length).toBe(0);
  });
});
