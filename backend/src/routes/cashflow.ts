import { Elysia } from "elysia";
import { ATTACHMENT_EXTENSIONS } from "../utils/uploads";
import { cashflow, cashflowAuth, validated, saveUpload } from "../context";

export const cashflowRoutes = new Elysia()
  // --- Cashflow routes ---
  .group("/api/cashflow", (app) =>
    app
      .use(cashflowAuth)
      .get("/trade-names", ({ userId }) => cashflow.listTradeNames(userId))
      .post("/trade-names", async ({ userId, body }) => cashflow.createTradeName(userId, body as any))
      .put("/trade-names/:id", async ({ params: { id }, body }) => cashflow.updateTradeName(Number(id), body as any))
      .delete("/trade-names/:id", ({ params: { id } }) => {
        const r = cashflow.removeTradeName(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/clients", ({ userId }) => cashflow.listClients(userId))
      .post("/clients", async ({ userId, body }) => cashflow.createClient(userId, body as any))
      .post("/upload", async ({ body }) => {
        return validated(async () => {
          const { filename, originalName } = await saveUpload(body, "", ATTACHMENT_EXTENSIONS);
          return { filePath: `/api/uploads/${filename}`, originalName };
        });
      })
      .get("/clients/:id", ({ params: { id } }) => {
        const c = cashflow.getClientById(Number(id));
        if (!c) return new Response("Not Found", { status: 404 });
        return c;
      })
      .put("/clients/:id", async ({ params: { id }, body }) => {
        const c = cashflow.updateClient(Number(id), body as any);
        if (!c) return new Response("Not Found", { status: 404 });
        return c;
      })
      .delete("/clients/:id", ({ params: { id } }) => {
        const r = cashflow.removeClient(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/projects", ({ userId, query }) => {
        const clientId = query?.clientId ? Number(query.clientId) : undefined;
        return cashflow.listProjects(userId, clientId);
      })
      .post("/projects", async ({ userId, body }) => cashflow.createProject(userId, body as any))
      .get("/projects/:id", ({ params: { id } }) => {
        const p = cashflow.getProjectById(Number(id));
        if (!p) return new Response("Not Found", { status: 404 });
        return p;
      })
      .put("/projects/:id", async ({ params: { id }, body }) => {
        const p = cashflow.updateProject(Number(id), body as any);
        if (!p) return new Response("Not Found", { status: 404 });
        return p;
      })
      .delete("/projects/:id", ({ params: { id }, query }) => {
        const deleteInvoices = query?.deleteInvoices === "true";
        const r = cashflow.removeProject(Number(id), deleteInvoices);
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/invoices/next-number", ({ userId }) => {
        const year = new Date().getFullYear();
        return { invoiceNumber: cashflow.generateInvoiceNumber(userId, year) };
      })
      .get("/invoices", ({ userId, query }) => {
        const status = query?.status as string | undefined;
        const projectId = query?.projectId ? Number(query.projectId) : undefined;
        const clientId = query?.clientId ? Number(query.clientId) : undefined;
        return cashflow.listInvoices(userId, status, projectId, clientId);
      })
      .post("/invoices", async ({ userId, body }) => cashflow.createInvoice(userId, body as any))
      .get("/invoices/:id", ({ params: { id } }) => {
        const inv = cashflow.getInvoiceById(Number(id));
        if (!inv) return new Response("Not Found", { status: 404 });
        return inv;
      })
      .put("/invoices/:id", async ({ params: { id }, body }) => {
        const inv = cashflow.updateInvoice(Number(id), body as any);
        if (!inv) return new Response("Not Found", { status: 404 });
        return inv;
      })
      .delete("/invoices/:id", ({ params: { id } }) => {
        const r = cashflow.removeInvoice(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .patch("/invoices/:id/paid", async ({ params: { id }, body }) => {
        const datePaid = (body as any)?.datePaid !== undefined ? ((body as any).datePaid ? Number((body as any).datePaid) : null) : undefined;
        const inv = cashflow.markAsPaid(Number(id), datePaid);
        if (!inv) return new Response("Not Found", { status: 404 });
        return inv;
      })
      .post("/invoices/:id/send-email", async ({ params: { id }, body }) => {
        try {
          const result = await cashflow.sendInvoiceEmail(Number(id), body as any);
          if (!result) return new Response("Not Found", { status: 404 });
          return result;
        } catch (e: unknown) {
          return new Response(e instanceof Error ? e.message : "Fout bij verzenden e-mail", { status: 400 });
        }
      })
      .get("/expenses", ({ userId, query }) => {
        const year = query?.year ? Number(query.year) : undefined;
        const category = query?.category as string | undefined;
        const tradeNameId = query?.tradeNameId ? Number(query.tradeNameId) : undefined;
        return cashflow.listExpenses(userId, { year, category, tradeNameId });
      })
      .post("/expenses", async ({ userId, body }) => cashflow.createExpense(userId, body as any))
      .get("/expenses/:id", ({ params: { id } }) => {
        const exp = cashflow.getExpenseById(Number(id));
        if (!exp) return new Response("Not Found", { status: 404 });
        return exp;
      })
      .put("/expenses/:id", async ({ params: { id }, body }) => {
        const exp = cashflow.updateExpense(Number(id), body as any);
        if (!exp) return new Response("Not Found", { status: 404 });
        return exp;
      })
      .delete("/expenses/:id", ({ params: { id } }) => {
        const r = cashflow.removeExpense(Number(id));
        if (!r) return new Response("Not Found", { status: 404 });
        return r;
      })
      .get("/dashboard", ({ userId, query }) => cashflow.getDashboardStats(userId, (query as any)?.year ? Number((query as any).year) : undefined))
  );
