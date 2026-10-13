"use client";

import React from "react";
import { Document, pdf } from "@react-pdf/renderer";
import { api, type MinorSprintFull } from "@/lib/api";
import { findSprintByNumber } from "@/lib/minor-excel";
import { DashboardPdfPage } from "./minor-pdf-dashboard";
import { SprintPdfPage } from "./minor-pdf-sprint-page";

export interface IntegraalSprintLogboekPdfDocumentProps {
  sprints: MinorSprintFull[];
  portfolioUrl?: string | null;
}

export function IntegraalSprintLogboekPdfDocument({ sprints, portfolioUrl }: IntegraalSprintLogboekPdfDocumentProps) {
  return (
    <Document title="Integraal Sprint Logboek v4">
      {/* Page 1: Dashboard */}
      <DashboardPdfPage sprints={sprints} portfolioUrl={portfolioUrl} />

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

export async function downloadAllSprintsPDF(
  providedSprints: MinorSprintFull[] = [],
  customFilename?: string
): Promise<void> {
  // Only the sprints explicitly provided are treated as "selected" and get their data filled in;
  // any of Sprint 1 t/m 8 not present here renders as a blank placeholder page.
  const sprintsToUse: MinorSprintFull[] = providedSprints;

  let name = "";
  let portfolioUrl: string | null = null;
  try {
    const [me, settings] = await Promise.all([
      api.me().catch(() => null),
      api.minor.settings.get().catch(() => null),
    ]);
    if (me?.user?.username) {
      name = settings?.lastName ? `${me.user.username}_${settings.lastName}` : me.user.username;
    } else if (settings?.lastName) {
      name = settings.lastName;
    }
    if (settings?.portfolioUrl) {
      portfolioUrl = settings.portfolioUrl;
    }
  } catch {
    // ignore
  }

  const baseFilename = (customFilename?.trim() || (name ? `Integraal_Sprint_Logboek_${name}` : "Integraal_Sprint_Logboek_v4")).replace(/\.pdf$/i, "");
  const filename = `${baseFilename}.pdf`;

  const doc = <IntegraalSprintLogboekPdfDocument sprints={sprintsToUse} portfolioUrl={portfolioUrl} />;
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
