"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowClient, CashflowProject, CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { ClientAutocomplete } from "@/components/client-autocomplete";

type LineType = "hours" | "service" | "travel_costs" | "discount";
type DiscountType = "percentage" | "amount";

interface InvoiceLine {
  localId: string;
  taskDescription: string;
  quantity: number | "";
  unitPrice: number | "";
  totalCost: number;
  type: LineType;
  discountType: DiscountType;
  discountValue: number | "";
}

function toTs(dateStr: string): number | null {
  if (!dateStr) return null;
  return new Date(dateStr).getTime();
}

function toDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

function recalculateLines(rawLines: InvoiceLine[]): InvoiceLine[] {
  const nonDiscountSubtotal = rawLines
    .filter(l => l.type !== "discount")
    .reduce((sum, l) => {
      const q = l.quantity === "" || l.quantity === 0 || l.quantity === undefined ? 1 : Number(l.quantity);
      const p = l.unitPrice === "" || l.unitPrice === undefined ? 0 : Number(l.unitPrice);
      return sum + (q * p);
    }, 0);

  return rawLines.map(l => {
    if (l.type === "discount") {
      let cost = 0;
      const val = Number(l.discountValue) || 0;
      if (l.discountType === "percentage") {
        cost = -1 * (nonDiscountSubtotal * (val / 100));
      } else {
        cost = -1 * Math.abs(val);
      }
      return { ...l, totalCost: cost };
    } else {
      const q = l.quantity === "" || l.quantity === 0 || l.quantity === undefined ? 1 : Number(l.quantity);
      const p = l.unitPrice === "" || l.unitPrice === undefined ? 0 : Number(l.unitPrice);
      return { ...l, totalCost: q * p };
    }
  });
}

export function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [clients, setClients] = useState<CashflowClient[]>([]);
  const [projects, setProjects] = useState<CashflowProject[]>([]);
  const [tradeNames, setTradeNames] = useState<CashflowTradeName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Form state
  const [clientId, setClientId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [tradeNameId, setTradeNameId] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [dateCreated, setDateCreated] = useState("");
  const [dateService, setDateService] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [datePaid, setDatePaid] = useState<string>("");
  const [isKor, setIsKor] = useState(true);
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      localId: crypto.randomUUID(),
      taskDescription: "",
      quantity: "",
      unitPrice: 0,
      totalCost: 0,
      type: "hours",
      discountType: "percentage",
      discountValue: 0,
    },
  ]);

  // Inline new client state
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientKvk, setNewClientKvk] = useState("");
  const [newClientRate, setNewClientRate] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const updateFirstLineRate = (rate: number | null | undefined) => {
    if (rate !== undefined && rate !== null) {
      setLines(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[0] = { ...updated[0], unitPrice: rate };
        return recalculateLines(updated);
      });
    }
  };

  const handleSelectClient = (selected: CashflowClient | null) => {
    if (!selected) {
      setClientId("");
      setProjectId("");
    } else {
      const cid = selected.id;
      setClientId(cid);
      if (selected.standardRate !== undefined && selected.standardRate !== null) {
        updateFirstLineRate(selected.standardRate);
      }
      if (projectId) {
        const currentProj = projects.find(item => item.id === Number(projectId));
        if (currentProj && currentProj.clientId !== cid) {
          setProjectId("");
        }
      }
    }
  };

  const handleProjectChange = (val: string) => {
    if (val === "") {
      setProjectId("");
    } else {
      const pid = Number(val);
      setProjectId(pid);
      const p = projects.find(item => item.id === pid);
      if (p) {
        setClientId(p.clientId);
        if (p.tradeNameId) {
          setTradeNameId(p.tradeNameId);
        }
        const client = clients.find(c => c.id === p.clientId);
        if (client?.standardRate !== undefined && client?.standardRate !== null) {
          updateFirstLineRate(client.standardRate);
        }
      }
    }
  };

  const filteredProjects = projects.filter(p => clientId ? p.clientId === Number(clientId) : true);
  const selectedClient = clients.find(c => c.id === Number(clientId));

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [cls, prjs, numRes, tns] = await Promise.all([
          api.cashflow.clients.list(),
          api.cashflow.projects.list(),
          api.cashflow.invoices.nextNumber(),
          api.cashflow.tradeNames.list(),
        ]);
        setClients(cls);
        setProjects(prjs);
        setInvoiceNumber(numRes.invoiceNumber);
        setTradeNames(tns);

        if (editId) {
          const inv = await api.cashflow.invoices.get(Number(editId));
          setClientId(inv.clientId);
          setProjectId(inv.projectId ?? "");
          setTradeNameId(inv.tradeNameId ?? "");
          setInvoiceNumber(inv.invoiceNumber);
          setInvoiceName(inv.name ?? "");
          setDateCreated(toDate(inv.dateCreated));
          setDateService(toDate(inv.dateService));
          setPaymentDueDate(toDate(inv.paymentDueDate));
          setStatus(inv.status);
          setDatePaid(toDate(inv.datePaid));
          setIsKor(inv.isKor);
          setLines(recalculateLines(inv.lines.map(l => ({
            localId: crypto.randomUUID(),
            taskDescription: l.taskDescription,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalCost: l.totalCost,
            type: (l.type as LineType) ?? "hours",
            discountType: (l.discountType as DiscountType) ?? "percentage",
            discountValue: l.discountValue ?? 0,
          }))));
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [editId]);

  // Auto-set payment due date when dateCreated changes
  const handleDateCreatedChange = (val: string) => {
    setDateCreated(val);
    if (val) {
      setPaymentDueDate(addDays(val, 14));
    }
  };

  // Auto-fill unit price from client standard rate when adding lines
  function addLine() {
    const rate = selectedClient?.standardRate ?? 0;
    setLines(prev => recalculateLines([...prev, {
      localId: crypto.randomUUID(),
      taskDescription: "",
      quantity: "",
      unitPrice: rate,
      totalCost: 0,
      type: "hours",
      discountType: "percentage",
      discountValue: 0,
    }]));
  }

  function updateLine(id: string, field: keyof InvoiceLine, value: LineType | DiscountType | string | number) {
    setLines(prev => {
      const updated = prev.map(l => {
        if (l.localId !== id) return l;
        return { ...l, [field]: value };
      });
      return recalculateLines(updated);
    });
  }

  function removeLine(id: string) {
    setLines(prev => recalculateLines(prev.filter(l => l.localId !== id)));
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      const created = await api.cashflow.clients.create({
        name: newClientName.trim(),
        email: newClientEmail.trim() || null,
        address: newClientAddress.trim() || null,
        kvkNumber: newClientKvk.trim() || null,
        standardRate: newClientRate ? Number(newClientRate) : null,
      });
      setClients(prev => [...prev, created]);
      setClientId(created.id);
      setFieldErrors(prev => ({ ...prev, clientId: undefined }));
      if (created.standardRate !== undefined && created.standardRate !== null) {
        updateFirstLineRate(created.standardRate);
      }
      setShowNewClient(false);
      setNewClientName(""); setNewClientEmail(""); setNewClientAddress(""); setNewClientKvk(""); setNewClientRate("");
    } catch {
    } finally {
      setCreatingClient(false);
    }
  }

  const total = lines.reduce((s, l) => s + l.totalCost, 0);

  async function handleSubmit() {
    setError("");
    setFieldErrors({});

    const newFieldErrors: Record<string, string> = {};
    if (!invoiceNumber.trim()) newFieldErrors.invoiceNumber = t("Factuurnummer is verplicht.");
    if (!clientId) newFieldErrors.clientId = t("Selecteer een klant.");
    if (lines.length === 0) newFieldErrors.lines = t("Geen regels toegevoegd.");

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setSaving(true);
    try {
      const hasDateCreated = !!dateCreated;
      const targetStatus = editId ? status : (hasDateCreated ? (status === "draft" ? "sent" : status) : "draft");
      const body = {
        clientId: Number(clientId),
        projectId: projectId ? Number(projectId) : null,
        tradeNameId: tradeNameId ? Number(tradeNameId) : null,
        invoiceNumber: invoiceNumber.trim(),
        name: invoiceName.trim() || null,
        dateCreated: toTs(dateCreated),
        dateService: toTs(dateService),
        paymentDueDate: toTs(paymentDueDate),
        datePaid: targetStatus === "paid" ? (datePaid ? toTs(datePaid) : Date.now()) : null,
        status: targetStatus,
        isKor,
        lines: lines.map(l => ({
          taskDescription: l.taskDescription,
          quantity: l.type === "discount" ? 1 : (l.quantity === "" || l.quantity === 0 || l.quantity === undefined ? 1 : Number(l.quantity)),
          unitPrice: l.type === "discount" ? 0 : (l.unitPrice === "" || l.unitPrice === undefined ? 0 : Number(l.unitPrice)),
          totalCost: l.totalCost,
          type: l.type,
          discountType: l.type === "discount" ? l.discountType : null,
          discountValue: l.type === "discount" ? l.discountValue : null,
        })),
      };
      if (editId) {
        await api.cashflow.invoices.update(Number(editId), body);
      } else {
        await api.cashflow.invoices.create(body);
      }
      router.push("/cashflow/invoices");
    } catch (e: unknown) {
      const rawMsg = e instanceof Error ? e.message : "Fout bij opslaan.";
      const translated = t(rawMsg);
      const lower = (rawMsg + " " + translated).toLowerCase();
      if (lower.includes("invoice number") || lower.includes("factuurnummer")) {
        setFieldErrors(prev => ({ ...prev, invoiceNumber: translated }));
      } else if (lower.includes("client") || lower.includes("klant")) {
        setFieldErrors(prev => ({ ...prev, clientId: translated }));
      } else {
        setError(translated);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="size-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">{editId ? t("Factuur bewerken") : t("Nieuwe factuur")}</h1>

      {/* Client, Project & Trade Name */}
      <div className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <h2 className="text-sm font-semibold text-zinc-300">{t("Klant")}, {t("Project")} & {t("Handelsnaam")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Selecteer klant")}</Label>
            <ClientAutocomplete
              clients={clients}
              selectedClientId={clientId}
              onSelectClient={handleSelectClient}
              placeholder={t("Zoek of selecteer klant")}
            />
            {fieldErrors.clientId && (
              <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.clientId}</p>
            )}
            <button
              type="button"
              onClick={() => setShowNewClient(!showNewClient)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1 cursor-pointer"
            >
              <UserPlus className="size-3" />
              {t("Nieuwe klant aanmaken")}
              {showNewClient ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Selecteer project")} <span className="text-zinc-500 font-normal">({t("optioneel")})</span></Label>
            <select
              value={projectId}
              onChange={e => handleProjectChange(e.target.value)}
              className="w-full text-sm leading-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">{t("(Geen project)")}</option>
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{!clientId ? ` (${p.clientName})` : ""}
                </option>
              ))}
            </select>
            {!projectId && (
              <Input
                placeholder={t("Factuurnaam / Omschrijving (optioneel)")}
                value={invoiceName}
                onChange={e => setInvoiceName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-xs mt-1"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Handelsnaam")} <span className="text-zinc-500 font-normal">({t("optioneel")})</span></Label>
            <select
              value={tradeNameId}
              onChange={e => setTradeNameId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">{t("(Geen handelsnaam / Standaard)")}</option>
              {tradeNames.map(tn => (
                <option key={tn.id} value={tn.id}>
                  {tn.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inline new client form */}
        {showNewClient && (
          <div className="mt-2 p-4 bg-zinc-800/60 border border-zinc-700 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-zinc-300">{t("Klant aanmaken")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder={t("Klantnaam")}
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-xs"
              />
              <Input
                placeholder={t("Klantemail")}
                value={newClientEmail}
                onChange={e => setNewClientEmail(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-xs"
              />
              <Input
                placeholder={t("Klantadres")}
                value={newClientAddress}
                onChange={e => setNewClientAddress(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-xs sm:col-span-2"
              />
              <Input
                placeholder={t("KVK-nummer (optioneel)")}
                value={newClientKvk}
                onChange={e => setNewClientKvk(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-xs"
              />
              <Input
                type="number"
                placeholder="Tarief (€/uur)"
                value={newClientRate}
                onChange={e => setNewClientRate(e.target.value)}
                className="bg-zinc-700 border-zinc-600 text-xs"
              />
              <Button
                type="button"
                onClick={handleCreateClient}
                disabled={creatingClient || !newClientName.trim()}
                className="bg-blue-500 hover:bg-blue-400 text-white text-xs self-end"
              >
                {creatingClient ? "Aanmaken..." : t("Klant aanmaken")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Meta */}
      <div className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <h2 className="text-sm font-semibold text-zinc-300">{t("Factuurdetails")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Factuurnummer")}</Label>
            <Input
              value={invoiceNumber}
              onChange={e => {
                setInvoiceNumber(e.target.value);
                setFieldErrors(prev => ({ ...prev, invoiceNumber: undefined }));
              }}
              className={`bg-zinc-800 border-zinc-700 font-mono ${fieldErrors.invoiceNumber ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`}
            />
            {fieldErrors.invoiceNumber && (
              <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.invoiceNumber}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Datum van facturering")}</Label>
            <Input type="date" value={dateCreated} onChange={e => handleDateCreatedChange(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Datum van dienstverlening")}</Label>
            <Input type="date" value={dateService} onChange={e => setDateService(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{t("Vervaldatum")}</Label>
            <Input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>
          {editId && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">{t("Status")}</Label>
              <select
                value={status}
                onChange={e => {
                  const newStatus = e.target.value;
                  setStatus(newStatus);
                  if (newStatus !== "paid") {
                    setDatePaid("");
                  } else if (!datePaid) {
                    setDatePaid(new Date().toISOString().split("T")[0]);
                  }
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="draft">{t("Concept")}</option>
                <option value="sent">{t("Verzonden / Openstaand")}</option>
                <option value="paid">{t("Betaald")}</option>
              </select>
            </div>
          )}
          {status === "paid" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">{t("Datum van betaling")}</Label>
              <Input
                type="date"
                value={datePaid}
                onChange={e => setDatePaid(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          )}
          <div className="space-y-1.5 flex flex-col justify-end">
            <Label className="text-xs text-zinc-400">{t("KOR (Kleineondernemersregeling)")}</Label>
            <div className="flex items-center gap-2 h-9">
              <Switch checked={isKor} onCheckedChange={setIsKor} id="kor-toggle" />
              <label htmlFor="kor-toggle" className="text-sm text-zinc-300 cursor-pointer">
                {isKor ? "Van toepassing" : "Niet van toepassing"}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Lines */}
      <div className="space-y-4 p-4 sm:p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">{t("Factuurregels")}</h2>
          <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
            <Plus className="size-3.5" />{t("Regel toevoegen")}
          </button>
        </div>
        {fieldErrors.lines && (
          <p className="text-xs text-rose-400 font-medium">{fieldErrors.lines}</p>
        )}

        {/* Header row (desktop only) */}
        <div className="hidden sm:grid grid-cols-[120px_1fr_120px_130px_110px_32px] gap-2 pb-1 border-b border-zinc-800">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">{t("Type")}</span>
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">{t("Omschrijving")}</span>
          <span className="text-[10px] font-semibold text-zinc-500 uppercase text-center">{t("Aantal")}</span>
          <span className="text-[10px] font-semibold text-zinc-500 uppercase text-right">{t("Prijs per eenheid (€)")}</span>
          <span className="text-[10px] font-semibold text-zinc-500 uppercase text-right">{t("Totaal (€)")}</span>
          <span />
        </div>

        <div className="space-y-3 sm:space-y-2.5">
          {lines.map((line, idx) => (
            <div key={line.localId}>
              {/* Mobile View Card (< sm) */}
              <div className="sm:hidden p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    <select
                      value={line.type}
                      onChange={e => updateLine(line.localId, "type", e.target.value as LineType)}
                      className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-blue-500 flex-1"
                    >
                      <option value="hours">{t("Uren")}</option>
                      <option value="service">{t("Dienst")}</option>
                      <option value="travel_costs">{t("Reiskosten")}</option>
                      <option value="discount">{t("Korting")}</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.localId)}
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div>
                  <Label className="text-[11px] text-zinc-400 mb-1 block">{t("Omschrijving")}</Label>
                  <Input
                    placeholder={t("Omschrijving")}
                    value={line.taskDescription}
                    onChange={e => updateLine(line.localId, "taskDescription", e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-zinc-400 mb-1 block">
                      {line.type === "discount" ? t("Kortingstype") : t("Aantal")}
                    </Label>
                    {line.type === "discount" ? (
                      <select
                        value={line.discountType}
                        onChange={e => updateLine(line.localId, "discountType", e.target.value as DiscountType)}
                        className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="percentage">{t("Percentage (%)")}</option>
                        <option value="amount">{t("Bedrag (€)")}</option>
                      </select>
                    ) : (
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="1"
                          value={line.quantity === 0 || line.quantity === "" ? "" : line.quantity}
                          onChange={e => updateLine(line.localId, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                          className="bg-zinc-800 border-zinc-700 text-sm pr-8"
                        />
                        {line.type === "hours" && <span className="absolute right-2 text-xs text-zinc-500 pointer-events-none">{t("uur")}</span>}
                        {line.type === "travel_costs" && <span className="absolute right-2 text-xs text-zinc-500 pointer-events-none">{t("km")}</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-zinc-400 mb-1 block">
                      {line.type === "discount" ? t("Korting") : t("Prijs per eenheid (€)")}
                    </Label>
                    {line.type === "discount" ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={line.discountValue === 0 || line.discountValue === "" ? "" : line.discountValue}
                        onChange={e => updateLine(line.localId, "discountValue", e.target.value === "" ? "" : Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-sm text-right font-mono"
                      />
                    ) : (
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={line.unitPrice === 0 || line.unitPrice === "" ? "" : line.unitPrice}
                          onChange={e => updateLine(line.localId, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                          className={`bg-zinc-800 border-zinc-700 text-sm text-right ${line.type === "hours" ? "pr-14" : line.type === "travel_costs" ? "pr-12" : ""}`}
                        />
                        {line.type === "hours" && <span className="absolute right-2 text-[11px] text-zinc-500 pointer-events-none">{t("per uur")}</span>}
                        {line.type === "travel_costs" && <span className="absolute right-2 text-[11px] text-zinc-500 pointer-events-none">{t("per km")}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-400 font-medium">{t("Regeltotaal")}:</span>
                  <span className={`text-sm font-semibold ${line.totalCost < 0 ? "text-emerald-400" : "text-white"}`}>
                    {formatEuro(line.totalCost)}
                  </span>
                </div>
              </div>

              {/* Desktop View Row (>= sm) */}
              <div className="hidden sm:grid sm:grid-cols-[120px_1fr_120px_130px_110px_32px] gap-2 items-center">
                {/* Type dropdown */}
                <select
                  value={line.type}
                  onChange={e => updateLine(line.localId, "type", e.target.value as LineType)}
                  className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="hours">{t("Uren")}</option>
                  <option value="service">{t("Dienst")}</option>
                  <option value="travel_costs">{t("Reiskosten")}</option>
                  <option value="discount">{t("Korting")}</option>
                </select>

                {/* Task Description */}
                <Input
                  placeholder={t("Omschrijving")}
                  value={line.taskDescription}
                  onChange={e => updateLine(line.localId, "taskDescription", e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-sm"
                />

                {/* Quantity / Discount Mode */}
                {line.type === "discount" ? (
                  <select
                    value={line.discountType}
                    onChange={e => updateLine(line.localId, "discountType", e.target.value as DiscountType)}
                    className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="percentage">{t("Percentage (%)")}</option>
                    <option value="amount">{t("Bedrag (€)")}</option>
                  </select>
                ) : (
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="1"
                      value={line.quantity === 0 || line.quantity === "" ? "" : line.quantity}
                      onChange={e => updateLine(line.localId, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-sm text-center pr-8"
                    />
                    {line.type === "hours" && <span className="absolute right-2 text-xs text-zinc-500 pointer-events-none">{t("uur")}</span>}
                    {line.type === "travel_costs" && <span className="absolute right-2 text-xs text-zinc-500 pointer-events-none">{t("km")}</span>}
                  </div>
                )}

                {/* Unit Price / Discount Value */}
                {line.type === "discount" ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={line.discountValue === 0 || line.discountValue === "" ? "" : line.discountValue}
                    onChange={e => updateLine(line.localId, "discountValue", e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-sm text-right font-mono"
                  />
                ) : (
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={line.unitPrice === 0 || line.unitPrice === "" ? "" : line.unitPrice}
                      onChange={e => updateLine(line.localId, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                      className={`bg-zinc-800 border-zinc-700 text-sm text-right ${line.type === "hours" ? "pr-14" : line.type === "travel_costs" ? "pr-12" : ""}`}
                    />
                    {line.type === "hours" && <span className="absolute right-2 text-[11px] text-zinc-500 pointer-events-none">{t("per uur")}</span>}
                    {line.type === "travel_costs" && <span className="absolute right-2 text-[11px] text-zinc-500 pointer-events-none">{t("per km")}</span>}
                  </div>
                )}

                {/* Total cost display */}
                <div className={`flex items-center h-9 px-3 rounded-lg border border-zinc-700 text-sm justify-end ${line.totalCost < 0 ? "bg-emerald-500/10 text-emerald-400 font-semibold" : "bg-zinc-800/50 text-zinc-300"}`}>
                  {formatEuro(line.totalCost)}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeLine(line.localId)}
                  className="p-1.5 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer justify-self-center"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-end pt-3 border-t border-zinc-800">
          <div className="text-right">
            <p className="text-xs text-zinc-400">{t("Factuurtotaal")}</p>
            <p className="text-xl font-bold text-white">{formatEuro(total)}</p>
            {isKor && (
              <p className="text-[10px] text-zinc-500 mt-0.5">Excl. BTW (KOR)</p>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          onClick={() => router.push("/cashflow/invoices")}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm cursor-pointer"
        >
          {t("Annuleer")}
        </Button>
        {editId ? (
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            {saving ? t("Bezig met opslaan...") : t("Opslaan")}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            {saving ? t("Bezig met opslaan...") : (dateCreated ? t("Opslaan") : t("Opslaan als concept"))}
          </Button>
        )}
      </div>
    </div>
  );
}
