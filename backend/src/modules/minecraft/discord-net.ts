import { Socket } from "net";
import type { Client } from "discord.js";

export const SIGNAL_GREEN = 0x00e3a4;
export const SIGNAL_RED = 0xef4444;

export const startCooldowns = new Map<string, number>();
export const COOLDOWN_SECONDS = 60;
export const emojiCache = new Map<string, string>();

interface PingResult {
  online: boolean;
  onlineCount: number;
  maxCount: number;
  players: string[];
}

export function pingMinecraftServer(host: string, port: number, timeoutMs = 800): Promise<PingResult | null> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let isResolved = false;
    let received = Buffer.alloc(0);

    const finish = (result: PingResult | null) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      const hostBuf = Buffer.from(host, "utf-8");
      const hostLen = Buffer.from([hostBuf.length]);
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port, 0);

      const handshakeData = Buffer.concat([
        Buffer.from([0x00]), // packet id 0
        Buffer.from([0xff, 0xff, 0xff, 0xff, 0x0f]), // protocol -1 as 5-byte varint
        hostLen,
        hostBuf,
        portBuf,
        Buffer.from([0x01]), // state 1 (status)
      ]);

      const handshake = Buffer.concat([Buffer.from([handshakeData.length]), handshakeData]);
      const statusReq = Buffer.from([0x01, 0x00]);

      socket.write(handshake);
      socket.write(statusReq);
    });

    socket.on("data", (data) => {
      received = Buffer.concat([received, data]);
      try {
        const str = received.toString("utf-8");
        const jsonStart = str.indexOf("{");
        const jsonEnd = str.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const json = JSON.parse(str.slice(jsonStart, jsonEnd + 1));
          finish({
            online: true,
            onlineCount: json.players?.online ?? 0,
            maxCount: json.players?.max ?? 20,
            players: (json.players?.sample ?? []).map((p: any) => p.name).filter(Boolean),
          });
        }
      } catch {}
    });

    socket.on("timeout", () => finish(null));
    socket.on("error", () => finish(null));
    socket.on("close", () => finish(null));

    socket.connect(port, host);
  });
}

export function pingTcpPort(host: string, port: number, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on("timeout", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on("error", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

export async function getPlayerAvatarEmoji(client: Client, playerName: string): Promise<string> {
  const sanitized = playerName.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 28);
  const emojiName = `mc_${sanitized || "player"}`;

  if (emojiCache.has(emojiName)) {
    return emojiCache.get(emojiName)!;
  }

  try {
    if (!client.application) return "👤";

    // Check if application already has this emoji cached
    const existing = client.application.emojis.cache.find((e) => e.name === emojiName);
    if (existing) {
      const emojiStr = `<:${existing.name}:${existing.id}>`;
      emojiCache.set(emojiName, emojiStr);
      return emojiStr;
    }

    // Fetch avatar from mc-heads
    const res = await fetch(`https://mc-heads.net/avatar/${encodeURIComponent(playerName)}/32.png`, {
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 0 && buf.length < 256 * 1024) {
        const created = await client.application.emojis.create({
          attachment: buf,
          name: emojiName,
        });
        const emojiStr = `<:${created.name}:${created.id}>`;
        emojiCache.set(emojiName, emojiStr);
        return emojiStr;
      }
    }
  } catch (err) {
    console.error(`[Discord Bot] Kon avatar emoji niet aanmaken voor ${playerName}:`, err);
  }

  return "👤";
}
