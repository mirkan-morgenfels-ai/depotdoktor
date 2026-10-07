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
- Skip-Link auf `#main`, Fokusring in `gold-deep`, `prefers-reduced-motion` wird respektiert, `lang="de"`, aktiver Navigationslink mit `aria-current="page"`. Waagrecht scrollbare Tabellen liegen in `ScrollRegion` (`role="region"`, `tabIndex={0}`, Name). axe-core (WCAG 2.x A und AA, Best Practices) bei 390, 768 und 1280 px ohne Verstöße; bei 320 px kein waagrechter Überlauf.

## Design

- Kein Blau, nirgends, auch nicht in Diagrammen, SVGs, Vorschaubild oder Apple-Icon.
- Palette (Tokens in `apps/web/app/globals.css`, Diagrammfarben in `packages/charts/src/theme.ts`, PDF-Farben in `packages/pdf/src/ReportDocument.tsx`): ink #111111, paper #fbfaf6, surface #ffffff, gold #b8912f, gold-deep #7d5f17 (Gold für Text und Fokus), gold-soft #f3e9c9, green #2f6b3a, green-soft #dfeadf, bordeaux #7a1f2b, bordeaux-soft #f1dcdf, muted #6b6b66, line #e3e0d6. Gleiche Hex-Werte wie K2/K3, abweichende Namen (green=moss, bordeaux=wine, muted=stone).
- Gold (#b8912f) nur für Flächen, Linien und Rahmen; Text und Fokusringe in gold-deep.
- Zahlen mit deutschem Dezimalkomma und `tabular-nums`. Lieber mehr Weißraum als gedrängt.

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
