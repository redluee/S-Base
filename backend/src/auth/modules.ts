import { eq } from "drizzle-orm";
import db from "../db/client";
import { modules } from "../db/schema";

export const DEFAULT_MODULES = [
  { name: "finance", alias: "Finance", description: "Persoonlijke rekeningen, saldoverloop en abonnementen" },
  { name: "recipes", alias: "Smaak Tracker", description: "Module voor het beheren van recepten en wijnen" },
  {
    name: "workout",
    alias: "Workout Studio",
    description: "Module voor het beheren van workouts, trainingssessies en lichaamsmetingen",
  },
  { name: "cashflow", alias: "Cashflow", description: "Module voor facturatie en financieel beheer" },
  { name: "you", alias: "Voor Jou", description: "Toegang tot stevenheijn.nl/you" },
  { name: "lyric_quotes", alias: "Lyric Quotes", description: "Toegang tot stevenheijn.nl/lyric_quotes" },
  { name: "pulse", alias: "Pulse", description: "Monitoring & admin paneel" },
  { name: "minecraft", alias: "Lobby Control", description: "Beheer van Minecraft server instances" },
  {
    name: "minecraft:monitor",
    alias: "Minecraft (Monitor)",
    description: "Alleen server starten en monitoren, niet aanpassen of stoppen",
  },
  {
    name: "minor",
    alias: "Minor Tracker",
    description: "Module voor sprintbeheer, leeruitkomsten, bewijslast en Show & Grow portfolio",
  },
  {
    name: "resume",
    alias: "CV Builder",
    description: "Module voor het samenstellen en exporteren van CV's op basis van ervaring en opleidingen",
  },
] as const;

export type ModuleName = (typeof DEFAULT_MODULES)[number]["name"];

export function ensureDefaultModules(): void {
  for (const mod of DEFAULT_MODULES) {
    const existing = db.select().from(modules).where(eq(modules.moduleName, mod.name)).get();
    if (!existing) {
      db.insert(modules).values({ moduleName: mod.name, moduleAlias: mod.alias, description: mod.description }).run();
    } else if (existing.moduleAlias !== mod.alias || existing.description !== mod.description) {
      db.update(modules)
        .set({ moduleAlias: mod.alias, description: mod.description })
        .where(eq(modules.moduleId, existing.moduleId))
        .run();
    }
  }
}
