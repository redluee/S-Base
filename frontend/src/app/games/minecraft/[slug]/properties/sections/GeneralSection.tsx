import { Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface GeneralSectionProps {
  activeTab: string;
  props: Record<string, string>;
  isRunning: boolean;
  handleChange: (key: string, val: string) => void;
  handleToggle: (key: string, val: string) => void | Promise<void>;
  matchesSearch: (key: string, label: string) => boolean;
  renderStatusBadge: (key: string) => React.ReactNode;
}

export function GeneralSection({ activeTab, props, isRunning, handleChange, handleToggle, matchesSearch, renderStatusBadge }: GeneralSectionProps) {
  return (
    <>
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
                      <Label htmlFor="prop-online-mode" className="text-zinc-200 cursor-pointer">Offline Mode</Label>
                      {renderStatusBadge("online-mode")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Allow cracked / unauthenticated clients (online-mode=false)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">online-mode={props["online-mode"] !== "false" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-online-mode"
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
                      <Label htmlFor="prop-white-list" className="text-zinc-200 cursor-pointer">Whitelist</Label>
                      {renderStatusBadge("white-list")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Restrict server access to whitelisted players</p>
                    <p className="text-[10px] text-zinc-500 font-mono">white-list={props["white-list"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-white-list"
                    checked={props["white-list"] === "true"}
                    onCheckedChange={(v) => handleToggle("white-list", v ? "true" : "false")}
                  />
                </div>
              )}

              {matchesSearch("enforce-whitelist", "Enforce Whitelist") && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="prop-enforce-whitelist" className="text-zinc-200 cursor-pointer">Enforce Whitelist</Label>
                      {renderStatusBadge("enforce-whitelist")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Kick non-whitelisted players when whitelist is reloaded</p>
                    <p className="text-[10px] text-zinc-500 font-mono">enforce-whitelist={props["enforce-whitelist"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-enforce-whitelist"
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
                      <Label htmlFor="prop-hide-online-players" className="text-zinc-200 cursor-pointer">Hide Online Players</Label>
                      {renderStatusBadge("hide-online-players")}
                    </div>
                    <p className="text-[11px] text-zinc-400">Do not display player names in server list status</p>
                    <p className="text-[10px] text-zinc-500 font-mono">hide-online-players={props["hide-online-players"] === "true" ? "true" : "false"}</p>
                  </div>
                  <Switch
                    id="prop-hide-online-players"
                    checked={props["hide-online-players"] === "true"}
                    disabled={isRunning}
                    onCheckedChange={(v) => handleToggle("hide-online-players", v ? "true" : "false")}
                  />
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
