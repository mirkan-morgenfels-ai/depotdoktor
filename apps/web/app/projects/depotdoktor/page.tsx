import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer, PRIVACY_SHORT } from "@portfolio/legal";
import { DepotDoktorApp } from "@/components/depotdoktor/DepotDoktorApp";
import { pageMetadata } from "@/lib/metadata";
import { PROJECTS, REPO_URL, VERIFICATION_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "DepotDoktor – Depot-Steuer- und Performance-Analyzer",
  absolute: true,
  description:
    "Clientseitiger Analyzer für Broker-CSV-Exporte von Trade Republic und Scalable Capital: TTWROR, IRR, Volatilität, Max Drawdown, Allokation und geschätzte Vorabpauschale. Keine Datenübertragung.",
  path: "/projects/depotdoktor",
});

const EXTERNAL_LINK_CLASS = "text-green underline underline-offset-4 hover:text-gold-deep";

const project = PROJECTS.find((entry) => entry.slug === "depotdoktor");

export default function DepotDoktorPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-gold-deep">{project?.kicker}</p>
        <h1 className="mt-2 font-serif text-4xl">DepotDoktor</h1>
        <p className="mt-4 text-lg">
          DepotDoktor berechnet aus dem Transaktionsexport von Trade Republic oder Scalable Capital die zeitgewichtete Rendite
          (TTWROR), den internen Zinsfuß (IRR), Volatilität, Max Drawdown und Allokation und schätzt die Vorabpauschale nach
          §{"\u00A0"}18 InvStG.
        </p>
        <p className="mt-3 text-sm text-muted">{PRIVACY_SHORT}</p>
      </section>
      <DepotDoktorApp />
      <section className="max-w-3xl rounded-lg border border-line bg-surface p-6 text-sm" data-testid="about-project">
        <h2 className="font-serif text-xl">Über das Projekt</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          <li>Die Rechenlogik ist mit Unit-Tests gegen von Hand durchgerechnete Erwartungswerte geprüft.</li>
          <li>Geldbeträge werden mit decimal.js als Dezimalzahlen gerechnet, nicht als binäre Gleitkommazahlen.</li>
          <li>
            Keine Datenübertragung: Eine Content-Security-Policy lässt nur Anfragen an den eigenen Server zu, ein E2E-Test prüft
            den Netzwerkverkehr bei jeder Änderung.
          </li>
          <li>Offene Prüfpunkte, etwa der Abgleich mit echten Broker-Exporten, stehen im Prüfprotokoll.</li>
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <a href={REPO_URL} rel="noopener noreferrer" className={EXTERNAL_LINK_CLASS} data-testid="project-repo-link">
            Quellcode auf GitHub <span className="text-muted">(externe Seite)</span>
          </a>
          <a href={VERIFICATION_URL} rel="noopener noreferrer" className={EXTERNAL_LINK_CLASS} data-testid="verification-link">
            Prüfprotokoll<span className="sr-only"> auf GitHub</span> <span className="text-muted">(externe Seite)</span>
          </a>
        </p>
      </section>
      <div className="border-t border-line pt-6 text-xs text-muted">
        <Disclaimer variant="long" />
        <p className="mt-2">
          Mit der Nutzung erkennen Sie die{" "}
          <Link href="/nutzungsbedingungen" className="underline hover:text-gold-deep">
            Nutzungsbedingungen
          </Link>{" "}
          an. Einzelheiten zur Verarbeitung Ihrer Daten stehen in der{" "}
          <Link href="/datenschutz" className="underline hover:text-gold-deep">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
