import { eq } from "drizzle-orm";
import db from "../../db/client";
import { minorSettings } from "../../db/schema";
import type { MinorSettings } from "../../types/shared";

export interface SettingsInput {
  portfolioUrl?: string | null;
  lastName?: string | null;
}

export class MinorSettingsStore {
  get(userId: number): MinorSettings {
    const existing = db.select().from(minorSettings).where(eq(minorSettings.userId, userId)).get();
    if (existing) return existing as MinorSettings;
    return { userId, portfolioUrl: null, lastName: null };
  }

  save(userId: number, data: SettingsInput): MinorSettings {
    const existing = db.select().from(minorSettings).where(eq(minorSettings.userId, userId)).get();
    const portfolioUrl = data.portfolioUrl !== undefined ? (data.portfolioUrl?.trim() || null) : (existing?.portfolioUrl ?? null);
    const lastName = data.lastName !== undefined ? (data.lastName?.trim() || null) : (existing?.lastName ?? null);
    if (existing) {
      return db.update(minorSettings).set({ portfolioUrl, lastName }).where(eq(minorSettings.userId, userId)).returning().get() as MinorSettings;
    }
    return db.insert(minorSettings).values({ userId, portfolioUrl, lastName }).returning().get() as MinorSettings;
  }
}
