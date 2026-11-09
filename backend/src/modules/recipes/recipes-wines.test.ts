import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { RecipesService } from "./index";
import type { RecipeWines } from "./recipes-wines";

describe("RecipeWines", () => {
  let wineService: RecipeWines;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    wineService = new RecipesService().wines;
  });

  it("validates mandatory fields and enum values when creating a wine", () => {
    expect(() => wineService.create(adminId, { brand: "", type: "red", variety: "Merlot" })).toThrow(
      new ValidationError("recipes.wineBrandRequired"),
    );

    expect(() => wineService.create(adminId, { brand: "Bordeaux", type: "invalid_type", variety: "Merlot" })).toThrow(
      new ValidationError("recipes.invalidWineType"),
    );

    expect(() =>
      wineService.create(adminId, { brand: "Bordeaux", type: "red", variety: "", purchaseLocation: "supermarket" }),
    ).toThrow(new ValidationError("recipes.wineVarietyRequired"));

    expect(() =>
      wineService.create(adminId, {
        brand: "Bordeaux",
        type: "red",
        variety: "Merlot",
        purchaseLocation: "invalid_loc",
      }),
    ).toThrow(new ValidationError("recipes.invalidPurchaseLocation"));
  });

  it("creates, retrieves, updates, and deletes wines", () => {
    const wine = wineService.create(adminId, {
      brand: "Rioja Gran Reserva",
      type: "red",
      variety: "Tempranillo",
      vintage: 2016,
      countryRegion: "Spanje, Rioja",
      purchaseLocation: "wine_shop",
      rating: 9,
    });

    expect(wine.wineId).toBeDefined();
    expect(wine.brand).toBe("Rioja Gran Reserva");

    const fetched = wineService.getById(wine.wineId);
    expect(fetched.vintage).toBe(2016);

    const updated = wineService.update(wine.wineId, {
      rating: 10,
      notes: "Uitstekende rijpheid",
    });
    expect(updated.rating).toBe(10);
    expect(updated.notes).toBe("Uitstekende rijpheid");

    const list = wineService.list({ type: "red", q: "Rioja" });
    expect(list.some((w) => w.wineId === wine.wineId)).toBe(true);

    const removeRes = wineService.remove(wine.wineId);
    expect(removeRes).toEqual({ success: true });
    expect(() => wineService.getById(wine.wineId)).toThrow(new NotFoundError("recipes.wineNotFound"));
    expect(() => wineService.update(wine.wineId, { rating: 1 })).toThrow(NotFoundError);
  });
});
