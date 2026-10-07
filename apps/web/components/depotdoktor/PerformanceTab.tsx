import { StatTile } from "@portfolio/ui";
import { ValueChart } from "@portfolio/charts";
import type { PerformanceReport } from "@/lib/depotdoktor/report";
import { d, formatEur, formatPercent } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { valueChartPoints } from "@/lib/depotdoktor/chart-data";
import { amountKpis, PERFORMANCE_EXPLANATION, performanceKpis } from "@/lib/depotdoktor/kpis";
import { Notes } from "./Notes";
import { Panel } from "./Panel";
import { ScrollRegion } from "./ScrollRegion";

const AXIS_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

function formatAxisEur(value: number): string {
  return `${AXIS_FORMAT.format(value)} €`;
}

export function PerformanceTab({ report }: { report: PerformanceReport }) {
  const { portfolio, ttwror } = report;

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="performance-tab">
      <div className="space-y-4">
        <div className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {performanceKpis(report).map((kpi) => (
            <StatTile key={kpi.key} label={kpi.label} value={kpi.value} hint={kpi.hint || undefined} tone={kpi.tone} testId={`kpi-${kpi.key}`} />
          ))}
        </div>
        <p className="max-w-[68ch] text-sm leading-relaxed text-slate" data-testid="performance-explanation">
          {PERFORMANCE_EXPLANATION}
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="amounts-title">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 px-5 pt-6 pb-5 sm:px-6 sm:pt-7">
          <div>
            <p className="eyebrow mb-2">Summen</p>
            <h2 id="amounts-title" className="font-display text-[1.625rem] leading-tight font-medium tracking-[-0.01em] text-ink sm:text-[1.75rem]">
              Beträge
            </h2>
          </div>
          <p className="text-xs text-slate">Käufe, Erlöse, Erträge und Kosten im Exportzeitraum</p>
        </div>
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {amountKpis(report).map((kpi) => (
            <StatTile key={kpi.key} label={kpi.label} value={kpi.value} hint={kpi.hint || undefined} variant="ledger" />
          ))}
        </div>
      </section>

      <Panel title="Wertverlauf an den Depotbuchungstagen" eyebrow="Zeitreihe">
        <ValueChart points={valueChartPoints(portfolio)} formatValue={(v) => formatEur(d(v))} formatAxis={formatAxisEur} />
        <p className="mt-3 max-w-[80ch] text-xs leading-relaxed text-slate">
          Zeitachse in Tagen. Zwischen den Buchungen sind keine Kurse bekannt; die Linie hält deshalb den Wert bis zur nächsten
          Buchung.
        </p>
        <ScrollRegion label="Tabelle Wertverlauf" className="mt-8">
          <table className="data-table">
            <thead>
              <tr>
                <th className="pr-4">Datum</th>
                <th className="pr-4 text-right">Depotwert</th>
                <th className="pr-4 text-right">Externer Zahlungsstrom</th>
                <th className="text-right">Periodenrendite</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.points.map((point) => {
                const period = ttwror.periods.find((p) => p.to === point.date);
                return (
                  <tr key={point.date}>
                    <td className="num pr-4 whitespace-nowrap">{formatDateDe(point.date)}</td>
                    <td className="pr-4 text-right whitespace-nowrap">{formatEur(point.value)}</td>
                    <td className="pr-4 text-right whitespace-nowrap">{point.flow.isZero() ? "–" : formatEur(point.flow)}</td>
                    <td className="text-right whitespace-nowrap">{period ? formatPercent(period.rate, true) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      </Panel>

      <Notes notes={report.notes} />
    </div>
  );
}
