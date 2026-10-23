import { FinanceGoalsService } from "./goals";
import { dashboard } from "./calculations";
import { calendarDate, today } from "./validation";
import { ValidationError } from "../../utils/validation";

export class FinanceService extends FinanceGoalsService {
  dashboard(
    userId: number,
    period: unknown = "month",
    date: unknown = today(),
  ) {
    if (period !== "month" && period !== "year" && period !== "all")
      throw new ValidationError("Invalid period");
    const { accounts, observations } = this.data(userId);
    return dashboard(accounts, observations, period, calendarDate(date));
  }
}
