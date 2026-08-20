"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Loader2,
  Save,
  FileText,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Settings,
  Swords,
  Gamepad2,
  Globe,
  Gauge,
  Sliders,
  CheckCircle2,
  X,
  Lock,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

type TabKey = "all" | "general" | "gameplay" | "world" | "performance" | "custom";

const LIVE_PROPERTIES = new Set(["difficulty", "gamemode", "white-list", "player-idle-timeout", "do-fire-tick", "doFireTick"]);

const KNOWN_KEYS = new Set([
  // General
  "motd",
  "server-port",
  "max-players",
  "online-mode",
  "white-list",
  "enforce-whitelist",
  "hide-online-players",
  "server-ip",
  "enable-status",
  // Gameplay
  "gamemode",
  "force-gamemode",
  "difficulty",
  "hardcore",
  "pvp",
  "allow-flight",
  "enable-command-block",
  "do-fire-tick",
  "doFireTick",
  // World
  "level-name",
  "level-seed",
  "level-type",
  "generate-structures",
  "allow-nether",
  "spawn-monsters",
  "spawn-animals",
  "spawn-npcs",
  "spawn-protection",
  "max-world-size",
  // Performance
  "view-distance",
  "simulation-distance",
  "player-idle-timeout",
  "entity-broadcast-range-percentage",
  "sync-chunk-writes",
  "network-compression-threshold",
]);

export default function PropertiesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const [props, setProps] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom key/value inputs
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.minecraft.servers.properties.get(slug),
      api.minecraft.servers.status(slug).catch(() => ({ online: false })),
    ])
      .then(([propsRes, statusRes]) => {
        setProps(propsRes || {});
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
      await api.minecraft.servers.properties.update(slug, props);
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
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Section 1: General & Network */}
        {(activeTab === "all" || activeTab === "general") && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <Settings className="size-5 text-sky-400" />
              <h2 className="font-display text-lg font-bold text-zinc-100">General & Network</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matchesSearch("motd", "Message of the Day (MOTD)") && (
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Message of the Day (MOTD)</Label>
                    {renderStatusBadge("motd")}
                  </div>
                  <Input
                    value={props["motd"] ?? "A Minecraft Server"}
                    onChange={(e) => handleChange("motd", e.target.value)}
                    disabled={isRunning}
                    maxLength={128}
                    placeholder="A Minecraft Server"
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">motd</p>
                </div>
              )}

              {matchesSearch("server-port", "Server Port") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Server Port</Label>
                    {renderStatusBadge("server-port")}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    step={1}
                    inputMode="numeric"
                    value={props["server-port"] ?? "25565"}
                    onChange={(e) => handleChange("server-port", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">server-port (1-65535)</p>
                </div>
              )}

              {matchesSearch("max-players", "Max Players") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Max Players</Label>
                    {renderStatusBadge("max-players")}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={99999}
                    step={1}
                    inputMode="numeric"
                    value={props["max-players"] ?? "20"}
                    onChange={(e) => handleChange("max-players", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">max-players (1-99999)</p>
                </div>
              )}

              {matchesSearch("online-mode", "Offline Mode (online-mode=false)") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Offline Mode</Label>
                      {renderStatusBadge("online-mode")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow cracked / unauthenticated clients (online-mode=false)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">online-mode={props["online-mode"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["online-mode"] === "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("online-mode", v ? "false" : "true")}
                  />
                </div>
              )}

              {matchesSearch("white-list", "Whitelist") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Whitelist</Label>
                      {renderStatusBadge("white-list")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Restrict server access to whitelisted players</p>
                    <p className="text-[10px] text-zinc-500 font-mono">white-list={props["white-list"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["white-list"] === "true"}
                    onCheckedChange={(v) => handleToggle("white-list", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("enforce-whitelist", "Enforce Whitelist") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Enforce Whitelist</Label>
                      {renderStatusBadge("enforce-whitelist")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Kick non-whitelisted players when whitelist is reloaded</p>
                    <p className="text-[10px] text-zinc-500 font-mono">enforce-whitelist={props["enforce-whitelist"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["enforce-whitelist"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("enforce-whitelist", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("hide-online-players", "Hide Online Players") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Hide Online Players</Label>
                      {renderStatusBadge("hide-online-players")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Do not display player names in server list status</p>
                    <p className="text-[10px] text-zinc-500 font-mono">hide-online-players={props["hide-online-players"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["hide-online-players"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("hide-online-players", v ? "true" : "false")}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Gameplay & Rules */}
        {(activeTab === "all" || activeTab === "gameplay") && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
            <h2 className="text-base font-bold text-zinc-200 flex items-center gap-2">
              <Gamepad2 className="size-5 text-brand" />
              Gameplay & Rules
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchesSearch("gamemode", "Game Mode") && (
                <div className="space-y-1.5 p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Game Mode</Label>
                    {renderStatusBadge("gamemode")}
                  </div>
                  <Select
                    value={props["gamemode"] || "survival"}
                    onValueChange={(v) => handleChange("gamemode", v ?? "survival")}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="survival">Survival</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="spectator">Spectator</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-zinc-500 font-mono">gamemode</p>
                </div>
              )}

              {matchesSearch("difficulty", "Difficulty") && (
                <div className="space-y-1.5 p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Difficulty</Label>
                    {renderStatusBadge("difficulty")}
                  </div>
                  <Select
                    value={props["difficulty"] || "normal"}
                    onValueChange={(v) => handleChange("difficulty", v ?? "normal")}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peaceful">Peaceful</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-zinc-500 font-mono">difficulty</p>
                </div>
              )}

              {matchesSearch("hardcore", "Hardcore Mode") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Hardcore Mode</Label>
                      {renderStatusBadge("hardcore")}
                    </div>
                    <p className="text-[11px] text-zinc-400">One life only; players cannot respawn in survival</p>
                    <p className="text-[10px] text-zinc-500 font-mono">hardcore={props["hardcore"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["hardcore"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("hardcore", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("pvp", "PvP Combat") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">PvP Combat</Label>
                      {renderStatusBadge("pvp")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Enable player vs player combat</p>
                    <p className="text-[10px] text-zinc-500 font-mono">pvp={props["pvp"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["pvp"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("pvp", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("allow-flight", "Allow Flight") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Allow Flight</Label>
                      {renderStatusBadge("allow-flight")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow players to fly in survival mode if enabled by mods/abilities</p>
                    <p className="text-[10px] text-zinc-500 font-mono">allow-flight={props["allow-flight"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["allow-flight"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("allow-flight", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("enable-command-block", "Enable Command Blocks") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Enable Command Blocks</Label>
                      {renderStatusBadge("enable-command-block")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow execution of command blocks</p>
                    <p className="text-[10px] text-zinc-500 font-mono">enable-command-block={props["enable-command-block"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["enable-command-block"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("enable-command-block", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("force-gamemode", "Force Gamemode") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Force Gamemode</Label>
                      {renderStatusBadge("force-gamemode")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Force players to join in the default game mode</p>
                    <p className="text-[10px] text-zinc-500 font-mono">force-gamemode={props["force-gamemode"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["force-gamemode"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("force-gamemode", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("do-fire-tick", "Fire Tick (doFireTick)") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Fire Tick</Label>
                      {renderStatusBadge("do-fire-tick")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow fire to spread and naturally extinguish (gamerule doFireTick)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">do-fire-tick={(props["do-fire-tick"] ?? props["doFireTick"]) !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={(props["do-fire-tick"] ?? props["doFireTick"]) !== "false"}
                    onCheckedChange={(v) => handleToggle("do-fire-tick", v ? "true" : "false")}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: World & Generation */}
        {(activeTab === "all" || activeTab === "world") && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <Globe className="size-5 text-emerald-400" />
              <h2 className="font-display text-lg font-bold text-zinc-100">World & Generation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matchesSearch("level-name", "World Name") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">World Name</Label>
                    {renderStatusBadge("level-name")}
                  </div>
                  <Input
                    value={props["level-name"] ?? "world"}
                    maxLength={64}
                    onChange={(e) => handleChange("level-name", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">level-name</p>
                </div>
              )}

              {matchesSearch("level-seed", "World Seed") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">World Seed</Label>
                    {renderStatusBadge("level-seed")}
                  </div>
                  <Input
                    value={props["level-seed"] ?? ""}
                    maxLength={64}
                    onChange={(e) => handleChange("level-seed", e.target.value)}
                    disabled={isRunning}
                    placeholder="Random"
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">level-seed</p>
                </div>
              )}

              {matchesSearch("level-type", "World Type") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">World Type</Label>
                    {renderStatusBadge("level-type")}
                  </div>
                  <Select
                    value={props["level-type"] || "minecraft:normal"}
                    onValueChange={(v) => handleChange("level-type", v ?? "minecraft:normal")}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 disabled:opacity-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minecraft:normal">Default (normal)</SelectItem>
                      <SelectItem value="minecraft:flat">Flat</SelectItem>
                      <SelectItem value="minecraft:large_biomes">Large Biomes</SelectItem>
                      <SelectItem value="minecraft:amplified">Amplified</SelectItem>
                      <SelectItem value="minecraft:single_biome_surface">Single Biome</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-zinc-500 font-mono">level-type</p>
                </div>
              )}

              {matchesSearch("spawn-protection", "Spawn Protection (blocks)") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Spawn Protection (blocks)</Label>
                    {renderStatusBadge("spawn-protection")}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    inputMode="numeric"
                    value={props["spawn-protection"] ?? "16"}
                    onChange={(e) => handleChange("spawn-protection", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-400">Radius in blocks around spawn where non-ops cannot place or break blocks</p>
                </div>
              )}

              {matchesSearch("generate-structures", "Generate Structures") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Generate Structures</Label>
                      {renderStatusBadge("generate-structures")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Generate structures (villages, dungeons, temples, etc.)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">generate-structures={props["generate-structures"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["generate-structures"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("generate-structures", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("allow-nether", "Allow Nether") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Allow Nether</Label>
                      {renderStatusBadge("allow-nether")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Enable portals and the Nether dimension</p>
                    <p className="text-[10px] text-zinc-500 font-mono">allow-nether={props["allow-nether"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["allow-nether"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("allow-nether", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("spawn-monsters", "Spawn Monsters") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Spawn Monsters</Label>
                      {renderStatusBadge("spawn-monsters")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow hostile monsters to spawn naturally</p>
                    <p className="text-[10px] text-zinc-500 font-mono">spawn-monsters={props["spawn-monsters"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["spawn-monsters"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("spawn-monsters", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("spawn-animals", "Spawn Animals") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Spawn Animals</Label>
                      {renderStatusBadge("spawn-animals")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow passive animals to spawn naturally</p>
                    <p className="text-[10px] text-zinc-500 font-mono">spawn-animals={props["spawn-animals"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["spawn-animals"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("spawn-animals", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("spawn-npcs", "Spawn NPCs (Villagers)") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-zinc-200 cursor-pointer">Spawn NPCs (Villagers)</Label>
                      {renderStatusBadge("spawn-npcs")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow NPC villagers to spawn in villages</p>
                    <p className="text-[10px] text-zinc-500 font-mono">spawn-npcs={props["spawn-npcs"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    checked={props["spawn-npcs"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("spawn-npcs", v ? "true" : "false")}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Performance & View Distance */}
        {(activeTab === "all" || activeTab === "performance") && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <Gauge className="size-5 text-indigo-400" />
              <h2 className="font-display text-lg font-bold text-zinc-100">Performance & View Distance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matchesSearch("view-distance", "View Distance (chunks)") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">View Distance (chunks)</Label>
                    {renderStatusBadge("view-distance")}
                  </div>
                  <Input
                    type="number"
                    min={3}
                    max={32}
                    step={1}
                    inputMode="numeric"
                    value={props["view-distance"] ?? "10"}
                    onChange={(e) => handleChange("view-distance", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">view-distance (3-32)</p>
                </div>
              )}

              {matchesSearch("simulation-distance", "Simulation Distance (chunks)") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Simulation Distance (chunks)</Label>
                    {renderStatusBadge("simulation-distance")}
                  </div>
                  <Input
                    type="number"
                    min={3}
                    max={32}
                    step={1}
                    inputMode="numeric"
                    value={props["simulation-distance"] ?? "10"}
                    onChange={(e) => handleChange("simulation-distance", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">simulation-distance (3-32)</p>
                </div>
              )}

              {matchesSearch("player-idle-timeout", "Player Idle Timeout (min)") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Player Idle Timeout (min)</Label>
                    {renderStatusBadge("player-idle-timeout")}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={1440}
                    step={1}
                    inputMode="numeric"
                    value={props["player-idle-timeout"] ?? "0"}
                    onChange={(e) => handleChange("player-idle-timeout", e.target.value)}
                    className="bg-black/40 border-white/10"
                  />
                  <p className="text-[11px] text-zinc-400">Kick idle players after X minutes (0 = disabled)</p>
                </div>
              )}

              {matchesSearch("entity-broadcast-range-percentage", "Entity Broadcast Range (%)") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-200">Entity Broadcast Range (%)</Label>
                    {renderStatusBadge("entity-broadcast-range-percentage")}
                  </div>
                  <Input
                    type="number"
                    min={10}
                    max={500}
                    step={5}
                    inputMode="numeric"
                    value={props["entity-broadcast-range-percentage"] ?? "100"}
                    onChange={(e) => handleChange("entity-broadcast-range-percentage", e.target.value)}
                    disabled={isRunning}
                    className="bg-black/40 border-white/10 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">entity-broadcast-range-percentage (10-500)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 5: Custom Properties */}
        {(activeTab === "all" || activeTab === "custom") && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Sliders className="size-5 text-purple-400" />
                <h2 className="font-display text-lg font-bold text-zinc-100">Custom Properties</h2>
              </div>
              <div className="flex items-center gap-2">
                {renderStatusBadge("custom")}
                <span className="text-xs text-zinc-400">{customKeys.length} properties</span>
              </div>
            </div>

            {/* Add custom property form */}
            <form onSubmit={handleAddCustom} className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Plus className="size-3.5 text-brand" />
                Add Property
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Property Key (e.g. generate-settings)"
                    value={newKey}
                    maxLength={64}
                    pattern="^[a-zA-Z0-9._-]+$"
                    title="Only letters, numbers, dots, hyphens and underscores"
                    onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    disabled={isRunning}
                    className="h-9 text-xs bg-black/50 border-white/10 font-mono disabled:opacity-50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Property Value"
                    value={newVal}
                    maxLength={256}
                    onChange={(e) => setNewVal(e.target.value)}
                    disabled={isRunning}
                    className="h-9 text-xs bg-black/50 border-white/10 font-mono disabled:opacity-50"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isRunning}
                    className="w-full h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold border border-white/10 disabled:opacity-50"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </form>

            {/* List of custom properties */}
            {customKeys.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-white/5 rounded-xl">
                No custom properties added.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customKeys
                  .filter((k) => matchesSearch(k, k))
                  .map((k) => (
                    <div
                      key={k}
                      className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 group hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-mono text-brand truncate max-w-[180px]" title={k}>
                          {k}
                        </Label>
                        {!isRunning && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKey(k)}
                            className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <Input
                        value={props[k] ?? ""}
                        onChange={(e) => handleChange(k, e.target.value)}
                        disabled={isRunning}
                        className="h-8 text-xs bg-black/60 border-white/10 font-mono disabled:opacity-50"
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
