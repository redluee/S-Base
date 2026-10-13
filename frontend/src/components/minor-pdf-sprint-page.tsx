import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import type { MinorSprintFull } from "@/lib/api";
import {
  LU_MASTER_DEFINITIONS,
  resolveSprintLuLevel,
  resolveSprintLuArgumentation,
} from "@/lib/minor-excel";
import {
  COLOR_EVEN_BANNER,
  COLOR_EVEN_CELL,
  COLOR_EVEN_SECTION,
  COLOR_ODD_BANNER,
  COLOR_ODD_CELL,
  COLOR_ODD_SECTION,
  styles,
} from "./minor-pdf-styles";

interface SprintPdfPageProps {
  sprintNum: number;
  sprint?: MinorSprintFull;
}

export function SprintPdfPage({ sprintNum, sprint }: SprintPdfPageProps) {
  const isEven = sprintNum % 2 === 0;
  const bannerBg = isEven ? COLOR_EVEN_BANNER : COLOR_ODD_BANNER;
  const sectionBg = isEven ? COLOR_EVEN_SECTION : COLOR_ODD_SECTION;
  const cellBg = isEven ? COLOR_EVEN_CELL : COLOR_ODD_CELL;
  const koprijBg = isEven ? COLOR_EVEN_SECTION : COLOR_ODD_CELL;

  const isSelected = Boolean(sprint);
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
          <View style={[styles.koprijCell, { width: "28.87%" }]}>
            <Text style={styles.koprijText}>Story Omschrijving</Text>
          </View>
          <View style={[styles.koprijCell, { width: "28.87%" }]}>
            <Text style={styles.koprijText}>Acceptatie Criteria</Text>
          </View>
          <View style={[styles.tableCellLast, { width: "28.86%" }]}>
            <Text style={styles.koprijText}>Kwaliteitscriteria</Text>
          </View>
        </View>

        {/* Story Rows: unselected sprints get a single placeholder row, selected sprints show only their actual stories */}
        {(isSelected ? (stories.length > 0 ? stories : [undefined]) : [undefined]).map((story, i, arr) => {
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
              key={story?.id ?? i}
              style={[
                styles.tableRow,
                { backgroundColor: cellBg, minHeight: 28 },
                i === arr.length - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={[styles.tableCell, { width: "13.4%", alignItems: "center" }]}>
                <Text style={styles.cellText}>{story?.storyTypeCode || "US"}</Text>
              </View>
              <View style={[styles.tableCell, { width: "28.87%" }]}>
                <Text style={styles.cellText}>{storyDesc}</Text>
              </View>
              <View style={[styles.tableCell, { width: "28.87%" }]}>
                <Text style={styles.cellText}>{accText}</Text>
              </View>
              <View style={[styles.tableCellLast, { width: "28.86%" }]}>
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
          <View style={[styles.koprijCell, { width: "28.75%" }]}>
            <Text style={styles.koprijText}>Leeruitkomst</Text>
          </View>
          <View style={[styles.koprijCell, { width: "10%", alignItems: "center" }]}>
            <Text style={styles.koprijText}>Niveau</Text>
          </View>
          <View style={[styles.tableCellLast, { width: "47.85%" }]}>
            <Text style={styles.koprijText}>Argumentatie en bewijs</Text>
          </View>
        </View>

        {/* 5 LU Rows */}
        {LU_MASTER_DEFINITIONS.map((luDef, idx) => {
          const level = resolveSprintLuLevel(sprint, luDef.lu);
          const argumentation = resolveSprintLuArgumentation(sprint, luDef.lu);

          return (
            <View
              key={luDef.lu}
              style={[
                styles.tableRow,
                { backgroundColor: cellBg, minHeight: 14 },
                idx === 4 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={[styles.tableCell, { width: "13.4%", alignItems: "center" }]}>
                <Text style={styles.cellText}>LU {luDef.lu}</Text>
              </View>
              <View style={[styles.tableCell, { width: "28.75%" }]}>
                <Text style={styles.cellText}>{luDef.name}</Text>
              </View>
              <View style={[styles.tableCell, { width: "10%", alignItems: "center" }]}>
                <Text style={styles.cellTextBold}>{level}</Text>
              </View>
              <View style={[styles.tableCellLast, { width: "47.85%" }]}>
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
