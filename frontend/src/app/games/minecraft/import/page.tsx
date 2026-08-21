"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, McUnregisteredServerScan, McServerInspection } from "@/lib/api";
import { t } from "@/lib/lang";
import {
  FolderDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderSearch,
  Search,
  Check,
  ArrowLeft,
  HardDrive,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JavaMemorySelector } from "@/components/minecraft/JavaMemorySelector";

export default function ImportServerPage() {
  const router = useRouter();
  const [loadingScan, setLoadingScan] = useState(true);
  const [unlinked, setUnlinked] = useState<McUnregisteredServerScan[]>([]);
  const [versions, setVersions] = useState<string[]>([]);

  const [mode, setMode] = useState<"scan" | "custom">("scan");
  const [serverDir, setServerDir] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [inspection, setInspection] = useState<McServerInspection | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [mcVersion, setMcVersion] = useState("");
  const [engine, setEngine] = useState<"vanilla" | "fabric">("vanilla");
  const [javaArgs, setJavaArgs] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const applyInspectionData = useCallback((insp: McServerInspection, fallbackSlug?: string) => {
    const name = insp.detectedDisplayName || insp.folderName;
    setDisplayName(name);
    const calculatedSlug = fallbackSlug || name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32);
    setSlug(calculatedSlug);
    setEngine(insp.detectedEngine || "vanilla");
    if (insp.detectedVersion) {
      setMcVersion(insp.detectedVersion);
    }
  }, []);

  const selectScanItem = useCallback((item: McUnregisteredServerScan) => {
    setServerDir(item.serverDir);
    setInspection(item.inspection);
    applyInspectionData(item.inspection, item.suggestedSlug);
  }, [applyInspectionData]);

  useEffect(() => {
    // Load available versions
    api.minecraft.versions().then((res) => {
      const vList = Array.isArray(res)
        ? res.map((item: string | { id?: string }) => (typeof item === "string" ? item : item?.id || String(item)))
        : [];
      setVersions(vList);
      setMcVersion((prev) => prev || (vList.length > 0 ? vList[0] : ""));
    }).catch(console.error);

    // Scan for unlinked folders in base servers directory
    api.minecraft.import.scan()
      .then((res) => {
        setUnlinked(res);
        if (res.length > 0) {
          selectScanItem(res[0]);
        } else {
          setMode("custom");
        }
      })
      .catch((err) => {
        console.error("Scan failed", err);
        setMode("custom");
      })
      .finally(() => {
        setLoadingScan(false);
      });
  }, [selectScanItem]);

  const handleInspect = async (pathOverride?: string) => {
    const pathToInspect = (pathOverride || serverDir).trim();
    if (!pathToInspect) return;

    setInspecting(true);
    setError("");
    try {
      const res = await api.minecraft.import.inspect(pathToInspect);
      setInspection(res);
      if (res.isValid) {
        applyInspectionData(res);
      } else {
        setError(res.error || t("Invalid server folder"));
      }
    } catch (err: unknown) {
      setError((err as Error).message || t("Invalid server folder"));
      setInspection(null);
    } finally {
      setInspecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !displayName || !mcVersion || !serverDir) {
      setError(t("Please fill in all required fields"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.minecraft.import.submit({
        slug,
        displayName,
        engine,
        mcVersion,
        serverDir,
        javaArgs: javaArgs.trim() || undefined,
      });

      router.push(`/games/minecraft/${slug}`);
    } catch (err: unknown) {
      setError((err as Error).message || t("Server failed to start"));
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
            <FolderDown className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-zinc-100 font-black">{t("Import Server")}</h1>
            <p className="text-xs text-zinc-400">
              {t("Import an existing Minecraft server folder from the host machine")}
            </p>
          </div>
        </div>

        <Link
          href="/games/minecraft"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand/40 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t("Lobby Control")}
        </Link>
      </div>

      {/* Mode Selection Tabs */}
      <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-white/10 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setMode("scan")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
            mode === "scan" ? "bg-brand text-zinc-950 shadow" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <FolderSearch className="size-3.5" />
          {t("Scan servers directory")}
          {unlinked.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${mode === "scan" ? "bg-black/30 text-zinc-950" : "bg-brand/20 text-brand"}`}>
              {unlinked.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
            mode === "custom" ? "bg-brand text-zinc-950 shadow" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <HardDrive className="size-3.5" />
          {t("Custom path")}
        </button>
      </div>

      {/* Discovered / Scan list */}
      {mode === "scan" && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200">{t("Detected unlinked servers")}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLoadingScan(true);
                api.minecraft.import.scan()
                  .then(setUnlinked)
                  .finally(() => setLoadingScan(false));
              }}
              disabled={loadingScan}
              className="text-xs h-7"
            >
              {loadingScan ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
              {t("Search")}
            </Button>
          </div>

          {loadingScan ? (
            <div className="flex items-center justify-center p-8 text-zinc-500 gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs">{t("Inspecting...")}</span>
            </div>
          ) : unlinked.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs bg-black/20 rounded-xl border border-white/5">
              {t("No unlinked servers found in servers directory")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unlinked.map((item) => {
                const isSelected = serverDir === item.serverDir;
                return (
                  <div
                    key={item.serverDir}
                    onClick={() => selectScanItem(item)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-brand/10 border-brand/50 shadow-[0_0_1rem_-0.25rem_rgba(0,227,164,0.3)]"
                        : "bg-black/30 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-sm text-zinc-100">{item.inspection.detectedDisplayName || item.folderName}</p>
                        <p className="text-[11px] font-mono text-zinc-400 truncate max-w-[240px]">{item.folderName}</p>
                      </div>
                      {isSelected && (
                        <div className="size-5 rounded-full bg-brand text-zinc-950 flex items-center justify-center shrink-0">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${item.inspection.detectedEngine === "fabric" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                        {item.inspection.detectedEngine}
                      </span>
                      {item.inspection.detectedVersion && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-800 text-zinc-300 border border-white/5">
                          v{item.inspection.detectedVersion}
                        </span>
                      )}
                      {item.inspection.hasWorld && (
                        <span className="px-2 py-0.5 text-[10px] text-zinc-400 bg-black/40 rounded">
                          World
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Path Input */}
      {mode === "custom" && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 space-y-4">
          <div className="space-y-2">
            <Label>{t("Folder path on server")}</Label>
            <div className="flex gap-2">
              <Input
                value={serverDir}
                onChange={(e) => setServerDir(e.target.value)}
                placeholder={t("e.g. /home/stevo/minecraft/servers/my-server")}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                onClick={() => handleInspect()}
                disabled={inspecting || !serverDir.trim()}
                className="bg-brand text-zinc-950 font-bold hover:bg-brand/90 shrink-0"
              >
                {inspecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    {t("Inspecting...")}
                  </>
                ) : (
                  <>
                    <Search className="size-4 mr-1.5" />
                    {t("Inspect folder")}
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-zinc-500">
              {t("Enter the absolute file system path of the existing Minecraft server folder on your server.")}
            </p>
          </div>
        </div>
      )}

      {/* Inspection Indicators */}
      {inspection && (
        <div className={`p-4 rounded-2xl border space-y-3 ${inspection.isValid ? "bg-emerald-950/20 border-emerald-500/30" : "bg-red-950/20 border-red-500/30"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {inspection.isValid ? (
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-red-400 shrink-0" />
              )}
              <span className={`text-xs font-bold ${inspection.isValid ? "text-emerald-300" : "text-red-300"}`}>
                {inspection.isValid ? t("Valid server folder") : t("Invalid server folder")}
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[280px]">
              {inspection.serverDir}
            </span>
          </div>

          {inspection.isValid && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px]">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <FileCode className="size-3.5 text-brand" />
                <span>{inspection.hasProperties ? t("Properties found") : "Geen properties"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <HardDrive className="size-3.5 text-brand" />
                <span>{inspection.hasWorld ? t("World directory found") : "Geen wereldmap"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Check className="size-3.5 text-brand" />
                <span>{inspection.hasJar ? t("Jar file found") : "Geen .jar"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <ShieldAlert className="size-3.5 text-brand" />
                <span>{inspection.eulaAccepted ? t("EULA accepted") : "EULA auto-accept"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
        <h2 className="text-sm font-bold text-zinc-100 border-b border-white/5 pb-3">
          {t("Configure & Import")}
        </h2>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("Server name")}</Label>
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (!slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32));
                }
              }}
              placeholder="Mijn Minecraft Server"
              maxLength={64}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Server slug")}</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32))}
              placeholder="mijn-server"
              pattern="^[a-z0-9-]{3,32}$"
              minLength={3}
              maxLength={32}
              autoComplete="off"
              required
            />
            <p className="text-[10px] text-zinc-500">{t("Slug must be 3-32 chars, lowercase, hyphens only.")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("Game version")}</Label>
            <Select value={mcVersion} onValueChange={(v) => setMcVersion(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("Game version")} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("Engine")}</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={engine === "vanilla" ? "default" : "outline"}
                onClick={() => setEngine("vanilla")}
                className={`flex-1 ${engine === "vanilla" ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold" : ""}`}
              >
                {t("Vanilla")}
              </Button>
              <Button
                type="button"
                variant={engine === "fabric" ? "default" : "outline"}
                onClick={() => setEngine("fabric")}
                className={`flex-1 ${engine === "fabric" ? "bg-amber-500 hover:bg-amber-600 text-white font-bold" : ""}`}
              >
                {t("Fabric")}
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5">
          <JavaMemorySelector value={javaArgs} onChange={setJavaArgs} engine={engine} />
        </div>

        <div className="space-y-2">
          <Label>{t("Folder path on server")}</Label>
          <Input
            value={serverDir}
            onChange={(e) => setServerDir(e.target.value)}
            placeholder="/path/to/server"
            className="font-mono text-xs"
            required
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5">
          <Button
            type="submit"
            disabled={submitting || !slug || !displayName || !serverDir || !mcVersion}
            className="bg-brand text-zinc-950 font-bold hover:bg-brand/90 px-6"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("Importing server...")}
              </>
            ) : (
              <>
                <FolderDown className="size-4 mr-2" />
                {t("Import Server")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
