import { Decimal, ZERO } from "../money";
import type { ValuationPoint } from "./ttwror";
import { periodReturns } from "./ttwror";
import { daysBetween } from "../dates";

export const TRADING_DAYS_PER_YEAR = 252;

export function sampleStdDev(values: readonly Decimal[]): Decimal | null {
  if (values.length < 2) return null;
  const n = new Decimal(values.length);
  const mean = values.reduce((acc, v) => acc.plus(v), ZERO).div(n);
  const squares = values.reduce((acc, v) => acc.plus(v.minus(mean).pow(2)), ZERO);
  return squares.div(n.minus(1)).sqrt();
}

export function annualizedVolatility(returns: readonly Decimal[], periodsPerYear: number = TRADING_DAYS_PER_YEAR): Decimal | null {
  const sd = sampleStdDev(returns);
  if (!sd) return null;
  return sd.times(new Decimal(periodsPerYear).sqrt());
}

export function volatilityFromPoints(points: readonly ValuationPoint[]): Decimal | null {
  const periods = periodReturns(points);
  const normalized: Decimal[] = [];
  for (const period of periods) {
    const days = daysBetween(period.from, period.to);
    if (days <= 0) continue;
    const tradingDays = new Decimal(days).times(TRADING_DAYS_PER_YEAR).div(365);
    normalized.push(period.rate.div(tradingDays.sqrt()));
  }
  return annualizedVolatility(normalized, TRADING_DAYS_PER_YEAR);
}
