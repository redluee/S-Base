import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import type { MinecraftService } from "./index";
import { emojiCache } from "./discord-net";
import { createDiscordCommands } from "./discord-commands";

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
    defaultServerSlug,
    updatePresence: () => updatePresence(),
  });

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
