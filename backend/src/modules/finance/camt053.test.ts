import { describe, expect, it } from "bun:test";
import { parseCamt053 } from "./camt053";
import { parseImport } from "./import-parser";
import { importPreview } from "./import-model";
import { bankCodes, camtBalance, camtDocument, camtEntry, camtStatement, sampleIban } from "./fixtures/camt";

const parse = (statement = camtStatement(), version = "02") => parseCamt053(camtDocument(statement, version));

describe("CAMT.053 bank-independent statements", () => {
  for (const version of ["02", "08"]) {
    for (const [index, bank] of bankCodes.entries()) {
      it(`reads ${bank} synthetic version ${version} with automatic detection`, () => {
        const content = camtDocument(camtStatement({ bank, version }), version, index % 2 ? "c" : "");
        const result = parseImport({ content });
        expect(result.format).toBe("camt053");
        expect(result.sources[0]).toMatchObject({
          bank: ["ING", "ABN AMRO", "Rabobank", "ASN Bank", "SNS", "RegioBank", "Triodos Bank", "Knab", "bunq"][index],
          balances: [{ date: "2025-01-02", balanceCents: 8000 }],
          transactions: [{ date: "2025-01-02", delta: -2000, name: "Sample counterparty", description: "Sample & payment · DEMO-STRUCTURED · DEMO-REFERENCE", counterparty: sampleIban("RABO", "0000000002") }],
        });
        expect(JSON.stringify(importPreview(result))).not.toContain(sampleIban(bank));
      });
    }
  }
  it("detects BOM/whitespace XML and rejects unsupported namespaces rather than trying CSV", () => {
    expect(parseImport({ content: `\uFEFF  ${camtDocument()}` }).format).toBe("camt053");
    for (const replacement of ["camt.052.001.02", "camt.054.001.02", "camt.053.001.99"]) {
      expect(() => parseImport({ content: camtDocument().replaceAll("camt.053.001.02", replacement) })).toThrow("finance.import.xmlFormat");
    }
    expect(() => parseImport({ content: camtDocument(), csv: "other" })).toThrow("finance.import.selection");
  });
  it("keeps unknown banks unset and uses IBAN when the BIC is absent", () => {
    expect(parse(camtStatement({ bank: "ZZZZ" })).sources[0].bank).toBeNull();
    expect(parse(camtStatement({ bank: "ABNA" }).replace(/<Svcr>.*?<\/Svcr>/, "")).sources[0].bank).toBe("ABN AMRO");
  });
  it("groups multiple statements and accounts and reconstructs daily balances independently of entry ordering", () => {
    const earlier = camtStatement({ entries: camtEntry({ day: "2025-01-02", amount: "10.00" }) + camtEntry({ day: "2025-01-01", amount: "5.00", direction: "CRDT" }), closing: camtBalance("CLBD", "95.00") });
    const later = camtStatement({ opening: camtBalance("OPBD", "95.00"), closing: camtBalance("CLBD", "75.00", "2025-01-03"), entries: camtEntry({ day: "2025-01-03" }), name: "Renamed sample" });
    const result = parse(later + camtStatement({ bank: "RABO" }) + earlier);
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].balances).toEqual([
      { date: "2025-01-01", balanceCents: 10500 },
      { date: "2025-01-02", balanceCents: 9500 },
      { date: "2025-01-03", balanceCents: 7500 },
    ]);
    expect(result.sources[0].transactions.map((entry) => entry.date)).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
  });
  it("imports closing balances for empty statements and closing dates without transactions", () => {
    const empty = camtStatement({ entries: "", opening: "", closing: camtBalance("CLBD", "0.00") });
    expect(parse(empty).sources[0]).toMatchObject({ rowCount: 0, transactions: [], balances: [{ date: "2025-01-02", balanceCents: 0 }] });
    const result = parse(camtStatement({ closing: camtBalance("CLBD", "80.00", "2025-01-03") }));
    expect(result.sources[0].balances).toEqual([{ date: "2025-01-02", balanceCents: 8000 }, { date: "2025-01-03", balanceCents: 8000 }]);
  });
  it("uses credit/debit direction once for reversals and negative closing balances", () => {
    const result = parse(camtStatement({ opening: camtBalance("OPBD", "10.00", "2025-01-01"), closing: camtBalance("CLBD", "10.00", "2025-01-02", "DBIT"), entries: camtEntry({ extra: "<RvslInd>true</RvslInd>" }) }));
    expect(result.sources[0].balances[0].balanceCents).toBe(-1000);
    expect(result.sources[0].transactions[0].delta).toBe(-2000);
  });
  it("splits reconciled batches in both versions without duplicating the aggregate amount", () => {
    for (const version of ["02", "08"]) {
      const detail = ["5.00", "15.00"].map((amount) => `<TxDtls>${version === "08" ? `<Amt Ccy="EUR">${amount}</Amt>` : `<AmtDtls><TxAmt><Amt Ccy="EUR">${amount}</Amt></TxAmt></AmtDtls>`}<RmtInf><Ustrd>Sample batch payment</Ustrd></RmtInf></TxDtls>`).join("");
      const result = parse(camtStatement({ version, entries: camtEntry({ detail, version }) }), version);
      expect(result.sources[0].transactions.map((entry) => entry.delta)).toEqual([-500, -1500]);
      expect(result.sources[0].balances[0].balanceCents).toBe(8000);
      expect(() => parse(camtStatement({ entries: camtEntry({ detail: detail.replace("15.00", "14.00") }) }))).toThrow("finance.import.xmlBatch");
    }
    expect(() => parse(camtStatement({ entries: camtEntry({ detail: "<TxDtls/><TxDtls/>" }) }))).toThrow("finance.import.xmlBatch");
  });
  it("uses entry amounts for undetailed payments and account-currency countervalues for FX details", () => {
    expect(parse(camtStatement({ entries: camtEntry({ detail: "" }) })).sources[0].transactions[0].delta).toBe(-2000);
    const detail = '<TxDtls><AmtDtls><TxAmt><Amt Ccy="USD">25.00</Amt></TxAmt><CntrValAmt><Amt Ccy="EUR">20.00</Amt></CntrValAmt></AmtDtls></TxDtls>';
    expect(parse(camtStatement({ entries: camtEntry({ detail }) })).sources[0].transactions[0].delta).toBe(-2000);
  });
  it("reads booking datetimes as the bank's calendar date and ignores available balances", () => {
    const statement = camtStatement({ extra: camtBalance("CLAV", "9999.00") }).replace('<BookgDt><Dt>2025-01-02</Dt></BookgDt>', '<BookgDt><DtTm>2025-01-02T00:05:00+02:00</DtTm></BookgDt>');
    expect(parse(statement).sources[0].balances[0]).toEqual({ date: "2025-01-02", balanceCents: 8000 });
  });
  it("rejects incomplete, overlapping, filtered, unbooked or unreconciled statements", () => {
    for (const statement of [
      camtStatement({ closing: "" }),
      camtStatement({ opening: "" }),
      camtStatement({ entries: "" }),
      camtStatement({ closing: camtBalance("CLBD", "81.00") }),
      camtStatement({ extra: '<StmtPgntn><PgNb>1</PgNb><LastPgInd>false</LastPgInd></StmtPgntn>' }),
      camtStatement({ extra: '<StmtPgntn><PgNb>2</PgNb><LastPgInd>true</LastPgInd></StmtPgntn>' }),
      camtStatement().replace("BOOK", "PDNG"),
      camtStatement().replaceAll("EUR", "USD"),
      camtStatement().replace("2025-01-02</Dt></BookgDt>", "2025-01-03</Dt></BookgDt>"),
      camtStatement().replace("100.00", "100.001"),
      camtStatement() + camtStatement(),
      camtStatement({ extra: '<TxsSummry><TtlNtries><NbOfNtries>2</NbOfNtries></TtlNtries></TxsSummry>' }),
    ]) expect(() => parse(statement)).toThrow();
    expect(() => parseCamt053(camtDocument().replace("<MsgId>", '<MsgPgntn><PgNb>1</PgNb><LastPgInd>false</LastPgInd></MsgPgntn><MsgId>'))).toThrow("finance.import.xmlPages");
  });
  it("rejects malformed XML, unsafe entities, namespace spoofing and oversized documents", () => {
    for (const content of [
      camtDocument().slice(0, -8),
      '<!DOCTYPE Document [<!ENTITY secret SYSTEM "file:///etc/passwd">]>' + camtDocument(),
      camtDocument().replace("Sample account", "&secret;"),
      camtDocument().replace("<Stmt>", '<Stmt xmlns="urn:untrusted">'),
      camtDocument().replace("<Stmt>", "<Stmt>" + "<Deep>".repeat(65)),
      camtDocument().replace("20.00", "-20.00"),
      camtDocument().replaceAll("2025-01-02", "2099-01-02"),
      camtDocument().replaceAll("2025-01-02", "2025-02-30"),
      " ".repeat(2 * 1024 * 1024) + camtDocument(),
    ]) expect(() => parseCamt053(content)).toThrow();
  });
});
