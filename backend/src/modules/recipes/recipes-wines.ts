import { and, asc, desc, eq, like, or, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { wines } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { normalizeSearchString, sqlNormalize } from "../../utils/search";
import { isPurchaseLocation, isWineType } from "./recipes-constants";

export interface WineInput {
  brand?: string;
  type?: string;
  variety?: string;
  vintage?: number | null;
  countryRegion?: string | null;
  purchaseLocation?: string | null;
  rating?: number | null;
  notes?: string | null;
  imageUrl?: string | null;
}

export interface WineListQuery {
  type?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: string;
}

const SORT_COLUMNS = {
  brand: wines.brand,
  rating: wines.rating,
  vintage: wines.vintage,
  createdAt: wines.createdAt,
  purchaseLocation: wines.purchaseLocation,
} as const;

const trimOrNull = (value: string | null | undefined) => value?.trim() || null;

export class RecipeWines {
  list({ type, q, sortBy, sortOrder }: WineListQuery) {
    const column = SORT_COLUMNS[sortBy as keyof typeof SORT_COLUMNS] ?? wines.brand;
    const orderFn = sortOrder === "desc" ? desc : asc;
    const conditions: SQL[] = [];
    if (isWineType(type)) conditions.push(eq(wines.type, type));
    if (q?.trim()) {
      const pattern = `%${normalizeSearchString(q)}%`;
      conditions.push(
        or(
          like(sqlNormalize(wines.brand), pattern),
          like(sqlNormalize(wines.variety), pattern),
          like(sqlNormalize(wines.countryRegion), pattern),
          like(sqlNormalize(wines.purchaseLocation), pattern),
          like(sqlNormalize(wines.notes), pattern),
        ) as SQL,
      );
    }
    return db
      .select()
      .from(wines)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderFn(column))
      .all();
  }

  getById(id: number) {
    const wine = db.select().from(wines).where(eq(wines.wineId, id)).get();
    if (!wine) throw new NotFoundError("recipes.wineNotFound");
    return wine;
  }

  create(userId: number, data: WineInput & { brand: string; type: string; variety: string }) {
    if (!data.brand.trim()) throw new ValidationError("recipes.wineBrandRequired");
    if (!data.variety.trim()) throw new ValidationError("recipes.wineVarietyRequired");
    this.assertEnums(data);
    return db
      .insert(wines)
      .values({
        userId,
        brand: data.brand.trim(),
        type: data.type,
        variety: data.variety.trim(),
        vintage: data.vintage || null,
        countryRegion: trimOrNull(data.countryRegion),
        purchaseLocation: trimOrNull(data.purchaseLocation),
        rating: data.rating ?? null,
        notes: trimOrNull(data.notes),
        imageUrl: data.imageUrl || null,
      })
      .returning()
      .get();
  }

  update(id: number, data: WineInput) {
    const existing = this.getById(id);
    this.assertEnums(data);
    return db
      .update(wines)
      .set({
        brand: data.brand !== undefined ? data.brand.trim() : existing.brand,
        type: data.type ?? existing.type,
        variety: data.variety !== undefined ? data.variety.trim() : existing.variety,
        vintage: data.vintage !== undefined ? data.vintage || null : existing.vintage,
        countryRegion: data.countryRegion !== undefined ? trimOrNull(data.countryRegion) : existing.countryRegion,
        purchaseLocation:
          data.purchaseLocation !== undefined ? trimOrNull(data.purchaseLocation) : existing.purchaseLocation,
        rating: data.rating !== undefined ? data.rating : existing.rating,
        notes: data.notes !== undefined ? trimOrNull(data.notes) : existing.notes,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
      })
      .where(eq(wines.wineId, id))
      .returning()
      .get();
  }

  remove(id: number) {
    this.getById(id);
    db.delete(wines).where(eq(wines.wineId, id)).run();
    return { success: true };
  }

  private assertEnums(data: WineInput) {
    if (data.type !== undefined && !isWineType(data.type)) throw new ValidationError("recipes.invalidWineType");
    if (data.purchaseLocation && !isPurchaseLocation(data.purchaseLocation)) {
      throw new ValidationError("recipes.invalidPurchaseLocation");
    }
  }
}
