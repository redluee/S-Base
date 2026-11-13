import { financeAccountIcons, type FinanceAccountIcon } from "../../shared/finance";
import { and, eq, asc } from "drizzle-orm";
import db from "../../db/client";
import {
  financeAccounts as accounts,
  financeObservations as observations,
  financeSettings as settings,
} from "../../db/schema/finance";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { requireId, requireObject } from "../../utils/validation";
import { accountInput, today } from "./validation";
import type { FinanceData } from "../../types/finance";

export class FinanceAccounts {
  account(userId: number, id: number) {
    const account = db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, requireId(id))))
      .get();
    if (!account) throw new NotFoundError("finance.accountNotFound");
    return account;
  }
  data(userId: number): FinanceData {
    return {
      monthlyBudgetCents:
        db.select().from(settings).where(eq(settings.userId, userId)).get()?.monthlyBudgetCents ?? null,
      accounts: db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.id)).all(),
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
      today: today(),
    };
  }
  history(userId: number, id: number) {
    this.account(userId, id);
    return db.select().from(observations).where(eq(observations.accountId, id)).orderBy(asc(observations.date)).all();
  }
  createAccount(userId: number, input: unknown) {
    const { openingBalanceCents, ...data } = accountInput(input);
    return db.transaction((tx) => {
      if (tx.select().from(accounts).where(eq(accounts.userId, userId)).all().length >= 200)
        throw new ValidationError("finance.accountLimit");
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
  setAccountIcon(userId: number, id: number, input: unknown) {
    this.account(userId, id);
    const { icon } = requireObject(input);
    if (icon !== null && !financeAccountIcons.includes(icon as FinanceAccountIcon))
      throw new ValidationError("finance.invalidIcon");
    return db
      .update(accounts)
      .set({ icon: icon as FinanceAccountIcon | null })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .returning()
      .get();
  }
}
