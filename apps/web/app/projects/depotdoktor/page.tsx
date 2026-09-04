import type { Metadata } from "next";
import { Disclaimer, PRIVACY_SHORT } from "@portfolio/legal";
import { DepotDoktorApp } from "@/components/depotdoktor/DepotDoktorApp";

export const metadata: Metadata = {
  title: "DepotDoktor – Depot-Steuer- und Performance-Analyzer",
  description:
    "Clientseitiger Analyzer für Broker-CSV-Exporte: TTWROR, IRR, Volatilität, Max Drawdown, Allokation und Vorabpauschale. Keine Datenübertragung.",
};

export default function DepotDoktorPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-gold">Projekt K1</p>
        <h1 className="mt-2 font-serif text-4xl">DepotDoktor</h1>
        <p className="mt-4 text-lg">
          CSV rein, Report raus. Zeitgewichtete Rendite, interner Zinsfuß, Allokation und die geschätzte Vorabpauschale
          nach § 18 InvStG aus dem Transaktionsexport von Trade Republic oder Scalable Capital.
        </p>
        <p className="mt-3 text-sm text-muted">{PRIVACY_SHORT}</p>
      </section>
      <DepotDoktorApp />
      <Disclaimer variant="long" className="border-t border-line pt-6 text-xs text-muted" />
    </div>
  );
}
