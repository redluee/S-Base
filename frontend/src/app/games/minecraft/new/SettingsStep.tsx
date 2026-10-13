import { Settings, Swords, Globe, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JavaMemorySelector } from "@/components/minecraft/JavaMemorySelector";
import { t } from "@/lib/lang";
import type { useServerSettings } from "./useServerSettings";

type Settings = ReturnType<typeof useServerSettings>;

interface SettingsStepProps {
  settings: Settings;
  displayName: string;
  javaArgs: string;
  setJavaArgs: (v: string) => void;
  engine: string;
}

export function SettingsStep({ settings, displayName, javaArgs, setJavaArgs, engine }: SettingsStepProps) {
  const { activeSettingsTab, setActiveSettingsTab, motd, setMotd, serverPort, setServerPort, maxPlayers, setMaxPlayers, onlineMode, setOnlineMode, whiteList, setWhiteList, gamemode, setGamemode, difficulty, setDifficulty, pvp, setPvp, hardcore, setHardcore, allowFlight, setAllowFlight, enableCommandBlock, setEnableCommandBlock, doFireTick, setDoFireTick, levelName, setLevelName, levelSeed, setLevelSeed, levelType, setLevelType, generateStructures, setGenerateStructures, allowNether, setAllowNether, spawnMonsters, setSpawnMonsters, spawnAnimals, setSpawnAnimals, viewDistance, setViewDistance, simulationDistance, setSimulationDistance } = settings;

  return (
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
                    <Label htmlFor="server-offline-mode" className="cursor-pointer">{t("Offline mode")}</Label>
                    <p className="text-xs text-zinc-500">{t("Allow cracked clients")}</p>
                  </div>
                  <Switch id="server-offline-mode" checked={!onlineMode} onCheckedChange={(v) => setOnlineMode(!v)} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-whitelist" className="cursor-pointer">{t("Whitelist")}</Label>
                    <p className="text-xs text-zinc-500">{t("Whitelist")}</p>
                  </div>
                  <Switch id="server-whitelist" checked={whiteList} onCheckedChange={setWhiteList} />
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
                    <Label htmlFor="server-pvp" className="cursor-pointer">{t("PvP Combat")}</Label>
                    <p className="text-xs text-zinc-500">{t("PvP Combat")}</p>
                  </div>
                  <Switch id="server-pvp" checked={pvp} onCheckedChange={setPvp} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-hardcore" className="cursor-pointer">{t("Hardcore Mode")}</Label>
                    <p className="text-xs text-zinc-500">{t("One life only, players cannot respawn in survival")}</p>
                  </div>
                  <Switch id="server-hardcore" checked={hardcore} onCheckedChange={setHardcore} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-allow-flight" className="cursor-pointer">{t("Allow Flight")}</Label>
                    <p className="text-xs text-zinc-500">{t("Allow Flight")}</p>
                  </div>
                  <Switch id="server-allow-flight" checked={allowFlight} onCheckedChange={setAllowFlight} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-command-blocks" className="cursor-pointer">{t("Enable Command Blocks")}</Label>
                    <p className="text-xs text-zinc-500">{t("Enable Command Blocks")}</p>
                  </div>
                  <Switch id="server-command-blocks" checked={enableCommandBlock} onCheckedChange={setEnableCommandBlock} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-fire-tick" className="cursor-pointer">{t("Fire tick")}</Label>
                    <p className="text-xs text-zinc-500">Vuur verspreidt zich en dooft uit (doFireTick)</p>
                  </div>
                  <Switch id="server-fire-tick" checked={doFireTick} onCheckedChange={setDoFireTick} />
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
                    <Label htmlFor="server-generate-structures" className="cursor-pointer">{t("Generate Structures")}</Label>
                    <p className="text-xs text-zinc-500">{t("Generate Structures")}</p>
                  </div>
                  <Switch id="server-generate-structures" checked={generateStructures} onCheckedChange={setGenerateStructures} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-allow-nether" className="cursor-pointer">{t("Allow Nether")}</Label>
                    <p className="text-xs text-zinc-500">{t("Allow Nether")}</p>
                  </div>
                  <Switch id="server-allow-nether" checked={allowNether} onCheckedChange={setAllowNether} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-spawn-monsters" className="cursor-pointer">{t("Spawn Monsters")}</Label>
                    <p className="text-xs text-zinc-500">{t("Spawn Monsters")}</p>
                  </div>
                  <Switch id="server-spawn-monsters" checked={spawnMonsters} onCheckedChange={setSpawnMonsters} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <Label htmlFor="server-spawn-animals" className="cursor-pointer">{t("Spawn Animals")}</Label>
                    <p className="text-xs text-zinc-500">{t("Spawn Animals")}</p>
                  </div>
                  <Switch id="server-spawn-animals" checked={spawnAnimals} onCheckedChange={setSpawnAnimals} />
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
  );
}
