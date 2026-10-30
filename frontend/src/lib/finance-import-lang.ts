export const financeImportNl: Record<string, string> = {
  "finance.import": "Importeren",
  "finance.import.detected": "Herkend formaat: {format}",
  "finance.import.format.ing-csv": "ING CSV",
  "finance.import.format.camt053": "CAMT.053 XML",
  "finance.import.xml": "Het XML-bestand is ongeldig of bevat niet-ondersteunde XML-constructies. Upload de ongewijzigde UTF-8-export van je bank.",
  "finance.import.xmlFormat": "Dit XML-formaat wordt niet ondersteund. Gebruik CAMT.053 versie 001.02 of 001.08; CAMT.052 en CAMT.054 worden niet ondersteund.",
  "finance.import.xmlBooked": "Het bestand bevat niet-geboekte transacties. Download een volledig CAMT.053-eindedagafschrift.",
  "finance.import.xmlPages": "Het bestand bevat een onvolledig of opgesplitst afschrift. Download een volledig afschrift in één XML-bestand.",
  "finance.import.xmlBatch": "De details van een betaalbatch zijn onvolledig of sluiten niet aan op het geboekte totaal. Download het volledige afschrift met batchdetails.",
  "finance.import.xmlBalance": "De geboekte saldi of afschriftdata ontbreken of zijn inconsistent. Download een volledig CAMT.053-afschrift met geboekt eindsaldo.",
  "finance.import.xmlOverlap": "Het bestand bevat overlappende afschriften voor dezelfde rekening. Upload een export zonder overlappende perioden.",
  "finance.import.anchorHelp": "Deze rekening bevat {rows} transacties zonder saldo. Vul alleen het werkelijke eindsaldo na alle transacties op {date} in om de saldi terug te rekenen. Gebruik een volledige export zonder transactiefilter, of sla deze rekening over.",
  "finance.import.anchorLabel": "Eindsaldo op {date} (EUR)",
  "finance.import.recheck": "Saldi berekenen en controleren",
  "finance.import.latestBalance": "Laatste saldo in bestand · {date}",
  "finance.import.laterBalance": "Er bestaat al een later saldo van {amount} op {date}. Dat blijft je actuele saldo bepalen na deze import. Controleer of dit saldo klopt via Rekeningen.",
  "finance.import.selectSafe": "Nieuwe en identieke saldi selecteren",
  "finance.import.previewSummary": "{accounts} rekeningen · {rows} transacties gevonden · {skipped} rekeningen nog niet gekoppeld. Controleer ook je spaarrekeningen.",
  "finance.import.mappingConflict": "Deze bankrekening is al gekoppeld, hoort bij een andere rekening, of kan niet eenduidig aan een bestaande spaarrekening worden gekoppeld. Controleer de bestaande koppelingen om dubbeltellingen te voorkomen.",
  "finance.import.details": "Werkwijze en privacy",
  "finance.import.missingBalance": "Deze rekening bevat geen enkel bekend saldo. Download een periode met minstens één saldo na mutatie. Er is niets geïmporteerd.",
  "finance.import.reconstructed": "Bij {count} mutaties ontbreekt het saldo. Deze saldi zijn berekend vanuit een bekend saldo en de mutatiebedragen. Controleer dat de export volledig is en geen transactiefilter bevat.",
  "finance.import.title": "Bankgegevens importeren",
  "finance.import.instructions":
    "Upload een volledig CAMT.053-bestand (.xml) van je bank of een Nederlandse of Engelse ING-export (.csv). Het formaat wordt automatisch herkend. Pak een ZIP-bestand eerst uit. Controleer daarna welke rekeningen en saldi je wilt bewaren.",
  "finance.import.privacy":
    "Van de geselecteerde dagen bewaren we dagsaldi, transactiebedragen, namen en omschrijvingen voor je inkomsten- en uitgavenoverzicht. Rekeningnummers worden voor herkenning gehasht; het uploadbestand zelf wordt niet bewaard. Er is geen bankverbinding.",
  "finance.import.file": "Bankbestand (.xml of .csv, maximaal 2 MB)",
  "finance.import.sortOrder": "Volgorde in het CSV-bestand",
  "finance.import.descending": "Nieuwste eerst (datum aflopend)",
  "finance.import.ascending": "Oudste eerst (datum oplopend)",
  "finance.import.processing": "Bestand controleren…",
  "finance.import.preview": "Importvoorbeeld bekijken",
  "finance.import.coverageHelp":
    "We bewaren dagsaldi en transacties van de geselecteerde dagen. CAMT.053 wordt gecontroleerd met de geboekte begin- en eindsaldi; ook een afsluitdatum zonder transacties kan een saldo bevatten. Bij ING CSV gebruiken we het saldo na de laatste mutatie en moet ook de volgorde binnen één dag kloppen. Download altijd de volledige periode zonder transactiefilter.",
  "finance.import.sourceAccount": "Bankrekening {suffix}",
  "finance.import.sourceSummary":
    "{rows} mutaties → {days} dagsaldi · {start} t/m {end}",
  "finance.import.defaultName": "Bankrekening {suffix}",
  "finance.import.destination": "Koppelen aan rekening in Finance",
  "finance.import.skipAccount": "Deze rekening overslaan / kies een rekening",
  "finance.import.createAccount": "Nieuwe rekening aanmaken",
  "finance.import.archivedHelp":
    "Deze rekening is gearchiveerd. De geïmporteerde saldi tellen mee, maar de rekening blijft gearchiveerd.",
  "finance.import.extendOpening":
    "De geselecteerde saldi liggen vóór de huidige openingsdatum ({date}). Ik wil de openingsdatum vervroegen naar het eerste geselecteerde saldo, met behoud van alle bestaande saldomomenten.",
  "finance.import.selectionSummary":
    "{selected} geselecteerd · {same} al aanwezig · {conflicts} afwijkende bestaande saldi",
  "finance.import.conflictHelp":
    "Afwijkende bestaande saldi staan standaard uit. Vink een datum alleen aan als je het bestaande bedrag wilt vervangen. Identieke saldi blijven behouden; ontbrekende transacties worden aangevuld.",
  "finance.import.selectNew": "Alleen nieuwe saldi selecteren",
  "finance.import.selectNone": "Selectie wissen",
  "finance.import.dates": "Te importeren dagsaldi",
  "finance.import.replace": "Bestaand saldo van {amount} vervangen",
  "finance.import.row.new": "Nieuw saldomoment",
  "finance.import.row.same": "Saldo al aanwezig · transacties worden aangevuld",
  "finance.import.duplicateTarget":
    "Koppel verschillende Bankrekeningen aan verschillende rekeningen in Finance.",
  "finance.import.consentRequired":
    "Bevestig bij de rekening dat de openingsdatum mag worden vervroegd, of deselecteer de oudere saldi.",
  "finance.import.reviewHelp":
    "Controleer je koppelingen en eindsaldi. Aangevinkte dagen vervangen ook de eerder geïmporteerde transacties van die dag. Gebruik daarom een volledige export zonder transactiefilter. Afwijkende bestaande saldi vervang je alleen door ze expliciet aan te vinken.",
  "finance.import.save": "{count} saldi importeren",
  "finance.import.success":
    "Import voltooid: {created} rekeningen, {inserted} nieuwe saldi, {updated} bijgewerkte saldi en {transactions} nieuwe transacties en {removed} verouderde transacties vervangen.",
  "finance.import.fileType":
    "Kies een CAMT.053 XML-bestand of ING CSV-bestand. Pak een ZIP eerst uit. PDF en Excel worden niet ondersteund.",
  "finance.import.size":
    "Het bestand is te groot. Gebruik maximaal 2 MB, 20.000 mutaties en 5.000 dagsaldi; download zo nodig een kortere periode.",
  "finance.import.malformed":
    "Dit is geen geldig bankbestand. Download het opnieuw bij je bank en upload het ongewijzigd.",
  "finance.import.empty":
    "Er zijn geen bruikbare mutaties gevonden. Kies een bankexport met mutaties voor de gewenste periode.",
  "finance.import.columns":
    "De benodigde ING-kolommen ontbreken. Gebruik een Nederlandse of Engelse ING-export met datum, rekening, af/bij, bedrag, valuta en saldo na mutatie (Resulting balance).",
  "finance.import.currency":
    "Deze export bevat een andere of ontbrekende valuta. Alleen EUR wordt ondersteund. Er is niets geïmporteerd.",
  "finance.import.order":
    "De gekozen volgorde past niet bij het bestand. Kies Nieuwste eerst of Oudste eerst en bekijk het importvoorbeeld opnieuw. Herschik losse regels niet handmatig.",
  "finance.import.amount":
    "Een bedrag of credit/debet-aanduiding is ongeldig. Bedragen moeten in EUR staan, met twee decimalen en maximaal 10 miljard euro.",
  "finance.import.date":
    "Een datum is ongeldig, ligt vóór 1900 of ligt in de toekomst. Download de export opnieuw bij je bank.",
  "finance.import.account":
    "Een rekening in het bankbestand kan niet worden herkend. Gebruik de ongewijzigde export.",
  "finance.import.continuity":
    "Mutaties en saldi sluiten niet op elkaar aan. Controleer de gekozen volgorde en download de volledige periode zonder transactiefilter. Dit bestand wordt niet geïmporteerd.",
  "finance.import.selection":
    "De importselectie is ongeldig. Bekijk het importvoorbeeld opnieuw en kies een rekening en minstens één datum.",
  "finance.import.beforeOpening":
    "Een saldo ligt vóór de openingsdatum. Bevestig in het importvoorbeeld dat de openingsdatum mag worden vervroegd.",
  "finance.import.stale":
    "Een bestaand saldo is sinds het importvoorbeeld gewijzigd. Bekijk het voorbeeld opnieuw en controleer de verschillen voordat je importeert. Er is niets opgeslagen.",
};
