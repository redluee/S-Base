import { describe, expect, it } from "bun:test";
import type { TodoHistoryTask } from "@backend/types/todo";
import { dayLabel, groupByDay, mergeItems, movingAverage, pulsePath, pulsePoints, smoothPath } from "./history-helpers";

const now = new Date("2026-11-18T10:00:00Z");

function item(id: number, completedAt: string): TodoHistoryTask {
  return {
    id,
    title: `T${id}`,
    categoryId: null,
    projectId: null,
    dueDate: null,
    flagged: false,
    notes: "",
    position: 0,
    createdAt: completedAt,
    lastEditedAt: completedAt,
    completedAt,
    link: null,
    subtasks: [],
    categoryName: null,
    categoryColor: null,
  };
}

describe("history day labels", () => {
  it("names today and yesterday", () => {
    expect(dayLabel("2026-11-18", now)).toBe("Vandaag");
    expect(dayLabel("2026-11-17", now)).toBe("Gisteren");
  });

  it("uses a short Dutch weekday, day and month, with the year when it is not the current one", () => {
    expect(dayLabel("2026-11-16", now)).toBe("ma 16 nov");
    expect(dayLabel("2026-03-02", now)).toBe("ma 2 mrt");
    expect(dayLabel("2025-12-31", now)).toBe("wo 31 dec 2025");
  });
});

describe("history grouping and merging", () => {
  it("groups consecutive items per Amsterdam day", () => {
    const groups = groupByDay(
      [
        item(4, "2026-11-18T09:00:00Z"),
        item(3, "2026-11-17T23:30:00Z"),
        item(2, "2026-11-17T08:00:00Z"),
        item(1, "2026-11-10T08:00:00Z"),
      ],
      now,
    );
    expect(groups.map((g) => [g.date, g.label, g.items.length])).toEqual([
      ["2026-11-18", "Vandaag", 2],
      ["2026-11-17", "Gisteren", 1],
      ["2026-11-10", "di 10 nov", 1],
    ]);
  });

  it("appends only unseen items", () => {
    const a = item(1, "2026-11-18T09:00:00Z");
    const b = item(2, "2026-11-17T09:00:00Z");
    expect(mergeItems([a], [a, b]).map((i) => i.id)).toEqual([1, 2]);
  });
});

describe("pulse curve", () => {
  it("averages over a window", () => {
    expect(movingAverage([0, 3, 0], 1)).toEqual([1.5, 1, 1.5]);
  });

  it("scales points into the box with the maximum at the top padding", () => {
    const points = pulsePoints([0, 2, 1], 100, 22, 2);
    expect(points[0]).toEqual({ x: 0, y: 20 });
    expect(points[1]).toEqual({ x: 50, y: 2 });
    expect(points[2].y).toBe(11);
  });

  it("builds a cubic path through every point", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M1 2");
    const path = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(path.startsWith("M0 0 C")).toBe(true);
    expect(path.match(/C/g)).toHaveLength(2);
    expect(path.endsWith("20 0")).toBe(true);
  });

  it("makes a flat path for an empty year", () => {
    const flat = pulsePath(
      Array.from({ length: 5 }, (_, i) => ({ date: `2026-01-0${i + 1}`, count: 0 })),
      100,
      22,
    );
    expect(flat).toContain("20");
  });
});
