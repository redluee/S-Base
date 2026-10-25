import { Elysia } from "elysia";
import { finance, financeAuth } from "../context";
import { FinanceNotFound } from "../modules/finance/accounts";
import { requireId, validationResponse } from "../utils/validation";

function checked<T>(fn: () => T) {
  try {
    return fn();
  } catch (error) {
    if (error instanceof FinanceNotFound)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    const response = validationResponse(error);
    if (response) return response;
    throw error;
  }
}

export const financeRoutes = new Elysia().group("/api/finance", (app) =>
  app
    .use(financeAuth)
    .onAfterHandle(({ set }) => {
      set.headers["Cache-Control"] = "no-store";
    })
    .get("/", ({ userId }) => finance.data(userId))
    .put("/settings/budget", ({ userId, body }) =>
      checked(() => finance.setMonthlyBudget(userId, body)),
    )
    .post("/settings/reset", ({ userId, body }) =>
      checked(() => finance.resetFinance(userId, body)),
    )
    .get("/dashboard", ({ userId, query }) =>
      checked(() => finance.dashboard(userId, query.period, query.date)),
    )
    .get("/budget/transactions", ({ userId, query }) =>
      checked(() => finance.budgetTransactions(userId, query)),
    )
    .post("/import/preview", ({ userId, body }) =>
      checked(() => finance.previewImport(body, userId)),
    )
    .post("/import", ({ userId, body }) =>
      checked(() => finance.importBalances(userId, body)),
    )
    .get("/transactions", ({ userId, query }) => checked(() => finance.transactionList(userId, query)))
    .post("/subscriptions", ({ userId, body }) => checked(() => finance.addSubscription(userId, body)))
    .get("/subscriptions", ({ userId }) => finance.subscriptions(userId))
    .get("/subscriptions/:id/transactions", ({ userId, params, query }) => checked(() => finance.subscriptionTransactions(userId, params.id, query)))
    .put("/subscriptions/name", ({ userId, body }) => checked(() => finance.renameSubscription(userId, body)))
    .post("/subscriptions/merge", ({ userId, body }) => checked(() => finance.mergeSubscriptions(userId, body)))
    .delete("/subscriptions", ({ userId, body }) => checked(() => finance.excludeSubscription(userId, body)))
    .put("/accounts/:id/icon", ({ userId, params, body }) =>
      checked(() => finance.setAccountIcon(userId, requireId(params.id), body)),
    )
    .get("/accounts/:id/history", ({ userId, params }) =>
      checked(() => finance.history(userId, requireId(params.id))),
    ),
);
