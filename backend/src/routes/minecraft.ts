import { Elysia } from "elysia";
import { auth, minecraft, minecraftAuth, requireFullMinecraftAccess } from "../context";

export const minecraftRoutes = new Elysia()
  .group("/api/minecraft", (app) =>
    app
      .use(minecraftAuth)
      .onBeforeHandle((ctx) => {
        const path = new URL(ctx.request.url).pathname;
        const method = ctx.request.method;
        const userId = (ctx as any).userId ?? 0;
        const hasFullAccess = auth.moduleAccessCheck(userId, "minecraft");

        const serverMatch = path.match(/\/api\/minecraft\/servers\/([^\/]+)/);
        if (serverMatch) {
          const slug = serverMatch[1];
          if (!minecraft.canUserAccessServer(userId, slug, hasFullAccess)) {
            return new Response(JSON.stringify({ error: "Forbidden: No access to this server" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        if (method === "GET") return;
        if (path.match(/\/servers\/[^\/]+\/start$/)) return;
        return requireFullMinecraftAccess({ userId });
      })
      .get("/versions", async () => minecraft.listAvailableVersions())
      .get("/import/scan", async () => minecraft.scanUnregisteredServers())
      .post("/import/inspect", async ({ body }) => {
        const { serverDir } = (body ?? {}) as any;
        if (!serverDir) return new Response("Missing serverDir", { status: 400 });
        return minecraft.inspectServerDirectory(serverDir);
      })
      .post("/import", async ({ body }) => {
        const { slug, displayName, engine, mcVersion, serverDir, javaArgs } = (body ?? {}) as any;
        if (!slug || !displayName || !engine || !mcVersion || !serverDir) {
          return new Response("Missing required fields", { status: 400 });
        }
        return minecraft.importServer({ slug, displayName, engine, mcVersion, serverDir, javaArgs });
      })
      .get("/servers", ({ userId }) => {
        const hasFullAccess = auth.moduleAccessCheck(userId, "minecraft");
        return minecraft.listServersForUser(userId, hasFullAccess);
      })
      .post("/servers", async ({ body }) => {
        const { slug, displayName, engine, mcVersion, javaArgs, templateId } = (body ?? {}) as any;
        return minecraft.createServer({ slug, displayName, engine, mcVersion, javaArgs, templateId });
      })
      .get("/servers/:slug", ({ params: { slug } }) => {
        const s = minecraft.getServerDetail(slug);
        if (!s) return new Response("Not Found", { status: 404 });
        return s;
      })
      .patch("/servers/:slug", async ({ params: { slug }, body }) => {
        return minecraft.updateServer(slug, (body ?? {}) as any);
      })
      .delete("/servers/:slug", async ({ params: { slug }, query }) => {
        const deleteDisk = (query as any)?.deleteDisk === "true";
        return minecraft.deleteServer(slug, deleteDisk);
      })
      .post("/servers/:slug/start", async ({ params: { slug } }) => minecraft.startServer(slug))
      .post("/servers/:slug/stop", async ({ params: { slug } }) => minecraft.stopServer(slug))
      .post("/servers/:slug/restart", async ({ params: { slug } }) => minecraft.restartServer(slug))
      .get("/servers/:slug/status", async ({ params: { slug } }) => minecraft.getStatus(slug))
      .get("/servers/:slug/console", async ({ params: { slug }, query }) => {
        const lines = (query as any)?.lines ? Number((query as any).lines) : 100;
        return { lines: await minecraft.getConsoleLogs(slug, lines) };
      })
      .post("/servers/:slug/console", async ({ params: { slug }, body }) => {
        const { command } = (body ?? {}) as { command?: string };
        if (!command) return new Response("Bad Request", { status: 400 });
        await minecraft.sendCommand(slug, command);
        return { ok: true };
      })
      .get("/servers/:slug/map/status", async ({ params: { slug } }) => {
        return minecraft.getMapStatus(slug);
      })
      .get("/servers/:slug/map", async ({ params: { slug } }) => {
        const res = await minecraft.serveMapFile(slug, "index.html");
        if (res.notFound || !res.data) {
          return new Response("World map not found or not yet generated", { status: 404 });
        }
        if (res.status === 403) {
          return new Response("Forbidden", { status: 403 });
        }
        return new Response(res.data, {
          status: res.status || 200,
          headers: res.headers,
        });
      })
      .get("/servers/:slug/map/*", async ({ params: { slug, "*": subpath } }) => {
        const res = await minecraft.serveMapFile(slug, subpath);
        if (res.notFound || !res.data) {
          return new Response("Not Found", { status: 404 });
        }
        if (res.status === 403) {
          return new Response("Forbidden", { status: 403 });
        }
        return new Response(res.data, {
          status: res.status || 200,
          headers: res.headers,
        });
      })
      .get("/servers/:slug/properties", ({ params: { slug } }) => minecraft.readProperties(slug))
      .patch("/servers/:slug/properties", async ({ params: { slug }, body }) => {
        await minecraft.writeProperties(slug, (body ?? {}) as any);
        return { ok: true };
      })
      .get("/servers/:slug/files/:type", ({ params: { slug, type } }) => minecraft.listFiles(slug, type))
      .post("/servers/:slug/files/:type", async ({ params: { slug, type }, body }) => {
        const bodyObj = (body ?? {}) as Record<string, any>;
        const rawFiles = [
          ...(Array.isArray(bodyObj.files) ? bodyObj.files : bodyObj.files ? [bodyObj.files] : []),
          ...(Array.isArray(bodyObj.file) ? bodyObj.file : bodyObj.file ? [bodyObj.file] : []),
        ];
        const files = rawFiles.filter((f): f is File => !!f && typeof f.name === "string" && typeof f.arrayBuffer === "function");
        if (files.length === 0) return new Response("No files provided", { status: 400 });
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          await minecraft.uploadFile(slug, type, file.name, buffer);
        }
        return { ok: true, count: files.length };
      })
      .delete("/servers/:slug/files/:type/:filename", async ({ params: { slug, type, filename } }) => {
        await minecraft.deleteFile(slug, type, filename);
        return { ok: true };
      })
      .post("/servers/:slug/files/:type/copy", async ({ params: { slug, type }, body }) => {
        const { sourceSlug, filename } = (body ?? {}) as any;
        await minecraft.copyFileFromServer(slug, type, sourceSlug, filename);
        return { ok: true };
      })
      .get("/servers/:slug/players", async ({ params: { slug } }) => minecraft.getPlayers(slug))
      .post("/servers/:slug/players/:uuid/op", async ({ params: { slug, uuid } }) => {
        const player = minecraft.getPlayerName(slug, uuid);
        await minecraft.opPlayer(slug, player);
        return { ok: true };
      })
      .post("/servers/:slug/players/:uuid/deop", async ({ params: { slug, uuid } }) => {
        const player = minecraft.getPlayerName(slug, uuid);
        await minecraft.deopPlayer(slug, player);
        return { ok: true };
      })
      .post("/servers/:slug/players/:uuid/kick", async ({ params: { slug, uuid }, body }) => {
        const { reason } = (body ?? {}) as any;
        const player = minecraft.getPlayerName(slug, uuid);
        await minecraft.kickPlayer(slug, player, reason);
        return { ok: true };
      })
      .post("/servers/:slug/players/:uuid/ban", async ({ params: { slug, uuid }, body }) => {
        const { reason } = (body ?? {}) as any;
        const player = minecraft.getPlayerName(slug, uuid);
        await minecraft.banPlayer(slug, player, reason);
        return { ok: true };
      })
      .post("/servers/:slug/players/:uuid/unban", async ({ params: { slug, uuid } }) => {
        await minecraft.unbanPlayer(slug, uuid);
        return { ok: true };
      })
      .get("/servers/:slug/error", ({ params: { slug } }) => minecraft.getStartupError(slug))
      .get("/templates", () => minecraft.listTemplates())
      .post("/templates", async ({ body }) => {
        const bodyObj = (body ?? {}) as any;
        if (bodyObj.slug) {
          return minecraft.saveAsTemplate(bodyObj.slug, bodyObj.name, bodyObj.notes);
        }
        return minecraft.createCustomTemplate({
          name: bodyObj.name,
          engine: bodyObj.engine,
          mcVersion: bodyObj.mcVersion,
          properties: bodyObj.properties,
          notes: bodyObj.notes,
          javaArgs: bodyObj.javaArgs,
        });
      })
      .get("/templates/:id", ({ params: { id } }) => {
        const t = minecraft.getTemplate(Number(id));
        if (!t) return new Response("Not Found", { status: 404 });
        return t;
      })
      .delete("/templates/:id", async ({ params: { id } }) => minecraft.deleteTemplate(Number(id)))
      .get("/templates/:id/files/:type", ({ params: { id, type } }) => minecraft.listTemplateFiles(Number(id), type))
      .post("/templates/:id/files/:type", async ({ params: { id, type }, body }) => {
        const bodyObj = (body ?? {}) as Record<string, any>;
        const rawFiles = [
          ...(Array.isArray(bodyObj.files) ? bodyObj.files : bodyObj.files ? [bodyObj.files] : []),
          ...(Array.isArray(bodyObj.file) ? bodyObj.file : bodyObj.file ? [bodyObj.file] : []),
        ];
        const files = rawFiles.filter((f): f is File => !!f && typeof f.name === "string" && typeof f.arrayBuffer === "function");
        if (files.length === 0) return new Response("No files provided", { status: 400 });
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          await minecraft.uploadTemplateFile(Number(id), type, file.name, buffer);
        }
        return { ok: true, count: files.length };
      })
      .delete("/templates/:id/files/:type/:filename", async ({ params: { id, type, filename } }) => {
        await minecraft.deleteTemplateFile(Number(id), type, filename);
        return { ok: true };
      })
      .post("/templates/:id/speedrun", async ({ params: { id }, body }) => {
        const { slug, displayName } = (body ?? {}) as any;
        return minecraft.speedrunFromTemplate(Number(id), slug, displayName);
      })
  );
