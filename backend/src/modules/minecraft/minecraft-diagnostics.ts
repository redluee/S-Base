import { existsSync } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { readLogTail } from "./log-tail";
import type { MinecraftParts } from "./minecraft-parts";

const CLEAN_SHUTDOWN =
  /(Stopping\s+(the\s+)?server|Closing\s+Server|All\s+dimensions\s+are\s+saved|Saving\s+chunks|Server\s+empty\s+for\s+\d+\s+seconds,\s+pausing)/i;
const ERROR_LINE =
  /ERROR|FATAL|Exception in thread|Encountered an unexpected exception|FAILED TO BIND|Address already in use|You need to agree to the EULA/i;

export class MinecraftDiagnostics {
  constructor(private readonly parts: MinecraftParts) {}

  async startupError(slug: string): Promise<{ lines: string[]; crashReport?: string }> {
    const server = this.parts.servers.get(slug);
    const logPath = join(server.serverDir, "logs", "latest.log");

    try {
      if (!existsSync(logPath)) return { lines: [] };
      const allLines = await readLogTail(logPath, 50);
      if (CLEAN_SHUTDOWN.test(allLines.slice(-10).join("\n"))) return { lines: [] };

      const crDir = join(server.serverDir, "crash-reports");
      if (existsSync(crDir)) {
        const reports = (await readdir(crDir)).sort();
        const last = reports[reports.length - 1];
        if (last) {
          const reportPath = join(crDir, last);
          const [crStat, logStat] = await Promise.all([stat(reportPath), stat(logPath)]);
          if (crStat.mtimeMs >= logStat.mtimeMs - 60000) {
            const report = await readFile(reportPath, "utf-8");
            return { lines: report.split("\n").filter(Boolean).slice(0, 50), crashReport: report };
          }
        }
      }

      const filtered = allLines.filter((l) => ERROR_LINE.test(l));
      if (filtered.length > 0) return { lines: filtered };
    } catch {
      return { lines: [] };
    }

    return { lines: [] };
  }
}
