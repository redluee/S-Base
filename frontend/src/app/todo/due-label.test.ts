import { describe, expect, it } from "bun:test";
import { UNCATEGORISED_COLOR } from "@backend/shared/todo";
import { dueBadge, duePhrase, listSummary, taskColor } from "./due-label";

const now = new Date("2026-11-18T10:00:00Z");

describe("due labels", () => {
  it("labels the due date by how close it is", () => {
    expect(dueBadge(null, now)).toBeNull();
    expect(dueBadge("2026-11-18", now)).toEqual({ label: "Vandaag", tone: "today" });
    expect(dueBadge("2026-11-19", now)).toEqual({ label: "Morgen", tone: "soon" });
    expect(dueBadge("2026-11-21", now)).toEqual({ label: "Zaterdag", tone: "soon" });
    expect(dueBadge("2026-11-30", now)).toEqual({ label: "Ma 30 nov", tone: "later" });
    expect(dueBadge("2026-11-17", now)).toEqual({ label: "Gisteren", tone: "overdue" });
    expect(dueBadge("2026-11-15", now)).toEqual({ label: "3 dagen te laat", tone: "overdue" });
  });

  it("summarises open, overdue and today counts", () => {
    const tasks = [{ dueDate: null }, { dueDate: "2026-11-18" }, { dueDate: "2026-11-10" }, { dueDate: "2026-12-01" }];
    expect(listSummary(tasks, now)).toEqual({ open: 4, overdue: 1, today: 1 });
  });

  it("phrases the date prominently in Dutch", () => {
    expect(duePhrase("2026-11-21", now)).toBe("over 3 dagen");
    expect(duePhrase("2026-11-19", now)).toBe("morgen");
    expect(duePhrase("2026-11-18", now)).toBe("vandaag");
    expect(duePhrase("2026-11-16", now)).toBe("2 dagen geleden");
  });

  it("uses the category colour or Signal Green", () => {
    const categories = [{ id: 1, name: "Werk", color: "sky" as const, icon: "folder" as const, sortOrder: 0, isSystem: false }];
    expect(taskColor({ categoryId: 1 }, categories)).toBe("#38bdf8");
    expect(taskColor({ categoryId: null }, categories)).toBe(UNCATEGORISED_COLOR);
  });
});
