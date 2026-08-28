"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { api, McServer, McServerStatus } from "@/lib/api";
import { t } from "@/lib/lang";
import Link from "next/link";
import {
  ArrowLeft,
  Map as MapIcon,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCw,
  Loader2,
  Play,
  FileText,
  Folder,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorldMapPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const [server, setServer] = useState<McServer | null>(null);
  const [status, setStatus] = useState<McServerStatus>({ online: false, playerCount: 0 });
  const [mapStatus, setMapStatus] = useState<{ hasMap: boolean; webExists: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [startingServer, setStartingServer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.me()
      .then((res) => setHasFullAccess(res?.user?.modules?.includes("minecraft") ?? false))
      .catch(() => {});
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!slug || notFound) return;
    try {
      const [st, mSt] = await Promise.all([
        api.minecraft.servers.status(slug).catch(() => null),
        api.minecraft.servers.map.status(slug).catch(() => null),
      ]);
      if (st) setStatus(st);
      if (mSt) setMapStatus(mSt);
    } catch {
      // Ignored during background polling
    }
  }, [slug, notFound]);

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      api.minecraft.servers.get(slug).catch(() => null),
      api.minecraft.servers.status(slug).catch(() => ({ online: false, playerCount: 0 })),
      api.minecraft.servers.map.status(slug).catch(() => ({ hasMap: false, webExists: false })),
    ])
      .then(([srv, st, mSt]) => {
        if (!srv) {
          setNotFound(true);
        } else {
          setServer(srv);
          setStatus(st);
          setMapStatus(mSt);
          setNotFound(false);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });

    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [slug, refreshStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleRefreshMap = () => {
    setIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleStartServer = async () => {
    if (!slug) return;
    setStartingServer(true);
    try {
      await api.minecraft.servers.start(slug);
      await refreshStatus();
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setStartingServer(false);
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

  const mapUrl = `/api/minecraft/servers/${slug}/map/`;

  return (
    <div className={`space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-black p-0 m-0 overflow-hidden" : "p-4 sm:p-6 max-w-7xl mx-auto"}`}>
      {/* Top Bar / Header */}
      {!isFullscreen && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-white/10">
            <div className="flex items-center gap-4">
              <Link
                href={`/games/minecraft/${slug}`}
                className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-100 transition-colors border border-white/5"
                title={t("Back to server overview")}
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div>
                <h1 className="font-display text-2xl font-black text-zinc-100 flex items-center gap-2.5">
                  <MapIcon className="size-6 text-emerald-400" />
                  {t("World Map")}
                </h1>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                  <span>{server.displayName}</span>
                  <span>•</span>
                  <span className="font-mono text-zinc-500">{server.slug}</span>
                  <span>•</span>
                  <span className="uppercase text-brand font-bold">v{server.mcVersion}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  status.online
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border border-white/10"
                }`}
              >
                <div className={`size-2 rounded-full ${status.online ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                {status.online ? `${status.playerCount} ${t("players online")}` : t("Offline")}
              </div>

              {mapStatus?.webExists && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshMap}
                    className="gap-1.5 border-white/10 hover:bg-zinc-800"
                    title={t("Restart")}
                  >
                    <RotateCw className="size-3.5" />
                  </Button>

                  <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 border-white/10 hover:bg-zinc-800">
                      <ExternalLink className="size-3.5" />
                      <span>{t("Open in new tab")}</span>
                    </Button>
                  </a>

                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 font-semibold"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="size-3.5" />
                    <span>{t("Fullscreen")}</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Link
              href={`/games/minecraft/${slug}`}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold whitespace-nowrap border border-white/5"
            >
              {t("Server Dashboard")}
            </Link>
            {hasFullAccess && (
              <>
                <Link
                  href={`/games/minecraft/${slug}/properties`}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap border border-white/5"
                >
                  <FileText className="size-4" /> {t("Properties")}
                </Link>
                <Link
                  href={`/games/minecraft/${slug}/files`}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap border border-white/5"
                >
                  <Folder className="size-4" /> {t("File Manager")}
                </Link>
              </>
            )}
            <Link
              href={`/games/minecraft/${slug}/map`}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm font-semibold flex items-center gap-2 whitespace-nowrap border border-emerald-500/20"
            >
              <MapIcon className="size-4 text-emerald-400" /> {t("World Map")}
            </Link>
          </div>
        </>
      )}

      {/* Main Map Viewer Area */}
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? "relative w-full h-full flex flex-col bg-black"
            : "relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0c0c0c] flex flex-col h-[calc(100vh-210px)] min-h-[550px]"
        }
      >
        {/* Floating controls in fullscreen mode */}
        {isFullscreen && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-2xl">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefreshMap}
              className="h-8 px-2.5 text-zinc-300 hover:text-white"
            >
              <RotateCw className="size-4" />
            </Button>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 px-2.5 text-zinc-300 hover:text-white gap-1.5">
                <ExternalLink className="size-4" />
                <span className="text-xs">{t("Open in new tab")}</span>
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(false)}
              className="h-8 px-3 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/10 gap-1.5"
            >
              <Minimize2 className="size-4" />
              <span>{t("Exit Fullscreen")}</span>
            </Button>
          </div>
        )}

        {mapStatus?.webExists ? (
          <div className="relative w-full h-full flex-1">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 backdrop-blur-sm text-zinc-400">
                <Loader2 className="size-8 animate-spin text-emerald-400" />
                <span className="text-sm font-medium">{t("Loading...")}</span>
              </div>
            )}
            <iframe
              key={iframeKey}
              src={mapUrl}
              className="w-full h-full border-0 block"
              title={`${server.displayName} ${t("World Map")}`}
              onLoad={() => setIframeLoading(false)}
              allow="fullscreen"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
            <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MapIcon className="size-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="font-display text-xl font-bold text-zinc-100">{t("World Map")}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {t("The world map is not generated yet. Start the server with the Pl3xMap mod to generate the map.")}
              </p>
            </div>
            {!status.online && (
              <div className="pt-2">
                <Button
                  onClick={handleStartServer}
                  disabled={startingServer}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2"
                >
                  {startingServer ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
                  {t("Start")} Server
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
