export type LineType = "hours" | "service" | "travel_costs" | "discount";
export type DiscountType = "percentage" | "amount";

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

export function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function recalculateLines(rawLines: InvoiceLine[]): InvoiceLine[] {
  const nonDiscountSubtotal = rawLines
    .filter(l => l.type !== "discount")
    .reduce((sum, l) => {
      const q = l.quantity === "" || l.quantity === 0 || l.quantity === undefined ? 1 : Number(l.quantity);
      const p = l.unitPrice === "" || l.unitPrice === undefined ? 0 : Number(l.unitPrice);
      return sum + (q * p);
    }, 0);

  return rawLines.map(l => {
    if (l.type === "discount") {
      let cost = 0;
      const val = Number(l.discountValue) || 0;
      if (l.discountType === "percentage") {
        cost = -1 * (nonDiscountSubtotal * (val / 100));
      } else {
        cost = -1 * Math.abs(val);
      }
      return { ...l, totalCost: cost };
    } else {
      const q = l.quantity === "" || l.quantity === 0 || l.quantity === undefined ? 1 : Number(l.quantity);
      const p = l.unitPrice === "" || l.unitPrice === undefined ? 0 : Number(l.unitPrice);
      return { ...l, totalCost: q * p };
    }
  });
}
