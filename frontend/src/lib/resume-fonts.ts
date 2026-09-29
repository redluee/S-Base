import { api } from "./api";
import { GOOGLE_PREFIX, resolveCuratedFont, type ResolvedFont } from "./resume";

const cache = new Map<string, Promise<ResolvedFont | null>>();

export function resolveResumeFont(value: string): Promise<ResolvedFont | null> {
  const curated = resolveCuratedFont(value);
  if (curated) return Promise.resolve(curated);
  if (!value.startsWith(GOOGLE_PREFIX)) return Promise.resolve(null);
  let pending = cache.get(value);
  if (!pending) {
    const family = value.slice(GOOGLE_PREFIX.length);
    pending = api.resume.fonts
      .google(family)
      .then((f) => ({
        value,
        family: `resume-google-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        regular: f.regularUrl,
        bold: f.boldUrl,
      }))
      .catch(() => {
        cache.delete(value);
        return null;
      });
    cache.set(value, pending);
  }
  return pending;
}
