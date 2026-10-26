import type {
  FinanceAccount,
  FinanceObservation,
  FinanceSnapshot,
  FinanceComparison,
  FinancePeriod,
  FinanceDashboard,
} from "../../types/finance";

export function snapshot(
  accounts: FinanceAccount[],
  observations: FinanceObservation[],
  date: string,
): FinanceSnapshot {
  const latest = new Map<number, FinanceObservation>();
  for (const observation of observations) {
    if (
      observation.date <= date &&
      (!latest.has(observation.accountId) ||
        latest.get(observation.accountId)!.date < observation.date)
    )
      latest.set(observation.accountId, observation);
  }
  return snapshotFromBalances(accounts, latest, date);
}

function snapshotFromBalances(
  accounts: FinanceAccount[],
  latest: Map<number, FinanceObservation>,
  date: string,
): FinanceSnapshot {
  const rows = accounts
    .filter((a) => a.openingDate <= date)
    .map((a) => {
      const observation = latest.get(a.id);
      return {
        ...a,
        balanceCents: observation?.balanceCents ?? null,
        lastDate: observation?.date ?? null,
      };
    });
  const known = rows.filter((a) => a.balanceCents !== null);
  const savings = rows.filter((a) => a.type === "savings");
  const knownSavings = savings.filter((a) => a.balanceCents !== null);
  return {
    date,
    accounts: rows,
    known: known.length,
    expected: rows.length,
    totalCents: known.length
      ? known.reduce((sum, a) => sum + a.balanceCents!, 0)
      : null,
    savingsCents: !savings.length
      ? 0
      : knownSavings.length
        ? knownSavings.reduce((sum, a) => sum + a.balanceCents!, 0)
        : null,
    complete: rows.length > 0 && rows.length === known.length,
    mixedDates: new Set(known.map((a) => a.lastDate)).size > 1,
  };
}

export function dailyBalanceHistory(
  accounts: FinanceAccount[],
  observations: FinanceObservation[],
  startDate: string,
  endDate: string,
): FinanceSnapshot[] {
  const ordered = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const latest = new Map<number, FinanceObservation>();
  const history: FinanceSnapshot[] = [];
  const day = new Date(`${startDate}T12:00:00Z`);
  let index = 0;
  for (let date = startDate; date <= endDate; date = day.toISOString().slice(0, 10)) {
    while (index < ordered.length && ordered[index].date <= date) {
      const observation = ordered[index++];
      latest.set(observation.accountId, observation);
    }
    history.push(snapshotFromBalances(accounts, latest, date));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return history;
}
export function compare(
  start: FinanceSnapshot,
  end: FinanceSnapshot,
  savingsOnly = false,
): FinanceComparison {
  const select = (point: FinanceSnapshot) =>
    savingsOnly
      ? point.accounts.filter((a) => a.type === "savings")
      : point.accounts;
  const first = select(start),
    last = select(end);
  const unavailable = (
    reason: FinanceComparison["reason"],
  ): FinanceComparison => ({ changeCents: null, percent: null, reason });
  if (start.date >= end.date || !first.length || !last.length)
    return unavailable("insufficient");
  if (
    first.length !== last.length ||
    first.some((a) => !last.some((b) => b.id === a.id))
  )
    return unavailable("cohort");
  if (
    first.some((a) => a.balanceCents === null) ||
    last.some((a) => a.balanceCents === null)
  )
    return unavailable("coverage");
  if (
    first.every((a) => last.find((b) => b.id === a.id)?.lastDate === a.lastDate)
  )
    return unavailable("insufficient");
  const baseline = first.reduce((sum, a) => sum + a.balanceCents!, 0);
  const changeCents =
    last.reduce((sum, a) => sum + a.balanceCents!, 0) - baseline;
  return {
    changeCents,
    percent: baseline === 0 ? null : (changeCents / Math.abs(baseline)) * 100,
    reason: baseline === 0 ? "zero" : null,
  };
}
export function dashboard(
  accounts: FinanceAccount[],
  observations: FinanceObservation[],
  period: FinancePeriod,
  endDate: string,
): FinanceDashboard {
  const earliest = accounts
    .map((a) => a.openingDate)
    .filter((d) => d <= endDate)
    .sort()[0];
  const startDate =
    period === "month"
      ? `${endDate.slice(0, 7)}-01`
      : period === "year"
        ? `${endDate.slice(0, 4)}-01-01`
        : (earliest ?? endDate);
  const history = dailyBalanceHistory(accounts, observations, startDate, endDate);
  const baselineDate = new Date(`${startDate}T00:00:00Z`);
  baselineDate.setUTCDate(baselineDate.getUTCDate() - 1);
  const start = period === "all"
      ? history[0]
      : snapshot(accounts, observations, baselineDate.toISOString().slice(0, 10)),
    end = history[history.length - 1];
  return {
    startDate,
    endDate,
    start,
    end,
    comparison: compare(start, end),
    savingsComparison: compare(start, end, true),
    history,
  };
}
