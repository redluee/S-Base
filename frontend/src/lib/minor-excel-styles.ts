import type ExcelJS from "exceljs";

export const FILL_CARMINE_RED: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC00000" },
};

// Odd Sprints (Red theme)
export const FILL_BRIGHT_RED: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE6302B" },
};

export const FILL_SOFT_PINK: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFACAC9" },
};

export const FILL_LIGHT_PINK: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFDF0F0" },
};

// Even Sprints (Blue theme)
export const FILL_BRIGHT_BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF00A1E1" },
};

export const FILL_SOFT_BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFB0DEF0" },
};

export const FILL_LIGHT_BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDF7FD" },
};

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD3D3D3" } },
  left: { style: "thin", color: { argb: "FFD3D3D3" } },
  bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
  right: { style: "thin", color: { argb: "FFD3D3D3" } },
};

export const FONT_CALIBRI_11: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  color: { argb: "FF000000" },
};

export const FONT_CALIBRI_11_BOLD: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  color: { argb: "FF000000" },
};

export const FONT_CALIBRI_11_BOLD_WHITE: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

export const FONT_CALIBRI_11_BOLD_TEAL_LINK: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  underline: true,
  color: { argb: "FF00E3A4" },
};

export const FONT_ARIAL_13_BOLD_WHITE: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 13,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

export const FONT_ARIAL_11_BOLD_DARK: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 11,
  bold: true,
  color: { argb: "FF1A1A1A" },
};

export const FONT_ARIAL_11_BOLD_GREEN: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 11,
  bold: true,
  color: { argb: "FF00A86B" },
};

export const FONT_ARIAL_10_BOLD: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FF000000" },
};

export const FONT_ARIAL_10: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FF000000" },
};

export const FONT_CALIBRI_11_ITALIC_GREY: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  italic: true,
  color: { argb: "FF808080" },
};

export const PLANNING_AGENT_URL = "https://gemini.google.com/gem/e1643241e823?usp=sharing";

export const LOGBOEK_LINE_PT = 12.75;
export const LOGBOEK_TEMPLATE_MIN_ROW_PT: Record<number, number> = { 5: 43, 6: 43, 7: 43, 8: 43, 9: 44, 19: 29 };
export const LOGBOEK_DEFAULT_ROW_PT = 15;
export const LOGBOEK_MAX_SCALE = 55;
export const EXCEL_MAX_ROW_PT = 409;
export const LOGBOEK_CHARS_PER_COLUMN_UNIT = 1.2;
export const LOGBOEK_PAGE_HEIGHT_PT = (11.69 - 0.8) * 72 * 0.95;

export function estimateWrappedLines(text: string, columnWidth: number): number {
  const charsPerLine = Math.max(1, Math.floor(columnWidth * LOGBOEK_CHARS_PER_COLUMN_UNIT));
  return text
    .split("\n")
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / charsPerLine)), 0);
}
