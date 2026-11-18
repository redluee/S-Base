import { describe, expect, it } from "bun:test";
import { UNCATEGORISED_COLOR } from "@backend/shared/todo";
import { dayCounter, duePhrase, taskColor } from "./due-label";

const now = new Date("2026-11-18T10:00:00Z");

describe("due labels", () => {
  it("shows a compact day counter and marks overdue", () => {
    expect(dayCounter(null, now)).toBeNull();
    expect(dayCounter("2026-11-21", now)).toEqual({ label: "3d", overdue: false });
    expect(dayCounter("2026-11-18", now)).toEqual({ label: "0d", overdue: false });
    expect(dayCounter("2026-11-16", now)).toEqual({ label: "-2d", overdue: true });
  });

  it("phrases the date prominently in Dutch", () => {
    expect(duePhrase("2026-11-21", now)).toBe("over 3 dagen");
    expect(duePhrase("2026-11-19", now)).toBe("morgen");
    expect(duePhrase("2026-11-18", now)).toBe("vandaag");
    expect(duePhrase("2026-11-16", now)).toBe("2 dagen geleden");
  });

  it("uses the category colour or Signal Green", () => {
    const categories = [{ id: 1, name: "Werk", color: "sky" as const, sortOrder: 0, isSystem: false }];
    expect(taskColor({ categoryId: 1 }, categories)).toBe("#38bdf8");
    expect(taskColor({ categoryId: null }, categories)).toBe(UNCATEGORISED_COLOR);
  });
});
