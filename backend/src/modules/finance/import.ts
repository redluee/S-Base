import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import {
  financeAccounts as accounts,
  financeObservations as observations,
} from "../../db/schema/finance";
import {
  ConflictError,
  ValidationError,
  requireId,
  requireObject,
} from "../../utils/validation";
import { FinanceGoalsService } from "./goals";
import { parseIngCsv } from "./ing-csv";
import { accountInput, calendarDate, cents } from "./validation";
import type { FinanceImportResult } from "../../types/finance";

export class FinanceImportService extends FinanceGoalsService {
  previewImport(input: unknown) {
    const data = requireObject(input);
    return parseIngCsv(data.csv, data.order);
  }
  importBalances(userId: number, input: unknown): FinanceImportResult {
    const data = requireObject(input),
      preview = parseIngCsv(data.csv, data.order);
    if (
      !Array.isArray(data.selections) ||
      !data.selections.length ||
      data.selections.length > preview.sources.length
    )
      throw new ValidationError("finance.import.selection");
    const selections = data.selections.map((value: unknown) => {
      const selection = requireObject(value);
      const source = preview.sources.find(
        (source) => source.sourceKey === selection.sourceKey,
      );
      if (
        !source ||
        !Array.isArray(selection.entries) ||
        !selection.entries.length ||
        selection.entries.length > source.balances.length
      )
        throw new ValidationError("finance.import.selection");
      if (
        (selection.accountId === undefined) ===
        (selection.newAccount === undefined)
      )
        throw new ValidationError("finance.import.selection");
      if (typeof selection.extendOpening !== "boolean")
        throw new ValidationError("finance.import.selection");
      const entries = selection.entries
        .map((value: unknown) => {
          const entry = requireObject(value),
            date = calendarDate(entry.date);
          const balance = source.balances.find(
            (balance) => balance.date === date,
          );
          if (!balance) throw new ValidationError("finance.import.selection");
          return {
            ...balance,
            expectedCents:
              entry.expectedCents === null ? null : cents(entry.expectedCents),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      if (new Set(entries.map((entry) => entry.date)).size !== entries.length)
        throw new ValidationError("finance.import.selection");
      const first = entries[0];
      const newAccount =
        selection.newAccount === undefined
          ? undefined
          : accountInput({
              ...requireObject(selection.newAccount),
              bank: "ING",
              openingDate: first.date,
              openingBalanceCents: first.balanceCents,
            });
      return {
        sourceKey: source.sourceKey,
        entries,
        accountId:
          selection.accountId === undefined
            ? undefined
            : requireId(selection.accountId),
        newAccount,
        extendOpening: selection.extendOpening,
      };
    });
    const accountIds = selections.flatMap((selection) =>
      selection.accountId === undefined ? [] : [selection.accountId],
    );
    if (
      new Set(accountIds).size !== accountIds.length ||
      new Set(selections.map((selection) => selection.sourceKey)).size !==
        selections.length
    )
      throw new ValidationError("finance.import.selection");
    return db.transaction((tx) => {
      const result = {
        createdAccounts: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
      };
      for (const selection of selections) {
        const account =
          selection.accountId !== undefined
            ? this.account(userId, selection.accountId)
            : this.createAccount(userId, selection.newAccount);
        if (selection.newAccount) result.createdAccounts++;
        const earliest = selection.entries[0].date;
        if (earliest < account.openingDate) {
          if (!selection.extendOpening)
            throw new ConflictError("finance.import.beforeOpening");
          tx.update(accounts)
            .set({ openingDate: earliest })
            .where(
              and(eq(accounts.userId, userId), eq(accounts.id, account.id)),
            )
            .run();
        }
        for (const entry of selection.entries) {
          const existing = tx
            .select()
            .from(observations)
            .where(
              and(
                eq(observations.accountId, account.id),
                eq(observations.date, entry.date),
              ),
            )
            .get();
          const createdOpening =
            !!selection.newAccount && entry.date === earliest;
          if (
            !createdOpening &&
            (existing?.balanceCents ?? null) !== entry.expectedCents
          )
            throw new ConflictError("finance.import.stale");
          if (createdOpening) result.inserted++;
          else if (existing?.balanceCents === entry.balanceCents)
            result.unchanged++;
          else {
            tx.insert(observations)
              .values({
                accountId: account.id,
                date: entry.date,
                balanceCents: entry.balanceCents,
              })
              .onConflictDoUpdate({
                target: [observations.accountId, observations.date],
                set: { balanceCents: entry.balanceCents },
              })
              .run();
            if (existing) result.updated++;
            else result.inserted++;
          }
        }
      }
      return result;
    });
  }
}
