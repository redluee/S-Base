const NL = "nl-NL";

export function sanitizeDecimalInput(raw: string, maxDecimals = 3): string {
  let out = "";
  let separator = "";
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else if ((ch === "," || ch === ".") && !separator) {
      separator = ch;
      out += ch;
    }
  }
  if (separator) {
    const at = out.indexOf(separator);
    const decimals = out.slice(at + 1);
    if (decimals.length > maxDecimals) out = out.slice(0, at + 1 + maxDecimals);
  }
  return out;
}

export function sanitizeIntegerInput(raw: string, maxLength = 4): string {
  return raw.replace(/\D/g, "").slice(0, maxLength);
}

export function parseDecimal(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let text = raw.trim().replace(/\s/g, "");
  if (!text) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    text = text.replace(",", ".");
  }
  if (!/^\d*\.?\d*$/.test(text) || text === "." || text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(raw: string | number | null | undefined): number | null {
  const n = parseDecimal(raw);
  return n === null ? null : Math.trunc(n);
}

export function toInputString(value: number | null | undefined, maxDecimals = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const factor = 10 ** maxDecimals;
  return String(Math.round(value * factor) / factor).replace(".", ",");
}

export function formatNumberNl(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat(NL, { maximumFractionDigits: maxDecimals }).format(value);
}
