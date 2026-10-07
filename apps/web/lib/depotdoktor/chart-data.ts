import type { PortfolioSnapshot } from "./portfolio";
import { formatDateDe, toUtc } from "./dates";

export interface ValueChartPoint {
  time: number;
  date: string;
  label: string;
  value: number;
  flow: number;
}

export function valueChartPoints(portfolio: PortfolioSnapshot): ValueChartPoint[] {
  const start = portfolio.firstDate;
  return portfolio.points
    .filter((point) => start === null || point.date >= start)
    .map((point) => ({
      time: toUtc(point.date),
      date: point.date,
      label: formatDateDe(point.date),
      value: point.value.toDecimalPlaces(2).toNumber(),
      flow: point.flow.toDecimalPlaces(2).toNumber(),
    }));
}
