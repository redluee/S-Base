import { Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorldSectionProps {
  activeTab: string;
  props: Record<string, string>;
  isRunning: boolean;
  handleChange: (key: string, val: string) => void;
  handleToggle: (key: string, val: string) => void | Promise<void>;
  matchesSearch: (key: string, label: string) => boolean;
  renderStatusBadge: (key: string) => React.ReactNode;
}

export function WorldSection({ activeTab, props, isRunning, handleChange, handleToggle, matchesSearch, renderStatusBadge }: WorldSectionProps) {
  return (
    <>
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
                      <Label htmlFor="prop-generate-structures" className="text-zinc-200 cursor-pointer">Generate Structures</Label>
                      {renderStatusBadge("generate-structures")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Generate structures (villages, dungeons, temples, etc.)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">generate-structures={props["generate-structures"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-generate-structures"
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
                      <Label htmlFor="prop-allow-nether" className="text-zinc-200 cursor-pointer">Allow Nether</Label>
                      {renderStatusBadge("allow-nether")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Enable portals and the Nether dimension</p>
                    <p className="text-[10px] text-zinc-500 font-mono">allow-nether={props["allow-nether"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-allow-nether"
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
                      <Label htmlFor="prop-spawn-monsters" className="text-zinc-200 cursor-pointer">Spawn Monsters</Label>
                      {renderStatusBadge("spawn-monsters")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow hostile monsters to spawn naturally</p>
                    <p className="text-[10px] text-zinc-500 font-mono">spawn-monsters={props["spawn-monsters"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-spawn-monsters"
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
                      <Label htmlFor="prop-spawn-animals" className="text-zinc-200 cursor-pointer">Spawn Animals</Label>
                      {renderStatusBadge("spawn-animals")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow passive animals to spawn naturally</p>
                    <p className="text-[10px] text-zinc-500 font-mono">spawn-animals={props["spawn-animals"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-spawn-animals"
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
                      <Label htmlFor="prop-spawn-npcs" className="text-zinc-200 cursor-pointer">Spawn NPCs (Villagers)</Label>
                      {renderStatusBadge("spawn-npcs")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow NPC villagers to spawn in villages</p>
                    <p className="text-[10px] text-zinc-500 font-mono">spawn-npcs={props["spawn-npcs"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-spawn-npcs"
                    checked={props["spawn-npcs"] !== "false"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("spawn-npcs", v ? "true" : "false")}
                  />
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
