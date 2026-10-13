"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Loader2, Save, FileText, ArrowLeft, Search, Plus, Trash2, Settings, Swords, Globe, Gauge, Sliders, CheckCircle2, X, Lock, AlertTriangle, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LIVE_PROPERTIES, KNOWN_KEYS, type TabKey } from "./constants";
import { GeneralSection } from "./sections/GeneralSection";
import { GameplaySection } from "./sections/GameplaySection";
import { WorldSection } from "./sections/WorldSection";
import { PerformanceSection } from "./sections/PerformanceSection";
import { CustomSection } from "./sections/CustomSection";

export default function PropertiesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const router = useRouter();

  const [props, setProps] = useState<Record<string, string>>({});
  const [javaArgs, setJavaArgs] = useState<string>("");
  const [serverEngine, setServerEngine] = useState<string>("vanilla");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(true);

  // Custom key/value inputs
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    api.me().then(res => setHasFullAccess(res?.user?.modules?.includes("minecraft") ?? false)).catch(() => {});
  }, []);

  const handleDeleteServer = async () => {
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

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.minecraft.servers.properties.get(slug),
      api.minecraft.servers.get(slug).catch(() => null),
      api.minecraft.servers.status(slug).catch(() => ({ online: false })),
    ])
      .then(([propsRes, serverRes, statusRes]) => {
        setProps(propsRes || {});
        if (serverRes) {
          setJavaArgs(serverRes.javaArgs || "");
          setServerEngine(serverRes.engine || "vanilla");
        }
        setIsRunning(Boolean(statusRes?.online));
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [slug]);

  const handleChange = (key: string, val: string) => {
    if (isRunning && !LIVE_PROPERTIES.has(key)) return;
    setProps((prev) => ({ ...prev, [key]: val }));
    setSaveSuccess(false);
  };

  const handleToggle = async (key: string, val: string) => {
    if (isRunning && !LIVE_PROPERTIES.has(key)) return;
    const nextProps = { ...props, [key]: val };
    setProps(nextProps);
    setSaveSuccess(false);
    if (!slug) return;
    try {
      await api.minecraft.servers.properties.update(slug, nextProps);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e: unknown) {
      console.error(e);
      alert((e as Error).message);
    }
  };

  const handleRemoveKey = (key: string) => {
    if (isRunning) return;
    setProps((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSaveSuccess(false);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;
    const cleanKey = newKey.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleanKey) return;
    handleChange(cleanKey, newVal.trim());
    setNewKey("");
    setNewVal("");
  };

  const handleSave = async () => {
    if (!slug) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await Promise.all([
        api.minecraft.servers.properties.update(slug, props),
        !isRunning ? api.minecraft.servers.update(slug, { javaArgs: javaArgs.trim() || null }) : Promise.resolve(),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const customKeys = useMemo(() => {
    return Object.keys(props).filter((k) => !KNOWN_KEYS.has(k));
  }, [props]);

  const matchesSearch = (key: string, label: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return key.toLowerCase().includes(q) || label.toLowerCase().includes(q) || (props[key] || "").toLowerCase().includes(q);
  };

  const renderStatusBadge = (key: string) => {
    if (LIVE_PROPERTIES.has(key)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <Radio className="size-3 animate-pulse" />
          Live Command
        </span>
      );
    }
    if (isRunning) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded border border-white/5">
          <Lock className="size-3" />
          Requires Server Stop
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="size-8 animate-spin text-brand" />
        <span className="text-sm font-medium">Loading properties...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/games/minecraft/${slug}`}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors border border-white/10"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-black text-zinc-100 flex items-center gap-2.5">
              <FileText className="size-6 text-brand" />
              Properties
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{slug}/server.properties</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg animate-in fade-in">
              <CheckCircle2 className="size-4" />
              Saved successfully!
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand text-zinc-950 font-bold hover:bg-brand/90 flex-1 sm:flex-initial"
          >
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            Save Properties
          </Button>
        </div>
      </div>

      {/* Running server notice */}
      {isRunning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
          <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold text-amber-200">Server is running</p>
            <p className="mt-0.5 text-amber-300/80">
              The server is active. Only dynamic properties (Game Mode, Difficulty, Whitelist, Idle Timeout, Fire Tick) can be modified in real-time via console commands. Stop the server to edit other properties.
            </p>
          </div>
        </div>
      )}

      {/* Navigation & Search toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-zinc-900 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "all"
                ? "bg-brand text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Sliders className="size-3.5" />
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "general"
                ? "bg-brand text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Settings className="size-3.5" />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gameplay")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "gameplay"
                ? "bg-brand text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Swords className="size-3.5" />
            Gameplay
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("world")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "world"
                ? "bg-brand text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Globe className="size-3.5" />
            World & Generation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("performance")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "performance"
                ? "bg-brand text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Gauge className="size-3.5" />
            Performance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "custom"
                ? "bg-brand text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Plus className="size-3.5" />
            Custom Properties ({customKeys.length})
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search properties..."
            className="pl-9 pr-8 h-9 text-xs bg-black/40 border-white/10 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label={t("Sluiten")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Section 1: General & Network */}
        <GeneralSection activeTab={activeTab} props={props} isRunning={isRunning} handleChange={handleChange} handleToggle={handleToggle} matchesSearch={matchesSearch} renderStatusBadge={renderStatusBadge} />

        {/* Section 2: Gameplay & Rules */}
        <GameplaySection activeTab={activeTab} props={props} isRunning={isRunning} handleChange={handleChange} handleToggle={handleToggle} matchesSearch={matchesSearch} renderStatusBadge={renderStatusBadge} />

        {/* Section 3: World & Generation */}
        <WorldSection activeTab={activeTab} props={props} isRunning={isRunning} handleChange={handleChange} handleToggle={handleToggle} matchesSearch={matchesSearch} renderStatusBadge={renderStatusBadge} />

        {/* Section 4: Performance & Memory */}
        <PerformanceSection activeTab={activeTab} props={props} isRunning={isRunning} handleChange={handleChange} matchesSearch={matchesSearch} renderStatusBadge={renderStatusBadge} javaArgs={javaArgs} setJavaArgs={setJavaArgs} setSaveSuccess={setSaveSuccess} serverEngine={serverEngine} />

        {/* Section 5: Custom Properties */}
        <CustomSection activeTab={activeTab} props={props} isRunning={isRunning} handleChange={handleChange} matchesSearch={matchesSearch} renderStatusBadge={renderStatusBadge} customKeys={customKeys} handleAddCustom={handleAddCustom} handleRemoveKey={handleRemoveKey} newKey={newKey} setNewKey={setNewKey} newVal={newVal} setNewVal={setNewVal} />

        {/* Section: Danger Zone */}
        {hasFullAccess && (
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-rose-500/20">
              <AlertTriangle className="size-5 text-rose-400" />
              <div>
                <h2 className="font-display text-lg font-bold text-rose-200">{t("Danger Zone")}</h2>
                <p className="text-xs text-rose-300/70">
                  {t("Irreversible actions that affect this server.")}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-zinc-200">{t("Delete Server")}</p>
                <p className="text-xs text-zinc-400">
                  {t("Permanently remove this server from the overview and optionally delete world and configuration files.")}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteServer}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold shrink-0 gap-2"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("Delete Server")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
