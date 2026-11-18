import { describe, expect, it } from "bun:test";
import {
  activeQuickDates,
  customDateLabel,
  isCustomDate,
  NO_SELECTION,
  quickAddPreselection,
  toggleCategory,
  toggleProject,
  toggleQuickDate,
} from "./chip-state";
import { ALL_TASKS } from "./todo-state";

const wednesday = new Date("2026-11-18T12:00:00Z");
const saturday = new Date("2026-11-21T12:00:00Z");

describe("category chip state", () => {
  it("selects a category, switches category and clears on a second tap", () => {
    expect(toggleCategory(NO_SELECTION, 3)).toEqual({ categoryId: 3, projectId: null });
    expect(toggleCategory({ categoryId: 3, projectId: 9 }, 4)).toEqual({ categoryId: 4, projectId: null });
    expect(toggleCategory({ categoryId: 3, projectId: 9 }, 3)).toEqual(NO_SELECTION);
  });

  it("selects a project with its category and clears only the project on a second tap", () => {
    expect(toggleProject({ categoryId: 3, projectId: null }, { id: 9, categoryId: 3 })).toEqual({
      categoryId: 3,
      projectId: 9,
    });
    expect(toggleProject({ categoryId: 3, projectId: 9 }, { id: 9, categoryId: 3 })).toEqual({
      categoryId: 3,
      projectId: null,
    });
  });
});

describe("quick add preselection", () => {
  const categories = [
    { id: 1, isSystem: false },
    { id: 2, isSystem: true },
  ];
  const projects = [
    { id: 5, categoryId: 1 },
    { id: 6, categoryId: 2 },
  ];

  it("takes the active category and project filter", () => {
    expect(quickAddPreselection({ kind: "category", categoryId: 1, projectId: 5 }, categories, projects)).toEqual({
      categoryId: 1,
      projectId: 5,
    });
    expect(quickAddPreselection({ kind: "category", categoryId: 1, projectId: null }, categories, projects)).toEqual({
      categoryId: 1,
      projectId: null,
    });
  });

  it("selects nothing for other filters, the system category or unknown ids", () => {
    expect(quickAddPreselection(ALL_TASKS, categories, projects)).toEqual(NO_SELECTION);
    expect(quickAddPreselection({ kind: "flagged" }, categories, projects)).toEqual(NO_SELECTION);
    expect(quickAddPreselection({ kind: "category", categoryId: 2, projectId: 6 }, categories, projects)).toEqual(
      NO_SELECTION,
    );
    expect(quickAddPreselection({ kind: "category", categoryId: 7, projectId: null }, categories, projects)).toEqual(
      NO_SELECTION,
    );
    expect(quickAddPreselection({ kind: "category", categoryId: 1, projectId: 6 }, categories, projects)).toEqual({
      categoryId: 1,
      projectId: null,
    });
  });
});

describe("date chip state", () => {
  it("toggles a quick date on and off", () => {
    expect(toggleQuickDate(null, "tomorrow", wednesday)).toBe("2026-11-19");
    expect(toggleQuickDate("2026-11-19", "tomorrow", wednesday)).toBeNull();
    expect(toggleQuickDate("2026-11-19", "weekend", wednesday)).toBe("2026-11-21");
  });

  it("marks every quick date that matches and detects custom dates", () => {
    expect(activeQuickDates("2026-11-23", wednesday)).toEqual(["nextWeek"]);
    expect(activeQuickDates("2026-11-21", saturday)).toEqual(["today", "weekend"]);
    expect(activeQuickDates(null, wednesday)).toEqual([]);
    expect(isCustomDate("2026-12-01", wednesday)).toBe(true);
    expect(isCustomDate("2026-11-18", wednesday)).toBe(false);
    expect(isCustomDate(null, wednesday)).toBe(false);
  });

  it("labels a custom date in Dutch", () => {
    expect(customDateLabel("2026-12-01")).toBe("di 1 dec");
  });
});
