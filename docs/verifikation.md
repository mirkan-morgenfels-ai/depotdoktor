# Verifikation und offene Punkte (K1 DepotDoktor)

Stand: 22.10.2026 (Fondstyp-Vorbelegung bei Derivaten und Cash sowie Hinweis „nur PRIME+“ im Upload-Feld, ohne Änderung an Rechenwegen, siehe den letzten Abschnitt; davor die Anleitung für die Prüfung an echten Exporten in [pruefung-echte-exporte.md](pruefung-echte-exporte.md), ohne Änderung an Code und Rechenwegen, Abschnitt „Anleitung für die Prüfung an echten Exporten 20.10.2026“; davor die Framework-Migration auf Next.js 16, ESLint 10 und Vitest 5 ohne fachliche Änderung, Abschnitt „Framework-Migration 17.10.2026“; fachlich zuletzt die restlichen Entscheidungen und der Abgleich mit den Rechenbeispielen des BMF im Abschnitt „Restliche Entscheidungen 08.10.2026“; davor CSV-Export für deutsches Excel; zur Steuerlogik die Abschnitte „Nachkontrolle 07.10.2026“ und „Nachbesserung 07.10.2026“). Quellen zur Steuerlogik gehören hierher, nicht in den Code.

## Prüfstand der Steuerlogik

| Fall | Erwartung (ursprüngliche Spezifikation) | Test | Gegen offizielle Quelle geprüft |
|---|---|---|---|
| A Normalfall 2026, 10.000 €, Zuwachs 1.500 € | Basisertrag 224,00 €, steuerpflichtig 156,80 €, Steuer 41,36 € | `vorabpauschale.test.ts` | Rechenweg wie BMF Rz. 18.2 und 18.3, Basiszins wie BMF-Schreiben vom 13.01.2026 (08.10.2026); externer Rechner offen |
| B Zuwachs 150 € unter Basisertrag | Vorabpauschale 150,00 €, Steuer 27,69 € | `vorabpauschale.test.ts` | Deckel wie BMF Rz. 18.3 (08.10.2026); externer Rechner offen |
| C Verlustjahr | Vorabpauschale 0 € | `vorabpauschale.test.ts` | Rechenweg wie BMF Rz. 18.2; externer Rechner offen |
| D Kauf am 1. Juli, Bezugswert 10.000 € | Basisertrag 112,00 €, Steuer 20,68 € | `vorabpauschale.test.ts` | Bezugswert und Kürzung wie BMF Rz. 18.11 (08.10.2026), siehe unten; externer Rechner offen |
| E FIFO 10 @ 80, 10 @ 100, Verkauf 12 @ 120 | Veräußerungsgewinn 440 € | `fifo.test.ts` | offen |
| BMF Rz. 18.3 (amtliches Beispiel) | Vorabpauschale 0,50 € je Anteil | `vorabpauschale.test.ts` | ja, 08.10.2026 |
| BMF Rz. 18.11 (amtliches Beispiel, Erwerb 10.7.) | Vorabpauschale 0,25 € je Anteil | `vorabpauschale.test.ts` | ja, 08.10.2026 |
| BMF Rz. 18.4 (Rechnungszins, Rundung) | 0,87 % × 70 % = 0,609 %, Rundung erst nach der Multiplikation mit der Stückzahl | `vorabpauschale.test.ts` | ja (Regel), 08.10.2026; Kurs 100 € und 1.000 Anteile sind eigene Zahlen |

Zu Fall D: Seit 07.10.2026 kürzt der Code nach § 18 Abs. 2 InvStG die Vorabpauschale statt des Basisertrags. Der Test weist deshalb Basisertrag 224,00 € und Vorabpauschale 224,00 × 6/12 = 112,00 € aus; Vorabpauschale und Steuer (20,68 €) sind dieselben wie in der Spezifikation, weil der Wertzuwachs-Deckel nicht greift. Seit 08.10.2026 ist der bisher offene `todo` „Bezugsgröße und Kürzungsregel gegen BMF-/Finanztip-Beispiel prüfen“ ein echter Test gegen BMF Rz. 18.11 (Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 4).

Rechtsgrundlagen: § 18 InvStG (Vorabpauschale), § 2 Abs. 11 InvStG (Ausschüttungen einschließlich Steuerabzug), § 20 InvStG (Teilfreistellung), BMF-Schreiben vom 13.01.2026 (Basiszins 2026: 3,20 %, Az. IV C 1 - S 1980/00230/012/001), BMF-Schreiben vom 10.01.2025 (Basiszins 2025: 2,53 %, Az. IV C 1 - S 1980/00230/009/002, BStBl I 2025, 273). Die Konstanten in `tax/constants.ts` wurden am 06.10.2026 gegen diese Schreiben und den Gesetzestext geprüft und stimmen (Abschnitt „Lückenschluss 06.10.2026“).

## Zu verifizieren

1. ~~**Zwölftelung bei unterjährigem Kauf (Fall D).**~~ Geprüft am 08.10.2026 gegen BMF-Schreiben vom 21.05.2019, Rz. 18.11 („Die für das gesamte Jahr 01 berechnete Vorabpauschale … mindert sich um 6/12“): Das BMF kürzt die für das ganze Jahr berechnete Vorabpauschale, also nach Deckel und Abzug der Ausschüttungen, wie der Standard `reductionTarget: "vorabpauschale"`. Das amtliche Zahlenbeispiel (0,50 € → 0,25 €) ergibt mit beiden Varianten 0,25 €, unterscheidet sie also nicht in der Zahl; maßgeblich für den Standard bleiben Gesetzeswortlaut und die Beschreibung in Rz. 18.11. Die Variante der ursprünglichen Spezifikation (Kürzung des Basisertrags) bleibt per Parameter wählbar und getestet (Kauf im Juli, Basisertrag 224 €, Zuwachs 150 €: Gesetz 75,00 €, Spezifikation 112,00 €). Der frühere `todo`-Test ist jetzt ein echter Test. Weiter offen: Abgleich mit dem Vorabpauschale-Rechner der Stiftung Warentest und einem Finanztip-Beispiel.
2. ~~**Bezugsgröße bei unterjährigem Kauf.**~~ Geprüft am 08.10.2026: Implementiert ist Stück × Rücknahmepreis am Jahresanfang (auch für später gekaufte Anteile), Wertzuwachs = Stück × (Kurs 31.12. − Kurs 01.01.). Das entspricht § 18 Abs. 1 Satz 2 und 3 InvStG („Rücknahmepreis … zu Beginn des Kalenderjahres“, „ersten und dem letzten im Kalenderjahr festgesetzten Rücknahmepreis“) und BMF Rz. 18.11: Für den am 10.7. erworbenen Anteil rechnet das BMF mit der Vorabpauschale des ganzen Jahres aus Rz. 18.3, also mit dem Rücknahmepreis 100 € am Jahresanfang, nicht mit dem Kaufpreis. Einen abweichenden Bezugswert nennt das BMF nur für die unterjährige Neuauflage eines Fonds (Rz. 18.7: erster festgesetzter Rücknahmepreis). Die Alternative „Anschaffungspreis als Bezugswert“ ist damit verworfen.
3. **Basiszins vor 2025.** Nur 2025 und 2026 sind hinterlegt. Weitere Jahre erst nach Nachweis über das jeweilige BMF-Schreiben ergänzen (`apps/web/lib/depotdoktor/tax/constants.ts`). Offen.
4. ~~**Anrechnung versteuerter Vorabpauschalen beim Verkauf.** Eingabemöglichkeit fehlt.~~ Erledigt am 06.10.2026: Eingabe je Verkauf im Steuerreiter, Einzelheiten im Abschnitt „Lückenschluss 06.10.2026“. Weiter zu verifizieren (offen): ob die Minderung nach § 19 Abs. 1 Satz 3 InvStG einen Veräußerungsverlust ergeben darf (implementiert: rein rechnerische Minderung, der Gewinn kann negativ werden) und wie Banken den Betrag in der Verkaufsabrechnung ausweisen. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG (Randziffern zu § 19), eine echte Verkaufsabrechnung mit angesetzten Vorabpauschalen.
5. **Sparerpauschbetrag, Kirchensteuer, Verlusttöpfe** sind nicht berücksichtigt; die Oberfläche sagt das.
6. **Ausschüttungen vor dem Kauf weiterer Anteile.** Implementiert (seit der Nachbesserung 07.10.2026): Eine Ausschüttung zählt je Anteil nur für die Anteile, die am Zahltag im Bestand waren (§ 2 Abs. 11 InvStG: „die dem Anleger gezahlten oder gutgeschriebenen Beträge“). Später im Jahr gekaufte Anteile mindern ihre Vorabpauschale nicht. Andere Lesart: Maßgeblich ist die Ausschüttung des Fonds je Anteil im Kalenderjahr, auch für Anteile, die erst danach gekauft wurden; Fondsgesellschaften weisen in ihren Steuerinformationen die Vorabpauschale je Anteil nach Abzug der Ausschüttungen des Jahres aus; ob Banken diesen Wert auch für erst danach gekaufte Anteile ansetzen, ist nicht geprüft. Beispiel: 100 Anteile aus 2025, 1,00 € je Anteil im März, Kauf weiterer 100 Anteile im September, Kurs 100 → 110, Basiszins 3,2 %. Umgesetzte Lesart 124,00 + 224,00 × 4/12 = 198,67 €, andere Lesart 124,00 + 124,00 × 4/12 = 165,33 €. Die umgesetzte Lesart ergibt die höhere Schätzung und ist die einzige, die sich aus dem Export allein bestimmen lässt: Hielt der Anleger am Zahltag keine Anteile, enthält der Export keine Ausschüttungsbuchung. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG (Randziffern zu § 18), Vorabpauschale-Rechner der Stiftung Warentest, eine Jahressteuerbescheinigung mit unterjährigem Nachkauf nach einer Ausschüttung. Offen. Stand 08.10.2026: BMF Rz. 18.11 zieht für den am 10.7. erworbenen Anteil die Ausschüttung des ganzen Jahres ab, nennt aber den Zahltag nicht; im Beispiel greift außerdem der Deckel, sodass beide Lesarten 0,25 € ergeben. Das Beispiel entscheidet die Frage deshalb nicht.

## Zu verifizieren an echten Exporten

Anleitung, Prüfliste und Prüfprotokoll für den Autor: [pruefung-echte-exporte.md](pruefung-echte-exporte.md). Ergebnisse kommen hier nur anonymisiert hinein.

1. **Trade-Republic-Kopfzeile.** In der ursprünglichen Spezifikation (nicht veröffentlicht) ist die 23-spaltige Kopfzeile nach `"tax"` abgeschnitten. Die Fixture `packages/csv/fixtures/traderepublic-synthetic.csv` verwendet eine angenommene Fortsetzung (`original_amount`, `fx_rate`, `currency`, `mcc_code`, `card_number`, `card_id`, `holder_name`, `seller_name`, `seller_city`, `isin`). Der Parser erkennt das Format an den zwölf Pflichtspalten `datetime, date, account_type, category, type, asset_class, name, shares, price, amount, fee, tax` und liest die übrigen Spalten nur, wenn sie vorhanden sind. Ob die ISIN im Export enthalten ist und wie die Spalte heißt, muss an einem echten Export geprüft werden. Stand der Recherche 20.10.2026: Eine im Forum von Portfolio Performance veröffentlichte Beispielzeile (Beitrag vom 19.04.2026) hat 23 Felder. Die ersten 13 passen nach ihrem Inhalt zu `datetime` bis `tax` einschließlich `symbol`; danach folgen die Währung, drei leere Felder, eine Beschreibung, eine UUID und vier leere Felder. Im selben Thread genannt sind die Spalten `original_amount`, `original_currency` und `fx_rate`. Die Fortsetzung in der Fixture weicht davon vermutlich ab; für die Erkennung zählen nur die zwölf Pflichtspalten. Die Kopfzeile ist nicht veröffentlicht. Stand 22.10.2026: Die Testdateien von Portfolio Performance, laut deren Entwickler von Trade Republic erhalten, haben 23 Spalten mit anderer Fortsetzung, keine Spalte `isin` und die ISIN in `symbol`; eine davon ist mit Semikolon getrennt (Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“, Nebenbefunde). Offen bis zum Abgleich mit dem Export des Autors.
2. **Trade-Republic-Werte in `category` und `type`.** Die Zuordnung (Kauf, Verkauf, Dividende, Zinsen, Einzahlung, Kartenzahlung, Gebühr, Steuer) arbeitet mit Schlüsselwörtern (`BUY`, `SELL`, `DIVIDEND`, `INTEREST`, `PAYIN`, `PAYOUT`, `CARD`, `FEE`, `TAX`, `SAVINGS_PLAN`, `SAVEBACK`, `ROUNDUP`). Unbekannte Werte landen als „Sonstiges“ mit Hinweis. Liste der echten Werte an einem Export sammeln. Offen.
3. **Vorzeichen des Betrags bei Trade Republic.** Der Parser normalisiert das Vorzeichen anhand der Buchungsart (Kauf negativ, Verkauf positiv), ist also gegen beide Konventionen robust. Trotzdem an einem Export prüfen, ob `amount` bei Käufen negativ ist. Stand 22.10.2026: In den Testdateien von Portfolio Performance ist `amount` bei Käufen negativ und `fee` negativ in einer eigenen Spalte (Nebenbefunde im Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“). Offen.
4. **Scalable-Capital-Werte in `type` und `assetType`.** Bekannt aus dem PP-Forum: `Buy`, `Security`. Angenommen: `Sell`, `Distribution`, `Deposit`, `Withdrawal`, `Interest`, `Fee`, `Cash`. Zeilen mit `status` ungleich `Executed` werden übersprungen. Stand der Recherche 20.10.2026: Laut Scalable-FAQ zum Transaktionsexport filtert die Transaktionsansicht nach den Auftragstypen Kauf, Verkauf, Sparplan, Einzahlung, Auszahlung, Ausschüttung, Depotübertrag, Gebühren (ohne Ordergebühren), Kapitalmaßnahme, Steuern und Zinsen und nach den Status Ausstehend, Ausgeführt, Storniert, Abgelaufen und Abgelehnt; wie diese Werte in der CSV heißen, ist nicht beschrieben. Für Depotübertrag und Kapitalmaßnahme hat der Parser keine eigene Regel; solche Zeilen landen voraussichtlich als „Sonstiges“ mit Hinweis. Offen.
5. **Assetklasse bei Scalable Capital.** `assetType = Security` unterscheidet nicht zwischen Aktie und ETF; solche Positionen erscheinen als „Nicht zugeordnet“ mit dem Hinweis „Der Export enthält keine Assetklasse“. Den Fondstyp wählt der Nutzer im Steuerreiter; seit 07.10.2026 steht dort bei Scalable-Positionen ohne Assetklasse der Hinweis „Der Scalable-Export unterscheidet nicht zwischen Aktie und Fonds. Bitte prüfen Sie den Fondstyp.“ ~~Der Standard-Fondstyp bleibt Aktienfonds (Entscheidung des Autors offen).~~ Seit 08.10.2026 ist für Positionen ohne Assetklasse kein Fondstyp vorbelegt („Bitte wählen“), Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 2.
6. **Betrag netto oder brutto bei Ausschüttung und Verkauf.** Am echten TR- und Scalable-Export prüfen, ob `amount` netto ist, also nach Gebühr und Steuerabzug. DepotDoktor behandelt `amount` bei Ausschüttungen und seit der Nachbesserung 07.10.2026 auch bei Verkäufen als Nettobetrag: Für die Vorabpauschale zählt `|amount| + |tax|` als Bruttoausschüttung (§ 2 Abs. 11 InvStG), für den Veräußerungsgewinn `|amount| + |tax|` als Erlös nach Gebühr (§ 20 Abs. 4 EStG: Die abgeführte Steuer ist keine Veräußerungskost). Wäre `amount` schon brutto, würde der Steuerabzug doppelt gezählt; die Vorabpauschale wäre zu niedrig, der Gewinn zu hoch geschätzt. Ebenfalls offen: welches Vorzeichen eine Steuererstattung in der Spalte `tax` hat. Der Parser entfernt das Vorzeichen; eine Erstattung (etwa bei einem Verlustverkauf nach versteuerten Gewinnen) würde deshalb wie ein Steuerabzug addiert statt abgezogen. Stand 22.10.2026: Die Testdateien von Portfolio Performance sprechen bei Trade Republic gegen die Annahme „netto“: Dort ist `amount` der Betrag vor Gebühr und Steuer, `fee` und `tax` sind eigene Bestandteile (Nebenbefunde im Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“). Offen bis zum Abgleich mit dem Export des Autors.
7. **Stornos, Korrekturen und Steuerbuchungen bei Trade Republic.** Stand der Recherche 20.10.2026 (Forum von Portfolio Performance, Quellen in [pruefung-echte-exporte.md](pruefung-echte-exporte.md)): Der Transaktionsexport enthält Stornobuchungen (dort „Trading/BUY_Cancelled“ genannt), korrigierte Dividenden („Cash dividend“ und „Cash dividend corrected“) und Steuerkorrekturen (`CASH`/`TAX_OPTIMIZATION`), bei denen der Betrag in `tax` steht und `amount` 0 ist. DepotDoktor kennt keine Stornos: Eine Buchungsart mit `BUY` gilt als Kauf, sobald Stück und Kurs gefüllt sind; eine Stornierung einer Dividende mit negativem Betrag würde als weitere Dividende gezählt, weil der Parser bei Ausschüttungen das Vorzeichen entfernt; bei Steuerbuchungen liest DepotDoktor nur `amount`, eine solche Zeile ginge also mit 0 in „Abgeführte Steuern“ ein. Wie die Buchungsarten im echten Export heißen und ob die Fälle auftreten, zeigt erst der Export (Prüfliste 3.1). Offen.

## Rechtstexte (Schritt 6), zu verifizieren

Die Texte unter `/impressum`, `/datenschutz` und `/nutzungsbedingungen` wurden ohne juristische Prüfung erstellt. Stand und offene Prüfpunkte:

1. **Impressum.** Impressum nennt Name, Ort und E-Mail; Entscheidung des Autors (07.10.2026).
2. **Vercel als Auftragsverarbeiter.** Anschrift von Vercel Inc. und die Angabe zur Zertifizierung unter dem EU-US Data Privacy Framework gegen https://vercel.com/legal/privacy-notice und https://www.dataprivacyframework.gov prüfen. Ein Auftragsverarbeitungsvertrag (DPA) mit Vercel ist Teil der Vercel-Nutzungsbedingungen; im Dashboard nachsehen, ob er akzeptiert wurde. Offen.
3. **Nutzungsbedingungen.** Ein vollständiger Haftungsausschluss ist nach § 309 Nr. 7 BGB unwirksam; der Text beschränkt die Haftung deshalb auf Vorsatz, grobe Fahrlässigkeit und Personenschäden und verweist für die unentgeltliche Überlassung auf §§ 521, 599 BGB. Ob diese Formulierung trägt, ist juristisch zu prüfen. Offen.
4. **Kontaktadresse.** Die E-Mail-Adresse für Impressum und Datenschutzerklärung steht zentral in `packages/legal/src/operator.ts`; bei einer eigenen Domain dort umstellen.
5. **Normangabe im Disclaimer.** Seit 07.10.2026 „im Sinne von § 2 Abs. 8 Satz 1 Nr. 10 WpHG“ statt der bisherigen Angabe „Paragraf 85 WpHG“; dieser Paragraf regelt Anlage- und Anlagestrategieempfehlungen, die Legaldefinition der Anlageberatung steht in § 2 Abs. 8 Satz 1 Nr. 10 WpHG. Titel und Datum des BaFin-Merkblatts „Hinweise zum Tatbestand der Anlageberatung“ (Stand Februar 2025, veröffentlicht am 10.02.2025) am 07.10.2026 auf bafin.de geprüft: stimmen. Das Merkblatt selbst stützt die Definition auf § 1 Abs. 1a Satz 2 Nr. 1a KWG und § 2 Abs. 2 Nr. 4 WpIG; die WpHG-Norm ist die gleichlautende Definition für Wertpapierdienstleistungen. ~~Ob die Normangabe ganz entfallen soll, entscheidet der Autor (offen).~~ Entschieden am 08.10.2026: Die Normangabe bleibt, sie ist korrekt (Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 3). `packages/legal` ist unverändert.

## Abweichungen von der ursprünglichen Spezifikation

- **Ableitung im Newton-Beispiel.** Die Spezifikation nennt NPV′(0,08) ≈ −25.833. Nachgerechnet: NPV′(0,08) = 5.000/1,08² − 2 · 17.600/1,08³ = 4.286,69 − 27.942,89 = −23.656,20. Der erste Newton-Schritt landet damit bei 0,0994 statt 0,0978. Am Ergebnis (IRR = 10 %) ändert das nichts.
- **Steuer-Quellen in Kommentaren.** Die Projektregeln verbieten Kommentarzeilen. Quellen stehen deshalb in dieser Datei und in den Testnamen.
- **Floats in den Code-Beispielen.** Die Skizzen rechnen mit `number`; umgesetzt ist decimal.js für alle Geldbeträge. Nur der IRR-Löser (Nullstellensuche einer Rate) arbeitet mit `number`, die Zahlungsströme werden an der Schnittstelle konvertiert.
- **Zwölftelung.** Die Spezifikation kürzt den Basisertrag, umgesetzt ist seit 07.10.2026 die Kürzung der Vorabpauschale nach § 18 Abs. 2 InvStG (siehe „Zu verifizieren“, Punkt 1).

## Getroffene Entscheidungen (03.09.2026, vom Autor noch nicht ausdrücklich bestätigt)

1. Depotsicht für TTWROR und IRR: Käufe, Verkäufe, Dividenden, Gebühren und Steuern sind externe Zahlungsströme; Einzahlungen, Auszahlungen und Zinsen des Verrechnungskontos fließen nicht ein. Begründung: Die Vorabpauschale betrifft nur das Depot, Kontozinsen würden die Depotrendite verfälschen. Seit 07.10.2026 bestimmen Kontobuchungen auch weder den Zeitraum noch die Bewertungspunkte (Abschnitt „Nachkontrolle 07.10.2026“).
2. Volatilität und Max Drawdown werden ohne Tageskurse angezeigt, mit Hinweis in Oberfläche und PDF.
3. Keine Vercel Web Analytics. Seit 07.10.2026 beschreiben Datenschutzerklärung und README genau, welche Anfragen nach dem Laden noch entstehen (Programmteile und Seitendaten vom selben Server, keine Dateiinhalte); der E2E-Test prüft das bei jedem Pull Request.
4. PDF-Report nutzt die eingebauten PDF-Schriften (Helvetica, Times), damit keine Schriftdatei nachgeladen werden muss. Zeichen außerhalb von WinAnsi (Minuszeichen U+2212, Pfeil, schmale Leerzeichen) werden vor dem Rendern ersetzt.
5. Diagramme verwenden nur Grün als Datenfarbe (eine Serie je Diagramm). Die Projektpalette (Gold, Grün, Bordeaux, Schwarz) besteht den Farbsehschwäche-Test für mehrfarbige Kategorien nicht; sobald ein Diagramm mehrere Serien braucht, sind Beschriftung oder Muster statt Farbe nötig.

## Dateityp-Prüfung 09.09.2026

Anlass: Beim Test von KontoKlar (K2) zog der Autor einen PDF-Kontoauszug in das CSV-Feld; die Anwendung las die Binärdatei als Text und zeigte Bytemüll als „erkannte Kopfzeile“. DepotDoktor hatte dieselbe Lücke: `file.text()` dekodierte jede Datei als UTF-8, die Kopfzeilenerkennung schlug fehl, und die Meldung „Format nicht erkannt“ zitierte die ersten Bytes der PDF als „gefundene Spalten“.

Umgesetzt:

1. `packages/csv/src/filekind.ts`: `detectFileKind` prüft die Bytes vor jeder Textverarbeitung. `%PDF-` ergibt `pdf`, `PK` (ZIP, damit auch xlsx/docx) ergibt `zip`, Nullbytes oder mehr als 5 % Steuerzeichen in den ersten 4 KB ergeben `binary`, 0 Byte ergibt `empty`. Nur `text` gelangt zum Parser. Zu jeder Nicht-Text-Art gibt es eine deutsche Meldung mit dem Exportweg beider Broker. Seit 07.10.2026 rät die Meldung bei ZIP- und Excel-Dateien, den CSV-Export erneut beim Broker herunterzuladen und unverändert hochzuladen, statt ihn in Excel zu speichern (Excel verändert Trennzeichen, Dezimalzeichen und Datumsformat).
2. `decodeCsvBytes` dekodiert UTF-8 strikt und fällt bei ungültigen Sequenzen auf Windows-1252 zurück; vorher wurden Umlaute aus Latin-Exporten als U+FFFD gelesen.
3. `parseBrokerCsv` bricht zusätzlich bei Text ab, der mit `%PDF-` beginnt (zweite Sicherung für Aufrufer, die einen String übergeben).
4. Drop-Zone nennt ausdrücklich: nur CSV, keine PDF-Kontoauszüge, keine Excel-Dateien.
5. Tests: 12 Unit-Tests (`filekind.test.ts`) mit Signaturen, Steuerzeichen-Anteil, BOM, Windows-1252 und PDF-Text im Parser; 2 Playwright-Tests laden eine PDF- und eine xlsx-Datei hoch und erwarten die Meldung ohne Report und ohne „Gefundene Spalten“.

~~Nicht abgedeckt: UTF-16-Exporte.~~ Seit 06.10.2026 werden UTF-16-Dateien mit BOM (`FF FE` little endian, `FE FF` big endian) erkannt und dekodiert; UTF-16 ohne BOM wird weiterhin als Binärdatei abgelehnt (siehe Abschnitt „Lückenschluss 06.10.2026“).

## Gesamtprüfung 06.09.2026 (Funktion, Datenschutz, Sicherheit, Layout, Zugänglichkeit)

Geprüft: Typecheck, Lint, 115 Unit-Tests, Build, 5 Playwright-Tests gegen den Prod-Server, `pnpm audit`, axe-core (WCAG 2.1 AA und Best Practices) auf allen Seiten und Reitern in Desktop- und Mobilbreite, Tastaturreihenfolge, Antwort-Header, PDF-Ausgabe.

Behoben:

1. **Sicherheits-Header.** `next.config.ts` setzt Content-Security-Policy (`connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`; `'wasm-unsafe-eval'` für die Yoga-Layout-Engine von @react-pdf; `connect-src` zusätzlich `data:`, weil Yoga sein WASM-Binary per `fetch` auf eine data-URL lädt und sonst eine CSP-Verletzung meldet, bevor es auf die Base64-Dekodierung zurückfällt; `data:` ist kein Netzwerkziel), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security und Cross-Origin-Opener-Policy. `connect-src 'self'` macht das Datenschutzversprechen technisch durchsetzbar: Der Browser blockiert jede Hintergrundanfrage (fetch, XHR) an fremde Hosts, `default-src 'self'` und `form-action 'self'` dazu Subressourcen und Formularziele. Seitenaufrufe über einen angeklickten externen Link begrenzt die CSP nicht. Der E2E-Test mit PDF-Download läuft unter dieser Policy. Stand 07.10.2026 siehe Abschnitt „Sicherheit“ unten.
2. **Abhängigkeiten.** `pnpm audit` meldete damals vier Lücken in `postcss` (transitiv über `next`, nur Build-Zeit); Override `postcss >= 8.5.23` in `package.json`. Stand 07.10.2026: pnpm audit: nur braces über eslint-config-next (Dev, ohne Patch); Einzelheiten im Abschnitt „Nachkontrolle 07.10.2026“.
3. **Layout mobil.** Die Kopfzeile lief bei 390 px Breite über den Rand (horizontales Scrollen auf allen Seiten). Navigation umbricht jetzt. Die Reiterleiste scrollt seit 07.10.2026 mobil horizontal, statt umzubrechen.
4. **Kontrast.** Gold `#b8962e` erreicht auf Papier nur 2,7:1. Für Text gibt es `--color-gold-deep` (heute `#7d5f17`); Gold bleibt für Linien und Flächen. Betroffen: „Projekt K1“, Hinweis „Deckel“, Hover-Farbe der Links.
5. **Zugänglichkeit.** Reiter nach WAI-ARIA-Muster (`aria-controls`, `tabpanel`, Pfeiltasten, Home/End, Roving Tabindex); horizontal scrollbare Tabellen mit `tabindex="0"` und Beschriftung erreichbar; Sprunglink „Zum Inhalt springen“; sichtbarer Fokusring in Gold-Deep; Datei-Input mit `aria-label`; Navigation als Liste mit `aria-label`. axe-core meldete keine Verstöße mehr.
6. **Datei-Eingabe.** Dateien über 25 MB werden mit Meldung abgelehnt, Lesefehler werden abgefangen statt unbehandelt zu bleiben.
7. **CSV-Export.** Textzellen, die mit `=`, `+`, `@`, Tab oder einem Minus ohne Ziffer beginnen, erhalten ein führendes Apostroph (Schutz vor Formelauswertung in Tabellenkalkulationen). Unit-Test ergänzt. Seit 08.10.2026 gilt der Schutz für jedes Textfeld, das mit `-` beginnt, auch vor Ziffern (Abschnitt „CSV-Export für deutsches Excel 08.10.2026“).
8. **Favicon** (`apps/web/app/icon.svg`), vorher 404 in der Konsole.
9. **PDF.** Erstellungsdatum nutzt die lokale Zeit statt UTC.
10. **README.** „Papa Parse (Web Worker)“ gestrichen (kein Worker im Einsatz), Volatilitätsbeschreibung präzisiert, „Kirchensteuer optional“ und Sparerpauschbetrag als nicht berücksichtigt ausgewiesen, Roadmap-Stand aktualisiert.

Damals nicht geändert, vom Autor zu entscheiden:

1. ~~**„Quelloffen“ und „auf GitHub“.**~~ Erledigt. Seit 07.10.2026 ist der Code öffentlich unter mirkan-morgenfels-ai/depotdoktor; die Seiten verlinken ihn.
2. ~~**Steuerjahr-Vorbelegung.** Der Reiter Steuer startet mit 2026, obwohl das Jahr läuft; der Kurs 31.12.2026 existiert noch nicht. Alternative: letztes abgeschlossenes Jahr oder Jahr der letzten Buchung vorbelegen. Offen (Entscheidung des Autors); seit 07.10.2026 zeigt der Reiter ohne vollständige Kurse aber kein Schein-Ergebnis mehr.~~ Entschieden am 08.10.2026: letztes abgeschlossenes Jahr mit Bestand am 31.12., sonst Jahr der letzten Depotbuchung (Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 1).
3. ~~**Max Drawdown nach Vollverkauf.**~~ Erledigt am 06.10.2026, Begründung und Testfälle im Abschnitt „Lückenschluss 06.10.2026“.
4. ~~**Standardwerte im Steuerreiter.**~~ Erledigt am 07.10.2026: Kurs 01.01. und 31.12. waren mit demselben Wert vorbelegt, die Kacheln zeigten dann 0,00 €. Jetzt stammt der Kurs 01.01. nur aus dem Vorjahr; fehlt ein Kurs oder stammen beide aus derselben Buchung, zeigen die Kacheln „–“ und „Kurse eintragen“, vorbelegte Werte sind als „vorläufig (Kurs aus dem Export)“ gekennzeichnet. Einzelheiten im Abschnitt „Nachkontrolle 07.10.2026“.
5. ~~**Kurse im Steuerreiter gelten für alle Steuerjahre.**~~ Erledigt am 07.10.2026 nach Option (a), entschieden vom Autor: Kurs 01.01. und 31.12. werden je Steuerjahr und Position gespeichert, der Fondstyp weiter je Position. Beim Wechsel des Steuerjahres erscheinen die für dieses Jahr eingegebenen Kurse oder, ohne Eingabe, die Vorbelegung dieses Jahres, nie die Kurse eines anderen Jahres. Eine Änderung des Fondstyps gilt für alle Jahre und schreibt keine Kursvorbelegung mehr fest. Die Eingaben zu angesetzten Vorabpauschalen je Verkauf sind unverändert. Der PDF-Export nutzt die Kurse des gewählten Jahres und nennt das Jahr in der Fußnote. Einzelheiten im Abschnitt „Kurse je Steuerjahr 07.10.2026“. Ursprünglicher Befund vom 06.10.2026: Fondstyp, Kurs 01.01. und Kurs 31.12. hingen gemeinsam an der Position; wer 2026 Kurse eintrug und auf 2025 umschaltete, sah dieselben Werte unter „Kurs 01.01.2025“. Schon eine Änderung des Fondstyps hat die Kursvorbelegung des gerade gewählten Jahres für alle Jahre festgeschrieben. Optionen waren (a) Kurse je Jahr speichern, Fondstyp je Position behalten, (b) beim Jahreswechsel alle Eingaben zurücksetzen, (c) so lassen.

## Lückenschluss 06.10.2026

Umgesetzt in den Commits `854bbce` bis `71438f0` der öffentlichen Historie.

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234. `packageManager` steht wie in K2 und K3 auf `pnpm@10.34.5`; die CI übernimmt die Version aus `packageManager`.

| Schritt | Ausgangslage vor den Änderungen | Nach den Änderungen |
|---|---|---|
| `pnpm install --frozen-lockfile` | grün | grün |
| `pnpm typecheck` | grün | grün |
| `pnpm lint` | grün | grün |
| `pnpm test` | 127 Tests grün (csv 42, pdf 1, web 84) und 1 offener `todo` | 155 Tests grün (csv 50, pdf 1, web 104) und 1 offener `todo` |
| `pnpm build` | grün | grün |
| `pnpm test:e2e` mit `CI=true` gegen den Produktionsserver | 7 Tests grün | 10 Tests grün |
| axe-core 4.14 (WCAG 2.1 AA und Best Practices), 11 Seitenzustände je Desktop 1280 px und Mobil 390 px | nicht gemessen | 0 Verstöße |

Der offene `todo` ist Fall D (Bezugsgröße und Kürzungsregel bei unterjährigem Kauf), siehe „Zu verifizieren“, Punkt 1 und 2.

### Texte zu Quellcode und Startseite

- Damals: Startseite, Impressum, Datenschutzerklärung und Nutzungsbedingungen sagten nur, dass der Quellcode unter der MIT-Lizenz steht, ohne Link, solange das Repository nicht öffentlich war.
- Stand 07.10.2026: Startseite, Fußzeile, Projektseite, Impressum und Nutzungsbedingungen verlinken das öffentliche Repository `mirkan-morgenfels-ai/depotdoktor`; die Kopfzeile verlinkt Start, DepotDoktor, KontoKlar und NetzRadar, aber kein Repository. Die Startseite verlinkt KontoKlar (https://kontoklar-eight.vercel.app/projects/kontoklar) und NetzRadar (https://netzradar.vercel.app/projects/netzradar) mit `rel="noopener noreferrer"` im selben Tab, dazu je Projekt das Repository. Abschnitt 6 der Datenschutzerklärung nennt KontoKlar, NetzRadar und GitHub. Die E2E-Tests in `e2e/site.spec.ts` prüfen Ziele, `rel` und das Fehlen von `target`.

### CI

- Playwright-Reporter in der CI: `[["list"], ["html", { open: "never" }]]` statt `"github"`. Dadurch entsteht `apps/web/playwright-report/`, das `upload-artifact` bei Fehlern hochlädt; vorher war das Artefakt leer. Lokal geprüft: Der Ordner entsteht mit `index.html`.
- `pnpm/action-setup@v6` und `actions/upload-artifact@v7` wie in K3. Beide Tags existieren (am 06.10.2026 per `gh api` geprüft).

### Zeilenenden

`.gitattributes` mit `* text=auto eol=lf`, `*.pdf binary`, `*.png binary`. Alle Textdateien liegen im Index bereits mit LF vor (`git ls-files --eol`). Nach dem Anlegen zeigt `git status` keine zusätzlichen geänderten Dateien; eine Renormalisierung ist nicht nötig.

### Palette und Kontrast

Hex-Werte an K2 und K3 angeglichen, die Token-Namen bleiben. Geändert in `globals.css`, `packages/charts/src/theme.ts`, `packages/pdf/src/ReportDocument.tsx` und `apps/web/app/icon.svg`:

| Token | alt | neu |
|---|---|---|
| ink | #141414 | #111111 |
| paper | #fbf9f4 | #fbfaf6 |
| surface | #ffffff | #ffffff |
| line | #e2dccf | #e3e0d6 |
| muted | #6b665c | #6b6b66 |
| gold | #b8962e | #b8912f |
| gold-deep | #7f6619 | #7d5f17 |
| gold-soft | #f3ead0 | #f3e9c9 |
| green | #2f5d3a | #2f6b3a |
| green-soft | #e3ede4 | #dfeadf |
| bordeaux | #6e1e2b | #7a1f2b |
| bordeaux-soft | #f1e1e3 | #f1dcdf |

Kontrast nach WCAG 2.1 (relative Leuchtdichte, sRGB). Für Text gilt AA 4,5:1:

| Text auf Fläche | alt | neu |
|---|---|---|
| muted auf paper | 5,42 | 5,13 |
| muted auf surface | 5,71 | 5,36 |
| muted auf gold-soft | 4,75 | **4,42** |
| gold-deep auf paper | 5,23 | 5,71 |
| gold-deep auf surface | 5,50 | 5,96 |
| gold-deep auf gold-soft | 4,58 | 4,92 |
| green auf paper | 7,26 | 6,12 |
| green auf surface | 7,64 | 6,39 |
| bordeaux auf surface | 11,15 | 10,20 |
| bordeaux auf bordeaux-soft | 8,82 | 7,79 |
| paper auf ink | 17,51 | 18,08 |
| paper auf green (Hover der Schaltflächen) | 7,26 | 6,12 |
| gold auf surface | 2,82 | 2,95 |

Folgen:

1. Grau auf Gold-Soft liegt mit 4,42:1 knapp unter AA. Das kam nur in der Drop-Zone vor, während eine Datei darübergezogen wird; die beiden Hinweiszeilen sind in diesem Zustand jetzt `ink`.
2. Gold erreicht auch mit dem neuen Wert keine 4,5:1 und bleibt Linien und Flächen vorbehalten. Im PDF war die kleine Kopfzeile über dem Titel noch in Gold gesetzt; sie nutzt jetzt Gold-Deep (5,96:1 auf Weiß). Seit 07.10.2026 ist auch der Fokusring der Schaltflächen Gold-Deep statt Gold.
3. axe-core fand weder in Desktop- noch in Mobilbreite Verstöße. Geprüft wurden Startseite, die drei Rechtsseiten, die Projektseite, alle vier Reiter mit der Beispieldatei und der Steuerreiter mit Verkauf, einmal mit gültiger und einmal mit ungültiger Eingabe. Die Drop-Zone im Ziehzustand prüft axe nicht; dafür gilt die Rechnung oben.
4. Die README-Screenshots (`docs/screenshots/`) wurden damals mit der neuen Palette neu erzeugt: Trade-Republic-Testdatei, Viewport 1280 px, Skalierung 1,5, ETF-Kurs 31.12. auf 95,00 €.

### UTF-16-Exporte

`packages/csv/src/filekind.ts` erkennt nach der PDF- und ZIP-Prüfung die BOM `FF FE` (UTF-16 LE) und `FE FF` (UTF-16 BE). Die ersten 4 KB nach der BOM werden mit `TextDecoder("utf-16le")` bzw. `TextDecoder("utf-16be")` dekodiert; die Prüfung auf Null- und Steuerzeichen läuft dann auf den Codeeinheiten statt auf den Bytes. `decodeCsvBytes` dekodiert die ganze Datei mit derselben Kodierung und entfernt die BOM. Ohne BOM bleibt es beim bisherigen Verhalten: UTF-8 strikt, sonst Windows-1252. UTF-16 ohne BOM enthält Nullbytes und wird weiter abgelehnt.

Tests in `filekind.test.ts`, alle mit von Hand gebauten Byte-Arrays:

- „Datum;Typ\r\n“ in UTF-16 LE
- „Gebühr;10 €“ in UTF-16 BE (ü = `00 FC`, € = `20 AC`)
- € in LE als `AC 20`
- UTF-16 ohne BOM bleibt Binärdatei
- BOM vor Null-Codeeinheiten ist Binärdatei
- 1 Steuerzeichen unter 10 Codeeinheiten (10 % > 5 %) ist Binärdatei
- nur BOM ist leer
- Scalable-Export als UTF-16 LE wird vollständig eingelesen

E2E: Die Trade-Republic-Testdatei als UTF-16 LE mit BOM ergibt denselben Report (8 Buchungen; TTWROR damals +2,41 %, seit 07.10.2026 +2,40 %).

### Max Drawdown nach Vollverkauf

Bisher wurde der Drawdown-Index am ersten Bewertungspunkt mit Bestand nach einem Punkt ohne Bestand auf 1 zurückgesetzt, der alte Höchststand blieb aber stehen. Das ergab je nach Vorgeschichte einen zu hohen oder einen zu niedrigen Wert. Ein Depotwert von 0 nach dem Vollverkauf zählte dagegen nicht als −100 %, weil der Verkaufserlös als Zahlungsstrom in die Periodenrendite eingeht.

Neu in `metrics/drawdown.ts`: Der Index startet beim ersten Punkt mit Bestand bei 1 und wird danach nie zurückgesetzt. Perioden, die an einem Punkt ohne Bestand beginnen, gehen mit 0 % ein. Der Index ist damit genau die Verkettung, aus der auch die TTWROR entsteht (`periodReturns` überspringt dieselben Perioden). Der Drawdown misst nur Kursrückgänge, während Kapital investiert ist; die Zeit ohne Bestand ist neutral. Seit 07.10.2026 rechnet der Drawdown direkt auf `periodReturns`, einschließlich der Zuflüsse in ein leeres Depot (Abschnitt „Nachkontrolle 07.10.2026“).

| Fall (Wert / Zahlungsstrom je Buchungstag) | alt | neu | Handrechnung neu |
|---|---|---|---|
| 1.000 / +1.000, 0 / −1.100, 450 / +450, 405 / 0 | 18,18 % | 10,00 % | Index 1, 1,1, 1,1, dann 1,1 × 405/450 = 0,99; (1,1 − 0,99)/1,1 = 10 % |
| dieselben ersten drei Punkte (Neukauf ohne Kursänderung) | 9,09 % | 0,00 % | Index bleibt 1,1 |
| 1.000 / +1.000, 0 / −900, 0 / −5 (Ausschüttung nach dem Verkauf) | 10,00 % | 10,00 % | Index 1, dann 0,9, danach unverändert; kein −100 % |
| 1.000 / +1.000, 0 / −800, 500 / +500, 400 / 0 | 20,00 % | 36,00 % | Index 1, 0,8, 0,8, dann 0,8 × 400/500 = 0,64 |

Die Werte „alt“ sind mit der vorherigen Implementierung nachgerechnet. Tests stehen in `volatility-drawdown.test.ts`, Abschnitt „Max Drawdown nach Vollverkauf“. Dazu kommt ein Durchlauf über `buildReport` mit vier Buchungen (Kauf 10 @ 100, Verkauf 10 @ 110, Kauf 5 @ 90, Kauf 1 @ 81): Drawdown 10 %, TTWROR −1 %.

### Steuerkonstanten geprüft

| Konstante | im Code | Quelle | Ergebnis |
|---|---|---|---|
| Basiszins 2025 | 2,53 % | BMF-Schreiben vom 10.01.2025, IV C 1 - S 1980/00230/009/002, BStBl I 2025, 273 (Wortlaut über die Haufe-Rechtsquellendatenbank) | stimmt |
| Basiszins 2026 | 3,20 % | BMF-Schreiben vom 13.01.2026, IV C 1 - S 1980/00230/012/001 (Haufe, Meldung „Basiszins zum 2.1.2026“) | stimmt |
| Teilfreistellung Aktienfonds | 30 % | § 20 Abs. 1 Satz 1 InvStG (gesetze-im-internet.de) | stimmt |
| Teilfreistellung Mischfonds | 15 % | § 20 Abs. 2 InvStG: Hälfte der Aktienteilfreistellung | stimmt |
| Teilfreistellung Immobilienfonds und Auslands-Immobilienfonds | 60 % und 80 % | § 20 Abs. 3 InvStG | stimmt |
| Sparer-Pauschbetrag | 1.000 € und 2.000 € | § 20 Abs. 9 Satz 1 und 2 EStG | stimmt |
| Zwölftelung, Zuflusszeitpunkt | 1/12 je vollem Monat vor dem Erwerbsmonat; Zufluss am ersten Werktag des Folgejahres | § 18 Abs. 2 und 3 InvStG | stimmt; seit 07.10.2026 wird nach Wortlaut die Vorabpauschale gekürzt („Zu verifizieren“, Punkt 1) |

Die Teilfreistellungssätze gelten für Anteile im Privatvermögen; die höheren Sätze für Betriebsvermögen bildet DepotDoktor nicht ab.

### Angesetzte Vorabpauschalen beim Verkauf

Rechtsgrundlage, am Gesetzestext geprüft: § 19 Abs. 1 Satz 3 InvStG („Der Gewinn ist um die während der Besitzzeit angesetzten Vorabpauschalen zu vermindern.“) und Satz 4 (in voller Höhe, ungeachtet der Teilfreistellung).

Umsetzung:

1. Je Verkauf im Steuerjahr gibt es im Steuerreiter ein optionales Feld „Für diese Anteile in Vorjahren angesetzte Vorabpauschalen (€, optional)“. Ohne Eingabe wird nichts abgezogen, das bisherige Ergebnis bleibt also gleich.
2. Das Feld erscheint nur, wenn der Fondstyp nicht „kein Fonds“ ist und der Verkauf nach FIFO mindestens eine Tranche aus einem früheren Kalenderjahr verbraucht. Begründung: Die Vorabpauschale eines Jahres gilt erst am ersten Werktag des Folgejahres als zugeflossen (§ 18 Abs. 3 InvStG). Anteile, die im selben Kalenderjahr gekauft und verkauft werden, können also keine angesetzte Vorabpauschale haben. Die Bedingung ist notwendig, nicht hinreichend; den Betrag liefert die Bank.
3. Gewinn = Erlös − Anschaffungskosten (FIFO) − angesetzte Vorabpauschalen. „Angesetzte Vorabpauschalen“ ist die Summe aus der Anrechnung je Tranche in `tax/fifo.ts` (derzeit immer 0, siehe unten) und dem eingetragenen Betrag. Angezeigt wird genau diese Summe, sodass Erlös − Anschaffungskosten − angezeigter Betrag immer den angezeigten Gewinn ergibt. Der Betrag wird nicht um die Teilfreistellung gekürzt. Unlesbare oder negative Eingaben werden als Fehler angezeigt und ziehen nichts ab.
4. Die Eingabe hängt an der Buchung des Verkaufs und liegt in einem eigenen Zustand, nicht in den Positionseinstellungen (Fondstyp, Kurse). Ein Wechsel des Steuerjahres überträgt sie deshalb nicht auf andere Verkäufe und ändert die Kursvorbelegung anderer Jahre nicht. Beim Laden einer neuen Datei werden die Eingaben verworfen.
5. Im PDF nennt die Fußnote der Position den Abzug und den geminderten Gewinn; die Kachel „Realisierte Gewinne“ enthält den Abzug.
6. Zugänglichkeit: Das Feld hat als Namen nur „Für diese Anteile in Vorjahren angesetzte Vorabpauschalen (€, optional)“ (`label` mit `for`). Hinweis und Fehlermeldung sind eigene Elemente mit `id` und hängen über `aria-describedby` am Feld; die Fehlermeldung nur, solange die Eingabe ungültig ist (`aria-invalid="true"`).

Handrechnung im Test `sale-credit.test.ts`: Kauf 10 @ 100 € am 03.03.2025, Kauf 10 @ 110 € am 02.02.2026, Verkauf 15 @ 120 € am 04.05.2026. FIFO: 10 × (120 − 100) + 5 × (120 − 110) = 250 €. Mit 12,34 € angesetzten Vorabpauschalen sind es 237,66 €. Weitere Fälle:

- leere Eingabe: 250 €
- 1.234,50 €: −984,50 €
- „abc“ und „−5“ sind ungültig: 250 €
- Fondstyp „kein Fonds“: kein Feld, 250 €
- Verkauf nur aus Anteilen desselben Jahres: kein Feld, 50 €
- Eingabe 12,34 € im Jahr 2026: Die Positionseinstellungen bleiben die Vorbelegung (seit 07.10.2026: 2025 Kurs 01.01. leer und 31.12. 100,00 €, 2026 Kurs 01.01. 100,00 € aus 2025 und 31.12. 120,00 € als Verkaufskurs)
- Anrechnung je Tranche 1,50 € × 10 Stück = 15,00 € plus Eingabe 12,34 €: angezeigt 27,34 €, Gewinn 1.800 − 1.550 − 27,34 = 222,66 €. Ohne gültige Eingabe (leer, „abc“, Fondstyp „kein Fonds“) bleiben 15,00 € und 250 − 15 = 235,00 €

E2E: Kauf 10 @ 100 € im Jahr 2025, Verkauf 10 @ 120 € im Jahr 2026. Geprüft werden:

- Die Eingabe von 25,30 € ergibt 174,70 € statt 200,00 € in der Verkaufszeile und in der Kachel „Realisierte Gewinne 2026 (FIFO)“; die Kachel wird über ihre eigene `data-testid` angesprochen.
- Nach dem Wechsel auf 2025 steht die Vorbelegung des Jahres 2025 in den Kursfeldern. Nach dem Wechsel zurück auf 2026 steht die Eingabe noch da.
- Zugänglicher Name und zugängliche Beschreibung des Felds.
- Ungültige Eingabe: Fehlermeldung in der Beschreibung, `aria-invalid`, Verkaufszeile und Kachel wieder bei 200,00 €.

Die Anrechnung je Tranche in `tax/fifo.ts` (`taxedVorabpauschalePerShare`) ist weiterhin 0, weil der Export keine Vorjahreskurse enthält. Rechnung und Anzeige verwenden die Summe beider Quellen (Punkt 3). Wird die Tranchen-Anrechnung künftig befüllt, etwa aus selbst geschätzten Vorabpauschalen der Vorjahre, beschreiben beide Quellen dieselbe Größe. Dann muss feststehen, welche Quelle gilt, damit derselbe Betrag nicht doppelt abgezogen wird; zum Beispiel ersetzt die Eingabe die Schätzung. Solange der Wert 0 ist, stellt sich die Frage nicht.

## Kurse je Steuerjahr 07.10.2026

Umgesetzt im Commit `b8a0c35` der öffentlichen Historie. Der Autor hat für den Bedienfehler aus „Damals nicht geändert, vom Autor zu entscheiden“, Punkt 5, Option (a) gewählt: Kurse je Steuerjahr und Position speichern, Fondstyp je Position behalten.

### Datenmodell

`apps/web/lib/depotdoktor/tax/inputs.ts`:

- `TaxInputs` hat zwei getrennte Teile: `fundTypes` (Schlüssel: Position) und `prices` (Schlüssel: Steuerjahr, darunter Position; die Felder `yearStartPrice` und `yearEndPrice` sind einzeln optional).
- `taxInputsReducer` kennt drei Aktionen: `setFundType` (Position, gilt für alle Jahre), `setPrice` (Jahr, Position, Feld, Wert) und `reset` (beim Laden einer neuen Datei und bei „Andere Datei“).
- Gespeichert wird nur, was eingegeben wurde, und zwar je Feld. `resolvePositionSettings` in `tax/summary.ts` setzt die Werte für ein Jahr zusammen: Fondstyp aus `fundTypes`, sonst der Standard nach Assetklasse; jedes Kursfeld aus `prices[Jahr][Position]`, sonst die Vorbelegung dieses Jahres (seit der Nachkontrolle: Kurs 01.01. aus dem Vorjahr, Kurs 31.12. bis zum Jahresende). Ein geleertes Feld bleibt leer und fällt nicht auf die Vorbelegung zurück; die Oberfläche fordert dann zur Eingabe auf.
- `buildTaxSummary(transactions, year, inputs, saleCredits)` nimmt diesen Zustand statt der bisherigen Positionseinstellungen entgegen. `TaxRow.settings` enthält die für das gewählte Jahr aufgelösten Werte; Steuerreiter und PDF lesen sie.
- Die Eingaben angesetzter Vorabpauschalen je Verkauf bleiben ein eigener Zustand (Schlüssel: Buchung des Verkaufs) und sind unverändert.

### Oberfläche und PDF

- Der Steuerreiter meldet Änderungen als Aktion. Das Jahr einer Kursaktion ist das Jahr der angezeigten Zusammenfassung, also das Jahr aus der Feldbeschriftung („Kurs 01.01.2026 (€)“).
- Der Hinweis unter „So wird gerechnet“ (auch im PDF) nennt die Vorbelegung; eingetragene Kurse gelten nur für das gewählte Steuerjahr, der Fondstyp gilt für alle Jahre.
- Die PDF-Fußnote je Position nennt das Jahr: „Kurs 01.01.2026: … € · Kurs 31.12.2026: … €“. Der PDF-Export nutzt wie die Ansicht die Zusammenfassung des gewählten Jahres.
- Die Kacheln Vorabpauschale, Steuerpflichtig und Geschätzte Steuer haben eigene `data-testid` (`tax-vorabpauschale`, `tax-taxable`, `tax-estimated-tax`) für den E2E-Test.

### Tests

Unit-Tests in `tax-inputs.test.ts`. Testdaten: Kauf 10 @ 100 € am 03.03.2025, Kauf 5 @ 110 € am 15.01.2026. Handrechnungen (Erwartungen nach der Nachkontrolle):

| Fall | Rechnung | Erwartung |
|---|---|---|
| ohne Eingabe | Vorbelegung: Kurs 01.01. = letzter Kurs bis 31.12. des Vorjahres, Kurs 31.12. = letzter Kurs bis Jahresende | 2025: leer / 100,00, keine Schätzung; 2026: 100,00 / 110,00, vorläufig 15 × 100 × 3,2 % × 0,7 = 33,60 € |
| 2026: 105 → 125, Aktienfonds | 10 × 105 × 3,2 % × 0,7 = 23,52; 5 × 105 × 3,2 % × 0,7 = 11,76 (Januarkauf, kein Monat entfällt); Wertzuwachs 15 × 20 = 300 deckelt nicht | Vorabpauschale 35,28 €, steuerpflichtig 35,28 × 0,7 = 24,696 €, Steuer 24,696 × 26,375 % = 6,51357 € |
| 2025: 01.01. eingegeben 100, 31.12. eingegeben 110, Aktienfonds | 10 × 100 × 2,53 % × 0,7 = 17,71; Kauf im März, 2 Monate entfallen: × 10/12 = 14,7583; Wertzuwachs 10 × 10 = 100 deckelt nicht | Vorabpauschale 14,7583 €, steuerpflichtig 10,3308 €, Steuer 2,7248 € |
| Fondstyp Mischfonds, Kurse wie oben | Teilfreistellung 15 % | 2026: steuerpflichtig 35,28 × 0,85 = 29,988 €, Steuer 7,909335 €; 2025: 12,5446 €, Steuer 3,3086 € |
| Verkauf 10 @ 120 € im Jahr 2026 aus Kauf 10 @ 100 € im Jahr 2025, angesetzte Vorabpauschalen 25,30 € | 10 × (120 − 100) − 25,30 | 174,70 € ohne Kurseingaben, mit Kurseingaben und mit Mischfonds |

Weitere Fälle: Kurse für 2026 ändern 2025 nicht; die Eingaben beider Jahre bleiben beim Wechsel erhalten, ein nicht eingegebenes Feld bleibt bei der Vorbelegung seines Jahres; der Fondstyp gilt für 2025 und 2026 und legt keinen Kurs fest; ein geleertes Feld bleibt leer (keine Schätzung), nur im betroffenen Jahr; Eingaben betreffen nur die eigene Position; der Reducer verändert den vorigen Zustand nicht, `reset` liefert den leeren Zustand; PDF-Fußnote und Kachel nennen die Kurse und Summen des gewählten Jahres.

E2E „Kurse im Steuerreiter gelten je Steuerjahr, der Fondstyp für alle Jahre, Andere Datei setzt beides zurück“ mit denselben zwei Käufen als Scalable-CSV (Stand nach der Nachkontrolle):

1. 2026: Felder 100,00 / 110,00 (vorläufig), Kacheln 33,60 €, 23,52 €, 6,20 € mit „vorläufig (Kurs aus dem Export)“.
2. Eingabe 105,00 / 125,00: Vorabpauschale 35,28 €, steuerpflichtig 24,70 €, Steuer 6,51 €.
3. Wechsel auf 2025: Felder leer / 100,00 (Vorbelegung 2025, nicht die Werte aus 2026), Kacheln „–“ mit „Kurse eintragen“.
4. Eingabe Kurs 01.01.2025 = 100,00 und Kurs 31.12.2025 = 110,00: 14,76 €, 10,33 €, 2,72 €.
5. Zurück auf 2026: Felder 105,00 / 125,00, Kacheln 35,28 €, 24,70 €, 6,51 €.
6. Fondstyp Mischfonds: 35,28 €, 29,99 €, 7,91 €.
7. Wechsel auf 2025: Fondstyp Mischfonds, Felder 100,00 / 110,00, Kacheln 14,76 €, 12,54 €, 3,31 €.
8. „Andere Datei“, dieselbe Datei erneut laden, Steuerreiter: 2026 Fondstyp Aktienfonds, Felder 100,00 / 110,00, vorläufig 33,60 €; 2025 Fondstyp Aktienfonds, Felder leer / 100,00, „–“. Das sind die Vorbelegungen aus Schritt 1 und 3.

Die Kacheln werden über ihre `data-testid` angesprochen und auf Beschriftung und Betrag am Anfang der Kachel geprüft, damit etwa „10,00 €“ nicht als „0,00 €“ durchgeht.

Der E2E-Test „Angesetzte Vorabpauschalen mindern den Veräußerungsgewinn, Andere Datei setzt sie zurück“ prüft dasselbe für die Eingabe je Verkauf: nach 25,30 € (Gewinn 174,70 €), „Andere Datei“ und erneutem Laden ist das Feld leer und der Gewinn wieder 10 × (120 − 100) = 200,00 €. Die Buchungsschlüssel (`sc-<Zeile>`) sind bei derselben Datei gleich, eine vergessene Rücksetzung würde den alten Betrag also wieder abziehen.

Zurückgesetzt wird an zwei Stellen in `DepotDoktorApp.tsx`: in `reset` („Andere Datei“) und in `loadText`. Das Dateifeld gibt es nur in der Ansicht ohne Report, und aus dem Report führt nur „Andere Datei“ dorthin. Eine zweite Datei lässt sich also nicht laden, ohne vorher `reset` auszulösen; die Rücksetzung in `loadText` ist über die Oberfläche nicht getrennt beobachtbar und bleibt als Absicherung stehen. Mutationsprüfung in einer Kopie außerhalb des Repos (nur die beiden E2E-Tests mit „Andere Datei“, ohne Wiederholungen, `next build` und `next start`):

| Mutation | Ergebnis |
|---|---|
| unverändert | grün |
| Rücksetzung der Steuereingaben in `reset` und `loadText` entfernt | rot: Fondstyp „mixed“ statt „equity“ |
| nur in `reset` entfernt | grün (`loadText` setzt zurück) |
| nur in `loadText` entfernt | grün (`reset` setzt zurück) |
| `setSaleCredits({})` in `reset` und `loadText` entfernt | rot: Feld zeigt „25,30“ statt leer |

## Sicherheit

Antwort-Header aus `apps/web/next.config.ts` (Stand 07.10.2026): Content-Security-Policy mit `default-src 'self'`, `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` (in der Entwicklung zusätzlich `'unsafe-eval'` für das Hot Reloading von Next.js, in Produktion nicht), `connect-src 'self' data:`, `object-src 'none'`, `frame-ancestors 'none'`; dazu X-Content-Type-Options, X-Frame-Options `DENY`, Referrer-Policy, Permissions-Policy `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` (statt des veralteten `interest-cohort=()`, gleich in K1, K2 und K3), Strict-Transport-Security mit `max-age=63072000` und Cross-Origin-Opener-Policy `same-origin`.

Entscheidung zur CSP (07.10.2026): keine Nonce-CSP, sie würde alle Seiten dynamisch machen. script-src enthält unsafe-inline, weil Next.js beim statischen Prerendering Inline-Skripte erzeugt; die Seite rendert keine Nutzereingaben ins DOM, Risiko gering; wasm-unsafe-eval für den PDF-Renderer.

## Nachkontrolle 07.10.2026

Umsetzung der Befunde einer externen Nachkontrolle von Live-Seite, Repository und Inhalt. Für jede fachliche Änderung steht unten die Rechtsgrundlage, die Handrechnung und der Unterschied alt/neu. Alle Zahlen „neu“ sind durch Unit-Tests mit ausgeschriebener Rechnung abgesichert; die Werte „alt“ sind mit der vorherigen Implementierung nachgerechnet.

### Ausschüttungen brutto (§ 2 Abs. 11 InvStG)

Rechtsgrundlage: § 2 Abs. 11 InvStG definiert Ausschüttungen als die dem Anleger gezahlten oder gutgeschriebenen Beträge einschließlich des Steuerabzugs auf den Kapitalertrag. § 18 Abs. 1 InvStG zieht diese Ausschüttungen vom Basisertrag ab.

Bisher summierte `tax/positions.ts` je Ausschüttung nur `|amount|`. DepotDoktor behandelt `amount` als Nettobetrag (die Kachel heißt „Dividenden netto“), der Steuerabzug steht in der Spalte `tax`. Neu: `|amount| + |tax|`. Steuerreiter und PDF nennen den Betrag „Ausschüttungen <Jahr> (brutto, vor Steuerabzug)“, bei Fondstyp „kein Fonds“ „Dividenden <Jahr> (brutto, vor Steuerabzug)“ ohne den Zusatz „mindern den Basisertrag“.

| Fall | alt | neu | Handrechnung neu |
|---|---|---|---|
| Basisertrag 224,00 €, Ausschüttung netto 122,31 € mit 27,69 € Steuerabzug, Wertzuwachs über 224 € | 224,00 − 122,31 = 101,69 € | 74,00 € | 100 × 100 × 3,2 % × 0,7 = 224,00; brutto 122,31 + 27,69 = 150,00; 224,00 − 150,00 = 74,00 |
| dieselbe Ausschüttung ohne Steuerabzug (150,00 €) | 74,00 € | 74,00 € | unverändert |
| Dividende Musterwerk AG in der Trade-Republic-Testdatei (18,50 € netto, 6,50 € Steuer) | 18,50 € | 25,00 € | Aktie, keine Vorabpauschale; nur die Anzeige ändert sich |

Tests: `distributions.test.ts` (auch Steuerabzug mit negativem Vorzeichen und Ausschüttung eines anderen Jahres), `positions.test.ts`. Offener Prüfpunkt: „Zu verifizieren an echten Exporten“, Punkt 6.

Reihenfolge Ausschüttung und Deckel, zur README-Formel: Basisertrag 224 €, Wertzuwachs 150 €, Ausschüttungen 100 € ergibt min(224 − 100, 150) = 124,00 € (Test in `distributions.test.ts`). Das entspricht § 18 Abs. 1 Satz 1 und 3 InvStG: Der Basisertrag ist höchstens der Mehrbetrag aus Wertzuwachs plus Ausschüttungen, die Vorabpauschale ist der Betrag, um den die Ausschüttungen den Basisertrag unterschreiten.

### Zwölftelung im Erwerbsjahr (§ 18 Abs. 2 InvStG)

Rechtsgrundlage: § 18 Abs. 2 InvStG, „Im Jahr des Erwerbs der Investmentanteile vermindert sich die Vorabpauschale um ein Zwölftel für jeden vollen Monat, der dem Monat des Erwerbs vorangeht.“ Gekürzt wird also die Vorabpauschale nach Abzug der Ausschüttungen und nach dem Deckel, nicht der Basisertrag.

Standard in `tax/vorabpauschale.ts` jetzt `reductionTarget: "vorabpauschale"`. Die Formel lautet für einen Kauf im Monat m: (min(Basisertrag − Ausschüttungen, Wertzuwachs), nie unter 0) × (13 − m)/12.

| Fall (Kauf im Juli, 6 Monate entfallen, Basis 10.000 €, Basiszins 3,2 %) | alt (Basisertrag gekürzt) | neu (Vorabpauschale gekürzt) | Handrechnung neu |
|---|---|---|---|
| Wertzuwachs 1.500 € | 112,00 € | 112,00 € | min(224, 1.500) × 6/12 = 112,00 |
| Wertzuwachs 150 € (Deckel greift) | 112,00 € | 75,00 € | min(224, 150) × 6/12 = 75,00; steuerpflichtig 52,50 €, Steuer 13,85 € |
| Wertzuwachs 1.500 €, Ausschüttungen 100 € | (112 − 100) = 12,00 € | 62,00 € | (224 − 100) × 6/12 = 62,00 |
| Testfall „über Jahresgrenze“ (`positions.test.ts`): Bestand 15 @ 90 → 100, Kauf 10 Anteile am 15.07.2026 | Basisertrag 10,08 €, Vorabpauschale 10,08 € | Basisertrag 20,16 €, Vorabpauschale 10,08 € | 10 × 90 × 3,2 % × 0,7 = 20,16; × 6/12 = 10,08; Zuwachs deckelt nicht, Ergebnis gleich |

Die Variante „basisertrag“ ist weiter getestet (112,00 € bei 150 € Zuwachs). Texte in Steuerreiter, PDF und README: „Bei Kauf im Jahr wird die Vorabpauschale um 1/12 je vollen Monat vor dem Kaufmonat gekürzt (§ 18 Abs. 2 InvStG).“

### TTWROR: Zufluss in ein leeres Depot zu Periodenbeginn

Konvention: Zuflüsse werden zu Periodenbeginn angesetzt, wenn die Periode ohne Bestand beginnt (erster Kauf, Kauf nach Vollverkauf); auch die Gebühr des ersten Kaufs mindert die TTWROR. Bisher wurde eine Periode mit Startwert 0 übersprungen, die Kaufgebühr des ersten Kaufs (Zufluss 8.001 €, Wert 8.000 €) ging nicht ein, die Gebühr jedes späteren Kaufs aber schon. Neu in `metrics/ttwror.ts`: Periodenrendite = Endwert / Zufluss − 1 für eine Periode mit Startwert 0 und Zufluss > 0. Max Drawdown (`metrics/drawdown.ts`) verkettet dieselben Perioden.

| Kennzahl, Trade-Republic-Testdatei | alt | neu | Handrechnung neu |
|---|---|---|---|
| TTWROR | 2,4084 % (+2,41 %) | 2,3956 % (+2,40 %) | 8000/8001 × 7999/8000 × 9018,5/9000 × 9199/9000 − 1 |
| Max Drawdown | 0,0125 % (−0,01 %) | 0,0250 % (−0,02 %) | 1 − 8000/8001 × 7999/8000 = 1 − 7999/8001, Hoch 06.01., Tief 10.02. |
| TTWROR Scalable-Testdatei | 2,4086 % (+2,41 %) | 2,3960 % (+2,40 %) | 8000/8000,99 × 7999,01/8000 × 9018,5/9000 × 9199,01/9000 − 1 |
| Kauf nach Vollverkauf (1001 → 1100, 501 → 500, Zukauf 110 → 660) | 1100/1000 × 550/500 − 1 = 21,00 % | 20,64 % | 1000/1001 × 1100/1000 × 500/501 × 550/500 − 1 |

### Bewertungspunkte nur an Depotbuchungen

Bisher wurde jeder Buchungstag ein Bewertungspunkt, auch Einzahlung, Zinsen, Kartenzahlung und eine Einbuchung ohne ISIN. Das widersprach der Entscheidung „Kontobuchungen fließen nicht ein“ (oben, Punkt 1): Kontobuchungen bestimmten Zeitraum und Endzeitpunkt des IRR, und die 0-%-Perioden an Kontotagen drückten die Volatilität. Neu in `portfolio.ts`: Bewertungspunkte nur an Tagen mit Kauf, Verkauf, Ausschüttung oder Gebühr, Steuer bzw. Einbuchung mit ISIN; Gebühren und Steuern ohne ISIN sind keine Depot-Zahlungsströme mehr. Der Zeitraum beginnt am ersten Kauf und endet an der letzten Depotbuchung. Die Kontokennzahlen (Einzahlungen 10.000 €, Zinsen 3,21 €) bleiben unverändert. Die IRR-Kachel nennt „bewertet zum letzten Kurs im Export, Stand <Datum>“, darunter steht „Der IRR p. a. hängt vom Endzeitpunkt ab.“

| Kennzahl | alt Trade Republic | alt Scalable | neu (beide) | Handrechnung neu |
|---|---|---|---|---|
| Zeitraum | 05.01.–02.08.2026 | 05.01.–01.07.2026 | 06.01.–20.06.2026 | erster Kauf bis Verkauf |
| Bewertungspunkte | 8 | 6 | 4 | 06.01., 10.02., 15.03., 20.06. |
| IRR p. a. | 4,38 % | 5,17 % | 5,51 % (TR 5,5125 %, Scalable 5,5133 %) | Zahlungsströme −8.001 (Tag 0), −1.001 (Tag 35), +18,50 (Tag 68), +479 und Endwert 8.720 (Tag 165); Tage/365 |
| Volatilität p. a. | 1,90 % | 2,06 % | 2,32 % | drei Perioden mit 35, 33 und 97 Tagen, je Rendite/√(Tage × 252/365), Stichproben-Standardabweichung × √252 |

Test: `portfolio.test.ts` (gleicher Zeitraum beider Testdateien, IRR-Abweichung höchstens 0,01 Prozentpunkte).

### TTWROR und IRR gekennzeichnet

Unter einem Jahr heißt die Kachel „TTWROR (kumuliert)“ mit „nicht annualisiert, Zeitraum unter 1 Jahr“, ab einem Jahr „TTWROR (p. a.)“ mit dem kumulierten Wert im Hinweis. Die IRR-Kachel heißt „IRR (geldgewichtet, p. a.)“. Darunter steht: „Die TTWROR misst die Wertentwicklung unabhängig davon, wann Sie Geld investiert haben; der IRR berücksichtigt Zeitpunkt und Höhe Ihrer Käufe und Verkäufe.“ Ansicht und PDF nutzen dieselbe Quelle (`lib/depotdoktor/kpis.ts`).

### Steuerreiter ohne Schein-Ergebnis

Bisher waren Kurs 01.01. und Kurs 31.12. mit demselben letzten Kurs bis Jahresende vorbelegt, die Kacheln zeigten ohne Eingabe 0,00 €, und der Kurs 01.01. konnte aus dem laufenden Jahr stammen. Neu:

- Kurs 01.01. eines Jahres J nur aus dem letzten Kurs mit Datum ≤ 31.12.(J−1), sonst leer; Kurs 31.12. nur aus Kursen ≤ 31.12.J.
- Fehlt ein Kurs oder stammen beide unverändert aus derselben Buchung, zeigen die drei Steuerkacheln und das PDF „–“ mit „Kurse eintragen“ statt 0,00 €. Seit der Nachbesserung gilt das nicht für Positionen ohne Bestand am 31.12.; sie brauchen keine Kurse (Abschnitt „Nachbesserung 07.10.2026“).
- Vorbelegte, unveränderte Kurse tragen das Etikett „vorläufig (Kurs aus dem Export)“, ebenso die Kacheln, solange ein Wert vorbelegt ist.
- Die Option heißt „Kein Fonds (Aktie, Anleihe)“; „keine Vorabpauschale“ steht im Hinweis darunter.

| Fall | alt | neu |
|---|---|---|
| Beispieldatei 2026, ETF gekauft am 06.01.2026 | Kurse 80,00 / 80,00, Kacheln 0,00 € | Kurs 01.01. leer, Kacheln „–“ und „Kurse eintragen“ |
| Kauf 03.03.2025 @ 100, Kauf 15.01.2026 @ 110, Jahr 2026 | 110,00 / 110,00, 0,00 € | 100,00 / 110,00 vorläufig, 33,60 €, steuerpflichtig 23,52 €, Steuer 6,20 € |
| dieselbe Datei, Jahr 2025 | 100,00 / 100,00, 0,00 € | leer / 100,00, „–“ |
| nur Kauf 03.03.2025 @ 100, Jahr 2026 | 100,00 / 100,00, 0,00 € | beide aus derselben Buchung, „–“ |

Handrechnung vorläufig 2026: 10 × 100 × 3,2 % × 0,7 = 22,40 plus 5 × 100 × 3,2 % × 0,7 = 11,20, zusammen 33,60; × 0,7 = 23,52; × 26,375 % = 6,2034. Tests: `tax-prefill.test.ts`, `tax-inputs.test.ts`, `sale-credit.test.ts`.

### Beispieldatei

Die Beispieldatei ist jetzt die synthetische Trade-Republic-Datei (byte-gleich mit `packages/csv/fixtures/traderepublic-synthetic.csv`, 8 Zeilen, keine übersprungen) statt der Scalable-Datei (7 Zeilen, 1 übersprungen). Sie liefert Assetklassen: Musterwerk AG ist automatisch „Kein Fonds“, die Allokation zeigt ETF und Aktien statt 100 % „Nicht zugeordnet“. Beim Scalable-Upload erscheinen die Hinweise zu Fondstyp und Assetklasse.

### PDF-Report

Zwölf Kennzahlen in drei Reihen (neu: Gebühren, Abgeführte Steuern, Einzahlungen Konto, Zinsen Konto), Erklärsatz unter den Kennzahlen, „n übersprungen“ in der Quellzeile, Hinweise beim Einlesen unter „Hinweise zur Berechnung“, Kurzköpfe „Vorabpausch.“ und „Steuerpfl.“ mit Innenabstand in der Steuertabelle, Fußzeile „Erstellt mit DepotDoktor · depotdoktor.vercel.app/projects/depotdoktor“ auf jeder Seite (Adresse aus `apps/web/lib/site.ts`).

Bekannt, nicht behoben (offen): Die Seitenzahl „Seite x von y“ unten rechts erscheint im PDF nicht, weder im Textauszug noch im gerenderten Seitenbild. Das war schon vor der Nachkontrolle so (geprüft mit der vorherigen `ReportDocument.tsx`); die `render`-Funktion von @react-pdf/renderer 4.9 mit @react-pdf/layout 5.2 liefert hier keinen Text. Ein Versuch mit fester Breite und mit `View` statt `Text` änderte nichts. Die übrigen Fußzeilen (Disclaimer, „Erstellt mit DepotDoktor · …“) stehen auf jeder Seite.

### Netzwerk-Wächter

Der E2E-Test „Beispieldatei: Report mit allen Kennzahlen, kein Upload“ sammelt nach dem Laden der Seite jede Anfrage. Erlaubt sind nur GET-Anfragen an denselben Origin (aus `baseURL`, Port über `PORT`) mit Pfad `/_next/static/` oder Parameter `_rsc`; keine Anfrage darf Inhalte der Datei (ISIN, Positionsnamen) in URL oder Body tragen. Geprüft wird nach Beispieldatei, allen vier Reitern, PDF- und CSV-Export. Mutationsprüfung am 07.10.2026: Ein testweise eingebautes `fetch("https://example.org/leak", { method: "POST" })` blockiert die CSP, bevor eine Anfrage entsteht; Playwright meldet sie deshalb weder als `request` noch als `requestfailed`. Der Test sammelt darum zusätzlich `securitypolicyviolation`-Ereignisse und Konsolenfehler; mit der Mutation schlug er fehl („connect-src https://example.org/leak“), ohne sie ist er grün.

### README-Screenshots

`docs/screenshots/performance.png` und `steuer.png` sind neu erzeugt: Playwright gegen `next start` (Port 3101), Viewport 1280 px, Skalierung 1,5, Beispieldatei (Trade-Republic-Testdatei), im Steuerreiter Beispielkurse für den ETF (Kurs 01.01.2026: 80,00 €, Kurs 31.12.2026: 95,00 €). Die Kacheln haben jetzt Innenabstand (Tailwind-Klassen aus `packages/` werden gescannt), die Werte entsprechen den E2E-Erwartungen.

### Abhängigkeiten und Audit

`next` und `eslint-config-next` 15.5.27, `react` und `react-dom` 19.3.0, `@playwright/test` 1.63.0. Overrides: `postcss >=8.5.23`, `sharp >=0.35.5`, `source-map-js >=1.2.2`, `brace-expansion@1 ^1.1.21`, `brace-expansion@5 ^5.0.12`; `braces` hat laut Advisory keinen Patch und wird nicht überschrieben. `pnpm.onlyBuiltDependencies` erlaubt nur `esbuild` und `unrs-resolver`. Ergebnis: pnpm audit: nur braces über eslint-config-next (Dev, ohne Patch); `pnpm audit --prod` meldet 0.

### Prüfergebnisse der Nachkontrolle

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234, E2E mit `CI=true` gegen `next start`.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | vorher 168 Tests grün (csv 50, pdf 1, web 117) und 1 offener `todo`; jetzt 223 Tests grün (csv 50, pdf 2, web 171) und 1 offener `todo` |
| `pnpm build` | grün |
| `pnpm test:e2e` mit `CI=true` und `PORT=3101` | vorher 11 Tests grün; jetzt 28 Tests grün (`depotdoktor.spec.ts` 14, `site.spec.ts` 14) |
| axe-core (WCAG 2.2 AA und Best Practices) bei 390, 768 und 1280 px: Startseite, Projektseite ohne Datei und mit Beispieldatei in allen vier Reitern, drei Rechtsseiten, 404 | 0 Verstöße |

## Nachbesserung 07.10.2026

Befunde einer zweiten Prüfung des Stands nach der Nachkontrolle. Jede fachliche Änderung hat einen Unit-Test mit ausgeschriebener Rechnung. Die Werte „alt“ stammen aus einer Probe gegen den Code vor der Nachbesserung. Gegenprobe am 07.10.2026: Setzt man jeweils die alte Rechenregel wieder ein, schlagen die neuen Tests fehl (Verkauf ohne Steuer im Erlös: 2 Tests in `positions.test.ts`; Ausschüttungen auf den Bestand am 31.12. verteilt: 3 Tests in `distributions.test.ts`; Kurse auch ohne Bestand am 31.12. verlangt: 4 Tests in `tax-prefill.test.ts`; Drawdown-Hinweis als Datumsbereich: 1 Test in `kpis.test.ts`); mit der neuen Regel sind alle grün.

### Ausschüttungen je Anteil zum Zahltag (§ 18 Abs. 1, § 2 Abs. 11 InvStG)

Bisher verteilte `tax/positions.ts` die Ausschüttungen des Jahres gleichmäßig auf den Bestand am 31.12. (`distributionsInYear / Stück am Jahresende`). Nach einem Teilverkauf wurden dadurch auch die Ausschüttungen auf verkaufte Anteile den verbliebenen Anteilen gutgeschrieben, nach einem Nachkauf erhielten die neuen Anteile einen Teil der früheren Ausschüttung. Neu: Jede Ausschüttung im Steuerjahr wird brutto durch die Stückzahl der Buchung geteilt (ohne Stückzahl: durch die am Zahltag gehaltenen Anteile) und jeder Tranche gutgeschrieben, die am Zahltag im Bestand ist (`distributionsPerShareInYear` in `tax/fifo.ts`). Die Vorabpauschale je Teil rechnet mit Stück × Ausschüttung je Anteil dieser Tranchen. Zur Lesart bei Nachkauf nach einer Ausschüttung siehe „Zu verifizieren“, Punkt 6.

| Fall (Kurs 100 → 110, Basiszins 3,2 %, Aktienfonds) | alt | neu | Handrechnung neu |
|---|---|---|---|
| 200 Anteile aus 2025, 200 € Ausschüttung im März, Verkauf von 100 Anteilen im Juni | 24,00 € | 124,00 € | 200 / 200 = 1,00 € je Anteil; 100 × (100 × 3,2 % × 0,7 − 1,00) = 124,00 |
| derselbe Fall ohne Stückzahl in der Ausschüttungsbuchung | 24,00 € | 124,00 € | 200 € / 200 gehaltene Anteile = 1,00 € |
| 100 Anteile aus 2025, 100 € Ausschüttung im März, Kauf von 100 Anteilen im September | 174,00 + 58,00 = 232,00 € | 198,67 € | Bestand 100 × (2,24 − 1,00) = 124,00; Septemberkauf 100 × 2,24 × 4/12 = 74,67 |
| Januarkauf 100 Anteile, Ausschüttung 73,63 € netto plus 26,37 € Steuerabzug | 124,00 € | 124,00 € | (73,63 + 26,37) / 100 = 1,00 € je Anteil; 100 × (2,24 − 1,00) |

Steuerreiter und PDF nennen weiter die Ausschüttungen des Jahres brutto; entfällt ein Teil auf Anteile, die am 31.12. nicht mehr oder noch nicht im Bestand sind, steht dahinter „davon … auf Anteile im Bestand am 31.12. (mindern den Basisertrag)“. Tests: `distributions.test.ts`, Abschnitt „Ausschüttungen je Anteil zum Zahltag“.

### Veräußerungsgewinn vor Steuerabzug (§ 20 Abs. 4 EStG)

Bisher ging bei Verkäufen nur `|amount|` als Erlös in die FIFO-Rechnung ein. DepotDoktor behandelt `amount` als Zahlungseingang nach Gebühr und Steuerabzug (wie bei Ausschüttungen); die abgeführte Steuer minderte damit den Gewinn, obwohl sie keine Veräußerungskost ist. Neu: Erlös = `|amount| + |tax|`. Die Kachel „Verkaufserlöse“ im Performance-Reiter bleibt der Zahlungseingang, die Steuer steht weiter unter „Abgeführte Steuern“.

| Fall | alt | neu | Handrechnung neu |
|---|---|---|---|
| Kauf 10 @ 100 mit 1 € Gebühr (1.001 €), Verkauf 4 @ 120 mit 1 € Gebühr und 20 € Steuerabzug (Buchung 459 €) | Erlös 459,00 €, Gewinn 58,60 € | Erlös 479,00 €, Gewinn 78,60 € | 459 + 20 = 479; 479 − 4 × 100,10 = 78,60 |
| derselbe Verkauf ohne Steuerabzug (Testdateien) | 78,60 € | 78,60 € | unverändert |

Tests: `positions.test.ts`, Abschnitt „Veräußerungsgewinn mit Steuerabzug beim Verkauf“. Offener Prüfpunkt: „Zu verifizieren an echten Exporten“, Punkt 6 (auch das Vorzeichen einer Steuererstattung).

### Kein Bestand am 31.12.: keine Vorabpauschale

Seit der Nachkontrolle setzten fehlende Kurse alle Steuerkacheln auf „–“. Ein Fonds, der im Jahr gekauft und vor dem 31.12. ganz verkauft wurde, hat keinen Kurs vom Vorjahr; er verlangte deshalb Kurse und verdeckte das Ergebnis der übrigen Positionen, obwohl seine Vorabpauschale feststeht. Die Vorabpauschale gilt erst am ersten Werktag des Folgejahres als zugeflossen (§ 18 Abs. 3 InvStG), ohne Bestand am 31.12. fällt also keine an. Neu in `tax/summary.ts`: Ohne Bestand am 31.12. ist die Zeile `notApplicable` (wie „kein Fonds“), die Schätzung ist 0 ohne Teile, und Steuerreiter und PDF zeigen „Keine Vorabpauschale: kein Bestand am 31.12.<Jahr> (§ 18 Abs. 3 InvStG).“ statt „Kurse eintragen“. Vorbelegte Kurse solcher Positionen sind nicht mehr als „vorläufig“ gekennzeichnet. Verkäufe und Gewinne erscheinen unverändert.

| Fall, Steuerjahr 2026 | alt | neu |
|---|---|---|
| Kauf 10 @ 100 am 10.02.2026, Verkauf 10 @ 110 am 20.05.2026 | „missing“, Kacheln „–“ und „Kurse eintragen“ | 0,00 €, vollständig; Gewinn 10 × (110 − 100) = 100,00 € |
| derselbe Fonds neben einem Fonds aus 2025 mit Nachkauf 1 @ 110 im Mai | Kacheln „–“ | vorläufig 23,89 € (10 × 100 × 3,2 % × 0,7 = 22,40 plus 1 × 2,24 × 8/12 = 1,4933) |
| Bestand 10 @ 100 aus 2025, im Mai 2026 ganz verkauft @ 120 | „vorläufig“, 0,00 € | 0,00 €, vollständig; Gewinn 200,00 € |

Tests: `tax-prefill.test.ts`, Abschnitt „Kein Bestand am 31.12.“, dazu der E2E-Test „Angesetzte Vorabpauschalen mindern den Veräußerungsgewinn …“ (Hinweistext, Kachel 0,00 €, kein „vorläufig“).

### Max Drawdown am Kauftag

Seit der Nachkontrolle beginnt der Index vor dem ersten Kauf bei 1. Besteht der größte Rückgang nur aus dem Kauftag selbst (Wert nach dem Kauf unter dem gezahlten Betrag, meist die Kaufgebühr), lauteten Kachel und PDF „06.01.2026 → 06.01.2026“. Neu (`kpis.ts`): Bei gleichem Datum steht „am 06.01.2026 (Kauftag)“. Rechenwert unverändert. Test in `kpis.test.ts`: Kauf 100 @ 80 für 8.001 €, Teilverkauf mit Gewinn; 1 − 8000/8001 = 0,0125 % („−0,01 %“). Gleiche Tage entstehen nur bei Perioden, die ohne Bestand mit einem Zufluss beginnen, also an Kauftagen.

### Zugänglichkeit im Steuerreiter

Der Hinweis „Der Scalable-Export unterscheidet nicht zwischen Aktie und Fonds. Bitte prüfen Sie den Fondstyp.“ hängt über `aria-describedby` am Auswahlfeld „Fondstyp“, die Meldung „Kurse eintragen: …“ an beiden Kursfeldern, solange keine Schätzung möglich ist (beim Kursfeld mit vorbelegtem Wert nach „vorläufig (Kurs aus dem Export)“). E2E: Scalable-Test (`toHaveAccessibleDescription` am Fondstyp beider Positionen) und Beispieldatei im Steuerreiter (Beschreibung vor und nach der Kurseingabe).

### Texte

- `README.md`: CSP-Aussage auf Hintergrundanfragen, Subressourcen und Formulare begrenzt; externe Links sind ausgenommen. Klammern in der Allokationszeile aufgelöst, Anführungszeichen beim BaFin-Merkblatt korrigiert.
- Diese Datei: Kopfzeile verlinkt kein Repository (Abschnitt „Texte zu Quellcode und Startseite“), CSP-Aussage im Abschnitt „Gesamtprüfung 06.09.2026“ präzisiert, Quelle des Zwölftelungsfalls „über Jahresgrenze“ korrigiert (`positions.test.ts`, nicht die Trade-Republic-Testdatei).

### Prüfergebnisse der Nachbesserung

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234, E2E mit `CI=true` gegen `next start` auf Port 3000.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 235 Tests grün (csv 50, pdf 2, web 183) und 1 offener `todo` |
| `pnpm build` | grün |
| `pnpm test:e2e` mit `CI=true` | 28 Tests grün (`depotdoktor.spec.ts` 14, `site.spec.ts` 14), darin axe-core bei 390, 768 und 1280 px ohne Verstöße |

## Oberfläche „Navy & Gold“ 07.10.2026

Neugestaltung der Oberfläche (Kopf, Hero, Fuß, Startseite, Reiter, Kacheln, Tabellen, Rechtsseiten, Statusseiten, PDF-Farben) in der Familie mit KontoKlar und NetzRadar. Rechenwerte, Parser, Steuerlogik und Kennzahlen sind unverändert (`apps/web/lib/depotdoktor`, `packages/csv` und `packages/legal` ohne Änderung); Rechtstexte inhaltlich unverändert.

Nur die Darstellung betreffen:

- Kennzahl-Kacheln setzen die Einheit („%“, „€“, „% p. a.“) kleiner neben die Zahl. Der Text bleibt zeichengleich (`splitValueUnit` in `packages/ui/src/value-unit.ts`, Unit-Test `value-unit.test.ts`: Zahl und Einheit ergeben wieder den Ausgangswert). PDF und CSV sind nicht betroffen.
- Im Steuerreiter stehen in Normangaben, Beträgen mit „€“ und „%“ sowie in „1.000 € / 2.000 €“ geschützte Leerzeichen (`keepTogether` in `TaxTab.tsx`), damit „§“ und Zahl nicht getrennt umbrechen. Die Texte aus `tax/summary.ts` werden dafür nur bei der Anzeige umgesetzt.
- Fehlen Kurse, steht über den Steuerkacheln ein Hinweis mit Sprungmarke zur ersten Position ohne Kurs.
- Fehlermeldungen beim Einlesen stehen direkt unter der Ablagefläche und werden ins Bild gescrollt.

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234, E2E mit `CI=true` gegen `next start` auf Port 3401.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 238 Tests grün (csv 50, pdf 2, web 186) und 1 offener `todo` |
| `pnpm build` | grün |
| `pnpm test:e2e` mit `CI=true` | 29 Tests grün (`depotdoktor.spec.ts` 15, `site.spec.ts` 14), darin axe-core bei 390, 768 und 1280 px ohne Verstöße und die Reiter bei 320 px vollständig im Bild |

Die README-Screenshots (`docs/screenshots/performance.png`, `steuer.png`) sind neu erzeugt: Playwright gegen `next start`, Viewport 1280 px, Skalierung 1,5, Beispieldatei, im Steuerreiter Beispielkurse für den ETF (Kurs 01.01.2026: 80,00 €, Kurs 31.12.2026: 95,00 €).

## CSV-Export für deutsches Excel 08.10.2026

Entscheidung vom 08.10.2026 (vom Autor mit „Erledige alles“ an Claude delegiert): „Transaktionen als CSV“ ist eine Datei für Menschen, nicht für Programme. Zielgruppe sind deutsche Privatanleger, die die Datei per Doppelklick in einem Excel mit deutschen Ländereinstellungen öffnen. Maschinenlesbare Rohdaten liefert weiterhin der Original-Export des Brokers.

Begründung: Das bisherige Mischformat (Semikolon und BOM, aber englische Spaltenköpfe, ISO-Datum und Dezimalpunkt) taugte für keinen der beiden Zwecke ganz. Nachprüfbare Probe am 08.10.2026 in Excel 16 (Windows 11, de-DE, Listentrennzeichen „;“; geöffnet über COM mit `Workbooks.Open(…, Local:=True)` wie beim Doppelklick, schreibgeschützt): Die Dateien erzeugte die alte Exportfunktion (`transactionsToCsv` in `apps/web/lib/depotdoktor/export-csv.ts`, Stand von `main` bei Commit 076935b) aus der Beispieldatei und aus `packages/csv/fixtures/scalable-synthetic.csv`.

- Beispieldatei (Trade Republic, 8 Zeilen): In der Betragsspalte wurden `18.5` und `3.21` zu Datumswerten („18. Mai“ = 46160, „Mrz 21“ = 44256), `-42.17` blieb Text; ebenso wurde die Steuer `6.5` zum Datum („06. Mai“) und die Stückzahl `0.000491` blieb Text. Die Summe der Betragsspalte (K2:K9) ergab 91.893 = 10.000 − 8.001 − 1.001 + 46.160 + 44.256 + 479 + 0 statt 1.456,54.
- Scalable-Fixture (6 ausgeführte Zeilen): `-8000.99`, `-1000.99`, `479.01` und die Gebühr `0.99` blieben Text, `18.5` und `3.21` wurden Datumswerte. Summe der Betragsspalte (K2:K7) 100.416 = 10.000 + 46.160 + 44.256 statt 1.498,74.
- Gegenprobe mit denselben Daten im neuen Format: alle Beträge als Zahl, Summe 1.456,54 bzw. 1.498,74 = 10.000 − 8.000,99 − 1.000,99 + 18,50 + 479,01 + 3,21.

In beiden alten Dateien addierte Excel also Datums-Seriennummern zu Geldbeträgen und ließ andere Beträge stillschweigend weg.

### Format

| Merkmal | bis 07.10.2026 | seit 08.10.2026 |
|---|---|---|
| Trennzeichen, Kodierung | Semikolon, UTF-8 mit BOM | unverändert |
| Zeilenende | CRLF | CRLF, auch nach der letzten Zeile |
| Spaltenköpfe | `date;datetime;broker;type;…;source_row` | Datum, Zeitstempel laut Export, Broker, Art, ISIN, Name, Kürzel, Assetklasse, Stück, Kurs, Betrag, Gebühr, Steuer, Währung, Buchungsart laut Export, Zeile im Export |
| Datum | `2026-01-06` | `06.01.2026` |
| Broker, Art, Assetklasse | Schlüssel (`scalable`, `buy`, `unknown`) | Beschriftungen der Oberfläche (Scalable Capital, Kauf, Nicht zugeordnet) |
| Zahlen | `-8000.99` | `-8000,99`: Dezimalkomma, kein Tausenderpunkt, volle Genauigkeit der Daten, keine zusätzliche Rundung |
| Minus | ASCII-Bindestrich | ASCII-Bindestrich (U+002D), nie U+2212 |
| Quoting | bei `;`, `"`, CR und LF, `"` verdoppelt | unverändert |
| Formel-Injektion | Apostroph vor Text mit `=`, `+`, `@`, Tab, CR oder einem Minus ohne folgende Ziffer oder Punkt | Apostroph vor jedem Textfeld, das mit `=`, `+`, `-`, `@`, Tab oder CR beginnt; Zahlenfelder nie |

Einzelheiten:

- Der Zeitstempel bleibt der Rohwert des Brokers (Trade Republic in UTC mit `Z`, Scalable ohne Zeitzone); eine Umrechnung in Ortszeit wäre eine neue Annahme. Excel behandelt ihn als Text.
- Zahlenfelder (Stück, Kurs, Betrag, Gebühr, Steuer, Zeile im Export) erhalten kein Apostroph, weil Excel sonst nicht damit rechnet. Ihre Werte stammen aus `parseDecimal` und haben immer die Form `-?\d+(\.\d+)?`; ein Wert, der nicht so aussieht, wird wie ein Textfeld ausgegeben und entschärft.
- Excel zeigt das Apostroph bei CSV-Dateien in der Zelle an (`'=1+1`). Das ist der übliche Preis dieses Schutzes und betrifft nur Texte, die mit einem der sechs Zeichen beginnen.
- Excel rechnet mit 15 signifikanten Stellen. Die Datei enthält die volle Genauigkeit der Daten; bei längeren Werten kürzt erst Excel.
- Die Beschriftungen für Buchungsart und Broker liegen jetzt in `apps/web/lib/depotdoktor/labels.ts` und gelten gemeinsam für Transaktionsreiter, Dateikopf, PDF und CSV; die Assetklassen kommen aus `ASSET_CLASS_LABELS` in `metrics/allocation.ts`.
- Hinweis unter den Schaltflächen, jetzt als eigene Zeile mit begrenzter Zeilenlänge: „Beide Exporte entstehen im Browser; Ihre Daten werden nicht übertragen. Die CSV ist für Excel mit deutschen Ländereinstellungen eingerichtet (Semikolon, Dezimalkomma).“
- DepotDoktor liest die eigene Exportdatei nicht wieder ein; sie ist kein Broker-Export und wird mit „Das CSV-Format wurde nicht erkannt …“ abgelehnt (am 08.10.2026 mit `parseBrokerCsv` geprüft).

### Tests und Proben

- Unit (`export.test.ts`, Abschnitt „CSV-Export für deutsches Excel“, 13 Tests statt bisher 4): BOM genau einmal (Bytes EF BB BF), Kopfzeile, CRLF ohne einzelnes CR oder LF, Kaufzeile und Einzahlung als ganze Zeile, Dezimalkomma ohne Rundung (`-1234567.891234567` wird `-1234567,891234567`, `0.000491` wird `0,000491`), ASCII-Minus, Quoting (Semikolon, Anführungszeichen, CRLF im Feld; zurückgelesen ergibt sich der Ausgangstext), Injektionsschutz für alle sechs Anfangszeichen, Zahlenfelder ohne Apostroph, Rücklesen der Beispieldatei mit Papa Parse (Kopf plus 8 Zeilen zu je 16 Spalten; Datum, Stück, Kurs, Betrag, Gebühr, Steuer und Quellzeile zurückgewandelt gleich dem Datenmodell) und Erkennung des Semikolons durch Papa Parse ohne Vorgabe, trotz Dezimalkomma.
- E2E (`depotdoktor.spec.ts`, „Beispieldatei: Report mit allen Kennzahlen, kein Upload“): Hinweistext, Dateiname, Bytes EF BB BF, deutsche Kopfzeile, CRLF, kein U+2212, Papa Parse mit Semikolon ergibt 9 Zeilen zu je 16 Spalten, die ETF-Kaufzeile vollständig (`06.01.2026` … `-8001;1;0;EUR;SAVINGS_PLAN/BUY;3`).
- Papa Parse ist dafür als Entwicklungsabhängigkeit von `apps/web` eingetragen, in derselben Version 5.7.0 wie in `packages/csv`.
- Einmalige Probe in Excel 16 (lokal, Windows 11, de-DE; Öffnen über COM mit `Workbooks.Open(…, Local:=True)` wie beim Doppelklick, ohne Speichern geschlossen), nicht automatisiert, weil die CI kein Excel hat. Datei: die Beispieldatei plus eine Zeile mit `Fonds "A"; Klasse B` und Zeilenumbruch im Namen, `=1+1` als Kürzel, `-Buy` als Buchungsart und Betrag `-1234.5678`. Ergebnis: 10 Zeilen, 16 Spalten; Umlaute in den Spaltenköpfen richtig; Datum als Datumswert (`06.01.2026` = 46028); Stück, Kurs, Betrag, Gebühr, Steuer und Zeile als Zahl (`-8001`, `18,5`, `0,000491`, `-42,17`, `-1234,5678`); der Name mit Semikolon, Anführungszeichen und Zeilenumbruch in einer Zelle; `'=1+1` und `'-Buy` als Text, keine Formel. Summe der Beträge der acht Beispielzeilen 1.456,54 = 10.000 − 8.001 − 1.001 + 18,50 + 3,21 + 479 + 0 − 42,17.

### Weitere Entscheidungen vom 08.10.2026

- Abschnitt „Rechtstexte“, Punkt 1: Die frühere Abwägung zur Impressumspflicht ist durch einen Statussatz ersetzt (Impressum nennt Name, Ort und E-Mail; Entscheidung des Autors vom 07.10.2026). Punkt 4 ist sachlich gefasst (Ort der Kontaktadresse im Code statt persönlicher Notiz). Die Rechtstexte selbst sind unverändert.
- `CLAUDE.md` bleibt bereinigt öffentlich, als transparenter Nachweis KI-gestützter Arbeit; Rechnerspezifisches steht weiter nur in der nicht versionierten `CLAUDE.local.md`.

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234, E2E mit `CI=true` gegen `next start` auf Port 3601.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün (Lockfile um `papaparse` und `@types/papaparse` für `apps/web` ergänzt) |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 247 Tests grün (csv 50, pdf 2, web 195) und 1 offener `todo`; vorher 238 (web 186) |
| `pnpm build` | grün |
| `pnpm test:e2e` mit `CI=true` | 29 Tests grün im ersten Durchlauf, ohne Wiederholung (`depotdoktor.spec.ts` 15, `site.spec.ts` 14), darin axe-core bei 390, 768 und 1280 px ohne Verstöße |
| `pnpm audit --prod` / `pnpm audit` | keine Meldung / nur braces über eslint-config-next (unverändert) |

Mutationsprobe am 08.10.2026 (je eine Änderung in `export-csv.ts`, danach wiederhergestellt): Minus ohne Schutz, Dezimalpunkt statt Komma, LF statt CRLF, ohne BOM, Zeilenumbruch ohne Anführungszeichen, Apostroph auch vor Zahlen und Minus als U+2212 lassen jeweils Tests in `export.test.ts` fehlschlagen.

Nachkontrolle nach der Prüfung am 08.10.2026: Excel-Probe zum alten Format mit den Dateien im Repo nachgestellt und nachprüfbar eingetragen (Abschnittsanfang), Umlaute im E2E-Test als echte Zeichen statt Escape-Sequenzen, Punkt 4 der Rechtstexte sachlich gefasst, Ablehnungsmeldung im README wörtlich zitiert. Danach alle Schritte der Tabelle erneut ausgeführt, Ergebnis unverändert: `install --frozen-lockfile`, `typecheck`, `lint` und `build` grün, 247 Unit-Tests grün und 1 offener `todo`, 29 E2E-Tests grün im ersten Durchlauf, `pnpm audit` wie oben.

## Restliche Entscheidungen 08.10.2026

Der Autor hat am 08.10.2026 mit „Erledige auch die restlichen offenen Punkte“ die vier noch offenen Punkte an Claude delegiert. Die Entscheidungen sind unten begründet; `CLAUDE.md` (Abschnitt „Offene Entscheidungen“) und das README verweisen hierher. Keine Rechenregel der Vorabpauschale hat sich geändert; geändert haben sich die Vorbelegung des Steuerjahres und die des Fondstyps bei Positionen ohne Assetklasse. Rechtstexte und `packages/legal` sind unverändert.

### 1. Vorbelegung des Steuerjahres

Entscheidung: Vorbelegt ist das letzte abgeschlossene Kalenderjahr, an dessen Ende (31.12.) Wertpapiere im Bestand waren. Gibt es keins, ist es das Jahr der letzten Depotbuchung; vorbelegte Kurse tragen dann wie bisher das Etikett „vorläufig (Kurs aus dem Export)“.

Begründung: Die Vorabpauschale eines Jahres hängt vom letzten im Kalenderjahr festgesetzten Rücknahmepreis ab (§ 18 Abs. 1 Satz 3 InvStG) und gilt am ersten Werktag des Folgejahres als zugeflossen (§ 18 Abs. 3 InvStG). Für ein laufendes Jahr gibt es diesen Kurs noch nicht; jede Zahl ist eine Vorschau. Für das letzte abgeschlossene Jahr steht er fest, und die Bank hat die Vorabpauschale bereits abgerechnet oder rechnet sie gerade ab; der Wert lässt sich also mit der eigenen Abrechnung vergleichen. Ohne Bestand am 31.12. eines abgeschlossenen Jahres gab es dort keine Vorabpauschale (BMF Rz. 18.4: Rundung erst nach Multiplikation mit den „mit Ablauf des 31. Dezember … verwahrten“ Anteilen; DepotDoktor zeigt in diesem Fall „kein Bestand am 31.12.“); dann ist das Jahr der letzten Depotbuchung das aussagekräftigere, meist das laufende.

Regel im Code (`apps/web/lib/depotdoktor/tax/year.ts`, `defaultTaxYear`):

1. Wählbar sind nur Jahre mit hinterlegtem Basiszins (`TAX_YEARS`, derzeit 2026 und 2025).
2. Abgeschlossen ist ein Jahr, das vor dem Jahr des heutigen Datums liegt (Uhr des Geräts). Unter den abgeschlossenen, wählbaren Jahren gewinnt das neueste, in dem am 31.12. mindestens eine Position Stücke hatte (FIFO-Bestand aus Käufen und Verkäufen, wie im Steuerreiter).
3. Sonst das Jahr der letzten Depotbuchung (Kauf, Verkauf, Ausschüttung; Gebühr, Steuer oder Sonstiges wie eine Einbuchung, jeweils mit ISIN; dieselbe Regel `isDepotBooking` in `portfolio.ts` wie bei den Bewertungspunkten); Kontobuchungen zählen nicht. Liegt es nach dem neuesten wählbaren Jahr, gilt das neueste wählbare Jahr, liegt es davor, das älteste.
4. Ohne Depotbuchung das neueste wählbare Jahr (bisheriges Verhalten).

Das Jahr wird beim Laden einer Datei gesetzt; ein Wechsel im Auswahlfeld bleibt bis zur nächsten Datei bestehen. Ist das gewählte Jahr nicht abgeschlossen, steht unter dem Auswahlfeld „Das Steuerjahr 2026 läuft noch. Den Kurs am 31.12.2026 gibt es erst nach Jahresende; bis dahin ist die Vorabpauschale 2026 eine Vorschau.“ (gold-deep auf surface, nachgerechnet 5,87:1), im PDF an der Kachel Vorabpauschale „Steuerjahr läuft noch“ (maßgeblich ist dort das Erstellungsdatum). Der Status „vollständig“ bei selbst eingetragenen Kursen bleibt unverändert. Der Methodenhinweis (Ansicht und PDF) nennt die Regel.

| Fall (Datum 08.10.2026) | alt | neu |
|---|---|---|
| Beispieldatei (Trade Republic, alle Buchungen 2026) | 2026 | 2026 (Jahr der letzten Depotbuchung), mit Hinweis „läuft noch“ |
| Kauf 10 @ 100 am 03.03.2025, Kauf 5 @ 110 am 15.01.2026 | 2026 | 2025 (Bestand am 31.12.2025) |
| Kauf 2025, Vollverkauf 15.12.2025, Kauf 2026 | 2026 | 2026 (kein Bestand am 31.12.2025) |
| Kauf und Vollverkauf 2025, Zinsen und Einzahlung 2026 | 2026 | 2025 (Kontobuchungen zählen nicht) |
| Kauf 2023 ohne Verkauf | 2026 | 2025 |
| am 04.01.2027: Kauf 2026 | 2026 | 2026 (jetzt abgeschlossen; 2027 hat noch keinen Basiszins) |

Tests: `tax-year.test.ts` (13 Tests, alle Fälle der Tabelle, dazu Kauf 2027 ohne früheren Jahresendbestand, letzte Depotbuchung vor 2025, keine Depotbuchung, laufendes Jahr, PDF-Hinweis). Die E2E-Tests stellen die Uhr des Browsers mit `page.clock.setFixedTime` auf den 08.10.2026, damit die Vorbelegung nicht vom Tag des Testlaufs abhängt; geprüft werden 2026 für die Beispieldatei und die Scalable-Testdatei, 2025 für die Dateien mit Kauf 2025 sowie der Hinweis zum laufenden Jahr.

### 2. Fondstyp bei Positionen ohne Assetklasse

Entscheidung: wie vom Autor vorgeschlagen keine stille Annahme mehr. Nennt der Export keine Assetklasse (`unknown`, im Scalable-Export bei allen Wertpapieren mit `assetType = Security`), ist kein Fondstyp vorbelegt. Das Auswahlfeld zeigt „Bitte wählen“; bis zur Wahl zeigen die drei Steuerkacheln und das PDF „–“ mit „Fondstyp wählen“, im gleichen Muster wie „Kurse eintragen“.

Begründung: Die Teilfreistellung hängt am Fondstyp (§ 20 InvStG: 30 % Aktienfonds, 15 % Mischfonds, 60 % bzw. 80 % Immobilienfonds, 0 % sonst). Eine Aktie als Aktienfonds ergibt eine Vorabpauschale, die es nicht gibt; ein Renten-ETF als Aktienfonds unterschätzt die Steuer um 30 %. Ein vorbelegter Wert sah wie ein Ergebnis aus, obwohl ihn niemand geprüft hatte.

Prüfung von Bedienbarkeit und Tests: Bei der Scalable-Testdatei sind zwei Auswahlen nötig, danach rechnet der Reiter wie bisher. Eine Wahl wird nur verlangt, wo sie das Ergebnis ändert: Positionen ohne Bestand am 31.12. haben unabhängig vom Fondstyp keine Vorabpauschale (`notApplicable`) und blockieren die Kacheln nicht. Das Feld für angesetzte Vorabpauschalen beim Verkauf erscheint erst nach der Wahl eines Fonds-Typs, weil es für Aktien keine Vorabpauschalen gibt; ohne Eingabe wird ohnehin nichts abgezogen. Damit das fehlende Feld nicht unbemerkt bleibt, steht bei einem Verkauf, der Anteile aus Vorjahren enthält, bis zur Wahl unabhängig vom Broker der Hinweis „Für Fondsanteile: Wählen Sie oben den Fondstyp, um die in Vorjahren angesetzten Vorabpauschalen einzutragen. Sie mindern den Gewinn (§ 19 Abs. 1 Satz 3 InvStG); bis dahin wird nichts abgezogen.“ mit der Sprungmarke „Zum Fondstyp“ (Nachbesserung nach der Prüfung, siehe unten). Erwogen und verworfen: den Fondstyp aus Name oder ISIN raten („UCITS ETF“, Länderkennung IE oder LU). Das bleibt eine Annahme, die bei Renten-, Misch- und in Deutschland aufgelegten ETFs falsch liegt.

Zugänglichkeit: Das Auswahlfeld behält den Namen „Fondstyp“ (`label`). Solange eine Wahl nötig ist, hat es `aria-invalid="true"` (Rahmen in wine wie bei ungültigen Eingaben) und über `aria-describedby` den Scalable-Hinweis und die Meldung „Fondstyp wählen: Der Export nennt für diese Position keine Assetklasse. Bis Sie den Fondstyp wählen, wird nichts geschätzt, denn eine falsche Teilfreistellung verfälscht die Steuer. Für Aktien und Anleihen wählen Sie „Kein Fonds (Aktie, Anleihe)“.“ Die Meldung steht an der Stelle der Ergebnistabelle, im Stil von „Kurse eintragen“ (wine auf wine-soft/50 über surface, nachgerechnet 8,8:1). Die Option „Bitte wählen“ ist deaktiviert und verschwindet nach der Wahl. Über den Kacheln steht „Wählen Sie unten für Positionen ohne Assetklasse den Fondstyp.“ mit der Sprungmarke „Zum Fondstyp für …“. axe-core prüft diesen Zustand bei 390, 768 und 1280 px; bei 320 px gibt es keinen waagrechten Überlauf. Die Sprungmarke „Zum Fondstyp“ am Verkauf zielt auf das Auswahlfeld selbst (`id` `steuer-position-<n>-fondstyp`); der Browser setzt beim Sprung den Fokus darauf, und ein Abstand nach oben (`scroll-margin`) hält die Beschriftung unter dem klebenden Kopf sichtbar (gemessen bei 1280 px: Kopf endet bei 69 px, Beschriftung beginnt bei 122 px). Das Auswahlfeld bleibt dabei `aria-invalid="false"`, weil die Eingabe optional ist. Der Hinweis steht in gold-deep auf surface (5,87:1) wie der Scalable-Hinweis; auch diesen Zustand prüft axe-core bei 390, 768 und 1280 px, bei 320 px ohne waagrechten Überlauf.

Unverändert: Bei Assetklasse ETF, Fonds, Derivat und Cash ist weiter „Aktienfonds“ vorbelegt, bei Aktie, Anleihe und Krypto „Kein Fonds“. Das README nennt die Vorbelegung bei ETF und Fonds unter „Grenzen“. Seit 22.10.2026 sind Derivate als „Kein Fonds“ vorbelegt und Cash ohne Vorbelegung (Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“).

| Fall | alt | neu |
|---|---|---|
| Scalable-Testdatei, 2026 | beide Positionen „Aktienfonds“, Kacheln „–“ mit „Kurse eintragen“ | beide „Bitte wählen“, Kacheln „–“ mit „Fondstyp wählen“; nach „Kein Fonds“ für die Aktie und „Aktienfonds“ für den ETF „Kurse eintragen“, mit 80,00 € / 95,00 € 179,20 €, 125,44 €, 33,08 € |
| Scalable, Kauf 10 @ 100 am 03.03.2025, Kauf 5 @ 110 am 15.01.2026, Jahr 2026 | vorläufig 33,60 €, 23,52 €, 6,20 € | „–“ mit „Fondstyp wählen“; nach „Aktienfonds“ 33,60 €, 23,52 €, 6,20 € wie bisher |
| Scalable, Kauf 2025, Vollverkauf 2026, Jahr 2026 | 0,00 €, Feld für angesetzte Vorabpauschalen sichtbar | 0,00 € ohne Wahl (kein Bestand am 31.12.), Feld erst nach Wahl eines Fonds-Typs, bis dahin Hinweis „Für Fondsanteile: …“ mit Sprungmarke „Zum Fondstyp“; Gewinn 200,00 € wie bisher |
| PDF derselben Fälle | Beträge oder „Kurse eintragen“ | „–“ mit „Fondstyp wählen“, Hinweis „Keine Schätzung: Fondstyp nicht gewählt …“, Fußnote „Fondstyp nicht gewählt“ |
| Ausschüttung einer Position ohne Fondstyp | „Ausschüttungen … (mindern den Basisertrag)“ | „Ausschüttungen bzw. Dividenden 2026 (brutto, vor Steuerabzug): …“ |

Tests: `fund-type.test.ts` (12 Tests). Vor der Umsetzung schlugen 10 der ersten 11 gegen den alten Code fehl; grün war nur „PDF nach der Wahl Aktienfonds“, weil der alte Standard Aktienfonds war. Der zwölfte Test (Hinweis am Verkauf, `creditNeedsFundType`) kam mit der Nachbesserung nach der Prüfung hinzu. In `tax-inputs.test.ts` ist die Assetklasse der Testbuchungen seither `etf` statt `unknown`: Die Tests prüfen Kurse je Steuerjahr und setzen einen vorbelegten Aktienfonds voraus; das Verhalten ohne Assetklasse prüft `fund-type.test.ts`. Die E2E-Tests zur Scalable-Datei, zu Kursen je Steuerjahr und zu angesetzten Vorabpauschalen wählen den Fondstyp jetzt ausdrücklich und prüfen vorher den Zustand „Bitte wählen“, auch nach „Andere Datei“. Der E2E-Test zu angesetzten Vorabpauschalen prüft zusätzlich den Hinweis am Verkauf, dass „Zum Fondstyp“ das Auswahlfeld fokussiert und dass der Hinweis nach der Wahl verschwindet.

### 3. Normangabe im Disclaimer

Geprüft am 08.10.2026 auf https://www.gesetze-im-internet.de/wphg/__2.html (Stand des Gesetzes laut https://www.gesetze-im-internet.de/wphg/BJNR174910994.html: zuletzt geändert durch Art. 11 G v. 26.5.2026 I Nr. 156): § 2 Abs. 8 Satz 1 zählt in den Nummern 1 bis 10 die Wertpapierdienstleistungen auf; Nr. 10 ist die Abgabe persönlicher Empfehlungen, die auf eine Prüfung der persönlichen Umstände gestützt oder als geeignet dargestellt werden und nicht ausschließlich über Informationsverbreitungskanäle oder für die Öffentlichkeit bekannt gegeben werden, mit dem Klammerzusatz „(Anlageberatung)“. Der Satz im Disclaimer („Öffentlich zugängliche Informationen ohne Prüfung persönlicher Umstände sind keine Anlageberatung im Sinne von § 2 Abs. 8 Satz 1 Nr. 10 WpHG“) gibt genau diese Abgrenzung wieder.

Entscheidung: Die Normangabe bleibt, zusammen mit dem Verweis auf das BaFin-Merkblatt. Kein Fehler, deshalb keine Änderung in `packages/legal`. Der E2E-Test „Disclaimer nennt § 2 Abs. 8 Satz 1 Nr. 10 WpHG“ sichert den Text weiter ab.

### 4. Abgleich der Vorabpauschale mit amtlichen Beispielen

Quellen, abgerufen am 08.10.2026. Die Internetseiten des BMF antworteten an diesem Tag mit HTTP 503; die Schreiben wurden deshalb als PDF-Kopien von Verbänden gelesen, die sie im Original weitergeben (Briefkopf, Geschäftszeichen und DOK-Nummer des BMF):

| Quelle | Inhalt | gelesen über |
|---|---|---|
| BMF-Schreiben vom 21.05.2019, IV C 1 - S 1980-1/16/10010 :001, DOK 2019/0415199, BStBl I 2019, 527 („Anwendungsfragen zum Investmentsteuergesetz“), Rz. 18.2 bis 18.4, 18.7 und 18.11 | Rechenweg und Rechenbeispiele der Vorabpauschale | https://www.bvai.de/fileadmin/Recht/InvStG/Anwendungsschreiben_InvStG_21052019.pdf (152 Seiten) |
| BMF-Schreiben vom 13.01.2026, IV C 1 - S 1980/00230/012/001, DOK COO.7005.100.4.13897455 | Basiszins zum 2. Januar 2026: 3,20 Prozent | https://direkt.bvi.de/fileadmin/user_upload/letter/2026/COO.7005.100.4.13897455.pdf |
| BMF-Schreiben vom 10.01.2025, IV C 1 - S 1980/00230/009/002, DOK COO.7005.100.3.10978455, BStBl I 2025, 273 (Fundstelle laut Bezug im Schreiben vom 13.01.2026) | Basiszins zum 2. Januar 2025: 2,53 Prozent | https://direkt.bvi.de/fileadmin/user_upload/letter/2025/012025/Schreiben_an_OFL.pdf |
| § 18 InvStG | Abs. 1 Satz 1 bis 4, Abs. 2 | https://www.gesetze-im-internet.de/invstg_2018/__18.html |

Ergebnis:

- **Rz. 18.3:** Basiszins 1,0 %, Rücknahmepreis 100 € am Jahresanfang und 100,50 € am Jahresende, Ausschüttung 0,10 € je Anteil. BMF: Basisertrag 0,70 €, Mehrbetrag 0,50 + 0,10 = 0,60 € als Obergrenze, abzüglich 0,10 € Ausschüttung bleibt 0,50 €. DepotDoktor rechnet min(0,70 − 0,10; 0,50) = 0,50 €. Die Reihenfolge ist eine andere, das Ergebnis ist für alle Eingaben gleich, weil min(B; G + A) − A = min(B − A; G) gilt (B Basisertrag, G Kursgewinn, A Ausschüttungen); der Test rechnet beide Formen.
- **Rz. 18.11:** Erwerb am 10.7.01, die Vorabpauschale des ganzen Jahres von 0,50 € mindert sich um 6/12 auf 0,25 €. DepotDoktor: 0,25 €. Die Variante der ursprünglichen Spezifikation (Kürzung des Basisertrags) ergibt hier ebenfalls 0,25 € (0,70 × 6/12 − 0,10 = 0,25, Deckel 0,50); das Beispiel bestätigt also Ergebnis und beschriebenes Vorgehen, unterscheidet die Varianten aber nicht in der Zahl.
- **Rz. 18.4:** Rechnungszins mit mindestens drei Nachkommastellen (0,87 % × 70 % = 0,609 %), Basisertrag je Anteil mit mindestens vier Nachkommastellen, kaufmännische Rundung auf Cent erst nach der Multiplikation mit der Stückzahl am 31.12. DepotDoktor rundet keine Zwischenwerte (decimal.js mit 30 Stellen) und erst bei der Anzeige. Test: 1.000 Anteile zu 100 € ergeben 609,00 €, nicht 610,00 € wie bei vorheriger Rundung auf 0,61 € je Anteil (Kurs und Stückzahl sind eigene Zahlen, die Regel ist die des BMF). Abweichung zur Bank: Die Summe über mehrere Positionen rundet DepotDoktor erst nach der Addition, die Bank je Position; der Unterschied beträgt höchstens einen halben Cent je Position.
- **Fall D (bisher `todo`):** jetzt ein echter Test in `vorabpauschale.test.ts` über `buildTaxSummary`: Kauf von 10 Anteilen zu 100,30 € am 10.07.2026, Ausschüttung 0,10 € je Anteil im Oktober, Kurse 100,00 € / 100,50 €. Bezugswert ist der Kurs am 01.01. (10 × 100 × 3,2 % × 0,7 = 22,40 €, nicht 22,4672 € aus dem Kaufpreis), Vorabpauschale (min(22,40; 5,00 + 1,00) − 1,00) × 6/12 = 2,50 €, also 0,25 € je Anteil wie im BMF-Beispiel. Der Basiszins ist der des Jahres 2026 statt der 1,0 % des Beispiels; weil der Deckel in beiden Fällen greift, bleibt das Ergebnis je Anteil gleich. Damit sind „Zu verifizieren“, Punkt 1 und 2, gegen eine amtliche Quelle geprüft.
- **Basiszins:** 2,53 % (2025) und 3,20 % (2026) stimmen mit `tax/constants.ts` überein. Neue Jahre wurden nicht ergänzt.

Weiter offen: Ob spätere Änderungsschreiben zum BMF-Schreiben vom 21.05.2019 die Rz. 18.3, 18.4 oder 18.11 geändert haben, ließ sich nicht abschließend prüfen, weil keine konsolidierte Fassung abrufbar war; das Änderungsschreiben vom 05.09.2023 (IV C 1 - S 1980-1/19/10008 :028, BStBl I 2023, 1648) betrifft laut Haufe-Rechtsquellendatenbank die Rz. 19.4a und Tz. 31. Die geprüften Regeln entsprechen dem heutigen Wortlaut von § 18 Abs. 1 und 2 InvStG. Der Abgleich mit einem externen Rechner (Stiftung Warentest, Finanztip) ist nicht erfolgt; die Finanztip-Seite zur Vorabpauschale ließ sich am 08.10.2026 nicht so abrufen, dass ein durchgerechnetes Beispiel lesbar war. Die Prüfung an echten Broker-Exporten bleibt offen, sie braucht Daten des Autors.

### Gegenprobe

- Vorbelegung des Steuerjahres: Gibt `defaultTaxYear` wie bisher immer das neueste Jahr zurück, schlagen 5 der 13 Tests in `tax-year.test.ts` fehl; mit der neuen Regel sind alle grün (Probe am 08.10.2026, danach wiederhergestellt).
- Fondstyp: 10 der 11 Tests in `fund-type.test.ts` schlugen vor der Umsetzung fehl (siehe oben). Der Test zum Hinweis am Verkauf schlug vor der Nachbesserung fehl (`creditNeedsFundType` war `undefined` statt `true`).
- Die BMF-Tests und der Fall-D-Test waren schon vor den Änderungen grün; sie prüfen die unveränderte Rechnung.

### Nachbesserung nach der Prüfung 08.10.2026

Eine Prüfung der Änderungen ergab zwei Befunde (beide „niedrig“). Beide trafen zu und sind behoben.

1. **Kein Hinweis auf das Feld für angesetzte Vorabpauschalen ohne Fondstyp.** Nach einem Vollverkauf einer Position ohne Assetklasse war die Zeile `notApplicable` (kein Bestand am 31.12.), das Feld nach § 19 Abs. 1 Satz 3 InvStG war ausgeblendet, und nichts sagte, dass es nach der Fondstypwahl erscheint; bei Trade-Republic-Positionen ohne Assetklasse fehlte auch der Scalable-Hinweis. Vor der Entscheidung war das Feld wegen des vorbelegten Aktienfonds sichtbar. Behoben: `buildSaleRow` liefert `creditNeedsFundType` (kein Fondstyp gewählt und der Verkauf enthält Anteile aus Vorjahren), der Steuerreiter zeigt dann am Verkauf den Hinweis aus Punkt 2 mit der Sprungmarke „Zum Fondstyp“, broker-unabhängig. Methodenhinweis 05 (Ansicht und PDF) nennt zusätzlich: „Bei Positionen ohne Assetklasse erscheint das Feld, sobald ein Fondstyp gewählt ist.“ Erwogen und verworfen: die Zeile auf „Fondstyp wählen“ setzen. Dann zeigten die Kacheln „–“, obwohl die Vorabpauschale ohne Bestand am 31.12. unabhängig vom Fondstyp 0 ist, und die Eingabe ist optional. Das PDF gibt wie bisher den Stand der Eingaben wieder; ein Verkauf ohne eingetragene Vorabpauschalen steht dort ohne Abzug, wie schon vor der Entscheidung bei einem Aktienfonds ohne Eingabe. Tests: neuer Unit-Test in `fund-type.test.ts` (vorher rot, siehe Gegenprobe), Zusicherungen im E2E-Test „Angesetzte Vorabpauschalen …“ (Hinweistext, Fokus nach „Zum Fondstyp“, Hinweis verschwindet nach der Wahl und kommt nach „Andere Datei“ wieder), axe-core bei 390, 768 und 1280 px und der 320-px-Test im Zustand „Verkauf ohne Fondstyp“.
2. **Unvollständige Liste der Depotbuchungen in Punkt 1, Regel 3.** `isDepotBooking` zählt auch „Sonstiges“ mit ISIN (etwa eine Einbuchung), die Liste nannte nur Gebühr und Steuer. Behoben in Regel 3; der Code ist unverändert, die Regel war schon dieselbe wie bei den Bewertungspunkten.

### README-Screenshot

`docs/screenshots/steuer.png` ist neu erzeugt: Playwright gegen `next start`, Viewport 1280 px, Skalierung 1,5, Uhr auf den 08.10.2026 gestellt, Beispieldatei, Beispielkurse für den ETF (80,00 € / 95,00 €), Ausschnitt Steuerreiter mit 24 px Rand. Neu sind der Hinweis zum laufenden Jahr unter dem Auswahlfeld und die beiden Methodenhinweise 04 und 08. Nach der Nachbesserung mit denselben Einstellungen erneut erzeugt, weil Methodenhinweis 05 einen Satz dazubekommen hat. `performance.png` ist unverändert.

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234, E2E mit `CI=true` gegen `next start` auf Port 3701.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün, Lockfile aktuell |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 279 Tests grün (csv 50, pdf 2, web 227), kein offener `todo` mehr; vor den restlichen Entscheidungen 247 und 1 `todo`, vor der Nachbesserung 278 |
| `pnpm build` | grün |
| `pnpm test:e2e` mit `CI=true` | 29 Tests grün im ersten Durchlauf, ohne Wiederholung (`depotdoktor.spec.ts` 15, `site.spec.ts` 14), darin axe-core bei 390, 768 und 1280 px ohne Verstöße, neu auch im Steuerreiter der Scalable-Datei ohne Fondstyp und beim Verkauf ohne Fondstyp |
| `pnpm audit --prod` / `pnpm audit` | keine Meldung / nur braces über eslint-config-next (unverändert) |

Die Tabelle gibt den Stand nach der Nachbesserung wieder (Endkontrolle am 08.10.2026). Abhängigkeiten sind unverändert.

## Framework-Migration 17.10.2026

Umstellung auf die Major-Versionen, die Dependabot für NetzRadar (PR #13 in `mirkan-morgenfels-ai/netzradar`) vorgeschlagen hat. Rechenwege, Kennzahlen, Parser, Steuerlogik, Rechtstexte und Oberflächentexte sind unverändert; `apps/web/lib`, `apps/web/components`, `apps/web/e2e` und `packages/*/src` haben keine Änderung.

| Paket | vorher | nachher |
|---|---|---|
| `next`, `eslint-config-next` | 15.5.27 | 16.4.2 (Bereich `^16.4.0`) |
| `eslint` | 9.39.5 | 10.13.0 (Bereich `^10.12.0`) |
| `@eslint/js` | 9.39.5 | 10.0.1 |
| `vitest` | 4.1.11 | 5.0.5 (Bereich `^5.0.4`), `vite` 8.2.2 als Peer |
| `@types/node` | 22.20.1 | 26.6.5 |
| `typescript` | 5.9.3 | 5.9.3, TypeScript 7 ausgelassen (siehe unten) |
| `@eslint/eslintrc` | 3.3.7 | entfernt (kein `FlatCompat` mehr) |

Weitere Pakete sind nicht angehoben; im Lockfile ändern sich nur die Abhängigkeiten dieser Pakete. `engines.node` ist jetzt `^22.13.0 || ^24.0.0 || >=26.0.0`, die Schnittmenge aus ESLint 10 (`^20.19.0 || ^22.13.0 || >=24`) und Vitest 5 (`^22.12.0 || ^24.0.0 || >=26.0.0`); die CI bleibt auf Node 22.

### Umgestellt

- Lint: `apps/web/eslint.config.mjs` nutzt die nativen Flat-Configs `eslint-config-next/core-web-vitals` und `eslint-config-next/typescript` mit `defineConfig` und `globalIgnores` aus `eslint/config`, die fünf Pakete `defineConfig` statt des veralteten `tseslint.config`. Vergleich der wirksamen Regeln (`eslint --print-config`) vorher und nachher: keine Regel entfallen, keine Stufe geändert. Neu aktiv sind in `apps/web` 15 Regeln (die React-Compiler-Regeln von `eslint-plugin-react-hooks` 7 wie `react-hooks/purity`, `react-hooks/refs` und `react-hooks/set-state-in-effect` sowie `@next/next/no-location-assign-relative-destination`), in den Paketen die drei neuen Empfehlungen von ESLint 10 (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`). Der Code erfüllt sie ohne Änderung.
- `apps/web/tsconfig.json` ohne `baseUrl` (TypeScript 7 kennt die Option nicht mehr, `paths` gilt relativ zur Datei).
- `next.config.ts` setzt `agentRules: false` (Option seit Next.js 16.3), damit `next dev` keine `AGENTS.md` anlegt.
- Vorschaubild: Next.js 16 bringt in `next/og` Geist statt Noto Sans als eingebaute Schrift mit (`dist/compiled/@vercel/og/Geist-Regular.ttf` statt `noto-sans-v27-latin-regular.ttf`). Ohne Anpassung wären Kicker, Namenszeile und Beschreibung im Vorschaubild in Geist gesetzt. `app/opengraph-image.tsx` lädt deshalb die bisherige Schriftdatei beim Build aus `apps/web/assets/` (Datei byte-gleich mit der aus `next` 15.5.27; SIL Open Font License 1.1 in `apps/web/assets/OFL.txt`, Wortlaut gegen eine zweite OFL-Kopie aus den installierten Paketen geprüft); `.gitattributes` behandelt `*.ttf` als binär.

### Geprüft, ohne Änderung nötig

- Next.js 16 (Leitfaden `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`): keine eigene webpack-Konfiguration, Turbopack baut ohne Anpassung; keine Middleware, also kein Umzug auf `proxy`; kein `next/image`; keine dynamischen Routen, kein `params`, `searchParams`, `cookies()` oder `headers()`; Vorschaubild und Icons ohne Parameter; kein `scroll-behavior: smooth`; kein AMP, `runtimeConfig`, `devIndicators`, `revalidateTag` oder PPR. `next lint` war schon vorher durch `eslint .` ersetzt. Alle Seiten bleiben statisch (11 Routen, alle „Static“).
- Vitest 5: kein `vi.mock`, keine Fake-Timer, kein `sequential`, kein `toThrow("")`; die Konfigurationen in `apps/web`, `packages/csv` und `packages/pdf` brauchen keine Änderung, es entsteht kein `.vitest`-Ordner.
- PDF-Export mit `@react-pdf/renderer` 4.9 unter Turbopack: `next start` und `next dev` erzeugen für die Beispieldatei dieselbe PDF-Datei (19.253 Byte, byte-gleich mit dem Stand vor der Migration), ohne CSP-Verletzung und ohne Konsolenfehler. Die CSP braucht weiterhin `'wasm-unsafe-eval'` und `worker-src 'self' blob:`, sonst nichts Neues.

### TypeScript 7 ausgelassen

Probe am 17.10.2026 mit `typescript` 7.0.2 in allen sechs Paketen: `pnpm typecheck`, `pnpm test` und `pnpm build` grün, `pnpm lint` bricht in jedem Paket ab mit „typescript-eslint does not support TS 7.0.“ (`Error` aus `typescript-eslint` 8.69.0, `dist/index.js:52`, eine feste Prüfung der TypeScript-Hauptversion).

typescript-eslint 8 braucht die Programmier-API von TypeScript, die TypeScript 7.0 nicht hat; auch die neueste Version 8.71.2 verlangt `typescript >=4.8.4 <6.1.0`. `eslint-config-next/typescript` hängt an typescript-eslint. Belege: https://github.com/typescript-eslint/typescript-eslint/issues/12518 (am 08.07.2026 als „not planned“ geschlossen, „there is no TS 7 API at this time“) und https://github.com/typescript-eslint/typescript-eslint/issues/10940 (offen, Unterstützung mit der neuen API ab TypeScript 7.1). Der im TypeScript-7-Blog beschriebene Parallelbetrieb (`typescript` als Alias auf `@typescript/typescript6`, TypeScript 7 unter einem zweiten Namen) ist verworfen, weil das Paket `typescript` dann trotzdem 6.0 wäre und Lint und die Typprüfung in `next build` weiter mit TypeScript 6 liefen. TypeScript bleibt auf 5.9, `.github/dependabot.yml` ignoriert `typescript` 7.x. Gegenprobe für den nächsten Dependabot-PR: Mit `typescript` 6.0.3 sind `pnpm typecheck` (ohne `.next` wie in der CI und nach dem Build), `pnpm lint`, `pnpm test` und `pnpm build` grün.

### Vorher-nachher-Vergleich

Stand vor der Migration: `main` (Commit 460e5ed) in ein eigenes Verzeichnis exportiert, mit `pnpm install --frozen-lockfile --offline` installiert und mit Next.js 15.5.27 gebaut. Beide Stände liefen nacheinander mit `next start` auf Port 3801; Playwright mit Chromium Headless Shell 1234, Uhr auf den 08.10.2026, `reducedMotion: "reduce"`, ganze Seite.

| Prüfung | Ergebnis |
|---|---|
| Startseite und Projektseite bei 1280 und 390 px | PNG byte-gleich, also pixelgleich |
| Report mit Beispieldatei und Steuerreiter bei 1280 und 390 px | PNG byte-gleich |
| PDF-Report und CSV-Export der Beispieldatei | byte-gleich (19.253 und 1.204 Byte) |
| Sicherheits-Header (CSP, HSTS, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP) auf allen Seiten, 404, Icons, `robots.txt` und Sitemap | gleich |
| `icon.svg`, `robots.txt`, `sitemap.xml` | byte-gleich |
| Vorschaubild (1200 × 630) | sichtbar gleich; 623 von 756.000 Pixeln weichen um mehr als 24 von 255 ab (höchstens 51), nur an Glyphen- und Linienkanten, dazu Rundungsunterschiede im Farbverlauf (neuere Satori- und Resvg-Version in `next/og`) |
| Apple-Icon (180 × 180) | sichtbar gleich; höchste Abweichung 20 von 255, nur an Kanten |
| Anfragen beim Laden, nach Beispieldatei und Export | vorher wie nachher nur GET an denselben Server (Seiten, `/_next/static/`, Vorabruf mit `_rsc`), keine externe Anfrage, keine Konsolenmeldung |

Sichtbare Unterschiede gibt es keine; die README-Screenshots sind deshalb nicht neu aufgenommen. Einziger Unterschied in den Antworten: Next.js 16 liefert Vorschaubild, Apple-Icon und `icon.svg` mit `Cache-Control: public, max-age=0, must-revalidate` statt `public, immutable, no-transform, max-age=31536000` (Vorgabe in `next/dist/server/og/image-response.js` und im Metadaten-Loader von Next.js 16). Das betrifft nur das Zwischenspeichern dieser drei Dateien und ist bewusst übernommen.

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234; vorher `apps/web/.next` und `next-env.d.ts` gelöscht wie in der CI, E2E mit `CI=true` gegen `next start` auf Port 3801.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün, Lockfile aktuell. Beim Auflösen (`pnpm install` ohne `--frozen-lockfile`) meldet pnpm Peer-Warnungen nur für `eslint-plugin-import`, `eslint-plugin-jsx-a11y` und `eslint-plugin-react` (Peer bis ESLint 9; `eslint-config-next` 16.4 passt die Regeln von React- und Import-Plugin an ESLint 10 an) |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 279 Tests grün (csv 50, pdf 2, web 227), wie vor der Migration |
| `pnpm build` | grün, Next.js 16.4.2 mit Turbopack, 11 Routen statisch |
| `pnpm test:e2e` mit `CI=true` | 29 Tests grün im ersten Durchlauf, ohne Wiederholung (`depotdoktor.spec.ts` 15, `site.spec.ts` 14), darin axe-core bei 390, 768 und 1280 px ohne Verstöße und kein waagrechter Überlauf bei 320 px |
| `pnpm audit --prod` / `pnpm audit` | keine Meldung / nur braces über eslint-config-next (unverändert) |

## Anleitung für die Prüfung an echten Exporten 20.10.2026

Der Abgleich mit echten Exporten braucht die Daten des Autors. Neu ist deshalb [pruefung-echte-exporte.md](pruefung-echte-exporte.md): Exportwege bei Trade Republic und Scalable Capital (recherchiert am 20.10.2026, mit Quellen; ohne Hilfeseite des Brokers als „Stand der Recherche“ gekennzeichnet), Laden der Datei in DepotDoktor, eine Prüfliste (Buchungen und übersprungene Zeilen, Stichprobe je Buchungsart, Zeitraum, TTWROR und IRR gegen die Performance-Anzeige des Brokers, FIFO gegen die Abrechnungen, Vorabpauschale gegen die Buchung im Januar, Teilfreistellung je Fondstyp, Allokation), ein Prüfprotokoll zum Ausfüllen und das Vorgehen bei Abweichungen (anonymisierte Fixture, Test zuerst, Issue-Vorlage). README („Status“, „Unterstützte Exporte“, „Grenzen“, „Projektstruktur“) und `CLAUDE.md` („Offene Punkte des Autors“) verweisen darauf. Code, Kennzahlen, Rechenwege, Oberflächen- und Rechtstexte sind unverändert.

Ergebnisse der Recherche stehen oben unter „Zu verifizieren an echten Exporten“, Punkte 1, 4 und 7. Außerdem:

1. **Scalable Capital nur mit PRIME+.** Den CSV-Export gibt es laut Scalable-FAQ (Inhalt aktualisiert am 29.07.2026) nur im PRIME+ Broker. Das Upload-Feld nennt nur den Weg „Broker → Transaktionen → CSV“; ob der Hinweis auf PRIME+ auch in die Oberfläche gehört, entscheidet der Autor. Empfehlung: ja, kurz als „nur PRIME+“ am Exportweg, damit Nutzer des FREE Brokers nicht vergeblich suchen. ~~Offen.~~ Umgesetzt am 22.10.2026 (Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“, Punkt 3).
2. **Performance-Anzeigen der Broker.** Trade Republic teilt den absoluten Ertrag im Zeitraum durch die durchschnittliche Portfoliogröße, Scalable Capital zeigt die unrealisierte Rendite des aktuellen Bestands. Beides ist weder TTWROR noch IRR; Abweichungen zu DepotDoktor sind erwartet und in der Prüfliste (3.4) erklärt. Prüfbar ist die Rechnung von DepotDoktor selbst: IRR mit `XINTZINSFUSS` aus der Tabelle „Wertverlauf“, TTWROR aus den Periodenrenditen.
3. **Jahreszuordnung der Vorabpauschale.** Die Vorabpauschale für 2025 gilt am ersten Werktag 2026 als zugeflossen (§ 18 Abs. 3 InvStG) und steht deshalb in der Jahressteuerbescheinigung für 2026. Heute prüfbar ist nur Steuerjahr 2025 gegen das Dokument der Bank vom Januar 2026.
4. **Fondstyp bei Derivaten.** Beim Schreiben der Prüfliste aufgefallen: Positionen mit der Trade-Republic-Assetklasse `DERIVATIVE` oder `WARRANT` sind wie alle Assetklassen außer Aktie, Anleihe, Krypto und unbekannt als Aktienfonds vorbelegt (`defaultFundType` in `tax/summary.ts`), obwohl Derivate keine Investmentfonds sind. Die Prüfliste (3.7) weist darauf hin. Vorschlag: wie Aktien als „Kein Fonds (Aktie, Anleihe)“ vorbelegen, mit Test vorher; Entscheidung des Autors. ~~Offen.~~ Umgesetzt am 22.10.2026 mit Test vorher, dazu Cash ohne Vorbelegung (Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“, Punkte 1 und 2).

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234; vorher `apps/web/.next` und `next-env.d.ts` gelöscht wie in der CI, E2E mit `CI=true` gegen `next start` auf Port 3801.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün, Lockfile aktuell |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 279 Tests grün (csv 50, pdf 2, web 227), unverändert |
| `pnpm build` | grün, Next.js 16.4.2 mit Turbopack, 11 Routen statisch |
| `pnpm test:e2e` mit `CI=true` | 29 Tests grün im ersten Durchlauf, ohne Wiederholung (`depotdoktor.spec.ts` 15, `site.spec.ts` 14) |
| `pnpm audit --prod` / `pnpm audit` | keine Meldung / nur braces über eslint-config-next (unverändert) |

## Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026

Der Autor hat die beiden offenen Punkte aus dem Abschnitt „Anleitung für die Prüfung an echten Exporten 20.10.2026“ (Punkte 1 und 4) mit „Mache alles, was nötig ist“ an Claude delegiert. Geändert haben sich die Vorbelegung des Fondstyps bei den Assetklassen Derivat und Cash, die Beschriftung der Option „Kein Fonds“, einige Hinweistexte in Ansicht und PDF und das Upload-Feld. Unverändert sind alle Rechenwege (Vorabpauschale, Teilfreistellungssätze, FIFO, Kennzahlen), der Parser, die Rechtstexte und `packages/legal`. Alle Quellen unten sind am 22.10.2026 abgerufen.

### 1. Derivate: „Kein Fonds“

Entscheidung: Positionen mit der Assetklasse Derivat (im Trade-Republic-Export `DERIVATIVE` oder `WARRANT`) sind als „Kein Fonds (Aktie, Anleihe, Derivat)“ vorbelegt, wie Aktien, Anleihen und Krypto. Bisher war „Aktienfonds“ vorbelegt.

Begründung:

- Das InvStG gilt nur für Investmentfonds und deren Anleger (§ 1 Abs. 1 InvStG). Investmentfonds sind Investmentvermögen nach § 1 Abs. 1 KAGB (§ 1 Abs. 2 Satz 1 InvStG), also Organismen für gemeinsame Anlagen, die von einer Anzahl von Anlegern Kapital einsammeln, um es gemäß einer festgelegten Anlagestrategie zum Nutzen dieser Anleger zu investieren (§ 1 Abs. 1 Satz 1 KAGB).
- Das BMF-Schreiben vom 21.05.2019 (Anwendungsfragen zum InvStG, BStBl I 2019, 527) verneint das für Zertifikate ausdrücklich, Rz. 1.4: Wird das Kapital des Anlegers ohne wirtschaftliche oder rechtliche Trennung Vermögen eines Dritten, liegt kein Organismus für gemeinsame Anlagen vor; „Die Kapitalhingabe zum Erwerb von Schuldverschreibungen erfüllt somit nicht den Begriff des Investmentvermögens. Dies gilt auch, wenn – wie bei Zertifikaten – die Höhe der Anlagesumme und des Rückzahlungsanspruchs aus der Schuldverschreibung in Relation zur Wertentwicklung anderer Finanzinstrumente steht.“ Rz. 1.2 verweist zur Auslegung auf das Auslegungsschreiben der BaFin zum Begriff des Investmentvermögens. Optionsscheine und Hebelprodukte (Knock-out-Produkte, Faktor-Zertifikate) nennt Rz. 1.4 nicht eigens; auch bei ihnen wird das Kapital Vermögen des Emittenten, und es gibt keine Anlagestrategie zum Nutzen der Anleger, sodass die Begründung von Rz. 1.4 trägt.
- Ohne Investmentfonds gibt es keinen Investmentanteil (§ 2 Abs. 4 InvStG) und keine Investmenterträge (§ 16 Abs. 1 InvStG: Ausschüttungen, Vorabpauschalen, Gewinne aus der Veräußerung von Investmentanteilen). Die Vorabpauschale nach § 18 InvStG entfällt also, ebenso die Teilfreistellung: Sie gilt für Aktien-, Misch- und Immobilienfonds (§ 20 InvStG), und das sind nach § 2 Abs. 6, 7 und 9 InvStG Investmentfonds.
- Die vorher vorbelegte Teilfreistellung von 30 % und eine geschätzte Vorabpauschale für ein Derivat waren damit falsch. Mit „Kein Fonds“ schätzt DepotDoktor 0,00 €; ein Feld für angesetzte Vorabpauschalen beim Verkauf gibt es nicht (§ 19 InvStG betrifft nur Investmentanteile). Der Veräußerungsgewinn nach FIFO bleibt unverändert.
- Konsolidierte Fassung: Das BMF-Schreiben vom 21.05.2019 ist mehrfach geändert, laut Bezug des Änderungsschreibens vom 24.11.2025 (GZ IV C 1 - S 1980/00206/032/046, auf der Seite „Investmentsteuer“ des BMF verlinkt) zuvor zuletzt durch das Schreiben vom 18.11.2024. Das Schreiben vom 24.11.2025 ändert das Inhaltsverzeichnis, Randziffern in den Textziffern 2, 6, 17, 23, 26, 31, 33, 36, 38 und 48 sowie die Anlage 1, nicht Tz. 1. Ob ein früheres Änderungsschreiben Rz. 1.4 geändert hat, ließ sich ohne konsolidierte Fassung nicht abschließend prüfen; der Gesetzestext von § 1 InvStG und § 1 KAGB trägt die Entscheidung auch allein.
- Was Trade Republic als `DERIVATIVE` führt, zeigen die Testdateien von Portfolio Performance (Nebenbefunde unten): Knock-out-Produkte mit Namen wie „Long … $“ und „Short … Pt.“, dazu Buchungen `TILG` (Tilgung) und `WARRANT_EXERCISE`. `WARRANT` kommt dort als Assetklasse nicht vor; die Zuordnung im Parser bleibt.

Beschriftung: Die Option heißt jetzt „Kein Fonds (Aktie, Anleihe, Derivat)“ statt „Kein Fonds (Aktie, Anleihe)“, damit die Vorbelegung bei einem Zertifikat nicht wie ein Fehler aussieht. Der Hinweis im PDF lautet „Keine Vorabpauschale: kein Fonds (z. B. Einzelaktie, Anleihe oder Derivat).“; die Ansicht zeigt wie bisher „Kein Fonds: Für diese Position wird keine Vorabpauschale berechnet.“ Der Hinweis „Fondstyp wählen“ nennt Derivate jetzt ausdrücklich, weil Scalable-Positionen ohne Assetklasse auch Zertifikate sein können.

### 2. Cash: keine Vorbelegung

Entscheidung: Positionen mit der Assetklasse Cash starten wie Positionen ohne Assetklasse mit „Bitte wählen“; bis zur Wahl zeigen Kacheln und PDF „–“ mit „Fondstyp wählen“. Bisher war „Aktienfonds“ vorbelegt.

Was „Cash“ in den unterstützten Exporten bedeutet:

- Trade Republic: In den Testdateien von Portfolio Performance kommt `CASH` nur als `category` vor (Einzahlungen, Überweisungen, Zinsen, Kartenzahlungen, Steueroptimierung, Saveback), mit leerer `asset_class`. Als Assetklasse gibt es dort `FUND`, `STOCK`, `BOND`, `CRYPTO`, `DERIVATIVE` und `PRIVATE_FUND`, kein `CASH` und kein `ETF`; ETFs stehen als `FUND`. Ein Geldmarkt-ETF erschiene dort also voraussichtlich als `FUND` und damit als Aktienfonds (siehe „Grenzen“ im README), nicht als Cash.
- Scalable Capital: `assetType` ist `Security` für Wertpapiere und nach Annahme der Fixture `Cash` für Kontobuchungen (Einzahlung, Zinsen); siehe „Zu verifizieren an echten Exporten“, Punkt 4. Der Parser ordnet außerdem `Security` ohne ISIN der Assetklasse Cash zu. Laut Zinsübersicht von Scalable wird Guthaben ohne PRIME+ auf Banken mit Einlagensicherung „oder Geldmarktfonds mit OGAW-Schutzstandards“ verteilt. „Cash“ kann bei Scalable also Kontoguthaben oder Anteile an Geldmarktfonds bedeuten.
- Eine Position im Steuerreiter entsteht nur aus Kauf, Verkauf und Ausschüttung. Kontobuchungen selbst werden nie zu Positionen; eine Position mit Assetklasse Cash entsteht nur, wenn ein Kauf, Verkauf oder eine Ausschüttung diese Assetklasse trägt, etwa eine Scalable-Wertpapierbuchung ohne ISIN.

Steuerlich: Kontoguthaben ist kein Investmentanteil, es gibt keine Vorabpauschale („Kein Fonds“). Ein Geldmarktfonds oder Geldmarkt-ETF ist ein Investmentfonds (§ 1 Abs. 2 InvStG) mit Vorabpauschale, aber ohne Aktien- oder Mischfondsquote, also „Sonstiger Fonds“ ohne Teilfreistellung (§ 2 Abs. 6 und 7, § 20 InvStG). „Aktienfonds“ ist in beiden Fällen falsch. Welcher der beiden Fälle vorliegt, lässt sich aus dem Export nicht ablesen; deshalb keine stille Annahme, sondern „Bitte wählen“ wie bei Positionen ohne Assetklasse (Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 2).

Texte, damit sie auch für Cash stimmen (Ansicht und PDF gleich): „Fondstyp wählen: Der Export nennt für diese Position keine Assetklasse, aus der sich der Fondstyp ergibt. … Für Aktien, Anleihen und Derivate wählen Sie „Kein Fonds (Aktie, Anleihe, Derivat)“.“; über den Kacheln „Wählen Sie unten für Positionen ohne passende Assetklasse den Fondstyp.“; im PDF „Keine Schätzung: Fondstyp nicht gewählt. Der Export nennt keine Assetklasse, aus der sich der Fondstyp ergibt; bitte im Steuerreiter den Fondstyp wählen.“ Methodenhinweis 04 (Ansicht und PDF) lautet jetzt: „Der Fondstyp bestimmt die Teilfreistellung (§ 20 InvStG). Vorbelegt ist er nur, wenn die Assetklasse im Export ihn erkennen lässt: Aktie, Anleihe, Krypto und Derivat (Zertifikat, Optionsschein, Hebelprodukt) als kein Fonds, ETF und Fonds als Aktienfonds. Ohne Assetklasse, etwa im Scalable-Export, und bei der Assetklasse „Cash“ steht dort „Bitte wählen“, und für die Position wird nichts geschätzt, bis Sie den Fondstyp wählen.“ Methodenhinweis 05 endet mit „Bei Positionen ohne vorbelegten Fondstyp erscheint das Feld, sobald ein Fondstyp gewählt ist.“

| Fall | alt | neu |
|---|---|---|
| Derivat, Kauf 20 @ 3,00 € am 02.05.2025, Verkauf 10 @ 4,00 € am 01.06.2026, Jahr 2026 | „Aktienfonds“, vorläufig 10 × 3,00 × 3,2 % × 0,7 = 0,67 €, Feld für angesetzte Vorabpauschalen | „Kein Fonds (Aktie, Anleihe, Derivat)“, 0,00 €, vollständig, kein Feld; Gewinn 10 × (4,00 − 3,00) = 10,00 € wie bisher |
| Trade-Republic-Export mit `DERIVATIVE`, `WARRANT` und `FUND`, Jahr 2025 | alle drei „Aktienfonds“ | Derivate „Kein Fonds“, `FUND` weiter „Aktienfonds“ |
| Cash, Kauf 10 @ 100 € 2025 und 5 @ 110 € 2026, Jahr 2026 | „Aktienfonds“, vorläufig 33,60 €, 23,52 €, 6,20 € | „Bitte wählen“, „–“ mit „Fondstyp wählen“; nach „Sonstiger Fonds“ 33,60 €, 33,60 € (keine Teilfreistellung), 33,60 × 26,375 % = 8,86 €; nach „Kein Fonds“ 0,00 € |
| Beispieldatei, Scalable-Testdatei | | Ergebnisse unverändert; neu sind nur die Beschriftung „Kein Fonds (Aktie, Anleihe, Derivat)“ und die Texte oben |

Tests: fünf neue Unit-Tests in `fund-type.test.ts` (Vorbelegung nach Assetklasse, Derivat mit Bestand am 31.12. und Verkauf, Trade-Republic-CSV mit `DERIVATIVE`, `WARRANT` und `FUND`, Cash mit Handrechnung für „Sonstiger Fonds“, PDF wie Ansicht mit Methodenhinweis). Alle fünf schlugen gegen den alten Code fehl, ebenso der angepasste Test „PDF ohne Fondstyp“ (neuer Hinweistext); danach alle grün. E2E: neuer Test „Trade-Republic-Derivat …“ (Vorbelegung, Beschriftung, `aria-invalid="false"`, Allokation „Derivate“, 0,00 € in 2025 und 2026, kein Feld und kein Hinweis am Verkauf, Gewinn 10,00 €); im Test zur Beispieldatei die neue Beschriftung, im Scalable-Test und im Test zu Kursen je Steuerjahr die neuen Texte. `docs/screenshots/steuer.png` ist mit denselben Einstellungen wie am 08.10.2026 neu erzeugt (Methodenhinweise 04 und 05, Beschriftung); vor der Aufnahme an den Seitenanfang gescrollt, damit der klebende Kopf nicht im Bild steht.

### 3. Hinweis „nur PRIME+“ im Upload-Feld

Umsetzung: Unter dem Exportweg von Scalable Capital („Broker → Transaktionen → CSV“) steht „CSV-Export nur im PRIME+ Broker“. Der Hinweis ist ein zweites `dd` in derselben Gruppe wie „Scalable Capital“ (`dt`); Screenreader lesen ihn deshalb zusammen mit dem Broker. Kein Symbol, keine Farbe als einziges Merkmal; Schrift 12 px in gold-deep wie der Scalable-Hinweis im Steuerreiter. Kontraste nachgerechnet: auf dem Feld (ivory/40 über surface) 5,7:1, beim Ziehen einer Datei (gold-soft) 4,9:1, nach einer Fehlermeldung (wine-soft/30 über surface) 5,4:1. Bei 390 px und 320 px steht der Hinweis in einer Zeile ohne waagrechten Überlauf; axe-core prüft die Projektseite ohne Datei bei 390, 768 und 1280 px. Die Fehlermeldungen für PDF- und Excel-Dateien in `packages/csv` nennen weiter nur den Exportweg; das Upload-Feld mit dem Hinweis bleibt direkt über der Meldung sichtbar.

Quelle: Scalable-FAQ „Kann ich Informationen zu meinen Transaktionen exportieren, z.B. als CSV-Datei?“, Antwort „Broker“ (Inhalt aktualisiert am 29.07.2026, laut Seitendaten am 22.10.2026 unverändert). Die Aussage „nur im PRIME+ Broker“ ist am 20.10.2026 gelesen ([pruefung-echte-exporte.md](pruefung-echte-exporte.md), Abschnitt 1.2); der Antworttext wird auf der Seite nachgeladen und ließ sich am 22.10.2026 nicht ohne Browser abrufen. Die Produkt-News vom 12.12.2024 nennen noch PRIME und PRIME+. Test: Der E2E-Test zur Scalable-Datei prüft vor dem Upload die Gruppen der Exportwege (`dt` und zugehörige `dd`).

### Nebenbefunde (nicht umgesetzt)

Bei der Recherche zur Assetklasse fielen in den Testdateien von Portfolio Performance Unterschiede zum angenommenen Trade-Republic-Format auf. Quelle: Repository `portfolio-performance/portfolio`, `name.abuchen.portfolio.tests/src/name/abuchen/portfolio/datatransfer/traderepublic/TransactionExport01.csv` bis `03.csv` und `TradeRepublicCSVExtractor.java` (Testdateien seit Commit ec0ea01 vom 11.04.2026 unverändert, Stand `master` 416e6e6 vom 19.10.2026); laut Beitrag des Entwicklers im Forum vom 15.04.2026 stammen die Testdaten von Trade Republic. Es sind keine Exporte des Autors; der Code ist deshalb unverändert. Die Punkte gehören in die Prüfung an echten Exporten und bei Bestätigung auf einen eigenen Branch mit Fixture und vorher geschriebenem Test (Regel 3).

1. Keine Spalte `isin`; die ISIN steht in `symbol` (bei Krypto das Kürzel). DepotDoktor liest `isin` und würde jeden Kauf und Verkauf mit „Kauf ohne ISIN“ bzw. „Verkauf ohne ISIN“ melden, Positionen über den Namen führen und keine Region zuordnen (Punkt 1 unter „Zu verifizieren an echten Exporten“).
2. `amount` ist der Betrag ohne Gebühr und Steuer; `fee` und `tax` stehen negativ in eigenen Spalten (Beispielzeile: 15 × 17,664 = 264,96 = |`amount`|, `fee` −1,00). Portfolio Performance rechnet den Zahlungsbetrag als Summe der drei Spalten. DepotDoktor nimmt an, `amount` enthalte beim Kauf die Gebühr und sei beim Verkauf netto; bestätigt sich das Format, wären die Anschaffungskosten um die Kaufgebühr zu niedrig und die Verkaufserlöse um Gebühr und Steuer zu hoch angesetzt (Punkte 3 und 6).
3. Eine der drei Dateien ist mit Semikolon getrennt und hat andere Spalten nach `tax` (`original_currency`, `description`, `transaction_id`, `value_date`, Gegenpartei). DepotDoktor wählt das Trennzeichen nach der Kopfzeile und erkennt das Format an den zwölf Pflichtspalten.
4. Scalable Capital: Die CSV-Vorlage von Portfolio Performance (`datatransfer/csv/csv-config.json`) hat dieselben 14 Spalten und nennt als `type` „Buy“, „Savings plan“, „Deposit“, „Distribution“, „Fee“, „Interest“, „Withdrawal“, „Sell“, „Taxes“, „Cash Transfer In“ und „Cash Transfer Out“ (Punkt 4). „Cash Transfer In/Out“ erkennt DepotDoktor nicht; solche Zeilen landen als „Sonstiges“ mit Hinweis.

### Quellen

Abgerufen am 22.10.2026:

- § 1 InvStG: https://www.gesetze-im-internet.de/invstg_2018/__1.html; § 2: https://www.gesetze-im-internet.de/invstg_2018/__2.html; § 16: https://www.gesetze-im-internet.de/invstg_2018/__16.html; § 20: https://www.gesetze-im-internet.de/invstg_2018/__20.html
- § 1 KAGB: https://www.gesetze-im-internet.de/kagb/__1.html
- BMF-Schreiben vom 21.05.2019, IV C 1 - S 1980-1/16/10010 :001, DOK 2019/0415199, BStBl I 2019, 527, Rz. 1.1 bis 1.4, gelesen über https://www.bvai.de/fileadmin/Recht/InvStG/Anwendungsschreiben_InvStG_21052019.pdf (dieselbe Datei wie am 08.10.2026)
- BMF-Schreiben vom 24.11.2025, IV C 1 - S 1980/00206/032/046, DOK COO.7005.100.4.13538702 (Änderungen am Schreiben vom 21.05.2019): https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Investmentsteuer/2025-11-24-anwendungsfragen-InvStG.pdf
- Scalable Capital, Zinsübersicht (Verwahrung des Guthabens ohne PRIME+): https://de.scalable.capital/zinsuebersicht
- Scalable-FAQ zum Transaktionsexport und Produkt-News vom 12.12.2024: wie in [pruefung-echte-exporte.md](pruefung-echte-exporte.md)
- Portfolio Performance, Testdateien und Importer für den Trade-Republic-Transaktionsexport: https://github.com/portfolio-performance/portfolio/tree/master/name.abuchen.portfolio.tests/src/name/abuchen/portfolio/datatransfer/traderepublic und https://github.com/portfolio-performance/portfolio/blob/master/name.abuchen.portfolio/src/name/abuchen/portfolio/datatransfer/traderepublic/TradeRepublicCSVExtractor.java; CSV-Vorlage für Scalable Capital: https://github.com/portfolio-performance/portfolio/blob/master/name.abuchen.portfolio/src/name/abuchen/portfolio/datatransfer/csv/csv-config.json
- Portfolio-Performance-Forum, „Import Trade Republic CSV (Transaktionsexport)“, Beitrag des Entwicklers vom 15.04.2026 (Testdaten von Trade Republic): https://forum.portfolio-performance.info/t/import-trade-republic-csv-transaktionsexport/39126

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234; vorher `apps/web/.next` und `next-env.d.ts` gelöscht wie in der CI, E2E mit `CI=true` gegen `next start` auf Port 3811.

| Schritt | Ergebnis |
|---|---|
| `pnpm install --frozen-lockfile` | grün, Lockfile aktuell, 483 Pakete. Ein erster Lauf auf den vorhandenen `node_modules` ließ `@types/react` im virtuellen Speicher von pnpm nicht verlinkt (eine verwaiste 19.2.18 aus einem früheren Stand lag noch dort); danach meldete `packages/pdf` „'Text' cannot be used as a JSX component“, und Vitest brach mit EPERM ab. Nach dem Löschen aller `node_modules` und neuer Installation wie in der CI waren alle Schritte grün; Lockfile und Code waren nicht die Ursache |
| `pnpm typecheck` (einschließlich E2E-Dateien) | grün |
| `pnpm lint` (alle sechs Pakete) | grün |
| `pnpm test` | 284 Tests grün (csv 50, pdf 2, web 232); vorher 279, neu sind fünf Tests in `fund-type.test.ts` |
| `pnpm build` | grün, Next.js 16.4.2 mit Turbopack, 11 Routen statisch |
| `pnpm test:e2e` mit `CI=true` | 30 Tests grün im ersten Durchlauf, ohne Wiederholung (`depotdoktor.spec.ts` 16, `site.spec.ts` 14), darin axe-core bei 390, 768 und 1280 px ohne Verstöße und kein waagrechter Überlauf bei 320 px; danach Port 3811 frei |
| `pnpm audit --prod` / `pnpm audit` | keine Meldung / nur braces über eslint-config-next (unverändert) |
