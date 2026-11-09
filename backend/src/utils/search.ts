import { type AnyColumn, sql } from "drizzle-orm";

export function normalizeSearchString(q: string): string {
  return q.replace(/[\s\-/]/g, "").toLowerCase();
}

export function sqlNormalize(column: AnyColumn) {
  return sql`replace(replace(${column}, ' ', ''), '-', '')`;
}
