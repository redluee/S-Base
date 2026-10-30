import { amount, at, children, date, invalid, optional, required, sign, value, type XmlNode } from "./camt-xml";
import type { ImportTransaction } from "./import-model";
import { cents } from "./validation";

function details(node: XmlNode, delta: number, bookingDate: string, entry: XmlNode): ImportTransaction {
  const party = delta < 0 ? "Cdtr" : "Dbtr";
  const related = at(node, "RltdPties");
  const name = related && (value(related, party, "Nm") || value(related, party, "Pty", "Nm"));
  const counterparty = related && value(related, `${party}Acct`, "Id", "IBAN");
  const remittance = optional(node, "RmtInf");
  const texts = remittance ? [
    ...children(remittance, "Ustrd").map((item) => item.text.trim()),
    ...children(remittance, "Strd").map((item) => value(item, "CdtrRefInf", "Ref")),
  ] : [];
  const reference = value(node, "Refs", "EndToEndId");
  return {
    date: bookingDate,
    delta,
    balanceCents: null,
    name: name || "",
    counterparty: (counterparty || "").replace(/\s/g, "").toUpperCase(),
    description: [...new Set([
      ...texts,
      reference === "NOTPROVIDED" ? "" : reference,
      value(node, "AddtlTxInf"),
      value(entry, "AddtlNtryInf"),
    ].filter(Boolean))].join(" · "),
  };
}

function detailAmount(node: XmlNode) {
  const direct = optional(node, "Amt");
  if (direct) return amount(direct);
  const transaction = at(node, "AmtDtls", "TxAmt", "Amt");
  const countervalue = at(node, "AmtDtls", "CntrValAmt", "Amt");
  if (transaction?.attributes.Ccy === "EUR") return amount(transaction);
  if (countervalue) return amount(countervalue);
  if (transaction) invalid("currency");
  return undefined;
}

export function parseEntry(entry: XmlNode) {
  const status = required(entry, "Sts");
  if ((status.text.trim() || value(status, "Cd")) !== "BOOK") invalid("xmlBooked");
  const bookingDate = date(required(entry, "BookgDt"));
  const direction = value(entry, "CdtDbtInd");
  const delta = amount(required(entry, "Amt")) * sign(direction);
  const detailNodes = children(entry, "NtryDtls").flatMap((node) => children(node, "TxDtls"));
  if (!detailNodes.length) return { date: bookingDate, delta, transactions: [details(entry, delta, bookingDate, entry)] };
  const transactions = detailNodes.map((node) => {
    const unsigned = detailAmount(node);
    const detailDirection = value(node, "CdtDbtInd") || direction;
    if (unsigned === undefined && detailNodes.length !== 1) invalid("xmlBatch");
    return details(node, (unsigned ?? Math.abs(delta)) * sign(detailDirection), bookingDate, entry);
  });
  if (transactions.reduce((sum, transaction) => cents(sum + transaction.delta), 0) !== delta) invalid("xmlBatch");
  return { date: bookingDate, delta, transactions };
}
