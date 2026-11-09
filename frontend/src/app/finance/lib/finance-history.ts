import type { FinanceSnapshot } from "@backend/types/finance";
import { financeChartScale } from "./finance-chart-scale";

export interface FinanceHistoryPoint {
  date: string;
  value: number | null;
  savingsValue: number | null;
  known: number;
  expected: number;
}

export function financeHistoryPoints(
  history: FinanceSnapshot[],
  series: string,
): FinanceHistoryPoint[] {
  return history.map((point) => {
    const savings = point.accounts.filter(
      (account) => account.type === "savings",
    );
    const savingsValue =
      savings.length &&
      savings.every((account) => account.balanceCents !== null)
        ? savings.reduce((sum, account) => sum + account.balanceCents!, 0)
        : null;
    if (series === "total")
      return {
        date: point.date,
        value: point.complete ? point.totalCents : null,
        savingsValue,
        known: point.known,
        expected: point.expected,
      };
    const accounts =
      series === "savings"
        ? savings
        : point.accounts.filter((account) => account.id === Number(series));
    const known = accounts.filter(
      (account) => account.balanceCents !== null,
    ).length;
    return {
      date: point.date,
      value:
        accounts.length && known === accounts.length
          ? accounts.reduce((sum, account) => sum + account.balanceCents!, 0)
          : null,
      savingsValue: null,
      known,
      expected: accounts.length,
    };
  });
}

export function financeHistoryGeometry(
  points: FinanceHistoryPoint[],
  showSavings: boolean,
  startDate: string,
  endDate: string,
) {
  const mainValues = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const values = points
    .flatMap((point) => [
      point.value,
      ...(showSavings ? [point.savingsValue] : []),
    ])
    .filter((value): value is number => value !== null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const { lower, upper, ticks } = financeChartScale(values, false);
  const time = (date: string) => Date.parse(`${date}T12:00:00Z`);
  const duration = time(endDate) - time(startDate) || 1;
  const x = (date: string) =>
    12 + ((time(date) - time(startDate)) / duration) * 576;
  const y = (value: number) => 190 - ((value - lower) / (upper - lower)) * 170;
  function path(key: "value" | "savingsValue", area = false) {
    let result = "";
    let previous: { x: number; y: number } | null = null;
    let startX = 0;
    function closeArea() {
      if (area && previous) result += ` V 210 H ${startX} Z`;
    }
    for (const point of points) {
      const value = point[key];
      if (value === null) {
        closeArea();
        previous = null;
        continue;
      }
      const current = { x: x(point.date), y: y(value) };
      if (previous) {
        result += ` H ${current.x} V ${current.y}`;
      } else {
        result += ` M ${current.x} ${current.y}`;
        startX = current.x;
      }
      previous = current;
    }
    closeArea();
    return result;
  }
  return {
    min,
    max,
    lower,
    upper,
    ticks,
    seriesMin: mainValues.length ? Math.min(...mainValues) : null,
    seriesMax: mainValues.length ? Math.max(...mainValues) : null,
    hasValues: values.length > 0,
    x,
    y,
    totalPath: path("value"),
    totalAreaPath: path("value", true),
    savingsPath: showSavings ? path("savingsValue") : "",
  };
}

export function closestHistoryIndex(positions: readonly number[], position: number): number {
  if (!positions.length) return -1;
  let left = 0;
  let right = positions.length - 1;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (positions[middle] < position) left = middle + 1;
    else right = middle;
  }
  return left > 0 && position - positions[left - 1] <= positions[left] - position ? left - 1 : left;
}
