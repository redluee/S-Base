import { lineTotals, type DiscountType, type InvoiceLineType as LineType } from "@backend/shared/cashflow";
import type { InvoiceLineInput } from "@backend/types/cashflow";

export type { DiscountType, LineType };

export interface InvoiceLine {
  localId: string;
  date: string;
  taskDescription: string;
  quantity: number | "";
  unitPrice: number | "";
  totalCost: number;
  type: LineType;
  discountType: DiscountType;
  discountValue: number | "";
}

export function toTs(dateStr: string): number | null {
  if (!dateStr) return null;
  return new Date(dateStr).getTime();
}

export function toDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}


const numberOrNull = (value: number | "") => (value === "" ? null : Number(value));

export function toLineInput(line: InvoiceLine): InvoiceLineInput {
  const isDiscount = line.type === "discount";
  return {
    taskDescription: line.taskDescription,
    date: toTs(line.date),
    type: line.type,
    quantity: isDiscount ? null : numberOrNull(line.quantity),
    unitPrice: isDiscount ? null : numberOrNull(line.unitPrice),
    discountType: isDiscount ? line.discountType : null,
    discountValue: isDiscount ? numberOrNull(line.discountValue) : null,
  };
}

export function recalculateLines(lines: InvoiceLine[]): InvoiceLine[] {
  const totals = lineTotals(lines.map(toLineInput));
  return lines.map((line, i) => ({ ...line, totalCost: totals[i] }));
}
