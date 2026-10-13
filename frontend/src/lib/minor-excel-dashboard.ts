import type ExcelJS from "exceljs";
import {
  FILL_CARMINE_RED,
  FONT_CALIBRI_11,
  FONT_CALIBRI_11_BOLD,
  FONT_CALIBRI_11_BOLD_TEAL_LINK,
  FONT_CALIBRI_11_BOLD_WHITE,
  FONT_CALIBRI_11_ITALIC_GREY,
  THIN_BORDER,
} from "./minor-excel-styles";
import { LU_MASTER_DEFINITIONS } from "./minor-excel-lu";

export function addDashboardSheet(
  wb: ExcelJS.Workbook,
  sprintLuLevels: Record<number, Record<number, string>>,
  portfolioUrl?: string | null
): void {
  const wsDashboard = wb.addWorksheet("Dashboard", {
    views: [{ showGridLines: true }],
  });

  wsDashboard.getColumn(1).width = 14.453125;
  wsDashboard.getColumn(2).width = 6.453125;
  wsDashboard.getColumn(3).width = 9.453125;
  for (let col = 4; col <= 11; col++) {
    wsDashboard.getColumn(col).width = 9.1796875;
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

  // Rij 9: Portfolio link
  wsDashboard.mergeCells("B9:K9");
  const cellA9 = wsDashboard.getCell("A9");
  cellA9.value = "Portfolio ";
  cellA9.fill = FILL_CARMINE_RED;
  cellA9.font = FONT_CALIBRI_11_BOLD_WHITE;
  cellA9.border = THIN_BORDER;
  cellA9.alignment = { vertical: "middle", horizontal: "left" };

  const cellB9 = wsDashboard.getCell("B9");
  cellB9.value = portfolioUrl || "vul hier je portfolio site url in";
  cellB9.font = portfolioUrl ? FONT_CALIBRI_11 : FONT_CALIBRI_11_ITALIC_GREY;
  cellB9.border = THIN_BORDER;
  cellB9.alignment = { vertical: "middle", horizontal: "center" };
}
