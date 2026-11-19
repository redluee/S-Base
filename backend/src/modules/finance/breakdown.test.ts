import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { financeAccounts, financeTransactions, users } from "../../db/schema";
import { call, login } from "../../test-http";
import { setupTestDb } from "../../test-utils";
import { FinanceService } from "./index";
import { accountNumberKey } from "./transactions";

const service = new FinanceService();
let owner: number, other: number, accountId: number;
let sequence = 0;

function entry(
  userId: number,
  name: string,
  date: string,
  amountCents: number,
  counterparty: string | null = null,
  transferOverride: boolean | null = null,
  targetAccount = accountId,
  description = `${name} description`,
) {
  return db
    .insert(financeTransactions)
    .values({
      accountId: targetAccount,
      fingerprint: `breakdown-${sequence++}`,
      name,
      date,
      amountCents,
      description,
      counterparty,
      counterpartyKey: counterparty ? accountNumberKey(userId, counterparty) : null,
      transferOverride,
    })
    .returning()
    .get();
}

beforeAll(async () => {
  await setupTestDb();
  owner = db.insert(users).values({ username: "breakdown-owner", pswdHash: "unused" }).returning().get().userId;
  other = db.insert(users).values({ username: "breakdown-other", pswdHash: "unused" }).returning().get().userId;
});

beforeEach(() => {
  for (const userId of [owner, other]) db.delete(financeAccounts).where(eq(financeAccounts.userId, userId)).run();
  accountId = service.accounts.createAccount(owner, {
    name: "Sample account",
    type: "current",
    openingDate: "2024-01-01",
    openingBalanceCents: 0,
  }).id;
});

describe("Finance income and spending breakdown", () => {
  it("groups by counterparty IBAN under its latest name, falls back to the name and sorts from highest to lowest", () => {
    entry(owner, "Sample employer", "2025-03-01", 300000, "NL00DEMO0000000001");
    entry(owner, "Sample employer BV", "2025-03-15", 50000, "NL00DEMO0000000001");
    entry(owner, "Sample refund", "2025-03-10", 400000, "NL00DEMO0000000002");
    entry(owner, "  Sample  Gift ", "2025-03-05", 1000);
    entry(owner, "sample gift", "2025-03-06", 2000);
    entry(owner, "Sample shop", "2025-03-07", -5000, "NL00DEMO0000000003");
    entry(owner, "Sample own transfer", "2025-03-08", 900000, null, true);
    entry(owner, "Sample outside period", "2025-04-01", 999999, "NL00DEMO0000000001");

    const income = service.breakdowns.breakdown(owner, {
      direction: "income",
      start: "2025-03-01",
      end: "2025-03-31",
    });
    expect(income.totalCents).toBe(753000);
    expect(income.transactionCount).toBe(5);
    expect(income.groups.map((group) => [group.name, group.iban, group.totalCents, group.count])).toEqual(
      [
        ["Sample employer BV", "NL00DEMO0000000001", 350000, 2],
        ["Sample refund", "NL00DEMO0000000002", 400000, 1],
        ["sample gift", null, 3000, 2],
      ].sort((a, b) => Number(b[2]) - Number(a[2])),
    );
    expect(income.groups[1].transactions.map((transaction) => transaction.date)).toEqual(["2025-03-15", "2025-03-01"]);
  });

  it("merges a counterparty's payments that arrive without an account number", () => {
    entry(owner, "Sample Lab B.V. ", "2025-03-03", 19500, "NL00DEMO0000000011");
    entry(owner, "Sample Lab B.V. ", "2025-03-12", 91000, "NL00DEMO0000000011");
    entry(owner, "Sample Lab B.V.", "2025-03-20", 84500);
    entry(
      owner,
      "Sample Lab Invoices",
      "2025-03-21",
      1000,
      null,
      null,
      accountId,
      "Naam: X IBAN: NL00DEMO0000000011 Datum",
    );
    entry(owner, "Sample Shared Name", "2025-03-04", 3000, "NL00DEMO0000000012");
    entry(owner, "Sample Shared Name", "2025-03-05", 4000, "NL00DEMO0000000013");
    entry(owner, "Sample Shared Name", "2025-03-06", 5000);

    const income = service.breakdowns.breakdown(owner, {
      direction: "income",
      start: "2025-03-01",
      end: "2025-03-31",
    });
    expect(income.groups.map((group) => [group.name, group.iban, group.totalCents, group.count])).toEqual([
      ["Sample Lab Invoices", "NL00DEMO0000000011", 196000, 4],
      ["Sample Shared Name", null, 5000, 1],
      ["Sample Shared Name", "NL00DEMO0000000013", 4000, 1],
      ["Sample Shared Name", "NL00DEMO0000000012", 3000, 1],
    ]);
  });

  it("reports spending as positive amounts and isolates other users", () => {
    entry(owner, "Sample shop", "2025-03-07", -5000, "NL00DEMO0000000003");
    entry(owner, "Sample shop", "2025-03-09", -2500, "NL00DEMO0000000003");
    entry(owner, "Sample rent", "2025-03-01", -90000, "NL00DEMO0000000004");
    entry(owner, "Sample salary", "2025-03-01", 300000, "NL00DEMO0000000001");
    const otherAccount = service.accounts.createAccount(other, {
      name: "Other account",
      type: "current",
      openingDate: "2024-01-01",
      openingBalanceCents: 0,
    }).id;
    entry(other, "Other shop", "2025-03-07", -777700, "NL00DEMO0000000003", null, otherAccount);

    const spending = service.breakdowns.breakdown(owner, {
      direction: "spending",
      start: "2025-03-01",
      end: "2025-03-31",
    });
    expect(spending.totalCents).toBe(97500);
    expect(spending.groups.map((group) => [group.name, group.totalCents, group.count])).toEqual([
      ["Sample rent", 90000, 1],
      ["Sample shop", 7500, 2],
    ]);
    expect(spending.groups[1].transactions.every((transaction) => transaction.amountCents > 0)).toBe(true);
    expect(service.breakdowns.breakdown(other, { direction: "spending" }).totalCents).toBe(777700);
  });

  it("matches the dashboard income and spending totals", () => {
    entry(owner, "Sample salary", "2025-03-01", 300000, "NL00DEMO0000000001");
    entry(owner, "Sample shop", "2025-03-07", -5000);
    entry(owner, "Sample own transfer", "2025-03-08", -20000, null, true);
    const activity = service.transactions.activity(owner, "2025-03-01", "2025-03-31");
    const query = { start: "2025-03-01", end: "2025-03-31" };
    expect(service.breakdowns.breakdown(owner, { ...query, direction: "income" }).totalCents).toBe(
      activity.incomeCents,
    );
    expect(service.breakdowns.breakdown(owner, { ...query, direction: "spending" }).totalCents).toBe(
      activity.spendingCents,
    );
  });

  it("rejects invalid directions and reversed periods", () => {
    expect(() => service.breakdowns.breakdown(owner, { direction: "net" })).toThrow(
      "finance.breakdown.invalidDirection",
    );
    expect(() =>
      service.breakdowns.breakdown(owner, { direction: "income", start: "2025-04-01", end: "2025-03-01" }),
    ).toThrow("finance.transactions.invalidFilter");
  });

  it("stores the counterparty IBAN on import and backfills it on re-import", () => {
    const csv = [
      "Datum;Naam / Omschrijving;Rekening;Tegenrekening;Af Bij;Bedrag (EUR);Mededelingen;Saldo na mutatie",
      "20250101;Sample income;DEMO0001;NL00 DEMO 0000 0000 09;Bij;100,00;Sample salary;100,00",
    ].join("\n");
    const importCsv = () => {
      const preview = service.imports.previewImport(owner, { content: csv, order: "ascending" });
      const selections = preview.sources.map((source) => ({
        sourceKey: source.sourceKey,
        accountId,
        extendOpening: false,
        entries: source.balances.map((balance) => ({
          date: balance.date,
          expectedCents:
            service.accounts.history(owner, accountId).find((observation) => observation.date === balance.date)
              ?.balanceCents ?? null,
        })),
      }));
      service.imports.importBalances(owner, { content: csv, order: "ascending", selections });
    };
    importCsv();
    const stored = () =>
      db.select().from(financeTransactions).where(eq(financeTransactions.accountId, accountId)).all();
    expect(stored().map((row) => row.counterparty)).toEqual(["NL00DEMO0000000009"]);
    db.update(financeTransactions)
      .set({ counterparty: null })
      .where(eq(financeTransactions.accountId, accountId))
      .run();
    importCsv();
    expect(stored().map((row) => row.counterparty)).toEqual(["NL00DEMO0000000009"]);
  });

  it("validates the direction on the route", async () => {
    const cookie = await login();
    expect((await call(cookie, "GET", "/api/finance/breakdown?direction=net")).status).toBe(400);
    const response = await call(
      cookie,
      "GET",
      "/api/finance/breakdown?direction=income&start=2025-01-01&end=2025-01-31",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      direction: "income",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
  });
});
