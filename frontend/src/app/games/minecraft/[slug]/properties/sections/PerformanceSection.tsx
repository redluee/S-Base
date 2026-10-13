import { Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JavaMemorySelector } from "@/components/minecraft/JavaMemorySelector";

interface PerformanceSectionProps {
  activeTab: string;
  props: Record<string, string>;
  isRunning: boolean;
  handleChange: (key: string, val: string) => void;
  matchesSearch: (key: string, label: string) => boolean;
  renderStatusBadge: (key: string) => React.ReactNode;
  javaArgs: string;
  setJavaArgs: (v: string) => void;
  setSaveSuccess: (v: boolean) => void;
  serverEngine: string;
}

export function PerformanceSection({ activeTab, props, isRunning, handleChange, matchesSearch, renderStatusBadge, javaArgs, setJavaArgs, serverEngine, setSaveSuccess }: PerformanceSectionProps) {
  return (
    <>
        {(activeTab === "all" || activeTab === "performance") && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Gauge className="size-5 text-indigo-400" />
                <h2 className="font-display text-lg font-bold text-zinc-100">Performance & Memory</h2>
              </div>
              {renderStatusBadge("performance")}
            </div>

            {/* RAM & Java Arguments Selector */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/10">
              <JavaMemorySelector
                value={javaArgs}
                onChange={(v) => {
                  if (!isRunning) {
                    setJavaArgs(v);
                    setSaveSuccess(false);
                  }
                }}
                disabled={isRunning}
                engine={serverEngine}
              />
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
    </>
  );
}
