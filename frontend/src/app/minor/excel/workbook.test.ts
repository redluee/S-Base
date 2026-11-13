import { describe, it, expect } from "bun:test";
import ExcelJS from "exceljs";
import { buildIntegraalSprintLogboekWorkbook, generateIntegraalSprintLogboekBlob } from "./workbook";
import { validateSprintForExport } from "../export-validation";
import type { MinorSprintFull } from "@/lib/api";

describe("minor-excel export (Integraal_Sprint_Logboek_v5.xlsx)", () => {
  it("creates exactly 3 sheets in the correct order: Dashboard, Logboek, Lijsten", () => {
    const wb = buildIntegraalSprintLogboekWorkbook([]);
    expect(wb.worksheets.length).toBe(3);
    expect(wb.worksheets[0].name).toBe("Dashboard");
    expect(wb.worksheets[1].name).toBe("Logboek");
    expect(wb.worksheets[2].name).toBe("Lijsten");
  });

  it("starts every sprint on a new printed page and hides Lijsten", () => {
    const wb = buildIntegraalSprintLogboekWorkbook([]);
    const ws = wb.getWorksheet("Logboek")!;
    expect(ws.model.rowBreaks.map((b) => b.id)).toEqual([28, 56, 84, 112, 140, 168, 196]);
    expect(ws.pageSetup.fitToPage).toBe(false);
    expect(ws.pageSetup.scale).toBe(55);
    expect(wb.getWorksheet("Lijsten")!.state).toBe("hidden");
  });

  it("applies the template minimum row heights to every sprint block", () => {
    const ws = buildIntegraalSprintLogboekWorkbook([]).getWorksheet("Logboek")!;
    for (let n = 0; n < 8; n++) {
      for (const r of [5, 6, 7, 8]) expect(ws.getRow(n * 28 + r).height).toBe(43);
      expect(ws.getRow(n * 28 + 9).height).toBe(44);
      expect(ws.getRow(n * 28 + 19).height).toBe(29);
    }
  });

  it("populates Lijsten sheet with correct evaluation levels and story types", () => {
    const wb = buildIntegraalSprintLogboekWorkbook([]);
    const ws = wb.getWorksheet("Lijsten")!;

    expect(ws.getCell("A1").value).toBe("-");
    expect(ws.getCell("A2").value).toBe("O");
    expect(ws.getCell("A3").value).toBe("V");

    expect(ws.getCell("B1").value).toBe("US");
    expect(ws.getCell("B2").value).toBe("LS");
    expect(ws.getCell("B3").value).toBe("RS");
  });

  it("sets correct layout, row heights, column widths and formulas on Dashboard", () => {
    const wb = buildIntegraalSprintLogboekWorkbook([]);
    const ws = wb.getWorksheet("Dashboard")!;

    expect(ws.getColumn(1).width).toBe(14.453125);
    expect(ws.getColumn(2).width).toBe(6.453125);
    expect(ws.getColumn(3).width).toBe(9.453125);
    expect(ws.getColumn(4).width).toBe(9.1796875);
    expect(ws.getColumn(11).width).toBe(9.1796875);

    for (let r = 1; r <= 7; r++) {
      expect(ws.getRow(r).height).toBe(14.25);
    }

    // Row 1 Headers
    expect(ws.getCell("A1").value).toBe("LU");
    expect(ws.getCell("B1").value).toBe("Doel");
    expect(ws.getCell("C1").value).toBe("Behaald");
    expect((ws.getCell("D1").value as { text: string }).text).toBe("Sprint 1");
    expect((ws.getCell("K1").value as { text: string }).text).toBe("Sprint 8");

    // Header fill
    const fillA1 = ws.getCell("A1").fill as ExcelJS.FillPattern;
    expect(fillA1?.fgColor?.argb).toBe("FFC00000");

    // LU 1 (Row 2)
    expect(ws.getCell("A2").value).toBe("LU 1: Impact");
    expect(ws.getCell("B2").value).toBe(2);
    expect((ws.getCell("C2").value as { formula: string }).formula).toBe('COUNTIF(D2:K2, "V")');
    expect((ws.getCell("D2").value as { formula: string }).formula).toBe("Logboek!C18");
    expect((ws.getCell("E2").value as { formula: string }).formula).toBe("Logboek!C46");
    expect((ws.getCell("K2").value as { formula: string }).formula).toBe("Logboek!C214");

    // LU 2 (Row 3)
    expect(ws.getCell("A3").value).toBe("LU 2: Oplossing");
    expect(ws.getCell("B3").value).toBe(4);
    expect((ws.getCell("C3").value as { formula: string }).formula).toBe('COUNTIF(D3:K3, "V")');
    expect((ws.getCell("D3").value as { formula: string }).formula).toBe("Logboek!C19");
    expect((ws.getCell("K3").value as { formula: string }).formula).toBe("Logboek!C215");

    // LU 3 (Row 4)
    expect(ws.getCell("A4").value).toBe("LU 3: Ethiek");
    expect(ws.getCell("B4").value).toBe(2);
    expect((ws.getCell("C4").value as { formula: string }).formula).toBe('COUNTIF(D4:K4, "V")');
    expect((ws.getCell("D4").value as { formula: string }).formula).toBe("Logboek!C20");
    expect((ws.getCell("K4").value as { formula: string }).formula).toBe("Logboek!C216");

    // LU 4 (Row 5)
    expect(ws.getCell("A5").value).toBe("LU 4: Tools");
    expect(ws.getCell("B5").value).toBe(4);
    expect((ws.getCell("C5").value as { formula: string }).formula).toBe('COUNTIF(D5:K5, "V")');
    expect((ws.getCell("D5").value as { formula: string }).formula).toBe("Logboek!C21");
    expect((ws.getCell("K5").value as { formula: string }).formula).toBe("Logboek!C217");

    // LU 5 (Row 6)
    expect(ws.getCell("A6").value).toBe("LU 5: Zelfsturing");
    expect(ws.getCell("B6").value).toBe(6);
    expect((ws.getCell("C6").value as { formula: string }).formula).toBe('COUNTIF(D6:K6, "V")');
    expect((ws.getCell("D6").value as { formula: string }).formula).toBe("Logboek!C22");
    expect((ws.getCell("K6").value as { formula: string }).formula).toBe("Logboek!C218");

    // Row 7 (Totaal)
    expect(ws.getCell("A7").value).toBe("Totaal");
    expect((ws.getCell("B7").value as { formula: string }).formula).toBe("SUM(B2:B6)");
    expect((ws.getCell("C7").value as { formula: string }).formula).toBe("SUM(D6:K7)");
    expect((ws.getCell("D7").value as { formula: string }).formula).toBe('COUNTIF(D2:D6, "V")');
    expect((ws.getCell("K7").value as { formula: string }).formula).toBe('COUNTIF(K2:K6, "V")');

    // Row 9: Portfolio link
    expect(ws.getCell("A9").value).toBe("Portfolio ");
    expect(ws.getCell("B9").value).toBe("vul hier je portfolio site url in");
    const fillA9 = ws.getCell("A9").fill as ExcelJS.FillPattern;
    expect(fillA9?.fgColor?.argb).toBe("FFC00000");
  });

  it("builds 8 sprint blocks of 28 rows each (224 rows total) on Logboek", () => {
    const mockSprints: MinorSprintFull[] = [
      {
        id: 1,
        userId: 1,
        sprintNumber: "1",
        name: "Sprint 1",
        startDate: "2026-09-01",
        endDate: "2026-09-14",
        durationDays: 14,
        showAndGrowDate: "2026-09-14",
        extendedDays: 0,
        extensionReason: null,
        status: "active",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
        stories: [
          {
            id: 101,
            sprintId: 1,
            userId: 1,
            storyTypeCode: "US",
            storyNumber: "1.1",
            title: "Test story",
            asA: "student",
            iWant: "een logboek",
            soThat: "ik slaag",
            learningOutcomes: [1],
            status: "done",
            orderIndex: 0,
            createdAt: "2026-09-01T00:00:00Z",
            criteria: [
              {
                id: 1,
                storyId: 101,
                type: "acceptance",
                orderIndex: 1,
                indent: 0,
                text: "Criterium A",
                isCompleted: true,
              },
              {
                id: 2,
                storyId: 101,
                type: "quality",
                orderIndex: 1,
                indent: 0,
                text: "Kwaliteit A",
                isCompleted: true,
              },
            ],
          },
        ],
        feedback: [
          {
            id: 1,
            sprintId: 1,
            date: "2026-09-05",
            fromWhom: "Docent",
            feedback: "Goede start",
            action: "Doorgaan",
            orderIndex: 0,
            createdAt: "2026-09-05T00:00:00Z",
          },
        ],
        selfEvaluations: [
          {
            id: 1,
            sprintId: 1,
            learningOutcome: 1,
            level: "V",
            argumentation: "Uitstekend bewijs",
            updatedAt: "2026-09-14T00:00:00Z",
          },
        ],
        teacherAssessments: [],
        reflection: {
          id: 1,
          sprintId: 1,
          date: "2026-09-14",
          whatLearned: "Excel formatting",
          whatRetained: "Discipline",
          whatChange: "Vroeger beginnen",
          createdAt: "2026-09-14T00:00:00Z",
          updatedAt: "2026-09-14T00:00:00Z",
        },
      },
    ];

    const wb = buildIntegraalSprintLogboekWorkbook(mockSprints);
    const ws = wb.getWorksheet("Logboek")!;

    expect(ws.getColumn(1).width).toBe(9.453125);
    expect(ws.getColumn(2).width).toBe(50.6328125);
    expect(ws.getColumn(3).width).toBe(50.6328125);
    expect(ws.getColumn(4).width).toBe(50.6328125);

    // Sprint 1 (Rows 1 to 28)
    expect(ws.getCell("A1").value).toBe("SPRINT 1");
    expect(ws.getRow(1).height).toBe(18.0);
    const fillMerged = ws.getCell("A1").fill as ExcelJS.FillPattern;
    expect(fillMerged?.fgColor?.argb).toBe("FFE6302B");

    // Section 1 Header (Row 3)
    expect(ws.getCell("A3").value).toBe("1. PLANNING (User Stories) ");
    expect(ws.getCell("D3").value).toEqual({
      text: "Plannen met je plannings Agent",
      hyperlink: "https://gemini.google.com/gem/e1643241e823?usp=sharing",
    });

    // Story 1 (Row 5)
    expect(ws.getCell("A5").value).toBe("US");
    expect(ws.getCell("A5").dataValidation).toBeDefined();
    expect(ws.getCell("A5").dataValidation?.formulae).toEqual(["=Lijsten!$B$1:$B$4"]);
    expect(ws.getCell("B5").value).toBe("Als student ,wil ik een logboek ,zodat ik slaag");
    expect(ws.getCell("C5").value).toBe("1. Criterium A");
    expect(ws.getCell("D5").value).toBe("1. Kwaliteit A");

    // Story 2 (Row 6 - empty placeholder)
    expect(ws.getCell("B6").value).toBe("Als < > ,wil ik < > ,zodat < >");
    expect(ws.getCell("C6").value).toBe("1. \n2. \n3. ");
    expect(ws.getCell("D6").value).toBe("1. \n2. \n3. ");

    // Section 2 Feedback (Row 11 to 15)
    expect(ws.getCell("A11").value).toBe("2. FEEDBACK (Ontvangen van anderen)");
    expect(ws.getCell("A13").value).toBe("2026-09-05");
    expect(ws.getCell("B13").value).toBe("Docent");
    expect(ws.getCell("C13").value).toBe("Goede start");
    expect(ws.getCell("D13").value).toBe("Doorgaan");

    // Section 3 Self-evaluations (Row 16 to 22)
    expect(ws.getCell("A16").value).toBe("3. ZELFEVALUATIE (Mastery)");
    expect(ws.getCell("A18").value).toBe("LU 1");
    expect(ws.getCell("B18").value).toBe("AI-impact op de beroepspraktijk analyseren en evalueren");
    expect(ws.getCell("C18").value).toBe("V");
    expect(ws.getCell("D18").value).toBe("Uitstekend bewijs");
    expect(ws.getCell("C18").dataValidation?.formulae).toEqual(["=Lijsten!$A$1:$A$3"]);

    // LU 5
    expect(ws.getCell("A22").value).toBe("LU 5");

    // Section 4 Reflection (Row 24 to 28)
    expect(ws.getCell("A24").value).toBe("4. REFLECTIE");
    expect(ws.getCell("A26").value).toBe("2026-09-14");
    expect(ws.getCell("B26").value).toBe("Excel formatting");
    expect(ws.getCell("C26").value).toBe("Discipline");
    expect(ws.getCell("D26").value).toBe("Vroeger beginnen");

    // Sprint 2 (Row 29) should be Blue theme
    expect(ws.getCell("A29").value).toBe("SPRINT 2");
    const fillSprint2 = ws.getCell("A29").fill as ExcelJS.FillPattern;
    expect(fillSprint2?.fgColor?.argb).toBe("FF00A1E1");

    // Sprint 8 last row should be 224
    expect(ws.getCell("A197").value).toBe("SPRINT 8");
    expect(ws.getCell("A214").value).toBe("LU 1");
    expect(ws.getCell("A218").value).toBe("LU 5");
  });

  it("generates a valid binary blob", async () => {
    const blob = await generateIntegraalSprintLogboekBlob([]);
    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(blob.size).toBeGreaterThan(5000);
  });

  it("uses the shared pass rule: self-evaluated or teacher V passes, teacher O or NV fails, and drafts missing argumentation from stories", () => {
    const mockSprints: MinorSprintFull[] = [
      {
        id: 1,
        userId: 1,
        sprintNumber: "1",
        name: "Sprint 1",
        startDate: "2026-09-01",
        endDate: "2026-09-14",
        durationDays: 14,
        showAndGrowDate: "2026-09-14",
        extendedDays: 0,
        extensionReason: null,
        status: "active",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
        stories: [
          {
            id: 101,
            sprintId: 1,
            userId: 1,
            storyTypeCode: "US",
            storyNumber: "1.1",
            title: "Realized LU 1 and LU 2 story",
            asA: "student",
            iWant: "feature",
            soThat: "impact",
            learningOutcomes: [1, 2],
            status: "done",
            orderIndex: 0,
            createdAt: "2026-09-01T00:00:00Z",
            criteria: [],
            evidence: [
              {
                id: 1,
                storyId: 101,
                type: "github",
                title: "PR #42",
                url: "https://github.com/example/pr/42",
                createdAt: "2026-09-01T00:00:00Z",
              },
            ],
          },
        ],
        feedback: [],
        selfEvaluations: [
          { id: 1, sprintId: 1, learningOutcome: 1, level: "V", argumentation: "Custom LU1 argumentation", updatedAt: "" },
          { id: 2, sprintId: 1, learningOutcome: 2, level: "V", argumentation: "", updatedAt: "" },
          { id: 3, sprintId: 1, learningOutcome: 3, level: "NV", argumentation: "", updatedAt: "" },
          { id: 4, sprintId: 1, learningOutcome: 4, level: "-", argumentation: "", updatedAt: "" },
          { id: 5, sprintId: 1, learningOutcome: 5, level: "-", argumentation: "", updatedAt: "" },
        ],
        teacherAssessments: [
          { id: 1, sprintId: 1, learningOutcome: 2, assessment: "O", notes: "", evaluatedAt: "" },
          { id: 2, sprintId: 1, learningOutcome: 5, assessment: "V", notes: "", evaluatedAt: "" },
        ],
        reflection: null,
      },
    ];

    const wb = buildIntegraalSprintLogboekWorkbook(mockSprints);
    const wsLog = wb.getWorksheet("Logboek")!;
    const wsDash = wb.getWorksheet("Dashboard")!;

    expect(["C18", "C19", "C20", "C21", "C22"].map((cell) => wsLog.getCell(cell).value)).toEqual(["V", "O", "O", "-", "V"]);
    expect(wsLog.getCell("D18").value).toBe("Custom LU1 argumentation");
    expect(wsLog.getCell("D19").value as string).toContain("Voltooide stories voor LU 2:");
    expect(wsLog.getCell("D19").value as string).toContain("PR #42");
    const dashboardResults = ["D2", "D3", "D4"].map((cell) => (wsDash.getCell(cell).value as { result: string }).result);
    expect(dashboardResults).toEqual(["V", "O", "O"]);
  });

  describe("validateSprintForExport", () => {
    it("flags issues when stories are missing or uncompleted, feedback is missing, self-evals incomplete, or reflection missing", () => {
      const emptySprint: MinorSprintFull = {
        id: 1,
        userId: 1,
        sprintNumber: "1",
        name: "Sprint 1",
        startDate: "2026-01-01",
        endDate: "2026-01-15",
        durationDays: 14,
        showAndGrowDate: "2026-01-14",
        extendedDays: 0,
        extensionReason: null,
        status: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        stories: [],
        feedback: [],
        selfEvaluations: [],
        teacherAssessments: [],
        reflection: null,
      };

      const issues = validateSprintForExport(emptySprint, "2026-02-01");
      expect(issues.some((i: string) => i.includes("Geen user stories"))).toBe(true);
      expect(issues.some((i: string) => i.includes("Minimaal 1 feedbackpunt"))).toBe(true);
      expect(issues.some((i: string) => i.includes("zelfevaluatievelden"))).toBe(true);
      expect(issues.some((i: string) => i.includes("Sprintreflectie"))).toBe(true);
    });

    it("returns no issues for a fully completed sprint satisfying all specifications", () => {
      const validSprint: MinorSprintFull = {
        id: 1,
        userId: 1,
        sprintNumber: "1",
        name: "Sprint 1",
        startDate: "2026-01-01",
        endDate: "2026-01-15",
        durationDays: 14,
        showAndGrowDate: "2026-01-14",
        extendedDays: 0,
        extensionReason: null,
        status: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        stories: [
          {
            id: 1,
            sprintId: 1,
            userId: 1,
            storyTypeCode: "US",
            storyNumber: "1.1",
            title: "Test story",
            asA: "a",
            iWant: "b",
            soThat: "c",
            learningOutcomes: [1],
            status: "done",
            orderIndex: 0,
            presentationData: null,
            createdAt: "2026-01-01",
            criteria: [],
            evidence: [],
          },
        ],
        feedback: [
          {
            id: 1,
            sprintId: 1,
            date: "2026-01-14",
            fromWhom: "Peer student",
            feedback: "Mooi gedaan",
            action: "",
            orderIndex: 0,
            createdAt: "2026-01-14",
          },
        ],
        selfEvaluations: [1, 2, 3, 4, 5].map((lu) => ({
          id: lu,
          sprintId: 1,
          learningOutcome: lu,
          level: "V",
          argumentation: `Toelichting voor LU ${lu}`,
          updatedAt: "2026-01-14",
        })),
        teacherAssessments: [],
        reflection: {
          id: 1,
          sprintId: 1,
          date: "2026-01-15",
          createdAt: "2026-01-15",
          whatLearned: "Veel geleerd",
          whatRetained: "Goede workflow",
          whatChange: "Eerder beginnen",
          updatedAt: "2026-01-15",
        },
      };

      const issues = validateSprintForExport(validSprint, "2026-02-01");
      expect(issues.length).toBe(0);
    });
  });
});
