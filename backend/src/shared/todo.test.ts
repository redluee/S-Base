import { describe, expect, it } from "bun:test";
import {
  agingOpacity,
  daysToDue,
  isLinkedTaskVisible,
  isTodoColor,
  isValidTodoTitle,
  normalizeTodoTitle,
  positionBetween,
  rebalancedPositions,
  TODO_COLORS,
  todoColorHex,
  UNCATEGORISED_COLOR,
} from "./todo";

const at = (iso: string) => new Date(iso);

describe("todo palette", () => {
  it("has ten tones and falls back to Signal Green", () => {
    expect(TODO_COLORS).toHaveLength(10);
    expect(isTodoColor("teal")).toBe(true);
    expect(isTodoColor("green")).toBe(false);
    expect(todoColorHex(null)).toBe(UNCATEGORISED_COLOR);
    expect(todoColorHex("sky")).toBe("#38bdf8");
  });
});

describe("todo titles", () => {
  it("collapses whitespace and enforces 1..200 characters", () => {
    expect(normalizeTodoTitle("  koop\n melk  ")).toBe("koop melk");
    expect(isValidTodoTitle("   ")).toBe(false);
    expect(isValidTodoTitle("a".repeat(200))).toBe(true);
    expect(isValidTodoTitle("a".repeat(201))).toBe(false);
  });
});

describe("daysToDue", () => {
  it("counts calendar days in Europe/Amsterdam", () => {
    expect(daysToDue("2026-11-18", at("2026-11-18T10:00:00Z"))).toBe(0);
    expect(daysToDue("2026-11-21", at("2026-11-18T10:00:00Z"))).toBe(3);
    expect(daysToDue("2026-11-16", at("2026-11-18T10:00:00Z"))).toBe(-2);
  });

  it("rolls over at local midnight, not UTC midnight", () => {
    expect(daysToDue("2026-11-19", at("2026-11-18T23:30:00Z"))).toBe(0);
    expect(daysToDue("2026-07-02", at("2026-07-01T21:59:00Z"))).toBe(1);
    expect(daysToDue("2026-07-02", at("2026-07-01T22:01:00Z"))).toBe(0);
  });
});

describe("linked task window", () => {
  it("shows linked tasks from 7 days before their date and keeps overdue ones", () => {
    const now = at("2026-11-18T10:00:00Z");
    expect(isLinkedTaskVisible("2026-11-25", now)).toBe(true);
    expect(isLinkedTaskVisible("2026-11-26", now)).toBe(false);
    expect(isLinkedTaskVisible("2026-10-01", now)).toBe(true);
  });
});

describe("agingOpacity", () => {
  const now = at("2026-11-18T10:00:00Z");
  const task = (lastEditedAt: string, dueDate: string | null = null, sourceModule: "cashflow" | null = null) => ({
    lastEditedAt,
    dueDate,
    sourceModule,
  });

  it("fades after 30 and 60 untouched days", () => {
    expect(agingOpacity(task("2026-10-20T10:00:00Z"), now)).toBe(1);
    expect(agingOpacity(task("2026-10-19T10:00:00Z"), now)).toBe(0.7);
    expect(agingOpacity(task("2026-09-19T10:00:00Z"), now)).toBe(0.5);
  });

  it("never ages future-dated or linked tasks", () => {
    expect(agingOpacity(task("2026-01-01T10:00:00Z", "2026-11-19"), now)).toBe(1);
    expect(agingOpacity(task("2026-01-01T10:00:00Z", null, "cashflow"), now)).toBe(1);
    expect(agingOpacity(task("2026-01-01T10:00:00Z", "2026-11-18"), now)).toBe(0.5);
  });
});

describe("fractional positions", () => {
  it("places before, after and between neighbours", () => {
    expect(positionBetween(null, null)).toBe(0);
    expect(positionBetween(null, 4)).toBe(3);
    expect(positionBetween(4, null)).toBe(5);
    expect(positionBetween(1, 2)).toBe(1.5);
  });

  it("asks for a rebalance when the gap is exhausted", () => {
    let low = 0;
    const high = 1;
    let result: number | null = 0.5;
    for (let i = 0; i < 80 && result !== null; i++) {
      result = positionBetween(low, high);
      if (result !== null) low = result;
    }
    expect(result).toBeNull();
    expect(rebalancedPositions(3)).toEqual([0, 1, 2]);
  });
});
