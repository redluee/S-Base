import { sql } from "drizzle-orm";

export function normalizeSearchString(q: string): string {
  return q.replace(/[\s\-\/]/g, "").toLowerCase();
}

export function sqlNormalize(column: any) {
  return sql`replace(replace(${column}, ' ', ''), '-', '')`;
}
