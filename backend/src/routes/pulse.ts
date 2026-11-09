import { Elysia, t } from "elysia";
import { auth, pulse, pulseAuth } from "../context";
import { NotFoundError, ValidationError } from "../utils/errors";

const idParams = t.Object({ id: t.Numeric() });

export const pulseRoutes = new Elysia().group("/api/pulse", (app) =>
  app
    .use(pulseAuth)
    .get("/users", () => pulse.users.listUsers())
    .post(
      "/users",
      async ({ body, set }) => {
        const user = await pulse.users.createUser(body.username, body.email, body.password);
        set.status = 201;
        return user;
      },
      { body: t.Object({ username: t.String(), email: t.String(), password: t.String() }) },
    )
    .get("/modules", () => pulse.users.listModules())
    .get("/stats", () => pulse.users.getStats())
    .get("/shutdown-schedule", () => pulse.shutdown.getStatus())
    .post("/shutdown-schedule", ({ body }) => pulse.shutdown.updateSchedule(body), {
      body: t.Object({ time: t.Optional(t.String()), enabled: t.Optional(t.Boolean()) }),
    })
    .post("/shutdown-schedule/block", () => pulse.shutdown.blockShutdown())
    .post("/shutdown-schedule/unblock", () => pulse.shutdown.unblockShutdown())
    .post("/shutdown-now", () => pulse.shutdownNow())
    .get("/system-update", () => pulse.systemUpdate.getState())
    .post("/system-update", () => pulse.systemUpdate.start())
    .post("/reboot", () => pulse.reboot())
    .put("/users/:id/email", ({ params: { id }, body }) => pulse.users.updateEmail(id, body.email ?? null), {
      params: idParams,
      body: t.Object({ email: t.Optional(t.Nullable(t.String())) }),
    })
    .put("/users/:id/status", ({ params: { id }, body }) => pulse.users.updateStatus(id, body.isPaused ? 1 : 0), {
      params: idParams,
      body: t.Object({ isPaused: t.Union([t.Boolean(), t.Number()]) }),
    })
    .put("/users/:id/modules", ({ params: { id }, body }) => pulse.users.updateModules(id, body.modules), {
      params: idParams,
      body: t.Object({ modules: t.Array(t.String()) }),
    })
    .put("/users/:id/servers", ({ params: { id }, body }) => pulse.users.updateServerPermissions(id, body.servers), {
      params: idParams,
      body: t.Object({ servers: t.Array(t.String()) }),
    })
    .post(
      "/users/:id/impersonate",
      ({ params: { id }, userId, cookie: { session_id }, set }) => {
        const res = auth.impersonateUser(userId, id);
        if (!res.ok) {
          if (res.reason === "forbidden") {
            set.status = 403;
            return { error: "forbidden" };
          }
          if (res.reason === "user_not_found") throw new NotFoundError("pulse.userNotFound");
          throw new ValidationError("pulse.userPaused");
        }

        const isSecure = process.env.NODE_ENV === "production";
        session_id?.set({ value: res.newSessionId, httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400, secure: isSecure });
        const cookieValue = `session_id=${res.newSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isSecure ? "; Secure" : ""}`;

        return new Response(
          JSON.stringify({
            ok: true,
            user: {
              ...res.targetUser,
              modules: auth.getUserModules(res.targetUser.id),
              isImpersonated: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": cookieValue } },
        );
      },
      { params: idParams },
    ),
);
