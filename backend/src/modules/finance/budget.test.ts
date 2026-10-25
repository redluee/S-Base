import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { financeAccounts, financeSettings, financeSubscriptionPreferences, financeTransactions, users } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { FinanceService } from "./index";

const service = new FinanceService();
let owner: number, other: number, accountId: number;

function payment(name: string, date: string, amountCents = -1000, transferOverride = false, targetAccount = accountId) {
  return db.insert(financeTransactions).values({
    accountId: targetAccount, fingerprint: `${name}-${date}-${targetAccount}`,
    name, date, amountCents, description: "", transferOverride,
  }).returning().get();
}

beforeAll(async () => {
  await setupTestDb();
  owner = db.insert(users).values({ username: "budget-subscriptions-owner", pswdHash: "unused" }).returning().get().userId;
  other = db.insert(users).values({ username: "budget-subscriptions-other", pswdHash: "unused" }).returning().get().userId;
});

beforeEach(() => {
  for (const userId of [owner, other]) {
    db.delete(financeSubscriptionPreferences).where(eq(financeSubscriptionPreferences.userId, userId)).run();
    db.delete(financeSettings).where(eq(financeSettings.userId, userId)).run();
    db.delete(financeAccounts).where(eq(financeAccounts.userId, userId)).run();
  }
  accountId = service.createAccount(owner, { name: "Sample account", type: "current", openingDate: "2024-01-01", openingBalanceCents: 100000 }).id;
  service.setMonthlyBudget(owner, { monthlyBudgetCents: 5000 });
});

describe("Monthly budget excluding subscriptions", () => {
  it("excludes actual active subscription payments across periods without changing total spending", () => {
    payment("Sample subscription", "2025-01-01");
    payment("Sample subscription", "2025-02-01", -1500);
    payment("Sample shop", "2025-02-02", -700);
    payment("Sample transfer", "2025-02-02", -2000, true);
    payment("Sample income", "2025-02-02", 3000);
    for (const period of ["month", "year", "all"]) {
      expect(service.dashboard(owner, period, "2025-02-02").budget).toEqual({
        month: "2025-02", limitCents: 5000, spendingCents: 700, remainingCents: 4300,
      });
    }
    expect(service.dashboard(owner, "month", "2025-02-02").activity.spendingCents).toBe(2200);
    expect(service.dashboard(owner, "month", "2025-03-01").budget?.remainingCents).toBe(5000);
    expect(service.dashboard(owner, "month", "2025-01-01").budget?.spendingCents).toBe(1000);
    expect(service.dashboard(other, "month", "2025-02-02").budget).toBeNull();
  });

  it("excludes full annual payments and respects manual subscription exclusions", () => {
    const annual = payment("Sample annual", "2025-02-01", -12000);
    service.addSubscription(owner, { transactionId: annual.id, cadence: "yearly" });
    payment("Sample shop", "2025-02-02", -600);
    expect(service.subscriptions(owner, "2025-02-02").monthlyCents).toBe(1000);
    expect(service.dashboard(owner, "month", "2025-02-02").budget?.remainingCents).toBe(4400);
    service.excludeSubscription(owner, { id: service.subscriptions(owner).entries[0].id });
    expect(service.dashboard(owner, "month", "2025-02-02").budget?.remainingCents).toBe(-7600);
  });

  it("excludes all merged sources and uses activity at the selected date", () => {
    const first = payment("Sample first", "2025-02-01", -900);
    const second = payment("Sample replacement", "2025-02-02", -1100);
    service.addSubscription(owner, { transactionId: first.id, cadence: "monthly" });
    service.addSubscription(owner, { transactionId: second.id, cadence: "monthly" });
    const entries = service.subscriptions(owner).entries;
    service.mergeSubscriptions(owner, { id: entries[0].id, targetId: entries[1].id });
    service.renameSubscription(owner, { id: entries[1].id, name: "Sample merged" });
    expect(service.subscriptions(owner, "2025-02-02").monthlyCents).toBe(1100);
    expect(service.dashboard(owner, "month", "2025-02-02").budget?.remainingCents).toBe(5000);
    expect(service.dashboard(owner, "month", "2025-02-28").budget?.remainingCents).toBe(5000);
    expect(service.dashboard(owner, "month", "2025-04-01").budget?.remainingCents).toBe(5000);
  });
});
