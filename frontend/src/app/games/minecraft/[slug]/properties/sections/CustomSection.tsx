import { Plus, Trash2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomSectionProps {
  activeTab: string;
  props: Record<string, string>;
  isRunning: boolean;
  handleChange: (key: string, val: string) => void;
  matchesSearch: (key: string, label: string) => boolean;
  renderStatusBadge: (key: string) => React.ReactNode;
  customKeys: string[];
  handleAddCustom: (e: React.FormEvent) => void;
  handleRemoveKey: (key: string) => void;
  newKey: string;
  setNewKey: (v: string) => void;
  newVal: string;
  setNewVal: (v: string) => void;
}

export function CustomSection({ activeTab, props, isRunning, handleChange, matchesSearch, renderStatusBadge, customKeys, handleAddCustom, handleRemoveKey, newKey, setNewKey, newVal, setNewVal }: CustomSectionProps) {
  return (
    <>
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
    </>
  );
}
