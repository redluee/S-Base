import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients } from "../../db/schema";
import { orNotFound, ValidationError } from "../../utils/errors";
import { patch, patchText, trimOrNull } from "./cashflow-helpers";
import type { ClientInput } from "./cashflow-types";

export class CashflowClients {
  list(userId: number) {
    return db.select().from(cashflowClients).where(eq(cashflowClients.userId, userId)).all();
  }

  getById(userId: number, id: number) {
    return orNotFound(
      db
        .select()
        .from(cashflowClients)
        .where(and(eq(cashflowClients.id, id), eq(cashflowClients.userId, userId)))
        .get(),
      "cashflow.clientNotFound",
    );
  }

  create(userId: number, data: ClientInput) {
    const name = data.name?.trim();
    if (!name) throw new ValidationError("cashflow.clientNameRequired");
    return db
      .insert(cashflowClients)
      .values({
        userId,
        name,
        address: trimOrNull(data.address),
        email: trimOrNull(data.email),
        kvkNumber: trimOrNull(data.kvkNumber),
        standardRate: data.standardRate ?? null,
        contractPdfPath: trimOrNull(data.contractPdfPath),
        contractPdfName: trimOrNull(data.contractPdfName),
      })
      .returning()
      .get();
  }

  update(userId: number, id: number, data: ClientInput) {
    const existing = this.getById(userId, id);
    return db
      .update(cashflowClients)
      .set({
        name: data.name?.trim() || existing.name,
        address: patchText(data.address, existing.address),
        email: patchText(data.email, existing.email),
        kvkNumber: patchText(data.kvkNumber, existing.kvkNumber),
        standardRate: patch(data.standardRate, existing.standardRate),
        contractPdfPath: patchText(data.contractPdfPath, existing.contractPdfPath),
        contractPdfName: patchText(data.contractPdfName, existing.contractPdfName),
      })
      .where(eq(cashflowClients.id, id))
      .returning()
      .get();
  }

  remove(userId: number, id: number) {
    this.getById(userId, id);
    db.delete(cashflowClients).where(eq(cashflowClients.id, id)).run();
    return { deleted: true };
  }
}
