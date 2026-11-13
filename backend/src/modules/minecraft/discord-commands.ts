import { type ChatInputCommandInteraction, type Client, EmbedBuilder } from "discord.js";
import { DEFAULT_SERVER_PORT } from "../../shared/minecraft";
import { NotFoundError } from "../../utils/errors";
import {
  COOLDOWN_SECONDS,
  getPlayerAvatarEmoji,
  pingMinecraftServer,
  pingTcpPort,
  SIGNAL_GREEN,
  SIGNAL_RED,
  startCooldowns,
} from "./discord-net";
import type { MinecraftService } from "./index";

const LOCALHOST = "127.0.0.1";
const DEFAULT_MAX_PLAYERS = "20";
const PRESENCE_REFRESH_AFTER_START_MS = 15000;
const FOOTER = { text: "S-Base Minecraft Monitor" };

interface DiscordCommandContext {
  minecraft: MinecraftService;
  client: Client;
  serverSlug: string;
  updatePresence: () => Promise<void>;
}

export function createDiscordCommands(ctx: DiscordCommandContext) {
  const { minecraft, client, serverSlug, updatePresence } = ctx;

  function serverPort(props: Record<string, string>): number {
    const port = Number.parseInt(props["server-port"] ?? "", 10);
    return Number.isNaN(port) || port <= 0 ? DEFAULT_SERVER_PORT : port;
  }

  async function getServerStatusAndPlayers() {
    const props = minecraft.servers.exists(serverSlug) ? await minecraft.properties.read(serverSlug) : {};
    const port = serverPort(props);
    const slp = await pingMinecraftServer(LOCALHOST, port);
    const processRunning = minecraft.lifecycle.isRunning(serverSlug);
    const portOpen = slp?.online ?? (await pingTcpPort(LOCALHOST, port));
    const isOnline = processRunning || portOpen;
    const maxPlayers = props["max-players"] || (slp ? String(slp.maxCount) : DEFAULT_MAX_PLAYERS);

    const trackedPlayers =
      isOnline && minecraft.servers.exists(serverSlug)
        ? minecraft.players.getOnline(serverSlug).map((p) => p.playerName)
        : [];
    const playerNames = Array.from(new Set([...trackedPlayers, ...(slp?.players ?? [])]));
    const playerCount = Math.max(playerNames.length, slp?.onlineCount ?? 0);

    return { isOnline, maxPlayers, playerNames, playerCount };
  }

  async function playerList(names: string[]): Promise<string[]> {
    return Promise.all(names.map(async (name) => `${await getPlayerAvatarEmoji(client, name)} **${name}**`));
  }

  async function replyError(interaction: ChatInputCommandInteraction, content: string) {
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content });
    else await interaction.reply({ content, ephemeral: true });
  }

  function notFoundText() {
    return `❌ Server \`${serverSlug}\` is niet gevonden in S-Base.`;
  }

  async function handleStatusCommand(interaction: ChatInputCommandInteraction) {
    try {
      const server = minecraft.servers.get(serverSlug);
      await interaction.deferReply();

      const { isOnline, maxPlayers, playerNames, playerCount } = await getServerStatusAndPlayers();
      const players = await playerList(playerNames);
      const emptyText = isOnline ? "*Geen spelers momenteel online*" : "*Server is offline*";

      const embed = new EmbedBuilder()
        .setTitle(`⛏️ Minecraft Server: ${server.displayName}`)
        .setColor(isOnline ? SIGNAL_GREEN : SIGNAL_RED)
        .addFields(
          { name: "Status", value: isOnline ? "🟢 **Online**" : "🔴 **Offline**", inline: true },
          { name: "Spelers", value: isOnline ? `👥 **${playerCount} / ${maxPlayers}**` : "—", inline: true },
          { name: "Online Spelers", value: players.length > 0 ? players.join("\n") : emptyText, inline: false },
        )
        .setFooter(FOOTER)
        .setTimestamp();

      if (!isOnline) {
        embed.setDescription("De server staat momenteel uit. Gebruik `/start` om hem op te starten!");
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err instanceof NotFoundError) return replyError(interaction, notFoundText());
      console.error(`[Discord Bot] Fout bij /status voor ${serverSlug}:`, err);
      await replyError(interaction, "Er is een fout opgetreden bij het ophalen van de status.");
    }
  }

  async function handleStartCommand(interaction: ChatInputCommandInteraction) {
    try {
      const server = minecraft.servers.get(serverSlug);
      await interaction.deferReply();

      const status = await getServerStatusAndPlayers();
      if (status.isOnline) {
        const players = await playerList(status.playerNames);
        const alreadyOnEmbed = new EmbedBuilder()
          .setTitle(`🟢 Server Draait Al: ${server.displayName}`)
          .setColor(SIGNAL_GREEN)
          .setDescription(
            `De server **${server.displayName}** staat al aan!\n\nGebruik \`/status\` om de volledige status te bekijken.`,
          )
          .addFields(
            { name: "Spelers", value: `👥 **${status.playerCount} / ${status.maxPlayers}**`, inline: true },
            {
              name: "Online Spelers",
              value: players.length > 0 ? players.join("\n") : "*Geen spelers momenteel online*",
              inline: false,
            },
          )
          .setFooter(FOOTER)
          .setTimestamp();

        await interaction.editReply({ embeds: [alreadyOnEmbed] });
        return;
      }

      const now = Date.now();
      const elapsedSeconds = Math.floor((now - (startCooldowns.get(serverSlug) || 0)) / 1000);
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsedSeconds;
        await interaction.editReply({
          content: `⏳ Server **${server.displayName}** is recent gestart. Wacht nog **${remaining}s** voor een nieuw startverzoek.`,
        });
        return;
      }

      startCooldowns.set(serverSlug, now);
      await minecraft.lifecycle.startServer(serverSlug);

      const embed = new EmbedBuilder()
        .setTitle(`🚀 Server Wordt Opgestart: ${server.displayName}`)
        .setColor(SIGNAL_GREEN)
        .setDescription(
          `De server **${server.displayName}** wordt nu opgestart.\n\nGebruik \`/status\` om de status en online spelers te bekijken.`,
        )
        .setFooter(FOOTER)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      setTimeout(updatePresence, PRESENCE_REFRESH_AFTER_START_MS);
    } catch (err) {
      if (err instanceof NotFoundError) return replyError(interaction, notFoundText());
      console.error(`[Discord Bot] Fout bij /start voor ${serverSlug}:`, err);
      const errMsg = err instanceof Error && err.message ? `Fout: ${err.message}` : "Onbekende fout.";
      await replyError(interaction, `❌ Kon server **${serverSlug}** niet starten. ${errMsg}`);
    }
  }

  return { getServerStatusAndPlayers, handleStatusCommand, handleStartCommand };
}
