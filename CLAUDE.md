# Projekt: DepotDoktor (K1)

Arbeitsanweisungen für Claude Code (KI-gestützte Entwicklung).
Autor: Mirkan Deniz Günkaya.

## Zweck und Stand

Clientseitiger Depot-Steuer- und Performance-Analyzer für deutsche Broker-CSV-Exporte (Trade Republic, Scalable Capital). Keine Server-Uploads, kein Konto, keine Speicherung. Erstes Portfolio-Projekt vor K2 KontoKlar und K3 NetzRadar; die Startseite verlinkt alle drei Projekte und ihre öffentlichen Repos.

Stand 08.10.2026: Parser, Kennzahlen, Steuermodul, Report mit PDF- und CSV-Export und Rechtsseiten umgesetzt, live unter https://depotdoktor.vercel.app/projects/depotdoktor (die frühere Vercel-Adresse bleibt als Alias). Die Vorabpauschale ist gegen die Rechenbeispiele des BMF-Schreibens vom 21.05.2019 (Rz. 18.3, 18.4, 18.11) geprüft. Offen sind die Prüfung an echten Exporten (Anleitung seit 20.10.2026 in `docs/pruefung-echte-exporte.md`, siehe „Offene Punkte des Autors“) und gegen einen externen Vorabpauschale-Rechner (`docs/verifikation.md`). Am 17.10.2026 auf Next.js 16, ESLint 10 und Vitest 5 umgestellt, ohne sichtbare Änderung (`docs/verifikation.md`, Abschnitt „Framework-Migration 17.10.2026“); TypeScript bleibt auf 5.9 (Begründung unter „Stack“).

## Quellen

- Die ursprüngliche Spezifikation ist nicht Teil des Repos; maßgeblich sind dieses Dokument und `docs/verifikation.md`. Rechnerspezifisches steht in der nicht versionierten `CLAUDE.local.md`.
- Widerspricht eine Anfrage einem Dokument oder ein Dokument dem Code: hinweisen und vorschlagen, welches Dokument angepasst wird, statt still abzuweichen.
- Steuerregeln nur mit Beleg: Gesetzestext (InvStG, EStG), BMF-Schreiben; Prüfquellen Vorabpauschale-Rechner der Stiftung Warentest und Finanztip. Belege stehen in `docs/verifikation.md`, nicht im Code.

## Stack

- Root: pnpm 10.34.5 (`packageManager`), Node `^22.13.0 || ^24.0.0 || >=26.0.0` (`engines`, Untergrenzen aus ESLint 10 und Vitest 5); CI Node 22.
- Next.js 16.4 App Router mit Turbopack (Standard für `next dev` und `next build`, keine eigene webpack-Konfiguration), React 19.3, TypeScript 5.9 strict, Tailwind CSS 4, Papa Parse, Recharts, @react-pdf/renderer 4.9, decimal.js.
- Lint: ESLint 10 mit Flat Config (`eslint.config.mjs` je Paket über `defineConfig` aus `eslint/config`); `apps/web` nutzt `eslint-config-next` 16.4 (`core-web-vitals` und `typescript`), die Pakete `@eslint/js` 10 und `typescript-eslint` 8. Seit Next.js 16 gibt es `next lint` nicht mehr, und `next build` lintet nicht mehr mit; `pnpm lint` ruft ESLint direkt auf. `eslint-config-next` 16.4 passt `eslint-plugin-react` und `eslint-plugin-import` selbst an ESLint 10 an; pnpm meldet für diese beiden und `eslint-plugin-jsx-a11y` trotzdem Peer-Warnungen (Peer-Bereich bis ESLint 9, neuere Versionen gibt es am 17.10.2026 nicht). `.npmrc` setzt `strict-peer-dependencies=false`, Lint läuft ohne Fehler.
- Tests: Vitest 5 (Unit; `vite` ^8.2.4 als direkte devDependency in `apps/web`, `packages/csv` und `packages/pdf`, weil die über die Peer-Abhängigkeit installierte 8.2.2 unter einen Sicherheitshinweis fiel, GHSA zu launch-editor, behoben ab 8.2.4; Stand 21.10.2026: 8.3.5), Playwright 1.64 mit axe-core (E2E), `@types/node` 26. pnpm Workspaces. CI: GitHub Actions. Hosting: Vercel Hobby (nur nicht-kommerziell).
- TypeScript 6.0.3 (seit 21.10.2026 über Dependabot, vorher 5.9.3); TypeScript 7 ist bewusst ausgelassen (Stand 17.10.2026): TypeScript 7.0.2 (nativer Compiler) hat keine Programmier-API, typescript-eslint 8 braucht sie aber, auch über `eslint-config-next/typescript`. Probe am 17.10.2026 mit `typescript` 7.0.2 in allen sechs Paketen: `pnpm typecheck`, `pnpm test` und `pnpm build` grün, `pnpm lint` bricht in jedem Paket ab mit „Error: typescript-eslint does not support TS 7.0.“ (feste Versionsprüfung in typescript-eslint 8.69.0, `dist/index.js`); auch die neueste Version 8.71.2 verlangt `typescript >=4.8.4 <6.1.0`. Belege: https://github.com/typescript-eslint/typescript-eslint/issues/12518 (am 08.07.2026 als „not planned“ geschlossen: „there is no TS 7 API at this time“) und https://github.com/typescript-eslint/typescript-eslint/issues/10940 (offen, Unterstützung erst mit der neuen API ab TypeScript 7.1). Der von Microsoft beschriebene Parallelbetrieb (`typescript` als Alias auf `@typescript/typescript6`, TypeScript 7 unter einem zweiten Namen) ist verworfen: Das Paket `typescript` wäre dann trotzdem 6.0, Lint und die Typprüfung in `next build` liefen weiter mit TypeScript 6, und zwei Compiler unter Aliasnamen erschweren die Dependabot-Updates. `.github/dependabot.yml` ignoriert deshalb `typescript` 7.x (YAML ohne Kommentar, Regel 6; die Begründung steht hier); das Ignore entfernen, sobald typescript-eslint TypeScript 7 unterstützt. TypeScript 6.0.3 ist am 17.10.2026 geprüft (`pnpm typecheck` ohne `.next` wie in der CI und mit `.next`, `pnpm lint`, `pnpm test`, `pnpm build` grün) und darf per Dependabot kommen. `apps/web/tsconfig.json` setzt kein `baseUrl` mehr, weil TypeScript 7 die Option nicht mehr kennt; `paths` gelten ohne `baseUrl` relativ zur `tsconfig.json`.

## Struktur

- `apps/web/app/projects/depotdoktor/` Seite
- `apps/web/components/depotdoktor/` Upload, Report-Ansicht, Reiter (Performance, Allokation, Steuer, Transaktionen), `ScrollRegion` für waagrecht scrollbare Tabellen
- `apps/web/lib/depotdoktor/` Transaktionsmodell, Kennzahlen (`metrics/`), Steuerlogik (`tax/`, Vorbelegung des Steuerjahres in `tax/year.ts`), Kachel-Texte für Ansicht und PDF (`kpis.ts`), PDF-Daten (`pdf-data.ts`), CSV-Export im deutschen Excel-Format (`export-csv.ts`), Beschriftungen für Buchungsart und Broker (`labels.ts`), Unit-Tests in `__tests__/`
- `apps/web/lib/site.ts` Projekte, Navigation, Rechtslinks und Live-Adressen (einzige Stelle mit Live-URLs), `apps/web/lib/metadata.ts` Seitenmetadaten
- `apps/web/assets/` Schriftdatei für das Vorschaubild (`noto-sans-v27-latin-regular.ttf`, Lizenz in `OFL.txt`), gelesen nur beim Build von `app/opengraph-image.tsx`
- `apps/web/e2e/` Playwright-Tests (`depotdoktor.spec.ts`, `site.spec.ts`, `helpers.ts`)
- `packages/csv/` Parser, Broker-Erkennung, Normalisierung, Fixtures
- `packages/ui/` Basiskomponenten, `packages/charts/` Diagramme (Recharts), `packages/pdf/` Report-Vorlage (@react-pdf/renderer, Daten als reine Strings über `apps/web/lib/depotdoktor/pdf-data.ts`), `packages/legal/` Disclaimer, Datenschutztexte, Betreiberangaben
- `docs/verifikation.md` Prüfstand der Steuerlogik, offene Punkte, Quellen, Entscheidungen
- `docs/pruefung-echte-exporte.md` Anleitung für den Autor: Export bei Trade Republic und Scalable Capital, Prüfliste, Prüfprotokoll, Umgang mit Abweichungen
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
- Offene Entscheidungen (derzeit Formate DKB/ING/comdirect) mit Optionen und Empfehlung vorlegen und auf den Autor warten. Fondstyp ohne Assetklasse, Bezugsgröße bei unterjährigem Kauf und Steuerjahr-Vorbelegung sind seit 08.10.2026 entschieden bzw. gegen das BMF geprüft (`docs/verifikation.md`, Abschnitt „Restliche Entscheidungen 08.10.2026“), Fondstyp bei Derivaten und Cash sowie der Hinweis „nur PRIME+“ seit 22.10.2026 (Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“).
- Ehrliche Ergebnisse: Was nicht geprüft ist, steht als offen in `docs/verifikation.md` und im README.

## Befehle

- `pnpm install` (CI: `pnpm install --frozen-lockfile`)
- `pnpm dev` Entwicklung unter http://localhost:3000/projects/depotdoktor (Turbopack, Ausgabe in `apps/web/.next/dev`)
- `pnpm typecheck` (einschließlich `apps/web/e2e` über `tsconfig.e2e.json`), `pnpm lint` (alle sechs Pakete, ESLint direkt), `pnpm test`, `pnpm build`
- `pnpm test:e2e` Playwright; mit `CI=true` nach `pnpm build` gegen `next start`, sonst gegen `next dev`. Port über `PORT` (Standard 3000). Ohne installierte Browser `PLAYWRIGHT_CHROMIUM_PATH=/pfad/zu/chromium` setzen.

## Git und Deployment

- Remote: https://github.com/mirkan-morgenfels-ai/depotdoktor, öffentlich seit 07.10.2026, Standardzweig `main`.
- Commit-Autor „Mirkan Deniz Günkaya“ mit der GitHub-noreply-Adresse `324466065+mirkan-morgenfels-ai@users.noreply.github.com`. Ohne die noreply-Adresse blockiert Vercel das Deployment.
- Commit-Stil: Conventional Commits auf Deutsch mit echten Umlauten, z. B. `feat(k1): …`, `fix(k1): …`, `test(k1): …`, `docs: …`, `ci: …`. Keine Verweise auf private Repos oder lokale Pfade in Commit-Nachrichten.
- Feature-Branch `feat/<thema>` bzw. `fix/<thema>`, Merge nach `main` bei grüner CI. `main` ist immer deploybar. Commit und Push nur auf ausdrücklichen Wunsch.
- Vercel: Root Directory `apps/web`, Framework Next.js, Produktions-URL https://depotdoktor.vercel.app (die frühere Vercel-Adresse bleibt als Alias). Umgebungsvariablen sind nicht nötig; `NEXT_PUBLIC_SITE_URL` ist optional für `metadataBase`, Sitemap und `robots.txt` (leer bedeutet `https://depotdoktor.vercel.app`).
- `.gitattributes` erzwingt LF. `next-env.d.ts` und `CLAUDE.local.md` sind gitignored.
- Dependabot (`.github/dependabot.yml`) monatlich für npm (gruppiert) und GitHub Actions, gleich aufgebaut wie in K2 und K3. Einzige Ausnahme seit 17.10.2026: `typescript` 7.x wird ignoriert (Begründung unter „Stack“).

## Betrieb lokal

- Seit Next.js 16 schreibt `next dev` nach `apps/web/.next/dev` und `next build` nach `apps/web/.next`; beide dürfen gleichzeitig laufen, eine Sperrdatei verhindert zwei `next dev` oder zwei `next build` im selben Projekt. `next-env.d.ts` (gitignored) wechselt dabei zwischen `.next/types` und `.next/dev/types`.
- `next.config.ts` setzt `agentRules: false`. Sonst legt `next dev` bei erkanntem KI-Agenten eine `apps/web/AGENTS.md` an; maßgeblich für Agenten ist diese Datei. Die zur installierten Version passende Next.js-Dokumentation liegt nach `pnpm install` unter `apps/web/node_modules/next/dist/docs/` (Upgrade-Leitfaden: `01-app/02-guides/upgrading/version-16.md`).
- Nach einem lokalen E2E-Lauf den Port wieder freigeben.
- Meldet `packages/pdf` nach einem Wechsel des Abhängigkeitsstands „'Text' cannot be used as a JSX component“ oder bricht Vitest mit EPERM ab, sind die lokalen `node_modules` veraltet (am 22.10.2026: `@types/react` im virtuellen Speicher von pnpm nicht verlinkt). Alle `node_modules` im Workspace löschen und `pnpm install --frozen-lockfile` ausführen wie in der CI.
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
- Vorschaubild (`app/opengraph-image.tsx`, 1200 × 630): Titel und Untertitel als Glyphenpfade aus `lib/og-glyphs.ts`, übrige Texte in Noto Sans aus `apps/web/assets/`. Das war bis Next.js 15 die eingebaute Standardschrift von `next/og`; Next.js 16 bringt Geist mit, deshalb ist Noto Sans seit 17.10.2026 ausdrücklich eingebunden (Datei unverändert aus `next` 15.5.27, `dist/compiled/@vercel/og/`). Seit Next.js 16 liefert der Server Vorschaubild und Icons mit `Cache-Control: public, max-age=0, must-revalidate` statt `public, immutable, no-transform, max-age=31536000`; das ist eine Vorgabe des Frameworks und bewusst übernommen.
- Bausteine in `apps/web/components/site/` (Kopf, Fuß, Brand, Navigation, HomeHero, ProjectHero, ProjectCards, SectionHeader, PillTabs, StatusPage, LegalNav, Buttons) und `packages/ui` (StatTile, Button, Card) sind in K1, K2 und K3 gleich; Projektspezifisches nur über `lib/site.ts`, Props und `motif.tsx`.
- Kopf mobil nicht klebend (erst ab 640 px sticky), ab 768 px einzeilig. Reiter unter 380 px als 2×2-Raster. Kacheln ab 360 px zweispaltig; Einheiten in Kacheln kleiner neben der Zahl (Text zeichengleich).
- Zeilenlänge im Fließ- und Kleingedruckten etwa 70 Zeichen (Breite am Textelement begrenzen).
- Fokus: 2 px Outline, gold-light auf Navy, gold-deep auf Hell, Radius folgt dem Element (Links 6 px, Pillen rund); keine `ring-*`-Utilities. Skip-Link als Gold-Pille, `prefers-reduced-motion` schaltet Animationen ab.
- Kontraste (nachgerechnet): navy-300 auf navy-950 6,5:1; gold-light auf navy-950 9,9:1; slate und gold-deep auf ivory 5,4:1; Gold-Button 7,7:1; Konturränder gold/70 auf navy-950 4,4:1, line-strong auf surface 3,3:1 und auf ivory 3,0:1; wine auf wine-soft 7,8:1; gold-deep auf gold-soft 4,9:1.

## Test-Stand

Stand 22.10.2026 (nach der Vorbelegung des Fondstyps bei Derivaten und Cash und dem Hinweis „nur PRIME+“): 284 Unit-Tests (csv 50, pdf 2, web 232) und 30 Playwright-Tests (`depotdoktor.spec.ts` 16, `site.spec.ts` 14) grün, E2E mit `CI=true` auf Port 3811 im ersten Durchlauf, kein offener `todo` mehr (Fall D ist seit 08.10.2026 ein Test gegen BMF Rz. 18.11). Einzelheiten im README („Tests“) und in `docs/verifikation.md` (Abschnitte „Nachkontrolle 07.10.2026“, „Nachbesserung 07.10.2026“, „CSV-Export für deutsches Excel 08.10.2026“, „Restliche Entscheidungen 08.10.2026“ mit „Nachbesserung nach der Prüfung 08.10.2026“, „Framework-Migration 17.10.2026“, „Anleitung für die Prüfung an echten Exporten 20.10.2026“ und „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“). Die E2E-Tests in `depotdoktor.spec.ts` stellen die Browser-Uhr auf den 08.10.2026, weil das vorbelegte Steuerjahr vom Datum abhängt. `pnpm audit --prod`: keine Meldung; `pnpm audit` meldet nur braces über `eslint-config-next` (nur Linting, ohne Patch; zuletzt am 22.10.2026 geprüft).

## Definition of Done

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` und `pnpm test:e2e` grün, E2E-Wächter ohne fremde Anfragen, axe ohne Verstöße.
- Neue Kennzahl im Report sichtbar und im PDF enthalten, mit Handtest.
- Grenzfälle getestet: leere CSV, ein Trade, nur Käufe, Verlustjahr, unterjähriger Kauf.
- Netzwerk-Tab zeigt nach dem Laden der Seite keinen Upload.

## Offene Punkte des Autors

- Prüfung an echten Broker-Exporten (braucht Exporte, Abrechnungen und Steuerbescheinigungen des Autors). Anleitung, Prüfliste und Prüfprotokoll stehen seit 20.10.2026 in `docs/pruefung-echte-exporte.md`; Exportwege und Broker-Angaben dort mit Quellen, Stand der Recherche 20.10.2026. Bei Scalable Capital gibt es den CSV-Export laut FAQ nur im PRIME+ Broker. Echte Exporte, Abrechnungen und das ausgefüllte Protokoll liegen außerhalb des Repos; Claude öffnet, liest oder kopiert sie nicht und schreibt Zahlen, die der Autor nennt, nur anonymisiert in `docs/verifikation.md`. Abweichungen werden als synthetische Fixture unter `packages/csv/fixtures/` mit vorher geschriebenem Test nachgestellt (Abschnitt 5 der Anleitung).
- ~~Zwei kleine Entscheidungen aus der Recherche vom 20.10.2026 (`docs/verifikation.md`, Abschnitt „Anleitung für die Prüfung an echten Exporten 20.10.2026“, Punkte 1 und 4): Hinweis „nur PRIME+“ beim Scalable-Exportweg im Upload-Feld (Empfehlung: ja) und Vorbelegung von Derivaten als „Kein Fonds (Aktie, Anleihe)“ statt Aktienfonds (Empfehlung: ja, Test zuerst). Beides ändert Code und wartet auf den Autor.~~ Erledigt am 22.10.2026, siehe „Offene Entscheidungen“.
- Nebenbefunde vom 22.10.2026 aus den Testdateien von Portfolio Performance (laut deren Entwickler von Trade Republic): keine Spalte `isin` (ISIN in `symbol`), `amount` ohne Gebühr und Steuer, eine Datei mit Semikolon; bei Scalable die Buchungsarten „Cash Transfer In/Out“. Code unverändert; erst am Export des Autors bestätigen, dann auf einem eigenen `fix/`-Branch mit Fixture und Test vorher umsetzen (`docs/verifikation.md`, Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“, Nebenbefunde).

## Offene Entscheidungen

- ~~Kicker „Projekt K1/K2/K3“ auf Start- und Projektseite.~~ Entschieden am 08.10.2026: „Projekt 01/02/03“ wie auf den Projektkarten.
- ~~Impressum ohne ladungsfähige Anschrift (`docs/verifikation.md`, Rechtstexte Punkt 1).~~ Entschieden am 07.10.2026 vom Autor, gemeinsam für K1, K2 und K3: Das Impressum nennt nur Name, Ort und E-Mail. `docs/verifikation.md` führt dazu seit 08.10.2026 nur noch diesen Statussatz statt einer Abwägung; die Rechtstexte sind unverändert.
- ~~Standard-Fondstyp bei Positionen ohne Assetklasse (derzeit Aktienfonds) und Vorbelegung des Steuerjahres.~~ Entschieden am 08.10.2026 (vom Autor mit „Erledige auch die restlichen offenen Punkte“ an Claude delegiert): Positionen ohne Assetklasse (Scalable-Export) starten mit „Bitte wählen“; bis zur Wahl zeigen Steuerkacheln und PDF „–“ mit „Fondstyp wählen“, weil eine falsche Teilfreistellung (§ 20 InvStG) die Steuer verfälscht. Positionen ohne Bestand am 31.12. brauchen keine Wahl, das Feld für angesetzte Vorabpauschalen erscheint erst nach der Wahl eines Fonds-Typs; bis dahin steht an Verkäufen mit Anteilen aus Vorjahren ein Hinweis mit der Sprungmarke „Zum Fondstyp“. Vorbelegt ist das letzte abgeschlossene Steuerjahr mit Bestand am 31.12., sonst das Jahr der letzten Depotbuchung (vorbelegte Kurse „vorläufig“); für ein laufendes Jahr weisen Steuerreiter und PDF darauf hin. Begründung und Tests in `docs/verifikation.md`, Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 1 und 2.
- ~~Standard-Fondstyp bei Derivaten und Cash; Hinweis „nur PRIME+“ im Upload-Feld.~~ Entschieden am 22.10.2026 (vom Autor mit „Mache alles, was nötig ist“ an Claude delegiert): Derivate (Trade Republic `DERIVATIVE`, `WARRANT`) sind als „Kein Fonds (Aktie, Anleihe, Derivat)“ vorbelegt, denn Zertifikate, Optionsscheine und Hebelprodukte sind keine Investmentvermögen (§ 1 Abs. 2 InvStG mit § 1 Abs. 1 KAGB, BMF-Schreiben vom 21.05.2019, Rz. 1.4), also ohne Vorabpauschale und Teilfreistellung; die Option heißt deshalb jetzt „Kein Fonds (Aktie, Anleihe, Derivat)“. Cash startet mit „Bitte wählen“, weil „Cash“ Kontoguthaben (kein Fonds) oder Geldmarktfonds (Sonstiger Fonds, 0 % Teilfreistellung) sein kann und der Export das nicht unterscheidet; Aktienfonds war in beiden Fällen falsch. Unter dem Scalable-Exportweg steht „CSV-Export nur im PRIME+ Broker“ (Scalable-FAQ, Inhalt vom 29.07.2026). Rechenwege, Parser und Rechtstexte unverändert. Quellen (abgerufen am 22.10.2026), Texte, Tests und Nebenbefunde in `docs/verifikation.md`, Abschnitt „Fondstyp bei Derivaten und Cash, Hinweis PRIME+ 22.10.2026“.
- ~~Normangabe im Disclaimer behalten oder nur auf das BaFin-Merkblatt verweisen.~~ Entschieden am 08.10.2026: Die Normangabe bleibt. „§ 2 Abs. 8 Satz 1 Nr. 10 WpHG“ ist am 08.10.2026 auf gesetze-im-internet.de geprüft und korrekt (Nr. 10 definiert die Anlageberatung); `packages/legal` ist unverändert. Einzelheiten in `docs/verifikation.md`, Abschnitt „Restliche Entscheidungen 08.10.2026“, Punkt 3.
- ~~Ob `CLAUDE.md` öffentlich bleibt (derzeit: bereinigt öffentlich).~~ Entschieden am 08.10.2026, gemeinsam für K1, K2 und K3: bleibt bereinigt öffentlich, als transparenter Nachweis KI-gestützter Arbeit. Rechnerspezifisches steht weiter nur in der nicht versionierten `CLAUDE.local.md`.
- ~~CSV-Export „Transaktionen als CSV“: maschinenlesbar oder deutsches Excel-Format (bisher eine Mischung).~~ Entschieden am 08.10.2026: deutsches Excel-Format, weil die Zielgruppe deutsche Privatanleger sind, die die Datei per Doppelklick öffnen; im alten Format las ein deutsches Excel Beträge mit Dezimalpunkt als Text oder Datum. Semikolon, Dezimalkomma ohne Tausenderpunkt, deutsche Spaltenköpfe, Datum TT.MM.JJJJ, UTF-8 mit BOM, CRLF, Quoting, ASCII-Minus, volle Genauigkeit ohne Rundung; Apostroph vor Textfeldern, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnen, nie vor Zahlenfeldern. Maschinenlesbare Rohdaten liefert der Original-Export des Brokers. Einzelheiten und Excel-Probe in `docs/verifikation.md`, Abschnitt „CSV-Export für deutsches Excel 08.10.2026“.
