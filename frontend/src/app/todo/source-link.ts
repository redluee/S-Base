import type { TodoLink } from "@backend/types/todo";

export function sourceHref(link: TodoLink): string | null {
  if (!Number.isInteger(link.id) || link.id <= 0) return null;
  if (link.module === "cashflow") return `/cashflow/invoices/${link.id}`;
  if (link.module === "minor") return `/minor/sprints/${link.id}`;
  return null;
}
