import { describe, expect, test } from "bun:test";
import {
  SystemUpdateService,
  UpdateAlreadyRunningError,
  parseDnfLine,
  splitOutputLines,
  type ParseResult,
  type UpdateProcess,
} from "./system-update-service";

const init: ParseResult = { phase: "starting", progress: null };

function run(lines: string[]): ParseResult {
  return lines.reduce((acc, l) => parseDnfLine(l, acc), init);
}

describe("parseDnfLine dnf5", () => {
  test("repositories", () => {
    expect(run(["Updating and loading repositories:"]).phase).toBe("repositories");
    expect(run(["Repositories loaded."]).phase).toBe("repositories");
  });
  test("resolving", () => {
    expect(run(["Transaction Summary:"]).phase).toBe("resolving");
    expect(run(["Total size of inbound packages is 120 MiB. Need to download 80 MiB."]).phase).toBe("resolving");
  });
  test("downloading with progress", () => {
    const r = run(["Transaction Summary:", "[ 3/40] foo-1.2-1.fc44.x86_64   100% |   5.0 MiB/s |   1.0 MiB |  00m00s"]);
    expect(r).toEqual({ phase: "downloading", progress: { current: 3, total: 40 } });
  });
  test("installing, cleanup, verifying", () => {
    expect(run(["Running transaction"]).phase).toBe("installing");
    expect(run(["[ 5/80] Upgrading foo-2.0-1.fc44.x86_64   100% | 1.0 MiB/s"])).toEqual({ phase: "installing", progress: { current: 5, total: 80 } });
    expect(run(["[60/80] Removing foo-1.0-1.fc44.x86_64   100%"])).toEqual({ phase: "cleanup", progress: { current: 60, total: 80 } });
    expect(run(["[ 1/80] Verify package files   100%"]).phase).toBe("verifying");
  });
  test("complete and nothing", () => {
    expect(run(["Complete!"]).phase).toBe("complete");
    expect(run(["Nothing to do."]).phase).toBe("nothing");
  });
});

describe("parseDnfLine dnf4", () => {
  test("flow", () => {
    expect(run(["Last metadata expiration check: 0:10:00 ago on Mon."]).phase).toBe("repositories");
    expect(run(["Dependencies resolved."]).phase).toBe("resolving");
    expect(run(["Downloading Packages:"]).phase).toBe("downloading");
    expect(run(["(3/40): foo-1.2.x86_64.rpm   2.0 MB/s | 1 MB  00:00"])).toEqual({ phase: "downloading", progress: { current: 3, total: 40 } });
    expect(run(["Running transaction"]).phase).toBe("installing");
    expect(run(["  Upgrading        : foo-2.0.x86_64     5/80"])).toEqual({ phase: "installing", progress: { current: 5, total: 80 } });
    expect(run(["  Cleanup          : foo-1.0.x86_64    12/80"])).toEqual({ phase: "cleanup", progress: { current: 12, total: 80 } });
    expect(run(["  Verifying        : foo-2.0.x86_64    20/80"])).toEqual({ phase: "verifying", progress: { current: 20, total: 80 } });
    expect(run(["Complete!"]).phase).toBe("complete");
    expect(run(["Nothing to do."]).phase).toBe("nothing");
  });
  test("summary table lines do not change phase", () => {
    const prev: ParseResult = { phase: "resolving", progress: null };
    expect(parseDnfLine("Installing:", prev)).toEqual(prev);
  });
});

describe("output splitting", () => {
  test("strips ANSI and splits on carriage returns", () => {
    expect(splitOutputLines("\x1b[1mfoo\x1b[0m\r[ 1/2] a\r[ 2/2] b\n")).toEqual(["foo", "[ 1/2] a", "[ 2/2] b"]);
  });
});

function fakeProcess(stdout: string, stderr: string, code: number, delayMs = 0): UpdateProcess {
  const enc = (s: string) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        if (s) c.enqueue(new TextEncoder().encode(s));
        c.close();
      },
    });
  return {
    stdout: enc(stdout),
    stderr: enc(stderr),
    exited: new Promise((r) => setTimeout(() => r(code), delayMs)),
  };
}

async function waitDone(svc: SystemUpdateService) {
  for (let i = 0; i < 200 && svc.isRunning(); i++) await Bun.sleep(5);
}

describe("SystemUpdateService", () => {
  test("success lifecycle", async () => {
    const svc = new SystemUpdateService(() =>
      fakeProcess("Updating and loading repositories:\nDownloading Packages:\n(1/2): a.rpm\nRunning transaction\n  Upgrading : a 1/2\nComplete!\n", "", 0, 10),
    );
    expect(svc.getState().status).toBe("idle");
    const s = svc.start();
    expect(s.status).toBe("running");
    expect(s.startedAt).not.toBeNull();
    await waitDone(svc);
    const done = svc.getState();
    expect(done.status).toBe("success");
    expect(done.phase).toBe("complete");
    expect(done.exitCode).toBe(0);
    expect(done.finishedAt).not.toBeNull();
    expect(done.error).toBeNull();
    expect(done.log).toContain("Complete!");
  });

  test("nothing to do ends as nothing", async () => {
    const svc = new SystemUpdateService(() => fakeProcess("Nothing to do.\n", "", 0));
    svc.start();
    await waitDone(svc);
    expect(svc.getState().status).toBe("success");
    expect(svc.getState().phase).toBe("nothing");
  });

  test("failure", async () => {
    const svc = new SystemUpdateService(() => fakeProcess("", "Error: failed to download\n", 1));
    svc.start();
    await waitDone(svc);
    const st = svc.getState();
    expect(st.status).toBe("failed");
    expect(st.phase).toBe("error");
    expect(st.exitCode).toBe(1);
    expect(st.error).toContain("failed to download");
  });

  test("sudo password error", async () => {
    const svc = new SystemUpdateService(() => fakeProcess("", "sudo: a password is required\n", 1));
    svc.start();
    await waitDone(svc);
    expect(svc.getState().error).toContain("Passwordless sudo for dnf is required");
  });

  test("double start rejected, restart allowed after finish", async () => {
    const svc = new SystemUpdateService(() => fakeProcess("Complete!\n", "", 0, 30));
    svc.start();
    expect(() => svc.start()).toThrow(UpdateAlreadyRunningError);
    await waitDone(svc);
    expect(svc.start().status).toBe("running");
    await waitDone(svc);
  });

  test("log capped at 200 lines", async () => {
    const out = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n") + "\n";
    const svc = new SystemUpdateService(() => fakeProcess(out, "", 0));
    svc.start();
    await waitDone(svc);
    const log = svc.getState().log;
    expect(log.length).toBe(200);
    expect(log[199]).toBe("line 499");
  });

  test("spawn throwing yields failed state", () => {
    const svc = new SystemUpdateService(() => {
      throw new Error("boom");
    });
    const st = svc.start();
    expect(st.status).toBe("failed");
    expect(st.error).toBe("boom");
  });
});
