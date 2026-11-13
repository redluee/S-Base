import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { MinorSprintFull } from "@/lib/api";
import { LU_MASTER_DEFINITIONS, luLevelGrid } from "@/app/minor/excel/lu";
import { LEARNING_OUTCOMES, SPRINT_NUMBERS } from "@/app/minor/learning-outcomes";
import { COLOR_TEXT_DARK, styles } from "./styles";

interface DashboardPageProps {
  sprints: MinorSprintFull[];
  portfolioUrl?: string | null;
}

export function DashboardPdfPage({ sprints, portfolioUrl }: DashboardPageProps) {
  const sprintLuLevels = luLevelGrid(sprints);

  let totalAchieved = 0;
  const luCounts: Record<number, number> = {};
  for (const lu of LEARNING_OUTCOMES) {
    let count = 0;
    for (const sNum of SPRINT_NUMBERS) {
      if (sprintLuLevels[sNum][lu] === "V") count++;
    }
    luCounts[lu] = count;
    totalAchieved += count;
  }

  const sprintTotals: Record<number, number> = {};
  for (const sNum of SPRINT_NUMBERS) {
    let count = 0;
    for (const lu of LEARNING_OUTCOMES) {
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
          {SPRINT_NUMBERS.map((sNum) => (
            <View
              key={sNum}
              style={[
                styles.dashHeaderCell,
                { width: "8.75%" },
                sNum === SPRINT_NUMBERS.length ? { borderRightWidth: 0 } : {},
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
            {SPRINT_NUMBERS.map((sNum) => (
              <View
                key={sNum}
                style={[
                  styles.tableCell,
                  { width: "8.75%", alignItems: "center" },
                  sNum === SPRINT_NUMBERS.length ? styles.tableCellLast : {},
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
          {SPRINT_NUMBERS.map((sNum) => (
            <View
              key={sNum}
              style={[
                styles.tableCell,
                { width: "8.75%", alignItems: "center" },
                sNum === SPRINT_NUMBERS.length ? styles.tableCellLast : {},
              ]}
            >
              <Text style={styles.dashDataTextBold}>{sprintTotals[sNum]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.portfolioRow}>
        <View style={styles.portfolioLabelCell}>
          <Text style={styles.portfolioLabelText}>Portfolio</Text>
        </View>
        <View style={styles.portfolioValueCell}>
          <Text style={portfolioUrl ? styles.portfolioValueText : styles.portfolioValueTextPlaceholder}>
            {portfolioUrl || "vul hier je portfolio site url in"}
          </Text>
        </View>
      </View>
    </Page>
  );
}
