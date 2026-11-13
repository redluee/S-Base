import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import db from "../db/client";
import { normalizeSearchString, sqlNormalize } from "./search";

const probe = sqliteTable("search_probe", { value: text("value") });

describe("search normalisation", () => {
  it("normalises stored values in SQL exactly like the query in JS", () => {
    db.run(sql`CREATE TABLE IF NOT EXISTS search_probe (value TEXT)`);
    for (const value of ["Kip/Rijst", "Pasta-Bolognese", " Hello World "]) {
      db.run(sql`DELETE FROM search_probe`);
      db.insert(probe).values({ value }).run();
      const stored = db
        .select({ normalized: sqlNormalize(probe.value) })
        .from(probe)
        .get();
      expect(stored?.normalized).toBe(normalizeSearchString(value));
    }
    db.run(sql`DROP TABLE search_probe`);
  });
});
