export const financeImportNl: Record<string, string> = {
  "finance.import": "Importeren",
  "finance.import.anchorHelp": "Deze rekening bevat {rows} transacties zonder saldo. Vul alleen het werkelijke eindsaldo na alle transacties op {date} in om de saldi terug te rekenen. Gebruik een volledige export zonder transactiefilter, of sla deze rekening over.",
  "finance.import.anchorLabel": "Eindsaldo op {date} (EUR)",
  "finance.import.recheck": "Saldi berekenen en controleren",
  "finance.import.latestBalance": "Laatste saldo in bestand · {date}",
  "finance.import.laterBalance": "Er bestaat al een later saldo van {amount} op {date}. Dat blijft je actuele saldo bepalen na deze import. Controleer of dit saldo klopt via Rekeningen.",
  "finance.import.selectSafe": "Nieuwe en identieke saldi selecteren",
  "finance.import.previewSummary": "{accounts} rekeningen · {rows} transacties gevonden · {skipped} rekeningen nog niet gekoppeld. Controleer ook je spaarrekeningen.",
  "finance.import.mappingConflict": "Deze ING-rekening is al aan een andere rekening gekoppeld, of de gekozen rekening hoort bij een andere ING-rekening. Kies de bestaande koppeling om dubbeltellingen te voorkomen.",
  "finance.import.details": "Werkwijze en privacy",
  "finance.import.missingBalance": "Deze rekening bevat geen enkel bekend saldo. Download een periode met minstens één saldo na mutatie. Er is niets geïmporteerd.",
  "finance.import.reconstructed": "Bij {count} mutaties ontbreekt het saldo. Deze saldi zijn berekend vanuit een bekend saldo en de mutatiebedragen. Controleer dat de export volledig is en geen transactiefilter bevat.",
  "finance.import.title": "Importeren vanuit ING",
  "finance.import.instructions":
    "Upload je volledige Nederlandse of Engelse ING-export als CSV met ‘Saldo na mutatie’ of ‘Resulting balance’. Kies daarna welke rekeningen en saldi je wilt bewaren.",
  "finance.import.privacy":
    "Van de geselecteerde dagen bewaren we dagsaldi, transactiebedragen, namen en omschrijvingen voor je inkomsten- en uitgavenoverzicht. Rekeningnummers worden voor herkenning gehasht; het CSV-bestand zelf wordt niet bewaard. Er is geen bankverbinding.",
  "finance.import.file": "ING CSV-bestand (maximaal 2 MB)",
  "finance.import.sortOrder": "Volgorde in het CSV-bestand",
  "finance.import.descending": "Nieuwste eerst (datum aflopend)",
  "finance.import.ascending": "Oudste eerst (datum oplopend)",
  "finance.import.processing": "Bestand controleren…",
  "finance.import.preview": "Importvoorbeeld bekijken",
  "finance.import.coverageHelp":
    "Per rekening en kalenderdag gebruiken we het saldo na de laatste mutatie in het bestand. Dagen zonder mutaties krijgen geen extra saldomoment. Download de hele periode zonder transactiefilter. Ook de volgorde binnen één dag moet kloppen; een gefilterd bestand kan geen betrouwbaar dagsaldo geven.",
  "finance.import.sourceAccount": "ING-rekening {suffix}",
  "finance.import.sourceSummary":
    "{rows} mutaties → {days} dagsaldi · {start} t/m {end}",
  "finance.import.defaultName": "ING-rekening {suffix}",
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
    "Koppel verschillende ING-rekeningen aan verschillende rekeningen in Finance.",
  "finance.import.consentRequired":
    "Bevestig bij de rekening dat de openingsdatum mag worden vervroegd, of deselecteer de oudere saldi.",
  "finance.import.reviewHelp":
    "Controleer je koppelingen en eindsaldi. Aangevinkte dagen vervangen ook de eerder geïmporteerde transacties van die dag. Gebruik daarom een volledige export zonder transactiefilter. Afwijkende bestaande saldi vervang je alleen door ze expliciet aan te vinken.",
  "finance.import.save": "{count} saldi importeren",
  "finance.import.success":
    "Import voltooid: {created} rekeningen, {inserted} nieuwe saldi, {updated} bijgewerkte saldi en {transactions} nieuwe transacties en {removed} verouderde transacties vervangen.",
  "finance.import.fileType":
    "Kies een ING CSV-bestand met ‘Saldo na mutatie’. PDF en Excel-bestanden worden niet ondersteund.",
  "finance.import.size":
    "Het bestand is te groot. Gebruik maximaal 2 MB, 20.000 mutaties en 5.000 dagsaldi; download zo nodig een kortere periode.",
  "finance.import.malformed":
    "Dit is geen geldig CSV-bestand. Download het opnieuw bij ING en upload het zonder het eerst in Excel op te slaan.",
  "finance.import.empty":
    "Er zijn geen bruikbare mutaties gevonden. Kies een bankexport met mutaties voor de gewenste periode.",
  "finance.import.columns":
    "De benodigde ING-kolommen ontbreken. Gebruik een Nederlandse of Engelse ING-export met datum, rekening, af/bij, bedrag, valuta en saldo na mutatie (Resulting balance).",
  "finance.import.currency":
    "Deze export bevat een andere of ontbrekende valuta. Alleen EUR wordt ondersteund. Er is niets geïmporteerd.",
  "finance.import.order":
    "De gekozen volgorde past niet bij het bestand. Kies Nieuwste eerst of Oudste eerst en bekijk het importvoorbeeld opnieuw. Herschik losse regels niet handmatig.",
  "finance.import.amount":
    "Een bedrag of Af/Bij-aanduiding is ongeldig. Bedragen moeten in EUR staan, met twee decimalen en maximaal 10 miljard euro.",
  "finance.import.date":
    "Een datum is ongeldig, ligt vóór 1900 of ligt in de toekomst. Download de export opnieuw bij ING.",
  "finance.import.account":
    "Een rekening in het CSV-bestand kan niet worden herkend. Gebruik de ongewijzigde ING-export.",
  "finance.import.continuity":
    "Mutaties en saldi sluiten niet op elkaar aan. Controleer de gekozen volgorde en download de volledige periode zonder transactiefilter. Dit bestand wordt niet geïmporteerd.",
  "finance.import.selection":
    "De importselectie is ongeldig. Bekijk het importvoorbeeld opnieuw en kies een rekening en minstens één datum.",
  "finance.import.beforeOpening":
    "Een saldo ligt vóór de openingsdatum. Bevestig in het importvoorbeeld dat de openingsdatum mag worden vervroegd.",
  "finance.import.stale":
    "Een bestaand saldo is sinds het importvoorbeeld gewijzigd. Bekijk het voorbeeld opnieuw en controleer de verschillen voordat je importeert. Er is niets opgeslagen.",
};
