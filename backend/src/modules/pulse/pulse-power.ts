import { existsSync } from "fs";

export interface PowerControl {
  reboot(): Promise<void>;
  powerOff(): Promise<void>;
}

const SHUTDOWN_SCRIPT = "/home/gsd/shutdown_server.sh";

async function runFirstSuccessful(commands: string[][]) {
  for (const cmd of commands) {
    try {
      const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
      const code = await proc.exited;
      if (code === 0) return;
      const stderr = await new Response(proc.stderr).text();
      console.error(`[Pulse] "${cmd.join(" ")}" exited with code ${code}: ${stderr.trim()}`);
    } catch (err) {
      console.error(`[Pulse] Failed to execute "${cmd.join(" ")}":`, err);
    }
  }
}

export const systemPower: PowerControl = {
  reboot: () =>
    runFirstSuccessful([
      ["systemctl", "reboot"],
      ["sudo", "-n", "systemctl", "reboot"],
    ]),
  powerOff: () =>
    runFirstSuccessful([
      ...(existsSync(SHUTDOWN_SCRIPT) ? [[SHUTDOWN_SCRIPT]] : []),
      ["sudo", "-n", "shutdown", "-h", "now"],
      ["systemctl", "poweroff"],
    ]),
};

export const inertPower: PowerControl = {
  reboot: async () => {},
  powerOff: async () => {},
};
