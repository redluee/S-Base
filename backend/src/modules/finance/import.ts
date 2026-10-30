import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import {
  financeAccounts as accounts,
  financeObservations as observations,
  financeImportSources as importSources,
  financeTransactions as transactions,
  financeSubscriptionPreferences as preferences,
} from "../../db/schema/finance";
import {
  ConflictError,
  ValidationError,
  requireId,
  requireObject,
} from "../../utils/validation";
import { FinanceTransactionsService, importKey, accountNumberKey } from "./transactions";
import { parseImport } from "./import-parser";
import { importPreview, type ImportSource } from "./import-model";
import { accountInput, calendarDate, cents } from "./validation";
import type { FinanceImportResult } from "../../types/finance";
import { subscriptionSourceKey } from "./subscriptions";

export class FinanceImportService extends FinanceTransactionsService {
  private sourceBinding(userId: number, source: ImportSource, camt: boolean) {
    const known = db.select().from(importSources).where(eq(importSources.userId, userId)).all();
    if (camt) {
      const matches = known.filter((entry) => entry.numberKey === accountNumberKey(userId, source.account));
      if (matches.length > 1) throw new ConflictError("finance.import.mappingConflict");
      return matches[0];
    }
    return known.find((entry) => entry.identity === importKey(userId, [source.account, source.accountName]));
  }
  previewImport(input: unknown, userId?: number) {
    const parsed = parseImport(input);
    const preview = importPreview(parsed);
    if (userId !== undefined) {
      preview.sources.forEach((source, index) => {
        const raw = parsed.sources[index];
        const match = this.sourceBinding(userId, raw, parsed.format === "camt053");
        if (match) source.matchedAccountId = match.accountId;
      });
    }
    return preview;
  }
  importBalances(userId: number, input: unknown): FinanceImportResult {
    const data = requireObject(input),
      preview = parseImport(data);
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
            bank: source.bank,
            openingDate: first.date,
            openingBalanceCents: first.balanceCents,
          });
      return {
        sourceKey: source.sourceKey,
        source,
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
      const insertedIds = new Set<number>();
      const result = {
        createdAccounts: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        transactionsInserted: 0,
        transactionsRemoved: 0,
      };
      for (const selection of selections) {
        const account =
          selection.accountId !== undefined
            ? this.account(userId, selection.accountId)
            : this.createAccount(userId, selection.newAccount);
        const identity = importKey(userId, [selection.source.account, preview.format === "camt053" ? "" : selection.source.accountName]);
        const sourceBinding = this.sourceBinding(userId, selection.source, preview.format === "camt053");
        const targetBinding = tx.select().from(importSources).where(eq(importSources.accountId, account.id)).get();
        if ((sourceBinding && sourceBinding.accountId !== account.id) || (targetBinding && targetBinding.identity !== identity && targetBinding.accountId !== sourceBinding?.accountId))
          throw new ConflictError("finance.import.mappingConflict");
        tx.insert(importSources).values({ accountId: account.id, userId, identity, numberKey: accountNumberKey(userId, selection.source.account) }).onConflictDoNothing().run();
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
        const selectedDates = new Set(selection.entries.map((entry) => entry.date));
        const occurrences = new Map<string, number>();
        const incomingFingerprints = new Set<string>();
        for (const entry of selection.source.transactions) {
          const base = importKey(userId, [entry.date, entry.delta, entry.balanceCents, entry.name, entry.description, entry.counterparty]);
          const occurrence = occurrences.get(base) ?? 0;
          occurrences.set(base, occurrence + 1);
          if (!selectedDates.has(entry.date)) continue;
          const fingerprint = importKey(userId, [base, occurrence]);
          incomingFingerprints.add(fingerprint);
          const inserted = tx.insert(transactions).values({
            accountId: account.id,
            fingerprint,
            date: entry.date,
            amountCents: entry.delta,
            name: entry.name,
            description: entry.description,
            counterpartyKey: entry.counterparty ? accountNumberKey(userId, entry.counterparty) : null,
          }).onConflictDoNothing().returning({ id: transactions.id }).get();
          if (inserted) {
            result.transactionsInserted++;
            insertedIds.add(inserted.id);
          }
        }
        const prior = tx.select().from(transactions).where(eq(transactions.accountId, account.id)).all();
        for (const entry of prior) {
          if (selectedDates.has(entry.date) && !incomingFingerprints.has(entry.fingerprint)) {
            tx.delete(transactions).where(eq(transactions.id, entry.id)).run();
            result.transactionsRemoved++;
          }
        }

      }
      const inactiveRules = insertedIds.size
        ? tx.select().from(preferences).where(and(eq(preferences.userId, userId), eq(preferences.inactive, true))).all()
        : [];
      if (inactiveRules.length) {
        const sourceKeys = new Set(this.periodTransactions(userId, "1900-01-01", "9999-12-31")
          .filter((entry) => insertedIds.has(entry.id) && entry.amountCents < 0 && !entry.internalTransfer)
          .map(subscriptionSourceKey));
        const groups = new Set(inactiveRules.filter((rule) => sourceKeys.has(rule.sourceKey)).map((rule) => rule.groupKey));
        for (const groupKey of groups) {
          tx.update(preferences).set({ inactive: false }).where(and(eq(preferences.userId, userId), eq(preferences.groupKey, groupKey))).run();
        }
      }
      return result;
    });
  }
}
