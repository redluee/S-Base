import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { type AppError, ConflictError, NotFoundError, ValidationError } from "../../utils/errors";
import { CashflowService } from "./index";

function expectError(fn: () => unknown, type: new (...args: never[]) => AppError, key: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(type);
    expect((error as AppError).key).toBe(key);
    return;
  }
  throw new Error("expected function to throw");
}

describe("CashflowService", () => {
  let cashflow: CashflowService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    cashflow = new CashflowService();
  });

  it("manages trade names CRUD", () => {
    expectError(
      () => cashflow.tradeNames.create(adminId, { displayName: "" }),
      ValidationError,
      "cashflow.displayNameRequired",
    );

    const tradeName = cashflow.tradeNames.create(adminId, {
      displayName: "Acme Corp",
      address: "Main Street 1",
      iban: "NL99BANK0123456789",
    });
    expect(tradeName.id).toBeDefined();
    expect(tradeName.displayName).toBe("Acme Corp");

    const list = cashflow.tradeNames.list(adminId);
    expect(list.some((t) => t.id === tradeName.id)).toBe(true);

    const fetched = cashflow.tradeNames.getById(tradeName.id);
    expect(fetched?.displayName).toBe("Acme Corp");

    const updated = cashflow.tradeNames.update(tradeName.id, { displayName: "Acme Group" });
    expect(updated?.displayName).toBe("Acme Group");

    const res = cashflow.tradeNames.remove(tradeName.id);
    expect(res?.deleted).toBe(true);
    expectError(() => cashflow.tradeNames.getById(tradeName.id), NotFoundError, "cashflow.tradeNameNotFound");
  });

  it("manages clients CRUD", () => {
    expectError(() => cashflow.clients.create(adminId, { name: "" }), ValidationError, "cashflow.clientNameRequired");

    const client = cashflow.clients.create(adminId, {
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

    const fetched = cashflow.clients.getById(client.id);
    expect(fetched?.email).toBe("contact@globaltech.com");
    expect(fetched?.contractPdfPath).toBe("/api/uploads/contract-123.pdf");
    expect(fetched?.contractPdfName).toBe("Contract_2026.pdf");

    const updated = cashflow.clients.update(client.id, {
      name: "Global Tech BV",
      standardRate: 90,
      contractPdfPath: "/api/uploads/contract-456.pdf",
      contractPdfName: "Updated_Contract.pdf",
    });
    expect(updated?.name).toBe("Global Tech BV");
    expect(updated?.standardRate).toBe(90);
    expect(updated?.contractPdfPath).toBe("/api/uploads/contract-456.pdf");
    expect(updated?.contractPdfName).toBe("Updated_Contract.pdf");

    const list = cashflow.clients.list(adminId);
    expect(list.some((c) => c.id === client.id)).toBe(true);

    const removeRes = cashflow.clients.remove(client.id);
    expect(removeRes?.deleted).toBe(true);
  });

  it("manages projects CRUD", () => {
    const client = cashflow.clients.create(adminId, { name: "Project Client" });
    const project = cashflow.projects.create({
      clientId: client.id,
      name: "Website Redesign",
      location: "Amsterdam",
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Website Redesign");

    const fetched = cashflow.projects.getById(project.id);
    expect(fetched?.name).toBe("Website Redesign");
    expect(fetched?.clientName).toBe("Project Client");

    const updated = cashflow.projects.update(project.id, { name: "Website & App Redesign" });
    expect(updated?.name).toBe("Website & App Redesign");

    const list = cashflow.projects.list(adminId, client.id);
    expect(list.length).toBeGreaterThan(0);

    const removeRes = cashflow.projects.remove(project.id, false);
    expect(removeRes?.deleted).toBe(true);
  });

  it("generates sequential invoice numbers", () => {
    const year = 2026;
    const inv1 = cashflow.invoices.generateNumber(adminId, year);
    expect(inv1).toBe("2026-001");
  });

  it("manages invoices and invoice lines with status calculations", () => {
    const client = cashflow.clients.create(adminId, { name: "Invoice Client" });
    const invNum = cashflow.invoices.generateNumber(adminId, 2026);

    const lineDate = new Date("2026-03-15").getTime();
    const invoice = cashflow.invoiceWrites.create(adminId, {
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
    expectError(
      () =>
        cashflow.invoiceWrites.create(adminId, { clientId: client.id, invoiceNumber: invNum, isKor: true, lines: [] }),
      ConflictError,
      "cashflow.invoiceNumberInUse",
    );

    // Mark as paid
    const paidInv = cashflow.invoices.markAsPaid(invoice!.id);
    expect(paidInv?.status).toBe("paid");
    expect(paidInv?.datePaid).toBeGreaterThan(0);

    // Update invoice with new line date
    const newLineDate = new Date("2026-03-20").getTime();
    const updated = cashflow.invoiceWrites.update(invoice!.id, {
      name: "Q3 Development Invoice",
      lines: [
        {
          taskDescription: "Development Part 2",
          date: newLineDate,
          quantity: 5,
          unitPrice: 80,
          totalCost: 400,
          type: "hours",
        },
      ],
    });
    expect(updated?.name).toBe("Q3 Development Invoice");
    expect(updated?.lines[0].date).toBe(newLineDate);
    expect(updated?.lines[0].taskDescription).toBe("Development Part 2");

    // Dashboard stats
    const stats = cashflow.dashboard.getStats(adminId, 2026);
    expect(stats).toBeDefined();
    expect(stats.statusTotals).toBeDefined();

    // Delete invoice
    const delRes = cashflow.invoices.remove(invoice!.id);
    expect(delRes?.deleted).toBe(true);
  });

  it("lists invoices ordered by creation date (createdAt) descending including drafts", () => {
    const client = cashflow.clients.create(adminId, { name: "Sorting Client" });
    const inv1 = cashflow.invoiceWrites.create(adminId, {
      clientId: client.id,
      invoiceNumber: "2026-010",
      dateCreated: new Date("2026-01-01").getTime(),
      lines: [{ taskDescription: "Task 1", quantity: 1, unitPrice: 100, totalCost: 100 }],
    });

    const inv2Draft = cashflow.invoiceWrites.create(adminId, {
      clientId: client.id,
      invoiceNumber: "2026-011",
      dateCreated: null,
      lines: [{ taskDescription: "Draft Task", quantity: 1, unitPrice: 100, totalCost: 100 }],
    });

    const invoices = cashflow.invoices.list(adminId);
    expect(invoices.length).toBe(2);
    expect(invoices[0].id).toBe(inv2Draft!.id);
    expect(invoices[1].id).toBe(inv1!.id);
  });

  it("keeps draft status when dateCreated is filled and calculates expected income in dashboard stats", () => {
    const client = cashflow.clients.create(adminId, { name: "Draft Expected Client" });
    const draftDate = new Date("2026-10-15").getTime();
    const pastDueDate = new Date("2026-09-01").getTime();

    const draftInv = cashflow.invoiceWrites.create(adminId, {
      clientId: client.id,
      invoiceNumber: "2026-099",
      status: "draft",
      dateCreated: draftDate,
      paymentDueDate: pastDueDate,
      lines: [{ taskDescription: "Future Project", quantity: 1, unitPrice: 1500, totalCost: 1500 }],
    });

    expect(draftInv?.status).toBe("draft");

    const fetched = cashflow.invoices.getById(draftInv!.id);
    expect(fetched?.status).toBe("draft");

    const listed = cashflow.invoices.list(adminId, "draft");
    const found = listed.find((i) => i.id === draftInv!.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe("draft");

    const stats = cashflow.dashboard.getStats(adminId, 2026);
    const octMonth = stats.monthlyIncome.find((m) => m.month === "2026-10");
    expect(octMonth).toBeDefined();
    expect(octMonth?.paid).toBe(0);
    expect(octMonth?.draft).toBe(1500);
    expect(octMonth?.expected).toBe(1500);
    expect(stats.totalExpected12m).toBeGreaterThanOrEqual(1500);
  });

  it("manages company expenses CRUD and integrates with dashboard stats", () => {
    const tradeName = cashflow.tradeNames.create(adminId, { displayName: "Design Studio" });

    expectError(
      () => cashflow.expenses.create(adminId, { description: "", amount: 100 }),
      ValidationError,
      "cashflow.expenseDescriptionRequired",
    );
    expectError(
      () => cashflow.expenses.create(adminId, { description: "Server", amount: NaN }),
      ValidationError,
      "cashflow.expenseAmountRequired",
    );

    const expDate = new Date("2026-05-10").getTime();
    const exp1 = cashflow.expenses.create(adminId, {
      description: "Cloud Server Hosting",
      category: "Software & Abonnementen",
      amount: 85.5,
      date: expDate,
      tradeNameId: tradeName.id,
      receiptPdfPath: "/api/uploads/receipt-1.pdf",
      receiptPdfName: "invoice_server_may.pdf",
      notes: "Monthly VPS cost",
    });

    expect(exp1?.id).toBeDefined();
    expect(exp1?.description).toBe("Cloud Server Hosting");
    expect(exp1?.amount).toBe(85.5);
    expect(exp1?.tradeNameDisplay).toBe("Design Studio");
    expect(exp1?.receiptPdfPath).toBe("/api/uploads/receipt-1.pdf");

    const fetched = cashflow.expenses.getById(exp1!.id);
    expect(fetched?.description).toBe("Cloud Server Hosting");

    const updated = cashflow.expenses.update(exp1!.id, {
      amount: 95.0,
      description: "Cloud Server Hosting (Upgraded)",
    });
    expect(updated?.amount).toBe(95.0);
    expect(updated?.description).toBe("Cloud Server Hosting (Upgraded)");

    const list = cashflow.expenses.list(adminId, { year: 2026 });
    expect(list.some((e) => e.id === exp1!.id)).toBe(true);

    const filteredCategory = cashflow.expenses.list(adminId, { category: "Software & Abonnementen" });
    expect(filteredCategory.some((e) => e.id === exp1!.id)).toBe(true);

    const stats = cashflow.dashboard.getStats(adminId, 2026);
    expect(stats.totalExpenses12m).toBeGreaterThanOrEqual(95);
    const mayExp = stats.monthlyExpenses.find((m) => m.month === "2026-05");
    expect(mayExp?.total).toBe(95);

    const deleted = cashflow.expenses.remove(exp1!.id);
    expect(deleted?.deleted).toBe(true);
    expectError(() => cashflow.expenses.getById(exp1!.id), NotFoundError, "cashflow.expenseNotFound");
  });

  it("computes firstRecordYear correctly based on the earliest invoice or expense record", () => {
    const client = cashflow.clients.create(testerId, { name: "Year Test Client" });

    // When there are no invoices or expenses, firstRecordYear falls back to current year
    const initialStats = cashflow.dashboard.getStats(testerId);
    expect(initialStats.firstRecordYear).toBe(new Date().getFullYear());

    // Create an older invoice in 2023
    const oldDate = new Date("2023-04-15").getTime();
    cashflow.invoiceWrites.create(testerId, {
      clientId: client.id,
      invoiceNumber: "2023-001",
      dateCreated: oldDate,
      lines: [{ taskDescription: "Historical Work", quantity: 1, unitPrice: 500, totalCost: 500 }],
    });

    const updatedStats = cashflow.dashboard.getStats(testerId);
    expect(updatedStats.firstRecordYear).toBe(2023);
  });

  it("throws NotFoundError with a key for missing records instead of returning null", () => {
    expectError(
      () => cashflow.tradeNames.update(999999, { displayName: "X" }),
      NotFoundError,
      "cashflow.tradeNameNotFound",
    );
    expectError(() => cashflow.tradeNames.remove(999999), NotFoundError, "cashflow.tradeNameNotFound");
    expectError(() => cashflow.clients.getById(999999), NotFoundError, "cashflow.clientNotFound");
    expectError(() => cashflow.clients.update(999999, { name: "X" }), NotFoundError, "cashflow.clientNotFound");
    expectError(() => cashflow.clients.remove(999999), NotFoundError, "cashflow.clientNotFound");
    expectError(() => cashflow.projects.getById(999999), NotFoundError, "cashflow.projectNotFound");
    expectError(() => cashflow.projects.update(999999, { name: "X" }), NotFoundError, "cashflow.projectNotFound");
    expectError(() => cashflow.projects.remove(999999), NotFoundError, "cashflow.projectNotFound");
    expectError(() => cashflow.invoices.getById(999999), NotFoundError, "cashflow.invoiceNotFound");
    expectError(() => cashflow.invoiceWrites.update(999999, { name: "X" }), NotFoundError, "cashflow.invoiceNotFound");
    expectError(() => cashflow.invoices.markAsPaid(999999), NotFoundError, "cashflow.invoiceNotFound");
    expectError(() => cashflow.invoices.remove(999999), NotFoundError, "cashflow.invoiceNotFound");
    expectError(() => cashflow.expenses.update(999999, { notes: "X" }), NotFoundError, "cashflow.expenseNotFound");
    expectError(() => cashflow.expenses.remove(999999), NotFoundError, "cashflow.expenseNotFound");
  });

  it("validates invoice input with typed errors", () => {
    const client = cashflow.clients.create(adminId, { name: "Validation Client" });
    expectError(
      () => cashflow.invoiceWrites.create(adminId, { invoiceNumber: "  ", clientId: client.id }),
      ValidationError,
      "cashflow.invoiceNumberRequired",
    );
    expectError(
      () => cashflow.invoiceWrites.create(adminId, { invoiceNumber: "2026-500" }),
      ValidationError,
      "cashflow.clientRequired",
    );
    expectError(
      () => cashflow.projects.create({ clientId: client.id, name: " " }),
      ValidationError,
      "cashflow.projectNameRequired",
    );

    const invoice = cashflow.invoiceWrites.create(adminId, { invoiceNumber: "2026-501", clientId: client.id });
    expectError(
      () => cashflow.invoiceWrites.update(invoice.id, { status: "bogus" }),
      ValidationError,
      "cashflow.invalidStatus",
    );
    expectError(
      () => cashflow.invoiceWrites.update(invoice.id, { invoiceNumber: "" }),
      ValidationError,
      "cashflow.invoiceNumberRequired",
    );

    const other = cashflow.invoiceWrites.create(adminId, { invoiceNumber: "2026-502", clientId: client.id });
    expectError(
      () => cashflow.invoiceWrites.update(other.id, { invoiceNumber: "2026-501" }),
      ConflictError,
      "cashflow.invoiceNumberInUse",
    );
    expect(cashflow.invoiceWrites.update(other.id, { invoiceNumber: "2026-502" }).invoiceNumber).toBe("2026-502");
  });

  it("validates invoice email input before sending", async () => {
    const client = cashflow.clients.create(adminId, { name: "Mail Client" });
    const invoice = cashflow.invoiceWrites.create(adminId, { invoiceNumber: "2026-600", clientId: client.id });
    const full = { to: "a@example.test", subject: "S", message: "M", pdfBase64: "AAAA" };
    const cases: [Partial<typeof full>, string][] = [
      [{ to: " " }, "cashflow.emailRecipientRequired"],
      [{ subject: "" }, "cashflow.emailSubjectRequired"],
      [{ message: " " }, "cashflow.emailMessageRequired"],
      [{ pdfBase64: "" }, "cashflow.emailAttachmentMissing"],
    ];
    for (const [override, key] of cases) {
      await expect(cashflow.invoiceEmail.send(invoice.id, { ...full, ...override })).rejects.toMatchObject({ key });
    }
    await expect(cashflow.invoiceEmail.send(999999, full)).rejects.toMatchObject({ key: "cashflow.invoiceNotFound" });
  });
});
