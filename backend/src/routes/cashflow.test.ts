import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { app } from "../index";
import db from "../db/client";
import { cashflowClients, cashflowExpenses } from "../db/schema";
import { setupTestDb } from "../test-utils";

async function login() {
  const res = await app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" }),
    }),
  );
  const match = (res.headers.get("set-cookie") ?? "").match(/session_id=([^;]+)/);
  return `session_id=${match?.[1] ?? ""}`;
}

function call(cookie: string, method: string, path: string, body?: unknown) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

describe("cashflow routes error contract", () => {
  let cookie: string;

  beforeEach(async () => {
    await setupTestDb();
    cookie = await login();
  });

  afterEach(() => {
    db.delete(cashflowClients).run();
    db.delete(cashflowExpenses).run();
  });

  it("maps NotFoundError to 404 with an i18n key", async () => {
    const cases: [string, string, string, unknown?][] = [
      ["GET", "/api/cashflow/clients/999999", "cashflow.clientNotFound"],
      ["PUT", "/api/cashflow/clients/999999", "cashflow.clientNotFound", { name: "X" }],
      ["DELETE", "/api/cashflow/clients/999999", "cashflow.clientNotFound"],
      ["PUT", "/api/cashflow/trade-names/999999", "cashflow.tradeNameNotFound", { displayName: "X" }],
      ["DELETE", "/api/cashflow/trade-names/999999", "cashflow.tradeNameNotFound"],
      ["GET", "/api/cashflow/projects/999999", "cashflow.projectNotFound"],
      ["DELETE", "/api/cashflow/projects/999999", "cashflow.projectNotFound"],
      ["GET", "/api/cashflow/invoices/999999", "cashflow.invoiceNotFound"],
      ["PUT", "/api/cashflow/invoices/999999", "cashflow.invoiceNotFound", { name: "X" }],
      ["PATCH", "/api/cashflow/invoices/999999/paid", "cashflow.invoiceNotFound"],
      ["DELETE", "/api/cashflow/invoices/999999", "cashflow.invoiceNotFound"],
      ["GET", "/api/cashflow/expenses/999999", "cashflow.expenseNotFound"],
      ["DELETE", "/api/cashflow/expenses/999999", "cashflow.expenseNotFound"],
    ];
    for (const [method, path, key, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, res.status]).toEqual([method, path, 404]);
      expect(await res.json()).toEqual({ error: key });
    }
  });

  it("maps ValidationError and ConflictError to 400 and 409 with i18n keys", async () => {
    const blank = await call(cookie, "POST", "/api/cashflow/clients", { name: "  " });
    expect(blank.status).toBe(400);
    expect(await blank.json()).toEqual({ error: "cashflow.clientNameRequired" });

    const client = await (await call(cookie, "POST", "/api/cashflow/clients", { name: "Route Client", email: null, standardRate: null })).json();
    const invoice = { clientId: client.id, projectId: null, invoiceNumber: "2026-901", status: "draft", isKor: true, lines: [{ taskDescription: "Work", totalCost: 10 }] };
    const created = await call(cookie, "POST", "/api/cashflow/invoices", invoice);
    expect(created.status).toBe(200);

    const duplicate = await call(cookie, "POST", "/api/cashflow/invoices", invoice);
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({ error: "cashflow.invoiceNumberInUse" });

    const id = (await created.json()).id;
    const badStatus = await call(cookie, "PUT", `/api/cashflow/invoices/${id}`, { status: "bogus" });
    expect(badStatus.status).toBe(400);
    expect(await badStatus.json()).toEqual({ error: "cashflow.invalidStatus" });

    const email = await call(cookie, "POST", `/api/cashflow/invoices/${id}/send-email`, { to: "", subject: "S", message: "M", pdfBase64: "AA" });
    expect(email.status).toBe(400);
    expect(await email.json()).toEqual({ error: "cashflow.emailRecipientRequired" });

    const expense = await call(cookie, "POST", "/api/cashflow/expenses", { description: " ", amount: 1 });
    expect(expense.status).toBe(400);
    expect(await expense.json()).toEqual({ error: "cashflow.expenseDescriptionRequired" });
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const cases: [string, string, unknown?][] = [
      ["POST", "/api/cashflow/clients", { name: 5 }],
      ["POST", "/api/cashflow/trade-names", {}],
      ["POST", "/api/cashflow/projects", { name: "P" }],
      ["POST", "/api/cashflow/expenses", { description: "X", amount: "lots" }],
      ["POST", "/api/cashflow/invoices", { invoiceNumber: "1", lines: [{ totalCost: 1 }] }],
      ["GET", "/api/cashflow/clients/abc"],
      ["GET", "/api/cashflow/dashboard?year=abc"],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, res.status]).toEqual([method, path, 400]);
      expect(await res.json()).toEqual({ error: "common.invalidRequest" });
    }
  });

  it("accepts the payloads the frontend sends, including nulls and a body-less paid patch", async () => {
    const client = await (await call(cookie, "POST", "/api/cashflow/clients", {
      name: "Payload Client", address: null, email: null, kvkNumber: null, standardRate: 80, contractPdfPath: null, contractPdfName: null,
    })).json();
    const project = await call(cookie, "POST", "/api/cashflow/projects", { clientId: client.id, tradeNameId: null, name: "P", description: null, location: null });
    expect(project.status).toBe(200);

    const created = await call(cookie, "POST", "/api/cashflow/invoices", {
      clientId: client.id, projectId: null, tradeNameId: null, invoiceNumber: "2026-902", name: null,
      dateCreated: null, dateService: null, paymentDueDate: null, datePaid: null, status: "draft", isKor: false,
      lines: [{ taskDescription: "D", date: null, quantity: 1, unitPrice: 0, totalCost: -5, type: "discount", discountType: "amount", discountValue: 5 }],
    });
    expect(created.status).toBe(200);
    const id = (await created.json()).id;

    const paid = await app.handle(new Request(`http://localhost/api/cashflow/invoices/${id}/paid`, {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    }));
    expect(paid.status).toBe(200);
    expect((await paid.json()).status).toBe("paid");

    const expense = await call(cookie, "POST", "/api/cashflow/expenses", {
      description: "E", amount: 12.5, category: "Overig", date: Date.now(), tradeNameId: null, receiptPdfPath: null, receiptPdfName: null, notes: null,
    });
    expect(expense.status).toBe(200);
    expect((await call(cookie, "GET", `/api/cashflow/projects?clientId=${client.id}`)).status).toBe(200);
    expect((await call(cookie, "GET", "/api/cashflow/dashboard?year=2026")).status).toBe(200);
  });
});
