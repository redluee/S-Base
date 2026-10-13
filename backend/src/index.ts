import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createDiscordBot } from "./modules/minecraft/discord-bot";
import { sqlite } from "./db/client";
import { isProduction, resolveCorsOrigin, securityHeaders } from "./security";
import { startBackupSchedule } from "./db/backup";
import { authRoutes } from "./routes/auth";
import { recipeRoutes } from "./routes/recipes";
import { workoutRoutes } from "./routes/workout";
import { cashflowRoutes } from "./routes/cashflow";
import { minorRoutes } from "./routes/minor";
import { resumeRoutes } from "./routes/resume";
import { pulseRoutes } from "./routes/pulse";
import { minecraftRoutes } from "./routes/minecraft";
import { PORT, HOST, minecraft } from "./context";

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
      return new Response(JSON.stringify({ status: "error" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
  })
  .onError(({ code, error }) => {
    if (code === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (code === "VALIDATION") {
      return new Response(JSON.stringify({ error: (error as any)?.message || "Validation Error" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error(JSON.stringify({ level: "error", code, message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }));
    if (isProduction()) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const message = error && typeof error === "object" && "message" in error ? (error as { message: string }).message : String(error);
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
  .use(pulseRoutes)
  .use(minecraftRoutes)


  .listen({ port: PORT, hostname: HOST });

console.log(`Backend running on http://${HOST}:${PORT}`);

if (isProduction() && process.env.DB_PATH !== ":memory:") startBackupSchedule(sqlite);

const discordBot = process.env.NODE_ENV !== "test" ? createDiscordBot(minecraft) : null;

process.on("SIGINT", () => {
  minecraft.stopIdleMonitor();
  discordBot?.stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  minecraft.stopIdleMonitor();
  discordBot?.stop();
  process.exit(0);
});

