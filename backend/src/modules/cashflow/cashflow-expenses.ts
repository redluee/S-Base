import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { cashflowExpenses, cashflowTradeNames } from "../../db/schema";
import { DEFAULT_EXPENSE_CATEGORY } from "../../shared/cashflow";
import { orNotFound, ValidationError } from "../../utils/errors";
import { patch, patchText, trimOrNull, yearRange } from "./cashflow-helpers";
import type { CashflowTradeNames } from "./cashflow-trade-names";
import type { ExpenseInput, ExpenseListQuery } from "./cashflow-types";

export const expenseDate = sql<number>`COALESCE(${cashflowExpenses.date}, CAST(strftime('%s', ${cashflowExpenses.createdAt}) AS INTEGER) * 1000)`;

const expenseColumns = {
  id: cashflowExpenses.id,
  userId: cashflowExpenses.userId,
  description: cashflowExpenses.description,
  category: cashflowExpenses.category,
  amount: cashflowExpenses.amount,
  date: cashflowExpenses.date,
  tradeNameId: cashflowExpenses.tradeNameId,
  tradeNameDisplay: cashflowTradeNames.displayName,
  receiptPdfPath: cashflowExpenses.receiptPdfPath,
  receiptPdfName: cashflowExpenses.receiptPdfName,
  notes: cashflowExpenses.notes,
  createdAt: cashflowExpenses.createdAt,
};

export class CashflowExpenses {
  constructor(private readonly tradeNames: CashflowTradeNames) {}

  list(userId: number, options?: ExpenseListQuery) {
    const conditions: SQL[] = [eq(cashflowExpenses.userId, userId)];
    if (options?.category) conditions.push(eq(cashflowExpenses.category, options.category));
    if (options?.tradeNameId) conditions.push(eq(cashflowExpenses.tradeNameId, options.tradeNameId));
    if (options?.year) {
      const { start, end } = yearRange(options.year);
      conditions.push(and(gte(expenseDate, start), lte(expenseDate, end)) as SQL);
    }

    return db
      .select(expenseColumns)
      .from(cashflowExpenses)
      .leftJoin(cashflowTradeNames, eq(cashflowExpenses.tradeNameId, cashflowTradeNames.id))
      .where(and(...conditions))
      .orderBy(desc(expenseDate), desc(cashflowExpenses.createdAt))
      .all();
  }

  getById(userId: number, id: number) {
    return orNotFound(
      db
        .select(expenseColumns)
        .from(cashflowExpenses)
        .leftJoin(cashflowTradeNames, eq(cashflowExpenses.tradeNameId, cashflowTradeNames.id))
        .where(and(eq(cashflowExpenses.id, id), eq(cashflowExpenses.userId, userId)))
        .get(),
      "cashflow.expenseNotFound",
    );
  }

  create(userId: number, data: ExpenseInput) {
    const description = data.description?.trim();
    if (!description) throw new ValidationError("cashflow.expenseDescriptionRequired");
    if (data.amount === undefined) throw new ValidationError("cashflow.expenseAmountRequired");

    const inserted = db
      .insert(cashflowExpenses)
      .values({
        userId,
        description,
        category: data.category?.trim() || DEFAULT_EXPENSE_CATEGORY,
        amount: data.amount,
        date: data.date || Date.now(),
        tradeNameId: this.tradeNames.ownedIdOrNull(userId, data.tradeNameId),
        receiptPdfPath: trimOrNull(data.receiptPdfPath),
        receiptPdfName: trimOrNull(data.receiptPdfName),
        notes: trimOrNull(data.notes),
      })
      .returning()
      .get();
    return this.getById(userId, inserted.id);
  }

  update(userId: number, id: number, data: ExpenseInput) {
    const existing = this.getById(userId, id);
    db.update(cashflowExpenses)
      .set({
        description: data.description?.trim() || existing.description,
        category: data.category === undefined ? existing.category : data.category?.trim() || DEFAULT_EXPENSE_CATEGORY,
        amount: patch(data.amount, existing.amount),
        date: data.date === undefined ? existing.date : data.date || null,
        tradeNameId: patch(
          data.tradeNameId === undefined ? undefined : this.tradeNames.ownedIdOrNull(userId, data.tradeNameId),
          existing.tradeNameId,
        ),
        receiptPdfPath: patchText(data.receiptPdfPath, existing.receiptPdfPath),
        receiptPdfName: patchText(data.receiptPdfName, existing.receiptPdfName),
        notes: patchText(data.notes, existing.notes),
      })
      .where(eq(cashflowExpenses.id, id))
      .run();
    return this.getById(userId, id);
  }

  remove(userId: number, id: number) {
    this.getById(userId, id);
    db.delete(cashflowExpenses).where(eq(cashflowExpenses.id, id)).run();
    return { deleted: true };
  }
}
