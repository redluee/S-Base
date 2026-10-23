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
    .get("/dashboard", ({ userId, query }) =>
      checked(() => finance.dashboard(userId, query.period, query.date)),
    )
    .post("/accounts", ({ userId, body }) =>
      checked(() => finance.createAccount(userId, body)),
    )
    .put("/accounts/:id", ({ userId, params, body }) =>
      checked(() => finance.updateAccount(userId, requireId(params.id), body)),
    )
    .put("/accounts/:id/archive", ({ userId, params, body }) =>
      checked(() => finance.archiveAccount(userId, requireId(params.id), body)),
    )
    .get("/accounts/:id/history", ({ userId, params }) =>
      checked(() => finance.history(userId, requireId(params.id))),
    )
    .delete("/accounts/:id/observations/:date", ({ userId, params }) =>
      checked(() =>
        finance.deleteObservation(userId, requireId(params.id), params.date),
      ),
    )
    .post("/balances", ({ userId, body }) =>
      checked(() => finance.setBalances(userId, body)),
    )
    .post("/goals", ({ userId, body }) =>
      checked(() => finance.createGoal(userId, body)),
    )
    .put("/goals/:id", ({ userId, params, body }) =>
      checked(() => finance.updateGoal(userId, requireId(params.id), body)),
    )
    .delete("/goals/:id", ({ userId, params }) =>
      checked(() => finance.deleteGoal(userId, requireId(params.id))),
    )
    .put("/goals/:id/allocations/:accountId", ({ userId, params, body }) =>
      checked(() =>
        finance.allocate(
          userId,
          requireId(params.id),
          requireId(params.accountId),
          body,
        ),
      ),
    ),
);
