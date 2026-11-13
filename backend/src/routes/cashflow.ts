import { Elysia, t } from "elysia";
import { cashflow, cashflowAuth } from "../context";
import { DISCOUNT_TYPES, INVOICE_LINE_TYPES, INVOICE_STATUSES } from "../shared/cashflow";
import { literals } from "../utils/schema";
import { ATTACHMENT_EXTENSIONS, saveUpload } from "../utils/uploads";

const idParams = t.Object({ id: t.Numeric() });
const optionalText = t.Optional(t.Nullable(t.String()));
const optionalNumber = t.Optional(t.Nullable(t.Number()));

const tradeNameFields = {
  address: optionalText,
  iban: optionalText,
  kvkNumber: optionalText,
  vatNumber: optionalText,
};

const clientFields = {
  address: optionalText,
  email: optionalText,
  kvkNumber: optionalText,
  standardRate: optionalNumber,
  contractPdfPath: optionalText,
  contractPdfName: optionalText,
};

const projectFields = {
  tradeNameId: optionalNumber,
  description: optionalText,
  location: optionalText,
};

const invoiceStatus = literals(INVOICE_STATUSES);

const invoiceLine = t.Object({
  taskDescription: t.String(),
  date: optionalNumber,
  quantity: optionalNumber,
  unitPrice: optionalNumber,
  type: literals(INVOICE_LINE_TYPES),
  discountType: t.Optional(t.Nullable(literals(DISCOUNT_TYPES))),
  discountValue: optionalNumber,
});

const invoiceFields = {
  projectId: optionalNumber,
  tradeNameId: optionalNumber,
  name: optionalText,
  dateCreated: optionalNumber,
  dateService: optionalNumber,
  paymentDueDate: optionalNumber,
  datePaid: optionalNumber,
  status: t.Optional(invoiceStatus),
  isKor: t.Optional(t.Boolean()),
  lines: t.Optional(t.Array(invoiceLine)),
};

const expenseFields = {
  category: optionalText,
  date: optionalNumber,
  tradeNameId: optionalNumber,
  receiptPdfPath: optionalText,
  receiptPdfName: optionalText,
  notes: optionalText,
};

export const cashflowRoutes = new Elysia().group("/api/cashflow", (app) =>
  app
    .use(cashflowAuth)
    .get("/trade-names", ({ userId }) => cashflow.tradeNames.list(userId))
    .post("/trade-names", ({ userId, body }) => cashflow.tradeNames.create(userId, body), {
      body: t.Object({ displayName: t.String(), ...tradeNameFields }),
    })
    .put("/trade-names/:id", ({ params: { id }, body, userId }) => cashflow.tradeNames.update(userId, id, body), {
      params: idParams,
      body: t.Object({ displayName: t.Optional(t.String()), ...tradeNameFields }),
    })
    .delete("/trade-names/:id", ({ params: { id }, userId }) => cashflow.tradeNames.remove(userId, id), {
      params: idParams,
    })
    .get("/clients", ({ userId }) => cashflow.clients.list(userId))
    .post("/clients", ({ userId, body }) => cashflow.clients.create(userId, body), {
      body: t.Object({ name: t.String(), ...clientFields }),
    })
    .post(
      "/upload",
      async ({ body }) => {
        const { filePath, originalName } = await saveUpload(body, "cashflow", ATTACHMENT_EXTENSIONS);
        return { filePath, originalName };
      },
      { body: t.Object({ file: t.File() }) },
    )
    .get("/clients/:id", ({ params: { id }, userId }) => cashflow.clients.getById(userId, id), { params: idParams })
    .put("/clients/:id", ({ params: { id }, body, userId }) => cashflow.clients.update(userId, id, body), {
      params: idParams,
      body: t.Object({ name: t.Optional(t.String()), ...clientFields }),
    })
    .delete("/clients/:id", ({ params: { id }, userId }) => cashflow.clients.remove(userId, id), { params: idParams })
    .get("/projects", ({ userId, query }) => cashflow.projects.list(userId, query.clientId), {
      query: t.Object({ clientId: t.Optional(t.Numeric()) }),
    })
    .post("/projects", ({ body, userId }) => cashflow.projects.create(userId, body), {
      body: t.Object({ clientId: t.Number(), name: t.String(), ...projectFields }),
    })
    .get("/projects/:id", ({ params: { id }, userId }) => cashflow.projects.getById(userId, id), { params: idParams })
    .put("/projects/:id", ({ params: { id }, body, userId }) => cashflow.projects.update(userId, id, body), {
      params: idParams,
      body: t.Object({ clientId: t.Optional(t.Number()), name: t.Optional(t.String()), ...projectFields }),
    })
    .delete(
      "/projects/:id",
      ({ params: { id }, query, userId }) => cashflow.projects.remove(userId, id, query.deleteInvoices ?? false),
      {
        params: idParams,
        query: t.Object({ deleteInvoices: t.Optional(t.BooleanString()) }),
      },
    )
    .get("/invoices/next-number", ({ userId }) => ({ invoiceNumber: cashflow.invoices.nextNumber(userId) }))
    .get(
      "/invoices",
      ({ userId, query }) => cashflow.invoices.list(userId, query.status, query.projectId, query.clientId),
      {
        query: t.Object({
          status: t.Optional(invoiceStatus),
          projectId: t.Optional(t.Numeric()),
          clientId: t.Optional(t.Numeric()),
        }),
      },
    )
    .post("/invoices", ({ userId, body }) => cashflow.invoiceWrites.create(userId, body), {
      body: t.Object({
        invoiceNumber: t.String(),
        clientId: t.Optional(t.Number()),
        ...invoiceFields,
      }),
    })
    .get("/invoices/:id", ({ params: { id }, userId }) => cashflow.invoices.getById(userId, id), { params: idParams })
    .put("/invoices/:id", ({ params: { id }, body, userId }) => cashflow.invoiceWrites.update(userId, id, body), {
      params: idParams,
      body: t.Object({
        invoiceNumber: t.Optional(t.String()),
        clientId: t.Optional(t.Number()),
        ...invoiceFields,
      }),
    })
    .delete("/invoices/:id", ({ params: { id }, userId }) => cashflow.invoices.remove(userId, id), { params: idParams })
    .patch(
      "/invoices/:id/paid",
      ({ params: { id }, body, userId }) => cashflow.invoices.markAsPaid(userId, id, body?.datePaid),
      {
        params: idParams,
        body: t.Optional(t.Object({ datePaid: optionalNumber })),
      },
    )
    .post(
      "/invoices/:id/send-email",
      ({ params: { id }, body, userId }) => cashflow.invoiceEmail.send(userId, id, body),
      {
        params: idParams,
        body: t.Object({
          to: t.String(),
          subject: t.String(),
          message: t.String(),
          pdfBase64: t.String(),
        }),
      },
    )
    .get("/expenses", ({ userId, query }) => cashflow.expenses.list(userId, query), {
      query: t.Object({
        year: t.Optional(t.Numeric()),
        category: t.Optional(t.String()),
        tradeNameId: t.Optional(t.Numeric()),
      }),
    })
    .post("/expenses", ({ userId, body }) => cashflow.expenses.create(userId, body), {
      body: t.Object({ description: t.String(), amount: t.Number(), ...expenseFields }),
    })
    .get("/expenses/:id", ({ params: { id }, userId }) => cashflow.expenses.getById(userId, id), { params: idParams })
    .put("/expenses/:id", ({ params: { id }, body, userId }) => cashflow.expenses.update(userId, id, body), {
      params: idParams,
      body: t.Object({ description: t.Optional(t.String()), amount: t.Optional(t.Number()), ...expenseFields }),
    })
    .delete("/expenses/:id", ({ params: { id }, userId }) => cashflow.expenses.remove(userId, id), { params: idParams })
    .get("/dashboard", ({ userId, query }) => cashflow.dashboard.getStats(userId, query.year), {
      query: t.Object({ year: t.Optional(t.Numeric()) }),
    }),
);
