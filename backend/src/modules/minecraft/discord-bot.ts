import {
  ActivityType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import { Socket } from "net";
import type { MinecraftService } from "./index";

const SIGNAL_GREEN = 0x00e3a4;
const SIGNAL_RED = 0xef4444;

const startCooldowns = new Map<string, number>();
const COOLDOWN_SECONDS = 60;
const emojiCache = new Map<string, string>();

interface PingResult {
  online: boolean;
  onlineCount: number;
  maxCount: number;
  players: string[];
}

function pingMinecraftServer(host: string, port: number, timeoutMs = 800): Promise<PingResult | null> {
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

function pingTcpPort(host: string, port: number, timeoutMs = 500): Promise<boolean> {
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

async function getPlayerAvatarEmoji(client: Client, playerName: string): Promise<string> {
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

export function createDiscordBot(minecraft: MinecraftService) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const defaultServerSlug = (process.env.DISCORD_BOT_DEFAULT_SERVER || "hangout").trim().toLowerCase();

  if (!token) {
    console.log("[Discord Bot] DISCORD_BOT_TOKEN not configured. Discord bot is disabled.");
    return null;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  let presenceInterval: ReturnType<typeof setInterval> | null = null;

  async function getServerPort(slug: string): Promise<number> {
    try {
      const props = await minecraft.readProperties(slug);
      if (props["server-port"]) {
        const p = parseInt(props["server-port"], 10);
        if (!isNaN(p) && p > 0) return p;
      }
    } catch {}
    return 25565;
  }

  async function getServerStatusAndPlayers(slug: string) {
    const port = await getServerPort(slug);
    const slp = await pingMinecraftServer("127.0.0.1", port);
    const processRunning = minecraft.isRunning(slug);
    const portOpen = slp?.online ?? (await pingTcpPort("127.0.0.1", port));
    const isOnline = processRunning || portOpen;

    let maxPlayers = slp ? String(slp.maxCount) : "20";
    try {
      const props = await minecraft.readProperties(slug);
      if (props["max-players"]) {
        maxPlayers = props["max-players"];
      }
    } catch {}

    const trackedPlayers = isOnline ? minecraft.getOnlinePlayers(slug).map((p) => p.playerName) : [];
    const slpPlayers = slp?.players ?? [];
    const playerNames = Array.from(new Set([...trackedPlayers, ...slpPlayers]));
    const playerCount = Math.max(playerNames.length, slp?.onlineCount ?? 0);

    return {
      isOnline,
      maxPlayers,
      playerNames,
      playerCount,
    };
  }

  async function updatePresence() {
    try {
      if (!client.user) return;
      const server = minecraft.getServer(defaultServerSlug);
      const serverName = server?.displayName || defaultServerSlug;
      const { isOnline, playerCount } = await getServerStatusAndPlayers(defaultServerSlug);

      if (isOnline) {
        client.user.setPresence({
          status: "online",
          activities: [
            {
              name: `${serverName} | ${playerCount} online`,
              type: ActivityType.Playing,
            },
          ],
        });
      } else {
        client.user.setPresence({
          status: "idle",
          activities: [
            {
              name: `${serverName} (Offline)`,
              type: ActivityType.Watching,
            },
          ],
        });
      }
    } catch (err) {
      console.error("[Discord Bot] Failed to update presence:", err);
    }
  }

  client.once(Events.ClientReady, async () => {
    console.log(`[Discord Bot] Ingelogd als ${client.user?.tag}`);

    // Pre-cache application emojis
    try {
      const existingEmojis = await client.application?.emojis.fetch();
      if (existingEmojis) {
        for (const [id, e] of existingEmojis) {
          if (e.name) {
            emojiCache.set(e.name, `<:${e.name}:${id}>`);
          }
        }
      }
    } catch (err) {
      console.error("[Discord Bot] Kon bestaande application emojis niet ophalen:", err);
    }

    // Register slash commands globally
    try {
      const statusCommand = new SlashCommandBuilder()
        .setName("status")
        .setDescription("Bekijk de status en online spelers van de Hangout Minecraft server");

      const startCommand = new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start de Hangout Minecraft server op als deze offline is");

      await client.application?.commands.set([statusCommand, startCommand]);
      console.log("[Discord Bot] Slash commands (/status, /start) geregistreerd.");
    } catch (err) {
      console.error("[Discord Bot] Kon slash commands niet registreren:", err);
    }

    // Initial presence update and periodic interval every 45s
    await updatePresence();
    presenceInterval = setInterval(updatePresence, 45000);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "status") {
      await handleStatusCommand(interaction, defaultServerSlug);
    } else if (commandName === "start") {
      await handleStartCommand(interaction, defaultServerSlug);
    }
  });

  async function handleStatusCommand(interaction: ChatInputCommandInteraction, slug: string) {
    try {
      if (slug !== defaultServerSlug) {
        await interaction.reply({
          content: `❌ Alleen de status van server **${defaultServerSlug}** mag via Discord worden opgevraagd.`,
          ephemeral: true,
        });
        return;
      }

      const server = minecraft.getServer(slug);
      if (!server) {
        await interaction.reply({
          content: `❌ Server \`${slug}\` is niet gevonden in S-Base.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const { isOnline, maxPlayers, playerNames, playerCount } = await getServerStatusAndPlayers(slug);

      const playerListItems = await Promise.all(
        playerNames.map(async (name) => {
          const avatar = await getPlayerAvatarEmoji(client, name);
          return `${avatar} **${name}**`;
        }),
      );

      const playerListText =
        playerListItems.length > 0
          ? playerListItems.join("\n")
          : isOnline
            ? "*Geen spelers momenteel online*"
            : "*Server is offline*";

      const embed = new EmbedBuilder()
        .setTitle(`⛏️ Minecraft Server: ${server.displayName}`)
        .setColor(isOnline ? SIGNAL_GREEN : SIGNAL_RED)
        .addFields(
          {
            name: "Status",
            value: isOnline ? "🟢 **Online**" : "🔴 **Offline**",
            inline: true,
          },
          {
            name: "Spelers",
            value: isOnline ? `👥 **${playerCount} / ${maxPlayers}**` : "—",
            inline: true,
          },
          {
            name: "Online Spelers",
            value: playerListText,
            inline: false,
          },
        )
        .setFooter({ text: "S-Base Minecraft Monitor" })
        .setTimestamp();

      if (!isOnline) {
        embed.setDescription("De server staat momenteel uit. Gebruik `/start` om hem op te starten!");
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error(`[Discord Bot] Fout bij /status voor ${slug}:`, err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "Er is een fout opgetreden bij het ophalen van de status." });
      } else {
        await interaction.reply({
          content: "Er is een fout opgetreden bij het ophalen van de status.",
          ephemeral: true,
        });
      }
    }
  }

  async function handleStartCommand(interaction: ChatInputCommandInteraction, slug: string) {
    try {
      if (slug !== defaultServerSlug) {
        await interaction.reply({
          content: `❌ Alleen de server **${defaultServerSlug}** mag via Discord worden gestart.`,
          ephemeral: true,
        });
        return;
      }

      const server = minecraft.getServer(slug);
      if (!server) {
        await interaction.reply({
          content: `❌ Server \`${slug}\` is niet gevonden in S-Base.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      // Check if already running using both process and live network check
      const status = await getServerStatusAndPlayers(slug);
      if (status.isOnline) {
        const playerListItems = await Promise.all(
          status.playerNames.map(async (name) => {
            const avatar = await getPlayerAvatarEmoji(client, name);
            return `${avatar} **${name}**`;
          }),
        );

        const playerListText =
          playerListItems.length > 0
            ? playerListItems.join("\n")
            : "*Geen spelers momenteel online*";

        const alreadyOnEmbed = new EmbedBuilder()
          .setTitle(`🟢 Server Draait Al: ${server.displayName}`)
          .setColor(SIGNAL_GREEN)
          .setDescription(
            `De server **${server.displayName}** staat al aan!\n\nGebruik \`/status\` om de volledige status te bekijken.`,
          )
          .addFields(
            {
              name: "Spelers",
              value: `👥 **${status.playerCount} / ${status.maxPlayers}**`,
              inline: true,
            },
            {
              name: "Online Spelers",
              value: playerListText,
              inline: false,
            },
          )
          .setFooter({ text: "S-Base Minecraft Monitor" })
          .setTimestamp();

        await interaction.editReply({ embeds: [alreadyOnEmbed] });
        return;
      }

      // Check cooldown
      const now = Date.now();
      const lastStarted = startCooldowns.get(slug) || 0;
      const elapsedSeconds = Math.floor((now - lastStarted) / 1000);

      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsedSeconds;
        await interaction.editReply({
          content: `⏳ Server **${server.displayName}** is recent gestart. Wacht nog **${remaining}s** voor een nieuw startverzoek.`,
        });
        return;
      }

      // Record start timestamp
      startCooldowns.set(slug, now);

      // Trigger start
      await minecraft.startServer(slug);

      const embed = new EmbedBuilder()
        .setTitle(`🚀 Server Wordt Opgestart: ${server.displayName}`)
        .setColor(SIGNAL_GREEN)
        .setDescription(
          `De server **${server.displayName}** wordt nu opgestart.\n\nGebruik \`/status\` om de status en online spelers te bekijken.`,
        )
        .setFooter({ text: "S-Base Minecraft Monitor" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Trigger an immediate presence check update soon
      setTimeout(updatePresence, 15000);
    } catch (err: any) {
      console.error(`[Discord Bot] Fout bij /start voor ${slug}:`, err);
      const errMsg = err?.message ? `Fout: ${err.message}` : "Onbekende fout.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `❌ Kon server **${slug}** niet starten. ${errMsg}`,
        });
      } else {
        await interaction.reply({
          content: `❌ Kon server **${slug}** niet starten. ${errMsg}`,
          ephemeral: true,
        });
      }
    }
  }

  // Connect bot asynchronously
  client.login(token).catch((err) => {
    console.error("[Discord Bot] Inloggen mislukt (controleer token of netwerkverbinding):", err.message);
  });

  return {
    client,
    stop: () => {
      if (presenceInterval) clearInterval(presenceInterval);
      client.destroy();
      console.log("[Discord Bot] Bot netjes afgesloten.");
    },
  };
}
