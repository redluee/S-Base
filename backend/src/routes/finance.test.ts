import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../db/client";
import { modules, sessions, usermodulepermissions, users } from "../db/schema";
import { financeAccounts, financeGoals, financeSettings } from "../db/schema/finance";
import { app } from "../index";
import { setupTestDb } from "../test-utils";

const csv =
  "Datum;Rekening;Af Bij;Bedrag (EUR);Saldo na mutatie\n20250103;DEMO0001;Af;20,00;100,29\n20250102;DEMO0001;Bij;20,00;120,29\n20250101;DEMO0001;Bij;100,29;100,29";
const dates = ["2025-01-01", "2025-01-02", "2025-01-03"];
const unknownSubscription = "a".repeat(64);
let userId: number;

beforeAll(async () => {
  await setupTestDb();
  userId = db.insert(users).values({ username: "finance-routes-test", pswdHash: "unused" }).returning().get().userId;
  const moduleId = db.select().from(modules).where(eq(modules.moduleName, "finance")).get()!.moduleId;
  db.insert(usermodulepermissions).values({ userId, moduleId }).run();
  db.insert(sessions).values({ sessionId: "finance-routes-test", userId, expiresAt: "2099-01-01T00:00:00.000Z" }).run();
});

afterEach(() => {
  db.delete(financeGoals).where(eq(financeGoals.userId, userId)).run();
  db.delete(financeAccounts).where(eq(financeAccounts.userId, userId)).run();
  db.delete(financeSettings).where(eq(financeSettings.userId, userId)).run();
});

function call(method: string, path: string, body?: unknown) {
  return app.handle(
    new Request(`http://localhost/api/finance${path}`, {
      method,
      headers: { Cookie: "session_id=finance-routes-test", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

const importBody = (accountId?: number) => ({
  content: csv,
  order: "descending",
  selections: [
    {
      sourceKey: "1",
      ...(accountId === undefined
        ? { newAccount: { name: "Sample imported savings", type: "savings" } }
        : { accountId }),
      extendOpening: false,
      entries: dates.map((date) => ({ date, expectedCents: null })),
    },
  ],
});

describe("finance route error contract", () => {
  it("maps NotFoundError to 404 with finance keys", async () => {
    const cases = [
      ["GET", "/accounts/999999/history", undefined, "finance.accountNotFound"],
      ["PUT", "/accounts/999999/icon", { icon: null }, "finance.accountNotFound"],
      ["GET", `/subscriptions/${unknownSubscription}/transactions`, undefined, "finance.subscriptionNotFound"],
      ["POST", "/subscriptions", { transactionId: 999999, cadence: "monthly" }, "finance.transactionNotFound"],
    ] as const;
    for (const [method, path, body, key] of cases) {
      const res = await call(method, path, body);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: key });
    }
  });

  it("maps ValidationError to 400 with finance keys", async () => {
    const cases = [
      ["GET", "/dashboard?period=week", undefined, "finance.invalidPeriod"],
      ["GET", "/dashboard?date=2025-13-01", undefined, "finance.invalidDate"],
      ["GET", "/transactions?page=0", undefined, "finance.transactions.invalidFilter"],
      ["PUT", "/settings/budget", { monthlyBudgetCents: -1 }, "finance.invalidMoney"],
      ["POST", "/settings/reset", { confirmation: "no" }, "finance.settings.confirmRequired"],
      ["POST", "/settings/reset", {}, "finance.settings.confirmRequired"],
      ["GET", "/subscriptions/not-a-key/transactions", undefined, "finance.subscriptions.invalidSelection"],
      ["POST", "/import/preview", { content: "not a bank file", order: "descending" }, "finance.import.empty"],
    ] as const;
    for (const [method, path, body, key] of cases) {
      const res = await call(method, path, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: key });
    }
    const account = await call("POST", "/import", importBody());
    expect(account.status).toBe(200);
    const accountId = db.select().from(financeAccounts).where(eq(financeAccounts.userId, userId)).get()!.id;
    const icon = await call("PUT", `/accounts/${accountId}/icon`, { icon: "unknown-icon" });
    expect(icon.status).toBe(400);
    expect(await icon.json()).toEqual({ error: "finance.invalidIcon" });
  });

  it("maps ConflictError to 409 with a finance key", async () => {
    expect((await call("POST", "/import", importBody())).status).toBe(200);
    const accountId = db.select().from(financeAccounts).where(eq(financeAccounts.userId, userId)).get()!.id;
    const res = await call("POST", "/import", importBody(accountId));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "finance.import.stale" });
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const cases = [
      ["PUT", "/settings/budget", { monthlyBudgetCents: "12" }],
      ["PUT", "/settings/budget", {}],
      ["POST", "/import", { content: csv, order: "descending" }],
      ["POST", "/import", { content: 5, selections: [] }],
      ["POST", "/subscriptions", { transactionId: "1", cadence: "monthly" }],
      ["PUT", "/subscriptions/inactive", { id: unknownSubscription, inactive: "yes" }],
      ["PUT", "/accounts/abc/icon", { icon: null }],
    ] as const;
    for (const [method, path, body] of cases) {
      const res = await call(method, path, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "common.invalidRequest" });
    }
  });

  it("keeps the success shapes of budget and reset", async () => {
    const budget = await call("PUT", "/settings/budget", { monthlyBudgetCents: 12345 });
    expect(await budget.json()).toEqual({ monthlyBudgetCents: 12345 });
    const reset = await call("POST", "/settings/reset", { confirmation: "DELETE_FINANCE" });
    expect(await reset.json()).toEqual({ success: true });
  });
});
