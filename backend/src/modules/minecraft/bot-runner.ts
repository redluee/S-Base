import { MinecraftService } from "./index";
import { createDiscordBot } from "./discord-bot";

const minecraft = new MinecraftService();
const bot = createDiscordBot(minecraft);

if (!bot) {
  console.error("[Discord Bot Runner] Kan bot niet starten. Controleer of DISCORD_BOT_TOKEN is ingesteld in .env");
  process.exit(1);
}

process.on("SIGINT", () => {
  bot.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bot.stop();
  process.exit(0);
});
