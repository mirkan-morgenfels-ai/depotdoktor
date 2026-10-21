# Prüfung an echten Broker-Exporten

Anleitung für den Autor, Stand der Recherche 20.10.2026. Offen ist laut [verifikation.md](verifikation.md) noch der Abgleich von DepotDoktor mit echten Exporten von Trade Republic und Scalable Capital. Bisher sind Parser, Kennzahlen und Steuerlogik nur an synthetischen Testdateien (`packages/csv/fixtures/`), an Handrechnungen und an den Rechenbeispielen des BMF geprüft. Diese Anleitung beschreibt, wie Sie

1. den Export bei Trade Republic und Scalable Capital erzeugen,
2. die Datei in DepotDoktor laden,
3. die Ergebnisse mit einer Prüfliste gegen die Unterlagen des Brokers prüfen,
4. das Ergebnis in einem Prüfprotokoll festhalten und
5. Abweichungen ohne echte Daten in einen Test überführen.

Die Menüwege der Broker ändern sich mit App-Versionen. Was nicht durch eine Hilfeseite des Brokers belegt ist, steht hier als „Stand der Recherche“. Alle Quellen mit Abrufdatum stehen am Ende.

## Grundregeln zum Datenschutz

- Export, Abrechnungen, Steuerbescheinigungen, Screenshots mit echten Werten und das ausgefüllte Prüfprotokoll enthalten Ihre Finanzdaten. Legen Sie alles in einem eigenen Ordner außerhalb des Repos ab, zum Beispiel `Dokumente\DepotDoktor-Prüfung\`. Nie im Repo-Ordner, auch nicht vorübergehend: Das Repo ist öffentlich, und KI-Werkzeuge, die im Repo arbeiten (etwa Claude Code), können Dateien dort lesen.
- Keine echten Daten in Commits, Issues, Pull Requests oder Chats, auch keine Auszüge, Zeilen, Kontonummern, Referenzen oder IDs.
- Vor jedem Commit `git status` ansehen. Neue CSV-Dateien dürfen nur synthetische Fixtures unter `packages/csv/fixtures/` sein.
- Den Export nicht in Excel öffnen und speichern; Excel ändert Trennzeichen, Dezimalzeichen und Datumsformat. Zum Ansehen einen Texteditor verwenden oder Excel ohne Speichern schließen.
- In `docs/verifikation.md` kommen nur anonymisierte Ergebnisse: stimmt oder stimmt nicht, Abweichung in Cent oder Prozentpunkten, Ursache. Keine Depotwerte, Stückzahlen, Positionsnamen oder Buchungsdaten.

## 1. Export beim Broker

Exportieren Sie jeweils den ganzen Zeitraum, vom Tag der Konto- bzw. Depoteröffnung bis heute. Nur ein vollständiger Export ergibt den richtigen Bestand und die richtigen Anschaffungskosten für FIFO; bei einem gekürzten Zeitraum fehlen frühere Käufe.

### 1.1 Trade Republic

Trade Republic bietet den Transaktionsexport als CSV seit Mitte April 2026 an (Ankündigung im Forum von Portfolio Performance, 15.04.2026). Ein Hilfeartikel von Trade Republic zum CSV-Export war am 20.10.2026 nicht auffindbar. Die folgenden Schritte stützen sich auf drei voneinander unabhängige Beschreibungen (Portfolio-Performance-Forum, privatsparer.de, Blockpit) und decken sich mit dem Hinweis in DepotDoktor („App → Kontoauszüge → Transaktionsexport“). Stand der Recherche:

1. Die App auf die neueste Version aktualisieren. Laut Forum gab es unter Android mit App-Version 4.2616.1 nur den PDF-Kontoauszug; mit 4.2616.2 war der CSV-Export vorhanden.
2. In der App oben rechts das Profil öffnen (Symbol bzw. Ihr Name). Im Forum heißt der Weg „Service → Kontoauszüge → Transaktionsexport“, an anderer Stelle „Profil / Kontoauszüge“; der erste Schritt kann je nach App-Version anders heißen.
3. „Kontoauszüge“ und dann „Transaktionsexport“ wählen.
4. Start- und Enddatum festlegen: Start am oder vor Ihrer ersten Buchung, Ende heute.
5. Mit „Erstellen“ die CSV-Datei erzeugen (eine Beschreibung nennt den Weg über „Teilen“) und auf einem Weg in den Prüfordner übertragen, den Sie auch für Kontoauszüge nutzen würden.

Ob die Web-Version von Trade Republic den Export ebenfalls anbietet, ist nicht belegt.

Was DepotDoktor erwartet: Komma als Trennzeichen, alle Felder in Anführungszeichen, Dezimalpunkt, ISO-Datum, UTF-8 und die zwölf Pflichtspalten `datetime`, `date`, `account_type`, `category`, `type`, `asset_class`, `name`, `shares`, `price`, `amount`, `fee`, `tax`. Eine im Forum veröffentlichte Beispielzeile (Beitrag vom 19.04.2026) hat 23 Felder; die ersten 13 passen nach ihrem Inhalt zu `datetime` bis `tax` einschließlich `symbol`. Die Kopfzeile selbst ist dort nicht veröffentlicht. Ob es eine Spalte `isin` gibt und wie die Spalten nach `tax` heißen, klärt erst Ihr Export (`docs/verifikation.md`, „Zu verifizieren an echten Exporten“, Punkt 1).

Weitere Unterlagen von Trade Republic:

| Unterlage | Wo | Beleg |
|---|---|---|
| Abrechnung je Kauf und Verkauf | „Cash“ → „Transaktionen“ → Transaktion wählen → „Dokumente“ | Hilfeartikel „Wo kann ich meinen Depotauszug finden?“ |
| Abrechnung der Vorabpauschale für 2025 | Buchung im Januar 2026; genauer Ort des Dokuments nicht offiziell beschrieben | Stand der Recherche (Forenberichte) |
| Jahressteuerbescheinigung | „Profil“ → „Steuern“, als PDF | Hilfeartikel „Jahressteuerbescheinigung“ |
| Performance-Anzeige | Portfolio-Übersicht; Tippen auf die Zahl wechselt zwischen absoluter und relativer Wertentwicklung | Hilfeartikel „Wie wird die Performance-Wertentwicklung meines Portfolios berechnet?“ |
| Bestand je Position (Stück) | Portfolio-Übersicht, Position öffnen | |

### 1.2 Scalable Capital

Laut Scalable-FAQ („Kann ich Informationen zu meinen Transaktionen exportieren, z.B. als CSV-Datei?“, Antwort für den Broker, zuletzt aktualisiert am 29.07.2026) gibt es den CSV-Export nur im PRIME+ Broker; im FREE Broker fehlt er. Die Produkt-News vom 12.12.2024 nannte noch PRIME und PRIME+.

1. Im Broker „Transaktionen“ öffnen. Einsehbar sind die Transaktionen laut FAQ auf der Webseite und in der App; für den Export nennt die FAQ keine Plattform.
2. Im Filter beim Datum „Benutzerdefiniertes Datum“ wählen, von der Depoteröffnung bis heute. Auftragstyp und Status nicht einschränken, damit auch nicht ausgeführte Aufträge im Export stehen, falls der Export sie enthält; DepotDoktor überspringt sie, und genau das wird in Abschnitt 3.1 geprüft. Ob der Export nicht ausgeführte Aufträge überhaupt enthält, ist nicht beschrieben.
3. Alle Einträge auswählen und auf „CSV exportieren“ klicken. Die Datei landet im Download-Ordner; verschieben Sie sie von dort in den Prüfordner.

Im FREE Broker lässt sich das Preismodell laut FAQ unter „Home > Broker“ über das Zahnrad ändern; ob sich das lohnt, entscheiden Sie. Die Prüfung kann auch mit Trade Republic allein beginnen. Browser-Erweiterungen Dritter, die einen Export nachbauen, eignen sich nicht: Sie bekommen Zugriff auf Ihr Konto, und ihr Format ist nicht das des Brokers.

Wurde Ihr Depot 2025 von der Baader Bank zur Scalable Capital Bank migriert, gibt es für 2025 zwei Steuerbescheinigungen (FAQ „Wann erhalte ich meine Steuerbescheinigung?“). Prüfen Sie dann, ob der Export auch die Buchungen vor der Migration enthält; beschrieben ist das nicht.

Was DepotDoktor erwartet: Semikolon als Trennzeichen, Dezimalkomma, ISO-Datum, UTF-8 und die 14 Pflichtspalten `date`, `time`, `status`, `reference`, `description`, `assetType`, `type`, `isin`, `shares`, `price`, `amount`, `fee`, `tax`, `currency`. Zeilen mit `status` ungleich `Executed` werden übersprungen.

Weitere Unterlagen von Scalable Capital:

| Unterlage | Wo | Beleg |
|---|---|---|
| Wertpapierabrechnung je Kauf und Verkauf | Reiter „Transaktionen“, als PDF, in der Regel innerhalb von 48 Stunden | FAQ zum Transaktionsexport |
| Vorabpauschale | im Januar vom Broker-Konto abgebucht, Betrag im Dokument in der Mailbox | FAQ „Wann wird die Vorabpauschale abgebucht?“ |
| Jahressteuerbescheinigung | Mailbox (für 2025 bei der Scalable Capital Bank voraussichtlich bis Ende April 2026) | FAQ „Wann erhalte ich meine Steuerbescheinigung?“ |
| Performance-Anzeige | Web: Reiter „Insights“ im Broker; App: über die drei Punkte neben den Zeitintervallen; Zeitraum „Seit Kauf“ | FAQ „Wo finde ich die Gesamtrendite und den Portfoliowert?“ und „Wie wird die prozentuale Rendite in der Kontoübersicht berechnet?“ |
| Bestand je Position (Stück) | Broker-Startseite, Position öffnen | |

### 1.3 Unterlagen für beide Broker

- Kurse jedes Fonds am Anfang und am Ende des Jahres 2025. Am besten die Werte aus dem Dokument der Bank zur Vorabpauschale, wenn es sie nennt; sonst die Rücknahmepreise der Fondsgesellschaft. Wird kein Rücknahmepreis festgesetzt, tritt der Börsen- oder Marktpreis an seine Stelle (§ 18 Abs. 1 Satz 4 InvStG).
- Fondstyp jedes Fonds aus den Fondsunterlagen (Verkaufsprospekt bzw. Anlagebedingungen, Factsheet der Fondsgesellschaft).

## 2. Datei in DepotDoktor laden

Sie haben zwei Möglichkeiten:

- Live-Seite: https://depotdoktor.vercel.app/projects/depotdoktor (Stand des Zweigs `main`).
- Lokal im Repo: `pnpm install`, dann `pnpm dev` und http://localhost:3000/projects/depotdoktor öffnen. Notieren Sie für das Protokoll den Commit (`git rev-parse --short HEAD`) und ob es nicht committete Änderungen gibt.

In beiden Fällen liest der Browser die Datei selbst; DepotDoktor schickt keine Anfrage mit Dateiinhalten ab, auch nicht an den eigenen Server, und die Content-Security-Policy (`connect-src 'self' data:`, `form-action 'self'`) sperrt Anfragen an fremde Server. Ein Playwright-Test prüft das bei jedem Pull Request. Es gibt keine Anmeldung und keine Speicherung, weder auf dem Server noch im Browser.

1. Die Seite öffnen. Wer es selbst sehen will, öffnet vorher die Entwicklerwerkzeuge (F12) mit dem Reiter „Netzwerk“.
2. Die Datei in das Feld „CSV-Export hierher ziehen“ ziehen oder über „Datei auswählen“ wählen.
3. Die Zeile unter „Geladene Datei“ notieren: Dateiname, Broker, „N Buchungen“ und gegebenenfalls „M übersprungen“.
4. „Hinweise beim Einlesen“ aufklappen, falls vorhanden, und die Meldungen ins Protokoll übernehmen. Sie nennen Zeilennummern und Buchungsarten.
5. Die Reiter „Performance“, „Allokation“, „Steuer“ und „Transaktionen“ nach der Prüfliste in Abschnitt 3 durchgehen.
6. Optional „Transaktionen als CSV“ herunterladen: Die Datei enthält alle normalisierten Buchungen mit der Spalte „Zeile im Export“ und lässt sich in Excel filtern. Sie enthält ebenfalls Ihre Daten und gehört in den Prüfordner.
7. Im Reiter „Netzwerk“ prüfen: Nach der Auswahl der Datei gibt es nur GET-Anfragen an denselben Server (`/_next/static/…` oder mit `_rsc`), keine POST-Anfrage und keine Anfrage an einen anderen Server. Einträge von Browser-Erweiterungen gehören nicht zur Seite.
8. Zum Schluss den Tab schließen.

Erscheint „Datei nicht auswertbar“, notieren Sie die Meldung. Bei „Das CSV-Format wurde nicht erkannt“ nennt die Meldung die ersten sechs Spaltennamen. Spaltennamen sind keine persönlichen Daten; die vollständige Kopfzeile ist der wichtigste Befund für Abschnitt 5.

## 3. Prüfliste

Für jeden Punkt gilt: „Ist“ ist der Wert in DepotDoktor, „Soll“ der Wert aus der Originaldatei oder den Unterlagen des Brokers. Tragen Sie beide ins Protokoll (Abschnitt 4) ein. Bei Punkt 3.4 sind Abweichungen der Normalfall; dort zählt, ob sie sich erklären lassen.

### 3.1 Anzahl Buchungen und übersprungene Zeilen

Soll: die Zahl der Datenzeilen in der Originaldatei, ohne Kopfzeile und ohne leere Zeilen. Mit PowerShell 7 im Prüfordner, ohne dass die Datei den Rechner verlässt:

Trade Republic:

```powershell
(Import-Csv .\export.csv).Count
Import-Csv .\export.csv | Group-Object category, type | Sort-Object Count -Descending | Format-Table Count, Name -AutoSize
```

Scalable Capital:

```powershell
(Import-Csv .\export.csv -Delimiter ';').Count
Import-Csv .\export.csv -Delimiter ';' | Group-Object status | Format-Table Count, Name -AutoSize
Import-Csv .\export.csv -Delimiter ';' | Group-Object assetType, type | Sort-Object Count -Descending | Format-Table Count, Name -AutoSize
```

Erwartung:

- „Buchungen“ plus „übersprungen“ ergibt die Zahl der Datenzeilen. Zeilen, die nur aus Trennzeichen bestehen, zählt DepotDoktor wie leere Zeilen nicht mit, `Import-Csv` dagegen schon.
- Trade Republic: DepotDoktor überspringt nur Zeilen mit unlesbarem Datum oder Betrag; erwartet ist 0.
- Scalable Capital: übersprungen sind die Zeilen mit `status` ungleich `Executed`, dazu Zeilen mit unlesbarem Datum oder Betrag.
- Jeder Hinweis „Buchungsart … unbekannt“ ist eine Zeile, die als „Sonstiges“ mitzählt, aber in keine Kennzahl eingeht. Prüfen Sie für jede solche Buchungsart, ob sie Bestand oder Zahlungen betrifft (etwa Einlieferungen, Depotüberträge, Gratisaktien, Kapitalmaßnahmen). In der Beispieldatei erscheint so `DELIVERY/FREE_RECEIPT`.
- Die Liste der Buchungsarten aus `Group-Object` (nur die Werte, keine Beträge) ist ein Ergebnis für `docs/verifikation.md`, Punkte 2 und 4 unter „Zu verifizieren an echten Exporten“.

Bekannte Risiken beim Trade-Republic-Export, Stand der Recherche aus dem Forum von Portfolio Performance:

- Stornobuchungen (dort „Trading/BUY_Cancelled“ genannt). DepotDoktor ordnet Buchungsarten über Schlüsselwörter zu; eine Buchungsart mit `BUY` gilt als Kauf, wenn Stück und Kurs gefüllt sind. Prüfen Sie im Reiter „Transaktionen“, ob ein stornierter Kauf als zweiter Kauf erscheint.
- Korrigierte Dividenden (bei Trade Republic als „Cash dividend“ und „Cash dividend corrected“ angezeigt). Prüfen Sie, ob dieselbe Ausschüttung doppelt als „Dividende“ erscheint. Eine Stornierung mit negativem Betrag erschiene in DepotDoktor positiv, weil der Parser bei Ausschüttungen das Vorzeichen entfernt.
- Steuerbuchungen wie `CASH`/`TAX_OPTIMIZATION`: In der Beispielzeile im Forum steht der Steuerbetrag in `tax`, `amount` ist 0. DepotDoktor liest bei Steuerbuchungen den Betrag aus `amount`. Prüfen Sie, ob solche Buchungen in „Abgeführte Steuern“ mit 0,00 € eingehen, und welches Vorzeichen eine Erstattung hat (`docs/verifikation.md`, Punkt 6).

### 3.2 Stichprobe je Buchungsart

Wählen Sie für jede Buchungsart aus 3.1 eine Zeile und vergleichen Sie die Originalzeile mit der Zeile im Reiter „Transaktionen“ (Datum, Art, Betrag, Name, ISIN, Stück, Kurs, Gebühr, Steuer) und, wo es eine gibt, mit der Abrechnung des Brokers.

Erwartung: Werte gleich, Käufe mit negativem, Verkäufe und Ausschüttungen mit positivem Betrag. Notieren Sie dabei vier offene Fragen, drei davon aus `docs/verifikation.md`, „Zu verifizieren an echten Exporten“:

- Punkt 3: Ist `amount` bei Käufen im Original negativ?
- Enthält `amount` beim Kauf die Gebühr (Stück × Kurs + Gebühr)? So sind die Testdateien aufgebaut, und so setzt DepotDoktor die Anschaffungskosten an.
- Punkt 6: Ist `amount` bei Verkäufen und Ausschüttungen der Betrag nach Gebühr und Steuerabzug (netto)? Vergleichen Sie mit der Abrechnung. DepotDoktor nimmt netto an; wäre er brutto, zählte DepotDoktor die Steuer doppelt.
- Punkt 1: Hat jede Kauf- und Verkaufszeile eine ISIN? Fehlt sie, meldet DepotDoktor „Kauf ohne ISIN“ und führt die Position über den Namen; die Region in der Allokation fehlt dann.

### 3.3 Zeitraum

Ist: Der Hinweis unter der TTWROR-Kachel endet mit „TT.MM.JJJJ bis TT.MM.JJJJ“, der Hinweis unter der IRR-Kachel mit „Stand TT.MM.JJJJ“. Der Zeitraum reicht vom ersten Kauf bis zur letzten Depotbuchung (Kauf, Verkauf, Ausschüttung sowie Gebühr oder Steuer mit ISIN); Einzahlungen, Zinsen und Kartenzahlungen zählen nicht.

Soll: Datum des ersten Kaufs (erste Kaufabrechnung) und Datum der letzten Depotbuchung im Export.

Erwartung: beide Daten gleich. Warnzeichen für einen unvollständigen Export oder einen Depotübertrag sind der Hinweis „Verkauf von … Anteilen …, aber nur … im Bestand. Der Export ist vermutlich unvollständig“ im Reiter „Performance“ und „Stück ohne bekannten Einstand“ bei einem Verkauf im Reiter „Steuer“.

### 3.4 TTWROR und IRR

Ist: „TTWROR (p. a.)“ oder „TTWROR (kumuliert)“ und „IRR (geldgewichtet, p. a.)“ im Reiter „Performance“.

Soll: bei Trade Republic die relative Wertentwicklung im längsten verfügbaren Zeitraum, bei Scalable Capital die Gesamtrendite in Prozent mit „Seit Kauf“.

Erwartung: keine Übereinstimmung auf die Nachkommastelle, sondern gleiches Vorzeichen und eine Größenordnung, die sich mit der folgenden Tabelle erklären lässt. Die Broker berechnen andere Kennzahlen:

| | DepotDoktor | Trade Republic | Scalable Capital |
|---|---|---|---|
| Kennzahl | TTWROR (zeitgewichtet) und IRR (geldgewichtet) | relative Wertentwicklung: absoluter Ertrag im Zeitraum geteilt durch die durchschnittliche Portfoliogröße im Zeitraum | Gesamtrendite der aktuell gehaltenen Wertpapiere, „Seit Kauf“ |
| Kurse | nur Preise aus dem Export, an den Tagen der Depotbuchungen | Geldkurse, laufend aktualisiert | Echtzeitbewertung |
| Endzeitpunkt | letzte Depotbuchung | jetzt | jetzt |
| Verkaufte Positionen | enthalten | realisierte Gewinne und Verluste enthalten | nicht enthalten (unrealisierte Rendite) |
| Ausschüttungen, Gebühren, Steuern | Ausschüttungen netto als Rückfluss; Gebühren und Steuern mindern das Ergebnis | Dividenden, Kupons, Gebühren und Steuern enthalten | Ausschüttungen vor Steuern, Steuererstattungen und Ordergebühren enthalten |
| Zinsen, Ein- und Auszahlungen | nicht enthalten | nicht enthalten | nicht beschrieben |
| Einlieferungen, Gratisaktien | nicht erfasst („Sonstiges“) | ohne Einfluss auf die Performance | nicht beschrieben |
| Zeitbezug | TTWROR unter einem Jahr kumuliert, ab einem Jahr p. a.; IRR immer p. a. | für den gewählten Zeitraum, nicht annualisiert | nicht beschrieben |

Die relative Wertentwicklung von Trade Republic ist nach dieser Beschreibung eine geldgewichtete Größe für den Zeitraum. Am ehesten vergleichbar ist deshalb der IRR, auf den Zeitraum umgerechnet: (1 + IRR)^(Tage / 365) − 1. „Tage“ ist hier und unten die Zahl der Tage vom ersten bis zum letzten Datum des Zeitraums aus 3.3 (Differenz der beiden Daten). Wie Trade Republic die durchschnittliche Portfoliogröße bildet, ist nicht beschrieben. Die Gesamtrendite von Scalable Capital bezieht sich nur auf den heutigen Bestand; am ehesten vergleichbar ist (Summe „Wert“ − Summe „Einstand“) ÷ Summe „Einstand“ der offenen Positionen im Reiter „Allokation“, bewertet allerdings zum letzten Kurs im Export.

Was sich genau prüfen lässt, ist die Rechnung von DepotDoktor selbst, mit der Tabelle „Wertverlauf an den Depotbuchungstagen“ im Reiter „Performance“:

- IRR nachrechnen: In Excel je Zeile das Datum und als Wert den negativen „Externen Zahlungsstrom“ eintragen. In der letzten Zeile kommt der „Depotwert“ hinzu (Wert = Depotwert − Externer Zahlungsstrom). `=XINTZINSFUSS(Werte; Daten)` muss den IRR von DepotDoktor ergeben; beide rechnen mit Tagen ÷ 365. Abweichungen nur durch die auf Cent gerundete Anzeige.
- TTWROR nachrechnen: Das Produkt aller (1 + Periodenrendite) minus 1 ergibt die kumulierte TTWROR aus dem Kachelhinweis; p. a. ist (1 + kumuliert)^(365 / Tage) − 1. Abweichungen nur durch die gerundete Anzeige der Periodenrenditen.

Wer Portfolio Performance nutzt, kann denselben Export dort einlesen (Trade-Republic-CSV-Import seit Version 0.83.1) und TTWROR und IRR für denselben Zeitraum vergleichen. Portfolio Performance bewertet mit Tageskursen; kleine Unterschiede sind deshalb zu erwarten.

### 3.5 Realisierte Gewinne (FIFO)

Ist: Reiter „Steuer“, Steuerjahr 2025 oder 2026. Je Position stehen unter „Verkäufe … (FIFO)“ Erlös, Anschaffungskosten und Gewinn je Verkauf; die Kachel „Realisierte Gewinne … (FIFO)“ summiert vor Teilfreistellung und Steuer. Erlös ist der Betrag des Verkaufs laut Export plus abgeführter Steuer (die Gebühr ist im Betrag bereits abgezogen), Anschaffungskosten sind die Beträge der Käufe laut Export (in den Testdateien einschließlich Kaufgebühr), verbraucht in der Reihenfolge der Käufe.

Soll: die Abrechnung jedes Verkaufs. Banken wenden FIFO an, weil das Gesetz es für sammelverwahrte Wertpapiere vorschreibt (§ 20 Abs. 4 Satz 7 EStG). Zeigt die Abrechnung bei Fonds nur den Betrag nach Teilfreistellung, vergleichen Sie mit Gewinn × (1 − Teilfreistellungssatz).

Erwartung: je Verkauf gleich auf den Cent, wenn der Export vollständig ist und kein Depotübertrag, keine Kapitalmaßnahme und keine Fremdwährung im Spiel ist. Werden Fondsanteile aus Vorjahren verkauft, mindern die bereits angesetzten Vorabpauschalen den Gewinn (§ 19 Abs. 1 Satz 3 und 4 InvStG); laut Scalable-FAQ wird die auf die Vorabpauschale bereits gezahlte Steuer beim späteren Verkauf berücksichtigt. Tragen Sie den Betrag aus der Abrechnung in das Feld „Für diese Anteile in Vorjahren angesetzte Vorabpauschalen“ ein und vergleichen Sie erneut. Notieren Sie, wie die Abrechnung den Betrag ausweist; das ist eine offene Frage in `docs/verifikation.md`, „Zu verifizieren“, Punkt 4.

Die Jahressteuerbescheinigung eignet sich nur zur groben Probe: Die Zeile „Höhe der Kapitalerträge“ fasst Veräußerungsgewinne, Ausschüttungen und Vorabpauschalen zusammen, bei Fonds nach Teilfreistellung und nach Verlustverrechnung, vor dem Sparer-Pauschbetrag (Erläuterung einer Bank zum amtlichen Muster, siehe Quellen).

Zulässige Abweichungen: „Stück ohne bekannten Einstand“ (Export unvollständig oder Depotübertrag mit Anschaffungsdaten der Vorbank), Aktiensplits und andere Kapitalmaßnahmen (DepotDoktor bildet sie nicht ab), Geschäfte in Fremdwährung (§ 20 Abs. 4 Satz 1 EStG verlangt die Umrechnung zu den Zeitpunkten von Anschaffung und Veräußerung), nicht eingetragene Vorabpauschalen aus Vorjahren.

### 3.6 Vorabpauschale

Zuordnung der Jahre: Die Vorabpauschale für ein Kalenderjahr gilt am ersten Werktag des Folgejahres als zugeflossen (§ 18 Abs. 3 InvStG). Steuerjahr 2025 in DepotDoktor entspricht also der Buchung der Bank im Januar 2026 und erscheint in der Jahressteuerbescheinigung für 2026, die erst 2027 kommt. Die Jahressteuerbescheinigung für 2025 enthält die Vorabpauschale für 2024; die kann DepotDoktor nicht schätzen, weil nur die Basiszinsen 2025 und 2026 hinterlegt sind. Steuerjahr 2026 ist bis zum Jahresende eine Vorschau und lässt sich erst mit der Buchung im Januar 2027 prüfen. Heute prüfbar ist damit nur das Steuerjahr 2025 gegen das Dokument der Bank zur Vorabpauschale vom Januar 2026.

1. Im Reiter „Steuer“ das Steuerjahr 2025 wählen (Basiszins 2,53 %).
2. Für jeden Fonds den Fondstyp prüfen (3.7) und die Kurse für den 01.01.2025 und den 31.12.2025 eintragen (Abschnitt 1.3). Vorbelegte Kurse sind mit „vorläufig (Kurs aus dem Export)“ markiert; für die Prüfung ersetzen.
3. Je Position „Vorabpauschale“ und „Steuerpflichtig“ in der Zeile „Summe“ mit dem Dokument der Bank vergleichen.

Erwartung: Vorabpauschale und steuerpflichtiger Betrag gleich bis auf Rundungsdifferenzen im Cent-Bereich; nach BMF-Schreiben vom 21.05.2019, Rz. 18.4, wird erst nach der Multiplikation mit der Stückzahl gerundet. Die Steuer selbst vergleichen Sie besser nicht: DepotDoktor rechnet 26,375 % ohne Freistellungsauftrag, Verlusttöpfe und Kirchensteuer; die Bank verrechnet Freistellungsauftrag und Verlustverrechnungstopf (Scalable-FAQ zur Vorabpauschale).

Zulässige Abweichungen: andere Kurse als die der Bank, Kauf im Jahr 2025 (Zwölftelung nach § 18 Abs. 2 InvStG; die Spalte „Monate entfallen“ zeigt, wie viele Zwölftel DepotDoktor abzieht), Ausschüttungen vor einem Nachkauf (DepotDoktor zählt sie je Anteil nur für die Anteile, die am Zahltag im Bestand waren; die Frage ist offen, `docs/verifikation.md`, „Zu verifizieren“, Punkt 6), Depotübertrag im Jahr (laut Scalable-FAQ rechnet die Bank, die die Anteile am 1. Januar hält, die ganze Vorabpauschale ab).

### 3.7 Teilfreistellung je Fondstyp

Ist: das Auswahlfeld „Fondstyp“ je Position im Reiter „Steuer“. Bei Trade Republic ist er aus der Assetklasse des Exports vorbelegt: Aktie, Anleihe und Krypto als „Kein Fonds (Aktie, Anleihe)“, jede andere erkannte Assetklasse (ETF, Fonds, auch Derivate) als Aktienfonds; ohne erkannte Assetklasse steht „Bitte wählen“. Bei Scalable Capital steht immer „Bitte wählen“, weil der Export keine Assetklasse nennt.

Soll: die Einstufung in den Fondsunterlagen und, sofern ausgewiesen, der Teilfreistellungssatz im Dokument der Bank zur Vorabpauschale oder in der Verkaufsabrechnung.

| Fondstyp | Voraussetzung | Teilfreistellung |
|---|---|---|
| Aktienfonds | fortlaufend mehr als 50 % des Aktivvermögens in Kapitalbeteiligungen (§ 2 Abs. 6 InvStG) | 30 % (§ 20 Abs. 1 InvStG) |
| Mischfonds | fortlaufend mindestens 25 % in Kapitalbeteiligungen (§ 2 Abs. 7 InvStG) | 15 % (§ 20 Abs. 2 InvStG) |
| Immobilienfonds | fortlaufend mehr als 50 % in Immobilien und Immobilien-Gesellschaften (§ 2 Abs. 9 InvStG) | 60 % (§ 20 Abs. 3 InvStG) |
| Auslands-Immobilienfonds | fortlaufend mehr als 50 % in ausländischen Immobilien und Auslands-Immobiliengesellschaften (§ 2 Abs. 9 Satz 2 InvStG) | 80 % (§ 20 Abs. 3 Satz 2 InvStG) |
| Sonstiger Fonds, etwa Renten-ETF | keine der Quoten | keine |
| Einzelaktie, Anleihe | kein Investmentfonds | „Kein Fonds (Aktie, Anleihe)“, keine Vorabpauschale |

Erwartung: Fondstyp wie in den Fondsunterlagen; „Steuerpflichtig“ = „Vorabpauschale“ × (1 − Teilfreistellungssatz). Achtung bei Trade Republic: Ein Renten- oder Geldmarkt-ETF ist als Aktienfonds vorbelegt und muss von Hand umgestellt werden. Ein Derivat ist ebenfalls als Aktienfonds vorbelegt, obwohl es kein Investmentfonds ist; richtig ist „Kein Fonds (Aktie, Anleihe)“.

### 3.8 Allokation

Ist: Reiter „Allokation“, Tabelle „Offene Positionen“ (Stück, Letzter Kurs, Wert, Einstand) und die Aufteilung nach Assetklasse und nach Region.

Soll: Bestand je Position beim Broker.

Erwartung:

- Stück je Position gleich, auch bei Bruchstücken aus Sparplänen. Das ist die wichtigste Probe dieses Abschnitts.
- „Wert“ weicht ab, weil DepotDoktor mit dem letzten Kurs im Export bewertet und der Broker mit dem aktuellen.
- „Einstand“ kann abweichen: DepotDoktor summiert die Kaufbeträge einschließlich Gebühren und mindert sie bei Teilverkäufen anteilig. Wie der Broker den Einstand bildet, ist nicht recherchiert.
- Die Anteile nach Assetklasse ergeben zusammen 100 %. Bei Scalable Capital stehen alle Wertpapiere unter „Nicht zugeordnet“, weil der Export keine Assetklasse nennt.
- „Region“ ist der Ländercode der ISIN, also das Fondsdomizil oder der Sitz des Emittenten, nicht die Anlageregion; viele ETFs erscheinen deshalb als „Irland (Fondsdomizil)“ oder „Luxemburg (Fondsdomizil)“. Eine Abweichung von der Länderaufteilung im Factsheet ist erwartet.

## 4. Prüfprotokoll

Kopieren Sie diese Vorlage in den Prüfordner außerhalb des Repos und füllen Sie sie dort aus. Je Broker ein Protokoll. Für Verkäufe und Positionen bei Bedarf Zeilen ergänzen.

```text
Datum der Prüfung:
Broker:
Export erstellt am, Zeitraum von / bis:
App-Version des Brokers:
DepotDoktor: Live-Seite am … oder lokal, Commit …, nicht committete Änderungen ja/nein
Browser und Version:
```

| Nr. | Prüfpunkt | Soll (Broker, Beleg) | Ist (DepotDoktor) | Abweichung | Erklärung |
|---|---|---|---|---|---|
| 1 | Datenzeilen im Export = Buchungen + übersprungen (3.1) | | | | |
| 2 | Übersprungene Zeilen (3.1) | | | | |
| 3 | Hinweise beim Einlesen: Anzahl, unbekannte Buchungsarten (3.1) | | | | |
| 4 | Stornos, korrigierte Dividenden, Steuerbuchungen (3.1) | | | | |
| 5 | Stichprobe je Buchungsart: Vorzeichen, netto oder brutto, ISIN (3.2) | | | | |
| 6 | Zeitraum: erster Kauf (3.3) | | | | |
| 7 | Zeitraum: letzte Depotbuchung (3.3) | | | | |
| 8 | TTWROR gegen Performance-Anzeige (3.4) | | | | |
| 9 | IRR gegen Performance-Anzeige, auf den Zeitraum umgerechnet (3.4) | | | | |
| 10 | IRR mit XINTZINSFUSS nachgerechnet (3.4) | | | | |
| 11 | TTWROR aus Periodenrenditen nachgerechnet (3.4) | | | | |
| 12 | Realisierter Gewinn, Verkauf 1 (3.5) | | | | |
| 13 | Realisierte Gewinne Steuerjahr gesamt (3.5) | | | | |
| 14 | Vorabpauschale 2025, Position 1 (3.6) | | | | |
| 15 | Steuerpflichtig nach Teilfreistellung 2025, Position 1 (3.6) | | | | |
| 16 | Fondstyp und Teilfreistellung, Position 1 (3.7) | | | | |
| 17 | Stück je offene Position (3.8) | | | | |
| 18 | Allokation nach Assetklasse und Region plausibel (3.8) | | | | |
| 19 | Netzwerk: keine Anfrage mit Dateiinhalt (Abschnitt 2) | | | | |

In der Spalte „Erklärung“ steht für jede Abweichung entweder die Ursache aus der Prüfliste („erklärt: …“) oder „ungeklärt“. Jede ungeklärte Abweichung geht nach Abschnitt 5 weiter.

Nach der Prüfung übertragen Sie das Ergebnis anonymisiert in `docs/verifikation.md`: welche Punkte unter „Zu verifizieren an echten Exporten“ erledigt sind, mit Datum und Befund, ohne Beträge Ihres Depots. Sind beide Broker ohne ungeklärte Abweichung geprüft, ändern Sie den Status in der Tabelle „Unterstützte Exporte“ und unter „Status“ im README sowie den Stand in `CLAUDE.md`.

## 5. Bei Abweichungen

### 5.1 Einordnen

- Erklärbar nach der Prüfliste (Methode, Kurse, Rundung, Endzeitpunkt): nur im Protokoll vermerken. Zeigt die Erklärung ein Verhalten, das noch nirgends beschrieben ist, ergänzen Sie `docs/verifikation.md`.
- „Format nicht erkannt“, falsche Buchungsart, falsches Vorzeichen, doppelt gezählte Buchung, fehlende ISIN: Fehler im Parser. Weiter mit 5.2.
- Abweichung bei FIFO oder Vorabpauschale ohne Erklärung: Weiter mit 5.2. Eine Änderung der Rechenregel braucht einen Beleg (Gesetz, BMF-Schreiben; Regel 4 in `CLAUDE.md`); ohne Beleg wird der Punkt in `docs/verifikation.md` als „zu verifizieren“ geführt, nicht geändert.

### 5.2 Anonymisiertes Minimalbeispiel als neue Fixture

1. Die betroffenen Zeilen eingrenzen: Die Spalte „Zeile im Export“ in „Transaktionen als CSV“ und die Zeilennummern in den Hinweisen nennen die Zeilen der Originaldatei. Gesucht ist die kleinste Zahl von Zeilen, mit der die Abweichung noch auftritt, oft nur ein Kauf und ein Verkauf oder eine einzige Buchung.
2. Eine neue Datei im Texteditor schreiben, nicht durch Kopieren und Bearbeiten des Originals in Excel. Dabei gilt:

| Bestandteil | Vorgehen |
|---|---|
| Kopfzeile | unverändert übernehmen; vorher prüfen, dass sie nur Spaltennamen enthält |
| Trennzeichen, Anführungszeichen, Dezimal- und Datumsformat, Spaltenzahl, Kodierung | unverändert, denn das ist das Format, das geprüft wird |
| Buchungsarten (`category`, `type`, `status`, `assetType`, `asset_class`, `account_type`) | Werte unverändert übernehmen; sie sind Formatmerkmale, keine persönlichen Daten |
| ISIN | Test-ISIN nach dem Muster der vorhandenen Fixtures (`IE00TEST0001`, `DE000TEST002`); den Ländercode nur behalten, wenn er für die Abweichung zählt |
| Name, Symbol, Beschreibung | „Testfonds Welt UCITS ETF“, „Musterwerk AG“, `TFW`, `MWA` |
| Datum und Uhrzeit | frei gewählt; Monats- und Jahresgrenzen nur nachbilden, wenn sie zählen (Zwölftelung, Jahreswechsel) |
| Stück, Kurs, Betrag, Gebühr, Steuer | runde, frei gewählte Zahlen, die die Abweichung weiter zeigen und sich von Hand nachrechnen lassen; Schreibweise (Nachkommastellen, Vorzeichen) wie im Original |
| Referenzen, IDs, UUIDs | ersetzen, etwa `SCALTEST00001` oder `00000000-0000-4000-8000-000000000001` |
| Karten- und Personenfelder (`card_number`, `card_id`, `holder_name`, `seller_name`, `seller_city`, `mcc_code`) | leeren oder neutral füllen wie in der vorhandenen Fixture |

3. Die neue Datei lokal in DepotDoktor laden und prüfen, dass die Abweichung auftritt.
4. Als neue Datei ablegen: `packages/csv/fixtures/<broker>-<thema>.csv`, etwa `traderepublic-storno-kauf.csv`. Die vorhandenen Fixtures nicht ändern; bestehende Tests hängen an ihnen. `.gitattributes` speichert Textdateien mit LF; hängt die Abweichung an Zeilenende, BOM oder Kodierung, erzeugt der Test die Bytes selbst, wie die UTF-16-Tests in `packages/csv/src/__tests__/filekind.test.ts`.
5. Zuerst den Test schreiben (Regel 3 in `CLAUDE.md`): für den Parser in `packages/csv/src/__tests__/parse.test.ts`, für Kennzahlen und Steuer in `apps/web/lib/depotdoktor/__tests__/`. Der Erwartungswert ist von Hand gerechnet, die Rechnung steht im Testnamen oder als Ausdruck im Test. Der Test muss vor der Korrektur scheitern.
6. Korrigieren, dann in `docs/verifikation.md` einen Abschnitt mit Datum anlegen: Befund ohne echte Werte, Ursache, alt und neu, Rechtsgrundlage, Tests. Teststände in README und `CLAUDE.md` nachziehen.
7. Commit und Push nur auf ausdrücklichen Wunsch, auf einem Branch `fix/<thema>` (`CLAUDE.md`, „Git und Deployment“).

### 5.3 Issue-Vorlage

Das Repo ist öffentlich, also auch jedes Issue. Das Issue verweist auf die anonymisierte Fixture und enthält keine echten Werte.

```markdown
## Abweichung bei der Prüfung an echtem Export

**Broker:** Trade Republic / Scalable Capital
**Export:** Weg (z. B. Profil → Kontoauszüge → Transaktionsexport), Datum der Erstellung, App-Version
**DepotDoktor:** Live-Seite am TT.MM.JJJJ / lokal, Commit …
**Prüfpunkt:** Nr. … aus docs/pruefung-echte-exporte.md (z. B. 3.1 Buchungen, 3.5 FIFO)

### Befund
Was DepotDoktor zeigt und was der Beleg des Brokers zeigt, in Worten oder an der Fixture.
Keine Beträge, Daten, ISINs oder Namen aus dem echten Export.

### Minimalbeispiel
Fixture: `packages/csv/fixtures/<broker>-<thema>.csv` (synthetisch, … Zeilen)
Schritte: Datei laden → Reiter … → Wert …

### Erwartet
Wert mit Handrechnung an der Fixture, z. B. Erlös 1.200,00 − Anschaffungskosten 1.000,00 = 200,00 €
Beleg: Abrechnungsart des Brokers (ohne Inhalt), Gesetz oder BMF-Schreiben mit Randziffer

### Tatsächlich
Wert in DepotDoktor an der Fixture
Hinweise beim Einlesen (Wortlaut der Meldung, nur Zeilennummern der Fixture)

### Vermutete Ursache
z. B. Buchungsart `…` wird als Kauf erkannt

### Prüfung auf echte Daten
- [ ] Keine echte Zeile, ISIN, Betrag, Datum, ID, Kontonummer oder Name im Issue
- [ ] Keine Screenshots mit echten Werten
- [ ] Fixture nach den Regeln in Abschnitt 5.2 erstellt
```

## Quellen

Alle abgerufen am 20.10.2026.

Trade Republic:

- Portfolio-Performance-Forum, „Import Trade Republic CSV (Transaktionsexport)“, Beiträge vom 15.04.2026 bis 14.10.2026 (Exportweg, Einführung Mitte April 2026, App-Version, Beispielzeile mit 23 Feldern, Stornos, korrigierte Dividenden, Steuerkorrekturen): https://forum.portfolio-performance.info/t/import-trade-republic-csv-transaktionsexport/39126
- privatsparer.de, „Trade Republic CSV in Portfolio Performance importieren (2026)“, 06.05.2026 (Profil → Kontoauszüge → Transaktionsexport, Zeitraum): https://www.privatsparer.de/trade-republic-portfolio-performance/
- Blockpit-Hilfe, „Wie importiere ich Daten mittels Trade Republic CSV-Datei?“, Stand 16.09.2026 (Nutzereinstellungen → Kontoauszüge → Transaktionsexport → Teilen → Zeitraum → Erstellen): https://intercom.help/blockpit/de/articles/15452549-wie-importiere-ich-daten-mittels-trade-republic-csv-datei
- Trade Republic Hilfe, „Wie wird die Performance-Wertentwicklung meines Portfolios berechnet?“: https://support.traderepublic.com/de-de/1639
- Trade Republic Hilfe, „Jahressteuerbescheinigung“: https://support.traderepublic.com/de-de/1078-Was-ist-die-Jahressteuerbescheinigung
- Trade Republic Hilfe, „Wo kann ich meinen Depotauszug finden?“ (Abrechnungen unter Cash → Transaktionen → Dokumente): https://support.traderepublic.com/de-lu/845-Wo-kann-ich-meinen-Depotauszug-finden

Scalable Capital:

- Scalable-FAQ, „Kann ich Informationen zu meinen Transaktionen exportieren, z.B. als CSV-Datei?“, Antwort „Broker“, Inhalt aktualisiert am 29.07.2026 (nur PRIME+ Broker, „CSV exportieren“, Filter, Abrechnungen): https://help.scalable.capital/kontoverwaltung-f3197dc7/kann-ich-informationen-zu-meinen-transaktionen-exportier-4c3e0a38
- Scalable Capital, Produkt-News „Transaktionen exportieren“, 12.12.2024: https://de.scalable.capital/produkt-news/transaktionen-exportieren
- Scalable-FAQ, „Wann wird die Vorabpauschale abgebucht?“, Antwort „Broker“: https://help.scalable.capital/steuern-de12f868/wann-wird-die-vorabpauschale-abgebucht-c6bf9231
- Scalable-FAQ, „Wann erhalte ich meine Steuerbescheinigung?“: https://help.scalable.capital/steuern-de12f868/steuerliche-dokumente-a0068d2c/wann-erhalte-ich-meine-steuerbescheinigung-fea993d4
- Scalable-FAQ, „Wo finde ich die Gesamtrendite und den Portfoliowert?“: https://help.scalable.capital/handeln-1541d52f/wo-finde-ich-die-gesamtrendite-und-den-portfoliowert-cb3feb7b
- Scalable-FAQ, „Wie wird die prozentuale Rendite in der Kontoübersicht berechnet?“, Antwort „Broker“: https://help.scalable.capital/kontoverwaltung-f3197dc7/wie-wird-die-prozentuale-rendite-in-der-konto%C3%BCbersicht-b-2645ce98

Gesetze und Erläuterungen:

- § 2 Abs. 6, 7, 9 und 11, § 18 Abs. 1 bis 3, § 19 Abs. 1, § 20 Abs. 1 bis 3 InvStG: https://www.gesetze-im-internet.de/invstg_2018/
- § 20 Abs. 4 Satz 1 und 7 EStG: https://www.gesetze-im-internet.de/estg/__20.html
- BMF-Schreiben vom 21.05.2019 zu Anwendungsfragen des InvStG, Rz. 18.4 (Rundung), wie in [verifikation.md](verifikation.md)
- Commerzbank, „Hinweise und Erläuterungen zur Jahressteuerbescheinigung 2025“ (Zeile „Höhe der Kapitalerträge“: Ausschüttungen, Vorabpauschalen und Veräußerungsgewinne aus Fonds nach Teilfreistellung; die Bank ist an das amtliche Muster gebunden): https://www.commerzbank.de/portal/media/a-30-sonstige-medien/pdf/themen/steuern/jahresendreporting/53964809_JStB_2025.pdf
