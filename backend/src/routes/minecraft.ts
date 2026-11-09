import { Elysia, t } from "elysia";
import { auth, minecraft, minecraftAuth, requireFullMinecraftAccess } from "../context";
import type { MapFile } from "../modules/minecraft/minecraft-map";

const slugParams = t.Object({ slug: t.String() });
const folderParams = t.Object({ slug: t.String(), type: t.String() });
const playerParams = t.Object({ slug: t.String(), uuid: t.String() });
const idParams = t.Object({ id: t.Numeric() });
const templateFolderParams = t.Object({ id: t.Numeric(), type: t.String() });
type WildcardParams = { slug: string; "*": string };
const reasonBody = t.Object({ reason: t.Optional(t.String()) });
const nonEmpty = t.String({ minLength: 1 });
const uploadField = t.Optional(t.Union([t.File(), t.Files()]));
const uploadBody = t.Object({ files: uploadField, file: uploadField });

function uploadedFiles(body: { files?: File | File[]; file?: File | File[] }): File[] {
  return [body.files, body.file].flat().filter((f): f is File => !!f);
}

function mapResponse(file: MapFile) {
  return new Response(file.data, { status: file.status, headers: file.headers });
}

const forbidden = (key: string) =>
  new Response(JSON.stringify({ error: key }), { status: 403, headers: { "Content-Type": "application/json" } });

export const minecraftRoutes = new Elysia().group("/api/minecraft", (app) =>
  app
    .use(minecraftAuth)
    .onBeforeHandle(({ request, userId }) => {
      const path = new URL(request.url).pathname;
      const hasFullAccess = auth.moduleAccessCheck(userId, "minecraft");

      const serverMatch = path.match(/\/api\/minecraft\/servers\/([^/]+)/);
      if (serverMatch && !minecraft.servers.canAccess(userId, serverMatch[1], hasFullAccess)) {
        return forbidden("minecraft.serverForbidden");
      }

      if (request.method === "GET") return;
      if (path.match(/\/servers\/[^/]+\/start$/)) return;
      return requireFullMinecraftAccess({ userId });
    })
    .get("/versions", () => minecraft.downloads.listVersions())
    .get("/import/scan", () => minecraft.importer.scan())
    .post("/import/inspect", ({ body }) => minecraft.importer.inspect(body.serverDir), {
      body: t.Object({ serverDir: nonEmpty }),
    })
    .post("/import", ({ body }) => minecraft.importer.import(body), {
      body: t.Object({
        slug: nonEmpty,
        displayName: nonEmpty,
        engine: nonEmpty,
        mcVersion: nonEmpty,
        serverDir: nonEmpty,
        javaArgs: t.Optional(t.String()),
      }),
    })
    .get("/servers", ({ userId }) => minecraft.servers.listForUser(userId, auth.moduleAccessCheck(userId, "minecraft")))
    .post("/servers", ({ body }) => minecraft.servers.create(body), {
      body: t.Object({
        slug: t.String(),
        displayName: t.String(),
        engine: t.String(),
        mcVersion: t.String(),
        javaArgs: t.Optional(t.String()),
        templateId: t.Optional(t.Number()),
      }),
    })
    .get("/servers/:slug", ({ params: { slug } }) => minecraft.servers.detail(slug), { params: slugParams })
    .patch("/servers/:slug", ({ params: { slug }, body }) => minecraft.servers.update(slug, body), {
      params: slugParams,
      body: t.Object({
        displayName: t.Optional(t.String()),
        javaArgs: t.Optional(t.Nullable(t.String())),
        engine: t.Optional(t.String()),
        mcVersion: t.Optional(t.String()),
      }),
    })
    .delete("/servers/:slug", ({ params: { slug }, query }) => minecraft.servers.remove(slug, query.deleteDisk === "true"), {
      params: slugParams,
      query: t.Object({ deleteDisk: t.Optional(t.String()) }),
    })
    .post("/servers/:slug/start", ({ params: { slug } }) => minecraft.lifecycle.startServer(slug), { params: slugParams })
    .post("/servers/:slug/stop", ({ params: { slug } }) => minecraft.lifecycle.stopServer(slug), { params: slugParams })
    .post("/servers/:slug/restart", ({ params: { slug } }) => minecraft.lifecycle.restartServer(slug), { params: slugParams })
    .get("/servers/:slug/status", ({ params: { slug } }) => minecraft.lifecycle.getStatus(slug), { params: slugParams })
    .get(
      "/servers/:slug/console",
      async ({ params: { slug }, query }) => ({ lines: await minecraft.lifecycle.getConsoleLogs(slug, query.lines ?? 100) }),
      { params: slugParams, query: t.Object({ lines: t.Optional(t.Numeric({ minimum: 1, maximum: 10000 })) }) },
    )
    .post("/servers/:slug/console", ({ params: { slug }, body }) => minecraft.lifecycle.runConsoleCommand(slug, body.command), {
      params: slugParams,
      body: t.Object({ command: t.String() }),
    })
    .get("/servers/:slug/map/status", ({ params: { slug } }) => minecraft.map.status(slug), { params: slugParams })
    .get("/servers/:slug/map", async ({ params: { slug } }) => mapResponse(await minecraft.map.serve(slug, "index.html")), {
      params: slugParams,
    })
    .get(
      "/servers/:slug/map/*",
      async ({ params }) => mapResponse(await minecraft.map.serve(params.slug, (params as WildcardParams)["*"])),
      { params: t.Object({ slug: t.String() }, { additionalProperties: true }) },
    )
    .get("/servers/:slug/properties", ({ params: { slug } }) => minecraft.properties.read(slug), { params: slugParams })
    .patch("/servers/:slug/properties", ({ params: { slug }, body }) => minecraft.properties.update(slug, body), {
      params: slugParams,
      body: t.Record(t.String(), t.String()),
    })
    .get("/servers/:slug/files/:type", ({ params: { slug, type } }) => minecraft.files.list(slug, type), { params: folderParams })
    .post(
      "/servers/:slug/files/:type",
      ({ params: { slug, type }, body }) => minecraft.files.uploadMany(slug, type, uploadedFiles(body)),
      { params: folderParams, body: uploadBody },
    )
    .delete(
      "/servers/:slug/files/:type/:filename",
      ({ params: { slug, type, filename } }) => minecraft.files.remove(slug, type, filename),
      { params: t.Object({ slug: t.String(), type: t.String(), filename: t.String() }) },
    )
    .post(
      "/servers/:slug/files/:type/copy",
      ({ params: { slug, type }, body }) => minecraft.files.copyFromServer(slug, type, body.sourceSlug, body.filename),
      { params: folderParams, body: t.Object({ sourceSlug: t.String(), filename: t.String() }) },
    )
    .get("/servers/:slug/players", ({ params: { slug } }) => minecraft.players.list(slug), { params: slugParams })
    .post("/servers/:slug/players/:uuid/op", ({ params: { slug, uuid } }) => minecraft.players.op(slug, uuid), { params: playerParams })
    .post("/servers/:slug/players/:uuid/deop", ({ params: { slug, uuid } }) => minecraft.players.deop(slug, uuid), { params: playerParams })
    .post(
      "/servers/:slug/players/:uuid/kick",
      ({ params: { slug, uuid }, body }) => minecraft.players.kick(slug, uuid, body.reason),
      { params: playerParams, body: reasonBody },
    )
    .post(
      "/servers/:slug/players/:uuid/ban",
      ({ params: { slug, uuid }, body }) => minecraft.players.ban(slug, uuid, body.reason),
      { params: playerParams, body: reasonBody },
    )
    .post("/servers/:slug/players/:uuid/unban", ({ params: { slug, uuid } }) => minecraft.players.unban(slug, uuid), {
      params: playerParams,
    })
    .get("/servers/:slug/error", ({ params: { slug } }) => minecraft.diagnostics.startupError(slug), { params: slugParams })
    .get("/templates", () => minecraft.templates.list())
    .post("/templates", ({ body }) => minecraft.templates.create(body), {
      body: t.Object({
        name: t.String(),
        slug: t.Optional(t.String()),
        engine: t.Optional(t.String()),
        mcVersion: t.Optional(t.String()),
        properties: t.Optional(t.Record(t.String(), t.String())),
        notes: t.Optional(t.String()),
        javaArgs: t.Optional(t.String()),
      }),
    })
    .get("/templates/:id", ({ params: { id } }) => minecraft.templates.get(id), { params: idParams })
    .delete("/templates/:id", ({ params: { id } }) => minecraft.templates.remove(id), { params: idParams })
    .get("/templates/:id/files/:type", ({ params: { id, type } }) => minecraft.templates.listFiles(id, type), {
      params: templateFolderParams,
    })
    .post(
      "/templates/:id/files/:type",
      ({ params: { id, type }, body }) => minecraft.templates.uploadMany(id, type, uploadedFiles(body)),
      { params: templateFolderParams, body: uploadBody },
    )
    .delete(
      "/templates/:id/files/:type/:filename",
      ({ params: { id, type, filename } }) => minecraft.templates.removeFile(id, type, filename),
      { params: t.Object({ id: t.Numeric(), type: t.String(), filename: t.String() }) },
    )
    .post(
      "/templates/:id/speedrun",
      ({ params: { id }, body }) => minecraft.templates.speedrun(id, body.slug, body.displayName),
      { params: idParams, body: t.Object({ slug: t.String(), displayName: t.String() }) },
    ),
);
