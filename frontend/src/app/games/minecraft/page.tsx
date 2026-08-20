import { serverApi, getCurrentUser } from "@/lib/server-api";
import { type McServer } from "@/lib/api";
import { t } from "@/lib/lang";
import Link from "next/link";
import { Gamepad2, Plus, Box, FolderDown } from "lucide-react";

export default async function MinecraftPage() {
  let servers: McServer[] = [];
  try {
    servers = await serverApi.minecraft.servers.list();
  } catch (error) {
    console.error("Failed to load servers", error);
  }

  const user = await getCurrentUser();
  const hasFullAccess = user?.modules?.includes("minecraft") ?? false;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-4xl text-brand font-black">{t("Lobby Control")}</h1>
        {hasFullAccess && (
          <div className="flex items-center gap-3">
            <Link
              href="/games/minecraft/import"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 transition-colors text-sm font-semibold text-zinc-200"
            >
              <FolderDown className="size-4 text-brand" />
              {t("Import Server")}
            </Link>
            <Link
              href="/games/minecraft/templates"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 transition-colors text-sm font-semibold text-zinc-200"
            >
              <Box className="size-4" />
              {t("Templates")}
            </Link>
            <Link
              href="/games/minecraft/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-zinc-950 font-bold hover:bg-brand/90 transition-colors text-sm"
            >
              <Plus className="size-4" />
              {t("New Server")}
            </Link>
          </div>
        )}
      </div>

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/50 border border-white/10 rounded-2xl text-center">
          <Gamepad2 className="size-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 font-medium">
            {hasFullAccess
              ? t("No servers yet.")
              : t("Je hebt momenteel geen toegang tot specifieke servers. Neem contact op met de beheerder.")}
          </p>
          {hasFullAccess && (
            <div className="flex items-center gap-3 mt-3">
              <Link href="/games/minecraft/new" className="text-brand hover:underline text-sm font-semibold">
                {t("Create your first server")}
              </Link>
              <span className="text-zinc-600">•</span>
              <Link href="/games/minecraft/import" className="text-brand hover:underline text-sm font-semibold">
                {t("Import Server")}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <Link
              key={server.slug}
              href={`/games/minecraft/${server.slug}`}
              className="group relative flex flex-col p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 via-zinc-900/80 to-cyan-950/30 backdrop-blur-md border border-white/10 hover:border-sky-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_2rem_-0.5rem_rgba(14,165,233,0.25)]"
            >
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_1rem_-0.25rem_rgba(14,165,233,0.4)]">
                    <Gamepad2 className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-zinc-100 group-hover:text-sky-400 transition-colors">
                      {server.displayName}
                    </h2>
                    <p className="text-xs text-zinc-400">{server.slug}</p>
                  </div>
                </div>
                {/* Status indicator (neutral in server comp) */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-300 border border-white/5">
                  <div className="size-1.5 rounded-full bg-zinc-500" />
                  {t("Online")}/{t("Offline")}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto relative z-10">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${server.engine === 'fabric' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {server.engine === 'fabric' ? t("Fabric") : t("Vanilla")}
                </span>
                <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-zinc-800 text-zinc-300 border border-white/5">
                  v{server.mcVersion}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
