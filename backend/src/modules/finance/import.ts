import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import {
  financeAccounts as accounts,
  financeObservations as observations,
  financeImportSources as importSources,
  financeTransactions as transactions,
} from "../../db/schema/finance";
import {
  ConflictError,
  ValidationError,
  requireId,
  requireObject,
} from "../../utils/validation";
import { FinanceTransactionsService, importKey, accountNumberKey } from "./transactions";
import { parseIngCsv, parseIngFile } from "./ing-csv";
import { accountInput, calendarDate, cents } from "./validation";
import type { FinanceImportResult } from "../../types/finance";

export class FinanceImportService extends FinanceTransactionsService {
  previewImport(input: unknown, userId?: number) {
    const data = requireObject(input);
    const preview = parseIngCsv(data.csv, data.order, data.anchors);
    if (userId !== undefined) {
      const parsed = parseIngFile(data.csv, data.order, data.anchors);
      const known = db.select().from(importSources).where(eq(importSources.userId, userId)).all();
      preview.sources.forEach((source, index) => {
        const raw = parsed.sources[index];
        const match = known.find((entry) => entry.identity === importKey(userId, [raw.account, raw.accountName]));
        if (match) source.matchedAccountId = match.accountId;
      });
    }
    return preview;
  }
  importBalances(userId: number, input: unknown): FinanceImportResult {
    const data = requireObject(input),
      preview = parseIngFile(data.csv, data.order, data.anchors);
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
        const identity = importKey(userId, [selection.source.account, selection.source.accountName]);
        const sourceBinding = tx.select().from(importSources).where(and(eq(importSources.userId, userId), eq(importSources.identity, identity))).get();
        const targetBinding = tx.select().from(importSources).where(eq(importSources.accountId, account.id)).get();
        if ((sourceBinding && sourceBinding.accountId !== account.id) || (targetBinding && targetBinding.identity !== identity))
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
          if (inserted) result.transactionsInserted++;
        }
        const prior = tx.select().from(transactions).where(eq(transactions.accountId, account.id)).all();
        for (const entry of prior) {
          if (selectedDates.has(entry.date) && !incomingFingerprints.has(entry.fingerprint)) {
            tx.delete(transactions).where(eq(transactions.id, entry.id)).run();
            result.transactionsRemoved++;
          }
        }

      }
      return result;
    });
  }
}
