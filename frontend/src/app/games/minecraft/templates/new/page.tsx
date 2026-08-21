"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import {
  ChevronRight,
  Loader2,
  Box,
  Settings,
  Swords,
  Globe,
  Gauge,
  Upload as UploadIcon,
  Trash2,
  ArrowLeft,
  Puzzle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JavaMemorySelector } from "@/components/minecraft/JavaMemorySelector";
import Link from "next/link";

interface StagedFile {
  file: File;
  type: "mods" | "datapacks" | "resourcepacks";
}

function formatFileSize(bytes: number): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const emptySubscribe = () => () => {};

export default function NewTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [versions, setVersions] = useState<string[]>([]);

  // Step 1: Basis
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2: Engine & Version & Memory
  const [mcVersion, setMcVersion] = useState("");
  const [engine, setEngine] = useState<"vanilla" | "fabric">("fabric");
  const [javaArgs, setJavaArgs] = useState<string>("-Xms1G -Xmx2G");

  // Step 3: Properties (Categorized)
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "gameplay" | "world" | "performance">("general");

  // General
  const [motd, setMotd] = useState("");
  const [serverPort, setServerPort] = useState("25565");
  const [maxPlayers, setMaxPlayers] = useState("20");
  const [onlineMode, setOnlineMode] = useState(true);
  const [whiteList, setWhiteList] = useState(false);

  // Gameplay
  const [gamemode, setGamemode] = useState("survival");
  const [difficulty, setDifficulty] = useState("normal");
  const [pvp, setPvp] = useState(true);
  const [hardcore, setHardcore] = useState(false);
  const [allowFlight, setAllowFlight] = useState(false);
  const [enableCommandBlock, setEnableCommandBlock] = useState(false);
  const [doFireTick, setDoFireTick] = useState(true);

  // World
  const [levelName, setLevelName] = useState("world");
  const [levelType, setLevelType] = useState("minecraft:normal");
  const [generateStructures, setGenerateStructures] = useState(true);
  const [allowNether, setAllowNether] = useState(true);
  const [spawnMonsters, setSpawnMonsters] = useState(true);
  const [spawnAnimals, setSpawnAnimals] = useState(true);

  // Performance
  const [viewDistance, setViewDistance] = useState("10");
  const [simulationDistance, setSimulationDistance] = useState("10");

  // Step 4: Mods & Files
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [fileTab, setFileTab] = useState<"mods" | "datapacks" | "resourcepacks">("mods");

  useEffect(() => {
    api.minecraft.versions().then((res) => {
      const vList = Array.isArray(res)
        ? res.map((item: string | { id?: string }) => (typeof item === "string" ? item : item?.id || String(item)))
        : [];
      setVersions(vList);
      if (vList.length > 0) setMcVersion(vList[0]);
    }).catch(console.error);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "mods" | "datapacks" | "resourcepacks") => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const valid = incoming.filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return ext === ".jar" || ext === ".zip";
    });

    setStagedFiles((prev) => {
      const filtered = prev.filter((p) => !(p.type === type && valid.some((v) => v.name === p.file.name)));
      return [...filtered, ...valid.map((f) => ({ file: f, type }))];
    });

    e.target.value = "";
  };

  const removeStagedFile = (filename: string, type: "mods" | "datapacks" | "resourcepacks") => {
    setStagedFiles((prev) => prev.filter((f) => !(f.file.name === filename && f.type === type)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const properties: Record<string, string> = {
        "motd": motd || `A Minecraft Server: ${name}`,
        "server-port": serverPort || "25565",
        "max-players": maxPlayers || "20",
        "online-mode": onlineMode ? "true" : "false",
        "white-list": whiteList ? "true" : "false",
        "gamemode": gamemode,
        "difficulty": difficulty,
        "pvp": pvp ? "true" : "false",
        "hardcore": hardcore ? "true" : "false",
        "allow-flight": allowFlight ? "true" : "false",
        "enable-command-block": enableCommandBlock ? "true" : "false",
        "do-fire-tick": doFireTick ? "true" : "false",
        "level-name": levelName || "world",
        "level-type": levelType,
        "generate-structures": generateStructures ? "true" : "false",
        "allow-nether": allowNether ? "true" : "false",
        "spawn-monsters": spawnMonsters ? "true" : "false",
        "spawn-animals": spawnAnimals ? "true" : "false",
        "view-distance": viewDistance || "10",
        "simulation-distance": simulationDistance || "10",
      };

      const created = await api.minecraft.templates.createCustom({
        name,
        engine,
        mcVersion,
        properties,
        notes: notes || undefined,
        javaArgs: javaArgs.trim() || undefined,
      });

      if (created && created.templateId && stagedFiles.length > 0) {
        for (const sf of stagedFiles) {
          await api.minecraft.templates.files.upload(created.templateId, sf.type, sf.file);
        }
      }

      router.push("/games/minecraft/templates");
    } catch (err: unknown) {
      setError((err as Error).message || t("Failed to save template."));
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/games/minecraft/templates" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="size-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
            <Box className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-zinc-100 font-black">{t("New Template")}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold overflow-x-auto pb-1">
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 1 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>1. {t("Basic Info")}</span>
        <ChevronRight className="size-3 text-zinc-600 shrink-0" />
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 2 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>2. {t("Engine & Version")}</span>
        <ChevronRight className="size-3 text-zinc-600 shrink-0" />
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 3 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>3. {t("Settings")}</span>
        <ChevronRight className="size-3 text-zinc-600 shrink-0" />
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 4 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>4. {t("Mods & Files")}</span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* STAP 1: BASIS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <Label>{t("Template name")}</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!motd) setMotd(`A Minecraft Server: ${e.target.value}`);
                }}
                placeholder="bijv. Survival Multiplayer, Speedrun Base"
                maxLength={64}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Notes")}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionele beschrijving of instructies voor dit sjabloon..."
                maxLength={256}
              />
            </div>
          </div>
        )}

        {/* STAP 2: VERSIE & ENGINE */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
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
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={engine === "vanilla" ? "default" : "outline"}
                  onClick={() => setEngine("vanilla")}
                  className={engine === "vanilla" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                >
                  {t("Vanilla")}
                </Button>
                <Button
                  type="button"
                  variant={engine === "fabric" ? "default" : "outline"}
                  onClick={() => setEngine("fabric")}
                  className={engine === "fabric" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                >
                  {t("Fabric")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STAP 3: INSTELLINGEN */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("general")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSettingsTab === "general" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Settings className="size-3.5" />
                {t("General")}
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("gameplay")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSettingsTab === "gameplay" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Swords className="size-3.5" />
                {t("Gameplay")}
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("world")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSettingsTab === "world" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Globe className="size-3.5" />
                {t("World & Generation")}
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("performance")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSettingsTab === "performance" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Gauge className="size-3.5" />
                {t("Performance")}
              </button>
            </div>

            {activeSettingsTab === "general" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <Label>{t("Message of the Day (MOTD)")}</Label>
                  <Input
                    value={motd}
                    onChange={(e) => setMotd(e.target.value)}
                    maxLength={128}
                    placeholder={`A Minecraft Server: ${name || "Server"}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Server Port")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      step={1}
                      inputMode="numeric"
                      value={serverPort}
                      onChange={(e) => setServerPort(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Max Players")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={99999}
                      step={1}
                      inputMode="numeric"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Offline mode")}</Label>
                    <p className="text-xs text-zinc-500">{t("Allow cracked clients")}</p>
                  </div>
                  <Switch checked={!onlineMode} onCheckedChange={(v) => setOnlineMode(!v)} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Whitelist")}</Label>
                    <p className="text-xs text-zinc-500">{t("Whitelist")}</p>
                  </div>
                  <Switch checked={whiteList} onCheckedChange={setWhiteList} />
                </div>
              </div>
            )}

            {activeSettingsTab === "gameplay" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Gamemode")}</Label>
                    <Select value={gamemode} onValueChange={(v) => setGamemode(v ?? "survival")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="survival">{t("Survival")}</SelectItem>
                        <SelectItem value="creative">{t("Creative")}</SelectItem>
                        <SelectItem value="adventure">{t("Adventure")}</SelectItem>
                        <SelectItem value="spectator">{t("Spectator")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("Difficulty")}</Label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "normal")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peaceful">{t("Peaceful")}</SelectItem>
                        <SelectItem value="easy">{t("Easy")}</SelectItem>
                        <SelectItem value="normal">{t("Normal")}</SelectItem>
                        <SelectItem value="hard">{t("Hard")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("PvP Combat")}</Label>
                    <p className="text-xs text-zinc-500">{t("PvP Combat")}</p>
                  </div>
                  <Switch checked={pvp} onCheckedChange={setPvp} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Hardcore Mode")}</Label>
                    <p className="text-xs text-zinc-500">{t("One life only, players cannot respawn in survival")}</p>
                  </div>
                  <Switch checked={hardcore} onCheckedChange={setHardcore} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Allow Flight")}</Label>
                    <p className="text-xs text-zinc-500">{t("Allow Flight")}</p>
                  </div>
                  <Switch checked={allowFlight} onCheckedChange={setAllowFlight} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Enable Command Blocks")}</Label>
                    <p className="text-xs text-zinc-500">{t("Enable Command Blocks")}</p>
                  </div>
                  <Switch checked={enableCommandBlock} onCheckedChange={setEnableCommandBlock} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Fire tick")}</Label>
                    <p className="text-xs text-zinc-500">Vuur verspreidt zich en dooft uit (doFireTick)</p>
                  </div>
                  <Switch checked={doFireTick} onCheckedChange={setDoFireTick} />
                </div>
              </div>
            )}

            {activeSettingsTab === "world" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <Label>{t("World Name")}</Label>
                  <Input
                    value={levelName}
                    maxLength={64}
                    onChange={(e) => setLevelName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("World Type")}</Label>
                  <Select value={levelType} onValueChange={(v) => setLevelType(v ?? "minecraft:normal")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minecraft:normal">{t("Default")} (normal)</SelectItem>
                      <SelectItem value="minecraft:flat">{t("Flat")}</SelectItem>
                      <SelectItem value="minecraft:large_biomes">{t("Large Biomes")}</SelectItem>
                      <SelectItem value="minecraft:amplified">{t("Amplified")}</SelectItem>
                      <SelectItem value="minecraft:single_biome_surface">{t("Single Biome")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Generate Structures")}</Label>
                    <p className="text-xs text-zinc-500">{t("Generate Structures")}</p>
                  </div>
                  <Switch checked={generateStructures} onCheckedChange={setGenerateStructures} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Allow Nether")}</Label>
                    <p className="text-xs text-zinc-500">{t("Allow Nether")}</p>
                  </div>
                  <Switch checked={allowNether} onCheckedChange={setAllowNether} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Spawn Monsters")}</Label>
                    <p className="text-xs text-zinc-500">{t("Spawn Monsters")}</p>
                  </div>
                  <Switch checked={spawnMonsters} onCheckedChange={setSpawnMonsters} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label className="cursor-pointer">{t("Spawn Animals")}</Label>
                    <p className="text-xs text-zinc-500">{t("Spawn Animals")}</p>
                  </div>
                  <Switch checked={spawnAnimals} onCheckedChange={setSpawnAnimals} />
                </div>
              </div>
            )}

            {activeSettingsTab === "performance" && (
              <div className="space-y-6 animate-in fade-in">
                <JavaMemorySelector value={javaArgs} onChange={setJavaArgs} engine={engine} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <Label>{t("View Distance (chunks)")}</Label>
                    <Input
                      type="number"
                      min={3}
                      max={32}
                      step={1}
                      inputMode="numeric"
                      value={viewDistance}
                      onChange={(e) => setViewDistance(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Simulation Distance (chunks)")}</Label>
                    <Input
                      type="number"
                      min={3}
                      max={32}
                      step={1}
                      inputMode="numeric"
                      value={simulationDistance}
                      onChange={(e) => setSimulationDistance(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAP 4: MODS & BESTANDEN */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setFileTab("mods")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  fileTab === "mods" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Puzzle className="size-3.5" />
                Mods (.jar)
              </button>
              <button
                type="button"
                onClick={() => setFileTab("datapacks")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  fileTab === "datapacks" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Datapacks (.zip)
              </button>
              <button
                type="button"
                onClick={() => setFileTab("resourcepacks")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  fileTab === "resourcepacks" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Resourcepacks (.zip)
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative border-2 border-dashed border-white/10 hover:border-brand/50 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  multiple
                  accept={fileTab === "mods" ? ".jar" : ".zip"}
                  onChange={(e) => handleFileUpload(e, fileTab)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadIcon className="size-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-200">
                  {fileTab === "mods" ? t("Upload Mods (.jar)") : fileTab === "datapacks" ? t("Upload Datapacks (.zip)") : t("Upload Resourcepacks (.zip)")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Sleep bestanden hierheen of klik om te uploaden</p>
              </div>

              {/* Bestandenlijst van actieve fileTab */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                  {t("Files")} ({stagedFiles.filter((f) => f.type === fileTab).length})
                </div>

                {stagedFiles.filter((f) => f.type === fileTab).length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-zinc-500">
                    {t("No files added to this template yet.")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stagedFiles
                      .filter((f) => f.type === fileTab)
                      .map((sf) => (
                        <div
                          key={sf.file.name}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-white/5 text-sm"
                        >
                          <div className="truncate pr-4">
                            <span className="font-mono text-xs text-zinc-200 block truncate">{sf.file.name}</span>
                            <span className="text-[10px] text-zinc-500">{formatFileSize(sf.file.size)}</span>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-red-400 hover:bg-red-500/20"
                            onClick={() => removeStagedFile(sf.file.name, sf.type)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-white/5">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              {t("Previous")}
            </Button>
          ) : (
            <div />
          )}

          <Button type="submit" disabled={!mounted || loading || (step === 1 && !name.trim())}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("Creating template...")}
              </>
            ) : step < 4 ? (
              t("Next")
            ) : (
              t("Create Template")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
