"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowClient, CashflowProject, CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  toTs,
  toDate,
  addDays,
  recalculateLines,
  type InvoiceLine,
  type LineType,
  type DiscountType,
} from "./invoice-form-utils";
import { ClientSection } from "./client-section";
import { DetailsSection } from "./details-section";
import { LinesSection } from "./lines-section";

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
      date: "",
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
            date: toDate(l.date),
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
      date: "",
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
      const targetStatus = status || "draft";
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
          date: toTs(l.date),
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
      <ClientSection
        clientId={clientId}
        clients={clients}
        creatingClient={creatingClient}
        fieldErrors={fieldErrors}
        filteredProjects={filteredProjects}
        handleCreateClient={handleCreateClient}
        handleProjectChange={handleProjectChange}
        handleSelectClient={handleSelectClient}
        invoiceName={invoiceName}
        newClientAddress={newClientAddress}
        newClientEmail={newClientEmail}
        newClientKvk={newClientKvk}
        newClientName={newClientName}
        newClientRate={newClientRate}
        projectId={projectId}
        setInvoiceName={setInvoiceName}
        setNewClientAddress={setNewClientAddress}
        setNewClientEmail={setNewClientEmail}
        setNewClientKvk={setNewClientKvk}
        setNewClientName={setNewClientName}
        setNewClientRate={setNewClientRate}
        setShowNewClient={setShowNewClient}
        setTradeNameId={setTradeNameId}
        showNewClient={showNewClient}
        tradeNameId={tradeNameId}
        tradeNames={tradeNames}
      />
      {/* Invoice Meta */}
      <DetailsSection
        dateCreated={dateCreated}
        datePaid={datePaid}
        dateService={dateService}
        fieldErrors={fieldErrors}
        handleDateCreatedChange={handleDateCreatedChange}
        invoiceNumber={invoiceNumber}
        isKor={isKor}
        paymentDueDate={paymentDueDate}
        setDatePaid={setDatePaid}
        setDateService={setDateService}
        setFieldErrors={setFieldErrors}
        setInvoiceNumber={setInvoiceNumber}
        setIsKor={setIsKor}
        setPaymentDueDate={setPaymentDueDate}
        setStatus={setStatus}
        status={status}
      />
      {/* Invoice Lines */}
      <LinesSection
        addLine={addLine}
        fieldErrors={fieldErrors}
        isKor={isKor}
        lines={lines}
        removeLine={removeLine}
        total={total}
        updateLine={updateLine}
      />
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
        <Button
          type="button"
          onClick={() => handleSubmit()}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-400 text-white text-sm shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          {saving
            ? t("Bezig met opslaan...")
            : status === "draft"
            ? t("Opslaan als concept")
            : t("Opslaan")}
        </Button>
      </div>
    </div>
  );
}
