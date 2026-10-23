import { and, eq, asc } from "drizzle-orm";
import db from "../../db/client";
import {
  financeAccounts as accounts,
  financeObservations as observations,
  financeGoals as goals,
  financeAllocations as allocations,
} from "../../db/schema/finance";
import {
  ConflictError,
  ValidationError,
  requireId,
  requireObject,
} from "../../utils/validation";
import { accountInput, calendarDate, cents, today } from "./validation";
import type { FinanceData } from "../../types/finance";

export class FinanceNotFound extends Error {}

export class FinanceAccountsService {
  account(userId: number, id: number) {
    const account = db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, requireId(id))))
      .get();
    if (!account) throw new FinanceNotFound("Account not found");
    return account;
  }
  data(userId: number): FinanceData {
    return {
      accounts: db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .orderBy(asc(accounts.id))
        .all(),
      observations: db
        .select({
          id: observations.id,
          accountId: observations.accountId,
          date: observations.date,
          balanceCents: observations.balanceCents,
        })
        .from(observations)
        .innerJoin(accounts, eq(accounts.id, observations.accountId))
        .where(eq(accounts.userId, userId))
        .orderBy(asc(observations.date))
        .all(),
      goals: db
        .select()
        .from(goals)
        .where(eq(goals.userId, userId))
        .orderBy(asc(goals.id))
        .all(),
      allocations: db
        .select({
          goalId: allocations.goalId,
          accountId: allocations.accountId,
          amountCents: allocations.amountCents,
        })
        .from(allocations)
        .innerJoin(accounts, eq(accounts.id, allocations.accountId))
        .innerJoin(goals, eq(goals.id, allocations.goalId))
        .where(and(eq(accounts.userId, userId), eq(goals.userId, userId)))
        .all(),
      today: today(),
    };
  }
  history(userId: number, id: number) {
    this.account(userId, id);
    return db
      .select()
      .from(observations)
      .where(eq(observations.accountId, id))
      .orderBy(asc(observations.date))
      .all();
  }
  createAccount(userId: number, input: unknown) {
    const { openingBalanceCents, ...data } = accountInput(input);
    return db.transaction((tx) => {
      if (
        tx.select().from(accounts).where(eq(accounts.userId, userId)).all()
          .length >= 200
      )
        throw new ValidationError("Account limit reached");
      const account = tx
        .insert(accounts)
        .values({ ...data, userId })
        .returning()
        .get();
      tx.insert(observations)
        .values({
          accountId: account.id,
          date: data.openingDate,
          balanceCents: openingBalanceCents,
        })
        .run();
      return account;
    });
  }
  updateAccount(userId: number, id: number, input: unknown) {
    const { openingBalanceCents, ...data } = accountInput(input);
    return db.transaction((tx) => {
      const account = this.account(userId, id);
      const history = this.history(userId, id);
      if (
        data.type !== account.type &&
        tx
          .select()
          .from(allocations)
          .where(eq(allocations.accountId, id))
          .all()
          .some((a) => a.amountCents > 0)
      )
        throw new ConflictError(
          "Release allocations before changing account type",
        );
      if (data.openingDate !== account.openingDate) {
        if (
          history.some(
            (o) => o.date !== account.openingDate && o.date <= data.openingDate,
          )
        )
          throw new ConflictError("Opening date conflicts with history");
        tx.delete(observations)
          .where(
            and(
              eq(observations.accountId, id),
              eq(observations.date, account.openingDate),
            ),
          )
          .run();
      }
      tx.insert(observations)
        .values({
          accountId: id,
          date: data.openingDate,
          balanceCents: openingBalanceCents,
        })
        .onConflictDoUpdate({
          target: [observations.accountId, observations.date],
          set: { balanceCents: openingBalanceCents },
        })
        .run();
      return tx
        .update(accounts)
        .set(data)
        .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
        .returning()
        .get();
    });
  }
  archiveAccount(userId: number, id: number, input: unknown) {
    this.account(userId, id);
    const { archived } = requireObject(input);
    if (typeof archived !== "boolean")
      throw new ValidationError("Invalid archive status");
    return db
      .update(accounts)
      .set({ archived })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .returning()
      .get();
  }
  setBalances(userId: number, input: unknown) {
    const data = requireObject(input),
      date = calendarDate(data.date);
    if (
      !Array.isArray(data.entries) ||
      data.entries.length < 1 ||
      data.entries.length > 200
    )
      throw new ValidationError("Choose at least one balance");
    const entries = data.entries.map((value: unknown) => {
      const entry = requireObject(value);
      return {
        accountId: requireId(entry.accountId),
        balanceCents: cents(entry.balanceCents),
        expectedCents:
          entry.expectedCents === null ? null : cents(entry.expectedCents),
      };
    });
    if (new Set(entries.map((e) => e.accountId)).size !== entries.length)
      throw new ValidationError("Duplicate account in balance update");
    return db.transaction((tx) => {
      for (const entry of entries) {
        const account = this.account(userId, entry.accountId);
        if (date < account.openingDate)
          throw new ValidationError("Balance precedes account opening date");
        const existing = tx
          .select()
          .from(observations)
          .where(
            and(
              eq(observations.accountId, account.id),
              eq(observations.date, date),
            ),
          )
          .get();
        if ((existing?.balanceCents ?? null) !== entry.expectedCents)
          throw new ConflictError(
            "Balance changed; reload and explicitly edit the existing observation",
          );
        tx.insert(observations)
          .values({
            accountId: account.id,
            date,
            balanceCents: entry.balanceCents,
          })
          .onConflictDoUpdate({
            target: [observations.accountId, observations.date],
            set: { balanceCents: entry.balanceCents },
          })
          .run();
      }
      return { success: true };
    });
  }
  deleteObservation(userId: number, id: number, dateInput: unknown) {
    this.account(userId, id);
    const date = calendarDate(dateInput);
    const result = db
      .delete(observations)
      .where(and(eq(observations.accountId, id), eq(observations.date, date)))
      .returning()
      .get();
    if (!result) throw new FinanceNotFound("Observation not found");
    return { success: true };
  }
}
