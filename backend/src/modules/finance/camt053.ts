import { amount, children, date, invalid, optional, required, sign, value, xmlDocument, type XmlNode } from "./camt-xml";
import { parseEntry } from "./camt-entries";
import { calendarDate, cents } from "./validation";
import type { ImportSource, ParsedImport } from "./import-model";

const BANKS: Record<string, string> = {
  INGB: "ING", ABNA: "ABN AMRO", RABO: "Rabobank", ASNB: "ASN Bank",
  SNSB: "SNS", RBRB: "RegioBank", TRIO: "Triodos Bank", KNAB: "Knab", BUNQ: "bunq",
};

function pagination(node: XmlNode, name: string) {
  const page = optional(node, name);
  if (page && (value(page, "PgNb") !== "1" || value(page, "LastPgInd") !== "true")) invalid("xmlPages");
}

function balance(statement: XmlNode, code: string, mandatory = false) {
  const matches = children(statement, "Bal").filter((node) => value(node, "Tp", "CdOrPrtry", "Cd") === code);
  if (matches.length > 1 || (mandatory && !matches.length)) invalid("xmlBalance");
  if (!matches.length) return undefined;
  const node = matches[0];
  if (value(node, "Tp", "SubTp", "Cd") === "INTM" || value(node, "Tp", "SubTp", "Prtry") === "INTM") invalid("xmlPages");
  return { date: date(required(node, "Dt")), cents: amount(required(node, "Amt")) * sign(value(node, "CdtDbtInd")) };
}

function parseStatement(statement: XmlNode) {
  pagination(statement, "StmtPgntn");
  const account = required(statement, "Acct");
  const iban = value(account, "Id", "IBAN").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) invalid("account");
  const currency = value(account, "Ccy");
  if (currency && currency !== "EUR") invalid("currency");
  const bic = value(account, "Svcr", "FinInstnId", "BICFI") || value(account, "Svcr", "FinInstnId", "BIC");
  const bank = BANKS[bic.slice(0, 4)] ?? (/^NL/.test(iban) ? BANKS[iban.slice(4, 8)] : undefined) ?? null;
  const closing = balance(statement, "CLBD", true)!;
  const opening = balance(statement, "OPBD");
  const entries = children(statement, "Ntry").map(parseEntry).sort((a, b) => a.date.localeCompare(b.date));
  if (entries.length && !opening) invalid("xmlBalance");
  const from = value(statement, "FrToDt", "FrDtTm");
  const to = value(statement, "FrToDt", "ToDtTm");
  const firstDate = from ? periodDate(from) : entries[0]?.date ?? closing.date;
  if (firstDate > closing.date || (to && periodDate(to) !== closing.date)) invalid("xmlBalance");
  if (opening && opening.date > firstDate) invalid("xmlBalance");
  if (entries.some((entry) => entry.date < firstDate || entry.date > closing.date)) invalid("xmlBalance");
  const delta = entries.reduce((sum, entry) => cents(sum + entry.delta), 0);
  const initial = opening?.cents ?? cents(closing.cents - delta);
  if (cents(initial + delta) !== closing.cents) invalid("continuity");
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.date, cents((totals.get(entry.date) ?? 0) + entry.delta));
  let running = initial;
  const balances = [...totals].map(([day, total]) => {
    running = cents(running + total);
    return { date: day, balanceCents: running };
  });
  if (!balances.length || balances.at(-1)!.date !== closing.date)
    balances.push({ date: closing.date, balanceCents: closing.cents });
  const summary = optional(statement, "TxsSummry");
  if (summary) {
    const count = value(summary, "TtlNtries", "NbOfNtries");
    if (count && (!/^\d+$/.test(count) || Number(count) !== entries.length)) invalid("continuity");
  }
  return {
    account: iban,
    accountName: value(account, "Nm"),
    bank,
    suggestedType: value(account, "Tp", "Cd") === "SVGS" ? "savings" as const : undefined,
    firstDate,
    lastDate: closing.date,
    opening,
    closing,
    balances,
    transactions: entries.flatMap((entry) => entry.transactions),
    rowCount: entries.length,
  };
}

function periodDate(raw: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw) || Number.isNaN(Date.parse(raw))) invalid("date");
  try { return calendarDate(raw.slice(0, 10)); } catch { return invalid("date"); }
}

export function parseCamt053(content: string): ParsedImport {
  const root = xmlDocument(content);
  const message = required(root, "BkToCstmrStmt");
  if (root.children.length !== 1) invalid("xmlFormat");
  pagination(required(message, "GrpHdr"), "MsgPgntn");
  const statements = children(message, "Stmt");
  if (!statements.length) invalid("empty");
  if (statements.length > 5000 || statements.reduce((count, node) => count + children(node, "Ntry").length, 0) > 20000) invalid("size");
  const grouped = new Map<string, ReturnType<typeof parseStatement>[]>();
  for (const statement of statements) {
    const parsed = parseStatement(statement);
    const prior = grouped.get(parsed.account) ?? [];
    prior.push(parsed);
    grouped.set(parsed.account, prior);
  }
  if (grouped.size > 200) invalid("size");
  const sources: ImportSource[] = [...grouped.values()].map((group, index) => {
    group.sort((a, b) => a.firstDate.localeCompare(b.firstDate));
    for (let i = 1; i < group.length; i++) {
      const previous = group[i - 1], current = group[i];
      if (current.firstDate <= previous.lastDate) invalid("xmlOverlap");
      if (current.opening && current.opening.date <= previous.lastDate && current.opening.cents !== previous.closing.cents)
        invalid("continuity");
    }
    const first = group[0];
    const accountName = group.find((statement) => statement.accountName)?.accountName ?? "";
    return {
      account: first.account,
      accountName,
      bank: first.bank,
      suggestedType: first.suggestedType,
      sourceKey: String(index + 1),
      label: `…${first.account.slice(-4)}`,
      firstDate: first.firstDate,
      lastDate: group.at(-1)!.lastDate,
      needsBalance: false,
      balances: group.flatMap((statement) => statement.balances),
      transactions: group.flatMap((statement) => statement.transactions),
      rowCount: group.reduce((sum, statement) => sum + statement.rowCount, 0),
    };
  });
  if (sources.reduce((sum, source) => sum + source.balances.length, 0) > 5000 || sources.reduce((sum, source) => sum + source.transactions.length, 0) > 20000)
    invalid("size");
  return { format: "camt053", sources, rowCount: sources.reduce((sum, source) => sum + source.rowCount, 0) };
}
