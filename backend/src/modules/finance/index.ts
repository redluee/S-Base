import { FinanceAccounts } from "./accounts";
import { FinanceBudget } from "./budget";
import { FinanceGoals } from "./goals";
import { FinanceImport } from "./import";
import { FinanceSubscriptionService } from "./subscription-settings";
import { FinanceTransactions } from "./transactions";

export class FinanceService {
  readonly accounts = new FinanceAccounts();
  readonly goals = new FinanceGoals(this.accounts);
  readonly transactions = new FinanceTransactions();
  readonly imports = new FinanceImport(this.accounts, this.transactions);
  readonly subscriptions = new FinanceSubscriptionService(this.transactions);
  readonly budget = new FinanceBudget(this.accounts, this.transactions, this.subscriptions);
}
