# CAMT.053 fixture coverage

`camt.ts` builds synthetic XML using placeholder names, references, and intentionally fictional `NL00` account identifiers. No customer exports or personal data are included. The fixtures exercise the shared CAMT structure, not certified bank integrations or every bank's export options.

The bank-code matrix tests ING, ABN AMRO, Rabobank, ASN, SNS, RegioBank, Triodos, Knab, and bunq in both supported namespace versions. Testing a bank code with a version does not imply that bank offers that version. Additional cases exercise version-specific statuses and party wrappers, batch amounts, multiple statements, statement balances, booking dates, and structured references.

## Primary format references

- [ING CAMT.053.001.02 usage guideline](https://www.ingwb.com/binaries/content/assets/support-content/payments-and-reporting/insidebusiness-payments/camt_053_001_02_20180829_0731_tcm162-156569.pdf)
- [ABN AMRO electronic account statements and technical specifications](https://www.abnamro.nl/en/commercialbanking/products/payments/sepa/reporting/index.html)
- [Rabobank formats, including CAMT.053.001.02 and .001.08](https://www.rabobank.nl/en/business/support/online-bankieren/formats)
- [ASN CAMT.053 format description](https://www.asnbank.nl/downloads/formaatbeschrijving-camt053.html)
- [SNS CAMT.053 format description](https://www.snsbank.nl/particulier/support/download-tonen-op-pagina/sns-formaatbeschrijving-camt053.html)
- [RegioBank CAMT.053 technical specifications](https://www.regiobank.nl/downloads/technische-specificaties-van-camt.053.html)
- [Triodos CAMT.053 format description](https://www.triodos.nl/downloads/camt053-formaatbeschrijving?id=78266bc3bd46)

Knab and bunq are covered for bank identification and generic standard-compatible input only; no bank-export fixture is verified for them. [bunq's current public statement guide](https://help.bunq.com/en-ie/articles/how-do-i-export-a-bank-statement) lists PDF, CSV, and MT940 rather than CAMT.053. This importer does not add support for those additional formats.

## Import boundaries

Only complete, unpaginated CAMT.053.001.02/.001.08 XML documents with EUR booked amounts are accepted. Transactional statements require opening and closing booked balances; closing-only balance statements without transactions are allowed. Available balances are ignored. Batch detail amounts must reconcile with their entry; an entry without details is imported once as an aggregate transaction. Multi-file pagination and overlapping statement coverage must be resolved by exporting one complete file before importing. ZIPs must be extracted first.
