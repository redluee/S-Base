import { describe, expect, it } from "bun:test";
import { getFlag } from "./kitchens";

describe("getFlag", () => {
  it("matches kitchen names case- and whitespace-insensitively and returns nothing for unknown names", () => {
    expect(getFlag("  italiaans ")).toBe("🇮🇹");
    expect(getFlag("Nederlands")).toBe("🇳🇱");
    expect(getFlag("NonExistent")).toBe("");
  });
});
