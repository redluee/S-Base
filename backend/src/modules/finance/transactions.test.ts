import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import db from "../../db/client";
import { users, modules, sessions, usermodulepermissions, financeAccounts, financeGoals, financeTransactions, financeImportSources, cashflowClients } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { FinanceService } from "./index";
import { isSavingsTransfer } from "./transfer-detection";
import { accountNumberKey } from "./transactions";
import { financeRoutes } from "../../routes/finance";
import { financeSettings } from "../../db/schema/finance";
import type { FinanceImportSelection } from "../../types/finance";

const service = new FinanceService();
const app = new Elysia().use(financeRoutes);
let owner: number, other: number, forbidden: number;
const csv = [
  "Datum;Naam / Omschrijving;Rekening;Tegenrekening;Af Bij;Bedrag (EUR);Mededelingen;Saldo na mutatie",
  "20250101;Sample income;DEMO0001;EXTERNAL0001;Bij;100,00;Sample salary;100,00",
  "20250102;Sample savings;DEMO0001;DEMO0002;Af;20,00;Sample transfer;80,00",
  "20250103;Sample shop;DEMO0001;EXTERNAL0002;Af;10,00;Sample purchase;70,00",
  "20250102;Sample current;DEMO0002;DEMO0001;Bij;20,00;Sample transfer;520,00",
].join("\n");
function selections(): FinanceImportSelection[] {
  return service.previewImport({ csv, order: "ascending" }).sources.map((source, index) => ({
    sourceKey: source.sourceKey,
    newAccount: { name: `Sample account ${index}`, type: index ? "savings" : "current" },
    extendOpening: false,
    entries: source.balances.map((balance) => ({ date: balance.date, expectedCents: null })),
  }));
}
function initial(userId = owner) {
  return service.importBalances(userId, { csv, order: "ascending", selections: selections() });
}
async function http(userId: number | null, path: string, method = "GET", body?: unknown) {
  return app.handle(new Request(`http://localhost/api/finance${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(userId ? { Cookie: `session_id=finance-transactions-${userId}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}
beforeAll(async () => {
  await setupTestDb();
  const mod = db.select().from(modules).where(eq(modules.moduleName, "finance")).get()!;
  const ids = [];
  for (const [index, username] of ["finance-transactions-owner", "finance-transactions-other", "finance-transactions-forbidden"].entries()) {
    const user = db.insert(users).values({ username, pswdHash: "unused" }).returning().get();
    ids.push(user.userId);
    if (index < 2) db.insert(usermodulepermissions).values({ userId: user.userId, moduleId: mod.moduleId }).run();
    db.insert(sessions).values({ sessionId: `finance-transactions-${user.userId}`, userId: user.userId, expiresAt: "2099-01-01T00:00:00.000Z" }).run();
  }
  [owner, other, forbidden] = ids;
});
beforeEach(() => {
  for (const userId of [owner, other]) {
    db.delete(financeSettings).where(eq(financeSettings.userId, userId)).run();
    db.delete(financeGoals).where(eq(financeGoals.userId, userId)).run();
    db.delete(financeAccounts).where(eq(financeAccounts.userId, userId)).run();
  }
});

describe("Finance transaction imports and totals", () => {
  it("projects known counteraccounts and respects transfer overrides", () => {
    const content = csv + "\n20250104;Sample transfer;DEMO0001;DEMO0002;Af;10,00;Sample transfer;60,00";
    const selected = service.previewImport({ csv: content, order: "ascending" }).sources.map((source, index) => ({
      sourceKey: source.sourceKey,
      newAccount: { name: `Sample account ${index}`, type: index ? "savings" : "current" },
      extendOpening: false,
      entries: source.balances.map((entry) => ({ date: entry.date, expectedCents: null })),
    }));
    service.importBalances(owner, { csv: content, order: "ascending", selections: selected });
    expect(service.dashboard(owner, "all", "2025-01-04").end.totalCents).toBe(59000);
    const entry = service.transactionList(owner, {}).entries.find((entry) => entry.date === "2025-01-04")!;
    service.setTransfer(owner, entry.id, { internalTransfer: false });
    expect(service.dashboard(owner, "all", "2025-01-04").end.totalCents).toBe(58000);
    service.setTransfer(owner, entry.id, { internalTransfer: null });
    expect(service.dashboard(owner, "all", "2025-01-04").end.totalCents).toBe(59000);
  });
  it("keeps total wealth stable for savings transfers while the savings export is stale", () => {
    const savingsCsv = [
      "Date;Description;Account;Account name;Counterparty;Debit/credit;Amount;Currency;Transaction type;Notifications;Resulting balance",
      "2025-01-01;Sample opening;S000-00001;Sample savings;;Credit;500,00;EUR;Interest;;500,00",
    ].join("\n");
    service.importBalances(owner, { csv: savingsCsv, order: "ascending", selections: [{ sourceKey: "1", newAccount: { name: "Sample savings", type: "savings" }, extendOpening: false, entries: [{ date: "2025-01-01", expectedCents: null }] }] });
    const currentCsv = [
      "Datum;Rekening;Tegenrekening;Af Bij;Bedrag (EUR);Mededelingen;Saldo na mutatie",
      "20250101;DEMO0001;EXTERNAL0001;Bij;100,00;Sample salary;100,00",
      "20250102;DEMO0001;;Bij;20,00;Van Oranje spaarrekening S00000001;120,00",
      "20250103;DEMO0001;;Af;10,00;Naar Oranje spaarrekening S00000001;110,00",
      "20250104;DEMO0001;EXTERNAL0002;Af;5,00;Sample shop;105,00",
    ].join("\n");
    const entries = service.previewImport({ csv: currentCsv, order: "ascending" }).sources[0].balances.map((entry) => ({ date: entry.date, expectedCents: null }));
    service.importBalances(owner, { csv: currentCsv, order: "ascending", selections: [{ sourceKey: "1", newAccount: { name: "Sample current", type: "current" }, extendOpening: false, entries }] });
    const before = service.data(owner);
    const report = service.dashboard(owner, "all", "2025-01-04");
    expect(report.history.map((point) => point.totalCents)).toEqual([60000, 60000, 60000, 59500]);
    expect(report.history.map((point) => point.savingsCents)).toEqual([50000, 48000, 49000, 49000]);
    expect(report.comparison.changeCents).toBe(-500);
    expect(service.dashboard(owner, "month", "2025-02-01").start.totalCents).toBe(59500);
    expect(service.data(owner)).toEqual(before);
    expect(service.dashboard(other, "all", "2025-01-04").end.totalCents).toBeNull();

    const savingsAccount = before.accounts.find((entry) => entry.type === "savings")!;
    const updatedCsv = savingsCsv.split("\n")[0] + "\n" + [
      "2025-01-02;Sample withdrawal;S000-00001;Sample savings;DEMO0001;Debit;20,00;EUR;Withdrawal;;480,00",
      "2025-01-03;Sample deposit;S000-00001;Sample savings;DEMO0001;Credit;10,00;EUR;Deposit;;490,00",
      "2025-01-04;Sample interest;S000-00001;Sample savings;;Credit;0,50;EUR;Interest;;490,50",
    ].join("\n");
    service.importBalances(owner, { csv: updatedCsv, order: "ascending", selections: [{ sourceKey: "1", accountId: savingsAccount.id, extendOpening: false, entries: ["02", "03", "04"].map((day) => ({ date: `2025-01-${day}`, expectedCents: null })) }] });
    expect(service.dashboard(owner, "all", "2025-01-04").history.map((point) => point.totalCents)).toEqual([60000, 60000, 60000, 59550]);
  });
  it("persists a per-user monthly budget and rejects invalid amounts", () => {
    expect(service.data(owner).monthlyBudgetCents).toBeNull();
    for (const value of [-1, 1.5, "100", undefined, Infinity, 1_000_000_000_001]) {
      expect(() => service.setMonthlyBudget(owner, { monthlyBudgetCents: value })).toThrow();
    }
    service.setMonthlyBudget(owner, { monthlyBudgetCents: 12345 });
    expect(new FinanceService().data(owner).monthlyBudgetCents).toBe(12345);
    expect(service.data(other).monthlyBudgetCents).toBeNull();
    service.setMonthlyBudget(owner, { monthlyBudgetCents: null });
    expect(service.dashboard(owner, "month", "2025-01-03").budget).toBeNull();
  });
  it("subtracts only that month's external expenses and handles positive, zero and negative remaining budgets", () => {
    initial();
    service.setMonthlyBudget(owner, { monthlyBudgetCents: 2000 });
    for (const period of ["month", "year", "all"]) {
      expect(service.dashboard(owner, period, "2025-01-03").budget).toEqual({ month: "2025-01", limitCents: 2000, spendingCents: 1000, remainingCents: 1000 });
      expect(service.dashboard(owner, period, "2025-02-01").budget).toEqual({ month: "2025-02", limitCents: 2000, spendingCents: 0, remainingCents: 2000 });
    }
    expect(service.dashboard(owner, "month", "2025-01-02").budget?.remainingCents).toBe(2000);
    service.setMonthlyBudget(owner, { monthlyBudgetCents: 1000 });
    expect(service.dashboard(owner, "month", "2025-01-03").budget?.remainingCents).toBe(0);
    service.setMonthlyBudget(owner, { monthlyBudgetCents: 0 });
    expect(service.dashboard(owner, "month", "2025-01-03").budget?.remainingCents).toBe(-1000);
    const shop = service.transactionList(owner, {}).entries.find((entry) => entry.name === "Sample shop")!;
    service.setTransfer(owner, shop.id, { internalTransfer: true });
    expect(service.dashboard(owner, "month", "2025-01-03").budget?.remainingCents).toBe(0);
  });
  it("protects budget settings with authentication and module access and clears only the owner's budget on reset", async () => {
    expect((await http(null, "/settings/budget", "PUT", { monthlyBudgetCents: 100 })).status).toBe(401);
    expect((await http(forbidden, "/settings/budget", "PUT", { monthlyBudgetCents: 100 })).status).toBe(403);
    expect((await http(owner, "/settings/budget", "PUT", { monthlyBudgetCents: -1 })).status).toBe(400);
    expect((await http(owner, "/settings/budget", "PUT", { monthlyBudgetCents: 100 })).status).toBe(200);
    expect((await (await http(owner, "/")).json()).monthlyBudgetCents).toBe(100);
    service.setMonthlyBudget(other, { monthlyBudgetCents: 200 });
    service.resetFinance(owner, { confirmation: "DELETE_FINANCE" });
    expect(service.data(owner).monthlyBudgetCents).toBeNull();
    expect(service.data(other).monthlyBudgetCents).toBe(200);
  });
  it("stores full transactions, separates transfers, and respects date boundaries", () => {
    expect(initial().transactionsInserted).toBe(4);
    const report = service.dashboard(owner, "all", "2025-01-03");
    expect(report.end.totalCents).toBe(59000);
    expect(report.activity).toMatchObject({ incomeCents: 10000, spendingCents: 1000, netCents: 9000, transactionCount: 4, excludedCount: 2 });
    expect(service.activity(owner, "2025-01-03", "2025-01-03")).toMatchObject({ incomeCents: 0, spendingCents: 1000, transactionCount: 1 });
    expect(service.transactionList(owner, {}).entries.find((entry) => entry.name === "Sample shop")?.description).toBe("Sample purchase");
    expect(report.activity?.coverage).toHaveLength(2);
    expect(service.activity(other, "2025-01-01", "2025-01-03").transactionCount).toBe(0);
  });
  it("excludes Dutch savings transfers with blank counterparties before the savings export is imported", () => {
    const content = [
      "Datum;Rekening;Tegenrekening;Af Bij;Bedrag (EUR);Mededelingen;Saldo na mutatie",
      "20250101;DEMO0001;EXTERNAL0001;Bij;100,00;Sample salary;100,00",
      "20250102;DEMO0001;;Af;20,00;Naar Oranje spaarrekening S00000001 Valutadatum: 02-01-2025;80,00",
      "20250103;DEMO0001;;Bij;10,00;Van Oranje spaarrekening S00000001 Valutadatum: 03-01-2025;90,00",
    ].join("\n");
    const preview = service.previewImport({ csv: content, order: "ascending" });
    service.importBalances(owner, { csv: content, order: "ascending", selections: [{ sourceKey: "1", newAccount: { name: "Sample current", type: "current" }, extendOpening: false, entries: preview.sources[0].balances.map((entry) => ({ date: entry.date, expectedCents: null })) }] });
    expect(service.activity(owner, "2025-01-01", "2025-01-03")).toMatchObject({ incomeCents: 10000, spendingCents: 0, excludedCount: 2 });
    expect(service.activity(owner, "2025-01-02", "2025-01-02")).toMatchObject({ incomeCents: 0, spendingCents: 0, excludedCount: 1 });
    const savings = [
      "Date;Description;Account;Account name;Counterparty;Debit/credit;Amount;Currency;Transaction type;Notifications;Resulting balance",
      "2025-01-02;Sample deposit;S000-00001;Sample savings;DEMO0001;Credit;20,00;EUR;Deposit;;20,00",
      "2025-01-03;Sample withdrawal;S000-00001;Sample savings;DEMO0001;Debit;10,00;EUR;Withdrawal;;10,00",
      "2025-01-04;Sample interest;S000-00001;Sample savings;;Credit;0,50;EUR;Interest;;10,50",
    ].join("\n");
    const savingSource = service.previewImport({ csv: savings, order: "ascending" }).sources[0];
    service.importBalances(owner, { csv: savings, order: "ascending", selections: [{ sourceKey: "1", newAccount: { name: "Sample savings", type: "savings" }, extendOpening: false, entries: savingSource.balances.map((entry) => ({ date: entry.date, expectedCents: null })) }] });
    expect(service.activity(owner, "2025-01-01", "2025-01-04")).toMatchObject({ incomeCents: 10050, spendingCents: 0, excludedCount: 4 });
    expect(service.transactionList(owner, {}).entries.filter((entry) => entry.automaticTransfer)).toHaveLength(4);
    expect(service.dashboard(owner, "all", "2025-01-04").end.totalCents).toBe(10050);
  });
  it("does not mistake interest, opposite directions or external payments for internal savings transfers", () => {
    expect(isSavingsTransfer("Naar Oranje spaarrekening F00000002", -100)).toBe(true);
    expect(isSavingsTransfer("From Orange savings account S000-00001", 100)).toBe(true);
    expect(isSavingsTransfer("To savings account S00000001", -100)).toBe(true);
    expect(isSavingsTransfer("Naar Oranje spaarrekening S00000001", 100)).toBe(false);
    expect(isSavingsTransfer("Van Oranje spaarrekening S00000001", -100)).toBe(false);
    expect(isSavingsTransfer("Interest savings account S00000001", 100)).toBe(false);
    expect(isSavingsTransfer("Sample payment mentioning spaarrekening S00000001", -100)).toBe(false);
    expect(isSavingsTransfer("Naar Oranje spaarrekening invalid", -100)).toBe(false);
    expect(isSavingsTransfer("Naar Oranje spaarrekening S00000001", 0)).toBe(false);
  });
  it("imports balance-free historical savings from an explicit closing balance", () => {
    const content = [
      "Datum;Omschrijving;Rekening;Rekening naam;Tegenrekening;Af Bij;Bedrag;Valuta;Saldo na mutatie",
      "20250102;Sample deposit;DEMO0003;Sample pot A;DEMO0001;Bij;10,00;EUR;",
      "20250101;Sample deposit;DEMO0003;Sample pot A;DEMO0001;Bij;20,00;EUR;",
      "20250101;Sample deposit;DEMO0003;Sample pot B;DEMO0001;Bij;50,00;EUR;",
    ].join("\n");
    const preview = service.previewImport({ csv: content, order: "descending" }, owner);
    expect(preview.sources.every((source) => source.needsBalance)).toBe(true);
    expect(service.data(owner).accounts).toHaveLength(0);
    const anchors = { "1": 3000, "2": 5000 };
    const resolved = service.previewImport({ csv: content, order: "descending", anchors }, owner);
    const selected: FinanceImportSelection[] = resolved.sources.map((source) => ({ sourceKey: source.sourceKey, newAccount: { name: source.suggestedName!, type: "savings" }, extendOpening: false, entries: source.balances.map((entry) => ({ date: entry.date, expectedCents: null })) }));
    expect(service.importBalances(owner, { csv: content, order: "descending", anchors, selections: selected }).transactionsInserted).toBe(3);
    expect(service.data(owner).accounts).toHaveLength(2);
    expect(service.dashboard(owner, "all", "2025-01-02").end.savingsCents).toBe(8000);
    expect(service.data(owner).observations.map((entry) => entry.balanceCents)).toEqual([2000, 5000, 3000]);
    expect(() => service.importBalances(other, { csv: content, order: "descending", selections: selected })).toThrow("finance.import.selection");
  });
  it("preserves repeated identical transactions and safely replaces corrected days", () => {
    const content = [
      "Datum;Rekening;Af Bij;Bedrag (EUR);Saldo na mutatie",
      "20250101;DEMO0004;Bij;10,00;10,00",
      "20250101;DEMO0004;Af;10,00;0,00",
      "20250101;DEMO0004;Bij;10,00;10,00",
      "20250101;DEMO0004;Af;10,00;0,00",
    ].join("\n");
    const newSelection: FinanceImportSelection = { sourceKey: "1", newAccount: { name: "Sample repeated", type: "current" }, extendOpening: false, entries: [{ date: "2025-01-01", expectedCents: null }] };
    expect(service.importBalances(owner, { csv: content, order: "ascending", selections: [newSelection] }).transactionsInserted).toBe(4);
    const account = service.data(owner).accounts[0];
    const repeat = { sourceKey: "1", accountId: account.id, extendOpening: false, entries: [{ date: "2025-01-01", expectedCents: 0 }] };
    expect(service.importBalances(owner, { csv: content, order: "ascending", selections: [repeat] }).transactionsInserted).toBe(0);
    expect(service.activity(owner, "2025-01-01", "2025-01-01")).toMatchObject({ incomeCents: 2000, spendingCents: 2000 });
    const corrected = content.replace(/10,00;0,00$/, "5,00;5,00");
    expect(service.importBalances(owner, { csv: corrected, order: "ascending", selections: [repeat] })).toMatchObject({ transactionsInserted: 1, transactionsRemoved: 1, updated: 1 });
    expect(service.transactionList(owner, {}).total).toBe(4);
    expect(service.activity(owner, "2025-01-01", "2025-01-01")).toMatchObject({ incomeCents: 2000, spendingCents: 1500 });
  });
  it("matches Dutch IBAN and legacy counteraccount formats within one user", () => {
    expect(accountNumberKey(owner, "NL00INGB0000000001")).toBe(accountNumberKey(owner, "1"));
    expect(accountNumberKey(owner, "DEMO0001")).not.toBe(accountNumberKey(other, "DEMO0001"));
  });
  it("matches known sources and makes repeat and overlapping imports idempotent", () => {
    initial();
    const preview = service.previewImport({ csv, order: "ascending" }, owner);
    const selected = preview.sources.map((source) => ({ sourceKey: source.sourceKey, accountId: source.matchedAccountId!, extendOpening: false, entries: source.balances.map((entry) => ({ date: entry.date, expectedCents: entry.balanceCents })) }));
    expect(selected.every((selection) => selection.accountId > 0)).toBe(true);
    expect(JSON.stringify(preview)).not.toContain("DEMO0001");
    expect(JSON.stringify(preview)).not.toContain("Sample purchase");
    expect(service.importBalances(owner, { csv, order: "ascending", selections: selected }).transactionsInserted).toBe(0);
    const overlap = csv.split("\n").slice(0, 1).concat(csv.split("\n").slice(2)).join("\n");
    const subset = service.previewImport({ csv: overlap, order: "ascending" }, owner).sources.map((source) => ({ sourceKey: source.sourceKey, accountId: source.matchedAccountId!, extendOpening: false, entries: source.balances.map((entry) => ({ date: entry.date, expectedCents: entry.balanceCents })) }));
    expect(service.importBalances(owner, { csv: overlap, order: "ascending", selections: subset }).transactionsInserted).toBe(0);
    expect(service.transactionList(owner, {}).total).toBe(4);
    expect(service.previewImport({ csv, order: "ascending" }, other).sources[0].matchedAccountId).toBeUndefined();
  });
  it("prevents importing the same bank source into a second account", () => {
    initial();
    expect(() => initial()).toThrow("finance.import.mappingConflict");
    expect(service.data(owner).accounts).toHaveLength(2);
    expect(service.transactionList(owner, {}).total).toBe(4);
  });
  it("keeps transaction imports limited to selected dates", () => {
    const selected = selections();
    selected[0].entries = selected[0].entries.slice(0, 1);
    service.importBalances(owner, { csv, order: "ascending", selections: selected.slice(0, 1) });
    expect(service.transactionList(owner, {}).total).toBe(1);
    expect(service.activity(owner, "2025-01-01", "2025-01-03").incomeCents).toBe(10000);
  });
  it("lets the owner correct transfer classification without altering balances", () => {
    initial();
    const transaction = service.transactionList(owner, {}).entries.find((entry) => entry.name === "Sample shop")!;
    const total = service.dashboard(owner, "all", "2025-01-03").end.totalCents;
    service.setTransfer(owner, transaction.id, { internalTransfer: true });
    expect(service.activity(owner, "2025-01-01", "2025-01-03").spendingCents).toBe(0);
    expect(() => service.setTransfer(other, transaction.id, { internalTransfer: false })).toThrow();
    service.setTransfer(owner, transaction.id, { internalTransfer: null });
    expect(service.activity(owner, "2025-01-01", "2025-01-03").spendingCents).toBe(1000);
    expect(service.dashboard(owner, "all", "2025-01-03").end.totalCents).toBe(total);
  });
  it("paginates deterministically and rejects invalid filters", () => {
    initial();
    const account = service.data(owner).accounts[0];
    for (let index = 0; index < 53; index++) db.insert(financeTransactions).values({ accountId: account.id, date: "2025-01-03", amountCents: -100, name: "Sample", description: "", fingerprint: `sample-${index}` }).run();
    const first = service.transactionList(owner, { page: 1 });
    const second = service.transactionList(owner, { page: 2 });
    expect(first.entries).toHaveLength(50);
    expect(second.entries).toHaveLength(7);
    expect(new Set([...first.entries, ...second.entries].map((entry) => entry.id)).size).toBe(57);
    expect(() => service.transactionList(owner, { page: -1 })).toThrow();
    expect(() => service.transactionList(owner, { start: "2025-02-01", end: "2025-01-01" })).toThrow();
  });
});

describe("Finance reset and HTTP isolation", () => {
  it("requires explicit confirmation and removes only the owner's finance data", () => {
    initial(); initial(other);
    const saving = service.data(owner).accounts[1];
    const goal = service.createGoal(owner, { name: "Sample goal", targetCents: 10000 });
    service.allocate(owner, goal.id, saving.id, { amountCents: 5000 });
    const client = db.insert(cashflowClients).values({ userId: owner, name: "Sample business" }).returning().get();
    const foreignBefore = service.data(other);
    const userBefore = db.select().from(users).where(eq(users.userId, owner)).get();
    expect(() => service.resetFinance(owner, {})).toThrow("finance.settings.confirmRequired");
    expect(service.data(owner).accounts).toHaveLength(2);
    service.resetFinance(owner, { confirmation: "DELETE_FINANCE" });
    expect(service.data(owner)).toMatchObject({ accounts: [], observations: [], goals: [], allocations: [] });
    expect(service.transactionList(owner, {}).total).toBe(0);
    expect(db.select().from(financeImportSources).where(eq(financeImportSources.userId, owner)).all()).toHaveLength(0);
    expect(service.data(other)).toEqual(foreignBefore);
    expect(db.select().from(cashflowClients).where(eq(cashflowClients.id, client.id)).get()).toEqual(client);
    expect(service.transactionList(other, {}).total).toBe(4);
    expect(db.select().from(users).where(eq(users.userId, owner)).get()).toEqual(userBefore);
    expect(initial().transactionsInserted).toBe(4);
  });
  it("allows imports and reads while rejecting manual transaction edits", async () => {
    expect(service.data(owner).accounts).toHaveLength(0);
    expect((await http(owner, "/import/preview", "POST", { csv, order: "ascending" })).status).toBe(200);
    expect(service.data(owner).accounts).toHaveLength(0);
    expect((await http(owner, "/import", "POST", { csv, order: "ascending", selections: selections() })).status).toBe(200);
    initial(other);
    const foreignId = service.transactionList(other, {}).entries[0].id;
    for (const [path, method, body] of [
      ["/transactions", "GET", undefined],
    ] as const) {
      expect((await http(null, path, method, body)).status).toBe(401);
      expect((await http(forbidden, path, method, body)).status).toBe(403);
    }
    expect((await http(owner, `/transactions/${foreignId}/transfer`, "PUT", { internalTransfer: true })).status).toBe(404);
    const before = service.transactionList(owner, {});
    const ownId = before.entries[0].id;
    expect((await http(owner, `/transactions/${ownId}/transfer`, "PUT", { internalTransfer: true })).status).toBe(404);
    expect(service.transactionList(owner, {})).toEqual(before);
    const list = await http(owner, "/transactions");
    expect(list.headers.get("Cache-Control")).toBe("no-store");
    expect((await list.json()).total).toBe(4);
  });
  it("authenticates resets, requires confirmation and isolates deletion to the session owner", async () => {
    initial(); initial(other);
    const before = service.data(owner);
    const foreignBefore = service.data(other);
    const confirmation = { confirmation: "DELETE_FINANCE", userId: other };
    expect((await http(null, "/settings/reset", "POST", confirmation)).status).toBe(401);
    expect((await http(forbidden, "/settings/reset", "POST", confirmation)).status).toBe(403);
    for (const body of [{}, { confirmation: "" }, { confirmation: "VERWIJDEREN" }]) {
      expect((await http(owner, "/settings/reset", "POST", body)).status).toBe(400);
      expect(service.data(owner)).toEqual(before);
    }
    const response = await http(owner, "/settings/reset", "POST", confirmation);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ success: true });
    expect(service.data(owner)).toMatchObject({ accounts: [], observations: [], goals: [], allocations: [] });
    expect(service.transactionList(owner, {}).total).toBe(0);
    expect(service.data(other)).toEqual(foreignBefore);
    expect(service.transactionList(other, {}).total).toBe(4);
    expect((await http(owner, "/settings/reset", "POST", confirmation)).status).toBe(200);
    expect(initial().transactionsInserted).toBe(4);
  });
});
