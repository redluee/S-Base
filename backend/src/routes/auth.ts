import { Elysia, t } from "elysia";
import { auth } from "../context";
import { clearSessionCookie, readSessionId, writeSessionCookie } from "../auth/session-cookie";
import { getClientIp, loginLimiter, verifyInternalSecret } from "../security";
import { ForbiddenError, TooManyRequestsError, ValidationError } from "../utils/errors";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .post(
    "/login",
    async ({ body: { username, password }, cookie: { session_id }, request }) => {
      const ipKey = `ip:${getClientIp(request)}`;
      const userKey = `user:${username.toLowerCase()}`;
      const blocked = [loginLimiter.check(ipKey), loginLimiter.check(userKey)].find((l) => !l.allowed);
      if (blocked) throw new TooManyRequestsError("auth.tooManyAttempts", blocked.retryAfter);
      try {
        const { sessionId, user } = await auth.login(username, password);
        loginLimiter.reset(userKey);
        writeSessionCookie(session_id, sessionId);
        return { user };
      } catch (err) {
        loginLimiter.hit(ipKey);
        loginLimiter.hit(userKey);
        throw err;
      }
    },
    { body: t.Object({ username: t.String({ minLength: 1 }), password: t.String({ minLength: 1 }) }) },
  )
  .post(
    "/cf-login",
    ({ body: { email }, cookie: { session_id }, request }) => {
      if (!verifyInternalSecret(request.headers.get("x-internal-auth"))) throw new ForbiddenError();
      const cfEmail = request.headers.get("x-cf-email");
      if (!cfEmail) throw new ValidationError("auth.missingCfHeader");
      if (email !== cfEmail) throw new ValidationError("auth.emailMismatch");
      const { sessionId, user } = auth.loginByEmail(email);
      writeSessionCookie(session_id, sessionId);
      return { user };
    },
    { body: t.Object({ email: t.String({ minLength: 1 }) }) },
  )
  .get("/logout", ({ cookie: { session_id }, request }) => {
    const sessionId = readSessionId(session_id, request);
    if (sessionId) auth.deleteSession(sessionId);
    clearSessionCookie(session_id);
    return { ok: true };
  })
  .get("/me", ({ cookie: { session_id }, request }) => ({
    user: auth.currentUser(readSessionId(session_id, request)),
  }))
  .post("/stop-impersonate", ({ cookie: { session_id }, request }) => {
    const { sessionId, user } = auth.stopImpersonation(readSessionId(session_id, request));
    writeSessionCookie(session_id, sessionId);
    return { ok: true, user };
  });
