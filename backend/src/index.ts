import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createDiscordBot } from "./modules/minecraft/discord-bot";
import { closeDatabase, sqlite } from "./db/client";
import { IN_MEMORY_DB } from "./db/paths";
import { isProduction, resolveCorsOrigin, securityHeaders } from "./security";
import { startBackupSchedule } from "./db/backup";
import { authRoutes } from "./routes/auth";
import { recipeRoutes } from "./routes/recipes";
import { workoutRoutes } from "./routes/workout";
import { cashflowRoutes } from "./routes/cashflow";
import { minorRoutes } from "./routes/minor";
import { financeRoutes } from "./routes/finance";
import { resumeRoutes } from "./routes/resume";
import { pulseRoutes } from "./routes/pulse";
import { minecraftRoutes } from "./routes/minecraft";
import { uploadRoutes } from "./routes/uploads";
import { PORT, HOST, auth, minecraft } from "./context";
import { ensureDefaultModules } from "./auth/modules";
import { AppError, errorResponse, NotFoundError, ValidationError } from "./utils/errors";

export const app = new Elysia()
  .use(cors({ origin: resolveCorsOrigin(), credentials: true }))
  .onAfterHandle({ as: "global" }, ({ set }) => {
    for (const [k, v] of Object.entries(securityHeaders)) set.headers[k] = v;
  })
  .get("/api/health", () => {
    try {
      sqlite.query("SELECT 1").get();
      return { status: "ok", uptime: Math.round(process.uptime()) };
    } catch {
      return new Response(JSON.stringify({ status: "error" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  })
  .onError(({ code, error }) => {
    if (error instanceof AppError) return errorResponse(error);
    if (code === "NOT_FOUND") return errorResponse(new NotFoundError());
    if (code === "VALIDATION" || code === "PARSE") return errorResponse(new ValidationError("common.invalidRequest"));
    console.error(
      JSON.stringify({
        level: "error",
        code,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
    if (isProduction()) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const message =
      error && typeof error === "object" && "message" in error ? (error as { message: string }).message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })

  .use(authRoutes)
  .use(recipeRoutes)
  .use(workoutRoutes)
  .use(cashflowRoutes)
  .use(minorRoutes)
  .use(resumeRoutes)
  .use(financeRoutes)
  .use(pulseRoutes)
  .use(minecraftRoutes)
  .use(uploadRoutes);

if (process.env.NODE_ENV !== "test") {
  ensureDefaultModules();
  if (isProduction()) {
    const weak = await auth.findDefaultCredentialUsers();
    if (weak.length > 0) {
      console.warn(
        `Default credentials still active for: ${weak.join(", ")}. Change the passwords with 'bun run db:user change-password'.`,
      );
    }
  }
  app.listen({ port: PORT, hostname: HOST });
  console.log(`Backend running on http://${HOST}:${PORT}`);

  if (isProduction() && !IN_MEMORY_DB) startBackupSchedule(sqlite);

  const discordBot = createDiscordBot(minecraft);

  const shutdown = () => {
    minecraft.idle.stop();
    discordBot?.stop();
    closeDatabase();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
