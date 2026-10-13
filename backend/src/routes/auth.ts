import { Elysia } from "elysia";
import { getClientIp, loginLimiter, verifyInternalSecret } from "../security";
import { modules } from "../db/schema";
import { auth, pulse } from "../context";

export const authRoutes = new Elysia()
  // --- Auth routes ---
  .post("/api/auth/login", async ({ body, cookie: { session_id }, request }) => {
    const { username, password } = (body ?? {}) as { username?: string; password?: string };
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const ipKey = `ip:${getClientIp(request)}`;
    const userKey = `user:${String(username).toLowerCase()}`;
    const limits = [loginLimiter.check(ipKey), loginLimiter.check(userKey)];
    const blocked = limits.find((l) => !l.allowed);
    if (blocked) {
      return new Response(JSON.stringify({ error: "too_many_attempts" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(blocked.retryAfter) },
      });
    }
    const result = await auth.verifyCredentials(username, password);
    if (result.ok) {
      loginLimiter.reset(userKey);
    } else {
      loginLimiter.hit(ipKey);
      loginLimiter.hit(userKey);
    }
    if (!result.ok) {
      if (result.reason === "account_paused") {
        return new Response(
          JSON.stringify({
            error: "account_paused",
            message: "Uw account is gepauzeerd. Neem contact op met de beheerder.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const status = result.reason === "invalid_input" ? 400 : 401;
      return new Response(JSON.stringify({ error: result.reason }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionId = auth.createSession(result.userId);
    const isSecure = process.env.NODE_ENV === "production";
    session_id?.set({ value: sessionId, httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800, secure: isSecure });

    return { user: { id: result.userId, username, email: result.email, modules: auth.getUserModules(result.userId) } };
  })

  .post("/api/auth/cf-login", ({ body, request }) => {
    if (!verifyInternalSecret(request.headers.get("x-internal-auth"))) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const cfEmail = request.headers.get("x-cf-email");
    if (!cfEmail) {
      return new Response(JSON.stringify({ error: "missing_cf_header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { email } = (body ?? {}) as { email?: string };
    if (!email || email !== cfEmail) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = auth.findUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: "no_account", email }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (user.isPaused === 1) {
      return new Response(
        JSON.stringify({
          error: "account_paused",
          message: "Uw account is gepauzeerd. Neem contact op met de beheerder.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    auth.logLastLogin(user.userId);
    const sessionId = auth.createSession(user.userId);
    const isSecure = process.env.NODE_ENV === "production";
    const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isSecure ? "; Secure" : ""}`;
    const userModules = auth.getUserModules(user.userId);
    const role = (userModules.includes("pulse") || user.username === "admin") ? "admin" : "user";
    return new Response(JSON.stringify({ user: { id: user.userId, username: user.username, email: user.email, role, modules: userModules } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    });
  })

  .get("/api/auth/logout", ({ cookie: { session_id }, request }) => {
    let sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (!sid) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
      if (match) sid = match[1];
    }
    if (sid) auth.deleteSession(sid);
    session_id?.set({ value: "", maxAge: 0, path: "/", secure: process.env.NODE_ENV === "production" });
    return { ok: true };
  })

  .get("/api/auth/me", ({ cookie: { session_id }, request }) => {
    let sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (!sid) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
      if (match) sid = match[1];
    }
    if (!sid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const user = auth.validateSession(sid);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userModules = auth.getUserModules(user.userId);
    const role = (userModules.includes("pulse") || user.username === "admin") ? "admin" : "user";
    return {
      user: {
        id: user.userId,
        username: user.username,
        email: user.email,
        role,
        modules: userModules,
        isImpersonated: user.isImpersonated,
        impersonatorUserId: user.impersonatorUserId ?? null,
        impersonatedBy: user.impersonatedBy ?? null,
      },
    };
  })

  .post("/api/auth/stop-impersonate", ({ cookie: { session_id }, request }) => {
    let sid = typeof session_id?.value === "string" ? session_id.value : "";
    if (!sid) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
      if (match) sid = match[1];
    }
    if (!sid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = auth.stopImpersonation(sid);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: res.reason }), {
        status: 400,
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
          id: res.adminUserId,
          username: res.adminUsername,
          modules: auth.getUserModules(res.adminUserId),
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
  });
