"use client";

import React from "react";
import { Document, pdf } from "@react-pdf/renderer";
import type { MinorSprintFull } from "@/lib/api";
import { findSprintByNumber } from "@/app/minor/excel/lu";
import { SPRINT_NUMBERS } from "@/app/minor/learning-outcomes";
import { DashboardPdfPage } from "./dashboard-page";
import { SprintPdfPage } from "./sprint-page";

interface IntegraalSprintLogboekPdfDocumentProps {
  sprints: MinorSprintFull[];
  portfolioUrl?: string | null;
}

function IntegraalSprintLogboekPdfDocument({ sprints, portfolioUrl }: IntegraalSprintLogboekPdfDocumentProps) {
  return (
    <Document title="Integraal Sprint Logboek v4">
      <DashboardPdfPage sprints={sprints} portfolioUrl={portfolioUrl} />

      {SPRINT_NUMBERS.map((sprintNum) => (
        <SprintPdfPage
          key={sprintNum}
          sprintNum={sprintNum}
          sprint={findSprintByNumber(sprints, sprintNum)}
        />
      ))}
    </Document>
  );
}

export function buildLogboekPdfBlob(sprints: MinorSprintFull[], portfolioUrl: string | null): Promise<Blob> {
  return pdf(<IntegraalSprintLogboekPdfDocument sprints={sprints} portfolioUrl={portfolioUrl} />).toBlob();
}
