import { describe, expect, it } from "bun:test";
import { dashboard } from "../../../backend/src/modules/finance/calculations";
import type {
  FinanceAccount,
  FinanceObservation,
} from "@backend/types/finance";
import {
  closestHistoryIndex,
  financeHistoryGeometry,
  financeHistoryPoints,
} from "./finance-history";

const accounts: FinanceAccount[] = [
  {
    id: 1,
    name: "Sample current",
    bank: null,
    type: "current",
    openingDate: "2025-01-01",
    archived: false,
  },
  {
    id: 2,
    name: "Sample savings A",
    bank: null,
    type: "savings",
    openingDate: "2025-01-01",
    archived: false,
  },
  {
    id: 3,
    name: "Sample savings B",
    bank: null,
    type: "savings",
    openingDate: "2025-01-01",
    archived: true,
  },
];
const observations: FinanceObservation[] = [
  { id: 1, accountId: 1, date: "2025-01-01", balanceCents: 10029 },
  { id: 2, accountId: 2, date: "2025-01-01", balanceCents: 50000 },
  { id: 3, accountId: 3, date: "2025-01-01", balanceCents: 20000 },
  { id: 4, accountId: 1, date: "2025-02-01", balanceCents: 5029 },
  { id: 5, accountId: 2, date: "2025-02-01", balanceCents: 55000 },
];
const report = () => dashboard(accounts, observations, "all", "2025-03-01");

describe("Combined money and savings chart", () => {
  it("uses recorded balances even when an older response includes transfer adjustments", () => {
    const current = accounts[0];
    const report = dashboard([current], [
      { id: 1, accountId: current.id, date: "2025-01-01", balanceCents: 10000 },
      { id: 2, accountId: current.id, date: "2025-01-02", balanceCents: 12000 },
      { id: 3, accountId: current.id, date: "2025-01-03", balanceCents: 11500 },
    ], "all", "2025-01-03");
    const history = report.history.map((point) => ({ ...point, transferAdjustedTotalCents: 99999 }));
    expect(financeHistoryPoints(history, "total").map((point) => point.value)).toEqual([10000, 12000, 11500]);
    expect(financeHistoryPoints(history, String(current.id)).map((point) => point.value)).toEqual([10000, 12000, 11500]);
    const incomplete = history.map((point) => ({ ...point, complete: false }));
    expect(financeHistoryPoints(incomplete, "total").every((point) => point.value === null)).toBe(true);
  });
  it("includes every current and savings balance exactly once, including archived savings", () => {
    const points = financeHistoryPoints(report().history, "total");
    expect(points[0].value).toBe(80029);
    expect(points[0].savingsValue).toBe(70000);
    expect(points.at(-1)?.value).toBe(80029);
    expect(points.at(-1)?.savingsValue).toBe(75000);
    expect(points[0].known).toBe(3);
    expect(points[0].expected).toBe(3);
  });
  it("shows a transfer as stable total money and a changed savings component", () => {
    const points = financeHistoryPoints(report().history, "total");
    expect(points[1].value! - points[0].value!).toBe(0);
    expect(points[1].savingsValue! - points[0].savingsValue!).toBe(5000);
  });
  it("keeps unknown coverage as gaps without future backfill, while exposing known savings separately", () => {
    const partial = dashboard(
      accounts,
      observations.filter(
        (observation) =>
          observation.accountId !== 1 || observation.date !== "2025-01-01",
      ),
      "all",
      "2025-03-01",
    );
    const points = financeHistoryPoints(partial.history, "total");
    expect(points[0].value).toBeNull();
    expect(points[0].savingsValue).toBe(70000);
    expect(points[0].known).toBe(2);
    expect(points[1].value).toBe(80029);
    const unknownSavings = dashboard(
      accounts,
      observations.filter((observation) => observation.accountId !== 3),
      "all",
      "2025-03-01",
    );
    expect(
      financeHistoryPoints(unknownSavings.history, "total").every(
        (point) => point.savingsValue === null && point.value === null,
      ),
    ).toBe(true);
  });
  it("supports separate savings and individual histories without adding the savings line twice", () => {
    const savings = financeHistoryPoints(report().history, "savings");
    expect(savings[0].value).toBe(70000);
    expect(savings[0].savingsValue).toBeNull();
    expect(savings[0].expected).toBe(2);
    const current = financeHistoryPoints(report().history, "1");
    expect(current.at(-1)?.value).toBe(5029);
    expect(current[0].expected).toBe(1);
  });
  it("handles a future account opening, confirmed zero and negative current balances", () => {
    const current = { ...accounts[0] };
    const savings = { ...accounts[1], openingDate: "2025-02-01" };
    const data = [
      { ...observations[0], balanceCents: 0 },
      { ...observations[1], date: "2025-02-01", balanceCents: 100 },
      { ...observations[3], balanceCents: -100 },
    ];
    const history = dashboard(
      [current, savings],
      data,
      "all",
      "2025-03-01",
    ).history;
    const points = financeHistoryPoints(history, "total");
    expect(points[0].value).toBe(0);
    expect(points[0].savingsValue).toBeNull();
    expect(points[1].value).toBe(0);
    expect(points[1].savingsValue).toBe(100);
    expect(financeHistoryPoints(history, "2")[0].value).toBeNull();
  });
});

describe("Money chart geometry", () => {
  it("uses evenly spaced ticks with a ceiling that contains the data", () => {
    for (const [value, upper] of [[1_234_567, 1_400_000], [1_300_000, 1_400_000], [1_300_001, 1_400_000], [1_200_000, 1_200_000], [490_000, 500_000], [0, 100], [-490_000, 0]]) {
      const point = { date: "2025-01-01", value, savingsValue: null, known: 1, expected: 1 };
      const chart = financeHistoryGeometry([point], false, point.date, point.date);
      expect(chart.upper).toBe(upper);
      expect(chart.ticks[0]).toBe(upper);
      expect(chart.ticks).toContain(0);
      const intervals = chart.ticks.slice(1).map((tick, index) => chart.ticks[index] - tick);
      expect(new Set(intervals).size).toBe(1);
      expect(chart.ticks.every((tick) => tick >= chart.lower && tick <= chart.upper)).toBe(true);
    }
  });
  it("labels every thousand euros on a five-thousand-euro axis", () => {
    const point = { date: "2025-01-01", value: 490_000, savingsValue: null, known: 1, expected: 1 };
    const chart = financeHistoryGeometry([point], false, point.date, point.date);
    expect(chart.ticks).toEqual([500_000, 400_000, 300_000, 200_000, 100_000, 0]);
  });
  it("fits both series to one scale and preserves calendar positioning over DST changes", () => {
    const points = [
      {
        date: "2025-03-29",
        value: 100,
        savingsValue: 50,
        known: 1,
        expected: 1,
      },
      {
        date: "2025-03-30",
        value: 200,
        savingsValue: 75,
        known: 1,
        expected: 1,
      },
      {
        date: "2025-03-31",
        value: 300,
        savingsValue: 100,
        known: 1,
        expected: 1,
      },
    ];
    const chart = financeHistoryGeometry(
      points,
      true,
      points[0].date,
      points[2].date,
    );
    expect(chart.min).toBe(50);
    expect(chart.seriesMin).toBe(100);
    expect(chart.seriesMax).toBe(300);
    expect(chart.max).toBe(300);
    expect(chart.y(100)).toBe(chart.y(points[2].savingsValue));
    expect(chart.x(points[1].date)).toBe(
      (chart.x(points[0].date) + chart.x(points[2].date)) / 2,
    );
    expect(chart.savingsPath).toContain(" C ");
  });
  it("breaks lines at unknown observations instead of drawing through the gap", () => {
    const points = [
      {
        date: "2025-01-01",
        value: 100,
        savingsValue: null,
        known: 1,
        expected: 1,
      },
      {
        date: "2025-01-02",
        value: null,
        savingsValue: null,
        known: 0,
        expected: 1,
      },
      {
        date: "2025-01-03",
        value: 200,
        savingsValue: null,
        known: 1,
        expected: 1,
      },
    ];
    const chart = financeHistoryGeometry(
      points,
      false,
      points[0].date,
      points[2].date,
    );
    expect(chart.totalPath.match(/ M /g)).toHaveLength(2);
    expect(chart.totalPath).not.toContain(" H ");
    expect(chart.savingsPath).toBe("");
  });
  it("produces finite coordinates for zero or constant values, a single date, and empty history", () => {
    for (const value of [0, -100, 50000]) {
      const point = {
        date: "2025-01-01",
        value,
        savingsValue: null,
        known: 1,
        expected: 1,
      };
      const chart = financeHistoryGeometry(
        [point],
        false,
        point.date,
        point.date,
      );
      expect(Number.isFinite(chart.y(value))).toBe(true);
      expect(chart.y(value)).toBeGreaterThanOrEqual(20);
      expect(chart.y(value)).toBeLessThanOrEqual(190);
      expect(chart.totalPath).not.toContain("NaN");
    }
    expect(
      financeHistoryGeometry([], true, "2025-01-01", "2025-01-01").hasValues,
    ).toBe(false);
  });
});


describe("Zero-based chart scale", () => {
  for (const values of [[0, 0], [1, 29], [100, 10000], [-100, 100], [-10000, -200]]) {
    it(`keeps zero and whole-euro ticks for ${values.join(", ")}`, () => {
      const points = values.map((value, index) => ({
        date: `2025-01-0${index + 1}`, value, savingsValue: null, known: 1, expected: 1,
      }));
      const chart = financeHistoryGeometry(points, false, points[0].date, points[1].date);
      expect(chart.ticks).toContain(0);
      expect(chart.lower < 0).toBe(values.some((value) => value < 0));
      expect(chart.ticks.every((tick) => Number.isInteger(tick / 100))).toBe(true);
      for (const value of values) {
        expect(chart.y(value)).toBeGreaterThanOrEqual(20);
        expect(chart.y(value)).toBeLessThanOrEqual(190);
      }
      expect(chart.totalPath).toContain(" C ");
      expect(chart.totalPath).not.toContain(" V ");
    });
  }
});


describe("Graph pointer lookup", () => {
  it("selects the nearest point across irregular gaps and prefers the earlier tie", () => {
    const positions = [12, 30, 90, 588];
    for (const [position, expected] of [[-10, 0], [12, 0], [21, 0], [22, 1], [89, 2], [339, 2], [340, 3], [700, 3]]) {
      expect(closestHistoryIndex(positions, position)).toBe(expected);
    }
    expect(closestHistoryIndex([], 20)).toBe(-1);
    expect(closestHistoryIndex([12], 700)).toBe(0);
  });

  it("looks up a large history without scanning every point", () => {
    let reads = 0;
    const positions = new Proxy(Array.from({ length: 100000 }, (_, index) => index * 2), {
      get(target, property, receiver) {
        if (typeof property === "string" && /^\d+$/.test(property)) reads++;
        return Reflect.get(target, property, receiver);
      },
    });
    expect(closestHistoryIndex(positions, 123455)).toBe(61727);
    expect(reads).toBeLessThan(25);
  });
});
