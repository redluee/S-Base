import { FinanceSubscriptionService } from "./subscription-settings";
import { dashboard } from "./calculations";
import { calendarDate, cents, today } from "./validation";
import { requireObject, ValidationError } from "../../utils/validation";
import db from "../../db/client";
import { financeSettings } from "../../db/schema/finance";

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
    const monthlyActivity = monthlyBudgetCents === null || period === "month"
      ? activity : this.activity(userId, monthStart, report.endDate);
    return {
      ...report,
      history: this.dashboardHistory(userId, report.history, report.startDate, report.endDate),
      activity,
      budget: monthlyBudgetCents === null ? null : {
        month: report.endDate.slice(0, 7),
        limitCents: monthlyBudgetCents,
        spendingCents: monthlyActivity.spendingCents,
        remainingCents: monthlyBudgetCents - monthlyActivity.spendingCents,
      },
    };
  }
}
