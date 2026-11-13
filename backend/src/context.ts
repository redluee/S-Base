import { Elysia } from "elysia";
import { AuthService } from "./auth";
import { RecipesService } from "./modules/recipes";
import { WorkoutService } from "./modules/workout";
import { CashflowService } from "./modules/cashflow";
import { inertPower, PulseService } from "./modules/pulse";
import { MinecraftService } from "./modules/minecraft";
import { MinorService } from "./modules/minor";
import { FinanceService } from "./modules/finance";
import { ResumeService } from "./modules/resume";
import { ForbiddenError } from "./utils/errors";
import { readSessionId } from "./auth/session-cookie";
import type { ModuleName } from "./auth/modules";
import { LEGACY_UPLOADS, registerUploadReadPolicy } from "./utils/uploads";

export const PORT = Number(process.env.PORT) || 3001;
export const HOST = process.env.HOST || "0.0.0.0";
export const auth = new AuthService();
export const recipes = new RecipesService();
export const workout = new WorkoutService();
export const cashflow = new CashflowService();
export const minecraft = new MinecraftService();
export const pulse = new PulseService({
  minecraft,
  power: process.env.NODE_ENV === "test" ? inertPower : undefined,
});
export const minor = new MinorService();
export const resume = new ResumeService();
export const finance = new FinanceService();

const ownMeasurementPhoto = (userId: number, filename: string) =>
  !workout.measurements.isForeignPhoto(userId, filename);
registerUploadReadPolicy("workout", ownMeasurementPhoto);
registerUploadReadPolicy(LEGACY_UPLOADS, ownMeasurementPhoto);
registerUploadReadPolicy("resume", () => false);

function sessionUserFrom(cookie: Parameters<typeof readSessionId>[0], request: Request) {
  const user = auth.sessionUser(readSessionId(cookie, request));
  return { user, userId: user.userId, username: user.username };
}

export const sessionAuth = new Elysia({ name: "auth-session" }).derive(
  { as: "scoped" },
  ({ cookie: { session_id }, request }) => sessionUserFrom(session_id, request),
);

export function createAuthPlugin(...moduleNames: ModuleName[]) {
  return new Elysia({ name: `auth-${moduleNames.join("-")}` }).derive(
    { as: "scoped" },
    ({ cookie: { session_id }, request }) => {
      const session = sessionUserFrom(session_id, request);
      if (!moduleNames.some((mod) => auth.moduleAccessCheck(session.userId, mod))) throw new ForbiddenError();
      return session;
    },
  );
}

export const recipeAuth = createAuthPlugin("recipes");
export const workoutAuth = createAuthPlugin("workout");
export const cashflowAuth = createAuthPlugin("cashflow");
export const pulseAuth = createAuthPlugin("pulse");
export const minecraftAuth = createAuthPlugin("minecraft", "minecraft:monitor");
export const minorAuth = createAuthPlugin("minor");
export const resumeAuth = createAuthPlugin("resume");
export const financeAuth = createAuthPlugin("finance");
