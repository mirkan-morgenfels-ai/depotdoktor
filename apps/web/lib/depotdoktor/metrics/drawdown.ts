import { Decimal, ZERO } from "../money";
import type { ValuationPoint } from "./ttwror";

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
  let peak: Decimal | null = null;
  let peakDate: string | null = null;
  let worst = ZERO;
  let worstPeakDate: string | null = null;
  let worstTroughDate: string | null = null;
  let index: Decimal | null = null;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i]!;
    const previous = i > 0 ? points[i - 1]! : null;
    if (index === null) {
      if (point.value.lte(ZERO)) continue;
      index = new Decimal(1);
    } else if (previous && previous.value.gt(ZERO)) {
      index = index.times(point.value.minus(point.flow).div(previous.value));
    }
    if (peak === null || index.gt(peak)) {
      peak = index;
      peakDate = point.date;
    }
    if (peak.gt(ZERO)) {
      const drawdown = peak.minus(index).div(peak);
      if (drawdown.gt(worst)) {
        worst = drawdown;
        worstPeakDate = peakDate;
        worstTroughDate = point.date;
      }
    }
  }
  return { maxDrawdown: worst, peakDate: worstPeakDate, troughDate: worstTroughDate };
}
