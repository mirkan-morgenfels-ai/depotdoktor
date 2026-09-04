import DecimalBase from "decimal.js";

export const Decimal = DecimalBase.clone({ precision: 30, rounding: DecimalBase.ROUND_HALF_UP });
export type Decimal = DecimalBase;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function d(value: DecimalBase.Value | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return ZERO;
  return new Decimal(value);
}

export function roundCents(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function sum(values: Iterable<Decimal>): Decimal {
  let total = ZERO;
  for (const v of values) total = total.plus(v);
  return total;
}

const eurFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const percentFormatter = new Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 6 });

export function formatEur(value: Decimal | null | undefined): string {
  if (!value) return "–";
  return eurFormatter.format(roundCents(value).toNumber());
}

export function formatPercent(value: Decimal | number | null | undefined, signed = false): string {
  if (value === null || value === undefined) return "–";
  const n = typeof value === "number" ? value : value.toNumber();
  const text = percentFormatter.format(n);
  return signed && n > 0 ? `+${text}` : text;
}

export function formatNumber(value: Decimal | null | undefined): string {
  if (!value) return "–";
  return numberFormatter.format(value.toNumber());
}
