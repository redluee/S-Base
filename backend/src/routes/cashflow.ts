import { Elysia, t } from "elysia";
import { cashflow, cashflowAuth, saveUpload } from "../context";
import { ATTACHMENT_EXTENSIONS } from "../utils/uploads";

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

const invoiceLine = t.Object({
  taskDescription: t.String(),
  date: optionalNumber,
  quantity: t.Optional(t.Number()),
  unitPrice: t.Optional(t.Number()),
  totalCost: t.Number(),
  type: t.Optional(t.String()),
  discountType: optionalText,
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
  status: t.Optional(t.String()),
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
    .put("/trade-names/:id", ({ params: { id }, body }) => cashflow.tradeNames.update(id, body), {
      params: idParams,
      body: t.Object({ displayName: t.Optional(t.String()), ...tradeNameFields }),
    })
    .delete("/trade-names/:id", ({ params: { id } }) => cashflow.tradeNames.remove(id), { params: idParams })
    .get("/clients", ({ userId }) => cashflow.clients.list(userId))
    .post("/clients", ({ userId, body }) => cashflow.clients.create(userId, body), {
      body: t.Object({ name: t.String(), ...clientFields }),
    })
    .post(
      "/upload",
      async ({ body }) => {
        const { filename, originalName } = await saveUpload(body, "", ATTACHMENT_EXTENSIONS);
        return { filePath: `/api/uploads/${filename}`, originalName };
      },
      { body: t.Object({ file: t.File() }) },
    )
    .get("/clients/:id", ({ params: { id } }) => cashflow.clients.getById(id), { params: idParams })
    .put("/clients/:id", ({ params: { id }, body }) => cashflow.clients.update(id, body), {
      params: idParams,
      body: t.Object({ name: t.Optional(t.String()), ...clientFields }),
    })
    .delete("/clients/:id", ({ params: { id } }) => cashflow.clients.remove(id), { params: idParams })
    .get("/projects", ({ userId, query }) => cashflow.projects.list(userId, query.clientId), {
      query: t.Object({ clientId: t.Optional(t.Numeric()) }),
    })
    .post("/projects", ({ body }) => cashflow.projects.create(body), {
      body: t.Object({ clientId: t.Number(), name: t.String(), ...projectFields }),
    })
    .get("/projects/:id", ({ params: { id } }) => cashflow.projects.getById(id), { params: idParams })
    .put("/projects/:id", ({ params: { id }, body }) => cashflow.projects.update(id, body), {
      params: idParams,
      body: t.Object({ clientId: t.Optional(t.Number()), name: t.Optional(t.String()), ...projectFields }),
    })
    .delete(
      "/projects/:id",
      ({ params: { id }, query }) => cashflow.projects.remove(id, query.deleteInvoices === "true"),
      {
        params: idParams,
        query: t.Object({ deleteInvoices: t.Optional(t.String()) }),
      },
    )
    .get("/invoices/next-number", ({ userId }) => ({
      invoiceNumber: cashflow.invoices.generateNumber(userId, new Date().getFullYear()),
    }))
    .get(
      "/invoices",
      ({ userId, query }) => cashflow.invoices.list(userId, query.status, query.projectId, query.clientId),
      {
        query: t.Object({
          status: t.Optional(t.String()),
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
    .get("/invoices/:id", ({ params: { id } }) => cashflow.invoices.getById(id), { params: idParams })
    .put("/invoices/:id", ({ params: { id }, body }) => cashflow.invoiceWrites.update(id, body), {
      params: idParams,
      body: t.Object({
        invoiceNumber: t.Optional(t.String()),
        clientId: t.Optional(t.Number()),
        ...invoiceFields,
      }),
    })
    .delete("/invoices/:id", ({ params: { id } }) => cashflow.invoices.remove(id), { params: idParams })
    .patch("/invoices/:id/paid", ({ params: { id }, body }) => cashflow.invoices.markAsPaid(id, body?.datePaid), {
      params: idParams,
      body: t.Optional(t.Object({ datePaid: optionalNumber })),
    })
    .post("/invoices/:id/send-email", ({ params: { id }, body }) => cashflow.invoiceEmail.send(id, body), {
      params: idParams,
      body: t.Object({
        to: t.String(),
        subject: t.String(),
        message: t.String(),
        pdfBase64: t.String(),
      }),
    })
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
    .get("/expenses/:id", ({ params: { id } }) => cashflow.expenses.getById(id), { params: idParams })
    .put("/expenses/:id", ({ params: { id }, body }) => cashflow.expenses.update(id, body), {
      params: idParams,
      body: t.Object({ description: t.Optional(t.String()), amount: t.Optional(t.Number()), ...expenseFields }),
    })
    .delete("/expenses/:id", ({ params: { id } }) => cashflow.expenses.remove(id), { params: idParams })
    .get("/dashboard", ({ userId, query }) => cashflow.dashboard.getStats(userId, query.year), {
      query: t.Object({ year: t.Optional(t.Numeric()) }),
    }),
);
