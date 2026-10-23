import type { FinanceSnapshot } from "@backend/types/finance";

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
  const padding = (max - min || Math.max(Math.abs(max) * 0.1, 100)) * 0.1;
  const lower = min - padding,
    upper = max + padding;
  const time = (date: string) => Date.parse(`${date}T12:00:00Z`);
  const duration = time(endDate) - time(startDate) || 1;
  const x = (date: string) =>
    12 + ((time(date) - time(startDate)) / duration) * 576;
  const y = (value: number) => 190 - ((value - lower) / (upper - lower)) * 170;
  function path(key: "value" | "savingsValue") {
    let result = "",
      connected = false;
    for (const point of points) {
      const value = point[key];
      if (value === null) {
        connected = false;
        continue;
      }
      result += connected
        ? ` H ${x(point.date)} V ${y(value)}`
        : ` M ${x(point.date)} ${y(value)}`;
      connected = true;
    }
    return result;
  }
  return {
    min,
    max,
    seriesMin: mainValues.length ? Math.min(...mainValues) : null,
    seriesMax: mainValues.length ? Math.max(...mainValues) : null,
    hasValues: values.length > 0,
    x,
    y,
    totalPath: path("value"),
    savingsPath: showSavings ? path("savingsValue") : "",
  };
}
