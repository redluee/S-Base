import { Elysia } from "elysia";
import { auth, pulse, shutdownService, systemUpdate, pulseAuth } from "../context";

export const pulseRoutes = new Elysia()
  // --- Pulse Admin / Monitoring routes ---
  .group("/api/pulse", (app) =>
    app
      .use(pulseAuth)
      .get("/users", () => pulse.listUsers())
      .post("/users", async ({ body, set }) => {
        const { username, email, password } = (body ?? {}) as {
          username?: unknown;
          email?: unknown;
          password?: unknown;
        };

        if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string") {
          set.status = 400;
          return { error: "invalid_input" };
        }

        const result = await pulse.createUser(username, email, password);
        if (!result.ok) {
          set.status = result.reason === "username_exists" || result.reason === "email_exists" ? 409 : 400;
          return { error: result.reason };
        }

        set.status = 201;
        return result.user;
      })
      .get("/modules", () => pulse.listModules())
      .get("/stats", () => pulse.getStats())
      .get("/shutdown-schedule", () => shutdownService.getStatus())
      .post("/shutdown-schedule", ({ body }) => {
        const { time, enabled } = (body ?? {}) as { time?: string; enabled?: boolean };
        return shutdownService.updateSchedule({ time, enabled });
      })
      .post("/shutdown-schedule/block", () => shutdownService.blockShutdown())
      .post("/shutdown-schedule/unblock", () => shutdownService.unblockShutdown())
      .post("/shutdown-now", async () => {
        shutdownService.triggerManualShutdown().catch((err) => {
          console.error("[Pulse] Manual shutdown failed:", err);
        });
        return { ok: true };
      })
      .get("/system-update", () => systemUpdate.getState())
      .post("/system-update", ({ set }) => {
        if (systemUpdate.isRunning()) {
          set.status = 409;
          return { error: "already_running" };
        }
        return systemUpdate.start();
      })
      .post("/reboot", ({ set }) => {
        if (systemUpdate.isRunning()) {
          set.status = 409;
          return { error: "update_running" };
        }
        shutdownService.triggerReboot().catch((err) => {
          console.error("[Pulse] Reboot failed:", err);
        });
        return { ok: true };
      })
      .put("/users/:id/email", ({ params: { id }, body }) => {
        const { email } = (body ?? {}) as { email?: string | null };
        const u = pulse.updateEmail(Number(id), email ?? null);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
      .put("/users/:id/status", ({ params: { id }, body }) => {
        const { isPaused } = (body ?? {}) as { isPaused?: number | boolean };
        const u = pulse.updateStatus(Number(id), isPaused ? 1 : 0);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
      .put("/users/:id/modules", ({ params: { id }, body }) => {
        const { modules } = (body ?? {}) as { modules?: string[] };
        const u = pulse.updateModules(Number(id), Array.isArray(modules) ? modules : []);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
      .put("/users/:id/servers", ({ params: { id }, body }) => {
        const { servers } = (body ?? {}) as { servers?: string[] };
        const u = pulse.updateServerPermissions(Number(id), Array.isArray(servers) ? servers : []);
        if (!u) return new Response("Not Found", { status: 404 });
        return u;
      })
      .post("/users/:id/impersonate", ({ params: { id }, userId, cookie: { session_id } }) => {
        const targetUserId = Number(id);
        const res = auth.impersonateUser(userId, targetUserId);
        if (!res.ok) {
          const status = res.reason === "forbidden" ? 403 : res.reason === "user_not_found" ? 404 : 400;
          return new Response(JSON.stringify({ error: res.reason }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
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
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": cookieValue,
            },
          }
        );
      })
  );
