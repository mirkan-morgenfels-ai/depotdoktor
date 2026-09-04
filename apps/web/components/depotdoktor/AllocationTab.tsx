import type { PerformanceReport } from "@/lib/depotdoktor/report";
import type { AllocationSlice } from "@/lib/depotdoktor/metrics/allocation";
import { AllocationBars } from "@portfolio/charts";
import { d, formatEur, formatNumber, formatPercent } from "@/lib/depotdoktor/money";

function AllocationList({ title, slices, testId }: { title: string; slices: AllocationSlice[]; testId: string }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6" data-testid={testId}>
      <h2 className="mb-4 font-serif text-xl">{title}</h2>
      {slices.length === 0 ? (
        <p className="text-sm text-muted">Keine bewertbaren Positionen.</p>
      ) : (
        <>
          <AllocationBars
            slices={slices.map((s) => ({ label: s.label, share: s.share.toNumber(), value: s.value.toDecimalPlaces(2).toNumber() }))}
            formatShare={(v) => formatPercent(v)}
            formatValue={(v) => formatEur(d(v))}
          />
          <table className="mt-4 w-full text-sm">
            <tbody>
              {slices.map((slice) => (
                <tr key={slice.label} className="border-t border-line">
                  <td className="py-1.5 pr-4">{slice.label}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{formatPercent(slice.share)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatEur(slice.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export function AllocationTab({ report }: { report: PerformanceReport }) {
  return (
    <div className="space-y-6" data-testid="allocation-tab">
      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationList title="Nach Assetklasse" slices={report.allocation.byAssetClass} testId="allocation-asset-class" />
        <AllocationList title="Nach Region (Ländercode der ISIN)" slices={report.allocation.byRegion} testId="allocation-region" />
      </div>
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 font-serif text-xl">Offene Positionen</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">ISIN</th>
                <th className="py-2 pr-4 text-right">Stück</th>
                <th className="py-2 pr-4 text-right">Letzter Kurs</th>
                <th className="py-2 pr-4 text-right">Wert</th>
                <th className="py-2 text-right">Einstand</th>
              </tr>
            </thead>
            <tbody>
              {report.portfolio.positions.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{p.isin ?? "–"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(p.shares)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatEur(p.lastPrice)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatEur(p.value)}</td>
                  <td className="py-2 text-right tabular-nums">{formatEur(p.costBasis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Die Region folgt dem Ländercode der ISIN, also dem Fondsdomizil oder Sitz des Emittenten, nicht der Anlageregion des
          Fonds.
        </p>
      </section>
    </div>
  );
}
