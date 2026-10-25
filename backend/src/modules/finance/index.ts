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
    const monthStart = `${report.endDate.slice(0, 7)}-01`;
    const activity = this.activity(userId, report.startDate, report.endDate);
    let budgetSpendingCents = 0;
    if (monthlyBudgetCents !== null) {
      const subscriptionSources = new Set(this.subscriptions(userId, report.endDate).entries
        .filter((entry) => entry.active).flatMap((entry) => entry.sourceKeys));
      budgetSpendingCents = this.periodTransactions(userId, monthStart, report.endDate)
        .filter((entry) => entry.amountCents < 0 && !entry.internalTransfer
          && !subscriptionSources.has(subscriptionSourceKey(entry)))
        .reduce((sum, entry) => sum - entry.amountCents, 0);
    }
    return {
      ...report,
      history: this.dashboardHistory(userId, report.history, report.startDate, report.endDate),
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
