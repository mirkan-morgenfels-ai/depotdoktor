import { Decimal, ONE, ZERO } from "../money";

export interface ValuationPoint {
  date: string;
  value: Decimal;
  flow: Decimal;
}

export interface PeriodReturn {
  from: string;
  to: string;
  rate: Decimal;
}

export interface TtwrorResult {
  total: Decimal | null;
  periods: PeriodReturn[];
}

export function periodReturns(points: readonly ValuationPoint[]): PeriodReturn[] {
  const periods: PeriodReturn[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = i > 0 ? points[i - 1]! : null;
    const current = points[i]!;
    if (previous && previous.value.gt(ZERO)) {
      const rate = current.value.minus(current.flow).div(previous.value).minus(ONE);
      periods.push({ from: previous.date, to: current.date, rate });
    } else if (current.flow.gt(ZERO) && current.value.gt(ZERO)) {
      periods.push({ from: current.date, to: current.date, rate: current.value.div(current.flow).minus(ONE) });
    }
  }
  return periods;
}

export function ttwror(points: readonly ValuationPoint[]): TtwrorResult {
  const periods = periodReturns(points);
  if (points.length === 0) return { total: null, periods };
  let growth = ONE;
  for (const period of periods) growth = growth.times(ONE.plus(period.rate));
  return { total: growth.minus(ONE), periods };
}

export function annualize(total: Decimal, years: number): Decimal | null {
  if (years <= 0) return null;
  const base = ONE.plus(total);
  if (base.lte(ZERO)) return null;
  return base.pow(new Decimal(1).div(years)).minus(ONE);
}
