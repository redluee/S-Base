"use client";

import { useState, useCallback } from "react";
import { Download, AlertTriangle, X } from "lucide-react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import type { CashflowInvoiceFull } from "@/lib/api";

export function getInvoiceValidationWarnings(invoice: CashflowInvoiceFull): string[] {
  const warnings: string[] = [];

  if (!invoice.invoiceNumber?.trim()) {
    warnings.push("Factuurnummer ontbreekt");
  }
  if (!invoice.clientName?.trim()) {
    warnings.push("Klant ontbreekt");
  }
  if (!invoice.projectName?.trim() && !invoice.name?.trim()) {
    warnings.push("Projectnaam ontbreekt");
  }
  if (!invoice.dateCreated) {
    warnings.push("Datum van facturering ontbreekt");
  }
  if (!invoice.dateService) {
    warnings.push("Datum van dienstverlening ontbreekt");
  }
  if (!invoice.paymentDueDate) {
    warnings.push("Vervaldatum ontbreekt");
  }

  if (!invoice.lines || invoice.lines.length === 0) {
    warnings.push("Er zijn geen factuurregels toegevoegd");
  } else {
    invoice.lines.forEach((line, index) => {
      const lineNum = index + 1;
      if (!line.taskDescription?.trim()) {
        warnings.push(`Factuurregel ${lineNum}: Omschrijving ontbreekt`);
      }
      if (line.type !== "discount") {
        if (line.quantity === null || line.quantity === undefined || (line.quantity as any) === "" || Number(line.quantity) <= 0) {
          warnings.push(`Factuurregel ${lineNum}: Aantal is niet correct ingevuld`);
        }
        if (line.unitPrice === null || line.unitPrice === undefined || (line.unitPrice as any) === "" || Number(line.unitPrice) < 0) {
          warnings.push(`Factuurregel ${lineNum}: Prijs per eenheid is niet correct ingevuld`);
        }
      } else {
        if (line.discountValue === null || line.discountValue === undefined || (line.discountValue as any) === "" || Number(line.discountValue) <= 0) {
          warnings.push(`Factuurregel ${lineNum}: Kortingswaarde is niet correct ingevuld`);
        }
      }
    });
  }

  return warnings;
}

interface CashflowPDFButtonProps {
  invoice?: CashflowInvoiceFull;
  invoiceId?: number;
  iconOnly?: boolean;
}

export function CashflowPDFButton({ invoice: initialInvoice, invoiceId, iconOnly }: CashflowPDFButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targetInvoice, setTargetInvoice] = useState<CashflowInvoiceFull | null>(initialInvoice ?? null);

  const startDownload = useCallback(async (invToUse?: CashflowInvoiceFull) => {
    const activeInvoice = invToUse ?? targetInvoice ?? initialInvoice;
    if (!activeInvoice) return;
    setLoading(true);
    setError("");
    setShowWarningModal(false);
    try {
      await buildAndDownloadPDF(activeInvoice);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF fout");
    } finally {
      setLoading(false);
    }
  }, [initialInvoice, targetInvoice]);

  const handleClick = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLoading(true);
    setError("");
    try {
      let inv = initialInvoice;
      if (!inv && invoiceId) {
        inv = await api.cashflow.invoices.get(invoiceId);
      }
      if (!inv) {
        setLoading(false);
        return;
      }
      setTargetInvoice(inv);
      const w = getInvoiceValidationWarnings(inv);
      if (w.length > 0) {
        setWarnings(w);
        setShowWarningModal(true);
        setLoading(false);
      } else {
        await startDownload(inv);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij ophalen factuur");
      setLoading(false);
    }
  }, [initialInvoice, invoiceId, startDownload]);

  const modal = showWarningModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" onClick={e => e.stopPropagation()}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <h3 className="text-base font-bold text-white">{t("Waarschuwing bij PDF downloaden")}</h3>
          </div>
          <button
            onClick={() => setShowWarningModal(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        
        <p className="text-xs text-zinc-400">
          {t("De volgende velden op deze factuur zijn leeg of niet correct ingevuld:")}
        </p>

        <ul className="space-y-1.5 max-h-48 overflow-y-auto p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 text-xs text-zinc-300 list-disc list-inside">
          {warnings.map((w, idx) => (
            <li key={idx} className="text-amber-200/90">{w}</li>
          ))}
        </ul>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setShowWarningModal(false)}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {t("Annuleren")}
          </button>
          <button
            onClick={() => startDownload()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
          >
            {t("Toch downloaden")}
          </button>
        </div>
      </div>
    </div>
  );

  if (iconOnly) {
    return (
      <div className="inline-flex items-center">
        <button
          onClick={handleClick}
          disabled={loading}
          title={loading ? t("PDF genereren...") : t("PDF downloaden")}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <div className="size-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
        </button>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        {modal}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        title={loading ? t("PDF genereren...") : t("PDF downloaden")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-all disabled:opacity-60 cursor-pointer"
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">{loading ? t("PDF genereren...") : t("PDF downloaden")}</span>
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      {modal}
    </div>
  );
}

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

// Lazy-loads @react-pdf/renderer only on click to avoid SSR issues
async function buildAndDownloadPDF(invoice: CashflowInvoiceFull) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const accentColor = "#008767";

  const styles = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: "#2b2b2b",
      backgroundColor: "#ffffff",
      paddingTop: 56.7,
      paddingBottom: 56.7,
      paddingLeft: 51,
      paddingRight: 51,
    },

    /* Header */
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottom: `2pt solid ${accentColor}`,
      paddingBottom: 16,
      marginBottom: 30,
    },
    tradeName: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 0.5,
      color: "#111111",
      marginBottom: 4,
    },
    tradeSub: {
      fontSize: 10,
      color: "#666666",
      lineHeight: 1.4,
    },
    invoiceLabel: {
      alignItems: "flex-end",
    },
    docType: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      color: "#111111",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    referenceText: {
      fontSize: 11,
      color: "#444444",
    },
    referenceValue: {
      fontFamily: "Helvetica-Bold",
      color: accentColor,
    },

    /* Info Section */
    infoSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 30,
      gap: 20,
    },
    infoBlock: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: "#888888",
      marginBottom: 8,
    },
    infoText: {
      fontSize: 11,
      color: "#2b2b2b",
      lineHeight: 1.4,
      marginBottom: 2,
    },

    /* Line items table */
    itemsTable: {
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: "row",
      borderBottom: `2pt solid ${accentColor}`,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 6,
      paddingRight: 6,
    },
    tableRow: {
      flexDirection: "row",
      borderBottom: "1pt solid #eeeeee",
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 6,
      paddingRight: 6,
    },
    colDesc: {
      flex: 1,
    },
    colQty: {
      width: 55,
      textAlign: "right",
    },
    colPrice: {
      width: 90,
      textAlign: "right",
    },
    colAmount: {
      width: 80,
      textAlign: "right",
    },
    th: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#888888",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    td: {
      fontSize: 11,
      color: "#2b2b2b",
    },
    tdMuted: {
      fontSize: 9,
      color: "#666666",
      marginTop: 2,
    },

    /* Totals */
    totalsSection: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
      marginBottom: 30,
    },
    totalsTable: {
      width: 260,
    },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 6,
      paddingBottom: 6,
      paddingLeft: 6,
      paddingRight: 6,
    },
    totalsGrandRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTop: `2pt solid ${accentColor}`,
      paddingTop: 10,
      paddingBottom: 6,
      paddingLeft: 6,
      paddingRight: 6,
    },
    totalsLabel: {
      fontSize: 11,
      color: "#555555",
    },
    totalsValue: {
      fontSize: 11,
      color: "#2b2b2b",
      textAlign: "right",
    },
    totalsGrandLabel: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      color: "#111111",
    },
    totalsGrandValue: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      color: accentColor,
      textAlign: "right",
    },

    /* Meta table */
    metaTable: {
      marginBottom: 30,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottom: "1pt solid #eeeeee",
      paddingTop: 6,
      paddingBottom: 6,
    },
    metaLabel: {
      fontSize: 11,
      color: "#888888",
      width: "45%",
    },
    metaValue: {
      fontSize: 11,
      color: "#2b2b2b",
      fontFamily: "Helvetica-Bold",
      textAlign: "right",
    },

    /* Note Box */
    noteBox: {
      backgroundColor: "#f7f7f5",
      borderLeft: `3pt solid ${accentColor}`,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      marginBottom: 30,
    },
    noteText: {
      fontSize: 10,
      color: "#555555",
      lineHeight: 1.5,
    },

    /* Footer */
    footer: {
      marginTop: 40,
      paddingTop: 14,
      borderTop: "1pt solid #dddddd",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerText: {
      fontSize: 9,
      color: "#999999",
    },
  });

  const total = invoice.lines.reduce((s, l) => s + l.totalCost, 0);

  const doc = (
    <Document title={`Factuur ${invoice.invoiceNumber}`} author={invoice.tradeNameDisplay ?? "Onbekend"}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.tradeName}>{invoice.tradeNameDisplay ?? "Mijn Bedrijf"}</Text>
            {invoice.tradeNameAddress ? <Text style={styles.tradeSub}>{invoice.tradeNameAddress}</Text> : null}
          </View>
          <View style={styles.invoiceLabel}>
            <Text style={styles.docType}>Factuur</Text>
            <Text style={styles.referenceText}>
              Referentie: <Text style={styles.referenceValue}>{invoice.invoiceNumber}</Text>
            </Text>
          </View>
        </View>

        {/* Info section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Gefactureerd aan</Text>
            <Text style={styles.infoText}>{invoice.clientName}</Text>
            {invoice.clientAddress ? <Text style={styles.infoText}>{invoice.clientAddress}</Text> : null}
            {invoice.clientEmail ? <Text style={styles.infoText}>{invoice.clientEmail}</Text> : null}
            {invoice.clientKvk ? <Text style={styles.infoText}>KvK: {invoice.clientKvk}</Text> : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Van</Text>
            <Text style={styles.infoText}>{invoice.tradeNameDisplay ?? "Mijn Bedrijf"}</Text>
            {invoice.tradeNameKvk ? <Text style={styles.infoText}>KvK: {invoice.tradeNameKvk}</Text> : null}
            {invoice.tradeNameIban ? <Text style={styles.infoText}>IBAN: {invoice.tradeNameIban}</Text> : null}
            {invoice.tradeNameVat ? <Text style={styles.infoText}>BTW: {invoice.tradeNameVat}</Text> : null}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Omschrijving</Text>
            <Text style={[styles.th, styles.colQty]}>Aantal</Text>
            <Text style={[styles.th, styles.colPrice]}>Stukprijs</Text>
            <Text style={[styles.th, styles.colAmount]}>Bedrag</Text>
          </View>
          {invoice.lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.td}>{line.taskDescription}</Text>
                {line.type === "travel_costs" ? <Text style={styles.tdMuted}>Reiskosten</Text> : null}
                {line.type === "discount" ? (
                  <Text style={[styles.tdMuted, { color: accentColor }]}>
                    Korting ({line.discountType === "percentage" ? `${line.discountValue}%` : formatEuro(line.discountValue ?? 0)})
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.td, styles.colQty]}>
                {line.type === "discount" ? "-" : line.type === "hours" ? `${line.quantity} uur` : line.type === "travel_costs" ? `${line.quantity} km` : `${line.quantity}`}
              </Text>
              <Text style={[styles.td, styles.colPrice]}>
                {line.type === "discount" ? "-" : formatEuro(line.unitPrice)}
              </Text>
              <Text style={[styles.td, styles.colAmount, { fontFamily: "Helvetica-Bold" }]}>
                {formatEuro(line.totalCost)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotaal</Text>
              <Text style={styles.totalsValue}>{formatEuro(total)}</Text>
            </View>
            <View style={styles.totalsGrandRow}>
              <Text style={styles.totalsGrandLabel}>Totaal te betalen</Text>
              <Text style={styles.totalsGrandValue}>{formatEuro(total)}</Text>
            </View>
          </View>
        </View>

        {/* Meta table */}
        <View style={styles.metaTable}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Factuurreferentie</Text>
            <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Factuurdatum</Text>
            <Text style={styles.metaValue}>{formatDate(invoice.dateCreated)}</Text>
          </View>
          {invoice.dateService ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Datum van dienstverlening</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dateService)}</Text>
            </View>
          ) : null}
          {invoice.paymentDueDate ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Te betalen vóór</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.paymentDueDate)}</Text>
            </View>
          ) : null}
        </View>

        {/* Notes (KOR) */}
        {invoice.isKor && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Op deze factuur wordt geen btw in rekening gebracht, aangezien de kleineondernemersregeling (KOR) van toepassing is.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Bedankt voor uw vertrouwen aan mij bij deze opdracht</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factuur-${invoice.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
