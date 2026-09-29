import { join } from "path";
import { mkdir } from "fs/promises";
import type { ResumeGoogleFont } from "../../types/shared";

export const CURATED_FONTS = [
  "carlito",
  "inter",
  "lato",
  "merriweather",
  "playfair-display",
  "source-serif",
  "oatmeal",
  "epilogue",
];

const GOOGLE_PREFIX = "google:";
const FAMILY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ]{1,58}$/;
const FONTS_DIR = join(import.meta.dir, "../../../uploads/fonts");

export function isValidFontValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (CURATED_FONTS.includes(value)) return true;
  return value.startsWith(GOOGLE_PREFIX) && FAMILY_PATTERN.test(value.slice(GOOGLE_PREFIX.length));
}

export function googleFamilyOf(value: string): string | null {
  return value.startsWith(GOOGLE_PREFIX) ? value.slice(GOOGLE_PREFIX.length) : null;
}

function slugify(family: string) {
  return family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fileUrl(name: string) {
  return `/api/resume/fonts/file/${name}`;
}

export function resolveFontFile(name: string) {
  if (!/^[a-z0-9-]+-(400|700)\.ttf$/.test(name)) return null;
  return join(FONTS_DIR, name);
}

function parseFaces(css: string) {
  const faces: Array<{ weight: number; url: string }> = [];
  for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const url = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+?)\)/)?.[1];
    if (weight && url && /\.ttf(\?|$)/.test(url)) faces.push({ weight: Number(weight), url });
  }
  return faces;
}

export async function ensureGoogleFont(family: string): Promise<ResumeGoogleFont> {
  if (!FAMILY_PATTERN.test(family)) throw new Error("Invalid font family");
  const slug = slugify(family);
  const regularName = `${slug}-400.ttf`;
  const boldName = `${slug}-700.ttf`;
  const regularPath = join(FONTS_DIR, regularName);
  const boldPath = join(FONTS_DIR, boldName);

  if ((await Bun.file(regularPath).exists()) && (await Bun.file(boldPath).exists())) {
    return { family, regularUrl: fileUrl(regularName), boldUrl: fileUrl(boldName) };
  }

  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700`;
  const res = await fetch(cssUrl, { headers: { "User-Agent": "curl/8.0" } });
  if (!res.ok) throw new Error("Font not found");
  const faces = parseFaces(await res.text());
  const regular = faces.find((f) => f.weight === 400);
  const bold = faces.find((f) => f.weight === 700) ?? regular;
  if (!regular || !bold) throw new Error("Font not available as TTF");

  await mkdir(FONTS_DIR, { recursive: true });
  for (const [face, path] of [[regular, regularPath], [bold, boldPath]] as const) {
    const fontRes = await fetch(face.url);
    if (!fontRes.ok) throw new Error("Font download failed");
    await Bun.write(path, await fontRes.arrayBuffer());
  }
  return { family, regularUrl: fileUrl(regularName), boldUrl: fileUrl(boldName) };
}
