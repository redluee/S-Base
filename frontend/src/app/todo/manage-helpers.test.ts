import { describe, expect, it } from "bun:test";
import { applyMove, cleanName, nextFreeColor, openTaskCount } from "./manage-helpers";

describe("manage helpers", () => {
  it("applies a drag move to an id list", () => {
    expect(applyMove([1, 2, 3], 3, { afterId: null, beforeId: 1 })).toEqual([3, 1, 2]);
    expect(applyMove([1, 2, 3], 1, { afterId: 3, beforeId: null })).toEqual([2, 3, 1]);
    expect(applyMove([1, 2, 3], 1, { afterId: 2, beforeId: null })).toEqual([2, 1, 3]);
    expect(applyMove([1, 2, 3], 2, { afterId: 1, beforeId: null })).toBeNull();
    expect(applyMove([1, 2, 3], 9, { afterId: 1, beforeId: null })).toBeNull();
    expect(applyMove([1, 2, 3], 1, { afterId: 9, beforeId: null })).toBeNull();
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
