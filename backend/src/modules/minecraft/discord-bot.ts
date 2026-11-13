import { ActivityType, Client, Events, GatewayIntentBits, SlashCommandBuilder } from "discord.js";
import type { MinecraftService } from "./index";
import { emojiCache } from "./discord-net";
import { createDiscordCommands } from "./discord-commands";

const PRESENCE_INTERVAL_MS = 45000;

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

  const { getServerStatusAndPlayers, handleStatusCommand, handleStartCommand } = createDiscordCommands({
    minecraft,
    client,
    serverSlug: defaultServerSlug,
    updatePresence: () => updatePresence(),
  });

  async function updatePresence() {
    try {
      if (!client.user) return;
      const serverName = minecraft.servers.exists(defaultServerSlug)
        ? minecraft.servers.get(defaultServerSlug).displayName
        : defaultServerSlug;
      const { isOnline, playerCount } = await getServerStatusAndPlayers();

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

    await updatePresence();
    presenceInterval = setInterval(updatePresence, PRESENCE_INTERVAL_MS);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "status") {
      await handleStatusCommand(interaction);
    } else if (commandName === "start") {
      await handleStartCommand(interaction);
    }
  });

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
