import { eq } from "drizzle-orm";
import db from "../../db/client";
import { cashflowTradeNames } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { trimOrNull } from "./cashflow-helpers";
import type { TradeNameInput } from "./cashflow-types";

export class CashflowTradeNames {
  list(userId: number) {
    return db.select().from(cashflowTradeNames).where(eq(cashflowTradeNames.userId, userId)).all();
  }

  getById(id: number) {
    const row = db.select().from(cashflowTradeNames).where(eq(cashflowTradeNames.id, id)).get();
    if (!row) throw new NotFoundError("cashflow.tradeNameNotFound");
    return row;
  }

  create(userId: number, data: TradeNameInput) {
    const displayName = data.displayName?.trim();
    if (!displayName) throw new ValidationError("cashflow.displayNameRequired");
    return db.insert(cashflowTradeNames).values({
      userId,
      displayName,
      address: trimOrNull(data.address),
      iban: trimOrNull(data.iban),
      kvkNumber: trimOrNull(data.kvkNumber),
      vatNumber: trimOrNull(data.vatNumber),
    }).returning().get();
  }

  update(id: number, data: TradeNameInput) {
    const existing = this.getById(id);
    return db.update(cashflowTradeNames).set({
      displayName: data.displayName?.trim() ?? existing.displayName,
      address: data.address !== undefined ? trimOrNull(data.address) : existing.address,
      iban: data.iban !== undefined ? trimOrNull(data.iban) : existing.iban,
      kvkNumber: data.kvkNumber !== undefined ? trimOrNull(data.kvkNumber) : existing.kvkNumber,
      vatNumber: data.vatNumber !== undefined ? trimOrNull(data.vatNumber) : existing.vatNumber,
    }).where(eq(cashflowTradeNames.id, id)).returning().get();
  }

  remove(id: number) {
    this.getById(id);
    db.delete(cashflowTradeNames).where(eq(cashflowTradeNames.id, id)).run();
    return { deleted: true };
  }
}
