import { describe, expect, it } from "bun:test";
import { cleanName, moveId, nextFreeColor, openTaskCount } from "./manage-helpers";

describe("manage helpers", () => {
  it("moves an id up or down and refuses moves past the ends", () => {
    expect(moveId([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveId([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(moveId([1, 2, 3], 1, -1)).toBeNull();
    expect(moveId([1, 2, 3], 3, 1)).toBeNull();
    expect(moveId([1, 2, 3], 9, 1)).toBeNull();
  });

  it("picks the first unused palette colour", () => {
    expect(nextFreeColor([])).toBe("coral");
    expect(nextFreeColor([{ color: "coral" }, { color: "amber" }])).toBe("orange");
  });

  it("counts open tasks of a category", () => {
    expect(openTaskCount([{ categoryId: 1 }, { categoryId: 2 }, { categoryId: 1 }, { categoryId: null }], 1)).toBe(2);
  });

  it("cleans names and rejects empty or long ones", () => {
    expect(cleanName("  Werk   thuis ")).toBe("Werk thuis");
    expect(cleanName("   ")).toBeNull();
    expect(cleanName("x".repeat(61))).toBeNull();
  });
});
