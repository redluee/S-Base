import { sendMail } from "../../lib/mailer";
import { invoicePdfFilename } from "../../shared/cashflow";
import { AppError, ValidationError } from "../../utils/errors";
import type { CashflowInvoices } from "./cashflow-invoices";
import type { InvoiceEmailInput } from "./cashflow-types";

export class CashflowInvoiceEmail {
  constructor(private readonly invoices: CashflowInvoices) {}

  async send(userId: number, id: number, data: InvoiceEmailInput) {
    const invoice = this.invoices.requireOwned(userId, id);
    const to = data.to.trim();
    const subject = data.subject.trim();
    if (!to) throw new ValidationError("cashflow.emailRecipientRequired");
    if (!subject) throw new ValidationError("cashflow.emailSubjectRequired");
    if (!data.message.trim()) throw new ValidationError("cashflow.emailMessageRequired");
    if (!data.pdfBase64) throw new ValidationError("cashflow.emailAttachmentMissing");

    try {
      await sendMail({
        to,
        subject,
        text: data.message,
        attachments: [
          {
            filename: invoicePdfFilename(invoice.invoiceNumber),
            content: Buffer.from(data.pdfBase64, "base64"),
            contentType: "application/pdf",
          },
        ],
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error(JSON.stringify({ level: "error", code: "CASHFLOW_EMAIL", message: String(error) }));
      throw new AppError(502, "cashflow.emailSendFailed");
    }
    return { sent: true };
  }
}
