"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { ChevronRight, Loader2, Box, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { SettingsStep } from "./SettingsStep";
import { FilesStep } from "./FilesStep";
import { useTemplateSettings } from "./useTemplateSettings";
import type { StagedFile } from "./staged-files";

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

  const settings = useTemplateSettings();
  const { motd, setMotd, serverPort, maxPlayers, onlineMode, whiteList, gamemode, difficulty, pvp, hardcore, allowFlight, enableCommandBlock, doFireTick, levelName, levelType, generateStructures, allowNether, spawnMonsters, spawnAnimals, viewDistance, simulationDistance } = settings;

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

        {step === 3 && <SettingsStep settings={settings} name={name} javaArgs={javaArgs} setJavaArgs={setJavaArgs} engine={engine} />}

        {step === 4 && (
          <FilesStep stagedFiles={stagedFiles} fileTab={fileTab} setFileTab={setFileTab} handleFileUpload={handleFileUpload} removeStagedFile={removeStagedFile} />
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
