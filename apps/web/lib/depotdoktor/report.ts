import type { Transaction } from "@portfolio/csv";
import type { Decimal } from "./money";
import { yearFraction } from "./dates";
import { buildPortfolio, type PortfolioSnapshot } from "./portfolio";
import { annualize, ttwror, type TtwrorResult } from "./metrics/ttwror";
import { irr, type IrrResult } from "./metrics/irr";
import { volatilityFromPoints } from "./metrics/volatility";
import { maxDrawdownFromPoints, type DrawdownResult } from "./metrics/drawdown";
import {
  allocationByAssetClass,
  allocationByPosition,
  allocationByRegion,
  type AllocationSlice,
} from "./metrics/allocation";

export interface PerformanceReport {
  portfolio: PortfolioSnapshot;
  ttwror: TtwrorResult;
  ttwrorAnnualized: Decimal | null;
  irr: IrrResult;
  volatility: Decimal | null;
  drawdown: DrawdownResult;
  allocation: {
    byAssetClass: AllocationSlice[];
    byRegion: AllocationSlice[];
    byPosition: AllocationSlice[];
  };
  years: number;
  notes: string[];
}

export function buildReport(transactions: readonly Transaction[]): PerformanceReport {
  const portfolio = buildPortfolio(transactions);
  const years = portfolio.firstDate && portfolio.lastDate ? yearFraction(portfolio.firstDate, portfolio.lastDate) : 0;
  const twr = ttwror(portfolio.points);
  const inputs = portfolio.positions.map((p) => ({
    key: p.key,
    name: p.name,
    isin: p.isin,
    assetClass: p.assetClass,
    value: p.value,
  }));
  const notes = [...portfolio.notes];
  const irrResult = irr(portfolio.cashflows);
  if (!irrResult.ok) {
    notes.push(
      irrResult.reason === "no-sign-change"
        ? "IRR nicht bestimmbar: Es gibt nur Geldabflüsse oder nur Geldzuflüsse (zum Beispiel nur Käufe ohne bewertbaren Bestand)."
        : irrResult.reason === "no-cashflows"
          ? "IRR nicht bestimmbar: keine Zahlungsströme."
          : irrResult.reason === "no-duration"
            ? "IRR nicht bestimmbar: Alle Zahlungsströme liegen am selben Tag."
            : "IRR nicht bestimmbar: Das Verfahren konvergiert für diese Zahlungsströme nicht.",
    );
  }
  if (portfolio.points.length < 3) {
    notes.push("Volatilität und Max Drawdown sind bei weniger als drei Bewertungszeitpunkten nicht aussagekräftig.");
  }
  notes.push(
    "Bewertung ohne Tageskurse: Positionen werden mit dem letzten im Export enthaltenen Preis bewertet. Volatilität und Max Drawdown beruhen nur auf den Transaktionszeitpunkten und unterschätzen die tatsächlichen Schwankungen.",
  );

  return {
    portfolio,
    ttwror: twr,
    ttwrorAnnualized: twr.total && years >= 1 ? annualize(twr.total, years) : null,
    irr: irrResult,
    volatility: portfolio.points.length >= 3 ? volatilityFromPoints(portfolio.points) : null,
    drawdown: maxDrawdownFromPoints(portfolio.points),
    allocation: {
      byAssetClass: allocationByAssetClass(inputs),
      byRegion: allocationByRegion(inputs),
      byPosition: allocationByPosition(inputs),
    },
    years,
    notes,
  };
}
