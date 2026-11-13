import { financeAccountIcons } from "../../types/finance-icons";
import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { users, modules, usermodulepermissions, sessions } from "../../db/schema";
import { financeAccounts, financeObservations } from "../../db/schema/finance";
import { setupTestDb } from "../../test-utils";
import { FinanceService } from "./index";
import { NotFoundError } from "../../utils/errors";
import { calendarDate, cents } from "./validation";
import { app } from "../../index";

import type { FinanceDashboard } from "../../types/finance";

const service = new FinanceService();
let owner: number, other: number, moduleId: number;
const accountInput = (type = "current", amount = 10000, date = "2025-01-01") => ({
  name: "Sample account",
  type,
  openingDate: date,
  openingBalanceCents: amount,
});
const create = (type = "current", amount = 10000, date = "2025-01-01") =>
  service.accounts.createAccount(owner, accountInput(type, amount, date));
const balance = (accountId: number, date: string, balanceCents: number) =>
  db
    .insert(financeObservations)
    .values({ accountId, date, balanceCents })
    .onConflictDoUpdate({
      target: [financeObservations.accountId, financeObservations.date],
      set: { balanceCents },
    })
    .run();
const removeBalance = (accountId: number, date: string) =>
  db
    .delete(financeObservations)
    .where(and(eq(financeObservations.accountId, accountId), eq(financeObservations.date, date)))
    .run();
const setArchived = (accountId: number, archived: boolean) =>
  db.update(financeAccounts).set({ archived }).where(eq(financeAccounts.id, accountId)).run();

beforeAll(async () => {
  await setupTestDb();
  owner = db.insert(users).values({ username: "finance-owner-test", pswdHash: "unused" }).returning().get().userId;
  other = db.insert(users).values({ username: "finance-other-test", pswdHash: "unused" }).returning().get().userId;
  moduleId = db.select().from(modules).where(eq(modules.moduleName, "finance")).get()!.moduleId;
  for (const userId of [owner, other]) {
    db.insert(usermodulepermissions).values({ userId, moduleId }).run();
    db.insert(sessions)
      .values({
        sessionId: `finance-test-${userId}`,
        userId,
        expiresAt: "2099-01-01T00:00:00.000Z",
      })
      .run();
  }
});
beforeEach(() => {
  db.delete(financeAccounts).where(eq(financeAccounts.userId, owner)).run();
});

describe("Finance validation and exact amounts", () => {
  it("accepts signed integer cents and rejects floats, unsafe values, strings and invalid dates", () => {
    expect(cents(101)).toBe(101);
    expect(cents(-101)).toBe(-101);
    for (const value of [1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER, "100", null, true])
      expect(() => cents(value)).toThrow();
    for (const value of ["2025-02-29", "2025-04-31", "2025-1-01", "2025-01-01T00:00:00Z", "2099-01-01"])
      expect(() => calendarDate(value)).toThrow();
    expect(calendarDate("2024-02-29")).toBe("2024-02-29");
    expect(calendarDate("2099-01-01", true)).toBe("2099-01-01");
    expect(() => create("investment")).toThrow();
    expect(() => create("current", 0.1)).toThrow();
    expect(() => service.accounts.createAccount(owner, { ...accountInput(), name: " " })).toThrow();
  });
  it("adds cents exactly, supports historical dates and never backfills from future observations", () => {
    const a = create("current", 10),
      b = create("savings", 20);
    balance(a.id, "2025-02-01", 11);
    balance(b.id, "2025-02-01", 22);
    expect(service.budget.dashboard(owner, "year", "2025-02-01").end.totalCents).toBe(33);
    expect(service.budget.dashboard(owner, "year", "2025-01-15").end.totalCents).toBe(30);
    removeBalance(b.id, "2025-01-01");
    const report = service.budget.dashboard(owner, "year", "2025-01-15");
    expect(report.end.totalCents).toBe(10);
    expect(report.end.savingsCents).toBeNull();
    expect(report.end.complete).toBe(false);
    expect(report.end.accounts.find((x) => x.id === b.id)?.balanceCents).toBeNull();
    expect(report.comparison.reason).toBe("insufficient");
  });
});

describe("Historical observations and period comparisons", () => {
  it("uses calendar period boundaries, reports zero baselines and changed coverage", () => {
    const a = create("current", 0, "2024-12-31");
    balance(a.id, "2025-01-20", 123);
    const year = service.budget.dashboard(owner, "year", "2025-02-10");
    expect(year.comparison).toEqual({
      changeCents: 123,
      percent: null,
      reason: "zero",
    });
    const month = service.budget.dashboard(owner, "month", "2025-02-10");
    expect(month.startDate).toBe("2025-02-01");
    expect(month.start.totalCents).toBe(123);
    expect(month.comparison.reason).toBe("insufficient");
    balance(a.id, "2025-02-05", 123);
    expect(service.budget.dashboard(owner, "month", "2025-02-10").comparison.percent).toBe(0);
    expect(service.budget.dashboard(owner, "month", "2025-02-01").comparison.reason).toBe("insufficient");
    create("savings", 100, "2025-02-05");
    expect(service.budget.dashboard(owner, "month", "2025-02-10").comparison.reason).toBe("cohort");
    expect(service.budget.dashboard(owner, "all", "2024-01-01").end.totalCents).toBeNull();
  });
  it("calculates absolute and percentage change without rounding cents", () => {
    const a = create("current", 10001, "2024-12-31");
    balance(a.id, "2025-02-01", 11002);
    const { comparison } = service.budget.dashboard(owner, "year", "2025-03-01");
    expect(comparison.changeCents).toBe(1001);
    expect(comparison.percent).toBeCloseTo((1001 / 10001) * 100, 10);
  });
  it("recalculates past edits and keeps archived balances in current and historical totals", () => {
    const a = create();
    balance(a.id, "2025-02-01", 15000);
    balance(a.id, "2025-01-01", 5000);
    expect(service.budget.dashboard(owner, "all", "2025-03-01").comparison.changeCents).toBe(10000);
    setArchived(a.id, true);
    expect(service.budget.dashboard(owner, "year", "2025-03-01").end.totalCents).toBe(15000);
    expect(service.budget.dashboard(owner, "year", "2025-01-01").end.totalCents).toBe(5000);
    expect(service.accounts.history(owner, a.id)[0].balanceCents).toBe(5000);
  });
  it("counts transfers as no overall growth once both balances reflect them", () => {
    const a = create("current", 20000),
      b = create("savings", 10000);
    balance(a.id, "2025-02-01", 15000);
    expect(service.budget.dashboard(owner, "year", "2025-02-01").end.mixedDates).toBe(true);
    balance(b.id, "2025-02-01", 15000);
    const report = service.budget.dashboard(owner, "month", "2025-02-01");
    expect(report.comparison.changeCents).toBe(0);
    expect(report.savingsComparison.changeCents).toBe(5000);
    expect(report.end.mixedDates).toBe(false);
  });
});

async function request(userId: number | null, path: string, method = "GET", body?: unknown) {
  return app.handle(
    new Request(`http://localhost/api/finance${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { Cookie: `session_id=finance-test-${userId}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
describe("Finance API permissions and ownership", () => {
  it("denies unauthenticated and module-forbidden requests", async () => {
    expect((await request(null, "/")).status).toBe(401);
    db.delete(usermodulepermissions)
      .where(and(eq(usermodulepermissions.userId, other), eq(usermodulepermissions.moduleId, moduleId)))
      .run();
    try {
      for (const [path, method, body] of [
        ["/", "GET"],
        ["/dashboard", "GET"],
        ["/import/preview", "POST", { content: "x" }],
        ["/import", "POST", { content: "x", selections: [] }],
        ["/transactions", "GET"],
      ] as const)
        expect((await request(other, path, method, body)).status).toBe(403);
    } finally {
      db.insert(usermodulepermissions).values({ userId: other, moduleId }).run();
    }
  });
  it("denies cross-user history and hides other users' accounts and balances", async () => {
    const a = create("savings");
    expect(() => service.accounts.account(other, a.id)).toThrow(NotFoundError);
    const otherData = service.accounts.data(other);
    expect(otherData.accounts).toHaveLength(0);
    expect(otherData.observations).toHaveLength(0);
    const otherDashboard = (await (
      await request(other, "/dashboard?period=all&date=2025-03-01")
    ).json()) as FinanceDashboard;
    expect(otherDashboard.end.accounts).toHaveLength(0);
    const cases: [string, string, unknown?][] = [
      [`/accounts/${a.id}/history`, "GET"],
      [`/accounts/${a.id}`, "PUT", accountInput()],
      [`/accounts/${a.id}/archive`, "PUT", { archived: true }],
      [`/accounts/${a.id}/observations/2025-01-01`, "DELETE"],
      [
        "/balances",
        "POST",
        {
          date: "2025-01-01",
          entries: [{ accountId: a.id, balanceCents: 1, expectedCents: 10000 }],
        },
      ],
    ];
    for (const [path, method, body] of cases) expect((await request(other, path, method, body)).status).toBe(404);
  });
  it("rejects manual data edits and preserves data on rejected writes", async () => {
    const a = create("savings");
    const before = service.accounts.data(owner);
    const cases: [string, string, unknown?][] = [
      ["/accounts", "POST", accountInput()],
      [`/accounts/${a.id}`, "PUT", accountInput()],
      [`/accounts/${a.id}/archive`, "PUT", { archived: true }],
      [`/accounts/${a.id}/observations/2025-01-01`, "DELETE"],
      [
        "/balances",
        "POST",
        { date: "2025-01-01", entries: [{ accountId: a.id, balanceCents: 1, expectedCents: 10000 }] },
      ],
    ];
    for (const [path, method, body] of cases) {
      expect((await request(owner, path, method, body)).status).toBe(404);
      expect(service.accounts.data(owner)).toEqual(before);
    }
    expect((await request(owner, `/accounts/${a.id}/history`)).status).toBe(200);
    expect((await request(owner, "/dashboard?date=2025-02-30")).status).toBe(400);
    expect((await request(owner, "/")).headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("Finance account icons", () => {
  it("persists all 50 icons, clears them, and leaves balances and account details unchanged", async () => {
    const account = create();
    const before = service.accounts.data(owner);
    expect(financeAccountIcons).toHaveLength(50);
    expect(new Set(financeAccountIcons).size).toBe(50);
    for (const icon of financeAccountIcons) {
      const response = await request(owner, `/accounts/${account.id}/icon`, "PUT", {
        icon,
        name: "Ignored",
        openingBalanceCents: 0,
      });
      expect(response.status).toBe(200);
      expect(((await response.json()) as { icon: string }).icon).toBe(icon);
      expect(service.accounts.data(owner).accounts[0]?.icon).toBe(icon);
      expect(service.budget.dashboard(owner, "all", "2025-02-01").end.accounts[0]?.icon).toBe(icon);
    }
    expect((await request(owner, `/accounts/${account.id}/icon`, "PUT", { icon: null })).status).toBe(200);
    expect(service.accounts.data(owner)).toEqual(before);
  });
  it("rejects unsupported icons and protects account ownership and module access", async () => {
    const account = create();
    for (const icon of ["unknown", "", 1, {}, true, undefined]) {
      expect((await request(owner, `/accounts/${account.id}/icon`, "PUT", { icon })).status).toBe(400);
    }
    expect((await request(other, `/accounts/${account.id}/icon`, "PUT", { icon: "wallet" })).status).toBe(404);
    expect((await request(null, `/accounts/${account.id}/icon`, "PUT", { icon: "wallet" })).status).toBe(401);
    db.delete(usermodulepermissions)
      .where(and(eq(usermodulepermissions.userId, owner), eq(usermodulepermissions.moduleId, moduleId)))
      .run();
    try {
      expect((await request(owner, `/accounts/${account.id}/icon`, "PUT", { icon: "wallet" })).status).toBe(403);
    } finally {
      db.insert(usermodulepermissions).values({ userId: owner, moduleId }).run();
    }
    expect(service.accounts.account(owner, account.id).icon).toBeNull();
  });
});
