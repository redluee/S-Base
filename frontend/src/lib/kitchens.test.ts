import { describe, expect, it } from "bun:test";
import { findKitchen, getFlag, kitchens } from "./kitchens";

describe("Frontend kitchens helper", () => {
  it("contains curated list of world kitchens", () => {
    expect(kitchens.length).toBeGreaterThan(20);
    expect(kitchens.some((k) => k.name === "Italiaans")).toBe(true);
  });

  it("finds kitchen by case-insensitive name and retrieves flag", () => {
    const k = findKitchen("  italiaans ");
    expect(k?.name).toBe("Italiaans");
    expect(k?.flag).toBe("🇮🇹");

    expect(getFlag("Nederlands")).toBe("🇳🇱");
    expect(getFlag("NonExistent")).toBe("");
  });
});
