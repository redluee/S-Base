import { expect, it } from "bun:test";
import { Database } from "bun:sqlite";

it("adds an invoice type while preserving existing invoices and product lines", async () => {
  const sqlite = new Database(":memory:");
  try {
    sqlite.exec("CREATE TABLE cashflow_invoices (id INTEGER PRIMARY KEY, invoice_number TEXT, status TEXT); CREATE TABLE cashflow_invoice_lines (id INTEGER PRIMARY KEY, invoice_id INTEGER, type TEXT, total_cost REAL); INSERT INTO cashflow_invoices VALUES (1, 'SAMPLE-001', 'paid'); INSERT INTO cashflow_invoice_lines VALUES (1, 1, 'service', 125);");
    const lines = sqlite.query("SELECT * FROM cashflow_invoice_lines").all();
    sqlite.exec(await Bun.file(new URL("../../../migrations/0050_cashflow_hardware_prepayment.sql", import.meta.url)).text());
    expect(sqlite.query("SELECT * FROM cashflow_invoices").all()).toEqual([
      { id: 1, invoice_number: "SAMPLE-001", status: "paid", invoice_type: "standard" },
    ]);
    expect(sqlite.query("SELECT * FROM cashflow_invoice_lines").all()).toEqual(lines);
    sqlite.exec("UPDATE cashflow_invoices SET invoice_type = 'hardware_prepayment' WHERE id = 1");
    expect(sqlite.query("SELECT invoice_type FROM cashflow_invoices").get()).toEqual({ invoice_type: "hardware_prepayment" });
  } finally {
    sqlite.close();
  }
});
