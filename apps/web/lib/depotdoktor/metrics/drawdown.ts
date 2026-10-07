import { Decimal, ZERO } from "../money";
import { periodReturns, type ValuationPoint } from "./ttwror";

export interface DrawdownResult {
  maxDrawdown: Decimal;
  peakDate: string | null;
  troughDate: string | null;
}

export function maxDrawdown(values: readonly Decimal[]): Decimal {
  let peak: Decimal | null = null;
  let worst = ZERO;
  for (const value of values) {
    if (peak === null || value.gt(peak)) peak = value;
    if (peak.gt(ZERO)) {
      const drawdown = peak.minus(value).div(peak);
      if (drawdown.gt(worst)) worst = drawdown;
    }
  }
  return worst;
}

export function maxDrawdownFromPoints(points: readonly ValuationPoint[]): DrawdownResult {
  const periods = periodReturns(points);
  let index = new Decimal(1);
  let peak = index;
  let peakDate: string | null = periods[0]?.from ?? null;
  let worst = ZERO;
  let worstPeakDate: string | null = null;
  let worstTroughDate: string | null = null;
  for (const period of periods) {
    index = index.times(new Decimal(1).plus(period.rate));
    if (index.gt(peak)) {
      peak = index;
      peakDate = period.to;
    }
    const drawdown = peak.minus(index).div(peak);
    if (drawdown.gt(worst)) {
      worst = drawdown;
      worstPeakDate = peakDate;
      worstTroughDate = period.to;
    }
  }
  return { maxDrawdown: worst, peakDate: worstPeakDate, troughDate: worstTroughDate };
}
