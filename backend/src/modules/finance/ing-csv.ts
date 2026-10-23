import { ValidationError } from "../../utils/validation";
import { calendarDate, cents } from "./validation";
import type {
  FinanceImportPreview,
  FinanceImportOrder,
} from "../../types/finance";

export const ING_MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 20000;
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
    if (rows.length > MAX_ROWS + 1) invalid("size");
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

function amount(value: string, nonnegative = false): number {
  const normalized = value.trim().replace(/\u2212/g, "-");
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

export function parseIngCsv(
  content: unknown,
  orderInput: unknown,
): FinanceImportPreview {
  if (typeof content !== "string") invalid("malformed");
  if (orderInput !== "descending" && orderInput !== "ascending")
    invalid("order");
  const order: FinanceImportOrder = orderInput;
  const rows = csvRows(content);
  if (rows.length < 2) invalid("empty");
  const headers = rows[0].map((value) =>
    value.trim().toLowerCase().replace(/\s+/g, " "),
  );
  if (new Set(headers).size !== headers.length) invalid("malformed");
  const columns = ["datum", "rekening", "af bij", "saldo na mutatie"].map(
    (name) => headers.indexOf(name),
  );
  if (columns.some((index) => index < 0)) invalid("columns");
  const [dateColumn, accountColumn, directionColumn, balanceColumn] = columns;
  const euroAmountColumn = headers.indexOf("bedrag (eur)");
  const plainAmountColumn = headers.indexOf("bedrag");
  const currencyColumn = headers.indexOf("valuta");
  if (euroAmountColumn >= 0 && plainAmountColumn >= 0) invalid("columns");
  const amountColumn =
    euroAmountColumn >= 0 ? euroAmountColumn : plainAmountColumn;
  if (amountColumn < 0 || (euroAmountColumn < 0 && currencyColumn < 0))
    invalid("columns");
  const accountNameColumn = headers.indexOf("rekening naam");
  type Row = {
    date: string;
    balanceCents: number;
    delta: number;
    savings: boolean;
  };
  const grouped = new Map<string, Row[]>();
  for (const row of rows.slice(1)) {
    if (row.length !== headers.length) invalid("malformed");
    if (
      currencyColumn >= 0 &&
      row[currencyColumn].trim().toUpperCase() !== "EUR"
    )
      invalid("currency");
    const account = row[accountColumn].replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z0-9-]{4,40}$/.test(account)) invalid("account");
    const direction = row[directionColumn].trim().toLowerCase();
    if (direction !== "af" && direction !== "bij") invalid("amount");
    const value = {
      date: date(row[dateColumn]),
      balanceCents: amount(row[balanceColumn]),
      delta: amount(row[amountColumn], true) * (direction === "af" ? -1 : 1),
      savings:
        accountNameColumn >= 0 && /spaarrekening/i.test(row[accountNameColumn]),
    };
    const entries = grouped.get(account) ?? [];
    entries.push(value);
    grouped.set(account, entries);
  }
  if (grouped.size > 200) invalid("size");
  const sources = [...grouped.entries()].map(([account, entries], index) => {
    for (let i = 1; i < entries.length; i++) {
      const previous = entries[i - 1],
        current = entries[i];
      if (
        (order === "descending" && current.date > previous.date) ||
        (order === "ascending" && current.date < previous.date)
      )
        invalid("order");
      const expected =
        order === "descending"
          ? previous.balanceCents - previous.delta
          : previous.balanceCents + current.delta;
      if (expected !== current.balanceCents) invalid("continuity");
    }
    const daily = new Map<string, number>();
    for (const entry of entries)
      if (order === "ascending" || !daily.has(entry.date))
        daily.set(entry.date, entry.balanceCents);
    return {
      sourceKey: String(index + 1),
      label: `…${account.slice(-4)}`,
      ...(entries.every((entry) => entry.savings)
        ? { suggestedType: "savings" as const }
        : {}),
      rowCount: entries.length,
      balances: [...daily]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, balanceCents]) => ({ date, balanceCents })),
    };
  });
  if (sources.reduce((sum, source) => sum + source.balances.length, 0) > 5000)
    invalid("size");
  return { sources, rowCount: rows.length - 1 };
}
