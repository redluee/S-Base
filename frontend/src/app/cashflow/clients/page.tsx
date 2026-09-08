"use client";

import { useState, useEffect, useRef } from "react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Mail,
  MapPin,
  Euro,
  Hash,
  FileText,
  Upload,
  ExternalLink,
  Download,
  Eye,
  Loader2,
} from "lucide-react";

function ClientContractModal({
  client,
  onClose,
}: {
  client: CashflowClient;
  onClose: () => void;
}) {
  if (!client.contractPdfPath) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">
                {client.name} — {t("Contract details")}
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                {client.contractPdfName || "Contract.pdf"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={client.contractPdfPath}
              download={client.contractPdfName || "contract.pdf"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{t("Downloaden")}</span>
            </a>
            <a
              href={client.contractPdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">{t("Openen in nieuw tabblad")}</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="relative flex-1 min-h-[60vh] sm:min-h-[72vh] bg-zinc-950 p-2 sm:p-4">
          <iframe
            src={client.contractPdfPath}
            title={client.contractPdfName || "Contract PDF"}
            className="w-full h-full min-h-[58vh] sm:min-h-[70vh] rounded-xl border border-zinc-800 bg-zinc-900"
          />
        </div>
      </div>
    </div>
  );
}

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
  const [contractPdfPath, setContractPdfPath] = useState(initial?.contractPdfPath ?? "");
  const [contractPdfName, setContractPdfName] = useState(initial?.contractPdfName ?? "");
  const [uploadingContract, setUploadingContract] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError(t("Alleen PDF-bestanden zijn toegestaan."));
      return;
    }

    setError("");
    setUploadingContract(true);
    try {
      const res = await api.cashflow.upload(file, file.name);
      setContractPdfPath(res.filePath);
      setContractPdfName(file.name || res.originalName || "Contract.pdf");
    } catch {
      setError(t("PDF uploaden mislukt"));
    } finally {
      setUploadingContract(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveContract() {
    setContractPdfPath("");
    setContractPdfName("");
  }

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
      contractPdfPath: contractPdfPath.trim() || null,
      contractPdfName: contractPdfName.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
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

        {/* PDF Contract Section */}
        <div className="space-y-2 sm:col-span-2 pt-2 border-t border-zinc-800/80">
          <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <FileText className="size-3.5 text-blue-400" />
            {t("Contract / Overeenkomst (PDF)")}
          </Label>

          {contractPdfPath ? (
            <div className="flex items-center justify-between p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {contractPdfName || "Contract.pdf"}
                  </p>
                  <p className="text-[11px] text-zinc-400">PDF document gekoppeld</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={contractPdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                  title={t("Contract bekijken")}
                >
                  <Eye className="size-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingContract}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title={t("Contract wijzigen")}
                >
                  <Upload className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveContract}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title={t("Contract verwijderen")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 hover:border-blue-500/60 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 transition-all cursor-pointer text-center"
            >
              {uploadingContract ? (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t("Bezig met opslaan...")}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="size-5 mx-auto text-zinc-400 group-hover:text-blue-400 transition-colors" />
                  <p className="text-xs font-medium text-zinc-300 group-hover:text-white">
                    {t("Contract toevoegen")}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {t("Upload een PDF-contract of overeenkomst")}
                  </p>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5">
          <X className="size-3.5 mr-1" />{t("Annuleer")}
        </Button>
        <Button type="submit" disabled={loading || uploadingContract} className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5">
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
  const [viewingContractClient, setViewingContractClient] = useState<CashflowClient | null>(null);

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
                <div className="flex items-start justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors gap-4">
                  <div className="space-y-2.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      {item.contractPdfPath && (
                        <button
                          type="button"
                          onClick={() => setViewingContractClient(item)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors cursor-pointer"
                          title={t("Contract bekijken")}
                        >
                          <FileText className="size-3 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {item.contractPdfName || t("Contract")}
                          </span>
                          <Eye className="size-2.5 text-blue-300 shrink-0" />
                        </button>
                      )}
                    </div>
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
                  <div className="flex items-center gap-1 shrink-0">
                    {item.contractPdfPath && (
                      <button
                        onClick={() => setViewingContractClient(item)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t("Contract bekijken")}
                      >
                        <Eye className="size-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(item)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contract Viewer Lightbox Modal */}
      {viewingContractClient && (
        <ClientContractModal
          client={viewingContractClient}
          onClose={() => setViewingContractClient(null)}
        />
      )}
    </div>
  );
}

