import type ExcelJS from "exceljs";
import type { MinorSprintFull } from "@/lib/api";
import {
  EXCEL_MAX_ROW_PT,
  FILL_BRIGHT_BLUE,
  FILL_BRIGHT_RED,
  FILL_LIGHT_BLUE,
  FILL_LIGHT_PINK,
  FILL_SOFT_BLUE,
  FILL_SOFT_PINK,
  FONT_ARIAL_10,
  FONT_ARIAL_10_BOLD,
  FONT_ARIAL_11_BOLD_DARK,
  FONT_ARIAL_11_BOLD_GREEN,
  FONT_ARIAL_13_BOLD_WHITE,
  LOGBOEK_DEFAULT_ROW_PT,
  LOGBOEK_LINE_PT,
  LOGBOEK_MAX_SCALE,
  LOGBOEK_PAGE_HEIGHT_PT,
  LOGBOEK_TEMPLATE_MIN_ROW_PT,
  PLANNING_AGENT_URL,
  THIN_BORDER,
  estimateWrappedLines,
} from "./minor-excel-styles";
import {
  LU_MASTER_DEFINITIONS,
  findSprintByNumber,
  resolveSprintLuArgumentation,
  resolveSprintLuLevel,
} from "./minor-excel-lu";

export function addLogboekSheet(wb: ExcelJS.Workbook, sprints: MinorSprintFull[]): void {
  const wsLogboek = wb.addWorksheet("Logboek", {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: false,
      scale: 55,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  wsLogboek.getColumn(1).width = 9.453125;
  wsLogboek.getColumn(2).width = 50.6328125;
  wsLogboek.getColumn(3).width = 50.6328125;
  wsLogboek.getColumn(4).width = 50.6328125;

  for (let sprintNum = 1; sprintNum <= 8; sprintNum++) {
    const R = (sprintNum - 1) * 28;
    const currentSprint = findSprintByNumber(sprints, sprintNum);

    // Dynamic theme: Odd sprints are Red/Pink; Even sprints are Blue/Ice-blue
    const isEven = sprintNum % 2 === 0;
    const bannerFill = isEven ? FILL_BRIGHT_BLUE : FILL_BRIGHT_RED;
    const sectionFill = isEven ? FILL_SOFT_BLUE : FILL_SOFT_PINK;
    const cellFill = isEven ? FILL_LIGHT_BLUE : FILL_LIGHT_PINK;
    const koprijFill = isEven ? FILL_SOFT_BLUE : FILL_LIGHT_PINK;

    // 1. Sprint Header & Scheiding
    // Rij R+1: SPRINT {N} (Merged A..D)
    const rowR1 = wsLogboek.getRow(R + 1);
    rowR1.height = 18.0;
    wsLogboek.mergeCells(`A${R + 1}:D${R + 1}`);
    const cellMergedHeader = wsLogboek.getCell(`A${R + 1}`);
    cellMergedHeader.value = `SPRINT ${sprintNum}`;
    cellMergedHeader.fill = bannerFill;
    cellMergedHeader.font = FONT_ARIAL_13_BOLD_WHITE;
    cellMergedHeader.alignment = { vertical: "middle", horizontal: "center" };

    // Rij R+2: Lege scheidingsrij
    const rowR2 = wsLogboek.getRow(R + 2);
    for (let c = 1; c <= 4; c++) {
      rowR2.getCell(c).fill = cellFill;
    }

    // 2. Sectie 1: PLANNING (User Stories)
    // Rij R+3: Sectieheader
    const rowR3 = wsLogboek.getRow(R + 3);
    rowR3.height = 16.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR3.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR3.getCell(1).value = "1. PLANNING (User Stories) ";
    const cellR3D = rowR3.getCell(4);
    cellR3D.value = { text: "Plannen met je plannings Agent", hyperlink: PLANNING_AGENT_URL };
    cellR3D.font = FONT_ARIAL_11_BOLD_GREEN;
    cellR3D.alignment = { vertical: "middle", horizontal: "right" };

    // Rij R+4: Koprij
    const rowR4 = wsLogboek.getRow(R + 4);
    const planningHeaders = ["Story", "Story Omschrijving", "Acceptatie Criteria", "Kwaliteitscriteria"];
    planningHeaders.forEach((h, idx) => {
      const cell = rowR4.getCell(idx + 1);
      cell.value = h;
      cell.fill = koprijFill;
      cell.font = FONT_ARIAL_10_BOLD;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: idx === 0 ? "center" : "left",
        wrapText: idx > 0,
      };
    });

    // Rijen R+5 t/m R+9: 5 Story Rijen
    const stories = currentSprint?.stories || [];
    for (let i = 0; i < 5; i++) {
      const storyRowIndex = R + 5 + i;
      const storyRow = wsLogboek.getRow(storyRowIndex);
      const story = stories[i];

      // Kolom A: Story Type (met validatie Lijsten!$B$1:$B$4)
      const cellA = storyRow.getCell(1);
      cellA.value = story?.storyTypeCode || (i === 0 ? "US" : "");
      cellA.fill = cellFill;
      cellA.font = FONT_ARIAL_10;
      cellA.border = THIN_BORDER;
      cellA.alignment = { vertical: "top", horizontal: "center" };
      cellA.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=Lijsten!$B$1:$B$4"],
      };

      // Kolom B: Story Omschrijving
      const cellB = storyRow.getCell(2);
      if (story) {
        if (story.asA || story.iWant || story.soThat) {
          cellB.value = `Als ${story.asA || "< >"} ,wil ik ${story.iWant || "< >"} ,zodat ${story.soThat || "< >"}`;
        } else if (story.title) {
          cellB.value = story.title;
        } else {
          cellB.value = "Als < > ,wil ik < > ,zodat < >";
        }
      } else {
        cellB.value = "Als < > ,wil ik < > ,zodat < >";
      }
      cellB.fill = cellFill;
      cellB.font = FONT_ARIAL_10;
      cellB.border = THIN_BORDER;
      cellB.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      // Kolom C: Acceptatie Criteria
      const cellC = storyRow.getCell(3);
      const accCriteria = (story?.criteria || []).filter((c) => c.type === "acceptance");
      if (accCriteria.length > 0) {
        cellC.value = accCriteria.map((c, cIdx) => `${cIdx + 1}. ${c.text}`).join("\n");
      } else {
        cellC.value = "1. \n2. \n3. ";
      }
      cellC.fill = cellFill;
      cellC.font = FONT_ARIAL_10;
      cellC.border = THIN_BORDER;
      cellC.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      // Kolom D: Kwaliteitscriteria
      const cellD = storyRow.getCell(4);
      const qualCriteria = (story?.criteria || []).filter((c) => c.type === "quality");
      if (qualCriteria.length > 0) {
        cellD.value = qualCriteria.map((c, cIdx) => `${cIdx + 1}. ${c.text}`).join("\n");
      } else {
        cellD.value = "1. \n2. \n3. ";
      }
      cellD.fill = cellFill;
      cellD.font = FONT_ARIAL_10;
      cellD.border = THIN_BORDER;
      cellD.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    }

    // Rij R+10: Lege scheidingsrij
    const rowR10 = wsLogboek.getRow(R + 10);
    for (let c = 1; c <= 4; c++) {
      rowR10.getCell(c).fill = cellFill;
    }

    // 3. Sectie 2: FEEDBACK (Ontvangen van anderen)
    // Rij R+11: Sectieheader
    const rowR11 = wsLogboek.getRow(R + 11);
    rowR11.height = 16.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR11.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR11.getCell(1).value = "2. FEEDBACK (Ontvangen van anderen)";

    // Rij R+12: Koprij
    const rowR12 = wsLogboek.getRow(R + 12);
    const feedbackHeaders = ["Datum", "Van wie", "Feedback", "Jouw actie"];
    feedbackHeaders.forEach((h, idx) => {
      const cell = rowR12.getCell(idx + 1);
      cell.value = h;
      cell.fill = koprijFill;
      cell.font = FONT_ARIAL_10_BOLD;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: idx > 0,
      };
    });

    // Rijen R+13 t/m R+15: 3 Feedback Rijen
    const feedbackList = currentSprint?.feedback || [];
    for (let i = 0; i < 3; i++) {
      const fbRowIndex = R + 13 + i;
      const fbRow = wsLogboek.getRow(fbRowIndex);
      const fb = feedbackList[i];

      const cellA = fbRow.getCell(1);
      cellA.value = fb?.date || "";
      cellA.fill = cellFill;
      cellA.font = FONT_ARIAL_10;
      cellA.border = THIN_BORDER;
      cellA.alignment = { vertical: "top", horizontal: "left" };

      const cellB = fbRow.getCell(2);
      cellB.value = fb?.fromWhom || "";
      cellB.fill = cellFill;
      cellB.font = FONT_ARIAL_10;
      cellB.border = THIN_BORDER;
      cellB.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      const cellC = fbRow.getCell(3);
      cellC.value = fb?.feedback || "";
      cellC.fill = cellFill;
      cellC.font = FONT_ARIAL_10;
      cellC.border = THIN_BORDER;
      cellC.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      const cellD = fbRow.getCell(4);
      cellD.value = fb?.action || "";
      cellD.fill = cellFill;
      cellD.font = FONT_ARIAL_10;
      cellD.border = THIN_BORDER;
      cellD.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    }

    // Rij R+16: Sectie 3 Header
    const rowR16 = wsLogboek.getRow(R + 16);
    rowR16.height = 16.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR16.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR16.getCell(1).value = "3. ZELFEVALUATIE (Mastery)";

    // Rij R+17: Koprij
    const rowR17 = wsLogboek.getRow(R + 17);
    const evalHeaders = ["LU", "Leeruitkomst", "Niveau", "Argumentatie en bewijs"];
    evalHeaders.forEach((h, idx) => {
      const cell = rowR17.getCell(idx + 1);
      cell.value = h;
      cell.fill = koprijFill;
      cell.font = FONT_ARIAL_10_BOLD;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: idx === 0 || idx === 2 ? "center" : "left",
        wrapText: idx > 0,
      };
    });

    // Rijen R+18 t/m R+22: Vaste Leeruitkomsten
    LU_MASTER_DEFINITIONS.forEach((luDef, idx) => {
      const luRowIndex = R + 18 + idx;
      const luRow = wsLogboek.getRow(luRowIndex);

      const level = resolveSprintLuLevel(currentSprint, luDef.lu);
      const argumentation = resolveSprintLuArgumentation(currentSprint, luDef.lu);

      // Cel A: LU Nummer
      const cellA = luRow.getCell(1);
      cellA.value = `LU ${luDef.lu}`;
      cellA.fill = cellFill;
      cellA.font = FONT_ARIAL_10;
      cellA.border = THIN_BORDER;
      cellA.alignment = { vertical: "top", horizontal: "center" };

      // Cel B: Leeruitkomst omschrijving
      const cellB = luRow.getCell(2);
      cellB.value = luDef.name;
      cellB.fill = cellFill;
      cellB.font = FONT_ARIAL_10;
      cellB.border = THIN_BORDER;
      cellB.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      // Cel C: Niveau (met dropdown =Lijsten!$A$1:$A$3)
      const cellC = luRow.getCell(3);
      cellC.value = level;
      cellC.fill = cellFill;
      cellC.font = FONT_ARIAL_10;
      cellC.border = THIN_BORDER;
      cellC.alignment = { vertical: "top", horizontal: "center", wrapText: true };
      cellC.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=Lijsten!$A$1:$A$3"],
      };

      // Cel D: Argumentatie en bewijs
      const cellD = luRow.getCell(4);
      cellD.value = argumentation;
      cellD.fill = cellFill;
      cellD.font = FONT_ARIAL_10;
      cellD.border = THIN_BORDER;
      cellD.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    });

    // Rij R+23: Lege scheidingsrij
    const rowR23 = wsLogboek.getRow(R + 23);
    for (let c = 1; c <= 4; c++) {
      rowR23.getCell(c).fill = cellFill;
    }

    // 5. Sectie 4: REFLECTIE
    // Rij R+24: Sectieheader
    const rowR24 = wsLogboek.getRow(R + 24);
    rowR24.height = 16.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR24.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR24.getCell(1).value = "4. REFLECTIE";

    // Rij R+25: Koprij
    const rowR25 = wsLogboek.getRow(R + 25);
    const reflectionHeaders = [
      "Datum",
      "Wat heb je geleerd?",
      "Wat behoud je?",
      "Wat ga je anders doen?",
    ];
    reflectionHeaders.forEach((h, idx) => {
      const cell = rowR25.getCell(idx + 1);
      cell.value = h;
      cell.fill = koprijFill;
      cell.font = FONT_ARIAL_10_BOLD;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: idx > 0,
      };
    });

    // Rijen R+26 t/m R+28: 3 Reflectierijen
    const reflection = currentSprint?.reflection;
    for (let i = 0; i < 3; i++) {
      const refRowIndex = R + 26 + i;
      const refRow = wsLogboek.getRow(refRowIndex);

      const cellA = refRow.getCell(1);
      cellA.value = i === 0 ? reflection?.date || "" : "";
      cellA.fill = cellFill;
      cellA.font = FONT_ARIAL_10;
      cellA.border = THIN_BORDER;
      cellA.alignment = { vertical: "top", horizontal: "left" };

      const cellB = refRow.getCell(2);
      cellB.value = i === 0 ? reflection?.whatLearned || "" : "";
      cellB.fill = cellFill;
      cellB.font = FONT_ARIAL_10;
      cellB.border = THIN_BORDER;
      cellB.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      const cellC = refRow.getCell(3);
      cellC.value = i === 0 ? reflection?.whatRetained || "" : "";
      cellC.fill = cellFill;
      cellC.font = FONT_ARIAL_10;
      cellC.border = THIN_BORDER;
      cellC.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      const cellD = refRow.getCell(4);
      cellD.value = i === 0 ? reflection?.whatChange || "" : "";
      cellD.fill = cellFill;
      cellD.font = FONT_ARIAL_10;
      cellD.border = THIN_BORDER;
      cellD.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    }
  }

  // Elke sprint begint op een nieuwe pagina en past op precies 1 pagina bij PDF-conversie
  const colWidths = [1, 2, 3, 4].map((c) => wsLogboek.getColumn(c).width ?? 10);
  let tallestBlockPt = 0;
  for (let sprintNum = 1; sprintNum <= 8; sprintNum++) {
    let blockPt = 0;
    for (let r = (sprintNum - 1) * 28 + 1; r <= sprintNum * 28; r++) {
      const row = wsLogboek.getRow(r);
      let maxLines = 1;
      for (let c = 2; c <= 4; c++) {
        const cell = row.getCell(c);
        if (typeof cell.value === "string" && cell.alignment?.wrapText) {
          maxLines = Math.max(maxLines, estimateWrappedLines(cell.value, colWidths[c - 1]));
        }
      }
      const wrapped = maxLines > 1 ? Math.min(EXCEL_MAX_ROW_PT, maxLines * LOGBOEK_LINE_PT + 3) : 0;
      const needed = Math.max(wrapped, LOGBOEK_TEMPLATE_MIN_ROW_PT[r - (sprintNum - 1) * 28] ?? 0);
      if (needed > (row.height ?? 0)) row.height = needed;
      blockPt += row.height ?? LOGBOEK_DEFAULT_ROW_PT;
    }
    tallestBlockPt = Math.max(tallestBlockPt, blockPt);
    if (sprintNum < 8) wsLogboek.getRow(sprintNum * 28).addPageBreak();
  }
  const fitScale = Math.floor((LOGBOEK_PAGE_HEIGHT_PT * 100) / Math.max(tallestBlockPt, 1));
  wsLogboek.pageSetup.scale = Math.max(20, Math.min(LOGBOEK_MAX_SCALE, fitScale));
}

export function addListsSheet(wb: ExcelJS.Workbook): void {
  const wsLijsten = wb.addWorksheet("Lijsten", {
    views: [{ showGridLines: true }],
    state: "hidden",
  });

  wsLijsten.getColumn(1).width = 15;
  wsLijsten.getColumn(2).width = 15;

  // Kolom A: Niveaus voor Zelfevaluatie
  wsLijsten.getCell("A1").value = "-";
  wsLijsten.getCell("A2").value = "O";
  wsLijsten.getCell("A3").value = "V";

  // Kolom B: Story Types
  wsLijsten.getCell("B1").value = "US";
  wsLijsten.getCell("B2").value = "LS";
  wsLijsten.getCell("B3").value = "RS";
  wsLijsten.getCell("B4").value = "";
}
