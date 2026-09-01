"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { MinorSprintFull } from "@/lib/api";

const brandGreen = "#00e3a4";
const textDark = "#111827";
const textMuted = "#4b5563";
const borderLight = "#e5e7eb";
const bgLight = "#f9fafb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    color: textDark,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: brandGreen,
  },
  sprintTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: textDark,
  },
  sprintMeta: {
    fontSize: 8.5,
    color: textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    backgroundColor: bgLight,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderLeftWidth: 3,
    borderLeftColor: brandGreen,
    marginTop: 10,
    marginBottom: 6,
    color: textDark,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: borderLight,
    borderRadius: 3,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: bgLight,
    borderBottomWidth: 1,
    borderBottomColor: borderLight,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: borderLight,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: "flex-start",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: textDark,
  },
  td: {
    fontSize: 8,
    color: textDark,
  },
  tdMuted: {
    fontSize: 7.5,
    color: textMuted,
  },
  storyBox: {
    borderWidth: 0.5,
    borderColor: borderLight,
    borderRadius: 3,
    padding: 6,
    marginBottom: 6,
    backgroundColor: "#ffffff",
  },
  storyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  storyTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: textDark,
  },
  storyTemplate: {
    fontSize: 8,
    color: textMuted,
    fontStyle: "italic",
    marginBottom: 4,
  },
  criteriaBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: borderLight,
  },
  criteriaCol: {
    width: "48%",
  },
  criteriaTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: textDark,
    marginBottom: 2,
  },
  criterionItem: {
    fontSize: 7,
    color: textDark,
    marginBottom: 1.5,
  },
  evidenceItem: {
    fontSize: 7,
    color: "#0284c7",
    marginTop: 1,
  },
  luBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 2,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: borderLight,
    paddingTop: 4,
    fontSize: 7.5,
    color: textMuted,
  },
});

interface SprintPageProps {
  sprint: MinorSprintFull;
}

function SprintPdfPage({ sprint }: SprintPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sprintTitle}>
            {sprint.name} {sprint.sprintNumber !== sprint.name.replace("Sprint ", "") ? `(${sprint.sprintNumber})` : ""}
          </Text>
          <Text style={styles.sprintMeta}>
            Periode: {sprint.startDate} t/m {sprint.endDate} | Show & Grow: {sprint.showAndGrowDate}
            {sprint.extendedDays > 0 ? ` (+${sprint.extendedDays} dagen verlengd i.v.m. ${sprint.extensionReason})` : ""}
          </Text>
        </View>
        <Text style={styles.statusBadge}>{sprint.status}</Text>
      </View>

      {/* 1. PLANNING */}
      <Text style={styles.sectionTitle}>1. PLANNING</Text>
      {sprint.stories.length === 0 ? (
        <Text style={styles.tdMuted}>Geen stories opgenomen in deze sprintplanning.</Text>
      ) : (
        sprint.stories.map((story) => (
          <View key={story.id} style={styles.storyBox} wrap={false}>
            <View style={styles.storyHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.luBadge}>{story.storyTypeCode}</Text>
                <Text style={styles.storyTitle}>
                  {story.storyNumber ? `[${story.storyNumber}] ` : ""}{story.title}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 2 }}>
                {story.learningOutcomes.map((lu) => (
                  <Text key={lu} style={styles.luBadge}>LU {lu}</Text>
                ))}
              </View>
            </View>

            {(story.asA || story.iWant || story.soThat) && (
              <Text style={styles.storyTemplate}>
                Als {story.asA || "..."}, wil ik {story.iWant || "..."}, zodat {story.soThat || "..."}
              </Text>
            )}

            {/* Criteria dual columns */}
            <View style={styles.criteriaBlock}>
              <View style={styles.criteriaCol}>
                <Text style={styles.criteriaTitle}>Acceptatiecriteria:</Text>
                {(story.criteria?.filter((c) => c.type === "acceptance") || []).length === 0 ? (
                  <Text style={styles.tdMuted}>Geen criteria</Text>
                ) : (
                  story.criteria?.filter((c) => c.type === "acceptance").map((c) => (
                    <Text key={c.id} style={styles.criterionItem}>
                      {c.isCompleted ? "[x]" : "[ ]"} {c.orderIndex}. {c.text}
                    </Text>
                  ))
                )}
              </View>

              <View style={styles.criteriaCol}>
                <Text style={styles.criteriaTitle}>Kwaliteitscriteria:</Text>
                {(story.criteria?.filter((c) => c.type === "quality") || []).length === 0 ? (
                  <Text style={styles.tdMuted}>Geen criteria</Text>
                ) : (
                  story.criteria?.filter((c) => c.type === "quality").map((c) => (
                    <Text key={c.id} style={styles.criterionItem}>
                      {c.isCompleted ? "[x]" : "[ ]"} {c.orderIndex}. {c.text}
                    </Text>
                  ))
                )}
              </View>
            </View>

            {/* Evidence */}
            {story.evidence && story.evidence.length > 0 && (
              <View style={{ marginTop: 3, paddingTop: 2, borderTopWidth: 0.5, borderTopColor: borderLight }}>
                <Text style={styles.criteriaTitle}>Bewijslast / Links:</Text>
                {story.evidence.map((ev) => (
                  <Text key={ev.id} style={styles.evidenceItem}>
                    • ({ev.type}) {ev.title}: {ev.url}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))
      )}

      {/* 2. FEEDBACK */}
      <Text style={styles.sectionTitle}>2. FEEDBACK</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "18%" }]}>Datum</Text>
          <Text style={[styles.th, { width: "22%" }]}>Van wie</Text>
          <Text style={[styles.th, { width: "35%" }]}>Feedback</Text>
          <Text style={[styles.th, { width: "25%" }]}>Jouw actie</Text>
        </View>
        {sprint.feedback.length === 0 ? (
          <View style={[styles.tableRow, styles.tableRowLast]}>
            <Text style={[styles.tdMuted, { width: "100%" }]}>Geen feedbackregels geregistreerd.</Text>
          </View>
        ) : (
          sprint.feedback.map((fb, idx) => (
            <View key={fb.id} style={[styles.tableRow, idx === sprint.feedback.length - 1 ? styles.tableRowLast : {}]}>
              <Text style={[styles.td, { width: "18%" }]}>{fb.date}</Text>
              <Text style={[styles.td, { width: "22%", fontFamily: "Helvetica-Bold" }]}>{fb.fromWhom}</Text>
              <Text style={[styles.td, { width: "35%" }]}>{fb.feedback}</Text>
              <Text style={[styles.td, { width: "25%" }]}>{fb.action}</Text>
            </View>
          ))
        )}
      </View>

      {/* 3. ZELFEVALUATIE & BEOORDELING */}
      <Text style={styles.sectionTitle}>3. ZELFEVALUATIE & BEOORDELING</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "12%" }]}>LU</Text>
          <Text style={[styles.th, { width: "12%" }]}>Zelf (Niv.)</Text>
          <Text style={[styles.th, { width: "60%" }]}>Argumentatie en bewijs</Text>
          <Text style={[styles.th, { width: "16%" }]}>Docent</Text>
        </View>
        {[1, 2, 3, 4, 5].map((luNum, idx) => {
          const evalItem = sprint.selfEvaluations.find((e) => e.learningOutcome === luNum);
          const assessItem = sprint.teacherAssessments.find((a) => a.learningOutcome === luNum);
          return (
            <View key={luNum} style={[styles.tableRow, idx === 4 ? styles.tableRowLast : {}]} wrap={false}>
              <Text style={[styles.td, { width: "12%", fontFamily: "Helvetica-Bold" }]}>LU {luNum}</Text>
              <Text style={[styles.td, { width: "12%", fontFamily: "Helvetica-Bold" }]}>{evalItem?.level ?? "-"}</Text>
              <Text style={[styles.td, { width: "60%" }]}>{evalItem?.argumentation || "Geen toelichting"}</Text>
              <Text style={[styles.td, { width: "16%", fontFamily: "Helvetica-Bold", color: assessItem?.assessment === "V" ? "#059669" : textDark }]}>
                {assessItem?.assessment ?? "-"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 4. REFLECTIE */}
      <Text style={styles.sectionTitle}>4. REFLECTIE</Text>
      <View style={styles.storyBox} wrap={false}>
        <Text style={[styles.tdMuted, { marginBottom: 3 }]}>Datum: {sprint.reflection?.date || "-"}</Text>
        
        <Text style={styles.criteriaTitle}>Wat heb je geleerd?</Text>
        <Text style={[styles.td, { marginBottom: 4 }]}>{sprint.reflection?.whatLearned || "Geen invoer"}</Text>

        <Text style={styles.criteriaTitle}>Wat behoud je?</Text>
        <Text style={[styles.td, { marginBottom: 4 }]}>{sprint.reflection?.whatRetained || "Geen invoer"}</Text>

        <Text style={styles.criteriaTitle}>Wat ga je anders doen?</Text>
        <Text style={styles.td}>{sprint.reflection?.whatChange || "Geen invoer"}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text>S-Base Minor Portfolio - {sprint.name}</Text>
        <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function downloadSprintPDF(sprint: MinorSprintFull) {
  const doc = (
    <Document title={`${sprint.name} - Minor Portfolio`}>
      <SprintPdfPage sprint={sprint} />
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Minor_${sprint.name.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAllSprintsPDF(sprints: MinorSprintFull[]) {
  const doc = (
    <Document title="Minor Portfolio - Verzameling Sprints">
      {sprints.map((sprint) => (
        <SprintPdfPage key={sprint.id} sprint={sprint} />
      ))}
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Minor_Portfolio_Alle_Sprints.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
