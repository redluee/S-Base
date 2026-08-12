import { describe, expect, it } from "bun:test";
import { normalizeSearchString } from "./search";

describe("search utility", () => {
  it("normalizes search strings by removing spaces, hyphens, slashes and converting to lowercase", () => {
    expect(normalizeSearchString(" Hello-World / Test ")).toBe("helloworldtest");
    expect(normalizeSearchString("Pasta-Bolognese")).toBe("pastabolognese");
    expect(normalizeSearchString("Kip/Rijst")).toBe("kiprijst");
  });

  it("handles empty or single-character strings", () => {
    expect(normalizeSearchString("")).toBe("");
    expect(normalizeSearchString("  -  ")).toBe("");
    expect(normalizeSearchString("A")).toBe("a");
  });
});
