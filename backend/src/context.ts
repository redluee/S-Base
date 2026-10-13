import { Elysia } from "elysia";
import { AuthService } from "./auth";
import { RecipeService } from "./modules/recipes";
import { WorkoutService } from "./modules/workout";
import { MeasurementService } from "./modules/measurements";
import { WineService } from "./modules/wines";
import { CashflowService } from "./modules/cashflow";
import { PulseService, ServerShutdownService, SystemUpdateService } from "./modules/pulse";
import { MinecraftService } from "./modules/minecraft";
import { MinorService } from "./modules/minor";
import { ResumeService } from "./modules/resume";
import db, { sqlite } from "./db/client";
import { isProduction } from "./security";
import { modules } from "./db/schema";
import { join } from "path";
import { mkdir } from "fs/promises";
import { resolveUploadExtension } from "./utils/uploads";
import { validationResponse } from "./utils/validation";
import { ensureDefaultModules } from "./db/user-manager";

try {
  await ensureDefaultModules();
} catch {}

export const PORT = Number(process.env.PORT) || 3001;
export const HOST = process.env.HOST || "0.0.0.0";
export const auth = new AuthService();

if (isProduction()) {
  const weak = await auth.findDefaultCredentialUsers();
  if (weak.length > 0) {
    console.warn(`Default credentials still active for: ${weak.join(", ")}. Change the passwords with 'bun run db:user change-password'.`);
  }
}
export const recipes = new RecipeService();
export const workout = new WorkoutService();
export const measurements = new MeasurementService();
export const wineService = new WineService();
export const cashflow = new CashflowService();
export const pulse = new PulseService();
export const minecraft = new MinecraftService();
export const shutdownService = new ServerShutdownService(minecraft);
export const systemUpdate = new SystemUpdateService();
export const minor = new MinorService();
export const resume = new ResumeService();

export function createAuthPlugin(moduleName: string | string[]) {
  return new Elysia({ name: `auth-${Array.isArray(moduleName) ? moduleName.join("-") : moduleName}` })
    .derive({ as: "scoped" }, ({ cookie: { session_id }, request }) => {
      let sid = typeof session_id?.value === "string" ? session_id.value : "";
      if (!sid) {
        const cookieHeader = request.headers.get("cookie") || "";
        const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
        if (match) sid = match[1];
      }
      if (!sid) return { user: null };
      const sessionInfo = auth.validateSession(sid);
      return { user: sessionInfo };
    })
    .onBeforeHandle({ as: "scoped" }, ({ user }) => {
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const modules = Array.isArray(moduleName) ? moduleName : [moduleName];
      const hasAccess = modules.some(mod => auth.moduleAccessCheck(user.userId, mod));
      
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    })
    .derive({ as: "scoped" }, ({ user }) => {
      return { userId: user?.userId ?? 0, username: user?.username ?? "" };
    });
}

export const recipeAuth = createAuthPlugin("recipes");
export const workoutAuth = createAuthPlugin("workout");
export const measurementsAuth = workoutAuth;
export const cashflowAuth = createAuthPlugin("cashflow");
export const pulseAuth = createAuthPlugin("pulse");
export const minecraftAuth = createAuthPlugin(["minecraft", "minecraft:monitor"]);
export const minorAuth = createAuthPlugin("minor");
export const resumeAuth = createAuthPlugin("resume");

export function badRequest(fn: () => any) {
  try {
    return fn();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Bad Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function validated<T>(fn: () => T | Promise<T>): Promise<T | Response> {
  try {
    return await fn();
  } catch (e) {
    const res = validationResponse(e);
    if (res) return res;
    throw e;
  }
}

export async function saveUpload(body: unknown, prefix: string, allowed: string[]) {
  const { file } = (body ?? {}) as any;
  const ext = resolveUploadExtension(file, allowed);
  const uploadsDir = join(import.meta.dir, "../uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${prefix}${crypto.randomUUID()}.${ext}`;
  await Bun.write(join(uploadsDir, filename), file);
  return { filename, originalName: typeof file.name === "string" ? file.name : filename };
}

export function notFoundOr<T>(value: T | null | undefined) {
  return value ?? new Response("Not Found", { status: 404 });
}

export const requireFullMinecraftAccess = ({ userId }: { userId: number }) => {
  if (!auth.moduleAccessCheck(userId, "minecraft")) {
    return new Response(JSON.stringify({ error: "Forbidden: Full access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
};
