import { Elysia, t } from "elysia";
import { auth, sessionAuth, workout } from "../context";
import { NotFoundError } from "../utils/errors";
import { UPLOAD_NAME_PATTERN, uploadOwnerOf, uploadPath, uploadResponseHeaders } from "../utils/uploads";

function mayRead(userId: number, filename: string): boolean {
  const owner = uploadOwnerOf(filename);
  if (owner === "resume") return false;
  if (owner && !auth.moduleAccessCheck(userId, owner)) return false;
  return !workout.measurements.isForeignPhoto(userId, filename);
}

export const uploadRoutes = new Elysia().use(sessionAuth).get(
  "/api/uploads/:filename",
  async ({ params: { filename }, userId }) => {
    if (!UPLOAD_NAME_PATTERN.test(filename) || !mayRead(userId, filename)) throw new NotFoundError();
    const file = Bun.file(uploadPath(filename));
    if (!(await file.exists())) throw new NotFoundError();
    return new Response(file, { headers: uploadResponseHeaders(filename) });
  },
  { params: t.Object({ filename: t.String() }) },
);
