import { requireObject, ValidationError } from "../../utils/validation";
import { parseCamt053 } from "./camt053";
import { parseIngFile } from "./ing-csv";
import type { ParsedImport } from "./import-model";

export function parseImport(input: unknown): ParsedImport {
  const data = requireObject(input);
  if (data.content !== undefined && data.csv !== undefined) throw new ValidationError("finance.import.selection");
  const content = data.content ?? data.csv;
  if (typeof content !== "string") throw new ValidationError("finance.import.malformed");
  if (content.replace(/^\uFEFF/, "").trimStart().startsWith("<")) return parseCamt053(content);
  const parsed = parseIngFile(content, data.order, data.anchors);
  return { ...parsed, format: "ing-csv", sources: parsed.sources.map((source) => ({ ...source, bank: "ING" })) };
}
