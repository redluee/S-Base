import { Elysia, t } from "elysia";
import { finance, financeAuth } from "../context";

const idParams = t.Object({ id: t.Numeric() });
const keyParams = t.Object({ id: t.String() });
const subscriptionId = { id: t.String() };
const pageQuery = t.Object({ page: t.Optional(t.String()) });

const selection = t.Object({
  sourceKey: t.String(),
  accountId: t.Optional(t.Number()),
  newAccount: t.Optional(t.Object({ name: t.String(), type: t.String() })),
  extendOpening: t.Boolean(),
  entries: t.Array(t.Object({ date: t.String(), expectedCents: t.Nullable(t.Number()) })),
});

const importFields = {
  content: t.Optional(t.String()),
  csv: t.Optional(t.String()),
  order: t.Optional(t.String()),
  anchors: t.Optional(t.Record(t.String(), t.Number())),
};

export const financeRoutes = new Elysia().group("/api/finance", (app) =>
  app
    .use(financeAuth)
    .onAfterHandle(({ set }) => {
      set.headers["Cache-Control"] = "no-store";
    })
    .get("/", ({ userId }) => finance.accounts.data(userId))
    .put("/settings/budget", ({ userId, body }) => finance.budget.setMonthlyBudget(userId, body), {
      body: t.Object({ monthlyBudgetCents: t.Nullable(t.Number()) }),
    })
    .post("/settings/reset", ({ userId, body }) => finance.transactions.resetFinance(userId, body), {
      body: t.Object({ confirmation: t.Optional(t.String()) }),
    })
    .get("/dashboard", ({ userId, query }) => finance.budget.dashboard(userId, query.period, query.date), {
      query: t.Object({ period: t.Optional(t.String()), date: t.Optional(t.String()) }),
    })
    .get("/budget/transactions", ({ userId, query }) => finance.budget.budgetTransactions(userId, query), {
      query: t.Object({ date: t.Optional(t.String()), page: t.Optional(t.String()) }),
    })
    .post("/import/preview", ({ userId, body }) => finance.imports.previewImport(body, userId), {
      body: t.Object(importFields),
    })
    .post("/import", ({ userId, body }) => finance.imports.importBalances(userId, body), {
      body: t.Object({ ...importFields, selections: t.Array(selection) }),
    })
    .get("/transactions", ({ userId, query }) => finance.transactions.transactionList(userId, query), {
      query: t.Object({
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
        page: t.Optional(t.String()),
        search: t.Optional(t.String()),
        subscriptionCandidate: t.Optional(t.String()),
      }),
    })
    .post("/subscriptions", ({ userId, body }) => finance.subscriptions.addSubscription(userId, body), {
      body: t.Object({ transactionId: t.Number(), cadence: t.String() }),
    })
    .get("/subscriptions", ({ userId }) => finance.subscriptions.list(userId))
    .get("/subscriptions/:id/transactions", ({ userId, params, query }) =>
      finance.subscriptions.subscriptionTransactions(userId, params.id, query), {
      params: keyParams,
      query: pageQuery,
    })
    .put("/subscriptions/name", ({ userId, body }) => finance.subscriptions.renameSubscription(userId, body), {
      body: t.Object({ ...subscriptionId, name: t.String() }),
    })
    .put("/subscriptions/inactive", ({ userId, body }) => finance.subscriptions.setSubscriptionInactive(userId, body), {
      body: t.Object({ ...subscriptionId, inactive: t.Boolean() }),
    })
    .post("/subscriptions/merge", ({ userId, body }) => finance.subscriptions.mergeSubscriptions(userId, body), {
      body: t.Object({ ...subscriptionId, targetId: t.String() }),
    })
    .delete("/subscriptions", ({ userId, body }) => finance.subscriptions.excludeSubscription(userId, body), {
      body: t.Object(subscriptionId),
    })
    .put("/accounts/:id/icon", ({ userId, params, body }) => finance.accounts.setAccountIcon(userId, params.id, body), {
      params: idParams,
      body: t.Object({ icon: t.Nullable(t.String()) }),
    })
    .get("/accounts/:id/history", ({ userId, params }) => finance.accounts.history(userId, params.id), {
      params: idParams,
    }),
);
