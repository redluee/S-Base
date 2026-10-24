import { ValidationError, requireObject } from "../../utils/validation";
import { calendarDate, cents } from "./validation";
import type {
  FinanceImportPreview,
  FinanceImportOrder,
} from "../../types/finance";

export const ING_MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 20000;
const HEADER_ALIASES: Record<string, string> = {
  date: "datum",
  "name / description": "naam / omschrijving",
  description: "omschrijving",
  name: "naam",
  account: "rekening",
  "account name": "rekening naam",
  counterparty: "tegenrekening",
  "debit/credit": "af bij",
  "debit / credit": "af bij",
  "amount (eur)": "bedrag (eur)",
  amount: "bedrag",
  currency: "valuta",
  "transaction type": "mutatiesoort",
  notifications: "mededelingen",
  "resulting balance": "saldo na mutatie",
  "payment reference": "betalingskenmerk",
};

function headerName(value: string) {
  const name = value.trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[name] ?? name;
}

function invalid(key: string): never {
  throw new ValidationError(`finance.import.${key}`);
}

function csvRows(content: string): string[][] {
  if (!content || new TextEncoder().encode(content).length > ING_MAX_BYTES)
    invalid("size");
  const text = content.replace(/^\uFEFF/, "").replace(/^sep=[;,]\r?\n/i, "");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const appendRow = () => {
    row.push(cell);
    cell = "";
    closed = false;
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > MAX_ROWS + 201) invalid("size");
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else cell += char;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      appendRow();
    } else if (char === '"') {
      if (cell || closed) invalid("malformed");
      quoted = true;
    } else {
      if (closed && char.trim()) invalid("malformed");
      if (!closed) cell += char;
    }
  }
  if (quoted) invalid("malformed");
  if (cell || row.length || closed) appendRow();
  return rows;
}

function amount(value: string, nonnegative = false, allowDot = false): number {
  let normalized = value.trim().replace(/\u2212/g, "-");
  if (allowDot && /^-?(?:\d+|\d{1,3}(?:,\d{3})+)\.\d{2}$/.test(normalized))
    normalized = normalized.replace(/,/g, "").replace(/\.(\d{2})$/, ",$1");
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(normalized))
    invalid("amount");
  const [whole, decimals] = normalized
    .replace(/^-/, "")
    .replace(/\./g, "")
    .split(",");
  const result =
    (Number(whole) * 100 + Number(decimals)) *
    (normalized.startsWith("-") ? -1 : 1);
  try {
    return cents(result, nonnegative ? 0 : undefined);
  } catch {
    return invalid("amount");
  }
}
function date(value: string): string {
  const normalized = value.trim();
  const formatted = /^\d{8}$/.test(normalized)
    ? `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`
    : /^\d{2}-\d{2}-\d{4}$/.test(normalized)
      ? normalized.split("-").reverse().join("-")
      : normalized;
  try {
    return calendarDate(formatted);
  } catch {
    return invalid("date");
  }
}

export function parseIngFile(
  content: unknown,
  orderInput: unknown,
  anchorsInput?: unknown,
) {
  if (typeof content !== "string") invalid("malformed");
  if (orderInput !== "descending" && orderInput !== "ascending")
    invalid("order");
  const order: FinanceImportOrder = orderInput;
  const anchors = anchorsInput === undefined ? {} : requireObject(anchorsInput);
  if (Object.keys(anchors).some((key) => !/^[1-9]\d{0,2}$/.test(key))) invalid("selection");
  for (const value of Object.values(anchors)) cents(value);
  const rows = csvRows(content);
  if (rows.length < 2) invalid("empty");
  type Row = {
    date: string;
    balanceCents: number | null;
    delta: number;
    name: string;
    description: string;
    counterparty: string;
  };
  const grouped = new Map<string, { account: string; savings: boolean; accountName: string; entries: Row[]; }>();
  let headers: string[] = [];
  let english = false;
  let rowCount = 0;
  for (const row of rows) {
    if (headerName(row[0]) === "datum") {
      english = row[0].trim().toLowerCase() === "date";
      headers = row.map(headerName);
      if (new Set(headers).size !== headers.length) invalid("malformed");
      if (["datum", "rekening", "af bij", "saldo na mutatie"].some((name) => !headers.includes(name)))
        invalid("columns");
      const euro = headers.includes("bedrag (eur)");
      const plain = headers.includes("bedrag");
      if (euro === plain || (!euro && !headers.includes("valuta"))) invalid("columns");
      continue;
    }
    if (!headers.length) invalid("columns");
    if (row.length !== headers.length) invalid("malformed");
    const field = (name: string) => row[headers.indexOf(name)] ?? "";
    if (headers.includes("valuta") && field("valuta").trim().toUpperCase() !== "EUR")
      invalid("currency");
    const account = field("rekening").replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z0-9-]{4,40}$/.test(account)) invalid("account");
    const rawDirection = field("af bij").trim().toLowerCase();
    const direction = rawDirection === "debit" ? "af" : rawDirection === "credit" ? "bij" : rawDirection;
    if (direction !== "af" && direction !== "bij") invalid("amount");
    const accountName = field("rekening naam").trim();
    const key = JSON.stringify([account, accountName]);
    const group = grouped.get(key) ?? {
      account,
      accountName,
      savings: headers.includes("rekening naam"),
      entries: [],
    };
    const balance = field("saldo na mutatie").trim();
    group.entries.push({
      name: field("naam / omschrijving") || field("naam") || field("omschrijving"),
      description: [field("mededelingen"), field("betalingskenmerk"), field("tag")].filter(Boolean).join(" · "),
      counterparty: field("tegenrekening").replace(/\s/g, "").toUpperCase(),
      date: date(field("datum")),
      balanceCents: balance ? amount(balance, false, english) : null,
      delta: amount(field(headers.includes("bedrag (eur)") ? "bedrag (eur)" : "bedrag"), true, english) * (direction === "af" ? -1 : 1),
    });
    grouped.set(key, group);
    if (++rowCount > MAX_ROWS) invalid("size");
  }
  if (!rowCount) invalid("empty");
  if (grouped.size > 200) invalid("size");
  const sources = [...grouped.values()].map(({ account, accountName, savings, entries }, index) => {
    for (let i = 1; i < entries.length; i++) {
      if ((order === "descending" && entries[i].date > entries[i - 1].date) ||
        (order === "ascending" && entries[i].date < entries[i - 1].date)) invalid("order");
    }
    const chronological = order === "ascending" ? entries : [...entries].reverse();
    const reconstructedRowCount = entries.filter((entry) => entry.balanceCents === null).length;
    if (chronological.every((entry) => entry.balanceCents === null) && anchors[String(index + 1)] !== undefined)
      chronological[chronological.length - 1].balanceCents = cents(anchors[String(index + 1)]);
    const anchor = chronological.findIndex((entry) => entry.balanceCents !== null);
    for (let i = anchor - 1; i >= 0; i--) {
      const next = chronological[i + 1];
      chronological[i].balanceCents = cents(next.balanceCents! - next.delta);
    }
    for (let i = anchor + 1; anchor >= 0 && i < chronological.length; i++) {
      const entry = chronological[i];
      const expected = cents(chronological[i - 1].balanceCents! + entry.delta);
      if (entry.balanceCents !== null && entry.balanceCents !== expected) invalid("continuity");
      entry.balanceCents = expected;
    }
    const daily = new Map<string, number>();
    if (anchor >= 0) for (const entry of chronological) daily.set(entry.date, entry.balanceCents!);
    const sharedNumber = [...grouped.values()].filter((group) => group.account === account).length > 1;
    return {
      account,
      accountName,
      needsBalance: anchor < 0,
      firstDate: chronological[0].date,
      lastDate: chronological.at(-1)!.date,
      transactions: chronological,
      sourceKey: String(index + 1),
      label: `…${account.slice(-4)}${sharedNumber ? ` · ${index + 1}` : ""}`,
      ...(savings
        ? { suggestedType: "savings" as const }
        : {}),
      rowCount: entries.length,
      reconstructedRowCount,
      balances: [...daily]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, balanceCents]) => ({ date, balanceCents })),
    };
  });
  if (sources.reduce((sum, source) => sum + source.balances.length, 0) > 5000)
    invalid("size");
  return { sources, rowCount };
}

export function parseIngCsv(content: unknown, order: unknown, anchors?: unknown): FinanceImportPreview {
  const parsed = parseIngFile(content, order, anchors);
  return {
    rowCount: parsed.rowCount,
    sources: parsed.sources.map((source) => ({
      sourceKey: source.sourceKey,
      needsBalance: source.needsBalance,
      firstDate: source.firstDate,
      lastDate: source.lastDate,
      label: source.label,
      suggestedName: source.accountName || undefined,
      suggestedType: source.suggestedType,
      rowCount: source.rowCount,
      reconstructedRowCount: source.reconstructedRowCount,
      balances: source.balances,
    })),
  };
}
