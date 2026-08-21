"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, McTemplate } from "@/lib/api";
import { t } from "@/lib/lang";
import {
  ChevronRight,
  Loader2,
  Gamepad2,
  Settings,
  Swords,
  Globe,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JavaMemorySelector } from "@/components/minecraft/JavaMemorySelector";

export default function NewServerPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [versions, setVersions] = useState<string[]>([]);
  const [templates, setTemplates] = useState<McTemplate[]>([]);

  // Step 1: Basis
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");

  // Step 2: Engine & Version & Memory
  const [mcVersion, setMcVersion] = useState("");
  const [engine, setEngine] = useState<"vanilla" | "fabric">("vanilla");
  const [templateId, setTemplateId] = useState<number | null>(null);
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
  const [levelSeed, setLevelSeed] = useState("");
  const [levelType, setLevelType] = useState("minecraft:normal");
  const [generateStructures, setGenerateStructures] = useState(true);
  const [allowNether, setAllowNether] = useState(true);
  const [spawnMonsters, setSpawnMonsters] = useState(true);
  const [spawnAnimals, setSpawnAnimals] = useState(true);

  // Performance
  const [viewDistance, setViewDistance] = useState("10");
  const [simulationDistance, setSimulationDistance] = useState("10");

  useEffect(() => {
    api.minecraft.versions().then((res) => {
      const vList = Array.isArray(res)
        ? res.map((item: string | { id?: string }) => (typeof item === "string" ? item : item?.id || String(item)))
        : [];
      setVersions(vList);
      if (vList.length > 0) setMcVersion(vList[0]);
    }).catch(console.error);

    api.minecraft.templates.list().then(setTemplates).catch(console.error);
  }, []);

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (step === 1) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 32));
      if (!motd) {
        setMotd(`A Minecraft Server: ${val}`);
      }
    }
  };

  const handleTemplateSelect = (val: string) => {
    if (val === "none") {
      setTemplateId(null);
    } else {
      const id = parseInt(val, 10);
      setTemplateId(id);
      const tmpl = templates.find((t) => t.templateId === id);
      if (tmpl) {
        setMcVersion(tmpl.mcVersion);
        setEngine(tmpl.engine as "vanilla" | "fabric");
        if (tmpl.javaArgs) {
          setJavaArgs(tmpl.javaArgs);
        }
        try {
          if (tmpl.propertiesJson) {
            const parsed = JSON.parse(tmpl.propertiesJson);
            if (parsed.gamemode) setGamemode(parsed.gamemode);
            if (parsed.difficulty) setDifficulty(parsed.difficulty);
            if (parsed.pvp !== undefined) setPvp(parsed.pvp !== "false");
            if (parsed["online-mode"] !== undefined) setOnlineMode(parsed["online-mode"] !== "false");
            if (parsed["max-players"]) setMaxPlayers(parsed["max-players"]);
            if (parsed["view-distance"]) setViewDistance(parsed["view-distance"]);
            if (parsed["do-fire-tick"] !== undefined || parsed["doFireTick"] !== undefined) {
              setDoFireTick((parsed["do-fire-tick"] ?? parsed["doFireTick"]) !== "false");
            }
          }
        } catch {}
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.minecraft.servers.create({
        slug,
        displayName,
        engine,
        mcVersion,
        javaArgs: javaArgs.trim() || undefined,
        templateId: templateId || undefined,
      });

      // Update customized properties
      const propsToUpdate: Record<string, string> = {
        "motd": motd || `A Minecraft Server: ${displayName}`,
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
        "level-seed": levelSeed || "",
        "level-type": levelType,
        "generate-structures": generateStructures ? "true" : "false",
        "allow-nether": allowNether ? "true" : "false",
        "spawn-monsters": spawnMonsters ? "true" : "false",
        "spawn-animals": spawnAnimals ? "true" : "false",
        "view-distance": viewDistance || "10",
        "simulation-distance": simulationDistance || "10",
      };

      await api.minecraft.servers.properties.update(slug, propsToUpdate);

      router.push(`/games/minecraft/${slug}`);
    } catch (err: unknown) {
      setError((err as Error).message || t("Server failed to start"));
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
          <Gamepad2 className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-zinc-100 font-black">{t("Create Server")}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold overflow-x-auto pb-1">
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 1 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>1. {t("Basic Info")}</span>
        <ChevronRight className="size-3 text-zinc-600 shrink-0" />
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 2 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>2. Versie & Engine</span>
        <ChevronRight className="size-3 text-zinc-600 shrink-0" />
        <span className={`px-2.5 py-1 rounded-md transition-colors ${step >= 3 ? "bg-brand text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>3. {t("Properties")}</span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: BASIS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <Label>{t("Server name")}</Label>
              <Input
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
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
                title="3-32 tekens (alleen kleine letters, cijfers en koppeltekens)"
                required
              />
              <p className="text-xs text-zinc-500">{t("Slug must be 3-32 chars, lowercase, hyphens only.")}</p>
            </div>
          </div>
        )}

        {/* STEP 2: VERSIE & ENGINE */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <Label>{t("Inherits from template")}</Label>
              <Select value={templateId ? templateId.toString() : "none"} onValueChange={(v) => handleTemplateSelect(v ?? "none")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Templates")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("None")}</SelectItem>
                  {templates.map((tmpl) => (
                    <SelectItem key={tmpl.templateId} value={tmpl.templateId.toString()}>
                      {tmpl.name} (v{tmpl.mcVersion})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

        {/* STEP 3: SERVER PROPERTIES */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            {/* Sub-tabs for properties categories */}
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

            {/* Sub-tab 1: General */}
            {activeSettingsTab === "general" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <Label>{t("Message of the Day (MOTD)")}</Label>
                  <Input
                    value={motd}
                    onChange={(e) => setMotd(e.target.value)}
                    maxLength={128}
                    placeholder={`A Minecraft Server: ${displayName || "Server"}`}
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

            {/* Sub-tab 2: Gameplay */}
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

            {/* Sub-tab 3: World */}
            {activeSettingsTab === "world" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("World Name")}</Label>
                    <Input
                      value={levelName}
                      maxLength={64}
                      onChange={(e) => setLevelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("World Seed")}</Label>
                    <Input
                      value={levelSeed}
                      maxLength={64}
                      onChange={(e) => setLevelSeed(e.target.value)}
                      placeholder="Willekeurig (Random)"
                    />
                  </div>
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

            {/* Sub-tab 4: Performance */}
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

        <div className="flex justify-between pt-4 border-t border-white/5">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              {t("Previous")}
            </Button>
          ) : (
            <div />
          )}

          <Button type="submit" disabled={loading || (step === 1 && (!displayName || !slug))}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("Creating server...")}
              </>
            ) : step < 3 ? (
              t("Next")
            ) : (
              t("Create Server")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
