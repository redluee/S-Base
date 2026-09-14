import ExcelJS from "exceljs";
import { api, type MinorSprintFull } from "@/lib/api";

const FILL_CARMINE_RED: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC00000" },
};

// Odd Sprints (Red theme)
const FILL_BRIGHT_RED: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE6302B" },
};

const FILL_SOFT_PINK: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFACAC9" },
};

const FILL_LIGHT_PINK: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFDF0F0" },
};

// Even Sprints (Blue theme)
const FILL_BRIGHT_BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF00A1E1" },
};

const FILL_SOFT_BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFB0DEF0" },
};

const FILL_LIGHT_BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDF7FD" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD3D3D3" } },
  left: { style: "thin", color: { argb: "FFD3D3D3" } },
  bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
  right: { style: "thin", color: { argb: "FFD3D3D3" } },
};

const FONT_CALIBRI_11: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  color: { argb: "FF000000" },
};

const FONT_CALIBRI_11_BOLD: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  color: { argb: "FF000000" },
};

const FONT_CALIBRI_11_BOLD_WHITE: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const FONT_CALIBRI_11_BOLD_TEAL_LINK: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  underline: true,
  color: { argb: "FF00E3A4" },
};

const FONT_ARIAL_13_BOLD_WHITE: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 13,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const FONT_ARIAL_11_BOLD_DARK: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 11,
  bold: true,
  color: { argb: "FF1A1A1A" },
};

const FONT_ARIAL_11_BOLD_GREEN: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 11,
  bold: true,
  color: { argb: "FF00A86B" },
};

const FONT_ARIAL_10_BOLD: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FF000000" },
};

const FONT_ARIAL_10: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FF000000" },
};

export const LU_MASTER_DEFINITIONS: Array<{
  lu: number;
  label: string;
  name: string;
  target: number;
  height: number;
}> = [
  {
    lu: 1,
    label: "LU 1: Impact",
    name: "AI-impact op de beroepspraktijk analyseren en evalueren",
    target: 2,
    height: 28.5,
  },
  {
    lu: 2,
    label: "LU 2: Oplossing",
    name: "Praktijkgerikte AI oplossing ontwerpen, realiseren en presenteren",
    target: 4,
    height: 28.5,
  },
  {
    lu: 3,
    label: "LU 3: Ethiek",
    name: "Ethiek en verantwoordelijk AI-gebruik beoordelen",
    target: 2,
    height: 28.5,
  },
  {
    lu: 4,
    label: "LU 4: Tools",
    name: "AI Tools en technieken gebruiken",
    target: 4,
    height: 14.25,
  },
  {
    lu: 5,
    label: "LU 5: Zelfsturing",
    name: "Zelfstandig en zelfsturend werken",
    target: 6,
    height: 14.25,
  },
];

export function findSprintByNumber(sprints: MinorSprintFull[], targetNum: number): MinorSprintFull | undefined {
  return sprints.find((s) => {
    const rawNum = s.sprintNumber ? parseInt(s.sprintNumber.replace(/\D/g, ""), 10) : NaN;
    if (!isNaN(rawNum) && rawNum === targetNum) return true;
    const nameNum = s.name ? parseInt(s.name.replace(/\D/g, ""), 10) : NaN;
    if (!isNaN(nameNum) && nameNum === targetNum) return true;
    return false;
  });
}

export function normalizeEvaluationLevel(level?: string | null): string {
  if (!level) return "-";
  const trimmed = level.trim().toUpperCase();
  if (trimmed === "V") return "V";
  if (trimmed === "O") return "O";
  if (trimmed === "NV") return "O";
  return "-";
}

export function buildIntegraalSprintLogboekWorkbook(sprints: MinorSprintFull[] = []): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S-Base Minor Module";
  wb.created = new Date();

  // Pre-calculate evaluation levels across all 8 sprints for dashboard formula results
  const sprintLuLevels: Record<number, Record<number, string>> = {}; // sprintNum -> lu -> level
  for (let sNum = 1; sNum <= 8; sNum++) {
    sprintLuLevels[sNum] = {};
    const sp = findSprintByNumber(sprints, sNum);
    for (let lu = 1; lu <= 5; lu++) {
      const item = sp?.selfEvaluations?.find((e) => e.learningOutcome === lu);
      sprintLuLevels[sNum][lu] = normalizeEvaluationLevel(item?.level);
    }
  }

  // ==========================================
  // TABBLAD 1: Dashboard
  // ==========================================
  const wsDashboard = wb.addWorksheet("Dashboard", {
    views: [{ showGridLines: true }],
  });

  wsDashboard.getColumn(1).width = 14.5;
  wsDashboard.getColumn(2).width = 6.5;
  wsDashboard.getColumn(3).width = 9.5;
  for (let col = 4; col <= 11; col++) {
    wsDashboard.getColumn(col).width = 9.2;
  }

  // Header Row 1
  const dashRow1 = wsDashboard.getRow(1);
  dashRow1.height = 14.25;

  const cellA1 = dashRow1.getCell(1);
  cellA1.value = "LU";
  cellA1.fill = FILL_CARMINE_RED;
  cellA1.font = FONT_CALIBRI_11_BOLD_WHITE;
  cellA1.border = THIN_BORDER;
  cellA1.alignment = { vertical: "middle", horizontal: "left" };

  const cellB1 = dashRow1.getCell(2);
  cellB1.value = "Doel";
  cellB1.fill = FILL_CARMINE_RED;
  cellB1.font = FONT_CALIBRI_11_BOLD_WHITE;
  cellB1.border = THIN_BORDER;
  cellB1.alignment = { vertical: "middle", horizontal: "center" };

  const cellC1 = dashRow1.getCell(3);
  cellC1.value = "Behaald";
  cellC1.fill = FILL_CARMINE_RED;
  cellC1.font = FONT_CALIBRI_11_BOLD_WHITE;
  cellC1.border = THIN_BORDER;
  cellC1.alignment = { vertical: "middle", horizontal: "center" };

  for (let sprintIdx = 0; sprintIdx < 8; sprintIdx++) {
    const sprintNum = sprintIdx + 1;
    const cell = dashRow1.getCell(sprintIdx + 4);
    const targetRowInLogboek = sprintIdx * 28 + 1;

    cell.value = {
      text: `Sprint ${sprintNum}`,
      hyperlink: `#'Logboek'!A${targetRowInLogboek}`,
    };
    cell.fill = FILL_CARMINE_RED;
    cell.font = FONT_CALIBRI_11_BOLD_TEAL_LINK;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  // Data Rows 2 t/m 6 (LU 1 t/m 5)
  let totalAchieved = 0;
  LU_MASTER_DEFINITIONS.forEach((luDef, idx) => {
    const rowNum = idx + 2;
    const row = wsDashboard.getRow(rowNum);
    row.height = 14.25;

    // Cel A: LU Label
    const cellA = row.getCell(1);
    cellA.value = luDef.label;
    cellA.font = FONT_CALIBRI_11_BOLD;
    cellA.border = THIN_BORDER;
    cellA.alignment = { vertical: "middle", horizontal: "left" };

    // Cel B: Doel
    const cellB = row.getCell(2);
    cellB.value = luDef.target;
    cellB.font = FONT_CALIBRI_11_BOLD;
    cellB.border = THIN_BORDER;
    cellB.alignment = { vertical: "middle", horizontal: "center" };

    // Calculate achieved V's for this LU
    let luAchievedCount = 0;
    for (let sNum = 1; sNum <= 8; sNum++) {
      if (sprintLuLevels[sNum][luDef.lu] === "V") {
        luAchievedCount++;
      }
    }
    totalAchieved += luAchievedCount;

    // Cel C: Behaald
    const cellC = row.getCell(3);
    cellC.value = {
      formula: `COUNTIF(D${rowNum}:K${rowNum}, "V")`,
      result: luAchievedCount,
    };
    cellC.font = FONT_CALIBRI_11_BOLD;
    cellC.border = THIN_BORDER;
    cellC.alignment = { vertical: "middle", horizontal: "center" };

    // Cellen D t/m K: Sprint 1 t/m 8 koppeling naar Logboek
    for (let sprintIdx = 0; sprintIdx < 8; sprintIdx++) {
      const colNum = sprintIdx + 4;
      const cell = row.getCell(colNum);
      const logboekRow = sprintIdx * 28 + 18 + idx;
      const levelResult = sprintLuLevels[sprintIdx + 1][luDef.lu];

      cell.value = {
        formula: `Logboek!C${logboekRow}`,
        result: levelResult,
      };
      cell.font = FONT_CALIBRI_11;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  // Rij 7: Totaal
  const dashRow7 = wsDashboard.getRow(7);
  dashRow7.height = 14.25;

  const cellA7 = dashRow7.getCell(1);
  cellA7.value = "Totaal";
  cellA7.font = FONT_CALIBRI_11_BOLD;
  cellA7.border = THIN_BORDER;
  cellA7.alignment = { vertical: "middle", horizontal: "left" };

  const cellB7 = dashRow7.getCell(2);
  cellB7.value = { formula: "SUM(B2:B6)", result: 18 };
  cellB7.font = FONT_CALIBRI_11_BOLD;
  cellB7.border = THIN_BORDER;
  cellB7.alignment = { vertical: "middle", horizontal: "center" };

  const cellC7 = dashRow7.getCell(3);
  cellC7.value = { formula: "SUM(D6:K7)", result: totalAchieved };
  cellC7.font = FONT_CALIBRI_11_BOLD;
  cellC7.border = THIN_BORDER;
  cellC7.alignment = { vertical: "middle", horizontal: "center" };

  for (let sprintIdx = 0; sprintIdx < 8; sprintIdx++) {
    const colLetter = String.fromCharCode(68 + sprintIdx); // D, E, F, G, H, I, J, K
    const cell = dashRow7.getCell(sprintIdx + 4);

    let sprintVCount = 0;
    for (let lu = 1; lu <= 5; lu++) {
      if (sprintLuLevels[sprintIdx + 1][lu] === "V") {
        sprintVCount++;
      }
    }

    cell.value = {
      formula: `COUNTIF(${colLetter}2:${colLetter}6, "V")`,
      result: sprintVCount,
    };
    cell.font = FONT_CALIBRI_11;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  // ==========================================
  // TABBLAD 2: Logboek
  // ==========================================
  const wsLogboek = wb.addWorksheet("Logboek", {
    views: [{ showGridLines: true }],
  });

  wsLogboek.getColumn(1).width = 12.0;
  wsLogboek.getColumn(2).width = 51.33;
  wsLogboek.getColumn(3).width = 13.0;
  wsLogboek.getColumn(4).width = 13.0;

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
    rowR2.height = 14.25;
    for (let c = 1; c <= 4; c++) {
      rowR2.getCell(c).fill = cellFill;
    }

    // 2. Sectie 1: PLANNING (User Stories)
    // Rij R+3: Sectieheader
    const rowR3 = wsLogboek.getRow(R + 3);
    rowR3.height = 18.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR3.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR3.getCell(1).value = "1. PLANNING (User Stories) ";
    const cellR3D = rowR3.getCell(4);
    cellR3D.value = "Plannen met je plannings Agent";
    cellR3D.font = FONT_ARIAL_11_BOLD_GREEN;
    cellR3D.alignment = { vertical: "middle", horizontal: "right" };

    // Rij R+4: Koprij
    const rowR4 = wsLogboek.getRow(R + 4);
    rowR4.height = 14.25;
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
      storyRow.height = 43.5;
      const story = stories[i];

      // Kolom A: Story Type (met validatie Lijsten!$B$1:$B$4)
      const cellA = storyRow.getCell(1);
      cellA.value = story?.storyTypeCode || "US";
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
    rowR10.height = 14.25;
    for (let c = 1; c <= 4; c++) {
      rowR10.getCell(c).fill = cellFill;
    }

    // 3. Sectie 2: FEEDBACK (Ontvangen van anderen)
    // Rij R+11: Sectieheader
    const rowR11 = wsLogboek.getRow(R + 11);
    rowR11.height = 18.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR11.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR11.getCell(1).value = "2. FEEDBACK (Ontvangen van anderen)";

    // Rij R+12: Koprij
    const rowR12 = wsLogboek.getRow(R + 12);
    rowR12.height = 14.25;
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
      fbRow.height = 14.25;
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
    rowR16.height = 18.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR16.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR16.getCell(1).value = "3. ZELFEVALUATIE (Mastery)";

    // Rij R+17: Koprij
    const rowR17 = wsLogboek.getRow(R + 17);
    rowR17.height = 14.25;
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
      luRow.height = luDef.height;

      const evalItem = currentSprint?.selfEvaluations?.find((e) => e.learningOutcome === luDef.lu);
      const level = normalizeEvaluationLevel(evalItem?.level);
      const argumentation = evalItem?.argumentation || "";

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
    rowR23.height = 14.25;
    for (let c = 1; c <= 4; c++) {
      rowR23.getCell(c).fill = cellFill;
    }

    // 5. Sectie 4: REFLECTIE
    // Rij R+24: Sectieheader
    const rowR24 = wsLogboek.getRow(R + 24);
    rowR24.height = 18.0;
    for (let c = 1; c <= 4; c++) {
      const cell = rowR24.getCell(c);
      cell.fill = sectionFill;
      cell.font = FONT_ARIAL_11_BOLD_DARK;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
    rowR24.getCell(1).value = "4. REFLECTIE";

    // Rij R+25: Koprij
    const rowR25 = wsLogboek.getRow(R + 25);
    rowR25.height = 14.25;
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
      refRow.height = 14.25;

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

  // ==========================================
  // TABBLAD 3: Lijsten
  // ==========================================
  const wsLijsten = wb.addWorksheet("Lijsten", {
    views: [{ showGridLines: true }],
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

  return wb;
}

export async function generateIntegraalSprintLogboekBlob(sprints: MinorSprintFull[] = []): Promise<Blob> {
  const wb = buildIntegraalSprintLogboekWorkbook(sprints);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadIntegraalSprintLogboek(
  providedSprints?: MinorSprintFull[],
  studentName?: string
): Promise<void> {
  let sprintsToUse: MinorSprintFull[] = providedSprints || [];

  // Als er geen sprints zijn meegegeven of minder dan 8, haal alle actuele sprints op
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
      console.warn("Kon sprints niet verifiëren via API, fallback naar meegegeven data:", err);
    }
  }

  // Bepaal de bestandsnaam
  let name = studentName;
  if (!name) {
    try {
      const me = await api.me();
      if (me?.user?.username) {
        name = me.user.username;
      }
    } catch {
      // ignore
    }
  }

  const filename = name
    ? `Integraal_Sprint_Logboek_${name}.xlsx`
    : `Integraal_Sprint_Logboek_v4.xlsx`;

  const blob = await generateIntegraalSprintLogboekBlob(sprintsToUse);

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

// Backwards compatibility aliases
export async function downloadSprintExcel(sprint: MinorSprintFull): Promise<void> {
  await downloadIntegraalSprintLogboek([sprint]);
}

export async function downloadAllSprintsExcel(sprints: MinorSprintFull[]): Promise<void> {
  await downloadIntegraalSprintLogboek(sprints);
}
