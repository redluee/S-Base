import { createHash } from "node:crypto";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import db from "../../db/client";
import {
  financeAccounts as accounts,
  financeGoals as goals,
  financeImportSources as sources,
  financeTransactions as transactions,
  financeSettings as settings,
} from "../../db/schema/finance";
import { FinanceGoalsService } from "./goals";
import { FinanceNotFound } from "./accounts";
import { calendarDate, today } from "./validation";
import { requireId, requireObject, ValidationError } from "../../utils/validation";
import { isSavingsTransfer, savingsTransferAccount } from "./transfer-detection";
import { transferAdjustedHistory, transferBalances } from "./transfer-balances";
import { detectSubscriptions } from "./subscriptions";
import type { FinanceActivity, FinanceData, FinanceSnapshot } from "../../types/finance";

export function importKey(userId: number, value: unknown) {
  return createHash("sha256").update(JSON.stringify([userId, value])).digest("hex");
}

export function accountNumberKey(userId: number, value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  const dutch = /^NL\d{2}[A-Z]{4}(\d{10})$/.exec(normalized);
  return importKey(userId, dutch ? dutch[1] : /^\d{1,10}$/.test(normalized) ? normalized.padStart(10, "0") : normalized);
}

export class FinanceTransactionsService extends FinanceGoalsService {
  private transferEntries(userId: number, start: string, end: string) {
    const bindings = db.select().from(sources).where(eq(sources.userId, userId)).all();
    const ownNumbers = new Set(bindings.map((source) => source.numberKey));
    return db.select({
      id: transactions.id,
      accountId: transactions.accountId,
      date: transactions.date,
      amountCents: transactions.amountCents,
      name: transactions.name,
      description: transactions.description,
      counterpartyKey: transactions.counterpartyKey,
      transferOverride: transactions.transferOverride,
    }).from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(eq(accounts.userId, userId), gte(transactions.date, start), lte(transactions.date, end)))
      .orderBy(desc(transactions.date), desc(transactions.id)).all()
      .map(({ counterpartyKey, transferOverride, ...entry }) => {
        const automaticTransfer = counterpartyKey !== null
          ? ownNumbers.has(counterpartyKey)
          : isSavingsTransfer(entry.description, entry.amountCents);
        const savingsNumber = counterpartyKey === null ? savingsTransferAccount(entry.description, entry.amountCents)?.replace(/[- ]/g, "").toUpperCase() : null;
        const possibleKeys = savingsNumber
          ? [savingsNumber, `${savingsNumber.slice(0, 4)}-${savingsNumber.slice(4)}`].map((number) => accountNumberKey(userId, number))
          : [];
        const counterparties = bindings.filter((source) => source.numberKey === counterpartyKey || possibleKeys.includes(source.numberKey));
        const counterpartyAccountId = counterparties.length === 1 ? counterparties[0].accountId : undefined;
        return {
          ...entry,
          internalTransfer: transferOverride ?? automaticTransfer,
          automaticTransfer,
          counterpartyAccountId,
        };
      });
  }
  private periodTransactions(userId: number, start: string, end: string) {
    return this.transferEntries(userId, start, end).map(({ counterpartyAccountId, ...entry }) => entry);
  }
  protected dashboardObservations(userId: number, data: FinanceData, end: string) {
    const transfers = this.transferEntries(userId, "1900-01-01", end)
      .filter((entry) => entry.internalTransfer && entry.counterpartyAccountId !== undefined)
      .map((entry) => ({ ...entry, counterpartyAccountId: entry.counterpartyAccountId! }));
    return transferBalances(data.accounts, data.observations, transfers);
  }
  protected dashboardHistory(userId: number, history: FinanceSnapshot[], start: string, end: string) {
    const transfers = this.transferEntries(userId, start, end)
      .filter((entry) => entry.internalTransfer && entry.counterpartyAccountId === undefined);
    return transferAdjustedHistory(history, transfers);
  }
  activity(userId: number, start: string, end: string): FinanceActivity {
    const entries = this.periodTransactions(userId, start, end);
    let incomeCents = 0, spendingCents = 0, excludedCount = 0;
    for (const entry of entries) {
      if (entry.internalTransfer) excludedCount++;
      else if (entry.amountCents > 0) incomeCents += entry.amountCents;
      else spendingCents -= entry.amountCents;
    }
    const coverage = db.select({ accountId: transactions.accountId, date: transactions.date })
      .from(transactions).innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(eq(accounts.userId, userId)).orderBy(asc(transactions.date)).all();
    const coverageByAccount = new Map<number, { accountId: number; firstDate: string; lastDate: string; }>();
    for (const entry of coverage) {
      const previous = coverageByAccount.get(entry.accountId);
      coverageByAccount.set(entry.accountId, { accountId: entry.accountId, firstDate: previous?.firstDate ?? entry.date, lastDate: entry.date });
    }
    return { incomeCents, spendingCents, netCents: incomeCents - spendingCents, transactionCount: entries.length, excludedCount, coverage: [...coverageByAccount.values()] };
  }
  transactionList(userId: number, input: Record<string, unknown>) {
    const start = calendarDate(input.start ?? "1900-01-01"), end = calendarDate(input.end ?? today());
    const page = Number(input.page ?? 1);
    if (start > end || !Number.isInteger(page) || page < 1 || page > 100000) throw new ValidationError("finance.transactions.invalidFilter");
    const entries = this.periodTransactions(userId, start, end);
    return { entries: entries.slice((page - 1) * 50, page * 50), total: entries.length, page, pageSize: 50 };
  }
  subscriptions(userId: number) {
    const end = today();
    return detectSubscriptions(this.periodTransactions(userId, "1900-01-01", end), end);
  }
  setTransfer(userId: number, id: number, input: unknown) {
    const { internalTransfer } = requireObject(input);
    if (typeof internalTransfer !== "boolean" && internalTransfer !== null) throw new ValidationError("finance.transactions.invalidFilter");
    const entry = db.select({ id: transactions.id }).from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(eq(accounts.userId, userId), eq(transactions.id, requireId(id)))).get();
    if (!entry) throw new FinanceNotFound("Transaction not found");
    db.update(transactions).set({ transferOverride: internalTransfer }).where(eq(transactions.id, id)).run();
    return { success: true };
  }
  resetFinance(userId: number, input: unknown) {
    if (requireObject(input).confirmation !== "DELETE_FINANCE") throw new ValidationError("finance.settings.confirmRequired");
    return db.transaction((tx) => {
      tx.delete(settings).where(eq(settings.userId, userId)).run();
      tx.delete(goals).where(eq(goals.userId, userId)).run();
      tx.delete(accounts).where(eq(accounts.userId, userId)).run();
      return { success: true };
    });
  }
}
