import type {
  MinorDefaultQualityCriterion,
} from "../../types/shared";

export const DEFAULT_STORY_TYPES: Array<{
  code: string;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  defaultQualityCriteria: MinorDefaultQualityCriterion[];
}> = [
  {
    code: "US",
    name: "User Story",
    description: "Standaard functionele user story",
    color: "#10b981",
    isDefault: true,
    defaultQualityCriteria: [
      { text: "Definition of Done gehaald", indent: 0 },
      { text: "Getest volgens acceptatiecriteria", indent: 0 },
      { text: "Code en documentatie gedocumenteerd met bewijslast", indent: 0 },
    ],
  },
  {
    code: "RS",
    name: "Research Story",
    description: "Onderzoek en analyse story",
    color: "#f97316",
    isDefault: true,
    defaultQualityCriteria: [
      { text: "Onderzoeksvraag en methodiek helder gedefinieerd", indent: 0 },
      { text: "Resultaten en conclusies onderbouwd met bronnen", indent: 0 },
      { text: "Aanbevelingen of vervolgstappen geformuleerd", indent: 0 },
    ],
  },
  {
    code: "LS",
    name: "Learning Story",
    description: "Persoonlijk leertraject story",
    color: "#a855f7",
    isDefault: true,
    defaultQualityCriteria: [
      { text: "Leerdoelen en leeractiviteiten geëxpliceerd", indent: 0 },
      { text: "Reflectie op opgedane kennis en vaardigheden", indent: 0 },
      { text: "Bewijsstukken gekoppeld aan leeruitkomsten", indent: 0 },
    ],
  },
];

export function parseDefaultQualityCriteria(raw: string | null | undefined): MinorDefaultQualityCriterion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return { text: item.trim(), indent: 0 };
          if (item && typeof item === "object") {
            return {
              text: String(item.text || "").trim(),
              indent: item.indent ? 1 : 0,
            };
          }
          return null;
        })
        .filter((item): item is MinorDefaultQualityCriterion => Boolean(item && item.text));
    }
  } catch {}
  return [];
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateSprintStatus(
  startDate: string,
  endDate: string,
  today: string = formatDate(new Date()),
  currentStatus?: "planned" | "active" | "completed"
): "planned" | "active" | "completed" {
  if (startDate > today) return "planned";
  if (endDate < today) return "completed";
  if (currentStatus === "completed") return "completed";
  return "active";
}
