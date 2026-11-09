export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return typeof value === "string" && (INVOICE_STATUSES as readonly string[]).includes(value);
}

export const trimOrNull = (value: string | null | undefined) => value?.trim() || null;

export function yearRange(year: number) {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
  };
}

export function computeInvoiceStatus(
  status: string,
  paymentDueDate: number | null,
  dateCreated: number | null,
  now: number,
): string {
  if (status === "paid" || status === "draft") return status;
  if (paymentDueDate && paymentDueDate < now) return "overdue";
  if (dateCreated) return "sent";
  return status;
}
