import type { PerformanceReport } from "@/lib/depotdoktor/report";
import { ASSET_CLASS_LABELS, type AllocationSlice } from "@/lib/depotdoktor/metrics/allocation";
import { AllocationBars } from "@portfolio/charts";
import { formatEur, formatNumber, formatPercent } from "@/lib/depotdoktor/money";
import { Panel } from "./Panel";
import { ScrollRegion } from "./ScrollRegion";

export const UNASSIGNED_HINT = "Der Export enthält keine Assetklasse";

function AllocationList({ title, eyebrow, slices, testId }: { title: string; eyebrow: string; slices: AllocationSlice[]; testId: string }) {
  return (
    <Panel title={title} eyebrow={eyebrow} testId={testId}>
      {slices.length === 0 ? (
        <p className="text-sm text-slate">Keine bewertbaren Positionen.</p>
      ) : (
        <>
          <AllocationBars
            slices={slices.map((s) => ({
              label: s.label,
              share: s.share.toNumber(),
              shareLabel: formatPercent(s.share),
              valueLabel: formatEur(s.value),
            }))}
          />
          {slices.some((slice) => slice.label === ASSET_CLASS_LABELS.unknown) ? (
            <p className="mt-5 max-w-[80ch] text-xs text-slate" data-testid="allocation-unassigned-hint">
              {ASSET_CLASS_LABELS.unknown}: {UNASSIGNED_HINT}.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

export function AllocationTab({ report }: { report: PerformanceReport }) {
  return (
    <div className="space-y-6 sm:space-y-8" data-testid="allocation-tab">
      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationList title="Nach Assetklasse" eyebrow="Allokation" slices={report.allocation.byAssetClass} testId="allocation-asset-class" />
        <AllocationList
          title="Nach Region (Ländercode der ISIN)"
          eyebrow="Allokation"
          slices={report.allocation.byRegion}
          testId="allocation-region"
        />
      </div>
      <Panel title="Offene Positionen" eyebrow="Bestand">
        <ScrollRegion label="Tabelle offene Positionen">
          <table className="data-table">
            <thead>
              <tr>
                <th className="pr-4">Name</th>
                <th className="pr-4">ISIN</th>
                <th className="pr-4 text-right">Stück</th>
                <th className="pr-4 text-right">Letzter Kurs</th>
                <th className="pr-4 text-right">Wert</th>
                <th className="text-right">Einstand</th>
              </tr>
            </thead>
            <tbody>
              {report.portfolio.positions.map((p) => (
                <tr key={p.key}>
                  <td className="pr-4">{p.name}</td>
                  <td className="pr-4 font-mono text-xs text-slate">{p.isin ?? "–"}</td>
                  <td className="pr-4 text-right">{formatNumber(p.shares)}</td>
                  <td className="pr-4 text-right whitespace-nowrap">{formatEur(p.lastPrice)}</td>
                  <td className="pr-4 text-right whitespace-nowrap">{formatEur(p.value)}</td>
                  <td className="text-right whitespace-nowrap">{formatEur(p.costBasis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
        <p className="mt-4 max-w-[80ch] text-xs leading-relaxed text-slate">
          Die Region folgt dem Ländercode der ISIN, also dem Fondsdomizil oder Sitz des Emittenten, nicht der Anlageregion des
          Fonds.
        </p>
      </Panel>
    </div>
  );
}
