export const MINOR_LU_DESCRIPTIONS: Record<number, string> = {
  1: "Impact",
  2: "Realisatie",
  3: "Ethiek & regelgeving",
  4: "Tools & technieken",
  5: "Zelfstandig werken",
};

export const MINOR_LU_LIST = [1, 2, 3, 4, 5] as const;

export function getLULabel(lu: number): string {
  const desc = MINOR_LU_DESCRIPTIONS[lu];
  return desc ? `LU ${lu} · ${desc}` : `LU ${lu}`;
}

export function getLUShortDesc(lu: number): string {
  return MINOR_LU_DESCRIPTIONS[lu] || "";
}
