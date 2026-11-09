import type { MinecraftParts } from "./minecraft-parts";

export const DEFAULT_AUTO_SHUTDOWN_MINUTES = 15;
export const DEFAULT_IDLE_CHECK_INTERVAL_MS = 15000;

export class MinecraftIdle {
  autoShutdownMinutes: number = Number(process.env.MC_EMPTY_SHUTDOWN_MINUTES) || DEFAULT_AUTO_SHUTDOWN_MINUTES;
  private readonly emptySince = new Map<string, number>();
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly parts: MinecraftParts) {}

  start(intervalMs = DEFAULT_IDLE_CHECK_INTERVAL_MS) {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.check().catch(() => {});
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getEmptySince(slug: string): number | null {
    return this.emptySince.get(slug) ?? null;
  }

  markEmpty(slug: string, timestamp = Date.now()) {
    this.emptySince.set(slug, timestamp);
  }

  clearEmpty(slug: string) {
    this.emptySince.delete(slug);
  }

  async check() {
    const maxIdleMs = Math.max(1, this.autoShutdownMinutes) * 60 * 1000;
    const now = Date.now();

    for (const { slug } of this.parts.servers.rows()) {
      if (!this.parts.lifecycle.isRunning(slug)) {
        this.clearEmpty(slug);
        continue;
      }
      if (this.parts.players.getOnline(slug).length > 0) {
        this.clearEmpty(slug);
        continue;
      }
      const since = this.emptySince.get(slug);
      if (since === undefined) {
        this.markEmpty(slug, now);
      } else if (now - since >= maxIdleMs) {
        console.log(
          `[Minecraft] Server "${slug}" auto-stopping: no players online for ${this.autoShutdownMinutes} minutes.`,
        );
        this.clearEmpty(slug);
        await this.parts.lifecycle.stopServer(slug);
      }
    }
  }
}
