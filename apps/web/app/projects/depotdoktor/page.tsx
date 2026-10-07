import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer, PRIVACY_SHORT } from "@portfolio/legal";
import { DepotDoktorApp } from "@/components/depotdoktor/DepotDoktorApp";
import { ArrowMark, ExternalMark } from "@/components/site/ExternalMark";
import { BUTTON_GOLD, BUTTON_OUTLINE_LIGHT } from "@/components/site/buttons";
import { HeroOrnament } from "@/components/site/motif";
import { ProjectHero, type HeroFact } from "@/components/site/ProjectHero";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Shell } from "@/components/site/Shell";
import { pageMetadata } from "@/lib/metadata";
import { PROJECTS, REPO_URL, VERIFICATION_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "DepotDoktor – Depot-Steuer- und Performance-Analyzer",
  absolute: true,
  description:
    "Clientseitiger Analyzer für Broker-CSV-Exporte von Trade Republic und Scalable Capital: TTWROR, IRR, Volatilität, Max Drawdown, Allokation und geschätzte Vorabpauschale. Keine Datenübertragung.",
  path: "/projects/depotdoktor",
});

const project = PROJECTS.find((entry) => entry.slug === "depotdoktor");

const FACTS: readonly HeroFact[] = [
  { value: "2", label: "Broker-Formate", detail: "Trade Republic und Scalable Capital" },
  { value: "0", label: "Uploads", detail: "Die CSV-Datei bleibt in Ihrem Browser" },
  { value: "§ 18", label: "InvStG", detail: "Vorabpauschale als Schätzung je Position" },
];

const PRINCIPLES = [
  {
    title: "Geprüfte Rechenlogik",
    text: "Die Rechenlogik ist mit Unit-Tests gegen von Hand durchgerechnete Erwartungswerte geprüft.",
  },
  {
    title: "Exakte Dezimalrechnung",
    text: "Geldbeträge werden mit decimal.js als Dezimalzahlen gerechnet, nicht als binäre Gleitkommazahlen.",
  },
  {
    title: "Keine Datenübertragung",
    text: "Eine Content-Security-Policy lässt nur Anfragen an den eigenen Server zu, ein E2E-Test prüft den Netzwerkverkehr bei jeder Änderung.",
  },
  {
    title: "Offene Prüfpunkte",
    text: "Offene Prüfpunkte, etwa der Abgleich mit echten Broker-Exporten, stehen im Prüfprotokoll.",
  },
] as const;

const PILL_LINK =
  "inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink max-sm:w-full";

export default function DepotDoktorPage() {
  return (
    <>
      <ProjectHero
        eyebrow={`${project?.kicker ?? "Projekt 01"} · ${project?.topic ?? "Finanzdaten"}`}
        title={
          <>
            Depot<em className="text-gold-light">Doktor</em>
          </>
        }
        tagline="Depot-Steuer- und Performance-Analyzer"
        lead={
          <p>
            DepotDoktor berechnet aus dem Transaktionsexport von Trade Republic oder Scalable Capital die zeitgewichtete Rendite
            (TTWROR), den internen Zinsfuß (IRR), Volatilität, Max Drawdown und Allokation und schätzt die Vorabpauschale nach
            §{" "}18 InvStG.
          </p>
        }
        actions={
          <>
            <a href="#analyse" className={BUTTON_GOLD}>
              Analyse starten
              <ArrowMark />
            </a>
            <a href={REPO_URL} rel="noopener noreferrer" className={BUTTON_OUTLINE_LIGHT}>
              Quellcode<span className="sr-only"> auf GitHub (externe Seite)</span>
              <ExternalMark className="ml-2 h-2.5 w-2.5 text-gold-light" />
            </a>
          </>
        }
        note={
          <p className="border-l border-gold/60 pl-4 text-[13px] leading-relaxed text-navy-300 sm:text-sm">{PRIVACY_SHORT}</p>
        }
        facts={FACTS}
        ornament={<HeroOrnament idPrefix="project-ornament" className="h-auto w-full" />}
      />

      <section id="analyse" aria-labelledby="analyse-title" className="scroll-mt-28 pt-12 pb-16 sm:py-20 lg:py-24">
        <Shell>
          <SectionHeader
            id="analyse-title"
            eyebrow="Analyse"
            title={
              <>
                Ihren Depotexport <em>auswerten</em>
              </>
            }
            lead="Wählen Sie den CSV-Export Ihres Brokers oder laden Sie die Beispieldatei. Kennzahlen, Allokation und Steuerschätzung entstehen vollständig in Ihrem Browser."
          />
          <div className="mt-8 sm:mt-10 lg:mt-12">
            <DepotDoktorApp />
          </div>
        </Shell>
      </section>

      <section className="border-t border-line bg-surface py-16 sm:py-20 lg:py-24" data-testid="about-project" aria-labelledby="about-title">
        <Shell>
          <SectionHeader
            id="about-title"
            eyebrow="Hintergrund"
            title="Über das Projekt"
            lead="Ein privates Portfolio-Projekt mit dem Anspruch, Rechenwege offen und prüfbar zu halten."
            aside={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <a href={REPO_URL} rel="noopener noreferrer" className={PILL_LINK} data-testid="project-repo-link">
                  Quellcode auf GitHub<span className="sr-only"> (externe Seite)</span>
                  <ExternalMark className="ml-2 h-2.5 w-2.5 text-gold-deep" />
                </a>
                <a href={VERIFICATION_URL} rel="noopener noreferrer" className={PILL_LINK} data-testid="verification-link">
                  Prüfprotokoll<span className="sr-only"> auf GitHub (externe Seite)</span>
                  <ExternalMark className="ml-2 h-2.5 w-2.5 text-gold-deep" />
                </a>
              </div>
            }
          />
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} className="flex flex-col bg-surface p-6 sm:p-7">
                <span aria-hidden="true" className="display num text-[2rem] leading-none text-gold-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-[0.9375rem] font-medium text-ink">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{principle.text}</p>
              </li>
            ))}
          </ol>
        </Shell>
      </section>

      <section aria-label="Rechtliche Hinweise" className="border-t border-line py-10">
        <Shell className="max-w-[76rem] text-[13px] leading-relaxed text-slate">
          <div className="max-w-[60ch] space-y-2">
            <Disclaimer variant="long" />
            <p>
              Mit der Nutzung erkennen Sie die{" "}
              <Link href="/nutzungsbedingungen" className="link">
                Nutzungsbedingungen
              </Link>{" "}
              an. Einzelheiten zur Verarbeitung Ihrer Daten stehen in der{" "}
              <Link href="/datenschutz" className="link">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
        </Shell>
      </section>
    </>
  );
}
