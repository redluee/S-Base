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
  const savingsHeader =
    '"Datum","Omschrijving","Rekening","Rekening naam","Tegenrekening","Af Bij","Bedrag","Valuta","Mutatiesoort","Mededelingen","Saldo na mutatie"';
  const savingsRows = [
    '"2025-01-02","Sample deposit","H DEMO-0001","Oranje Spaarrekening","","Bij","490,29","EUR","Inleg","","500,29"',
    '"2025-01-01","Sample deposit","H DEMO-0001","Oranje Spaarrekening","","Bij","10,00","EUR","Inleg","","10,00"',
  ];
  const savingsCsv = [savingsHeader, ...savingsRows].join("\r\n");
  it("accepts savings exports with separate amount/currency columns in either delimiter and date order", () => {
    for (const delimiter of [",", ";"]) {
      const convert = (value: string) =>
        value.replace(/","/g, `"${delimiter}"`);
      for (const order of ["ascending", "descending"] as const) {
        const rows =
          order === "ascending" ? [...savingsRows].reverse() : savingsRows;
        const result = parseIngCsv(
          [savingsHeader, ...rows].map(convert).join("\n"),
          order,
        );
        expect(result.sources[0]).toMatchObject({
          label: "…0001",
          suggestedType: "savings",
          balances: [
            { date: "2025-01-01", balanceCents: 1000 },
            { date: "2025-01-02", balanceCents: 50029 },
          ],
        });
        expect(JSON.stringify(result)).not.toContain("Sample deposit");
        expect(JSON.stringify(result)).not.toContain("H DEMO");
      }
    }
  });
  it("keeps multiple savings accounts distinct and selects the last daily balance", () => {
    const content = [
      savingsHeader,
      savingsRows[0],
      savingsRows[0]
        .replace('"490,29"', '"20,00"')
        .replace('"500,29"', '"520,29"'),
      savingsRows[0].replace("H DEMO-0001", "H DEMO-0002"),
    ].join("\n");
    const sources = parseIngCsv(content, "ascending").sources;
    expect(sources.map((source) => source.balances[0].balanceCents)).toEqual([
      52029, 50029,
    ]);
    expect(sources.every((source) => source.suggestedType === "savings")).toBe(
      true,
    );
  });
  it("separates named savings accounts sharing a number and suggests their display names", () => {
    const content = [savingsHeader, ...savingsRows,
      ...savingsRows.map((value) => value.replace("Oranje Spaarrekening", "Sample Spaarrekening").replace('"500,29"', '"600,29"').replace('"490,29"', '"590,29"')),
    ].join("\n");
    const result = parseIngCsv(content, "descending");
    expect(result.rowCount).toBe(4);
    expect(result.sources).toHaveLength(2);
    expect(new Set(result.sources.map((source) => source.label)).size).toBe(2);
    expect(result.sources.map((source) => source.balances.at(-1)?.balanceCents)).toEqual([50029, 60029]);
    expect(result.sources.map((source) => source.suggestedName)).toEqual(["Oranje Spaarrekening", "Sample Spaarrekening"]);
    expect(JSON.stringify(result)).not.toContain("Sample deposit");
  });
  it("handles separate current and savings header sections and counts only transactions", () => {
    const result = parseIngCsv([csv([ascending[0]]), savingsCsv.replace(/","/g, '";"')].join("\n"), "descending");
    expect(result.rowCount).toBe(3);
    expect(result.sources).toHaveLength(2);
    expect(result.sources[1].suggestedType).toBe("savings");
    expect(() => parseIngCsv([csv([ascending[0]]), savingsCsv.replace(/","/g, '";"').replaceAll('"EUR"', '"USD"')].join("\n"), "descending")).toThrow("finance.import.currency");
  });
  it("reconstructs missing balances before and after an anchor in either order", () => {
    const missing = ascending.map((value, index) => index === 1 ? value : value.replace(/;"-?[0-9.,]+";""$/, ';"";""'));
    for (const order of ["ascending", "descending"] as const) {
      const result = parseIngCsv(csv(order === "ascending" ? missing : [...missing].reverse()), order);
      expect(result.sources[0].reconstructedRowCount).toBe(3);
      expect(result.sources[0].balances).toEqual(parseIngCsv(csv(ascending), "ascending").sources[0].balances);
    }
    const unanchored = parseIngCsv(csv([row("20250101", "Bij", "1,00", "")]), "ascending");
    expect(unanchored.sources[0]).toMatchObject({ needsBalance: true, balances: [] });
    expect(parseIngCsv(csv([row("20250101", "Bij", "1,00", "")]), "ascending", { "1": 100 }).sources[0].balances).toEqual([{ date: "2025-01-01", balanceCents: 100 }]);
  });
  it("still rejects inconsistent known balances around missing historical balances", () => {
    expect(() => parseIngCsv(csv([ascending[0], row("20250102", "Bij", "20,00", ""), row("20250103", "Bij", "5,00", "999,00")]), "ascending")).toThrow("finance.import.continuity");
  });
  it("accepts English savings exports with comma or dot decimals and repeated header sections", () => {
    const englishHeader = "Date;Description;Account;Account name;Counterparty;Debit/credit;Amount;Currency;Transaction type;Notifications;Resulting balance";
    for (const decimal of [",", "."]) {
      const content = [englishHeader,
        `2025-01-02;Sample deposit;S000-00001;Sample savings;DEMO0001;Credit;20${decimal}00;EUR;Deposit;Sample;120${decimal}00`,
        `2025-01-01;Sample deposit;S000-00001;Sample savings;DEMO0001;Credit;100${decimal}00;EUR;Deposit;Sample;100${decimal}00`,
        englishHeader,
        `2025-01-01;Sample withdrawal;F000-00002;Sample other savings;DEMO0001;Debit;5${decimal}00;EUR;Withdrawal;Sample;95${decimal}00`,
      ].join("\n");
      const preview = parseIngCsv(content, "descending");
      expect(preview.rowCount).toBe(3);
      expect(preview.sources).toHaveLength(2);
      expect(preview.sources[0].suggestedType).toBe("savings");
      expect(preview.sources[0].balances).toEqual([{ date: "2025-01-01", balanceCents: 10000 }, { date: "2025-01-02", balanceCents: 12000 }]);
      expect(preview.sources[1].balances[0].balanceCents).toBe(9500);
      expect(() => parseIngCsv(content.replace("EUR", "USD"), "descending")).toThrow("finance.import.currency");
    }
  });
  it("accepts English current-account exports and validates canonical duplicate headers", () => {
    const content = "Date;Name / Description;Account;Counterparty;Code;Debit/credit;Amount (EUR);Transaction type;Notifications;Resulting balance;Tag\n20250101;Sample;DEMO0001;;OV;Credit;1,00;Transfer;Sample;1,00;";
    expect(parseIngCsv(content, "descending").sources[0].balances[0].balanceCents).toBe(100);
    expect(() => parseIngCsv(content.replace("Tag", "Datum"), "descending")).toThrow("finance.import.malformed");
  });
  it("rejects non-EUR, missing or mixed currencies even when a euro amount header is present", () => {
    for (const currency of ["USD", "", "GBP"]) {
      expect(() =>
        parseIngCsv(savingsCsv.replace('"EUR"', `"${currency}"`), "descending"),
      ).toThrow("finance.import.currency");
      expect(() =>
        parseIngCsv(
          savingsCsv
            .replace('"Bedrag"', '"Bedrag (EUR)"')
            .replace('"EUR"', `"${currency}"`),
          "descending",
        ),
      ).toThrow("finance.import.currency");
    }
    expect(() =>
      parseIngCsv(savingsCsv.replace('"Valuta"', '"Other"'), "descending"),
    ).toThrow("finance.import.columns");
    expect(() =>
      parseIngCsv(
        savingsCsv.replace('"Mededelingen"', '"Bedrag (EUR)"'),
        "descending",
      ),
    ).toThrow("finance.import.columns");
  });
  it("recognizes savings by the account-name column, including custom names", () => {
    expect(
      parseIngCsv(
        savingsCsv.replaceAll("Oranje Spaarrekening", "Sample account"),
        "descending",
      ).sources[0].suggestedType,
    ).toBe("savings");
  });
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
