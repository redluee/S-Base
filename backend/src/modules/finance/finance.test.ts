import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import db from "../../db/client";
import {
  users,
  modules,
  usermodulepermissions,
  sessions,
} from "../../db/schema";
import { financeAccounts, financeGoals } from "../../db/schema/finance";
import { setupTestDb } from "../../test-utils";
import { FinanceService } from "./index";
import { FinanceNotFound } from "./accounts";
import { calendarDate, cents } from "./validation";
import { financeRoutes } from "../../routes/finance";

import type { FinanceDashboard } from "../../types/finance";

const service = new FinanceService();
let owner: number, other: number, moduleId: number;
const app = new Elysia().use(financeRoutes);
const accountInput = (
  type = "current",
  amount = 10000,
  date = "2025-01-01",
) => ({
  name: "Sample account",
  type,
  openingDate: date,
  openingBalanceCents: amount,
});
const create = (type = "current", amount = 10000, date = "2025-01-01") =>
  service.createAccount(owner, accountInput(type, amount, date));
const balance = (
  accountId: number,
  date: string,
  amount: number,
  expectedCents: number | null = null,
) =>
  service.setBalances(owner, {
    date,
    entries: [{ accountId, balanceCents: amount, expectedCents }],
  });
const goal = (targetCents = 100000) =>
  service.createGoal(owner, { name: "Sample goal", targetCents });

beforeAll(async () => {
  await setupTestDb();
  owner = db
    .insert(users)
    .values({ username: "finance-owner-test", pswdHash: "unused" })
    .returning()
    .get().userId;
  other = db
    .insert(users)
    .values({ username: "finance-other-test", pswdHash: "unused" })
    .returning()
    .get().userId;
  moduleId = db
    .select()
    .from(modules)
    .where(eq(modules.moduleName, "finance"))
    .get()!.moduleId;
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
  db.delete(financeGoals).where(eq(financeGoals.userId, owner)).run();
  db.delete(financeAccounts).where(eq(financeAccounts.userId, owner)).run();
});

describe("Finance validation and exact amounts", () => {
  it("accepts signed integer cents and rejects floats, unsafe values, strings and invalid dates", () => {
    expect(cents(101)).toBe(101);
    expect(cents(-101)).toBe(-101);
    for (const value of [
      1.1,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER,
      "100",
      null,
      true,
    ])
      expect(() => cents(value)).toThrow();
    for (const value of [
      "2025-02-29",
      "2025-04-31",
      "2025-1-01",
      "2025-01-01T00:00:00Z",
      "2099-01-01",
    ])
      expect(() => calendarDate(value)).toThrow();
    expect(calendarDate("2024-02-29")).toBe("2024-02-29");
    expect(calendarDate("2099-01-01", true)).toBe("2099-01-01");
    expect(() => create("investment")).toThrow();
    expect(() => create("current", 0.1)).toThrow();
    expect(() =>
      service.createAccount(owner, { ...accountInput(), name: " " }),
    ).toThrow();
    expect(() => goal(0)).toThrow();
  });
  it("adds cents exactly, supports historical dates and never backfills from future observations", () => {
    const a = create("current", 10),
      b = create("savings", 20);
    balance(a.id, "2025-02-01", 11);
    balance(b.id, "2025-02-01", 22);
    expect(service.dashboard(owner, "year", "2025-02-01").end.totalCents).toBe(
      33,
    );
    expect(service.dashboard(owner, "year", "2025-01-15").end.totalCents).toBe(
      30,
    );
    expect(() => balance(a.id, "2024-12-31", 1)).toThrow();
    service.deleteObservation(owner, b.id, "2025-01-01");
    const report = service.dashboard(owner, "year", "2025-01-15");
    expect(report.end.totalCents).toBe(10);
    expect(report.end.savingsCents).toBeNull();
    expect(report.end.complete).toBe(false);
    expect(
      report.end.accounts.find((x) => x.id === b.id)?.balanceCents,
    ).toBeNull();
    expect(report.comparison.reason).toBe("coverage");
  });
});

describe("Historical observations and period comparisons", () => {
  it("uses calendar period boundaries, reports zero baselines and changed coverage", () => {
    const a = create("current", 0);
    balance(a.id, "2025-01-20", 123);
    const year = service.dashboard(owner, "year", "2025-02-10");
    expect(year.comparison).toEqual({
      changeCents: 123,
      percent: null,
      reason: "zero",
    });
    const month = service.dashboard(owner, "month", "2025-02-10");
    expect(month.startDate).toBe("2025-02-01");
    expect(month.start.totalCents).toBe(123);
    expect(month.comparison.reason).toBe("insufficient");
    balance(a.id, "2025-02-05", 123);
    expect(
      service.dashboard(owner, "month", "2025-02-10").comparison.percent,
    ).toBe(0);
    expect(
      service.dashboard(owner, "month", "2025-02-01").comparison.reason,
    ).toBe("insufficient");
    create("savings", 100, "2025-02-05");
    expect(
      service.dashboard(owner, "month", "2025-02-10").comparison.reason,
    ).toBe("cohort");
    expect(
      service.dashboard(owner, "all", "2024-01-01").end.totalCents,
    ).toBeNull();
  });
  it("calculates absolute and percentage change without rounding cents", () => {
    const a = create("current", 10001);
    balance(a.id, "2025-02-01", 11002);
    const { comparison } = service.dashboard(owner, "year", "2025-03-01");
    expect(comparison.changeCents).toBe(1001);
    expect(comparison.percent).toBeCloseTo((1001 / 10001) * 100, 10);
  });
  it("preserves blank accounts, replaces only explicitly, and rolls back a conflicting batch", () => {
    const a = create(),
      b = create();
    balance(a.id, "2025-02-01", 20000);
    expect(service.history(owner, b.id)).toHaveLength(1);
    expect(() => balance(a.id, "2025-02-01", 30000)).toThrow();
    balance(a.id, "2025-02-01", 30000, 20000);
    expect(service.history(owner, a.id)).toHaveLength(2);
    expect(() =>
      service.setBalances(owner, {
        date: "2025-02-01",
        entries: [
          { accountId: b.id, balanceCents: 333, expectedCents: null },
          { accountId: a.id, balanceCents: 444, expectedCents: 20000 },
        ],
      }),
    ).toThrow();
    expect(service.history(owner, b.id)).toHaveLength(1);
    service.deleteObservation(owner, a.id, "2025-02-01");
    expect(service.dashboard(owner, "year", "2025-03-01").end.totalCents).toBe(
      20000,
    );
  });
  it("recalculates past edits and keeps archived balances in current and historical totals", () => {
    const a = create();
    balance(a.id, "2025-02-01", 15000);
    balance(a.id, "2025-01-01", 5000, 10000);
    expect(
      service.dashboard(owner, "year", "2025-03-01").comparison.changeCents,
    ).toBe(10000);
    service.archiveAccount(owner, a.id, { archived: true });
    expect(service.dashboard(owner, "year", "2025-03-01").end.totalCents).toBe(
      15000,
    );
    expect(service.dashboard(owner, "year", "2025-01-01").end.totalCents).toBe(
      5000,
    );
    expect(() =>
      service.updateAccount(
        owner,
        a.id,
        accountInput("current", 3, "2025-02-02"),
      ),
    ).toThrow();
    expect(service.history(owner, a.id)[0].balanceCents).toBe(5000);
    service.archiveAccount(owner, a.id, { archived: false });
    service.updateAccount(owner, a.id, {
      ...accountInput("current", 6000),
      bank: "Sample bank",
    });
    expect(service.history(owner, a.id)[0].balanceCents).toBe(6000);
  });
  it("counts transfers as no overall growth once both balances reflect them", () => {
    const a = create("current", 20000),
      b = create("savings", 10000);
    balance(a.id, "2025-02-01", 15000);
    expect(service.dashboard(owner, "year", "2025-02-01").end.mixedDates).toBe(
      true,
    );
    balance(b.id, "2025-02-01", 15000);
    const report = service.dashboard(owner, "year", "2025-02-01");
    expect(report.comparison.changeCents).toBe(0);
    expect(report.savingsComparison.changeCents).toBe(5000);
    expect(report.end.mixedDates).toBe(false);
  });
});

describe("Savings allocations", () => {
  it("prevents double allocation, goal overfunding, unknown funds and current account allocation", () => {
    const a = create("savings", 10000),
      b = create(),
      g = goal(),
      h = goal();
    service.allocate(owner, g.id, a.id, { amountCents: 6000 });
    expect(() =>
      service.allocate(owner, h.id, a.id, { amountCents: 4001 }),
    ).toThrow();
    service.allocate(owner, h.id, a.id, { amountCents: 4000 });
    expect(() =>
      service.allocate(owner, h.id, b.id, { amountCents: 1 }),
    ).toThrow();
    expect(() =>
      service.allocate(owner, h.id, a.id, { amountCents: -1 }),
    ).toThrow();
    expect(() =>
      service.updateGoal(owner, g.id, { name: "Small", targetCents: 5000 }),
    ).toThrow();
    const small = goal(1000);
    expect(() =>
      service.allocate(owner, small.id, a.id, { amountCents: 1001 }),
    ).toThrow();
    expect(service.dashboard(owner, "all", "2025-05-01").end.totalCents).toBe(
      20000,
    );
    const unknown = create("savings", 50);
    service.deleteObservation(owner, unknown.id, "2025-01-01");
    expect(() =>
      service.allocate(owner, g.id, unknown.id, { amountCents: 1 }),
    ).toThrow();
  });
  it("preserves allocations after reductions and deletion; permits releasing funds in a deficit", () => {
    const a = create("savings", 10000),
      g = goal(),
      h = goal();
    service.allocate(owner, g.id, a.id, { amountCents: 8000 });
    balance(a.id, "2025-02-01", 5000);
    expect(service.data(owner).allocations[0].amountCents).toBe(8000);
    expect(() =>
      service.allocate(owner, h.id, a.id, { amountCents: 1 }),
    ).toThrow();
    service.allocate(owner, g.id, a.id, { amountCents: 6000 });
    service.deleteObservation(owner, a.id, "2025-02-01");
    service.deleteObservation(owner, a.id, "2025-01-01");
    expect(service.data(owner).allocations[0].amountCents).toBe(6000);
    service.allocate(owner, g.id, a.id, { amountCents: 5000 });
    expect(() => service.updateAccount(owner, a.id, accountInput())).toThrow();
    service.deleteGoal(owner, g.id);
    expect(service.data(owner).allocations).toHaveLength(0);
  });
  it("blocks increases on archived savings and allows restoration and releasing allocations", () => {
    const a = create("savings", 10000),
      g = goal();
    service.allocate(owner, g.id, a.id, { amountCents: 1000 });
    service.archiveAccount(owner, a.id, { archived: true });
    expect(() =>
      service.allocate(owner, g.id, a.id, { amountCents: 2000 }),
    ).toThrow();
    service.allocate(owner, g.id, a.id, { amountCents: 0 });
    service.archiveAccount(owner, a.id, { archived: false });
    service.allocate(owner, g.id, a.id, { amountCents: 10000 });
  });
});

async function request(
  userId: number | null,
  path: string,
  method = "GET",
  body?: unknown,
) {
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
      .where(
        and(
          eq(usermodulepermissions.userId, other),
          eq(usermodulepermissions.moduleId, moduleId),
        ),
      )
      .run();
    try {
      for (const [path, method, body] of [
        ["/", "GET"],
        ["/dashboard", "GET"],
        ["/accounts", "POST", accountInput()],
        ["/balances", "POST", {}],
        ["/goals", "POST", { name: "Sample", targetCents: 1 }],
      ] as const)
        expect((await request(other, path, method, body)).status).toBe(403);
    } finally {
      db.insert(usermodulepermissions)
        .values({ userId: other, moduleId })
        .run();
    }
  });
  it("denies cross-user history, writes, archive, deletes and both allocation ownership directions", async () => {
    const a = create("savings"),
      g = goal();
    expect(() => service.account(other, a.id)).toThrow(FinanceNotFound);
    service.allocate(owner, g.id, a.id, { amountCents: 100 });
    const otherData = service.data(other);
    expect(otherData.accounts).toHaveLength(0);
    expect(otherData.observations).toHaveLength(0);
    expect(otherData.goals).toHaveLength(0);
    expect(otherData.allocations).toHaveLength(0);
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
      [`/goals/${g.id}`, "PUT", { name: "Intrusion", targetCents: 1 }],
      [`/goals/${g.id}`, "DELETE"],
      [`/goals/${g.id}/allocations/${a.id}`, "PUT", { amountCents: 1 }],
    ];
    for (const [path, method, body] of cases)
      expect((await request(other, path, method, body)).status).toBe(404);
    const ownGoal = service.createGoal(other, {
      name: "Other sample",
      targetCents: 100,
    });
    expect(
      (
        await request(
          other,
          `/goals/${ownGoal.id}/allocations/${a.id}`,
          "PUT",
          { amountCents: 1 },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          owner,
          `/goals/${ownGoal.id}/allocations/${a.id}`,
          "PUT",
          { amountCents: 1 },
        )
      ).status,
    ).toBe(404);
    service.deleteGoal(other, ownGoal.id);
  });
  it("returns validation errors and stale-edit conflicts over HTTP", async () => {
    const a = create();
    expect(
      (await request(owner, "/accounts", "POST", accountInput("current", 1.1)))
        .status,
    ).toBe(400);
    expect((await request(owner, "/dashboard?date=2025-02-30")).status).toBe(
      400,
    );
    expect(
      (
        await request(owner, "/balances", "POST", {
          date: "2025-01-01",
          entries: [{ accountId: a.id, balanceCents: 1, expectedCents: null }],
        })
      ).status,
    ).toBe(409);
    expect((await request(owner, "/")).headers.get("Cache-Control")).toBe(
      "no-store",
    );
  });
});
