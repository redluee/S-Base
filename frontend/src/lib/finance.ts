import type { FinanceBalanceAccount, FinanceData, FinancePeriod } from "@backend/types/finance";
import { t } from "@/lib/lang";

export function financeAccountLabel(account: FinanceBalanceAccount): string {
  return account.inferred
    ? t(account.type === "savings" ? "finance.inferredSavings" : "finance.inferredOwnAccount", { number: account.name })
    : account.name;
}

export function money(cents: number | null): string {
  return cents === null
    ? "—"
    : new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100);
}
export function moneyInput(cents: number): string {
  const absolute = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}
export function parseMoney(input: string): number {
  const value = input.trim();
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value))
    throw new Error("finance.invalidMoney");
  const [whole, fractional = ""] = value.replace(/^-/, "").split(/[.,]/);
  const amount =
    (Number(whole) * 100 + Number(fractional.padEnd(2, "0"))) *
    (value.startsWith("-") ? -1 : 1);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > 1_000_000_000_000)
    throw new Error("finance.invalidMoney");
  return amount;
}
export function dateLabel(date: string | null): string {
  return date ? date.split("-").reverse().join("-") : "—";
}
export function savingsState(data: FinanceData) {
  const accounts = data.accounts
    .filter((a) => a.type === "savings")
    .map((account) => {
      const last = data.observations
        .filter((o) => o.accountId === account.id && o.date <= data.today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1);
      const allocatedCents = data.allocations
        .filter((a) => a.accountId === account.id)
        .reduce((sum, a) => sum + a.amountCents, 0);
      const balanceCents = last?.balanceCents ?? null;
      return {
        ...account,
        balanceCents,
        lastDate: last?.date ?? null,
        allocatedCents,
        unallocatedCents:
          balanceCents === null
            ? null
            : Math.max(0, balanceCents - allocatedCents),
        shortfallCents:
          balanceCents === null
            ? allocatedCents
            : Math.max(0, allocatedCents - Math.max(0, balanceCents)),
      };
    });
  return {
    accounts,
    allocatedCents: accounts.reduce((s, a) => s + a.allocatedCents, 0),
    unallocatedCents: accounts.some((a) => a.balanceCents === null)
      ? null
      : accounts.reduce((s, a) => s + a.unallocatedCents!, 0),
    shortfallCents: accounts.reduce((s, a) => s + a.shortfallCents, 0),
    unknown: accounts.some((a) => a.balanceCents === null),
  };
}

export function financePeriodEnd(period: FinancePeriod, date: string, today: string): string {
  if (period === "all") return today;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const end = period === "year"
    ? `${year}-12-31`
    : `${date.slice(0, 7)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
  return end > today ? today : end;
}
