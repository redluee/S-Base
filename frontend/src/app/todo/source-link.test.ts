import { describe, expect, it } from "bun:test";
import { sourceHref } from "./source-link";

describe("sourceHref", () => {
  it("points to the invoice and sprint pages", () => {
    expect(sourceHref({ module: "cashflow", id: 12 })).toBe("/cashflow/invoices/12");
    expect(sourceHref({ module: "minor", id: 3 })).toBe("/minor/sprints/3");
  });

  it("returns null for an invalid id", () => {
    expect(sourceHref({ module: "cashflow", id: 0 })).toBeNull();
  });
});
