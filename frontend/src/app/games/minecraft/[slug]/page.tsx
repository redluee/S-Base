"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, McServer, McServerStatus, McPlayerStat, McBannedPlayer } from "@/lib/api";
import { t } from "@/lib/lang";
import Link from "next/link";
import { Play, Square, RotateCw, Terminal, Users, FileText, Folder, Loader2, Gamepad2, Shield, UserMinus, Ban, ShieldCheck, AlertTriangle, Trash2, ArrowLeft, Copy, Check, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatPlaytime(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "< 1 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}u ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return "< 1 min";
}

export default function ServerDashboardPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const router = useRouter();

  const [server, setServer] = useState<McServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<McServerStatus>({ online: false, playerCount: 0 });
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [cmd, setCmd] = useState("");
  const [players, setPlayers] = useState<{ online: McPlayerStat[]; history: McPlayerStat[]; banned: McBannedPlayer[] }>({ online: [], history: [], banned: [] });
  const [errorLines, setErrorLines] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(true);

  useEffect(() => {
    api.me().then(res => setHasFullAccess(res?.user?.modules?.includes("minecraft") ?? false)).catch(() => {});
  }, []);

  const consoleRef = useRef<HTMLDivElement>(null);

  const handleCopyPath = async () => {
    if (!server?.serverDir) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(server.serverDir);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = server.serverDir;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedPath(true);
      setTimeout(() => {
        setCopiedPath(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy server path:", err);
    }
  };

  const refreshStatus = useCallback(async () => {
    if (!slug || notFound) return;
    try {
      const st = await api.minecraft.servers.status(slug);
      setStatus(st);
      const p = await api.minecraft.servers.players.list(slug);
      setPlayers({
        online: p.online || [],
        history: p.history || [],
        banned: p.banned || [],
      });
      if (st.online) {
        setErrorLines([]);
      } else {
        const err = await api.minecraft.servers.error(slug);
        if (err && Array.isArray(err.lines) && err.lines.length > 0) {
          setErrorLines(err.lines);
        } else {
          setErrorLines([]);
        }
      }
      const c = await api.minecraft.servers.console.get(slug, 100);
      if (c && Array.isArray(c.lines)) {
        setConsoleLines(c.lines);
      }
    } catch {
      // Ignored during background polling
    }
  }, [slug, notFound]);

  useEffect(() => {
    if (!slug) return;

    api.minecraft.servers.get(slug)
      .then((data) => {
        if (!data) {
          setNotFound(true);
        } else {
          setServer(data);
          setNotFound(false);
          refreshStatus();
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });

    const interval = setInterval(refreshStatus, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [slug, refreshStatus]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLines]);

  const handleAction = async (action: "start" | "stop" | "restart") => {
    if (!slug) return;
    setLoadingAction(action);
    try {
      await api.minecraft.servers[action](slug);
      await refreshStatus();
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setLoadingAction("");
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim() || !slug) return;
    try {
      await api.minecraft.servers.console.send(slug, cmd);
      setCmd("");
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const handleBan = async (playerUuid: string, playerName?: string) => {
    if (!slug) return;
    const reason = prompt(t("Ban this player?") + (playerName ? ` (${playerName})` : ""));
    if (reason === null) return;
    try {
      await api.minecraft.servers.players.ban(slug, playerUuid, reason);
      refreshStatus();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const handleUnban = async (uuidOrName: string) => {
    if (!slug) return;
    if (!confirm(t("Unban this player?"))) return;
    try {
      await api.minecraft.servers.players.unban(slug, uuidOrName);
      refreshStatus();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const isBanned = (uuid: string, name?: string) => {
    return players.banned?.some((b) => b.uuid === uuid || (name && b.name?.toLowerCase() === name.toLowerCase()));
  };

  const handleDelete = async () => {
    if (!slug) return;
    const alsoDisk = confirm(t("Also delete files from disk") + "?");
    if (!confirm(t("Delete Server") + " " + slug + "?")) return;
    setDeleting(true);
    try {
      await api.minecraft.servers.delete(slug, alsoDisk);
      router.push("/games/minecraft");
    } catch (e: unknown) {
      alert((e as Error).message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin text-zinc-400" />
        <span>{t("Loading...")}</span>
      </div>
    );
  }

  if (notFound || !server) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12 space-y-6">
        <div className="p-8 rounded-2xl bg-zinc-900 border border-white/10 text-center space-y-4">
          <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-zinc-100">{t("Server not found")}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {t("The requested server does not exist or has been removed.")}
            </p>
          </div>
          <div className="pt-2">
            <Link href="/games/minecraft">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" />
                {t("Back to server overview")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_1.5rem_-0.25rem_rgba(14,165,233,0.4)]">
            <Gamepad2 className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-zinc-100">{server.displayName}</h1>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
              <span>{server.slug}</span>
              <span>•</span>
              <span className="uppercase text-brand font-bold">v{server.mcVersion}</span>
              <span>•</span>
              <span className="uppercase">{server.engine}</span>
              {server.serverDir && (
                <>
                  <span>•</span>
                  <span className="font-mono text-zinc-500 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={server.serverDir}>
                    {server.serverDir}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {server.serverDir && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyPath}
              title={`${t("Copy server path")}: ${server.serverDir}`}
              className="gap-1.5 border-white/10 hover:bg-zinc-800"
            >
              {copiedPath ? (
                <>
                  <Check className="size-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{t("Copied!")}</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>{t("Copy server path")}</span>
                </>
              )}
            </Button>
          )}

          <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${status.online ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-white/10"}`}>
            <div className={`size-2 rounded-full ${status.online ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
            {status.online ? t("Online") : t("Offline")}
          </div>
          
          {status.online ? (
            <>
              {hasFullAccess && (
                <>
                  <Button size="sm" variant="destructive" onClick={() => handleAction("stop")} disabled={!!loadingAction}>
                    {loadingAction === "stop" ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4 mr-1.5 fill-current" />}
                    {t("Stop")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction("restart")} disabled={!!loadingAction}>
                    {loadingAction === "restart" ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4 mr-1.5" />}
                    {t("Restart")}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleAction("start")} disabled={!!loadingAction}>
              {loadingAction === "start" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 mr-1.5 fill-current" />}
              {t("Start")}
            </Button>
          )}

          {hasFullAccess && (
            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20" onClick={handleDelete} disabled={deleting} title={t("Delete Server")}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Link href={`/games/minecraft/${slug}`} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm font-semibold whitespace-nowrap">
          {t("Server Dashboard")}
        </Link>
        {hasFullAccess && (
          <>
            <Link href={`/games/minecraft/${slug}/properties`} className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap border border-white/5">
              <FileText className="size-4" /> {t("Properties")}
            </Link>
            <Link href={`/games/minecraft/${slug}/files`} className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap border border-white/5">
              <Folder className="size-4" /> {t("File Manager")}
            </Link>
          </>
        )}
        {server.hasMap && (
          <Link href={`/games/minecraft/${slug}/map`} className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap border border-white/5">
            <Map className="size-4 text-emerald-400" /> {t("World Map")}
          </Link>
        )}
      </div>

      {/* Crash report alert */}
      {!status.online && errorLines.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
            <AlertTriangle className="size-5" />
            {t("Server failed to start")}
          </div>
          <pre className="text-xs font-mono text-red-300 bg-red-950/50 p-3 rounded-lg overflow-x-auto max-h-40">
            {errorLines.join("\n")}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Console */}
        <div className="lg:col-span-2 flex flex-col h-[500px] rounded-2xl bg-[#0c0c0c] border border-white/10 overflow-hidden shadow-xl">
          <div className="p-3 bg-zinc-900 border-b border-white/10 flex items-center gap-2 text-zinc-400 font-semibold text-sm">
            <Terminal className="size-4" />
            {t("Console")}
          </div>
          <div ref={consoleRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-snug text-zinc-300">
            {consoleLines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">{line}</div>
            ))}
          </div>
          <form onSubmit={handleCommand} className="p-2 bg-zinc-900 border-t border-white/10">
            <Input 
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder={t("Type a command...")}
              className="bg-black/50 border-white/10 font-mono text-sm focus-visible:ring-sky-500"
              disabled={!status.online || !hasFullAccess}
            />
          </form>
        </div>

        {/* Players */}
        <div className="flex flex-col h-[500px] rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden">
          <div className="p-3 bg-zinc-900 border-b border-white/10 flex items-center justify-between text-zinc-400 font-semibold text-sm">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              {t("Players")}
            </div>
            <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{status.playerCount} {t("online")}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {players.online.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                {t("No players online.")}
              </div>
            ) : (
              players.online.map((p) => (
                <div key={`online-${p.playerUuid}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`https://mc-heads.net/avatar/${p.playerName || p.playerUuid}/32`} 
                      alt={p.playerName || "Player"} 
                      className="size-8 rounded bg-zinc-800 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://minotar.net/avatar/${p.playerName || "MHF_Steve"}/32`;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-200 truncate">{p.playerName || p.playerUuid}</div>
                      <div className="text-[10px] text-zinc-500">{formatPlaytime(p.totalPlaytime)} {t("Total playtime")}</div>
                    </div>
                  </div>
                  {hasFullAccess && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="size-7 text-sky-400 hover:bg-sky-500/20" title={t("Op")} onClick={() => api.minecraft.servers.players.op(slug, p.playerUuid)}>
                        <Shield className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-amber-400 hover:bg-amber-500/20" title={t("Kick")} onClick={() => api.minecraft.servers.players.kick(slug, p.playerUuid)}>
                        <UserMinus className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-red-400 hover:bg-red-500/20" title={t("Ban")} onClick={() => handleBan(p.playerUuid, p.playerName)}>
                        <Ban className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {players.history.filter((h) => !players.online.some((o) => o.playerUuid === h.playerUuid) && !isBanned(h.playerUuid, h.playerName)).length > 0 && (
              <>
                <div className="px-2 pt-4 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {t("History")}
                </div>
                {players.history
                  .filter((h) => !players.online.some((o) => o.playerUuid === h.playerUuid) && !isBanned(h.playerUuid, h.playerName))
                  .slice(0, 15)
                  .map((p) => (
                    <div key={`history-${p.playerUuid}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/60 transition-colors group">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`https://mc-heads.net/avatar/${p.playerName || p.playerUuid}/24`} 
                          alt={p.playerName || "Player"} 
                          className="size-6 rounded bg-zinc-800 grayscale shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://minotar.net/avatar/${p.playerName || "MHF_Steve"}/24`;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-300 truncate">{p.playerName || p.playerUuid}</div>
                          <div className="text-[10px] text-zinc-500">
                            {formatPlaytime(p.totalPlaytime)} • {t("Last seen")} {p.lastSeen ? new Date(p.lastSeen).toLocaleString() : "-"}
                          </div>
                        </div>
                      </div>
                      {hasFullAccess && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="size-7 text-red-400 hover:bg-red-500/20" title={t("Ban")} onClick={() => handleBan(p.playerUuid, p.playerName)}>
                            <Ban className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </>
            )}

            {players.banned && players.banned.length > 0 && (
              <>
                <div className="px-2 pt-4 pb-2 text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Ban className="size-3" />
                  {t("Banned Players")} ({players.banned.length})
                </div>
                {players.banned.map((b) => (
                  <div key={`banned-${b.uuid || b.name}`} className="flex items-center justify-between p-2 rounded-lg bg-red-950/20 border border-red-500/20 group">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`https://mc-heads.net/avatar/${b.name || b.uuid}/24`} 
                        alt={b.name} 
                        className="size-6 rounded bg-zinc-800 grayscale shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://minotar.net/avatar/${b.name || "MHF_Steve"}/24`;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-red-200 truncate">{b.name || b.uuid}</div>
                        <div className="text-[10px] text-red-400/80 truncate">{b.reason || t("Banned")}</div>
                      </div>
                    </div>
                    {hasFullAccess && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-emerald-400 hover:bg-emerald-500/20 px-2 flex items-center gap-1 shrink-0"
                        title={t("Unban")}
                        onClick={() => handleUnban(b.uuid || b.name)}
                      >
                        <ShieldCheck className="size-3.5" />
                        <span>{t("Unban")}</span>
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
