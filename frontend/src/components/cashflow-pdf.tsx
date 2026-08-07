"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import type { CashflowInvoiceFull } from "@/lib/api";

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

  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", padding: "40pt 50pt" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
    brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 3 },
    brandMeta: { fontSize: 8, color: "#6b7280", lineHeight: 1.5 },
    label: { fontSize: 7.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    invoiceTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1a1a1a", textAlign: "right" },
    invoiceNumber: { fontSize: 10, color: "#2563eb", textAlign: "right", marginTop: 2 },
    sectionRow: { flexDirection: "row", gap: 20, marginBottom: 20 },
    section: { flex: 1 },
    sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5, paddingBottom: 3, borderBottom: "0.5pt solid #e5e7eb" },
    bodyText: { fontSize: 9, color: "#1a1a1a", lineHeight: 1.4 },
    mutedText: { fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
    table: { marginTop: 8 },
    tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: "5pt 6pt", borderRadius: 3 },
    tableRow: { flexDirection: "row", padding: "5pt 6pt", borderBottom: "0.5pt solid #f3f4f6" },
    tableRowAlt: { flexDirection: "row", padding: "5pt 6pt", borderBottom: "0.5pt solid #f3f4f6", backgroundColor: "#fafafa" },
    colDesc: { flex: 1 },
    colQty: { width: 40, textAlign: "center" },
    colPrice: { width: 65, textAlign: "right" },
    colTotal: { width: 65, textAlign: "right" },
    th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },
    td: { fontSize: 8.5, color: "#1a1a1a" },
    tdMuted: { fontSize: 8.5, color: "#6b7280" },
    divider: { borderTop: "0.5pt solid #e5e7eb", marginTop: 6, marginBottom: 6 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 8 },
    totalLabel: { fontSize: 9, color: "#6b7280" },
    totalAmount: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
    korBox: { marginTop: 12, padding: "8pt 10pt", backgroundColor: "#f9fafb", border: "0.5pt solid #e5e7eb", borderRadius: 3 },
    korText: { fontSize: 8, color: "#6b7280", lineHeight: 1.5, fontStyle: "italic" },
    paymentBox: { marginTop: 16, padding: "10pt 12pt", backgroundColor: "#eff6ff", border: "0.5pt solid #bfdbfe", borderRadius: 3 },
    paymentTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
    paymentRow: { flexDirection: "row", gap: 20 },
    paymentItem: { flex: 1 },
    paymentLabel: { fontSize: 7.5, color: "#3b82f6", marginBottom: 2 },
    paymentValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
    footer: { position: "absolute", bottom: 30, left: 50, right: 50, borderTop: "0.5pt solid #e5e7eb", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: "#9ca3af" },
  });

  const total = invoice.lines.reduce((s, l) => s + l.totalCost, 0);

  const doc = (
    <Document title={`Factuur ${invoice.invoiceNumber}`} author={invoice.tradeNameDisplay ?? "Onbekend"}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{invoice.tradeNameDisplay ?? ""}</Text>
            {invoice.tradeNameAddress ? <Text style={styles.brandMeta}>{invoice.tradeNameAddress}</Text> : null}
            {invoice.tradeNameKvk ? <Text style={styles.brandMeta}>KVK: {invoice.tradeNameKvk}</Text> : null}
            {invoice.tradeNameIban ? <Text style={styles.brandMeta}>IBAN: {invoice.tradeNameIban}</Text> : null}
            {invoice.tradeNameVat ? <Text style={styles.brandMeta}>BTW: {invoice.tradeNameVat}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTUUR</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Client & Invoice Details */}
        <View style={styles.sectionRow}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Factureren aan</Text>
            <Text style={styles.bodyText}>{invoice.clientName}</Text>
            {invoice.clientAddress ? <Text style={styles.mutedText}>{invoice.clientAddress}</Text> : null}
            {invoice.clientEmail ? <Text style={styles.mutedText}>{invoice.clientEmail}</Text> : null}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Factuurgegevens</Text>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 3 }}>
              <Text style={styles.mutedText}>Factuurdatum:</Text>
              <Text style={styles.bodyText}>{formatDate(invoice.dateCreated)}</Text>
            </View>
            {invoice.dateService ? (
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 3 }}>
                <Text style={styles.mutedText}>Datum dienst:</Text>
                <Text style={styles.bodyText}>{formatDate(invoice.dateService)}</Text>
              </View>
            ) : null}
            {invoice.paymentDueDate ? (
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 3 }}>
                <Text style={styles.mutedText}>Vervaldatum:</Text>
                <Text style={styles.bodyText}>{formatDate(invoice.paymentDueDate)}</Text>
              </View>
            ) : null}
            {invoice.projectName ? (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Text style={styles.mutedText}>Project:</Text>
                <Text style={styles.bodyText}>{invoice.projectName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Omschrijving</Text>
            <Text style={[styles.th, styles.colQty]}>Aantal</Text>
            <Text style={[styles.th, styles.colPrice]}>Prijs / eenheid</Text>
            <Text style={[styles.th, styles.colTotal]}>Totaal</Text>
          </View>
          {invoice.lines.map((line, i) => (
            <View key={line.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <View style={styles.colDesc}>
                <Text style={styles.td}>{line.taskDescription}</Text>
                {line.type === "travel_costs" ? <Text style={[styles.tdMuted, { fontSize: 7.5 }]}>Reiskosten</Text> : null}
                {line.type === "discount" ? (
                  <Text style={[styles.tdMuted, { fontSize: 7.5, color: "#10b981" }]}>
                    Korting ({line.discountType === "percentage" ? `${line.discountValue}%` : formatEuro(line.discountValue ?? 0)})
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.tdMuted, styles.colQty]}>
                {line.type === "discount" ? "-" : line.type === "hours" ? `${line.quantity} uur` : line.type === "travel_costs" ? `${line.quantity} km` : `${line.quantity}`}
              </Text>
              <Text style={[styles.tdMuted, styles.colPrice]}>
                {line.type === "discount" ? "-" : formatEuro(line.unitPrice)}
              </Text>
              <Text style={[styles.td, styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>{formatEuro(line.totalCost)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Totaal te betalen</Text>
          <Text style={styles.totalAmount}>{formatEuro(total)}</Text>
        </View>

        {/* KOR */}
        {invoice.isKor && (
          <View style={styles.korBox}>
            <Text style={styles.korText}>
              Op deze factuur is de KOR (Kleineondernemersregeling) van toepassing. Er wordt geen BTW in rekening gebracht.
            </Text>
          </View>
        )}

        {/* Payment info */}
        {invoice.tradeNameIban && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Betalingsinformatie</Text>
            <View style={styles.paymentRow}>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>IBAN</Text>
                <Text style={styles.paymentValue}>{invoice.tradeNameIban}</Text>
              </View>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Betalingsreferentie</Text>
                <Text style={styles.paymentValue}>{invoice.invoiceNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{invoice.tradeNameDisplay ?? ""}</Text>
          <Text style={styles.footerText}>{invoice.invoiceNumber}</Text>
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

export function CashflowPDFButton({ invoice }: { invoice: CashflowInvoiceFull }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await buildAndDownloadPDF(invoice);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF fout");
    } finally {
      setLoading(false);
    }
  }, [invoice]);

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-all disabled:opacity-60 cursor-pointer"
      >
        <Download className="size-3.5" />
        {loading ? "PDF genereren..." : "PDF downloaden"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
