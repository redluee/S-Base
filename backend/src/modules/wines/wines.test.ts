import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { WineService } from "./index";

describe("WineService", () => {
  let wineService: WineService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    wineService = new WineService();
  });

  it("validates mandatory fields and enum values when creating a wine", () => {
    expect(() =>
      wineService.create(adminId, { brand: "", type: "red", variety: "Merlot" })
    ).toThrow("Brand is required");

    expect(() =>
      wineService.create(adminId, { brand: "Bordeaux", type: "invalid_type", variety: "Merlot" })
    ).toThrow("Invalid wine type");

    expect(() =>
      wineService.create(adminId, { brand: "Bordeaux", type: "red", variety: "", purchaseLocation: "supermarket" })
    ).toThrow("Variety is required");

    expect(() =>
      wineService.create(adminId, {
        brand: "Bordeaux",
        type: "red",
        variety: "Merlot",
        purchaseLocation: "invalid_loc",
      })
    ).toThrow("Invalid purchase location");
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
    expect(fetched?.vintage).toBe(2016);

    const updated = wineService.update(wine.wineId, {
      rating: 10,
      notes: "Uitstekende rijpheid",
    });
    expect(updated?.rating).toBe(10);
    expect(updated?.notes).toBe("Uitstekende rijpheid");

    const list = wineService.list(adminId, "red", "Rioja");
    expect(list.some((w) => w.wineId === wine.wineId)).toBe(true);

    const removeRes = wineService.remove(wine.wineId);
    expect(removeRes).toBe(true);
    expect(wineService.getById(wine.wineId)).toBeFalsy();
  });
});
