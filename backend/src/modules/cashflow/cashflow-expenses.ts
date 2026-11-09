import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { cashflowExpenses, cashflowTradeNames } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { trimOrNull, yearRange } from "./cashflow-helpers";
import type { ExpenseInput, ExpenseListQuery } from "./cashflow-types";

const effectiveDate = sql<number>`COALESCE(${cashflowExpenses.date}, CAST(strftime('%s', ${cashflowExpenses.createdAt}) AS INTEGER) * 1000)`;

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
  list(userId: number, options?: ExpenseListQuery) {
    const conditions: SQL[] = [eq(cashflowExpenses.userId, userId)];
    if (options?.category) conditions.push(eq(cashflowExpenses.category, options.category));
    if (options?.tradeNameId) conditions.push(eq(cashflowExpenses.tradeNameId, options.tradeNameId));
    if (options?.year) {
      const { start, end } = yearRange(options.year);
      conditions.push(and(gte(effectiveDate, start), lte(effectiveDate, end)) as SQL);
    }

    return db
      .select(expenseColumns)
      .from(cashflowExpenses)
      .leftJoin(cashflowTradeNames, eq(cashflowExpenses.tradeNameId, cashflowTradeNames.id))
      .where(and(...conditions))
      .orderBy(desc(effectiveDate), desc(cashflowExpenses.createdAt))
      .all();
  }

  getById(id: number) {
    const row = db
      .select(expenseColumns)
      .from(cashflowExpenses)
      .leftJoin(cashflowTradeNames, eq(cashflowExpenses.tradeNameId, cashflowTradeNames.id))
      .where(eq(cashflowExpenses.id, id))
      .get();
    if (!row) throw new NotFoundError("cashflow.expenseNotFound");
    return row;
  }

  private findRow(id: number) {
    const row = db.select().from(cashflowExpenses).where(eq(cashflowExpenses.id, id)).get();
    if (!row) throw new NotFoundError("cashflow.expenseNotFound");
    return row;
  }

  create(userId: number, data: ExpenseInput) {
    const description = data.description?.trim();
    if (!description) throw new ValidationError("cashflow.expenseDescriptionRequired");
    if (data.amount === undefined || data.amount === null || Number.isNaN(Number(data.amount))) {
      throw new ValidationError("cashflow.expenseAmountRequired");
    }

    const inserted = db
      .insert(cashflowExpenses)
      .values({
        userId,
        description,
        category: data.category?.trim() || "Overig",
        amount: Number(data.amount),
        date: data.date ? Number(data.date) : Date.now(),
        tradeNameId: data.tradeNameId ? Number(data.tradeNameId) : null,
        receiptPdfPath: trimOrNull(data.receiptPdfPath),
        receiptPdfName: trimOrNull(data.receiptPdfName),
        notes: trimOrNull(data.notes),
      })
      .returning()
      .get();

    return this.getById(inserted.id);
  }

  update(id: number, data: ExpenseInput) {
    const existing = this.findRow(id);

    db.update(cashflowExpenses)
      .set({
        description: data.description !== undefined ? data.description.trim() : existing.description,
        category: data.category !== undefined ? data.category?.trim() || "Overig" : existing.category,
        amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
        date: data.date !== undefined ? (data.date ? Number(data.date) : null) : existing.date,
        tradeNameId:
          data.tradeNameId !== undefined ? (data.tradeNameId ? Number(data.tradeNameId) : null) : existing.tradeNameId,
        receiptPdfPath: data.receiptPdfPath !== undefined ? trimOrNull(data.receiptPdfPath) : existing.receiptPdfPath,
        receiptPdfName: data.receiptPdfName !== undefined ? trimOrNull(data.receiptPdfName) : existing.receiptPdfName,
        notes: data.notes !== undefined ? trimOrNull(data.notes) : existing.notes,
      })
      .where(eq(cashflowExpenses.id, id))
      .run();

    return this.getById(id);
  }

  remove(id: number) {
    this.findRow(id);
    db.delete(cashflowExpenses).where(eq(cashflowExpenses.id, id)).run();
    return { deleted: true };
  }
}
