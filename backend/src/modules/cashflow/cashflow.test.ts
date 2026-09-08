import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { CashflowService } from "./index";

describe("CashflowService", () => {
  let cashflow: CashflowService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    cashflow = new CashflowService();
  });

  it("manages trade names CRUD", () => {
    expect(() => cashflow.createTradeName(adminId, { displayName: "" })).toThrow("Display name is required");

    const tradeName = cashflow.createTradeName(adminId, {
      displayName: "Acme Corp",
      address: "Main Street 1",
      iban: "NL99BANK0123456789",
    });
    expect(tradeName.id).toBeDefined();
    expect(tradeName.displayName).toBe("Acme Corp");

    const list = cashflow.listTradeNames(adminId);
    expect(list.some((t) => t.id === tradeName.id)).toBe(true);

    const fetched = cashflow.getTradeNameById(tradeName.id);
    expect(fetched?.displayName).toBe("Acme Corp");

    const updated = cashflow.updateTradeName(tradeName.id, { displayName: "Acme Group" });
    expect(updated?.displayName).toBe("Acme Group");

    const res = cashflow.removeTradeName(tradeName.id);
    expect(res?.deleted).toBe(true);
    expect(cashflow.getTradeNameById(tradeName.id)).toBeFalsy();
  });

  it("manages clients CRUD", () => {
    expect(() => cashflow.createClient(adminId, { name: "" })).toThrow("Client name is required");

    const client = cashflow.createClient(adminId, {
      name: "Global Tech",
      email: "contact@globaltech.com",
      standardRate: 85,
      contractPdfPath: "/api/uploads/contract-123.pdf",
      contractPdfName: "Contract_2026.pdf",
    });
    expect(client.id).toBeDefined();
    expect(client.name).toBe("Global Tech");
    expect(client.contractPdfPath).toBe("/api/uploads/contract-123.pdf");
    expect(client.contractPdfName).toBe("Contract_2026.pdf");

    const fetched = cashflow.getClientById(client.id);
    expect(fetched?.email).toBe("contact@globaltech.com");
    expect(fetched?.contractPdfPath).toBe("/api/uploads/contract-123.pdf");
    expect(fetched?.contractPdfName).toBe("Contract_2026.pdf");

    const updated = cashflow.updateClient(client.id, {
      name: "Global Tech BV",
      standardRate: 90,
      contractPdfPath: "/api/uploads/contract-456.pdf",
      contractPdfName: "Updated_Contract.pdf",
    });
    expect(updated?.name).toBe("Global Tech BV");
    expect(updated?.standardRate).toBe(90);
    expect(updated?.contractPdfPath).toBe("/api/uploads/contract-456.pdf");
    expect(updated?.contractPdfName).toBe("Updated_Contract.pdf");

    const list = cashflow.listClients(adminId);
    expect(list.some((c) => c.id === client.id)).toBe(true);

    const removeRes = cashflow.removeClient(client.id);
    expect(removeRes?.deleted).toBe(true);
  });

  it("manages projects CRUD", () => {
    const client = cashflow.createClient(adminId, { name: "Project Client" });
    const project = cashflow.createProject(adminId, {
      clientId: client.id,
      name: "Website Redesign",
      location: "Amsterdam",
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Website Redesign");

    const fetched = cashflow.getProjectById(project.id);
    expect(fetched?.name).toBe("Website Redesign");
    expect(fetched?.clientName).toBe("Project Client");

    const updated = cashflow.updateProject(project.id, { name: "Website & App Redesign" });
    expect(updated?.name).toBe("Website & App Redesign");

    const list = cashflow.listProjects(adminId, client.id);
    expect(list.length).toBeGreaterThan(0);

    const removeRes = cashflow.removeProject(project.id, false);
    expect(removeRes?.deleted).toBe(true);
  });

  it("generates sequential invoice numbers", () => {
    const year = 2026;
    const inv1 = cashflow.generateInvoiceNumber(adminId, year);
    expect(inv1).toBe("2026-001");
  });

  it("manages invoices and invoice lines with status calculations", () => {
    const client = cashflow.createClient(adminId, { name: "Invoice Client" });
    const invNum = cashflow.generateInvoiceNumber(adminId, 2026);

    const lineDate = new Date("2026-03-15").getTime();
    const invoice = cashflow.createInvoice(adminId, {
      clientId: client.id,
      invoiceNumber: invNum,
      isKor: true,
      lines: [
        { taskDescription: "Development", date: lineDate, quantity: 10, unitPrice: 80, totalCost: 800, type: "hours" },
      ],
    });

    expect(invoice).not.toBeNull();
    expect(invoice?.invoiceNumber).toBe(invNum);
    expect(invoice?.total).toBe(800);
    expect(invoice?.lines.length).toBe(1);
    expect(invoice?.lines[0].date).toBe(lineDate);

    // Prevent duplicate invoice numbers
    expect(() =>
      cashflow.createInvoice(adminId, {
        clientId: client.id,
        invoiceNumber: invNum,
        isKor: true,
        lines: [],
      })
    ).toThrow("Factuurnummer is al in gebruik");

    // Mark as paid
    const paidInv = cashflow.markAsPaid(invoice!.id);
    expect(paidInv?.status).toBe("paid");
    expect(paidInv?.datePaid).toBeGreaterThan(0);

    // Update invoice with new line date
    const newLineDate = new Date("2026-03-20").getTime();
    const updated = cashflow.updateInvoice(invoice!.id, {
      name: "Q3 Development Invoice",
      lines: [
        { taskDescription: "Development Part 2", date: newLineDate, quantity: 5, unitPrice: 80, totalCost: 400, type: "hours" },
      ],
    });
    expect(updated?.name).toBe("Q3 Development Invoice");
    expect(updated?.lines[0].date).toBe(newLineDate);
    expect(updated?.lines[0].taskDescription).toBe("Development Part 2");

    // Dashboard stats
    const stats = cashflow.getDashboardStats(adminId, 2026);
    expect(stats).toBeDefined();
    expect(stats.statusTotals).toBeDefined();

    // Delete invoice
    const delRes = cashflow.removeInvoice(invoice!.id);
    expect(delRes?.deleted).toBe(true);
  });

  it("lists invoices ordered by creation date (createdAt) descending including drafts", () => {
    const client = cashflow.createClient(adminId, { name: "Sorting Client" });
    const inv1 = cashflow.createInvoice(adminId, {
      clientId: client.id,
      invoiceNumber: "2026-010",
      dateCreated: new Date("2026-01-01").getTime(),
      lines: [{ taskDescription: "Task 1", quantity: 1, unitPrice: 100, totalCost: 100 }],
    });

    const inv2Draft = cashflow.createInvoice(adminId, {
      clientId: client.id,
      invoiceNumber: "2026-011",
      dateCreated: null,
      lines: [{ taskDescription: "Draft Task", quantity: 1, unitPrice: 100, totalCost: 100 }],
    });

    const invoices = cashflow.listInvoices(adminId);
    expect(invoices.length).toBe(2);
    expect(invoices[0].id).toBe(inv2Draft!.id);
    expect(invoices[1].id).toBe(inv1!.id);
  });

  it("keeps draft status when dateCreated is filled and calculates expected income in dashboard stats", () => {
    const client = cashflow.createClient(adminId, { name: "Draft Expected Client" });
    const draftDate = new Date("2026-10-15").getTime();
    const pastDueDate = new Date("2026-09-01").getTime();

    const draftInv = cashflow.createInvoice(adminId, {
      clientId: client.id,
      invoiceNumber: "2026-099",
      status: "draft",
      dateCreated: draftDate,
      paymentDueDate: pastDueDate,
      lines: [{ taskDescription: "Future Project", quantity: 1, unitPrice: 1500, totalCost: 1500 }],
    });

    expect(draftInv?.status).toBe("draft");

    const fetched = cashflow.getInvoiceById(draftInv!.id);
    expect(fetched?.status).toBe("draft");

    const listed = cashflow.listInvoices(adminId, "draft");
    const found = listed.find((i) => i.id === draftInv!.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe("draft");

    const stats = cashflow.getDashboardStats(adminId, 2026);
    const octMonth = stats.monthlyIncome.find((m) => m.month === "2026-10");
    expect(octMonth).toBeDefined();
    expect(octMonth?.paid).toBe(0);
    expect(octMonth?.draft).toBe(1500);
    expect(octMonth?.expected).toBe(1500);
    expect(stats.totalExpected12m).toBeGreaterThanOrEqual(1500);
  });

  it("manages company expenses CRUD and integrates with dashboard stats", () => {
    const tradeName = cashflow.createTradeName(adminId, { displayName: "Design Studio" });

    expect(() => cashflow.createExpense(adminId, { description: "", amount: 100 })).toThrow("Omschrijving van de uitgave is verplicht");
    expect(() => cashflow.createExpense(adminId, { description: "Server", amount: NaN })).toThrow("Bedrag is verplicht");

    const expDate = new Date("2026-05-10").getTime();
    const exp1 = cashflow.createExpense(adminId, {
      description: "Cloud Server Hosting",
      category: "Software & Abonnementen",
      amount: 85.50,
      date: expDate,
      tradeNameId: tradeName.id,
      receiptPdfPath: "/api/uploads/receipt-1.pdf",
      receiptPdfName: "invoice_server_may.pdf",
      notes: "Monthly VPS cost",
    });

    expect(exp1?.id).toBeDefined();
    expect(exp1?.description).toBe("Cloud Server Hosting");
    expect(exp1?.amount).toBe(85.50);
    expect(exp1?.tradeNameDisplay).toBe("Design Studio");
    expect(exp1?.receiptPdfPath).toBe("/api/uploads/receipt-1.pdf");

    const fetched = cashflow.getExpenseById(exp1!.id);
    expect(fetched?.description).toBe("Cloud Server Hosting");

    const updated = cashflow.updateExpense(exp1!.id, {
      amount: 95.00,
      description: "Cloud Server Hosting (Upgraded)",
    });
    expect(updated?.amount).toBe(95.00);
    expect(updated?.description).toBe("Cloud Server Hosting (Upgraded)");

    const list = cashflow.listExpenses(adminId, { year: 2026 });
    expect(list.some((e) => e.id === exp1!.id)).toBe(true);

    const filteredCategory = cashflow.listExpenses(adminId, { category: "Software & Abonnementen" });
    expect(filteredCategory.some((e) => e.id === exp1!.id)).toBe(true);

    const stats = cashflow.getDashboardStats(adminId, 2026);
    expect(stats.totalExpenses12m).toBeGreaterThanOrEqual(95);
    const mayExp = stats.monthlyExpenses.find((m) => m.month === "2026-05");
    expect(mayExp?.total).toBe(95);

    const deleted = cashflow.removeExpense(exp1!.id);
    expect(deleted?.deleted).toBe(true);
    expect(cashflow.getExpenseById(exp1!.id)).toBeFalsy();
  });
});
