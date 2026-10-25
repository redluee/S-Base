import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import db from "../../db/client";
import { financeAccounts, financeSubscriptionPreferences, financeTransactions, modules, sessions, usermodulepermissions, users } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { financeRoutes } from "../../routes/finance";
import { FinanceService } from "./index";
import { today } from "./validation";

const service = new FinanceService();
const app = new Elysia().use(financeRoutes);
let owner: number, other: number, forbidden: number;
function month(offset: number) {
  const date = new Date(`${today().slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 10);
}
function addSubscription(userId: number, name: string, amountCents = -1000, offset = 0) {
  const account = service.createAccount(userId, { name: "Sample account", type: "current", openingDate: "2020-01-01", openingBalanceCents: 100000 });
  for (const date of [month(offset - 1), month(offset)]) {
    db.insert(financeTransactions).values({ accountId: account.id, fingerprint: `${account.id}-${date}`, date, amountCents, name, description: "Sample payment" }).run();
  }
  return service.subscriptions(userId).entries.find((entry) => entry.accountId === account.id)!;
}
async function http(userId: number | null, path: string, method: string, body: unknown) {
  return app.handle(new Request(`http://localhost/api/finance${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(userId ? { Cookie: `session_id=subscription-settings-${userId}` } : {}) },
    body: JSON.stringify(body),
  }));
}
beforeAll(async () => {
  await setupTestDb();
  const mod = db.select().from(modules).where(eq(modules.moduleName, "finance")).get()!;
  const ids: number[] = [];
  for (const [index, username] of ["subscription-settings-owner", "subscription-settings-other", "subscription-settings-forbidden"].entries()) {
    const user = db.insert(users).values({ username, pswdHash: "unused" }).returning().get();
    ids.push(user.userId);
    if (index < 2) db.insert(usermodulepermissions).values({ userId: user.userId, moduleId: mod.moduleId }).run();
    db.insert(sessions).values({ sessionId: `subscription-settings-${user.userId}`, userId: user.userId, expiresAt: "2099-01-01T00:00:00.000Z" }).run();
  }
  [owner, other, forbidden] = ids;
});
beforeEach(() => {
  for (const userId of [owner, other]) {
    db.delete(financeSubscriptionPreferences).where(eq(financeSubscriptionPreferences.userId, userId)).run();
    db.delete(financeAccounts).where(eq(financeAccounts.userId, userId)).run();
  }
});

describe("Subscription corrections", () => {
  it("persists renamed subscriptions without changing transaction names", () => {
    const entry = addSubscription(owner, "Sample original");
    const before = db.select().from(financeTransactions).all();
    service.renameSubscription(owner, { id: entry.id, name: "  Sample custom name  " });
    expect(new FinanceService().subscriptions(owner).entries[0]).toMatchObject({ id: entry.id, name: "Sample custom name", totalCents: 2000 });
    expect(db.select().from(financeTransactions).all()).toEqual(before);
    expect(() => service.renameSubscription(owner, { id: entry.id, name: " " })).toThrow();
    expect(() => service.renameSubscription(owner, { id: entry.id, name: "a".repeat(121) })).toThrow();
  });
  it("merges names and accounts, sums history and uses the latest payment for monthly costs", () => {
    const original = addSubscription(owner, "Sample original", -1000, -2);
    const replacement = addSubscription(owner, "Sample replacement", -1800);
    const before = db.select().from(financeTransactions).all();
    service.mergeSubscriptions(owner, { id: original.id, targetId: replacement.id });
    const report = new FinanceService().subscriptions(owner);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]).toMatchObject({ id: replacement.id, name: "Sample replacement", totalCents: 5600, paymentCount: 4, monthlyCents: 1800 });
    expect(report.entries[0].accountIds.sort()).toEqual([original.accountId, replacement.accountId].sort());
    expect(report.monthlyCents).toBe(1800);
    expect(db.select().from(financeTransactions).all()).toEqual(before);
    service.renameSubscription(owner, { id: replacement.id, name: "Sample merged" });
    expect(service.subscriptions(owner).entries[0].name).toBe("Sample merged");
  });
  it("supports merging groups again and excluding all their sources permanently", () => {
    const first = addSubscription(owner, "Sample first");
    const second = addSubscription(owner, "Sample second");
    const third = addSubscription(owner, "Sample third");
    service.mergeSubscriptions(owner, { id: first.id, targetId: second.id });
    service.mergeSubscriptions(owner, { id: second.id, targetId: third.id });
    expect(service.subscriptions(owner).entries[0].sourceKeys).toHaveLength(3);
    expect(service.subscriptions(owner).totalCents).toBe(6000);
    const before = db.select().from(financeTransactions).all();
    service.excludeSubscription(owner, { id: third.id });
    expect(new FinanceService().subscriptions(owner)).toMatchObject({ entries: [], totalCents: 0, monthlyCents: 0 });
    expect(db.select().from(financeTransactions).all()).toEqual(before);
    db.insert(financeTransactions).values({ accountId: first.accountId, fingerprint: "excluded-new-payment", date: month(-2), amountCents: -1000, name: "Sample first", description: "" }).run();
    expect(service.subscriptions(owner).entries).toEqual([]);
    expect(service.transactionList(owner, {}).total).toBe(7);
  });
  it("isolates all mutations to the session owner and enforces module access", async () => {
    const own = addSubscription(owner, "Sample own");
    const foreign = addSubscription(other, "Sample foreign");
    const requests = [
      ["/subscriptions/name", "PUT", { id: foreign.id, name: "Changed" }],
      ["/subscriptions/merge", "POST", { id: own.id, targetId: foreign.id }],
      ["/subscriptions", "DELETE", { id: foreign.id }],
    ] as const;
    for (const [path, method, body] of requests) {
      expect((await http(null, path, method, body)).status).toBe(401);
      expect((await http(forbidden, path, method, body)).status).toBe(403);
      expect((await http(owner, path, method, body)).status).toBe(404);
    }
    expect(service.subscriptions(other).entries[0].name).toBe("Sample foreign");
    expect((await http(owner, "/subscriptions/name", "PUT", { id: own.id, name: "Updated" })).status).toBe(200);
    expect(service.subscriptions(owner).entries[0].name).toBe("Updated");
    expect((await http(owner, "/subscriptions/merge", "POST", { id: own.id, targetId: own.id })).status).toBe(400);
    expect((await http(owner, "/subscriptions", "DELETE", { id: "invalid" })).status).toBe(400);
    expect((await http(owner, "/subscriptions", "DELETE", { id: own.id })).status).toBe(200);
    expect(service.subscriptions(owner).entries).toEqual([]);
  });
  it("merges through HTTP and keeps the chosen custom name on later imported history", async () => {
    const first = addSubscription(owner, "Sample first");
    const second = addSubscription(owner, "Sample second");
    service.renameSubscription(owner, { id: second.id, name: "Sample custom" });
    expect((await http(owner, "/subscriptions/merge", "POST", { id: first.id, targetId: second.id })).status).toBe(200);
    db.insert(financeTransactions).values({ accountId: first.accountId, fingerprint: "merged-import-history", date: month(-2), amountCents: -900, name: "Sample first", description: "" }).run();
    const report = new FinanceService().subscriptions(owner);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0]).toMatchObject({ id: second.id, name: "Sample custom", paymentCount: 5, totalCents: 4900, monthlyCents: 1000, firstDate: month(-2) });
  });
  it("clears corrections on finance reset while preserving another user's corrections", () => {
    const own = addSubscription(owner, "Sample own");
    const foreign = addSubscription(other, "Sample foreign");
    service.excludeSubscription(owner, { id: own.id });
    service.renameSubscription(other, { id: foreign.id, name: "Sample custom" });
    service.resetFinance(owner, { confirmation: "DELETE_FINANCE" });
    expect(db.select().from(financeSubscriptionPreferences).where(eq(financeSubscriptionPreferences.userId, owner)).all()).toEqual([]);
    expect(service.subscriptions(other).entries[0].name).toBe("Sample custom");
  });
});
