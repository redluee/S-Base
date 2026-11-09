import { Elysia } from "elysia";
import { AuthService } from "./auth";
import { RecipesService } from "./modules/recipes";
import { WorkoutService } from "./modules/workout";
import { CashflowService } from "./modules/cashflow";
import { PulseService } from "./modules/pulse";
import { MinecraftService } from "./modules/minecraft";
import { MinorService } from "./modules/minor";
import { FinanceService } from "./modules/finance";
import { ResumeService } from "./modules/resume";
import { isProduction } from "./security";
import { join } from "path";
import { mkdir } from "fs/promises";
import { resolveUploadExtension } from "./utils/uploads";
import { AppError, ValidationError } from "./utils/errors";
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
export const recipes = new RecipesService();
export const workout = new WorkoutService();
export const cashflow = new CashflowService();
export const minecraft = new MinecraftService();
export const pulse = new PulseService({ minecraft });
export const minor = new MinorService();
export const resume = new ResumeService();
export const finance = new FinanceService();

function sessionIdFrom(cookieValue: unknown, request: Request): string {
  if (typeof cookieValue === "string" && cookieValue) return cookieValue;
  const match = (request.headers.get("cookie") || "").match(/(?:^|;\s*)session_id=([^;]+)/);
  return match ? match[1] : "";
}

export function createAuthPlugin(moduleName: string | string[]) {
  const moduleNames = Array.isArray(moduleName) ? moduleName : [moduleName];
  return new Elysia({ name: `auth-${moduleNames.join("-")}` }).derive(
    { as: "scoped" },
    ({ cookie: { session_id }, request }) => {
      const sid = sessionIdFrom(session_id?.value, request);
      const user = sid ? auth.validateSession(sid) : null;
      if (!user) throw new AppError(401, "Unauthorized");
      if (!moduleNames.some((mod) => auth.moduleAccessCheck(user.userId, mod))) throw new AppError(403, "Forbidden");
      return { user, userId: user.userId, username: user.username };
    },
  );
}

export const recipeAuth = createAuthPlugin("recipes");
export const workoutAuth = createAuthPlugin("workout");
export const cashflowAuth = createAuthPlugin("cashflow");
export const pulseAuth = createAuthPlugin("pulse");
export const minecraftAuth = createAuthPlugin(["minecraft", "minecraft:monitor"]);
export const minorAuth = createAuthPlugin("minor");
export const resumeAuth = createAuthPlugin("resume");
export const financeAuth = createAuthPlugin("finance");

export async function saveUpload(body: unknown, prefix: string, allowed: string[], maxBytes?: number) {
  const file = (body as { file?: File } | null | undefined)?.file;
  if (!file) throw new ValidationError("upload.noFile");
  const ext = resolveUploadExtension(file, allowed, maxBytes);
  const uploadsDir = join(import.meta.dir, "../uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${prefix}${crypto.randomUUID()}.${ext}`;
  await Bun.write(join(uploadsDir, filename), file);
  return { filename, originalName: typeof file.name === "string" ? file.name : filename };
}

export const requireFullMinecraftAccess = ({ userId }: { userId: number }) => {
  if (!auth.moduleAccessCheck(userId, "minecraft")) {
    return new Response(JSON.stringify({ error: "minecraft.fullAccessRequired" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
};
