import { eq, and, desc, sql, like, ne } from "drizzle-orm";
import db from "../../db/client";
import { cashflowTradeNames, cashflowClients, cashflowProjects, cashflowInvoices, cashflowInvoiceLines } from "../../db/schema";
import { sendMail } from "../../lib/mailer";
import { INVOICE_STATUSES } from "./cashflow-helpers";
import { CashflowRecordService } from "./cashflow-records";

export class CashflowInvoiceService extends CashflowRecordService {
  generateInvoiceNumber(userId: number, year: number): string {
    const yearStr = String(year);
    const latest = db.select({ invoiceNumber: cashflowInvoices.invoiceNumber })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(
        eq(cashflowClients.userId, userId),
        like(cashflowInvoices.invoiceNumber, `${yearStr}-%`),
      ))
      .orderBy(desc(cashflowInvoices.invoiceNumber))
      .limit(1)
      .get();

    if (!latest) return `${yearStr}-001`;
    const parts = latest.invoiceNumber.split("-");
    const num = parseInt(parts[1], 10) + 1;
    return `${yearStr}-${String(num).padStart(3, "0")}`;
  }

  listInvoices(userId: number, status?: string, projectId?: number, clientId?: number) {
    const conditions: any[] = [eq(cashflowClients.userId, userId)];
    if (status && INVOICE_STATUSES.includes(status as any)) conditions.push(eq(cashflowInvoices.status, status as any));
    if (projectId) conditions.push(eq(cashflowInvoices.projectId, projectId));
    if (clientId) conditions.push(eq(cashflowInvoices.clientId, clientId));

    const rows = db.select({
      id: cashflowInvoices.id,
      invoiceNumber: cashflowInvoices.invoiceNumber,
      name: cashflowInvoices.name,
      status: cashflowInvoices.status,
      dateCreated: cashflowInvoices.dateCreated,
      dateService: cashflowInvoices.dateService,
      paymentDueDate: cashflowInvoices.paymentDueDate,
      datePaid: cashflowInvoices.datePaid,
      isKor: cashflowInvoices.isKor,
      projectId: cashflowInvoices.projectId,
      projectName: cashflowProjects.name,
      clientId: cashflowClients.id,
      clientName: cashflowClients.name,
      tradeNameDisplay: cashflowTradeNames.displayName,
      createdAt: cashflowInvoices.createdAt,
      total: sql<number>`(SELECT COALESCE(SUM(total_cost), 0) FROM cashflow_invoice_lines WHERE invoice_id = ${cashflowInvoices.id})`,
    })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(cashflowTradeNames, eq(sql`COALESCE(${cashflowInvoices.tradeNameId}, ${cashflowProjects.tradeNameId})`, cashflowTradeNames.id))
      .where(and(...conditions))
      .orderBy(desc(cashflowInvoices.createdAt), desc(cashflowInvoices.id))
      .all();

    const now = Date.now();
    return rows.map((inv) => {
      let computedStatus = inv.status;
      if (inv.status !== "paid" && inv.status !== "draft") {
        if (inv.paymentDueDate && inv.paymentDueDate < now) {
          computedStatus = "overdue";
        } else if (inv.dateCreated) {
          computedStatus = "sent";
        }
      }
      return { ...inv, status: computedStatus };
    });
  }

  getInvoiceById(id: number) {
    const row = db.select({
      id: cashflowInvoices.id,
      invoiceNumber: cashflowInvoices.invoiceNumber,
      name: cashflowInvoices.name,
      status: cashflowInvoices.status,
      dateCreated: cashflowInvoices.dateCreated,
      dateService: cashflowInvoices.dateService,
      paymentDueDate: cashflowInvoices.paymentDueDate,
      datePaid: cashflowInvoices.datePaid,
      isKor: cashflowInvoices.isKor,
      createdAt: cashflowInvoices.createdAt,
      projectId: cashflowInvoices.projectId,
      projectName: cashflowProjects.name,
      projectLocation: cashflowProjects.location,
      clientId: cashflowClients.id,
      clientName: cashflowClients.name,
      clientAddress: cashflowClients.address,
      clientEmail: cashflowClients.email,
      clientKvk: cashflowClients.kvkNumber,
      tradeNameId: cashflowTradeNames.id,
      tradeNameDisplay: cashflowTradeNames.displayName,
      tradeNameAddress: cashflowTradeNames.address,
      tradeNameIban: cashflowTradeNames.iban,
      tradeNameKvk: cashflowTradeNames.kvkNumber,
      tradeNameVat: cashflowTradeNames.vatNumber,
    })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(cashflowTradeNames, eq(sql`COALESCE(${cashflowInvoices.tradeNameId}, ${cashflowProjects.tradeNameId})`, cashflowTradeNames.id))
      .where(eq(cashflowInvoices.id, id))
      .get();

    if (!row) return null;

    let computedStatus = row.status;
    const now = Date.now();
    if (row.status !== "paid" && row.status !== "draft") {
      if (row.paymentDueDate && row.paymentDueDate < now) {
        computedStatus = "overdue";
      } else if (row.dateCreated) {
        computedStatus = "sent";
      }
    }

    const lines = db.select().from(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, id)).all();
    const total = lines.reduce((sum, l) => sum + l.totalCost, 0);
    return { ...row, status: computedStatus, lines, total };
  }

  createInvoice(userId: number, data: {
    clientId?: number;
    projectId?: number | null;
    tradeNameId?: number | null;
    invoiceNumber: string;
    name?: string | null;
    dateCreated?: number | null;
    dateService?: number | null;
    paymentDueDate?: number | null;
    datePaid?: number | null;
    status?: string;
    isKor: boolean;
    lines: {
      taskDescription: string;
      date?: number | null;
      quantity?: number;
      unitPrice?: number;
      totalCost: number;
      type?: string;
      discountType?: string | null;
      discountValue?: number | null;
    }[];
  }) {
    const invNum = data.invoiceNumber?.trim();
    if (!invNum) throw new Error("Invoice number is required");

    const existingInv = db.select({ id: cashflowInvoices.id })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(
        eq(cashflowClients.userId, userId),
        sql`LOWER(${cashflowInvoices.invoiceNumber}) = LOWER(${invNum})`
      ))
      .get();

    if (existingInv) {
      throw new Error("Factuurnummer is al in gebruik");
    }

    let finalClientId = data.clientId;
    let finalTradeNameId = data.tradeNameId;

    if (data.projectId) {
      const proj = this.getProjectById(data.projectId);
      if (proj) {
        if (!finalClientId) finalClientId = proj.clientId;
        if (!finalTradeNameId) finalTradeNameId = proj.tradeNameId ?? null;
      }
    }

    if (!finalClientId) throw new Error("Client is required");

    const status = (data.status as any) ?? "draft";
    const datePaid = data.datePaid !== undefined ? data.datePaid : (status === "paid" ? Date.now() : null);

    const invoice = db.insert(cashflowInvoices).values({
      clientId: finalClientId,
      projectId: data.projectId ?? null,
      tradeNameId: finalTradeNameId ?? null,
      invoiceNumber: invNum,
      name: data.name?.trim() || null,
      dateCreated: data.dateCreated ?? null,
      dateService: data.dateService ?? null,
      paymentDueDate: data.paymentDueDate ?? null,
      datePaid,
      status,
      isKor: data.isKor,
    }).returning().get();

    for (const line of data.lines ?? []) {
      db.insert(cashflowInvoiceLines).values({
        invoiceId: invoice.id,
        date: line.date ?? null,
        taskDescription: line.taskDescription,
        quantity: Number(line.quantity ?? 1),
        unitPrice: Number(line.unitPrice ?? 0),
        totalCost: Number(line.totalCost),
        type: line.type ?? "hours",
        discountType: line.discountType ?? null,
        discountValue: line.discountValue !== undefined && line.discountValue !== null ? Number(line.discountValue) : null,
      }).run();
    }

    return this.getInvoiceById(invoice.id);
  }

  updateInvoice(id: number, data: {
    clientId?: number;
    projectId?: number | null;
    tradeNameId?: number | null;
    invoiceNumber?: string;
    name?: string | null;
    dateCreated?: number | null;
    dateService?: number | null;
    paymentDueDate?: number | null;
    datePaid?: number | null;
    status?: string;
    isKor?: boolean;
    lines?: {
      taskDescription: string;
      date?: number | null;
      quantity?: number;
      unitPrice?: number;
      totalCost: number;
      type?: string;
      discountType?: string | null;
      discountValue?: number | null;
    }[];
  }) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;
    if (data.status && !INVOICE_STATUSES.includes(data.status as any)) throw new Error("Invalid status");

    if (data.invoiceNumber !== undefined) {
      const invNum = data.invoiceNumber.trim();
      if (!invNum) throw new Error("Invoice number is required");

      const client = db.select({ userId: cashflowClients.userId })
        .from(cashflowClients)
        .where(eq(cashflowClients.id, existing.clientId))
        .get();

      if (client) {
        const duplicateInv = db.select({ id: cashflowInvoices.id })
          .from(cashflowInvoices)
          .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
          .where(and(
            eq(cashflowClients.userId, client.userId),
            sql`LOWER(${cashflowInvoices.invoiceNumber}) = LOWER(${invNum})`,
            ne(cashflowInvoices.id, id)
          ))
          .get();

        if (duplicateInv) {
          throw new Error("Factuurnummer is al in gebruik");
        }
      }
    }

    const nextStatus = (data.status as any) ?? existing.status;
    let nextDatePaid = data.datePaid;
    if (nextDatePaid === undefined) {
      if (nextStatus === "paid" && existing.status !== "paid") {
        nextDatePaid = Date.now();
      } else if (nextStatus !== "paid" && existing.status === "paid") {
        nextDatePaid = null;
      } else {
        nextDatePaid = existing.datePaid;
      }
    }

    let finalClientId = data.clientId ?? existing.clientId;
    let finalProjectId = data.projectId !== undefined ? data.projectId : existing.projectId;
    let finalTradeNameId = data.tradeNameId !== undefined ? data.tradeNameId : existing.tradeNameId;

    if (finalProjectId && !finalClientId) {
      const proj = this.getProjectById(finalProjectId);
      if (proj) finalClientId = proj.clientId;
    }

    db.update(cashflowInvoices).set({
      clientId: finalClientId,
      projectId: finalProjectId,
      tradeNameId: finalTradeNameId,
      invoiceNumber: data.invoiceNumber?.trim() ?? existing.invoiceNumber,
      name: data.name !== undefined ? (data.name?.trim() || null) : existing.name,
      dateCreated: data.dateCreated !== undefined ? data.dateCreated : existing.dateCreated,
      dateService: data.dateService !== undefined ? data.dateService : existing.dateService,
      paymentDueDate: data.paymentDueDate !== undefined ? data.paymentDueDate : existing.paymentDueDate,
      datePaid: nextDatePaid,
      status: nextStatus,
      isKor: data.isKor !== undefined ? data.isKor : existing.isKor,
    }).where(eq(cashflowInvoices.id, id)).run();

    if (data.lines) {
      db.delete(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, id)).run();
      for (const line of data.lines) {
        db.insert(cashflowInvoiceLines).values({
          invoiceId: id,
          date: line.date ?? null,
          taskDescription: line.taskDescription,
          quantity: Number(line.quantity ?? 1),
          unitPrice: Number(line.unitPrice ?? 0),
          totalCost: Number(line.totalCost),
          type: line.type ?? "hours",
          discountType: line.discountType ?? null,
          discountValue: line.discountValue !== undefined && line.discountValue !== null ? Number(line.discountValue) : null,
        }).run();
      }
    }

    return this.getInvoiceById(id);
  }

  markAsPaid(id: number, datePaid?: number | null) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;
    const finalDatePaid = datePaid !== undefined ? datePaid : (existing.datePaid ?? Date.now());
    db.update(cashflowInvoices).set({ status: "paid", datePaid: finalDatePaid }).where(eq(cashflowInvoices.id, id)).run();
    return this.getInvoiceById(id);
  }

  removeInvoice(id: number) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;
    db.delete(cashflowInvoices).where(eq(cashflowInvoices.id, id)).run();
    return { deleted: true };
  }

  async sendInvoiceEmail(id: number, data: { to: string; subject: string; message: string; pdfBase64: string }) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;

    const to = data.to?.trim();
    if (!to) throw new Error("E-mailadres is verplicht");
    const subject = data.subject?.trim();
    if (!subject) throw new Error("Onderwerp is verplicht");
    if (!data.message?.trim()) throw new Error("Bericht is verplicht");
    if (!data.pdfBase64) throw new Error("PDF-bijlage ontbreekt");

    await sendMail({
      to,
      subject,
      text: data.message,
      attachments: [
        {
          filename: `factuur-${existing.invoiceNumber}.pdf`,
          content: Buffer.from(data.pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });

    return { sent: true };
  }
}
