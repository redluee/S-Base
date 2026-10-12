export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function toExternalHref(url: string | null | undefined): string {
  const clean = (url || "").trim();
  if (!clean) return "";
  if (/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(clean)) return clean;
  return `https://${clean}`;
}
