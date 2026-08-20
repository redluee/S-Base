"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, McTemplate } from "@/lib/api";
import { t } from "@/lib/lang";
import { ArrowLeft, Box, Loader2, Zap, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<McTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Speedrun modal state
  const [showSpeedrunModal, setShowSpeedrunModal] = useState<number | null>(null);
  const [speedrunName, setSpeedrunName] = useState("");
  const [speedrunLoading, setSpeedrunLoading] = useState(false);

  const refreshTemplates = () => {
    setLoading(true);
    api.minecraft.templates.list().then((res) => {
      setTemplates(Array.isArray(res) ? res : []);
    }).catch(console.error).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    api.minecraft.templates.list().then((res) => {
      setTemplates(Array.isArray(res) ? res : []);
    }).catch(console.error).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm(t("Delete this template?"))) return;
    try {
      await api.minecraft.templates.delete(id);
      refreshTemplates();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const handleSpeedrun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showSpeedrunModal === null || !speedrunName) return;
    
    const slug = speedrunName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 32);
    
    setSpeedrunLoading(true);
    try {
      await api.minecraft.templates.speedrun(showSpeedrunModal, slug, speedrunName);
      router.push(`/games/minecraft/${slug}`);
    } catch (err: unknown) {
      alert((err as Error).message);
      setSpeedrunLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/games/minecraft" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-3xl font-black text-brand flex items-center gap-2">
            <Box className="size-8" />
            {t("Templates")}
          </h1>
        </div>

        <Link href="/games/minecraft/templates/new">
          <Button className="bg-brand text-zinc-950 font-bold hover:bg-brand/90 flex items-center gap-2">
            <Plus className="size-4" />
            {t("New Template")}
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/50 border border-white/10 rounded-2xl text-center">
          <Box className="size-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 font-medium">{t("No templates yet.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div key={tmpl.templateId} className="flex flex-col p-5 rounded-2xl bg-zinc-900 border border-white/10 relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{tmpl.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${tmpl.engine === 'fabric' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {tmpl.engine}
                    </span>
                    <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-zinc-800 text-zinc-300 border border-white/5">
                      v{tmpl.mcVersion}
                    </span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity size-8" onClick={() => handleDelete(tmpl.templateId)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {tmpl.notes && (
                <p className="text-sm text-zinc-400 mb-6 flex-1 line-clamp-3">{tmpl.notes}</p>
              )}

              <Button 
                onClick={() => {
                  setShowSpeedrunModal(tmpl.templateId);
                  setSpeedrunName(`Speedrun ${new Date().toLocaleDateString()}`);
                }}
                className="w-full bg-brand text-zinc-950 font-bold hover:bg-brand/90 group/btn mt-auto"
              >
                <Zap className="size-4 mr-2 group-hover/btn:scale-125 group-hover/btn:rotate-12 transition-transform" />
                {t("1-Click Speedrun")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {showSpeedrunModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleSpeedrun} className="bg-zinc-900 rounded-2xl p-6 border border-white/10 w-full max-w-md space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Zap className="text-brand size-5" />
                {t("1-Click Speedrun")}
              </h2>
              <p className="text-sm text-zinc-400">{t("Start fresh world")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("Server name")}</Label>
              <Input value={speedrunName} onChange={(e) => setSpeedrunName(e.target.value)} required autoFocus />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="outline" onClick={() => setShowSpeedrunModal(null)} disabled={speedrunLoading}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={speedrunLoading || !speedrunName} className="bg-brand text-zinc-950 font-bold hover:bg-brand/90">
                {speedrunLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Zap className="size-4 mr-2" />}
                {t("Start")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
