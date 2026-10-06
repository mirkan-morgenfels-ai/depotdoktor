import { parseDecimal, type Transaction } from "@portfolio/csv";
import { Decimal, ZERO, d } from "../money";
import { basiszinsFor, type FundType } from "./constants";
import {
  buildTaxPositions,
  estimatePositionVorabpauschale,
  type PositionTaxEstimate,
  type TaxPosition,
  type TaxSale,
} from "./positions";

export interface PositionSettings {
  fundType: FundType;
  yearStartPrice: string;
  yearEndPrice: string;
}

export type SaleCreditInputs = Readonly<Record<string, string>>;

export interface TaxSaleRow {
  sale: TaxSale;
  creditAllowed: boolean;
  creditInput: string;
  creditValid: boolean;
  credit: Decimal;
  gain: Decimal;
}

export interface TaxRow {
  position: TaxPosition;
  settings: PositionSettings;
  estimate: PositionTaxEstimate | null;
  sales: TaxSaleRow[];
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

export function parseCreditInput(value: string): Decimal | null {
  if (value.trim() === "") return ZERO;
  const parsed = parsePriceInput(value);
  return parsed !== null && parsed.gte(ZERO) ? parsed : null;
}

export function buildSaleRow(sale: TaxSale, fundType: FundType, creditInput: string): TaxSaleRow {
  const creditAllowed = fundType !== "none" && sale.includesPriorYearLots;
  const parsed = creditAllowed ? parseCreditInput(creditInput) : ZERO;
  const credit = sale.vorabpauschaleCredit.plus(parsed ?? ZERO);
  return { sale, creditAllowed, creditInput, creditValid: parsed !== null, credit, gain: sale.gainBeforeCredit.minus(credit) };
}

export function buildTaxSummary(
  transactions: readonly Transaction[],
  year: number,
  settings: Readonly<Record<string, PositionSettings>>,
  saleCredits: SaleCreditInputs = {},
): TaxSummary {
  const positions = buildTaxPositions(transactions, year);
  const rows: TaxRow[] = positions.map((position) => {
    const current = settings[position.key] ?? defaultPositionSettings(position);
    const start = parsePriceInput(current.yearStartPrice);
    const end = parsePriceInput(current.yearEndPrice);
    const estimate =
      start && end ? estimatePositionVorabpauschale(position, year, current.fundType, { yearStartPrice: start, yearEndPrice: end }) : null;
    const sales = position.salesInYear.map((sale) => buildSaleRow(sale, current.fundType, saleCredits[sale.id] ?? ""));
    const realizedGain = sales.reduce((acc, s) => acc.plus(s.gain), ZERO);
    return { position, settings: current, estimate, sales, realizedGain };
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
  "Veräußerungsgewinn nach FIFO. Werden Fondsanteile aus einem Vorjahr verkauft, können die für diese Anteile bereits angesetzten Vorabpauschalen eingetragen werden; sie mindern den Gewinn in voller Höhe, ohne Teilfreistellung (§ 19 Abs. 1 Satz 3 und 4 InvStG). Ohne Eingabe wird nichts abgezogen.",
  "Der Sparerpauschbetrag (1.000 € bzw. 2.000 €) und Verlusttöpfe sind nicht berücksichtigt.",
  "Die Kurse am 01.01. und 31.12. stehen nicht im Export; vorbelegt ist der letzte Kurs aus dem Export. Für eine belastbare Schätzung die Rücknahmepreise der Fondsgesellschaft eintragen.",
];
