import { parseDecimal, type Transaction } from "@portfolio/csv";
import { Decimal, ZERO, d } from "../money";
import { basiszinsFor, type FundType } from "./constants";
import { buildTaxPositions, estimatePositionVorabpauschale, type PositionTaxEstimate, type TaxPosition } from "./positions";

export interface PositionSettings {
  fundType: FundType;
  yearStartPrice: string;
  yearEndPrice: string;
}

export interface TaxRow {
  position: TaxPosition;
  settings: PositionSettings;
  estimate: PositionTaxEstimate | null;
  realizedGain: Decimal;
}

export interface TaxSummary {
  year: number;
  basiszins: Decimal | null;
  rows: TaxRow[];
  totals: {
    vorabpauschale: Decimal;
    taxable: Decimal;
    tax: Decimal;
    realizedGain: Decimal;
  };
}

export function formatPriceInput(value: Decimal | null): string {
  return value ? value.toFixed(2).replace(".", ",") : "";
}

export function defaultPositionSettings(position: TaxPosition): PositionSettings {
  const price = formatPriceInput(position.lastKnownPrice);
  const fundType: FundType =
    position.assetClass === "stock" || position.assetClass === "bond" || position.assetClass === "crypto" ? "none" : "equity";
  return { fundType, yearStartPrice: price, yearEndPrice: price };
}

export function parsePriceInput(value: string): Decimal | null {
  const parsed = parseDecimal(value, "comma");
  return parsed === null ? null : d(parsed);
}

export function buildTaxSummary(
  transactions: readonly Transaction[],
  year: number,
  settings: Readonly<Record<string, PositionSettings>>,
): TaxSummary {
  const positions = buildTaxPositions(transactions, year);
  const rows: TaxRow[] = positions.map((position) => {
    const current = settings[position.key] ?? defaultPositionSettings(position);
    const start = parsePriceInput(current.yearStartPrice);
    const end = parsePriceInput(current.yearEndPrice);
    const estimate =
      start && end ? estimatePositionVorabpauschale(position, year, current.fundType, { yearStartPrice: start, yearEndPrice: end }) : null;
    const realizedGain = position.salesInYear.reduce((acc, s) => acc.plus(s.gain), ZERO);
    return { position, settings: current, estimate, realizedGain };
  });

  return {
    year,
    basiszins: basiszinsFor(year),
    rows,
    totals: {
      vorabpauschale: rows.reduce((acc, r) => acc.plus(r.estimate?.vorabpauschale ?? ZERO), ZERO),
      taxable: rows.reduce((acc, r) => acc.plus(r.estimate?.taxable ?? ZERO), ZERO),
      tax: rows.reduce((acc, r) => acc.plus(r.estimate?.tax ?? ZERO), ZERO),
      realizedGain: rows.reduce((acc, r) => acc.plus(r.realizedGain), ZERO),
    },
  };
}

export const TAX_METHOD_NOTES = [
  "Basisertrag = Stück × Kurs am 01.01. × Basiszins × 0,7. Bei Kauf im Jahr wird der Basisertrag um 1/12 je vollen Monat vor dem Kaufmonat gekürzt.",
  "Vorabpauschale = Basisertrag abzüglich Ausschüttungen, höchstens der Wertzuwachs (Kurs 31.12. minus Kurs 01.01.) × Stück, nie unter 0.",
  "Steuerpflichtig = Vorabpauschale × (1 − Teilfreistellung). Steuer = 26,375 % (Kapitalertragsteuer plus Solidaritätszuschlag), ohne Kirchensteuer.",
  "Der Sparerpauschbetrag (1.000 € bzw. 2.000 €) und Verlusttöpfe sind nicht berücksichtigt.",
  "Die Kurse am 01.01. und 31.12. stehen nicht im Export; vorbelegt ist der letzte Kurs aus dem Export. Für eine belastbare Schätzung die Rücknahmepreise der Fondsgesellschaft eintragen.",
];
