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

## Abweichungen vom Umsetzungsdokument

- **Ableitung im Newton-Beispiel (1.3.2).** Das Dokument nennt NPV′(0,08) ≈ −25.833. Nachgerechnet: NPV′(0,08) = 5.000/1,08² − 2 · 17.600/1,08³ = 4.286,69 − 27.942,89 = −23.656,20. Der erste Newton-Schritt landet damit bei 0,0994 statt 0,0978. Am Ergebnis (IRR = 10 %) ändert das nichts; das Dokument sollte korrigiert werden.
- **Steuer-Quellen in Kommentaren (CLAUDE.md-Beispiel in 0.3).** Regel 6 der Projektanweisung verbietet Kommentarzeilen. Quellen stehen deshalb in dieser Datei und in den Testnamen.
- **Floats in den Code-Beispielen (1.7).** Die Skizzen rechnen mit `number`; umgesetzt ist decimal.js für alle Geldbeträge. Nur der IRR-Löser (Nullstellensuche einer Rate) arbeitet mit `number`, die Zahlungsströme werden an der Schnittstelle konvertiert.

## Entscheidungen, die Dennis treffen muss

1. Depotsicht oder Kontosicht für TTWROR und IRR. Umgesetzt ist die Depotsicht: Käufe, Verkäufe, Dividenden, Gebühren und Steuern sind externe Zahlungsströme; Einzahlungen, Auszahlungen und Zinsen des Verrechnungskontos fließen nicht ein. Empfehlung: dabei bleiben, weil die Vorabpauschale ohnehin nur das Depot betrifft und Kontozinsen die Depotrendite verfälschen würden.
2. Volatilität und Max Drawdown ohne Tageskurse anzeigen (mit Hinweis) oder ausblenden, bis Kursdaten vorliegen. Umgesetzt: anzeigen mit Hinweis.
3. README-Widerspruch: „Netzwerk-Tab zeigt keine weiteren Anfragen“ gegenüber „optional Vercel Web Analytics“. Empfehlung: Analytics weglassen, Aussage im README bleibt dann wahr; der E2E-Test prüft, dass keine Anfrage die Seite verlässt.
