# Projekt: DepotDoktor (K1)

Arbeitsanweisungen für Claude Code (KI-gestützte Entwicklung).
Autor: Mirkan Deniz Günkaya.

## Zweck und Stand

Clientseitiger Depot-Steuer- und Performance-Analyzer für deutsche Broker-CSV-Exporte (Trade Republic, Scalable Capital). Keine Server-Uploads, kein Konto, keine Speicherung. Erstes Portfolio-Projekt vor K2 KontoKlar und K3 NetzRadar; die Startseite verlinkt alle drei Projekte und ihre öffentlichen Repos.

Stand 07.10.2026: Parser, Kennzahlen, Steuermodul, Report mit PDF- und CSV-Export und Rechtsseiten umgesetzt, live unter https://depotdoktor.vercel.app/projects/depotdoktor (die frühere Vercel-Adresse bleibt als Alias). Offen sind die Prüfung an echten Exporten und gegen einen externen Vorabpauschale-Rechner (`docs/verifikation.md`).

## Quellen

- Die ursprüngliche Spezifikation ist nicht Teil des Repos; maßgeblich sind dieses Dokument und `docs/verifikation.md`. Rechnerspezifisches steht in der nicht versionierten `CLAUDE.local.md`.
- Widerspricht eine Anfrage einem Dokument oder ein Dokument dem Code: hinweisen und vorschlagen, welches Dokument angepasst wird, statt still abzuweichen.
- Steuerregeln nur mit Beleg: Gesetzestext (InvStG, EStG), BMF-Schreiben; Prüfquellen Vorabpauschale-Rechner der Stiftung Warentest und Finanztip. Belege stehen in `docs/verifikation.md`, nicht im Code.

## Stack

- Root: pnpm 10.34.5 (`packageManager`), Node `^20.19.0 || >=22.12.0` (`engines`); CI Node 22.
- Next.js 15.5 App Router, React 19.3, TypeScript strict, Tailwind CSS 4, Papa Parse, Recharts, @react-pdf/renderer, decimal.js.
- Tests: Vitest (Unit), Playwright 1.63 mit axe-core (E2E). pnpm Workspaces. CI: GitHub Actions. Hosting: Vercel Hobby (nur nicht-kommerziell).

## Struktur

- `apps/web/app/projects/depotdoktor/` Seite
- `apps/web/components/depotdoktor/` Upload, Report-Ansicht, Reiter (Performance, Allokation, Steuer, Transaktionen), `ScrollRegion` für waagrecht scrollbare Tabellen
- `apps/web/lib/depotdoktor/` Transaktionsmodell, Kennzahlen (`metrics/`), Steuerlogik (`tax/`), Kachel-Texte für Ansicht und PDF (`kpis.ts`), PDF-Daten (`pdf-data.ts`), Unit-Tests in `__tests__/`
- `apps/web/lib/site.ts` Projekte, Navigation, Rechtslinks und Live-Adressen (einzige Stelle mit Live-URLs), `apps/web/lib/metadata.ts` Seitenmetadaten
- `apps/web/e2e/` Playwright-Tests (`depotdoktor.spec.ts`, `site.spec.ts`, `helpers.ts`)
- `packages/csv/` Parser, Broker-Erkennung, Normalisierung, Fixtures
- `packages/ui/` Basiskomponenten, `packages/charts/` Diagramme (Recharts), `packages/pdf/` Report-Vorlage (@react-pdf/renderer, Daten als reine Strings über `apps/web/lib/depotdoktor/pdf-data.ts`), `packages/legal/` Disclaimer, Datenschutztexte, Betreiberangaben
- `docs/verifikation.md` Prüfstand der Steuerlogik, offene Punkte, Quellen, Entscheidungen
- `docs/screenshots/` README-Bilder

## Feste Regeln

1. Alle Finanzrechnungen laufen im Browser. Keine Nutzerdaten an Server oder API senden, auch nicht „zur Vereinfachung“.
2. Geldbeträge mit decimal.js. Keine binären Floats in der Steuerlogik. Parser liefern Beträge als Dezimal-Strings, die Fachlogik wandelt in Decimal.
3. Jede Kennzahl und jeder Steuerfall bekommt einen Unit-Test mit von Hand gerechnetem Erwartungswert, die Rechnung steht im Testnamen oder als Ausdruck im Test. Bei Änderungen an Rechenregeln den Test vor der Änderung schreiben und den Unterschied alt/neu mit Rechtsgrundlage in `docs/verifikation.md` dokumentieren. Keine erfundenen Zahlen.
4. Keine Steuerregeln erfinden. Nicht belegte Regeln in `docs/verifikation.md` als „zu verifizieren“ führen und die Prüfquelle nennen.
5. Parser erkennen das Format an der Kopfzeile und brechen bei unbekanntem Format mit klarer Meldung ab.
6. Deutsch in der Oberfläche mit „Sie“, Englisch in Code-Bezeichnern. Keine Kommentarzeilen im Code (TS, TSX, JS, CSS, YAML, Konfiguration); Erklärungen in README oder `docs/`.
7. Der Disclaimer (keine Anlage- oder Steuerberatung, Angaben ohne Gewähr, maßgeblich ist die Abrechnung der Bank) steht auf jeder Report-Seite und im PDF.
8. Live-URLs nur in `apps/web/lib/site.ts`. Externe Links mit `rel="noopener noreferrer"`, ohne `target`, mit sichtbarem oder sr-only „(externe Seite)“.

## Arbeitsweise

- Jede Aufgabe einem Schritt zuordnen: 1 Setup und CI, 2 Parser, 3 Kennzahlen, 4 Steuermodul, 5 Report und PDF, 6 Recht.
- Offene Entscheidungen (Fondstyp-Bestimmung, Bezugsgröße bei unterjährigem Kauf, Steuerjahr-Vorbelegung, Formate DKB/ING/comdirect) mit Optionen und Empfehlung vorlegen und auf den Autor warten.
- Ehrliche Ergebnisse: Was nicht geprüft ist, steht als offen in `docs/verifikation.md` und im README.

## Befehle

- `pnpm install` (CI: `pnpm install --frozen-lockfile`)
- `pnpm dev` Entwicklung unter http://localhost:3000/projects/depotdoktor
- `pnpm typecheck` (einschließlich `apps/web/e2e` über `tsconfig.e2e.json`), `pnpm lint` (alle sechs Pakete), `pnpm test`, `pnpm build`
- `pnpm test:e2e` Playwright; mit `CI=true` nach `pnpm build` gegen `next start`, sonst gegen `next dev`. Port über `PORT` (Standard 3000). Ohne installierte Browser `PLAYWRIGHT_CHROMIUM_PATH=/pfad/zu/chromium` setzen.

## Git und Deployment

- Remote: https://github.com/mirkan-morgenfels-ai/depotdoktor, öffentlich seit 07.10.2026, Standardzweig `main`.
- Commit-Autor „Mirkan Deniz Günkaya“ mit der GitHub-noreply-Adresse `324466065+mirkan-morgenfels-ai@users.noreply.github.com`. Ohne die noreply-Adresse blockiert Vercel das Deployment.
- Commit-Stil: Conventional Commits auf Deutsch mit echten Umlauten, z. B. `feat(k1): …`, `fix(k1): …`, `test(k1): …`, `docs: …`, `ci: …`. Keine Verweise auf private Repos oder lokale Pfade in Commit-Nachrichten.
- Feature-Branch `feat/<thema>` bzw. `fix/<thema>`, Merge nach `main` bei grüner CI. `main` ist immer deploybar. Commit und Push nur auf ausdrücklichen Wunsch.
- Vercel: Root Directory `apps/web`, Framework Next.js, Produktions-URL https://depotdoktor.vercel.app (die frühere Vercel-Adresse bleibt als Alias). Umgebungsvariablen sind nicht nötig; `NEXT_PUBLIC_SITE_URL` ist optional für `metadataBase`, Sitemap und `robots.txt` (leer bedeutet `https://depotdoktor.vercel.app`).
- `.gitattributes` erzwingt LF. `next-env.d.ts` und `CLAUDE.local.md` sind gitignored.
- Dependabot (`.github/dependabot.yml`) monatlich für npm (gruppiert) und GitHub Actions, gleich aufgebaut wie in K2 und K3.

## Betrieb lokal

- `next dev` und `next build` nie gleichzeitig in `apps/web` laufen lassen; der Build überschreibt `.next`.
- Nach einem lokalen E2E-Lauf den Port wieder freigeben.
- README-Screenshots mit Playwright bei 1280 px aus einem lokalen Produktions-Build erzeugen (Beispieldatei, im Steuerreiter Beispielkurse für den ETF).

## Sicherheit und Zugänglichkeit

- Sicherheits-Header in `apps/web/next.config.ts`: CSP mit `default-src 'self'`, `connect-src 'self' data:`, `'unsafe-eval'` nur im Dev-Modus; HSTS zwei Jahre, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy (`camera`, `microphone`, `geolocation`, `payment`, `usb`, `browsing-topics` aus, wie in K2 und K3) und COOP `same-origin`.
- script-src enthält unsafe-inline, weil Next.js beim statischen Prerendering Inline-Skripte erzeugt; die Seite rendert keine Nutzereingaben ins DOM, Risiko gering; wasm-unsafe-eval für den PDF-Renderer. Keine Nonce-CSP, sie würde alle Seiten dynamisch machen.
- Keine externen Schriften, Skripte, Fetches, Cookies, localStorage oder Tracker. Änderungen an dem, was die Seite lädt oder überträgt, ziehen Änderungen an der Datenschutzerklärung und am README-Abschnitt „Datenschutz“ nach sich.
- E2E-Wächter: Nach dem Laden der Projektseite sind nur GET-Anfragen an denselben Server auf `/_next/static/` oder mit `_rsc` erlaubt, keine Anfrage enthält Dateiinhalte.
- Skip-Link auf `#main`, Fokusring 2 px in `gold-deep` auf Hell und `gold-light` auf Navy, `prefers-reduced-motion` wird respektiert, `lang="de"`, aktiver Navigationslink mit `aria-current="page"`. Waagrecht scrollbare Tabellen liegen in `ScrollRegion` (`role="region"`, `tabIndex={0}`, Name). axe-core (WCAG 2.x A und AA, Best Practices) bei 390, 768 und 1280 px ohne Verstöße; bei 320 px kein waagrechter Überlauf.

## Design

- Leitbild „Navy & Gold“ (Private Banking trifft Datenprodukt), gemeinsam mit K2 und K3: dunkler Rahmen in Navy (Kopf, Hero, Fuß, Statusseiten), helle Arbeitsflächen in Elfenbein (Upload, Report, Tabellen, Rechtsseiten), feine Goldlinien, große Serifenzahlen, viel Weißraum. Blau ist erlaubt.
- Tokens in `apps/web/app/globals.css` (`@theme`): navy-950 #0b1626, navy-900 #101f35, navy-800 #16273f, navy-700 #26354d, navy-300 #8f9bb0, ivory #f7f3ea, surface #fffdf8, line #e4ddcc, line-strong #858d9b (Formular- und Konturränder), ink #0f1b2d, slate #5b6474, gold #c9a548, gold-light #d8bd72, gold-deep #7d5f17, gold-soft #f3e9c9, moss #2f6b3a, moss-light #93c9a0, moss-soft #dfeadf, wine #7a1f2b, wine-light #e39aa4, wine-soft #f1dcdf, sky #3e6a9e. Alte Namen leben als Aliase weiter (paper = ivory, muted = slate, green = moss, bordeaux = wine).
- Diagrammfarben in `packages/charts/src/theme.ts`, feste Reihenfolge navy #1d3a5f, gold #b8912f, moss, wine, sky, slate, sand #c9b98f; Gewinn immer moss, Verlust immer wine; Sky ist die einzige mittlere Blau-Datenfarbe. PDF-Farben in `packages/pdf/src/ReportDocument.tsx` (Kopfband navy, Überzeile gold-deep).
- Gold als Text nur gold-light (auf Navy) oder gold-deep (auf Hell); gold #c9a548 nur für Linien, Ränder, Flächen und Buttons auf Navy.
- Schriften über `next/font/google` (`apps/web/app/fonts.ts`, beim Build selbst gehostet, keine Laufzeitanfrage): Cormorant Garamond 500 als Display (`.display`, Akzentwörter kursiv), Inter für UI und Fließtext. Eyebrows 11 px, Großbuchstaben, `letter-spacing .16em`. Zahlen mit deutschem Dezimalkomma; `tabular-nums` nur in rechtsbündigen Tabellenzellen, `.num` und Kacheln, sonst `lining-nums`.
- Bausteine in `apps/web/components/site/` (Kopf, Fuß, Brand, Navigation, HomeHero, ProjectHero, ProjectCards, SectionHeader, PillTabs, StatusPage, LegalNav, Buttons) und `packages/ui` (StatTile, Button, Card) sind in K1, K2 und K3 gleich; Projektspezifisches nur über `lib/site.ts`, Props und `motif.tsx`.
- Kopf mobil nicht klebend (erst ab 640 px sticky), ab 768 px einzeilig. Reiter unter 380 px als 2×2-Raster. Kacheln ab 360 px zweispaltig; Einheiten in Kacheln kleiner neben der Zahl (Text zeichengleich).
- Zeilenlänge im Fließ- und Kleingedruckten etwa 70 Zeichen (Breite am Textelement begrenzen).
- Fokus: 2 px Outline, gold-light auf Navy, gold-deep auf Hell, Radius folgt dem Element (Links 6 px, Pillen rund); keine `ring-*`-Utilities. Skip-Link als Gold-Pille, `prefers-reduced-motion` schaltet Animationen ab.
- Kontraste (nachgerechnet): navy-300 auf navy-950 6,5:1; gold-light auf navy-950 9,9:1; slate und gold-deep auf ivory 5,4:1; Gold-Button 7,7:1; Konturränder gold/70 auf navy-950 4,4:1, line-strong auf surface 3,3:1 und auf ivory 3,0:1; wine auf wine-soft 7,8:1; gold-deep auf gold-soft 4,9:1.

## Test-Stand

Stand 07.10.2026: siehe README („Tests“) und `docs/verifikation.md` (Abschnitte „Nachkontrolle 07.10.2026“ und „Nachbesserung 07.10.2026“). Dazu ein bewusst offener `todo` für Fall D. `pnpm audit --prod`: keine Meldung; `pnpm audit` meldet nur braces über `eslint-config-next` (nur Linting, ohne Patch).

## Definition of Done

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` und `pnpm test:e2e` grün, E2E-Wächter ohne fremde Anfragen, axe ohne Verstöße.
- Neue Kennzahl im Report sichtbar und im PDF enthalten, mit Handtest.
- Grenzfälle getestet: leere CSV, ein Trade, nur Käufe, Verlustjahr, unterjähriger Kauf.
- Netzwerk-Tab zeigt nach dem Laden der Seite keinen Upload.

## Offene Entscheidungen

- Kicker „Projekt K1/K2/K3“ auf Start- und Projektseite.
- Impressum ohne ladungsfähige Anschrift (`docs/verifikation.md`, Rechtstexte Punkt 1).
- Standard-Fondstyp bei Positionen ohne Assetklasse (derzeit Aktienfonds) und Vorbelegung des Steuerjahres.
- Normangabe im Disclaimer behalten oder nur auf das BaFin-Merkblatt verweisen.
- Ob `CLAUDE.md` öffentlich bleibt (derzeit: bereinigt öffentlich).
