import type { CashflowInvoiceFull } from "@/lib/api";

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

// Lazy-loads @react-pdf/renderer only on click to avoid SSR issues
export async function buildInvoicePDFBlob(invoice: CashflowInvoiceFull): Promise<Blob> {
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
      marginBottom: 4,
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
      paddingTop: 6,
      paddingBottom: 6,
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
      marginTop: 2,
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
      marginBottom: 8,
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
                {line.date ? <Text style={styles.tdMuted}>{formatDate(line.date)}</Text> : null}
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

  return pdf(doc).toBlob();
}
