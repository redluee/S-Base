import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { IGNORED_SEARCH_CHARACTERS } from "../shared/search";

export function sqlNormalize(column: AnyColumn): SQL {
  return IGNORED_SEARCH_CHARACTERS.reduce<SQL>(
    (expr, char) => sql`replace(${expr}, ${char}, '')`,
    sql`lower(${column})`,
  );
}
