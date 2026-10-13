"use client";

import { t } from "@/lib/lang";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Dispatch, SetStateAction } from "react";

export function DetailsSection({
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
              <Label className="text-xs text-zinc-400">{t("Datum van dienstverlening")}</Label>
              <Input type="date" value={dateService} onChange={e => setDateService(e.target.value)} className="bg-zinc-800 border-zinc-700" />
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
