import { FinanceImportService } from "./import";
import { dashboard } from "./calculations";
import { calendarDate, today } from "./validation";
import { ValidationError } from "../../utils/validation";

export class FinanceService extends FinanceImportService {
  dashboard(
    userId: number,
    period: unknown = "month",
    date: unknown = today(),
  ) {
    if (period !== "month" && period !== "year" && period !== "all")
      throw new ValidationError("Invalid period");
    const { accounts, observations } = this.data(userId);
    const report = dashboard(accounts, observations, period, calendarDate(date));
    return { ...report, activity: this.activity(userId, report.startDate, report.endDate) };
  }
}
