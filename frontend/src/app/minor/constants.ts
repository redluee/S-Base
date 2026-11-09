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

export function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (
    clean.startsWith("/api/uploads/") ||
    clean.startsWith("/uploads/") ||
    clean.startsWith("data:image/") ||
    clean.startsWith("blob:")
  ) {
    return true;
  }
  const pathWithoutQuery = clean.split(/[?#]/)[0];
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(pathWithoutQuery);
}

export function getDomainFromUrl(rawUrl: string): string {
  try {
    const hasProtocol = rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
    const parsed = new URL(hasProtocol ? rawUrl : `https://${rawUrl}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

