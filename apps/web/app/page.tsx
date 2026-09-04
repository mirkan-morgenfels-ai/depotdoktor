import Link from "next/link";
import { Card, CardTitle } from "@portfolio/ui";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-serif text-4xl">Projekte</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Drei kleine, lauffähige Werkzeuge rund um Finanzdaten, Textklassifikation und Netzwerkanalyse. Alle Projekte
          sind quelloffen und in TypeScript beziehungsweise Python geschrieben.
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
          <p className="text-sm text-muted">Kontoauszug-Kategorisierer mit Haushaltsanalyse. In Planung ab November 2026.</p>
        </Card>
        <Card>
          <CardTitle>NetzRadar</CardTitle>
          <p className="text-sm text-muted">Anomalieanalyse in Transaktionsnetzen mit Graph Neural Network. In Planung ab Januar 2027.</p>
        </Card>
      </div>
    </div>
  );
}
