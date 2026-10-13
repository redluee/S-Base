import { Gamepad2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GameplaySectionProps {
  activeTab: string;
  props: Record<string, string>;
  isRunning: boolean;
  handleChange: (key: string, val: string) => void;
  handleToggle: (key: string, val: string) => void | Promise<void>;
  matchesSearch: (key: string, label: string) => boolean;
  renderStatusBadge: (key: string) => React.ReactNode;
}

export function GameplaySection({ activeTab, props, isRunning, handleChange, handleToggle, matchesSearch, renderStatusBadge }: GameplaySectionProps) {
  return (
    <>
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
                      <Label htmlFor="prop-hardcore" className="text-zinc-200 cursor-pointer">Hardcore Mode</Label>
                      {renderStatusBadge("hardcore")}
                    </div>
                    <p className="text-[11px] text-zinc-400">One life only; players cannot respawn in survival</p>
                    <p className="text-[10px] text-zinc-500 font-mono">hardcore={props["hardcore"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-hardcore"
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
                      <Label htmlFor="prop-pvp" className="text-zinc-200 cursor-pointer">PvP Combat</Label>
                      {renderStatusBadge("pvp")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Enable player vs player combat</p>
                    <p className="text-[10px] text-zinc-500 font-mono">pvp={props["pvp"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-pvp"
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
                      <Label htmlFor="prop-allow-flight" className="text-zinc-200 cursor-pointer">Allow Flight</Label>
                      {renderStatusBadge("allow-flight")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow players to fly in survival mode if enabled by mods/abilities</p>
                    <p className="text-[10px] text-zinc-500 font-mono">allow-flight={props["allow-flight"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-allow-flight"
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
                      <Label htmlFor="prop-enable-command-block" className="text-zinc-200 cursor-pointer">Enable Command Blocks</Label>
                      {renderStatusBadge("enable-command-block")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow execution of command blocks</p>
                    <p className="text-[10px] text-zinc-500 font-mono">enable-command-block={props["enable-command-block"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-enable-command-block"
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
                      <Label htmlFor="prop-force-gamemode" className="text-zinc-200 cursor-pointer">Force Gamemode</Label>
                      {renderStatusBadge("force-gamemode")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Force players to join in the default game mode</p>
                    <p className="text-[10px] text-zinc-500 font-mono">force-gamemode={props["force-gamemode"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-force-gamemode"
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
                      <Label htmlFor="prop-do-fire-tick" className="text-zinc-200 cursor-pointer">Fire Tick</Label>
                      {renderStatusBadge("do-fire-tick")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow fire to spread and naturally extinguish (gamerule doFireTick)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">do-fire-tick={(props["do-fire-tick"] ?? props["doFireTick"]) !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-do-fire-tick"
                    checked={(props["do-fire-tick"] ?? props["doFireTick"]) !== "false"}
                    onCheckedChange={(v) => handleToggle("do-fire-tick", v ? "true" : "false")}
                  />
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
