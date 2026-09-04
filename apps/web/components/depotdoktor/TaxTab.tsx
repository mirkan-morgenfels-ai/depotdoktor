"use client";

import { useMemo, useState } from "react";
import { parseDecimal, type Transaction } from "@portfolio/csv";
import { StatTile } from "@portfolio/ui";
import { d, formatEur, formatNumber, formatPercent, ZERO } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { BASISZINS, FUND_TYPE_LABELS, type FundType } from "@/lib/depotdoktor/tax/constants";
import { buildTaxPositions, estimatePositionVorabpauschale, type TaxPosition } from "@/lib/depotdoktor/tax/positions";

const YEARS = Object.keys(BASISZINS)
  .map(Number)
  .sort((a, b) => b - a);

interface PositionSettings {
  fundType: FundType;
  yearStartPrice: string;
  yearEndPrice: string;
}

function defaultSettings(position: TaxPosition): PositionSettings {
  const price = position.lastKnownPrice ? position.lastKnownPrice.toFixed(2).replace(".", ",") : "";
  const fundType: FundType = position.assetClass === "stock" || position.assetClass === "bond" || position.assetClass === "crypto" ? "none" : "equity";
  return { fundType, yearStartPrice: price, yearEndPrice: price };
}

function toDecimal(value: string) {
  const parsed = parseDecimal(value, "comma");
  return parsed === null ? null : d(parsed);
}

export function TaxTab({ transactions }: { transactions: Transaction[] }) {
  const [year, setYear] = useState<number>(YEARS[0] ?? 2026);
  const [settings, setSettings] = useState<Record<string, PositionSettings>>({});

  const positions = useMemo(() => buildTaxPositions(transactions, year), [transactions, year]);

  const rows = positions.map((position) => {
    const current = settings[position.key] ?? defaultSettings(position);
    const start = toDecimal(current.yearStartPrice);
    const end = toDecimal(current.yearEndPrice);
    const estimate =
      start && end ? estimatePositionVorabpauschale(position, year, current.fundType, { yearStartPrice: start, yearEndPrice: end }) : null;
    const realizedGain = position.salesInYear.reduce((acc, s) => acc.plus(s.gain), ZERO);
    return { position, current, estimate, realizedGain };
  });

  const totalVorabpauschale = rows.reduce((acc, r) => acc.plus(r.estimate?.vorabpauschale ?? ZERO), ZERO);
  const totalTaxable = rows.reduce((acc, r) => acc.plus(r.estimate?.taxable ?? ZERO), ZERO);
  const totalTax = rows.reduce((acc, r) => acc.plus(r.estimate?.tax ?? ZERO), ZERO);
  const totalRealized = rows.reduce((acc, r) => acc.plus(r.realizedGain), ZERO);

  function update(key: string, position: TaxPosition, patch: Partial<PositionSettings>) {
    setSettings((prev) => ({ ...prev, [key]: { ...(prev[key] ?? defaultSettings(position)), ...patch } }));
  }

  return (
    <div className="space-y-6" data-testid="tax-tab">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Steuerjahr
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-line bg-surface px-2 py-1"
            data-testid="tax-year"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted">
          Basiszins {year}: {formatPercent(BASISZINS[year] ?? null)} · Basisertrag = Wert am Jahresanfang × Basiszins × 0,7 · Steuersatz 26,375 %
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={`Vorabpauschale ${year}`} value={formatEur(totalVorabpauschale)} hint="Summe aller Positionen" />
        <StatTile label="Steuerpflichtig nach Teilfreistellung" value={formatEur(totalTaxable)} />
        <StatTile label="Geschätzte Steuer auf Vorabpauschale" value={formatEur(totalTax)} hint="vor Sparerpauschbetrag (1.000 € / 2.000 €)" tone={totalTax.gt(0) ? "negative" : "neutral"} />
        <StatTile label={`Realisierte Gewinne ${year} (FIFO)`} value={formatEur(totalRealized)} hint="vor Teilfreistellung und Steuer" tone={totalRealized.gt(0) ? "positive" : totalRealized.lt(0) ? "negative" : "neutral"} />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">Keine Wertpapierpositionen im Jahr {year}.</p>
      ) : null}

      {rows.map(({ position, current, estimate, realizedGain }) => (
        <section key={position.key} className="rounded-lg border border-line bg-surface p-6" data-testid="tax-position">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl">{position.name}</h2>
              <p className="text-xs text-muted">
                {position.isin ?? "ohne ISIN"} · Bestand 01.01.: {formatNumber(position.sharesAtYearStart)} · Bestand 31.12.:{" "}
                {formatNumber(position.sharesAtYearEnd)}
                {position.lastKnownPriceDate ? ` · letzter Kurs im Export vom ${formatDateDe(position.lastKnownPriceDate)}` : ""}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted">
                Fondstyp
                <select
                  value={current.fundType}
                  onChange={(e) => update(position.key, position, { fundType: e.target.value as FundType })}
                  className="mt-1 block w-full rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink"
                >
                  {(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((ft) => (
                    <option key={ft} value={ft}>
                      {FUND_TYPE_LABELS[ft]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                Kurs 01.01.{year} (€)
                <input
                  inputMode="decimal"
                  value={current.yearStartPrice}
                  onChange={(e) => update(position.key, position, { yearStartPrice: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink tabular-nums"
                />
              </label>
              <label className="text-xs text-muted">
                Kurs 31.12.{year} (€)
                <input
                  inputMode="decimal"
                  value={current.yearEndPrice}
                  onChange={(e) => update(position.key, position, { yearEndPrice: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink tabular-nums"
                />
              </label>
            </div>
          </div>

          {estimate && estimate.fundType === "none" ? (
            <p className="mt-4 text-sm text-muted">Für diese Position wird keine Vorabpauschale berechnet.</p>
          ) : estimate ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-4">Anteil</th>
                    <th className="py-2 pr-4 text-right">Stück</th>
                    <th className="py-2 pr-4 text-right">Monate entfallen</th>
                    <th className="py-2 pr-4 text-right">Basisertrag</th>
                    <th className="py-2 pr-4 text-right">Vorabpauschale</th>
                    <th className="py-2 pr-4 text-right">Steuerpflichtig</th>
                    <th className="py-2 text-right">Steuer</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.parts.map((part) => (
                    <tr key={part.label} className="border-t border-line">
                      <td className="py-2 pr-4">{part.label.startsWith("Kauf ") ? `Kauf ${formatDateDe(part.label.slice(5))}` : part.label}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(part.shares)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{part.monthsBeforeAcquisition}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatEur(part.result.basisertrag)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatEur(part.result.vorabpauschale)}
                        {part.result.capApplied ? <span className="ml-1 text-xs text-gold">Deckel</span> : null}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatEur(part.result.taxable)}</td>
                      <td className="py-2 text-right tabular-nums">{formatEur(part.result.tax)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-ink font-medium">
                    <td className="py-2 pr-4" colSpan={4}>
                      Summe
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatEur(estimate.vorabpauschale)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatEur(estimate.taxable)}</td>
                    <td className="py-2 text-right tabular-nums" data-testid="position-tax">
                      {formatEur(estimate.tax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-bordeaux">Bitte Kurs am 01.01. und 31.12. als Dezimalzahl eintragen.</p>
          )}

          {position.salesInYear.length > 0 ? (
            <div className="mt-4 text-sm">
              <h3 className="font-medium">Verkäufe {year} (FIFO)</h3>
              <ul className="mt-1 space-y-1 text-muted">
                {position.salesInYear.map((sale, index) => (
                  <li key={index}>
                    {formatNumber(sale.sharesSold)} Stück verkauft, Erlös {formatEur(sale.proceeds)}, Anschaffungskosten {formatEur(sale.cost)}, Gewinn{" "}
                    <span className={sale.gain.lt(0) ? "text-bordeaux" : "text-green"}>{formatEur(sale.gain)}</span>
                    {sale.sharesUncovered.gt(0) ? ` (${formatNumber(sale.sharesUncovered)} Stück ohne bekannten Einstand)` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">Realisierter Gewinn gesamt: {formatEur(realizedGain)}.</p>
            </div>
          ) : null}

          {position.distributionsInYear.gt(0) ? (
            <p className="mt-3 text-xs text-muted">Ausschüttungen {year}: {formatEur(position.distributionsInYear)} (mindern den Basisertrag).</p>
          ) : null}
        </section>
      ))}

      <section className="rounded-lg border border-line bg-surface p-6 text-sm">
        <h2 className="mb-3 font-serif text-lg">So wird gerechnet</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Basisertrag = Stück × Kurs am 01.01. × Basiszins × 0,7. Bei Kauf im Jahr wird der Basisertrag um 1/12 je vollen Monat vor dem Kaufmonat gekürzt.</li>
          <li>Vorabpauschale = Basisertrag abzüglich Ausschüttungen, höchstens der Wertzuwachs (Kurs 31.12. minus Kurs 01.01.) × Stück, nie unter 0.</li>
          <li>Steuerpflichtig = Vorabpauschale × (1 − Teilfreistellung). Steuer = 26,375 % (Kapitalertragsteuer plus Solidaritätszuschlag), ohne Kirchensteuer.</li>
          <li>Der Sparerpauschbetrag (1.000 € bzw. 2.000 €) und Verlusttöpfe sind nicht berücksichtigt.</li>
          <li>Die Kurse am 01.01. und 31.12. stehen nicht im Export; vorbelegt ist der letzte Kurs aus dem Export. Für eine belastbare Schätzung die Rücknahmepreise der Fondsgesellschaft eintragen.</li>
        </ul>
      </section>
    </div>
  );
}
