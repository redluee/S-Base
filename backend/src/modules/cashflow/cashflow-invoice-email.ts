import { sendMail } from "../../lib/mailer";
import { ValidationError } from "../../utils/errors";
import type { CashflowInvoices } from "./cashflow-invoices";
import type { InvoiceEmailInput } from "./cashflow-types";

export class CashflowInvoiceEmail {
  constructor(private readonly invoices: CashflowInvoices) {}

  async send(id: number, data: InvoiceEmailInput) {
    const existing = this.invoices.findRow(id);

    const to = data.to?.trim();
    if (!to) throw new ValidationError("cashflow.emailRecipientRequired");
    const subject = data.subject?.trim();
    if (!subject) throw new ValidationError("cashflow.emailSubjectRequired");
    if (!data.message?.trim()) throw new ValidationError("cashflow.emailMessageRequired");
    if (!data.pdfBase64) throw new ValidationError("cashflow.emailAttachmentMissing");

    try {
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
    } catch (error) {
      console.error(JSON.stringify({ level: "error", code: "CASHFLOW_EMAIL", message: error instanceof Error ? error.message : String(error) }));
      throw new ValidationError("cashflow.emailSendFailed");
    }

    return { sent: true };
  }
}
