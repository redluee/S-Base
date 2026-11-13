"use client";

import { api, type MinorSprintFull } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { generateIntegraalSprintLogboekBlob } from "./excel/workbook";
import { buildLogboekPdfBlob } from "./pdf/portfolio-pdf";

export async function logboekOwner(): Promise<{ baseName: string; portfolioUrl: string | null }> {
  const [{ user }, settings] = await Promise.all([api.me(), api.minor.settings.get()]);
  const name = settings.lastName ? `${user.username}_${settings.lastName}` : user.username;
  return { baseName: `Integraal_Sprint_Logboek_${name}`, portfolioUrl: settings.portfolioUrl ?? null };
}

export async function downloadLogboek(format: "pdf" | "xlsx", sprints: MinorSprintFull[], customName?: string) {
  const { baseName, portfolioUrl } = await logboekOwner();
  const name = (customName?.trim() || baseName).replace(/\.(pdf|xlsx)$/i, "");
  const blob =
    format === "pdf"
      ? await buildLogboekPdfBlob(sprints, portfolioUrl)
      : await generateIntegraalSprintLogboekBlob(sprints, portfolioUrl);
  downloadBlob(blob, `${name}.${format}`);
}

export async function copySprintJson(sprintId: number): Promise<void> {
  const data = await api.minor.sprints.exportJson(sprintId);
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
}

export async function downloadSprintsJson(sprintIds: number[], filename: string): Promise<void> {
  const data = await Promise.all(sprintIds.map((id) => api.minor.sprints.exportJson(id)));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, filename.toLowerCase().replace(/[^a-z0-9_.-]/g, "_"));
}
