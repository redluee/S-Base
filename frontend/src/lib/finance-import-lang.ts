export const financeImportNl: Record<string, string> = {
  "finance.import": "Importeren",
  "finance.import.title": "Importeren vanuit ING",
  "finance.import.instructions":
    "Download bij ING je volledige af- en bijschrijvingen als CSV, met de kolom ‘Saldo na mutatie’. Zowel komma- als puntkommagescheiden exports van betaal- en spaarrekeningen worden ondersteund, ook met aparte kolommen ‘Bedrag’ en ‘Valuta’. Upload het ongewijzigde bestand hieronder. PDF wordt hier niet ondersteund.",
  "finance.import.privacy":
    "Alleen de geselecteerde dagsaldi worden bewaard. Het CSV-bestand, rekeningnummers, namen van tegenpartijen en transactieomschrijvingen worden niet opgeslagen. De import maakt geen verbinding met je bank.",
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
  "finance.import.destination": "Koppelen aan rekening in Geldzaken",
  "finance.import.skipAccount": "Deze rekening overslaan / kies een rekening",
  "finance.import.createAccount": "Nieuwe rekening aanmaken",
  "finance.import.archivedHelp":
    "Deze rekening is gearchiveerd. De geïmporteerde saldi tellen mee, maar de rekening blijft gearchiveerd.",
  "finance.import.extendOpening":
    "De geselecteerde saldi liggen vóór de huidige openingsdatum ({date}). Ik wil de openingsdatum vervroegen naar het eerste geselecteerde saldo, met behoud van alle bestaande saldomomenten.",
  "finance.import.selectionSummary":
    "{selected} geselecteerd · {same} al aanwezig · {conflicts} afwijkende bestaande saldi",
  "finance.import.conflictHelp":
    "Afwijkende bestaande saldi staan standaard uit. Vink een datum alleen aan als je het bestaande bedrag wilt vervangen. Identieke saldi worden overgeslagen.",
  "finance.import.selectNew": "Alleen nieuwe saldi selecteren",
  "finance.import.selectNone": "Selectie wissen",
  "finance.import.dates": "Te importeren dagsaldi",
  "finance.import.replace": "Bestaand saldo van {amount} vervangen",
  "finance.import.row.new": "Nieuw saldomoment",
  "finance.import.row.same": "Al aanwezig · wordt overgeslagen",
  "finance.import.duplicateTarget":
    "Koppel verschillende ING-rekeningen aan verschillende rekeningen in Geldzaken.",
  "finance.import.consentRequired":
    "Bevestig bij de rekening dat de openingsdatum mag worden vervroegd, of deselecteer de oudere saldi.",
  "finance.import.reviewHelp":
    "Controleer de rekeningkoppeling en bedragen vóór je opslaat. Alleen aangevinkte datums worden geïmporteerd. Lagere saldi kunnen een tekort bij bestaande doeltoewijzingen zichtbaar maken; de toewijzingen zelf blijven behouden.",
  "finance.import.save": "{count} saldi importeren",
  "finance.import.success":
    "Import voltooid: {created} rekeningen aangemaakt, {inserted} nieuwe saldi en {updated} bestaande saldi bijgewerkt. Je overzicht is opnieuw berekend.",
  "finance.import.fileType":
    "Kies een ING CSV-bestand met ‘Saldo na mutatie’. PDF en Excel-bestanden worden niet ondersteund.",
  "finance.import.size":
    "Het bestand is te groot. Gebruik maximaal 2 MB, 20.000 mutaties en 5.000 dagsaldi; download zo nodig een kortere periode.",
  "finance.import.malformed":
    "Dit is geen geldig CSV-bestand. Download het opnieuw bij ING en upload het zonder het eerst in Excel op te slaan.",
  "finance.import.empty":
    "Er zijn geen mutaties met een saldo gevonden. Kies een periode met mutaties, of voer een saldo handmatig in.",
  "finance.import.columns":
    "De benodigde ING-kolommen ontbreken. Gebruik een Nederlands ING CSV met Datum, Rekening, Af Bij, Saldo na mutatie en Bedrag (EUR), of Bedrag met Valuta. Een export zonder saldokolom is niet geschikt.",
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
