import { parseDecimal, type Transaction } from "@portfolio/csv";
import { Decimal, ZERO, d, formatEur } from "../money";
import { basiszinsFor, type FundType } from "./constants";
import { EMPTY_TAX_INPUTS, type PriceField, type TaxInputs } from "./inputs";
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

export type TaxRowStatus = "complete" | "provisional" | "missing" | "notApplicable";

export type TaxTotalsStatus = "complete" | "provisional" | "missing";

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
  prefilled: Record<PriceField, boolean>;
  sameSourcePrefill: boolean;
  heldAtYearEnd: boolean;
  status: TaxRowStatus;
  estimate: PositionTaxEstimate | null;
  sales: TaxSaleRow[];
  realizedGain: Decimal;
}

export interface TaxSummary {
  year: number;
  basiszins: Decimal | null;
  rows: TaxRow[];
  totals: {
    status: TaxTotalsStatus;
    vorabpauschale: Decimal;
    taxable: Decimal;
    tax: Decimal;
    realizedGain: Decimal;
  };
}

export const PROVISIONAL_PRICE_LABEL = "vorläufig (Kurs aus dem Export)";
export const MISSING_PRICES_LABEL = "Kurse eintragen";

export function noHoldingText(year: number): string {
  return `Keine Vorabpauschale: kein Bestand am 31.12.${year} (§ 18 Abs. 3 InvStG).`;
}

export function distributionText(position: TaxPosition, fundType: FundType, year: number): string {
  const total = formatEur(position.distributionsInYear);
  if (fundType === "none") return `Dividenden ${year} (brutto, vor Steuerabzug): ${total}`;
  const held = formatEur(position.distributionsOnYearEndHoldings);
  return held === total
    ? `Ausschüttungen ${year} (brutto, vor Steuerabzug): ${total} (mindern den Basisertrag)`
    : `Ausschüttungen ${year} (brutto, vor Steuerabzug): ${total}, davon ${held} auf Anteile im Bestand am 31.12. (mindern den Basisertrag)`;
}

export function formatPriceInput(value: Decimal | null): string {
  return value ? value.toFixed(2).replace(".", ",") : "";
}

export function defaultFundType(position: TaxPosition): FundType {
  return position.assetClass === "stock" || position.assetClass === "bond" || position.assetClass === "crypto" ? "none" : "equity";
}

export function defaultPositionSettings(position: TaxPosition): PositionSettings {
  return {
    fundType: defaultFundType(position),
    yearStartPrice: formatPriceInput(position.priceBeforeYear),
    yearEndPrice: formatPriceInput(position.lastKnownPrice),
  };
}

export function resolvePositionSettings(position: TaxPosition, year: number, inputs: TaxInputs): PositionSettings {
  const defaults = defaultPositionSettings(position);
  const prices = inputs.prices[year]?.[position.key];
  return {
    fundType: inputs.fundTypes[position.key] ?? defaults.fundType,
    yearStartPrice: prices?.yearStartPrice ?? defaults.yearStartPrice,
    yearEndPrice: prices?.yearEndPrice ?? defaults.yearEndPrice,
  };
}

export function prefilledFields(position: TaxPosition, year: number, inputs: TaxInputs): Record<PriceField, boolean> {
  const prices = inputs.prices[year]?.[position.key];
  return { yearStartPrice: prices?.yearStartPrice === undefined, yearEndPrice: prices?.yearEndPrice === undefined };
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

function rowStatus(
  fundType: FundType,
  heldAtYearEnd: boolean,
  estimate: PositionTaxEstimate | null,
  prefilled: Record<PriceField, boolean>,
): TaxRowStatus {
  if (fundType === "none" || !heldAtYearEnd) return "notApplicable";
  if (!estimate) return "missing";
  return prefilled.yearStartPrice || prefilled.yearEndPrice ? "provisional" : "complete";
}

function totalsStatus(rows: readonly TaxRow[]): TaxTotalsStatus {
  if (rows.some((row) => row.status === "missing")) return "missing";
  if (rows.some((row) => row.status === "provisional")) return "provisional";
  return "complete";
}

export function buildTaxSummary(
  transactions: readonly Transaction[],
  year: number,
  inputs: TaxInputs = EMPTY_TAX_INPUTS,
  saleCredits: SaleCreditInputs = {},
): TaxSummary {
  const positions = buildTaxPositions(transactions, year);
  const rows: TaxRow[] = positions.map((position) => {
    const current = resolvePositionSettings(position, year, inputs);
    const prefilled = prefilledFields(position, year, inputs);
    const sameSourcePrefill =
      prefilled.yearStartPrice &&
      prefilled.yearEndPrice &&
      position.priceBeforeYearDate !== null &&
      position.priceBeforeYearDate === position.lastKnownPriceDate;
    const heldAtYearEnd = position.sharesAtYearEnd.gt(ZERO);
    const start = parsePriceInput(current.yearStartPrice);
    const end = parsePriceInput(current.yearEndPrice);
    const estimate =
      current.fundType === "none" || !heldAtYearEnd
        ? estimatePositionVorabpauschale(position, year, current.fundType, { yearStartPrice: ZERO, yearEndPrice: ZERO })
        : start && end && !sameSourcePrefill
          ? estimatePositionVorabpauschale(position, year, current.fundType, { yearStartPrice: start, yearEndPrice: end })
          : null;
    const sales = position.salesInYear.map((sale) => buildSaleRow(sale, current.fundType, saleCredits[sale.id] ?? ""));
    const realizedGain = sales.reduce((acc, s) => acc.plus(s.gain), ZERO);
    return {
      position,
      settings: current,
      prefilled,
      sameSourcePrefill,
      heldAtYearEnd,
      status: rowStatus(current.fundType, heldAtYearEnd, estimate, prefilled),
      estimate,
      sales,
      realizedGain,
    };
  });

  return {
    year,
    basiszins: basiszinsFor(year),
    rows,
    totals: {
      status: totalsStatus(rows),
      vorabpauschale: rows.reduce((acc, r) => acc.plus(r.estimate?.vorabpauschale ?? ZERO), ZERO),
      taxable: rows.reduce((acc, r) => acc.plus(r.estimate?.taxable ?? ZERO), ZERO),
      tax: rows.reduce((acc, r) => acc.plus(r.estimate?.tax ?? ZERO), ZERO),
      realizedGain: rows.reduce((acc, r) => acc.plus(r.realizedGain), ZERO),
    },
  };
}

export const TAX_METHOD_NOTES = [
  "Basisertrag = Stück × Kurs am 01.01. × Basiszins × 0,7. Bei Kauf im Jahr wird die Vorabpauschale um 1/12 je vollen Monat vor dem Kaufmonat gekürzt (§ 18 Abs. 2 InvStG).",
  "Vorabpauschale = Basisertrag abzüglich der Ausschüttungen des Jahres (brutto, vor Steuerabzug, § 2 Abs. 11 InvStG), höchstens der Wertzuwachs (Kurs 31.12. minus Kurs 01.01.) × Stück, nie unter 0. Ausschüttungen zählen je Anteil für die Anteile, die am Zahltag im Bestand waren; ohne Bestand am 31.12. fällt keine Vorabpauschale an.",
  "Steuerpflichtig = Vorabpauschale × (1 − Teilfreistellung). Steuer = 26,375 % (Kapitalertragsteuer plus Solidaritätszuschlag), ohne Kirchensteuer.",
  "Veräußerungsgewinn nach FIFO. Werden Fondsanteile aus einem Vorjahr verkauft, können die für diese Anteile bereits angesetzten Vorabpauschalen eingetragen werden; sie mindern den Gewinn in voller Höhe, ohne Teilfreistellung (§ 19 Abs. 1 Satz 3 und 4 InvStG). Ohne Eingabe wird nichts abgezogen.",
  "Der Sparerpauschbetrag (1.000 € bzw. 2.000 €) und Verlusttöpfe sind nicht berücksichtigt.",
  "Die Kurse am 01.01. und 31.12. stehen nicht im Export. Vorbelegt ist für den 01.01. der letzte Kurs aus dem Export bis zum 31.12. des Vorjahres, für den 31.12. der letzte Kurs bis zum Ende des Steuerjahres; solche Werte sind vorläufig. Fehlt ein Kurs oder stammen beide aus derselben Buchung, wird nichts geschätzt. Eingetragene Kurse gelten nur für das gewählte Steuerjahr, der Fondstyp gilt für alle Jahre. Für eine belastbare Schätzung die Rücknahmepreise der Fondsgesellschaft eintragen.",
];
