"use client";

import { useId } from "react";
import { StatTile } from "@portfolio/ui";
import { formatEur, formatNumber, formatPercent } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { BASISZINS, FUND_TYPE_LABELS, type FundType } from "@/lib/depotdoktor/tax/constants";
import type { TaxInputAction } from "@/lib/depotdoktor/tax/inputs";
import { TAX_METHOD_NOTES, type TaxSummary } from "@/lib/depotdoktor/tax/summary";

export const TAX_YEARS = Object.keys(BASISZINS)
  .map(Number)
  .sort((a, b) => b - a);

export interface TaxTabProps {
  summary: TaxSummary;
  onYearChange: (year: number) => void;
  onInputChange: (action: TaxInputAction) => void;
  onCreditChange: (saleId: string, value: string) => void;
}

const inputClass = "mt-1 block w-full rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink tabular-nums";

interface SaleCreditFieldProps {
  value: string;
  valid: boolean;
  onChange: (value: string) => void;
}

function SaleCreditField({ value, valid, onChange }: SaleCreditFieldProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  return (
    <div className="mt-2 max-w-md text-xs text-muted">
      <label htmlFor={inputId} className="block">
        Für diese Anteile in Vorjahren angesetzte Vorabpauschalen (€, optional)
      </label>
      <input
        id={inputId}
        inputMode="decimal"
        value={value}
        placeholder="0,00"
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        aria-invalid={!valid}
        aria-describedby={valid ? hintId : `${hintId} ${errorId}`}
        data-testid="tax-sale-credit"
      />
      <p id={hintId} className="mt-1">
        Summe der Beträge, die Ihre Bank für diese Anteile als Vorabpauschale angesetzt hat, in voller Höhe vor
        Teilfreistellung. Mindert den Gewinn nach § 19 Abs. 1 Satz 3 und 4 InvStG.
      </p>
      {valid ? null : (
        <p id={errorId} className="mt-1 text-bordeaux">
          Bitte einen Betrag ab 0 als Dezimalzahl eintragen. Bis dahin wird nichts abgezogen.
        </p>
      )}
    </div>
  );
}

export function TaxTab({ summary, onYearChange, onInputChange, onCreditChange }: TaxTabProps) {
  const { year, rows, totals } = summary;

  return (
    <div className="space-y-6" data-testid="tax-tab">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Steuerjahr
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="rounded-md border border-line bg-surface px-2 py-1"
            data-testid="tax-year"
          >
            {TAX_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted">
          Basiszins {year}: {formatPercent(summary.basiszins)} · Basisertrag = Wert am Jahresanfang × Basiszins × 0,7 · Steuersatz 26,375 %
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`Vorabpauschale ${year}`}
          value={formatEur(totals.vorabpauschale)}
          hint="Summe aller Positionen"
          testId="tax-vorabpauschale"
        />
        <StatTile label="Steuerpflichtig nach Teilfreistellung" value={formatEur(totals.taxable)} testId="tax-taxable" />
        <StatTile
          label="Geschätzte Steuer auf Vorabpauschale"
          value={formatEur(totals.tax)}
          hint="vor Sparerpauschbetrag (1.000 € / 2.000 €)"
          tone={totals.tax.gt(0) ? "negative" : "neutral"}
          testId="tax-estimated-tax"
        />
        <StatTile
          label={`Realisierte Gewinne ${year} (FIFO)`}
          value={formatEur(totals.realizedGain)}
          hint="vor Teilfreistellung und Steuer"
          tone={totals.realizedGain.gt(0) ? "positive" : totals.realizedGain.lt(0) ? "negative" : "neutral"}
          testId="tax-realized-gain"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">Keine Wertpapierpositionen im Jahr {year}.</p>
      ) : null}

      {rows.map(({ position, settings, estimate, sales, realizedGain }) => (
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
                  value={settings.fundType}
                  onChange={(e) => onInputChange({ type: "setFundType", positionKey: position.key, fundType: e.target.value as FundType })}
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
                  value={settings.yearStartPrice}
                  onChange={(e) =>
                    onInputChange({ type: "setPrice", year, positionKey: position.key, field: "yearStartPrice", value: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs text-muted">
                Kurs 31.12.{year} (€)
                <input
                  inputMode="decimal"
                  value={settings.yearEndPrice}
                  onChange={(e) =>
                    onInputChange({ type: "setPrice", year, positionKey: position.key, field: "yearEndPrice", value: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          {estimate && estimate.fundType === "none" ? (
            <p className="mt-4 text-sm text-muted">Für diese Position wird keine Vorabpauschale berechnet.</p>
          ) : estimate ? (
            <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label={`Vorabpauschale ${position.name}`}>
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
                        {part.result.capApplied ? <span className="ml-1 text-xs text-gold-deep">Deckel</span> : null}
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

          {sales.length > 0 ? (
            <div className="mt-4 text-sm">
              <h3 className="font-medium">Verkäufe {year} (FIFO)</h3>
              <ul className="mt-1 space-y-3 text-muted">
                {sales.map(({ sale, creditAllowed, creditInput, creditValid, credit, gain }) => (
                  <li key={sale.id} data-testid="tax-sale">
                    <p>
                      {formatDateDe(sale.date)}: {formatNumber(sale.sharesSold)} Stück verkauft, Erlös {formatEur(sale.proceeds)},
                      Anschaffungskosten {formatEur(sale.cost)}
                      {credit.gt(0) ? `, angesetzte Vorabpauschalen ${formatEur(credit)}` : ""}, Gewinn{" "}
                      <span className={gain.lt(0) ? "text-bordeaux" : "text-green"} data-testid="tax-sale-gain">
                        {formatEur(gain)}
                      </span>
                      {sale.sharesUncovered.gt(0) ? ` (${formatNumber(sale.sharesUncovered)} Stück ohne bekannten Einstand)` : ""}
                    </p>
                    {creditAllowed ? (
                      <SaleCreditField
                        value={creditInput}
                        valid={creditValid}
                        onChange={(value) => onCreditChange(sale.id, value)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">Realisierter Gewinn gesamt: {formatEur(realizedGain)}.</p>
            </div>
          ) : null}

          {position.distributionsInYear.gt(0) ? (
            <p className="mt-3 text-xs text-muted">
              Ausschüttungen {year}: {formatEur(position.distributionsInYear)} (mindern den Basisertrag).
            </p>
          ) : null}
        </section>
      ))}

      <section className="rounded-lg border border-line bg-surface p-6 text-sm">
        <h2 className="mb-3 font-serif text-lg">So wird gerechnet</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          {TAX_METHOD_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
