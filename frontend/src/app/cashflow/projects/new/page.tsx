"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowClient, CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, ChevronDown, ChevronUp } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") ? Number(searchParams.get("edit")) : null;

  const [clients, setClients] = useState<CashflowClient[]>([]);
  const [tradeNames, setTradeNames] = useState<CashflowTradeName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState<number | "">("");
  const [tradeNameId, setTradeNameId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // Inline new client
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientRate, setNewClientRate] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [cls, tns] = await Promise.all([
          api.cashflow.clients.list(),
          api.cashflow.tradeNames.list(),
        ]);
        setClients(cls);
        setTradeNames(tns);

        if (editId) {
          const proj = await api.cashflow.projects.get(editId);
          setClientId(proj.clientId);
          setTradeNameId(proj.tradeNameId ?? "");
          setName(proj.name);
          setDescription(proj.description ?? "");
          setLocation(proj.location ?? "");
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [editId]);

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      const created = await api.cashflow.clients.create({
        name: newClientName.trim(),
        email: newClientEmail.trim() || null,
        address: newClientAddress.trim() || null,
        standardRate: newClientRate ? Number(newClientRate) : null,
      });
      setClients(prev => [...prev, created]);
      setClientId(created.id);
      setShowNewClient(false);
      setNewClientName(""); setNewClientEmail(""); setNewClientAddress(""); setNewClientRate("");
    } catch {
    } finally {
      setCreatingClient(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t("Projectnaam is verplicht.")); return; }
    if (!clientId) { setError(t("Selecteer een klant.")); return; }
    setError("");
    setSaving(true);
    try {
      const data = {
        clientId: Number(clientId),
        tradeNameId: tradeNameId ? Number(tradeNameId) : null,
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
      };
      if (editId) {
        await api.cashflow.projects.update(editId, data);
      } else {
        await api.cashflow.projects.create(data);
      }
      router.push("/cashflow/projects");
    } catch (e: any) {
      setError(e.message ?? "Fout bij opslaan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center py-24"><div className="size-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">{editId ? t("Project bewerken") : t("Nieuw project")}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-sm font-semibold text-zinc-300">{t("Klant")}</h2>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Selecteer klant")}</Label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">{t("Selecteer klant")}</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowNewClient(!showNewClient)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            <UserPlus className="size-3" />
            {t("Nieuwe klant aanmaken")}
            {showNewClient ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>

          {showNewClient && (
            <div className="p-4 bg-zinc-800/60 border border-zinc-700 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-zinc-300">{t("Klant aanmaken")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder={t("Klantnaam")} value={newClientName} onChange={e => setNewClientName(e.target.value)} className="bg-zinc-700 border-zinc-600 text-xs" />
                <Input placeholder={t("Klantemail")} value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} className="bg-zinc-700 border-zinc-600 text-xs" />
                <Input placeholder={t("Klantadres")} value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} className="bg-zinc-700 border-zinc-600 text-xs sm:col-span-2" />
                <Input type="number" placeholder="Tarief (€/uur)" value={newClientRate} onChange={e => setNewClientRate(e.target.value)} className="bg-zinc-700 border-zinc-600 text-xs" />
                <Button type="button" onClick={handleCreateClient} disabled={creatingClient || !newClientName.trim()} className="bg-blue-500 hover:bg-blue-400 text-white text-xs self-end">
                  {creatingClient ? "Aanmaken..." : t("Klant aanmaken")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-sm font-semibold text-zinc-300">{t("Projectgegevens")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-zinc-400">{t("Projectnaam")}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Naam van het project" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-zinc-400">{t("Projectomschrijving")}</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Optionele beschrijving" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-zinc-400">{t("Locatie")}</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Optionele locatie" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-zinc-400">{t("Handelsnaam")}</Label>
              <select
                value={tradeNameId}
                onChange={e => setTradeNameId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">{t("Selecteer handelsnaam")} (optioneel)</option>
                {tradeNames.map(tn => <option key={tn.id} value={tn.id}>{tn.displayName}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button type="button" onClick={() => router.push("/cashflow/projects")} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm">
            {t("Annuleer")}
          </Button>
          <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-400 text-white text-sm shadow-lg shadow-blue-500/20">
            {saving ? t("Bezig met opslaan...") : editId ? t("Save Changes") : t("Project aanmaken")}
          </Button>
        </div>
      </form>
    </div>
  );
}
