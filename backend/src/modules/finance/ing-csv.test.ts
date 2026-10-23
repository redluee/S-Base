import { describe, expect, it } from "bun:test";
import { ING_MAX_BYTES, parseIngCsv } from "./ing-csv";

const header =
  '"Datum";"Naam / Omschrijving";"Rekening";"Tegenrekening";"Code";"Af Bij";"Bedrag (EUR)";"Mutatiesoort";"Mededelingen";"Saldo na mutatie";"Tag"';
function row(
  date: string,
  direction: string,
  amount: string,
  balance: string,
  account = "DEMO0001",
  description = "Sample",
) {
  return [
    date,
    description,
    account,
    "",
    "OV",
    direction,
    amount,
    "Sample",
    "",
    balance,
    "",
  ]
    .map((value) => `"${value.replace(/"/g, '""')}"`)
    .join(";");
}
const ascending = [
  row("20250101", "Bij", "100,29", "100,29"),
  row("20250102", "Bij", "20,00", "120,29"),
  row("20250102", "Af", "10,00", "110,29"),
  row("20250103", "Bij", "5,00", "115,29"),
];
const csv = (rows: string[]) => [header, ...rows].join("\r\n");

describe("ING CSV daily balances", () => {
  it("selects the final balance within a day for ascending and descending files, with exact cents", () => {
    const expected = [
      { date: "2025-01-01", balanceCents: 10029 },
      { date: "2025-01-02", balanceCents: 11029 },
      { date: "2025-01-03", balanceCents: 11529 },
    ];
    expect(
      parseIngCsv(csv(ascending), "ascending").sources[0].balances,
    ).toEqual(expected);
    expect(
      parseIngCsv(csv([...ascending].reverse()), "descending").sources[0]
        .balances,
    ).toEqual(expected);
  });
  it("supports quoted separators, escaped quotes, embedded newlines, BOM, CRLF, and compact/dutch/ISO dates", () => {
    const content = `\uFEFFsep=;\r\n${csv([row("01-01-2025", "Bij", "1.234,56", "1.234,56", "DEMO0001", 'Sample; "quoted"\ncontinuation'), row("2025-01-02", "Af", "0,01", "1.234,55")])}`;
    expect(parseIngCsv(content, "ascending").sources[0].balances).toEqual([
      { date: "2025-01-01", balanceCents: 123456 },
      { date: "2025-01-02", balanceCents: 123455 },
    ]);
  });
  it("separates source accounts and returns only masked labels and dates/balances", () => {
    const result = parseIngCsv(
      csv([
        ascending[0],
        row("20250101", "Bij", "2,00", "2,00", "DEMO0002"),
        ascending[1],
        row("20250102", "Bij", "3,00", "5,00", "DEMO0002"),
      ]),
      "ascending",
    );
    expect(result.sources).toHaveLength(2);
    expect(result.sources.map((source) => source.label)).toEqual([
      "…0001",
      "…0002",
    ]);
    expect(result.sources[1].balances.at(-1)?.balanceCents).toBe(500);
    expect(JSON.stringify(result)).not.toContain("Sample");
    expect(JSON.stringify(result)).not.toContain("DEMO0001");
  });
  it("supports correctly quoted comma-separated CSV containing balance columns", () => {
    const content = csv([ascending[0]]).replace(/;/g, ",");
    expect(
      parseIngCsv(content, "descending").sources[0].balances[0].balanceCents,
    ).toBe(10029);
  });
  it("accepts negative and zero balances without treating either as unknown", () => {
    const balances = parseIngCsv(
      csv([
        row("20250101", "Af", "0,01", "-0,01"),
        row("20250102", "Bij", "0,01", "0,00"),
      ]),
      "ascending",
    ).sources[0].balances;
    expect(balances.map((balance) => balance.balanceCents)).toEqual([-1, 0]);
  });
  it("does not fill dates before the first observation or on days without transactions", () => {
    const result = parseIngCsv(
      csv([ascending[0], row("20250105", "Bij", "20,00", "120,29")]),
      "ascending",
    );
    expect(result.sources[0].balances.map((balance) => balance.date)).toEqual([
      "2025-01-01",
      "2025-01-05",
    ]);
  });
  it("rejects wrong order, same-day ordering mistakes, filtered/missing transactions and mixed order", () => {
    expect(() => parseIngCsv(csv(ascending), "descending")).toThrow(
      "finance.import.order",
    );
    expect(() =>
      parseIngCsv(csv([ascending[1], ascending[2]]), "descending"),
    ).toThrow("finance.import.continuity");
    expect(() =>
      parseIngCsv(csv([ascending[0], ascending[2]]), "ascending"),
    ).toThrow("finance.import.continuity");
    expect(() =>
      parseIngCsv(csv([ascending[0], ascending[3], ascending[2]]), "ascending"),
    ).toThrow();
  });
  it("rejects malformed, header-only, old/saldo-free, non-EUR and duplicate-header CSV", () => {
    for (const content of [
      "",
      header,
      "Datum;Rekening;Af Bij;Bedrag (EUR)\n20250101;DEMO0001;Bij;1,00",
      csv([ascending[0]]).replace("Bedrag (EUR)", "Bedrag (USD)"),
      csv([ascending[0]]).replace("Tag", "Datum"),
      `${header}\n\"unclosed`,
      `${header}\n\"closed\"garbage`,
      `${header}\ninvalid`,
    ])
      expect(() => parseIngCsv(content, "descending")).toThrow();
  });
  it("rejects invalid amounts, excessive precision, impossible dates, future dates and oversized input", () => {
    for (const value of [
      "0,001",
      "1.234.56",
      "NaN",
      "1e3",
      "10000000000,01",
      "1.2,00",
    ])
      expect(() =>
        parseIngCsv(csv([row("20250101", "Bij", "1,00", value)]), "ascending"),
      ).toThrow("finance.import.amount");
    for (const value of ["20250230", "31-04-2025", "20990101"])
      expect(() =>
        parseIngCsv(csv([row(value, "Bij", "1,00", "1,00")]), "descending"),
      ).toThrow("finance.import.date");
    expect(() =>
      parseIngCsv("x".repeat(ING_MAX_BYTES + 1), "ascending"),
    ).toThrow("finance.import.size");
  });
});
