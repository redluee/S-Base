"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, McTemplate } from "@/lib/api";
import { t } from "@/lib/lang";
import { ChevronRight, Loader2, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsStep } from "./SettingsStep";
import { useServerSettings } from "./useServerSettings";

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

  const settings = useServerSettings();
  const { motd, setMotd, serverPort, maxPlayers, setMaxPlayers, onlineMode, setOnlineMode, whiteList, gamemode, setGamemode, difficulty, setDifficulty, pvp, setPvp, hardcore, allowFlight, enableCommandBlock, doFireTick, setDoFireTick, levelName, levelSeed, levelType, generateStructures, allowNether, spawnMonsters, spawnAnimals, viewDistance, setViewDistance, simulationDistance } = settings;

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

        {step === 3 && <SettingsStep settings={settings} displayName={displayName} javaArgs={javaArgs} setJavaArgs={setJavaArgs} engine={engine} />}

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
