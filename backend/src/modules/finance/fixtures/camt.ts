export const bankCodes = ["INGB", "ABNA", "RABO", "ASNB", "SNSB", "RBRB", "TRIO", "KNAB", "BUNQ"];
export const sampleIban = (bank = "INGB", suffix = "0000000001") => `NL00${bank}${suffix}`;

export function camtBalance(code: string, amount: string, day = "2025-01-02", direction = "CRDT") {
  return `<Bal><Tp><CdOrPrtry><Cd>${code}</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">${amount}</Amt><CdtDbtInd>${direction}</CdtDbtInd><Dt><Dt>${day}</Dt></Dt></Bal>`;
}

export function camtEntry(options: { day?: string; amount?: string; direction?: string; version?: string; detail?: string; extra?: string } = {}) {
  const { day = "2025-01-02", amount = "20.00", direction = "DBIT", version = "02" } = options;
  const party = direction === "DBIT" ? "Cdtr" : "Dbtr";
  const name = version === "08" ? "<Pty><Nm>Sample counterparty</Nm></Pty>" : "<Nm>Sample counterparty</Nm>";
  const detail = options.detail ?? `<TxDtls><Refs><EndToEndId>DEMO-REFERENCE</EndToEndId></Refs><RltdPties><${party}>${name}</${party}><${party}Acct><Id><IBAN>${sampleIban("RABO", "0000000002")}</IBAN></Id></${party}Acct></RltdPties><RmtInf><Ustrd>Sample &amp; payment</Ustrd><Strd><CdtrRefInf><Ref>DEMO-STRUCTURED</Ref></CdtrRefInf></Strd></RmtInf></TxDtls>`;
  return `<Ntry><Amt Ccy="EUR">${amount}</Amt><CdtDbtInd>${direction}</CdtDbtInd><Sts>${version === "08" ? "<Cd>BOOK</Cd>" : "BOOK"}</Sts><BookgDt><Dt>${day}</Dt></BookgDt><ValDt><Dt>2024-12-31</Dt></ValDt>${options.extra ?? ""}<NtryDtls>${detail}</NtryDtls></Ntry>`;
}

export function camtStatement(options: { bank?: string; iban?: string; entries?: string; opening?: string; closing?: string; name?: string; extra?: string; version?: string } = {}) {
  const { bank = "INGB", version = "02" } = options;
  const bicTag = version === "08" ? "BICFI" : "BIC";
  return `<Stmt><Id>DEMO-STATEMENT</Id><Acct><Id><IBAN>${options.iban ?? sampleIban(bank)}</IBAN></Id><Ccy>EUR</Ccy><Nm>${options.name ?? "Sample account"}</Nm><Svcr><FinInstnId><${bicTag}>${bank}NL2A</${bicTag}></FinInstnId></Svcr></Acct>${options.opening ?? camtBalance("OPBD", "100.00", "2025-01-01")}${options.closing ?? camtBalance("CLBD", "80.00")}${options.extra ?? ""}${options.entries ?? camtEntry({ version })}</Stmt>`;
}

export function camtDocument(statements = camtStatement(), version = "02", prefix = "") {
  const content = `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.${version}"><BkToCstmrStmt><GrpHdr><MsgId>DEMO-MESSAGE</MsgId></GrpHdr>${statements}</BkToCstmrStmt></Document>`;
  return prefix ? content.replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)/g, `<$1${prefix}:$2`).replace('xmlns="', `xmlns:${prefix}="`) : content;
}
