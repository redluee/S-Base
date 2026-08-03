import { eq, asc, desc, like, and, or } from "drizzle-orm";
import db from "../../db/client";
import { wines } from "../../db/schema";
import { normalizeSearchString, sqlNormalize } from "../../utils/search";

export const WINE_TYPES = ["red", "white", "rose", "sparkling", "dessert"] as const;
export type WineType = (typeof WINE_TYPES)[number];

export class WineService {
  list(_userId?: number, type?: string, q?: string, sortBy?: string, sortOrder?: string) {
    const columnMap: Record<string, any> = {
      brand: wines.brand,
      rating: wines.rating,
      vintage: wines.vintage,
      createdAt: wines.createdAt,
    };

    const column = columnMap[sortBy ?? "brand"] ?? wines.brand;
    const orderFn = sortOrder === "desc" ? desc : asc;

    const conditions = [];

    if (type && WINE_TYPES.includes(type as WineType)) {
      conditions.push(eq(wines.type, type));
    }

    if (q && q.trim().length > 0) {
      const normalizedQ = normalizeSearchString(q);
      conditions.push(
        or(
          like(sqlNormalize(wines.brand), `%${normalizedQ}%`),
          like(sqlNormalize(wines.variety), `%${normalizedQ}%`),
          like(sqlNormalize(wines.countryRegion), `%${normalizedQ}%`),
          like(sqlNormalize(wines.notes), `%${normalizedQ}%`),
        )!,
      );
    }

    const query = db.select().from(wines).orderBy(orderFn(column));
    if (conditions.length > 0) {
      return query.where(and(...conditions)).all();
    }
    return query.all();
  }

  getById(id: number) {
    return db
      .select()
      .from(wines)
      .where(eq(wines.wineId, id))
      .get();
  }

  create(
    userId: number,
    data: {
      brand: string;
      type: string;
      variety: string;
      vintage?: number;
      countryRegion?: string;
      rating?: number;
      notes?: string;
      imageUrl?: string;
    },
  ) {
    if (!data.brand || !data.brand.trim()) {
      throw new Error("Brand is required");
    }
    if (!data.variety || !data.variety.trim()) {
      throw new Error("Variety is required");
    }
    if (!WINE_TYPES.includes(data.type as WineType)) {
      throw new Error("Invalid wine type");
    }

    return db
      .insert(wines)
      .values({
        userId,
        brand: data.brand.trim(),
        type: data.type,
        variety: data.variety.trim(),
        vintage: data.vintage ? Number(data.vintage) : null,
        countryRegion: data.countryRegion?.trim() || null,
        rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : null,
        notes: data.notes?.trim() || null,
        imageUrl: data.imageUrl || null,
      })
      .returning()
      .get();
  }

  update(
    id: number,
    data: {
      brand?: string;
      type?: string;
      variety?: string;
      vintage?: number | null;
      countryRegion?: string | null;
      rating?: number | null;
      notes?: string | null;
      imageUrl?: string | null;
    },
  ) {
    const existing = this.getById(id);
    if (!existing) return null;

    if (data.type && !WINE_TYPES.includes(data.type as WineType)) {
      throw new Error("Invalid wine type");
    }

    return db
      .update(wines)
      .set({
        brand: data.brand !== undefined ? data.brand.trim() : existing.brand,
        type: data.type !== undefined ? data.type : existing.type,
        variety: data.variety !== undefined ? data.variety.trim() : existing.variety,
        vintage: data.vintage !== undefined ? (data.vintage ? Number(data.vintage) : null) : existing.vintage,
        countryRegion: data.countryRegion !== undefined ? (data.countryRegion?.trim() || null) : existing.countryRegion,
        rating: data.rating !== undefined ? (data.rating !== null ? Number(data.rating) : null) : existing.rating,
        notes: data.notes !== undefined ? (data.notes?.trim() || null) : existing.notes,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
      })
      .where(eq(wines.wineId, id))
      .returning()
      .get();
  }

  remove(id: number) {
    const existing = this.getById(id);
    if (!existing) return false;

    db.delete(wines)
      .where(eq(wines.wineId, id))
      .run();

    return true;
  }
}
