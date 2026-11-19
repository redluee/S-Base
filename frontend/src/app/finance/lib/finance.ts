import type { FinanceBalanceAccount, FinancePeriod } from "@backend/types/finance";
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
export function financePeriodEnd(period: FinancePeriod, date: string, today: string): string {
  if (period === "all") return today;
  if (period === "custom") return date > today ? today : date;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const end = period === "year"
    ? `${year}-12-31`
    : `${date.slice(0, 7)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
  return end > today ? today : end;
}
