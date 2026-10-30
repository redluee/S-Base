import { describe, expect, it } from "bun:test";
import {
  defaultImportChoice,
  detectImportFormat,
  readImportFile,
  importRows,
  importSelections,
} from "./finance-import";
import type { FinanceData, FinanceImportSource } from "@backend/types/finance";

const source: FinanceImportSource = {
  sourceKey: "1",
  label: "…0001",
  rowCount: 3,
  balances: [
    { date: "2025-01-01", balanceCents: 0 },
    { date: "2025-01-02", balanceCents: 200 },
    { date: "2025-01-03", balanceCents: 300 },
  ],
};
const data: FinanceData = {
  monthlyBudgetCents: null,
  today: "2025-02-01",
  accounts: [
    {
      id: 1,
      name: "Sample",
      bank: null,
      type: "current",
      openingDate: "2025-01-01",
      archived: false,
    },
  ],
  observations: [
    { id: 1, accountId: 1, date: "2025-01-01", balanceCents: 0 },
    { id: 2, accountId: 1, date: "2025-01-02", balanceCents: 100 },
  ],
  goals: [],
  allocations: [],
};

describe("Finance import selections", () => {
  it("uses the savings type suggestion for new accounts while leaving the choice editable", () => {
    const savings = { ...source, suggestedType: "savings" as const };
    const choice = {
      ...defaultImportChoice(savings, data, "new"),
      name: "Sample savings",
    };
    expect(choice.type).toBe("savings");
    expect(
      importSelections([savings], { "1": choice }, data)[0].newAccount?.type,
    ).toBe("savings");
    expect(
      importSelections(
        [savings],
        { "1": { ...choice, type: "current" } },
        data,
      )[0].newAccount?.type,
    ).toBe("current");
    expect(defaultImportChoice(source, data, "new").type).toBe("current");
  });
  it("distinguishes zero, identical, conflicting and new observations", () => {
    expect(
      importRows(source, data, "1").map((row) => [
        row.state,
        row.expectedCents,
      ]),
    ).toEqual([
      ["same", 0],
      ["conflict", 100],
      ["new", null],
    ]);
    expect(defaultImportChoice(source, data, "1").dates).toEqual([
      "2025-01-01",
      "2025-01-03",
    ]);
  });
  it("requires explicit conflict selection and keeps expected cents for stale-edit detection", () => {
    const choice = {
      ...defaultImportChoice(source, data, "1"),
      dates: ["2025-01-02", "2025-01-03"],
    };
    expect(importSelections([source], { "1": choice }, data)[0]).toEqual({
      sourceKey: "1",
      accountId: 1,
      extendOpening: false,
      entries: [
        { date: "2025-01-02", expectedCents: 100 },
        { date: "2025-01-03", expectedCents: null },
      ],
    });
  });
  it("skips unmapped and deselected accounts and creates accounts without inventing an opening balance", () => {
    expect(
      importSelections(
        [source],
        { "1": defaultImportChoice(source, data) },
        data,
      ),
    ).toEqual([]);
    const choice = {
      ...defaultImportChoice(source, data, "new"),
      name: "Sample savings",
      type: "savings" as const,
    };
    const selection = importSelections([source], { "1": choice }, data)[0];
    expect(selection.newAccount).toEqual({
      name: "Sample savings",
      type: "savings",
    });
    expect(selection.entries).toHaveLength(3);
    expect(selection.accountId).toBeUndefined();
  });
});


describe("Automatic bank file format selection", () => {
  it("detects content independently of extension, including prefixed XML and BOM", async () => {
    for (const xml of ['<?xml version="1.0"?><Document/>', '\uFEFF  <c:Document/>']) {
      expect(detectImportFormat(await readImportFile(new File([xml], "sample.csv")))).toBe("camt053");
    }
    expect(detectImportFormat(await readImportFile(new File(["Datum;Rekening\nSample"], "sample.xml")))).toBe("ing-csv");
  });
  it("retains Windows-1252 decoding for CSV, but rejects invalid UTF-8 XML", async () => {
    const bytes = new Uint8Array([0x44, 0x61, 0x74, 0x75, 0x6d, 0x3b, 0xe9]);
    expect(await readImportFile(new File([bytes], "sample.csv"))).toBe("Datum;é");
    await expect(readImportFile(new File(["<Document>", bytes], "sample.xml"))).rejects.toThrow("finance.import.xml");
  });
  it("rejects ZIP/PDF uploads and files exceeding the shared 2 MB limit", async () => {
    for (const name of ["sample.zip", "sample.pdf"]) await expect(readImportFile(new File(["sample"], name))).rejects.toThrow("finance.import.fileType");
    await expect(readImportFile(new File([new Uint8Array(2 * 1024 * 1024 + 1)], "sample.xml"))).rejects.toThrow("finance.import.size");
  });
});
