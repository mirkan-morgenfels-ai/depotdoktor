import type { Transaction } from "@portfolio/csv";
import { ZERO } from "../money";
import { yearOf } from "../dates";
import { isDepotBooking } from "../portfolio";
import { BASISZINS } from "./constants";
import { buildTaxPositions } from "./positions";

export const TAX_YEARS: readonly number[] = Object.keys(BASISZINS)
  .map(Number)
  .sort((a, b) => b - a);

export const RUNNING_TAX_YEAR_LABEL = "Steuerjahr läuft noch";

export function isRunningTaxYear(year: number, today: Date): boolean {
  return year >= today.getFullYear();
}

export function runningTaxYearText(year: number): string {
  return `Das Steuerjahr ${year} läuft noch. Den Kurs am 31.12.${year} gibt es erst nach Jahresende; bis dahin ist die Vorabpauschale ${year} eine Vorschau.`;
}

function holdsAtYearEnd(transactions: readonly Transaction[], year: number): boolean {
  return buildTaxPositions(transactions, year).some((position) => position.sharesAtYearEnd.gt(ZERO));
}

function lastDepotBookingYear(transactions: readonly Transaction[]): number | null {
  const years = transactions.filter(isDepotBooking).map((transaction) => yearOf(transaction.date));
  return years.length === 0 ? null : Math.max(...years);
}

export function defaultTaxYear(transactions: readonly Transaction[], today: Date, years: readonly number[] = TAX_YEARS): number {
  const sorted = [...years].sort((a, b) => b - a);
  const completed = sorted.find((year) => !isRunningTaxYear(year, today) && holdsAtYearEnd(transactions, year));
  if (completed !== undefined) return completed;
  const lastBooking = lastDepotBookingYear(transactions);
  const fallback = lastBooking === null ? undefined : (sorted.find((year) => year <= lastBooking) ?? sorted.at(-1));
  return fallback ?? sorted[0] ?? today.getFullYear();
}
