import db from "../../db/client";
import { financeSettings } from "../../db/schema/finance";
import { ValidationError } from "../../utils/errors";
import { requireObject } from "../../utils/validation";
import type { FinanceAccounts } from "./accounts";
import { dashboard } from "./calculations";
import { subscriptionSourceKey } from "./subscriptions";
import type { FinanceSubscriptionService } from "./subscription-settings";
import type { FinanceTransactions } from "./transactions";
import { calendarDate, cents, today } from "./validation";

export class FinanceBudget {
  constructor(
    private readonly accounts: FinanceAccounts,
    private readonly transactions: FinanceTransactions,
    private readonly subscriptions: FinanceSubscriptionService,
  ) {}
  setMonthlyBudget(userId: number, input: unknown) {
    const value = requireObject(input).monthlyBudgetCents;
    const monthlyBudgetCents = value === null ? null : cents(value, 0);
    db.insert(financeSettings)
      .values({ userId, monthlyBudgetCents })
      .onConflictDoUpdate({ target: financeSettings.userId, set: { monthlyBudgetCents } })
      .run();
    return { monthlyBudgetCents };
  }
  private budgetEntries(userId: number, endDate: string) {
    const subscriptionSources = new Set(
      this.subscriptions
        .list(userId, endDate)
        .entries.filter((entry) => entry.active)
        .flatMap((entry) => entry.sourceKeys),
    );
    return this.transactions
      .periodTransactions(userId, `${endDate.slice(0, 7)}-01`, endDate)
      .filter(
        (entry) =>
          entry.amountCents < 0 && !entry.internalTransfer && !subscriptionSources.has(subscriptionSourceKey(entry)),
      );
  }
  budgetTransactions(userId: number, input: Record<string, unknown>) {
    const endDate = calendarDate(input.date ?? today());
    const page = Number(input.page ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new ValidationError("finance.transactions.invalidFilter");
    const entries = this.budgetEntries(userId, endDate);
    return { entries: entries.slice((page - 1) * 50, page * 50), total: entries.length, page, pageSize: 50 };
  }
  dashboard(userId: number, period: unknown = "month", date: unknown = today()) {
    if (period !== "month" && period !== "year" && period !== "all") throw new ValidationError("finance.invalidPeriod");
    const data = this.accounts.data(userId);
    const { monthlyBudgetCents } = data;
    const endDate = calendarDate(date);
    const { accounts, observations } = this.transactions.dashboardBalances(userId, data);
    const report = dashboard(accounts, observations, period, endDate);
    const activity = this.transactions.activity(userId, report.startDate, report.endDate);
    const budgetSpendingCents =
      monthlyBudgetCents === null
        ? 0
        : this.budgetEntries(userId, report.endDate).reduce((sum, entry) => sum - entry.amountCents, 0);
    return {
      ...report,
      activity,
      budget:
        monthlyBudgetCents === null
          ? null
          : {
              month: report.endDate.slice(0, 7),
              limitCents: monthlyBudgetCents,
              spendingCents: budgetSpendingCents,
              remainingCents: monthlyBudgetCents - budgetSpendingCents,
            },
    };
  }
}
