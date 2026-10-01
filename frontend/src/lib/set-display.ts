import { formatNumberNl } from "./number-input";

export function formatHistoryWeight(
  weight: number | null | undefined,
  category: "resistance" | "bodyweight" | "cardio" | "isometric",
  assisted: boolean
): string {
  if (weight === null || weight === undefined) return "—";
  if (category === "bodyweight") {
    if (weight === 0) return "BW";
    if (assisted || weight < 0) return formatNumberNl(Math.abs(weight));
    return `+${formatNumberNl(weight)}`;
  }
  return formatNumberNl(weight);
}
