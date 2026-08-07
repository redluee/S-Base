"use client";

import { useState, useEffect } from "react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Pencil, Trash2, X, Check, CreditCard, Hash } from "lucide-react";

function TradeNameForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<CashflowTradeName>;
  onSave: (data: Omit<CashflowTradeName, "id" | "userId" | "createdAt">) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [iban, setIban] = useState(initial?.iban ?? "");
  const [kvkNumber, setKvkNumber] = useState(initial?.kvkNumber ?? "");
  const [vatNumber, setVatNumber] = useState(initial?.vatNumber ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError(t("Handelsnaam is verplicht.")); return; }
    setError("");
    onSave({ displayName: displayName.trim(), address: address.trim() || null, iban: iban.trim() || null, kvkNumber: kvkNumber.trim() || null, vatNumber: vatNumber.trim() || null });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h3 className="text-sm font-semibold text-white">{initial?.id ? t("Handelsnaam bewerken") : t("Handelsnaam aanmaken")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Handelsnaam")}</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="bijv. Steven Heijn IT" />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-zinc-400">{t("Adres")}</Label>
          <Input value={address} onChange={e => setAddress(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Straatnaam 1, 1234 AB Stad" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("IBAN")}</Label>
          <Input value={iban} onChange={e => setIban(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="NL00 BANK 0000 0000 00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("KVK-nummer")}</Label>
          <Input value={kvkNumber} onChange={e => setKvkNumber(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="12345678" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">{t("BTW-nummer")}</Label>
          <Input value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="NL000000000B01" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5">
          <X className="size-3.5 mr-1" />{t("Annuleer")}
        </Button>
        <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5">
          <Check className="size-3.5 mr-1" />{loading ? t("Bezig met opslaan...") : t("Opslaan als concept")}
        </Button>
      </div>
    </form>
  );
}

export default function TradeNamesPage() {
  const [items, setItems] = useState<CashflowTradeName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashflowTradeName | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await api.cashflow.tradeNames.list()); } catch {} finally { setLoading(false); }
  }

  async function handleSave(data: any) {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.cashflow.tradeNames.update(editing.id, data);
        setItems(prev => prev.map(i => i.id === editing.id ? updated : i));
      } else {
        const created = await api.cashflow.tradeNames.create(data);
        setItems(prev => [...prev, created]);
      }
      setShowForm(false); setEditing(null);
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await api.cashflow.tradeNames.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {} finally { setDeleting(null); }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Building2 className="size-5 text-blue-400" />{t("Handelsnamen")}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Jouw handelsnamen voor op facturen</p>
        </div>
        {!showForm && !editing && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5">
            <Plus className="size-3.5 mr-1" />{t("Nieuwe handelsnaam")}
          </Button>
        )}
      </div>

      {(showForm && !editing) && (
        <TradeNameForm onSave={handleSave} onCancel={() => setShowForm(false)} loading={saving} />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="size-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
      ) : items.length === 0 && !showForm ? (
        <div className="text-center py-16 text-zinc-500">
          <Building2 className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("Geen handelsnamen gevonden.")}</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-blue-400 hover:text-blue-300">{t("Maak je eerste handelsnaam aan")}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}>
              {editing?.id === item.id ? (
                <TradeNameForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} loading={saving} />
              ) : (
                <div className="flex items-start justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">{item.displayName}</p>
                    {item.address && <p className="text-xs text-zinc-400">{item.address}</p>}
                    <div className="flex flex-wrap gap-3">
                      {item.iban && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <CreditCard className="size-3" />{item.iban}
                        </span>
                      )}
                      {item.kvkNumber && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Hash className="size-3" />KVK {item.kvkNumber}
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
