import { Elysia, t } from "elysia";
import { auth, sessionAuth } from "../context";
import { NotFoundError } from "../utils/errors";
import { UPLOAD_NAME_PATTERN, mayReadUpload, uploadPath, uploadResponseHeaders } from "../utils/uploads";

const hasModule = (userId: number, owner: string) => auth.moduleAccessCheck(userId, owner);

export const uploadRoutes = new Elysia().use(sessionAuth).get(
  "/api/uploads/:filename",
  async ({ params: { filename }, userId }) => {
    if (!UPLOAD_NAME_PATTERN.test(filename) || !mayReadUpload(userId, filename, hasModule)) throw new NotFoundError();
    const file = Bun.file(uploadPath(filename));
    if (!(await file.exists())) throw new NotFoundError();
    return new Response(file, { headers: uploadResponseHeaders(filename) });
  },
  { params: t.Object({ filename: t.String() }) },
);
