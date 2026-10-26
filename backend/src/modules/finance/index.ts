import { FinanceSubscriptionService } from "./subscription-settings";
import { dashboard } from "./calculations";
import { calendarDate, cents, today } from "./validation";
import { requireObject, ValidationError } from "../../utils/validation";
import db from "../../db/client";
import { financeSettings } from "../../db/schema/finance";
import { subscriptionSourceKey } from "./subscriptions";

export class FinanceService extends FinanceSubscriptionService {
  setMonthlyBudget(userId: number, input: unknown) {
    const value = requireObject(input).monthlyBudgetCents;
    const monthlyBudgetCents = value === null ? null : cents(value, 0);
    db.insert(financeSettings).values({ userId, monthlyBudgetCents })
      .onConflictDoUpdate({ target: financeSettings.userId, set: { monthlyBudgetCents } }).run();
    return { monthlyBudgetCents };
  }
  private budgetEntries(userId: number, endDate: string) {
    const subscriptionSources = new Set(this.subscriptions(userId, endDate).entries
      .filter((entry) => entry.active).flatMap((entry) => entry.sourceKeys));
    return this.periodTransactions(userId, `${endDate.slice(0, 7)}-01`, endDate)
      .filter((entry) => entry.amountCents < 0 && !entry.internalTransfer
        && !subscriptionSources.has(subscriptionSourceKey(entry)));
  }
  budgetTransactions(userId: number, input: Record<string, unknown>) {
    const endDate = calendarDate(input.date ?? today());
    const page = Number(input.page ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new ValidationError("finance.transactions.invalidFilter");
    const entries = this.budgetEntries(userId, endDate);
    return { entries: entries.slice((page - 1) * 50, page * 50), total: entries.length, page, pageSize: 50 };
  }
  dashboard(
    userId: number,
    period: unknown = "month",
    date: unknown = today(),
  ) {
    if (period !== "month" && period !== "year" && period !== "all")
      throw new ValidationError("Invalid period");
    const data = this.data(userId);
    const { accounts, monthlyBudgetCents } = data;
    const endDate = calendarDate(date);
    const observations = this.dashboardObservations(userId, data, endDate);
    const report = dashboard(accounts, observations, period, endDate);
    const activity = this.activity(userId, report.startDate, report.endDate);
    const budgetSpendingCents = monthlyBudgetCents === null ? 0
      : this.budgetEntries(userId, report.endDate).reduce((sum, entry) => sum - entry.amountCents, 0);
    return {
      ...report,
      activity,
      budget: monthlyBudgetCents === null ? null : {
        month: report.endDate.slice(0, 7),
        limitCents: monthlyBudgetCents,
        spendingCents: budgetSpendingCents,
        remainingCents: monthlyBudgetCents - budgetSpendingCents,
      },
    };
  }
}
