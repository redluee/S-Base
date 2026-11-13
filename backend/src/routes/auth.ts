import { Elysia, t } from "elysia";
import { auth } from "../context";
import { clearSessionCookie, readSessionId, writeSessionCookie } from "../auth/session-cookie";
import { getClientIp, verifyInternalSecret } from "../security";
import { ForbiddenError, ValidationError } from "../utils/errors";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .post(
    "/login",
    async ({ body: { username, password }, cookie: { session_id }, request }) => {
      const { sessionId, user } = await auth.login(username, password, getClientIp(request));
      writeSessionCookie(session_id, sessionId);
      return { user };
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
