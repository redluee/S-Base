import { type AnyColumn, type SQL, sql } from "drizzle-orm";

const IGNORED_CHARACTERS = [" ", "-", "/"];

export function normalizeSearchString(q: string): string {
  return IGNORED_CHARACTERS.reduce((text, char) => text.replaceAll(char, ""), q).toLowerCase();
}

export function sqlNormalize(column: AnyColumn): SQL {
  return IGNORED_CHARACTERS.reduce<SQL>((expr, char) => sql`replace(${expr}, ${char}, '')`, sql`lower(${column})`);
}
