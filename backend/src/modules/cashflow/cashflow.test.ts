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
    });
    expect(client.id).toBeDefined();
    expect(client.name).toBe("Global Tech");

    const fetched = cashflow.getClientById(client.id);
    expect(fetched?.email).toBe("contact@globaltech.com");

    const updated = cashflow.updateClient(client.id, { name: "Global Tech BV", standardRate: 90 });
    expect(updated?.name).toBe("Global Tech BV");
    expect(updated?.standardRate).toBe(90);

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
});
