import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import db from "../../db/client";
import {
  users,
  modules,
  sessions,
  usermodulepermissions,
  financeAccounts,
  financeGoals,
} from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { FinanceService } from "./index";
import { financeRoutes } from "../../routes/finance";
import type { FinanceImportSelection } from "../../types/finance";

const service = new FinanceService(),
  app = new Elysia().use(financeRoutes);
let owner: number, other: number, forbidden: number;
const csv =
  "Datum;Rekening;Af Bij;Bedrag (EUR);Saldo na mutatie\n20250103;DEMO0001;Af;20,00;100,29\n20250102;DEMO0001;Bij;20,00;120,29\n20250101;DEMO0001;Bij;100,29;100,29";
const second =
  "\n20250102;DEMO0002;Bij;20,00;520,00\n20250101;DEMO0002;Bij;500,00;500,00";
const dates = ["2025-01-01", "2025-01-02", "2025-01-03"];
const selection = (accountId?: number): FinanceImportSelection => ({
  sourceKey: "1",
  ...(accountId === undefined
    ? { newAccount: { name: "Sample imported savings", type: "savings" } }
    : { accountId }),
  extendOpening: false,
  entries: dates.map((date) => ({ date, expectedCents: null })),
});
const body = (selections = [selection()], content = csv) => ({
  csv: content,
  order: "descending",
  selections,
});
const create = (
  userId = owner,
  openingDate = "2025-01-01",
  openingBalanceCents = 0,
) =>
  service.createAccount(userId, {
    name: "Sample account",
    type: "savings",
    openingDate,
    openingBalanceCents,
  });

beforeAll(async () => {
  await setupTestDb();
  const mod = db
    .select()
    .from(modules)
    .where(eq(modules.moduleName, "finance"))
    .get()!;
  const ids = [];
  for (const [index, username] of [
    "finance-import-owner",
    "finance-import-other",
    "finance-import-forbidden",
  ].entries()) {
    const userId = db
      .insert(users)
      .values({ username, pswdHash: "unused" })
      .returning()
      .get().userId;
    ids.push(userId);
    if (index < 2)
      db.insert(usermodulepermissions)
        .values({ userId, moduleId: mod.moduleId })
        .run();
    db.insert(sessions)
      .values({
        sessionId: `finance-import-${userId}`,
        userId,
        expiresAt: "2099-01-01T00:00:00.000Z",
      })
      .run();
  }
  [owner, other, forbidden] = ids;
});
beforeEach(() => {
  for (const userId of [owner, other]) {
    db.delete(financeGoals).where(eq(financeGoals.userId, userId)).run();
    db.delete(financeAccounts).where(eq(financeAccounts.userId, userId)).run();
  }
});

describe("Atomic ING balance import", () => {
  it("imports savings-format CSV into totals and savings without counting transfers as growth", () => {
    const current = service.createAccount(owner, {
      name: "Sample current",
      type: "current",
      openingDate: "2025-01-01",
      openingBalanceCents: 10000,
    });
    service.setBalances(owner, {
      date: "2025-01-02",
      entries: [
        { accountId: current.id, balanceCents: 8000, expectedCents: null },
      ],
    });
    const content =
      '"Datum","Rekening","Rekening naam","Af Bij","Bedrag","Valuta","Saldo na mutatie"\n"2025-01-02","H DEMO-0001","Oranje Spaarrekening","Bij","20,00","EUR","520,00"\n"2025-01-01","H DEMO-0001","Oranje Spaarrekening","Bij","500,00","EUR","500,00"';
    const input = body(
      [
        {
          ...selection(),
          entries: dates
            .slice(0, 2)
            .map((date) => ({ date, expectedCents: null })),
        },
      ],
      content,
    );
    expect(service.previewImport(input).sources[0].suggestedType).toBe(
      "savings",
    );
    expect(service.importBalances(owner, input)).toMatchObject({
      createdAccounts: 1,
      inserted: 2,
    });
    const dashboard = service.dashboard(owner, "all", "2025-01-02");
    expect(dashboard.end.totalCents).toBe(60000);
    expect(dashboard.end.savingsCents).toBe(52000);
    expect(dashboard.comparison.changeCents).toBe(0);
    const invalid = body([selection()], content.replace('"EUR"', '"USD"'));
    expect(() => service.importBalances(owner, invalid)).toThrow(
      "finance.import.currency",
    );
    expect(service.data(owner).accounts).toHaveLength(2);
  });
  it("previews without writing and creates an account directly from selected balances", () => {
    expect(service.previewImport(body()).sources[0].label).toBe("…0001");
    expect(service.data(owner).accounts).toHaveLength(0);
    expect(service.importBalances(owner, body())).toEqual({
      createdAccounts: 1,
      inserted: 3,
      updated: 0,
      unchanged: 0,
      transactionsInserted: 3,
      transactionsRemoved: 0,
    });
    const data = service.data(owner);
    expect(data.accounts[0]).toMatchObject({
      name: "Sample imported savings",
      type: "savings",
      bank: "ING",
      openingDate: "2025-01-01",
    });
    expect(data.observations.map((entry) => entry.balanceCents)).toEqual([
      10029, 12029, 10029,
    ]);
    expect(
      service.dashboard(owner, "all", "2024-12-31").end.totalCents,
    ).toBeNull();
  });
  it("is idempotent, preserves unselected dates, and requires expected cents for replacement", () => {
    const account = create();
    const input = selection(account.id);
    input.entries[0].expectedCents = 0;
    expect(service.importBalances(owner, body([input]))).toMatchObject({
      inserted: 2,
      updated: 1,
    });
    for (const entry of input.entries)
      entry.expectedCents = service
        .history(owner, account.id)
        .find((observation) => observation.date === entry.date)!.balanceCents;
    expect(service.importBalances(owner, body([input]))).toMatchObject({
      inserted: 0,
      updated: 0,
      unchanged: 3,
    });
    expect(service.history(owner, account.id)).toHaveLength(3);
    service.setBalances(owner, {
      date: "2025-01-04",
      entries: [
        { accountId: account.id, balanceCents: 999, expectedCents: null },
      ],
    });
    expect(
      service.importBalances(
        owner,
        body([{ ...input, entries: [input.entries[1]] }]),
      ),
    ).toMatchObject({ unchanged: 1 });
    expect(service.history(owner, account.id).at(-1)?.balanceCents).toBe(999);
  });
  it("does not silently overwrite an existing observation and rolls back all sources on stale data", () => {
    const account = create();
    const input: FinanceImportSelection = {
      sourceKey: "2",
      accountId: account.id,
      extendOpening: false,
      entries: [{ date: "2025-01-01", expectedCents: 999 }],
    };
    expect(() =>
      service.importBalances(owner, body([selection(), input], csv + second)),
    ).toThrow("finance.import.stale");
    expect(service.data(owner).accounts).toHaveLength(1);
    expect(service.history(owner, account.id)[0].balanceCents).toBe(0);
  });
  it("extends the opening date only with explicit consent, preserving the old opening observation", () => {
    const account = create(owner, "2025-01-10", 999);
    const input = selection(account.id);
    expect(() => service.importBalances(owner, body([input]))).toThrow(
      "finance.import.beforeOpening",
    );
    expect(service.account(owner, account.id).openingDate).toBe("2025-01-10");
    expect(service.history(owner, account.id)).toHaveLength(1);
    input.extendOpening = true;
    service.importBalances(owner, body([input]));
    expect(service.account(owner, account.id).openingDate).toBe("2025-01-01");
    expect(service.history(owner, account.id)).toHaveLength(4);
    expect(service.history(owner, account.id).at(-1)?.balanceCents).toBe(999);
  });
  it("handles multiple accounts and internal transfers without adding growth or altering allocations", () => {
    const initialCsv =
      "Datum;Rekening;Af Bij;Bedrag (EUR);Saldo na mutatie\n20250101;DEMO0001;Bij;100,00;100,00\n20250102;DEMO0001;Af;20,00;80,00\n20250101;DEMO0002;Bij;500,00;500,00\n20250102;DEMO0002;Bij;20,00;520,00";
    const first = {
      ...selection(),
      entries: dates.slice(0, 2).map((date) => ({ date, expectedCents: null })),
    };
    const otherInput = {
      ...first,
      sourceKey: "2",
      newAccount: { name: "Sample second account", type: "savings" as const },
    };
    service.importBalances(owner, {
      csv: initialCsv,
      order: "ascending",
      selections: [first, otherInput],
    });
    expect(
      service.dashboard(owner, "all", "2025-01-02").comparison.changeCents,
    ).toBe(0);
    const account = service.data(owner).accounts[0];
    const goal = service.createGoal(owner, {
      name: "Sample goal",
      targetCents: 10000,
    });
    service.allocate(owner, goal.id, account.id, { amountCents: 7000 });
    service.importBalances(owner, {
      csv: "Datum;Rekening;Af Bij;Bedrag (EUR);Saldo na mutatie\n20250103;DEMO0001;Af;30,00;50,00",
      order: "descending",
      selections: [
        {
          sourceKey: "1",
          accountId: account.id,
          extendOpening: false,
          entries: [{ date: "2025-01-03", expectedCents: null }],
        },
      ],
    });
    expect(service.data(owner).allocations[0].amountCents).toBe(7000);
    expect(() =>
      service.allocate(owner, goal.id, account.id, { amountCents: 7001 }),
    ).toThrow();
  });
  it("keeps archived accounts archived while updating their history", () => {
    const account = create();
    service.archiveAccount(owner, account.id, { archived: true });
    const input = selection(account.id);
    input.entries[0].expectedCents = 0;
    service.importBalances(owner, body([input]));
    expect(service.account(owner, account.id).archived).toBe(true);
    expect(service.dashboard(owner, "all", "2025-01-03").end.totalCents).toBe(
      10029,
    );
  });
  it("rejects duplicate account mappings, unsupported dates, duplicate dates and empty selections", () => {
    const account = create();
    expect(() => service.importBalances(owner, body([]))).toThrow();
    expect(() =>
      service.importBalances(
        owner,
        body([
          {
            ...selection(account.id),
            entries: [{ date: "2025-01-09", expectedCents: null }],
          },
        ]),
      ),
    ).toThrow();
    expect(() =>
      service.importBalances(
        owner,
        body([
          {
            ...selection(account.id),
            entries: [
              { date: dates[1], expectedCents: null },
              { date: dates[1], expectedCents: null },
            ],
          },
        ]),
      ),
    ).toThrow();
    expect(() =>
      service.importBalances(
        owner,
        body(
          [
            selection(account.id),
            {
              ...selection(account.id),
              sourceKey: "2",
              entries: [{ date: dates[1], expectedCents: null }],
            },
          ],
          csv + second,
        ),
      ),
    ).toThrow();
  });
});
async function request(userId: number | null, path: string, input: unknown) {
  return app.handle(
    new Request(`http://localhost/api/finance${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { Cookie: `session_id=finance-import-${userId}` } : {}),
      },
      body: JSON.stringify(input),
    }),
  );
}
describe("ING import HTTP ownership and module access", () => {
  it("denies anonymous and module-forbidden preview and imports", async () => {
    for (const path of ["/import/preview", "/import"]) {
      expect((await request(null, path, body())).status).toBe(401);
      expect((await request(forbidden, path, body())).status).toBe(403);
    }
  });
  it("denies foreign account writes and rolls back earlier source creation", async () => {
    const foreign = create(other);
    const input = {
      ...selection(foreign.id),
      sourceKey: "2",
      entries: [{ date: dates[1], expectedCents: null }],
    };
    expect(
      (
        await request(
          owner,
          "/import",
          body([selection(), input], csv + second),
        )
      ).status,
    ).toBe(404);
    expect(service.data(owner).accounts).toHaveLength(0);
    expect(service.history(other, foreign.id)).toHaveLength(1);
  });
  it("returns 400 for invalid input and 409 for a stale preview without exposing raw account data", async () => {
    expect(
      (
        await request(owner, "/import/preview", {
          csv: "invalid",
          order: "descending",
        })
      ).status,
    ).toBe(400);
    const preview = await request(owner, "/import/preview", body());
    expect(preview.status).toBe(200);
    expect(await preview.text()).not.toContain("DEMO0001");
    const account = create();
    expect(
      (await request(owner, "/import", body([selection(account.id)]))).status,
    ).toBe(409);
    const count = db
      .select()
      .from(financeAccounts)
      .where(
        and(
          eq(financeAccounts.userId, owner),
          eq(financeAccounts.id, account.id),
        ),
      )
      .all().length;
    expect(count).toBe(1);
  });
});
