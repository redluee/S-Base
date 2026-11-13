import ExcelJS from "exceljs";
import type { MinorSprintFull } from "@/lib/api";
import { luLevelGrid } from "./lu";
import { addDashboardSheet } from "./dashboard";
import { addListsSheet, addLogboekSheet } from "./logboek";


export function buildIntegraalSprintLogboekWorkbook(sprints: MinorSprintFull[] = [], portfolioUrl?: string | null): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S-Base Minor Module";
  wb.created = new Date();

  const sprintLuLevels = luLevelGrid(sprints);

  addDashboardSheet(wb, sprintLuLevels, portfolioUrl);
  addLogboekSheet(wb, sprints);
  addListsSheet(wb);

  return wb;
}

export async function generateIntegraalSprintLogboekBlob(sprints: MinorSprintFull[] = [], portfolioUrl?: string | null): Promise<Blob> {
  const wb = buildIntegraalSprintLogboekWorkbook(sprints, portfolioUrl);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
