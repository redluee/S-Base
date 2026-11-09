import { existsSync, readdirSync, readFileSync, readlinkSync } from "fs";
import { resolve } from "path";

export class MinecraftProcesses {
  findPids(serverDir: string): number[] {
    const normTarget = resolve(serverDir);
    const pids = new Set<number>();

    try {
      if (existsSync("/proc")) {
        for (const entry of readdirSync("/proc")) {
          if (!/^\d+$/.test(entry)) continue;
          const pid = parseInt(entry, 10);
          if (pid === process.pid) continue;
          try {
            if (resolve(readlinkSync(`/proc/${pid}/cwd`)) === normTarget) {
              pids.add(pid);
              continue;
            }
          } catch {}
          try {
            if (readFileSync(`/proc/${pid}/cmdline`, "utf-8").includes(normTarget)) pids.add(pid);
          } catch {}
        }
      }
    } catch {}

    if (pids.size === 0) {
      try {
        const p = Bun.spawnSync(["pgrep", "-f", normTarget]);
        if (p.exitCode === 0) {
          for (const l of p.stdout.toString().split("\n").filter(Boolean)) {
            const pid = parseInt(l.trim(), 10);
            if (!Number.isNaN(pid) && pid !== process.pid) pids.add(pid);
          }
        }
      } catch {}
    }

    return Array.from(pids);
  }

  kill(pids: number[], signal: NodeJS.Signals) {
    for (const pid of pids) {
      try {
        process.kill(pid, signal);
      } catch {}
    }
  }
}
