"use client";

import { useId } from "react";
import type { BrokerId } from "@portfolio/csv";
import { StatTile } from "@portfolio/ui";
import { formatEur, formatNumber, formatPercent, type Decimal } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { BASISZINS, FUND_TYPE_LABELS, type FundType } from "@/lib/depotdoktor/tax/constants";
import type { PriceField, TaxInputAction } from "@/lib/depotdoktor/tax/inputs";
import {
  distributionText,
  MISSING_PRICES_LABEL,
  noHoldingText,
  PROVISIONAL_PRICE_LABEL,
  TAX_METHOD_NOTES,
  type TaxRow,
  type TaxSummary,
} from "@/lib/depotdoktor/tax/summary";
import { ScrollRegion } from "./ScrollRegion";

export const TAX_YEARS = Object.keys(BASISZINS)
  .map(Number)
  .sort((a, b) => b - a);

export const SCALABLE_FUND_TYPE_HINT = "Der Scalable-Export unterscheidet nicht zwischen Aktie und Fonds. Bitte prüfen Sie den Fondstyp.";

export interface TaxTabProps {
  summary: TaxSummary;
  broker: BrokerId;
  onYearChange: (year: number) => void;
  onInputChange: (action: TaxInputAction) => void;
  onCreditChange: (saleId: string, value: string) => void;
}

const inputClass = "field";

const CITATION = /§ \d+(?: (?:Abs\.|Satz|Nr\.) \d+)*(?: [A-Z][A-Za-z]*G\b)?/g;

export function keepTogether(text: string): string {
  return text
    .replace(CITATION, (match) => match.replace(/ /g, "\u00a0"))
    .replace(/(\d) (InvStG|EStG|WpHG|€|%)/g, "$1\u00a0$2")
    .replace(/ \/ /g, "\u00a0/ ");
}

function positionAnchor(index: number): string {
  return `steuer-position-${index + 1}`;
}

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
    <div className="mt-3 max-w-md text-xs text-slate">
      <label htmlFor={inputId} className="block font-medium text-ink">
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
      <p id={hintId} className="mt-1.5 leading-relaxed">
        Summe der Beträge, die Ihre Bank für diese Anteile als Vorabpauschale angesetzt hat, in voller Höhe vor
        Teilfreistellung. Mindert den Gewinn nach {keepTogether("§ 19 Abs. 1 Satz 3 und 4 InvStG")}.
      </p>
      {valid ? null : (
        <p id={errorId} className="mt-1.5 text-wine">
          Bitte einen Betrag ab 0 als Dezimalzahl eintragen. Bis dahin wird nichts abgezogen.
        </p>
      )}
    </div>
  );
}

interface PriceFieldProps {
  row: TaxRow;
  year: number;
  field: PriceField;
  label: string;
  describedBy?: string | undefined;
  onInputChange: (action: TaxInputAction) => void;
}

function PriceInput({ row, year, field, label, describedBy, onInputChange }: PriceFieldProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const hintId = `${baseId}-hint`;
  const value = row.settings[field];
  const provisional = row.prefilled[field] && value !== "" && row.status !== "notApplicable";
  const description = [provisional ? hintId : null, describedBy ?? null].filter(Boolean).join(" ");
  return (
    <div className="text-xs text-slate">
      <label htmlFor={inputId} className="block font-medium">
        {label}
      </label>
      <input
        id={inputId}
        inputMode="decimal"
        value={value}
        onChange={(e) => onInputChange({ type: "setPrice", year, positionKey: row.position.key, field, value: e.target.value })}
        className={inputClass}
        aria-describedby={description === "" ? undefined : description}
        data-testid={`tax-${field === "yearStartPrice" ? "start" : "end"}-price`}
      />
      {provisional ? (
        <p id={hintId} className="mt-1.5 text-gold-deep" data-testid="tax-price-provisional">
          {PROVISIONAL_PRICE_LABEL}
        </p>
      ) : null}
    </div>
  );
}

function missingText(row: TaxRow, year: number): string {
  if (row.sameSourcePrefill) {
    return `Kurse eintragen: Der Export enthält für ${year} keinen eigenen Kurs dieser Position, vorbelegt wäre zweimal derselbe Kurs. Bitte Kurs am 01.01. und 31.12. als Dezimalzahl eintragen.`;
  }
  return "Kurse eintragen: Bitte Kurs am 01.01. und 31.12. als Dezimalzahl eintragen.";
}

function joinHints(...parts: Array<string | null>): string | undefined {
  const joined = parts.filter((part): part is string => Boolean(part)).join(" · ");
  return joined === "" ? undefined : joined;
}

export function TaxTab({ summary, broker, onYearChange, onInputChange, onCreditChange }: TaxTabProps) {
  const baseId = useId();
  const { year, rows, totals } = summary;
  const missing = totals.status === "missing";
  const statusHint = missing ? MISSING_PRICES_LABEL : totals.status === "provisional" ? PROVISIONAL_PRICE_LABEL : null;
  const amount = (value: Decimal) => (missing ? "–" : formatEur(value));
  const firstMissing = rows.findIndex((row) => row.estimate === null && row.heldAtYearEnd);
  const firstMissingRow = firstMissing >= 0 ? rows[firstMissing] : undefined;

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="tax-tab">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <label className="flex shrink-0 items-center gap-3 text-sm font-medium text-ink">
          Steuerjahr
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="field mt-0 w-auto py-1.5 font-medium"
            data-testid="tax-year"
          >
            {TAX_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true" className="hidden h-8 w-px bg-line sm:block" />
        <span className="text-[13px] leading-relaxed text-slate">
          Basiszins {year}: <span className="num font-medium text-ink">{formatPercent(summary.basiszins)}</span> · Basisertrag = Wert am
          Jahresanfang × Basiszins&nbsp;×&nbsp;0,7 · Steuersatz 26,375&nbsp;%
        </span>
      </div>

      {missing && firstMissingRow ? (
        <p
          className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-soft/45 px-4 py-3 text-sm leading-relaxed text-ink"
          data-testid="tax-prices-hint"
        >
          <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-soft text-[0.6875rem] font-semibold text-gold-deep ring-1 ring-gold/50">
            i
          </span>
          <span className="max-w-[68ch]">
            Tragen Sie unten je Fonds die Kurse am 01.01. und 31.12. ein.{" "}
            <a href={`#${positionAnchor(firstMissing)}`} className="link font-medium">
              Zur Kurseingabe für {firstMissingRow.position.name}
            </a>
          </span>
        </p>
      ) : null}

      <div className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label={`Vorabpauschale ${year}`}
          value={amount(totals.vorabpauschale)}
          hint={joinHints(statusHint, "Summe aller Positionen")}
          testId="tax-vorabpauschale"
        />
        <StatTile
          label="Steuerpflichtig nach Teilfreistellung"
          value={amount(totals.taxable)}
          hint={joinHints(statusHint)}
          testId="tax-taxable"
        />
        <StatTile
          label="Geschätzte Steuer auf Vorabpauschale"
          value={amount(totals.tax)}
          hint={joinHints(statusHint, keepTogether("vor Sparerpauschbetrag (1.000 € / 2.000 €)"))}
          tone={!missing && totals.tax.gt(0) ? "negative" : "neutral"}
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
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-slate shadow-card">Keine Wertpapierpositionen im Jahr {year}.</p>
      ) : null}

      {rows.map((row, index) => {
        const { position, settings, estimate, sales, realizedGain } = row;
        const fundTypeHintId = `${baseId}-${index}-fund-type-hint`;
        const missingId = `${baseId}-${index}-missing`;
        const showFundTypeHint = broker === "scalable" && position.assetClass === "unknown";
        const pricesMissing = estimate === null && row.heldAtYearEnd;
        return (
          <section
            key={position.key}
            id={positionAnchor(index)}
            className="scroll-mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card sm:scroll-mt-28 sm:p-8"
            data-testid="tax-position"
          >
            <div className="flex flex-col gap-6">
              <div className="min-w-0">
                <p className="eyebrow mb-2">Position</p>
                <h2 className="font-display text-[1.625rem] leading-tight font-medium tracking-[-0.01em] text-ink sm:text-[1.75rem]">{position.name}</h2>
                <p className="mt-2 max-w-[68ch] text-xs leading-relaxed text-slate">
                  <span className="font-mono">{position.isin ?? "ohne ISIN"}</span> · Bestand 01.01.: {formatNumber(position.sharesAtYearStart)} · Bestand
                  31.12.: {formatNumber(position.sharesAtYearEnd)}
                  {position.lastKnownPriceDate ? ` · letzter Kurs im Export bis Jahresende vom ${formatDateDe(position.lastKnownPriceDate)}` : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-ivory/60 p-4 sm:grid-cols-[minmax(0,22rem)_10rem_10rem] sm:p-5">
                <div className="col-span-2 text-xs text-slate sm:col-span-1">
                  <label className="block font-medium">
                    Fondstyp
                    <select
                      value={settings.fundType}
                      onChange={(e) =>
                        onInputChange({ type: "setFundType", positionKey: position.key, fundType: e.target.value as FundType })
                      }
                      className="field"
                      aria-describedby={showFundTypeHint ? fundTypeHintId : undefined}
                    >
                      {(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((ft) => (
                        <option key={ft} value={ft}>
                          {FUND_TYPE_LABELS[ft]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {showFundTypeHint ? (
                    <p id={fundTypeHintId} className="mt-1.5 max-w-xs text-gold-deep" data-testid="tax-fund-type-hint">
                      {SCALABLE_FUND_TYPE_HINT}
                    </p>
                  ) : null}
                </div>
                <PriceInput
                  row={row}
                  year={year}
                  field="yearStartPrice"
                  label={`Kurs 01.01.${year} (€)`}
                  describedBy={pricesMissing ? missingId : undefined}
                  onInputChange={onInputChange}
                />
                <PriceInput
                  row={row}
                  year={year}
                  field="yearEndPrice"
                  label={`Kurs 31.12.${year} (€)`}
                  describedBy={pricesMissing ? missingId : undefined}
                  onInputChange={onInputChange}
                />
              </div>
            </div>

            {estimate && estimate.fundType === "none" ? (
              <p className="mt-6 rounded-xl bg-ivory px-4 py-3 text-sm text-slate">
                <span className="block max-w-[68ch]">Kein Fonds: Für diese Position wird keine Vorabpauschale berechnet.</span>
              </p>
            ) : !row.heldAtYearEnd ? (
              <p className="mt-6 rounded-xl bg-ivory px-4 py-3 text-sm text-slate" data-testid="tax-no-holding">
                <span className="block max-w-[68ch]">{keepTogether(noHoldingText(year))}</span>
              </p>
            ) : estimate ? (
              <ScrollRegion label={`Vorabpauschale ${position.name}`} className="mt-8">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="pr-3 sm:pr-4">Anteil</th>
                      <th className="pr-3 text-right sm:pr-4">Vorabpauschale</th>
                      <th className="pr-3 text-right sm:pr-4">Steuer</th>
                      <th className="pr-4 text-right">Stück</th>
                      <th className="pr-4 text-right">Monate entfallen</th>
                      <th className="pr-4 text-right">Basisertrag</th>
                      <th className="text-right">Steuerpflichtig</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.parts.map((part) => (
                      <tr key={part.label}>
                        <td className="pr-3 sm:pr-4 sm:whitespace-nowrap">
                          {part.label.startsWith("Kauf ") ? `Kauf ${formatDateDe(part.label.slice(5))}` : part.label}
                        </td>
                        <td className="pr-3 text-right whitespace-nowrap sm:pr-4">
                          {formatEur(part.result.vorabpauschale)}
                          {part.result.capApplied ? <span className="ml-1 text-xs text-gold-deep">Deckel</span> : null}
                        </td>
                        <td className="pr-3 text-right whitespace-nowrap sm:pr-4">{formatEur(part.result.tax)}</td>
                        <td className="pr-4 text-right">{formatNumber(part.shares)}</td>
                        <td className="pr-4 text-right">{part.monthsBeforeAcquisition}</td>
                        <td className="pr-4 text-right whitespace-nowrap">{formatEur(part.result.basisertrag)}</td>
                        <td className="text-right whitespace-nowrap">{formatEur(part.result.taxable)}</td>
                      </tr>
                    ))}
                    <tr className="is-total">
                      <td className="pr-3 sm:pr-4">Summe</td>
                      <td className="pr-3 text-right whitespace-nowrap sm:pr-4">{formatEur(estimate.vorabpauschale)}</td>
                      <td className="pr-3 text-right whitespace-nowrap sm:pr-4" data-testid="position-tax">
                        {formatEur(estimate.tax)}
                      </td>
                      <td className="pr-4" colSpan={3} />
                      <td className="text-right whitespace-nowrap">{formatEur(estimate.taxable)}</td>
                    </tr>
                  </tbody>
                </table>
              </ScrollRegion>
            ) : (
              <p
                id={missingId}
                className="mt-6 rounded-xl border border-wine/25 bg-wine-soft/50 px-4 py-3 text-sm text-wine"
                data-testid="tax-prices-missing"
              >
                <span className="block max-w-[68ch]">{missingText(row, year)}</span>
              </p>
            )}

            {sales.length > 0 ? (
              <div className="mt-8 border-t border-line pt-6 text-sm">
                <h3 className="eyebrow">Verkäufe {year} (FIFO)</h3>
                <ul className="mt-3 space-y-4 text-slate">
                  {sales.map(({ sale, creditAllowed, creditInput, creditValid, credit, gain }) => (
                    <li key={sale.id} data-testid="tax-sale">
                      <p className="max-w-[68ch] leading-relaxed">
                        {formatDateDe(sale.date)}: {formatNumber(sale.sharesSold)} Stück verkauft, Erlös {formatEur(sale.proceeds)},
                        Anschaffungskosten {formatEur(sale.cost)}
                        {credit.gt(0) ? `, angesetzte Vorabpauschalen ${formatEur(credit)}` : ""}, Gewinn{" "}
                        <span className={gain.lt(0) ? "num font-medium text-wine" : "num font-medium text-moss"} data-testid="tax-sale-gain">
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
                <p className="mt-3 text-xs text-slate">Realisierter Gewinn gesamt: {formatEur(realizedGain)}.</p>
              </div>
            ) : null}

            {position.distributionsInYear.gt(0) ? (
              <p className="mt-4 max-w-[68ch] text-xs text-slate" data-testid="tax-distributions">
                {keepTogether(distributionText(position, settings.fundType, year))}.
              </p>
            ) : null}
          </section>
        );
      })}

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
        <p className="eyebrow mb-2">Methode</p>
        <h2 className="font-display text-[1.625rem] leading-tight font-medium tracking-[-0.01em] text-ink sm:text-[1.75rem]">So wird gerechnet</h2>
        <ol className="mt-7 gap-x-12 text-sm leading-relaxed text-slate lg:columns-2">
          {TAX_METHOD_NOTES.map((note, index) => (
            <li key={note} className="mb-5 grid break-inside-avoid grid-cols-[2rem_1fr] gap-3 last:mb-0">
              <span aria-hidden="true" className="font-display text-xl leading-6 text-gold-deep [font-variant-numeric:lining-nums_tabular-nums]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{keepTogether(note)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
