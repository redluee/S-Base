import { t } from "@/lib/lang";

export const HARDWARE_PREPAYMENT_MESSAGE = t("Omdat het om een aanzienlijk aankoopbedrag bij externe leveranciers gaat, hanteer ik voor hardwareleveringen een vooruitbetaling. Zodra de betaling binnen is, plaats ik direct de definitieve bestelling zodat de spullen snel binnen zijn.");

export function invoiceTypeLabel(type?: string): string {
  return type === "hardware_prepayment" ? t("Hardware vooruitbetaling") : t("Standaardfactuur");
}
