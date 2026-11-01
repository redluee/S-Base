"use client";

import { t } from "@/lib/lang";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Dispatch, SetStateAction } from "react";

export function DetailsSection({
  automaticServicePeriod,
  setAutomaticServicePeriod,
  servicePeriodPreview,
  dateCreated,
  datePaid,
  dateService,
  fieldErrors,
  handleDateCreatedChange,
  invoiceNumber,
  isKor,
  paymentDueDate,
  setDatePaid,
  setDateService,
  setFieldErrors,
  setInvoiceNumber,
  setIsKor,
  setPaymentDueDate,
  setStatus,
  status,
}: {
  automaticServicePeriod: boolean;
  setAutomaticServicePeriod: Dispatch<SetStateAction<boolean>>;
  servicePeriodPreview: string;
  dateCreated: string;
  datePaid: string;
  dateService: string;
  fieldErrors: Record<string, string | undefined>;
  handleDateCreatedChange: (val: string) => void;
  invoiceNumber: string;
  isKor: boolean;
  paymentDueDate: string;
  setDatePaid: Dispatch<SetStateAction<string>>;
  setDateService: Dispatch<SetStateAction<string>>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string | undefined>>>;
  setInvoiceNumber: Dispatch<SetStateAction<string>>;
  setIsKor: Dispatch<SetStateAction<boolean>>;
  setPaymentDueDate: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<string>>;
  status: string;
}) {
  return (
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
              <Label htmlFor="service-period-mode" className="text-xs text-zinc-400">{t("Dienstverlening")}</Label>
              <select
                id="service-period-mode"
                value={automaticServicePeriod ? "automatic" : "manual"}
                onChange={e => setAutomaticServicePeriod(e.target.value === "automatic")}
                className="min-h-11 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-brand"
              >
                <option value="automatic">{t("Automatisch uit factuurregels")}</option>
                <option value="manual">{t("Handmatige datum")}</option>
              </select>
              {automaticServicePeriod ? (
                <div aria-live="polite" className="text-xs text-zinc-300 space-y-1 pt-1">
                  <p>{servicePeriodPreview}</p>
                  <p className="text-zinc-400">{t(servicePeriodPreview === "—"
                    ? "Vul bij elke factuurregel een datum in. Kortingsregels tellen niet mee."
                    : "Van de eerste tot en met de laatste regeldatum. Past automatisch mee aan.")}</p>
                </div>
              ) : (
                <>
                  <Label htmlFor="service-date" className="text-xs text-zinc-400">{t("Datum van dienstverlening")}</Label>
                  <Input id="service-date" type="date" value={dateService} onChange={e => setDateService(e.target.value)} className="min-h-11 bg-zinc-800 border-zinc-700" />
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">{t("Vervaldatum")}</Label>
              <Input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            </div>
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
  );
}
