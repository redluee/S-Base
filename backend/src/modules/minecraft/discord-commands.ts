import { ChatInputCommandInteraction, Client, EmbedBuilder } from "discord.js";
import type { MinecraftService } from "./index";
import { SIGNAL_GREEN, SIGNAL_RED, startCooldowns, COOLDOWN_SECONDS, pingMinecraftServer, pingTcpPort, getPlayerAvatarEmoji } from "./discord-net";

interface DiscordCommandContext {
  minecraft: MinecraftService;
  client: Client;
  defaultServerSlug: string;
  updatePresence: () => Promise<void>;
}

export function createDiscordCommands(ctx: DiscordCommandContext) {
  const { minecraft, client, defaultServerSlug, updatePresence } = ctx;

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

  return { getServerStatusAndPlayers, handleStatusCommand, handleStartCommand };
}
