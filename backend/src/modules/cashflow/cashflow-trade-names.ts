import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { cashflowTradeNames } from "../../db/schema";
import { orNotFound, ValidationError } from "../../utils/errors";
import { patchText, trimOrNull } from "./cashflow-helpers";
import type { TradeNameInput } from "./cashflow-types";

export class CashflowTradeNames {
  list(userId: number) {
    return db.select().from(cashflowTradeNames).where(eq(cashflowTradeNames.userId, userId)).all();
  }

  getById(userId: number, id: number) {
    return orNotFound(
      db
        .select()
        .from(cashflowTradeNames)
        .where(and(eq(cashflowTradeNames.id, id), eq(cashflowTradeNames.userId, userId)))
        .get(),
      "cashflow.tradeNameNotFound",
    );
  }

  ownedIdOrNull(userId: number, id: number | null | undefined): number | null {
    return id ? this.getById(userId, id).id : null;
  }

  create(userId: number, data: TradeNameInput) {
    const displayName = data.displayName?.trim();
    if (!displayName) throw new ValidationError("cashflow.displayNameRequired");
    return db
      .insert(cashflowTradeNames)
      .values({
        userId,
        displayName,
        address: trimOrNull(data.address),
        iban: trimOrNull(data.iban),
        kvkNumber: trimOrNull(data.kvkNumber),
        vatNumber: trimOrNull(data.vatNumber),
      })
      .returning()
      .get();
  }

  update(userId: number, id: number, data: TradeNameInput) {
    const existing = this.getById(userId, id);
    return db
      .update(cashflowTradeNames)
      .set({
        displayName: data.displayName?.trim() || existing.displayName,
        address: patchText(data.address, existing.address),
        iban: patchText(data.iban, existing.iban),
        kvkNumber: patchText(data.kvkNumber, existing.kvkNumber),
        vatNumber: patchText(data.vatNumber, existing.vatNumber),
      })
      .where(eq(cashflowTradeNames.id, id))
      .returning()
      .get();
  }

  remove(userId: number, id: number) {
    this.getById(userId, id);
    db.delete(cashflowTradeNames).where(eq(cashflowTradeNames.id, id)).run();
    return { deleted: true };
  }
}
