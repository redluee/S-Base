import {
  ActivityType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import type { MinecraftService } from "./index";

const SIGNAL_GREEN = 0x00e3a4;
const SIGNAL_RED = 0xef4444;

const startCooldowns = new Map<string, number>();
const COOLDOWN_SECONDS = 60;

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

  async function updatePresence() {
    try {
      if (!client.user) return;
      const isOnline = minecraft.isRunning(defaultServerSlug);
      const server = minecraft.getServer(defaultServerSlug);
      const serverName = server?.displayName || defaultServerSlug;

      if (isOnline) {
        const players = minecraft.getOnlinePlayers(defaultServerSlug);
        const count = players.length;
        client.user.setPresence({
          status: "online",
          activities: [
            {
              name: `${serverName} | ${count} online`,
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

  function getAvailableServerSlugs(): string[] {
    try {
      const all = minecraft.listServersForUser(0, true);
      return all.map((s) => s.slug);
    } catch {
      return [defaultServerSlug];
    }
  }

  client.once(Events.ClientReady, async () => {
    console.log(`[Discord Bot] Ingelogd als ${client.user?.tag}`);

    // Register slash commands globally
    try {
      const statusCommand = new SlashCommandBuilder()
        .setName("status")
        .setDescription("Bekijk de status en online spelers van de Minecraft server")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription(`De server (standaard: ${defaultServerSlug})`)
            .setRequired(false),
        );

      const startCommand = new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start de Minecraft server op als deze offline is")
        .addStringOption((option) =>
          option
            .setName("server")
            .setDescription(`De server om te starten (standaard: ${defaultServerSlug})`)
            .setRequired(false),
        );

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
    const requestedSlug = (interaction.options.getString("server") || defaultServerSlug).trim().toLowerCase();

    if (commandName === "status") {
      await handleStatusCommand(interaction, requestedSlug);
    } else if (commandName === "start") {
      await handleStartCommand(interaction, requestedSlug);
    }
  });

  async function handleStatusCommand(interaction: ChatInputCommandInteraction, slug: string) {
    try {
      const server = minecraft.getServer(slug);
      if (!server) {
        const available = getAvailableServerSlugs().map((s) => `\`${s}\``).join(", ");
        await interaction.reply({
          content: `❌ Server \`${slug}\` is niet gevonden.\nBeschikbare servers: ${available || "geen"}`,
          ephemeral: true,
        });
        return;
      }

      const isOnline = minecraft.isRunning(slug);
      const players = isOnline ? minecraft.getOnlinePlayers(slug) : [];
      let maxPlayers = "20";

      try {
        const props = await minecraft.readProperties(slug);
        if (props["max-players"]) {
          maxPlayers = props["max-players"];
        }
      } catch {
        // use default max-players
      }

      const playerListText =
        players.length > 0
          ? players.map((p) => `• **${p.playerName}**`).join("\n")
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
            value: isOnline ? `👥 **${players.length} / ${maxPlayers}**` : "—",
            inline: true,
          },
          {
            name: "Versie & Engine",
            value: `⚙️ ${server.engine} ${server.mcVersion}`,
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

      await interaction.reply({ embeds: [embed] });
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
      const server = minecraft.getServer(slug);
      if (!server) {
        const available = getAvailableServerSlugs().map((s) => `\`${s}\``).join(", ");
        await interaction.reply({
          content: `❌ Server \`${slug}\` is niet gevonden.\nBeschikbare servers: ${available || "geen"}`,
          ephemeral: true,
        });
        return;
      }

      // Check if already running
      if (minecraft.isRunning(slug)) {
        await interaction.reply({
          content: `🟢 De server **${server.displayName}** draait al! Gebruik \`/status\` om de spelers te bekijken.`,
          ephemeral: true,
        });
        return;
      }

      // Check cooldown
      const now = Date.now();
      const lastStarted = startCooldowns.get(slug) || 0;
      const elapsedSeconds = Math.floor((now - lastStarted) / 1000);

      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsedSeconds;
        await interaction.reply({
          content: `⏳ Server **${server.displayName}** is recent gestart. Wacht nog **${remaining}s** voor een nieuw startverzoek.`,
          ephemeral: true,
        });
        return;
      }

      // Acknowledge interaction quickly to avoid Discord 3-second timeout
      await interaction.deferReply();

      // Record start timestamp
      startCooldowns.set(slug, now);

      // Trigger start
      await minecraft.startServer(slug);

      const embed = new EmbedBuilder()
        .setTitle(`🚀 Server Wordt Opgestart: ${server.displayName}`)
        .setColor(SIGNAL_GREEN)
        .setDescription(
          `De server **${server.displayName}** wordt nu opgestart!\n\n` +
            `⏱️ Het opstarten duurt doorgaans **30 tot 60 seconden**.\n` +
            `🔍 Gebruik over een minuutje \`/status\` om te zien wanneer hij gereed is om te joinen.`,
        )
        .addFields({
          name: "Gestart door",
          value: `<@${interaction.user.id}>`,
          inline: true,
        })
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
