"use client";

import { t } from "@/lib/lang";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { InvoiceLine, LineType, DiscountType } from "./invoice-form-utils";
import { formatEuro } from "./invoice-form-utils";

export function LinesSection({
  addLine,
  fieldErrors,
  isKor,
  lines,
  removeLine,
  total,
  updateLine,
}: {
  addLine: () => void;
  fieldErrors: Record<string, string | undefined>;
  isKor: boolean;
  lines: InvoiceLine[];
  removeLine: (id: string) => void;
  total: number;
  updateLine: (id: string, field: keyof InvoiceLine, value: LineType | DiscountType | string | number) => void;
}) {
  return (
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
          <div className="hidden sm:grid grid-cols-[105px_125px_1fr_95px_115px_95px_32px] gap-2 pb-1 border-b border-zinc-800">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">{t("Type")}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">{t("Datum")}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">{t("Omschrijving")}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase text-center">{t("Aantal")}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase text-right">{t("Prijs / eenheid (€)")}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase text-right">{t("Totaal (€)")}</span>
            <span />
          </div>
  
          <div className="space-y-3 sm:space-y-2.5">
            {lines.map((line, idx) => (
              <div key={line.localId}>
                {/* Mobile View Card (< sm) */}
                <div className="sm:hidden p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.localId)}
                      className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-zinc-400 mb-1 block">{t("Type")}</Label>
                      <select
                        value={line.type}
                        onChange={e => updateLine(line.localId, "type", e.target.value as LineType)}
                        className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="hours">{t("Uren")}</option>
                        <option value="service">{t("Dienst")}</option>
                        <option value="travel_costs">{t("Reiskosten")}</option>
                        <option value="discount">{t("Korting")}</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-zinc-400 mb-1 block">{t("Datum")} <span className="text-zinc-500 font-normal">({t("optioneel")})</span></Label>
                      <Input
                        type="date"
                        value={line.date}
                        onChange={e => updateLine(line.localId, "date", e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-xs"
                      />
                    </div>
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
                <div className="hidden sm:grid sm:grid-cols-[105px_125px_1fr_95px_115px_95px_32px] gap-2 items-center">
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
  
                  {/* Date input */}
                  <Input
                    type="date"
                    value={line.date}
                    onChange={e => updateLine(line.localId, "date", e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-xs px-1.5 py-2 text-white"
                    title={t("Datum (optioneel)")}
                  />
  
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
  );
}
