"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { api, type MinorSprintFull } from "@/lib/api";
import {
  LU_MASTER_DEFINITIONS,
  findSprintByNumber,
  normalizeEvaluationLevel,
} from "@/lib/minor-excel";

// Palette matching Image 1 & Image 2
const COLOR_CARMINE_RED = "#C00000";
const COLOR_ODD_BANNER = "#E6302B";
const COLOR_ODD_SECTION = "#FACAC9";
const COLOR_ODD_CELL = "#FDF0F0";

const COLOR_EVEN_BANNER = "#00A1E1";
const COLOR_EVEN_SECTION = "#B0DEF0";
const COLOR_EVEN_CELL = "#EDF7FD";

const COLOR_GREEN_AGENT = "#00A86B";
const COLOR_TEAL_LINK = "#00E3A4";
const COLOR_BORDER = "#D3D3D3";
const COLOR_TEXT_DARK = "#1A1A1A";
const COLOR_BLACK = "#000000";
const COLOR_WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    color: COLOR_BLACK,
    backgroundColor: "#FFFFFF",
  },
  // Table utilities
  tableBorder: {
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableCell: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
  },
  tableCellLast: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    justifyContent: "center",
  },

  // Dashboard Page Styles
  dashHeaderCell: {
    backgroundColor: COLOR_CARMINE_RED,
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  dashHeaderCellLeft: {
    backgroundColor: COLOR_CARMINE_RED,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
  },
  dashHeaderTextWhite: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_WHITE,
  },
  dashHeaderTextLink: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_TEAL_LINK,
    textDecoration: "underline",
  },
  dashDataTextBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_BLACK,
  },
  dashDataText: {
    fontSize: 8,
    color: COLOR_BLACK,
  },

  // Logboek Sprint Page Styles
  sprintBanner: {
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  sprintBannerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_WHITE,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: COLOR_TEXT_DARK,
  },
  sectionAgentText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_GREEN_AGENT,
  },
  koprijCell: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
  },
  koprijText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_BLACK,
  },
  cellText: {
    fontSize: 7,
    color: COLOR_BLACK,
    lineHeight: 1.25,
  },
  cellTextBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_BLACK,
  },
  spacer: {
    height: 4,
  },
});

interface DashboardPageProps {
  sprints: MinorSprintFull[];
}

function DashboardPdfPage({ sprints }: DashboardPageProps) {
  // Pre-calculate evaluation levels across all 8 sprints for dashboard
  const sprintLuLevels: Record<number, Record<number, string>> = {};
  for (let sNum = 1; sNum <= 8; sNum++) {
    sprintLuLevels[sNum] = {};
    const sp = findSprintByNumber(sprints, sNum);
    for (let lu = 1; lu <= 5; lu++) {
      const item = sp?.selfEvaluations?.find((e) => e.learningOutcome === lu);
      sprintLuLevels[sNum][lu] = normalizeEvaluationLevel(item?.level);
    }
  }

  let totalAchieved = 0;
  const luCounts: Record<number, number> = {};
  for (let lu = 1; lu <= 5; lu++) {
    let count = 0;
    for (let sNum = 1; sNum <= 8; sNum++) {
      if (sprintLuLevels[sNum][lu] === "V") count++;
    }
    luCounts[lu] = count;
    totalAchieved += count;
  }

  const sprintTotals: Record<number, number> = {};
  for (let sNum = 1; sNum <= 8; sNum++) {
    let count = 0;
    for (let lu = 1; lu <= 5; lu++) {
      if (sprintLuLevels[sNum][lu] === "V") count++;
    }
    sprintTotals[sNum] = count;
  }

  return (
    <Page size="A4" style={styles.page}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, color: COLOR_TEXT_DARK }}>
          Voortgangsmatrix & Dashboard
        </Text>
        <Text style={{ fontSize: 7.5, color: "#666666", marginTop: 2 }}>
          Integraal Sprint Logboek - Beoordelingsmatrix
        </Text>
      </View>

      <View style={styles.tableBorder}>
        {/* Header Row */}
        <View style={styles.tableRow}>
          <View style={[styles.dashHeaderCellLeft, { width: "14%" }]}>
            <Text style={styles.dashHeaderTextWhite}>LU</Text>
          </View>
          <View style={[styles.dashHeaderCell, { width: "6.5%" }]}>
            <Text style={styles.dashHeaderTextWhite}>Doel</Text>
          </View>
          <View style={[styles.dashHeaderCell, { width: "9.5%" }]}>
            <Text style={styles.dashHeaderTextWhite}>Behaald</Text>
          </View>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sNum) => (
            <View
              key={sNum}
              style={[
                styles.dashHeaderCell,
                { width: "8.75%" },
                sNum === 8 ? { borderRightWidth: 0 } : {},
              ]}
            >
              <Text style={styles.dashHeaderTextLink}>Sprint {sNum}</Text>
            </View>
          ))}
        </View>

        {/* Data Rows (LU 1 t/m 5) */}
        {LU_MASTER_DEFINITIONS.map((luDef) => (
          <View key={luDef.lu} style={styles.tableRow}>
            <View style={[styles.tableCell, { width: "14%" }]}>
              <Text style={styles.dashDataTextBold}>{luDef.label}</Text>
            </View>
            <View style={[styles.tableCell, { width: "6.5%", alignItems: "center" }]}>
              <Text style={styles.dashDataTextBold}>{luDef.target}</Text>
            </View>
            <View style={[styles.tableCell, { width: "9.5%", alignItems: "center" }]}>
              <Text style={styles.dashDataTextBold}>{luCounts[luDef.lu]}</Text>
            </View>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sNum) => (
              <View
                key={sNum}
                style={[
                  styles.tableCell,
                  { width: "8.75%", alignItems: "center" },
                  sNum === 8 ? styles.tableCellLast : {},
                ]}
              >
                <Text style={styles.dashDataText}>{sprintLuLevels[sNum][luDef.lu] || "-"}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Total Row */}
        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.tableCell, { width: "14%" }]}>
            <Text style={styles.dashDataTextBold}>Totaal</Text>
          </View>
          <View style={[styles.tableCell, { width: "6.5%", alignItems: "center" }]}>
            <Text style={styles.dashDataTextBold}>18</Text>
          </View>
          <View style={[styles.tableCell, { width: "9.5%", alignItems: "center" }]}>
            <Text style={styles.dashDataTextBold}>{totalAchieved}</Text>
          </View>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sNum) => (
            <View
              key={sNum}
              style={[
                styles.tableCell,
                { width: "8.75%", alignItems: "center" },
                sNum === 8 ? styles.tableCellLast : {},
              ]}
            >
              <Text style={styles.dashDataTextBold}>{sprintTotals[sNum]}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

interface SprintPdfPageProps {
  sprintNum: number;
  sprint?: MinorSprintFull;
}

function SprintPdfPage({ sprintNum, sprint }: SprintPdfPageProps) {
  const isEven = sprintNum % 2 === 0;
  const bannerBg = isEven ? COLOR_EVEN_BANNER : COLOR_ODD_BANNER;
  const sectionBg = isEven ? COLOR_EVEN_SECTION : COLOR_ODD_SECTION;
  const cellBg = isEven ? COLOR_EVEN_CELL : COLOR_ODD_CELL;
  const koprijBg = isEven ? COLOR_EVEN_SECTION : COLOR_ODD_CELL;

  const stories = sprint?.stories || [];
  const feedbackList = sprint?.feedback || [];
  const reflection = sprint?.reflection;

  return (
    <Page size="A4" style={styles.page}>
      {/* SPRINT Header Banner */}
      <View style={[styles.sprintBanner, { backgroundColor: bannerBg }]}>
        <Text style={styles.sprintBannerText}>SPRINT {sprintNum}</Text>
      </View>

      {/* ======================================================== */}
      {/* 1. PLANNING (User Stories) */}
      {/* ======================================================== */}
      <View style={[styles.sectionHeaderRow, { backgroundColor: sectionBg }]}>
        <Text style={styles.sectionHeaderText}>1. PLANNING (User Stories) </Text>
        <Text style={styles.sectionAgentText}>Plannen met je plannings Agent</Text>
      </View>

      <View style={styles.tableBorder}>
        {/* Koprij */}
        <View style={[styles.tableRow, { backgroundColor: koprijBg }]}>
          <View style={[styles.koprijCell, { width: "13.4%", alignItems: "center" }]}>
            <Text style={styles.koprijText}>Story</Text>
          </View>
          <View style={[styles.koprijCell, { width: "57.5%" }]}>
            <Text style={styles.koprijText}>Story Omschrijving</Text>
          </View>
          <View style={[styles.koprijCell, { width: "14.55%" }]}>
            <Text style={styles.koprijText}>Acceptatie Criteria</Text>
          </View>
          <View style={[styles.tableCellLast, { width: "14.55%" }]}>
            <Text style={styles.koprijText}>Kwaliteitscriteria</Text>
          </View>
        </View>

        {/* 5 Story Rows */}
        {[0, 1, 2, 3, 4].map((i) => {
          const story = stories[i];
          const accCriteria = (story?.criteria || []).filter((c) => c.type === "acceptance");
          const qualCriteria = (story?.criteria || []).filter((c) => c.type === "quality");

          let storyDesc = "Als < > ,wil ik < > ,zodat < >";
          if (story) {
            if (story.asA || story.iWant || story.soThat) {
              storyDesc = `Als ${story.asA || "< >"} ,wil ik ${story.iWant || "< >"} ,zodat ${story.soThat || "< >"}`;
            } else if (story.title) {
              storyDesc = story.title;
            }
          }

          let accText = "1. \n2. \n3. ";
          if (accCriteria.length > 0) {
            accText = accCriteria.map((c, idx) => `${idx + 1}. ${c.text}`).join("\n");
          }

          let qualText = "1. \n2. \n3. ";
          if (qualCriteria.length > 0) {
            qualText = qualCriteria.map((c, idx) => `${idx + 1}. ${c.text}`).join("\n");
          }

          return (
            <View
              key={i}
              style={[
                styles.tableRow,
                { backgroundColor: cellBg, minHeight: 28 },
                i === 4 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={[styles.tableCell, { width: "13.4%", alignItems: "center" }]}>
                <Text style={styles.cellText}>{story?.storyTypeCode || "US"}</Text>
              </View>
              <View style={[styles.tableCell, { width: "57.5%" }]}>
                <Text style={styles.cellText}>{storyDesc}</Text>
              </View>
              <View style={[styles.tableCell, { width: "14.55%" }]}>
                <Text style={styles.cellText}>{accText}</Text>
              </View>
              <View style={[styles.tableCellLast, { width: "14.55%" }]}>
                <Text style={styles.cellText}>{qualText}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.spacer} />

      {/* ======================================================== */}
      {/* 2. FEEDBACK (Ontvangen van anderen) */}
      {/* ======================================================== */}
      <View style={[styles.sectionHeaderRow, { backgroundColor: sectionBg }]}>
        <Text style={styles.sectionHeaderText}>2. FEEDBACK (Ontvangen van anderen)</Text>
      </View>

      <View style={styles.tableBorder}>
        {/* Koprij */}
        <View style={[styles.tableRow, { backgroundColor: koprijBg }]}>
          <View style={[styles.koprijCell, { width: "13.4%" }]}>
            <Text style={styles.koprijText}>Datum</Text>
          </View>
          <View style={[styles.koprijCell, { width: "20%" }]}>
            <Text style={styles.koprijText}>Van wie</Text>
          </View>
          <View style={[styles.koprijCell, { width: "37.5%" }]}>
            <Text style={styles.koprijText}>Feedback</Text>
          </View>
          <View style={[styles.tableCellLast, { width: "29.1%" }]}>
            <Text style={styles.koprijText}>Jouw actie</Text>
          </View>
        </View>

        {/* 3 Feedback Rows */}
        {[0, 1, 2].map((i) => {
          const fb = feedbackList[i];
          return (
            <View
              key={i}
              style={[
                styles.tableRow,
                { backgroundColor: cellBg, minHeight: 14 },
                i === 2 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={[styles.tableCell, { width: "13.4%" }]}>
                <Text style={styles.cellText}>{fb?.date || " "}</Text>
              </View>
              <View style={[styles.tableCell, { width: "20%" }]}>
                <Text style={styles.cellText}>{fb?.fromWhom || " "}</Text>
              </View>
              <View style={[styles.tableCell, { width: "37.5%" }]}>
                <Text style={styles.cellText}>{fb?.feedback || " "}</Text>
              </View>
              <View style={[styles.tableCellLast, { width: "29.1%" }]}>
                <Text style={styles.cellText}>{fb?.action || " "}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.spacer} />

      {/* ======================================================== */}
      {/* 3. ZELFEVALUATIE (Mastery) */}
      {/* ======================================================== */}
      <View style={[styles.sectionHeaderRow, { backgroundColor: sectionBg }]}>
        <Text style={styles.sectionHeaderText}>3. ZELFEVALUATIE (Mastery)</Text>
      </View>

      <View style={styles.tableBorder}>
        {/* Koprij */}
        <View style={[styles.tableRow, { backgroundColor: koprijBg }]}>
          <View style={[styles.koprijCell, { width: "13.4%", alignItems: "center" }]}>
            <Text style={styles.koprijText}>LU</Text>
          </View>
          <View style={[styles.koprijCell, { width: "57.5%" }]}>
            <Text style={styles.koprijText}>Leeruitkomst</Text>
          </View>
          <View style={[styles.koprijCell, { width: "10%", alignItems: "center" }]}>
            <Text style={styles.koprijText}>Niveau</Text>
          </View>
          <View style={[styles.tableCellLast, { width: "19.1%" }]}>
            <Text style={styles.koprijText}>Argumentatie en bewijs</Text>
          </View>
        </View>

        {/* 5 LU Rows */}
        {LU_MASTER_DEFINITIONS.map((luDef, idx) => {
          const evalItem = sprint?.selfEvaluations?.find((e) => e.learningOutcome === luDef.lu);
          const level = normalizeEvaluationLevel(evalItem?.level);
          const argumentation = evalItem?.argumentation || "";

          return (
            <View
              key={luDef.lu}
              style={[
                styles.tableRow,
                { backgroundColor: cellBg, minHeight: luDef.height > 20 ? 18 : 14 },
                idx === 4 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={[styles.tableCell, { width: "13.4%", alignItems: "center" }]}>
                <Text style={styles.cellText}>LU {luDef.lu}</Text>
              </View>
              <View style={[styles.tableCell, { width: "57.5%" }]}>
                <Text style={styles.cellText}>{luDef.name}</Text>
              </View>
              <View style={[styles.tableCell, { width: "10%", alignItems: "center" }]}>
                <Text style={styles.cellTextBold}>{level}</Text>
              </View>
              <View style={[styles.tableCellLast, { width: "19.1%" }]}>
                <Text style={styles.cellText}>{argumentation || " "}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.spacer} />

      {/* ======================================================== */}
      {/* 4. REFLECTIE */}
      {/* ======================================================== */}
      <View style={[styles.sectionHeaderRow, { backgroundColor: sectionBg }]}>
        <Text style={styles.sectionHeaderText}>4. REFLECTIE</Text>
      </View>

      <View style={styles.tableBorder}>
        {/* Koprij */}
        <View style={[styles.tableRow, { backgroundColor: koprijBg }]}>
          <View style={[styles.koprijCell, { width: "13.4%" }]}>
            <Text style={styles.koprijText}>Datum</Text>
          </View>
          <View style={[styles.koprijCell, { width: "29%" }]}>
            <Text style={styles.koprijText}>Wat heb je geleerd?</Text>
          </View>
          <View style={[styles.koprijCell, { width: "29%" }]}>
            <Text style={styles.koprijText}>Wat behoud je?</Text>
          </View>
          <View style={[styles.tableCellLast, { width: "28.6%" }]}>
            <Text style={styles.koprijText}>Wat ga je anders doen?</Text>
          </View>
        </View>

        {/* 3 Reflectie Rows */}
        {[0, 1, 2].map((i) => {
          const isFirst = i === 0;
          return (
            <View
              key={i}
              style={[
                styles.tableRow,
                { backgroundColor: cellBg, minHeight: 14 },
                i === 2 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={[styles.tableCell, { width: "13.4%" }]}>
                <Text style={styles.cellText}>{isFirst ? reflection?.date || " " : " "}</Text>
              </View>
              <View style={[styles.tableCell, { width: "29%" }]}>
                <Text style={styles.cellText}>{isFirst ? reflection?.whatLearned || " " : " "}</Text>
              </View>
              <View style={[styles.tableCell, { width: "29%" }]}>
                <Text style={styles.cellText}>{isFirst ? reflection?.whatRetained || " " : " "}</Text>
              </View>
              <View style={[styles.tableCellLast, { width: "28.6%" }]}>
                <Text style={styles.cellText}>{isFirst ? reflection?.whatChange || " " : " "}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Page>
  );
}

export interface IntegraalSprintLogboekPdfDocumentProps {
  sprints: MinorSprintFull[];
}

export function IntegraalSprintLogboekPdfDocument({ sprints }: IntegraalSprintLogboekPdfDocumentProps) {
  return (
    <Document title="Integraal Sprint Logboek v4">
      {/* Page 1: Dashboard */}
      <DashboardPdfPage sprints={sprints} />

      {/* Pages 2..9: Sprints 1 t/m 8 */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((sprintNum) => (
        <SprintPdfPage
          key={sprintNum}
          sprintNum={sprintNum}
          sprint={findSprintByNumber(sprints, sprintNum)}
        />
      ))}
    </Document>
  );
}

export async function downloadAllSprintsPDF(providedSprints: MinorSprintFull[] = []): Promise<void> {
  let sprintsToUse: MinorSprintFull[] = providedSprints;

  if (sprintsToUse.length < 8) {
    try {
      const sprintList = await api.minor.sprints.list();
      if (sprintList && sprintList.length > 0) {
        const fullSprints = await Promise.all(
          sprintList.map((s) => api.minor.sprints.get(s.id))
        );
        sprintsToUse = fullSprints;
      }
    } catch (err) {
      console.warn("Could not fetch all sprints for PDF:", err);
    }
  }

  let name = "";
  try {
    const me = await api.me();
    if (me?.user?.username) {
      name = me.user.username;
    }
  } catch {
    // ignore
  }

  const filename = name
    ? `Integraal_Sprint_Logboek_${name}.pdf`
    : `Integraal_Sprint_Logboek_v4.pdf`;

  const doc = <IntegraalSprintLogboekPdfDocument sprints={sprintsToUse} />;
  const blob = await pdf(doc).toBlob();

  if (typeof window !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export async function downloadSprintPDF(sprint: MinorSprintFull): Promise<void> {
  await downloadAllSprintsPDF([sprint]);
}
