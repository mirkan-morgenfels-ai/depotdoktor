import type { AssetClass, Transaction } from "@portfolio/csv";
import { Decimal, ZERO, d } from "../money";
import { monthOf, yearOf } from "../dates";
import { positionKey } from "../portfolio";
import { createLot, fifoSell, type FifoSaleResult, type Lot } from "./fifo";
import { basiszinsFor, TEILFREISTELLUNG, type FundType } from "./constants";
import { vorabpauschale, type ReductionTarget, type VorabpauschaleResult } from "./vorabpauschale";

export interface TaxLot {
  id: string;
  date: string;
  month: number;
  shares: Decimal;
  costPerShare: Decimal;
  distributionsPerShareInYear: Decimal;
}

export interface TaxPosition {
  key: string;
  isin: string | null;
  name: string;
  assetClass: AssetClass;
  sharesAtYearStart: Decimal;
  lotsHeldAtYearStart: TaxLot[];
  lotsBoughtInYear: TaxLot[];
  sharesAtYearEnd: Decimal;
  distributionsInYear: Decimal;
  distributionsOnYearEndHoldings: Decimal;
  priceBeforeYear: Decimal | null;
  priceBeforeYearDate: string | null;
  lastKnownPrice: Decimal | null;
  lastKnownPriceDate: string | null;
  salesInYear: TaxSale[];
}

export interface TaxSale extends FifoSaleResult {
  id: string;
  date: string;
  includesPriorYearLots: boolean;
}

export interface PositionPriceInput {
  yearStartPrice: Decimal;
  yearEndPrice: Decimal;
}

export interface PositionTaxEstimate {
  position: TaxPosition;
  year: number;
  fundType: FundType;
  basiszins: Decimal;
  parts: Array<{ label: string; shares: Decimal; monthsBeforeAcquisition: number; result: VorabpauschaleResult }>;
  vorabpauschale: Decimal;
  taxable: Decimal;
  tax: Decimal;
}

function sumShares(lots: readonly Pick<Lot, "shares">[]): Decimal {
  return lots.reduce((acc, l) => acc.plus(l.shares), ZERO);
}

function distributionsOnLots(lots: readonly Pick<Lot, "shares" | "distributionsPerShareInYear">[]): Decimal {
  return lots.reduce((acc, l) => acc.plus(l.shares.times(l.distributionsPerShareInYear)), ZERO);
}

export function buildTaxPositions(transactions: readonly Transaction[], year: number): TaxPosition[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.rowIndex - b.rowIndex);
  const state = new Map<
    string,
    {
      position: Omit<
        TaxPosition,
        "sharesAtYearStart" | "lotsHeldAtYearStart" | "lotsBoughtInYear" | "sharesAtYearEnd" | "distributionsOnYearEndHoldings"
      >;
      lots: Lot[];
      lotsAtYearStart: Lot[] | null;
    }
  >();

  const snapshotYearStart = () => {
    for (const entry of state.values()) {
      if (entry.lotsAtYearStart === null) entry.lotsAtYearStart = entry.lots.map((l) => ({ ...l }));
    }
  };

  let reachedYear = false;
  for (const tx of sorted) {
    const txYear = yearOf(tx.date);
    if (txYear > year) break;
    if (txYear === year && !reachedYear) {
      reachedYear = true;
      snapshotYearStart();
    }
    if (tx.type !== "buy" && tx.type !== "sell" && tx.type !== "dividend") continue;

    const key = positionKey(tx);
    let entry = state.get(key);
    if (!entry) {
      entry = {
        position: {
          key,
          isin: tx.isin,
          name: tx.name ?? tx.isin ?? "Unbekannt",
          assetClass: tx.assetClass,
          distributionsInYear: ZERO,
          priceBeforeYear: null,
          priceBeforeYearDate: null,
          lastKnownPrice: null,
          lastKnownPriceDate: null,
          salesInYear: [],
        },
        lots: [],
        lotsAtYearStart: reachedYear ? [] : null,
      };
      state.set(key, entry);
    }
    if (tx.price) {
      entry.position.lastKnownPrice = d(tx.price);
      entry.position.lastKnownPriceDate = tx.date;
      if (txYear < year) {
        entry.position.priceBeforeYear = d(tx.price);
        entry.position.priceBeforeYearDate = tx.date;
      }
    }

    if (tx.type === "buy") {
      entry.lots.push(createLot(tx.id, tx.date, d(tx.shares), d(tx.amount).abs()));
    } else if (tx.type === "sell") {
      const sale = fifoSell(entry.lots, d(tx.shares), d(tx.amount).abs().plus(d(tx.tax).abs()));
      entry.lots = sale.remaining;
      if (txYear === year) {
        entry.position.salesInYear.push({
          ...sale,
          id: tx.id,
          date: tx.date,
          includesPriorYearLots: sale.consumed.some((c) => yearOf(c.date) < txYear),
        });
      }
    } else if (txYear === year) {
      const gross = d(tx.amount).abs().plus(d(tx.tax).abs());
      entry.position.distributionsInYear = entry.position.distributionsInYear.plus(gross);
      const reportedShares = tx.shares ? d(tx.shares).abs() : ZERO;
      const entitledShares = reportedShares.gt(ZERO) ? reportedShares : sumShares(entry.lots);
      if (entitledShares.gt(ZERO)) {
        const perShare = gross.div(entitledShares);
        entry.lots = entry.lots.map((lot) => ({ ...lot, distributionsPerShareInYear: lot.distributionsPerShareInYear.plus(perShare) }));
      }
    }
  }
  if (!reachedYear) snapshotYearStart();

  const toTaxLot = (lot: Lot): TaxLot => ({
    id: lot.id,
    date: lot.date,
    month: monthOf(lot.date),
    shares: lot.shares,
    costPerShare: lot.costPerShare,
    distributionsPerShareInYear: lot.distributionsPerShareInYear,
  });

  return [...state.values()]
    .map((entry) => {
      const startLots = (entry.lotsAtYearStart ?? []).map(toTaxLot);
      const endLots = entry.lots;
      const lotsBoughtInYear = endLots.filter((l) => yearOf(l.date) === year).map(toTaxLot);
      const heldAtStartStillHeld = endLots.filter((l) => yearOf(l.date) < year).map(toTaxLot);
      return {
        ...entry.position,
        sharesAtYearStart: sumShares(startLots),
        lotsHeldAtYearStart: heldAtStartStillHeld,
        lotsBoughtInYear,
        sharesAtYearEnd: sumShares(endLots),
        distributionsOnYearEndHoldings: distributionsOnLots(endLots),
      };
    })
    .filter((p) => p.sharesAtYearStart.gt(ZERO) || p.lotsBoughtInYear.length > 0 || p.salesInYear.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function estimatePositionVorabpauschale(
  position: TaxPosition,
  year: number,
  fundType: FundType,
  prices: PositionPriceInput,
  options: { reductionTarget?: ReductionTarget } = {},
): PositionTaxEstimate | null {
  const basiszins = basiszinsFor(year);
  if (!basiszins) return null;
  const teilfreistellung = TEILFREISTELLUNG[fundType];
  const parts: PositionTaxEstimate["parts"] = [];
  if (fundType === "none") {
    return { position, year, fundType, basiszins, parts, vorabpauschale: ZERO, taxable: ZERO, tax: ZERO };
  }
  const perShareGain = prices.yearEndPrice.minus(prices.yearStartPrice);
  const sharesHeldAllYear = sumShares(position.lotsHeldAtYearStart);

  if (sharesHeldAllYear.gt(ZERO)) {
    const result = vorabpauschale({
      referenceValue: sharesHeldAllYear.times(prices.yearStartPrice),
      basiszins,
      gain: sharesHeldAllYear.times(perShareGain),
      distributions: distributionsOnLots(position.lotsHeldAtYearStart),
      teilfreistellung,
      monthsBeforeAcquisition: 0,
      ...(options.reductionTarget ? { reductionTarget: options.reductionTarget } : {}),
    });
    parts.push({ label: "Bestand am Jahresanfang", shares: sharesHeldAllYear, monthsBeforeAcquisition: 0, result });
  }

  for (const lot of position.lotsBoughtInYear) {
    const months = lot.month - 1;
    const result = vorabpauschale({
      referenceValue: lot.shares.times(prices.yearStartPrice),
      basiszins,
      gain: lot.shares.times(perShareGain),
      distributions: lot.shares.times(lot.distributionsPerShareInYear),
      teilfreistellung,
      monthsBeforeAcquisition: months,
      ...(options.reductionTarget ? { reductionTarget: options.reductionTarget } : {}),
    });
    parts.push({ label: `Kauf ${lot.date}`, shares: lot.shares, monthsBeforeAcquisition: months, result });
  }

  return {
    position,
    year,
    fundType,
    basiszins,
    parts,
    vorabpauschale: parts.reduce((acc, p) => acc.plus(p.result.vorabpauschale), ZERO),
    taxable: parts.reduce((acc, p) => acc.plus(p.result.taxable), ZERO),
    tax: parts.reduce((acc, p) => acc.plus(p.result.tax), ZERO),
  };
}
