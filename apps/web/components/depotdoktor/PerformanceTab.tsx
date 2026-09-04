import { StatTile } from "@portfolio/ui";
import type { PerformanceReport } from "@/lib/depotdoktor/report";
import { formatEur, formatPercent } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { Notes } from "./Notes";

function tone(value: number | null | undefined): "neutral" | "positive" | "negative" {
  if (value === null || value === undefined) return "neutral";
  return value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
}

export function PerformanceTab({ report }: { report: PerformanceReport }) {
  const { portfolio, ttwror, ttwrorAnnualized, irr, volatility, drawdown } = report;
  const totalReturn = ttwror.total?.toNumber() ?? null;
  const period =
    portfolio.firstDate && portfolio.lastDate ? `${formatDateDe(portfolio.firstDate)} bis ${formatDateDe(portfolio.lastDate)}` : "–";

  return (
    <div className="space-y-6" data-testid="performance-tab">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="TTWROR"
          value={formatPercent(ttwror.total, true)}
          hint={ttwrorAnnualized ? `${formatPercent(ttwrorAnnualized, true)} p. a. · ${period}` : period}
          tone={tone(totalReturn)}
        />
        <StatTile
          label="IRR (geldgewichtet)"
          value={irr.ok ? `${formatPercent(irr.rate, true)} p. a.` : "–"}
          hint={irr.ok ? `${irr.method === "newton" ? "Newton" : "Bisektion"}, ${irr.iterations} Iterationen` : "nicht bestimmbar"}
          tone={irr.ok ? tone(irr.rate) : "neutral"}
        />
        <StatTile label="Volatilität" value={volatility ? `${formatPercent(volatility)} p. a.` : "–"} hint="aus Transaktionsbewertungen" />
        <StatTile
          label="Max Drawdown"
          value={drawdown.maxDrawdown.gt(0) ? `−${formatPercent(drawdown.maxDrawdown)}` : formatPercent(0)}
          hint={drawdown.peakDate && drawdown.troughDate ? `${formatDateDe(drawdown.peakDate)} → ${formatDateDe(drawdown.troughDate)}` : undefined}
          tone={drawdown.maxDrawdown.gt(0) ? "negative" : "neutral"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Depotwert (letzter Kurs)" value={formatEur(portfolio.totals.endValue)} />
        <StatTile label="Investiert (Käufe)" value={formatEur(portfolio.totals.invested)} />
        <StatTile label="Verkaufserlöse" value={formatEur(portfolio.totals.proceeds)} />
        <StatTile label="Dividenden netto" value={formatEur(portfolio.totals.dividends)} />
        <StatTile label="Gebühren" value={formatEur(portfolio.totals.fees)} />
        <StatTile label="Abgeführte Steuern" value={formatEur(portfolio.totals.taxes)} />
        <StatTile label="Einzahlungen Konto" value={formatEur(portfolio.totals.deposits)} hint="nicht in TTWROR/IRR" />
        <StatTile label="Zinsen Konto" value={formatEur(portfolio.totals.interest)} hint="nicht in TTWROR/IRR" />
      </div>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 font-serif text-xl">Wertverlauf an den Buchungstagen</h2>
        <div className="overflow-x-auto">
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
              {portfolio.points.map((point, index) => {
                const period = ttwror.periods.find((p) => p.to === point.date);
                return (
                  <tr key={point.date} className="border-t border-line">
                    <td className="py-2 pr-4">{formatDateDe(point.date)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatEur(point.value)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{point.flow.isZero() ? "–" : formatEur(point.flow)}</td>
                    <td className="py-2 text-right tabular-nums">{index === 0 || !period ? "–" : formatPercent(period.rate, true)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Notes notes={report.notes} />
    </div>
  );
}
