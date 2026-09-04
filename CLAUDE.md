# Projekt: DepotDoktor (K1)

Zweck: Clientseitiger Depot-Steuer- und Performance-Analyzer für deutsche Broker-CSV-Exporte. Keine Server-Uploads, kein Konto, kein Speicher.

Maßgebliche Quelle für Umfang, Formeln, Datenformate und Zeitplan ist das Umsetzungsdokument „K1 DepotDoktor" (Teil 1). Bei Widerspruch zwischen Dokument und Anfrage: hinweisen und vorschlagen, welches Dokument angepasst wird, statt still abzuweichen.

## Stack

Next.js 15 App Router, TypeScript strict, Tailwind CSS 4, Papa Parse, Recharts, @react-pdf/renderer, decimal.js.
Tests: Vitest (Unit), Playwright (E2E). pnpm Workspaces. CI: GitHub Actions. Hosting: Vercel Hobby (nur nicht-kommerziell).

## Struktur

- `apps/web/app/projects/depotdoktor/` Seite, Report-Ansicht, Reiter
- `apps/web/lib/depotdoktor/` Transaktionsmodell, Kennzahlen, Steuerlogik, Unit-Tests in `__tests__/`
- `packages/csv/` Parser, Broker-Erkennung, Normalisierung, Fixtures
- `packages/ui/` Basiskomponenten, `packages/charts/` Diagramme, `packages/pdf/` Report-Vorlage, `packages/legal/` Disclaimer, Impressum, Datenschutz
- `docs/verifikation.md` Prüfstand der Steuerlogik, offene Punkte, Quellen

## Regeln

- Alle Finanzrechnungen laufen im Browser. Keine Nutzerdaten an Server oder API senden, auch nicht „zur Vereinfachung".
- Geldbeträge mit decimal.js. Keine binären Floats in der Steuerlogik. Parser liefern Beträge als Dezimal-Strings, die Fachlogik wandelt in Decimal.
- Jede Kennzahl und jeder Steuerfall bekommt einen Unit-Test mit von Hand gerechnetem Erwartungswert. Der Test entsteht zusammen mit der Funktion.
- Keine Steuerregeln erfinden. Nicht im Umsetzungsdokument belegte Regeln in `docs/verifikation.md` als „zu verifizieren" führen und die Prüfquelle nennen (BMF-Schreiben, Vorabpauschale-Rechner der Stiftung Warentest, Finanztip).
- Parser erkennen das Format an der Kopfzeile und brechen bei unbekanntem Format mit klarer Meldung ab.
- Deutsch in der Oberfläche, Englisch in Code-Bezeichnern. Keine Kommentarzeilen im Code; Erklärungen in README oder `docs/`.
- Der Disclaimer (keine Anlage- oder Steuerberatung, Angaben ohne Gewähr, maßgeblich ist die Abrechnung der Bank) steht auf jeder Report-Seite und im PDF.
- Design: kein Blau. Palette Schwarz, Weiß, Gold, Grün, Bordeaux. Lieber mehr Seiten als gedrängt.

## Arbeitsweise

- Jede Aufgabe einem Schritt zuordnen: 1 Setup und CI, 2 Parser, 3 Kennzahlen, 4 Steuermodul, 5 Report und PDF, 6 Recht.
- Feature-Branches `feat/<thema>`, Fixes `fix/<thema>`. `main` ist immer deploybar. Ein PR pro abgeschlossenem Schritt; Dennis merged selbst.
- Offene Entscheidungen (Fondstyp-Bestimmung, Bezugsgröße bei unterjährigem Kauf, Formate DKB/ING/comdirect) mit Optionen und Empfehlung vorlegen und auf Dennis warten.

## Befehle

- `pnpm install`
- `pnpm dev` Entwicklung unter http://localhost:3000/projects/depotdoktor
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- `pnpm test:e2e` Playwright

## Definition of Done

- Tests grün, Typecheck grün, Lint grün, Build grün.
- Neue Kennzahl im Report sichtbar und im PDF enthalten.
- Grenzfälle getestet: leere CSV, ein Trade, nur Käufe, Verlustjahr, unterjähriger Kauf.
- Netzwerk-Tab zeigt nach dem Laden der Seite keinen Upload.
