import { request } from "./core";
import type {
  McBannedPlayer,
  McPlayerStat,
  McServer,
  McServerInspection,
  McServerStatus,
  McTemplate,
  McUnregisteredServerScan,
} from "./types";

export const minecraftApi = {
  versions: () => request<string[]>("/minecraft/versions"),
  servers: {
    list: () => request<McServer[]>("/minecraft/servers"),
    get: (slug: string) => request<McServer>(`/minecraft/servers/${slug}`),
    create: (data: { slug: string; displayName: string; engine: string; mcVersion: string; javaArgs?: string; templateId?: number }) =>
      request<McServer>("/minecraft/servers", { method: "POST", body: JSON.stringify(data) }),
    update: (slug: string, data: { displayName?: string; javaArgs?: string | null }) =>
      request<McServer>(`/minecraft/servers/${slug}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (slug: string, deleteDisk?: boolean) =>
      request<{ ok: boolean }>(`/minecraft/servers/${slug}${deleteDisk ? "?deleteDisk=true" : ""}`, { method: "DELETE" }),
    start: (slug: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/start`, { method: "POST" }),
    stop: (slug: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/stop`, { method: "POST" }),
    restart: (slug: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/restart`, { method: "POST" }),
    status: (slug: string) => request<McServerStatus>(`/minecraft/servers/${slug}/status`),
    console: {
      get: (slug: string, lines?: number) => request<{ lines: string[] }>(`/minecraft/servers/${slug}/console${lines ? `?lines=${lines}` : ""}`),
      send: (slug: string, command: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/console`, { method: "POST", body: JSON.stringify({ command }) }),
    },
    properties: {
      get: (slug: string) => request<Record<string, string>>(`/minecraft/servers/${slug}/properties`),
      update: (slug: string, props: Record<string, string>) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}/properties`, { method: "PATCH", body: JSON.stringify(props) }),
    },
    map: {
      status: (slug: string) => request<{ hasMap: boolean; webExists: boolean }>(`/minecraft/servers/${slug}/map/status`),
    },
    files: {
      list: (slug: string, type: string) => request<{ name: string; size: number; modified: string }[]>(`/minecraft/servers/${slug}/files/${type}`),
      upload: async (
        slug: string,
        type: string,
        files: File | File[] | FileList,
        onProgress?: (current: number, total: number) => void
      ) => {
        const fileList = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
        if (fileList.length === 0) return { ok: true, count: 0 };

        const concurrency = 3;
        let completed = 0;
        let index = 0;
        const errors: { file: string; error: string }[] = [];

        const uploadSingle = async (file: File) => {
          const formData = new FormData();
          formData.append("files", file);
          try {
            const res = await fetch(`/api/minecraft/servers/${slug}/files/${type}`, {
              method: "POST",
              credentials: "include",
              body: formData,
            });
            if (!res.ok) {
              const errText = await res.text().catch(() => "Upload failed");
              throw new Error(errText);
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Upload failed";
            errors.push({ file: file.name, error: msg });
          } finally {
            completed++;
            onProgress?.(completed, fileList.length);
          }
        };

        const pool: Promise<void>[] = [];
        while (index < fileList.length) {
          while (pool.length < concurrency && index < fileList.length) {
            const file = fileList[index++];
            const p: Promise<void> = uploadSingle(file).then(() => {
              const idx = pool.indexOf(p);
              if (idx !== -1) pool.splice(idx, 1);
            });
            pool.push(p);
          }
          if (pool.length > 0) {
            await Promise.race(pool);
          }
        }
        await Promise.all(pool);

        if (errors.length > 0) {
          if (errors.length === fileList.length) {
            throw new Error(errors.map((e) => `${e.file}: ${e.error}`).join("\n"));
          }
          console.warn("Some files failed to upload:", errors);
        }

        return { ok: true, count: completed - errors.length, errors };
      },
      delete: (slug: string, type: string, filename: string) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}/files/${type}/${encodeURIComponent(filename)}`, { method: "DELETE" }),
      copy: (slug: string, type: string, sourceSlug: string, filename: string) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}/files/${type}/copy`, { method: "POST", body: JSON.stringify({ sourceSlug, filename }) }),
    },
    players: {
      list: (slug: string) => request<{ online: McPlayerStat[]; history: McPlayerStat[]; banned?: McBannedPlayer[] }>(`/minecraft/servers/${slug}/players`),
      op: (slug: string, uuid: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/op`, { method: "POST" }),
      deop: (slug: string, uuid: string) => request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/deop`, { method: "POST" }),
      kick: (slug: string, uuid: string, reason?: string) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/kick`, { method: "POST", body: JSON.stringify({ reason }) }),
      ban: (slug: string, uuid: string, reason?: string) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/ban`, { method: "POST", body: JSON.stringify({ reason }) }),
      unban: (slug: string, uuid: string) =>
        request<{ ok: boolean }>(`/minecraft/servers/${slug}/players/${uuid}/unban`, { method: "POST" }),
    },
    error: (slug: string) => request<{ lines: string[]; crashReport?: string }>(`/minecraft/servers/${slug}/error`),
  },
  templates: {
    list: () => request<McTemplate[]>("/minecraft/templates"),
    get: (id: number) => request<McTemplate>(`/minecraft/templates/${id}`),
    create: (slug: string, name: string, notes?: string) =>
      request<McTemplate>("/minecraft/templates", { method: "POST", body: JSON.stringify({ slug, name, notes }) }),
    createCustom: (data: {
      name: string;
      engine: string;
      mcVersion: string;
      properties?: Record<string, string>;
      notes?: string;
      javaArgs?: string;
    }) => request<McTemplate>("/minecraft/templates", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => request<{ ok: boolean }>(`/minecraft/templates/${id}`, { method: "DELETE" }),
    files: {
      list: (id: number, type: "mods" | "datapacks" | "resourcepacks") =>
        request<{ name: string; size: number; modified: string }[]>(`/minecraft/templates/${id}/files/${type}`),
      upload: async (id: number, type: "mods" | "datapacks" | "resourcepacks", file: File) => {
        const form = new FormData();
        form.append("files", file);
        const res = await fetch(`/api/minecraft/templates/${id}/files/${type}`, {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "Upload failed");
          throw new Error(errText);
        }
        return res.json().catch(() => ({ ok: true }));
      },
      delete: (id: number, type: "mods" | "datapacks" | "resourcepacks", filename: string) =>
        request<{ ok: boolean }>(`/minecraft/templates/${id}/files/${type}/${encodeURIComponent(filename)}`, {
          method: "DELETE",
        }),
    },
    speedrun: (id: number, slug: string, displayName: string) =>
      request<McServer>(`/minecraft/templates/${id}/speedrun`, { method: "POST", body: JSON.stringify({ slug, displayName }) }),
  },
  import: {
    scan: () => request<McUnregisteredServerScan[]>("/minecraft/import/scan"),
    inspect: (serverDir: string) =>
      request<McServerInspection>("/minecraft/import/inspect", {
        method: "POST",
        body: JSON.stringify({ serverDir }),
      }),
    submit: (data: {
      slug: string;
      displayName: string;
      engine: string;
      mcVersion: string;
      serverDir: string;
      javaArgs?: string;
    }) =>
      request<McServer>("/minecraft/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
