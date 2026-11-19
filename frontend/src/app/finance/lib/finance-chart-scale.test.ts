import { expect, it } from "bun:test";
import { financeChartScale } from "./finance-chart-scale";

it("only shows a negative axis when a displayed value is negative", () => {
  for (const values of [[], [0], [1, 29], [680_000, 780_000], [-1, 100], [-900_000, -1], [-100, 900_000]]) {
    const { lower, upper, ticks } = financeChartScale(values);
    expect(lower < 0).toBe(values.some((value) => value < 0));
    expect(upper).toBeGreaterThan(lower);
    expect(ticks).toContain(0);
    expect(ticks.length).toBeLessThanOrEqual(11);
    expect(ticks.every((tick) => Number.isInteger(tick / 100))).toBe(true);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(lower);
      expect(value).toBeLessThanOrEqual(upper);
    }
  }
});

it("fits positive and negative ranges independently without crowding large amounts", () => {
  expect(financeChartScale([80_000, 490_000]).ticks).toEqual([500_000, 400_000, 300_000, 200_000, 100_000, 0]);
  expect(financeChartScale([-80_000, 490_000]).lower).toBe(-100_000);
  expect(financeChartScale([50_000_000]).ticks.length).toBeLessThanOrEqual(11);
});

it("puts the top of the axis on the first round step above the highest value", () => {
  expect(financeChartScale([80_000, 400_000]).upper).toBe(500_000);
  expect(financeChartScale([123_456, 2_345_678], false).upper).toBe(2_500_000);
  for (const values of [[400_000], [1, 29], [80_000, 490_000], [-90_000, -10_000], [-100, 900_000], [241_000, 258_000], [250_000, 250_000]]) {
    for (const includeZero of [true, false]) {
      const { lower, upper, ticks } = financeChartScale(values, includeZero);
      const step = ticks[0] - ticks[1];
      const max = Math.max(...values);
      const min = Math.min(...values);
      expect(upper).toBe(ticks[0]);
      if (max > 0 || !includeZero) expect(upper).toBeGreaterThan(max);
      if (max > 0 || !includeZero) expect(upper - step).toBeLessThanOrEqual(max);
      if (min < 0 || !includeZero) expect(lower).toBeLessThan(min);
      expect(upper % step).toBe(0);
    }
  }
});
