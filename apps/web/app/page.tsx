import Link from "next/link";
import { Card, CardTitle } from "@portfolio/ui";

const KONTOKLAR_URL = "https://kontoklar-eight.vercel.app/projects/kontoklar";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-serif text-4xl">Projekte</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Drei Werkzeuge rund um Finanzdaten, Textklassifikation und Netzwerkanalyse, geschrieben in TypeScript und Python.
          DepotDoktor und KontoKlar sind online nutzbar, NetzRadar ist in Arbeit. Der Quellcode steht unter der MIT-Lizenz.
        </p>
      </section>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardTitle>DepotDoktor</CardTitle>
          <p className="text-sm text-muted">
            Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte. Rechnet vollständig im Browser.
          </p>
          <Link href="/projects/depotdoktor" className="mt-4 inline-block text-sm text-green underline">
            Zum Projekt
          </Link>
        </Card>
        <Card>
          <CardTitle>KontoKlar</CardTitle>
          <p className="text-sm text-muted">
            Kontoauszug-Kategorisierer mit Haushaltsanalyse: Bank-CSV rein, Dashboard raus. Läuft unter eigener Adresse.
          </p>
          <a
            href={KONTOKLAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-green underline"
            data-testid="kontoklar-link"
          >
            Zum Projekt<span className="sr-only"> KontoKlar, externe Seite, öffnet in neuem Tab</span>
          </a>
        </Card>
        <Card>
          <CardTitle>NetzRadar</CardTitle>
          <p className="text-sm text-muted">
            Anomalieanalyse in Transaktionsnetzen mit Graph Neural Network. In Arbeit, noch nicht veröffentlicht.
          </p>
        </Card>
      </div>
    </div>
  );
}
