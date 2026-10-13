import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { MinorSprintFull } from "@/lib/api";
import {
  LU_MASTER_DEFINITIONS,
  findSprintByNumber,
  resolveSprintLuLevel,
} from "@/lib/minor-excel";
import { COLOR_TEXT_DARK, styles } from "./minor-pdf-styles";

interface DashboardPageProps {
  sprints: MinorSprintFull[];
  portfolioUrl?: string | null;
}

export function DashboardPdfPage({ sprints, portfolioUrl }: DashboardPageProps) {
  // Pre-calculate evaluation levels across all 8 sprints for dashboard
  const sprintLuLevels: Record<number, Record<number, string>> = {};
  for (let sNum = 1; sNum <= 8; sNum++) {
    sprintLuLevels[sNum] = {};
    const sp = findSprintByNumber(sprints, sNum);
    for (let lu = 1; lu <= 5; lu++) {
      sprintLuLevels[sNum][lu] = resolveSprintLuLevel(sp, lu);
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
