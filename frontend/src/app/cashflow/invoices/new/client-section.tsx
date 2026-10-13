"use client";

import { t } from "@/lib/lang";
import type { CashflowClient, CashflowProject, CashflowTradeName } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { ClientAutocomplete } from "@/components/client-autocomplete";
import type { Dispatch, SetStateAction } from "react";

export function ClientSection({
  clientId,
  clients,
  creatingClient,
  fieldErrors,
  filteredProjects,
  handleCreateClient,
  handleProjectChange,
  handleSelectClient,
  invoiceName,
  newClientAddress,
  newClientEmail,
  newClientKvk,
  newClientName,
  newClientRate,
  projectId,
  setInvoiceName,
  setNewClientAddress,
  setNewClientEmail,
  setNewClientKvk,
  setNewClientName,
  setNewClientRate,
  setShowNewClient,
  setTradeNameId,
  showNewClient,
  tradeNameId,
  tradeNames,
}: {
  clientId: number | "";
  clients: CashflowClient[];
  creatingClient: boolean;
  fieldErrors: Record<string, string | undefined>;
  filteredProjects: CashflowProject[];
  handleCreateClient: () => void | Promise<void>;
  handleProjectChange: (val: string) => void;
  handleSelectClient: (selected: CashflowClient | null) => void;
  invoiceName: string;
  newClientAddress: string;
  newClientEmail: string;
  newClientKvk: string;
  newClientName: string;
  newClientRate: string;
  projectId: number | "";
  setInvoiceName: Dispatch<SetStateAction<string>>;
  setNewClientAddress: Dispatch<SetStateAction<string>>;
  setNewClientEmail: Dispatch<SetStateAction<string>>;
  setNewClientKvk: Dispatch<SetStateAction<string>>;
  setNewClientName: Dispatch<SetStateAction<string>>;
  setNewClientRate: Dispatch<SetStateAction<string>>;
  setShowNewClient: Dispatch<SetStateAction<boolean>>;
  setTradeNameId: Dispatch<SetStateAction<number | "">>;
  showNewClient: boolean;
  tradeNameId: number | "";
  tradeNames: CashflowTradeName[];
}) {
  return (
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
  );
}
