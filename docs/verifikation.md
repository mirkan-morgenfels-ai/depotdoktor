# Verifikation und offene Punkte (K1 DepotDoktor)

Stand: 03.09.2026. Quellen zur Steuerlogik gehören hierher, nicht in den Code.

## Prüfstand der Steuerlogik

| Fall | Erwartung (Umsetzungsdokument 1.3.4) | Test | Gegen offizielle Quelle geprüft |
|---|---|---|---|
| A Normalfall 2026, 10.000 €, Zuwachs 1.500 € | Basisertrag 224,00 €, steuerpflichtig 156,80 €, Steuer 41,36 € | `vorabpauschale.test.ts` | offen (Stiftung-Warentest-Rechner, Finanztip) |
| B Zuwachs 150 € unter Basisertrag | Vorabpauschale 150,00 €, Steuer 27,69 € | `vorabpauschale.test.ts` | offen |
| C Verlustjahr | Vorabpauschale 0 € | `vorabpauschale.test.ts` | offen |
| D Kauf am 1. Juli, Bezugswert 10.000 € | Basisertrag 112,00 €, Steuer 20,68 € | `vorabpauschale.test.ts` | offen, siehe unten |
| E FIFO 10 @ 80, 10 @ 100, Verkauf 12 @ 120 | Veräußerungsgewinn 440 € | `fifo.test.ts` | offen |

Rechtsgrundlagen laut Umsetzungsdokument: § 18 InvStG (Vorabpauschale), § 20 InvStG (Teilfreistellung), BMF-Schreiben vom 13.01.2026 (Basiszins 2026: 3,20 %, Az. IV C 1 - S 1980/00230/012/001), BMF-Schreiben vom 10.01.2025 (Basiszins 2025: 2,53 %).

## Zu verifizieren

1. **Zwölftelung bei unterjährigem Kauf (Fall D).** Das Umsetzungsdokument kürzt den Basisertrag um 1/12 je vollen Monat vor dem Kaufmonat. § 18 Abs. 2 InvStG spricht davon, dass sich die *Vorabpauschale* vermindert. Beide Varianten liefern dasselbe Ergebnis, solange der Wertzuwachs-Deckel nicht greift; greift er, weichen sie ab (Beispiel im Test: 112,00 € gegenüber 75,00 €). Implementiert ist die Dokument-Variante als Standard (`reductionTarget: "basisertrag"`), die Gesetzes-Variante ist per Parameter wählbar. Prüfen gegen: BMF-Anwendungsschreiben zum InvStG, Vorabpauschale-Rechner der Stiftung Warentest, Finanztip-Beispiel mit unterjährigem Kauf und geringem Zuwachs.
2. **Bezugsgröße bei unterjährigem Kauf.** Implementiert: Stück × Rücknahmepreis am Jahresanfang (auch für später gekaufte Anteile), Wertzuwachs = Stück × (Kurs 31.12. − Kurs 01.01.). Alternative: Anschaffungspreis als Bezugswert. Prüfen gegen dieselben Quellen wie Punkt 1.
3. **Basiszins vor 2025.** Nur 2025 und 2026 sind hinterlegt. Weitere Jahre erst nach Nachweis über das jeweilige BMF-Schreiben ergänzen (`apps/web/lib/depotdoktor/tax/constants.ts`).
4. **Anrechnung versteuerter Vorabpauschalen beim Verkauf.** Die FIFO-Logik führt je Tranche einen Betrag „versteuerte Vorabpauschale je Anteil“ und zieht ihn vom Veräußerungsgewinn ab. Ohne Kursdaten der Vorjahre ist dieser Betrag heute 0; eine Eingabemöglichkeit fehlt noch.
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

1. **„Quelloffen“ und „auf GitHub“.** Startseite, Impressum, Nutzungsbedingungen, Fußzeile und Datenschutzerklärung (Abschnitt 6) sprechen von quelloffenem Code auf GitHub. Das Repository `mirkan-morgenfels-ai/AI-Project-1` ist derzeit privat (öffentlich 404). Entweder vor der Bewerbungsphase öffentlich stellen und verlinken oder die Formulierungen ändern.
2. **Steuerjahr-Vorbelegung.** Der Reiter Steuer startet mit 2026, obwohl das Jahr läuft; der Kurs 31.12.2026 existiert noch nicht. Alternative: letztes abgeschlossenes Jahr oder Jahr der letzten Buchung vorbelegen.
3. **Max Drawdown nach Vollverkauf.** Wird das Depot vollständig verkauft und später neu bespart, startet der TWR-Index bei 1, der alte Höchststand bleibt aber bestehen; der ausgewiesene Drawdown ist dann kein echter Kursrückgang. Randfall, bislang ohne Test.
4. **Standardwerte im Steuerreiter.** Kurs 01.01. und 31.12. sind mit demselben Wert vorbelegt, damit ist die Vorabpauschale ohne Eingabe immer 0 €. Die Kacheln zeigen 0,00 € statt „Kurse fehlen“. Bewusst so gelassen, weil das Umsetzungsdokument Nutzereingabe vorsieht; eine Kennzeichnung „vorläufig“ wäre möglich.
