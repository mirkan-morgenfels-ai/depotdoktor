# Verifikation und offene Punkte (K1 DepotDoktor)

Stand: 07.10.2026 (Kurse je Steuerjahr, siehe letzter Abschnitt). Quellen zur Steuerlogik gehören hierher, nicht in den Code.

## Prüfstand der Steuerlogik

| Fall | Erwartung (Umsetzungsdokument 1.3.4) | Test | Gegen offizielle Quelle geprüft |
|---|---|---|---|
| A Normalfall 2026, 10.000 €, Zuwachs 1.500 € | Basisertrag 224,00 €, steuerpflichtig 156,80 €, Steuer 41,36 € | `vorabpauschale.test.ts` | offen (Stiftung-Warentest-Rechner, Finanztip) |
| B Zuwachs 150 € unter Basisertrag | Vorabpauschale 150,00 €, Steuer 27,69 € | `vorabpauschale.test.ts` | offen |
| C Verlustjahr | Vorabpauschale 0 € | `vorabpauschale.test.ts` | offen |
| D Kauf am 1. Juli, Bezugswert 10.000 € | Basisertrag 112,00 €, Steuer 20,68 € | `vorabpauschale.test.ts` | offen, siehe unten |
| E FIFO 10 @ 80, 10 @ 100, Verkauf 12 @ 120 | Veräußerungsgewinn 440 € | `fifo.test.ts` | offen |

Rechtsgrundlagen laut Umsetzungsdokument: § 18 InvStG (Vorabpauschale), § 20 InvStG (Teilfreistellung), BMF-Schreiben vom 13.01.2026 (Basiszins 2026: 3,20 %, Az. IV C 1 - S 1980/00230/012/001), BMF-Schreiben vom 10.01.2025 (Basiszins 2025: 2,53 %, Az. IV C 1 - S 1980/00230/009/002, BStBl I 2025, 273). Die Konstanten in `tax/constants.ts` wurden am 06.10.2026 gegen diese Schreiben und den Gesetzestext geprüft und stimmen (Abschnitt „Lückenschluss 06.10.2026“).

## Zu verifizieren

1. **Zwölftelung bei unterjährigem Kauf (Fall D).** Das Umsetzungsdokument kürzt den Basisertrag um 1/12 je vollen Monat vor dem Kaufmonat. § 18 Abs. 2 InvStG spricht davon, dass sich die *Vorabpauschale* vermindert. Beide Varianten liefern dasselbe Ergebnis, solange der Wertzuwachs-Deckel nicht greift; greift er, weichen sie ab (Beispiel im Test: 112,00 € gegenüber 75,00 €). Implementiert ist die Dokument-Variante als Standard (`reductionTarget: "basisertrag"`), die Gesetzes-Variante ist per Parameter wählbar. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG, Vorabpauschale-Rechner der Stiftung Warentest, Finanztip-Beispiel mit unterjährigem Kauf und geringem Zuwachs.
2. **Bezugsgröße bei unterjährigem Kauf.** Implementiert: Stück × Rücknahmepreis am Jahresanfang (auch für später gekaufte Anteile), Wertzuwachs = Stück × (Kurs 31.12. − Kurs 01.01.). Alternative: Anschaffungspreis als Bezugswert. Prüfen gegen dieselben Quellen wie Punkt 1.
3. **Basiszins vor 2025.** Nur 2025 und 2026 sind hinterlegt. Weitere Jahre erst nach Nachweis über das jeweilige BMF-Schreiben ergänzen (`apps/web/lib/depotdoktor/tax/constants.ts`).
4. ~~**Anrechnung versteuerter Vorabpauschalen beim Verkauf.** Eingabemöglichkeit fehlt.~~ Erledigt am 06.10.2026: Eingabe je Verkauf im Steuerreiter, Einzelheiten im Abschnitt „Lückenschluss 06.10.2026“. Weiter zu verifizieren: ob die Minderung nach § 19 Abs. 1 Satz 3 InvStG einen Veräußerungsverlust ergeben darf (implementiert: rein rechnerische Minderung, der Gewinn kann negativ werden) und wie Banken den Betrag in der Verkaufsabrechnung ausweisen. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG (Randziffern zu § 19), eine echte Verkaufsabrechnung mit angesetzten Vorabpauschalen.
5. **Sparerpauschbetrag, Kirchensteuer, Verlusttöpfe** sind nicht berücksichtigt; die Oberfläche sagt das.

## Zu verifizieren an echten Exporten

1. **Trade-Republic-Kopfzeile.** Im Umsetzungsdokument ist die 23-spaltige Kopfzeile nach `"tax"` abgeschnitten. Die Fixture `packages/csv/fixtures/traderepublic-synthetic.csv` verwendet eine angenommene Fortsetzung (`original_amount`, `fx_rate`, `currency`, `mcc_code`, `card_number`, `card_id`, `holder_name`, `seller_name`, `seller_city`, `isin`). Der Parser erkennt das Format an den zwölf Pflichtspalten `datetime, date, account_type, category, type, asset_class, name, shares, price, amount, fee, tax` und liest die übrigen Spalten nur, wenn sie vorhanden sind. Ob die ISIN im Export enthalten ist und wie die Spalte heißt, muss an einem echten Export geprüft werden.
2. **Trade-Republic-Werte in `category` und `type`.** Die Zuordnung (Kauf, Verkauf, Dividende, Zinsen, Einzahlung, Kartenzahlung, Gebühr, Steuer) arbeitet mit Schlüsselwörtern (`BUY`, `SELL`, `DIVIDEND`, `INTEREST`, `PAYIN`, `PAYOUT`, `CARD`, `FEE`, `TAX`, `SAVINGS_PLAN`, `SAVEBACK`, `ROUNDUP`). Unbekannte Werte landen als „Sonstiges“ mit Hinweis. Liste der echten Werte an einem Export sammeln.
3. **Vorzeichen des Betrags bei Trade Republic.** Der Parser normalisiert das Vorzeichen anhand der Buchungsart (Kauf negativ, Verkauf positiv), ist also gegen beide Konventionen robust. Trotzdem an einem Export prüfen, ob `amount` bei Käufen negativ ist.
4. **Scalable-Capital-Werte in `type` und `assetType`.** Bekannt aus dem PP-Forum: `Buy`, `Security`. Angenommen: `Sell`, `Distribution`, `Deposit`, `Withdrawal`, `Interest`, `Fee`, `Cash`. Zeilen mit `status` ungleich `Executed` werden übersprungen.
5. **Assetklasse bei Scalable Capital.** `assetType = Security` unterscheidet nicht zwischen Aktie und ETF; solche Positionen erscheinen als „Nicht zugeordnet“. Fondstyp wählt der Nutzer im Steuerreiter.

## Rechtstexte (Schritt 6), zu verifizieren

Die Texte unter `/impressum`, `/datenschutz` und `/nutzungsbedingungen` wurden ohne juristische Prüfung erstellt. Offene Punkte, die Dennis prüfen oder entscheiden muss:

1. **Impressum ohne Anschrift.** Dennis möchte keine Adresse auf der Seite; genannt sind Name, Ort und E-Mail. § 5 DDG verlangt für „geschäftsmäßige“ Telemedien eine ladungsfähige Anschrift; für rein private, nicht-kommerzielle Seiten gilt die Pflicht nach herrschender Lesart nicht. Eine Portfolio-Seite zur Bewerbung liegt dazwischen. Optionen: (a) so lassen und das Risiko einer Abmahnung tragen, (b) Adresse ergänzen, (c) Impressum-Service mit c/o-Adresse nutzen. Prüfen gegen: BMJ-Leitfaden zur Impressumspflicht, Verbraucherzentrale, e-recht24.
2. **Vercel als Auftragsverarbeiter.** Anschrift von Vercel Inc. und die Angabe zur Zertifizierung unter dem EU-US Data Privacy Framework gegen https://vercel.com/legal/privacy-policy und https://www.dataprivacyframework.gov prüfen. Ein Auftragsverarbeitungsvertrag (DPA) mit Vercel ist Teil der Vercel-Nutzungsbedingungen; im Dashboard nachsehen, ob er akzeptiert wurde.
3. **Nutzungsbedingungen.** Ein vollständiger Haftungsausschluss ist nach § 309 Nr. 7 BGB unwirksam; der Text beschränkt die Haftung deshalb auf Vorsatz, grobe Fahrlässigkeit und Personenschäden und verweist für die unentgeltliche Überlassung auf §§ 521, 599 BGB. Ob diese Formulierung trägt, ist juristisch zu prüfen.
4. **Kontaktadresse.** Im Impressum steht die private Gmail-Adresse. Falls eine eigene Domain kommt, auf eine Adresse dieser Domain umstellen (`packages/legal/src/operator.ts`).

## Abweichungen vom Umsetzungsdokument

- **Ableitung im Newton-Beispiel (1.3.2).** Das Dokument nennt NPV′(0,08) ≈ −25.833. Nachgerechnet: NPV′(0,08) = 5.000/1,08² − 2 · 17.600/1,08³ = 4.286,69 − 27.942,89 = −23.656,20. Der erste Newton-Schritt landet damit bei 0,0994 statt 0,0978. Am Ergebnis (IRR = 10 %) ändert das nichts; das Dokument sollte korrigiert werden.
- **Steuer-Quellen in Kommentaren (CLAUDE.md-Beispiel in 0.3).** Regel 6 der Projektanweisung verbietet Kommentarzeilen. Quellen stehen deshalb in dieser Datei und in den Testnamen.
- **Floats in den Code-Beispielen (1.7).** Die Skizzen rechnen mit `number`; umgesetzt ist decimal.js für alle Geldbeträge. Nur der IRR-Löser (Nullstellensuche einer Rate) arbeitet mit `number`, die Zahlungsströme werden an der Schnittstelle konvertiert.

## Getroffene Entscheidungen (03.09.2026, von Dennis noch nicht ausdrücklich bestätigt)

1. Depotsicht für TTWROR und IRR: Käufe, Verkäufe, Dividenden, Gebühren und Steuern sind externe Zahlungsströme; Einzahlungen, Auszahlungen und Zinsen des Verrechnungskontos fließen nicht ein. Begründung: Die Vorabpauschale betrifft nur das Depot, Kontozinsen würden die Depotrendite verfälschen.
2. Volatilität und Max Drawdown werden ohne Tageskurse angezeigt, mit Hinweis in Oberfläche und PDF.
3. Keine Vercel Web Analytics. Der README-Satz „keine weiteren Anfragen“ bleibt damit wahr; der E2E-Test prüft ihn bei jedem Pull Request.
4. PDF-Report nutzt die eingebauten PDF-Schriften (Helvetica, Times), damit keine Schriftdatei nachgeladen werden muss. Zeichen außerhalb von WinAnsi (Minuszeichen U+2212, Pfeil, schmale Leerzeichen) werden vor dem Rendern ersetzt.
5. Diagramme verwenden nur Grün als Datenfarbe (eine Serie je Diagramm). Die Projektpalette (Gold, Grün, Bordeaux, Schwarz) besteht den Farbsehschwäche-Test für mehrfarbige Kategorien nicht; sobald ein Diagramm mehrere Serien braucht, sind Beschriftung oder Muster statt Farbe nötig.

## Dateityp-Prüfung 09.09.2026

Anlass: Beim Test von KontoKlar (K2) zog Dennis einen PDF-Kontoauszug in das CSV-Feld; die Anwendung las die Binärdatei als Text und zeigte Bytemüll als „erkannte Kopfzeile“. DepotDoktor hatte dieselbe Lücke: `file.text()` dekodierte jede Datei als UTF-8, die Kopfzeilenerkennung schlug fehl, und die Meldung „Format nicht erkannt“ zitierte die ersten Bytes der PDF als „gefundene Spalten“.

Umgesetzt:

1. `packages/csv/src/filekind.ts`: `detectFileKind` prüft die Bytes vor jeder Textverarbeitung. `%PDF-` ergibt `pdf`, `PK` (ZIP, damit auch xlsx/docx) ergibt `zip`, Nullbytes oder mehr als 5 % Steuerzeichen in den ersten 4 KB ergeben `binary`, 0 Byte ergibt `empty`. Nur `text` gelangt zum Parser. Zu jeder Nicht-Text-Art gibt es eine deutsche Meldung mit dem Exportweg beider Broker.
2. `decodeCsvBytes` dekodiert UTF-8 strikt und fällt bei ungültigen Sequenzen auf Windows-1252 zurück; vorher wurden Umlaute aus Latin-Exporten als U+FFFD gelesen.
3. `parseBrokerCsv` bricht zusätzlich bei Text ab, der mit `%PDF-` beginnt (zweite Sicherung für Aufrufer, die einen String übergeben).
4. Drop-Zone nennt ausdrücklich: nur CSV, keine PDF-Kontoauszüge, keine Excel-Dateien.
5. Tests: 12 Unit-Tests (`filekind.test.ts`) mit Signaturen, Steuerzeichen-Anteil, BOM, Windows-1252 und PDF-Text im Parser; 2 Playwright-Tests laden eine PDF- und eine xlsx-Datei hoch und erwarten die Meldung ohne Report und ohne „Gefundene Spalten“.

~~Nicht abgedeckt: UTF-16-Exporte.~~ Seit 06.10.2026 werden UTF-16-Dateien mit BOM (`FF FE` little endian, `FE FF` big endian) erkannt und dekodiert; UTF-16 ohne BOM wird weiterhin als Binärdatei abgelehnt (siehe Abschnitt „Lückenschluss 06.10.2026“).

## Gesamtprüfung 06.09.2026 (Funktion, Datenschutz, Sicherheit, Layout, Zugänglichkeit)

Geprüft: Typecheck, Lint, 115 Unit-Tests, Build, 5 Playwright-Tests gegen den Prod-Server, `pnpm audit`, axe-core (WCAG 2.1 AA und Best Practices) auf allen Seiten und Reitern in Desktop- und Mobilbreite, Tastaturreihenfolge, Antwort-Header, PDF-Ausgabe.

Behoben:

1. **Sicherheits-Header.** `next.config.ts` setzt jetzt Content-Security-Policy (`connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`; `'wasm-unsafe-eval'` für die Yoga-Layout-Engine von @react-pdf; `connect-src` zusätzlich `data:`, weil Yoga sein WASM-Binary per `fetch` auf eine data-URL lädt und sonst eine CSP-Verletzung meldet, bevor es auf die Base64-Dekodierung zurückfällt; `data:` ist kein Netzwerkziel), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security und Cross-Origin-Opener-Policy. `connect-src 'self'` macht das Datenschutzversprechen technisch durchsetzbar: Der Browser blockiert jede Anfrage an fremde Hosts. Der E2E-Test mit PDF-Download läuft unter dieser Policy.
2. **Abhängigkeiten.** `pnpm audit` meldete vier Lücken in `postcss` (transitiv über `next`, nur Build-Zeit). Override `postcss >= 8.5.23` in `package.json`; Audit ist leer.
3. **Layout mobil.** Die Kopfzeile lief bei 390 px Breite über den Rand (horizontales Scrollen auf allen Seiten). Navigation umbricht jetzt; Reiter-Leiste umbricht ebenfalls.
4. **Kontrast.** Gold `#b8962e` erreicht auf Papier nur 2,7:1. Für Text gibt es jetzt `--color-gold-deep: #7f6619` (5,2:1 auf Papier, 4,6:1 auf Gold-Soft); Gold bleibt für Linien und Flächen. Betroffen: „Projekt K1“, Hinweis „Deckel“, Hover-Farbe der Links.
5. **Zugänglichkeit.** Reiter nach WAI-ARIA-Muster (`aria-controls`, `tabpanel`, Pfeiltasten, Home/End, Roving Tabindex); horizontal scrollbare Tabellen mit `tabindex="0"` und Beschriftung erreichbar; Sprunglink „Zum Inhalt springen“; sichtbarer Fokusring in Gold-Deep; Datei-Input mit `aria-label`; Navigation als Liste mit `aria-label`. axe-core meldet keine Verstöße mehr.
6. **Datei-Eingabe.** Dateien über 25 MB werden mit Meldung abgelehnt, Lesefehler werden abgefangen statt unbehandelt zu bleiben.
7. **CSV-Export.** Textzellen, die mit `=`, `+`, `@`, Tab oder einem Minus ohne Ziffer beginnen, erhalten ein führendes Apostroph (Schutz vor Formelauswertung in Tabellenkalkulationen). Unit-Test ergänzt.
8. **Favicon** (`apps/web/app/icon.svg`), vorher 404 in der Konsole.
9. **PDF.** Erstellungsdatum nutzt die lokale Zeit statt UTC.
10. **README.** „Papa Parse (Web Worker)“ gestrichen (kein Worker im Einsatz), Volatilitätsbeschreibung präzisiert, „Kirchensteuer optional“ und Sparerpauschbetrag als nicht berücksichtigt ausgewiesen, Roadmap-Stand aktualisiert.

Nicht geändert, von Dennis zu entscheiden:

1. ~~**„Quelloffen“ und „auf GitHub“.**~~ Erledigt am 06.10.2026: Startseite, Impressum, Datenschutzerklärung und Nutzungsbedingungen sagen nur noch, dass der Quellcode unter der MIT-Lizenz steht, ohne Behauptung öffentlicher Einsehbarkeit („zur Verfügung“, „quelloffen“, „auf GitHub“) und ohne Repo-Link. Ob das Repository `mirkan-morgenfels-ai/AI-Project-1` öffentlich gestellt wird, entscheidet weiterhin Dennis; danach könnte ein Link ergänzt werden.
2. **Steuerjahr-Vorbelegung.** Der Reiter Steuer startet mit 2026, obwohl das Jahr läuft; der Kurs 31.12.2026 existiert noch nicht. Alternative: letztes abgeschlossenes Jahr oder Jahr der letzten Buchung vorbelegen.
3. ~~**Max Drawdown nach Vollverkauf.**~~ Erledigt am 06.10.2026, Begründung und Testfälle im Abschnitt „Lückenschluss 06.10.2026“.
4. **Standardwerte im Steuerreiter.** Kurs 01.01. und 31.12. sind mit demselben Wert vorbelegt, damit ist die Vorabpauschale ohne Eingabe immer 0 €. Die Kacheln zeigen 0,00 € statt „Kurse fehlen“. Bewusst so gelassen, weil das Umsetzungsdokument Nutzereingabe vorsieht; eine Kennzeichnung „vorläufig“ wäre möglich.
5. ~~**Kurse im Steuerreiter gelten für alle Steuerjahre.**~~ Erledigt am 07.10.2026 nach Option (a), entschieden von Dennis: Kurs 01.01. und 31.12. werden je Steuerjahr und Position gespeichert, der Fondstyp weiter je Position. Beim Wechsel des Steuerjahres erscheinen die für dieses Jahr eingegebenen Kurse oder, ohne Eingabe, die Vorbelegung dieses Jahres, nie die Kurse eines anderen Jahres. Eine Änderung des Fondstyps gilt für alle Jahre und schreibt keine Kursvorbelegung mehr fest. Die Eingaben zu angesetzten Vorabpauschalen je Verkauf sind unverändert. Der PDF-Export nutzt die Kurse des gewählten Jahres und nennt das Jahr in der Fußnote. Einzelheiten im Abschnitt „Kurse je Steuerjahr 07.10.2026“. Ursprünglicher Befund vom 06.10.2026: Fondstyp, Kurs 01.01. und Kurs 31.12. hingen gemeinsam an der Position; wer 2026 Kurse eintrug und auf 2025 umschaltete, sah dieselben Werte unter „Kurs 01.01.2025“. Schon eine Änderung des Fondstyps hat die Kursvorbelegung des gerade gewählten Jahres für alle Jahre festgeschrieben. Optionen waren (a) Kurse je Jahr speichern, Fondstyp je Position behalten, (b) beim Jahreswechsel alle Eingaben zurücksetzen, (c) so lassen.

## Lückenschluss 06.10.2026

Branch `fix/k1-luecken` auf Stand `origin/main` (`abf057e`).

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234. `packageManager` steht seit dem 06.10.2026 wie in K2 und K3 auf `pnpm@10.34.5`; vorher pinnte das Repo 10.28.0, und die automatische Versionsumschaltung von pnpm schlug auf diesem Rechner fehl. Die CI übernimmt die Version aus `packageManager`.

| Schritt | Ausgangslage vor den Änderungen | Nach den Änderungen |
|---|---|---|
| `pnpm install --frozen-lockfile` | grün | grün |
| `pnpm typecheck` | grün | grün |
| `pnpm lint` | grün | grün |
| `pnpm test` | 127 Tests grün (csv 42, pdf 1, web 84) und 1 offener `todo` | 155 Tests grün (csv 50, pdf 1, web 104) und 1 offener `todo` |
| `pnpm build` | grün | grün |
| `pnpm test:e2e` mit `CI=true`, `E2E_SERVER=start` | 7 Tests grün | 10 Tests grün |
| axe-core 4.14 (WCAG 2.1 AA und Best Practices), 11 Seitenzustände je Desktop 1280 px und Mobil 390 px | nicht gemessen | 0 Verstöße |

Nachprüfung nach dem Review am 06.10.2026: Die Umschaltung von pnpm war für diesen Lauf nicht abgeschaltet. Typecheck, Lint, Unit-Tests und Build liefen deshalb mit denselben Befehlen wie die Paket-Skripte (`tsc --noEmit`, `eslint`, `vitest run`, `next build`), direkt aus `node_modules/.bin` je Paket. Die E2E-Tests liefen mit `CI=true` und der unveränderten `playwright.config.ts`; nur der Serverstart lief direkt über `next start` statt `pnpm start`. Ergebnisse wie in der Tabelle.

Der offene `todo` ist Fall D (Bezugsgröße und Kürzungsregel bei unterjährigem Kauf), siehe „Zu verifizieren“, Punkt 1 und 2.

### Texte zu Quellcode und Startseite

- Startseite, Impressum, Datenschutzerklärung und Nutzungsbedingungen behaupten keine öffentliche Einsehbarkeit mehr („Der Quellcode steht unter der MIT-Lizenz.“). Es gibt keinen Link auf das private Repository. Stand der Rechtsseiten: 06.10.2026.
- Startseite: KontoKlar ist verlinkt (https://kontoklar-eight.vercel.app/projects/kontoklar, neuer Tab, `rel="noopener noreferrer"`), NetzRadar steht als „in Arbeit“ ohne Link. Die Datenschutzerklärung nennt in Abschnitt 6 diesen externen Link statt GitHub.
- Der E2E-Test „Startseite und Rechtsseiten“ prüft Ziel, `rel` und `target` des Links und den Hinweis „in Arbeit“. Danach ruft er `/`, `/impressum`, `/datenschutz` und `/nutzungsbedingungen` auf (jeweils HTTP 200) und prüft, dass keine der vier Seiten „quelloffen“, „GitHub“ oder einen Satz mit „Quellcode … zur Verfügung“ enthält.
- **Voraussetzung für Merge und Deploy (Stand 06.10.2026):** Die live verlinkte KontoKlar-Seite hat noch ein unvollständiges Impressum. https://kontoklar-eight.vercel.app/impressum zeigt am 06.10.2026 „[Platzhalter: Straße und Hausnummer]“, „[Platzhalter: PLZ]“ und „[Platzhalter: E-Mail-Adresse]“, https://kontoklar-eight.vercel.app/datenschutz zeigt „[Platzhalter: Anschrift]“, „[Platzhalter: E-Mail-Adresse]“ und „[Platzhalter: Datum der Veröffentlichung]“. Im lokalen K2-Repo (Branch `fix/k2-sicherheit-und-luecken`) sind die Platzhalter entfernt, aber nicht committet und nicht deployt. Dieser Branch sollte deshalb erst gemergt und deployt werden, wenn die K2-Rechtsseiten live sind. Andernfalls verlinkt die Startseite aktiv auf ein Angebot mit unvollständigem Impressum, und Abschnitt 6 der Datenschutzerklärung verweist auf dessen Datenschutzerklärung. Die Alternative entscheidet Dennis: KontoKlar bis dahin wie NetzRadar ohne Link zeigen.

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
2. Gold erreicht auch mit dem neuen Wert keine 4,5:1 und bleibt Linien und Flächen vorbehalten. Im PDF war die kleine Kopfzeile über dem Titel noch in Gold gesetzt; sie nutzt jetzt Gold-Deep (5,96:1 auf Weiß).
3. axe-core findet weder in Desktop- noch in Mobilbreite Verstöße. Geprüft wurden Startseite, die drei Rechtsseiten, die Projektseite, alle vier Reiter mit der Beispieldatei und der Steuerreiter mit Verkauf, einmal mit gültiger und einmal mit ungültiger Eingabe. Die Drop-Zone im Ziehzustand prüft axe nicht; dafür gilt die Rechnung oben.
4. Die README-Screenshots (`docs/screenshots/`) sind mit der neuen Palette neu erzeugt: Trade-Republic-Testdatei, Viewport 1280 px, Skalierung 1,5, ETF-Kurs 31.12. auf 95,00 €.

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

E2E: Die Trade-Republic-Testdatei als UTF-16 LE mit BOM ergibt denselben Report (8 Buchungen, TTWROR +2,41 %).

### Max Drawdown nach Vollverkauf

Bisher wurde der Drawdown-Index am ersten Bewertungspunkt mit Bestand nach einem Punkt ohne Bestand auf 1 zurückgesetzt, der alte Höchststand blieb aber stehen. Das ergab je nach Vorgeschichte einen zu hohen oder einen zu niedrigen Wert. Ein Depotwert von 0 nach dem Vollverkauf zählte dagegen nicht als −100 %, weil der Verkaufserlös als Zahlungsstrom in die Periodenrendite eingeht.

Neu in `metrics/drawdown.ts`: Der Index startet beim ersten Punkt mit Bestand bei 1 und wird danach nie zurückgesetzt. Perioden, die an einem Punkt ohne Bestand beginnen, gehen mit 0 % ein. Der Index ist damit genau die Verkettung, aus der auch die TTWROR entsteht (`periodReturns` überspringt dieselben Perioden). Der Drawdown misst nur Kursrückgänge, während Kapital investiert ist; die Zeit ohne Bestand ist neutral.

| Fall (Wert / Zahlungsstrom je Buchungstag) | alt | neu | Handrechnung neu |
|---|---|---|---|
| 1.000 / +1.000, 0 / −1.100, 450 / +450, 405 / 0 | 18,18 % | 10,00 % | Index 1, 1,1, 1,1, dann 1,1 × 405/450 = 0,99; (1,1 − 0,99)/1,1 = 10 % |
| dieselben ersten drei Punkte (Neukauf ohne Kursänderung) | 9,09 % | 0,00 % | Index bleibt 1,1 |
| 1.000 / +1.000, 0 / −900, 0 / −5 (Ausschüttung nach dem Verkauf) | 10,00 % | 10,00 % | Index 1, dann 0,9, danach unverändert; kein −100 % |
| 1.000 / +1.000, 0 / −800, 500 / +500, 400 / 0 | 20,00 % | 36,00 % | Index 1, 0,8, 0,8, dann 0,8 × 400/500 = 0,64 |

Die Werte „alt“ sind mit der vorherigen Implementierung nachgerechnet. Tests stehen in `volatility-drawdown.test.ts`, Abschnitt „Max Drawdown nach Vollverkauf“. Dazu kommt ein Durchlauf über `buildReport` mit vier Buchungen (Kauf 10 @ 100, Verkauf 10 @ 110, Kauf 5 @ 90, Kauf 1 @ 81): Drawdown 10 %, TTWROR −1 %. Bei der Trade-Republic-Testdatei ändert sich nichts (−0,01 %).

### Steuerkonstanten geprüft

| Konstante | im Code | Quelle | Ergebnis |
|---|---|---|---|
| Basiszins 2025 | 2,53 % | BMF-Schreiben vom 10.01.2025, IV C 1 - S 1980/00230/009/002, BStBl I 2025, 273 (Wortlaut über die Haufe-Rechtsquellendatenbank) | stimmt |
| Basiszins 2026 | 3,20 % | BMF-Schreiben vom 13.01.2026, IV C 1 - S 1980/00230/012/001 (Haufe, Meldung „Basiszins zum 2.1.2026“) | stimmt |
| Teilfreistellung Aktienfonds | 30 % | § 20 Abs. 1 Satz 1 InvStG (gesetze-im-internet.de) | stimmt |
| Teilfreistellung Mischfonds | 15 % | § 20 Abs. 2 InvStG: Hälfte der Aktienteilfreistellung | stimmt |
| Teilfreistellung Immobilienfonds und Auslands-Immobilienfonds | 60 % und 80 % | § 20 Abs. 3 InvStG | stimmt |
| Sparer-Pauschbetrag | 1.000 € und 2.000 € | § 20 Abs. 9 Satz 1 und 2 EStG | stimmt |
| Zwölftelung, Zuflusszeitpunkt | 1/12 je vollem Monat vor dem Erwerbsmonat; Zufluss am ersten Werktag des Folgejahres | § 18 Abs. 2 und 3 InvStG | stimmt; ob der Basisertrag oder die Vorabpauschale gekürzt wird, bleibt offen („Zu verifizieren“, Punkt 1) |

Die Teilfreistellungssätze gelten für Anteile im Privatvermögen; die höheren Sätze für Betriebsvermögen bildet DepotDoktor nicht ab. Im Code ist nichts geändert.

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
- Eingabe 12,34 € im Jahr 2026: Die Positionseinstellungen bleiben die Vorbelegung, 2025 Kurs 100,00 € (letzter Kurs bis Ende 2025), 2026 Kurs 120,00 € (Verkaufskurs)
- Anrechnung je Tranche 1,50 € × 10 Stück = 15,00 € plus Eingabe 12,34 €: angezeigt 27,34 €, Gewinn 1.800 − 1.550 − 27,34 = 222,66 €. Ohne gültige Eingabe (leer, „abc“, Fondstyp „kein Fonds“) bleiben 15,00 € und 250 − 15 = 235,00 €

E2E: Kauf 10 @ 100 € im Jahr 2025, Verkauf 10 @ 120 € im Jahr 2026. Geprüft werden:

- Die Eingabe von 25,30 € ergibt 174,70 € statt 200,00 € in der Verkaufszeile und in der Kachel „Realisierte Gewinne 2026 (FIFO)“; die Kachel wird über ihre eigene `data-testid` angesprochen.
- Nach dem Wechsel auf 2025 stehen Kurs 01.01. und 31.12. weiter auf der Vorbelegung 100,00. Nach dem Wechsel zurück auf 2026 steht die Eingabe noch da.
- Zugänglicher Name und zugängliche Beschreibung des Felds.
- Ungültige Eingabe: Fehlermeldung in der Beschreibung, `aria-invalid`, Verkaufszeile und Kachel wieder bei 200,00 €.

Die Anrechnung je Tranche in `tax/fifo.ts` (`taxedVorabpauschalePerShare`) ist weiterhin 0, weil der Export keine Vorjahreskurse enthält. Rechnung und Anzeige verwenden die Summe beider Quellen (Punkt 3). Wird die Tranchen-Anrechnung künftig befüllt, etwa aus selbst geschätzten Vorabpauschalen der Vorjahre, beschreiben beide Quellen dieselbe Größe. Dann muss feststehen, welche Quelle gilt, damit derselbe Betrag nicht doppelt abgezogen wird; zum Beispiel ersetzt die Eingabe die Schätzung. Solange der Wert 0 ist, stellt sich die Frage nicht.

## Kurse je Steuerjahr 07.10.2026

Branch `fix/k1-kurse-je-jahr` auf Stand `main` nach dem Merge von PR #1 (`a28599e`). Dennis hat für den Bedienfehler aus „Nicht geändert, von Dennis zu entscheiden“, Punkt 5, Option (a) gewählt: Kurse je Steuerjahr und Position speichern, Fondstyp je Position behalten.

### Datenmodell

`apps/web/lib/depotdoktor/tax/inputs.ts`:

- `TaxInputs` hat zwei getrennte Teile: `fundTypes` (Schlüssel: Position) und `prices` (Schlüssel: Steuerjahr, darunter Position; die Felder `yearStartPrice` und `yearEndPrice` sind einzeln optional).
- `taxInputsReducer` kennt drei Aktionen: `setFundType` (Position, gilt für alle Jahre), `setPrice` (Jahr, Position, Feld, Wert) und `reset` (beim Laden einer neuen Datei und bei „Andere Datei“).
- Gespeichert wird nur, was eingegeben wurde, und zwar je Feld. `resolvePositionSettings` in `tax/summary.ts` setzt die Werte für ein Jahr zusammen: Fondstyp aus `fundTypes`, sonst der Standard nach Assetklasse; jedes Kursfeld aus `prices[Jahr][Position]`, sonst die Vorbelegung dieses Jahres (letzter Kurs aus dem Export bis zum 31.12. des Jahres). Ein geleertes Feld bleibt leer und fällt nicht auf die Vorbelegung zurück; die Oberfläche fordert dann wie bisher zur Eingabe auf.
- `buildTaxSummary(transactions, year, inputs, saleCredits)` nimmt diesen Zustand statt der bisherigen Positionseinstellungen entgegen. `TaxRow.settings` enthält weiterhin die für das gewählte Jahr aufgelösten Werte; Steuerreiter und PDF lesen sie wie zuvor.
- Die Eingaben angesetzter Vorabpauschalen je Verkauf bleiben ein eigener Zustand (Schlüssel: Buchung des Verkaufs) und sind unverändert.

### Oberfläche und PDF

- Der Steuerreiter meldet Änderungen als Aktion. Das Jahr einer Kursaktion ist das Jahr der angezeigten Zusammenfassung, also das Jahr aus der Feldbeschriftung („Kurs 01.01.2026 (€)“).
- Der Hinweis unter „So wird gerechnet“ (auch im PDF) lautet jetzt: vorbelegt ist der letzte Kurs aus dem Export bis zum Ende des Steuerjahres; eingetragene Kurse gelten nur für das gewählte Steuerjahr, der Fondstyp gilt für alle Jahre.
- Die PDF-Fußnote je Position nennt das Jahr: „Kurs 01.01.2026: … € · Kurs 31.12.2026: … €“ statt „Kurs 01.01.: … €“. Der PDF-Export nutzt wie die Ansicht die Zusammenfassung des gewählten Jahres.
- Die Kacheln Vorabpauschale, Steuerpflichtig und Geschätzte Steuer haben eigene `data-testid` (`tax-vorabpauschale`, `tax-taxable`, `tax-estimated-tax`) für den E2E-Test. Sichtbar ändert sich an ihnen nichts.
- Der README-Screenshot `docs/screenshots/steuer.png` ist neu erzeugt, weil er den Rechenhinweis zeigt. Verfahren wie am 06.10.2026: Trade-Republic-Testdatei, Viewport 1280 px, Skalierung 1,5, ETF-Kurs 31.12. auf 95,00 €. Gegenüber dem alten Bild unterscheidet sich nur der letzte Hinweis; Größe 1656 × 1577 Pixel wie zuvor.

### Tests

Unit-Tests in `tax-inputs.test.ts` (13 Tests). Testdaten: Kauf 10 @ 100 € am 03.03.2025, Kauf 5 @ 110 € am 15.01.2026. Handrechnungen:

| Fall | Rechnung | Erwartung |
|---|---|---|
| ohne Eingabe | Vorbelegung: letzter Kurs bis Ende 2025 bzw. 2026 | 2025: 100,00 / 100,00; 2026: 110,00 / 110,00; Vorabpauschale in beiden Jahren 0 € |
| 2026: 105 → 125, Aktienfonds | 10 × 105 × 3,2 % × 0,7 = 23,52; 5 × 105 × 3,2 % × 0,7 = 11,76 (Januarkauf, kein Monat entfällt); Wertzuwachs 15 × 20 = 300 deckelt nicht | Vorabpauschale 35,28 €, steuerpflichtig 35,28 × 0,7 = 24,696 €, Steuer 24,696 × 26,375 % = 6,51357 € |
| 2025: 01.01. vorbelegt 100, 31.12. eingegeben 110, Aktienfonds | 10 × 100 × 2,53 % × 0,7 = 17,71; Kauf im März, 2 Monate entfallen: × 10/12 = 14,7583; Wertzuwachs 10 × 10 = 100 deckelt nicht | Vorabpauschale 14,7583 €, steuerpflichtig 10,3308 €, Steuer 2,7248 € |
| Fondstyp Mischfonds, Kurse wie oben | Teilfreistellung 15 % | 2026: steuerpflichtig 35,28 × 0,85 = 29,988 €, Steuer 7,909335 €; 2025: 12,5446 €, Steuer 3,3086 € |
| Verkauf 10 @ 120 € im Jahr 2026 aus Kauf 10 @ 100 € im Jahr 2025, angesetzte Vorabpauschalen 25,30 € | 10 × (120 − 100) − 25,30 | 174,70 € ohne Kurseingaben, mit Kurseingaben und mit Mischfonds |

Weitere Fälle: Kurse für 2026 ändern 2025 nicht; die Eingaben beider Jahre bleiben beim Wechsel erhalten, ein nicht eingegebenes Feld bleibt bei der Vorbelegung seines Jahres; der Fondstyp gilt für 2025 und 2026 und legt keinen Kurs fest; ein geleertes Feld bleibt leer (keine Schätzung), nur im betroffenen Jahr; Eingaben betreffen nur die eigene Position; der Reducer verändert den vorigen Zustand nicht, `reset` liefert den leeren Zustand; PDF-Fußnote und Kachel nennen die Kurse und Summen des gewählten Jahres (2025: 100,00 € und 110,00 €, Vorabpauschale 14,76 €; 2026: 105,00 € und 125,00 €, Vorabpauschale 35,28 €, Steuer 6,51 €).

`sale-credit.test.ts` und `export.test.ts` übergeben jetzt den neuen Zustand statt der Positionseinstellungen; ihre Erwartungswerte sind unverändert.

E2E „Kurse im Steuerreiter gelten je Steuerjahr, der Fondstyp für alle Jahre, Andere Datei setzt beides zurück“ mit denselben zwei Käufen als Scalable-CSV:

1. 2026: Felder 110,00 / 110,00, Kacheln 0,00 €.
2. Eingabe 105,00 / 125,00: Vorabpauschale 35,28 €, steuerpflichtig 24,70 €, Steuer 6,51 €.
3. Wechsel auf 2025: Felder 100,00 / 100,00 (Vorbelegung 2025, nicht die Werte aus 2026), Kacheln 0,00 €.
4. Eingabe Kurs 31.12.2025 = 110,00: 14,76 €, 10,33 €, 2,72 €.
5. Zurück auf 2026: Felder 105,00 / 125,00, Kacheln 35,28 €, 24,70 €, 6,51 €.
6. Fondstyp Mischfonds: 35,28 €, 29,99 €, 7,91 €.
7. Wechsel auf 2025: Fondstyp Mischfonds, Felder 100,00 / 110,00, Kacheln 14,76 €, 12,54 €, 3,31 €.
8. „Andere Datei“, dieselbe Datei erneut laden, Steuerreiter: 2026 Fondstyp Aktienfonds, Felder 110,00 / 110,00, Kacheln 0,00 €; 2025 Fondstyp Aktienfonds, Felder 100,00 / 100,00, Kacheln 0,00 €. Das sind die Vorbelegungen aus Schritt 1 und 3.

Die Kacheln werden über ihre `data-testid` angesprochen und auf Beschriftung und Betrag am Anfang der Kachel geprüft, damit etwa „10,00 €“ nicht als „0,00 €“ durchgeht. Gegen den alten Stand wurde der E2E-Test nicht ausgeführt; nach dem Befund vom 06.10.2026 hätte Schritt 3 dort 105,00 / 125,00 gezeigt.

Der E2E-Test „Angesetzte Vorabpauschalen mindern den Veräußerungsgewinn, Andere Datei setzt sie zurück“ prüft dasselbe für die Eingabe je Verkauf: nach 25,30 € (Gewinn 174,70 €), „Andere Datei“ und erneutem Laden ist das Feld leer und der Gewinn wieder 10 × (120 − 100) = 200,00 €. Die Buchungsschlüssel (`sc-<Zeile>`) sind bei derselben Datei gleich, eine vergessene Rücksetzung würde den alten Betrag also wieder abziehen.

Zurückgesetzt wird an zwei Stellen in `DepotDoktorApp.tsx`: in `reset` („Andere Datei“) und in `loadText`. Das Dateifeld gibt es nur in der Ansicht ohne Report, und aus dem Report führt nur „Andere Datei“ dorthin. Eine zweite Datei lässt sich also nicht laden, ohne vorher `reset` auszulösen; die Rücksetzung in `loadText` ist über die Oberfläche nicht getrennt beobachtbar und bleibt als Absicherung stehen. Mutationsprüfung in einer Kopie außerhalb des Repos (nur die beiden E2E-Tests mit „Andere Datei“, ohne Wiederholungen, `next build` und `next start`):

| Mutation | Ergebnis |
|---|---|
| unverändert | grün |
| Rücksetzung der Steuereingaben in `reset` und `loadText` entfernt | rot: Fondstyp „mixed“ statt „equity“ |
| nur in `reset` entfernt | grün (`loadText` setzt zurück) |
| nur in `loadText` entfernt | grün (`reset` setzt zurück) |
| `setSaleCredits({})` in `reset` und `loadText` entfernt | rot: Feld zeigt „25,30“ statt leer |

### Prüfergebnisse

Lokal unter Windows 11 mit Node 22.23.2, pnpm 10.34.5 und Chromium Headless Shell 1234. Alle Schritte liefen über die pnpm-Skripte, die E2E-Tests mit dem Serverstart aus `playwright.config.ts` (`pnpm start`).

| Schritt | vor den Änderungen | nach den Änderungen |
|---|---|---|
| `pnpm install --frozen-lockfile` | grün | grün |
| `pnpm typecheck` | nicht erneut gemessen | grün |
| `pnpm lint` | nicht erneut gemessen | grün |
| `pnpm test` | 155 Tests grün (csv 50, pdf 1, web 104) und 1 offener `todo` | 168 Tests grün (csv 50, pdf 1, web 117) und 1 offener `todo` |
| `pnpm build` | nicht erneut gemessen | grün |
| `pnpm test:e2e` mit `CI=true`, `E2E_SERVER=start` | nicht erneut gemessen (06.10.2026: 10 Tests grün) | 11 Tests grün |

axe-core lief nicht erneut; am Markup des Steuerreiters kamen nur `data-testid`-Attribute hinzu.
