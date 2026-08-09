"use client";

import { useState, useEffect } from "react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Pencil, Trash2, X, Check, Mail, MapPin, Euro, Hash } from "lucide-react";

function ClientForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<CashflowClient>;
  onSave: (data: Omit<CashflowClient, "id" | "userId" | "createdAt">) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [kvkNumber, setKvkNumber] = useState(initial?.kvkNumber ?? "");
  const [standardRate, setStandardRate] = useState(initial?.standardRate?.toString() ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t("Klantnaam is verplicht.")); return; }
    setError("");
    onSave({
      name: name.trim(),
      address: address.trim() || null,
      email: email.trim() || null,
      kvkNumber: kvkNumber.trim() || null,
      standardRate: standardRate ? Number(standardRate) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h3 className="text-sm font-semibold text-white">{initial?.id ? t("Klant bewerken") : t("Klant aanmaken")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Klantnaam")}</Label>
          <Input value={name} onChange={e => setName(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Bedrijfsnaam of naam" />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Klantadres")}</Label>
          <Input value={address} onChange={e => setAddress(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Straatnaam 1, 1234 AB Stad" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("Klantemail")}</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="info@bedrijf.nl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("KVK-nummer")} <span className="text-zinc-500 font-normal">({t("optioneel")})</span></Label>
          <Input value={kvkNumber} onChange={e => setKvkNumber(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="12345678" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Standaardtarief (€/uur)")}</Label>
          <Input type="number" min="0" step="0.01" value={standardRate} onChange={e => setStandardRate(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="75.00" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5">
          <X className="size-3.5 mr-1" />{t("Annuleer")}
        </Button>
        <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5">
          <Check className="size-3.5 mr-1" />{loading ? t("Bezig met opslaan...") : t("Save")}
        </Button>
      </div>
    </form>
  );
}

export default function ClientsPage() {
  const [items, setItems] = useState<CashflowClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashflowClient | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api.cashflow.clients.list().then(res => {
      if (active) setItems(res);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSave(data: Omit<CashflowClient, "id" | "userId" | "createdAt">) {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.cashflow.clients.update(editing.id, data);
        setItems(prev => prev.map(i => i.id === editing.id ? updated : i));
      } else {
        const created = await api.cashflow.clients.create(data);
        setItems(prev => [...prev, created]);
      }
      setShowForm(false); setEditing(null);
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("Deze klant verwijderen?"))) return;
    setDeleting(id);
    try {
      await api.cashflow.clients.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {} finally { setDeleting(null); }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Users className="size-5 text-blue-400" />{t("Klanten")}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{items.length} klant{items.length !== 1 ? "en" : ""}</p>
        </div>
        {!showForm && !editing && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5">
            <Plus className="size-3.5 mr-1" />{t("Nieuwe klant")}
          </Button>
        )}
      </div>

      {(showForm && !editing) && (
        <ClientForm onSave={handleSave} onCancel={() => setShowForm(false)} loading={saving} />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="size-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
      ) : items.length === 0 && !showForm ? (
        <div className="text-center py-16 text-zinc-500">
          <Users className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("Geen klanten gevonden.")}</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-blue-400 hover:text-blue-300">{t("Maak je eerste klant aan")}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}>
              {editing?.id === item.id ? (
                <ClientForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} loading={saving} />
              ) : (
                <div className="flex items-start justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">{item.name}</p>
                    <div className="flex flex-wrap gap-3">
                      {item.email && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Mail className="size-3" />{item.email}
                        </span>
                      )}
                      {item.address && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <MapPin className="size-3" />{item.address}
                        </span>
                      )}
                      {item.kvkNumber && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Hash className="size-3" />KVK {item.kvkNumber}
                        </span>
                      )}
                      {item.standardRate && (
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Euro className="size-3" />{item.standardRate}/uur
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(item)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
