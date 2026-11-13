import { and, eq, inArray } from "drizzle-orm";
import db from "../db/client";
import { modules, usermodulepermissions } from "../db/schema";

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

export function moduleNamesByUser(userIds: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (userIds.length === 0) return map;
  const rows = db
    .select({ userId: usermodulepermissions.userId, moduleName: modules.moduleName })
    .from(usermodulepermissions)
    .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
    .where(inArray(usermodulepermissions.userId, userIds))
    .all();
  for (const row of rows) map.set(row.userId, [...(map.get(row.userId) ?? []), row.moduleName]);
  return map;
}

export function setUserModules(userId: number, moduleNames: string[]): void {
  db.transaction((tx) => {
    tx.delete(usermodulepermissions).where(eq(usermodulepermissions.userId, userId)).run();
    if (moduleNames.length === 0) return;
    const targets = tx
      .select({ moduleId: modules.moduleId })
      .from(modules)
      .where(inArray(modules.moduleName, moduleNames))
      .all();
    for (const m of targets) tx.insert(usermodulepermissions).values({ userId, moduleId: m.moduleId }).run();
  });
}

function hasModuleGrant(userId: number, moduleId: number): boolean {
  return !!db
    .select({ userId: usermodulepermissions.userId })
    .from(usermodulepermissions)
    .where(and(eq(usermodulepermissions.userId, userId), eq(usermodulepermissions.moduleId, moduleId)))
    .get();
}

export function grantModule(userId: number, moduleId: number): boolean {
  if (hasModuleGrant(userId, moduleId)) return false;
  db.insert(usermodulepermissions).values({ userId, moduleId }).run();
  return true;
}

export function revokeModule(userId: number, moduleId: number): boolean {
  if (!hasModuleGrant(userId, moduleId)) return false;
  db.delete(usermodulepermissions)
    .where(and(eq(usermodulepermissions.userId, userId), eq(usermodulepermissions.moduleId, moduleId)))
    .run();
  return true;
}
