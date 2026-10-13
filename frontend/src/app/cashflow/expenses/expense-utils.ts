export const DEFAULT_CATEGORIES = [
  "Software & Abonnementen",
  "Hardware & Apparatuur",
  "Kantoor & Werkplek",
  "Reiskosten",
  "Marketing & Verkoop",
  "Administratie & Verzekeringen",
  "Overig",
];

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDate(timestamp: number | null | undefined) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

