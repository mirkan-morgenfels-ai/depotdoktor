import { Button } from "@portfolio/ui";

const SAMPLE_SHOWS = [
  "Performance mit TTWROR, IRR, Volatilität und Max Drawdown",
  "Allokation nach Assetklasse und Region",
  "Vorabpauschale und realisierte Gewinne je Position",
  "Report als PDF und Transaktionen als CSV",
] as const;

export function SampleCard({ onLoad, rowCount }: { onLoad: () => void; rowCount: number }) {
  return (
    <div className="surface-navy relative isolate flex flex-col overflow-hidden rounded-2xl border border-navy-700 p-7 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-28 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(62_106_158/0.30),transparent)]"
      />
      <p className="eyebrow">Ohne eigene Daten</p>
      <h3 className="display mt-3 text-[1.75rem] leading-tight text-ivory">
        Mit der <em className="text-gold-light">Beispieldatei</em> ausprobieren
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-navy-300" data-testid="sample-description">
        Synthetische Trade-Republic-CSV mit {rowCount} Zeilen; keine echten Daten.
      </p>
      <ul className="mt-6 space-y-2.5 border-t border-navy-700 pt-6 text-[13px] leading-snug text-ivory/85">
        {SAMPLE_SHOWS.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Button variant="gold" onClick={onLoad}>
          Beispieldatei laden
        </Button>
      </div>
    </div>
  );
}
