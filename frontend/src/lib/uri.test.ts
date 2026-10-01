import { describe, expect, it } from "bun:test";
import { safeDecodeURIComponent } from "./uri";

describe("safeDecodeURIComponent", () => {
  it("decodes encoded segments", () => {
    expect(safeDecodeURIComponent("Bench%20Press")).toBe("Bench Press");
    expect(safeDecodeURIComponent("100%25%20Effort")).toBe("100% Effort");
  });

  it("returns the raw value when it is not a valid encoding", () => {
    expect(safeDecodeURIComponent("100% Effort")).toBe("100% Effort");
    expect(safeDecodeURIComponent("50%")).toBe("50%");
    expect(safeDecodeURIComponent("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("round-trips names containing percent signs", () => {
    for (const name of ["50%", "100% Effort", "a%b", "Row 50%25"]) {
      expect(safeDecodeURIComponent(encodeURIComponent(name))).toBe(name);
    }
  });
});
