import { SaxesParser } from "saxes";
import { ValidationError } from "../../utils/validation";
import { calendarDate, cents } from "./validation";
import { ING_MAX_BYTES } from "./ing-csv";

export interface XmlNode {
  name: string;
  text: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}

export function invalid(key = "xml"): never {
  throw new ValidationError(`finance.import.${key}`);
}

export function children(node: XmlNode, name: string) {
  return node.children.filter((child) => child.name === name);
}

export function optional(node: XmlNode, name: string): XmlNode | undefined {
  const matches = children(node, name);
  if (matches.length > 1) invalid();
  return matches[0];
}

export function required(node: XmlNode, name: string): XmlNode {
  return optional(node, name) ?? invalid();
}

export function at(node: XmlNode, ...path: string[]): XmlNode | undefined {
  let current: XmlNode | undefined = node;
  for (const part of path) current = current && optional(current, part);
  return current;
}

export function value(node: XmlNode, ...path: string[]) {
  return at(node, ...path)?.text.trim() ?? "";
}

export function xmlDocument(content: string) {
  if (new TextEncoder().encode(content).length > ING_MAX_BYTES) invalid("size");
  const parser = new SaxesParser({ xmlns: true });
  const stack: XmlNode[] = [];
  let root: XmlNode | undefined;
  let namespace = "";
  let count = 0;
  parser.on("error", () => invalid());
  parser.on("doctype", () => invalid());
  parser.on("xmldecl", (decl) => {
    if (decl.encoding && !/^utf-8$/i.test(decl.encoding)) invalid();
  });
  parser.on("opentag", (tag) => {
    if (++count > 250000 || stack.length >= 64) invalid("size");
    if (!root) {
      namespace = tag.uri;
      if (tag.local !== "Document" || !/^urn:iso:std:iso:20022:tech:xsd:camt\.053\.001\.(02|08)$/.test(namespace))
        invalid("xmlFormat");
    }
    if (tag.uri !== namespace) invalid("xmlFormat");
    const node: XmlNode = { name: tag.local, text: "", children: [], attributes: {} };
    for (const attr of Object.values(tag.attributes)) {
      if (!attr.uri) node.attributes[attr.local] = attr.value;
    }
    if (stack.length) stack.at(-1)!.children.push(node);
    else if (root) invalid();
    else root = node;
    stack.push(node);
  });
  const append = (text: string) => {
    if (stack.length) stack.at(-1)!.text += text;
  };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => { stack.pop(); });
  try {
    parser.write(content.replace(/^\uFEFF/, "").trim()).close();
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    invalid();
  }
  return root ?? invalid();
}

export function date(node: XmlNode): string {
  const raw = value(node, "Dt") || value(node, "DtTm");
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(raw)) invalid("date");
  if (raw.length > 10 && Number.isNaN(Date.parse(raw))) invalid("date");
  try { return calendarDate(raw.slice(0, 10)); } catch { return invalid("date"); }
}

export function amount(node: XmlNode): number {
  if (node.attributes.Ccy !== "EUR") invalid("currency");
  const raw = node.text.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) invalid("amount");
  const [whole, decimals = ""] = raw.split(".");
  try { return cents(Number(whole) * 100 + Number(decimals.padEnd(2, "0")), 0); }
  catch { return invalid("amount"); }
}

export function sign(direction: string): number {
  if (direction !== "CRDT" && direction !== "DBIT") invalid("amount");
  return direction === "CRDT" ? 1 : -1;
}
