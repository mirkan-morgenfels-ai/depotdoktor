import { StatTile } from "@portfolio/ui";
import { ValueChart } from "@portfolio/charts";
import type { PerformanceReport } from "@/lib/depotdoktor/report";
import { d, formatEur, formatPercent } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { valueChartPoints } from "@/lib/depotdoktor/chart-data";
import { amountKpis, PERFORMANCE_EXPLANATION, performanceKpis } from "@/lib/depotdoktor/kpis";
import { Notes } from "./Notes";
import { ScrollRegion } from "./ScrollRegion";

export function PerformanceTab({ report }: { report: PerformanceReport }) {
  const { portfolio, ttwror } = report;

  return (
    <div className="space-y-6" data-testid="performance-tab">
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {performanceKpis(report).map((kpi) => (
            <StatTile key={kpi.key} label={kpi.label} value={kpi.value} hint={kpi.hint || undefined} tone={kpi.tone} testId={`kpi-${kpi.key}`} />
          ))}
        </div>
        <p className="max-w-4xl text-sm text-muted" data-testid="performance-explanation">
          {PERFORMANCE_EXPLANATION}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {amountKpis(report).map((kpi) => (
          <StatTile key={kpi.key} label={kpi.label} value={kpi.value} hint={kpi.hint || undefined} />
        ))}
      </div>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 font-serif text-xl">Wertverlauf an den Depotbuchungstagen</h2>
        <ValueChart points={valueChartPoints(portfolio)} formatValue={(v) => formatEur(d(v))} />
        <p className="mt-2 text-xs text-muted">
          Zeitachse in Tagen. Zwischen den Buchungen sind keine Kurse bekannt; die Linie hält deshalb den Wert bis zur nächsten
          Buchung.
        </p>
        <ScrollRegion label="Tabelle Wertverlauf" className="mt-6">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-4">Datum</th>
                <th className="py-2 pr-4 text-right">Depotwert</th>
                <th className="py-2 pr-4 text-right">Externer Zahlungsstrom</th>
                <th className="py-2 text-right">Periodenrendite</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.points.map((point) => {
                const period = ttwror.periods.find((p) => p.to === point.date);
                return (
                  <tr key={point.date} className="border-t border-line">
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDateDe(point.date)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatEur(point.value)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{point.flow.isZero() ? "–" : formatEur(point.flow)}</td>
                    <td className="py-2 text-right tabular-nums">{period ? formatPercent(period.rate, true) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      </section>

      <Notes notes={report.notes} />
    </div>
  );
}
