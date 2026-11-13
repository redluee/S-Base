export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const OPEN_INVOICE_STATUSES: readonly InvoiceStatus[] = ["sent", "overdue"];

export const INVOICE_LINE_TYPES = ["hours", "service", "travel_costs", "discount"] as const;
export type InvoiceLineType = (typeof INVOICE_LINE_TYPES)[number];
export const DISCOUNT_TYPES = ["percentage", "amount"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DEFAULT_EXPENSE_CATEGORY = "Overig";

export interface PricedLine {
  type: InvoiceLineType;
  quantity?: number | null;
  unitPrice?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
}

export function effectiveQuantity(line: PricedLine): number {
  return line.type === "discount" || !line.quantity ? 1 : line.quantity;
}

export function effectiveUnitPrice(line: PricedLine): number {
  return line.type === "discount" ? 0 : (line.unitPrice ?? 0);
}

export function lineTotals<T extends PricedLine>(lines: T[]): number[] {
  const subtotal = lines
    .filter((l) => l.type !== "discount")
    .reduce((sum, l) => sum + effectiveQuantity(l) * effectiveUnitPrice(l), 0);
  return lines.map((l) => {
    if (l.type !== "discount") return effectiveQuantity(l) * effectiveUnitPrice(l);
    const value = l.discountValue ?? 0;
    return 0 - (l.discountType === "percentage" ? (subtotal * value) / 100 : Math.abs(value));
  });
}

export function computeInvoiceStatus(
  status: InvoiceStatus,
  paymentDueDate: number | null,
  dateCreated: number | null,
  now: number,
): InvoiceStatus {
  if (status === "paid" || status === "draft") return status;
  if (paymentDueDate && paymentDueDate < now) return "overdue";
  if (dateCreated) return "sent";
  return status;
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return `factuur-${invoiceNumber}.pdf`;
}
