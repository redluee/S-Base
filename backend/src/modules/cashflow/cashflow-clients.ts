import { eq } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { trimOrNull } from "./cashflow-helpers";
import type { ClientInput } from "./cashflow-types";

export class CashflowClients {
  list(userId: number) {
    return db.select().from(cashflowClients).where(eq(cashflowClients.userId, userId)).all();
  }

  getById(id: number) {
    const row = db.select().from(cashflowClients).where(eq(cashflowClients.id, id)).get();
    if (!row) throw new NotFoundError("cashflow.clientNotFound");
    return row;
  }

  create(userId: number, data: ClientInput) {
    const name = data.name?.trim();
    if (!name) throw new ValidationError("cashflow.clientNameRequired");
    return db.insert(cashflowClients).values({
      userId,
      name,
      address: trimOrNull(data.address),
      email: trimOrNull(data.email),
      kvkNumber: trimOrNull(data.kvkNumber),
      standardRate: data.standardRate ?? null,
      contractPdfPath: trimOrNull(data.contractPdfPath),
      contractPdfName: trimOrNull(data.contractPdfName),
    }).returning().get();
  }

  update(id: number, data: ClientInput) {
    const existing = this.getById(id);
    return db.update(cashflowClients).set({
      name: data.name?.trim() ?? existing.name,
      address: data.address !== undefined ? trimOrNull(data.address) : existing.address,
      email: data.email !== undefined ? trimOrNull(data.email) : existing.email,
      kvkNumber: data.kvkNumber !== undefined ? trimOrNull(data.kvkNumber) : existing.kvkNumber,
      standardRate: data.standardRate !== undefined ? data.standardRate : existing.standardRate,
      contractPdfPath: data.contractPdfPath !== undefined ? trimOrNull(data.contractPdfPath) : existing.contractPdfPath,
      contractPdfName: data.contractPdfName !== undefined ? trimOrNull(data.contractPdfName) : existing.contractPdfName,
    }).where(eq(cashflowClients.id, id)).returning().get();
  }

  remove(id: number) {
    this.getById(id);
    db.delete(cashflowClients).where(eq(cashflowClients.id, id)).run();
    return { deleted: true };
  }
}
